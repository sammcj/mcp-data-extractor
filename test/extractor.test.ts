import * as fs from 'fs/promises';
import * as path from 'path';
import * as parser from '@babel/parser';
import * as t from '@babel/types';

const tempDir = path.join(process.cwd(), 'test', 'temp');

// Helper function to extract data content from source code
async function extractDataContent(sourceCode: string): Promise<Record<string, string | string[] | Array<Record<string, string | string[]>>>> {
  const ast = parser.parse(sourceCode, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const result: Record<string, any> = {};

  const buildKey = (parts: string[]): string => parts.join('.');

  const extractStringValue = (node: t.Node): string | null => {
    if (t.isStringLiteral(node)) {
      return node.value;
    } else if (t.isTemplateLiteral(node)) {
      return node.quasis.map(quasi => quasi.value.raw).join('{{}}');
    }
    return null;
  };

  const processValue = (value: t.Node, currentPath: string[]): void => {
    if (t.isStringLiteral(value) || t.isTemplateLiteral(value)) {
      const extractedValue = extractStringValue(value);
      if (extractedValue !== null && extractedValue.trim() !== '') {
        result[buildKey(currentPath)] = extractedValue;
      }
    } else if (t.isArrayExpression(value)) {
      value.elements.forEach((element, index) => {
        if (!element) return;

        if (t.isStringLiteral(element) || t.isTemplateLiteral(element)) {
          const extractedValue = extractStringValue(element);
          if (extractedValue !== null && extractedValue.trim() !== '') {
            result[`${buildKey(currentPath)}.${index}`] = extractedValue;
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

  // Manual traversal of the AST instead of using traverse
  function visitNode(node: t.Node): void {
    if (t.isExportDefaultDeclaration(node)) {
      const declaration = node.declaration;
      if (t.isObjectExpression(declaration)) {
        processObject(declaration);
      }
    } else if (t.isVariableDeclaration(node)) {
      node.declarations.forEach(declaration => {
        if (t.isVariableDeclarator(declaration) &&
            t.isIdentifier(declaration.id) &&
            t.isObjectExpression(declaration.init)) {
          // Special case for translations object - don't include the variable name in the path
          if (declaration.id.name === 'translations') {
            processObject(declaration.init);
          } else {
            processObject(declaration.init, [declaration.id.name]);
          }
        }
      });
    } else if (t.isJSXElement(node)) {
      node.children.forEach(child => {
        if (t.isJSXExpressionContainer(child) &&
            t.isCallExpression(child.expression) &&
            t.isIdentifier(child.expression.callee) &&
            child.expression.callee.name === 't') {

          const args = child.expression.arguments;
          if (args.length >= 2 &&
              t.isStringLiteral(args[0]) &&
              t.isStringLiteral(args[1])) {

            const key = args[0].value;
            const value = args[1].value;
            result[key] = value;
          }
        }
      });
    }

    // Recursively visit all child nodes
    for (const key in node) {
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        child.forEach(item => {
          if (item && typeof item === 'object' && 'type' in item) {
            visitNode(item as t.Node);
          }
        });
      } else if (child && typeof child === 'object' && 'type' in child) {
        visitNode(child as t.Node);
      }
    }
  }

  // Start traversal from the root
  visitNode(ast.program);

  return result;
}

// Helper function to extract data and write to file
async function extractToFile(sourcePath: string, targetPath: string): Promise<void> {
  const sourceCode = await fs.readFile(sourcePath, 'utf-8');
  const dataContent = await extractDataContent(sourceCode);

  // Create target directory if it doesn't exist
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  // Write extracted content to JSON file
  await fs.writeFile(
    targetPath,
    JSON.stringify(dataContent, null, 2),
    'utf-8'
  );
}

// Helper function to compare JSON files
async function compareJsonFiles(file1: string, file2: string): Promise<boolean> {
  const content1 = JSON.parse(await fs.readFile(file1, 'utf-8'));
  const content2 = JSON.parse(await fs.readFile(file2, 'utf-8'));
  return JSON.stringify(content1) === JSON.stringify(content2);
}

describe('MCP Data Extractor', () => {
  beforeAll(async () => {
    // Create temp directory for test outputs
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temp directory after tests
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('extracts translations from example.ts', async () => {
    const sourcePath = path.join(process.cwd(), 'test', 'example.ts');
    const targetPath = path.join(tempDir, 'extracted-translations.json');
    const expectedPath = path.join(process.cwd(), 'test', 'translations.json');

    await extractToFile(sourcePath, targetPath);

    // Check if the output file exists
    const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Compare with expected output
    const isEqual = await compareJsonFiles(targetPath, expectedPath);
    expect(isEqual).toBe(true);
  });

  test('extracts translations from complex-example.js', async () => {
    const sourcePath = path.join(process.cwd(), 'test', 'complex-example.js');
    const targetPath = path.join(tempDir, 'extracted-flight-translations.json');
    const expectedPath = path.join(process.cwd(), 'test', 'flight-translations.json');

    await extractToFile(sourcePath, targetPath);

    // Check if the output file exists
    const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Compare with expected output
    const isEqual = await compareJsonFiles(targetPath, expectedPath);
    expect(isEqual).toBe(true);
  });

  test('extracts translations from complex-example-2.js', async () => {
    const sourcePath = path.join(process.cwd(), 'test', 'complex-example-2.js');
    const targetPath = path.join(tempDir, 'extracted-pet-translations.json');
    const expectedPath = path.join(process.cwd(), 'test', 'pet-translations.json');

    await extractToFile(sourcePath, targetPath);

    // Check if the output file exists
    const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Compare with expected output
    const isEqual = await compareJsonFiles(targetPath, expectedPath);
    expect(isEqual).toBe(true);
  });
});
