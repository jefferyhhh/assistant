/**
 * 共享类型定义
 */

/** 聊天 API 请求体 */
export interface ChatRequest {
  message: string;
  threadId?: string;
  /** Agent ID，可选，默认 "general"。可选值：general / coding / research */
  agentId?: string;
  /** 是否后台执行（客户端断开后任务继续运行） */
  background?: boolean;
}

/** 聊天 API 响应（非流式） */
export interface ChatResponse {
  reply: string;
  threadId: string;
}

/** 线程信息 */
export interface ThreadInfo {
  threadId: string;
  createdAt?: string;
}

/** MCP Server 配置（用于 mcp-servers.json） */
export interface McpServerConfig {
  transport?: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

/** MCP 配置文件结构 */
export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}
