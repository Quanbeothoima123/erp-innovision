import { useState, useCallback, useEffect } from "react";
import {
  User,
  users,
  notifications as allNotifications,
  RoleCode,
  hasRole,
} from "../data/mockData";
import type { Notification } from "../data/mockData";
import type { AuthContextType } from "./AuthContext";

export function useMockAuth(): AuthContextType {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(allNotifications);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  const login = useCallback(async (email: string, _password: string) => {
    const u = users.find((u) => u.email === email);
    if (u && u.accountStatus === "ACTIVE") {
      setCurrentUser(
        u as unknown as import("./AuthContext").AuthContextType["currentUser"],
      );
      setPasswordChanged(false);
      return { success: true };
    }
    return {
      success: false,
      error: "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa kích hoạt.",
    };
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setPasswordChanged(false);
  }, []);

  const updateCurrentUser = useCallback((data: Partial<User>) => {
    setCurrentUser((prev) =>
      prev ? ({ ...prev, ...data } as typeof prev) : null,
    );
  }, []);

  const toggleTheme = useCallback(() => setIsDark((p) => !p), []);

  const userNotifs = notifs
    .filter((n) => n.recipientUserId === currentUser?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setNotifs((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    if (!currentUser) return;
    setNotifs((prev) =>
      prev.map((n) =>
        n.recipientUserId === currentUser.id
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n,
      ),
    );
  }, [currentUser]);

  const deleteNotification = useCallback((id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const deleteAllRead = useCallback(() => {
    if (!currentUser) return;
    setNotifs((prev) =>
      prev.filter((n) => !(n.recipientUserId === currentUser.id && n.isRead)),
    );
  }, [currentUser]);

  const can = useCallback(
    (...roles: RoleCode[]) => {
      if (!currentUser) return false;
      return hasRole(currentUser as unknown as User, ...roles);
    },
    [currentUser],
  );

  const changePassword = useCallback(async (current: string, newPw: string) => {
    if (!current)
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
    setCurrentUser((prev) =>
      prev ? { ...prev, mustChangePassword: false } : null,
    );
    setPasswordChanged(true);
    return { success: true };
  }, []);

  return {
    currentUser: currentUser as AuthContextType["currentUser"],
    login,
    logout,
    updateCurrentUser:
      updateCurrentUser as AuthContextType["updateCurrentUser"],
    isDark,
    toggleTheme,
    notifications: userNotifs,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotification,
    deleteAllRead,
    can,
    changePassword,
    passwordChanged,
    initializing: false,
  };
}
