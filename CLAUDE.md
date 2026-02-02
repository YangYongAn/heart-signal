# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

heart-signal 是一个用于小品表演的大屏幕心电图显示系统。支持 WebSocket 实现观众扫码互动功能。

## Tech Stack

- **Runtime**: Bun 1.3.8
- **Language**: TypeScript 7 (native preview)
- **Server**: Bun 内置 HTTP + WebSocket 服务
- **Frontend**: 纯 HTML + Canvas（无框架）
- **Deployment**: Zeabur

## Commands

```bash
bun dev             # 启动开发服务器（带 HMR）
bun start           # 生产环境启动
bun run typecheck   # TypeScript 类型检查
```

开发服务器运行在 http://localhost:2026，WebSocket 端点为 ws://localhost:2026/ws

## Architecture

```
src/
├── server/
│   ├── index.ts                 # 服务器入口
│   ├── config/
│   │   └── config.ts           # 服务器配置（PORT 支持环境变量）
│   ├── routes/
│   │   ├── index.ts            # 路由处理
│   │   └── static.ts           # 静态文件服务
│   ├── static/
│   │   └── files.ts            # 静态文件发现
│   └── websocket/
│       ├── index.ts            # WebSocket 配置
│       ├── handlers.ts         # 消息处理
│       └── broadcast.ts        # 广播功能
├── client/
│   ├── app.ts                  # 前端入口（4 行）
│   ├── classes/
│   │   ├── AudioAnalyzer.ts   # 音频分析器
│   │   ├── ECGRenderer.ts     # Canvas 渲染器
│   │   ├── ECGWaveGenerator.ts # 波形生成器
│   │   ├── LyricsManager.ts   # 歌词管理器
│   │   ├── SoundEffects.ts    # 音效生成器
│   │   └── WSClient.ts        # WebSocket 客户端
│   ├── constants/
│   │   └── index.ts           # 模式配置和波形参数
│   ├── types/
│   │   └── index.ts           # ECGMode 等类型定义
│   └── utils/
│       ├── index.ts
│       └── lyrics.ts          # 歌词解析工具
├── shared/
│   └── types.ts               # 共享类型定义（消息格式）
└── public/                    # 静态资源（自动发现）
    ├── index.html             # 大屏显示页面
    ├── favicon.svg            # 项目图标
    ├── led.ttf                # LED 数码管字体
    ├── GenSenRounded-M.ttc    # KTV 字体
    ├── music.wav              # 音频文件
    └── music_lyric.txt        # 歌词文件
```

## Key Features

**服务端**：
- 使用 `Bun.serve()` 同时处理 HTTP 和 WebSocket
- 静态文件从 `public/` 目录自动发现并提供
- TypeScript 通过 `Bun.build()` 实时转译
- 支持 `PORT` 环境变量（适配 Zeabur 部署）

**前端**：
- 模块化架构，每个类单独成文件
- `ECGRenderer` 使用 Canvas 绘制心电图波形
- `WSClient` 管理 WebSocket 连接和自动重连
- `LyricsManager` 实现卡拉OK风格歌词显示
- `AudioAnalyzer` 音频波形分析（音乐模式）

**心电图模式**：
- 💓 正常模式（绿色波形）
- ⚡ 激动模式（红色波形 + 高频颤动）
- 💀 死亡模式（平直线 + 持续长鸣）
- 🎵 音乐模式（白色波形 + KTV 歌词）

**WebSocket 消息类型**：
- `heartbeat`（心跳数据）
- `interaction`（扫码互动）
- `connect`/`disconnect`（连接状态）

## Deployment

项目部署在 Zeabur 上。详细步骤见 `DEPLOY.md`。

Push 到 main 分支后，Zeabur 会自动：
1. 检测 `zbpack.json` 配置
2. 运行 `bun install`
3. 启动应用（自动设置 `PORT` 环境变量）
4. 分配公网域名

## Development Notes

- 端口配置在 `src/server/config/config.ts` 中，读取 `PORT` 环境变量，默认 2026
- 静态资源自动从 `public/` 目录发现，支持自动 MIME 类型识别
- 歌词生成脚本在 `scripts/generate_lyrics.py`（使用 OpenAI Whisper）
- 项目使用 TypeScript 7 native preview，类型检查用 `tsgo` 编译器
