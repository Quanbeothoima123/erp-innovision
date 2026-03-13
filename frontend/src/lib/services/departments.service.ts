// ============================================================
// DEPARTMENTS SERVICE — Module 3
// Endpoints: /api/departments/*
// ============================================================

import { api } from "../apiClient";

export interface ApiDepartment {
  id: string;
  name: string;
  description: string;
  headUserId: string | null;
  isActive: boolean;
  headUser?: { id: string; fullName: string } | null;
  _count?: { members: number };
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface ListDepartmentsParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// FIX: Backend paginatedResponse trả về { items, pagination } không phải { data, meta }
export interface PaginatedDepartments {
  items: ApiDepartment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  headUserId?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  headUserId?: string | null;
  isActive?: boolean;
}

export async function listDepartments(
  params?: ListDepartmentsParams,
): Promise<PaginatedDepartments> {
  return api.get<PaginatedDepartments>("/departments", {
    params: params as Record<string, string>,
  });
}

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  return api.get<DepartmentOption[]>("/departments/options");
}

export async function getDepartmentById(id: string): Promise<ApiDepartment> {
  return api.get<ApiDepartment>(`/departments/${id}`);
}

export async function getDepartmentMembers(
  id: string,
): Promise<import("./users.service").ApiUser[]> {
  return api.get(`/departments/${id}/members`);
}

export async function createDepartment(
  payload: CreateDepartmentPayload,
): Promise<ApiDepartment> {
  return api.post<ApiDepartment>("/departments", payload);
}

export async function updateDepartment(
  id: string,
  payload: UpdateDepartmentPayload,
): Promise<ApiDepartment> {
  return api.patch<ApiDepartment>(`/departments/${id}`, payload);
}

export async function deleteDepartment(id: string): Promise<void> {
  return api.delete(`/departments/${id}`);
}
