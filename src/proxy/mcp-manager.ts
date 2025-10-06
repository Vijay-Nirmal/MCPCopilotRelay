import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export type TransportType = 'stdio' | 'sse' | 'http';

export interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface RemoteConfig {
  url: string;
  headers?: Record<string, string>;
}

export type MCPConfig = 
  | { type: 'stdio'; config: StdioConfig }
  | { type: 'sse'; config: RemoteConfig }
  | { type: 'http'; config: RemoteConfig };

export interface MCPCapabilities {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema: any;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
}

export class MCPManager {
  private client: Client | null = null;
  private config: MCPConfig | null = null;
  private capabilities: MCPCapabilities | null = null;

  async connect(config: MCPConfig): Promise<void> {
    // Disconnect existing client if any
    await this.disconnect();

    this.config = config;

    try {
      if (config.type === 'stdio') {
        await this.connectStdio(config.config);
      } else if (config.type === 'http') {
        await this.connectHTTP(config.config);
      } else if (config.type === 'sse') {
        await this.connectSSE(config.config);
      }
    } catch (error) {
      this.client = null;
      this.config = null;
      throw new Error(`Failed to connect: ${(error as Error).message}`);
    }
  }

  private async connectStdio(config: StdioConfig): Promise<void> {
    this.client = new Client({
      name: 'mcp-copilot-relay',
      version: '1.0.0',
    });

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env ? Object.fromEntries(
        Object.entries({ ...process.env, ...config.env }).filter(([_, v]) => v !== undefined)
      ) as Record<string, string> : undefined,
    });

    await this.client.connect(transport);
  }

  private async connectHTTP(config: RemoteConfig): Promise<void> {
    const baseUrl = new URL(config.url);
    
    // Try Streamable HTTP first
    try {
      this.client = new Client({
        name: 'mcp-copilot-relay',
        version: '1.0.0',
      });

      const transport = new StreamableHTTPClientTransport(baseUrl);
      
      // Apply custom headers if provided
      if (config.headers) {
        // Note: StreamableHTTPClientTransport may need custom header support
        // This is a placeholder for the actual implementation
      }

      await this.client.connect(transport);
      console.log('Connected using Streamable HTTP transport');
    } catch (error) {
      // Fallback to SSE if Streamable HTTP fails with 4xx
      console.log('Streamable HTTP failed, falling back to SSE');
      await this.connectSSE(config);
    }
  }

  private async connectSSE(config: RemoteConfig): Promise<void> {
    this.client = new Client({
      name: 'mcp-copilot-relay',
      version: '1.0.0',
    });

    const baseUrl = new URL(config.url);
    const transport = new SSEClientTransport(baseUrl);
    
    await this.client.connect(transport);
    console.log('Connected using SSE transport');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.config = null;
      this.capabilities = null;
    }
  }

  async discover(): Promise<MCPCapabilities> {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }

    const capabilities: MCPCapabilities = {};

    try {
      // Discover tools
      const toolsResponse = await this.client.listTools();
      capabilities.tools = toolsResponse.tools;

      // Discover prompts
      const promptsResponse = await this.client.listPrompts();
      capabilities.prompts = promptsResponse.prompts;

      // Discover resources
      const resourcesResponse = await this.client.listResources();
      capabilities.resources = resourcesResponse.resources;

      this.capabilities = capabilities;
      return capabilities;
    } catch (error) {
      throw new Error(`Failed to discover capabilities: ${(error as Error).message}`);
    }
  }

  async testTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to test tool: ${(error as Error).message}`);
    }
  }

  async testPrompt(name: string, args?: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.getPrompt({
        name,
        arguments: args,
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to test prompt: ${(error as Error).message}`);
    }
  }

  async testResource(uri: string): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      throw new Error(`Failed to test resource: ${(error as Error).message}`);
    }
  }

  getStatus(): { connected: boolean; config: MCPConfig | null; capabilities: MCPCapabilities | null } {
    return {
      connected: this.client !== null,
      config: this.config,
      capabilities: this.capabilities,
    };
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getCapabilities(): MCPCapabilities | null {
    return this.capabilities;
  }
}
