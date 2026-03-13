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

export interface PaginatedUsers {
  data: ApiUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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

export interface UserProfile {
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  nationalIdNumber?: string;
  taxCode?: string;
  socialInsuranceNumber?: string;
  healthInsuranceNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRel?: string;
  dependantCount?: number;
  educationLevel?: string;
  educationMajor?: string;
  university?: string;
}

export interface UserStats {
  total: number;
  active: number;
  probation: number;
  onLeave: number;
  terminated: number;
  pending: number;
  newThisMonth: number;
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
