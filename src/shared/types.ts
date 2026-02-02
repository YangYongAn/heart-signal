/**
 * WebSocket 消息格式（前后端共享）
 */
export interface WSMessage {
  type: 'heartbeat' | 'interaction' | 'connect' | 'disconnect';
  data?: any;
  timestamp: number;
}
