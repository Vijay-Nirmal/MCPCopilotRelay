import * as vscode from 'vscode';
import { ServerConfig, ToolState } from '../types';

export class ConfigManager {
  private static readonly CONFIG_SECTION = 'mcpCopilotRelay';
  private static readonly SERVERS_KEY = 'servers';
  private static readonly TOOL_STATES_KEY = 'toolStates';
  private static readonly AUTO_RECONNECT_KEY = 'autoReconnect';
  private static readonly RECONNECT_DELAY_KEY = 'reconnectDelay';

  constructor(private context: vscode.ExtensionContext) { }

  /**
   * Get all configured MCP servers
   */
  public getServers(): ServerConfig[] {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    const servers = config.get<ServerConfig[]>(ConfigManager.SERVERS_KEY, []);
    return servers;
  }

  /**
   * Add a new server configuration
   */
  public async addServer(server: ServerConfig): Promise<void> {
    const servers = this.getServers();

    // Check for duplicate names
    if (servers.some(s => s.name === server.name)) {
      throw new Error(`Server with name "${server.name}" already exists`);
    }

    servers.push(server);
    await this.saveServers(servers);
  }

  /**
   * Update an existing server configuration
   */
  public async updateServer(name: string, updates: Partial<ServerConfig>): Promise<void> {
    const servers = this.getServers();
    const index = servers.findIndex(s => s.name === name);

    if (index === -1) {
      throw new Error(`Server "${name}" not found`);
    }

    // If renaming, check for duplicates
    if (updates.name && updates.name !== name) {
      if (servers.some(s => s.name === updates.name)) {
        throw new Error(`Server with name "${updates.name}" already exists`);
      }
    }

    servers[index] = { ...servers[index], ...updates };
    await this.saveServers(servers);
  }

  /**
   * Remove a server configuration
   */
  public async removeServer(name: string): Promise<void> {
    const servers = this.getServers();
    const filtered = servers.filter(s => s.name !== name);

    if (filtered.length === servers.length) {
      throw new Error(`Server "${name}" not found`);
    }

    await this.saveServers(filtered);

    // Also clean up tool states for this server
    await this.cleanupToolStates(name);
  }

  /**
   * Save servers array to configuration
   */
  private async saveServers(servers: ServerConfig[]): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    await config.update(
      ConfigManager.SERVERS_KEY,
      servers,
      vscode.ConfigurationTarget.Global
    );
  }

  /**
   * Get tool state (enabled/disabled, custom name)
   */
  public getToolState(serverName: string, toolName: string): ToolState {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    const toolStates = config.get<Record<string, Record<string, ToolState>>>(
      ConfigManager.TOOL_STATES_KEY,
      {}
    );

    const serverStates = toolStates[serverName] || {};
    return serverStates[toolName] || { enabled: true };
  }

  /**
   * Set tool state
   */
  public async setToolState(
    serverName: string,
    toolName: string,
    state: ToolState
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    const toolStates = config.get<Record<string, Record<string, ToolState>>>(
      ConfigManager.TOOL_STATES_KEY,
      {}
    );

    if (!toolStates[serverName]) {
      toolStates[serverName] = {};
    }

    toolStates[serverName][toolName] = state;

    await config.update(
      ConfigManager.TOOL_STATES_KEY,
      toolStates,
      vscode.ConfigurationTarget.Global
    );
  }

  /**
   * Get all tool states for a server
   */
  public getServerToolStates(serverName: string): Record<string, ToolState> {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    const toolStates = config.get<Record<string, Record<string, ToolState>>>(
      ConfigManager.TOOL_STATES_KEY,
      {}
    );

    return toolStates[serverName] || {};
  }

  /**
   * Clean up tool states when a server is removed
   */
  private async cleanupToolStates(serverName: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    const toolStates = config.get<Record<string, Record<string, ToolState>>>(
      ConfigManager.TOOL_STATES_KEY,
      {}
    );

    delete toolStates[serverName];

    await config.update(
      ConfigManager.TOOL_STATES_KEY,
      toolStates,
      vscode.ConfigurationTarget.Global
    );
  }

  /**
   * Get auto-reconnect setting
   */
  public getAutoReconnect(): boolean {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    return config.get<boolean>(ConfigManager.AUTO_RECONNECT_KEY, true);
  }

  /**
   * Get reconnect delay setting (in milliseconds)
   */
  public getReconnectDelay(): number {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    return config.get<number>(ConfigManager.RECONNECT_DELAY_KEY, 5000);
  }

  /**
   * Watch for configuration changes
   */
  public onConfigChange(
    callback: (event: vscode.ConfigurationChangeEvent) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(ConfigManager.CONFIG_SECTION)) {
        callback(event);
      }
    });
  }
}
