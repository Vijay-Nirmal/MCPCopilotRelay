import { ExtensionConfig } from '../vsix-builder.js';

// Helper to escape special characters for template strings
function escapeTemplateString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export function generateExtensionTs(config: ExtensionConfig): string {
  const hasTools = Object.keys(config.mappings.tools).length > 0;
  const hasPrompts = Object.keys(config.mappings.prompts).length > 0;

  return `import * as vscode from 'vscode';
import { MCPClient } from './mcp-client';

let mcpClient: MCPClient;

function getErrorMessage(error: unknown): { message: string; details: string } {
  if (error instanceof Error) {
    const details = error.stack || error.message;
    let message = error.message;
    
    // Provide more context for common errors
    if (message.includes('ECONNREFUSED')) {
      message = 'Connection refused. The MCP server may not be running or is unreachable.';
    } else if (message.includes('ENOTFOUND')) {
      message = 'Server not found. Please check the server URL in settings.';
    } else if (message.includes('ETIMEDOUT')) {
      message = 'Connection timed out. The server may be slow or unreachable.';
    } else if (message.includes('EADDRINUSE')) {
      message = 'Port already in use. Another process may be using the same port.';
    } else if (message.includes('spawn') && message.includes('ENOENT')) {
      message = 'Command not found. Please check that the MCP server command is installed and in your PATH.';
    } else if (message.includes('Required setting')) {
      message = 'Missing required configuration. ' + message;
    }
    
    return { message, details };
  }
  
  return { 
    message: String(error), 
    details: String(error) 
  };
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('${escapeTemplateString(config.extension.displayName)} is now active');

  // Initialize MCP client
  mcpClient = new MCPClient();
  
  // Check if auto-connect is enabled
  const config = vscode.workspace.getConfiguration('${config.extension.name}');
  const autoConnect = config.get<boolean>('autoConnect', false);
  
  if (autoConnect) {
    try {
      // Connect immediately on activation
      await mcpClient.connect(config);
      console.log('✅ Connected to MCP server on startup');
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      console.error('❌ Failed to connect to MCP server on startup:');
      console.error('Error:', errorInfo.message);
      console.error('Details:', errorInfo.details);
      
      vscode.window.showErrorMessage(
        \`Failed to connect to MCP server: \${errorInfo.message}\`,
        'View Settings',
        'Retry'
      ).then(selection => {
        if (selection === 'View Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', '${config.extension.name}');
        } else if (selection === 'Retry') {
          mcpClient.connect(config).then(
            () => vscode.window.showInformationMessage('Successfully connected to MCP server'),
            (retryError) => {
              const retryErrorInfo = getErrorMessage(retryError);
              vscode.window.showErrorMessage(\`Retry failed: \${retryErrorInfo.message}\`);
            }
          );
        }
      });
      // Don't return - allow extension to activate even if connection fails
      // Tools will attempt to reconnect on first use
    }
  } else {
    console.log('Auto-connect disabled. MCP server will connect on first tool use.');
  }

${hasTools ? generateToolRegistrations(config) : ''}
${hasPrompts ? generateChatParticipantRegistrations(config) : ''}

  // Watch for configuration changes and restart MCP server
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      // Check if any setting for this extension changed
      if (e.affectsConfiguration('${config.extension.name}')) {
        console.log('Configuration changed, restarting MCP server...');
        
        // Only reconnect if the client was already connected or if autoConnect is now enabled
        const newConfig = vscode.workspace.getConfiguration('${config.extension.name}');
        const autoConnect = newConfig.get<boolean>('autoConnect', false);
        
        if (mcpClient.isConnected() || autoConnect) {
          try {
            await mcpClient.reconnect(newConfig);
            console.log('✅ MCP server restarted successfully');
            vscode.window.showInformationMessage('MCP server restarted with new configuration');
          } catch (error) {
            const errorInfo = getErrorMessage(error);
            console.error('❌ Failed to restart MCP server:');
            console.error('Error:', errorInfo.message);
            console.error('Details:', errorInfo.details);
            
            vscode.window.showErrorMessage(
              \`Failed to restart MCP server: \${errorInfo.message}\`,
              'View Settings',
              'Retry'
            ).then(selection => {
              if (selection === 'View Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', '${config.extension.name}');
              } else if (selection === 'Retry') {
                mcpClient.reconnect(newConfig).then(
                  () => vscode.window.showInformationMessage('Successfully reconnected to MCP server'),
                  (retryError) => {
                    const retryErrorInfo = getErrorMessage(retryError);
                    vscode.window.showErrorMessage(\`Retry failed: \${retryErrorInfo.message}\`);
                  }
                );
              }
            });
          }
        } else {
          console.log('MCP server not connected, will use new configuration on next connection');
        }
      }
    })
  );

  // Register cleanup
  context.subscriptions.push({
    dispose: async () => {
      await mcpClient.disconnect();
    },
  });
}

export function deactivate() {
  return mcpClient?.disconnect();
}

${hasTools ? generateToolHandlers(config) : ''}
${hasPrompts ? generateChatHandlers(config) : ''}
`;
}

