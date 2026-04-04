// ============================================================
// TELEGRAM SERVICE
// Endpoints: /api/telegram/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ────────────────────────────────────────────────────

export interface TelegramStatus {
  isLinked: boolean;
  telegramEnabled: boolean;
  linkedAt: string | null;
  settings: TelegramSettings | null;
}

export interface TelegramSettings {
  id: string;
  userId: string;
  // Attendance
  notifyAttendanceRequest: boolean;
  notifyAttendanceApproved: boolean;
  notifyAttendanceRejected: boolean;
  // Leave
  notifyLeaveRequest: boolean;
  notifyLeaveApproved: boolean;
  notifyLeaveRejected: boolean;
  notifyLeaveBalanceLow: boolean;
  // Overtime
  notifyOvertimeRequest: boolean;
  notifyOvertimeApproved: boolean;
  notifyOvertimeRejected: boolean;
  // Task
  notifyTaskAssigned: boolean;
  notifyTaskUpdated: boolean;
  notifyTaskDueSoon: boolean;
  // Payroll
  notifyPayroll: boolean;
  notifyPayslip: boolean;
  notifyCompensation: boolean;
  // Project
  notifyProject: boolean;
  notifyMilestone: boolean;
  // General
  notifyGeneral: boolean;
}

export interface TelegramConnectLink {
  connectUrl: string;
  botUrl: string;
  rawToken: string;
  startCommand: string;
  botUsername: string;
  expiresIn: string;
}

export interface TelegramGroup {
  id: string;
  name: string;
  groupChatId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
}

// ─── User endpoints ───────────────────────────────────────────

/** GET /api/telegram/status */
export async function getStatus(): Promise<TelegramStatus> {
  return api.get<TelegramStatus>("/telegram/status");
}

/** GET /api/telegram/connect-link */
export async function getConnectLink(): Promise<TelegramConnectLink> {
  return api.get<TelegramConnectLink>("/telegram/connect-link");
}

/** DELETE /api/telegram/unlink */
export async function unlink(): Promise<void> {
  return api.delete("/telegram/unlink");
}

/** PATCH /api/telegram/toggle — body: { enabled: boolean } */
export async function toggle(enabled: boolean): Promise<void> {
  return api.patch("/telegram/toggle", { enabled });
}

/** GET /api/telegram/settings */
export async function getSettings(): Promise<TelegramSettings | null> {
  return api.get<TelegramSettings | null>("/telegram/settings");
}

/** PUT /api/telegram/settings */
export async function updateSettings(
  settings: Partial<Omit<TelegramSettings, "id" | "userId">>,
): Promise<TelegramSettings> {
  return api.put<TelegramSettings>("/telegram/settings", settings);
}

// ─── Admin endpoints ──────────────────────────────────────────

/** GET /api/telegram/admin/groups */
export async function listGroups(): Promise<TelegramGroup[]> {
  return api.get<TelegramGroup[]>("/telegram/admin/groups");
}

/** POST /api/telegram/admin/groups */
export async function createGroup(data: {
  name: string;
  groupChatId: string;
  description?: string;
  isActive?: boolean;
}): Promise<TelegramGroup> {
  return api.post<TelegramGroup>("/telegram/admin/groups", data);
}

/** PUT /api/telegram/admin/groups/:id */
export async function updateGroup(
  id: string,
  data: {
    name?: string;
    groupChatId?: string;
    description?: string;
    isActive?: boolean;
  },
): Promise<TelegramGroup> {
  return api.put<TelegramGroup>(`/telegram/admin/groups/${id}`, data);
}

/** DELETE /api/telegram/admin/groups/:id */
export async function deleteGroup(id: string): Promise<void> {
  return api.delete(`/telegram/admin/groups/${id}`);
}

/** POST /api/telegram/admin/broadcast */
export async function broadcast(data: {
  title: string;
  message: string;
}): Promise<BroadcastResult> {
  return api.post<BroadcastResult>("/telegram/admin/broadcast", data);
}
