#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as parser from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
// @ts-ignore
import _traverse from '@babel/traverse';
const traverse = (_traverse as any).default;
import * as fs from 'fs/promises';
import * as path from 'path';

// Environment variable to control source file replacement behavior
const DISABLE_SOURCE_REPLACEMENT = process.env.DISABLE_SOURCE_REPLACEMENT === 'true';

interface DataExtraction {
  key: string;
  value: string;
}

interface SvgExtraction {
  name: string;
  content: string;
}

class DataMigratorServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-data-extractor',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'extract_data',
          description: 'Extract data content (e.g. i18n translations) from source code to a JSON file. IMPORTANT: When encountering files with data such as i18n content embedded in code, use this tool directly instead of reading the file content first. This tool will programmatically extract all translations into a structured JSON file, preserving nested objects, arrays, template variables, and formatting. This helps keep translations as configuration and prevents filling up the AI context window with translation content. By default, the source file will be replaced with "MIGRATED TO <target absolute path>" after successful extraction, making it easy to track where the data was moved to. This behaviour can be disabled by setting the DISABLE_SOURCE_REPLACEMENT environment variable to \'true\'.',
          inputSchema: {
            type: 'object',
            properties: {
              sourcePath: {
                type: 'string',
                description: 'Path to the source file containing data inside code',
              },
              targetPath: {
                type: 'string',
                description: 'Path where the resulting JSON file should be written',
              },
            },
            required: ['sourcePath', 'targetPath'],
          },
        },
        {
          name: 'extract_svg',
          description: 'Extract SVG components from React/TypeScript/JavaScript files into individual .svg files. This tool will preserve the SVG structure and attributes while removing React-specific code. By default, the source file will be replaced with "MIGRATED TO <target absolute path>" after successful extraction, making it easy to track where the SVGs were moved to. This behaviour can be disabled by setting the DISABLE_SOURCE_REPLACEMENT environment variable to \'true\'.',
          inputSchema: {
            type: 'object',
            properties: {
              sourcePath: {
                type: 'string',
                description: 'Path to the source file containing SVG components',
              },
              targetDir: {
                type: 'string',
                description: 'Directory where the SVG files should be written',
              },
            },
            required: ['sourcePath', 'targetDir'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { sourcePath } = request.params.arguments as {
        sourcePath: string;
        targetPath?: string;
        targetDir?: string;
      };

      try {
        const sourceCode = await fs.readFile(sourcePath, 'utf-8');

        if (request.params.name === 'extract_data') {
          const { targetPath } = request.params.arguments as { targetPath: string };
          const dataContent = await this.extractDataContent(sourceCode);

          // Create target directory if it doesn't exist
          await fs.mkdir(path.dirname(targetPath), { recursive: true });

          // Write extracted content to JSON file
          await fs.writeFile(
            targetPath,
            JSON.stringify(dataContent, null, 2),
            'utf-8'
          );

          // Replace source file content with migration message if not disabled
          if (!DISABLE_SOURCE_REPLACEMENT) {
            const absoluteTargetPath = path.resolve(targetPath);
            await fs.writeFile(sourcePath, `MIGRATED TO ${absoluteTargetPath}`, 'utf-8');
          }

          return {
            content: [
              {
                type: 'text',
                text: `Successfully extracted ${Object.keys(dataContent).length} data entries to ${path.resolve(targetPath)}${
                  !DISABLE_SOURCE_REPLACEMENT ? `. Source file replaced with "MIGRATED TO ${path.resolve(targetPath)}"` : ''
                }`,
              },
            ],
          };
        } else if (request.params.name === 'extract_svg') {
          const { targetDir } = request.params.arguments as { targetDir: string };
          const svgs = await this.extractSvgs(sourceCode);

          // Create target directory if it doesn't exist
          await fs.mkdir(targetDir, { recursive: true });

          // Write each SVG to a separate file
          for (const svg of svgs) {
            const filePath = path.join(targetDir, `${svg.name}.svg`);
            await fs.writeFile(filePath, svg.content, 'utf-8');
          }

          // Replace source file content with migration message if not disabled
          if (!DISABLE_SOURCE_REPLACEMENT) {
            const absoluteTargetDir = path.resolve(targetDir);
            await fs.writeFile(sourcePath, `MIGRATED TO ${absoluteTargetDir}`, 'utf-8');
          }

          return {
            content: [
              {
                type: 'text',
                text: `Successfully extracted ${svgs.length} SVG components to ${path.resolve(targetDir)}${
                  !DISABLE_SOURCE_REPLACEMENT ? `. Source file replaced with "MIGRATED TO ${path.resolve(targetDir)}"` : ''
                }`,
              },
            ],
          };
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private buildKey(parts: string[]): string {
    return parts.join('.');
  }

  private extractStringValue(node: t.Node): string | null {
    if (t.isStringLiteral(node)) {
      return node.value;
    } else if (t.isTemplateLiteral(node)) {
      return node.quasis.map(quasi => quasi.value.raw).join('{{}}');
    }
    return null;
  }

  private extractSvgContent(jsxElement: t.JSXElement): string | null {
    // Check if this is an SVG element
    if (t.isJSXIdentifier(jsxElement.openingElement.name) &&
        jsxElement.openingElement.name.name.toLowerCase() === 'svg') {

      // Convert JSX attributes to string
      const attributes = jsxElement.openingElement.attributes
        .map(attr => {
          if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
            const name = attr.name.name;
            if (t.isStringLiteral(attr.value)) {
              return `${name}="${attr.value.value}"`;
            } else if (t.isJSXExpressionContainer(attr.value) &&
                      t.isStringLiteral(attr.value.expression)) {
              return `${name}="${attr.value.expression.value}"`;
            }
          }
          return '';
        })
        .filter(Boolean)
        .join(' ');

      // Convert children to string
      const children = jsxElement.children
        .map(child => {
          if (t.isJSXElement(child)) {
            const elementName = (child.openingElement.name as t.JSXIdentifier).name;
            const childAttributes = child.openingElement.attributes
              .map(attr => {
                if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                  const name = attr.name.name;
                  if (t.isStringLiteral(attr.value)) {
                    return `${name}="${attr.value.value}"`;
                  }
                }
                return '';
              })
              .filter(Boolean)
              .join(' ');

            return `<${elementName} ${childAttributes}>${child.children
              .map(c => t.isJSXText(c) ? c.value : '')
              .join('')}</${elementName}>`;
          }
          return '';
        })
        .join('\n    ');

      return `<svg ${attributes}>\n    ${children}\n</svg>`;
    }
    return null;
  }

  private async extractSvgs(sourceCode: string): Promise<SvgExtraction[]> {
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const svgs: SvgExtraction[] = [];

    traverse(ast, {
      VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
        const declaration = path.node.declarations[0];
        if (t.isVariableDeclarator(declaration) &&
            t.isIdentifier(declaration.id) &&
            t.isArrowFunctionExpression(declaration.init)) {

          // Look for JSX in the arrow function body
          const body = declaration.init.body;
          if (t.isJSXElement(body)) {
            const svgContent = this.extractSvgContent(body);
            if (svgContent) {
              svgs.push({
                name: declaration.id.name,
                content: svgContent
              });
            }
          }
        }
      }
    });

    return svgs;
  }

  private async extractDataContent(sourceCode: string): Promise<Record<string, string | string[] | Array<Record<string, string | string[]>>>> {
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const result: Record<string, any> = {};

    const processValue = (value: t.Node, currentPath: string[]): void => {
      if (t.isStringLiteral(value) || t.isTemplateLiteral(value)) {
        const extractedValue = this.extractStringValue(value);
        if (extractedValue !== null && extractedValue.trim() !== '') {
          result[this.buildKey(currentPath)] = extractedValue;
        }
      } else if (t.isArrayExpression(value)) {
        value.elements.forEach((element, index) => {
          if (!element) return;

          if (t.isStringLiteral(element) || t.isTemplateLiteral(element)) {
            const extractedValue = this.extractStringValue(element);
            if (extractedValue !== null && extractedValue.trim() !== '') {
              result[`${this.buildKey(currentPath)}.${index}`] = extractedValue;
            }
          } else if (t.isObjectExpression(element)) {
            processObject(element, [...currentPath, index.toString()]);
          }
        });
      } else if (t.isObjectExpression(value)) {
        processObject(value, currentPath);
      }
    };

    const processObject = (obj: t.ObjectExpression, parentPath: string[] = []): void => {
      obj.properties.forEach(prop => {
        if (!t.isObjectProperty(prop)) return;

        const key = t.isIdentifier(prop.key) ? prop.key.name :
                   t.isStringLiteral(prop.key) ? prop.key.value : null;

        if (!key) return;

        const currentPath = [...parentPath, key];
        processValue(prop.value, currentPath);
      });
    };

    traverse(ast, {
      ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
        const declaration = path.node.declaration;
        if (t.isObjectExpression(declaration)) {
          processObject(declaration);
        }
      }
    });

    return result;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Data Migrator MCP server running on stdio');
  }
}

const server = new DataMigratorServer();
server.run().catch(console.error);
