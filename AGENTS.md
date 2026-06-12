<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Assistant 项目文档

## 项目概述

基于 Next.js 16 + LangGraph + MongoDB 的 AI 智能助手，支持流式对话、多会话管理、工具调用（含 MCP 协议）、明暗主题切换。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router, Turbopack) |
| UI 组件 | Ant Design 6 + @ant-design/x（Bubble/Sender/Conversations/Welcome） |
| AI 后端 | LangGraph (ReAct Agent) + LangChain.js |
| LLM | OpenAI API（可配置 baseUrl 兼容其它 provider） |
| 数据库 | MongoDB（对话状态持久化，通过 MongoDBSaver checkpoint） |
| 工具协议 | MCP (Model Context Protocol) |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript (strict) |

## 目录结构

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

## 架构设计

### 数据流

```
用户输入 → useChat.sendMessage()
  → chatApi.sendMessage() — AsyncGenerator<SSEEvent>
    → POST /api/chat { message, threadId, stream: true }
      → LangGraph ReAct Agent（带工具调用能力）
        → MongoDBSaver 持久化 checkpoint
        → SSE 流式返回 content/done/error 事件
    → SSE 协议解析封装在 api/chat.ts 内
  → useChat 逐事件更新 messages 状态
```

### 会话切换

```
点击侧边栏会话 → useChat.switchThread(threadId)
  → messagesApi.loadMessages(threadId)
    → GET /api/messages?threadId=xxx
      → MongoDBSaver.getTuple() 读取最新 checkpoint
      → 从 channel_values.messages 提取历史
  → 前端渲染历史消息
```

### 关键设计决策

- **状态持久化**：LangGraph 的 MongoDBSaver 自动将每次对话的完整状态（含消息历史）存入 `checkpoints` 集合，无需单独的消息表
- **流式响应**：使用 SSE (Server-Sent Events)，前端通过 ReadableStream 逐 chunk 读取
- **主题系统**：SSR 时从 cookie 读取初始主题，客户端通过 Context 同步 localStorage + cookie + HTML class
- **工具系统**：本地工具在 `tools/` 目录注册，MCP 工具通过 `mcp-servers.json` 配置自动加载

## 环境变量

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=assistant
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=              # 可选，代理/兼容 API
AGENT_SYSTEM_PROMPT=...       # 可选，自定义系统提示
MCP_CONFIG_PATH=./mcp-servers.json
```

## 约定

- 路径别名：`@/*` → `./src/*`
- 客户端组件必须加 `"use client"` 指令
- 类型导入使用 `import type` 语法
- 同目录用相对导入 `./`，跨目录用 `@/` 别名
- API 路由统一返回 JSON，错误返回 `{ error: string }` + 对应状态码
