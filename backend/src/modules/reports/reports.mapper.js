'use strict';

// ── Helpers ───────────────────────────────────────────────────
const _n  = v => (v == null ? 0 : Math.round(Number(v) * 100) / 100);
const _m  = v => (v == null ? 0 : Math.round(Number(v)));
const _pct = (num, den) => { const d = Number(den ?? 0); return d === 0 ? 0 : Math.round(Number(num ?? 0) / d * 1000) / 10; };
const _minsToHours = m => _n(Number(m ?? 0) / 60);

// ── Dashboard ─────────────────────────────────────────────────

function toDashboardDto(raw) {
  return raw; // Already clean shape from repo
}

// ── HR Report ─────────────────────────────────────────────────

function toHRReportDto(raw, year) {
  const { employmentStats, deptStats, jobTitleStats, hireHistory, tenuredEmployees, roleStats } = raw;

  // Employment status map
  const empMap = Object.fromEntries(employmentStats.map(s => [s.employmentStatus, s._count.id]));

  // Department breakdown
  const departments = deptStats.map(d => ({
    id:       d.id,
    name:     d.name,
    headcount: d._count.users,
  })).filter(d => d.headcount > 0);

  // Job title breakdown
  const jobTitles = jobTitleStats.map(jt => ({
    id:       jt.id,
    name:     jt.name,
    headcount: jt._count.users,
  })).filter(jt => jt.headcount > 0);

  // Hire history
  const hireChart = (hireHistory ?? []).map(r => ({
    year:  Number(r.year),
    count: Number(r.count),
  }));

  // Tenure for top 10 employees
  const now = new Date();
  const tenured = tenuredEmployees.map(u => ({
    ...u,
    tenureYears: u.hireDate
      ? _n((now - new Date(u.hireDate)) / (365.25 * 86_400_000))
      : null,
  }));

  // Role distribution
  const roles = (roleStats ?? []).map(r => ({
    role:  r.role,
    count: r._count.userId,
  }));

  const total  = Object.values(empMap).reduce((s, n) => s + n, 0);

  return {
    year,
    summary: {
      total,
      active:     empMap.ACTIVE     ?? 0,
      probation:  empMap.PROBATION  ?? 0,
      terminated: empMap.TERMINATED ?? 0,
      onLeave:    empMap.ON_LEAVE   ?? 0,
    },
    departments,
    jobTitles,
    hireHistory: hireChart,
    topTenured:  tenured,
    roles,
  };
}

// ── Attendance Report ─────────────────────────────────────────

function toAttendanceReportDto(raw) {
  const { period, summary, statusBreakdown, dailyTrend, deptRates, topLateUsers, ot } = raw;

  const statusMap = Object.fromEntries(statusBreakdown.map(s => [s.status, s._count.id]));
  const total     = Object.values(statusMap).reduce((s, n) => s + n, 0);

  const daily = (dailyTrend ?? []).map(r => ({
    date:             r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    present:          Number(r.present),
    absent:           Number(r.absent),
    onLeave:          Number(r.on_leave),
    lateCount:        Number(r.late_count),
    totalLateMinutes: Number(r.total_late_minutes),
  }));

  const deptChart = (deptRates ?? []).map(d => ({
    deptId:   d.deptId,
    deptName: d.deptName.replace('Phòng ', '').replace('Ban ', ''),
    rate:     _n(d.rate),
    present:  d.present,
    total:    d.total,
  }));

  return {
    period,
    summary: {
      ...summary,
      presentCount: statusMap.PRESENT          ?? 0,
      absentCount:  statusMap.ABSENT           ?? 0,
      leaveCount:   statusMap.LEAVE            ?? 0,
      adjustedCount: statusMap.MANUAL_ADJUSTED ?? 0,
      attendanceRate: _pct(statusMap.PRESENT ?? 0, total),
      avgWorkHours:  _minsToHours(summary.avgWorkMinutes),
      totalOTHours:  _minsToHours(summary.totalOTApprovedMinutes),
      avgLateMinutes: _n(summary.avgLateMinutes),
    },
    statusBreakdown: statusMap,
    dailyTrend: daily,
    deptRates: deptChart,
    topLateUsers,
    overtime: {
      ...ot,
      approvedHours: _minsToHours(ot.approvedMinutes),
    },
  };
}

