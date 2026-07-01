/**
 * 聊天 API
 * POST /api/chat
 *
 * 支持流式响应（SSE）、非流式响应和后台执行模式
 * 请求体: { message: string, threadId?: string, stream?: boolean, background?: boolean }
 */

import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getThreadConfig } from "@/lib/agent";
import { createAgentFromRegistry, getAgentDefinition } from "@/lib/agents";
import { executeTask } from "@/lib/tasks/executor";
import { createTask } from "@/lib/tasks/store";
import type { ChatRequest } from "@/types";

const DEFAULT_MAX_MESSAGE_LENGTH = 32000;

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest & { stream?: boolean } = await req.json();
    const { message, threadId: inputThreadId, agentId, stream = true, background } = body;

    if (!message?.trim()) {
      return Response.json({ error: "消息不能为空" }, { status: 400 });
    }

    const definition = getAgentDefinition(agentId || "general");
    const maxLength = definition.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH;

    if (message.length > maxLength) {
      return Response.json({ error: `消息长度不能超过 ${maxLength} 个字符` }, { status: 400 });
    }

    const threadId = inputThreadId || randomUUID();

    // 后台执行模式：创建任务记录，立即返回，后台异步执行
    if (background) {
      const task = await createTask({
        threadId,
        agentId: agentId || "general",
        message,
      });

      // fire-and-forget，不阻塞响应
      executeTask(task.taskId).catch((err) => {
        console.error("[Chat API] Background task execution error:", err);
      });

      return Response.json({ taskId: task.taskId, threadId });
    }

    const agent = await createAgentFromRegistry(agentId, threadId);
    const config = getThreadConfig(threadId);

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const eventStream = agent.streamEvents(
              { messages: [new HumanMessage(message)] },
              { ...config, version: "v2" },
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

              // 工具开始
              if (event.event === "on_tool_start") {
                const data = JSON.stringify({
                  type: "tool_start",
                  toolCall: {
                    id: event.run_id,
                    name: event.name,
                    args:
                      typeof event.data?.input === "string"
                        ? event.data.input
                        : JSON.stringify(event.data?.input ?? {}),
                    status: "running",
                  },
                  threadId,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              // 工具结束
              if (event.event === "on_tool_end") {
                const data = JSON.stringify({
                  type: "tool_end",
                  toolCall: {
                    id: event.run_id,
                    name: event.name,
                    result:
                      typeof event.data?.output === "string"
                        ? event.data.output
                        : JSON.stringify(event.data?.output ?? ""),
                    status: "done",
                  },
                  threadId,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
      const result = await agent.invoke({ messages: [new HumanMessage(message)] }, config);

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
      { status: 500 },
    );
  }
}
