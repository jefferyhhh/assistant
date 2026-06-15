/**
 * LangGraph Agent 工厂
 * 使用 createAgent 创建带工具调用能力的 ReAct Agent
 * 通过 MongoDBSaver 实现对话状态持久化
 */

import { createAgent as createLangchainAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { config } from "./config";
import { ensureMongoConnected } from "./mongodb";
import { getAllTools } from "./tools";
import type { BaseMessage } from "@langchain/core/messages";
import type { ToolCall, HistoryMessage } from "@/lib/api/messages";

let checkpointer: MongoDBSaver | null = null;

/**
 * 获取或创建 MongoDB checkpointer 实例（单例）
 */
async function getCheckpointer(): Promise<MongoDBSaver> {
  if (!checkpointer) {
    const client = await ensureMongoConnected();
    checkpointer = new MongoDBSaver({
      client,
      dbName: config.mongodb.dbName,
      enableTimestamps: true,
    });
  }
  return checkpointer;
}

/**
 * 创建 Agent 实例
 *
 * @param threadId - 对话线程 ID，用于多轮对话持久化
 * @returns 编译好的 LangGraph agent，可调用 .invoke() 或 .stream()
 */
export async function createAgent(threadId?: string) {
  const tools = await getAllTools();

  const llm = new ChatOpenAI({
    model: config.openai.model,
    apiKey: config.openai.apiKey,
    ...(config.openai.baseUrl && { configuration: { baseURL: config.openai.baseUrl } }),
    temperature: 0.7,
  });

  const saver = await getCheckpointer();

  const agent = createLangchainAgent({
    model: llm,
    tools,
    systemPrompt: config.agent.systemPrompt,
    checkpointer: saver,
  });

  return agent;
}

/**
 * 获取 thread_id 对应的 config
 */
export function getThreadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

/**
 * 获取指定会话的历史消息
 * 从 MongoDB checkpoint 中读取最新的 channel_values.messages
 * 同时提取工具调用信息
 */
export async function getThreadMessages(threadId: string): Promise<HistoryMessage[]> {
  const saver = await getCheckpointer();
  const tuple = await saver.getTuple(getThreadConfig(threadId));

  if (!tuple?.checkpoint?.channel_values?.messages) {
    return [];
  }

  const messages = tuple.checkpoint.channel_values.messages as Array<{
    type: string;
    content: string | Array<{ type: string; text: string }>;
    tool_calls?: Array<{ id?: string; name: string; args: Record<string, unknown> | string }>;
    tool_call_id?: string;
    status?: string;
  }>;

  // 先收集所有 tool message 的结果，按 tool_call_id 索引
  const toolResults = new Map<string, { content: string; status: string }>();
  for (const msg of messages) {
    if (msg.type === "tool" && msg.tool_call_id) {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content
                .filter((b) => b.type === "text")
                .map((b) => b.text)
                .join("")
            : String(msg.content);
      toolResults.set(msg.tool_call_id, {
        content: content.slice(0, 2000), // 截断过长结果
        status: msg.status || "success",
      });
    }
  }

  const result: HistoryMessage[] = [];

  for (const msg of messages) {
    const type = msg.type;
    const content =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter((block) => block.type === "text")
              .map((block) => block.text)
              .join("")
          : String(msg.content);

    if (type === "human") {
      result.push({ role: "user", content });
    } else if (type === "ai") {
      const historyMsg: HistoryMessage = { role: "ai", content };

      // 提取 AI 消息中的 tool_calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        historyMsg.toolCalls = msg.tool_calls.map((tc) => {
          const toolResult = tc.id ? toolResults.get(tc.id) : undefined;
          const argsStr =
            typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {});
          return {
            id: tc.id || `${tc.name}-${Math.random().toString(36).slice(2, 8)}`,
            name: tc.name,
            args: argsStr,
            result: toolResult?.content,
            status: toolResult
              ? toolResult.status === "error" ? ("error" as const) : ("done" as const)
              : ("done" as const),
          } satisfies ToolCall;
        });
      }

      // 只有当 AI 消息有文本内容或有工具调用时才加入结果
      if (content || historyMsg.toolCalls) {
        result.push(historyMsg);
      }
    }
    // tool 和 system 类型跳过（已合并到 ai 消息的 toolCalls 中）
  }

  return result;
}

/**
 * 从 checkpoint 中提取第一条用户消息
 */
async function getFirstUserMessage(threadId: string): Promise<string | null> {
  const saver = await getCheckpointer();
  const tuple = await saver.getTuple(getThreadConfig(threadId));

  if (!tuple?.checkpoint?.channel_values?.messages) return null;

  const messages = tuple.checkpoint.channel_values.messages as BaseMessage[];

  for (const msg of messages) {
    if (msg.type === "human") {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content
                .filter((b: any) => b.type === "text")
                .map((b: any) => b.text)
                .join("")
            : String(msg.content);
      return content || null;
    }
  }
  return null;
}

/**
 * 调用 LLM 为会话生成简短标题
 */
export async function generateThreadTitle(threadId: string): Promise<string | null> {
  const firstMsg = await getFirstUserMessage(threadId);
  if (!firstMsg) return null;

  const llm = new ChatOpenAI({
    model: config.openai.model,
    apiKey: config.openai.apiKey,
    ...(config.openai.baseUrl && { configuration: { baseURL: config.openai.baseUrl } }),
    temperature: 0.3,
  });

  const res = await llm.invoke(
    `为以下对话生成一个 10 字以内的中文标题，只返回标题文本，不要引号或标点。\n用户：${firstMsg.slice(0, 200)}`
  );

  const title =
    typeof res.content === "string"
      ? res.content.trim()
      : String(res.content).trim();

  return title.slice(0, 30) || null;
}
