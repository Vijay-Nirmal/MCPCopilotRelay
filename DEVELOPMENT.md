# Development Guide

## Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd mcp-copilot-relay
   npm install
   ```

2. **Build**
   ```bash
   npm run compile
   ```

## Running the Extension

### Method 1: Debug in VSCode

1. Open the project in VSCode
2. Press `F5` to start debugging
3. A new "Extension Development Host" window will open
4. The extension will be loaded automatically

### Method 2: Watch Mode

For continuous development:

```bash
npm run watch
```

This will recompile on file changes. Reload the Extension Development Host window (`Ctrl+R`) to see changes.

## Testing the Extension

### 1. Open the MCP Panel

- Click the plug icon in the Activity Bar
- Or run command: `MCP Copilot Relay: Show Panel`

### 2. Add a Test Server

**Option A: Using the UI**
1. Click "Add Server" in the panel
2. Fill in:
   - Name: `test-server`
   - Command: `npx`
   - Args: `-y, @modelcontextprotocol/server-filesystem, C:\Temp`

**Option B: Using Settings**
1. Open VSCode settings (`Ctrl+,`)
2. Search for "MCP Copilot Relay"
3. Edit in settings.json:
```json
{
  "mcpCopilotRelay.servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Temp"],
      "enabled": true
    }
  ]
}
```

### 3. Verify Connection

- Check server status badge (should be green "connected")
- View discovered tools in the Tools section
- Check Output channel: "MCP Copilot Relay" for logs

### 4. Test Tool Invocation

With GitHub Copilot Chat:
```
@workspace Use the filesystem__read_file tool to read a file
```

## Debugging

### View Logs

1. Open Output panel (`Ctrl+Shift+U`)
2. Select "MCP Copilot Relay" from dropdown
3. View connection, tool discovery, and invocation logs

### Debug Extension Code

1. Set breakpoints in TypeScript files
2. Press F5 to start debugging
3. Extension code will pause at breakpoints

### Debug Webview

1. In Extension Development Host, run: `Developer: Open Webview Developer Tools`
2. Select "MCP Servers" webview
3. Use Chrome DevTools for debugging UI

## Common Development Tasks

### Adding New Features

1. Create branch: `git checkout -b feature/my-feature`
2. Make changes in `src/`
3. Test in Extension Development Host
4. Commit and push

### Fixing Bugs

1. Reproduce the bug
2. Check logs in Output channel
3. Add breakpoints if needed
4. Fix and verify
5. Add prevention measures

### Updating Dependencies

```bash
npm update
npm audit fix
```

### Linting

```bash
npm run lint
```

## File Structure

```
src/
├── extension.ts          # Main entry point
├── types.ts             # Type definitions
├── mcpClient/           # MCP protocol client
│   ├── MCPClient.ts
│   └── index.ts
├── config/              # Configuration management
│   ├── ConfigManager.ts
│   └── index.ts
├── toolRegistry/        # Tool registration
│   ├── ToolRegistry.ts
│   └── index.ts
└── ui/                  # User interface
    ├── WebviewProvider.ts
    ├── webview.js
    ├── webview.css
    └── webview.html
```

## Key Components

### MCPClient (src/mcpClient/MCPClient.ts)

Handles connection to MCP servers:
- Stdio transport
- Tool discovery
- Tool invocation
- Health monitoring
- Auto-reconnect

### ToolRegistry (src/toolRegistry/ToolRegistry.ts)

Manages tool registration:
- Dynamic registration with `vscode.lm.registerTool()`
- Tool namespacing
- Enable/disable handling
- Invocation routing

### ConfigManager (src/config/ConfigManager.ts)

Manages settings:
- Server configurations
- Tool states
- Persistence
- Change detection

### WebviewProvider (src/ui/WebviewProvider.ts)

UI management:
- Webview lifecycle
- Message passing
- State updates
- User interactions

## Testing Checklist

- [ ] Extension activates without errors
- [ ] Panel opens and displays correctly
- [ ] Can add new server via UI
- [ ] Can add new server via settings
- [ ] Server connects successfully
- [ ] Tools are discovered and displayed
- [ ] Can enable/disable tools
- [ ] Can remove server
- [ ] Auto-reconnect works on failure
- [ ] Logs appear in Output channel
- [ ] UI follows VSCode theme
- [ ] No console errors in webview
- [ ] Extension deactivates cleanly

## Performance Considerations

- Tool registration is async
- Health checks run every 30 seconds
- UI updates are batched
- Large tool lists are handled efficiently

## Security Notes

- Never log sensitive data (API keys, tokens)
- Environment variables are not exposed in UI
- User confirmation for destructive actions
- Input validation for server configs

## Troubleshooting Development Issues

### "Cannot find module" errors
- Run `npm install`
- Delete `node_modules` and reinstall
- Check `tsconfig.json` paths

### Extension won't load
- Check for compile errors
- Verify `package.json` activation events
- Check Extension Development Host console

### Webview not updating
- Hard reload: `Ctrl+R` in Extension Development Host
- Check webview Developer Tools for errors
- Verify message passing in logs

### Type errors
- Update `@types/vscode` version
- Check VSCode API compatibility
- Run `npm run compile` to see all errors

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build: `npm run package`
4. Test the `.vsix` file
5. Create git tag: `git tag v0.1.0`
6. Push: `git push --tags`

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [VSCode Webview UI Toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit)
