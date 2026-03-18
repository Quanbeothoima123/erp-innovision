// ============================================================
// ATTENDANCE SERVICE — Module 4
// Endpoints: /api/attendance/*
// ============================================================

import { api } from "../apiClient";

// ─── Types ───────────────────────────────────────────────────

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LEAVE"
  | "HOLIDAY"
  | "MANUAL_ADJUSTED";
export type AttendanceRequestType = "CHECK_IN" | "CHECK_OUT";
export type AttendanceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ShiftType =
  | "MORNING"
  | "AFTERNOON"
  | "NIGHT"
  | "FLEXIBLE"
  | "SPLIT";

export interface ApiAttendanceRecord {
  id: string;
  userId?: string;
  workDate: string;
  shiftId?: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  totalWorkMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  note: string | null;
  user?: { id: string; fullName: string; userCode: string } | null;
  shift?: { id: string; name: string } | null;
}

export interface ApiAttendanceRequest {
  id: string;
  userId?: string;
  // Backend mapper returns requestType/requestedAt/workDate
  requestType?: AttendanceRequestType;
  requestedAt?: string;
  workDate?: string;
  // Legacy mock field aliases (kept for mock mode)
  type?: AttendanceRequestType;
  requestedTime?: string;
  note: string | null;
  status: AttendanceRequestStatus;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; userCode: string } | null;
  reviewer?: { id: string; fullName: string } | null;
  reviewer?: { id: string; fullName: string } | null;
}

export interface ApiWorkShift {
  id: string;
  name: string;
  code: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workMinutes?: number;
  isActive: boolean;
  description: string | null;
  // So NV dang o ca nay
  _count?: { members: number };
}

export interface ShiftMember {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  department?: { name: string } | null;
  jobTitle?: { name: string } | null;
  employmentStatus: string;
  accountStatus: string;
  assignmentId: string;
  effectiveFrom: string;
}

export interface AssignShiftPayload {
  userId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  dayOfWeek?: number | null;
  notes?: string | null;
}

export interface ApiHoliday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  description: string | null;
}

export interface MonthlyStats {
  year: number;
  month: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkMinutes: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
}

// ─── Params ──────────────────────────────────────────────────

