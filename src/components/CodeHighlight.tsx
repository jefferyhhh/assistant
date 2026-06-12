"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// ============================================================
// 自定义代码高亮组件，供 XMarkdown components.code 使用
// ============================================================

interface CodeHighlightProps {
  /** 代码块 info string（语言标识） */
  lang?: string;
  /** 是否为块级 code（fenced code block） */
  block?: boolean;
  /** 流式状态 */
  streamStatus?: "loading" | "done";
  /** 子节点（代码文本） */
  children?: React.ReactNode;
  /** 其余 HTML 属性 */
  [key: string]: unknown;
}

/** 从 React children 中递归提取纯文本 */
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (
    typeof children === "object" &&
    children !== null &&
    "props" in children
  ) {
    return extractText(
      (children as { props: { children?: React.ReactNode } }).props.children,
    );
  }
  return "";
}

/** 复制按钮 */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/50 backdrop-blur transition-all hover:bg-white/10 hover:text-white/80"
      title={copied ? "已复制" : "复制代码"}
    >
      {copied ? "✓ 已复制" : "复制"}
    </button>
  );
}

/** 语言标签 */
function LanguageTag({ lang }: { lang: string }) {
  return (
    <span className="absolute top-2 left-3 text-xs text-white/30 select-none">
      {lang}
    </span>
  );
}

export function CodeHighlight({
  lang,
  block,
  children,
}: CodeHighlightProps) {
  const code = extractText(children);

  // 内联 code（行内代码）
  if (!block) {
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm font-mono text-pink-400">
        {children}
      </code>
    );
  }

  // 块级 code（fenced code block）
  return (
    <div className="group relative my-4 overflow-hidden rounded-lg">
      {/* 顶部栏：语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#282c34] px-4 pt-8 pb-2">
        {lang && <LanguageTag lang={lang} />}
        <span /> {/* spacer */}
        <CopyButton code={code} />
      </div>

      <SyntaxHighlighter
        language={lang || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          padding: "1rem 1.25rem",
          fontSize: "0.875rem",
          lineHeight: "1.7",
          background: "#282c34",
        }}
        showLineNumbers={code.split("\n").length > 5}
        lineNumberStyle={{
          color: "rgba(255,255,255,0.15)",
          minWidth: "2.5em",
          paddingRight: "1em",
          userSelect: "none",
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
