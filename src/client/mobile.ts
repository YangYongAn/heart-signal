import { SimplifiedECGRenderer } from './classes/SimplifiedECGRenderer';
import { UserInfoManager } from './classes/UserInfoManager';
import { DanmakuInputManager } from './classes/DanmakuInputManager';
import { WSClient } from './classes/WSClient';
import { ECGWaveGenerator } from './classes/ECGWaveGenerator';
import { ECGMode } from './types';
import { MODE_CONFIGS, MODE_EMOJI_URLS } from './constants';
import type { WSMessage } from '../shared/types';

/**
 * 移动端应用
 * 负责移动观众端的心电图显示和弹幕输入
 */
class MobileApp {
  private ecg: SimplifiedECGRenderer;
  private userManager: UserInfoManager;
  private inputManager: DanmakuInputManager;
  private ws: WSClient;
  private waveGenerator: ECGWaveGenerator;
  private ecgInterval: number | null = null;
  private currentBPM = 72;
  private currentMode: ECGMode = ECGMode.NORMAL;
  private modeEmojiImg?: HTMLImageElement;

  constructor() {
    console.log('[MobileApp] 构造函数被调用');

    // 初始化 ECG 渲染器
    this.ecg = new SimplifiedECGRenderer('mobile-ecg-canvas', ECGMode.NORMAL);
    console.log('[MobileApp] ECG 渲染器初始化完成');

    // 初始化用户管理器
    this.userManager = new UserInfoManager();
    console.log('[MobileApp] 用户管理器初始化完成');

    // 初始化弹幕输入管理器
    this.inputManager = new DanmakuInputManager(
      '#danmaku-input',
      '#danmaku-submit',
      '#cooldown-timer'
    );
    console.log('[MobileApp] 弹幕输入管理器初始化完成');

    // 初始化波形生成器
    this.waveGenerator = new ECGWaveGenerator();
    console.log('[MobileApp] 波形生成器初始化完成');

    // WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    console.log('[MobileApp] WebSocket URL:', wsUrl);

    // 初始化 WebSocket 客户端
    this.ws = new WSClient(wsUrl, this.handleMessage.bind(this), this.handleStatusChange.bind(this));
    console.log('[MobileApp] WebSocket 客户端初始化完成');

    // 设置事件监听
    this.setupEventListeners();
    console.log('[MobileApp] 事件监听设置完成');

    // 启动应用
    console.log('[MobileApp] 准备启动应用...');
    this.init();
  }

  /**
   * 初始化应用
   */
  private async init() {
    console.log('[MobileApp.init] 初始化开始');
    try {
      // 登录
      console.log('[MobileApp.init] 开始用户登录...');
      await this.userManager.login();
      console.log('[MobileApp.init] 用户登录成功');
      this.showLoginSuccess();

      // 启动 ECG 渲染
      console.log('[MobileApp.init] 启动 ECG 渲染...');
      this.ecg.startRendering();

      // 连接 WebSocket
      console.log('[MobileApp.init] 连接 WebSocket...');
      this.ws.connect();

      // 启动 ECG 数据生成循环
      console.log('[MobileApp.init] 启动 ECG 数据生成循环...');
      this.startECGLoop();

      // 启用输入框
      console.log('[MobileApp.init] 启用输入框...');
      this.inputManager.enable();
      this.inputManager.focus();

      // 更新初始模式显示
      console.log('[MobileApp.init] 更新初始模式显示...');
      this.updateModeDisplay();

      // 隐藏登录界面
      console.log('[MobileApp.init] 隐藏登录界面...');
      this.hideLoginOverlay();

      console.log('[MobileApp.init] 初始化完成！');
    } catch (error) {
      console.error('[MobileApp.init] 初始化失败:', error);
      this.showLoginError((error as Error).message);
    }
  }

  /**
   * 显示登录成功
   */
  private showLoginSuccess() {
    const user = this.userManager.getUser();
    if (!user) return;

    const statusEl = document.getElementById('login-status')!;
    statusEl.innerHTML = `
      <img src="${user.avatar}" alt="${user.name}" class="user-avatar" onerror="this.src=''">
      <div class="user-info">
        <span class="user-name">${user.name}</span>
        <span>已连接</span>
      </div>
    `;
    statusEl.style.background = 'rgba(46, 204, 113, 0.1)';
  }

  /**
   * 显示登录错误
   */
  private showLoginError(message: string) {
    const errorEl = document.getElementById('login-error')!;
    errorEl.textContent = `登录失败: ${message}`;
    errorEl.style.display = 'block';

    const statusEl = document.getElementById('login-status')!;
    statusEl.innerHTML = `
      <span style="color: #e74c3c;">❌ 登录失败，请刷新重试</span>
    `;
    statusEl.style.background = 'rgba(231, 76, 60, 0.1)';

    this.inputManager.disable();
  }

