// ============================================================
// REPORTS SERVICE — Module 10
// DTOs match actual backend reports.mapper.js output exactly
// ============================================================

import { api } from "../apiClient";

// ─── Params ───────────────────────────────────────────────────

export interface HRReportParams {
  year?: number;
  departmentId?: string;
}
export interface AttendanceReportParams {
  year?: number;
  month?: number;
  departmentId?: string;
  userId?: string;
}
export interface LeaveReportParams {
  year?: number;
  departmentId?: string;
  leaveTypeId?: string;
}
export interface PayrollReportParams {
  year?: number;
  month?: number;
  departmentId?: string;
}
export interface ProjectReportParams {
  year?: number;
  status?: string;
}
export interface FinanceReportParams {
  year?: number;
  month?: number;
  clientId?: string;
}
export interface OvertimeReportParams {
  year?: number;
  month?: number;
  departmentId?: string;
}
export interface DashboardParams {
  year?: number;
  month?: number;
}

// ─── DTOs — must match reports.mapper.js shapes exactly ───────

export interface HRReport {
  year: number;
  summary: {
    total: number;
    active: number;
    probation: number;
    terminated: number;
    onLeave: number;
  };
  departments: { id: string; name: string; headcount: number }[];
  jobTitles: { id: string; name: string; headcount: number }[];
  hireHistory: { year: number; count: number }[];
  topTenured: {
    id: string;
    fullName: string;
    userCode: string;
    hireDate: string | null;
    avatarUrl: string | null;
    department: { name: string } | null;
    jobTitle: { name: string } | null;
    tenureYears: number | null;
  }[];
  roles: { role: string; count: number }[];
}

export interface AttendanceReport {
  period: { year: number; month: number };
  summary: {
    totalRecords: number;
    totalLateMinutes: number;
    avgLateMinutes: number;
    totalWorkMinutes: number;
    avgWorkMinutes: number;
    totalOTApprovedMinutes: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    adjustedCount: number;
    attendanceRate: number;
    avgWorkHours: number;
    totalOTHours: number;
  };
  statusBreakdown: Record<string, number>;
  dailyTrend: {
    date: string;
    present: number;
    absent: number;
    onLeave: number;
    lateCount: number;
    totalLateMinutes: number;
  }[];
  deptRates: {
    deptId: string;
    deptName: string;
    rate: number;
    present: number;
    total: number;
  }[];
  topLateUsers: {
    user: {
      id: string;
      fullName: string;
      userCode: string;
      avatarUrl: string | null;
      department: { name: string } | null;
    } | null;
    lateCount: number;
    totalMinutes: number;
    avgMinutes: number;
  }[];
  overtime: {
    approvedCount: number;
    approvedMinutes: number;
    pendingCount: number;
    approvedHours: number;
  };
}

export interface LeaveReport {
  year: number;
  statusBreakdown: Record<string, { count: number; days: number }>;
  byLeaveType: {
    leaveType: { id: string; name: string; isPaid: boolean } | null;
    count: number;
    days: number;
  }[];
  balanceSummary: {
    totalEntitled: number;
    totalCarried: number;
    totalUsed: number;
    totalRemaining: number;
    totalPending: number;
    avgUsed: number;
    avgRemaining: number;
    employeeCount: number;
    usageRate: number;
  };
  topUsers: {
    user: {
      id: string;
      fullName: string;
      userCode: string;
      avatarUrl: string | null;
      department: { name: string } | null;
    } | null;
    leaveType: { name: string } | null;
    entitledDays: number;
    carriedDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
    usageRate: number;
  }[];
  monthlyTrend: {
    month: number;
    total: number;
    approved: number;
    rejected: number;
    approvedDays: number;
  }[];
}

export interface PayrollReport {
  periods: { id: string; month: number; year: number; status: string }[];
  summary: {
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    totalAllowances: number;
    totalBonus: number;
    totalOTPay: number;
    totalSocialIns: number;
    totalHealthIns: number;
    totalUnemploymentIns: number;
    totalPIT: number;
    headcount: number;
    avgGross: number;
    avgNet: number;
    deductionRate: number;
  } | null;
  deptBreakdown: {
    deptId: string;
    deptName: string;
    headcount: number;
    totalGross: number;
    totalNet: number;
    totalOTPay: number;
    avgGross: number;
  }[];
  trend: {
    month: number;
    gross: number;
    net: number;
    otPay: number;
    bonus: number;
    headcount: number;
  }[];
  payrollComposition: { name: string; value: number }[];
  deductionBreakdown: { name: string; value: number }[];
}

