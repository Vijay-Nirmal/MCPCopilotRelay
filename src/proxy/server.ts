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
  
  // Increase payload size limit for large configurations
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    // Set longer timeout for build process
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    
    try {
      const uiConfig = req.body;
      console.log('Building extension with UI config');
      
      // Transform UI config to builder format
      const config = transformUIConfig(uiConfig);
      
      // Extract edited files from the request
      const editedFiles = uiConfig.editedFiles || {};
      if (Object.keys(editedFiles).length > 0) {
        console.log(`📝 Received ${Object.keys(editedFiles).length} edited files: ${Object.keys(editedFiles).join(', ')}`);
      }
      
      // Prepare the output directory (use temp dir)
      const outputDir = path.join(process.cwd(), '.build');
      
      // Clean up old build directory to prevent size growth
      const fsPromises = await import('fs/promises');
      const extensionBuildDir = path.join(outputDir, config.extension.name);
      
      try {
        await fsPromises.rm(extensionBuildDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up old build directory');
      } catch (cleanupError) {
        // Ignore cleanup errors (directory might not exist)
        console.log('ℹ️ No previous build to clean up');
      }
      
      console.log('Starting VSIX build...');
      const result = await buildFromConfig(config, outputDir, editedFiles);
      console.log(`VSIX built successfully: ${result.vsixPath}`);
      
      // Check if file exists and get its size
      const fs = await import('fs/promises');
      const stats = await fs.stat(result.vsixPath);
      console.log(`VSIX file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Use res.download for reliable file downloads
      const filename = `${config.extension.name}-${config.extension.version}.vsix`;
      console.log(`Sending VSIX file for download: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Set CORS headers before download
      res.set({
        'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
        'Cache-Control': 'no-cache'
      });
      
      // Use Express res.download which handles large files properly
      res.download(result.vsixPath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          // Don't send another response if headers already sent
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed', message: err.message });
          }
        } else {
          console.log(`✅ VSIX download completed: ${filename}`);
        }
      });
      
    } catch (error) {
      console.error('Build error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Build failed', 
          message: (error as Error).message 
        });
      }
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
      const server = app.listen(port, () => {
        console.log(`✅ Proxy server listening on port ${port}`);
        resolve();
      });
      
      // Configure server timeouts for large file transfers
      server.timeout = 300000; // 5 minutes
      server.headersTimeout = 300000; // 5 minutes
      server.requestTimeout = 300000; // 5 minutes
      
    } catch (error) {
      reject(error);
    }
  });
}