// ── Leave Report ──────────────────────────────────────────────

function toLeaveReportDto(raw) {
  const { year, statusBreakdown, leaveTypeBreakdown, balanceSummary, topUserBalances, monthlyTrend } = raw;

  const statusMap = {};
  for (const s of statusBreakdown) {
    statusMap[s.status] = {
      count: s._count.id,
      days:  _n(s._sum.totalDays ?? 0),
    };
  }

  const byType = leaveTypeBreakdown.map(lt => ({
    leaveType: lt.leaveType,
    count:     lt._count.id,
    days:      _n(lt._sum.totalDays ?? 0),
  }));

  const monthly = (monthlyTrend ?? []).map(r => ({
    month:        Number(r.month),
    total:        Number(r.total),
    approved:     Number(r.approved),
    rejected:     Number(r.rejected),
    approvedDays: _n(r.approved_days),
  }));

  const topUsers = topUserBalances.map(b => ({
    user:           b.user,
    leaveType:      b.leaveType,
    entitledDays:   _n(b.entitledDays),
    carriedDays:    _n(b.carriedDays),
    usedDays:       _n(b.usedDays),
    pendingDays:    _n(b.pendingDays),
    remainingDays:  _n(b.remainingDays),
    usageRate:      _pct(b.usedDays, Number(b.entitledDays) + Number(b.carriedDays)),
  }));

  return {
    year,
    statusBreakdown: statusMap,
    byLeaveType: byType,
    balanceSummary: {
      ...balanceSummary,
      usageRate: _pct(balanceSummary.totalUsed, balanceSummary.totalEntitled + balanceSummary.totalCarried),
    },
    topUsers,
    monthlyTrend: monthly,
  };
}

// ── Payroll Report ────────────────────────────────────────────

function toPayrollReportDto(raw) {
  const { periods, summary, deptBreakdown, trend } = raw;

  if (!summary) return { periods: [], summary: null, deptBreakdown: [], trend: [] };

  const deptChart = deptBreakdown.map(d => ({
    ...d,
    avgGross: _m(d.avgGross),
  }));

  const payrollComposition = summary ? [
    { name: 'Lương cơ bản',   value: _m(summary.totalGross - summary.totalAllowances - summary.totalBonus - summary.totalOTPay) },
    { name: 'Phụ cấp',        value: _m(summary.totalAllowances) },
    { name: 'Thưởng',         value: _m(summary.totalBonus) },
    { name: 'Làm thêm giờ',   value: _m(summary.totalOTPay) },
  ].filter(c => c.value > 0) : [];

  const deductionBreakdown = summary ? [
    { name: 'BHXH (8%)',  value: _m(summary.totalSocialIns) },
    { name: 'BHYT (1.5%)', value: _m(summary.totalHealthIns) },
    { name: 'BHTN (1%)',  value: _m(summary.totalUnemploymentIns) },
    { name: 'Thuế TNCN',  value: _m(summary.totalPIT) },
  ].filter(d => d.value > 0) : [];

  return {
    periods,
    summary: {
      ...summary,
      avgGross:     _m(summary.avgGross),
      avgNet:       _m(summary.avgNet),
      deductionRate: _pct(summary.totalDeductions, summary.totalGross),
    },
    deptBreakdown: deptChart,
    trend,
    payrollComposition,
    deductionBreakdown,
  };
}

// ── Project Report ────────────────────────────────────────────

