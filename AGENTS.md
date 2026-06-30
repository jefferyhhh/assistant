<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AI Assistant 项目文档

## 项目概述

基于 Next.js 16 + LangGraph + MongoDB 的 AI 智能助手，支持多 Agent 切换、流式对话、工具调用可视化、多会话管理、明暗主题切换。

## 技术栈

| 层级     | 技术                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------- |
| 前端框架 | Next.js 16 (App Router, Turbopack)                                                                        |
| UI 组件  | Ant Design 6 + @ant-design/x（Bubble/Sender/Conversations/Welcome/ThoughtChain） + @ant-design/x-markdown |
| AI 后端  | LangGraph (ReAct Agent) + LangChain.js                                                                    |
| LLM      | OpenAI API（可配置 baseUrl 兼容其它 provider）                                                            |
| 数据库   | MongoDB（对话状态持久化，通过 MongoDBSaver checkpoint）                                                   |
| 工具协议 | MCP (Model Context Protocol)                                                                              |
| 样式     | Tailwind CSS 4                                                                                            |
| 语言     | TypeScript (strict)                                                                                       |

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── agents/route.ts      # GET  获取可用 Agent 列表
│   │   ├── chat/route.ts        # POST 流式对话（支持 agentId）
│   │   ├── messages/route.ts    # GET  获取会话历史消息
│   │   ├── threads/route.ts     # GET/POST/DELETE 会话管理
│   │   └── threads/title/route.ts # POST 生成会话标题
│   ├── layout.tsx               # 根布局（SSR 主题注入）
│   ├── not-found.tsx            # 404 页面
│   ├── page.tsx                 # 首页（组件编排层）
│   ├── providers.tsx            # Provider 组合（ThemeProvider + XProvider）
│   └── theme-context.tsx        # 主题 Context + useTheme hook
├── components/
│   ├── ChatInput.tsx            # 输入区（Sender + Agent 选择器 + 字数统计）
│   ├── CodeHighlight.tsx        # 代码高亮（react-syntax-highlighter）
│   ├── MessageArea.tsx          # 消息展示（XMarkdown + ToolCallChain）
│   └── Sidebar.tsx              # 侧边栏（会话列表 + 主题切换）
├── hooks/
│   ├── useChat.ts               # 聊天状态管理（组合 api 模块）
│   └── useMessage.ts            # antd message 实例封装
├── lib/
│   ├── agents/                  # 多 Agent 框架
│   │   ├── types.ts             # AgentDefinition 接口
│   │   ├── registry.ts          # Agent 注册表
│   │   ├── base.ts              # Agent 工厂（createAgentFromDefinition）
│   │   ├── general-agent.ts     # 通用助手
│   │   ├── coding-agent.ts      # 编程助手
│   │   └── research-agent.ts    # 研究助手
│   ├── api/
│   │   ├── agents.ts            # Agent 列表 API
│   │   ├── chat.ts              # SSE 流式对话 → AsyncGenerator
│   │   ├── client.ts            # 统一 fetch 封装（含 requestStream）
│   │   ├── messages.ts          # 会话历史消息 + ToolCall/HistoryMessage 类型
│   │   └── threads.ts           # 会话 CRUD + generateThreadTitle
│   ├── agent.ts                 # 兼容层（委托 registry）+ 消息读取/标题生成
│   ├── config.ts                # 环境变量集中管理
│   ├── mongodb.ts               # MongoDB 连接单例
│   └── tools/
│       ├── index.ts             # 工具注册表（本地 + MCP）
│       └── example-tool.ts      # 示例工具（时间、计算器）
└── types/
    └── index.ts                 # 共享类型定义（含 ChatRequest.agentId）
```

## 架构设计

### 数据流

```
用户输入 → useChat.sendMessage()
  → chatApi.sendMessage({ agentId }) — AsyncGenerator<SSEEvent>
    → POST /api/chat { message, threadId, agentId, stream: true }
      → createAgentFromRegistry(agentId) 获取对应 Agent
        → LangGraph ReAct Agent（带工具调用能力）
          → MongoDBSaver 持久化 checkpoint
          → SSE 流式返回 content/tool_start/tool_end/done/error 事件
  → useChat 逐事件更新 messages（工具调用渲染为 ThoughtChain）
  → fire-and-forget: generateThreadTitle() 生成会话标题
```

### 会话切换

```
点击侧边栏会话 → useChat.switchThread(threadId)
  → messagesApi.loadMessages(threadId)
    → GET /api/messages?threadId=xxx
      → MongoDBSaver.getTuple() 读取最新 checkpoint
      → 从 channel_values.messages 提取历史（含工具调用信息）
  → 前端渲染历史消息
```

### 关键设计决策

- **多 Agent 架构**：基于注册表模式，`lib/agents/registry.ts` 管理多个 Agent 定义（general/coding/research），每个 Agent 有独立的 systemPrompt、temperature、toolFilter
- **状态持久化**：LangGraph 的 MongoDBSaver 自动将每次对话的完整状态（含消息历史）存入 `checkpoints` 集合
- **流式响应**：使用 SSE，前端通过 `requestStream()` 逐 chunk 读取，支持 AbortController 取消
- **工具调用可视化**：SSE 事件包含 `tool_start`/`tool_end`，前端渲染为 ThoughtChain 组件
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

## 命令

- Build: `npm run build`
- Type Check: `npx tsc --noEmit`
- Lint/Static Analysis: `npm run check`
- Safe Fixes + Format:`npm run fix`

## 约定

- 路径别名：`@/*` → `./src/*`
- 客户端组件必须加 `"use client"` 指令
- 类型导入使用 `import type` 语法
- 同目录用相对导入 `./`，跨目录用 `@/` 别名
- API 路由统一返回 JSON，错误返回 `{ error: string }` + 对应状态码
- **消息提示必须使用 `useMessage` hook**：不要直接调用 `antd.message`，通过 `const { message } = useMessage()` 获取实例，以正确继承主题上下文和全局配置
- 在完成任何代码编写、修改或重构后，**必须**运行 `npm run check` 进行代码静态分析。
- 如果静态分析报错，必须优先修复所有的 Lint 错误（可以尝试运行 `npm run fix`），确保没有任何警告和错误后，才允许结束任务。

