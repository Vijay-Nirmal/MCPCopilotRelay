# MCP Copilot Relay

A Visual Studio Code extension that bridges Model Context Protocol (MCP) servers to VSCode's Language Model Tools API, enabling seamless integration of MCP tools with GitHub Copilot and other AI assistants in VSCode.

## Features

- 🔌 **Connect to MCP Servers**: Connect to local (stdio) or remote (HTTP/SSE) MCP servers
- 🌐 **Remote Server Support**: Connect to cloud-hosted MCP servers via HTTP (modern) or SSE (legacy)
- 🔧 **Dynamic Tool Discovery**: Automatically discover and register tools from connected MCP servers
- 🎛️ **Tool Management**: Enable/disable individual tools and customize their names
- 📊 **Visual Management UI**: Side panel for managing servers, tools, and viewing connection status
- 🔄 **Auto-reconnect**: Automatic reconnection on server failures (limited to 3 attempts)
- 🏷️ **Namespace Support**: Tools are namespaced by server name to avoid conflicts
- 🔐 **Secure Remote Access**: API key authentication and custom headers for remote servers
- 📝 **Comprehensive Logging**: Detailed logging in the output channel

## Installation

### From VSIX (Local Development)

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run compile
   ```
4. Package the extension:
   ```bash
   npx vsce package
   ```
5. Install the `.vsix` file in VSCode:
   - Open VSCode
   - Go to Extensions view (Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

## Usage

### Adding an MCP Server

#### Method 1: Using the Side Panel

1. Open the MCP Copilot Relay panel from the Activity Bar (plug icon)
2. Click "Add Server"
3. Select transport type:
   - **Local Process (stdio)**: For local MCP servers running as processes
   - **Remote Server (HTTP)**: For modern cloud-hosted MCP servers
   - **Remote Server (SSE - Legacy)**: For older cloud-hosted MCP servers
4. Enter the server details:
   
   **For Local Process (stdio):**
   - **Name**: Unique identifier for the server
   - **Command**: Executable command (e.g., `node`, `python`)
   - **Arguments**: Command arguments (comma-separated)
   - **Environment Variables**: Optional (JSON format)
   
   **For Remote Server (SSE):**
   - **Name**: Unique identifier for the server
   - **Server URL**: Full HTTP/HTTPS endpoint
   - **API Key**: Optional authentication token
5. Click "Add"

#### Method 2: Using VSCode Settings

Add server configurations to your `settings.json`:

**Local Process (stdio) example:**
```json
{
  "mcpCopilotRelay.servers": [
    {
      "name": "my-local-server",
      "transport": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "enabled": true
    }
  ]
}
```

**Remote Server (SSE - Legacy) example:**
```json
{
  "mcpCopilotRelay.servers": [
    {
      "name": "my-legacy-server",
      "transport": "sse",
      "url": "https://api.example.com/mcp",
      "apiKey": "your-api-key-here",
      "enabled": true
    }
  ]
}
```

**Remote Server (HTTP - Modern) example:**
```json
{
  "mcpCopilotRelay.servers": [
    {
      "name": "my-modern-server",
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "apiKey": "your-api-key-here",
      "enabled": true
    }
  ]
}
```

**Mixed configuration:**
```json
{
  "mcpCopilotRelay.servers": [
    {
      "name": "local-python-server",
      "transport": "stdio",
      "command": "python",
      "args": ["-m", "my_mcp_server"],
      "enabled": true
    },
    {
      "name": "cloud-mcp-service",
      "transport": "http",
      "url": "https://mcp.myservice.com/api",
      "apiKey": "sk_live_abc123",
      "enabled": true
    },
    {
      "name": "legacy-sse-server",
      "transport": "sse",
      "url": "https://legacy.example.com/sse",
      "enabled": true
    }
  ]
}
```

### Managing Tools

Once a server is connected, its tools will appear in the side panel:

- **Enable/Disable**: Toggle the checkbox next to each tool to enable or disable it
- **Custom Names**: Tools are automatically namespaced as `servername__toolname` to avoid conflicts
- **View Details**: Tool descriptions are displayed under each tool name

### Server Management

- **Connect/Disconnect**: Use the plug/disconnect icons in the server card
- **Remove Server**: Click the trash icon to remove a server configuration
- **View Status**: Server status is displayed with color-coded badges:
  - 🟢 **Connected**: Server is active and tools are registered
  - 🟡 **Connecting**: Connection in progress
  - ⚪ **Disconnected**: Server is not connected
  - 🔴 **Error**: Connection failed (see error message)

### Using MCP Tools with Copilot

Once tools are registered, they become available to GitHub Copilot Chat:

1. Open GitHub Copilot Chat
2. Reference tools in your prompts: `@workspace use the my-mcp-server__search tool to find...`
3. Copilot will automatically invoke the tool when appropriate

## Configuration

### Extension Settings

This extension contributes the following settings:

- `mcpCopilotRelay.servers`: Array of MCP server configurations
- `mcpCopilotRelay.toolStates`: Tool enable/disable states and custom names (managed automatically)
- `mcpCopilotRelay.autoReconnect`: Enable automatic reconnection on server failure (default: `true`)
- `mcpCopilotRelay.reconnectDelay`: Delay before reconnection attempt in milliseconds (default: `5000`)

### Server Configuration Schema

```typescript
interface ServerConfig {
  name: string;                      // Unique server identifier
  transport: 'stdio' | 'sse' | 'http';  // Transport type
  
