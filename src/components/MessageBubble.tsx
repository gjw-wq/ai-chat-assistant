import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  /** 该消息在列表中的下标，供"重试"截断历史使用 */
  index: number;
  onRetry: (index: number) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

const markdownComponents: Components = {
  // 透传子节点，避免与语法高亮组件形成双重 pre 包裹
  pre({ children }) {
    return <>{children}</>;
  },
  code(props) {
    const { className, children } = props;
    const text = String(children).replace(/\n$/, "");
    const match = /language-(\w+)/.exec(className || "");
    const isBlock = match !== null || text.includes("\n");
    if (isBlock) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match ? match[1] : "markdown"}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.85rem",
          }}
        >
          {text}
        </SyntaxHighlighter>
      );
    }
    return <code className="inline-code">{children}</code>;
  },
};

export default function MessageBubble({ message, index, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // 剪贴板 API 不可用（如非安全上下文）时降级为 execCommand
      const textarea = document.createElement("textarea");
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div
          className={
            isUser
              ? "whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-blue-500 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm"
              : "break-words rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm " +
                (message.error ? "border border-red-200 bg-red-50" : "")
          }
        >
          {isUser ? (
            message.content
          ) : message.content === "" ? (
            <span className="text-gray-400">
              思考中
              <span className="thinking-dot">.</span>
              <span className="thinking-dot">.</span>
              <span className="thinking-dot">.</span>
            </span>
          ) : (
            <div className="md-content">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.error && (
            <button
              onClick={() => onRetry(index)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 transition-colors hover:text-red-700"
            >
              重试
            </button>
          )}
        </div>
        <div
          className={
            "flex items-center gap-2 text-[11px] text-gray-400 " +
            (isUser ? "flex-row-reverse" : "")
          }
        >
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && !message.error && message.content !== "" && (
            <button
              onClick={handleCopy}
              className="transition-colors hover:text-blue-500"
            >
              {copied ? "已复制" : "复制"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
