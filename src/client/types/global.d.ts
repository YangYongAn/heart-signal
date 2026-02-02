/**
 * 全局类型定义
 * 定义外部 ESN 框架提供的全局 API
 */

/**
 * ESN 框架提供的全局 API
 */
interface ESNAPI {
  /**
   * 获取用户信息
   */
  gainUserInfo(callbacks: {
    success: (data: {
      userId?: string;
      muid?: string;
      name?: string;
      loginName?: string;
      avatar?: string;
      deptName?: string;
    }) => void;
    fail: (error: any) => void;
  }): void;

  /**
   * 长震动
   */
  vibrateLong(): void;

  /**
   * 短震动
   */
  vibrateShort(): void;
}

/**
 * 扩展 Window 接口，添加 ESN 框架提供的 API
 */
interface Window {
  /**
   * ESN 框架注入的全局 API 对象
   */
  api: ESNAPI;
}
