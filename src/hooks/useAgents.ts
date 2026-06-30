"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentItem } from "@/lib/api/agents";
import * as agentsApi from "@/lib/api/agents";

export function useAgents() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentId, setAgentId] = useState<string>("general");

  const loadAgents = useCallback(async () => {
    try {
      const items = await agentsApi.loadAgents();
      setAgents(items);
    } catch {
      // 静默失败，不影响主流程
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return { agents, agentId, setAgentId };
}
