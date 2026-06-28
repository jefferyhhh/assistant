"use client";

import { XProvider } from "@ant-design/x";
import { App, theme as antdTheme } from "antd";
import { StyleProvider, extractStyle, createCache } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { ThemeProvider, useTheme, type Theme } from "./theme-context";

function AntdStyleInjector({ children }: { children: React.ReactNode }) {
  const { theme: currentTheme } = useTheme();
  const cache = useRef(createCache()).current;

  useServerInsertedHTML(() => {
    const styleText = extractStyle(cache, true);
    if (!styleText) return null;
    return (
      <style
        data-antd-cssinjs=""
        // biome-ignore lint/security/noDangerouslySetInnerHtml: antd SSR 样式注入，内容来自extractStyle，非用户输入
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return (
    <StyleProvider cache={cache}>
      <XProvider
        theme={{
          cssVar: { prefix: "ant", key: currentTheme },
          algorithm: currentTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        }}
      >
        <App>{children}</App>
      </XProvider>
    </StyleProvider>
  );
}

export default function Providers({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AntdStyleInjector>{children}</AntdStyleInjector>
    </ThemeProvider>
  );
}
