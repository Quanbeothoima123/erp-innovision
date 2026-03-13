// ============================================================
// useApi — Generic hook cho async API calls
// Usage:
//   const { data, loading, error, execute } = useApi(usersService.listUsers);
//   const { execute: create } = useApi(usersService.createUser, { immediate: false });
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "../lib/apiClient";

interface UseApiOptions<T> {
  /** Tự gọi ngay khi mount (default: true) */
  immediate?: boolean;
  /** Args mặc định khi gọi immediate */
  defaultArgs?: Parameters<(...args: unknown[]) => Promise<T>>;
  /** Callback khi thành công */
  onSuccess?: (data: T) => void;
  /** Callback khi lỗi */
  onError?: (error: ApiError | Error) => void;
}

interface UseApiReturn<TFn extends (...args: unknown[]) => Promise<unknown>> {
  data: Awaited<ReturnType<TFn>> | null;
  loading: boolean;
  error: string | null;
  execute: (
    ...args: Parameters<TFn>
  ) => Promise<Awaited<ReturnType<TFn>> | null>;
  reset: () => void;
  setData: React.Dispatch<
    React.SetStateAction<Awaited<ReturnType<TFn>> | null>
  >;
}

export function useApi<TFn extends (...args: unknown[]) => Promise<unknown>>(
  fn: TFn,
  options: UseApiOptions<Awaited<ReturnType<TFn>>> = {},
): UseApiReturn<TFn> {
  const { immediate = true, defaultArgs, onSuccess, onError } = options;

  type TData = Awaited<ReturnType<TFn>>;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Parameters<TFn>): Promise<TData | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = (await fn(...args)) as TData;
        if (mountedRef.current) {
          setData(result);
          onSuccess?.(result);
        }
        return result;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Có lỗi xảy ra";
        if (mountedRef.current) {
          setError(msg);
          onError?.(err as Error);
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  useEffect(() => {
    if (immediate) {
      execute(...((defaultArgs ?? []) as Parameters<TFn>));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, setData };
}

// ─── Simplified paginated hook ─────────────────────────────────────────────
interface UsePaginatedOptions<TItem> {
  initialPage?: number;
  initialLimit?: number;
  initialParams?: Record<string, unknown>;
  onSuccess?: (data: {
    data: TItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }) => void;
}

interface PaginatedResult<TItem> {
  data: TItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface UsePaginatedReturn<TItem, TParams> {
  items: TItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  loading: boolean;
  error: string | null;
  params: TParams;
  setParams: (params: Partial<TParams>) => void;
  page: number;
  setPage: (p: number) => void;
  refetch: () => void;
}

export function usePaginated<TItem, TParams extends Record<string, unknown>>(
  fn: (params: TParams) => Promise<PaginatedResult<TItem>>,
  initialParams: TParams,
  options: UsePaginatedOptions<TItem> = {},
): UsePaginatedReturn<TItem, TParams> {
  const [params, setParamsState] = useState<TParams>(initialParams);
  const [page, setPageState] = useState(options.initialPage ?? 1);
  const [items, setItems] = useState<TItem[]>([]);
  const [meta, setMeta] = useState<PaginatedResult<TItem>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn({ ...params, page } as TParams);
      if (mountedRef.current) {
        setItems(result.data);
        setMeta(result.meta);
        options.onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fn, params, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const setParams = useCallback((newParams: Partial<TParams>) => {
    setParamsState((prev) => ({ ...prev, ...newParams }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  return {
    items,
    meta,
    loading,
    error,
    params,
    setParams,
    page,
    setPage,
    refetch: fetch,
  };
}
