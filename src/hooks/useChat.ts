"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { BubbleItemType } from "@ant-design/x";
import { message as antdMessage } from "antd";

// ============================================================
// 数据类型
// ============================================================

export interface ThreadItem {
  key: string;
  label: string;
  title?: string;
}

// ============================================================
// 聊天核心逻辑 Hook
// ============================================================

export function useChat() {
  const [messages, setMessages] = useState<BubbleItemType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bubbleListRef = useRef<any>(null);

  // ----------------------------------------------------------
  // 会话列表
  // ----------------------------------------------------------

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch("/api/threads");
      const data = await res.json();
      const items: ThreadItem[] = (data.threads || []).map(
        (t: { threadId: string; title?: string | null }) => ({
          key: t.threadId,
          label: t.title || `会话 ${t.threadId.slice(0, 8)}...`,
          title: t.title ?? undefined,
        })
      );
      setThreads(items);
    } catch {
      // 忽略
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // ----------------------------------------------------------
  // 切换会话
  // ----------------------------------------------------------

  const switchThread = useCallback(async (key: string) => {
    setThreadId(key);
    setMessages([]);
    setAiLoading(true);

    try {
      const res = await fetch(`/api/messages?threadId=${key}`);
      const data = await res.json();

      if (data.messages?.length) {
        const loaded: BubbleItemType[] = data.messages.map(
          (msg: { role: string; content: string }, i: number) => ({
            key: `${msg.role}-${key}-${i}`,
            role: msg.role,
            content: msg.content,
            status: "success",
          })
        );
        setMessages(loaded);
      }
    } catch {
      // 忽略加载错误
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
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, threadId, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (!reader) throw new Error("无法读取响应流");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "content") {
                assistantContent += data.content;
                setAiLoading(false);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: assistantContent,
                    status: "success",
                  };
                  return updated;
                });
              }

              if (data.type === "done" && data.threadId) {
                newThreadId = data.threadId;
                setThreadId(data.threadId);
                loadThreads();
              }

              if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // 忽略解析错误
            }
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
          fetch("/api/threads/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: newThreadId }),
          })
            .then(() => loadThreads())
            .catch(() => {});
        }
      }
    },
    [isLoading, threadId, loadThreads]
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
        await fetch(`/api/threads?id=${key}`, { method: "DELETE" });
        if (key === threadId) {
          setThreadId(null);
          setMessages([]);
        }
        loadThreads();
      } catch {
        antdMessage.error("删除会话失败");
      }
    },
    [threadId, loadThreads]
  );

  return {
    messages,
    input,
    isLoading,
    threadId,
    threads,
    threadsLoading,
    aiLoading,
    bubbleListRef,
    setInput,
    loadThreads,
    switchThread,
    createNewChat,
    sendMessage,
    cancelGeneration,
    deleteThread,
  };
}
