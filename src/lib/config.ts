/**
 * 环境变量集中管理
 * 所有配置项在此处统一读取和验证
 */

export const config = {
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    dbName: process.env.MONGODB_DB_NAME || "assistant",
  },

  // OpenAI (默认 LLM provider，可换)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
    baseUrl: process.env.OPENAI_BASE_URL, // 可选，用于代理或兼容 API
  },

  // Agent
  agent: {
    systemPrompt:
      process.env.AGENT_SYSTEM_PROMPT ||
      "你是一个智能助手，可以使用工具来帮助用户解决问题。请用中文回复。",
  },

  // MCP Servers (预留)
  mcp: {
    configPath: process.env.MCP_CONFIG_PATH || "./mcp-servers.json",
  },
} as const;
