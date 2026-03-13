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
  userId: string;
  workDate: string;
  shiftId: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  totalWorkMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  note: string | null;
  user?: { id: string; fullName: string; userCode: string };
  shift?: { id: string; name: string } | null;
}

export interface ApiAttendanceRequest {
  id: string;
  userId: string;
  type: AttendanceRequestType;
  requestedTime: string;
  reason: string | null;
  status: AttendanceRequestStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; userCode: string };
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
  isActive: boolean;
  description: string | null;
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

export interface PaginatedRecords {
  data: ApiAttendanceRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaginatedRequests {
  data: ApiAttendanceRequest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
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
  reason?: string;
}): Promise<ApiAttendanceRequest> {
  return api.post<ApiAttendanceRequest>("/attendance/requests", payload);
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
  return api.post<ApiAttendanceRequest>(`/attendance/requests/${id}/approve`, {
    reviewNote,
  });
}

export async function rejectRequest(
  id: string,
  reviewNote?: string,
): Promise<ApiAttendanceRequest> {
  return api.post<ApiAttendanceRequest>(`/attendance/requests/${id}/reject`, {
    reviewNote,
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
  data: ApiWorkShift[];
  meta: { total: number; page: number; limit: number; totalPages: number };
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

export async function assignUserShift(payload: {
  userId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<void> {
  return api.post("/attendance/shifts/assign", payload);
}

// ─── Holidays ────────────────────────────────────────────────

export async function listHolidays(params?: {
  year?: number;
  page?: number;
  limit?: number;
}): Promise<{
  data: ApiHoliday[];
  meta: { total: number; page: number; limit: number; totalPages: number };
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
