/**
 * 消息历史 API
 */

import { request } from "./client";

export interface ToolCall {
  id: string;
  name: string;
  args?: string;
  result?: string;
  status: "running" | "done" | "error";
}

export interface HistoryMessage {
  role: string;
  content: string;
  toolCalls?: ToolCall[];
}

/** 获取指定会话的历史消息 */
export async function loadMessages(threadId: string): Promise<HistoryMessage[]> {
  const data = await request<{ messages: HistoryMessage[] }>(
    `/api/messages?threadId=${threadId}`,
  );
  return data.messages || [];
}
