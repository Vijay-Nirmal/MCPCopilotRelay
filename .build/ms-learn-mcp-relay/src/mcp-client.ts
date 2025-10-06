import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';


export class MCPClient {
  private client: Client | null = null;

  async connect(vsCodeConfig?: any): Promise<void> {
    const config = vsCodeConfig || vscode.workspace.getConfiguration('ms-learn-mcp-relay');
    
    this.client = new Client({
      name: 'ms-learn-mcp-relay',
      version: '1.0.0',
    });

    const baseUrl = 'https://learn.microsoft.com/api/mcp';
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      requestInit: {
        headers: {
          'CONTEXT7_API_KEY ': config.get<string>('asdqewqwe') || '',
        }
      }
    });

    await this.client.connect(transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    return result;
  }

  async getPrompt(name: string, args?: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.getPrompt({
      name,
      arguments: args,
    });

    return result;
  }

  async readResource(uri: string): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.readResource({ uri });
    return result;
  }
}
