/**
 * 消息历史 API
 * GET /api/messages?threadId=xxx — 获取指定会话的历史消息
 */

import { NextRequest } from "next/server";
import { getThreadMessages } from "@/lib/agent";

export async function GET(req: NextRequest) {
  try {
    const threadId = req.nextUrl.searchParams.get("threadId");

    if (!threadId) {
      return Response.json({ error: "缺少 threadId" }, { status: 400 });
    }

    const messages = await getThreadMessages(threadId);
    return Response.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
