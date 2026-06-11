"use client";

import { App } from "antd";

/**
 * 获取 antd 上下文感知的 message 实例
 * 继承 App Provider 的主题和 React 上下文
 */
export function useMessage() {
  const { message } = App.useApp();
  return message;
}
