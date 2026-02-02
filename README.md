# 心动的信号 Heart Signal

一个为小品《心动的信号》特别开发的大屏幕心电图显示系统，支持实时 WebSocket 互动和多种心电图模式切换。

## 项目介绍

本项目是为小品《心动的信号》开发的配套技术系统。通过实时心电图波形显示、音效同步和观众互动功能，为舞台表演增添科技感和互动性。

### 小品在线观看

**观看地址**: [https://www.youtube.com/watch?v=bYAXs4HGCns](https://www.youtube.com/watch?v=bYAXs4HGCns)

### 演出信息

- **小品名称**: 《心动的信号》
- **时长**: 18 分钟
- **台词脚本**: 见 [SCRIPT.md](./SCRIPT.md)

## 功能特性

### 心电图模式

系统支持 4 种心电图显示模式，配合剧情实时切换：

| 模式 | 波形颜色 | 效果 | 快捷键 |
|------|---------|------|--------|
| 正常模式 | 绿色 | 规律心跳 + 心跳音效 | `Tab` |
| 激动模式 | 红色 | 高频颤动 + 紧张气氛 | `Enter` |
| 死亡模式 | 绿色平直 | 持续长鸣 + BPM 显示 `--` | `Backspace` |
| 音乐模式 | 白色 | 音频律动 + KTV 歌词同步 | `Space` |

### 移动端互动弹幕

- **实时心电图同步** - 移动端显示与大屏幕同步的心电图
- **弹幕发送** - 观众扫码发送弹幕，大屏幕实时显示
- **频率限制** - 3 秒冷却时间，50 字符限制
- **快捷语** - 预设常用互动短语
- **DOM 池模式** - 预创建元素循环复用，性能优异

### 其他特性

- Canvas 实时渲染心电图波形
- LED 数码管风格 BPM 显示
- 卡拉 OK 风格歌词动画（逐字染色）
- 全屏模式支持（按 `F` 键）
- 管理后台远程控制

## 技术栈

| 类别 | 技术 |
|------|------|
| Runtime | [Bun 1.3.8](https://bun.sh/) |
| Language | TypeScript 7 (native preview) |
| Server | Bun 内置 HTTP + WebSocket |
| Frontend | 纯 HTML + Canvas（无框架） |
| Deployment | 自有服务器（Nginx + systemd）|

**兼容性**: ES2015（支持 Android 5.0+ / iOS 9+）

## 项目架构

```
heart-signal/
├── src/
│   ├── server/                  # 服务端
│   │   ├── index.ts             # 入口
│   │   ├── config/              # 配置
│   │   ├── routes/              # 路由
│   │   └── websocket/           # WebSocket
│   ├── client/                  # 客户端
│   │   ├── app.ts               # 大屏入口
│   │   ├── mobile.ts            # 移动端入口
│   │   └── classes/             # 核心类
│   │       ├── ECGRenderer.ts           # Canvas 渲染
│   │       ├── ECGWaveGenerator.ts      # 波形生成
│   │       ├── AudioAnalyzer.ts         # 音频分析
│   │       ├── LyricsManager.ts         # 歌词管理
│   │       ├── SoundEffects.ts          # 音效生成
│   │       ├── WSClient.ts              # WebSocket
│   │       ├── DanmakuManager.ts        # 弹幕渲染
│   │       └── SimplifiedECGRenderer.ts # 移动端 ECG
│   ├── shared/types.ts          # 共享类型
│   └── public/                  # 静态资源
├── scripts/                     # 工具脚本
├── SCRIPT.md                    # 台词脚本
└── CLAUDE.md                    # 开发指南
```

## 安装与运行

### 环境要求

- [Bun](https://bun.sh/) 1.3.8+

### 快速开始

```bash
# 克隆并安装
git clone https://github.com/YangYongAn/heart-signal.git
cd heart-signal
bun install

# 开发模式（带 HMR）
bun dev

# 生产模式
bun start

# 类型检查
bun run typecheck
```

开发服务器: **http://localhost:2026**
WebSocket: **ws://localhost:2026/ws**

## 使用说明

### 大屏显示

1. 访问 `http://localhost:2026`
2. 按 `F` 进入全屏
3. 使用快捷键切换模式

### 移动端互动

1. 访问 `http://localhost:2026/mobile`
2. 设置昵称后发送弹幕
3. 大屏幕实时显示弹幕

### 管理后台

访问 `/admin` 进入管理后台。

## 部署

### 方式一：自行部署（推荐）

#### 1. 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 11+
- **内存**: 至少 512MB
- **CPU**: 1 核心
- **带宽**: 1Mbps+（支持 WebSocket 长连接）

#### 2. 安装 Bun

```bash
# 使用官方安装脚本
curl -fsSL https://bun.sh/install | bash

# 重载环境变量
source ~/.bashrc  # 或 source ~/.zshrc

# 验证安装
bun --version
```

#### 3. 部署项目

```bash
# 创建项目目录
cd /opt
sudo git clone https://github.com/YangYongAn/heart-signal.git
cd heart-signal

# 安装依赖
sudo bun install

# 测试运行（默认端口 2026）
bun start
```

#### 4. 配置 systemd 服务

创建服务文件 `/etc/systemd/system/heart-signal.service`：

```ini
[Unit]
Description=Heart Signal WebSocket Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/heart-signal
ExecStart=/root/.bun/bin/bun start
Restart=always
RestartSec=10
Environment="PORT=2026"

# 日志配置
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start heart-signal

# 设置开机自启
sudo systemctl enable heart-signal

# 查看状态
sudo systemctl status heart-signal

# 查看日志
sudo journalctl -u heart-signal -f
```

#### 5. 配置 Nginx 反向代理

安装 Nginx：

```bash
sudo apt update && sudo apt install nginx -y  # Ubuntu/Debian
# 或
sudo yum install nginx -y  # CentOS
```

创建配置文件 `/etc/nginx/sites-available/heart-signal`：

```nginx
# HTTP 配置（非 SSL）
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 静态文件和页面
    location / {
        proxy_pass http://127.0.0.1:2026;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 特殊处理
    location /ws {
        proxy_pass http://127.0.0.1:2026;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 超时配置
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/heart-signal /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 6. 配置 HTTPS（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动配置 SSL
sudo certbot --nginx -d your-domain.com

# 证书自动续期（已自动配置）
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，将 HTTP 升级为 HTTPS，并添加 WebSocket 的 `wss://` 支持。

#### 7. 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 8. 访问地址

- **大屏显示**: `https://your-domain.com/`
- **移动端互动**: `https://your-domain.com/mobile`
- **管理后台**: `https://your-domain.com/admin`
- **WebSocket**: `wss://your-domain.com/ws`（自动）

#### 9. 更新部署

```bash
cd /opt/heart-signal
sudo git pull
sudo bun install
sudo systemctl restart heart-signal
```

#### 10. 故障排查

| 问题 | 解决方案 |
|------|---------|
| 服务无法启动 | 检查 `sudo journalctl -u heart-signal -xe` |
| WebSocket 连接失败 | 确保 Nginx 配置了 `Upgrade` 头 |
| 502 Bad Gateway | 检查 Bun 服务是否运行 `systemctl status heart-signal` |
| 端口占用 | 修改 `.service` 文件中的 `PORT` 环境变量 |
| SSL 证书过期 | 检查 `sudo certbot certificates` |

---

### 方式二：Zeabur 自动部署（可选）

如果你更喜欢自动化部署，可以尝试 Zeabur（需要配置成功）：

```bash
git push origin main
```

推送后 Zeabur 自动：
1. 检测 `zbpack.json` 配置
2. 运行 `bun install`
3. 设置 `PORT` 环境变量并启动
4. 分配公网域名

**注意**: 本项目当前未部署在 Zeabur，使用自有服务器。

## 歌词生成工具

使用 OpenAI Whisper 从音频自动生成 KTV 逐字歌词。

### 使用方法

```bash
# 安装依赖
pip3 install openai-whisper

# 生成歌词（简体）
python3 scripts/generate_lyrics.py public/music.wav

# 生成歌词（繁体）
python3 scripts/generate_lyrics.py public/music.wav --traditional
```

### 歌词格式

```
[开始时间+持续时间]字字字
```

示例：`[0.00+1.04]那就[1.04+1.10]不要[2.14+1.28]留`

- 一个时间标签对应一个词
- 同词内的字平均分配时间
- 换行表示新句子

### Whisper 模型

| 模型 | 大小 | 精度 |
|------|------|------|
| tiny | 72MB | 中等（推荐） |
| base | 142MB | 良好 |
| small | 461MB | 很好 |

## WebSocket 消息格式

```typescript
// 弹幕消息
{
  type: 'danmaku',
  data: {
    userId: string,
    name: string,
    avatar: string,
    content: string,
    timestamp: number
  }
}

// 心跳消息
{ type: 'heartbeat', data: { bpm: 75 } }

// 连接状态
{ type: 'connect' | 'disconnect' }
```

## 许可证

MIT License

---

<p align="center">
  Made with ❤️ for 《心动的信号》
</p>
