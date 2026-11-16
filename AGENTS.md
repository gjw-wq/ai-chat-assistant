# AI 聊天助手 - AI 开发指令（AGENTS.md）

## 项目概述

使用 React + TypeScript + Vite 开发的 AI 聊天助手，通过 Vite 开发代理调用智谱 AI
（glm-4-flash）Chat Completions 接口，实现流式多轮对话。

## 开发环境

- 操作系统：Windows
- 终端：Git Bash / PowerShell，命令须兼容 Windows
- 包管理器：npm

## 开发规范

- TypeScript 严格模式（strict: true），不使用 any
- 组件一律使用函数式组件 + Hooks
- 样式使用 Tailwind CSS 工具类，不写自定义全局样式（index.css 中的 markdown /
  动画样式除外）
- API Key 从 `import.meta.env.VITE_ZHIPU_API_KEY` 读取，严禁硬编码
- 状态管理只用 useState / useEffect / useCallback，不引入额外状态库
- 组件命名 PascalCase，函数与变量 camelCase，常量 UPPER_SNAKE_CASE

## 代码风格

- 所有代码与配置文件使用 ASCII 直引号，不使用中文全角引号
- 界面文案使用中文，代码标识符使用英文
- 不留 TODO、FIXME 注释
- 修改须限定在指明范围内，不牵连无关文件

## 功能要求

- 智谱 API 调用统一封装在 `src/api/zhipu.ts`，手写 SSE 解析，正确处理
  `[DONE]`、解析失败行、error 字段、网络错误与中断
- 流式输出：每个 delta 更新对应消息的 content，气泡逐字显示
- 发送期间输入框与按钮禁用，AI 气泡先显示"思考中..."
- 历史超过 20 条时只发送最近 20 条并在界面提示
- AI 回复用 react-markdown + react-syntax-highlighter 渲染，消息带复制按钮
- LocalStorage 读写必须有 try/catch 保护，坏数据降级为空历史
- 清空对话必须经过确认对话框

## 测试要求

- 每个功能完成后人工验证：
  - 刷新页面历史不丢
  - 流式输出逐字显示、可中断不白屏
  - 断网 / 错误 Key 时出现中文错误提示与重试按钮
  - 长历史场景出现裁剪提示条
- 确认 `npm run build` 无 TypeScript 报错

## 注意事项

- 保持代码简洁，避免过度设计
- 优先实现核心功能，细节优化放后
- 桌面端优先，兼顾移动端可用
