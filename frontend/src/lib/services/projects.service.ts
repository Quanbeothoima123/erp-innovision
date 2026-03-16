// ============================================================
// PROJECTS SERVICE — Module 8
// Endpoints: /api/projects/*
// ============================================================

import { api } from "../apiClient";

// ─── Enums ────────────────────────────────────────────────────

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectHealthStatus = "ON_TRACK" | "AT_RISK" | "DELAYED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";
export type ExpenseCategory =
  | "LABOR"
  | "SOFTWARE"
  | "HARDWARE"
  | "TRAVEL"
  | "TRAINING"
  | "SUBCONTRACT"
  | "OTHER";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
export type AssignmentStatus = "ACTIVE" | "ENDED";

// ─── DTOs ──────────────────────────────────────────────────────

export interface ApiProject {
  id: string;
  projectCode: string | null;
  projectName: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  healthStatus: ProjectHealthStatus | null;
  progressPercent: number;
  startDate: string | null;
  endDate: string | null;
  actualEndDate: string | null;
  budgetAmount: number | null;
  spentAmount: number;
  currency: string;
  budgetUsedPercent: number | null;
  contractValue: number | null;
  invoicedAmount: number;
  receivedAmount: number;
  projectManager: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  client: { id: string; companyName: string; shortName?: string | null } | null;
  activeMemberCount: number;
  milestoneCount: number;
  approvedExpenseCount: number;
  closedAt: string | null;
  closureNote: string | null;
  createdAt: string;
  updatedAt: string;
  // Only in detail endpoint
  contract?: {
    id: string;
    contractCode: string;
    title: string;
    totalValue: number;
  } | null;
  assignments?: ApiAssignment[];
  milestones?: ApiMilestone[];
}

