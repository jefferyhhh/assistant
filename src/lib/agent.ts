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
 */
export async function getThreadMessages(threadId: string) {
  const saver = await getCheckpointer();
  const tuple = await saver.getTuple(getThreadConfig(threadId));

  if (!tuple?.checkpoint?.channel_values?.messages) {
    return [];
  }

  const messages = tuple.checkpoint.channel_values.messages as Array<{
    type: string;
    content: string | Array<{ type: string; text: string }>;
  }>;

  return messages.map((msg) => {
    const type = msg.type;
    // content 可能是 string 或 content block 数组
    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");

    // human -> user, ai -> ai, 其它跳过
    const role = type === "human" ? "user" : type === "ai" ? "ai" : null;
    return role ? { role, content } : null;
  }).filter(Boolean);
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