export interface ListAttendanceParams {
  userId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListRequestsParams {
  userId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// FIX: Backend paginatedResponse trả về { items, pagination } không phải { data, meta }
export interface PaginatedRecords {
  items: ApiAttendanceRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginatedRequests {
  items: ApiAttendanceRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── My Attendance ───────────────────────────────────────────

export async function getMyAttendance(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedRecords> {
  return api.get<PaginatedRecords>("/attendance/my", {
    params: params as Record<string, string>,
  });
}

export async function getMyMonthlyStats(
  year: number,
  month: number,
): Promise<MonthlyStats> {
  return api.get<MonthlyStats>(`/attendance/my/stats/${year}/${month}`);
}

// ─── Attendance Requests ─────────────────────────────────────

export async function listRequests(
  params?: ListRequestsParams,
): Promise<PaginatedRequests> {
  return api.get<PaginatedRequests>("/attendance/requests", {
    params: params as Record<string, string>,
  });
}

export async function createRequest(payload: {
  type: AttendanceRequestType;
  requestedTime: string;
  workDate?: string;
  shiftId?: string | null;
  isRemoteWork?: boolean;
  reason?: string;
}): Promise<ApiAttendanceRequest> {
  // Backend expects: requestType, requestedAt, workDate (required)
  const now = new Date(payload.requestedTime);
  const workDate = payload.workDate ?? now.toISOString().split("T")[0];
  return api.post<ApiAttendanceRequest>("/attendance/requests", {
    requestType: payload.type,
    requestedAt: payload.requestedTime,
    workDate,
    shiftId: payload.shiftId ?? null,
    isRemoteWork: payload.isRemoteWork ?? false,
    note: payload.reason ?? null,
  });
}

export async function getRequestById(
  id: string,
): Promise<ApiAttendanceRequest> {
  return api.get<ApiAttendanceRequest>(`/attendance/requests/${id}`);
}

export async function approveRequest(
  id: string,
  reviewNote?: string,
): Promise<ApiAttendanceRequest> {
  // Backend schema: { note?: string }
  return api.post<ApiAttendanceRequest>(`/attendance/requests/${id}/approve`, {
    note: reviewNote ?? null,
  });
}

export async function rejectRequest(
  id: string,
  reviewNote?: string,
): Promise<ApiAttendanceRequest> {
  // Backend schema: { rejectReason: string (min 5 chars, required) }
  return api.post<ApiAttendanceRequest>(`/attendance/requests/${id}/reject`, {
    rejectReason: reviewNote ?? "Không được duyệt",
  });
}

// ─── Attendance Records ───────────────────────────────────────

export async function listRecords(
  params?: ListAttendanceParams,
): Promise<PaginatedRecords> {
  return api.get<PaginatedRecords>("/attendance/records", {
    params: params as Record<string, string>,
  });
}

export async function getRecordById(id: string): Promise<ApiAttendanceRecord> {
  return api.get<ApiAttendanceRecord>(`/attendance/records/${id}`);
}

export async function manualAdjust(payload: {
  userId: string;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  status?: AttendanceStatus;
  shiftId?: string;
  note?: string;
}): Promise<ApiAttendanceRecord> {
  return api.post<ApiAttendanceRecord>("/attendance/records/adjust", payload);
}

export async function updateRecord(
  id: string,
  payload: Partial<{
    checkInAt: string;
    checkOutAt: string;
    status: AttendanceStatus;
    note: string;
  }>,
): Promise<ApiAttendanceRecord> {
  return api.patch<ApiAttendanceRecord>(`/attendance/records/${id}`, payload);
}

export async function deleteRecord(id: string): Promise<void> {
  return api.delete(`/attendance/records/${id}`);
}

// ─── Work Shifts ─────────────────────────────────────────────

export async function listShifts(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  items: ApiWorkShift[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  return api.get("/attendance/shifts", {
    params: params as Record<string, string>,
  });
}

export async function getShiftOptions(): Promise<ApiWorkShift[]> {
  return api.get<ApiWorkShift[]>("/attendance/shifts/options");
}

export async function getShiftById(id: string): Promise<ApiWorkShift> {
  return api.get<ApiWorkShift>(`/attendance/shifts/${id}`);
}

export async function createShift(
  payload: Partial<ApiWorkShift>,
): Promise<ApiWorkShift> {
  return api.post<ApiWorkShift>("/attendance/shifts", payload);
}

export async function updateShift(
  id: string,
  payload: Partial<ApiWorkShift>,
): Promise<ApiWorkShift> {
  return api.patch<ApiWorkShift>(`/attendance/shifts/${id}`, payload);
}

export async function deleteShift(id: string): Promise<void> {
  return api.delete(`/attendance/shifts/${id}`);
}

export async function getUserWorkShifts(
  userId: string,
): Promise<ApiWorkShift[]> {
  return api.get<ApiWorkShift[]>(`/attendance/shifts/user/${userId}`);
}

// ─── Holidays ────────────────────────────────────────────────

export async function listHolidays(params?: {
  year?: number;
  page?: number;
  limit?: number;
}): Promise<{
  items: ApiHoliday[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  return api.get("/attendance/holidays", {
    params: params as Record<string, string>,
  });
}

export async function getHolidayById(id: string): Promise<ApiHoliday> {
  return api.get<ApiHoliday>(`/attendance/holidays/${id}`);
}

export async function createHoliday(
  payload: Partial<ApiHoliday>,
): Promise<ApiHoliday> {
  return api.post<ApiHoliday>("/attendance/holidays", payload);
}

export async function updateHoliday(
  id: string,
  payload: Partial<ApiHoliday>,
): Promise<ApiHoliday> {
  return api.patch<ApiHoliday>(`/attendance/holidays/${id}`, payload);
}

export async function deleteHoliday(id: string): Promise<void> {
  return api.delete(`/attendance/holidays/${id}`);
}

// Lay danh sach nhan vien trong ca
export async function getShiftMembers(shiftId: string): Promise<ShiftMember[]> {
  return api.get<ShiftMember[]>(`/attendance/shifts/${shiftId}/members`);
}

// Gan ca cho nhan vien
export async function assignUserShift(
  payload: AssignShiftPayload,
): Promise<{ id: string }> {
  return api.post("/attendance/shifts/assign", payload);
}

// Xoa gan ca
export async function removeUserShift(assignmentId: string): Promise<void> {
  return api.delete(`/attendance/user-shifts/${assignmentId}`);
}