export interface ProjectReport {
  year: number;
  statusBreakdown: Record<
    string,
    { count: number; budget: number; spent: number }
  >;
  healthBreakdown: Record<string, number>;
  projects: {
    id: string;
    projectCode: string | null;
    projectName: string;
    status: string;
    healthStatus: string | null;
    progressPercent: number;
    budgetAmount: number;
    spentAmount: number;
    currency: string;
    startDate: string | null;
    endDate: string | null;
    budgetUsedPct: number;
    isOverBudget: boolean;
  }[];
  milestones: Record<string, number>;
  expenseByCategory: { category: string; amount: number; count: number }[];
  expiringSoon: {
    id: string;
    projectCode: string | null;
    projectName: string;
    endDate: string;
    progressPercent: number;
    healthStatus: string | null;
    projectManager: { fullName: string } | null;
  }[];
  topContributors: {
    user: {
      id: string;
      fullName: string;
      userCode: string;
      avatarUrl: string | null;
      department: { name: string } | null;
    } | null;
    projectCount: number;
  }[];
}

export interface FinanceReport {
  period: { year: number; month: number | null };
  revenue: {
    totalReceived: number;
    paymentCount: number;
    monthlyTrend: { month: number; amount: number; count: number }[];
  };
  invoices: {
    byStatus: Record<
      string,
      {
        count: number;
        totalAmount: number;
        paidAmount: number;
        outstanding: number;
      }
    >;
    totalInvoiced: number;
    totalOutstanding: number;
  };
  ar: {
    totalContractValue: number;
    totalReceived: number;
    totalOutstanding: number;
    collectionRate: number;
    topDebtors: {
      id: string;
      clientCode: string | null;
      companyName: string;
      shortName: string | null;
      totalContractValue: number;
      totalReceivedAmount: number;
      outstandingBalance: number;
    }[];
  };
  revenueByMethod: { method: string; amount: number; count: number }[];
  revenueByClient: {
    client: {
      id: string;
      clientCode: string | null;
      companyName: string;
      shortName: string | null;
    } | null;
    totalAmount: number;
    paymentCount: number;
  }[];
}

export interface OvertimeReport {
  period: { year: number; month: number | null };
  summary: {
    totalApprovedMinutes: number;
    totalPlannedMinutes: number;
    sessionCount: number;
    totalApprovedHours: number;
  };
  byDayType: {
    label: string;
    isHoliday: boolean;
    isWeekend: boolean;
    totalMinutes: number;
    totalHours: number;
    count: number;
  }[];
  topUsers: {
    user: {
      id: string;
      fullName: string;
      userCode: string;
      department: { name: string } | null;
    } | null;
    totalMinutes: number;
    sessionCount: number;
  }[];
  monthlyTrend:
    | {
        month: number;
        sessions: number;
        totalMinutes: number;
        totalHours: number;
        weekendMinutes: number;
        holidayMinutes: number;
      }[]
    | null;
}

export interface DashboardReport {
  employees: { total: number; active: number; probation: number };
  pending: {
    leaveRequests: number;
    otRequests: number;
    attendanceRequests: number;
  };
  projects: { active: number };
  finance: {
    overdueInvoices: number;
    outstandingBalance: number;
    latestPayroll: { month: number; year: number; totalNet: number } | null;
  };
}

// ─── API calls ────────────────────────────────────────────────

export async function getDashboard(
  params?: DashboardParams,
): Promise<DashboardReport> {
  return api.get<DashboardReport>("/reports/dashboard", {
    params: params as Record<string, string>,
  });
}

export async function getHRReport(params?: HRReportParams): Promise<HRReport> {
  return api.get<HRReport>("/reports/hr", {
    params: params as Record<string, string>,
  });
}

export async function getAttendanceReport(
  params?: AttendanceReportParams,
): Promise<AttendanceReport> {
  return api.get<AttendanceReport>("/reports/attendance", {
    params: params as Record<string, string>,
  });
}

export async function getLeaveReport(
  params?: LeaveReportParams,
): Promise<LeaveReport> {
  return api.get<LeaveReport>("/reports/leave", {
    params: params as Record<string, string>,
  });
}

export async function getPayrollReport(
  params?: PayrollReportParams,
): Promise<PayrollReport> {
  return api.get<PayrollReport>("/reports/payroll", {
    params: params as Record<string, string>,
  });
}

export async function getProjectReport(
  params?: ProjectReportParams,
): Promise<ProjectReport> {
  return api.get<ProjectReport>("/reports/projects", {
    params: params as Record<string, string>,
  });
}

export async function getFinanceReport(
  params?: FinanceReportParams,
): Promise<FinanceReport> {
  return api.get<FinanceReport>("/reports/finance", {
    params: params as Record<string, string>,
  });
}

export async function getOvertimeReport(
  params?: OvertimeReportParams,
): Promise<OvertimeReport> {
  return api.get<OvertimeReport>("/reports/overtime", {
    params: params as Record<string, string>,
  });
}
