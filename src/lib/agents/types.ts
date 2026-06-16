/**
 * Agent 配置类型定义
 * 每个 Agent 通过 AgentDefinition 描述其能力、提示词和工具集
 */

import type { StructuredTool } from "@langchain/core/tools";

/** Agent 定义 */
export interface AgentDefinition {
  /** 唯一标识，如 "general", "coding", "research" */
  id: string;
  /** 显示名称 */
  name: string;
  /** 简要描述 */
  description: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 可选的模型覆盖（默认使用环境变量 OPENAI_MODEL） */
  model?: string;
  /** 可选的温度覆盖 */
  temperature?: number;
  /** 工具过滤器，从全部工具中筛选该 Agent 需要的工具 */
  toolFilter?: (allTools: StructuredTool[]) => StructuredTool[];
}
