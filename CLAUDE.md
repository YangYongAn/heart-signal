# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

heart-signal 是一个用于小品表演的大屏幕心电图显示系统。支持 WebSocket 实现观众扫码互动功能。

## Tech Stack

- **Runtime**: Bun 1.3.8（作为项目依赖）
- **Package Manager**: pnpm 10.4.1
- **Language**: TypeScript 7 (native preview)
- **Server**: Bun 内置 HTTP + WebSocket 服务
- **Frontend**: 纯 HTML + Canvas（无框架）
- **Deployment**: Zeabur

## Commands

```bash
pnpm dev             # 启动开发服务器（带 HMR）
pnpm start           # 生产环境启动
pnpm typecheck       # TypeScript 类型检查
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
2. 运行 `pnpm install`
3. 启动应用（自动设置 `PORT` 环境变量）
4. 分配公网域名

## Development Notes

- 端口配置在 `src/server/config/config.ts` 中，读取 `PORT` 环境变量，默认 2026
- 静态资源自动从 `public/` 目录发现，支持自动 MIME 类型识别
- 歌词生成脚本在 `scripts/generate_lyrics.py`（使用 OpenAI Whisper）
- 项目使用 TypeScript 7 native preview，类型检查用 `tsgo` 编译器

## JavaScript 兼容性约定

**重要**：为了支持旧设备（如 Android 5.0+、iOS 9+），**源代码必须只使用 ES2015 及更早的 JavaScript 特性**。

### 禁止使用的特性（特别是移动端代码）

| 特性 | 引入版本 | 替代方案 |
|------|--------|--------|
| 可选链 `?.` | ES2020 | `obj && obj.prop` |
| 空值合并 `??` | ES2020 | `val !== undefined ? val : default` |
| 可选链调用 `?.()` | ES2020 | 先检查后调用 |
| 动态导入 `import()` | ES2020 | 不支持，仅用固定导入 |
| BigInt | ES2020 | 使用 Number |
| Promise.allSettled() | ES2020 | Promise.all 或手动处理 |

### 允许使用的现代特性

✅ **允许**（这些已被广泛支持）：
- 箭头函数 `() => {}`（ES2015）
- 模板字符串 `` `text ${var}` ``（ES2015）
- 解构赋值 `const { a, b } = obj`（ES2015）
- 类 `class Foo {}`（ES2015）
- 默认参数 `function f(a = 1) {}`（ES2015）
- Promise（ES2015）
- for...of 循环（ES2015）
- Map / Set（ES2015）

### 特别提醒

- **移动端代码** (`src/client/mobile.ts` 及其依赖)：严格遵守 ES2015 限制
- **大屏代码** (`src/client/app.ts`)：也应遵守 ES2015 限制以确保兼容性
- **后端代码**：可使用任何 Node.js 支持的特性
