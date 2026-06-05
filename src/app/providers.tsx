"use client";

import { XProvider } from "@ant-design/x";
import { theme as antdTheme } from "antd";
import { StyleProvider, extractStyle, createCache } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { ThemeProvider, useTheme } from "./theme-context";

function AntdStyleInjector({ children }: { children: React.ReactNode }) {
  const { theme: currentTheme } = useTheme();
  const cache = useRef(createCache()).current;

  useServerInsertedHTML(() => {
    const styleText = extractStyle(cache, true);
    if (!styleText) return null;
    return (
      <style
        data-antd-cssinjs=""
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return (
    <StyleProvider cache={cache}>
      <XProvider
        theme={{
          // key 随主题变化 → 强制 antd 缓存失效，用新 algorithm 重新生成 CSS 变量
          cssVar: { prefix: "ant", key: currentTheme },
          algorithm:
            currentTheme === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
        }}
      >
        {children}
      </XProvider>
    </StyleProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AntdStyleInjector>{children}</AntdStyleInjector>
    </ThemeProvider>
  );
}
