import { SERVER_PORT } from './config/config';
import { websocketConfig } from './websocket';
import index from '../../public/index.html';
import mobile from '../../public/mobile.html';
import admin from '../../public/admin.html';

// 判断是否为开发环境
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * 启动服务器
 * 使用 Bun fullstack 模式，自动处理 HTML、TypeScript、CSS
 */
const server = Bun.serve({
  port: SERVER_PORT,

  // HTML 路由 - Bun 会自动处理 <script> 和 <link> 标签
  routes: {
    '/': index,
    '/mobile': mobile,
    '/admin': admin,
  },

  // 开发模式配置：启用 HMR 和浏览器 console 日志流
  development: isDevelopment ? {
    hmr: true,      // 热模块替换
    console: true,  // 浏览器 console → 终端
  } : false,

  // WebSocket 配置
  websocket: websocketConfig,

  // 处理其他请求（WebSocket 升级、静态资源）
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket 升级
    if (url.pathname === '/ws') {
      const success = server.upgrade(req, { data: undefined });
      return success
        ? undefined
        : new Response('WebSocket upgrade failed', { status: 500 });
    }

    // 静态资源服务（字体、图标、音频等）
    if (url.pathname.startsWith('/')) {
      const filePath = `./public${url.pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }
    }

    // 其他未匹配的路由返回 404
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📡 WebSocket available at ws://localhost:${server.port}/ws`);
console.log(`🔧 Mode: ${isDevelopment ? 'development' : 'production'}`);
