export interface ServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'http';
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For SSE and HTTP transport
  url?: string;
  apiKey?: string;
  // For HTTP transport (optional headers)
  headers?: Record<string, string>;
  // Common
  enabled?: boolean;
}

export interface ToolState {
  enabled: boolean;
  customName?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

export interface ToolInvocation {
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  serverName?: string;
  toolName?: string;
  message: string;
  details?: any;
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

export interface ServerStatus {
  name: string;
  status: ConnectionStatus;
  tools: MCPTool[];
  error?: string;
  errorStack?: string;
  lastConnected?: number;
}
