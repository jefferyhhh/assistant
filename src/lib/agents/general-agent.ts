/**
 * 通用对话 Agent
 * 擅长日常对话、问答、文本处理等通用任务
 */

import type { AgentDefinition } from "./types";

export const generalAgent: AgentDefinition = {
  id: "general",
  name: "通用助手",
  description: "擅长日常对话、问答、文本处理等通用任务",
  systemPrompt:
    "你是一个智能助手，可以使用工具来帮助用户解决问题。" +
    "请用中文回复，回答要简洁、准确、有帮助。" +
    "如果不确定答案，请坦诚告知用户。",
  temperature: 0.7,
  // 不设置 toolFilter，使用全部工具
};
