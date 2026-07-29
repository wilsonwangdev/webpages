---
title: "从零用 Tauri 构建 AI Agent 桌面端"
description: "为什么选 Tauri、与 Electron 的真实对比、嵌入终端的 sidecar 方案。"
pubDate: 2026-07-29
tags: ["Tauri", "工程实践"]
layout: "../../layouts/BlogPost.astro"
---

这是一个实验性项目的开篇——用 Tauri v2 构建一个对标 Codex CLI 和 Hermes Desktop 的 AI Agent 桌面客户端，取名 Ara Desktop。这篇文章记录最初的选型决策和项目骨架搭建过程。

## 为什么不是 Electron？

Hermes Desktop 用的是 Electron，打包后 .app 大小 310 MB。Ara 用 Tauri，同样功能的骨架打出来 11 MB。差距来自 Electron 内置了完整的 Chromium 渲染引擎，而 Tauri 使用系统的 WebView。

但包体大小不是唯一的决策因素。更重要的是：

- **Rust 编译器的错误信息对 agent 友好。** 在 agent 开发模式下，Rust 精确的编译错误比 JS 的运行时 `undefined` 错误更容易自动修复。
- **安全性。** Tauri 的权限模型比 Electron 严格，每个 API 调用需要显式声明。
- **代价是生态成熟度。** Electron 社区沉淀了十年，Tauri v2 才刚稳定。遇到冷门 bug 可能需要自己排。

最终决策是一个权衡：Ara 的目标是探索 Tauri 在复杂桌面应用的工程实践，所以接受生态不成熟的风险。

## 开发环境搭建

Mac mini 上搭建 Tauri v2 只需要三步：

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
xcode-select --install
npm install -g @tauri-apps/cli
```

## 项目结构

```
ara-desktop/
├── src/              # React 前端
├── src-tauri/        # Rust 后端
├── package.json
└── vite.config.ts
```

## 包体对比

```
                    .app 大小    安装包 (.dmg)
Electron (Hermes)    310 MB       ~150 MB
Tauri (Ara)           11 MB        3.6 MB
```

Tauri 的 .app 只有 Electron 的 1/28。

## 下一篇预告

阶段 1：嵌入终端的 sidecar 方案。如何用 Tauri 的 shell 插件在 WebView 中实现终端模拟器。
