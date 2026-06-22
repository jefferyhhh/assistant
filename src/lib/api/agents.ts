/**
 * Agent 列表 API 客户端
 */

export interface AgentItem {
  id: string;
  name: string;
  description: string;
}

/** 获取所有可用的 Agent 列表 */
export async function loadAgents(): Promise<AgentItem[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) {
    throw new Error("获取 Agent 列表失败");
  }
  return res.json();
}
