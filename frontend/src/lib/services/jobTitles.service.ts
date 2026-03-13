// ============================================================
// JOB TITLES SERVICE — Module 3
// Endpoints: /api/job-titles/*
// ============================================================

import { api } from "../apiClient";

export interface ApiJobTitle {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  _count?: { users: number };
}

export interface JobTitleOption {
  id: string;
  name: string;
  code: string;
}

export interface ListJobTitlesParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// FIX: Backend paginatedResponse trả về { items, pagination } không phải { data, meta }
export interface PaginatedJobTitles {
  items: ApiJobTitle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateJobTitlePayload {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateJobTitlePayload {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export async function listJobTitles(
  params?: ListJobTitlesParams,
): Promise<PaginatedJobTitles> {
  return api.get<PaginatedJobTitles>("/job-titles", {
    params: params as Record<string, string>,
  });
}

export async function getJobTitleOptions(): Promise<JobTitleOption[]> {
  return api.get<JobTitleOption[]>("/job-titles/options");
}

export async function getJobTitleById(id: string): Promise<ApiJobTitle> {
  return api.get<ApiJobTitle>(`/job-titles/${id}`);
}

export async function createJobTitle(
  payload: CreateJobTitlePayload,
): Promise<ApiJobTitle> {
  return api.post<ApiJobTitle>("/job-titles", payload);
}

export async function updateJobTitle(
  id: string,
  payload: UpdateJobTitlePayload,
): Promise<ApiJobTitle> {
  return api.patch<ApiJobTitle>(`/job-titles/${id}`, payload);
}

export async function deleteJobTitle(id: string): Promise<void> {
  return api.delete(`/job-titles/${id}`);
}
