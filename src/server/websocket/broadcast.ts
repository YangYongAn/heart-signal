import type { ServerWebSocket } from 'bun';
import type { WSMessage } from '../../shared/types';

/**
 * 存储所有连接的客户端
 */
export const clients = new Set<ServerWebSocket<unknown>>();

/**
 * 广播消息给所有连接的客户端
 */
export function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    client.send(data);
  }
}

/**
 * 添加客户端到连接池
 */
export function addClient(ws: ServerWebSocket<unknown>) {
  clients.add(ws);
}

/**
 * 从连接池移除客户端
 */
export function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws);
}

/**
 * 获取当前在线客户端数量
 */
export function getClientCount(): number {
  return clients.size;
}
