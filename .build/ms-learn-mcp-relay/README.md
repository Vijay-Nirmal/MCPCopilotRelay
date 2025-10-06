# Microsoft Learn MCP Relay

rejhdgjd eqr qe rtwetrwe t

## Features

This extension integrates with an MCP (Model Context Protocol) server to provide:

- **microsoft_docs_fetch**: Fetch and convert a Microsoft Learn documentation page to markdown format. This tool retrieves the latest complete content of Microsoft documentation pages including Azure, .NET, Microsoft 365, and other Microsoft technologies.

## When to Use This Tool
- When search results provide incomplete information or truncated content
- When you need complete step-by-step procedures or tutorials
- When you need troubleshooting sections, prerequisites, or detailed explanations
- When search results reference a specific page that seems highly relevant
- For comprehensive guides that require full context

## Usage Pattern
Use this tool AFTER microsoft_docs_search when you identify specific high-value pages that need complete content. The search tool gives you an overview; this tool gives you the complete picture.

## URL Requirements
- The URL must be a valid link from the microsoft.com domain.

## Output Format
markdown with headings, code blocks, tables, and links preserved.
- **microsoft_code_sample_search**: Search for code snippets and examples in official Microsoft Learn documentation. This tool retrieves relevant code samples from Microsoft documentation pages providing developers with practical implementation examples and best practices for Microsoft/Azure products and services related coding tasks. This tool will help you use the **LATEST OFFICIAL** code snippets to empower coding capabilities.

## When to Use This Tool
- When you are going to provide sample Microsoft/Azure related code snippets in your answers.
- When you are **generating any Microsoft/Azure related code**.

## Usage Pattern
Input a descriptive query, or SDK/class/method name to retrieve related code samples. The optional parameter `language` can help to filter results.

Eligible values for `language` parameter include: csharp javascript typescript python powershell azurecli al sql java kusto cpp go rust ruby php
- **microsoft_docs_search**: Search official Microsoft/Azure documentation to find the most relevant and trustworthy content for a user's query. This tool returns up to 10 high-quality content chunks (each max 500 tokens), extracted from Microsoft Learn and other official sources. Each result includes the article title, URL, and a self-contained content excerpt optimized for fast retrieval and reasoning. Always use this tool to quickly ground your answers in accurate, first-party Microsoft/Azure knowledge.

The `question` parameter is no longer used, use `query` instead.

## Follow-up Pattern
To ensure completeness, use microsoft_docs_fetch when high-value pages are identified by search. The fetch tool complements search by providing the full detail. This is a required step for comprehensive results.

## Configuration

Configure the extension using these settings:

- `ms-learn-mcp-relay.asdqewqwe`: wetqwt (Default: `wqsadas`)

## Usage

### Language Model Tools

These tools are automatically available to GitHub Copilot and other AI assistants:

- **microsoft_docs_fetch**: Fetch and convert a Microsoft Learn documentation page to markdown format. This tool retrieves the latest complete content of Microsoft documentation pages including Azure, .NET, Microsoft 365, and other Microsoft technologies.

## When to Use This Tool
- When search results provide incomplete information or truncated content
- When you need complete step-by-step procedures or tutorials
- When you need troubleshooting sections, prerequisites, or detailed explanations
- When search results reference a specific page that seems highly relevant
- For comprehensive guides that require full context

## Usage Pattern
Use this tool AFTER microsoft_docs_search when you identify specific high-value pages that need complete content. The search tool gives you an overview; this tool gives you the complete picture.

## URL Requirements
- The URL must be a valid link from the microsoft.com domain.

## Output Format
markdown with headings, code blocks, tables, and links preserved.
- **microsoft_code_sample_search**: Search for code snippets and examples in official Microsoft Learn documentation. This tool retrieves relevant code samples from Microsoft documentation pages providing developers with practical implementation examples and best practices for Microsoft/Azure products and services related coding tasks. This tool will help you use the **LATEST OFFICIAL** code snippets to empower coding capabilities.

## When to Use This Tool
- When you are going to provide sample Microsoft/Azure related code snippets in your answers.
- When you are **generating any Microsoft/Azure related code**.

## Usage Pattern
Input a descriptive query, or SDK/class/method name to retrieve related code samples. The optional parameter `language` can help to filter results.

Eligible values for `language` parameter include: csharp javascript typescript python powershell azurecli al sql java kusto cpp go rust ruby php
- **microsoft_docs_search**: Search official Microsoft/Azure documentation to find the most relevant and trustworthy content for a user's query. This tool returns up to 10 high-quality content chunks (each max 500 tokens), extracted from Microsoft Learn and other official sources. Each result includes the article title, URL, and a self-contained content excerpt optimized for fast retrieval and reasoning. Always use this tool to quickly ground your answers in accurate, first-party Microsoft/Azure knowledge.

The `question` parameter is no longer used, use `query` instead.

## Follow-up Pattern
To ensure completeness, use microsoft_docs_fetch when high-value pages are identified by search. The fetch tool complements search by providing the full detail. This is a required step for comprehensive results.

## MCP Server

This extension connects to an MCP server using the following configuration:

- **Transport**: http
- **URL**: `https://learn.microsoft.com/api/mcp`

## Requirements

- VS Code version 1.85.0 or higher
- The MCP server must be running and accessible

## Installation

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

## Development

This extension was generated using [MCP Copilot Relay](https://github.com/vijay-nirmal/mcp-copilot-relay).

### Building from Source

```bash
npm install
npm run compile
```

### Testing

```bash
npm run watch
# Press F5 in VS Code to launch Extension Development Host
```

## Contributing

Please see [https://github.com/Vijay-Nirmal/MCPCopilotRelay](https://github.com/Vijay-Nirmal/MCPCopilotRelay) for contribution guidelines.

## License

MIT

## Release Notes

### 1.0.0

Initial release generated from MCP server capabilities.

---

**Enjoy!**
