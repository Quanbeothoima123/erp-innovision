// ============================================================
// REPORTS SERVICE — Module 10
// Base: /api/reports/*
// ============================================================

import { api } from "../apiClient";

// ─── Params ───────────────────────────────────────────────────

export interface HRReportParams { year?: number; departmentId?: string; }
export interface AttendanceReportParams { year?: number; month?: number; departmentId?: string; userId?: string; }
export interface LeaveReportParams { year?: number; departmentId?: string; leaveTypeId?: string; }
export interface PayrollReportParams { year?: number; month?: number; departmentId?: string; }
export interface ProjectReportParams { year?: number; status?: string; }
export interface FinanceReportParams { year?: number; month?: number; clientId?: string; }
export interface OvertimeReportParams { year?: number; month?: number; departmentId?: string; }
export interface DashboardParams { year?: number; month?: number; }

// ─── DTOs ─────────────────────────────────────────────────────

export interface HRReport {
  year: number;
  headcount: { total: number; active: number; probation: number; onLeave: number; terminated: number };
  byDepartment: { name: string; count: number; activeCount: number }[];
  newHires: { month: number; count: number }[];
  turnover: { month: number; terminated: number }[];
  tenure: { lessThan1: number; oneToThree: number; threeToFive: number; moreThan5: number };
}

export interface AttendanceReport {
  period: { year: number; month: number };
  summary: {
    totalRecords: number; presentCount: number; lateCount: number;
    absentCount: number; attendanceRate: number; lateRate: number;
    totalOTMinutes: number; totalOTHours: number;
  };
  dailyTrend: { date: string; present: number; late: number; absent: number }[];
  byDepartment: { name: string; attendanceRate: number; lateRate: number; count: number }[];
  topLate: { user: { id: string; fullName: string; userCode: string }; count: number }[];
}

export interface LeaveReport {
  year: number;
  summary: { pending: number; approved: number; rejected: number; total: number };
  byType: { name: string; approved: number; pending: number; total: number }[];
  monthlyTrend: { month: number; approved: number; pending: number }[];
  byDepartment: { name: string; total: number; approved: number }[];
}

export interface PayrollReport {
  periods: { id: string; month: number; year: number; status: string }[];
  summary: {
    totalGross: number; totalNet: number; totalDeductions: number;
    totalAllowances: number; totalBonus: number; totalOTPay: number;
    totalSocialIns: number; totalHealthIns: number; totalUnemploymentIns: number;
    totalPIT: number; avgGross: number; avgNet: number; deductionRate: number;
    _count: { id: number };
  } | null;
  deptBreakdown: { name: string; avgGross: number; totalGross: number; totalNet: number; employeeCount: number }[];
  trend: { month: number; year: number; totalGross: number; totalNet: number; employeeCount: number }[];
  payrollComposition: { name: string; value: number }[];
  deductionBreakdown: { name: string; value: number }[];
}

export interface ProjectReport {
  year: number;
  summary: { total: number; active: number; completed: number; atRisk: number };
  byStatus: { status: string; count: number; totalBudget: number; totalSpent: number }[];
  byHealth: { health: string; count: number }[];
  milestones: { total: number; done: number; overdue: number; doneRate: number };
  expenseByCategory: { name: string; value: number }[];
  topProjects: { id: string; projectName: string; progressPercent: number; budgetUsedPercent: number | null; healthStatus: string | null }[];
}

export interface FinanceReport {
  period: { year: number; month?: number };
  revenue: { total: number; received: number; outstanding: number; collectionRate: number };
  invoices: { draft: number; sent: number; paid: number; overdue: number; disputed: number; total: number };
  byMethod: { method: string; amount: number; count: number }[];
  byClient: { clientName: string; amount: number }[];
  monthlyRevenue: { month: number; received: number; invoiced: number }[];
}

export interface OvertimeReport {
  period: { year: number; month?: number };
  summary: {
    totalSessions: number; totalApprovedMinutes: number; totalApprovedHours: number;
    avgMinutesPerSession: number; uniqueUsers: number;
  };
  byDayType: { label: string; isHoliday: boolean; isWeekend: boolean; totalMinutes: number; totalHours: number; count: number }[];
  topUsers: { user: { id: string; fullName: string; userCode: string; department: { name: string } }; totalMinutes: number; sessionCount: number }[];
  monthlyTrend: { month: number; sessions: number; totalHours: number; weekendMinutes: number; holidayMinutes: number }[];
}

export interface DashboardReport {
  period: { year: number; month: number };
  headcount: { total: number; active: number; newThisMonth: number };
  attendance: { rate: number; lateCount: number; absentCount: number };
  leave: { pending: number; approvedThisMonth: number };
  payroll: { totalNet: number; status: string } | null;
  projects: { total: number; active: number; atRisk: number };
  finance: { revenue: number; outstanding: number };
}

// ─── API calls ────────────────────────────────────────────────

export async function getDashboard(params?: DashboardParams): Promise<DashboardReport> {
  return api.get<DashboardReport>("/reports/dashboard", { params: params as Record<string, string> });
}

export async function getHRReport(params?: HRReportParams): Promise<HRReport> {
  return api.get<HRReport>("/reports/hr", { params: params as Record<string, string> });
}

export async function getAttendanceReport(params?: AttendanceReportParams): Promise<AttendanceReport> {
  return api.get<AttendanceReport>("/reports/attendance", { params: params as Record<string, string> });
}

export async function getLeaveReport(params?: LeaveReportParams): Promise<LeaveReport> {
  return api.get<LeaveReport>("/reports/leave", { params: params as Record<string, string> });
}

export async function getPayrollReport(params?: PayrollReportParams): Promise<PayrollReport> {
  return api.get<PayrollReport>("/reports/payroll", { params: params as Record<string, string> });
}

export async function getProjectReport(params?: ProjectReportParams): Promise<ProjectReport> {
  return api.get<ProjectReport>("/reports/projects", { params: params as Record<string, string> });
}

export async function getFinanceReport(params?: FinanceReportParams): Promise<FinanceReport> {
  return api.get<FinanceReport>("/reports/finance", { params: params as Record<string, string> });
}

export async function getOvertimeReport(params?: OvertimeReportParams): Promise<OvertimeReport> {
  return api.get<OvertimeReport>("/reports/overtime", { params: params as Record<string, string> });
}
