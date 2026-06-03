/**
 * 共享类型定义
 */

/** 聊天 API 请求体 */
export interface ChatRequest {
  message: string;
  threadId?: string;
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
  transport: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

/** MCP 配置文件结构 */
export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}
