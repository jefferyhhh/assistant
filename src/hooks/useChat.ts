"use client";

import type { BubbleItemType } from "@ant-design/x";
import { useCallback, useEffect, useRef, useState } from "react";
import * as chatApi from "@/lib/api/chat";
import type { ToolCall } from "@/lib/api/messages";
import * as messagesApi from "@/lib/api/messages";
import * as tasksApi from "@/lib/api/tasks";
import * as threadsApi from "@/lib/api/threads";
import { useAgents } from "./useAgents";
import { useMessage } from "./useMessage";
import { useThreads } from "./useThreads";

export function useChat() {
  const message = useMessage();
  const { agents, agentId, setAgentId } = useAgents();
  const { threads, threadsLoading, loadThreads, deleteThread: deleteThreadBase } = useThreads();

  const [messages, setMessages] = useState<BubbleItemType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bubbleListRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // 切换会话
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // 加载会话消息（内部辅助，switchThread 和轮询完成后复用）
  // ----------------------------------------------------------

  const loadMessagesForThread = useCallback(async (key: string) => {
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
  }, []);

  // ----------------------------------------------------------
  // 轮询后台任务状态
  // ----------------------------------------------------------

  const pollTaskStatus = useCallback(
    (taskId: string, targetThreadId: string) => {
      const poll = async () => {
        try {
          const task = await tasksApi.getTask(taskId);

          if (task.status === "completed") {
            // 任务完成，重新加载消息（checkpoint 已更新）
            await loadMessagesForThread(targetThreadId);
            setIsLoading(false);
            setAiLoading(false);

            // 检查是否需要生成标题
            threadsApi
              .generateThreadTitle(targetThreadId)
              .then(() => loadThreads())
              .catch(() => loadThreads());
            return;
          }

          if (task.status === "failed") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: `❌ 后台任务失败: ${task.error || "未知错误"}`,
                status: "error",
              };
              return updated;
            });
            setIsLoading(false);
            setAiLoading(false);
            return;
          }

          if (task.status === "cancelled") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: "⚠️ 任务已取消",
                status: "error",
              };
              return updated;
            });
            setIsLoading(false);
            setAiLoading(false);
            return;
          }

          // 还在执行中，2 秒后继续轮询
          pollTimerRef.current = setTimeout(poll, 2000);
        } catch {
          // 轮询出错，停止轮询并提示
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: "❌ 查询任务状态失败",
              status: "error",
            };
            return updated;
          });
          setIsLoading(false);
          setAiLoading(false);
        }
      };

      poll();
    },
    [loadMessagesForThread, loadThreads],
  );

  // ----------------------------------------------------------
  // 切换会话
  // ----------------------------------------------------------

  // biome-ignore lint/correctness/useExhaustiveDependencies: message 方法在组件生命周期内稳
  const switchThread = useCallback(
    async (key: string) => {
      // 清理之前的轮询
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      setThreadId(key);
      setMessages([]);
      setAiLoading(true);

      try {
        await loadMessagesForThread(key);

        // 检查是否有未完成的后台任务
        const runningTasks = await tasksApi.getTasksByThread(key, "running");
        const pendingTasks = await tasksApi.getTasksByThread(key, "pending");
        const activeTask = runningTasks[0] || pendingTasks[0];

        if (activeTask) {
          // 有未完成任务，显示 loading 并开始轮询
          setIsLoading(true);
          setAiLoading(true);
          setMessages((prev) => [
            ...prev,
            {
              key: `ai-poll-${Date.now()}`,
              role: "ai",
              content: "",
              status: "loading",
            },
          ]);
          pollTaskStatus(activeTask.taskId, key);
        }
      } catch {
        message.error("加载会话历史失败");
      } finally {
        setAiLoading(false);
      }
    },
    [loadMessagesForThread, pollTaskStatus],
  );

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: message 方法在组件生命周期内稳
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
            const idx = pendingToolCalls.findIndex((tc) => tc.id === event.toolCall!.id);
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

        // 流中断时，检查是否有后台任务在运行（服务端可能继续执行）
        const currentThreadId = threadId || newThreadId;
        if (currentThreadId) {
          try {
            const runningTasks = await tasksApi.getTasksByThread(currentThreadId, "running");
            const pendingTasks = await tasksApi.getTasksByThread(currentThreadId, "pending");
            const activeTask = runningTasks[0] || pendingTasks[0];

            if (activeTask) {
              // 有后台任务在跑，切换到轮询模式
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: "",
                  status: "loading",
                };
                return updated;
              });
              pollTaskStatus(activeTask.taskId, currentThreadId);
              return; // 不显示错误，交给轮询处理
            }
          } catch {
            // 查询任务失败，走正常错误流程
          }
        }

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
    [isLoading, threadId, loadThreads, agentId, pollTaskStatus],
  );

  // ----------------------------------------------------------
  // 取消生成
  // ----------------------------------------------------------

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsLoading(false);
    setAiLoading(false);
  }, []);

  // ----------------------------------------------------------
  // 删除会话
  // ----------------------------------------------------------

  const deleteThread = useCallback(
    async (key: string) => {
      await deleteThreadBase(key, threadId, () => {
        setThreadId(null);
        setMessages([]);
      });
    },
    [threadId, deleteThreadBase],
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
