import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, users, notifications as allNotifications, Notification, RoleCode, hasRole } from '../data/mockData';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string) => boolean;
  logout: () => void;
  updateCurrentUser: (data: Partial<User>) => void;
  isDark: boolean;
  toggleTheme: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllRead: () => void;
  can: (...roles: RoleCode[]) => boolean;
  changePassword: (current: string, newPw: string) => { success: boolean; error?: string };
  passwordChanged: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(allNotifications);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const login = useCallback((email: string) => {
    const u = users.find(u => u.email === email);
    if (u && u.accountStatus === 'ACTIVE') {
      setCurrentUser(u);
      setPasswordChanged(false);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setPasswordChanged(false);
  }, []);

  const updateCurrentUser = useCallback((data: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  const toggleTheme = useCallback(() => setIsDark(p => !p), []);

  const userNotifs = notifs
    .filter(n => n.recipientUserId === currentUser?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
  }, []);

  const markAllRead = useCallback(() => {
    if (!currentUser) return;
    setNotifs(prev => prev.map(n => n.recipientUserId === currentUser.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
  }, [currentUser]);

  const deleteNotification = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const deleteAllRead = useCallback(() => {
    if (!currentUser) return;
    setNotifs(prev => prev.filter(n => !(n.recipientUserId === currentUser.id && n.isRead)));
  }, [currentUser]);

  const can = useCallback((...roles: RoleCode[]) => {
    if (!currentUser) return false;
    return hasRole(currentUser, ...roles);
  }, [currentUser]);

  const changePassword = useCallback((current: string, newPw: string): { success: boolean; error?: string } => {
    // Mock validation — accept any current password for demo
    if (!current) return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại' };
    if (newPw.length < 8) return { success: false, error: 'Mật khẩu mới phải ít nhất 8 ký tự' };
    if (!/[A-Z]/.test(newPw)) return { success: false, error: 'Mật khẩu cần có ít nhất 1 chữ hoa' };
    if (!/[0-9]/.test(newPw)) return { success: false, error: 'Mật khẩu cần có ít nhất 1 chữ số' };
    if (!/[^A-Za-z0-9]/.test(newPw)) return { success: false, error: 'Mật khẩu cần có ít nhất 1 ký tự đặc biệt' };
    setCurrentUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
    setPasswordChanged(true);
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, login, logout, updateCurrentUser,
      isDark, toggleTheme,
      notifications: userNotifs, unreadCount, markAsRead, markAllRead, deleteNotification, deleteAllRead,
      can, changePassword, passwordChanged,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