  // For stdio transport (local process)
  command?: string;                  // Executable command (required for stdio)
  args?: string[];                   // Command arguments
  env?: Record<string, string>;      // Environment variables
  
  // For SSE transport (legacy remote server)
  url?: string;                      // Server URL (required for sse)
  apiKey?: string;                   // Authentication token
  
  // For HTTP transport (modern remote server)
  url?: string;                      // Server URL (required for http)
  apiKey?: string;                   // Authentication token
  headers?: Record<string, string>;  // Custom HTTP headers
  
  enabled?: boolean;                 // Whether server should be active (default: true)
}
```

## Architecture

### Core Components

```
src/
├── extension.ts           # Entry point, orchestrates components
├── types.ts              # TypeScript interfaces and types
├── mcpClient/            # MCP protocol client
│   ├── MCPClient.ts      # Client implementation with stdio and SSE transports
│   └── index.ts
├── config/               # Configuration management
│   ├── ConfigManager.ts  # Settings persistence and retrieval
│   └── index.ts
├── toolRegistry/         # Tool registration
│   ├── ToolRegistry.ts   # VSCode Language Model Tools integration
│   └── index.ts
└── ui/                   # User interface
    ├── WebviewProvider.ts # Webview management
    ├── webview.js        # UI logic
    ├── webview.css       # UI styles (theme-aware)
    └── webview.html      # UI template
```

### Data Flow

1. **Server Connection**: `MCPClient` establishes stdio connection to MCP server
2. **Tool Discovery**: Client queries server for available tools via MCP protocol
3. **Tool Registration**: `ToolRegistry` registers tools with `vscode.lm.registerTool()`
4. **Tool Invocation**: When Copilot calls a tool:
   - VSCode routes to our tool handler
   - Handler forwards to `MCPClient`
   - Client sends MCP `tools/call` request
   - Response is formatted and returned to Copilot

### Key Features Implementation

#### Health Monitoring
- Periodic health checks (every 30 seconds)
- Automatic reconnection on failure
- Configurable reconnection delay

#### Tool Namespacing
- Tools are registered as `servername__toolname`
- Prevents conflicts between servers
- Custom names can be configured

#### Cancellation Support
- Tool invocations respect VSCode cancellation tokens
- Graceful handling of cancelled operations

## Example MCP Servers

Here are some example MCP server configurations:

### File System Server
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
}
```

### GitHub Server
```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
  }
}
```

### Custom Node.js Server
```json
{
  "name": "custom",
  "command": "node",
  "args": ["./my-mcp-server/index.js"]
}
```

## Troubleshooting

### Server Won't Connect

1. Check the Output channel: "MCP Copilot Relay"
2. Verify the command and arguments are correct
3. Ensure the MCP server executable is in your PATH
4. Check environment variables are properly set

### Tools Not Appearing in Copilot

1. Verify the server status is "Connected"
2. Check that tools are enabled (checkbox in UI)
3. Ensure tools are properly registered (check Output channel)
4. Try reloading the window: `Developer: Reload Window`

### Permission Errors

- MCP servers may need specific permissions (file access, network, etc.)
- Check server-specific documentation for required permissions
- Verify environment variables (API keys, tokens) are correct

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package extension
npx vsce package
```

### Project Structure

- `src/`: TypeScript source files
- `dist/`: Compiled JavaScript output
- `node_modules/`: Dependencies
- `package.json`: Extension manifest and dependencies
- `tsconfig.json`: TypeScript configuration
- `webpack.config.js`: Build configuration

## Requirements

- Visual Studio Code 1.95.0 or higher
- Node.js 18.x or higher (for MCP SDK)
- GitHub Copilot extension (to use tools with Copilot)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [VSCode Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)
- [MCP SDK Repository](https://github.com/modelcontextprotocol/sdk)

## Changelog

### 0.1.0 (Initial Release)

- Connect to MCP servers via stdio transport
- Dynamic tool discovery and registration
- Side panel UI for server and tool management
- Auto-reconnect functionality
- Tool enable/disable controls
- Comprehensive logging
- Theme-aware UI

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.
