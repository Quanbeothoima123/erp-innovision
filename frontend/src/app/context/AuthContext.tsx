// ============================================================
// AUTH CONTEXT — v3 Real API only (mock via AuthContext.mock)
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { TokenStore, ApiError } from "../../lib/apiClient";
import * as authService from "../../lib/services/auth.service";
import type { ApiUser } from "../../lib/services/auth.service";
import * as notificationsService from "../../lib/services/notifications.service";
import type { ApiNotification } from "../../lib/services/notifications.service";
import { useMockAuth } from "./AuthContext.mock";

export type RoleCode =
  | "ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE"
  | "SALES"
  | "ACCOUNTANT"
  | "DIRECTOR";
export type Notification = ApiNotification;

// ─── Exported type ────────────────────────────────────────────
export interface AuthContextType {
  currentUser: ApiUser | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCurrentUser: (data: Partial<ApiUser>) => void;
  isDark: boolean;
  toggleTheme: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllRead: () => void;
  can: (...roles: RoleCode[]) => boolean;
  changePassword: (
    current: string,
    newPw: string,
  ) => Promise<{ success: boolean; error?: string }>;
  passwordChanged: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

const USE_MOCK = !import.meta.env.VITE_API_URL;

// ─── Real API Provider ────────────────────────────────────────
function RealAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const notifPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      /**/
    }
  }, [isDark]);

  // ── Notification helpers ───────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsService.listMyNotifications({ limit: 50 });
      setNotifs(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      /* silent */
    }
  }, []);

  // Start polling when user is logged in, stop on logout
  useEffect(() => {
    if (!currentUser) {
      setNotifs([]);
      setUnreadCount(0);
      if (notifPollingRef.current) clearInterval(notifPollingRef.current);
      return;
    }
    fetchNotifications();
    notifPollingRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (notifPollingRef.current) clearInterval(notifPollingRef.current);
    };
  }, [currentUser, fetchNotifications]);

  // Restore session từ stored token khi app load
  useEffect(() => {
    const token = TokenStore.getAccess();
    if (!token) {
      setInitializing(false);
      return;
    }
    authService
      .getMe()
      .then(setCurrentUser)
      .catch(() => TokenStore.clear())
      .finally(() => setInitializing(false));
  }, []);

  // Force logout khi token hết hạn (fired bởi apiClient)
  useEffect(() => {
    const handler = () => {
      setCurrentUser(null);
      setPasswordChanged(false);
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authService.login({ email, password });
      setCurrentUser(res.user);
      setPasswordChanged(false);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof ApiError ? err.message : "Đăng nhập thất bại",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /**/
    }
    setCurrentUser(null);
    setPasswordChanged(false);
  }, []);

  const updateCurrentUser = useCallback((data: Partial<ApiUser>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const toggleTheme = useCallback(() => setIsDark((p) => !p), []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifs((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  }, []);
  const markAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifs((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  }, []);
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifs((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.isRead)
          setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      /* silent */
    }
  }, []);
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationsService.deleteAllRead();
      setNotifs((prev) => prev.filter((n) => !n.isRead));
    } catch {
      /* silent */
    }
  }, []);

  const can = useCallback(
    (...roles: RoleCode[]) => {
      if (!currentUser) return false;
      return roles.some((r) => currentUser.roles.includes(r));
    },
    [currentUser],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPw: string) => {
      if (!currentPassword)
        return { success: false, error: "Vui lòng nhập mật khẩu hiện tại" };
      if (newPw.length < 8)
        return { success: false, error: "Mật khẩu mới phải ít nhất 8 ký tự" };
      if (!/[A-Z]/.test(newPw))
        return { success: false, error: "Mật khẩu cần có ít nhất 1 chữ hoa" };
      if (!/[0-9]/.test(newPw))
        return { success: false, error: "Mật khẩu cần có ít nhất 1 chữ số" };
      if (!/[^A-Za-z0-9]/.test(newPw))
        return {
          success: false,
          error: "Mật khẩu cần có ít nhất 1 ký tự đặc biệt",
        };
      try {
        await authService.changePassword({
          currentPassword,
          newPassword: newPw,
          confirmPassword: newPw,
        });
        setCurrentUser((prev) =>
          prev ? { ...prev, mustChangePassword: false } : null,
        );
        setPasswordChanged(true);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
        };
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        updateCurrentUser,
        isDark,
        toggleTheme,
        notifications: notifs,
        unreadCount,
        markAsRead,
        markAllRead,
        deleteNotification,
        deleteAllRead,
        can,
        changePassword,
        passwordChanged,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Mock Provider (wrapper) ──────────────────────────────────
function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMockAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Exported Provider ────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (USE_MOCK) return <MockAuthProvider>{children}</MockAuthProvider>;
  return <RealAuthProvider>{children}</RealAuthProvider>;
}
