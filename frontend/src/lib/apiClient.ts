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

    // ✅ Chỉ xoá token khi server XÁC NHẬN token không hợp lệ (401 hoặc 403)
    // Không xoá khi lỗi mạng (5xx, timeout, network error)
    if (res.status === 401 || res.status === 403) {
      TokenStore.clear();
      return false;
    }

    if (!res.ok) {
      // Lỗi server tạm thời (500, 502, 503...) → KHÔNG xoá token
      // Giữ lại token, user sẽ được retry sau
      return false;
    }

    const data = await res.json();
    if (data.data?.accessToken) {
      TokenStore.set(data.data.accessToken, data.data.refreshToken ?? rt);
      return true;
    }

    // Không nhận được token mới nhưng server trả 200 → unexpected, không xoá
    return false;
  } catch {
    // ✅ Lỗi mạng (ECONNREFUSED, timeout, offline...) → KHÔNG xoá token
    // Session vẫn còn hợp lệ, user chỉ tạm thời mất mạng
    console.warn("[apiClient] Refresh token network error — keeping tokens");
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

/**
 * Upload FormData (multipart/form-data) — used for file uploads.
 * Does NOT set Content-Type (browser sets it with boundary automatically).
 */
export async function uploadFormData<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = TokenStore.getAccess();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (ok) return uploadFormData<T>(path, formData);
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new ApiError(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.code ?? "UNKNOWN_ERROR",
      data.message ?? `HTTP ${res.status}`,
    );
  }
  return (data.data ?? data) as T;
}
