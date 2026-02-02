import type { ServerWebSocket } from 'bun';
import type { WSMessage } from '../../shared/types';
import { addClient, removeClient, broadcast, getClientCount } from './broadcast';
import { danmakuStore } from '../danmaku/manager';

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
export function handleMessage(ws: ServerWebSocket<unknown>, message: string | Buffer) {
  try {
    const data: WSMessage = JSON.parse(typeof message === 'string' ? message : message.toString());
    console.log('Received:', data);

    // 处理不同的消息类型
    switch (data.type) {
      case 'danmaku': {
        // 存储弹幕到服务器
        const stored = danmakuStore.addDanmaku(data.data as any);
        console.log('Stored danmaku:', stored.id);

        // 广播弹幕给所有客户端（包含 ID）
        broadcast({
          type: 'danmaku',
          data: stored,
          timestamp: Date.now(),
        });
        break;
      }

      case 'danmakuList': {
        // 返回当前弹幕列表
        const allDanmaku = danmakuStore.getAll();
        ws.send(JSON.stringify({
          type: 'danmakuListSync',
          data: allDanmaku,
          timestamp: Date.now(),
        }));
        break;
      }

      case 'danmakuDelete': {
        // 删除指定弹幕
        const danmakuId = (data.data as any)?.id;
        if (danmakuId) {
          danmakuStore.deleteDanmaku(danmakuId);
          console.log('Deleted danmaku:', danmakuId);

          // 广播删除消息给所有客户端
          broadcast({
            type: 'danmakuDelete',
            data: { id: danmakuId },
            timestamp: Date.now(),
          });
        }
        break;
      }

      default:
        // 默认转发消息给所有客户端
        broadcast(data);
    }
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
