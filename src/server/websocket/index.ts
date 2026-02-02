import type { WebSocketHandler } from 'bun';
import { handleOpen, handleMessage, handleClose } from './handlers';

/**
 * WebSocket 配置对象
 */
export const websocketConfig: WebSocketHandler<unknown> = {
  open: handleOpen,
  message: handleMessage,
  close: handleClose,
};
