import * as vscode from 'vscode';
import { MCPClient } from './mcpClient/index';
import { ConfigManager } from './config/index';
import { ToolRegistry } from './toolRegistry/index';
import { MCPWebviewProvider } from './ui/WebviewProvider';
import { ServerStatus, ConnectionStatus } from './types';

export class MCPRelayExtension {
  private clients: Map<string, MCPClient> = new Map();
  private clientErrors: Map<string, { message: string; stack?: string }> = new Map();
  private toolRegistry: ToolRegistry;
  private configManager: ConfigManager;
  private webviewProvider: MCPWebviewProvider;
  private logger: vscode.OutputChannel;
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.logger = vscode.window.createOutputChannel('MCP Copilot Relay');
    this.configManager = new ConfigManager(context);
    this.toolRegistry = new ToolRegistry(this.configManager, this.logger);
    this.webviewProvider = new MCPWebviewProvider(
      context.extensionUri,
      this
    );
  }

  public async activate(): Promise<void> {
    this.logger.appendLine('Activating MCP Copilot Relay extension...');

    // Register webview provider
    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'mcp-copilot-relay.panel',
        this.webviewProvider
      )
    );

    // Register commands
    this.registerCommands();

    // Watch for configuration changes
    this.disposables.push(
      this.configManager.onConfigChange(async () => {
        this.logger.appendLine('Configuration changed, reloading servers...');
        await this.reloadServers();
      })
    );

    // Initialize servers
    await this.initializeServers();

    this.logger.appendLine('MCP Copilot Relay extension activated successfully');
  }

  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('mcp-copilot-relay.showPanel', () => {
        vscode.commands.executeCommand('mcp-copilot-relay.panel.focus');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('mcp-copilot-relay.refreshServers', async () => {
        await this.reloadServers();
        vscode.window.showInformationMessage('MCP servers refreshed');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('mcp-copilot-relay.addServer', async () => {
        await this.promptAddServer();
      })
    );
  }

  private async initializeServers(): Promise<void> {
    const servers = this.configManager.getServers();
    this.logger.appendLine(`Found ${servers.length} configured servers`);

    for (const serverConfig of servers) {
      if (serverConfig.enabled !== false) {
        await this.connectServer(serverConfig.name);
      }
    }
  }

  public async connectServer(serverName: string): Promise<void> {
    const servers = this.configManager.getServers();
    const serverConfig = servers.find(s => s.name === serverName);

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in configuration`);
    }

    // Disconnect existing client if any
    await this.disconnectServer(serverName);

    this.logger.appendLine(`Connecting to server: ${serverName}`);

    const client = new MCPClient(
      serverConfig,
      this.configManager.getAutoReconnect(),
      this.configManager.getReconnectDelay()
    );

    // Set up event handlers
    client.on('statusChanged', (status: ConnectionStatus) => {
      this.logger.appendLine(`Server ${serverName} status changed: ${status}`);
      this.webviewProvider.updateServerStatus(this.getServerStatuses());
    });

    client.on('toolsDiscovered', async () => {
      this.logger.appendLine(`Tools discovered from server: ${serverName}`);
      await this.toolRegistry.registerServerTools(serverName, client);
      this.webviewProvider.updateServerStatus(this.getServerStatuses());
    });

    client.on('error', (error: Error) => {
      this.logger.appendLine(`Server ${serverName} error: ${error.message}`);
      this.clientErrors.set(serverName, {
        message: error.message,
        stack: error.stack
      });
      vscode.window.showErrorMessage(
        `MCP Server "${serverName}" error: ${error.message}`
      );
      this.webviewProvider.updateServerStatus(this.getServerStatuses());
    });

    this.clients.set(serverName, client);

    try {
      await client.connect();
    } catch (error) {
      this.logger.appendLine(
        `Failed to connect to server ${serverName}: ${error}`
      );
      // Client will be in error state but kept in map for retry
    }
  }

  public async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      this.logger.appendLine(`Disconnecting from server: ${serverName}`);
      this.toolRegistry.unregisterServerTools(serverName);
      await client.disconnect();
      this.clients.delete(serverName);
      this.clientErrors.delete(serverName);
      this.webviewProvider.updateServerStatus(this.getServerStatuses());
    }
  }

  public async reconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      this.logger.appendLine(`Manually reconnecting to server: ${serverName}`);
      this.clientErrors.delete(serverName);
      try {
        await client.reconnect();
        vscode.window.showInformationMessage(`Reconnected to server: ${serverName}`);
      } catch (error) {
        this.logger.appendLine(`Failed to reconnect to ${serverName}: ${error}`);
        throw error;
      }
    } else {
      // Server not in clients map, try connecting fresh
      await this.connectServer(serverName);
    }
  }

  public async reloadServers(): Promise<void> {
    // Disconnect all current servers
    const serverNames = Array.from(this.clients.keys());
    for (const name of serverNames) {
      await this.disconnectServer(name);
    }

    // Reinitialize from config
    await this.initializeServers();
  }

  public getServerStatuses(): ServerStatus[] {
    const servers = this.configManager.getServers();
    return servers.map(serverConfig => {
      const client = this.clients.get(serverConfig.name);
      const status = client ? client.getStatus() : ConnectionStatus.Disconnected;
      const errorDetails = this.clientErrors.get(serverConfig.name);

      return {
        name: serverConfig.name,
        status,
        tools: client ? client.getTools() : [],
        error: status === ConnectionStatus.Error && errorDetails ? errorDetails.message : undefined,
        errorStack: status === ConnectionStatus.Error && errorDetails ? errorDetails.stack : undefined
      };
    });
  }

  public getConfigManager(): ConfigManager {
    return this.configManager;
  }

  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  private async promptAddServer(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter server name',
      validateInput: (value: string) => {
        if (!value) {
          return 'Server name is required';
        }
        const servers = this.configManager.getServers();
        if (servers.some(s => s.name === value)) {
          return 'Server name already exists';
        }
        return null;
      }
    });

    if (!name) {
      return;
    }

    const transport = await vscode.window.showQuickPick(
      [
        { label: 'Stdio (Local Process)', value: 'stdio' },
        { label: 'SSE (Remote Server)', value: 'sse' }
      ],
      {
        placeHolder: 'Select transport type'
      }
    );

    if (!transport) {
      return;
    }

    if (transport.value === 'sse') {
      // Remote SSE server
      const url = await vscode.window.showInputBox({
        prompt: 'Enter server URL',
        placeHolder: 'https://example.com/mcp',
        validateInput: (value: string) => {
          if (!value) {
            return 'URL is required';
          }
          try {
            new URL(value);
            return null;
          } catch {
            return 'Invalid URL format';
          }
        }
      });

      if (!url) {
        return;
      }

      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter API key (optional)',
        placeHolder: 'Leave empty if not required',
        password: true
      });

      try {
        await this.configManager.addServer({
          name,
          transport: 'sse',
          url,
          apiKey: apiKey || undefined,
          enabled: true
        });

        await this.connectServer(name);
        vscode.window.showInformationMessage(`Server "${name}" added successfully`);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to add server: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Local stdio server
      const command = await vscode.window.showInputBox({
        prompt: 'Enter command to execute',
        placeHolder: 'e.g., node, python, npx'
      });

      if (!command) {
        return;
      }

      const argsInput = await vscode.window.showInputBox({
        prompt: 'Enter command arguments (comma-separated)',
        placeHolder: 'e.g., server.js, --port, 8080'
      });

      const args = argsInput
        ? argsInput.split(',').map((arg: string) => arg.trim()).filter((arg: string) => arg)
        : [];

      try {
        await this.configManager.addServer({
          name,
          transport: 'stdio',
          command,
          args,
          enabled: true
        });

        await this.connectServer(name);
        vscode.window.showInformationMessage(`Server "${name}" added successfully`);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to add server: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  public async deactivate(): Promise<void> {
    this.logger.appendLine('Deactivating MCP Copilot Relay extension...');

    // Disconnect all servers
    const serverNames = Array.from(this.clients.keys());
    for (const name of serverNames) {
      await this.disconnectServer(name);
    }

    // Unregister all tools
    this.toolRegistry.dispose();

    // Dispose all disposables
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.logger.appendLine('MCP Copilot Relay extension deactivated');
    this.logger.dispose();
  }
}

let extension: MCPRelayExtension | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extension = new MCPRelayExtension(context);
  await extension.activate();
}

export async function deactivate(): Promise<void> {
  if (extension) {
    await extension.deactivate();
    extension = undefined;
  }
}
