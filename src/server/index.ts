import type { ServerWebSocket } from 'bun';
import type { WSMessage } from '../shared/types';

const clients = new Set<ServerWebSocket<unknown>>();

/**
 * 广播消息给所有连接的客户端
 */
function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    client.send(data);
  }
}

/**
 * 启动服务器
 */
const server = Bun.serve({
  port: 2026,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket 升级
    if (url.pathname === '/ws') {
      const success = server.upgrade(req);
      return success
        ? undefined
        : new Response('WebSocket upgrade failed', { status: 500 });
    }

    // 静态文件服务
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const file = Bun.file('./src/client/index.html');
      return new Response(file, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/app.js') {
      // 使用 Bun.build 进行 TypeScript 转译
      const result = await Bun.build({
        entrypoints: ['./src/client/app.ts'],
        target: 'browser',
      });

      if (!result.success) {
        return new Response('Build failed', { status: 500 });
      }

      return new Response(result.outputs[0], {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    // 提供音乐文件
    if (url.pathname === '/music.wav') {
      const file = Bun.file('./assets/music.wav');
      const exists = await file.exists();

      if (!exists) {
        return new Response('Music file not found', { status: 404 });
      }

      return new Response(file, {
        headers: {
          'Content-Type': 'audio/wav',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      clients.add(ws);
      console.log('Client connected, total:', clients.size);

      // 通知所有客户端有新连接
      broadcast({
        type: 'connect',
        data: { totalClients: clients.size },
        timestamp: Date.now(),
      });
    },

    message(ws, message) {
      try {
        const data: WSMessage = JSON.parse(message.toString());
        console.log('Received:', data);

        // 转发消息给所有客户端
        broadcast(data);
      } catch (error) {
        console.error('Invalid message:', error);
      }
    },

    close(ws) {
      clients.delete(ws);
      console.log('Client disconnected, total:', clients.size);

      // 通知所有客户端有连接断开
      broadcast({
        type: 'disconnect',
        data: { totalClients: clients.size },
        timestamp: Date.now(),
      });
    },
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📡 WebSocket available at ws://localhost:${server.port}/ws`);
