#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../proxy/server.js';
import { buildFromConfig, ExtensionConfig } from '../builder/vsix-builder.js';
import { ENABLE_TOOLSETS } from '../common/feature-flags.js';
import open from 'open';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Transform UI config format to builder format (same as server.ts)
function transformUIConfig(uiConfig: any): ExtensionConfig {
  return {
    mcp: {
      type: uiConfig.mcpConfig?.type || 'stdio',
      config: uiConfig.mcpConfig?.config || {},
    },
    capabilities: {
      tools: uiConfig.capabilities?.tools || [],
      prompts: uiConfig.capabilities?.prompts || [],
      resources: uiConfig.capabilities?.resources || [],
    },
    mappings: {
      tools: uiConfig.toolMappings || {},
      prompts: uiConfig.promptMappings || {},
      toolSetName: uiConfig.toolSetName,
      toolSetDescription: uiConfig.toolSetDescription,
      enableToolSets: uiConfig.enableToolSets ?? ENABLE_TOOLSETS,
    },
    settings: uiConfig.extensionInfo?.settings?.reduce((acc: any, setting: any) => {
      acc[setting.key] = {
        type: setting.type,
        description: setting.description,
        default: setting.default,
        mcpMapping: setting.mcpMapping,
        secret: setting.secret,
      };
      return acc;
    }, {}) || {},
    extension: {
      name: uiConfig.extensionInfo?.name || '',
      displayName: uiConfig.extensionInfo?.displayName || '',
      description: uiConfig.extensionInfo?.description || '',
      version: uiConfig.extensionInfo?.version || '1.0.0',
      publisher: uiConfig.extensionInfo?.publisher || '',
      author: uiConfig.extensionInfo?.author,
      license: uiConfig.extensionInfo?.license,
      repository: uiConfig.extensionInfo?.repository,
      icon: uiConfig.extensionInfo?.icon,
      iconFileName: uiConfig.extensionInfo?.iconFileName,
      iconFileData: uiConfig.extensionInfo?.iconFileData,
    },
  };
}

const program = new Command();

program
  .name('mcp-copilot-relay')
  .description('Generate VS Code extensions from MCP servers')
  .version('1.0.0');

program
  .command('start')
  .description('Start the MCP proxy server and web UI')
  .option('-p, --port <number>', 'Custom proxy port', '3000')
  .option('--no-browser', 'Don\'t auto-open browser')
  .action(async (options) => {
    const port = parseInt(options.port);
    const uiPort = 5173;

    console.log('🚀 Starting MCP Copilot Relay...');
    console.log(`📡 Proxy server: http://localhost:${port}`);
    console.log(`🎨 Web UI: http://localhost:${uiPort}`);

    // Start the proxy server
    await startServer(port);

    // Start Vite dev server
    const projectRoot = path.resolve(__dirname, '../..');
    const viteProcess = spawn('npx', ['vite', '--port', uiPort.toString()], {
      cwd: projectRoot,
      shell: true,
      stdio: 'inherit'
    });

    viteProcess.on('error', (error) => {
      console.error('❌ Failed to start Vite dev server:', error);
    });

    // Give Vite a moment to start, then open browser
    setTimeout(async () => {
      if (options.browser) {
        console.log('\n✨ Opening browser...');
        await open(`http://localhost:${uiPort}`);
      }
      console.log('\n✅ Server ready! Press Ctrl+C to stop.');
    }, 3000);

    // Handle cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down...');
      viteProcess.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      viteProcess.kill();
      process.exit(0);
    });
  });

program
  .command('build')
  .description('Build VS Code extension from config file')
  .requiredOption('-c, --config <path>', 'Path to config JSON file')
  .option('-o, --output <path>', 'Output directory', './output')
  .action(async (options) => {
    console.log('📦 Building extension from config...');
    
    try {
      const configPath = path.resolve(options.config);
      console.log(`📄 Reading config from: ${configPath}`);
      
      const configContent = await readFile(configPath, 'utf-8');
      const uiConfig = JSON.parse(configContent);
      
      // Transform UI config format to builder format
      console.log('🔄 Transforming config...');
      const config = transformUIConfig(uiConfig);
      
      // Validate required fields
      if (!config.extension.name) {
        throw new Error('Extension name is required (extensionInfo.name)');
      }
      if (!config.extension.publisher) {
        throw new Error('Publisher is required (extensionInfo.publisher)');
      }
      
      console.log(`🏗️  Building extension: ${config.extension.displayName}`);
      
      const outputPath = path.resolve(options.output);
      const result = await buildFromConfig(config, outputPath);
      
      console.log(`\n✅ Extension built successfully!`);
      console.log(`📦 VSIX package: ${result.vsixPath}`);
      console.log(`📁 Source code: ${result.sourcePath}`);
      console.log('\n💡 To install:');
      console.log(`   code --install-extension ${result.vsixPath}`);
    } catch (error) {
      console.error('\n❌ Build failed:', error instanceof Error ? error.message : error);
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });

// Default command (same as start)
program.action(async () => {
  const port = 3000;
  const uiPort = 5173;

  console.log('🚀 Starting MCP Copilot Relay...');
  console.log(`📡 Proxy server: http://localhost:${port}`);
  console.log(`🎨 Web UI: http://localhost:${uiPort}`);

  await startServer(port);

  // Start Vite dev server
  const projectRoot = path.resolve(__dirname, '../..');
  const viteProcess = spawn('npx', ['vite', '--port', uiPort.toString()], {
    cwd: projectRoot,
    shell: true,
    stdio: 'inherit'
  });

  viteProcess.on('error', (error) => {
    console.error('❌ Failed to start Vite dev server:', error);
  });

  // Give Vite a moment to start, then open browser
  setTimeout(async () => {
    console.log('\n✨ Opening browser...');
    await open(`http://localhost:${uiPort}`);
    console.log('\n✅ Server ready! Press Ctrl+C to stop.');
  }, 3000);

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    viteProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    viteProcess.kill();
    process.exit(0);
  });
});

program.parse();
