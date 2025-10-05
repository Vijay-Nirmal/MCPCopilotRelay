import * as vscode from 'vscode';
import { MCPClient } from '../mcpClient/index';
import { MCPTool } from '../types';
import { ConfigManager } from '../config/index';

export class ToolRegistry {
  private registeredTools: Map<string, vscode.Disposable> = new Map();
  private logger: vscode.OutputChannel;

  constructor(
    private configManager: ConfigManager,
    logger: vscode.OutputChannel
  ) {
    this.logger = logger;
  }

  /**
   * Register all tools from an MCP client
   */
  public async registerServerTools(
    serverName: string,
    client: MCPClient
  ): Promise<void> {
    const tools = client.getTools();
    this.logger.appendLine(`Registering ${tools.length} tools from server: ${serverName}`);

    for (const tool of tools) {
      await this.registerTool(serverName, tool, client);
    }
  }

  /**
   * Register a single MCP tool as a VSCode Language Model Tool
   */
  private async registerTool(
    serverName: string,
    tool: MCPTool,
    client: MCPClient
  ): Promise<void> {
    const toolState = this.configManager.getToolState(serverName, tool.name);

    // Skip if tool is disabled
    if (!toolState.enabled) {
      this.logger.appendLine(`Tool ${serverName}/${tool.name} is disabled, skipping registration`);
      return;
    }

    // Use custom name if provided, otherwise namespace with server name
    const toolId = toolState.customName || `${serverName}__${tool.name}`;
    const fullToolKey = `${serverName}:${tool.name}`;

    // Unregister if already registered
    if (this.registeredTools.has(fullToolKey)) {
      this.unregisterTool(fullToolKey);
    }

    try {
      // Register the tool with VSCode Language Model Tools API
      // Note: Tool information (name, description, schema) should be dynamically registered
      const disposable = vscode.lm.registerTool(toolId, {
        invoke: async (
          options: vscode.LanguageModelToolInvocationOptions<any>,
          token: vscode.CancellationToken
        ): Promise<vscode.LanguageModelToolResult> => {
          try {
            this.logger.appendLine(
              `Invoking tool: ${serverName}/${tool.name} with args: ${JSON.stringify(options.input)}`
            );

            // Call the MCP tool through the client
            const result = await client.invokeTool(
              tool.name,
              options.input || {},
              { isCancellationRequested: token.isCancellationRequested }
            );

            this.logger.appendLine(
              `Tool ${serverName}/${tool.name} completed successfully`
            );

            // Convert result to VSCode format
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
            ]);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.appendLine(
              `Tool ${serverName}/${tool.name} failed: ${errorMessage}`
            );

            // Return error as tool result
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                JSON.stringify({ error: errorMessage }, null, 2)
              )
            ]);
          }
        }
      });

      this.registeredTools.set(fullToolKey, disposable);
      this.logger.appendLine(`Successfully registered tool: ${toolId}`);
    } catch (error) {
      this.logger.appendLine(
        `Failed to register tool ${serverName}/${tool.name}: ${error}`
      );
    }
  }

  /**
   * Convert MCP JSON Schema to VSCode tool parameters
   * This is a pass-through since both use JSON Schema, but we can add transformations if needed
   */
  private convertMCPSchemaToVSCodeParams(schema: any): any {
    // VSCode Language Model Tools use JSON Schema directly
    // We may need to add validation or transformations here
    return schema;
  }

  /**
   * Unregister a specific tool
   */
  public unregisterTool(fullToolKey: string): void {
    const disposable = this.registeredTools.get(fullToolKey);
    if (disposable) {
      disposable.dispose();
      this.registeredTools.delete(fullToolKey);
      this.logger.appendLine(`Unregistered tool: ${fullToolKey}`);
    }
  }

  /**
   * Unregister all tools from a specific server
   */
  public unregisterServerTools(serverName: string): void {
    const keysToRemove: string[] = [];

    for (const [key] of this.registeredTools) {
      if (key.startsWith(`${serverName}:`)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.unregisterTool(key);
    }

    this.logger.appendLine(`Unregistered all tools from server: ${serverName}`);
  }

  /**
   * Unregister all tools
   */
  public unregisterAllTools(): void {
    for (const [, disposable] of this.registeredTools) {
      disposable.dispose();
    }
    this.registeredTools.clear();
    this.logger.appendLine('Unregistered all tools');
  }

  /**
   * Get list of registered tool IDs
   */
  public getRegisteredTools(): string[] {
    return Array.from(this.registeredTools.keys());
  }

  /**
   * Check if a tool is registered
   */
  public isToolRegistered(serverName: string, toolName: string): boolean {
    return this.registeredTools.has(`${serverName}:${toolName}`);
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.unregisterAllTools();
  }
}
