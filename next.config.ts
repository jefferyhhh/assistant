import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // antd / @ant-design/x 需要转译 ESM 包
  transpilePackages: ["antd", "@ant-design/x", "@ant-design/cssinjs"],
  // LangChain / LangGraph 包含一些 Node.js 原生模块，需要标记为外部依赖
  serverExternalPackages: ["mongodb", "@langchain/langgraph-checkpoint-mongodb", "bson"],
};

export default nextConfig;
