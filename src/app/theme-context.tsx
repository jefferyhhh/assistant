"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";
const COOKIE_KEY = "theme";

/** 读取 cookie 中的主题（SSR/CSR 通用） */
export function getThemeFromCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=(light|dark)`));
  return match ? (match[1] as Theme) : null;
}

/** 读取客户端主题偏好（localStorage → 系统偏好 → fallback） */
function getClientTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 同步主题到 localStorage + cookie + <html> class */
function applyTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  // biome-ignore lint/suspicious/noDocumentCookie: cookie 给 SSR读主题，兼容性优先
  document.cookie = `${COOKIE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  // 用服务端传来的 initialTheme 初始化，与 SSR 一致
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // 客户端挂载后，校验真实偏好（localStorage/系统）是否与 initialTheme 一致
  // biome-ignore lint/correctness/useExhaustiveDependencies: 空依赖防止重复执行
    useEffect(() => {
    const clientTheme = getClientTheme();
    if (clientTheme !== initialTheme) {
      setTheme(clientTheme);
      applyTheme(clientTheme);
    } else {
      // 确保 cookie 存在（首次访问时可能没有）
      applyTheme(initialTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
