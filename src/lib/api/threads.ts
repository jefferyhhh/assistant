/**
 * 会话相关 API
 */

import { request } from "./client";

export interface ThreadItem {
  key: string;
  label: string;
  title?: string;
}

/** 获取所有会话列表 */
export async function loadThreads(): Promise<ThreadItem[]> {
  const data = await request<{ threads: { threadId: string; title?: string | null }[] }>(
    "/api/threads",
  );
  return (data.threads || []).map((t) => ({
    key: t.threadId,
    label: t.title || `会话 ${t.threadId.slice(0, 8)}...`,
    title: t.title ?? undefined,
  }));
}

/** 删除指定会话 */
export async function deleteThread(threadId: string): Promise<void> {
  await request(`/api/threads?id=${threadId}`, { method: "DELETE" });
}

/** 异步生成会话标题（fire-and-forget） */
export async function generateThreadTitle(threadId: string): Promise<void> {
  await request("/api/threads/title", {
    method: "POST",
    body: JSON.stringify({ threadId }),
  });
}
