/**
 * 服务器配置
 */

export const SERVER_PORT = parseInt(process.env.PORT || '2026', 10);
export const CLIENT_BUILD_ENTRY = './src/client/app.ts';
export const CLIENT_BUILD_TARGET = 'browser';
