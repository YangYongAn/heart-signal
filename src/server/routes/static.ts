import { serveStatic } from '../static/files';
import { CLIENT_BUILD_ENTRY, CLIENT_BUILD_TARGET } from '../config/config';

/**
 * 处理动态 TypeScript 编译
 */
async function handleBuild(pathname: string): Promise<Response | null> {
  if (pathname !== '/app.js') {
    return null;
  }

  const result = await Bun.build({
    entrypoints: [CLIENT_BUILD_ENTRY],
    target: CLIENT_BUILD_TARGET,
  });

  if (!result.success) {
    console.error('Build failed');
    return new Response('Build failed', { status: 500 });
  }

  return new Response(result.outputs[0], {
    headers: { 'Content-Type': 'application/javascript' },
  });
}

/**
 * 处理路由分发
 */
export async function handleRoute(pathname: string): Promise<Response | null> {
  // 先尝试动态编译
  const buildResponse = await handleBuild(pathname);
  if (buildResponse) {
    return buildResponse;
  }

  // 再尝试静态文件
  const staticResponse = await serveStatic(pathname);
  if (staticResponse) {
    return staticResponse;
  }

  // 都没有找到
  return null;
}
