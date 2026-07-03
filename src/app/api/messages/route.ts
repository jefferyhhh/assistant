/**
 * 消息历史 API
 * GET /api/messages?threadId=xxx — 获取指定会话的历史消息
 */

import type { NextRequest } from "next/server";
import { getThreadMessages } from "@/lib/agent";
import { validateSearchParams } from "@/lib/api-helpers";
import { MessagesQuerySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const parsed = validateSearchParams(req, MessagesQuerySchema);
    if (!parsed.success) return parsed.response;

    const messages = await getThreadMessages(parsed.data.threadId);
    return Response.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
