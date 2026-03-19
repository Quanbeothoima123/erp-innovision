// ============================================================
// LEAVE SERVICE — Module 5
// Endpoints: /api/leave/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ───────────────────────────────────────────────────

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type ApprovalStepType = "MANAGER" | "HR";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export interface ApiLeaveType {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  maxDaysPerYear: number | null;
  requiresDocument: boolean;
  isActive: boolean;
}

export interface ApiLeaveBalance {
  id?: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  entitledDays: number;
  carriedDays: number;
  adjustedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  notes?: string | null;
  leaveType?: ApiLeaveType;
  user?: {
    id: string;
    fullName: string;
    userCode: string;
    avatarUrl?: string | null;
    department?: { id: string; name: string };
  };
}

export interface ApiLeaveRequestApproval {
  id: string;
  stepType: ApprovalStepType;
  stepOrder: number;
  status: ApprovalStatus;
  comment: string | null; // backend trả "comment" (không phải "note")
  actionAt: string | null; // backend trả "actionAt" (không phải "actedAt")
  approver?: { id: string; fullName: string; avatarUrl?: string | null };
}

export interface ApiLeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod: string | null;
  reason: string | null;
  status: LeaveRequestStatus;
  currentStep: ApprovalStepType | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    userCode: string;
    avatarUrl?: string | null;
    department?: { id: string; name: string };
    jobTitle?: { name: string };
    manager?: { id: string; fullName: string };
  };
  leaveType?: ApiLeaveType;
  approvals?: ApiLeaveRequestApproval[];
}

// ─── Params ──────────────────────────────────────────────────

export interface ListLeaveRequestsParams {
  userId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedLeaveRequests {
  items: ApiLeaveRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ListBalancesParams {
  userId?: string;
  leaveTypeId?: string;
  year?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedBalances {
  items: ApiLeaveBalance[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Leave Types ─────────────────────────────────────────────

export async function listLeaveTypes(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<{
  items: ApiLeaveType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  return api.get("/leave/types", { params: params as Record<string, string> });
}

export async function getLeaveTypeOptions(): Promise<ApiLeaveType[]> {
  return api.get<ApiLeaveType[]>("/leave/types/options");
}

export async function getLeaveTypeById(id: string): Promise<ApiLeaveType> {
  return api.get<ApiLeaveType>(`/leave/types/${id}`);
}

export async function createLeaveType(
  payload: Partial<ApiLeaveType>,
): Promise<ApiLeaveType> {
  return api.post<ApiLeaveType>("/leave/types", payload);
}

export async function updateLeaveType(
  id: string,
  payload: Partial<ApiLeaveType>,
): Promise<ApiLeaveType> {
  return api.patch<ApiLeaveType>(`/leave/types/${id}`, payload);
}

// ─── Leave Balances ───────────────────────────────────────────

export async function getMyBalances(): Promise<ApiLeaveBalance[]> {
  return api.get<ApiLeaveBalance[]>("/leave/balances/me");
}

export async function listBalances(
  params?: ListBalancesParams,
): Promise<PaginatedBalances> {
  return api.get<PaginatedBalances>("/leave/balances", {
    params: params as Record<string, string>,
  });
}

export async function getUserBalances(
  userId: string,
): Promise<ApiLeaveBalance[]> {
  return api.get<ApiLeaveBalance[]>(`/leave/balances/user/${userId}`);
}

export async function upsertBalance(payload: {
  userId: string;
  leaveTypeId: string;
  year: number;
  entitledDays: number;
  carriedDays?: number;
}): Promise<ApiLeaveBalance> {
  return api.put<ApiLeaveBalance>("/leave/balances", payload);
}

export async function initUserBalances(
  userId: string,
  year: number,
): Promise<ApiLeaveBalance[]> {
  return api.post<ApiLeaveBalance[]>(`/leave/balances/init/${userId}/${year}`);
}

export async function adjustBalance(
  userId: string,
  leaveTypeId: string,
  year: number,
  payload: { adjustedDays: number; notes: string }, // backend validation requires notes
): Promise<ApiLeaveBalance> {
  return api.patch<ApiLeaveBalance>(
    `/leave/balances/${userId}/${leaveTypeId}/${year}/adjust`,
    payload,
  );
}

// ─── Leave Requests ───────────────────────────────────────────

export async function listRequests(
  params?: ListLeaveRequestsParams,
): Promise<PaginatedLeaveRequests> {
  return api.get<PaginatedLeaveRequests>("/leave/requests", {
    params: params as Record<string, string>,
  });
}

export async function createRequest(payload: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
  reason?: string;
}): Promise<ApiLeaveRequest> {
  return api.post<ApiLeaveRequest>("/leave/requests", payload);
}

export async function getRequestById(id: string): Promise<ApiLeaveRequest> {
  return api.get<ApiLeaveRequest>(`/leave/requests/${id}`);
}

export async function cancelRequest(
  id: string,
  reason?: string,
): Promise<ApiLeaveRequest> {
  return api.post<ApiLeaveRequest>(`/leave/requests/${id}/cancel`, { reason });
}

export async function approveRequest(
  id: string,
  note?: string,
): Promise<ApiLeaveRequest> {
  // Backend expects: { comment?: string }
  return api.post<ApiLeaveRequest>(`/leave/requests/${id}/approve`, {
    comment: note ?? null,
  });
}

export async function rejectRequest(
  id: string,
  note?: string,
): Promise<ApiLeaveRequest> {
  // Backend expects: { rejectionReason: string (min 5 chars) }
  const rejectionReason =
    note && note.trim().length >= 5
      ? note.trim()
      : note?.trim() || "Không được duyệt bởi HR/Quản lý";
  return api.post<ApiLeaveRequest>(`/leave/requests/${id}/reject`, {
    rejectionReason,
  });
}

// ─── Pending Approvals ────────────────────────────────────────

export async function getMyPendingApprovals(): Promise<ApiLeaveRequest[]> {
  return api.get<ApiLeaveRequest[]>("/leave/approvals/pending");
}
