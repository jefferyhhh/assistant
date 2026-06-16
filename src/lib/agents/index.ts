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

// 注册表 API
export {
  registerAgent,
  getAgentDefinition,
  listAgents,
  createAgentFromRegistry,
} from "./registry";

// 类型
export type { AgentDefinition } from "./types";

// Agent 定义（供外部直接引用）
export { generalAgent } from "./general-agent";
export { codingAgent } from "./coding-agent";
export { researchAgent } from "./research-agent";
