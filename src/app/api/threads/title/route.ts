/**
 * 会话标题 API
 * POST /api/threads/title
 * 为指定会话生成 LLM 标题并存入 thread_metadata 集合
 */

import type { NextRequest } from "next/server";
import { generateThreadTitle } from "@/lib/agent";
import { validateBody } from "@/lib/api-helpers";
import { config } from "@/lib/config";
import { ensureMongoConnected } from "@/lib/mongodb";
import { ThreadTitleRequestSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const parsed = await validateBody(req, ThreadTitleRequestSchema);
    if (!parsed.success) return parsed.response;

    const { threadId } = parsed.data;

    // 检查是否已有标题
    const client = await ensureMongoConnected();
    const db = client.db(config.mongodb.dbName);
    const collection = db.collection("thread_metadata");

    const existing = await collection.findOne({ thread_id: threadId });
    if (existing?.title) {
      return Response.json({ title: existing.title, existed: true });
    }

    // 生成标题
    const title = await generateThreadTitle(threadId);
    if (!title) {
      return Response.json({ title: null, error: "无法生成标题" }, { status: 200 });
    }

    // 存储
    await collection.updateOne(
      { thread_id: threadId },
      {
        $set: { title },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true },
    );

    return Response.json({ title });
  } catch (error) {
    console.error("Generate title error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
