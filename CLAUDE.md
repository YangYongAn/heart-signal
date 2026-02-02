# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

heart-signal 是一个用于小品表演的大屏幕心电图显示系统。支持 WebSocket 实现观众扫码互动功能。

## Tech Stack

- **Runtime**: Bun.js
- **Language**: TypeScript
- **Server**: Bun 内置 HTTP + WebSocket 服务
- **Frontend**: 纯 HTML + Canvas（无框架）

## Commands

```bash
bun dev         # 启动开发服务器（带 HMR）
bun start       # 生产环境启动
bun run typecheck   # TypeScript 类型检查
```

开发服务器运行在 http://localhost:3000，WebSocket 端点为 ws://localhost:3000/ws

## Architecture

```
src/
├── server/
│   └── index.ts      # Bun 服务入口，处理 HTTP 静态文件和 WebSocket
├── client/
│   ├── index.html    # 大屏显示页面
│   └── app.ts        # 前端逻辑（ECG 渲染、WebSocket 客户端）
└── shared/
    └── types.ts      # 共享类型定义（消息格式）
```

**服务端**：使用 `Bun.serve()` 同时处理 HTTP 请求和 WebSocket 连接，静态文件直接从 `src/client/` 提供，TypeScript 通过 `Bun.build()` 实时转译。

**前端**：`ECGRenderer` 类使用 Canvas 绘制心电图波形，`WSClient` 类管理 WebSocket 连接和重连，`App` 类协调整体逻辑。

**WebSocket 消息类型**：`heartbeat`（心跳数据）、`interaction`（扫码互动）、`connect`/`disconnect`（连接状态）。
