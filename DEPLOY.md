# Zeabur 部署指南

本项目已配置为在 Zeabur 上自动部署。当你 push 代码到 GitHub main 分支时，Zeabur 会自动拉取并部署。

## 前置要求

- GitHub 账号
- Zeabur 账号（免费注册：https://zeabur.com）

## 部署步骤

### 1. 连接 GitHub 仓库

1. 登录 [Zeabur 控制台](https://dash.zeabur.com)
2. 点击 **"Create Project"** → **"Deploy new service"** → **"GitHub"**
3. 选择 `heart-signal` 仓库
4. Zeabur 会自动检测项目为 Bun 项目

### 2. 配置环境变量（可选）

如果需要环境变量，在 Zeabur 控制台的 **Variables** 中添加：

```
# 示例
SOME_API_KEY=your-api-key
DEBUG=true
```

### 3. 开始部署

Zeabur 会：
1. ✅ 克隆你的 GitHub 仓库
2. ✅ 检测 `zbpack.json` 配置
3. ✅ 运行 `bun install` 安装依赖
4. ✅ 启动应用：`bun src/server/index.ts`
5. ✅ 分配公网域名

## 自动更新

配置完成后，只需要 push 代码：

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

Zeabur 会自动拉取并重新部署（通常在 1-2 分钟内完成）。

## 查看部署状态

1. 在 Zeabur 控制台选择你的项目
2. 点击 **"Deployments"** 标签查看部署历史
3. 点击最新部署查看实时日志

## 查看应用日志

在 Zeabur 控制台：
1. 选择项目
2. 点击 **"Logs"** 标签
3. 实时查看应用输出

示例日志：
```
🚀 Server running at http://localhost:2026
📡 WebSocket available at ws://localhost:2026/ws
```

## 获取公网访问地址

部署完成后，Zeabur 会自动分配域名，格式为：

```
https://your-service-name.zeabur.app
```

WebSocket 地址：
```
wss://your-service-name.zeabur.app/ws
```

## 绑定自定义域名（可选）

1. 在 Zeabur 控制台找到 **"Domains"** 部分
2. 点击 **"Add Domain"**
3. 输入你的域名
4. 按照指示配置 DNS 记录

## 故障排查

### 部署失败

检查 **Deployments** 标签中的错误日志。常见问题：

**❌ "Module not found: bun"**
- Zeabur 会自动提供 Bun，不需要手动安装

**❌ "Port already in use"**
- 检查 `src/server/config/config.ts` 中的端口号
- Zeabur 会通过 `process.env.PORT` 自动分配端口

**❌ "WebSocket connection failed"**
- 确保使用 `wss://` (secure WebSocket)
- 检查客户端代码中 WebSocket URL 是否正确

### 环境不一致

如果本地能运行，但 Zeabur 部署失败：

1. 检查 `zbpack.json` 的配置
2. 在本地运行 `bun run typecheck` 检查类型错误
3. 查看 Zeabur 的完整部署日志

## 性能优化

### 启用缓存

对于大文件（如字体），在应用中设置缓存头：

```typescript
response.headers.set('Cache-Control', 'public, max-age=31536000');
```

### 监控资源使用

在 Zeabur 控制台的 **Metrics** 中查看：
- CPU 使用率
- 内存使用量
- 网络流量

## 成本

Zeabur 免费额度通常足够个人项目使用。如果超出限额，会显示警告，你可以升级为付费计划。

## 更多帮助

- 官方文档：https://docs.zeabur.com
- 社区论坛：https://zeabur.com/community
- GitHub Issues：https://github.com/YangYongAn/heart-signal/issues

---

**快速链接：**
- [Zeabur 控制台](https://dash.zeabur.com)
- [Zeabur 文档](https://docs.zeabur.com)
- [项目仓库](https://github.com/YangYongAn/heart-signal)
