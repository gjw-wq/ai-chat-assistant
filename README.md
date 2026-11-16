# AI 聊天助手

一个类微信体验的 AI 聊天助手 Web 应用，基于 React + TypeScript + Vite + Tailwind CSS，
调用智谱 AI GLM-4-Flash 模型，支持多轮对话与流式逐字输出。

## 功能特性

- 类微信聊天界面：用户消息右侧蓝色气泡，AI 消息左侧白色气泡，底部输入框 + 发送按钮
- 多轮对话：自动携带历史消息，历史超过 20 条时仅发送最近 20 条并在界面提示
- 流式输出：AI 回复逐字显示，等待期间显示"思考中..."，发送时输入框禁用
- Markdown 渲染：react-markdown + react-syntax-highlighter 代码高亮，AI 消息支持一键复制
- 本地持久化：对话历史存 LocalStorage，刷新不丢失
- 清空对话：带确认对话框
- 自动滚动：新消息与流式内容自动滚动到底部
- 错误处理：气泡内显示中文友好错误提示，并提供"重试"按钮

## 获取智谱 AI API Key

1. 访问智谱 AI 开放平台：https://bigmodel.cn
2. 注册并登录，进入控制台
3. 在「API Keys」页面创建并复制你的 API Key
4. glm-4-flash 模型免费调用，适合学习与开发

## 配置 API Key

复制项目根目录的 `.env.example` 为 `.env.local`，填入你的 Key：

```
VITE_ZHIPU_API_KEY=your-key-here
```

> `.env.local` 已被 `.gitignore` 忽略，不会提交到代码库。

## 启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（见上一节）

# 3. 启动开发服务器
npm run dev
```

打开浏览器访问 http://localhost:5173 即可开始对话。

其他命令：

```bash
npm run build     # 类型检查 + 生产构建
npm run preview   # 本地预览构建产物
```

## CORS 代理说明

浏览器直接请求 `https://open.bigmodel.cn` 会因跨域（CORS）被拦截。本项目在
`vite.config.ts` 中配置了开发代理：

- 所有以 `/api` 开头的请求被转发到 `https://open.bigmodel.cn`
- 前端统一请求相对路径 `/api/paas/v4/chat/completions`
- `changeOrigin: true` 会把请求头中的 Host 改写为目标域名，智谱侧校验通过

```
浏览器  --POST /api/paas/v4/chat/completions-->  Vite Dev Server
                                                      |
                                                      v  (转发, changeOrigin)
                                            https://open.bigmodel.cn
```

注意：该代理仅在 `npm run dev` 开发模式下生效。生产部署时需要自建后端中转接口，
避免 API Key 暴露在前端。

## 项目结构

```
09-ai-chat-assistant/
  RESEARCH.md            # 需求研究
  PRD.md                 # 产品需求文档
  TECH_DESIGN.md         # 技术设计文档
  AGENTS.md              # AI 开发指令
  README.md              # 本文件
  index.html
  package.json
  tsconfig.json
  vite.config.ts         # 含 /api 开发代理
  tailwind.config.js
  postcss.config.js
  .env.example
  .gitignore
  src/
    main.tsx             # 入口
    App.tsx              # 消息状态编排：发送 / 重试 / 清空 / 滚动
    index.css            # Tailwind 指令 + Markdown 与动画样式
    types.ts             # Message 类型定义
    vite-env.d.ts        # Vite 环境变量类型
    api/zhipu.ts         # 智谱 API 封装：fetch + ReadableStream 手写 SSE 解析
    utils/storage.ts     # LocalStorage 读写与 genId
    components/
      MessageBubble.tsx  # 气泡：Markdown 渲染 / 复制 / 错误重试
      ChatInput.tsx      # 输入框 + 发送按钮
      ConfirmDialog.tsx  # 通用确认对话框
```

## 常见问题

- **提示 API Key 未配置**：确认项目根目录存在 `.env.local` 且已填入 Key，修改后重启 `npm run dev`。
- **请求报 401**：Key 无效或已过期，去控制台重新生成。
- **请求报 429**：请求过于频繁或免费额度耗尽，稍后重试。
