import { ExtensionConfig } from '../vsix-builder.js';

export function generateReadme(config: ExtensionConfig): string {
  const { extension, capabilities, mappings, settings } = config;

  return `# ${extension.displayName}

${extension.description}

## Features

This extension integrates with an MCP (Model Context Protocol) server to provide:

${generateFeaturesList(capabilities, mappings)}

## Configuration

${generateSettingsDoc(settings, extension.name)}

## Usage

${generateUsageDoc(capabilities, mappings)}

## MCP Server

This extension connects to an MCP server using the following configuration:

- **Transport**: ${config.mcp.type}
${generateMcpConfigDoc(config.mcp)}

## Requirements

- VS Code version 1.85.0 or higher
- The MCP server must be running and accessible

## Installation

1. Download the \`.vsix\` file
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded \`.vsix\` file

## Development

This extension was generated using [MCP Copilot Relay](https://github.com/vijay-nirmal/mcp-copilot-relay).

### Building from Source

\`\`\`bash
npm install
npm run compile
\`\`\`

### Testing

\`\`\`bash
npm run watch
# Press F5 in VS Code to launch Extension Development Host
\`\`\`

## Contributing

${extension.repository ? `Please see [${extension.repository}](${extension.repository}) for contribution guidelines.` : 'Contributions are welcome!'}

## License

${extension.license || 'See LICENSE file'}

## Release Notes

### ${extension.version}

Initial release generated from MCP server capabilities.

---

**Enjoy!**
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

function generateSettingsDoc(settings: Record<string, any>, extensionName: string): string {
  if (Object.keys(settings).length === 0) {
    return 'This extension does not require any configuration.';
  }

  const settingsDoc = Object.entries(settings)
    .map(([key, setting]) => {
      return `- \`${extensionName}.${key}\`: ${setting.description}${setting.default ? ` (Default: \`${setting.default}\`)` : ''}`;
    })
    .join('\n');

  return `Configure the extension using these settings:\n\n${settingsDoc}`;
}

function generateUsageDoc(_capabilities: any, mappings: any): string {
  const usage: string[] = [];

  // Chat participants
  const chatParticipants = Object.entries(mappings.prompts).filter(
    ([, m]: any) => m.type === 'chat-participant'
  );
  if (chatParticipants.length > 0) {
    usage.push('### Chat Participants\n');
    chatParticipants.forEach(([name, mapping]: any) => {
      usage.push(`#### @${name}`);
      usage.push(`${mapping.description}\n`);
      if (mapping.slashCommand) {
        usage.push(`Use \`/${mapping.slashCommand}\` for specific actions.\n`);
      }
    });
  }

  // Language Model Tools
  const lmTools = Object.entries(mappings.tools).filter(([, m]: any) => m.type === 'lm-tool');
  if (lmTools.length > 0) {
    usage.push('### Language Model Tools\n');
    usage.push('These tools are automatically available to GitHub Copilot and other AI assistants:\n');
    lmTools.forEach(([_name, mapping]: any) => {
      usage.push(`- **${mapping.displayName}**: ${mapping.description}`);
    });
  }

  // Commands
  const commands = Object.entries(mappings.tools).filter(([, m]: any) => m.type === 'command');
  if (commands.length > 0) {
    usage.push('\n### Commands\n');
    usage.push('Access these commands via the Command Palette (Ctrl+Shift+P):\n');
    commands.forEach(([, mapping]: any) => {
      usage.push(`- **${mapping.displayName}**: ${mapping.description}`);
    });
  }

  return usage.length > 0 ? usage.join('\n') : 'Use the features listed above.';
}

function generateMcpConfigDoc(mcpConfig: any): string {
  if (mcpConfig.type === 'stdio') {
    return `- **Command**: \`${mcpConfig.config.command}\`
- **Arguments**: \`${JSON.stringify(mcpConfig.config.args || [])}\``;
  } else {
    return `- **URL**: \`${mcpConfig.config.url}\``;
  }
}
