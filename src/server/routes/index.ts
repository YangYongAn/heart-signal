import type { Server } from 'bun';
import { handleRoute } from './static';

/**
 * HTTP fetch 请求处理函数
 */
export async function fetchHandler(req: Request, server: Server<unknown>): Promise<Response | undefined> {
  const url = new URL(req.url);

  // WebSocket 升级
  if (url.pathname === '/ws') {
    const success = server.upgrade(req, { data: undefined });
    return success
      ? undefined
      : new Response('WebSocket upgrade failed', { status: 500 });
  }

  // 路由处理（动态编译 + 静态文件）
  const response = await handleRoute(url.pathname);
  if (response) {
    return response;
  }

  // 404
  return new Response('Not Found', { status: 404 });
}
