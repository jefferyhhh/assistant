"use client";

import { useState, useEffect, useCallback } from "react";
import { useMessage } from "./useMessage";
import * as threadsApi from "@/lib/api/threads";
import type { ThreadItem } from "@/lib/api/threads";

export type { ThreadItem };

export function useThreads() {
  const message = useMessage();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: message 方法在组件生命周期内稳
  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const items = await threadsApi.loadThreads();
      setThreads(items);
    } catch {
      message.error("加载会话列表失败");
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  /**
   * 删除会话。若删除的是当前会话，调用 onDeleteCurrent 让编排层重置状态。
   * @returns 是否删除成功
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: message 方法在组件生命周期内稳
  const deleteThread = useCallback(
    async (
      key: string,
      currentThreadId: string | null,
      onDeleteCurrent?: () => void,
    ) => {
      try {
        await threadsApi.deleteThread(key);
        if (key === currentThreadId) {
          onDeleteCurrent?.();
        }
        loadThreads();
        return true;
      } catch {
        message.error("删除会话失败");
        return false;
      }
    },
    [loadThreads],
  );

  return { threads, threadsLoading, loadThreads, deleteThread };
}
