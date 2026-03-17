// ============================================================
// USERS SERVICE — Module 2
// Endpoints: /api/users/*
// ============================================================

import { api } from "../apiClient";
import type { ApiUser } from "./auth.service";

// ─── Request / Response types ────────────────────────────────

export interface ListUsersParams {
  search?: string;
  departmentId?: string;
  jobTitleId?: string;
  employmentStatus?: string;
  accountStatus?: string;
  role?: string;
  hireDateFrom?: string;
  hireDateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// FIX: Backend paginatedResponse trả về { items, pagination } không phải { data, meta }
export interface PaginatedUsers {
  items: ApiUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  departmentId: string;
  jobTitleId: string;
  managerId?: string | null;
  hireDate: string;
  employmentStatus?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  phoneNumber?: string;
  departmentId?: string;
  jobTitleId?: string;
  managerId?: string | null;
  hireDate?: string;
  employmentStatus?: string;
  avatarUrl?: string;
}

export interface UpdateMePayload {
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface UpdateAccountStatusPayload {
  accountStatus: "ACTIVE" | "LOCKED" | "DISABLED";
  reason?: string;
}

export interface TerminateUserPayload {
  terminatedAt?: string;
  reason?: string;
}

/** Khớp 1:1 với toProfileDto trong users.mapper.js */
export interface UserProfile {
  id?: string;
  userId: string;
  // Thông tin cá nhân
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED" | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  ethnicity?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  city?: string | null;
  province?: string | null;
  // CMND / Hộ chiếu
  nationalIdNumber?: string | null;
  nationalIdIssueDate?: string | null;
  nationalIdIssuePlace?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  // Thuế & Bảo hiểm
  taxCode?: string | null;
  socialInsuranceNumber?: string | null;
  healthInsuranceNumber?: string | null;
  healthInsuranceExpiry?: string | null;
  // Ngân hàng
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  // Liên hệ khẩn cấp
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRel?: string | null;
  // Khác
  dependantCount?: number | null;
  educationLevel?: string | null;
  educationMajor?: string | null;
  university?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// FIX: Map đúng theo những gì backend getUserStats thực sự trả về
// Backend trả: { total, byEmployment: [{employmentStatus, _count:{id}}], byAccount: [...] }
export interface UserStats {
  total: number;
  byEmployment: Array<{ employmentStatus: string; _count: { id: number } }>;
  byAccount: Array<{ accountStatus: string; _count: { id: number } }>;
}

// ─── Users API ───────────────────────────────────────────────

/** GET /api/users — danh sách nhân viên (phân trang) */
export async function listUsers(
  params?: ListUsersParams,
): Promise<PaginatedUsers> {
  return api.get<PaginatedUsers>("/users", {
    params: params as Record<string, string>,
  });
}

/** GET /api/users/stats */
export async function getUserStats(): Promise<UserStats> {
  return api.get<UserStats>("/users/stats");
}

/** GET /api/users/roles */
export async function listRoles(): Promise<string[]> {
  return api.get<string[]>("/users/roles");
}

/** GET /api/users/me */
export async function getMe(): Promise<ApiUser> {
  return api.get<ApiUser>("/users/me");
}

/** PATCH /api/users/me */
export async function updateMe(payload: UpdateMePayload): Promise<ApiUser> {
  return api.patch<ApiUser>("/users/me", payload);
}

/** GET /api/users/me/profile */
export async function getMyProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/users/me/profile");
}

/** PUT /api/users/me/profile */
export async function updateMyProfile(
  payload: Partial<UserProfile>,
): Promise<UserProfile> {
  return api.put<UserProfile>("/users/me/profile", payload);
}

/** POST /api/users — tạo nhân viên mới */
export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  return api.post<ApiUser>("/users", payload);
}

/** GET /api/users/:id */
export async function getUserById(id: string): Promise<ApiUser> {
  return api.get<ApiUser>(`/users/${id}`);
}

/** PATCH /api/users/:id */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<ApiUser> {
  return api.patch<ApiUser>(`/users/${id}`, payload);
}

/** PUT /api/users/:id/roles */
export async function updateUserRoles(
  id: string,
  payload: UpdateRolesPayload,
): Promise<ApiUser> {
  return api.put<ApiUser>(`/users/${id}/roles`, payload);
}

/** PATCH /api/users/:id/status */
export async function updateAccountStatus(
  id: string,
  payload: UpdateAccountStatusPayload,
): Promise<ApiUser> {
  return api.patch<ApiUser>(`/users/${id}/status`, payload);
}

/** POST /api/users/:id/terminate */
export async function terminateUser(
  id: string,
  payload?: TerminateUserPayload,
): Promise<ApiUser> {
  return api.post<ApiUser>(`/users/${id}/terminate`, payload ?? {});
}

/** POST /api/users/:id/resend-setup-email */
export async function resendSetupEmail(id: string): Promise<void> {
  return api.post(`/users/${id}/resend-setup-email`);
}

/** GET /api/users/:id/profile */
export async function getUserProfile(id: string): Promise<UserProfile> {
  return api.get<UserProfile>(`/users/${id}/profile`);
}

/** PUT /api/users/:id/profile */
export async function updateUserProfile(
  id: string,
  payload: Partial<UserProfile>,
): Promise<UserProfile> {
  return api.put<UserProfile>(`/users/${id}/profile`, payload);
}

// ─── Work Shifts ─────────────────────────────────────────────

export interface ApiWorkShiftRecord {
  id: string;
  userId: string;
  shiftId: string;
  dayOfWeek: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shift: {
    id: string;
    code: string;
    name: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workMinutes: number;
    isNightShift: boolean;
    overtimeAfterMinutes: number;
  } | null;
}

/** GET /api/users/:id/work-shifts — lịch sử ca làm việc */
export async function getUserWorkShifts(
  id: string,
): Promise<ApiWorkShiftRecord[]> {
  return api.get<ApiWorkShiftRecord[]>(`/users/${id}/work-shifts`);
}

// ─── Audit Logs ───────────────────────────────────────────────

export interface ApiAuditLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorUserId: string | null;
  actorUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    userCode: string;
  } | null;
  description: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  entityType?: string;
  actionType?: string;
  mode?: "about" | "by" | "all";
}

export interface PaginatedAuditLogs {
  items: ApiAuditLogRecord[];
  logs?: ApiAuditLogRecord[]; // alias từ backend
  pagination: { total: number; page: number; limit: number };
  total?: number; // alias từ backend
}

/** GET /api/users/:id/audit-logs — nhật ký hoạt động (chỉ HR/Admin) */
export async function getUserAuditLogs(
  id: string,
  params?: AuditLogParams,
): Promise<PaginatedAuditLogs> {
  return api.get<PaginatedAuditLogs>(`/users/${id}/audit-logs`, {
    params: params as Record<string, string>,
  });
}
