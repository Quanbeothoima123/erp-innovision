'use strict';

const { prisma } = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL PERIOD                                          ║
// ╚══════════════════════════════════════════════════════════╝

const PERIOD_INCLUDE = {
  approvedBy: { select: { id: true, fullName: true } },
  _count: { select: { payrollRecords: true, payrollAdjustments: true } },
};

async function findManyPeriods({ status, year, sortOrder = 'desc', page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(status && { status }),
    ...(year && { year }),
  };
  const [total, periods] = await prisma.$transaction([
    prisma.payrollPeriod.count({ where }),
    prisma.payrollPeriod.findMany({
      where,
      include: PERIOD_INCLUDE,
      orderBy: [{ year: sortOrder }, { month: sortOrder }],
      skip,
      take: limit,
    }),
  ]);
  return { periods, total };
}

async function findPeriodById(id) {
  return prisma.payrollPeriod.findUnique({
    where: { id },
    include: PERIOD_INCLUDE,
  });
}

async function findPeriodByMonthYear(month, year) {
  return prisma.payrollPeriod.findUnique({ where: { month_year: { month, year } } });
}

async function createPeriod(data) {
  return prisma.payrollPeriod.create({ data, include: PERIOD_INCLUDE });
}

async function updatePeriod(id, data) {
  return prisma.payrollPeriod.update({ where: { id }, data, include: PERIOD_INCLUDE });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  USER COMPENSATION                                       ║
// ╚══════════════════════════════════════════════════════════╝

const COMPENSATION_INCLUDE = {
  user: {
    select: {
      id: true, fullName: true, userCode: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
      jobTitle: { select: { name: true } },
    },
  },
};

async function findManyCompensations({ userId, isActive, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(isActive !== undefined && { isActive }),
  };
  const [total, compensations] = await prisma.$transaction([
    prisma.userCompensation.count({ where }),
    prisma.userCompensation.findMany({
      where,
      include: COMPENSATION_INCLUDE,
      orderBy: [{ userId: 'asc' }, { effectiveFrom: 'desc' }],
      skip,
      take: limit,
    }),
  ]);
  return { compensations, total };
}

async function findCompensationById(id) {
  return prisma.userCompensation.findUnique({ where: { id }, include: COMPENSATION_INCLUDE });
}

async function findActiveCompensation(userId) {
  return prisma.userCompensation.findFirst({
    where: { userId, isActive: true },
    orderBy: { effectiveFrom: 'desc' },
    include: COMPENSATION_INCLUDE,
  });
}

async function findCompensationHistory(userId) {
  return prisma.userCompensation.findMany({
    where: { userId },
    orderBy: { effectiveFrom: 'desc' },
  });
}

async function createCompensation(data) {
  return prisma.userCompensation.create({ data, include: COMPENSATION_INCLUDE });
}

async function updateCompensation(id, data) {
  return prisma.userCompensation.update({ where: { id }, data, include: COMPENSATION_INCLUDE });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SALARY COMPONENT                                        ║
// ╚══════════════════════════════════════════════════════════╝

async function findManySalaryComponents({ componentType, isActive, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(componentType && { componentType }),
    ...(isActive !== undefined && { isActive }),
  };
  const [total, components] = await prisma.$transaction([
    prisma.salaryComponent.count({ where }),
    prisma.salaryComponent.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
  ]);
  return { components, total };
}

async function findSalaryComponentById(id) {
  return prisma.salaryComponent.findUnique({ where: { id } });
}

async function findSalaryComponentByCode(code) {
  return prisma.salaryComponent.findUnique({ where: { code } });
}

async function findAllActiveSalaryComponents() {
  return prisma.salaryComponent.findMany({
    where: { isActive: true },
    orderBy: [{ componentType: 'asc' }, { displayOrder: 'asc' }],
  });
}

async function createSalaryComponent(data) {
  return prisma.salaryComponent.create({ data });
}

async function updateSalaryComponent(id, data) {
  return prisma.salaryComponent.update({ where: { id }, data });
}

// ── UserSalaryComponent ───────────────────────────────────────

async function findUserSalaryComponents(userId) {
  return prisma.userSalaryComponent.findMany({
    where: { userId, isActive: true },
    include: { salaryComponent: true },
    orderBy: { salaryComponent: { displayOrder: 'asc' } },
  });
}

/**
 * Lấy thành phần lương active tại 1 ngày cụ thể (dùng khi tính lương)
 */
async function findUserSalaryComponentsAtDate(userId, date) {
  return prisma.userSalaryComponent.findMany({
    where: {
      userId,
      isActive: true,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    include: { salaryComponent: true },
  });
}

async function assignSalaryComponent(data) {
  return prisma.userSalaryComponent.create({
    data,
    include: { salaryComponent: true },
  });
}

async function deactivateUserSalaryComponent(id) {
  return prisma.userSalaryComponent.update({
    where: { id },
    data: { isActive: false },
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL ADJUSTMENT                                      ║
// ╚══════════════════════════════════════════════════════════╝

const ADJUSTMENT_INCLUDE = {
  user: {
    select: {
      id: true, fullName: true, userCode: true,
      department: { select: { id: true, name: true } },
    },
  },
  payrollPeriod: { select: { id: true, periodCode: true, month: true, year: true } },
  createdBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
};

async function findManyAdjustments({
  userId, payrollPeriodId, adjustmentType, status,
  sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(payrollPeriodId && { payrollPeriodId }),
    ...(adjustmentType && { adjustmentType }),
    ...(status && { status }),
  };
  const [total, adjustments] = await prisma.$transaction([
    prisma.payrollAdjustment.count({ where }),
    prisma.payrollAdjustment.findMany({
      where,
      include: ADJUSTMENT_INCLUDE,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { adjustments, total };
}

async function findAdjustmentById(id) {
  return prisma.payrollAdjustment.findUnique({ where: { id }, include: ADJUSTMENT_INCLUDE });
}

/**
 * Lấy tất cả điều chỉnh APPROVED cho user trong kỳ lương (dùng khi tính lương)
 */
async function findApprovedAdjustmentsForPeriod(userId, payrollPeriodId) {
  return prisma.payrollAdjustment.findMany({
    where: { userId, payrollPeriodId, status: 'APPROVED' },
  });
}

async function createAdjustment(data) {
  return prisma.payrollAdjustment.create({ data, include: ADJUSTMENT_INCLUDE });
}

async function updateAdjustment(id, data) {
  return prisma.payrollAdjustment.update({ where: { id }, data, include: ADJUSTMENT_INCLUDE });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL RECORD                                          ║
// ╚══════════════════════════════════════════════════════════╝

const RECORD_INCLUDE = {
  user: {
    select: {
      id: true, fullName: true, userCode: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
      jobTitle: { select: { name: true } },
    },
  },
  payrollPeriod: {
    select: { id: true, periodCode: true, month: true, year: true, payDate: true, status: true },
  },
  items: {
    include: { salaryComponent: { select: { id: true, code: true, name: true } } },
    orderBy: { itemType: 'asc' },
  },
};

async function findManyRecords({ payrollPeriodId, userId, departmentId, status, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(payrollPeriodId && { payrollPeriodId }),
    ...(userId && { userId }),
    ...(status && { status }),
    ...(departmentId && { user: { departmentId } }),
  };
  const [total, records] = await prisma.$transaction([
    prisma.payrollRecord.count({ where }),
    prisma.payrollRecord.findMany({
      where,
      include: RECORD_INCLUDE,
      orderBy: { user: { fullName: 'asc' } },
      skip,
      take: limit,
    }),
  ]);
  return { records, total };
}

async function findRecordById(id) {
  return prisma.payrollRecord.findUnique({ where: { id }, include: RECORD_INCLUDE });
}

async function findRecordByPeriodAndUser(payrollPeriodId, userId) {
  return prisma.payrollRecord.findUnique({
    where: { payrollPeriodId_userId: { payrollPeriodId, userId } },
    include: RECORD_INCLUDE,
  });
}

async function upsertPayrollRecord(payrollPeriodId, userId, data, items) {
  return prisma.$transaction(async (tx) => {
    // Upsert record chính
    const record = await tx.payrollRecord.upsert({
      where: { payrollPeriodId_userId: { payrollPeriodId, userId } },
      create: { payrollPeriodId, userId, ...data },
      update: data,
    });

    // Xóa items cũ → insert items mới
    await tx.payrollRecordItem.deleteMany({ where: { payrollRecordId: record.id } });
    if (items.length > 0) {
      await tx.payrollRecordItem.createMany({
        data: items.map((item) => ({ ...item, payrollRecordId: record.id })),
      });
    }

    return tx.payrollRecord.findUnique({ where: { id: record.id }, include: RECORD_INCLUDE });
  });
}

async function updatePayrollRecord(id, data) {
  return prisma.payrollRecord.update({ where: { id }, data, include: RECORD_INCLUDE });
}

// ── Insurance & Tax policies ──────────────────────────────────

async function findActiveInsurancePolicies() {
  return prisma.insurancePolicy.findMany({
    where: { isActive: true },
    orderBy: { policyType: 'asc' },
  });
}

async function findActiveTaxPolicy(year) {
  return prisma.taxPolicy.findFirst({
    where: { year, isActive: true },
    include: { brackets: { orderBy: { bracketOrder: 'asc' } } },
  });
}

// ── Attendance summary cho kỳ lương ──────────────────────────

/**
 * Tổng hợp dữ liệu chấm công của user trong kỳ:
 * - Số ngày đi làm (PRESENT / MANUAL_ADJUSTED)
 * - Số ngày nghỉ phép có lương / không lương
 * - Số ngày vắng mặt
 * - Tổng phút muộn
 * - Tổng phút OT đã duyệt
 */
async function getAttendanceSummary(userId, startDate, endDate) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      workDate: { gte: startDate, lte: endDate },
    },
    select: {
      status: true,
      totalWorkMinutes: true,
      lateMinutes: true,
      overtimeApprovedMinutes: true,
      isHolidayWork: true,
      isWeekendWork: true,
    },
  });
  return records;
}

/**
 * OT đã duyệt trong kỳ, phân loại theo ngày thường/cuối tuần/lễ
 */
async function getApprovedOTSummary(userId, startDate, endDate) {
  return prisma.overtimeRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      workDate: { gte: startDate, lte: endDate },
    },
    select: {
      actualMinutes: true,
      plannedMinutes: true,
      isHoliday: true,
      isWeekend: true,
    },
  });
}

/**
 * Ngày nghỉ phép đã được duyệt (final) trong kỳ — tính paidLeaveDays / unpaidLeaveDays
 */
async function getApprovedLeaveSummary(userId, startDate, endDate) {
  return prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { leaveType: { select: { isPaid: true } } },
    select: {
      totalDays: true,
      startDate: true,
      endDate: true,
      leaveType: true,
    },
  });
}

/**
 * Lấy tất cả user ACTIVE cần tính lương trong kỳ
 */
async function findActiveUsersForPayroll() {
  return prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      employmentStatus: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] },
    },
    select: { id: true, fullName: true, userCode: true },
  });
}

module.exports = {
  // Period
  findManyPeriods, findPeriodById, findPeriodByMonthYear,
  createPeriod, updatePeriod,
  // Compensation
  findManyCompensations, findCompensationById, findActiveCompensation,
  findCompensationHistory, createCompensation, updateCompensation,
  // SalaryComponent
  findManySalaryComponents, findSalaryComponentById, findSalaryComponentByCode,
  findAllActiveSalaryComponents, createSalaryComponent, updateSalaryComponent,
  // UserSalaryComponent
  findUserSalaryComponents, findUserSalaryComponentsAtDate,
  assignSalaryComponent, deactivateUserSalaryComponent,
  // Adjustment
  findManyAdjustments, findAdjustmentById, findApprovedAdjustmentsForPeriod,
  createAdjustment, updateAdjustment,
  // Record
  findManyRecords, findRecordById, findRecordByPeriodAndUser,
  upsertPayrollRecord, updatePayrollRecord,
  // Calculation data
  findActiveInsurancePolicies, findActiveTaxPolicy,
  getAttendanceSummary, getApprovedOTSummary,
  getApprovedLeaveSummary, findActiveUsersForPayroll,
};
