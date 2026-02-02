import { getAvatarUrl } from '../utils/avatar';

/**
 * 用户信息接口
 */
export interface UserInfo {
  userId: string;
  name: string;
  avatar: string;
  loginName: string;
  deptName?: string;
}

/**
 * 用户信息管理器
 * 处理用户认证和信息缓存
 */
export class UserInfoManager {
  private user: UserInfo | null = null;
  private loading = false;
  private error: string | null = null;

  /**
   * 从 API 获取用户信息
   */
  async login(): Promise<UserInfo> {
    console.log('[UserInfoManager] login() 被调用');

    if (this.user) {
      console.log('[UserInfoManager] 用户已登录，返回缓存', this.user);
      return this.user;
    }

    if (this.loading) {
      console.warn('[UserInfoManager] 登录中，避免重复调用');
      throw new Error('登录中...');
    }

    this.loading = true;
    this.error = null;

    try {
      // 调用全局 API（由外部框架提供）
      console.log('[UserInfoManager] 检查全局 API...');
      const apiFunction = window.api.gainUserInfo;
      console.log('[UserInfoManager] api.gainUserInfo 存在:', !!apiFunction);

      let userData: any;

      if (!apiFunction) {
        // 开发环境 mock 数据
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        console.log('[UserInfoManager] isDev:', isDev);

        if (isDev) {
          console.warn('[UserInfoManager] API 不可用，使用开发环境 mock 数据');
          userData = this.getMockUserData();
          console.log('[UserInfoManager] Mock 用户数据:', userData);
        } else {
          throw new Error('API 不可用');
        }
      } else {
        console.log('[UserInfoManager] 调用真实 API...');
        userData = await this.callApiWithTimeout(apiFunction, 10000);
        console.log('[UserInfoManager] API 返回数据:', userData);
      }

      // 提取并规范化用户数据
      console.log('[UserInfoManager] 处理用户数据...');
      this.user = {
        userId: userData.userId || userData.muid || '',
        name: userData.name || userData.loginName || '用户',
        avatar: getAvatarUrl(userData.avatar || '', userData.name || userData.loginName || '用户'),
        loginName: userData.loginName || '',
        deptName: userData.deptName || '',
      };

      console.log('[UserInfoManager] 登录成功:', this.user);
      return this.user;
    } catch (err) {
      this.error = err instanceof Error ? err.message : '登录失败';
      console.error('[UserInfoManager] 登录失败:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  /**
   * 带超时的 API 调用
   */
  private callApiWithTimeout(apiFunction: any, timeoutMs: number): Promise<any> {
    console.log(`[UserInfoManager] 调用 API，超时时间: ${timeoutMs}ms`);

    return new Promise<any>((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let completed = false;

      // 设置超时
      timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.error('[UserInfoManager] API 请求超时!');
          reject(new Error('API 请求超时'));
        }
      }, timeoutMs);

      // 发送 API 请求
      console.log('[UserInfoManager] 发送 API 请求...');
      apiFunction({
        success: (data: any) => {
          if (!completed) {
            completed = true;
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
            console.log('[UserInfoManager] API 调用成功');
            resolve(data);
          }
        },
        fail: (err: any) => {
          if (!completed) {
            completed = true;
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
            console.error('[UserInfoManager] API 调用失败:', err);
            reject(err);
          }
        },
      });
    });
  }

  /**
   * 获取 mock 用户数据（开发环境用）
   */
  private getMockUserData(): any {
    const mockUsers = [
      {
        userId: 'user-001',
        loginName: '杨永安',
        name: '杨永安',
        avatar: '',
        muid: 'user-001',
        deptName: '米兰学院',
      },
      {
        userId: 'user-002',
        loginName: '张三',
        name: '张三',
        avatar: '',
        muid: 'user-002',
        deptName: '技术部',
      },
      {
        userId: 'user-003',
        loginName: '李四',
        name: '李四',
        avatar: '',
        muid: 'user-003',
        deptName: '产品部',
      },
    ];

    return mockUsers[Math.floor(Math.random() * mockUsers.length)];
  }

  /**
   * 获取已登录的用户信息
   */
  getUser(): UserInfo | null {
    return this.user;
  }

  /**
   * 获取用户昵称
   */
  getName(): string {
    return this.user && this.user.name || '匿名用户';
  }

  /**
   * 获取用户头像
   */
  getAvatar(): string {
    return this.user && this.user.avatar || '';
  }

  /**
   * 获取用户 ID
   */
  getUserId(): string {
    return this.user && this.user.userId || '';
  }

  /**
   * 获取错误信息
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * 清除用户信息（登出）
   */
  clear(): void {
    this.user = null;
    this.error = null;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return this.user !== null;
  }
}
