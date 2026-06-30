"use client";

import { ChatInput } from "@/components/ChatInput";
import { MessageArea } from "@/components/MessageArea";
import { Sidebar } from "@/components/Sidebar";
import { useChat } from "@/hooks/useChat";

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
          agentId={chat.agentId}
          agents={chat.agents}
          onAgentChange={chat.setAgentId}
        />
      </div>
    </div>
  );
}
