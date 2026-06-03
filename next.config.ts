import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LangChain / LangGraph 包含一些 Node.js 原生模块，需要标记为外部依赖
  serverExternalPackages: [
    "mongodb",
    "@langchain/langgraph-checkpoint-mongodb",
    "bson",
  ],
};

export default nextConfig;
