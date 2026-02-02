# 移动端互动弹幕功能使用说明

## 功能概述

本功能为 heart-signal 小品表演系统添加了移动端观众互动页面，支持：

- **上半部分**：实时同步的心电图显示和 BPM
- **下半部分**：观众可输入弹幕，通过 WebSocket 发送到大屏幕
- **大屏幕显示**：弹幕随机位置、6秒滚动周期、实时显示用户头像和昵称

## 访问方式

### 大屏幕（主显示）
```
http://localhost:2026/
```
或生产环境的相应 URL

### 移动端互动页面
```
http://localhost:2026/mobile
```

## 文件结构

### 新增文件

```
src/
├── client/
│   ├── classes/
│   │   ├── SimplifiedECGRenderer.ts    # 移动端简化 ECG 渲染器
│   │   ├── UserInfoManager.ts         # 用户认证管理
│   │   ├── DanmakuInputManager.ts     # 弹幕输入管理（频率限制）
│   │   └── DanmakuManager.ts          # 大屏弹幕渲染引擎（DOM 池模式）
│   ├── utils/
│   │   └── avatar.ts                  # 头像生成工具
│   └── mobile.ts                      # 移动端应用入口
└── shared/
    └── types.ts                       # 扩展 WSMessage 类型

public/
└── mobile.html                        # 移动端页面
```

### 修改文件

```
src/
├── shared/types.ts                    # 添加 danmaku 消息类型
├── client/app.ts                      # 集成 DanmakuManager
├── server/routes/static.ts            # 添加 /mobile.js 路由
└── public/index.html                  # 添加弹幕容器
```

## 核心类说明

### DanmakuManager（大屏弹幕引擎）
**位置**: `src/client/classes/DanmakuManager.ts`

处理大屏幕上的弹幕渲染和动画：
- DOM 元素池模式：预创建 15-20 个元素，循环复用
- 6 秒滚动周期（与 ECG 保持同步）
- 垂直位置随机化
- 自动清理和回收

**关键方法**：
- `addDanmaku(data: DanmakuData)`: 添加弹幕到队列
- `getQueueLength()`: 获取等待中的弹幕数
- `getActiveCount()`: 获取当前显示的弹幕数

### DanmakuInputManager（移动端输入管理）
**位置**: `src/client/classes/DanmakuInputManager.ts`

管理移动端的弹幕输入和频率限制：
- **频率限制**：3-5 秒内只能发送一条（可配置）
- **长度限制**：最多 50 个字符（可配置）
- **倒计时显示**：显示距离下次发送还需等待的时间
- **输入验证**：字数提示、非空检查

**关键方法**：
- `canSendDanmaku()`: 检查是否可发送
- `getTimeUntilNextSend()`: 获取冷却剩余时间
- `setSubmitHandler(callback)`: 设置提交回调

### UserInfoManager（用户认证）
**位置**: `src/client/classes/UserInfoManager.ts`

处理用户认证和信息管理：
- 调用全局 `api.gainUserInfo()` 获取用户信息
- 支持头像为空时自动生成 placeholder
- 缓存用户信息防止重复认证

**关键方法**：
- `async login()`: 登录并获取用户信息
- `getUser()`: 获取已登录用户信息
- `isLoggedIn()`: 检查登录状态

### SimplifiedECGRenderer（移动端 ECG 渲染）
**位置**: `src/client/classes/SimplifiedECGRenderer.ts`

移动端简化版的 ECG 渲染器：
- 去除网格装饰，只保留中线
- 更小的阴影效果，优化移动设备性能
- 接口与主版本一致

## WebSocket 消息格式

### 弹幕消息（从移动端发往大屏幕）

```typescript
{
  type: 'danmaku',
  data: {
    userId: string,           // 用户 ID
    name: string,            // 用户昵称
    avatar: string,          // 用户头像 URL（或生成的 data URL）
    content: string,         // 弹幕内容
    timestamp: number        // 时间戳
  },
  timestamp: number          // 消息时间戳
}
```

### 服务端广播
所有连接的客户端（包括大屏幕和其他移动端）都会收到这条消息。

## 配置参数

### DanmakuManager
- **maxConcurrent**: 最大同屏弹幕数（默认 15）
- **scrollDuration**: 滚动周期（默认 6000ms，与 ECG 同步）

### DanmakuInputManager
- **cooldownDuration**: 发送冷却时间（默认 3000ms）
- **maxLength**: 最大字符数（默认 50）

修改方式：
```typescript
// 在创建实例后调用
inputManager.setCooldownDuration(5000); // 改为 5 秒
inputManager.setMaxLength(100);         // 改为 100 字符
```

## 样式定制

### 弹幕样式
大屏幕上的弹幕样式在 `DanmakuManager.ts` 的 `createDanmakuElement()` 方法中定义：

```typescript
wrapper.style.cssText = `
  position: fixed;
  right: -500px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: white;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  font-family: "GenSenRounded-M", sans-serif;
  backdrop-filter: blur(4px);
`;
```

### 移动端样式
移动端页面样式在 `public/mobile.html` 的 `<style>` 标签中定义，可自由修改。

## 性能考虑

1. **DOM 池模式**
   - 预创建 15-20 个 DOM 元素
   - 避免频繁的 DOM 创建/销毁
   - 避免垃圾回收（GC）抖动

