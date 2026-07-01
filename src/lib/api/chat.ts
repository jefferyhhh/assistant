/**
 * SSE 流式对话 API
 * 将 SSE 协议解析封装为 AsyncGenerator，调用方只关心事件类型
 */

import { requestStream } from "./client";
import type { ToolCall } from "./messages";

export interface SSEEvent {
  type: "content" | "done" | "error" | "tool_start" | "tool_end";
  content?: string;
  threadId?: string;
  taskId?: string;
  error?: string;
  toolCall?: ToolCall;
}

/**
 * 发送消息并通过 AsyncGenerator 逐事件返回 SSE 数据
 *
 * @example
 * ```ts
 * for await (const event of sendMessage(text, threadId, controller.signal)) {
 *   if (event.type === "content") appendContent(event.content);
 *   if (event.type === "done") setThreadId(event.threadId);
 * }
 * ```
 */
export async function* sendMessage(
  message: string,
  threadId: string | null,
  signal?: AbortSignal,
  agentId?: string,
): AsyncGenerator<SSEEvent> {
  const res = await requestStream(
    "/api/chat",
    { message, threadId, stream: true, agentId },
    signal,
  );

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // 最后一行可能不完整，保留在 buffer 中
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6)) as SSEEvent;
          yield data;
        } catch {
          // SSE chunk 可能是不完整的 JSON，静默跳过
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
