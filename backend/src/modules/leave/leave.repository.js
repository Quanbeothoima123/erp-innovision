'use strict';

const { prisma } = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE TYPE                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyLeaveTypes({ search, isActive, isPaid, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [{ name: { contains: search } }, { code: { contains: search } }],
    }),
    ...(isActive !== undefined && { isActive }),
    ...(isPaid !== undefined && { isPaid }),
  };
  const [total, leaveTypes] = await prisma.$transaction([
    prisma.leaveType.count({ where }),
    prisma.leaveType.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
  ]);
  return { leaveTypes, total };
}

async function findLeaveTypeById(id) {
  return prisma.leaveType.findUnique({ where: { id } });
}

async function findLeaveTypeByCode(code) {
  return prisma.leaveType.findUnique({ where: { code } });
}

async function findLeaveTypeByName(name) {
  return prisma.leaveType.findUnique({ where: { name } });
}

async function findAllActiveLeaveTypes() {
  return prisma.leaveType.findMany({
    where: { isActive: true },
    select: {
      id: true, code: true, name: true, isPaid: true,
      maxDaysPerYear: true, requiresDocument: true,
    },
    orderBy: { name: 'asc' },
  });
}

async function createLeaveType(data) {
  return prisma.leaveType.create({ data });
}

async function updateLeaveType(id, data) {
  return prisma.leaveType.update({ where: { id }, data });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE BALANCE                                           ║
// ╚══════════════════════════════════════════════════════════╝

const BALANCE_INCLUDE = {
  user: {
    select: { id: true, fullName: true, userCode: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
    },
  },
  leaveType: { select: { id: true, code: true, name: true, isPaid: true } },
};

async function findManyBalances({ userId, leaveTypeId, year, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(leaveTypeId && { leaveTypeId }),
    ...(year && { year }),
  };
  const [total, balances] = await prisma.$transaction([
    prisma.leaveBalance.count({ where }),
    prisma.leaveBalance.findMany({
      where,
      include: BALANCE_INCLUDE,
      orderBy: [{ year: 'desc' }, { leaveType: { name: 'asc' } }],
      skip,
      take: limit,
    }),
  ]);
  return { balances, total };
}

/** Lấy toàn bộ balance của 1 user trong 1 năm */
async function findUserBalancesByYear(userId, year) {
  return prisma.leaveBalance.findMany({
    where: { userId, year },
    include: BALANCE_INCLUDE,
    orderBy: { leaveType: { name: 'asc' } },
  });
}

/** Lấy balance cụ thể — unique key: userId + leaveTypeId + year */
async function findBalance(userId, leaveTypeId, year) {
  return prisma.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    include: BALANCE_INCLUDE,
  });
}

async function upsertBalance(userId, leaveTypeId, year, data) {
  const remaining = _calcRemaining(data);
  return prisma.leaveBalance.upsert({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    create: {
      userId, leaveTypeId, year,
      entitledDays: data.entitledDays ?? 0,
      carriedDays: data.carriedDays ?? 0,
      adjustedDays: data.adjustedDays ?? 0,
      usedDays: data.usedDays ?? 0,
      pendingDays: data.pendingDays ?? 0,
      remainingDays: remaining,
      notes: data.notes ?? null,
    },
    update: {
      entitledDays: data.entitledDays ?? undefined,
      carriedDays: data.carriedDays ?? undefined,
      adjustedDays: data.adjustedDays ?? undefined,
      remainingDays: remaining,
      notes: data.notes ?? undefined,
    },
    include: BALANCE_INCLUDE,
  });
}

/** Tăng pendingDays khi nhân viên gửi đơn, giảm remainingDays */
async function incrementPending(userId, leaveTypeId, year, days) {
  return prisma.leaveBalance.update({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    data: {
      pendingDays: { increment: days },
      remainingDays: { decrement: days },
    },
  });
}

/** Hoàn trả pendingDays khi đơn bị hủy hoặc từ chối */
async function decrementPending(userId, leaveTypeId, year, days) {
  return prisma.leaveBalance.update({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    data: {
      pendingDays: { decrement: days },
      remainingDays: { increment: days },
    },
  });
}

/** Khi HR duyệt xong (final approve): pendingDays → usedDays */
async function convertPendingToUsed(userId, leaveTypeId, year, days) {
  return prisma.leaveBalance.update({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    data: {
      pendingDays: { decrement: days },
      usedDays: { increment: days },
    },
  });
}

/** HR điều chỉnh adjustedDays, tính lại remainingDays */
async function adjustBalance(userId, leaveTypeId, year, delta, notes) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.leaveBalance.findUniqueOrThrow({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    const newAdjusted = Number(current.adjustedDays) + delta;
    const newRemaining = Number(current.remainingDays) + delta;
    return tx.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: {
        adjustedDays: newAdjusted,
        remainingDays: newRemaining,
        notes: notes ?? current.notes,
      },
      include: BALANCE_INCLUDE,
    });
  });
}

