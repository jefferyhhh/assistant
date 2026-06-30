/**
 * Agent 注册表
 * 管理所有可用的 Agent 定义，提供注册、查询和创建功能
 */

import { createAgentFromDefinition } from "./base";
import { codingAgent } from "./coding-agent";
import { generalAgent } from "./general-agent";
import { researchAgent } from "./research-agent";
import type { AgentDefinition } from "./types";

/** 内置 Agent 注册表 */
const agents = new Map<string, AgentDefinition>();

/** 注册一个 Agent 定义 */
export function registerAgent(definition: AgentDefinition): void {
  agents.set(definition.id, definition);
}

/** 获取指定 ID 的 Agent 定义 */
export function getAgentDefinition(id: string): AgentDefinition {
  const def = agents.get(id);
  if (!def) {
    throw new Error(`Agent "${id}" 不存在。可用的 Agent: ${[...agents.keys()].join(", ")}`);
  }
  return def;
}

/** 列出所有已注册的 Agent（用于前端展示） */
export function listAgents(): Array<Pick<AgentDefinition, "id" | "name" | "description">> {
  return [...agents.values()].map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

/**
 * 根据 Agent ID 创建 Agent 实例
 *
 * @param agentId - Agent 标识，默认 "general"
 * @param threadId - 对话线程 ID
 * @returns 编译好的 LangGraph agent
 */
export async function createAgentFromRegistry(agentId: string = "general", threadId?: string) {
  const definition = getAgentDefinition(agentId);
  return createAgentFromDefinition(definition, threadId);
}

// ============================================================
// 注册内置 Agent
// ============================================================
registerAgent(generalAgent);
registerAgent(codingAgent);
registerAgent(researchAgent);
