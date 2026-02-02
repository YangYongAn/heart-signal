import type { DanmakuData } from '../../shared/types';

/**
 * 简化版弹幕管理器（移动端）
 * 在心电图画布上方显示弹幕
 */
export class SimpleDanmakuManager {
  private container: HTMLElement;
  private queue: DanmakuData[] = [];
  private active: Map<string, HTMLElement> = new Map();
  private pool: HTMLElement[] = [];
  private poolIndex = 0;
  private maxConcurrent = 5; // 移动端最大同屏弹幕数
  private scrollDuration = 5000; // 5秒滚动周期
  private animationFrameId: number | null = null;
  private screenWidth = 0;

  constructor(containerId: string, maxConcurrent = 5) {
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      throw new Error('找不到容器 ' + containerId);
    }

    this.maxConcurrent = maxConcurrent;
    this.screenWidth = this.container.offsetWidth;

    // 初始化 DOM 元素池
    this.initializePool();

    // 监听窗口大小改变
    window.addEventListener('resize', () => {
      this.screenWidth = this.container.offsetWidth;
    });

    // 启动动画循环
    this.startProcessing();

    console.log('[SimpleDanmakuManager] 初始化完成');
  }

  /**
   * 初始化 DOM 元素池
   */
  private initializePool() {
    for (let i = 0; i < this.maxConcurrent; i++) {
      const element = this.createDanmakuElement();
      element.style.display = 'none';
      this.container.appendChild(element);
      this.pool.push(element);
    }
  }

  /**
   * 创建单个弹幕 DOM 元素
   */
  private createDanmakuElement(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'mobile-danmaku';
    wrapper.style.cssText =
      'position: absolute;' +
      'left: 100%;' +
      'display: flex;' +
      'align-items: center;' +
      'gap: 6px;' +
      'padding: 6px 10px;' +
      'background: rgba(255, 255, 255, 0.1);' +
      'border-radius: 16px;' +
      'color: white;' +
      'font-size: 13px;' +
      'font-weight: 500;' +
      'white-space: nowrap;' +
      'pointer-events: none;' +
      'z-index: 50;' +
      'backdrop-filter: blur(4px);' +
      'will-change: transform;' +
      'backface-visibility: hidden;' +
      'transform: translateZ(0);' +
      'max-width: 80%;';

    // 头像
    const avatar = document.createElement('img');
    avatar.style.cssText =
      'width: 20px;' +
      'height: 20px;' +
      'border-radius: 50%;' +
      'flex-shrink: 0;' +
      'object-fit: cover;' +
      'border: 1px solid rgba(255, 255, 255, 0.3);';
    wrapper.appendChild(avatar);

    // 内容
    const content = document.createElement('span');
    content.style.cssText =
      'flex: 1;' +
      'overflow: hidden;' +
      'text-overflow: ellipsis;' +
      'line-height: 1.2;';
    wrapper.appendChild(content);

    return wrapper;
  }

  /**
   * 从池中获取元素
   */
  private getFromPool(): HTMLElement {
    const element = this.pool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.maxConcurrent;
    return element;
  }

  /**
   * 添加弹幕到队列
   */
  addDanmaku(data: DanmakuData) {
    this.queue.push(data);
  }

  /**
   * 启动处理循环
   */
  private startProcessing() {
    const process = () => {
      // 尝试从队列中取出并显示弹幕
      if (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
        const danmakuData = this.queue.shift();
        if (danmakuData) {
          this.displayDanmaku(danmakuData);
        }
      }

      this.animationFrameId = window.requestAnimationFrame(process);
    };

    process();
  }

  /**
   * 解析文本中的 QQ emoji 标记
   */
  private parseEmoji(text: string): string {
    // 转义 HTML 特殊字符
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 替换 [qq-emoji:id] 为 img 标签
    return escaped.replace(/\[qq-emoji:(\d+)\]/g, (match, id) => {
      const url = 'https://koishi.js.org/QFace/assets/qq_emoji/' + id + '/apng/' + id + '.png';
      return '<img src="' + url + '" alt="" style="width: 20px; height: 20px; vertical-align: middle; margin-left: 4px;">';
    });
  }

  /**
   * 显示单条弹幕
   */
  private displayDanmaku(data: DanmakuData) {
    const element = this.getFromPool();

    // 设置数据
    const avatar = element.children[0] as HTMLImageElement;
    const content = element.children[1] as HTMLElement;

    avatar.src = data.avatar;
    avatar.onerror = () => {
      avatar.src = '';
    };

    // 解析并渲染 QQ emoji
    content.innerHTML = this.parseEmoji(data.content);

    // 如果是快捷语，调整样式
    if (data.isQuickPhrase) {
      element.style.fontSize = '12px';
      element.style.color = 'rgba(255, 255, 255, 0.6)';
      element.style.background = 'none';
      element.style.backdropFilter = 'none';
    } else {
      element.style.fontSize = '13px';
      element.style.color = 'white';
      element.style.background = 'rgba(255, 255, 255, 0.1)';
      element.style.backdropFilter = 'blur(4px)';
    }

    // 随机垂直位置
    const containerHeight = this.container.offsetHeight;
    const danmakuHeight = 32;
    const randomTop = Math.random() * (containerHeight - danmakuHeight);

    element.style.top = randomTop + 'px';
    element.style.left = '100%';
    element.style.display = 'flex';
    element.style.position = 'absolute';
    element.style.transform = 'translateX(0) translateZ(0)';
    element.style.opacity = '1';

    // 生成唯一 ID
    const id = 'danmaku-' + data.userId + '-' + data.timestamp + '-' + Math.random();
    this.active.set(id, element);

    // 获取弹幕元素的实际宽度
    const elementWidth = element.offsetWidth;

    // 启动滚动动画
    this.animateDanmaku(element, id, elementWidth);
  }

  /**
   * 动画化弹幕滚动
   */
  private animateDanmaku(element: HTMLElement, id: string, elementWidth: number) {
    const startTime = performance.now();
    const containerWidth = this.container.offsetWidth;
    const scrollDistance = containerWidth + elementWidth;
    let lastTranslateX = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / this.scrollDuration;

      if (progress >= 1) {
        // 动画完成，返回池中
        element.style.display = 'none';
        this.active.delete(id);
        return;
      }

      const translateX = -scrollDistance * progress;

      // 只在值改变超过 0.5px 时更新
      if (Math.abs(translateX - lastTranslateX) > 0.5) {
        element.style.transform = 'translateX(' + translateX + 'px) translateZ(0)';
        lastTranslateX = translateX;
      }

      // 渐入效果
      if (progress < 0.05) {
        element.style.opacity = String(progress * 20);
      } else {
        element.style.opacity = '1';
      }

      window.requestAnimationFrame(animate);
    };

    window.requestAnimationFrame(animate);
  }

  /**
   * 清空所有弹幕
   */
  clear() {
    this.queue = [];
    this.active.forEach((element) => {
      element.style.display = 'none';
    });
    this.active.clear();
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clear();
    this.pool.forEach((el) => el.remove());
    this.pool = [];
  }
}
