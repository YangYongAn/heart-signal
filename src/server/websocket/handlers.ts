import type { ServerWebSocket } from 'bun';
import type { WSMessage, RegisterData } from '../../shared/types';
import { addClient, removeClient, broadcast, getClientCount, setClientName, getClientName } from './broadcast';
import { danmakuStore } from '../danmaku/manager';

/**
 * 格式化时间为 HH:mm:ss
 */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return h + ':' + m + ':' + s;
}

/**
 * WebSocket 连接打开事件处理
 */
export function handleOpen(ws: ServerWebSocket<unknown>) {
  addClient(ws);
  console.log('[' + formatTime(new Date()) + '] Client connected, total:', getClientCount());

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

    // 处理不同的消息类型
    switch (data.type) {
      case 'register': {
        // 用户注册（连接后发送用户信息）
        const regData = data.data as RegisterData;
        if (regData && regData.name) {
          setClientName(ws, regData.name);
          console.log('[' + formatTime(new Date()) + '] User registered:', regData.name, ', total:', getClientCount());
        }
        break;
      }

      case 'danmaku': {
        // 存储弹幕到服务器
        const stored = danmakuStore.addDanmaku(data.data as any);
        const senderName = getClientName(ws) || data.data.name || 'unknown';
        console.log('[' + formatTime(new Date()) + '] Danmaku from', senderName + ':', stored.content);

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
          console.log('[' + formatTime(new Date()) + '] Deleted danmaku:', danmakuId);

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
  const name = getClientName(ws);
  removeClient(ws);

  if (name) {
    console.log('[' + formatTime(new Date()) + '] User disconnected:', name, ', total:', getClientCount());
  } else {
    console.log('[' + formatTime(new Date()) + '] Client disconnected, total:', getClientCount());
  }

  // 通知所有客户端有连接断开
  broadcast({
    type: 'disconnect',
    data: { totalClients: getClientCount() },
    timestamp: Date.now(),
  });
}
