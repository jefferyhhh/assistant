"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThreadItem } from "@/lib/api/threads";
import * as threadsApi from "@/lib/api/threads";
import { useMessage } from "./useMessage";

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

      // 为没有标题的会话补生成标题（fire-and-forget）
      const untitled = items.filter((t) => !t.title);
      if (untitled.length > 0) {
        Promise.allSettled(untitled.map((t) => threadsApi.generateThreadTitle(t.key))).then(() =>
          loadThreads(),
        );
      }
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
    async (key: string, currentThreadId: string | null, onDeleteCurrent?: () => void) => {
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

  /**
   * 乐观更新：立即添加一个占位 thread（不等 API 返回）
   * 用于新会话创建时第一时间显示在 Sidebar
   */
  const addPlaceholderThread = useCallback((placeholderKey: string) => {
    setThreads((prev) => [{ key: placeholderKey, label: "新会话...", title: undefined }, ...prev]);
  }, []);

  /**
   * 将占位 thread 的 key 更新为真实 threadId
   * SSE done 事件返回真实 threadId 后调用
   */
  const updateThreadKey = useCallback((placeholderKey: string, realKey: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.key === placeholderKey
          ? { ...t, key: realKey, label: `会话 ${realKey.slice(0, 8)}...` }
          : t,
      ),
    );
  }, []);

  return {
    threads,
    threadsLoading,
    loadThreads,
    deleteThread,
    addPlaceholderThread,
    updateThreadKey,
  };
}
