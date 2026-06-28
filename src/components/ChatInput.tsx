"use client";

import { Sender } from "@ant-design/x";
import { Dropdown, Button } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useMessage } from "@/hooks/useMessage";
import type { AgentItem } from "@/lib/api/agents";

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
  agentId: string;
  agents: AgentItem[];
  onAgentChange: (agentId: string) => void;
}

export function ChatInput({
  value,
  loading,
  onChange,
  onSubmit,
  onCancel,
  agentId,
  agents,
  onAgentChange,
}: ChatInputProps) {
  const message = useMessage();
  const charCount = value.length;
  const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;

  const currentAgent = agents.find((a) => a.id === agentId);

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
        suffix={false}
        footer={(_, { components }) => {
          const { SendButton, LoadingButton } = components;
          return (
            <div className="flex items-center justify-between">
              <Dropdown
                menu={{
                  items: agents.map((agent) => ({
                    key: agent.id,
                    label: (
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-gray-400">{agent.description}</div>
                      </div>
                    ),
                  })),
                  selectedKeys: [agentId],
                  onClick: ({ key }) => onAgentChange(key),
                }}
                trigger={["click"]}
                disabled={loading}
              >
                <Button size="small" icon={<RobotOutlined />}>
                  {currentAgent?.name ?? agentId}{" "}
                </Button>
              </Dropdown>
              <div className="flex items-center gap-1.5 space-x-2">
                {charCount > 0 && (
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
                )}
                {loading ? <LoadingButton /> : <SendButton />}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
