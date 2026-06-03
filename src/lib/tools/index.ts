/**
 * 工具注册表
 * 统一管理所有可用工具（本地工具 + MCP 工具）
 *
 * MCP 接入指南：
 * 1. 在 .env.local 中配置 MCP 服务器地址
 * 2. 或创建 mcp-servers.json 配置文件
 * 3. 取消下方 getMcpTools() 注释即可自动加载 MCP 工具
 */

import type { StructuredTool } from "@langchain/core/tools";
import { getCurrentTimeTool, calculatorTool } from "./example-tool";

// ============================================================
// 本地工具 — 在此处注册你自定义的工具
// ============================================================
const localTools: StructuredTool[] = [getCurrentTimeTool, calculatorTool];

// ============================================================
// MCP 工具接入点（预留）
// 取消注释以下代码即可启用 MCP 工具
// ============================================================
//
// import { MultiServerMCPClient } from "@langchain/mcp-adapters";
// import { config } from "@/lib/config";
// import { readFileSync } from "fs";
//
// let mcpClient: MultiServerMCPClient | null = null;
//
// async function getMcpTools(): Promise<Tool[]> {
//   try {
//     // 从配置文件或环境变量读取 MCP 服务器配置
//     let mcpServers: Record<string, any> = {};
//
//     try {
//       const raw = readFileSync(config.mcp.configPath, "utf-8");
//       mcpServers = JSON.parse(raw).mcpServers || {};
//     } catch {
//       // 配置文件不存在，跳过
//     }
//
//     if (Object.keys(mcpServers).length === 0) return [];
//
//     mcpClient = new MultiServerMCPClient({
//       mcpServers,
//       throwOnLoadError: false,
//       prefixToolNameWithServerName: true,
//       useStandardContentBlocks: true,
//     });
//
//     return await mcpClient.getTools();
//   } catch (error) {
//     console.error("Failed to load MCP tools:", error);
//     return [];
//   }
// }

// ============================================================
// 统一导出
// ============================================================

/**
 * 获取所有可用工具
 * 合并本地工具和 MCP 工具
 */
export async function getAllTools(): Promise<StructuredTool[]> {
  const tools = [...localTools];

  // MCP 工具加载（启用时取消注释）
  // const mcpTools = await getMcpTools();
  // tools.push(...mcpTools);

  return tools;
}

/**
 * 关闭 MCP 连接（应用退出时调用）
 */
export async function closeMcpConnections(): Promise<void> {
  // if (mcpClient) {
  //   await mcpClient.close();
  //   mcpClient = null;
  // }
}
