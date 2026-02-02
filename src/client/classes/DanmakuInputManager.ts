/**
 * 弹幕输入管理器
 * 处理用户输入、频率限制、内容验证
 */
export class DanmakuInputManager {
  private inputElement: HTMLTextAreaElement;
  private submitButton: HTMLButtonElement;
  private cooldownTimer: HTMLElement | null;
  private lastSendTime = 0;
  private cooldownDuration = 3000; // 3 秒冷却时间
  private maxLength = 50; // 最大字符数
  private submitCallback: ((content: string) => void) | null = null;
  private countdownInterval: number | null = null;
  private submitButtonText = '发送'; // 按钮原始文本

  constructor(
    inputSelector: string,
    submitButtonSelector: string,
    cooldownTimerSelector?: string
  ) {
    this.inputElement = document.querySelector(inputSelector) as HTMLTextAreaElement;
    this.submitButton = document.querySelector(submitButtonSelector) as HTMLButtonElement;
    this.cooldownTimer = cooldownTimerSelector ? document.querySelector(cooldownTimerSelector) : null;

    if (!this.inputElement || !this.submitButton) {
      throw new Error('找不到输入框或提交按钮');
    }

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 输入框内容变化
    this.inputElement.addEventListener('input', () => this.updateSubmitButton());

    // 提交按钮点击
    this.submitButton.addEventListener('click', () => this.handleSubmit());

    // 支持 Enter 提交（可选）
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // 初始状态
    this.updateSubmitButton();
  }

  /**
   * 处理提交
   */
  private handleSubmit() {
    if (!this.canSendDanmaku()) {
      return;
    }

    const content = this.inputElement.value.trim();

    if (!this.validateContent(content)) {
      return;
    }

    if (this.submitCallback) {
      this.submitCallback(content);
    }

    // 清空输入框
    this.inputElement.value = '';
    this.inputElement.focus();

    // 记录发送时间并启动冷却
    this.lastSendTime = Date.now();
    this.updateSubmitButton();
    this.startCooldown();
  }

  /**
   * 验证内容
   */
  private validateContent(content: string): boolean {
    if (!content) {
      return false;
    }

    if (content.length > this.maxLength) {
      alert(`弹幕长度不能超过 ${this.maxLength} 个字符`);
      return false;
    }

    return true;
  }

  /**
   * 检查是否可以发送弹幕
   */
  canSendDanmaku(): boolean {
    const now = Date.now();
    return now - this.lastSendTime >= this.cooldownDuration;
  }

  /**
   * 获取距离下次发送还需等待的时间（毫秒）
   */
  getTimeUntilNextSend(): number {
    const now = Date.now();
    const elapsed = now - this.lastSendTime;
    const remaining = Math.max(0, this.cooldownDuration - elapsed);
    return remaining;
  }

  /**
   * 更新提交按钮状态
   */
  private updateSubmitButton() {
    const content = this.inputElement.value.trim();
    const canSend = this.canSendDanmaku() && content.length > 0 && content.length <= this.maxLength;

    this.submitButton.disabled = !canSend;
    this.submitButton.style.opacity = canSend ? '1' : '0.5';

    // 更新字数提示
    if (content.length > this.maxLength) {
      this.inputElement.style.borderColor = '#e74c3c';
    } else {
      this.inputElement.style.borderColor = '';
    }
  }

  /**
   * 启动冷却倒计时
   */
  private startCooldown() {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval as unknown as number);
    }

    const updateCountdown = () => {
      const remaining = this.getTimeUntilNextSend();

      if (remaining > 0) {
        // 在按钮上显示倒计时
        this.submitButton.textContent = `${(remaining / 1000).toFixed(1)}s`;

        // 如果有单独的冷却计时器元素，也更新它
        if (this.cooldownTimer) {
          this.cooldownTimer.textContent = `${(remaining / 1000).toFixed(1)}s`;
          this.cooldownTimer.style.display = 'block';
        }
      } else {
        // 恢复按钮文本
        this.submitButton.textContent = this.submitButtonText;

        if (this.cooldownTimer) {
          this.cooldownTimer.style.display = 'none';
        }

        if (this.countdownInterval !== null) {
          clearInterval(this.countdownInterval as unknown as number);
          this.countdownInterval = null;
        }
      }

      this.updateSubmitButton();
    };

    updateCountdown(); // 立即更新一次
    this.countdownInterval = window.setInterval(updateCountdown, 100);
  }

  /**
   * 设置提交回调
   */
  setSubmitHandler(callback: (content: string) => void) {
    this.submitCallback = callback;
  }

  /**
   * 获取当前输入内容
   */
  getContent(): string {
    return this.inputElement.value.trim();
  }

  /**
   * 清空输入
   */
  clear() {
    this.inputElement.value = '';
    this.updateSubmitButton();
  }

  /**
   * 设置冷却时间（毫秒）
   */
  setCooldownDuration(ms: number) {
    this.cooldownDuration = ms;
  }

  /**
   * 设置最大长度
   */
  setMaxLength(length: number) {
    this.maxLength = length;
  }

  /**
   * 设置焦点
   */
  focus() {
    this.inputElement.focus();
  }

  /**
   * 禁用输入框
   */
  disable() {
    this.inputElement.disabled = true;
    this.submitButton.disabled = true;
  }

  /**
   * 启用输入框
   */
  enable() {
    this.inputElement.disabled = false;
    this.updateSubmitButton();
  }
}