function generateToolRegistrations(config: ExtensionConfig): string {
  let code = '\n  // Register Language Model Tools\n';
  
  for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
    const toolId = mapping.toolId || toolName; // Use toolId if available, fallback to original name
    if (mapping.type === 'lm-tool') {
      code += `  context.subscriptions.push(
    vscode.lm.registerTool('${toolId}', new ${capitalize(toolId)}Tool())
  );\n`;
    } else if (mapping.type === 'command') {
      code += `  context.subscriptions.push(
    vscode.commands.registerCommand('${config.extension.name}.${toolId}', handle${capitalize(toolId)}Command)
  );\n`;
    }
  }
  
  return code;
}

function generateChatParticipantRegistrations(config: ExtensionConfig): string {
  let code = '\n  // Register Chat Participants\n';
  
  for (const [promptName, mapping] of Object.entries(config.mappings.prompts)) {
    if (mapping.type === 'chat-participant') {
      code += `  const ${promptName}Participant = vscode.chat.createChatParticipant(
    '${config.extension.name}.${promptName}',
    handle${capitalize(promptName)}Chat
  );
  ${promptName}Participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  context.subscriptions.push(${promptName}Participant);\n`;
    }
  }
  
  return code;
}

function generateToolHandlers(config: ExtensionConfig): string {
  let code = '';
  
  for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
    const tool = config.capabilities.tools?.find(t => t.name === toolName);
    if (!tool) continue;

    const toolId = mapping.toolId || toolName; // Use toolId for VS Code identifiers
    
    if (mapping.type === 'lm-tool') {
      code += `
class ${capitalize(toolId)}Tool implements vscode.LanguageModelTool<any> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
    _token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: '${escapeTemplateString(mapping.displayName)}',
      confirmationMessages: {
        title: '${escapeTemplateString(mapping.displayName)}',
        message: new vscode.MarkdownString(\`Invoke ${escapeTemplateString(mapping.displayName)}?\`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<any>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      // Use original toolName for MCP server call, toolId is just for VS Code
      const result = await mcpClient.callTool('${toolName}', options.input);
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      console.error('❌ Failed to invoke tool \\'${toolId}\\':', errorInfo.message);
      console.error('Details:', errorInfo.details);
      throw new Error(\`Failed to invoke ${toolId}: \${errorInfo.message}\`);
    }
  }
}
`;
    } else if (mapping.type === 'command') {
      code += `
async function handle${capitalize(toolId)}Command(...args: any[]) {
  try {
    // Use original toolName for MCP server call, toolId is just for VS Code
    const result = await mcpClient.callTool('${toolName}', args[0] || {});
    vscode.window.showInformationMessage(\`Result: \${JSON.stringify(result)}\`);
  } catch (error) {
    const errorInfo = getErrorMessage(error);
    console.error('❌ Command \\'${toolId}\\' failed:', errorInfo.message);
    console.error('Details:', errorInfo.details);
    vscode.window.showErrorMessage(\`${escapeTemplateString(mapping.displayName)} failed: \${errorInfo.message}\`);
  }
}
`;
    }
  }
  
  return code;
}

function generateChatHandlers(config: ExtensionConfig): string {
  let code = '';
  
  for (const [promptName] of Object.entries(config.mappings.prompts)) {
    const prompt = config.capabilities.prompts?.find(p => p.name === promptName);
    if (!prompt) continue;

    code += `
async function handle${capitalize(promptName)}Chat(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    // Get the prompt from MCP server
    const promptArgs: any = {};
    // Map request variables to prompt arguments
    for (const [key, value] of Object.entries(request.variables)) {
      promptArgs[key] = value;
    }
    
    const promptResult = await mcpClient.getPrompt('${promptName}', promptArgs);
    
    // Send prompt messages to the language model
    const messages = promptResult.messages.map((msg: any) => 
      vscode.LanguageModelChatMessage.User(
        typeof msg.content === 'string' ? msg.content : msg.content.text
      )
    );
    
    // Add user's query
    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
    
    // Send to language model
    const chatResponse = await request.model.sendRequest(messages, {}, token);
    
    // Stream the response
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  } catch (error) {
    stream.markdown(\`Error: \${error}\`);
  }
}
`;
  }
  
  return code;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, '');
}
