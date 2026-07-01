/**
 * 后台任务执行器
 * 在 fire-and-forget 模式下运行 LangGraph Agent，更新 task 状态
 */

import { HumanMessage } from "@langchain/core/messages";
import { getThreadConfig } from "@/lib/agent";
import { createAgentFromRegistry } from "@/lib/agents";
import { getTask, updateTask } from "./store";

/**
 * 后台执行一个 task
 * 创建 Agent 实例，以非流式方式调用，完成后更新 task 状态
 *
 * @param taskId - 要执行的任务 ID
 */
export async function executeTask(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) {
    console.error(`[TaskExecutor] Task ${taskId} not found`);
    return;
  }

  // 标记为 running
  await updateTask(taskId, { status: "running", startedAt: new Date() });

  try {
    const agent = await createAgentFromRegistry(task.agentId, task.threadId);
    const config = getThreadConfig(task.threadId);

    const result = await agent.invoke({ messages: [new HumanMessage(task.message)] }, config);

    // 提取最后一条 AI 消息作为结果
    const lastMessage = result.messages[result.messages.length - 1];
    const content =
      typeof lastMessage.content === "string" ? lastMessage.content : String(lastMessage.content);

    await updateTask(taskId, {
      status: "completed",
      result: content,
      completedAt: new Date(),
    });

    console.log(`[TaskExecutor] Task ${taskId} completed`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error(`[TaskExecutor] Task ${taskId} failed:`, errorMessage);

    await updateTask(taskId, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date(),
    });
  }
}
