'use strict';

const { prisma } = require('../../config/db');

// ── Include chuẩn ─────────────────────────────────────────────

const OT_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      userCode: true,
      avatarUrl: true,
      department: { select: { id: true, name: true } },
      jobTitle: { select: { name: true } },
      manager: { select: { id: true, fullName: true } },
    },
  },
  approver: {
    select: { id: true, fullName: true, avatarUrl: true },
  },
};

// ── List & filter ─────────────────────────────────────────────

async function findMany({
  userId,
  departmentId,
  status,
  fromDate,
  toDate,
  isHoliday,
  isWeekend,
  year,
  month,
  sortOrder = 'desc',
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;

  // Build date range từ year/month nếu không có fromDate/toDate
  let dateFilter = {};
  if (fromDate && toDate) {
    dateFilter = { workDate: { gte: fromDate, lte: toDate } };
  } else if (fromDate) {
    dateFilter = { workDate: { gte: fromDate } };
  } else if (toDate) {
    dateFilter = { workDate: { lte: toDate } };
  } else if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    dateFilter = { workDate: { gte: start, lte: end } };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    dateFilter = { workDate: { gte: start, lte: end } };
  }

  const where = {
    ...(userId && { userId }),
    ...(status && { status }),
    ...(isHoliday !== undefined && { isHoliday }),
    ...(isWeekend !== undefined && { isWeekend }),
    ...(departmentId && { user: { departmentId } }),
    ...dateFilter,
  };

  const [total, requests] = await prisma.$transaction([
    prisma.overtimeRequest.count({ where }),
    prisma.overtimeRequest.findMany({
      where,
      include: OT_INCLUDE,
      orderBy: [{ workDate: sortOrder }, { startTime: 'asc' }],
      skip,
      take: limit,
    }),
  ]);

  return { requests, total };
}

// ── Find one ──────────────────────────────────────────────────

async function findById(id) {
  return prisma.overtimeRequest.findUnique({
    where: { id },
    include: OT_INCLUDE,
  });
}

// ── Kiểm tra trùng OT cùng ngày ──────────────────────────────

/**
 * Kiểm tra nhân viên đã có OT trùng khung giờ trong ngày chưa
 * (bỏ qua CANCELLED và REJECTED)
 */
async function findOverlapping(userId, workDate, startTime, endTime, excludeId) {
  return prisma.overtimeRequest.findFirst({
    where: {
      userId,
      workDate,
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ['CANCELLED', 'REJECTED'] },
      // Kiểm tra overlap: startTime < other.endTime AND endTime > other.startTime
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });
}

// ── Create / Update ───────────────────────────────────────────

async function create(data) {
  return prisma.overtimeRequest.create({
    data,
    include: OT_INCLUDE,
  });
}

async function update(id, data) {
  return prisma.overtimeRequest.update({
    where: { id },
    data,
    include: OT_INCLUDE,
  });
}

// ── AttendanceRecord: cập nhật overtimeApprovedMinutes ───────

/**
 * Sau khi duyệt OT → ghi overtimeApprovedMinutes vào AttendanceRecord cùng ngày
 */
async function updateAttendanceOTMinutes(userId, workDate, approvedMinutes) {
  return prisma.attendanceRecord.updateMany({
    where: {
      userId,
      workDate,
    },
    data: {
      overtimeApprovedMinutes: approvedMinutes,
    },
  });
}

// ── UserCompensation: lấy OT rates ───────────────────────────

/**
 * Lấy compensation đang active của user để tính OT pay.
 * Trả về null nếu chưa cấu hình lương.
 */
async function findActiveCompensation(userId) {
  return prisma.userCompensation.findFirst({
    where: { userId, isActive: true },
    select: {
      baseSalary: true,
      salaryType: true,
      standardWorkingDays: true,
      standardWorkingHours: true,
      overtimeRateWeekday: true,
      overtimeRateWeekend: true,
      overtimeRateHoliday: true,
      currency: true,
    },
    orderBy: { effectiveFrom: 'desc' },
  });
}

// ── Thống kê OT theo tháng / năm ─────────────────────────────

/**
 * Tổng hợp số phút OT đã được duyệt theo từng loại ngày
 */
async function getMonthlyOTStats(userId, year, month) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 0) : new Date(year, 11, 31);

  return prisma.overtimeRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      workDate: { gte: start, lte: end },
    },
    select: {
      workDate: true,
      plannedMinutes: true,
      actualMinutes: true,
      isHoliday: true,
      isWeekend: true,
    },
  });
}

/**
 * Tổng OT của tất cả nhân viên theo phòng / công ty — dùng cho báo cáo
 */
async function getDepartmentOTSummary(departmentId, year, month) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 0) : new Date(year, 11, 31);

  return prisma.overtimeRequest.groupBy({
    by: ['userId'],
    where: {
      user: departmentId ? { departmentId } : undefined,
      status: 'APPROVED',
      workDate: { gte: start, lte: end },
    },
    _sum: { actualMinutes: true, plannedMinutes: true },
    _count: { id: true },
  });
}

module.exports = {
  findMany,
  findById,
  findOverlapping,
  create,
  update,
  updateAttendanceOTMinutes,
  findActiveCompensation,
  getMonthlyOTStats,
  getDepartmentOTSummary,
};
