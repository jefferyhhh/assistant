/**
 * 后台任务列表 API
 * GET /api/tasks?threadId=xxx&status=running
 */

import type { NextRequest } from "next/server";
import { validateSearchParams } from "@/lib/api-helpers";
import { getTasksByThread } from "@/lib/tasks/store";
import { TasksQuerySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const parsed = validateSearchParams(req, TasksQuerySchema);
    if (!parsed.success) return parsed.response;

    const { threadId, status } = parsed.data;
    const tasks = await getTasksByThread(threadId, status);
    return Response.json({ tasks });
  } catch (error) {
    console.error("Tasks API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
