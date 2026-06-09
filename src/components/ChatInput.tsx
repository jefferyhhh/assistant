"use client";

import { Sender } from "@ant-design/x";

// ============================================================
// 输入区组件
// ============================================================

interface ChatInputProps {
  value: string;
  loading: boolean;
  onChange: (val: string) => void;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function ChatInput({
  value,
  loading,
  onChange,
  onSubmit,
  onCancel,
}: ChatInputProps) {
  return (
    <div className="mx-auto w-full max-w-[800px] px-6 pt-3 pb-4">
      <Sender
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
        loading={loading}
        placeholder="输入消息..."
        style={{ width: "100%" }}
      />
    </div>
  );
}
