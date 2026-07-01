/**
 * 后台任务 API 客户端
 */

import type { TaskStatus } from "@/lib/tasks/types";
import { request } from "./client";

/** 任务记录（客户端视角，日期序列化为字符串） */
export interface TaskRecordClient {
  taskId: string;
  threadId: string;
  agentId: string;
  message: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

/** 查询单个任务状态 */
export async function getTask(taskId: string): Promise<TaskRecordClient> {
  return request<TaskRecordClient>(`/api/tasks/${taskId}`);
}

/** 查询某会话的任务列表 */
export async function getTasksByThread(
  threadId: string,
  status?: TaskStatus,
): Promise<TaskRecordClient[]> {
  const params = new URLSearchParams({ threadId });
  if (status) params.set("status", status);

  const data = await request<{ tasks: TaskRecordClient[] }>(`/api/tasks?${params}`);
  return data.tasks || [];
}

/** 发送后台任务请求（非 SSE，返回 taskId） */
export async function sendMessageBackground(
  message: string,
  threadId: string | null,
  agentId?: string,
): Promise<{ taskId: string; threadId: string }> {
  return request<{ taskId: string; threadId: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      threadId,
      agentId,
      background: true,
    }),
  });
}
