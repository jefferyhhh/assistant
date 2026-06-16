/**
 * 通用 Agent 创建逻辑
 * 从 AgentDefinition 配置创建 LangGraph ReAct Agent
 */

import { createAgent as createLangchainAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { config } from "@/lib/config";
import { ensureMongoConnected } from "@/lib/mongodb";
import { getAllTools } from "@/lib/tools";
import type { AgentDefinition } from "./types";

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
 * 根据 AgentDefinition 创建 Agent 实例
 *
 * @param definition - Agent 配置定义
 * @param threadId - 对话线程 ID，用于多轮对话持久化
 * @returns 编译好的 LangGraph agent
 */
export async function createAgentFromDefinition(
  definition: AgentDefinition,
  threadId?: string
) {
  const allTools = await getAllTools();
  const tools = definition.toolFilter ? definition.toolFilter(allTools) : allTools;

  const llm = new ChatOpenAI({
    model: definition.model || config.openai.model,
    apiKey: config.openai.apiKey,
    ...(config.openai.baseUrl && { configuration: { baseURL: config.openai.baseUrl } }),
    temperature: definition.temperature ?? 0.7,
  });

  const saver = await getCheckpointer();

  const agent = createLangchainAgent({
    model: llm,
    tools,
    systemPrompt: definition.systemPrompt,
    checkpointer: saver,
  });

  return agent;
}

/**
 * 获取 checkpointer 实例（供外部使用，如读取历史消息）
 */
export { getCheckpointer };
