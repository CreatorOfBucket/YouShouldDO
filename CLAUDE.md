# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 项目概述

YouShouldDO 是一个基于 Electron 的桌面任务管理器，具有毛玻璃拟态 UI、多主题支持（玻璃/浅色/深色）和桌面置顶功能。仅支持 Windows，350x600px 无边框窗口，界面语言为中文。

## 常用命令

```bash
npm install          # 安装依赖
npm start            # 启动 Electron 应用
npm run dist         # 通过 electron-builder 构建 Windows NSIS 安装包
npm test             # 运行 Jest 测试
npm test -- <file>   # 运行单个测试文件
```

未配置代码检查或格式化工具。

## 架构

应用遵循 Electron 的进程隔离模型，分为三层：

- **main.js** — 主进程：窗口/托盘生命周期管理、IPC 处理、窗口位置锁定。模块级状态变量：`mainWindow`、`tray`、`isQuitting`、`isPositionLocked`。
- **preload.js** — 安全桥接层：通过 `contextBridge` 暴露白名单 IPC 通道。渲染进程通过 `window.electronAPI`（IPC）和 `window.appUtils`（工具函数）访问。已启用上下文隔离，nodeIntegration 已关闭。
- **renderer.js** — UI 逻辑：任务增删改查、主题切换、重要性标记、localStorage 持久化。包裹在 `DOMContentLoaded` 中。
- **lib/utils.js** — 纯工具函数（无 DOM/Electron/localStorage 依赖）：`escapeHtml`、`createTask`、`removeTask`、`toggleTaskCompleted`、`parseTasks`、`calculateOpacity`、`isBoolean`。全部可独立测试。
- **index.html** / **styles.css** — 页面结构和基于 CSS 变量的主题系统，含毛玻璃模糊效果。

### IPC 通道

渲染进程 → 主进程：`toggle-position-lock`、`get-position-lock-state`、`request-window-context`
主进程 → 渲染进程：`position-lock-changed`、`window-context`

### 数据持久化

所有状态存储在 `localStorage` 中，键名：`tasks`、`theme`、`isPositionLocked`。任务为 JSON 数组，结构为 `{ id, text, completed, important }`。

## 代码风格

- 4 空格缩进，必须使用分号，JS 中用单引号，HTML 属性用双引号
- 默认使用 `const`，仅在需要重新赋值时使用 `let`
- 主进程使用 CommonJS（`require`），工具函数使用 CommonJS 导出
- 变量/函数：`camelCase`；常量：`UPPER_SNAKE_CASE`；DOM ID/CSS 类名：`kebab-case`
- 将用户内容插入 `innerHTML` 前必须调用 `escapeHtml()`
- 访问 `mainWindow` 前需做空值检查；处理 IPC 数据前需验证有效性
- CSS 主题通过 `html[data-theme="..."]` 选择器和 CSS 变量实现

## 测试

测试文件位于 `__tests__/` 目录。已配置 Jest。测试覆盖 `lib/utils.js` 中的纯工具函数。Electron 主进程/渲染进程未进行单元测试。

## 构建与打包

electron-builder 生成 Windows NSIS 安装包。App ID：`com.youshoulddo.app`。输出目录：`dist/`。图标加载顺序：`icon.png`、`icon.ico`、`icon.svg`（逐级回退）。
