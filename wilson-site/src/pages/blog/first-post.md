     1|---
     2|title: "从零用 Tauri 构建 AI Agent 桌面端"
     3|description: "为什么选 Tauri、与 Electron 的真实对比、嵌入终端的 sidecar 方案。"
     4|pubDate: 2026-07-29
     5|tags: ["Tauri", "工程实践"]
     6|layout: "../../layouts/BlogPost.astro"
     7|---
     8|
     9|这是一个实验性项目的开篇——用 Tauri v2 构建一个对标 Codex CLI 和 Hermes Desktop 的 AI Agent 桌面客户端，取名 Wilson Desktop。这篇文章记录最初的选型决策和项目骨架搭建过程。
    10|
    11|## 为什么不是 Electron？
    12|
    13|Hermes Desktop 用的是 Electron，打包后 .app 大小 310 MB。Wilson Desktop 用 Tauri，同样功能的骨架打出来 11 MB。差距来自 Electron 内置了完整的 Chromium 渲染引擎，而 Tauri 使用系统的 WebView。
    14|
    15|但包体大小不是唯一的决策因素。更重要的是：
    16|
    17|- **Rust 编译器的错误信息对 agent 友好。** 在 agent 开发模式下，Rust 精确的编译错误比 JS 的运行时 `undefined` 错误更容易自动修复。
    18|- **安全性。** Tauri 的权限模型比 Electron 严格，每个 API 调用需要显式声明。
    19|- **代价是生态成熟度。** Electron 社区沉淀了十年，Tauri v2 才刚稳定。遇到冷门 bug 可能需要自己排。
    20|
    21|最终决策是一个权衡：Wilson Desktop 的目标是探索 Tauri 在复杂桌面应用的工程实践，所以接受生态不成熟的风险。
    22|
    23|## 开发环境搭建
    24|
    25|Mac mini 上搭建 Tauri v2 只需要三步：
    26|
    27|```
    28|curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    29|xcode-select --install
    30|npm install -g @tauri-apps/cli
    31|```
    32|
    33|## 项目结构
    34|
    35|```
    36|wilson-desktop/
    37|├── src/              # React 前端
    38|├── src-tauri/        # Rust 后端
    39|├── package.json
    40|└── vite.config.ts
    41|```
    42|
    43|## 包体对比
    44|
    45|```
    46|                    .app 大小    安装包 (.dmg)
    47|Electron (Hermes)    310 MB       ~150 MB
    48|Tauri (Wilson Desktop)           11 MB        3.6 MB
    49|```
    50|
    51|Tauri 的 .app 只有 Electron 的 1/28。
    52|
    53|## 下一篇预告
    54|
    55|阶段 1：嵌入终端的 sidecar 方案。如何用 Tauri 的 shell 插件在 WebView 中实现终端模拟器。
    56|