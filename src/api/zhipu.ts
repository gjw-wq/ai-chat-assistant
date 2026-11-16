/**
 * 智谱 AI Chat Completions 封装。
 *
 * - 端点走相对路径 /api/paas/v4/chat/completions，由 vite.config.ts 的
 *   server.proxy 将 /api 转发到 https://open.bigmodel.cn，规避浏览器 CORS。
 * - 流式输出使用 fetch + ReadableStream 手写 SSE 解析：
 *   逐行读取 "data: " 前缀的 JSON，取 choices[0].delta.content 累加，
 *   正确处理 [DONE]、解析失败行、业务 error 字段、HTTP 错误与网络中断。
 */

export interface ZhipuChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChatHandlers {
  /** 每收到一段增量文本时回调 */
  onDelta?: (chunk: string) => void;
  /** 流结束（含 [DONE] 或流自然关闭）时回调，参数为完整文本 */
  onDone?: (fullText: string) => void;
}

export interface StreamChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

const CHAT_COMPLETIONS_URL = "/api/paas/v4/chat/completions";
const MODEL = "glm-4-flash";

function getApiKey(): string {
  const key = import.meta.env.VITE_ZHIPU_API_KEY;
  if (!key) {
    throw new Error(
      "API Key 未配置：请将项目根目录的 .env.example 复制为 .env.local，并填入你的智谱 AI API Key"
    );
  }
  return key;
}

function friendlyHttpError(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    detail = parsed.error?.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  switch (status) {
    case 401:
      return "API Key 无效或已过期，请检查 .env.local 中的 VITE_ZHIPU_API_KEY";
    case 429:
      return "请求过于频繁或额度已耗尽，请稍后重试" + (detail ? "（" + detail + "）" : "");
    default:
      return "AI 服务返回异常（HTTP " + status + "）" + (detail ? "：" + detail : "");
  }
}

export async function streamChat(
  messages: ZhipuChatMessage[],
  handlers: StreamChatHandlers = {},
  options: StreamChatOptions = {}
): Promise<string> {
  const apiKey = getApiKey();

  let response: Response;
  try {
    response = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new Error("无法连接智谱 AI 服务，请检查网络连接");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(friendlyHttpError(response.status, body));
  }

  const body = response.body;
  if (!body) {
    throw new Error("服务端未返回有效的数据流");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  const finish = (): string => {
    handlers.onDone?.(fullText);
    return fullText;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // 最后一段可能是半行，留到下一个 chunk 再拼
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith(":")) {
        continue;
      }
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        return finish();
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        // 单行 JSON 不完整时跳过，等待后续数据
        continue;
      }
      const chunk = parsed as {
        error?: { message?: string };
        choices?: Array<{ delta?: { content?: string } }>;
      };
      if (chunk.error && chunk.error.message) {
        throw new Error("模型服务返回错误：" + chunk.error.message);
      }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta !== "") {
        fullText += delta;
        handlers.onDelta?.(delta);
      }
    }
  }
  // 流在 [DONE] 之前被关闭：以已收到的内容为准正常结束
  return finish();
}
