import * as vscode from 'vscode';
import { ServerStatus } from '../types';

export class MCPWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extension: any // Will be MCPRelayExtension
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    // Send initial state
    this.updateServerStatus(this.extension.getServerStatuses());
  }

  private async handleMessage(message: any): Promise<void> {
    const configManager = this.extension.getConfigManager();

    switch (message.type) {
      case 'getServers':
        this.updateServerStatus(this.extension.getServerStatuses());
        break;

      case 'connectServer':
        try {
          await this.extension.connectServer(message.serverName);
          vscode.window.showInformationMessage(
            `Connected to server: ${message.serverName}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'reconnectServer':
        try {
          await this.extension.reconnectServer(message.serverName);
          vscode.window.showInformationMessage(
            `Reconnecting to server: ${message.serverName}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to reconnect: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'disconnectServer':
        try {
          await this.extension.disconnectServer(message.serverName);
          vscode.window.showInformationMessage(
            `Disconnected from server: ${message.serverName}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'addServer':
        try {
          await configManager.addServer(message.config);
          await this.extension.connectServer(message.config.name);
          vscode.window.showInformationMessage(
            `Server "${message.config.name}" added successfully`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to add server: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'removeServer':
        try {
          await this.extension.disconnectServer(message.serverName);
          await configManager.removeServer(message.serverName);
          vscode.window.showInformationMessage(
            `Server "${message.serverName}" removed successfully`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to remove server: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'updateServer':
        try {
          await configManager.updateServer(message.serverName, message.updates);
          await this.extension.reloadServers();
          vscode.window.showInformationMessage(
            `Server "${message.serverName}" updated successfully`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to update server: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'setToolState':
        try {
          await configManager.setToolState(
            message.serverName,
            message.toolName,
            message.state
          );

          // Reload the specific server to apply changes
          await this.extension.disconnectServer(message.serverName);
          await this.extension.connectServer(message.serverName);

          this.updateServerStatus(this.extension.getServerStatuses());
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to update tool state: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;

      case 'getToolStates': {
        const toolStates = configManager.getServerToolStates(message.serverName);
        this.sendMessage({
          type: 'toolStates',
          serverName: message.serverName,
          states: toolStates
        });
        break;
      }
    }
  }

  public updateServerStatus(statuses: ServerStatus[]): void {
    this.sendMessage({
      type: 'serverStatus',
      statuses
    });
  }

  private sendMessage(message: any): void {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.css')
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    const toolkitUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        '@vscode/webview-ui-toolkit',
        'dist',
        'toolkit.js'
      )
    );

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css'
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <link href="${codiconsUri}" rel="stylesheet" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>MCP Copilot Relay</title>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>MCP Servers</h2>
      <vscode-button id="toggle-add-server-btn">
        <span class="codicon codicon-add"></span>
        Add Server
      </vscode-button>
    </div>

    <!-- Inline Add Server Form (collapsible) -->
    <div id="add-server-form-container" class="add-server-form-container" style="display: none;">
      <h3>Add MCP Server</h3>
      <form id="add-server-form">
        <div class="form-group">
          <label for="server-name">Name *</label>
          <vscode-text-field id="server-name" required placeholder="my-server"></vscode-text-field>
        </div>
        
        <div class="form-group">
          <label for="server-transport">Transport Type *</label>
          <vscode-dropdown id="server-transport">
            <vscode-option value="stdio" selected>Local Process (stdio)</vscode-option>
            <vscode-option value="sse">Remote Server (SSE)</vscode-option>
          </vscode-dropdown>
        </div>
        
        <!-- Stdio fields -->
        <div id="stdio-fields">
          <div class="form-group">
            <label for="server-command">Command *</label>
            <vscode-text-field id="server-command" placeholder="e.g., node, python, npx"></vscode-text-field>
          </div>
          
          <div class="form-group">
            <label for="server-args">Arguments (comma-separated)</label>
            <vscode-text-field id="server-args" placeholder="e.g., server.js, --port, 8080"></vscode-text-field>
          </div>
        </div>
        
        <!-- SSE fields -->
        <div id="sse-fields" style="display: none;">
          <div class="form-group">
            <label for="server-url">Server URL *</label>
            <vscode-text-field id="server-url" placeholder="https://example.com/mcp"></vscode-text-field>
          </div>
          
          <div class="form-group">
            <label for="server-apikey">API Key (optional)</label>
            <vscode-text-field id="server-apikey" type="password" placeholder="Your API key"></vscode-text-field>
          </div>
        </div>
        
        <div class="form-actions">
          <vscode-button type="submit">Add Server</vscode-button>
          <vscode-button appearance="secondary" type="button" id="cancel-add-server">Cancel</vscode-button>
        </div>
      </form>
    </div>

    <vscode-divider></vscode-divider>

    <div id="servers-container"></div>

    <!-- Error Details Dialog -->
    <div id="error-details-dialog" class="dialog" style="display: none;">
      <div class="dialog-content">
        <h3>Error Details</h3>
        <div id="error-details-content" class="error-details"></div>
        <div class="dialog-actions">
          <vscode-button id="close-error-details">Close</vscode-button>
        </div>
      </div>
    </div>
  </div>
  <script type="module" src="${toolkitUri}"></script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
