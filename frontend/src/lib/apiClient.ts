// ============================================================
// API CLIENT — Centralized fetch wrapper
// Handles: base URL, auth headers, token refresh, error format
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// ─── Token helpers ───────────────────────────────────────────
export const TokenStore = {
  getAccess: () => localStorage.getItem("accessToken"),
  getRefresh: () => localStorage.getItem("refreshToken"),
  set: (access: string, refresh: string) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  },
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

// ─── API Error ───────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Refresh lock (prevent concurrent refresh) ───────────────
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const rt = TokenStore.getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      TokenStore.clear();
      return false;
    }
    const data = await res.json();
    if (data.data?.accessToken) {
      TokenStore.set(data.data.accessToken, data.data.refreshToken ?? rt);
      return true;
    }
    TokenStore.clear();
    return false;
  } catch {
    TokenStore.clear();
    return false;
  }
}

// ─── Core request function ───────────────────────────────────
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  _retry?: boolean;
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, skipAuth, _retry, ...fetchOptions } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (!skipAuth) {
    const token = TokenStore.getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 → try refresh once
  if (res.status === 401 && !_retry && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (ok) {
      return request<T>(path, { ...options, _retry: true });
    }
    // Refresh failed → force logout event
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new ApiError(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
  }

  // Parse JSON
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.code ?? "UNKNOWN_ERROR",
      data.message ?? `HTTP ${res.status}`,
    );
  }

  // Backend wraps in { success, data, message }
  return (data.data ?? data) as T;
}

// ─── Convenience methods ─────────────────────────────────────
export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "GET", ...opts }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...opts }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PUT", body, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body, ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...opts }),
};
