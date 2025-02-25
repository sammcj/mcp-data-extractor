# mcp-data-extractor MCP Server

A Model Context Protocol server that extracts embedded data (such as i18n translations or key/value configurations) from TypeScript/JavaScript source code into structured JSON configuration files.

[![smithery badge](https://smithery.ai/badge/mcp-data-extractor)](https://smithery.ai/server/mcp-data-extractor)

<a href="https://glama.ai/mcp/servers/40c3iyazm5"><img width="380" height="200" src="https://glama.ai/mcp/servers/40c3iyazm5/badge" alt="MCP Data Extractor MCP server" /></a>

## Features

- Data Extraction:
  - Extracts string literals, template literals, and complex nested objects
  - Preserves template variables (e.g., `Hello, {{name}}!`)
  - Supports nested object structures and arrays
  - Maintains hierarchical key structure using dot notation
  - Handles both TypeScript and JavaScript files with JSX support
  - Replaces source file content with "MIGRATED TO <target path>" after successful extraction (configurable)

- SVG Extraction:
  - Extracts SVG components from React/TypeScript/JavaScript files
  - Preserves SVG structure and attributes
  - Removes React-specific code and props
  - Creates individual .svg files named after their component
  - Replaces source file content with "MIGRATED TO <target directory>" after successful extraction (configurable)

## Usage

Add to your MCP Client configuration:

```bash
{
  "mcpServers": {
    "data-extractor": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-data-extractor"
      ],
      "disabled": false,
      "autoApprove": [
        "extract_data",
        "extract_svg"
      ]
    }
  }
}
```

### Basic Usage

The server provides two tools:

#### 1. Data Extraction

Use `extract_data` to extract data (like i18n translations) from source files:

```typescript
<use_mcp_tool>
<server_name>data-extractor</server_name>
<tool_name>extract_data</tool_name>
<arguments>
{
  "sourcePath": "src/translations.ts",
  "targetPath": "src/translations.json"
}
</arguments>
</use_mcp_tool>
```

#### 2. SVG Extraction

Use `extract_svg` to extract SVG components into individual files:

```typescript
<use_mcp_tool>
<server_name>data-extractor</server_name>
<tool_name>extract_svg</tool_name>
<arguments>
{
  "sourcePath": "src/components/icons/InspectionIcon.tsx",
  "targetDir": "src/assets/icons"
}
</arguments>
</use_mcp_tool>
```

### Source File Replacement

By default, after successful extraction, the server will replace the content of the source file with:
- "MIGRATED TO <target path>" for data extraction
- "MIGRATED TO <target directory>" for SVG extraction

This helps track which files have already been processed and prevents duplicate extraction. It also makes it easy for LLMs and developers to see where the extracted data now lives when they encounter the source file later.

To disable this behavior, set the `DISABLE_SOURCE_REPLACEMENT` environment variable to `true` in your MCP configuration:

```json
{
  "mcpServers": {
    "data-extractor": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-data-extractor"
      ],
      "env": {
        "DISABLE_SOURCE_REPLACEMENT": "true"
      },
      "disabled": false,
      "autoApprove": [
        "extract_data",
        "extract_svg"
      ]
    }
  }
}
```

### Supported Patterns

#### Data Extraction Patterns

The data extractor supports various patterns commonly used in TypeScript/JavaScript applications:

1. Simple Object Exports:
```typescript
export default {
  welcome: "Welcome to our app",
  greeting: "Hello, {name}!",
  submit: "Submit form"
};
```

2. Nested Objects:
```typescript
export default {
  header: {
    title: "Book Your Flight",
    subtitle: "Find the best deals"
  },
  footer: {
    content: [
      "Please refer to {{privacyPolicyUrl}} for details",
      "© {{year}} {{companyName}}"
    ]
  }
};
```

3. Complex Structures with Arrays:
```typescript
export default {
  faq: {
    heading: "Common questions",
    content: [
      {
        heading: "What if I need to change my flight?",
        content: "You can change your flight online if:",
        list: [
          "You have a flexible fare type",
          "Your flight is more than 24 hours away"
        ]
      }
    ]
  }
};
```

4. Template Literals with Variables:
```typescript
export default {
  greeting: `Hello, {{username}}!`,
  message: `Welcome to {{appName}}`
};
```

### Output Formats

#### Data Extraction Output

The extracted data is saved as a JSON file with dot notation for nested structures:

```json
{
  "welcome": "Welcome to our app",
  "header.title": "Book Your Flight",
  "footer.content.0": "Please refer to {{privacyPolicyUrl}} for details",
  "footer.content.1": "© {{year}} {{companyName}}",
  "faq.content.0.heading": "What if I need to change my flight?"
}
```

#### SVG Extraction Output

SVG components are extracted into individual .svg files, with React-specific code removed. For example:

Input (React component):
```tsx
const InspectionIcon: React.FC<InspectionIconProps> = ({ title }) => (
  <svg className="c-tab__icon" width="40px" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <title>{title}</title>
    <path className="cls-1" d="M18.89,12.74a3.18,3.18,0,0,1-3.24-3.11..." />
  </svg>
);
```

Output (InspectionIcon.svg):
```svg
<svg width="40px" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <path class="cls-1" d="M18.89,12.74a3.18,3.18,0,0,1-3.24-3.11..." />
</svg>
```

## Extending Supported Patterns

The extractor uses Babel to parse and traverse the AST (Abstract Syntax Tree) of your source files. You can extend the supported patterns by modifying the source code:

1. **Add New Node Types**: The `extractStringValue` method in `src/index.ts` handles different types of string values. Extend it to support new node types:

```typescript
private extractStringValue(node: t.Node): string | null {
  if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isTemplateLiteral(node)) {
    return node.quasis.map(quasi => quasi.value.raw).join('{{}}');
  }
  // Add support for new node types here
  return null;
}
```

2. **Custom Value Processing**: The `processValue` method handles different value types (strings, arrays, objects). Extend it to support new value types or custom processing:

```typescript
private processValue(value: t.Node, currentPath: string[]): void {
  if (t.isStringLiteral(value) || t.isTemplateLiteral(value)) {
    // Process string values
  } else if (t.isArrayExpression(value)) {
    // Process arrays
  } else if (t.isObjectExpression(value)) {
    // Process objects
  }
  // Add support for new value types here
}
```

3. **Custom AST Traversal**: The server uses Babel's traverse to walk the AST. You can add new visitors to handle different node types:

```typescript
traverse(ast, {
  ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
    // Handle default exports
  },
  // Add new visitors here
});
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
