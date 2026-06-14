"use client";

import { Bubble, type BubbleItemType, Welcome } from "@ant-design/x";
import { XMarkdown } from "@ant-design/x-markdown";
import { CodeHighlight } from "./CodeHighlight";

// ============================================================
// 消息展示区组件
// ============================================================

interface MessageAreaProps {
  messages: BubbleItemType[];
  aiLoading: boolean;
  bubbleListRef: React.RefObject<any>;
}

export function MessageArea({
  messages,
  aiLoading,
  bubbleListRef,
}: MessageAreaProps) {
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
            ai: (item) => ({
              placement: "start",
              loading:
                aiLoading &&
                item.key === messages[messages.length - 1]?.key,
              variant: "filled",
              typing: { effect: "typing", step: 3, interval: 50 },
              contentRender: (content) => (
                <XMarkdown components={{ code: CodeHighlight }} openLinksInNewTab={true}>
                  {content}
                </XMarkdown>
              ),
            }),
          }}
        />
      )}
    </div>
  );
}
