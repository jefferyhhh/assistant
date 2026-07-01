/**
 * 后台任务列表 API
 * GET /api/tasks?threadId=xxx&status=running
 */

import type { NextRequest } from "next/server";
import { getTasksByThread } from "@/lib/tasks/store";
import type { TaskStatus } from "@/lib/tasks/types";

export async function GET(req: NextRequest) {
  try {
    const threadId = req.nextUrl.searchParams.get("threadId");
    const status = req.nextUrl.searchParams.get("status") as TaskStatus | null;

    if (!threadId) {
      return Response.json({ error: "threadId 参数必填" }, { status: 400 });
    }

    const tasks = await getTasksByThread(threadId, status || undefined);
    return Response.json({ tasks });
  } catch (error) {
    console.error("Tasks API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
