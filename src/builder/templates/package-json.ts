import { ExtensionConfig } from '../vsix-builder.js';

export function generatePackageJson(config: ExtensionConfig) {
  const packageJson: any = {
    name: config.extension.name,
    displayName: config.extension.displayName,
    description: config.extension.description,
    version: config.extension.version,
    publisher: config.extension.publisher,
    engines: {
      vscode: '^1.85.0',
    },
    categories: ['AI', 'Chat', 'Other'],
    activationEvents: [],
    main: './out/extension.js',
    contributes: {
      configuration: {
        title: config.extension.displayName,
        properties: {},
      },
    },
    scripts: {
      'vscode:prepublish': 'npm run compile',
      compile: 'tsc -p ./',
      watch: 'tsc -watch -p ./',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/vscode': '^1.85.0',
      typescript: '^5.3.0',
    },
    dependencies: {
      '@modelcontextprotocol/sdk': '^1.0.4',
    },
  };

  // Add author, license, repository, icon if provided
  if (config.extension.author) packageJson.author = config.extension.author;
  if (config.extension.license) packageJson.license = config.extension.license;
  if (config.extension.repository) packageJson.repository = config.extension.repository;
  
  // Icon path (relative to extension root, e.g., 'images/icon.png')
  if (config.extension.iconFileName) {
    packageJson.icon = `images/${config.extension.iconFileName}`;
    // Add gallery banner for better Marketplace appearance
    packageJson.galleryBanner = {
      color: '#1e1e1e',
      theme: 'dark',
    };
  }

  // Add configuration settings
  for (const [key, setting] of Object.entries(config.settings)) {
    packageJson.contributes.configuration.properties[`${config.extension.name}.${key}`] = {
      type: setting.type,
      description: setting.description,
      default: setting.default,
    };
  }

  // Add chat participants for prompts
  const chatParticipants: any[] = [];
  for (const [promptName, mapping] of Object.entries(config.mappings.prompts)) {
    if (mapping.type === 'chat-participant') {
      const participant = {
        id: `${config.extension.name}.${promptName}`,
        name: promptName,
        fullName: mapping.displayName,
        description: mapping.description,
        isSticky: true,
      };
      
      if (mapping.slashCommand) {
        (participant as any).commands = [
          {
            name: mapping.slashCommand,
            description: mapping.description,
          },
        ];
      }

      chatParticipants.push(participant);
      packageJson.activationEvents.push(`onChatParticipant:${participant.id}`);
    }
  }

  if (chatParticipants.length > 0) {
    packageJson.contributes.chatParticipants = chatParticipants;
  }

  // Add language model tools matching vscode-mssql format
  const lmTools: any[] = [];
  for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
    if (mapping.type === 'lm-tool') {
      // Find the tool in capabilities to get full schema
      const tool = config.capabilities.tools?.find(t => t.name === toolName);
      
      lmTools.push({
        name: toolName, // Just the tool name without prefix
        modelDescription: `${mapping.description}. ${tool?.description || ''}`.trim(),
        tags: ['mcp', config.extension.name],
        inputSchema: tool?.inputSchema || {
          type: 'object',
          properties: {},
        },
        canBeReferencedInPrompt: true,
        displayName: mapping.displayName,
        toolReferenceName: toolName,
        userDescription: mapping.description,
        icon: '$(tools)',
      });
      
      // Add specific activation event for this tool
      packageJson.activationEvents.push(`onLanguageModelTool:${toolName}`);
    }
  }

  if (lmTools.length > 0) {
    packageJson.contributes.languageModelTools = lmTools;
  }

  // Add commands for tool mappings
  const commands: any[] = [];
  for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
    if (mapping.type === 'command') {
      commands.push({
        command: `${config.extension.name}.${toolName}`,
        title: mapping.displayName,
      });
      packageJson.activationEvents.push(`onCommand:${config.extension.name}.${toolName}`);
    }
  }

  if (commands.length > 0) {
    packageJson.contributes.commands = commands;
  }

  return packageJson;
}
