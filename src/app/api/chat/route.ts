/**
 * 聊天 API
 * POST /api/chat
 *
 * 支持流式响应（SSE）和非流式响应
 * 请求体: { message: string, threadId?: string, stream?: boolean }
 */

import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent, getThreadConfig } from "@/lib/agent";
import type { ChatRequest } from "@/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest & { stream?: boolean } = await req.json();
    const { message, threadId: inputThreadId, stream = true } = body;

    if (!message?.trim()) {
      return Response.json({ error: "消息不能为空" }, { status: 400 });
    }

    const threadId = inputThreadId || randomUUID();
    const agent = await createAgent(threadId);
    const config = getThreadConfig(threadId);

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const eventStream = agent.streamEvents(
              { messages: [new HumanMessage(message)] },
              { ...config, version: "v2" }
            );

            for await (const event of eventStream) {
              if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk;
                if (chunk?.content) {
                  const data = JSON.stringify({
                    type: "content",
                    content: chunk.content,
                    threadId,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }

            // 发送结束标记
            const endData = JSON.stringify({ type: "done", threadId });
            controller.enqueue(encoder.encode(`data: ${endData}\n\n`));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "未知错误",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // 非流式响应
      const result = await agent.invoke(
        { messages: [new HumanMessage(message)] },
        config
      );

      const lastMessage = result.messages[result.messages.length - 1];
      return Response.json({
        reply: lastMessage.content,
        threadId,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
