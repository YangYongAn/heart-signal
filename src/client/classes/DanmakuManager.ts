import type { DanmakuData, StoredDanmaku } from '../../shared/types';

/**
 * 弹幕管理器
 * 负责在大屏幕上渲染和动画化弹幕
 * 使用 HTML DOM 元素池模式以优化性能
 */
export class DanmakuManager {
  private container: HTMLElement;
  private queue: (DanmakuData | StoredDanmaku)[] = [];
  private active: Map<string, HTMLElement> = new Map(); // id -> element
  private danmakuIdMap: Map<string, string> = new Map(); // serverId -> domId
  private pool: HTMLElement[] = [];
  private poolIndex = 0;
  private maxConcurrent = 15; // 最大同屏弹幕数
  private scrollDuration = 6000; // 6 秒滚动周期（与 ECG 保持同步）
  private animationFrameId: number | null = null;
  private screenWidth = 0;

  constructor(containerId: string, maxConcurrent = 15) {
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      throw new Error(`找不到容器 ${containerId}`);
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

    // 日志：弹幕配置
    console.log('[DanmakuManager] 初始化完成', {
      scrollDuration: this.scrollDuration,
      maxConcurrent: this.maxConcurrent,
      containerWidth: this.screenWidth,
      速度: `${(this.screenWidth / this.scrollDuration * 1000).toFixed(2)} px/sec`,
      说明: 'ECG 每 30ms 添加一个点，200 个点 × 30ms = 6000ms，速度应该一致',
    });
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
    wrapper.className = 'danmaku';
    wrapper.style.cssText = `
      position: absolute;
      left: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: white;
      font-size: 60px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      z-index: 100;
      font-family: "GenSenRounded-M", sans-serif;
      backdrop-filter: blur(4px);
      will-change: transform;
      backface-visibility: hidden;
      transform: translateZ(0);
      letter-spacing: 0.05em;
    `;

    // 头像
    const avatar = document.createElement('img');
    avatar.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    wrapper.appendChild(avatar);

    // 内容
    const content = document.createElement('span');
    content.style.cssText = `
      flex: 1;
      line-height: 1.1;
    `;
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
        const danmakuData = this.queue.shift()!;
        this.displayDanmaku(danmakuData);
      }

      this.animationFrameId = requestAnimationFrame(process);
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
      return '<img src="' + url + '" alt="" style="width: 60px; height: 60px; vertical-align: middle; margin-left: 8px;">';
    });
  }

  /**
   * 显示单条弹幕
   */
  private displayDanmaku(data: DanmakuData | StoredDanmaku) {
    const element = this.getFromPool();

    // 设置数据（只有头像和内容）
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
      element.style.fontSize = '50px';
      element.style.color = 'rgba(255, 255, 255, 0.6)';
      element.style.background = 'none';
      element.style.backdropFilter = 'none';
    } else {
      element.style.fontSize = '60px';
      element.style.color = 'white';
      element.style.background = 'rgba(255, 255, 255, 0.08)';
      element.style.backdropFilter = 'blur(4px)';
    }

    // 随机垂直位置（避免重叠）
    const containerHeight = this.container.offsetHeight;
    const danmakuHeight = 84; // 弹幕高度约 60px + padding
    const randomTop = Math.random() * (containerHeight - danmakuHeight);

    element.style.top = `${randomTop}px`;
    element.style.left = '100%'; // 从右边开始
    element.style.display = 'flex';
    element.style.position = 'absolute';
    element.style.transform = 'translateX(0) translateZ(0)';
    element.style.opacity = '1';

    // 生成唯一 DOM ID（用于动画跟踪）
    const domId = `danmaku-${data.userId}-${data.timestamp}-${Math.random()}`;
    this.active.set(domId, element);

    // 如果有服务器 ID，建立映射
    if ('id' in data) {
      this.danmakuIdMap.set(data.id, domId);
    }

    // 获取弹幕元素的实际宽度
    const elementWidth = element.offsetWidth;

    // 启动滚动动画
    this.animateDanmaku(element, domId, elementWidth);
  }

  /**
   * 动画化弹幕滚动
   * 弹幕与心电图同步滚动，速度完全一致
   *
   * 滚动距离 = 容器宽度 + 弹幕宽度
   * - 初始：弹幕右侧在屏幕右边（left: 100%）
   * - 最终：弹幕右侧也移出屏幕左边
   */
  private animateDanmaku(element: HTMLElement, id: string, elementWidth: number) {
    const startTime = performance.now();
    const containerWidth = this.container.offsetWidth;
    // 弹幕完全滚出屏幕的距离 = 容器宽度 + 弹幕宽度
    // 这样弹幕的右侧也会完全移出左边边界
    const scrollDistance = containerWidth + elementWidth;
    let lastTranslateX = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / this.scrollDuration;

      if (progress >= 1) {
        // 动画完成，返回池中
        element.style.display = 'none';
        this.active.delete(id);
        // 清理 ID 映射
        this.danmakuIdMap.forEach((domId, serverId) => {
          if (domId === id) {
            this.danmakuIdMap.delete(serverId);
          }
        });
        return;
      }

      // 弹幕滚动距离 = containerWidth + elementWidth
      // 进度 0%：translateX(0) —— 弹幕在右边屏幕外（left: 100%）
      // 进度 100%：translateX(-scrollDistance) —— 弹幕完全滚出左边（连右侧也消失）
      const translateX = -scrollDistance * progress;

      // 只在值改变超过 0.5px 时更新（减少重排，提高性能）
      if (Math.abs(translateX - lastTranslateX) > 0.5) {
        element.style.transform = `translateX(${translateX}px) translateZ(0)`;
        lastTranslateX = translateX;
      }

      // 渐入效果（前 5% 时间快速渐入）
      if (progress < 0.05) {
        element.style.opacity = String(progress * 20);
      } else {
        // 保持完全不透明
        element.style.opacity = '1';
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * 获取当前队列中的弹幕数
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取当前活跃弹幕数
   */
  getActiveCount(): number {
    return this.active.size;
  }

  /**
   * 删除指定 ID 的弹幕（通常来自服务器删除请求）
   */
  removeDanmaku(serverId: string) {
    const domId = this.danmakuIdMap.get(serverId);
    if (domId) {
      const element = this.active.get(domId);
      if (element) {
        element.style.display = 'none';
        this.active.delete(domId);
      }
      this.danmakuIdMap.delete(serverId);
    }
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
    this.danmakuIdMap.clear();
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