/** Khởi tạo balance cho tất cả loại phép active → 1 user */
async function initBalancesForUser(userId, year, leaveTypes) {
  const data = leaveTypes.map((lt) => ({
    userId,
    leaveTypeId: lt.id,
    year,
    entitledDays: lt.maxDaysPerYear ? Number(lt.maxDaysPerYear) : 0,
    carriedDays: 0,
    adjustedDays: 0,
    usedDays: 0,
    pendingDays: 0,
    remainingDays: lt.maxDaysPerYear ? Number(lt.maxDaysPerYear) : 0,
  }));
  return prisma.leaveBalance.createMany({ data, skipDuplicates: true });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE REQUEST                                           ║
// ╚══════════════════════════════════════════════════════════╝

const REQUEST_INCLUDE = {
  user: {
    select: {
      id: true, fullName: true, userCode: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
      jobTitle: { select: { name: true } },
      manager: { select: { id: true, fullName: true } },
    },
  },
  leaveType: { select: { id: true, code: true, name: true, isPaid: true, requiresDocument: true } },
  approvals: {
    include: {
      approver: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: { stepOrder: 'asc' },
  },
};

async function findManyRequests({
  userId, leaveTypeId, status, currentStep,
  fromDate, toDate, departmentId, year,
  sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(leaveTypeId && { leaveTypeId }),
    ...(status && { status }),
    ...(currentStep && { currentStep }),
    ...(departmentId && { user: { departmentId } }),
    ...(year && {
      startDate: { gte: new Date(year, 0, 1) },
      endDate: { lte: new Date(year, 11, 31) },
    }),
    ...(fromDate && toDate
      ? { startDate: { gte: fromDate }, endDate: { lte: toDate } }
      : fromDate ? { startDate: { gte: fromDate } }
      : toDate ? { endDate: { lte: toDate } } : {}),
  };
  const [total, requests] = await prisma.$transaction([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { submittedAt: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { requests, total };
}

async function findRequestById(id) {
  return prisma.leaveRequest.findUnique({
    where: { id },
    include: REQUEST_INCLUDE,
  });
}

async function createLeaveRequest(data) {
  return prisma.leaveRequest.create({
    data,
    include: REQUEST_INCLUDE,
  });
}

async function updateLeaveRequest(id, data) {
  return prisma.leaveRequest.update({
    where: { id },
    data,
    include: REQUEST_INCLUDE,
  });
}

// ── Approval steps ────────────────────────────────────────────

async function createApprovalStep(data) {
  return prisma.leaveRequestApproval.create({ data });
}

async function findApprovalStep(leaveRequestId, stepType) {
  return prisma.leaveRequestApproval.findUnique({
    where: { leaveRequestId_stepType: { leaveRequestId, stepType } },
  });
}

async function updateApprovalStep(id, data) {
  return prisma.leaveRequestApproval.update({ where: { id }, data });
}

/** Lấy các đơn đang chờ người dùng này duyệt (theo stepType + approverUserId) */
async function findPendingApprovalsForUser(approverUserId, stepType) {
  return prisma.leaveRequestApproval.findMany({
    where: { approverUserId, stepType, status: 'PENDING' },
    include: { leaveRequest: { include: REQUEST_INCLUDE } },
    orderBy: { createdAt: 'asc' },
  });
}

// ── Overlap check ─────────────────────────────────────────────

/**
 * Kiểm tra nhân viên đã có đơn trùng ngày chưa
 * (bỏ qua đơn CANCELLED / REJECTED)
 */
async function findOverlappingRequest(userId, startDate, endDate, excludeId) {
  return prisma.leaveRequest.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ['CANCELLED', 'REJECTED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────

function _calcRemaining(d) {
  return (
    Number(d.entitledDays ?? 0) +
    Number(d.carriedDays ?? 0) +
    Number(d.adjustedDays ?? 0) -
    Number(d.usedDays ?? 0) -
    Number(d.pendingDays ?? 0)
  );
}

module.exports = {
  // LeaveType
  findManyLeaveTypes, findLeaveTypeById, findLeaveTypeByCode, findLeaveTypeByName,
  findAllActiveLeaveTypes, createLeaveType, updateLeaveType,
  // LeaveBalance
  findManyBalances, findUserBalancesByYear, findBalance,
  upsertBalance, incrementPending, decrementPending,
  convertPendingToUsed, adjustBalance, initBalancesForUser,
  // LeaveRequest
  findManyRequests, findRequestById, createLeaveRequest,
  updateLeaveRequest, findOverlappingRequest,
  // Approval
  createApprovalStep, findApprovalStep, updateApprovalStep,
  findPendingApprovalsForUser,
};
