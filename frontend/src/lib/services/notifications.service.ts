// ============================================================
// NOTIFICATIONS SERVICE — Module 11
// Endpoints: /api/notifications/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ────────────────────────────────────────────────────

export type NotificationType =
  | "ATTENDANCE_CHECKIN_REQUEST"
  | "ATTENDANCE_CHECKOUT_REQUEST"
  | "ATTENDANCE_REQUEST_APPROVED"
  | "ATTENDANCE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_CREATED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_BALANCE_LOW"
  | "OVERTIME_REQUEST_CREATED"
  | "OVERTIME_APPROVED"
  | "OVERTIME_REJECTED"
  | "PROJECT_ASSIGNED"
  | "PROJECT_STATUS_CHANGED"
  | "MILESTONE_DUE_SOON"
  | "PAYROLL_READY"
  | "PAYSLIP_AVAILABLE"
  | "COMPENSATION_CHANGED"
  | "CONTRACT_SIGNED"
  | "CONTRACT_EXPIRING_SOON"
  | "INVOICE_SENT"
  | "PAYMENT_RECEIVED"
  | "INVOICE_OVERDUE"
  | "GENERAL";

export interface ApiNotification {
  id: string;
  type: NotificationType;
  /** Nhãn tiếng Việt từ backend mapper (TYPE_LABELS) */
  typeLabel: string;
  /** Nhóm loại (TYPE_CATEGORIES) */
  category: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  /** senderUser từ backend */
  sender: { id: string; fullName: string; avatarUrl?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Response từ GET /api/notifications/my — dùng toNotificationListDto */
export interface NotificationListResponse {
  notifications: ApiNotification[];
  unreadCount: number;
  pagination: Pagination;
}

/** Response từ GET /api/notifications/my/unread-count */
export interface UnreadCountResponse {
  unreadCount: number;
}

// ─── Self-service ─────────────────────────────────────────────

/** GET /api/notifications/my */
export async function listMyNotifications(params?: {
  isRead?: boolean;
  type?: NotificationType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> {
  return api.get<NotificationListResponse>("/notifications/my", {
    params: params as Record<string, string>,
  });
}

/** GET /api/notifications/my/unread-count */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return api.get<UnreadCountResponse>("/notifications/my/unread-count");
}

/** POST /api/notifications/my/mark-all-read */
export async function markAllAsRead(): Promise<void> {
  return api.post("/notifications/my/mark-all-read");
}

/** POST /api/notifications/my/batch-mark-read — body: { ids } */
export async function batchMarkAsRead(ids: string[]): Promise<void> {
  return api.post("/notifications/my/batch-mark-read", { ids });
}

/** POST /api/notifications/my/batch-delete — body: { ids } */
export async function batchDelete(ids: string[]): Promise<void> {
  return api.post("/notifications/my/batch-delete", { ids });
}

/** DELETE /api/notifications/my/read — xoá tất cả đã đọc */
export async function deleteAllRead(): Promise<void> {
  return api.delete("/notifications/my/read");
}

/** PATCH /api/notifications/:id/read — đánh dấu 1 cái đã đọc */
export async function markAsRead(id: string): Promise<ApiNotification> {
  return api.patch<ApiNotification>(`/notifications/${id}/read`);
}

/** DELETE /api/notifications/:id */
export async function deleteNotification(id: string): Promise<void> {
  return api.delete(`/notifications/${id}`);
}

// ─── Admin ────────────────────────────────────────────────────

export interface AdminNotificationListResponse {
  notifications: ApiNotification[];
  pagination: Pagination;
}

/** GET /api/notifications/admin/all */
export async function listAllNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<AdminNotificationListResponse> {
  return api.get<AdminNotificationListResponse>("/notifications/admin/all", {
    params: params as Record<string, string>,
  });
}

/** POST /api/notifications/admin/send */
export async function sendManual(payload: {
  recipientUserIds: string[];
  type?: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
}): Promise<ApiNotification[]> {
  return api.post<ApiNotification[]>("/notifications/admin/send", {
    ...payload,
    type: payload.type ?? "GENERAL",
  });
}
