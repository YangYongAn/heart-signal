/**
 * WebSocket 消息格式（前后端共享）
 */
export interface WSMessage {
  type: 'heartbeat' | 'interaction' | 'connect' | 'disconnect' | 'danmaku' | 'modeChange';
  data?: any;
  timestamp: number;
}

/**
 * 弹幕数据结构
 */
export interface DanmakuData {
  userId: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: number;
}

/**
 * 弹幕消息
 */
export interface DanmakuMessage extends WSMessage {
  type: 'danmaku';
  data: DanmakuData;
}
