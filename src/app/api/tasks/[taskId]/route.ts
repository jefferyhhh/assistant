/**
 * 单个后台任务 API
 * GET /api/tasks/[taskId]
 */

import type { NextRequest } from "next/server";
import { validateParams } from "@/lib/api-helpers";
import { getTask } from "@/lib/tasks/store";
import { TaskParamsSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const parsed = validateParams({ taskId }, TaskParamsSchema);
    if (!parsed.success) return parsed.response;

    const task = await getTask(parsed.data.taskId);

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
