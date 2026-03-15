'use strict';

const { prisma } = require('../../config/db');

// ── Helpers ───────────────────────────────────────────────────

function _monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

function _yearRange(year) {
  return {
    start: new Date(year, 0, 1),
    end:   new Date(year, 11, 31, 23, 59, 59),
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DASHBOARD — Snapshot tổng quan                          ║
// ╚══════════════════════════════════════════════════════════╝

async function getDashboardStats(year, month) {
  const { start: mStart, end: mEnd } = _monthRange(year, month);

  const [
    totalEmployees,
    activeEmployees,
    probationEmployees,
    pendingLeaveRequests,
    pendingOTRequests,
    pendingAttendanceRequests,
    activeProjects,
    overdueInvoices,
    totalOutstandingBalance,
  ] = await Promise.all([
    prisma.user.count({ where: { accountStatus: { not: 'DISABLED' } } }),
    prisma.user.count({ where: { employmentStatus: 'ACTIVE' } }),
    prisma.user.count({ where: { employmentStatus: 'PROBATION' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.overtimeRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendanceRequest.count({ where: { status: 'PENDING' } }),
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.invoice.count({ where: { status: 'OVERDUE' } }),
    prisma.client.aggregate({ _sum: { outstandingBalance: true } }),
  ]);

  // Payroll kỳ gần nhất
  const latestPeriod = await prisma.payrollPeriod.findFirst({
    where:   { status: { in: ['APPROVED','PAID'] } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select:  {
      id: true, month: true, year: true, status: true,
      _count: { select: { payrollRecords: true } },
    },
  });

  // Tổng lương net kỳ gần nhất
  let totalNetSalary = 0;
  if (latestPeriod) {
    const agg = await prisma.payrollRecord.aggregate({
      where: { payrollPeriodId: latestPeriod.id },
      _sum:  { netSalary: true },
    });
    totalNetSalary = Number(agg._sum.netSalary ?? 0);
  }

  return {
    employees: { total: totalEmployees, active: activeEmployees, probation: probationEmployees },
    pending: {
      leaveRequests:       pendingLeaveRequests,
      otRequests:          pendingOTRequests,
      attendanceRequests:  pendingAttendanceRequests,
    },
    projects: { active: activeProjects },
    finance: {
      overdueInvoices,
      outstandingBalance: Number(totalOutstandingBalance._sum.outstandingBalance ?? 0),
      latestPayroll: latestPeriod
        ? { month: latestPeriod.month, year: latestPeriod.year, totalNet: totalNetSalary }
        : null,
    },
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  HR REPORT                                               ║
// ╚══════════════════════════════════════════════════════════╝

async function getHRStats({ departmentId, year }) {
  const deptFilter = departmentId ? { departmentId } : {};

  // Tổng quan trạng thái nhân sự
  const employmentStats = await prisma.user.groupBy({
    by:    ['employmentStatus'],
    where: { ...deptFilter, accountStatus: { not: 'DISABLED' } },
    _count: { id: true },
  });

  // Phân bố theo phòng ban
  const deptStats = await prisma.department.findMany({
    where:   { isActive: true },
    include: {
      _count: {
        select: {
          users: { where: { employmentStatus: { not: 'TERMINATED' } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Phân bố theo chức danh (top 10)
  const jobTitleStats = await prisma.jobTitle.findMany({
    where:   { isActive: true },
    include: {
      _count: {
        select: {
          users: { where: { employmentStatus: { not: 'TERMINATED' } } },
        },
      },
    },
    orderBy: { _count: { users: 'desc' } },
    take: 10,
  });

  // Lịch sử tuyển dụng theo năm (5 năm gần nhất)
  const hireHistory = await prisma.$queryRaw`
    SELECT YEAR(hire_date) as year, COUNT(*) as count
    FROM users
    WHERE hire_date IS NOT NULL
      AND YEAR(hire_date) >= ${year - 4}
    GROUP BY YEAR(hire_date)
    ORDER BY year ASC
  `;

  // Nhân viên thâm niên cao nhất (top 10)
  const tenuredEmployees = await prisma.user.findMany({
    where:   { ...deptFilter, employmentStatus: { not: 'TERMINATED' }, hireDate: { not: null } },
    select:  {
      id: true, fullName: true, userCode: true, hireDate: true, avatarUrl: true,
      department: { select: { name: true } },
      jobTitle:   { select: { name: true } },
    },
    orderBy: { hireDate: 'asc' },
    take: 10,
  });

  // Tổng số nhân viên theo role
  const roleStats = await prisma.userRole.groupBy({
    by:    ['role'],
    _count: { userId: true },
  });

  return { employmentStats, deptStats, jobTitleStats, hireHistory, tenuredEmployees, roleStats };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE REPORT                                       ║
// ╚══════════════════════════════════════════════════════════╝

async function getAttendanceStats({ year, month, departmentId, userId }) {
  const { start, end } = _monthRange(year, month);
  const userFilter = userId ? { userId } : {};
  const deptUserIds = departmentId
    ? (await prisma.user.findMany({
        where:  { departmentId },
        select: { id: true },
      })).map(u => u.id)
    : null;

  const baseWhere = {
    workDate: { gte: start, lte: end },
    ...(userId ? { userId } : {}),
    ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
  };

  // Tổng hợp trạng thái
  const statusBreakdown = await prisma.attendanceRecord.groupBy({
    by:    ['status'],
    where:  baseWhere,
    _count: { id: true },
  });

  // Tổng phút muộn + làm việc
  const aggregates = await prisma.attendanceRecord.aggregate({
    where: baseWhere,
    _sum:  { lateMinutes: true, totalWorkMinutes: true, overtimeApprovedMinutes: true },
    _avg:  { lateMinutes: true, totalWorkMinutes: true },
    _count: { id: true },
  });

  // Xu hướng hàng ngày trong tháng
  const dailyTrend = await prisma.$queryRaw`
    SELECT
      DATE(work_date) as date,
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)          as present,
      SUM(CASE WHEN status = 'ABSENT'  THEN 1 ELSE 0 END)          as absent,
      SUM(CASE WHEN status = 'LEAVE'   THEN 1 ELSE 0 END)          as on_leave,
      SUM(CASE WHEN late_minutes > 0   THEN 1 ELSE 0 END)          as late_count,
      SUM(COALESCE(late_minutes, 0))                                as total_late_minutes
    FROM attendance_records
    WHERE work_date BETWEEN ${start} AND ${end}
      ${deptUserIds ? prisma.$queryRaw`AND user_id IN (${deptUserIds.join(',')})` : prisma.$queryRaw``}
    GROUP BY DATE(work_date)
    ORDER BY date ASC
  `;

  // Tỷ lệ chấm công theo phòng ban
  const deptAttendance = await prisma.department.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
  });

  const deptRates = await Promise.all(
    deptAttendance.map(async (dept) => {
      const deptIds = (await prisma.user.findMany({
        where:  { departmentId: dept.id },
        select: { id: true },
      })).map(u => u.id);

      if (deptIds.length === 0) return null;

      const agg = await prisma.attendanceRecord.groupBy({
        by:    ['status'],
        where:  { workDate: { gte: start, lte: end }, userId: { in: deptIds } },
        _count: { id: true },
      });

      const total   = agg.reduce((s, r) => s + r._count.id, 0);
      const present = agg.find(r => r.status === 'PRESENT')?._count.id ?? 0;
      return { deptId: dept.id, deptName: dept.name, total, present, rate: total > 0 ? (present / total * 100) : 0 };
    }),
  );

  // Top nhân viên đi trễ
  const topLate = await prisma.attendanceRecord.groupBy({
    by:    ['userId'],
    where:  { ...baseWhere, lateMinutes: { gt: 0 } },
    _count: { id: true },
    _sum:   { lateMinutes: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topLateUsers = await Promise.all(
    topLate.map(async (t) => {
      const user = await prisma.user.findUnique({
        where:  { id: t.userId },
        select: {
          id: true, fullName: true, userCode: true, avatarUrl: true,
          department: { select: { name: true } },
        },
      });
      return {
        user,
        lateCount:    t._count.id,
        totalMinutes: t._sum.lateMinutes ?? 0,
        avgMinutes:   t._sum.lateMinutes ? Math.round(t._sum.lateMinutes / t._count.id) : 0,
      };
    }),
  );

  // Tổng hợp OT trong tháng
  const otAgg = await prisma.overtimeRequest.aggregate({
    where: {
      status:   'APPROVED',
      workDate: { gte: start, lte: end },
      ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
    },
    _sum:   { actualMinutes: true, plannedMinutes: true },
    _count: { id: true },
  });

  const pendingOT = await prisma.overtimeRequest.count({
    where: { status: 'PENDING', workDate: { gte: start, lte: end } },
  });

  return {
    period: { year, month },
    summary: {
      totalRecords: aggregates._count.id,
      totalLateMinutes:    Number(aggregates._sum.lateMinutes ?? 0),
      avgLateMinutes:      Number(aggregates._avg.lateMinutes ?? 0),
      totalWorkMinutes:    Number(aggregates._sum.totalWorkMinutes ?? 0),
      avgWorkMinutes:      Number(aggregates._avg.totalWorkMinutes ?? 0),
      totalOTApprovedMinutes: Number(aggregates._sum.overtimeApprovedMinutes ?? 0),
    },
    statusBreakdown,
    dailyTrend,
    deptRates: deptRates.filter(Boolean),
    topLateUsers,
    ot: {
      approvedCount:   otAgg._count.id,
      approvedMinutes: Number(otAgg._sum.actualMinutes ?? 0),
      pendingCount:    pendingOT,
    },
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE REPORT                                            ║
// ╚══════════════════════════════════════════════════════════╝

async function getLeaveStats({ year, departmentId, leaveTypeId }) {
  const deptUserIds = departmentId
    ? (await prisma.user.findMany({ where: { departmentId }, select: { id: true } })).map(u => u.id)
    : null;

  const requestWhere = {
    ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
    ...(leaveTypeId ? { leaveTypeId } : {}),
    createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
  };

  // Tổng đơn theo trạng thái
  const statusBreakdown = await prisma.leaveRequest.groupBy({
    by:    ['status'],
    where:  requestWhere,
    _count: { id: true },
    _sum:   { totalDays: true },
  });

  // Phân loại theo loại nghỉ phép
  const leaveTypeBreakdown = await prisma.leaveRequest.groupBy({
    by:    ['leaveTypeId'],
    where:  { ...requestWhere, status: 'APPROVED' },
    _count: { id: true },
    _sum:   { totalDays: true },
  });

  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true, isPaid: true } });
  const leaveTypeMap = Object.fromEntries(leaveTypes.map(lt => [lt.id, lt]));

  // Tổng hợp số dư phép
  const balanceAgg = await prisma.leaveBalance.aggregate({
    where: {
      year,
      ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
      ...(leaveTypeId ? { leaveTypeId } : {}),
    },
    _sum: { entitledDays: true, carriedDays: true, usedDays: true, remainingDays: true, pendingDays: true },
    _avg: { usedDays: true, remainingDays: true },
    _count: { id: true },
  });

  // Top nhân viên dùng nhiều phép nhất
  const topUserBalances = await prisma.leaveBalance.findMany({
    where: {
      year,
      leaveTypeId: leaveTypeId ?? undefined,
      ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
    },
    include: {
      user: {
        select: {
          id: true, fullName: true, userCode: true, avatarUrl: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
    orderBy: { usedDays: 'desc' },
    take: 10,
  });

  // Xu hướng số đơn nghỉ theo tháng
  const monthlyTrend = await prisma.$queryRaw`
    SELECT
      MONTH(created_at) as month,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'APPROVED' THEN total_days ELSE 0 END) as approved_days
    FROM leave_requests
    WHERE YEAR(created_at) = ${year}
    GROUP BY MONTH(created_at)
    ORDER BY month ASC
  `;

  return {
    year,
    statusBreakdown,
    leaveTypeBreakdown: leaveTypeBreakdown.map(lt => ({
      ...lt,
      leaveType: leaveTypeMap[lt.leaveTypeId] ?? null,
    })),
    balanceSummary: {
      totalEntitled:  Number(balanceAgg._sum.entitledDays ?? 0),
      totalCarried:   Number(balanceAgg._sum.carriedDays  ?? 0),
      totalUsed:      Number(balanceAgg._sum.usedDays     ?? 0),
      totalRemaining: Number(balanceAgg._sum.remainingDays ?? 0),
      totalPending:   Number(balanceAgg._sum.pendingDays   ?? 0),
      avgUsed:        Number(balanceAgg._avg.usedDays      ?? 0),
      avgRemaining:   Number(balanceAgg._avg.remainingDays ?? 0),
      employeeCount:  balanceAgg._count.id,
    },
    topUserBalances,
    monthlyTrend,
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL REPORT                                          ║
// ╚══════════════════════════════════════════════════════════╝

async function getPayrollStats({ year, month, departmentId }) {
  const periodWhere = {
    year,
    ...(month ? { month } : {}),
    status: { in: ['APPROVED','PAID','CALCULATING'] },
  };

  const periods = await prisma.payrollPeriod.findMany({
    where:   periodWhere,
    select:  { id: true, month: true, year: true, status: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  if (periods.length === 0) return { periods: [], summary: null, deptBreakdown: [], trend: [] };

  const periodIds = periods.map(p => p.id);

  const deptUserIds = departmentId
    ? (await prisma.user.findMany({ where: { departmentId }, select: { id: true } })).map(u => u.id)
    : null;

  const recordWhere = {
    payrollPeriodId: { in: periodIds },
    ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
  };

  // Tổng hợp lương
  const agg = await prisma.payrollRecord.aggregate({
    where: recordWhere,
    _sum: {
      grossSalary: true, netSalary: true, totalDeductions: true,
      totalAllowances: true, totalBonus: true, totalOvertimePay: true,
      socialInsuranceEmployee: true, healthInsuranceEmployee: true,
      unemploymentInsuranceEmployee: true, personalIncomeTax: true,
    },
    _count: { id: true },
    _avg:   { grossSalary: true, netSalary: true },
  });

  // Lương theo phòng ban
  const allDepts = await prisma.department.findMany({
    where:  { isActive: true },
    select: { id: true, name: true },
  });

  const deptBreakdown = await Promise.all(
    allDepts.map(async (dept) => {
      const deptIds = (await prisma.user.findMany({
        where:  { departmentId: dept.id },
        select: { id: true },
      })).map(u => u.id);

      if (deptIds.length === 0) return null;

      const da = await prisma.payrollRecord.aggregate({
        where: { payrollPeriodId: { in: periodIds }, userId: { in: deptIds } },
        _sum:  { grossSalary: true, netSalary: true, totalOvertimePay: true },
        _count: { id: true },
      });

      return {
        deptId:   dept.id,
        deptName: dept.name,
        headcount:    da._count.id,
        totalGross:   Number(da._sum.grossSalary ?? 0),
        totalNet:     Number(da._sum.netSalary   ?? 0),
        totalOTPay:   Number(da._sum.totalOvertimePay ?? 0),
        avgGross:     da._count.id > 0 ? Math.round(Number(da._sum.grossSalary ?? 0) / da._count.id) : 0,
      };
    }),
  );

  // Xu hướng lương theo tháng (cả năm)
  const yearlyPeriods = await prisma.payrollPeriod.findMany({
    where:   { year, status: { in: ['APPROVED','PAID'] } },
    select:  { id: true, month: true },
    orderBy: { month: 'asc' },
  });

  const trend = await Promise.all(
    yearlyPeriods.map(async (p) => {
      const ta = await prisma.payrollRecord.aggregate({
        where: { payrollPeriodId: p.id },
        _sum:  { grossSalary: true, netSalary: true, totalOvertimePay: true, totalBonus: true },
        _count: { id: true },
      });
      return {
        month:      p.month,
        gross:      Number(ta._sum.grossSalary     ?? 0),
        net:        Number(ta._sum.netSalary        ?? 0),
        otPay:      Number(ta._sum.totalOvertimePay ?? 0),
        bonus:      Number(ta._sum.totalBonus       ?? 0),
        headcount:  ta._count.id,
      };
    }),
  );

  return {
    periods,
    summary: {
      totalGross:       Number(agg._sum.grossSalary ?? 0),
      totalNet:         Number(agg._sum.netSalary   ?? 0),
      totalDeductions:  Number(agg._sum.totalDeductions ?? 0),
      totalAllowances:  Number(agg._sum.totalAllowances ?? 0),
      totalBonus:       Number(agg._sum.totalBonus      ?? 0),
      totalOTPay:       Number(agg._sum.totalOvertimePay ?? 0),
      totalSocialIns:   Number(agg._sum.socialInsuranceEmployee ?? 0),
      totalHealthIns:   Number(agg._sum.healthInsuranceEmployee ?? 0),
      totalUnemploymentIns: Number(agg._sum.unemploymentInsuranceEmployee ?? 0),
      totalPIT:         Number(agg._sum.personalIncomeTax ?? 0),
      headcount:        agg._count.id,
      avgGross:         Number(agg._avg.grossSalary ?? 0),
      avgNet:           Number(agg._avg.netSalary   ?? 0),
    },
    deptBreakdown: deptBreakdown.filter(Boolean),
    trend,
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT REPORT                                          ║
// ╚══════════════════════════════════════════════════════════╝

async function getProjectStats({ year, status }) {
  const { start, end } = _yearRange(year);

  const projectWhere = {
    ...(status ? { status } : {}),
    OR: [
      { startDate: { gte: start, lte: end } },
      { endDate:   { gte: start, lte: end } },
      { startDate: { lte: start }, endDate: { gte: end } },
    ],
  };

  // Tổng hợp theo status
  const statusBreakdown = await prisma.project.groupBy({
    by:    ['status'],
    where:  projectWhere,
    _count: { id: true },
    _sum:   { spentAmount: true, budgetAmount: true },
  });

  // Tổng hợp theo healthStatus
  const healthBreakdown = await prisma.project.groupBy({
    by:    ['healthStatus'],
    where:  { ...projectWhere, status: 'ACTIVE', healthStatus: { not: null } },
    _count: { id: true },
  });

  // Budget utilization per project
  const projects = await prisma.project.findMany({
    where:   { ...projectWhere, budgetAmount: { gt: 0 } },
    select:  {
      id: true, projectCode: true, projectName: true,
      status: true, healthStatus: true, progressPercent: true,
      budgetAmount: true, spentAmount: true, currency: true,
      startDate: true, endDate: true,
    },
    orderBy: { spentAmount: 'desc' },
    take: 20,
  });

  // Milestone summary toàn bộ
  const milestoneStats = await prisma.projectMilestone.groupBy({
    by:    ['status'],
    _count: { id: true },
  });

  // Chi phí theo category
  const expenseByCategory = await prisma.projectExpense.groupBy({
    by:    ['category'],
    where:  { status: 'APPROVED' },
    _sum:   { amount: true },
    _count: { id: true },
  });

  // Dự án sắp hết hạn (trong 30 ngày)
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const expiringSoon = await prisma.project.findMany({
    where:  {
      status:  'ACTIVE',
      endDate: { gte: new Date(), lte: in30Days },
    },
    select: {
      id: true, projectCode: true, projectName: true,
      endDate: true, progressPercent: true, healthStatus: true,
      projectManager: { select: { fullName: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  // Top nhân viên tham gia nhiều dự án nhất
  const topContributors = await prisma.userProjectAssignment.groupBy({
    by:    ['userId'],
    where:  { status: 'ACTIVE' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topContributorsData = await Promise.all(
    topContributors.map(async (c) => {
      const user = await prisma.user.findUnique({
        where:  { id: c.userId },
        select: {
          id: true, fullName: true, userCode: true, avatarUrl: true,
          department: { select: { name: true } },
        },
      });
      return { user, projectCount: c._count.id };
    }),
  );

  return {
    year,
    statusBreakdown,
    healthBreakdown,
    projects,
    milestoneStats,
    expenseByCategory,
    expiringSoon,
    topContributors: topContributorsData,
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  FINANCE REPORT (Revenue & AR)                           ║
// ╚══════════════════════════════════════════════════════════╝

async function getFinanceStats({ year, month, clientId }) {
  const { start: yStart, end: yEnd } = _yearRange(year);
  const dateRange = month
    ? _monthRange(year, month)
    : { start: yStart, end: yEnd };

  const paymentWhere = {
    status:      'COMPLETED',
    paymentDate: { gte: dateRange.start, lte: dateRange.end },
    ...(clientId ? { clientId } : {}),
  };

  // Tổng thanh toán trong kỳ
  const paymentAgg = await prisma.clientPayment.aggregate({
    where: paymentWhere,
    _sum:  { amountInVnd: true },
    _count: { id: true },
  });

  // Thanh toán theo tháng trong năm (cho chart)
  const monthlyRevenue = await prisma.$queryRaw`
    SELECT
      MONTH(payment_date) as month,
      COUNT(*) as payment_count,
      SUM(amount_in_vnd) as total_amount
    FROM client_payments
    WHERE status = 'COMPLETED'
      AND YEAR(payment_date) = ${year}
      ${clientId ? prisma.$queryRaw`AND client_id = ${clientId}` : prisma.$queryRaw``}
    GROUP BY MONTH(payment_date)
    ORDER BY month ASC
  `;

  // Invoice status breakdown
  const invoiceBreakdown = await prisma.invoice.groupBy({
    by:    ['status'],
    where: {
      issuedDate: { gte: yStart, lte: yEnd },
      ...(clientId ? { clientId } : {}),
    },
    _count: { id: true },
    _sum:   { totalAmount: true, paidAmount: true, outstandingAmount: true },
  });

  // Công nợ theo khách hàng (top 10 nợ nhiều nhất)
  const topDebtors = await prisma.client.findMany({
    where:   {
      outstandingBalance: { gt: 0 },
      ...(clientId ? { id: clientId } : {}),
    },
    select:  {
      id: true, clientCode: true, companyName: true, shortName: true,
      totalContractValue: true, totalReceivedAmount: true, outstandingBalance: true,
    },
    orderBy: { outstandingBalance: 'desc' },
    take: 10,
  });

  // Doanh thu theo phương thức thanh toán
  const revenueByMethod = await prisma.clientPayment.groupBy({
    by:    ['paymentMethod'],
    where:  paymentWhere,
    _sum:   { amountInVnd: true },
    _count: { id: true },
  });

  // Doanh thu theo khách hàng (top 10)
  const revenueByClient = await prisma.clientPayment.groupBy({
    by:    ['clientId'],
    where:  { ...paymentWhere },
    _sum:   { amountInVnd: true },
    _count: { id: true },
    orderBy: { _sum: { amountInVnd: 'desc' } },
    take: 10,
  });

  const revenueByClientData = await Promise.all(
    revenueByClient.map(async (r) => {
      const client = await prisma.client.findUnique({
        where:  { id: r.clientId },
        select: { id: true, clientCode: true, companyName: true, shortName: true },
      });
      return {
        client,
        totalAmount: Number(r._sum.amountInVnd ?? 0),
        paymentCount: r._count.id,
      };
    }),
  );

  // Tổng công nợ toàn bộ
  const totalAR = await prisma.client.aggregate({
    _sum: { outstandingBalance: true, totalContractValue: true, totalReceivedAmount: true },
  });

  return {
    period: { year, month: month ?? null },
    payments: {
      total:       Number(paymentAgg._sum.amountInVnd ?? 0),
      count:       paymentAgg._count.id,
      monthlyTrend: monthlyRevenue,
    },
    invoices:    invoiceBreakdown,
    ar: {
      totalContractValue:  Number(totalAR._sum.totalContractValue  ?? 0),
      totalReceived:       Number(totalAR._sum.totalReceivedAmount ?? 0),
      totalOutstanding:    Number(totalAR._sum.outstandingBalance  ?? 0),
      topDebtors,
    },
    revenueByMethod,
    revenueByClient: revenueByClientData,
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  OVERTIME REPORT                                         ║
// ╚══════════════════════════════════════════════════════════╝

async function getOvertimeStats({ year, month, departmentId }) {
  const dateRange = month ? _monthRange(year, month) : _yearRange(year);
  const deptUserIds = departmentId
    ? (await prisma.user.findMany({ where: { departmentId }, select: { id: true } })).map(u => u.id)
    : null;

  const baseWhere = {
    status:   'APPROVED',
    workDate: { gte: dateRange.start, lte: dateRange.end },
    ...(deptUserIds ? { userId: { in: deptUserIds } } : {}),
  };

  const agg = await prisma.overtimeRequest.aggregate({
    where: baseWhere,
    _sum:  { actualMinutes: true, plannedMinutes: true },
    _count: { id: true },
  });

  // OT theo loại ngày
  const byDayType = await prisma.overtimeRequest.groupBy({
    by:    ['isHoliday', 'isWeekend'],
    where:  baseWhere,
    _sum:   { actualMinutes: true },
    _count: { id: true },
  });

  // OT theo nhân viên (top 10)
  const byUser = await prisma.overtimeRequest.groupBy({
    by:    ['userId'],
    where:  baseWhere,
    _sum:   { actualMinutes: true },
    _count: { id: true },
    orderBy: { _sum: { actualMinutes: 'desc' } },
    take: 10,
  });

  const byUserData = await Promise.all(
    byUser.map(async (u) => {
      const user = await prisma.user.findUnique({
        where:  { id: u.userId },
        select: {
          id: true, fullName: true, userCode: true,
          department: { select: { name: true } },
        },
      });
      return {
        user,
        totalMinutes: Number(u._sum.actualMinutes ?? 0),
        sessionCount: u._count.id,
      };
    }),
  );

  // OT theo tháng (nếu xem cả năm)
  const monthlyOT = !month ? await prisma.$queryRaw`
    SELECT
      MONTH(work_date) as month,
      COUNT(*) as sessions,
      SUM(actual_minutes) as total_minutes,
      SUM(CASE WHEN is_weekend = 1 THEN actual_minutes ELSE 0 END) as weekend_minutes,
      SUM(CASE WHEN is_holiday = 1 THEN actual_minutes ELSE 0 END) as holiday_minutes
    FROM overtime_requests
    WHERE status = 'APPROVED'
      AND YEAR(work_date) = ${year}
    GROUP BY MONTH(work_date)
    ORDER BY month ASC
  ` : null;

  return {
    period: { year, month: month ?? null },
    summary: {
      totalApprovedMinutes: Number(agg._sum.actualMinutes  ?? 0),
      totalPlannedMinutes:  Number(agg._sum.plannedMinutes ?? 0),
      sessionCount:         agg._count.id,
    },
    byDayType,
    topUsers: byUserData,
    monthlyTrend: monthlyOT,
  };
}

module.exports = {
  getDashboardStats,
  getHRStats,
  getAttendanceStats,
  getLeaveStats,
  getPayrollStats,
  getProjectStats,
  getFinanceStats,
  getOvertimeStats,
};
