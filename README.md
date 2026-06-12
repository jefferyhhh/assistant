# AI Assistant

基于 **Next.js + LangGraph.js + LangChain.js + MongoDB** 的智能对话助手，内置 MCP 工具接入支持。

## 技术栈

| 组件       | 技术                             | 用途                          |
| ---------- | -------------------------------- | ----------------------------- |
| 前端 + API | Next.js 16 (App Router)          | 聊天 UI + REST API            |
| Agent 编排 | LangGraph.js                     | ReAct agent，支持工具调用循环 |
| LLM 调用   | LangChain.js + OpenAI            | 模型抽象层                    |
| 状态持久化 | MongoDB + LangGraph Checkpointer | 对话历史 + 线程管理           |
| 工具协议   | MCP (Model Context Protocol)     | 动态工具发现与调用            |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 OpenAI API Key 和 MongoDB 连接地址
```

### 3. 启动 MongoDB

```bash
# 使用 Docker
docker run -d --name mongodb -p 27017:27017 mongo:7

# 或使用已有的 MongoDB 实例
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 开始对话。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # POST 流式/非流式对话
│   │   ├── messages/route.ts    # GET  获取会话历史消息
│   │   └── threads/route.ts     # GET/POST/DELETE 会话管理
│   ├── layout.tsx               # 根布局（SSR 主题注入）
│   ├── page.tsx                 # 首页（组件编排层）
│   ├── providers.tsx            # Provider 组合（ThemeProvider + XProvider）
│   ├── theme-context.tsx        # 主题 Context + useTheme hook
│   └── globals.css              # 全局样式 + CSS 变量
├── components/
│   ├── Sidebar.tsx              # 侧边栏（会话列表 + 主题切换）
│   ├── MessageArea.tsx          # 消息展示（Bubble.List / Welcome）
│   └── ChatInput.tsx            # 输入区（Sender）
├── hooks/
│   └── useChat.ts               # 聊天状态管理（组合 api 模块）
├── lib/
│   ├── api/
│   │   ├── client.ts            # 统一 fetch 封装 + ApiError
│   │   ├── chat.ts              # SSE 流式对话 → AsyncGenerator
│   │   ├── messages.ts          # 会话历史消息
│   │   └── threads.ts           # 会话 CRUD
│   ├── agent.ts                 # LangGraph Agent 工厂 + 消息读取
│   ├── config.ts                # 环境变量集中管理
│   ├── mongodb.ts               # MongoDB 连接单例
│   └── tools/
│       ├── index.ts             # 工具注册表（本地 + MCP）
│       └── example-tool.ts      # 示例工具（时间、计算器）
└── types/
    └── index.ts                 # 共享类型定义
```

## 添加自定义工具

### 方式一：本地工具

1. 在 `src/lib/tools/` 下创建新文件：

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const myTool = tool(
  async ({ input }) => {
    // 你的工具逻辑
    return "结果";
  },
  {
    name: "my_tool",
    description: "工具描述",
    schema: z.object({ input: z.string() }),
  }
);
```

2. 在 `src/lib/tools/index.ts` 中注册：

```typescript
import { myTool } from "./my-tool";
const localTools: Tool[] = [getCurrentTimeTool, calculatorTool, myTool];
```

### 方式二：MCP 工具（推荐用于外部工具集成）

1. 创建 `mcp-servers.json`（参考 `mcp-servers.json.example`）：

```json
{
  "mcpServers": {
    "math": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-math"]
    }
  }
}
```

2. 在 `src/lib/tools/index.ts` 中取消 MCP 注释代码的注释。
3. Agent 将自动发现并使用所有 MCP 工具。

## API 接口

### `POST /api/chat`

流式对话接口。

```json
// 请求
{ "message": "你好", "threadId": "可选-线程ID", "stream": true }

// 流式响应 (SSE)
data: {"type":"content","content":"你","threadId":"..."}
data: {"type":"content","content":"好","threadId":"..."}
data: {"type":"done","threadId":"..."}
```

### `GET /api/threads`

列出所有对话线程。

### `DELETE /api/threads?id=xxx`

删除指定线程及其对话历史。

## 扩展方向

- **多 Agent 协作**：在 `agent.ts` 中使用 LangGraph 的 `StateGraph` 构建多节点图
- **Human-in-the-loop**：利用 `interruptBefore` / `interruptAfter` 实现人工审核
- **自定义状态**：扩展 `stateSchema` 添加业务字段（如用户画像、上下文元数据）
- **认证**：在 Next.js middleware 中添加用户认证
- **向量检索**：集成 MongoDB Atlas Vector Search 做 RAG

## License

MIT
