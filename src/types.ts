export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** 标记该条消息为错误提示，气泡内展示"重试"按钮 */
  error?: boolean;
}
