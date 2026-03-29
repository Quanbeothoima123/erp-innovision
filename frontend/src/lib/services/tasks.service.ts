// ============================================================
// TASKS SERVICE — Module 9
// Endpoints: /api/tasks/*
// ============================================================

import { api } from "../apiClient";

// ─── Enums ────────────────────────────────────────────────────

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// ─── DTOs ──────────────────────────────────────────────────────

export interface ApiUserBrief {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  userCode: string | null;
}

export interface ApiProjectBrief {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

export interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  sourceMessage: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  completedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  project: ApiProjectBrief | null;
  assignedTo: ApiUserBrief | null;
  createdBy: ApiUserBrief;

  commentCount?: number;
  comments?: ApiTaskComment[];
}

export interface ApiTaskComment {
  id: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: ApiUserBrief;
}

export interface ApiTaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  completedThisWeek: number;
  [key: string]: unknown;
}

export type Paginated<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// ─── Params ──────────────────────────────────────────────────

export interface ListTasksParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assignedToUserId?: string;
  deadlineFilter?: "overdue" | "today" | "this_week" | "upcoming";
  search?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
}

// ─── Tasks CRUD ────────────────────────────────────────────────

export async function listTasks(
  params?: ListTasksParams,
): Promise<Paginated<ApiTask>> {
  return api.get<Paginated<ApiTask>>("/tasks", {
    params: params as Record<string, string>,
  });
}

export async function getMyTasks(
  params?: ListTasksParams,
): Promise<Paginated<ApiTask>> {
  return api.get<Paginated<ApiTask>>("/tasks/my", {
    params: params as Record<string, string>,
  });
}

export async function getTaskById(id: string): Promise<ApiTask> {
  return api.get<ApiTask>(`/tasks/${id}`);
}

export async function getTaskStats(): Promise<ApiTaskStats> {
  return api.get<ApiTaskStats>("/tasks/stats");
}

export async function createTask(payload: {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: TaskPriority;
  sourceMessage?: string | null;
  projectId?: string | null;
  assignedToUserId?: string | null;
  estimatedHours?: number | null;
}): Promise<ApiTask> {
  return api.post<ApiTask>("/tasks", payload);
}

export async function updateTask(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    deadline?: string | null;
    priority?: TaskPriority;
    sourceMessage?: string | null;
    projectId?: string | null;
    estimatedHours?: number | null;
  },
): Promise<ApiTask> {
  return api.patch<ApiTask>(`/tasks/${id}`, payload);
}

export async function assignTask(
  id: string,
  payload: { assignedToUserId: string | null },
): Promise<ApiTask> {
  return api.patch<ApiTask>(`/tasks/${id}/assign`, payload);
}

export async function updateTaskStatus(
  id: string,
  payload: { status: TaskStatus; actualHours?: number | null },
): Promise<ApiTask> {
  return api.patch<ApiTask>(`/tasks/${id}/status`, payload);
}

export async function completeTask(
  id: string,
  payload: { actualHours?: number | null; completionNote?: string | null },
): Promise<ApiTask> {
  return api.patch<ApiTask>(`/tasks/${id}/complete`, payload);
}

export async function cancelTask(id: string): Promise<ApiTask> {
  return api.patch<ApiTask>(`/tasks/${id}/cancel`);
}

export async function deleteTask(id: string): Promise<void> {
  return api.delete(`/tasks/${id}`);
}

// ─── Comments ──────────────────────────────────────────────────

export async function getComments(taskId: string): Promise<ApiTaskComment[]> {
  return api.get<ApiTaskComment[]>(`/tasks/${taskId}/comments`);
}

export async function addComment(
  taskId: string,
  payload: { content: string },
): Promise<ApiTaskComment> {
  return api.post<ApiTaskComment>(`/tasks/${taskId}/comments`, payload);
}

export async function updateComment(
  taskId: string,
  commentId: string,
  payload: { content: string },
): Promise<ApiTaskComment> {
  return api.patch<ApiTaskComment>(
    `/tasks/${taskId}/comments/${commentId}`,
    payload,
  );
}

export async function deleteComment(
  taskId: string,
  commentId: string,
): Promise<void> {
  return api.delete(`/tasks/${taskId}/comments/${commentId}`);
}
