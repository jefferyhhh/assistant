"use client";

import { Button, Spin } from "antd";
import { Conversations } from "@ant-design/x";
import { PlusOutlined, DeleteOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "@/app/theme-context";
import type { ThreadItem } from "@/lib/api/threads";

// ============================================================
// 侧边栏组件
// ============================================================

interface SidebarProps {
  threads: ThreadItem[];
  threadId: string | null;
  threadsLoading: boolean;
  onSwitchThread: (key: string) => void;
  onCreateNewChat: () => void;
  onDeleteThread: (key: string) => void;
}

export function Sidebar({
  threads,
  threadId,
  threadsLoading,
  onSwitchThread,
  onCreateNewChat,
  onDeleteThread,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex w-[260px] flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-sm font-semibold text-muted">会话列表</span>
        <div className="flex gap-1">
          <Button
            type="text"
            size="small"
            icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
          />
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={onCreateNewChat}>
            新对话
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-1">
        <Spin spinning={threadsLoading}>
          <Conversations
            items={threads}
            activeKey={threadId ?? undefined}
            onActiveChange={onSwitchThread}
            menu={(item) => ({
              items: [
                {
                  key: "delete",
                  label: "删除",
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => onDeleteThread(item.key),
                },
              ],
            })}
            creation={{ onClick: onCreateNewChat }}
          />
        </Spin>
      </div>
    </div>
  );
}