function toProjectReportDto(raw) {
  const { year, statusBreakdown, healthBreakdown, projects, milestoneStats, expenseByCategory, expiringSoon, topContributors } = raw;

  const statusMap = Object.fromEntries(
    statusBreakdown.map(s => [s.status, {
      count:  s._count.id,
      budget: _m(s._sum.budgetAmount),
      spent:  _m(s._sum.spentAmount),
    }]),
  );

  const healthMap = Object.fromEntries(
    healthBreakdown.map(h => [h.healthStatus ?? 'UNKNOWN', h._count.id]),
  );

  const msMap = Object.fromEntries(milestoneStats.map(m => [m.status, m._count.id]));

  const expenseChart = expenseByCategory.map(e => ({
    category: e.category,
    amount:   _m(e._sum.amount),
    count:    e._count.id,
  }));

  const projectList = projects.map(p => ({
    ...p,
    budgetAmount:     _m(p.budgetAmount),
    spentAmount:      _m(p.spentAmount),
    progressPercent:  _n(p.progressPercent),
    budgetUsedPct:    _pct(p.spentAmount, p.budgetAmount),
    isOverBudget:     Number(p.spentAmount) > Number(p.budgetAmount),
  }));

  return {
    year,
    statusBreakdown: statusMap,
    healthBreakdown: healthMap,
    projects: projectList,
    milestones: msMap,
    expenseByCategory: expenseChart,
    expiringSoon,
    topContributors,
  };
}

// ── Finance Report ────────────────────────────────────────────

function toFinanceReportDto(raw) {
  const { period, payments, invoices, ar, revenueByMethod, revenueByClient } = raw;

  const invMap = Object.fromEntries(
    invoices.map(i => [i.status, {
      count:       i._count.id,
      totalAmount: _m(i._sum.totalAmount),
      paidAmount:  _m(i._sum.paidAmount),
      outstanding: _m(i._sum.outstandingAmount),
    }]),
  );

  const methodChart = revenueByMethod.map(r => ({
    method: r.paymentMethod,
    amount: _m(r._sum.amountInVnd),
    count:  r._count.id,
  }));

  const monthlyTrend = (payments.monthlyTrend ?? []).map(r => ({
    month:  Number(r.month),
    amount: _m(r.total_amount),
    count:  Number(r.payment_count),
  }));

  return {
    period,
    revenue: {
      totalReceived:  _m(payments.total),
      paymentCount:   payments.count,
      monthlyTrend,
    },
    invoices: {
      byStatus: invMap,
      totalInvoiced:   Object.values(invMap).reduce((s, v) => s + v.totalAmount, 0),
      totalOutstanding: Object.values(invMap).reduce((s, v) => s + v.outstanding, 0),
    },
    ar: {
      totalContractValue:  _m(ar.totalContractValue),
      totalReceived:       _m(ar.totalReceived),
      totalOutstanding:    _m(ar.totalOutstanding),
      collectionRate:      _pct(ar.totalReceived, ar.totalContractValue),
      topDebtors: ar.topDebtors.map(d => ({
        ...d,
        totalContractValue:  _m(d.totalContractValue),
        totalReceivedAmount: _m(d.totalReceivedAmount),
        outstandingBalance:  _m(d.outstandingBalance),
      })),
    },
    revenueByMethod: methodChart,
    revenueByClient,
  };
}

// ── Overtime Report ───────────────────────────────────────────

function toOvertimeReportDto(raw) {
  const { period, summary, byDayType, topUsers, monthlyTrend } = raw;

  const dayTypeBreakdown = (byDayType ?? []).map(d => {
    let label = 'Ngày thường';
    if (d.isHoliday)      label = 'Ngày lễ';
    else if (d.isWeekend) label = 'Cuối tuần';
    return {
      label,
      isHoliday: d.isHoliday,
      isWeekend: d.isWeekend,
      totalMinutes: Number(d._sum.actualMinutes ?? 0),
      totalHours:   _minsToHours(d._sum.actualMinutes ?? 0),
      count:        d._count.id,
    };
  });

  const monthly = (monthlyTrend ?? []).map(r => ({
    month:          Number(r.month),
    sessions:       Number(r.sessions),
    totalMinutes:   Number(r.total_minutes),
    totalHours:     _minsToHours(r.total_minutes),
    weekendMinutes: Number(r.weekend_minutes),
    holidayMinutes: Number(r.holiday_minutes),
  }));

  return {
    period,
    summary: {
      ...summary,
      totalApprovedHours: _minsToHours(summary.totalApprovedMinutes),
    },
    byDayType: dayTypeBreakdown,
    topUsers,
    monthlyTrend: monthly,
  };
}

module.exports = {
  toDashboardDto,
  toHRReportDto,
  toAttendanceReportDto,
  toLeaveReportDto,
  toPayrollReportDto,
  toProjectReportDto,
  toFinanceReportDto,
  toOvertimeReportDto,
};
