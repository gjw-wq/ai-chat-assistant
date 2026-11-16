import type { Message } from "../types";

const STORAGE_KEY = "ai-chat-assistant-messages";
const MAX_SAVED_MESSAGES = 200;

/** 生成短随机 ID，作为消息唯一标识 */
export function genId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Message>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.content === "string"
  );
}

/** 读取本地对话历史；数据损坏时降级为空数组 */
export function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isMessage);
  } catch {
    return [];
  }
}

/** 保存最近 200 条对话历史；写入失败（如配额满）时静默降级 */
export function saveMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)));
  } catch {
    // LocalStorage 不可用或配额已满时忽略，不影响正常聊天
  }
}

/** 清空本地对话历史 */
export function clearMessages(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略清理失败
  }
}
