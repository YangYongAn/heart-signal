import type { ServerWebSocket } from 'bun';
import type { WSMessage } from '../../shared/types';
import { addClient, removeClient, broadcast, getClientCount } from './broadcast';

/**
 * WebSocket 连接打开事件处理
 */
export function handleOpen(ws: ServerWebSocket<unknown>) {
  addClient(ws);
  console.log('Client connected, total:', getClientCount());

  // 通知所有客户端有新连接
  broadcast({
    type: 'connect',
    data: { totalClients: getClientCount() },
    timestamp: Date.now(),
  });
}

/**
 * WebSocket 消息事件处理
 */
export function handleMessage(_ws: ServerWebSocket<unknown>, message: string | Buffer) {
  try {
    const data: WSMessage = JSON.parse(typeof message === 'string' ? message : message.toString());
    console.log('Received:', data);

    // 转发消息给所有客户端
    broadcast(data);
  } catch (error) {
    console.error('Invalid message:', error);
  }
}

/**
 * WebSocket 连接关闭事件处理
 */
export function handleClose(ws: ServerWebSocket<unknown>) {
  removeClient(ws);
  console.log('Client disconnected, total:', getClientCount());

  // 通知所有客户端有连接断开
  broadcast({
    type: 'disconnect',
    data: { totalClients: getClientCount() },
    timestamp: Date.now(),
  });
}