  /**
   * 隐藏登录界面
   */
  private hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay')!;
    overlay.style.display = 'none';
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners() {
    // 弹幕输入框内容变化
    const inputEl = document.getElementById('danmaku-input') as HTMLTextAreaElement;
    inputEl.addEventListener('input', () => {
      const charCount = document.getElementById('char-count')!;
      charCount.textContent = String(inputEl.value.length);
    });

    // 防止输入框获得焦点时页面被拉伸（iOS）
    inputEl.addEventListener('focus', () => {
      console.log('[MobileApp] 输入框获得焦点');
      // 延迟滚动确保软键盘弹出
      setTimeout(() => {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });

    // 弹幕提交
    this.inputManager.setSubmitHandler((content) => {
      this.sendDanmaku(content);
    });
  }

  /**
   * 发送弹幕
   */
  private sendDanmaku(content: string) {
    const user = this.userManager.getUser();
    if (!user) {
      alert('未登录');
      return;
    }

    const message: WSMessage = {
      type: 'danmaku',
      data: {
        userId: user.userId,
        name: user.name,
        avatar: user.avatar,
        content: content,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.ws.send(message);
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'heartbeat':
        // 可选：用于同步模式等
        break;

      case 'modeChange':
        if (message.data?.mode) {
          this.updateMode(message.data.mode);
        }
        break;

      case 'connect':
      case 'disconnect':
        // 连接状态变化
        if (message.data?.totalClients !== undefined) {
          // 可选：显示在线人数
        }
        break;
    }
  }

  /**
   * 更新模式显示和处理模式特定的效果
   */
  private updateMode(mode: ECGMode) {
    if (this.currentMode === mode) return;

    const prevMode = this.currentMode;
    this.currentMode = mode;

    // 同步更新 ECG 渲染器和波形生成器的模式
    this.ecg.setMode(mode);
    this.waveGenerator.setMode(mode);

    // 更新模式显示
    this.updateModeDisplay();

    // 在激动模式时触发振动效果
    if (mode === ECGMode.EXCITED && prevMode !== ECGMode.EXCITED) {
      this.triggerVibration();
    }
  }

  /**
   * 更新模式显示（头部模式图标和标题颜色）
   */
  private updateModeDisplay() {
    const config = MODE_CONFIGS[this.currentMode];

    // 更新模式 emoji/图标
    const modeEl = document.getElementById('current-mode');
    if (modeEl) {
      if (!this.modeEmojiImg) {
        this.modeEmojiImg = document.createElement('img');
        this.modeEmojiImg.crossOrigin = 'anonymous';
        modeEl.appendChild(this.modeEmojiImg);
      }

      const emojiUrl = MODE_EMOJI_URLS[this.currentMode];
      this.modeEmojiImg.src = emojiUrl;
      this.modeEmojiImg.alt = this.currentMode;
    }

    // 更新标题颜色
    const titleEl = document.getElementById('mobile-title');
    if (titleEl) {
      titleEl.style.color = config.color;
      titleEl.style.textShadow = `0 0 20px ${config.shadowColor}`;
    }

    // 更新 BPM 显示颜色
    const bpmEl = document.getElementById('mobile-bpm');
    if (bpmEl) {
      bpmEl.style.color = config.color;
    }
  }

  /**
   * 触发手机振动效果
   * 激动模式下执行：长震-短震-长震
   */
  private async triggerVibration() {
    const api = (window as any).api;
    if (!api?.vibrateLong || !api?.vibrateShort) {
      console.warn('[MobileApp] 振动 API 不可用');
      return;
    }

    try {
      // 长震
      api.vibrateLong();
      await this.delay(400);

      // 短震
      api.vibrateShort();
      await this.delay(200);

      // 长震
      api.vibrateLong();

      console.log('[MobileApp] 触发振动效果：长-短-长');
    } catch (err) {
      console.warn('[MobileApp] 振动效果调用失败:', err);
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理连接状态变化
   */
  private handleStatusChange(connected: boolean) {
    const statusEl = document.getElementById('login-status')!;
    if (connected) {
      statusEl.style.opacity = '1';
    } else {
      statusEl.style.opacity = '0.5';
    }
  }

  /**
   * 启动 ECG 数据生成循环
   */
  private startECGLoop() {
    this.ecgInterval = window.setInterval(() => {
      const { value, beat } = this.waveGenerator.tick();
      this.ecg.addDataPoint(value);

      // 更新 BPM 显示
      if (beat) {
        const baseBPM = this.waveGenerator.getLastBPM();
        if (baseBPM > 0) {
          const jitter = 3;
          this.currentBPM = Math.round(baseBPM + (Math.random() - 0.5) * jitter * 2);
          const bpmEl = document.getElementById('mobile-bpm')!;
          bpmEl.textContent = this.currentBPM.toString();
        }
      }
    }, 30);
  }

}

// 监听 apiready 事件，API 准备好后启动应用
console.log('[mobile.ts] 脚本加载完成，监听 apiready 事件...');
document.addEventListener('apiready', () => {
  console.log('[mobile.ts] apiready 事件触发！');
  new MobileApp();
});

// 如果页面已经加载完成，也进行初始化（备用方案）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[mobile.ts] DOMContentLoaded 事件触发（apiready 未触发时的备用方案）');
    if (!document.body.querySelector('.ecg-section')) {
      console.warn('[mobile.ts] 页面未正确加载，可能存在问题');
    }
  });
} else {
  console.log('[mobile.ts] 文档已加载');
}
