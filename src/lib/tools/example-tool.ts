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
  }
);

/**
 * 示例：数学计算工具
 */
export const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    try {
      // 简单安全的数学表达式求值
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      if (!sanitized) return "错误：无效的数学表达式";
      const result = Function(`"use strict"; return (${sanitized})`)();
      return `${expression} = ${result}`;
    } catch (e) {
      return `计算错误: ${e instanceof Error ? e.message : "未知错误"}`;
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式，支持加减乘除、括号等基本运算",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，如 '2 + 3 * 4'"),
    }),
  }
);
