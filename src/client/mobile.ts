import { SimplifiedECGRenderer } from './classes/SimplifiedECGRenderer';
import { UserInfoManager } from './classes/UserInfoManager';
import { DanmakuInputManager } from './classes/DanmakuInputManager';
import { SimpleDanmakuManager } from './classes/SimpleDanmakuManager';
import { WSClient } from './classes/WSClient';
import { ECGWaveGenerator } from './classes/ECGWaveGenerator';
import { ECGMode } from './types';
import { MODE_CONFIGS, MODE_EMOJI_URLS } from './constants';
import { escapeHtml } from './utils';
import type { WSMessage } from '../shared/types';

/**
 * 移动端应用
 * 负责移动观众端的心电图显示和弹幕输入
 */
class MobileApp {
  private ecg: SimplifiedECGRenderer;
  private userManager: UserInfoManager;
  private inputManager: DanmakuInputManager;
  private danmakuManager: SimpleDanmakuManager;
  private ws: WSClient;
  private waveGenerator: ECGWaveGenerator;
  private ecgInterval: number | null = null;
  private currentBPM = 72;
  private currentMode: ECGMode = ECGMode.NORMAL;
  private modeEmojiImg?: HTMLImageElement;
  private systemType: 'ios' | 'android' = 'ios';

  constructor() {
    console.log('[MobileApp] 构造函数被调用');

    // 设置窗口属性（仅 iOS 生效）
    if (window.api && window.api.setWinAttr) {
      window.api.setWinAttr({ softInputMode: 'pan', softInputBarEnabled: false, bounces: false });
      console.log('[MobileApp] 已设置 softInputMode: pan, softInputBarEnabled: false, bounces: false');
    }

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
      '#cooldown-overlay'
    );
    console.log('[MobileApp] 弹幕输入管理器初始化完成');

    // 初始化弹幕显示管理器
    this.danmakuManager = new SimpleDanmakuManager('mobile-danmaku-container', 5);
    console.log('[MobileApp] 弹幕显示管理器初始化完成');

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

    // 获取系统类型
    if (window.api && window.api.systemType) {
      this.systemType = window.api.systemType;
      console.log('[MobileApp] 系统类型:', this.systemType);
    }

    // 设置事件监听
    this.setupEventListeners();
    console.log('[MobileApp] 事件监听设置完成');

    // 设置键盘事件监听
    this.setupKeyboardListeners();
    console.log('[MobileApp] 键盘事件监听设置完成');

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

      // 启用输入框和快捷语按钮
      console.log('[MobileApp.init] 启用输入框...');
      this.inputManager.enable();
      this.enableQuickPhrases();

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
    statusEl.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="' + escapeHtml(user.name) + '" class="user-avatar" onerror="this.src=\'\'">' +
      '<div class="user-info">' +
        '<span class="user-name">' + escapeHtml(user.name) + '</span>' +
      '</div>';

