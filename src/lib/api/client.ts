/**
 * 统一的 HTTP 客户端封装
 * 集中处理错误、headers、JSON 解析
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 统一的 fetch 封装，自动处理错误和 JSON 解析
 */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // 忽略解析失败
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
}

/**
 * 发起 SSE 流式请求，返回原始 Response（由调用方读取 body）
 */
export async function requestStream(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch {
      // 忽略解析失败
    }
    throw new ApiError(message, res.status);
  }

  return res;
}
