# MCP Copilot Relay

Generate VS Code extensions from MCP (Model Context Protocol) servers by mapping discovered tools, prompts, and resources to VS Code capabilities. This NPX tool provides a web-based multi-step wizard for configuration and generates a `.vsix` extension package.

## Features

- 🔌 **Multi-Transport Support**: Connect to MCP servers via stdio, SSE, or HTTP
- 🔍 **Auto-Discovery**: Automatically discover tools, prompts, and resources
- 🎯 **Smart Mapping**: Map MCP capabilities to VS Code Language Model Tools, Chat Participants, or Commands
- ⚙️ **Configuration Management**: Define VS Code settings for runtime configuration
- 📦 **VSIX Generation**: Generate complete, installable VS Code extensions
- 💾 **Config Import/Export**: Save and reuse configurations
- 🎨 **Modern UI**: Beautiful, responsive wizard interface with dark/light theme support

## Quick Start

```bash
# Start the wizard (default)
npx vijay-nirmal/mcp-copilot-relay

# Build from existing config
npx vijay-nirmal/mcp-copilot-relay build --config ./my-config.json
```

## Installation

No installation required! Use via NPX:

```bash
npx vijay-nirmal/mcp-copilot-relay
```

Or install globally:

```bash
npm install -g vijay-nirmal/mcp-copilot-relay
mcp-copilot-relay
```

## Usage

### 1. Start the Wizard

```bash
npx vijay-nirmal/mcp-copilot-relay
```

This will:
1. Start the MCP proxy server on port 3000
2. Start the web UI on port 5173
3. Automatically open your browser

### 2. Follow the Wizard Steps

#### Step 1: MCP Connection
- Choose transport type (stdio, SSE, or HTTP)
- Configure connection parameters
- Test the connection
- Import from existing MCP config JSON (optional)

#### Step 2: Discover Capabilities
- Auto-fetch tools, prompts, and resources
- View capability cards with descriptions
- Test each capability interactively

#### Step 3: Map to VS Code
- **Tools**: Map to `vscode.lm.tools` (Language Model Tools) or custom commands
- **Prompts**: Map to Chat Participants with slash commands
- Select/unselect capabilities via checkboxes
- Edit display names and descriptions

#### Step 4: Extension Info
- Configure extension metadata (name, version, publisher, etc.)
- Define VS Code settings for MCP server configuration
- Map settings to MCP server environment variables/headers

#### Step 5: Preview & Build
- Preview and edit generated files:
  - `package.json` - VS Code manifest
  - `extension.ts` - Main entry point
  - `mcp-client.ts` - MCP connection logic
  - `README.md` - Extension documentation
- Validate configuration
- Download .vsix package
- Export configuration JSON

### 3. Install Generated Extension

```bash
code --install-extension path/to/your-extension-1.0.0.vsix
```

## CLI Options

```bash
# Start server with custom port
npx vijay-nirmal/mcp-copilot-relay start --port 3001

# Don't auto-open browser
npx vijay-nirmal/mcp-copilot-relay start --no-browser

# Build from config with custom output directory
npx vijay-nirmal/mcp-copilot-relay build --config ./config.json --output ./my-extensions
```

## Configuration File Format

```json
{
  "mcp": {
    "type": "stdio",
    "config": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  },
  "capabilities": {
    "tools": [
      {
        "name": "example-tool",
        "description": "An example tool",
        "selected": true
      }
    ],
    "prompts": [
      {
        "name": "example-prompt",
        "description": "An example prompt",
        "selected": true
      }
    ],
    "resources": []
  },
  "mappings": {
    "tools": {
      "example-tool": {
        "type": "lm-tool",
        "displayName": "Example Tool",
        "description": "Does something useful"
      }
    },
    "prompts": {
      "example-prompt": {
        "type": "chat-participant",
        "displayName": "Example Assistant",
        "description": "Helps with examples",
        "slashCommand": "help"
      }
    }
  },
  "settings": {
    "apiKey": {
      "type": "string",
      "description": "API Key for the service",
      "default": "",
      "mcpMapping": "API_KEY"
    }
  },
  "extension": {
    "name": "my-extension",
    "displayName": "My Extension",
    "description": "Generated from MCP server",
    "version": "1.0.0",
    "publisher": "my-publisher",
    "author": "Your Name",
    "license": "MIT"
  }
}
```

## Architecture

### MCP Proxy Server (Node.js)
- Connects to MCP servers via stdio/SSE/HTTP transports
- Discovers tools, prompts, and resources
- Proxies requests from UI to MCP server
- Built with Express and @modelcontextprotocol/sdk

### Web UI (React + Vite)
- Multi-step wizard for configuration
- Live capability discovery and testing
- Client-side VSIX generation with JSZip
- Built with React, Vite, shadcn/ui, and Tailwind CSS

### VSIX Builder
- Maps MCP capabilities to VS Code features
- Generates extension source code
- Packages as .vsix using JSZip

