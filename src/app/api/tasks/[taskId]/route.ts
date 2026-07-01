/**
 * 单个后台任务 API
 * GET /api/tasks/[taskId]
 */

import type { NextRequest } from "next/server";
import { getTask } from "@/lib/tasks/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return Response.json({ error: "taskId 必填" }, { status: 400 });
    }

    const task = await getTask(taskId);

    if (!task) {
      return Response.json({ error: "任务不存在" }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error("Task detail API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