export interface ApiAssignment {
  id: string;
  user: {
    id: string;
    fullName: string;
    userCode: string;
    avatarUrl?: string | null;
  } | null;
  project?: { id: string; projectName: string } | null;
  roleInProject: string | null;
  allocationPercent: number | null;
  hourlyRate: number | null;
  joinedAt: string;
  leftAt: string | null;
  status: AssignmentStatus;
  isBillable: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMilestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  owner: { id: string; fullName: string } | null;
  dueDate: string | null;
  completedAt: string | null;
  status: MilestoneStatus;
  isOverdue: boolean;
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiExpense {
  id: string;
  project: { id: string; projectName: string } | null;
  submittedBy: { id: string; fullName: string; userCode: string } | null;
  approvedBy: { id: string; fullName: string } | null;
  category: ExpenseCategory;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  expenseDate: string;
  receiptUrl: string | null;
  status: ExpenseStatus;
  rejectReason: string | null;
  submittedAt: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiExpenseSummary {
  projectId: string | undefined;
  budgetAmount: number | null;
  spentAmount: number;
  budgetUsedPercent: number | null;
  currency: string;
  totalApproved: number;
  totalPending: number;
  categories: Record<
    string,
    {
      approved: number;
      pending: number;
      rejected: number;
      reimbursed: number;
      count: number;
    }
  >;
}

export interface ApiProjectHealth {
  projectId: string;
  projectName: string;
  healthStatus: ProjectHealthStatus | null;
  progressPercent: number;
  budgetUsedPercent: number | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  activeMemberCount: number;
  completedMilestones: number;
  totalMilestones: number;
  overdueMilestones: number;
  notes: string | null;
  updatedAt: string | null;
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

// ─── List params ───────────────────────────────────────────────

export interface ListProjectsParams {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  healthStatus?: ProjectHealthStatus;
  clientId?: string;
  managerId?: string;
  myProjects?: boolean;
  page?: number;
  limit?: number;
  sortBy?:
    | "startDate"
    | "endDate"
    | "createdAt"
    | "projectName"
    | "spentAmount";
  sortOrder?: "asc" | "desc";
}

export interface ListExpensesParams {
  projectId?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ─── Projects CRUD ─────────────────────────────────────────────

export async function listProjects(
  params?: ListProjectsParams,
): Promise<Paginated<ApiProject>> {
  return api.get<Paginated<ApiProject>>("/projects", {
    params: params as Record<string, string>,
  });
}

export async function getMyProjects(): Promise<ApiProject[]> {
  return api.get<ApiProject[]>("/projects/my");
}

export async function createProject(payload: {
  projectName: string;
  projectCode?: string | null;
  description?: string | null;
  projectManagerUserId?: string | null;
  clientId?: string | null;
  contractId?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetAmount?: number | null;
  contractValue?: number | null;
  currency?: string;
}): Promise<ApiProject> {
  return api.post<ApiProject>("/projects", payload);
}

export async function getProjectById(id: string): Promise<ApiProject> {
  return api.get<ApiProject>(`/projects/${id}`);
}

export async function updateProject(
  id: string,
  payload: Partial<Parameters<typeof createProject>[0]>,
): Promise<ApiProject> {
  return api.patch<ApiProject>(`/projects/${id}`, payload);
}

export async function updateHealth(
  id: string,
  payload: {
    healthStatus?: ProjectHealthStatus;
    progressPercent?: number;
    notes?: string | null;
  },
): Promise<ApiProject> {
  return api.patch<ApiProject>(`/projects/${id}/health`, payload);
}

export async function autoComputeHealth(id: string): Promise<ApiProjectHealth> {
  return api.post<ApiProjectHealth>(`/projects/${id}/compute-health`);
}

export async function getProjectHealth(id: string): Promise<ApiProjectHealth> {
  return api.get<ApiProjectHealth>(`/projects/${id}/health`);
}

export async function closeProject(
  id: string,
  payload: {
    status: "COMPLETED" | "CANCELLED" | "ARCHIVED";
    actualEndDate?: string | null;
    closureNote?: string | null;
  },
): Promise<ApiProject> {
  return api.post<ApiProject>(`/projects/${id}/close`, payload);
}

export async function reopenProject(id: string): Promise<ApiProject> {
  return api.post<ApiProject>(`/projects/${id}/reopen`);
}

// ─── Members ───────────────────────────────────────────────────

export async function getProjectMembers(
  id: string,
  params?: { includeEnded?: boolean },
): Promise<ApiAssignment[]> {
  return api.get<ApiAssignment[]>(`/projects/${id}/members`, {
    params: params as Record<string, string>,
  });
}

export async function assignMember(
  id: string,
  payload: {
    userId: string;
    roleInProject?: string | null;
    allocationPercent?: number | null;
    hourlyRate?: number | null;
    joinedAt: string;
    isBillable?: boolean;
    notes?: string | null;
  },
): Promise<ApiAssignment> {
  return api.post<ApiAssignment>(`/projects/${id}/members`, payload);
}

export async function updateAssignment(
  id: string,
  assignmentId: string,
  payload: {
    roleInProject?: string | null;
    allocationPercent?: number | null;
    isBillable?: boolean;
    notes?: string | null;
  },
): Promise<ApiAssignment> {
  return api.patch<ApiAssignment>(
    `/projects/${id}/members/${assignmentId}`,
    payload,
  );
}

export async function endAssignment(
  id: string,
  assignmentId: string,
  payload: { leftAt: string; notes?: string | null },
): Promise<ApiAssignment> {
  return api.post<ApiAssignment>(
    `/projects/${id}/members/${assignmentId}/end`,
    payload,
  );
}

// ─── Milestones ────────────────────────────────────────────────

export async function getMilestones(
  id: string,
  params?: { status?: MilestoneStatus; overdueOnly?: boolean },
): Promise<ApiMilestone[]> {
  return api.get<ApiMilestone[]>(`/projects/${id}/milestones`, {
    params: params as Record<string, string>,
  });
}

export async function createMilestone(
  id: string,
  payload: {
    name: string;
    description?: string | null;
    ownerUserId?: string | null;
    dueDate?: string | null;
    status?: MilestoneStatus;
  },
): Promise<ApiMilestone> {
  return api.post<ApiMilestone>(`/projects/${id}/milestones`, payload);
}

export async function updateMilestone(
  id: string,
  milestoneId: string,
  payload: Partial<{
    name: string;
    description: string | null;
    ownerUserId: string | null;
    dueDate: string | null;
    status: MilestoneStatus;
  }>,
): Promise<ApiMilestone> {
  return api.patch<ApiMilestone>(
    `/projects/${id}/milestones/${milestoneId}`,
    payload,
  );
}

export async function deleteMilestone(
  id: string,
  milestoneId: string,
): Promise<void> {
  return api.delete(`/projects/${id}/milestones/${milestoneId}`);
}

// ─── Expenses ──────────────────────────────────────────────────

export async function listExpenses(
  params?: ListExpensesParams,
): Promise<Paginated<ApiExpense>> {
  return api.get<Paginated<ApiExpense>>("/projects/expenses", {
    params: params as Record<string, string>,
  });
}

export async function getProjectExpenses(
  id: string,
  params?: {
    category?: ExpenseCategory;
    status?: ExpenseStatus;
    page?: number;
    limit?: number;
  },
): Promise<Paginated<ApiExpense>> {
  return api.get<Paginated<ApiExpense>>(`/projects/${id}/expenses`, {
    params: params as Record<string, string>,
  });
}

export async function getExpenseSummary(
  id: string,
): Promise<ApiExpenseSummary> {
  return api.get<ApiExpenseSummary>(`/projects/${id}/expenses/summary`);
}

export async function createExpense(
  id: string,
  payload: {
    category: ExpenseCategory;
    title: string;
    description?: string | null;
    amount: number;
    currency?: string;
    expenseDate: string;
    receiptUrl?: string | null;
  },
): Promise<ApiExpense> {
  return api.post<ApiExpense>(`/projects/${id}/expenses`, payload);
}

export async function approveExpense(
  id: string,
  expenseId: string,
  notes?: string | null,
): Promise<ApiExpense> {
  return api.post<ApiExpense>(`/projects/${id}/expenses/${expenseId}/approve`, {
    notes: notes ?? null,
  });
}

/** rejectReason — bắt buộc, min 5 chars */
export async function rejectExpense(
  id: string,
  expenseId: string,
  rejectReason: string,
): Promise<ApiExpense> {
  const safe =
    rejectReason.trim().length >= 5
      ? rejectReason.trim()
      : rejectReason.trim().padEnd(5, ".");
  return api.post<ApiExpense>(`/projects/${id}/expenses/${expenseId}/reject`, {
    rejectReason: safe,
  });
}

export async function reimburseExpense(
  id: string,
  expenseId: string,
): Promise<ApiExpense> {
  return api.post<ApiExpense>(
    `/projects/${id}/expenses/${expenseId}/reimburse`,
  );
}

export async function deleteExpense(
  id: string,
  expenseId: string,
): Promise<void> {
  return api.delete(`/projects/${id}/expenses/${expenseId}`);
}
