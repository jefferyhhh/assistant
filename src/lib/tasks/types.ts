/**
 * 后台任务类型定义
 * 支持 ad-hoc 后台执行（Phase 1）和定时任务（Phase 2 预留）
 */

/** 任务状态 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** 后台任务记录 */
export interface TaskRecord {
  /** 任务唯一 ID */
  taskId: string;
  /** 关联的会话 ID */
  threadId: string;
  /** 使用的 Agent ID */
  agentId: string;
  /** 用户输入的消息 */
  message: string;
  /** 任务状态 */
  status: TaskStatus;
  /** Agent 最终回复（completed 时有值） */
  result?: string;
  /** 错误信息（failed 时有值） */
  error?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 开始执行时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
}
