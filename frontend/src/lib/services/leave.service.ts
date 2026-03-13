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
  userId: string;
  leaveTypeId: string;
  year: number;
  entitledDays: number;
  carriedDays: number;
  adjustedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  leaveType?: ApiLeaveType;
  user?: { id: string; fullName: string; userCode: string };
}

export interface ApiLeaveRequestApproval {
  id: string;
  leaveRequestId: string;
  stepType: ApprovalStepType;
  approverId: string;
  status: ApprovalStatus;
  note: string | null;
  actedAt: string | null;
  approver?: { id: string; fullName: string };
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
    departmentId: string;
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
  data: ApiLeaveRequest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListBalancesParams {
  userId?: string;
  leaveTypeId?: string;
  year?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedBalances {
  data: ApiLeaveBalance[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Leave Types ─────────────────────────────────────────────

export async function listLeaveTypes(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<{ data: ApiLeaveType[] }> {
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
  payload: { adjustedDays: number; reason?: string },
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
  return api.post<ApiLeaveRequest>(`/leave/requests/${id}/approve`, { note });
}

export async function rejectRequest(
  id: string,
  note?: string,
): Promise<ApiLeaveRequest> {
  return api.post<ApiLeaveRequest>(`/leave/requests/${id}/reject`, { note });
}

// ─── Pending Approvals ────────────────────────────────────────

export async function getMyPendingApprovals(): Promise<ApiLeaveRequest[]> {
  return api.get<ApiLeaveRequest[]>("/leave/approvals/pending");
}
