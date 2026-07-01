/**
 * 后台任务 MongoDB 存储层
 * 提供 tasks 集合的 CRUD 操作
 */

import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import { ensureMongoConnected } from "@/lib/mongodb";
import type { TaskRecord, TaskStatus } from "./types";

const COLLECTION_NAME = "tasks";

/** 获取 tasks 集合（懒连接） */
async function getCollection() {
  const client = await ensureMongoConnected();
  return client.db(config.mongodb.dbName).collection<TaskRecord>(COLLECTION_NAME);
}

/** 创建一条后台任务记录 */
export async function createTask(data: {
  threadId: string;
  agentId: string;
  message: string;
}): Promise<TaskRecord> {
  const now = new Date();
  const task: TaskRecord = {
    taskId: randomUUID(),
    threadId: data.threadId,
    agentId: data.agentId,
    message: data.message,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const col = await getCollection();
  await col.insertOne(task);

  return task;
}

/** 查询单个任务 */
export async function getTask(taskId: string): Promise<TaskRecord | null> {
  const col = await getCollection();
  return col.findOne({ taskId });
}

/** 查询某会话是否有正在执行的任务（pending 或 running） */
export async function getRunningTaskByThread(threadId: string): Promise<TaskRecord | null> {
  const col = await getCollection();
  return col.findOne({
    threadId,
    status: { $in: ["pending", "running"] },
  });
}

/** 查询某会话的所有任务（按创建时间倒序） */
export async function getTasksByThread(
  threadId: string,
  status?: TaskStatus,
): Promise<TaskRecord[]> {
  const col = await getCollection();
  const filter: Record<string, unknown> = { threadId };
  if (status) filter.status = status;

  return col.find(filter).sort({ createdAt: -1 }).toArray();
}

/** 更新任务字段 */
export async function updateTask(
  taskId: string,
  updates: Partial<Pick<TaskRecord, "status" | "result" | "error" | "startedAt" | "completedAt">>,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ taskId }, { $set: { ...updates, updatedAt: new Date() } });
}
