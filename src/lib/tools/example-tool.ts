/**
 * 示例自定义工具
 * 展示如何使用 @langchain/core/tools 的 tool() 函数创建工具
 *
 * 添加新工具：
 * 1. 在此目录下创建新的 .ts 文件
 * 2. 导出一个 Tool 实例
 * 3. 在 ./index.ts 的 localTools 数组中注册
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 获取当前日期和时间
 */
export const getCurrentTimeTool = tool(
  async () => {
    const now = new Date();
    return `当前时间: ${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  },
  {
    name: "get_current_time",
    description: "获取当前的日期和时间",
    schema: z.object({}),
  },
);
