import { ExtensionConfig } from '../vsix-builder.js';

export function generateMcpClientTs(config: ExtensionConfig): string {
  const transportType = config.mcp.type;
  
  return `import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
${transportType === 'stdio' ? "import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';" : ''}
${transportType === 'http' ? "import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';" : ''}
${transportType === 'sse' ? "import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';" : ''}

export class MCPClient {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private config: vscode.WorkspaceConfiguration | null = null;

  isConnected(): boolean {
    return this.client !== null;
  }

  async ensureConnected(): Promise<void> {
    if (this.client) {
      return;
    }
    if (this.connecting) {
      return this.connecting;
    }
    try {
      await this.connect(this.config || undefined);
      console.log('✅ MCP server connected on first use');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to connect to MCP server on first use:');
      console.error('Error:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.error('Stack:', error.stack);
      }
      
      // Re-throw to let the calling tool handle it
      throw error;
    }
  }

  async connect(vsCodeConfig?: vscode.WorkspaceConfiguration): Promise<void> {
    if (this.client) {
      return; // Already connected
    }

    const config = vsCodeConfig || vscode.workspace.getConfiguration('${config.extension.name}');
    this.config = config;
    
    this.connecting = (async () => {
      this.client = new Client({
        name: '${config.extension.name}',
        version: '${config.extension.version}',
      });

${generateTransportConnection(config)}

      await this.client.connect(transport);
      this.connecting = null;
    })();

    await this.connecting;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connecting = null;
      this.config = null;
    }
  }

  async reconnect(vsCodeConfig?: vscode.WorkspaceConfiguration): Promise<void> {
    await this.disconnect();
    await this.connect(vsCodeConfig);
  }

  async callTool(name: string, args: any): Promise<any> {
    await this.ensureConnected();

    const result = await this.client!.callTool({
      name,
      arguments: args,
    });

    return result;
  }

  async getPrompt(name: string, args?: any): Promise<any> {
    await this.ensureConnected();

    const result = await this.client!.getPrompt({
      name,
      arguments: args,
    });

    return result;
  }

  async readResource(uri: string): Promise<any> {
    await this.ensureConnected();

    const result = await this.client!.readResource({ uri });
    return result;
  }
}
`;
}