    // 更新快捷语中的部门名称
    this.updateDeptQuickPhrase(user.deptName);
  }

  /**
   * 更新部门快捷语
   */
  private updateDeptQuickPhrase(deptName?: string) {
    const user = this.userManager.getUser();
    if (!user) return;

    const quickPhrases = document.querySelectorAll('.quick-phrase');
    quickPhrases.forEach((btn) => {
      const element = btn as HTMLButtonElement;
      if (element.dataset.text === '我也是米兰学院的') {
        var newText = '我也是米兰学院的' + user.name;
        if (deptName) {
          const displayName = deptName.replace(/部$/, '分院');
          newText = '我也是米兰学院-' + displayName + '的' + user.name;
        }
        // 只更新实际发送的内容，保持按钮显示文字不变
        element.dataset.text = newText;
        // element.textContent 保持为"我也是米兰学院的"
      }
    });
  }

  /**
   * 显示登录错误
   */
  private showLoginError(message: string) {
    const errorEl = document.getElementById('login-error')!;
    errorEl.textContent = '登录失败: ' + message;
    errorEl.style.display = 'block';

    const statusEl = document.getElementById('login-status')!;
    statusEl.innerHTML = '<span style="color: #e74c3c;">❌ 登录失败，请刷新重试</span>';
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
    const inputEl = document.getElementById('danmaku-input') as HTMLInputElement;
    inputEl.addEventListener('input', () => {
      const charCount = document.getElementById('char-count');
      if (charCount) {
        charCount.textContent = String(inputEl.value.length);
      }
    });

    // 弹幕提交
    this.inputManager.setSubmitHandler((content) => {
      this.sendDanmaku(content);
    });

    // 快捷语按钮点击
    const randomSkills = ['前端', '后端', 'JAVA', 'AI', '摸鱼', '做菜', 'CSS', 'Rust', '画画', '吉他'];
    const luckinDrinks = ['丝绒拿铁', '瑞纳冰', '小黄油拿铁', '生椰拿铁', '厚乳拿铁', '橙C美式', '抹茶拿铁'];
    const luckinSugar = ['全糖', '半糖', '三分糖', '无糖'];
    const luckinTemp = ['冰的', '热的', '去冰', '温的'];
    const bossTitles = ['老当家', '大当家', '二当家', '三当家'];
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const quickPhrases = document.querySelectorAll('.quick-phrase');
    quickPhrases.forEach((btn) => {
      btn.addEventListener('click', () => {
        const element = btn as HTMLButtonElement;
        if (element.disabled) return;

        let text = element.dataset.text;
        if (text === 'random-skill') {
          text = `三当家，我要和你学${pick(randomSkills)}`;
        } else if (text === 'random-luckin') {
          text = `二当家，我要喝${pick(luckinDrinks)}，${pick(luckinSugar)}${pick(luckinTemp)}`;
        } else if (text === 'random-boss') {
          text = `${pick(bossTitles)}真帅！`;
        } else if (text === 'good-news' || text === 'bad-news') {
          const user = this.userManager.getUser();
          if (user) {
            if (text === 'good-news') {
              text = `${user.name}：我有好消息！[qq-emoji:183]`;
            } else {
              text = `${user.name}：我有坏消息！[qq-emoji:5]`;
            }
          }
        }
        if (text) {
          this.sendDanmaku(text, true); // 标记为快捷语
        }
      });
    });
  }

  /**
   * 发送弹幕
   */
  private sendDanmaku(content: string, isQuickPhrase = false) {
    const user = this.userManager.getUser();
    if (!user) {
      alert('未登录');
      return;
    }

    // 统一触发冷却遮罩（无论是普通发送还是快捷短语）
    this.inputManager.triggerCooldown();

    // 禁用快捷语按钮
    this.disableQuickPhrases();

    // 3秒后恢复快捷语按钮
    setTimeout(() => {
      this.enableQuickPhrases();
    }, 3000);

    const timestamp = Date.now();

    // 本地上屏预览
    this.danmakuManager.addDanmaku({
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      content: content,
      timestamp: timestamp,
      isQuickPhrase: isQuickPhrase,
    });

    const message: WSMessage = {
      type: 'danmaku',
      data: {
        userId: user.userId,
        name: user.name,
        avatar: user.avatar,
        content: content,
        timestamp: timestamp,
        isQuickPhrase: isQuickPhrase,
      },
      timestamp: timestamp,
    };

    this.ws.send(message);
  }

  /**
   * 启用快捷语按钮
   */
  private enableQuickPhrases() {
    const quickPhrases = document.querySelectorAll('.quick-phrase');
    quickPhrases.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = false;
    });
  }

  /**
   * 禁用快捷语按钮
   */
  private disableQuickPhrases() {
    const quickPhrases = document.querySelectorAll('.quick-phrase');
    quickPhrases.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = true;
    });
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
        if (message.data && message.data.mode) {
          this.updateMode(message.data.mode);
        }
        break;

      case 'connect':
      case 'disconnect':
        // 连接状态变化
        if (message.data && message.data.totalClients !== undefined) {
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
    const api = window.api;
    if (!api.vibrateLong || !api.vibrateShort) {
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
   * 设置键盘事件监听
   * Android: 减小心电图高度，防止输入面板被挤压
   * iOS: 固定定位输入面板，动态设置 bottom
   */
  private setupKeyboardListeners() {
    const api = window.api;
    if (!api || !api.addEventListener) {
      console.warn('[MobileApp] API 不可用，跳过键盘监听');
      return;
    }

    const inputSection = document.querySelector('.input-section') as HTMLElement;

    if (!inputSection) {
      console.warn('[MobileApp] 找不到布局元素');
      return;
    }

    // 键盘弹出：输入面板浮动到键盘上方
    api.addEventListener({ name: 'keyboardshow' }, (ret: { h: number }) => {
      var keyboardHeight = ret.h;
      console.log('[MobileApp] 键盘弹出，高度:', keyboardHeight, '系统:', this.systemType);

      inputSection.style.position = 'fixed';
      inputSection.style.left = '0';
      inputSection.style.right = '0';
      // Android 系统自己挤压页面，bottom 设 0 即可；iOS 需要手动抬高
      inputSection.style.bottom = (this.systemType === 'android' ? 0 : keyboardHeight) + 'px';
      inputSection.style.flex = 'none';
    });

    // 键盘收起：恢复输入面板定位
    api.addEventListener({ name: 'keyboardhide' }, () => {
      console.log('[MobileApp] 键盘收起');

      inputSection.style.position = '';
      inputSection.style.left = '';
      inputSection.style.right = '';
      inputSection.style.bottom = '';
      inputSection.style.flex = '';
    });
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
