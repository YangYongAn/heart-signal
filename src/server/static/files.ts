/**
 * 静态文件自动发现和服务
 */

const PUBLIC_DIR = './public';

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(pathname: string): string {
  const ext = pathname.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    ttc: 'font/ttc',
    eot: 'application/vnd.ms-fontobject',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    txt: 'text/plain; charset=utf-8',
    xml: 'text/xml',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * 判断文件类型是否应该被缓存
 */
function shouldCache(pathname: string): boolean {
  const ext = pathname.split('.').pop()?.toLowerCase();
  // 字体、图片等静态资源长期缓存
  const cacheableTypes = ['woff', 'woff2', 'ttf', 'otf', 'ttc', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'];
  return cacheableTypes.includes(ext || '');
}

/**
 * 提供静态文件服务（自动发现 public 目录下的文件）
 */
export async function serveStatic(pathname: string): Promise<Response | null> {
  // 根路径映射到 index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // 构建文件路径
  const filePath = `${PUBLIC_DIR}${pathname}`;
  const file = Bun.file(filePath);

  // 检查文件是否存在
  const exists = await file.exists();
  if (!exists) {
    return null;
  }

  // 构建响应头
  const headers: Record<string, string> = {
    'Content-Type': getMimeType(pathname),
  };

  // 设置缓存策略
  if (shouldCache(pathname)) {
    headers['Cache-Control'] = 'public, max-age=31536000'; // 1 年
  }

  return new Response(file, { headers });
}
