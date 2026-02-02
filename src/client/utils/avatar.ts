/**
 * 头像生成工具
 * 当用户没有头像时，生成一个带昵称首字符的 placeholder
 */

/**
 * 生成头像 URL
 * @param avatar - 用户头像 URL（可能为空）
 * @param name - 用户昵称
 * @returns 头像 URL 或 data URL
 */
export function getAvatarUrl(avatar: string, name: string): string {
  if (avatar && avatar.trim()) {
    return avatar;
  }

  // 生成 placeholder：使用昵称首字符
  return generateAvatarDataUrl(name);
}

/**
 * 生成基于昵称的头像 data URL
 * @param name - 用户昵称
 * @returns SVG data URL
 */
function generateAvatarDataUrl(name: string): string {
  // 获取昵称首字符
  const initial = name.charAt(0).toUpperCase() || '?';

  // 根据昵称生成颜色（简单哈希）
  const color = getColorFromName(name);

  // 创建 SVG（使用 encodeURIComponent 来处理中文字符）
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/><text x="50" y="50" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">${initial}</text></svg>`;

  // 使用 encodeURIComponent 编码为 data URL（支持中文字符）
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 根据名字生成颜色（简单哈希算法）
 * @param name - 用户昵称
 * @returns 十六进制颜色值
 */
function getColorFromName(name: string): string {
  const colors = [
    '#3498db', // 蓝色
    '#9b59b6', // 紫色
    '#e74c3c', // 红色
    '#f39c12', // 橙色
    '#1abc9c', // 青色
    '#2ecc71', // 绿色
    '#e67e22', // 深橙
    '#95a5a6', // 灰色
  ];

  // 简单哈希：计算名字字符的 ASCII 和
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }

  return colors[hash % colors.length];
}
