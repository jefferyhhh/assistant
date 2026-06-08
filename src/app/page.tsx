"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bubble, type BubbleItemType } from "@ant-design/x";
import { Sender } from "@ant-design/x";
import { Conversations } from "@ant-design/x";
import { Welcome } from "@ant-design/x";
import { Button, Spin, message as antdMessage } from "antd";
import { XMarkdown } from "@ant-design/x-markdown";
import {
  PlusOutlined,
  DeleteOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { useTheme } from "./theme-context";

// ============================================================
// 数据类型
// ============================================================

interface ThreadItem {
  key: string;
  label: string;
}

// ============================================================
// 页面组件
// ============================================================

export default function ChatPage() {
  const [messages, setMessages] = useState<BubbleItemType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bubbleListRef = useRef<any>(null);
  const { theme, toggleTheme } = useTheme();
  //ai回答loading
  const [aiLoading, setAiLoading] = useState(false);

  // ----------------------------------------------------------
  // 会话列表
  // ----------------------------------------------------------

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch("/api/threads");
      const data = await res.json();
      const items: ThreadItem[] = (data.threads || []).map(
        (t: { threadId: string }) => ({
          key: t.threadId,
          label: `会话 ${t.threadId.slice(0, 8)}...`,
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

  const switchThread = useCallback((key: string) => {
    setThreadId(key);
    setMessages([]);
    // TODO: 后续可通过 API 加载历史消息
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

  // ----------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* 侧边栏 */}
      <div className="flex w-[260px] flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <span className="text-sm font-semibold text-muted">
            会话列表
          </span>
          <div className="flex gap-1">
            <Button
              type="text"
              size="small"
              icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
            />
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={createNewChat}
            >
              新对话
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-1">
          <Spin spinning={threadsLoading}>
            <Conversations
              items={threads}
              activeKey={threadId ?? undefined}
              onActiveChange={switchThread}
              menu={(item) => ({
                items: [
                  {
                    key: "delete",
                    label: "删除",
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => deleteThread(item.key),
                  },
                ],
              })}
              creation={{ onClick: createNewChat }}
            />
          </Spin>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* 消息区 */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Welcome
                icon="🤖"
                title="AI Assistant"
                description="Next.js + LangGraph + MongoDB 智能助手，输入消息开始对话"
                variant="borderless"
              />
            </div>
          ) : (
            <Bubble.List
              ref={bubbleListRef}
              items={messages}
              autoScroll
              className="mx-auto max-w-[800px]"
              role={{
                user: {
                  placement: "end",
                  variant: "filled",
                  styles:{
                    content: { background: 'color-mix(in srgb, #3b82f6 12%, transparent)' },
                  },
                },
                ai: {
                  placement: "start",
                  loading:aiLoading,
                  variant: "filled",
                  typing: { effect: "typing", step: 3, interval: 50 },
                  contentRender: (content) => <XMarkdown>{content}</XMarkdown>,
                },
              }}
            />
          )}
        </div>

        {/* 输入区 */}
        <div className="mx-auto w-full max-w-[800px] px-6 pt-3 pb-4">
          <Sender
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            onCancel={cancelGeneration}
            loading={isLoading}
            placeholder="输入消息..."
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