function generateTransportConnection(config: ExtensionConfig): string {
  const { type, config: mcpConfig } = config.mcp;

  if (type === 'stdio') {
    // Generate validation for required settings
    const requiredSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'env' && s.mcpMapping?.required);
    
    let validationCode = '';
    if (requiredSettings.length > 0) {
      validationCode = requiredSettings.map(([key]) => 
        `    const ${key}Value = config.get<string>('${key}');
    if (!${key}Value) {
      throw new Error('Required setting "${key}" is not configured. Please set it in VS Code settings.');
    }`
      ).join('\n') + '\n\n';
    }

    // Generate environment variables from settings
    const envSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'env')
      .map(([key, s]) => {
        if (s.mcpMapping?.required) {
          // For required settings, use the validated value
          return `      ${s.mcpMapping!.key}: ${key}Value,`;
        } else {
          // For optional settings, use default if not set
          return `      ${s.mcpMapping!.key}: config.get<string>('${key}') || '${s.default || ''}',`;
        }
      })
      .join('\n');

    // Generate command arguments from settings with validation
    const argSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'arg');
    
    const requiredArgSettings = argSettings.filter(([, s]) => s.mcpMapping?.required);
    if (requiredArgSettings.length > 0) {
      validationCode += requiredArgSettings.map(([key]) => 
        `    const ${key}ArgValue = config.get<string>('${key}');
    if (!${key}ArgValue) {
      throw new Error('Required setting "${key}" is not configured. Please set it in VS Code settings.');
    }`
      ).join('\n') + '\n\n';
    }

    // Generate dynamic arguments (appended at the end)
    const dynamicArgSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'dynamic-arg');
    
    const requiredDynamicArgSettings = dynamicArgSettings.filter(([, s]) => s.mcpMapping?.required);
    if (requiredDynamicArgSettings.length > 0) {
      validationCode += requiredDynamicArgSettings.map(([key]) => 
        `    const ${key}DynArgValue = config.get<string>('${key}');
    if (!${key}DynArgValue) {
      throw new Error('Required setting "${key}" is not configured. Please set it in VS Code settings.');
    }`
      ).join('\n') + '\n\n';
    }
    
    let argsCode = JSON.stringify(mcpConfig.args || []);
    if (argSettings.length > 0 || dynamicArgSettings.length > 0) {
      argsCode = `[
      ...${JSON.stringify(mcpConfig.args || [])},
${argSettings.map(([key, s]) => {
  if (s.mcpMapping?.required) {
    return `      \`${s.mcpMapping!.key}=\${${key}ArgValue}\`,`;
  } else {
    return `      config.get<string>('${key}') ? \`${s.mcpMapping!.key}=\${config.get<string>('${key}')}\` : null,`;
  }
}).join('\n')}${argSettings.length > 0 && dynamicArgSettings.length > 0 ? ',\n' : ''}${dynamicArgSettings.map(([key, s]) => {
  if (s.mcpMapping?.required) {
    // For required dynamic args, split the value by spaces and spread it
    return `      ...${key}DynArgValue.split(' '),`;
  } else {
    // For optional dynamic args, split by spaces only if value exists
    const varName = `${key}DynArgOptValue`;
    return `      ...((() => {
        const ${varName} = config.get<string>('${key}');
        return ${varName} ? ${varName}.split(' ') : [];
      })()),`;
  }
}).join('\n')}
    ].filter(Boolean) as string[]`;
    }

    return `${validationCode}    const transport = new StdioClientTransport({
      command: '${mcpConfig.command}',
      args: ${argsCode},
      env: {
        ...(Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ) as Record<string, string>),
${envSettings || '        // No environment variable settings configured'}
      },
    });`;
  } else if (type === 'http') {
    // HTTP transport with header and URL param support
    const headerSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'header');
    
    const urlParamSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'url-param');

    // Generate validation for required settings
    const requiredHeaderSettings = headerSettings.filter(([, s]) => s.mcpMapping?.required);
    const requiredUrlParamSettings = urlParamSettings.filter(([, s]) => s.mcpMapping?.required);
    
    let validationCode = '';
    if (requiredHeaderSettings.length > 0 || requiredUrlParamSettings.length > 0) {
      const allRequiredSettings = [...requiredHeaderSettings, ...requiredUrlParamSettings];
      validationCode = allRequiredSettings.map(([key]) => 
        `    const ${key}Value = config.get<string>('${key}');
    if (!${key}Value) {
      throw new Error('Required setting "${key}" is not configured. Please set it in VS Code settings.');
    }`
      ).join('\n') + '\n\n';
    }

    let urlCode = `new URL('${mcpConfig.url}')`;
    if (urlParamSettings.length > 0) {
      urlCode = `(() => {
      const url = new URL('${mcpConfig.url}');
${urlParamSettings.map(([key, s]) => {
  if (s.mcpMapping?.required) {
    return `      url.searchParams.set('${s.mcpMapping!.key}', ${key}Value);`;
  } else {
    return `      const ${key}Value = config.get<string>('${key}');
      if (${key}Value) url.searchParams.set('${s.mcpMapping!.key}', ${key}Value);`;
  }
}).join('\n')}
      return url;
    })()`;
    }

    let headersCode = '';
    if (headerSettings.length > 0) {
      const headerEntries = headerSettings.map(([key, s]) => {
        if (s.mcpMapping?.required) {
          // Required headers always included (validated above)
          return `          '${s.mcpMapping!.key}': ${key}Value,`;
        } else {
          // Optional headers only included if non-empty
          return `          ...(config.get<string>('${key}') ? { '${s.mcpMapping!.key}': config.get<string>('${key}') } : {}),`;
        }
      }).join('\n');

      headersCode = `, {
      requestInit: {
        headers: {
${headerEntries}
        }
      }
    }`;
    }

    return `${validationCode}    const baseUrl = ${urlCode};
    const transport = new StreamableHTTPClientTransport(baseUrl${headersCode || ''});`;
  } else if (type === 'sse') {
    // SSE transport with header support
    const headerSettings = Object.entries(config.settings)
      .filter(([, s]) => s.mcpMapping?.target === 'header');

    // Generate validation for required settings
    const requiredHeaderSettings = headerSettings.filter(([, s]) => s.mcpMapping?.required);
    
    let validationCode = '';
    if (requiredHeaderSettings.length > 0) {
      validationCode = requiredHeaderSettings.map(([key]) => 
        `    const ${key}Value = config.get<string>('${key}');
    if (!${key}Value) {
      throw new Error('Required setting "${key}" is not configured. Please set it in VS Code settings.');
    }`
      ).join('\n') + '\n\n';
    }

    let headersCode = '';
    if (headerSettings.length > 0) {
      const headerEntries = headerSettings.map(([key, s]) => {
        if (s.mcpMapping?.required) {
          // Required headers always included (validated above)
          return `        '${s.mcpMapping!.key}': ${key}Value,`;
        } else {
          // Optional headers only included if non-empty
          const optionalHeaderCode = `        ...((() => {
          const ${key}OptValue = config.get<string>('${key}');
          return ${key}OptValue ? { '${s.mcpMapping!.key}': ${key}OptValue } : {};
        })()),`;
          return optionalHeaderCode;
        }
      }).join('\n');

      headersCode = `, {
${headerEntries}
      }`;
    }

    return `${validationCode}    const baseUrl = new URL('${mcpConfig.url}');
    const transport = new SSEClientTransport(baseUrl${headersCode || ''});`;
  }

  return '';
}
