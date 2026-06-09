"use client";

import { useChat } from "@/hooks/useChat";
import { Sidebar } from "@/components/Sidebar";
import { MessageArea } from "@/components/MessageArea";
import { ChatInput } from "@/components/ChatInput";

// ============================================================
// 页面组件
// ============================================================

export default function ChatPage() {
  const chat = useChat();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        threads={chat.threads}
        threadId={chat.threadId}
        threadsLoading={chat.threadsLoading}
        onSwitchThread={chat.switchThread}
        onCreateNewChat={chat.createNewChat}
        onDeleteThread={chat.deleteThread}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <MessageArea
          messages={chat.messages}
          aiLoading={chat.aiLoading}
          bubbleListRef={chat.bubbleListRef}
        />
        <ChatInput
          value={chat.input}
          loading={chat.isLoading}
          onChange={chat.setInput}
          onSubmit={chat.sendMessage}
          onCancel={chat.cancelGeneration}
        />
      </div>
    </div>
  );
}
