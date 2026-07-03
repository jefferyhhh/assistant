import { z } from "zod";

// ── Chat ──
export const ChatRequestSchema = z.object({
  message: z.string().min(1, "消息不能为空").max(32000, "消息长度不能超过 32000 个字符"),
  threadId: z.string().min(1).nullish(),
  agentId: z.enum(["general", "coding", "research"]).optional().default("general"),
  stream: z.coerce.boolean().default(true),
  background: z.coerce.boolean().default(false),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ── Messages ──
export const MessagesQuerySchema = z.object({
  threadId: z.string().min(1, "缺少 threadId"),
});

// ── Threads ──
export const DeleteThreadQuerySchema = z.object({
  id: z.string().min(1, "缺少 thread id"),
});

// ── Thread Title ──
export const ThreadTitleRequestSchema = z.object({
  threadId: z.string().min(1, "缺少 threadId"),
});

// ── Tasks ──
export const TasksQuerySchema = z.object({
  threadId: z.string().min(1, "threadId 参数必填"),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
});

export const TaskParamsSchema = z.object({
  taskId: z.string().min(1, "taskId 必填"),
});
