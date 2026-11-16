import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "./types";
import { streamChat } from "./api/zhipu";
import { genId, loadMessages, saveMessages } from "./utils/storage";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import ConfirmDialog from "./components/ConfirmDialog";

/** 发送给模型的最大历史条数：超出只保留最近 20 条并提示 */
const MAX_CONTEXT_MESSAGES = 20;

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [historyTrimmed, setHistoryTrimmed] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 对话变化即持久化
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // 新消息（含流式增量）自动滚动到底部
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  /** 基于给定历史生成 AI 回复（流式写入最后一条 assistant 消息） */
  const generateReply = useCallback(async (history: Message[]) => {
    setIsLoading(true);
    const trimmed = history.length > MAX_CONTEXT_MESSAGES;
    setHistoryTrimmed(trimmed);
    const context = trimmed ? history.slice(-MAX_CONTEXT_MESSAGES) : history;
    const assistantId = genId();
    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
    ]);
    try {
      const fullText = await streamChat(
        context.map((m) => ({ role: m.role, content: m.content })),
        {
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
        }
      );
      // 以服务端完整结果兜底，确保最终内容准确
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
      );
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "发生未知错误，请稍后重试";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: (m.content !== "" ? m.content + "\n\n" : "") + "生成失败：" + reason,
                error: true,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (text === "" || isLoading) {
      return;
    }
    const userMessage: Message = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setInput("");
    void generateReply([...messages, userMessage]);
  }, [generateReply, input, isLoading, messages]);

  /** 重试：截掉出错的消息，基于之前的历史重新生成 */
  const handleRetry = useCallback(
    (index: number) => {
      if (isLoading) {
        return;
      }
      void generateReply(messages.slice(0, index));
    },
    [generateReply, isLoading, messages]
  );

  const handleClearConfirm = useCallback(() => {
    setMessages([]);
    setHistoryTrimmed(false);
    setShowClearConfirm(false);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">AI 聊天助手</h1>
          <p className="text-xs text-gray-400">
            由智谱 AI GLM-4-Flash 提供支持，支持多轮对话与 Markdown 渲染
          </p>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={messages.length === 0}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          清空对话
        </button>
      </header>

      {historyTrimmed && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
          对话历史过长，仅向模型发送了最近 {MAX_CONTEXT_MESSAGES} 条消息。
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                AI
              </div>
              <h2 className="mt-3 text-base font-medium text-gray-600">开始与 AI 对话</h2>
              <p className="mt-1 text-xs text-gray-400">
                可以提问编程问题、让它帮忙写文案，或聊任何感兴趣的话题
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              index={index}
              onRetry={handleRetry}
            />
          ))}
        </div>
      </div>

      <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={isLoading} />

      <ConfirmDialog
        open={showClearConfirm}
        title="清空对话"
        description="确定要清空全部对话记录吗？该操作不可恢复。"
        confirmText="清空"
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
