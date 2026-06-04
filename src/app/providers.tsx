"use client";

import { XProvider } from "@ant-design/x";
import { StyleProvider, extractStyle, createCache } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const cache = useRef(createCache()).current;

  useServerInsertedHTML(() => {
    const styleText = extractStyle(cache, true);
    return (
      <style
        data-antd-cssinjs=""
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return (
    <StyleProvider cache={cache}>
      <XProvider>{children}</XProvider>
    </StyleProvider>
  );
}
