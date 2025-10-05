import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ServerConfig, MCPTool, ConnectionStatus } from '../types';

export interface MCPClientEvents {
  statusChanged: (status: ConnectionStatus) => void;
  toolsDiscovered: (tools: MCPTool[]) => void;
  error: (error: Error) => void;
}

type EventHandler = (...args: any[]) => void;

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport | null = null;
  private status: ConnectionStatus = ConnectionStatus.Disconnected;
  private discoveredTools: MCPTool[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(
    private config: ServerConfig,
    private autoReconnect: boolean = true,
    private reconnectDelay: number = 5000
  ) { }

  public on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getTools(): MCPTool[] {
    return this.discoveredTools;
  }

  public getConfig(): ServerConfig {
    return this.config;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('statusChanged', status);
    }
  }

  public async connect(): Promise<void> {
    if (this.status === ConnectionStatus.Connected || this.status === ConnectionStatus.Connecting) {
      return;
    }

    this.setStatus(ConnectionStatus.Connecting);

    try {
      // Create transport based on config type
      if (this.config.transport === 'sse') {
        // SSE (Server-Sent Events) transport for remote servers (legacy)
        if (!this.config.url) {
          throw new Error('URL is required for SSE transport');
        }

        const headers: Record<string, string> = {};
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        this.transport = new SSEClientTransport(
          new URL(this.config.url),
          headers
        );
      } else if (this.config.transport === 'http') {
        // HTTP (Streamable HTTP) transport for remote servers (modern)
        if (!this.config.url) {
          throw new Error('URL is required for HTTP transport');
        }

        const headers: Record<string, string> = {
          ...(this.config.headers || {})
        };
        
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        this.transport = new StreamableHTTPClientTransport(
          new URL(this.config.url),
          { 
            requestInit: {
              headers
            }
          }
        );
      } else {
        // Default to stdio transport for local servers
        if (!this.config.command) {
          throw new Error('Command is required for stdio transport');
        }

        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
          env: {
            ...(process.env as Record<string, string>),
            ...(this.config.env || {})
          }
        });
      }

      // Create MCP client
      this.client = new Client({
        name: `vscode-mcp-relay-${this.config.name}`,
        version: '0.1.0'
      }, {
        capabilities: {}
      });

      // Handle transport errors
      this.transport.onerror = (error: Error) => {
        this.handleError(error);
      };

      this.transport.onclose = () => {
        this.handleDisconnect();
      };

      // Connect client to transport
      await this.client.connect(this.transport);

      // Discover tools
      await this.discoverTools();

      this.setStatus(ConnectionStatus.Connected);

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;

      // Start health monitoring
      this.startHealthCheck();

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw err;
    }
  }

  private async discoverTools(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const response = await this.client.listTools();

      this.discoveredTools = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));

      this.emit('toolsDiscovered', this.discoveredTools);
    } catch (error) {
      throw new Error(`Failed to discover tools: ${error}`);
    }
  }

  public async invokeTool(
    toolName: string,
    args: Record<string, any>,
    cancellationToken?: { isCancellationRequested: boolean }
  ): Promise<any> {
    if (!this.client || this.status !== ConnectionStatus.Connected) {
      throw new Error(`Server ${this.config.name} is not connected`);
    }

    if (cancellationToken?.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      if (cancellationToken?.isCancellationRequested) {
        throw new Error('Operation cancelled');
      }

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      if (this.status === ConnectionStatus.Connected && this.client) {
        try {
          // Perform a lightweight health check by listing tools
          await this.client.listTools();
        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private handleError(error: Error): void {
    this.setStatus(ConnectionStatus.Error);
    this.emit('error', error);

    // Only auto-reconnect if we haven't exceeded max attempts
    if (this.autoReconnect && !this.reconnectTimer && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    if (this.status === ConnectionStatus.Connected) {
      this.setStatus(ConnectionStatus.Disconnected);

      if (this.autoReconnect && !this.reconnectTimer) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        // Error will be handled by connect method
      }
    }, this.reconnectDelay);
  }

  public async disconnect(): Promise<void> {
    this.stopHealthCheck();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.transport = null;
    }

    this.discoveredTools = [];
    this.setStatus(ConnectionStatus.Disconnected);
  }

  public async reconnect(): Promise<void> {
    // Reset reconnect attempts for manual reconnection
    this.reconnectAttempts = 0;
    await this.disconnect();
    await this.connect();
  }
}
