/**
 * WebSocket 消息类型
 */
export type WSMessageType =
  | 'heartbeat'      // 心跳信号
  | 'interaction'    // 扫码互动
  | 'connect'        // 连接通知
  | 'disconnect';    // 断开通知

/**
 * WebSocket 消息格式
 */
export interface WSMessage {
  type: WSMessageType;
  data?: any;
  timestamp: number;
}

/**
 * 心跳数据
 */
export interface HeartbeatData {
  value: number;      // 心跳值 (0-100)
  timestamp: number;
}

/**
 * 互动数据
 */
export interface InteractionData {
  userId: string;
  action: string;
  data?: any;
}
