/**
 * Agent 列表 API
 * GET /api/agents
 *
 * 返回所有已注册的 Agent 定义（id、name、description）
 */

import { listAgents } from "@/lib/agents";

export async function GET() {
  const agents = listAgents();
  return Response.json(agents);
}
