"use client";

import { ToolOutlined } from "@ant-design/icons";
import type { ThoughtChainItemType } from "@ant-design/x";
import { Actions, Bubble, type BubbleItemType, ThoughtChain, Welcome } from "@ant-design/x";
import { XMarkdown } from "@ant-design/x-markdown";
import { Typography } from "antd";
import type { ToolCall } from "@/lib/api/messages";
import { CodeHighlight } from "./CodeHighlight";

// ============================================================
// 工具调用 ThoughtChain 组件
// ============================================================

function ToolCallChain({ toolCalls }: { toolCalls: ToolCall[] }) {
  const items: ThoughtChainItemType[] = toolCalls.map((tc) => {
    const statusMap: Record<string, ThoughtChainItemType["status"]> = {
      running: "loading",
      done: "success",
      error: "error",
    };

    return {
      key: tc.id,
      title: tc.name,
      description:
        tc.status === "running" ? "执行中…" : tc.status === "error" ? "执行失败" : "已完成",
      status: statusMap[tc.status] ?? "success",
      collapsible: true,
      content: (
        <div className="text-xs space-y-1">
          {tc.args && tc.args !== "{}" && (
            <div>
              <Typography.Text type="secondary">参数:</Typography.Text>{" "}
              <code className="bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded break-all max-h-40 overflow-auto inline-block align-top">
                {tc.args}
              </code>
            </div>
          )}
          {tc.result && (
            <div>
              <Typography.Text type="secondary">结果:</Typography.Text>{" "}
              <code className="bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded break-all max-h-40 overflow-auto inline-block align-top">
                {tc.result}
              </code>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 mb-2 text-neutral-500 dark:text-neutral-400">
        <ToolOutlined className="text-xs" />
        <span className="text-xs">调用了 {toolCalls.length} 个工具</span>
      </div>
      <ThoughtChain items={items} defaultExpandedKeys={[]} />
    </div>
  );
}

// ============================================================
// 消息展示区组件
// ============================================================

interface MessageAreaProps {
  messages: BubbleItemType[];
  aiLoading: boolean;
  bubbleListRef: React.RefObject<any>;
}

export function MessageArea({ messages, aiLoading, bubbleListRef }: MessageAreaProps) {
  return (
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
              styles: {
                content: {
                  background: "color-mix(in srgb, #3b82f6 12%, transparent)",
                },
              },
            },
            ai: (item) => {
              const extraInfo = (item as any).extraInfo as { toolCalls?: ToolCall[] } | undefined;
              const toolCalls = extraInfo?.toolCalls;

              // 工具调用 bubble —— 用 ThoughtChain 渲染
              if (toolCalls && toolCalls.length > 0) {
                return {
                  placement: "start",
                  variant: "borderless",
                  contentRender: () => <ToolCallChain toolCalls={toolCalls} />,
                };
              }

              // 正常 AI 消息
              return {
                placement: "start",
                loading: aiLoading && item.key === messages[messages.length - 1]?.key,
                variant: "filled",
                typing: { effect: "typing", step: 3, interval: 50 },
                contentRender: (content) => (
                  <XMarkdown components={{ code: CodeHighlight }} openLinksInNewTab={true}>
                    {content}
                  </XMarkdown>
                ),
                footer: (content) => {
                  const text = typeof content === "string" ? content : "";
                  if (!text) return null;
                  return (
                    <Actions
                      items={[
                        {
                          key: "copy",
                          actionRender: () => <Actions.Copy text={text} />,
                        },
                      ]}
                      variant="borderless"
                    />
                  );
                },
              };
            },
          }}
        />
      )}
    </div>
  );
}
