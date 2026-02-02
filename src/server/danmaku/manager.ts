import type { StoredDanmaku, DanmakuData } from '../../shared/types';

/**
 * 弹幕存储和管理
 */
class DanmakuStore {
  private danmakuMap = new Map<string, StoredDanmaku>();

  /**
   * 添加新弹幕
   */
  addDanmaku(data: DanmakuData): StoredDanmaku {
    const id = this.generateId();
    const stored: StoredDanmaku = {
      ...data,
      id,
      status: 'queued',
    };
    this.danmakuMap.set(id, stored);
    return stored;
  }

  /**
   * 删除指定弹幕
   */
  deleteDanmaku(id: string): boolean {
    return this.danmakuMap.delete(id);
  }

  /**
   * 获取所有弹幕（按时间排序）
   */
  getAll(): StoredDanmaku[] {
    return Array.from(this.danmakuMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /**
   * 获取单个弹幕
   */
  get(id: string): StoredDanmaku | undefined {
    return this.danmakuMap.get(id);
  }

  /**
   * 更新弹幕状态
   */
  updateStatus(id: string, status: StoredDanmaku['status']): void {
    const danmaku = this.danmakuMap.get(id);
    if (danmaku) {
      danmaku.status = status;
    }
  }

  /**
   * 清空所有弹幕
   */
  clear(): void {
    this.danmakuMap.clear();
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// 导出单例
export const danmakuStore = new DanmakuStore();
