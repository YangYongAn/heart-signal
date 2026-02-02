import type { ServerWebSocket } from 'bun';
import type { WSMessage } from '../../shared/types';

/**
 * 存储所有连接的客户端
 */
export const clients = new Set<ServerWebSocket<unknown>>();

/**
 * 存储客户端对应的用户名
 */
const clientNames = new Map<ServerWebSocket<unknown>, string>();

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
  clientNames.delete(ws);
}

/**
 * 获取当前在线客户端数量
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * 设置客户端的用户名
 */
export function setClientName(ws: ServerWebSocket<unknown>, name: string) {
  clientNames.set(ws, name);
}

/**
 * 获取客户端的用户名
 */
export function getClientName(ws: ServerWebSocket<unknown>): string | undefined {
  return clientNames.get(ws);
}
