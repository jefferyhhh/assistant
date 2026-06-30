/**
 * 多 Agent 框架统一导出
 *
 * 使用方式：
 *   import { createAgentFromRegistry, listAgents } from "@/lib/agents"
 *
 * 添加新 Agent：
 *   1. 在 agents/ 目录下创建新的 Agent 定义文件
 *   2. 在 registry.ts 中 import 并 registerAgent()
 */

export { codingAgent } from "./coding-agent";
// Agent 定义（供外部直接引用）
export { generalAgent } from "./general-agent";
// 注册表 API
export {
  createAgentFromRegistry,
  getAgentDefinition,
  listAgents,
  registerAgent,
} from "./registry";
export { researchAgent } from "./research-agent";
// 类型
export type { AgentDefinition } from "./types";
