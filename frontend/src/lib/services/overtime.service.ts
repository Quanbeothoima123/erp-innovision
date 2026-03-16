// ============================================================
// OVERTIME SERVICE — Module 6
// Endpoints: /api/overtime/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ───────────────────────────────────────────────────

export type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ApiOvertimeRequest {
  id: string;
  user?: {
    id: string;
    fullName: string;
    userCode: string;
    departmentId?: string;
    department?: { id: string; name: string } | null;
  } | null;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  plannedHours: number;
  actualMinutes: number | null;
  actualHours: number | null;
  isHoliday: boolean;
  isWeekend: boolean;
  dayType: string;
  reason: string | null;
  status: OvertimeStatus;
  approver?: { id: string; fullName: string } | null;
  comment: string | null;
  submittedAt: string | null;
  actionAt: string | null;
  createdAt: string;
  updatedAt: string;
  otPay?: {
    currency: string;
    amount: number;
    rate: number;
    baseSalary: number;
  } | null;
}

export interface OTMonthlyStats {
  year: number;
  month: number | null;
  sessionCount: number;
  totalPlannedMinutes: number;
  totalPlannedHours: number;
  totalApprovedMinutes: number;
  totalApprovedHours: number;
  breakdown: {
    weekdayMinutes: number;
    weekdayHours: number;
    weekendMinutes: number;
    weekendHours: number;
    holidayMinutes: number;
    holidayHours: number;
  };
}

export interface DeptOTSummaryItem {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalSessions: number;
  approvedSessions: number;
  pendingSessions: number;
  totalApprovedHours: number;
  totalPlannedHours: number;
}

// ─── Params ──────────────────────────────────────────────────

export interface ListOvertimeParams {
  userId?: string;
  departmentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedOvertimeRequests {
  items: ApiOvertimeRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Self-service ─────────────────────────────────────────────

export async function getMyOvertimeRequests(
  params?: ListOvertimeParams,
): Promise<PaginatedOvertimeRequests> {
  return api.get<PaginatedOvertimeRequests>("/overtime/my", {
    params: params as Record<string, string>,
  });
}

export async function getMyOTStats(params?: {
  year?: number;
  month?: number;
}): Promise<OTMonthlyStats> {
  return api.get<OTMonthlyStats>("/overtime/my/stats", {
    params: params as Record<string, string>,
  });
}

// ─── CRUD ─────────────────────────────────────────────────────

export async function listOvertimeRequests(
  params?: ListOvertimeParams,
): Promise<PaginatedOvertimeRequests> {
  return api.get<PaginatedOvertimeRequests>("/overtime", {
    params: params as Record<string, string>,
  });
}

export async function createOvertimeRequest(payload: {
  workDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  isWeekend?: boolean;
  isHoliday?: boolean;
}): Promise<ApiOvertimeRequest> {
  return api.post<ApiOvertimeRequest>("/overtime", payload);
}

export async function getOvertimeById(id: string): Promise<ApiOvertimeRequest> {
  return api.get<ApiOvertimeRequest>(`/overtime/${id}`);
}

export async function cancelOvertimeRequest(
  id: string,
  comment?: string,
): Promise<ApiOvertimeRequest> {
  return api.post<ApiOvertimeRequest>(`/overtime/${id}/cancel`, {
    comment: comment ?? null,
  });
}

export async function approveOvertimeRequest(
  id: string,
  comment?: string,
): Promise<ApiOvertimeRequest> {
  return api.post<ApiOvertimeRequest>(`/overtime/${id}/approve`, {
    comment: comment ?? null,
  });
}

export async function rejectOvertimeRequest(
  id: string,
  comment: string,
): Promise<ApiOvertimeRequest> {
  // Backend validation: comment field, min 5 chars
  const safeComment =
    comment && comment.trim().length >= 5
      ? comment.trim()
      : comment?.trim().length
        ? comment.trim().padEnd(5, ".")
        : "Không đáp ứng yêu cầu";
  return api.post<ApiOvertimeRequest>(`/overtime/${id}/reject`, {
    comment: safeComment,
  });
}

export async function updateActualMinutes(
  id: string,
  actualMinutes: number,
): Promise<ApiOvertimeRequest> {
  return api.patch<ApiOvertimeRequest>(`/overtime/${id}/actual-minutes`, {
    actualMinutes,
  });
}

export async function getOTPayEstimate(
  id: string,
): Promise<{ amount: number; rate: number; currency: string }> {
  return api.get(`/overtime/${id}/pay-estimate`);
}

// ─── Department Summary ────────────────────────────────────────

export async function getDeptOTSummary(params?: {
  year?: number;
  month?: number;
  departmentId?: string;
}): Promise<DeptOTSummaryItem[]> {
  return api.get<DeptOTSummaryItem[]>("/overtime/summary", {
    params: params as Record<string, string>,
  });
}