2. **Transform 动画**
   - 使用 GPU 加速的 `transform` 属性
   - 避免改变 `left`/`right` 属性导致重排

3. **requestAnimationFrame**
   - 60 FPS 动画循环
   - 与浏览器刷新频率同步

4. **内存占用**
   - 单个弹幕 DOM 元素 ~1KB
   - 15-20 个元素 + 队列缓存 ~ 50-100KB

## 测试计划

### 1. 本地开发测试

启动开发服务器：
```bash
bun dev
```

打开两个浏览器窗口：
1. 主窗口：http://localhost:2026/ （大屏幕）
2. 移动窗口：http://localhost:2026/mobile （移动端，可用手机浏览器或浏览器开发工具模拟移动设备）

### 2. 测试场景

#### 场景 1：用户认证
- [ ] 打开移动端页面
- [ ] 验证自动调用 `api.gainUserInfo()` 进行登录
- [ ] 验证登录成功显示用户信息（头像 + 昵称）
- [ ] 验证登录失败时显示错误提示

#### 场景 2：ECG 同步
- [ ] 验证移动端心电图实时更新
- [ ] 验证 BPM 显示正确
- [ ] 验证心电图与大屏幕显示同步

#### 场景 3：弹幕发送
- [ ] 输入弹幕内容，点击发送
- [ ] 验证大屏幕立即显示弹幕
- [ ] 验证弹幕显示用户头像和昵称

#### 场景 4：频率限制
- [ ] 快速点击多次提交按钮
- [ ] 验证按钮被禁用且显示冷却倒计时
- [ ] 验证 3 秒后可再次发送

#### 场景 5：字数限制
- [ ] 输入超过 50 个字符
- [ ] 验证输入框显示警告（边框变红）
- [ ] 验证无法提交

#### 场景 6：多用户并发
- [ ] 打开多个移动端窗口（模拟多个用户）
- [ ] 同时发送弹幕
- [ ] 验证大屏幕显示所有弹幕
- [ ] 验证最多同时显示 15-20 条
- [ ] 验证超出数量的弹幕排队等待

#### 场景 7：弹幕动画
- [ ] 观察弹幕从右边滚入，6 秒内从左边滚出
- [ ] 验证弹幕垂直位置随机分布
- [ ] 验证弹幕之间无碰撞或重叠

### 3. 压力测试

使用浏览器开发工具或测试工具：
- 模拟 100+ 条弹幕快速发送
- 观察大屏幕是否保持流畅（无卡顿）
- 检查内存占用是否稳定

### 4. 浏览器兼容性

测试以下浏览器：
- [ ] Chrome 90+ (Desktop & Mobile)
- [ ] Firefox 88+ (Desktop & Mobile)
- [ ] Safari 14+ (Desktop & Mobile)
- [ ] Edge 90+ (Desktop & Mobile)

## 故障排查

### 移动端页面无法加载
- 检查 `/mobile.js` 是否成功编译
- 检查浏览器控制台是否有 JavaScript 错误
- 检查 `api.gainUserInfo()` 是否可用

### 弹幕无法显示
- 检查 WebSocket 连接是否正常
- 检查浏览器控制台是否有错误
- 检查大屏幕的 `#danmaku-container` 是否存在

### 频率限制不生效
- 检查 localStorage 是否被禁用
- 检查倒计时计时是否正确
- 查看 `DanmakuInputManager` 的 `canSendDanmaku()` 逻辑

### 头像显示为空
- 检查 `api.gainUserInfo()` 返回的头像 URL 是否有效
- 确认无效 URL 时是否成功生成 placeholder
- 检查 `getAvatarUrl()` 函数的逻辑

## 生产环境部署

### 步骤 1: 验证构建
```bash
bun run typecheck
```

### 步骤 2: 部署到 Zeabur
```bash
git add .
git commit -m "feat: 添加移动端互动弹幕功能"
git push origin main
```

Zeabur 会自动：
1. 检测 `zbpack.json` 配置
2. 运行 `bun install`
3. 启动应用（自动设置 `PORT` 环境变量）
4. 分配公网域名

### 步骤 3: 访问生产环境
- 大屏幕：`https://your-app-domain.zeabur.app/`
- 移动端：`https://your-app-domain.zeabur.app/mobile`

## 已知限制

1. **用户认证依赖外部 API**
   - 需要 `api.gainUserInfo()` 全局函数可用
   - 如果 API 不可用，移动端页面无法正常使用

2. **客户端速率限制**
   - 速率限制在客户端实现，可被熟悉技术的用户绕过
   - 对于公开展演场景足够，如需更强的限制建议添加服务端验证

3. **头像加载**
   - 头像由用户的第三方服务提供
   - 如果头像 URL 失效，使用生成的 placeholder

4. **内存占用**
   - 大量弹幕（1000+）可能导致内存占用增加
   - 建议定期清理或重启页面

## 未来改进方向

1. 添加服务端速率限制和内容过滤
2. 支持弹幕颜色和样式随机化
3. 添加点赞/表情反应功能
4. 支持管理员删除不当弹幕
5. 弹幕持久化存储（数据库）
6. 分析和统计功能
7. 多语言支持
8. 无障碍访问优化

## 联系支持

如有问题，请检查：
1. TypeScript 类型检查：`bun run typecheck`
2. 浏览器控制台错误信息
3. 网络连接和 WebSocket 状态
4. 外部 API（`api.gainUserInfo()`）可用性