## Project Structure

```
src/
├── cli/                      # CLI entry point
│   └── index.ts
├── proxy/                    # Node.js server + MCP client
│   ├── server.ts
│   ├── mcp-manager.ts
│   └── routes/
│       └── index.ts
├── builder/                  # VSIX generation
│   ├── vsix-builder.ts
│   └── templates/
│       ├── package-json.ts
│       ├── extension-ts.ts
│       ├── mcp-client-ts.ts
│       ├── readme.ts
│       └── tsconfig.ts
└── ui/                       # React app
    ├── main.tsx
    ├── App.tsx
    ├── store/
    │   └── wizard-store.ts
    └── components/
        └── wizard/
```

## Tech Stack

- **Backend**: Node.js, Express, @modelcontextprotocol/sdk
- **Frontend**: React 18, Vite, TypeScript
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **State Management**: Zustand
- **Validation**: Zod
- **Build Tools**: esbuild, JSZip, @vscode/vsce

## MCP Transport Support

### stdio
Connect to local MCP servers running as child processes:
```json
{
  "type": "stdio",
  "config": {
    "command": "node",
    "args": ["server.js"],
    "env": { "API_KEY": "..." }
  }
}
```

### SSE (Server-Sent Events)
Connect to remote MCP servers via SSE:
```json
{
  "type": "sse",
  "config": {
    "url": "http://localhost:3001/sse",
    "headers": { "Authorization": "Bearer ..." }
  }
}
```

### HTTP (Streamable HTTP)
Connect to remote MCP servers via Streamable HTTP with automatic SSE fallback:
```json
{
  "type": "http",
  "config": {
    "url": "http://localhost:3001/mcp",
    "headers": { "Authorization": "Bearer ..." }
  }
}
```

## VS Code Capability Mappings

### Language Model Tools
MCP tools → `vscode.lm.registerTool()`
- Automatically available to GitHub Copilot and other AI assistants
- Supports typed input schemas
- Async execution with cancellation support

### Chat Participants
MCP prompts → `vscode.chat.createChatParticipant()`
- Creates @ mention-able chat participants
- Supports slash commands
- Integrates with VS Code's chat interface

### Commands
MCP tools → `vscode.commands.registerCommand()`
- Accessible via Command Palette (Ctrl+Shift+P)
- Can be bound to keybindings
- Traditional command execution

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/vijay-nirmal/mcp-copilot-relay.git
cd mcp-copilot-relay

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build

```bash
# Build proxy server
npm run build:proxy

# Build UI
npm run build:ui

# Build CLI
npm run build:cli

# Build all
npm run build:all
```

### Project Scripts

```bash
npx .          # Run all
npx . build --config ./example.ms-learn-mcp-relay-config.json --output ./my-extension    # Directly build VSIX from config

npm run dev           # Run proxy + UI in watch mode
npm run dev:proxy     # Run only proxy server
npm run dev:ui        # Run only UI dev server
npm run build         # Build proxy + UI
npm run typecheck     # Run TypeScript type checking
npm run lint          # Run ESLint
```

## Examples

### Example 1: Weather MCP Server

```bash
# Start the wizard
npx vijay-nirmal/mcp-copilot-relay

# Configure stdio transport
# Command: node
# Args: ["weather-server.js"]

# Map tools
# - get_weather → Language Model Tool
# - forecast → Chat Participant "@weather"

# Configure settings
# - apiKey (mapped to WEATHER_API_KEY env var)

# Build and install
```

### Example 2: Remote API Server

```json
{
  "mcp": {
    "type": "http",
    "config": {
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

## Troubleshooting

### Connection Issues
- Ensure MCP server is running and accessible
- Check firewall settings for remote connections
- Verify authentication tokens/API keys

### Build Failures
- Ensure all required fields are filled in
- Check that tool/prompt names are valid identifiers
- Verify TypeScript compilation of generated code

### Extension Installation
- Use VS Code 1.85.0 or higher
- Check extension logs for errors: `Developer: Show Logs`
- Verify MCP server is accessible from VS Code environment

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Documentation

- 📖 **[Quick Start Guide](QUICKSTART.md)**: Get started in 5 minutes
- 📋 **[Implementation Status](IMPLEMENTATION_STATUS.md)**: Detailed feature checklist
- 📊 **[Project Summary](SUMMARY.md)**: Architecture and metrics overview
- 🔧 **[Setup Instructions](SETUP.md)**: Development environment setup

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Inspired by [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## Support

- 📖 [Documentation](https://github.com/vijay-nirmal/mcp-copilot-relay/wiki)
- 🐛 [Issue Tracker](https://github.com/vijay-nirmal/mcp-copilot-relay/issues)
- 💬 [Discussions](https://github.com/vijay-nirmal/mcp-copilot-relay/discussions)

---

**Made with ❤️ for the MCP community**
