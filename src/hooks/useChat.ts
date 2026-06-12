"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { BubbleItemType } from "@ant-design/x";
import { useMessage } from "./useMessage";
import * as threadsApi from "@/lib/api/threads";
import * as messagesApi from "@/lib/api/messages";
import * as chatApi from "@/lib/api/chat";
import type { ThreadItem } from "@/lib/api/threads";

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
  // 切换会话
  // ----------------------------------------------------------

  const switchThread = useCallback(async (key: string) => {
    setThreadId(key);
    setMessages([]);
    setAiLoading(true);

    try {
      const history = await messagesApi.loadMessages(key);
      if (history.length) {
        const loaded: BubbleItemType[] = history.map((msg, i) => ({
          key: `${msg.role}-${key}-${i}`,
          role: msg.role,
          content: msg.content,
          status: "success",
        }));
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

        for await (const event of chatApi.sendMessage(text, threadId, controller.signal)) {
          if (event.type === "content") {
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
    [isLoading, threadId, loadThreads],
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
