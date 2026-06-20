"use client";

import { Sender } from "@ant-design/x";
import { useMessage } from "@/hooks/useMessage";

// ============================================================
// 输入区组件
// ============================================================

/** 单条消息最大字符数，与服务端 DEFAULT_MAX_MESSAGE_LENGTH 保持一致 */
const MAX_MESSAGE_LENGTH = 32000;

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
  const message = useMessage();
  const charCount = value.length;
  const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;

  const handleSubmit = (text: string) => {
    if (text.length > MAX_MESSAGE_LENGTH) {
      message.warning(`消息长度不能超过 ${MAX_MESSAGE_LENGTH} 个字符，当前 ${text.length} 个`);
      return;
    }
    onSubmit(text);
  };

  return (
    <div className="mx-auto w-full max-w-[800px] px-6 pt-3 pb-4">
      <Sender
        value={value}
        onChange={onChange}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        loading={loading}
        placeholder="输入消息..."
        style={{ width: "100%" }}
        footer={charCount > 0 ? () => (
          <div className="flex justify-end px-1 pt-1">
            <span
              className={`text-xs ${
                isOverLimit
                  ? "text-red-500"
                  : isNearLimit
                    ? "text-orange-500"
                    : "text-gray-400"
              }`}
            >
              {charCount} / {MAX_MESSAGE_LENGTH}
            </span>
          </div>
        ) : undefined}
      />
    </div>
  );
}
