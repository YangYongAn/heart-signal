import { WSClient } from './classes/WSClient';
import type { WSMessage, StoredDanmaku } from '../shared/types';
import { getAvatarUrl } from './utils/avatar';

/**
 * Admin 管理后台应用
 */
class AdminApp {
  private ws: WSClient;
  private currentMode = 'normal';
  private danmakuList = new Map<string, StoredDanmaku>();

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WSClient(
      wsUrl,
      (message) => this.handleMessage(message),
      (connected) => this.updateConnectionStatus(connected)
    );

    this.init();
  }

  private init() {
    this.ws.connect();
    this.setupEventListeners();
    this.requestDanmakuList();
    this.updateConnectionStatus(false); // 初始状态
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners() {
    // 模式按钮点击
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as Element;
        const mode = target.getAttribute('data-mode') || 'normal';
        this.switchMode(mode);
      });
    });
  }

  /**
   * 切换模式
   */
  private switchMode(mode: string) {
    this.currentMode = mode;

    // 更新 UI - 高亮当前模式
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      const btnMode = (btn as Element).getAttribute('data-mode');
      (btn as Element).classList.toggle('active', btnMode === mode);
    });

    // 发送模式切换消息
    this.ws.send({
      type: 'modeChange',
      data: { mode },
      timestamp: Date.now(),
    });
  }

  /**
   * 请求弹幕列表
   */
  private requestDanmakuList() {
    this.ws.send({
      type: 'danmakuList',
      data: {},
      timestamp: Date.now(),
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'danmakuListSync':
        // 接收弹幕列表
        this.danmakuList = new Map();
        if (Array.isArray(message.data)) {
          message.data.forEach((d: StoredDanmaku) => {
            this.danmakuList.set(d.id, d);
          });
        }
        this.renderDanmakuList();
        break;

      case 'danmaku':
        // 新弹幕到达
        if (message.data && typeof message.data === 'object') {
          const danmaku = message.data as StoredDanmaku;
          if (danmaku.id) {
            // 如果头像为空，自动生成占位头像
            if (!danmaku.avatar || danmaku.avatar.trim() === '') {
              danmaku.avatar = getAvatarUrl('', danmaku.name || '');
            }
            this.danmakuList.set(danmaku.id, danmaku);
            this.renderDanmakuList();
          }
        }
        break;

      case 'danmakuDelete':
        // 弹幕被删除
        if (message.data && message.data.id) {
          this.danmakuList.delete(message.data.id);
          this.renderDanmakuList();
        }
        break;
    }
  }

  /**
   * 渲染弹幕列表
   */
  private renderDanmakuList() {
    const list = document.getElementById('danmakuList');
    const count = document.getElementById('danmaku-count');

    if (!list) return;

    const danmakuArray = Array.from(this.danmakuList.values()).sort(
      (a, b) => b.timestamp - a.timestamp // 最新的在前
    );

    if (count) {
      count.textContent = danmakuArray.length.toString();
    }

    if (danmakuArray.length === 0) {
      list.innerHTML = '<div class="danmaku-empty">暂无弹幕</div>';
      return;
    }

    list.innerHTML = danmakuArray
      .map((d) => {
        const time = new Date(d.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return `
          <div class="danmaku-item">
            <img src="${this.escapeHtml(d.avatar)}" alt="${this.escapeHtml(d.name)}" class="danmaku-avatar" onerror="this.src='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect%20fill=%22%23666%22%20width=%22100%25%22%20height=%22100%25%22/%3E%3C/svg%3E'" />
            <div class="danmaku-info">
              <div class="danmaku-name">${this.escapeHtml(d.name)}</div>
              <div class="danmaku-content">${this.escapeHtml(d.content)}</div>
            </div>
            <button class="danmaku-delete" onclick="adminApp.deleteDanmaku('${this.escapeHtml(d.id)}')">✕</button>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 删除弹幕
   */
  public deleteDanmaku(id: string) {
    this.ws.send({
      type: 'danmakuDelete',
      data: { id },
      timestamp: Date.now(),
    });
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(connected: boolean) {
    const statusEl = document.getElementById('statusBar');
    if (statusEl) {
      statusEl.className = `status-bar ${connected ? 'connected' : 'disconnected'}`;
      statusEl.textContent = connected ? '✓ 已连接' : '✕ 已断连';
    }
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

// 启动应用
const adminApp = new AdminApp();
