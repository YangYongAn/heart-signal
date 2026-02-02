/**
 * WebSocket 消息格式（前后端共享）
 */
export interface WSMessage {
  type: 'heartbeat' | 'interaction' | 'connect' | 'disconnect' | 'danmaku' | 'modeChange' | 'danmakuList' | 'danmakuListSync' | 'danmakuDelete' | 'danmakuDeleted' | 'register';
  data?: any;
  timestamp: number;
}

/**
 * 用户注册数据（连接时发送）
 */
export interface RegisterData {
  userId: string;
  name: string;
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
  isQuickPhrase?: boolean; // 是否来自快捷语
}

/**
 * 弹幕消息
 */
export interface DanmakuMessage extends WSMessage {
  type: 'danmaku';
  data: DanmakuData;
}

/**
 * 服务端存储的弹幕（带 ID）
 */
export interface StoredDanmaku extends DanmakuData {
  id: string; // UUID
  status?: 'queued' | 'displaying' | 'done';
}
