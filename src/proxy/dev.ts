import { startServer } from './server.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

process.stdout.write('🚀 Starting MCP Proxy Server in dev mode...\n');

startServer(port)
  .then(() => {
    process.stdout.write('📡 Server is running. Press Ctrl+C to stop.\n');
    // Keep process alive by listening to stdin
    process.stdin.on('data', () => {});
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
