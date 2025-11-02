import { ExtensionConfig } from '../vsix-builder.js';

export function generateReadme(config: ExtensionConfig): string {
  const { extension, capabilities, mappings, settings } = config;

  return `# ${extension.displayName}

${extension.description}

${generateManualToolSetInstructions(mappings)}

## Features

This extension integrates with an MCP (Model Context Protocol) server to provide enhanced AI capabilities.

${generateFeaturesList(capabilities, mappings)}

## Installation

### From Marketplace

1. Open VS Code
2. Go to Extensions view (\`Ctrl+Shift+X\` / \`Cmd+Shift+X\`)
3. Search for "${extension.displayName}"
4. Click Install

### From VSIX

1. Download the \`.vsix\` file
2. Open VS Code
3. Go to Extensions view (\`Ctrl+Shift+X\` / \`Cmd+Shift+X\`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded \`.vsix\` file

${generateConfigurationSection(settings, extension.name)}

## MCP Server Connection

This extension connects to an MCP server using the following configuration:

- **Transport Type**: ${config.mcp.type}
${generateMcpConfigDoc(config.mcp)}

${extension.repository ? `## Contributing

Contributions are welcome! Please visit [${extension.repository}](${extension.repository}) for guidelines.

` : ''}${extension.bugs ? `## Support

Found a bug or have a feature request? Please file an issue at: ${extension.bugs}

` : ''}## License

${extension.license || 'See LICENSE file'}

## About This Extension

This extension was generated using [MCP Copilot Relay](https://github.com/vijay-nirmal/mcp-copilot-relay), a tool for creating VS Code extensions from Model Context Protocol servers.

**Enjoy!** 🚀
`;
}

function generateManualToolSetInstructions(mappings: any): string {
  // Only show manual instructions if toolsets are not enabled but configuration exists
  if (mappings.enableToolSets) {
    return ''; // Feature is enabled, toolset will be created automatically
  }

  const lmTools = Object.entries(mappings.tools).filter(([, m]: any) => m.type === 'lm-tool');
  if (lmTools.length === 0) {
    return ''; // No language model tools to group
  }

  // Get tool IDs for the JSON configuration
  const toolIds = lmTools.map(([, mapping]: any) => {
    const m: any = mapping;
    return m.toolId || m.name;
  });

  // Use configured toolset name or default
  const toolSetName = mappings.toolSetName && mappings.toolSetName.trim() !== '' 
    ? mappings.toolSetName 
    : 'mcp-tools';
  
  const toolSetDescription = mappings.toolSetDescription && mappings.toolSetDescription.trim() !== ''
    ? mappings.toolSetDescription
    : 'MCP server tools';

  const toolSetJson = JSON.stringify({
    [toolSetName]: {
      tools: toolIds,
      description: toolSetDescription,
      icon: "tools"
    }
  }, null, 4);

  return `## ⚠️ **IMPORTANT: Manual Tool Set Configuration Required**

This extension's tools need to be manually configured as a tool set in VS Code. Follow these steps to enable all tools at once:

### Steps to Configure Tool Set:

1. Press \`Ctrl+Shift+P\` (or \`Cmd+Shift+P\` on Mac)
2. Search for and select: **\`Chat: Configure Tool Sets...\`**
3. Select an existing tool set file or create a new file (e.g., \`user-toolsets.json\`)
4. Add the following JSON configuration to the file:

\`\`\`json
${toolSetJson}
\`\`\`

5. Save the file
6. The tool set will now be available in GitHub Copilot, you can invoke it using '#${toolSetName}'

**Why is this needed?** VS Code doesn't currently support including toolSets in extensions (planned for future releases). This manual step groups all tools under a single name (\`#${toolSetName}\`) for easier management and invocation similar to MCP Server.

`;
}

function generateFeaturesList(capabilities: any, mappings: any): string {
  const features: string[] = [];

  // Tools
  for (const [toolName, mapping] of Object.entries(mappings.tools)) {
    const tool: any = capabilities.tools?.find((t: any) => t.name === toolName);
    const mappingData: any = mapping;
    if (tool) {
      const desc = mappingData.description || tool.description || toolName;
      features.push(`- **${mappingData.displayName}**: ${desc}`);
    }
  }

  // Prompts
  for (const [promptName, mapping] of Object.entries(mappings.prompts)) {
    const prompt: any = capabilities.prompts?.find((p: any) => p.name === promptName);
    const mappingData: any = mapping;
    if (prompt) {
      const desc = mappingData.description || prompt.description || promptName;
      features.push(`- **${mappingData.displayName}** Chat Participant: ${desc}`);
    }
  }

  return features.length > 0 ? features.join('\n') : '- No features configured';
}

function generateConfigurationSection(settings: Record<string, any>, extensionName: string): string {
  // Only show configuration section if there are actual settings
  if (Object.keys(settings).length === 0) {
    return '';
  }

  let settingsDoc = '';
  
  // Always document the autoConnect setting first
  settingsDoc += `- \`${extensionName}.autoConnect\`: Automatically connect to MCP server when VS Code starts. If disabled (default), the server will connect on first tool use. (Default: \`false\`)\n`;

  settingsDoc += Object.entries(settings)
    .map(([key, setting]) => {
      let description = `- \`${extensionName}.${key}\`: ${setting.description}${setting.default ? ` (Default: \`${setting.default}\`)` : ''}`;
      
      // Add mapping information for user awareness
      if (setting.mcpMapping) {
        const target = setting.mcpMapping.target;
        if (target === 'dynamic-arg') {
          description += `\n  - **Type**: Dynamic Argument - This value will be appended to the MCP server command at runtime`;
        } else if (target === 'arg') {
          description += `\n  - **Type**: Command Argument - This value is embedded in the command`;
        } else if (target === 'env') {
          description += `\n  - **Type**: Environment Variable - Set as \`${setting.mcpMapping.key}\``;
        } else if (target === 'header') {
          description += `\n  - **Type**: HTTP Header - Set as \`${setting.mcpMapping.key}\``;
        } else if (target === 'url-param') {
          description += `\n  - **Type**: URL Parameter - Set as \`${setting.mcpMapping.key}\``;
        }
        
        if (setting.mcpMapping.required) {
          description += ' **(Required)**';
        }
      }
      
      return description;
    })
    .join('\n');

  return `## Configuration\n\nConfigure the extension using these settings:\n\n${settingsDoc}\n`;
}

function generateMcpConfigDoc(mcpConfig: any): string {
  if (mcpConfig.type === 'stdio') {
    return `- **Command**: \`${mcpConfig.config.command}\`
- **Arguments**: \`${JSON.stringify(mcpConfig.config.args || [])}\`

**Note**: If you have configured settings with "Dynamic Argument" mapping, those arguments will be automatically appended to the command at runtime based on your VS Code settings. This allows you to customize the MCP server behavior without rebuilding the extension.`;
  } else {
    return `- **URL**: \`${mcpConfig.config.url}\``;
  }
}
