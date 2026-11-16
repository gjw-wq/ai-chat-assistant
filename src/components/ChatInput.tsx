import { type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** AI 生成期间禁用输入与发送，防止重复发送 */
  disabled: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim() !== "") {
        onSend();
      }
    }
  };

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={2}
          placeholder={disabled ? "AI 正在思考，请稍候..." : "输入问题，Enter 发送，Shift+Enter 换行"}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          onClick={onSend}
          disabled={disabled || value.trim() === ""}
          className="shrink-0 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          发送
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-gray-400">
        内容由 AI 生成，仅供参考，请自行甄别重要信息
      </p>
    </div>
  );
}
