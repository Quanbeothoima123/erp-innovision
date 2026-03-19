// ============================================================
// PAYROLL SERVICE — Module 7
// Endpoints: /api/payroll/*
// ============================================================

import { api } from "../apiClient";

// ─── Enums / Types ────────────────────────────────────────────

export type PeriodStatus =
  | "DRAFT"
  | "CALCULATING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";
export type SalaryType = "MONTHLY" | "DAILY" | "HOURLY";
export type PayFrequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY";
export type ComponentType = "EARNING" | "DEDUCTION";
export type CalculationType = "FIXED" | "FORMULA" | "MANUAL";
export type AdjustmentType =
  | "BONUS"
  | "DEDUCTION"
  | "ADVANCE"
  | "REIMBURSEMENT";
export type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
export type RecordStatus = "DRAFT" | "APPROVED" | "PAID" | "VOID";

// ─── Response DTOs ────────────────────────────────────────────

export interface ApiPayrollPeriod {
  id: string;
  periodCode: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  payDate: string | null;
  status: PeriodStatus;
  workingDaysInPeriod: number | null;
  standardWorkingMinutes: number | null;
  approvedBy: { id: string; fullName: string } | null;
  approvedAt: string | null;
  paidAt: string | null;
  lockedAt: string | null;
  notes: string | null;
  recordCount: number;
  adjustmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCompensation {
  id: string;
  user?: { id: string; fullName: string; userCode: string } | null;
  salaryType: SalaryType;
  baseSalary: number;
  probationSalary: number | null;
  standardWorkingDays: number | null;
  standardWorkingHours: number | null;
  currency: string;
  payFrequency: PayFrequency;
  payDayOfMonth: number | null;
  probationEndDate: string | null;
  changeReason: string | null;
  overtimeRateWeekday: number;
  overtimeRateWeekend: number;
  overtimeRateHoliday: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSalaryComponent {
  id: string;
  code: string;
  name: string;
  componentType: ComponentType;
  calculationType: CalculationType;
  isTaxable: boolean;
  isInsurable: boolean;
  isActive: boolean;
  displayOrder: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUserSalaryComponent {
  id: string;
  userId: string;
  salaryComponent: ApiSalaryComponent | null;
  amount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export interface ApiAdjustment {
  id: string;
  user?: { id: string; fullName: string; userCode: string } | null;
  payrollPeriod?: {
    id: string;
    periodCode: string;
    month: number;
    year: number;
  } | null;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string | null;
  status: AdjustmentStatus;
  isAdvance: boolean;
  advanceRecoveredAmount: number;
  advanceFullyRecovered: boolean;
  createdBy?: { id: string; fullName: string } | null;
  approvedBy?: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRecordItem {
  id: string;
  salaryComponent?: ApiSalaryComponent | null;
  itemName: string;
  itemType: ComponentType;
  amount: number;
  sourceType: string;
  quantity: number | null;
  unitRate: number | null;
  notes: string | null;
}

export interface ApiPayrollRecord {
  id: string;
  user?: {
    id: string;
    fullName: string;
    userCode: string;
    departmentId?: string;
    department?: { name: string };
  } | null;
  payrollPeriod?: {
    id: string;
    periodCode: string;
    month: number;
    year: number;
  } | null;
  baseSalary: number;
  workingDays: number | null;
  paidLeaveDays: number | null;
  unpaidLeaveDays: number | null;
  absentDays: number | null;
  lateDays: number;
  overtimeWeekdayMinutes: number;
  overtimeWeekendMinutes: number;
  overtimeHolidayMinutes: number;
  totalOvertimePay: number;
  grossSalary: number;
  totalAllowances: number;
  totalBonus: number;
  socialInsuranceEmployee: number;
  healthInsuranceEmployee: number;
  unemploymentInsuranceEmployee: number;
  taxableIncome: number;
  personalIncomeTax: number;
  totalDeductions: number;
  netSalary: number;
  dailyRate: number | null;
  hourlyRate: number | null;
  status: RecordStatus;
  items: ApiRecordItem[];
  generatedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paymentRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Paginated wrappers ───────────────────────────────────────

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

// ─── Self-service ─────────────────────────────────────────────

/** Nhân viên xem cấu hình lương hiện tại của mình */
export async function getMyCompensation(): Promise<ApiCompensation> {
  return api.get<ApiCompensation>("/payroll/my/compensation");
}

/** Nhân viên xem phiếu lương 1 kỳ */
export async function getMyPayslip(
  payrollPeriodId: string,
): Promise<ApiPayrollRecord> {
  return api.get<ApiPayrollRecord>(`/payroll/my/payslip/${payrollPeriodId}`);
}

// ─── Payroll Periods ──────────────────────────────────────────

export async function listPeriods(params?: {
  status?: PeriodStatus;
  year?: number;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}): Promise<Paginated<ApiPayrollPeriod>> {
  return api.get<Paginated<ApiPayrollPeriod>>("/payroll/periods", {
    params: params as Record<string, string>,
  });
}

export async function createPeriod(payload: {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  payDate?: string | null;
  workingDaysInPeriod?: number | null;
  notes?: string | null;
}): Promise<ApiPayrollPeriod> {
  return api.post<ApiPayrollPeriod>("/payroll/periods", payload);
}

export async function getPeriodById(id: string): Promise<ApiPayrollPeriod> {
  return api.get<ApiPayrollPeriod>(`/payroll/periods/${id}`);
}

export async function updatePeriod(
  id: string,
  payload: {
    payDate?: string | null;
    workingDaysInPeriod?: number | null;
    notes?: string | null;
  },
): Promise<ApiPayrollPeriod> {
  return api.patch<ApiPayrollPeriod>(`/payroll/periods/${id}`, payload);
}

export async function calculatePeriod(id: string): Promise<ApiPayrollPeriod> {
  return api.post<ApiPayrollPeriod>(`/payroll/periods/${id}/calculate`);
}

export async function approvePeriod(
  id: string,
  notes?: string | null,
): Promise<ApiPayrollPeriod> {
  return api.post<ApiPayrollPeriod>(`/payroll/periods/${id}/approve`, {
    notes: notes ?? null,
  });
}

export async function markPeriodPaid(
  id: string,
  payload?: { paidAt?: string; notes?: string | null },
): Promise<ApiPayrollPeriod> {
  return api.post<ApiPayrollPeriod>(`/payroll/periods/${id}/mark-paid`, {
    paidAt: payload?.paidAt ?? new Date().toISOString(),
    notes: payload?.notes ?? null,
  });
}

export async function cancelPeriod(id: string): Promise<ApiPayrollPeriod> {
  return api.post<ApiPayrollPeriod>(`/payroll/periods/${id}/cancel`);
}

// Xóa hẳn kỳ lương (chỉ khi CANCELLED) để có thể tạo lại cùng tháng/năm
export async function deletePeriod(id: string): Promise<void> {
  return api.delete(`/payroll/periods/${id}`);
}

// ─── Compensations ─────────────────────────────────────────────

export async function listCompensations(params?: {
  userId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paginated<ApiCompensation>> {
  return api.get<Paginated<ApiCompensation>>("/payroll/compensations", {
    params: params as Record<string, string>,
  });
}

export async function createCompensation(
  payload: Omit<
    ApiCompensation,
    "id" | "user" | "isActive" | "createdAt" | "updatedAt"
  > & { userId: string },
): Promise<ApiCompensation> {
  return api.post<ApiCompensation>("/payroll/compensations", payload);
}

export async function getActiveCompensation(
  userId: string,
): Promise<ApiCompensation> {
  return api.get<ApiCompensation>(
    `/payroll/compensations/user/${userId}/active`,
  );
}

export async function getCompensationHistory(
  userId: string,
): Promise<ApiCompensation[]> {
  return api.get<ApiCompensation[]>(
    `/payroll/compensations/user/${userId}/history`,
  );
}

export async function updateCompensation(
  id: string,
  payload: Partial<
    Omit<ApiCompensation, "id" | "user" | "createdAt" | "updatedAt">
  >,
): Promise<ApiCompensation> {
  return api.patch<ApiCompensation>(`/payroll/compensations/${id}`, payload);
}

// ─── Salary Components ─────────────────────────────────────────

export async function getSalaryComponentOptions(): Promise<
  ApiSalaryComponent[]
> {
  return api.get<ApiSalaryComponent[]>("/payroll/salary-components/options");
}

export async function listSalaryComponents(params?: {
  componentType?: ComponentType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paginated<ApiSalaryComponent>> {
  return api.get<Paginated<ApiSalaryComponent>>("/payroll/salary-components", {
    params: params as Record<string, string>,
  });
}

export async function createSalaryComponent(payload: {
  code: string;
  name: string;
  componentType: ComponentType;
  calculationType?: CalculationType;
  isTaxable?: boolean;
  isInsurable?: boolean;
  description?: string | null;
}): Promise<ApiSalaryComponent> {
  return api.post<ApiSalaryComponent>("/payroll/salary-components", payload);
}

export async function getUserSalaryComponents(
  userId: string,
): Promise<ApiUserSalaryComponent[]> {
  return api.get<ApiUserSalaryComponent[]>(
    `/payroll/salary-components/user/${userId}`,
  );
}

export async function assignSalaryComponent(payload: {
  userId: string;
  salaryComponentId: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
}): Promise<ApiUserSalaryComponent> {
  return api.post<ApiUserSalaryComponent>(
    "/payroll/salary-components/assign",
    payload,
  );
}

export async function removeUserSalaryComponent(id: string): Promise<void> {
  return api.delete(`/payroll/salary-components/user-assignments/${id}`);
}

// ─── Adjustments ───────────────────────────────────────────────

export async function listAdjustments(params?: {
  userId?: string;
  payrollPeriodId?: string;
  adjustmentType?: AdjustmentType;
  status?: AdjustmentStatus;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}): Promise<Paginated<ApiAdjustment>> {
  return api.get<Paginated<ApiAdjustment>>("/payroll/adjustments", {
    params: params as Record<string, string>,
  });
}

export async function createAdjustment(payload: {
  userId: string;
  payrollPeriodId?: string | null;
  adjustmentType: AdjustmentType;
  amount: number;
  reason?: string | null;
}): Promise<ApiAdjustment> {
  return api.post<ApiAdjustment>("/payroll/adjustments", payload);
}

export async function getAdjustmentById(id: string): Promise<ApiAdjustment> {
  return api.get<ApiAdjustment>(`/payroll/adjustments/${id}`);
}

export async function approveAdjustment(
  id: string,
  notes?: string | null,
): Promise<ApiAdjustment> {
  return api.post<ApiAdjustment>(`/payroll/adjustments/${id}/approve`, {
    notes: notes ?? null,
  });
}

/** Backend field: reason (min 5 chars) — KHÔNG phải rejectReason */
export async function rejectAdjustment(
  id: string,
  reason: string,
): Promise<ApiAdjustment> {
  const safeReason =
    reason && reason.trim().length >= 5
      ? reason.trim()
      : reason.trim().padEnd(5, ".") || "Không hợp lệ";
  return api.post<ApiAdjustment>(`/payroll/adjustments/${id}/reject`, {
    reason: safeReason,
  });
}

// ─── Payroll Records ───────────────────────────────────────────

export async function listRecords(params?: {
  payrollPeriodId?: string;
  userId?: string;
  departmentId?: string;
  status?: RecordStatus;
  page?: number;
  limit?: number;
}): Promise<Paginated<ApiPayrollRecord>> {
  return api.get<Paginated<ApiPayrollRecord>>("/payroll/records", {
    params: params as Record<string, string>,
  });
}

export async function getRecordById(id: string): Promise<ApiPayrollRecord> {
  return api.get<ApiPayrollRecord>(`/payroll/records/${id}`);
}

export async function updateRecordNotes(
  id: string,
  notes: string | null,
): Promise<ApiPayrollRecord> {
  return api.patch<ApiPayrollRecord>(`/payroll/records/${id}/notes`, { notes });
}

export async function markRecordPaid(
  id: string,
  payload?: { paymentRef?: string | null; paidAt?: string },
): Promise<ApiPayrollRecord> {
  return api.post<ApiPayrollRecord>(`/payroll/records/${id}/mark-paid`, {
    paymentRef: payload?.paymentRef ?? null,
    paidAt: payload?.paidAt ?? new Date().toISOString(),
  });
}
