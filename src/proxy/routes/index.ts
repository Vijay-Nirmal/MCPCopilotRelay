import { Request, Response } from 'express';
import { MCPManager, MCPConfig } from '../mcp-manager.js';

export const connectRoute = (mcpManager: MCPManager) => async (req: Request, res: Response) => {
  try {
    const config: MCPConfig = req.body;
    
    if (!config || !config.type || !config.config) {
      res.status(400).json({ error: 'Invalid configuration' });
      return;
    }

    await mcpManager.connect(config);
    res.json({ success: true, message: 'Connected successfully' });
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ 
      error: 'Connection failed', 
      message: (error as Error).message 
    });
  }
};

export const disconnectRoute = (mcpManager: MCPManager) => async (_req: Request, res: Response) => {
  try {
    await mcpManager.disconnect();
    res.json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    console.error('Disconnection error:', error);
    res.status(500).json({ 
      error: 'Disconnection failed', 
      message: (error as Error).message 
    });
  }
};

export const discoverRoute = (mcpManager: MCPManager) => async (_req: Request, res: Response) => {
  try {
    if (!mcpManager.isConnected()) {
      res.status(400).json({ error: 'Not connected to MCP server' });
      return;
    }

    const capabilities = await mcpManager.discover();
    res.json(capabilities);
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({ 
      error: 'Discovery failed', 
      message: (error as Error).message 
    });
  }
};

export const testCapabilityRoute = (mcpManager: MCPManager) => async (req: Request, res: Response) => {
  try {
    const { type, name, args, uri } = req.body;

    if (!mcpManager.isConnected()) {
      res.status(400).json({ error: 'Not connected to MCP server' });
      return;
    }

    let result;
    switch (type) {
      case 'tool':
        result = await mcpManager.testTool(name, args || {});
        break;
      case 'prompt':
        result = await mcpManager.testPrompt(name, args);
        break;
      case 'resource':
        result = await mcpManager.testResource(uri);
        break;
      default:
        res.status(400).json({ error: 'Invalid capability type' });
        return;
    }

    res.json(result);
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      message: (error as Error).message 
    });
  }
};

export const getStatusRoute = (mcpManager: MCPManager) => (_req: Request, res: Response) => {
  const status = mcpManager.getStatus();
  res.json(status);
};
