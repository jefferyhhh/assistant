"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bubble, type BubbleItemType } from "@ant-design/x";
import { Sender } from "@ant-design/x";
import { Conversations } from "@ant-design/x";
import { Welcome } from "@ant-design/x";
import { Button, Spin, message as antdMessage } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* 侧边栏 */}
      <div
        style={{
          width: 260,
          borderRight: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            padding: "16px 12px 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.65 }}>
            会话列表
          </span>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={createNewChat}
          >
            新对话
          </Button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "0 4px" }}>
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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 消息区 */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
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
              style={{ maxWidth: 800, margin: "0 auto" }}
              role={{
                user: {
                  placement: "end",
                  variant: "shadow",
                },
                ai: {
                  placement: "start",
                  variant: "borderless",
                  typing: { effect: "typing", step: 3, interval: 50 },
                },
              }}
            />
          )}
        </div>

        {/* 输入区 */}
        <div
          style={{
            padding: "12px 24px 16px",
            maxWidth: 800,
            width: "100%",
            margin: "0 auto",
          }}
        >
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
