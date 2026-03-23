# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 项目概述

YouShouldDO 是一个基于 **Tauri v2** 的桌面任务管理器，具有毛玻璃拟态 UI、多主题支持（玻璃/浅色/深色）和窗口位置锁定功能。仅支持 Windows，350x600px 无边框透明窗口，界面语言为中文。

## 常用命令

```bash
npm install          # 安装 JS 依赖（@tauri-apps/cli、jest）
npm run dev          # 启动开发模式（tauri dev）
npm run build        # 构建 Windows NSIS 安装包（tauri build）
npm test             # 运行 Jest 测试
npm test -- <file>   # 运行单个测试文件
```

未配置代码检查或格式化工具。

## 架构

应用分为 Rust 后端和 Web 前端两层：

### Rust 后端（`src-tauri/`）

- **`src/lib.rs`** — 核心逻辑：窗口/托盘生命周期管理、Tauri 命令、`AppState`（含 `position_locked: Mutex<bool>`）。
- **`src/main.rs`** — 入口点，调用 `lib.rs` 的 `run()`。
- **`build.rs`** — Tauri 构建脚本。
- **`tauri.conf.json`** — 窗口配置（350x600、无边框、透明）、安全策略（CSP）、NSIS 打包设置。
- **`Cargo.toml`** — 依赖：`tauri = "2"`（含 `tray-icon` feature）、`tauri-plugin-single-instance = "2"`、`serde`、`serde_json`。

### Web 前端（`src/`）

- **`main.js`** — UI 逻辑：任务增删改查、主题切换、重要性标记、localStorage 持久化、通过 `window.__TAURI__.core.invoke()` 调用 Rust 命令。包裹在 `DOMContentLoaded` 中。
- **`lib/utils.js`** — 纯工具函数（无 DOM/Tauri/localStorage 依赖）：`escapeHtml`、`createTask`、`removeTask`、`toggleTaskCompleted`、`parseTasks`、`calculateOpacity`、`isBoolean`。全部可独立测试，通过 `window.appUtils` 暴露给渲染层。
- **`index.html`** / **`styles.css`** — 页面结构和基于 CSS 变量的主题系统，含毛玻璃模糊效果。拖拽区域通过 `data-tauri-drag-region` 属性实现。

### Tauri 命令（IPC）

前端通过 `invoke()` 调用后端：

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_position_lock_state` | 无 | `bool` | 获取当前锁定状态 |
| `toggle_position_lock` | `shouldLock: bool` | `bool` | 设置锁定状态 |

单实例通过 `tauri-plugin-single-instance` 保证；重复启动时聚焦已有窗口。

### 数据持久化

所有状态存储在 `localStorage` 中，键名：`tasks`、`theme`、`isPositionLocked`。任务为 JSON 数组，结构为 `{ id, text, completed, important }`。

## 代码风格

- 4 空格缩进，必须使用分号，JS 中用单引号，HTML 属性用双引号
- 默认使用 `const`，仅在需要重新赋值时使用 `let`
- 前端使用全局脚本（无打包工具），工具函数通过 `window.appUtils` 暴露
- 变量/函数：`camelCase`；常量：`UPPER_SNAKE_CASE`；DOM ID/CSS 类名：`kebab-case`；Rust 命令：`snake_case`
- 将用户内容插入 `innerHTML` 前必须调用 `escapeHtml()`
- Rust 侧访问 `Mutex` 前需正确 `unwrap` 或处理锁错误
- CSS 主题通过 `html[data-theme="..."]` 选择器和 CSS 变量实现

## 测试

测试文件位于 `__tests__/` 目录。已配置 Jest。测试覆盖 `lib/utils.js` 中的纯工具函数。Tauri 后端/前端渲染逻辑未进行单元测试。

## 构建与打包

`tauri build` 通过 Rust + NSIS 生成 Windows 安装包。App ID：`com.youshoulddo.app`。输出目录：`src-tauri/target/release/bundle/`。图标位于 `src-tauri/icons/`。
