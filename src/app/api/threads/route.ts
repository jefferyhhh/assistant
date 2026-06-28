/**
 * 线程管理 API
 * GET  /api/threads         — 列出所有线程
 * POST /api/threads         — 创建新线程
 * DELETE /api/threads?id=xx — 删除线程
 */

import { NextRequest } from "next/server";
import { ensureMongoConnected } from "@/lib/mongodb";
import { config } from "@/lib/config";
import { randomUUID } from "crypto";

/**
 * GET /api/threads — 列出线程
 * 从 MongoDB checkpoints 集合中查询去重的 thread_id，关联 thread_metadata 获取标题
 */
export async function GET() {
  try {
    const client = await ensureMongoConnected();
    const db = client.db(config.mongodb.dbName);
    const collection = db.collection("checkpoints");

    const threads = await collection
      .aggregate([
        // 按 thread_id 分组，取每个线程最新的 checkpoint 时间戳
        {
          $group: {
            _id: "$thread_id",
            updatedAt: { $max: "$upserted_at" },
          },
        },
        // 关联 thread_metadata 获取标题
        {
          $lookup: {
            from: "thread_metadata",
            localField: "_id",
            foreignField: "thread_id",
            as: "metadata",
          },
        },
        { $unwind: { path: "$metadata", preserveNullAndEmptyArrays: true } },
        // 按最新活动时间降序排列（新到旧）
        { $sort: { updatedAt: -1 } },
      ])
      .toArray();

    return Response.json({
      threads: threads.map((t) => ({
        threadId: t._id,
        title: t.metadata?.title ?? null,
      })),
    });
  } catch (error) {
    console.error("List threads error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/threads — 创建新线程
 * 返回一个新的 thread_id
 */
export async function POST() {
  try {
    const threadId = randomUUID();
    return Response.json({ threadId });
  } catch (error) {
    console.error("Create thread error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/threads?id=xxx — 删除线程及其 checkpoint 数据
 */
export async function DELETE(req: NextRequest) {
  try {
    const threadId = req.nextUrl.searchParams.get("id");
    if (!threadId) {
      return Response.json({ error: "缺少 thread id" }, { status: 400 });
    }

    const client = await ensureMongoConnected();
    const db = client.db(config.mongodb.dbName);

    // 删除 checkpoints 和 checkpoint_writes 中该线程的数据
    await db.collection("checkpoints").deleteMany({ thread_id: threadId });
    await db.collection("checkpoint_writes").deleteMany({ thread_id: threadId });

    return Response.json({ success: true, threadId });
  } catch (error) {
    console.error("Delete thread error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}
