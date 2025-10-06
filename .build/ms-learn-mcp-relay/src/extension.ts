import * as vscode from 'vscode';
import { MCPClient } from './mcp-client';

let mcpClient: MCPClient;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Microsoft Learn MCP Relay is now active');

  // Initialize MCP client
  mcpClient = new MCPClient();
  
  try {
    // Get VS Code configuration and pass to MCP client
    const config = vscode.workspace.getConfiguration('ms-learn-mcp-relay');
    await mcpClient.connect(config);
    console.log('Connected to MCP server');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to connect to MCP server: ${error}`);
    return;
  }


  // Register Language Model Tools
  context.subscriptions.push(
    vscode.lm.registerTool('ms-learn-mcp-relay_microsoft_docs_fetch', new MicrosoftdocsfetchTool())
  );
  context.subscriptions.push(
    vscode.lm.registerTool('ms-learn-mcp-relay_microsoft_code_sample_search', new MicrosoftcodesamplesearchTool())
  );
  context.subscriptions.push(
    vscode.lm.registerTool('ms-learn-mcp-relay_microsoft_docs_search', new MicrosoftdocssearchTool())
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


class MicrosoftdocsfetchTool implements vscode.LanguageModelTool<any> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
    _token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: 'microsoft_docs_fetch',
      confirmationMessages: {
        title: 'microsoft_docs_fetch',
        message: new vscode.MarkdownString(`Invoke microsoft_docs_fetch?`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<any>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const result = await mcpClient.callTool('microsoft_docs_fetch', options.input);
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (error) {
      throw new Error(`Failed to invoke microsoft_docs_fetch: ${error}`);
    }
  }
}

class MicrosoftcodesamplesearchTool implements vscode.LanguageModelTool<any> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
    _token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: 'microsoft_code_sample_search',
      confirmationMessages: {
        title: 'microsoft_code_sample_search',
        message: new vscode.MarkdownString(`Invoke microsoft_code_sample_search?`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<any>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const result = await mcpClient.callTool('microsoft_code_sample_search', options.input);
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (error) {
      throw new Error(`Failed to invoke microsoft_code_sample_search: ${error}`);
    }
  }
}

class MicrosoftdocssearchTool implements vscode.LanguageModelTool<any> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
    _token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: 'microsoft_docs_search',
      confirmationMessages: {
        title: 'microsoft_docs_search',
        message: new vscode.MarkdownString(`Invoke microsoft_docs_search?`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<any>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const result = await mcpClient.callTool('microsoft_docs_search', options.input);
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (error) {
      throw new Error(`Failed to invoke microsoft_docs_search: ${error}`);
    }
  }
}


