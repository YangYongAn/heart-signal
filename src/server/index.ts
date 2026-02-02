import { SERVER_PORT } from './config/config';
import { fetchHandler } from './routes';
import { websocketConfig } from './websocket';

/**
 * 启动服务器
 */
const server = Bun.serve({
  port: SERVER_PORT,
  fetch: fetchHandler,
  websocket: websocketConfig,
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📡 WebSocket available at ws://localhost:${server.port}/ws`);
