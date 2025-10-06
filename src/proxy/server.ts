import express from 'express';
import cors from 'cors';
import path from 'path';
import { MCPManager } from './mcp-manager.js';
import { connectRoute, disconnectRoute, discoverRoute, testCapabilityRoute, getStatusRoute } from './routes/index.js';
import { buildFromConfig, ExtensionConfig } from '../builder/vsix-builder.js';

// Transform UI config format to builder format
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


export async function startServer(port: number) {
  const app = express();
  const mcpManager = new MCPManager();

  // Middleware
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
  }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP routes
  app.post('/api/mcp/connect', connectRoute(mcpManager));
  app.post('/api/mcp/disconnect', disconnectRoute(mcpManager));
  app.get('/api/mcp/discover', discoverRoute(mcpManager));
  app.post('/api/mcp/test-capability', testCapabilityRoute(mcpManager));
  app.get('/api/mcp/status', getStatusRoute(mcpManager));

  // Build route
  app.post('/api/build', async (req, res) => {
    try {
      const uiConfig = req.body;
      console.log('Building extension with UI config');
      
      // Transform UI config to builder format
      const config = transformUIConfig(uiConfig);
      
      // Prepare the output directory (use temp dir)
      const outputDir = path.join(process.cwd(), '.build');
      
      const result = await buildFromConfig(config, outputDir);
      
      // Send the VSIX file
      res.download(result.vsixPath, `${config.extension.name}-${config.extension.version}.vsix`, (err) => {
        if (err) {
          console.error('Error sending VSIX file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to send VSIX file' });
          }
        }
      });
    } catch (error) {
      console.error('Build error:', error);
      res.status(500).json({ 
        error: 'Build failed', 
        message: (error as Error).message 
      });
    }
  });

  // Preview route - generates files without building
  app.post('/api/preview', async (req, res) => {
    try {
      const uiConfig = req.body;
      const config = transformUIConfig(uiConfig);
      
      // Import template generators
      const { generatePackageJson } = await import('../builder/templates/package-json.js');
      const { generateExtensionTs } = await import('../builder/templates/extension-ts.js');
      const { generateMcpClientTs } = await import('../builder/templates/mcp-client-ts.js');
      const { generateReadme } = await import('../builder/templates/readme.js');
      const { generateTsConfig } = await import('../builder/templates/tsconfig.js');
      
      const files = {
        'package.json': JSON.stringify(generatePackageJson(config), null, 2),
        'extension.ts': generateExtensionTs(config),
        'mcp-client.ts': generateMcpClientTs(config),
        'README.md': generateReadme(config),
        'tsconfig.json': JSON.stringify(generateTsConfig(), null, 2),
      };
      
      res.json({ files });
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({ 
        error: 'Preview generation failed', 
        message: (error as Error).message 
      });
    }
  });

  // Error handling
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  });

  return new Promise<void>((resolve, reject) => {
    try {
      app.listen(port, () => {
        console.log(`✅ Proxy server listening on port ${port}`);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
