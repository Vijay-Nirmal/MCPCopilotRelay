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

export async function activate(context: vscode.ExtensionContext) {
  console.log('${escapeTemplateString(config.extension.displayName)} is now active');

  // Initialize MCP client
  mcpClient = new MCPClient();
  
  try {
    // Get VS Code configuration and pass to MCP client
    const config = vscode.workspace.getConfiguration('${config.extension.name}');
    await mcpClient.connect(config);
    console.log('Connected to MCP server');
  } catch (error) {
    vscode.window.showErrorMessage(\`Failed to connect to MCP server: \${error}\`);
    return;
  }

${hasTools ? generateToolRegistrations(config) : ''}
${hasPrompts ? generateChatParticipantRegistrations(config) : ''}

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
      throw new Error(\`Failed to invoke ${toolId}: \${error}\`);
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
    vscode.window.showErrorMessage(\`Error: \${error}\`);
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
