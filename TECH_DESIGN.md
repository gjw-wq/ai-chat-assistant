# AI 聊天助手 - 技术设计文档（Tech Design）

## 一、技术栈

- 前端框架：React ^18.3.1 + TypeScript ~5.6（严格模式）
- 构建工具：Vite ^5.4（含开发代理）
- 样式：Tailwind CSS ^3.4（经典 v3 配置：tailwind.config.js + postcss）
- Markdown：react-markdown ^9 + react-syntax-highlighter ^15.5（Prism 主题 oneDark）
- 大模型：智谱 AI Chat Completions（model: glm-4-flash，stream: true）
- 持久化：LocalStorage

## 二、项目结构

```
09-ai-chat-assistant/
  index.html
  package.json
  tsconfig.json
  vite.config.ts          # /api 代理到 open.bigmodel.cn
  tailwind.config.js
  postcss.config.js
  .env.example            # VITE_ZHIPU_API_KEY=your-key-here
  .gitignore
  src/
    main.tsx
    App.tsx               # 状态编排：消息、发送、重试、清空
    index.css             # Tailwind 指令 + markdown/动画样式
    types.ts              # Message 等类型
    vite-env.d.ts         # 环境变量类型声明
    api/zhipu.ts          # 智谱 API 封装：SSE 流式解析
    utils/storage.ts      # LocalStorage 读写 + genId
    components/
      MessageBubble.tsx   # 气泡：Markdown 渲染、复制、错误重试
      ChatInput.tsx        # 底部输入框 + 发送按钮
      ConfirmDialog.tsx   # 清空确认对话框
```

## 三、数据模型

```ts
type MessageRole = "user" | "assistant";

interface Message {
  id: string;            // 唯一 ID，genId() 生成
  role: MessageRole;
  content: string;       // 流式过程中逐步累加
  timestamp: number;
  error?: boolean;       // 标记该条为错误消息（显示重试按钮）
}
```

LocalStorage key：`ai-chat-assistant-messages`，保存最近 200 条（超出裁剪，防止配额溢出）。

## 四、API 调用设计

- 端点：`POST /api/paas/v4/chat/completions`（相对路径，由 Vite 代理转发）
- Header：`Authorization: Bearer <VITE_ZHIPU_API_KEY>`、`Content-Type: application/json`
- Body：`{ model: "glm-4-flash", messages, stream: true, temperature }`
- 代理配置：`server.proxy["/api"] -> https://open.bigmodel.cn`，`changeOrigin: true`

## 五、关键技术点

### 1. SSE 流式解析（手写，不依赖第三方库）

- `fetch` 拿到 `response.body`（ReadableStream），`getReader()` + `TextDecoder` 循环读取
- 按行拆分（保留半行 buffer，拼接跨 chunk 的行）
- 每行 trim 后判断：空行 / `:` 开头注释行跳过；`data: ` 前缀取 payload
- payload 为 `[DONE]` 时正常结束；否则 JSON.parse 取 `choices[0].delta.content` 累加
- 解析失败的单行跳过；`error.message` 存在时抛业务错误
- 流未发 [DONE] 就关闭时按"已收到的内容即完整结果"处理

### 2. 错误与中断处理

- fetch 抛错（网络）→ "无法连接智谱 AI 服务，请检查网络连接"
- HTTP 401 → "API Key 无效或已过期..."; 429 → "请求过于频繁或额度耗尽..."
- AbortError 原样向上抛，由调用方决定展示
- 错误消息落为一条 `error: true` 的 assistant 消息，气泡内显示中文提示 + 重试按钮

### 3. 历史裁剪

- 发送 API 前，若历史超过 20 条，取最近 20 条作为 messages
- 界面显示提示条："对话历史过长，仅向模型发送了最近 20 条消息"

### 4. 自动滚动

- useEffect 监听 messages（含每次流式增量触发的新数组），把滚动容器 scrollTop 置为 scrollHeight

### 5. Markdown / 代码高亮

- react-markdown v9 自定义 `pre`（透传子节点，避免双重背景）与 `code` 组件
- `code` 按是否有 `language-xxx` className 或换行区分块级/行内；块级交给 Prism 高亮
