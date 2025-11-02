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
    categories: config.extension.categories || ['AI', 'Chat', 'Other'],
    keywords: config.extension.keywords || ['mcp', 'ai'],
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

  // Add author, license, repository if provided
  if (config.extension.author) packageJson.author = config.extension.author;
  if (config.extension.license) packageJson.license = config.extension.license;
  
  // Repository configuration
  if (config.extension.repository) {
    if (config.extension.repository.startsWith('http')) {
      // Full URL format
      packageJson.repository = {
        type: 'git',
        url: config.extension.repository,
      };
    } else {
      // Simple string format
      packageJson.repository = config.extension.repository;
    }
  }
  
  // Homepage - defaults to repository if not specified
  if (config.extension.homepage) {
    packageJson.homepage = config.extension.homepage;
  } else if (config.extension.repository) {
    packageJson.homepage = config.extension.repository;
  }
  
  // Bugs/issues URL - defaults to repository issues if not specified
  if (config.extension.bugs) {
    packageJson.bugs = {
      url: config.extension.bugs,
    };
  } else if (config.extension.repository && config.extension.repository.includes('github.com')) {
    // Auto-generate GitHub issues URL
    const repoUrl = config.extension.repository.replace(/\.git$/, '');
    packageJson.bugs = {
      url: `${repoUrl}/issues`,
    };
  }
  
  // Q&A configuration
  if (config.extension.qna !== undefined) {
    packageJson.qna = config.extension.qna;
  }
  
  // Private flag - if true, extension won't be public in marketplace
  if (config.extension.private !== undefined) {
    packageJson.private = config.extension.private;
  }
  
  // Icon path (relative to extension root)
  if (config.extension.iconFileName) {
    packageJson.icon = `images/${config.extension.iconFileName}`;
  }
  
  // Gallery banner for Marketplace appearance
  if (config.extension.galleryBanner) {
    packageJson.galleryBanner = config.extension.galleryBanner;
  } else if (config.extension.iconFileName) {
    // Default banner if icon exists
    packageJson.galleryBanner = {
      color: '#1e1e1e',
      theme: 'dark',
    };
  }

  // Add autoConnect setting (always first)
  packageJson.contributes.configuration.properties[`${config.extension.name}.autoConnect`] = {
    type: 'boolean',
    description: 'Automatically connect to MCP server when VS Code starts. If disabled, the server will connect on first tool use.',
    default: false,
  };

  // Add configuration settings
  for (const [key, setting] of Object.entries(config.settings)) {
    packageJson.contributes.configuration.properties[`${config.extension.name}.${key}`] = {
      type: setting.type,
      markdownDescription: setting.description,
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
      const toolId = mapping.toolId || toolName;
      
      lmTools.push({
        name: toolId, // Use custom toolId if provided
        modelDescription: `${mapping.description}. ${tool?.description || ''}`.trim(),
        tags: ['mcp', config.extension.name],
        inputSchema: tool?.inputSchema || {
          type: 'object',
          properties: {},
        },
        canBeReferencedInPrompt: true,
        displayName: mapping.displayName,
        toolReferenceName: toolId,
        userDescription: mapping.description,
        icon: '$(tools)',
      });
      
      // Add specific activation event for this tool
      packageJson.activationEvents.push(`onLanguageModelTool:${toolId}`);
    }
  }

  if (lmTools.length > 0) {
    packageJson.contributes.languageModelTools = lmTools;
    
    // Add languageModelToolSets if feature flag is enabled (proposed API)
    // Note: languageModelToolSets requires the 'contribLanguageModelToolSets' proposed API
    if (config.mappings.enableToolSets && config.mappings.toolSetName && config.mappings.toolSetName.trim() !== '') {
      const toolSetName = config.mappings.toolSetName.trim();
      const toolSetDescription = config.mappings.toolSetDescription?.trim() || 
        `A set of tools provided by ${config.extension.displayName}`;
      
      // Collect all tool reference names (toolIds) for the tool set
      const toolReferences: string[] = [];
      for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
        if (mapping.type === 'lm-tool') {
          const toolId = mapping.toolId || toolName;
          toolReferences.push(toolId);
        }
      }
      
      if (toolReferences.length > 0) {
        packageJson.contributes.languageModelToolSets = [
          {
            name: toolSetName,
            description: toolSetDescription,
            tools: toolReferences,
          }
        ];
      }
    }
  }

  // Add commands for tool mappings
  const commands: any[] = [];
  for (const [toolName, mapping] of Object.entries(config.mappings.tools)) {
    if (mapping.type === 'command') {
      const toolId = mapping.toolId || toolName;
      commands.push({
        command: `${config.extension.name}.${toolId}`,
        title: mapping.displayName,
      });
      packageJson.activationEvents.push(`onCommand:${config.extension.name}.${toolId}`);
    }
  }

  if (commands.length > 0) {
    packageJson.contributes.commands = commands;
  }

  return packageJson;
}
