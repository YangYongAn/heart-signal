# 自动部署指南

本项目配置了 GitHub Actions，当 main 分支有新 commit 时，自动部署到你的云服务器。

## 前置要求

### 1. 云服务器准备

确保你的云服务器上已安装：
- Bun 1.3.8
- Git
- PM2（用于进程管理，可选）

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 安装 PM2
npm install -g pm2
```

### 2. 在服务器上克隆项目

```bash
cd /path/to/your/projects
git clone https://github.com/YangYongAn/heart-signal.git
cd heart-signal
bun install
```

### 3. 配置 GitHub Actions Secrets

在你的 GitHub 仓库设置中，添加以下 secrets（Settings → Secrets and variables → Actions → New repository secret）：

| Secret 名称 | 说明 | 示例 |
|-----------|------|------|
| `SERVER_HOST` | 云服务器公网 IP | `203.0.113.42` |
| `SERVER_USER` | SSH 用户名 | `ubuntu` |
| `SERVER_PORT` | SSH 端口（可选，默认 22） | `22` |
| `SSH_PRIVATE_KEY` | 本地 SSH 私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROJECT_PATH` | 项目在服务器上的绝对路径 | `/home/ubuntu/heart-signal` |

### 4. 生成 SSH 密钥对

**本地电脑**生成新的 SSH 密钥（如果还没有）：

```bash
ssh-keygen -t ed25519 -C "heart-signal-deployment"
# 保存在：~/.ssh/heart-signal
# 不设置密码（直接回车两次）
```

### 5. 配置服务器的 SSH 认证

将你本地的 **公钥** 添加到服务器：

```bash
# 本地电脑执行
cat ~/.ssh/heart-signal.pub

# 复制内容，然后在服务器上执行：
echo "your-public-key-content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 6. 获取 SSH 私钥供 GitHub 使用

```bash
# 本地电脑执行
cat ~/.ssh/heart-signal
```

复制全部内容，粘贴到 GitHub Secrets 中的 `SSH_PRIVATE_KEY`。

## 工作流说明

`.github/workflows/deploy.yml` 会在以下情况触发：

✅ **触发条件**：任何 commit 被 push 到 main 分支

**部署步骤**：
1. Checkout 代码
2. 通过 SSH 连接到服务器
3. `git pull` 拉取最新代码
4. `bun install` 安装依赖
5. `bun run typecheck` 类型检查
6. 使用 PM2 重启应用（或启动新应用）

## 查看部署日志

1. 在 GitHub 仓库中，点击 "Actions" 标签
2. 选择最近的 workflow 运行
3. 点击 "deploy" job 查看详细日志

## 服务器上管理应用

### 使用 PM2

```bash
# 查看运行中的应用
pm2 list

# 查看日志
pm2 logs heart-signal

# 停止应用
pm2 stop heart-signal

# 重启应用
pm2 restart heart-signal

# 删除应用
pm2 delete heart-signal
```

### 不使用 PM2（直接运行）

如果不使用 PM2，编辑 `.github/workflows/deploy.yml`，将最后一行改为：

```yaml
# 使用 nohup 后台运行
nohup bun src/server/index.ts > /var/log/heart-signal.log 2>&1 &
```

## 故障排查

### 连接失败

```bash
# 本地测试 SSH 连接
ssh -i ~/.ssh/heart-signal -p 22 ubuntu@203.0.113.42

# 检查服务器上的 authorized_keys 权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 部署脚本失败

在服务器上手动运行命令检查：

```bash
cd /path/to/heart-signal
git pull origin main
bun install
bun run typecheck
```

### Bun 命令找不到

```bash
# 检查 Bun 是否正确安装
which bun
bun --version

# 或添加 Bun 到 PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 环境变量

如果项目需要环境变量（如 API 密钥），在服务器上创建 `.env` 文件：

```bash
# 服务器上
cat > /path/to/heart-signal/.env << EOF
SOME_API_KEY=xxx
DEBUG=true
EOF
```

然后在应用中读取：

```typescript
const apiKey = Bun.env.SOME_API_KEY;
```

## 下次部署

只需 push 代码到 main 分支，GitHub Actions 会自动：

```bash
git add .
git commit -m "feat: some change"
git push origin main
# ✅ 自动部署到服务器！
```

---

如有问题，检查 GitHub Actions 日志获取详细错误信息。
