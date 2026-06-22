"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { BubbleItemType } from "@ant-design/x";
import { useMessage } from "./useMessage";
import * as threadsApi from "@/lib/api/threads";
import * as messagesApi from "@/lib/api/messages";
import * as chatApi from "@/lib/api/chat";
import * as agentsApi from "@/lib/api/agents";
import type { AgentItem } from "@/lib/api/agents";
import type { ThreadItem } from "@/lib/api/threads";
import type { ToolCall } from "@/lib/api/messages";

// Re-export 给外部使用（如 Sidebar）
export type { ThreadItem };

export function useChat() {
  const message = useMessage();
  const [messages, setMessages] = useState<BubbleItemType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [agentId, setAgentId] = useState<string>("general");
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const bubbleListRef = useRef<any>(null);

  // ----------------------------------------------------------
  // 会话列表
  // ----------------------------------------------------------

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const items = await threadsApi.loadThreads();
      setThreads(items);
    } catch {
      message.error("加载会话列表失败");
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // ----------------------------------------------------------
  // Agent 列表
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // 切换会话
  // ----------------------------------------------------------

  const switchThread = useCallback(async (key: string) => {
    setThreadId(key);
    setMessages([]);
    setAiLoading(true);

    try {
      const history = await messagesApi.loadMessages(key);
      if (history.length) {
        const loaded: BubbleItemType[] = [];
        for (let i = 0; i < history.length; i++) {
          const msg = history[i];

          // 如果 AI 消息有工具调用，先插入一个工具调用 bubble
          if (msg.role === "ai" && msg.toolCalls && msg.toolCalls.length > 0) {
            loaded.push({
              key: `tools-${key}-${i}`,
              role: "ai",
              content: "",
              status: "success",
              extraInfo: { toolCalls: msg.toolCalls },
            });
          }

          // 跳过空内容或仅包含空白字符的 AI 消息（仅有工具调用时，AI 的中间消息无文本）
          if (msg.role === "ai" && !msg.content?.trim()) {
            continue;
          }

          loaded.push({
            key: `${msg.role}-${key}-${i}`,
            role: msg.role,
            content: msg.content,
            status: "success",
          });
        }
        setMessages(loaded);
      }
    } catch {
      message.error("加载会话历史失败");
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ----------------------------------------------------------
  // 新对话
  // ----------------------------------------------------------

  const createNewChat = useCallback(async () => {
    setMessages([]);
    setThreadId(null);
    setInput("");
  }, []);

  // ----------------------------------------------------------
  // 发送消息
  // ----------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: BubbleItemType = {
        key: `user-${Date.now()}`,
        role: "user",
        content: text,
      };
      const assistantMsg: BubbleItemType = {
        key: `ai-${Date.now()}`,
        role: "ai",
        content: "",
        status: "loading",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsLoading(true);
      setAiLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const isNewThread = !threadId;
      let newThreadId: string | null = null;

      try {
        let assistantContent = "";
        const pendingToolCalls: ToolCall[] = [];
        const toolBubbleKey = `tools-${Date.now()}`;

        for await (const event of chatApi.sendMessage(text, threadId, controller.signal, agentId)) {
          if (event.type === "content") {
            // 第一次收到文本内容时，如果有工具调用则先确保工具 bubble 存在
            if (assistantContent === "" && pendingToolCalls.length > 0) {
              // 工具 bubble 已在 tool_start 时插入，此处无需操作
            }
            assistantContent += event.content!;
            setAiLoading(false);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: assistantContent,
                status: "success",
              };
              return updated;
            });
          }

          if (event.type === "tool_start" && event.toolCall) {
            pendingToolCalls.push(event.toolCall);

            setMessages((prev) => {
              // 检查是否已存在工具 bubble
              const existingIdx = prev.findIndex((m) => m.key === toolBubbleKey);
              if (existingIdx >= 0) {
                // 更新已有的工具 bubble
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  extraInfo: { toolCalls: [...pendingToolCalls] },
                };
                return updated;
              }
              // 首次工具调用，在最后一个 AI 消息之前插入
              const updated = [...prev];
              updated.splice(updated.length - 1, 0, {
                key: toolBubbleKey,
                role: "ai",
                content: "",
                extraInfo: { toolCalls: [...pendingToolCalls] },
              });
              return updated;
            });
          }

          if (event.type === "tool_end" && event.toolCall) {
            // 更新 pendingToolCalls 中对应项
            const idx = pendingToolCalls.findIndex(
              (tc) => tc.id === event.toolCall!.id,
            );
            if (idx >= 0) {
              pendingToolCalls[idx] = event.toolCall;
            }

            setMessages((prev) => {
              const existingIdx = prev.findIndex((m) => m.key === toolBubbleKey);
              if (existingIdx < 0) return prev;
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                extraInfo: { toolCalls: [...pendingToolCalls] },
              };
              return updated;
            });
          }

          if (event.type === "done" && event.threadId) {
            newThreadId = event.threadId;
            setThreadId(event.threadId);
            loadThreads();
          }

          if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `❌ 错误: ${error instanceof Error ? error.message : "请求失败"}`,
            status: "error",
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        setAiLoading(false);
        abortRef.current = null;

        // 新会话生成标题（非阻塞）
        if (isNewThread && newThreadId) {
          threadsApi
            .generateThreadTitle(newThreadId)
            .then(() => loadThreads())
            .catch(() => message.warning("会话标题生成失败"));
        }
      }
    },
    [isLoading, threadId, loadThreads, agentId],
  );

  // ----------------------------------------------------------
  // 取消生成
  // ----------------------------------------------------------

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  // ----------------------------------------------------------
  // 删除会话
  // ----------------------------------------------------------

  const deleteThread = useCallback(
    async (key: string) => {
      try {
        await threadsApi.deleteThread(key);
        if (key === threadId) {
          setThreadId(null);
          setMessages([]);
        }
        loadThreads();
      } catch {
        message.error("删除会话失败");
      }
    },
    [threadId, loadThreads],
  );

  return {
    messages,
    input,
    isLoading,
    threadId,
    threads,
    threadsLoading,
    aiLoading,
    agentId,
    agents,
    bubbleListRef,
    setInput,
    setAgentId,
    loadThreads,
    switchThread,
    createNewChat,
    sendMessage,
    cancelGeneration,
    deleteThread,
  };
}
