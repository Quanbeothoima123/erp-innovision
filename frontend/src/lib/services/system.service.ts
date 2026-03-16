// ============================================================
// SYSTEM SERVICE — Module 11
// Base: /api/system/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ────────────────────────────────────────────────────

export interface ApiSystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  dataType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export interface ApiAuditLog {
  id: string;
  actorUserId: string | null;
  actor: { id: string; fullName: string; userCode: string } | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiAuditStats {
  topActions: { actionType: string; count: number }[];
  topActors: { actor: { id: string; fullName: string } | null; count: number }[];
  topEntities: { entityType: string; count: number }[];
}

export type Paginated<T> = {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
};

// ─── Config ───────────────────────────────────────────────────

export async function getAllConfigs(): Promise<{ grouped: Record<string, ApiSystemConfig[]>; flat: ApiSystemConfig[] }> {
  return api.get("/system/configs");
}

export async function getConfigByKey(key: string): Promise<ApiSystemConfig> {
  return api.get<ApiSystemConfig>(`/system/configs/${key}`);
}

export async function upsertConfig(
  key: string,
  payload: { configValue: string; description?: string | null },
): Promise<ApiSystemConfig> {
  return api.put<ApiSystemConfig>(`/system/configs/${key}`, payload);
}

export async function batchUpsertConfigs(
  configs: Array<{ configKey: string; configValue: string; description?: string | null }>,
): Promise<ApiSystemConfig[]> {
  return api.put<ApiSystemConfig[]>("/system/configs", { configs });
}

export async function deleteConfig(key: string): Promise<void> {
  return api.delete(`/system/configs/${key}`);
}

// ─── Audit Logs ───────────────────────────────────────────────

export async function getAuditStats(): Promise<ApiAuditStats> {
  return api.get<ApiAuditStats>("/system/audit-logs/stats");
}

export async function listAuditLogs(params?: {
  actorUserId?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<ApiAuditLog>> {
  return api.get<Paginated<ApiAuditLog>>("/system/audit-logs", {
    params: params as Record<string, string>,
  });
}

export async function getAuditLogById(id: string): Promise<ApiAuditLog> {
  return api.get<ApiAuditLog>(`/system/audit-logs/${id}`);
}

// ─── Accounts ─────────────────────────────────────────────────

export async function listAccounts(params?: {
  search?: string; page?: number; limit?: number;
}): Promise<Paginated<{ id: string; fullName: string; userCode: string; email: string; accountStatus: string; roles: string[]; lastLoginAt: string | null }>> {
  return api.get("/system/accounts", { params: params as Record<string, string> });
}

export async function lockAccount(id: string, reason?: string): Promise<void> {
  return api.post(`/system/accounts/${id}/lock`, { reason: reason || null });
}

export async function unlockAccount(id: string): Promise<void> {
  return api.post(`/system/accounts/${id}/unlock`);
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  return api.post(`/system/accounts/${id}/reset-password`, { newPassword });
}

export async function updateAccountRoles(id: string, roles: string[]): Promise<void> {
  return api.put(`/system/accounts/${id}/roles`, { roles });
}
