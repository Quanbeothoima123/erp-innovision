"use strict";

const { prisma } = require("../../config/db");

// ╔══════════════════════════════════════════════════════════╗
// ║  WORK SHIFT                                              ║
// ╚══════════════════════════════════════════════════════════╝

const SHIFT_INCLUDE = {
  userWorkShifts: {
    where: { isActive: true },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  },
};

async function findManyShifts({
  search,
  shiftType,
  isActive,
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [{ name: { contains: search } }, { code: { contains: search } }],
    }),
    ...(shiftType && { shiftType }),
    ...(isActive !== undefined && { isActive }),
  };
  const [total, shifts] = await prisma.$transaction([
    prisma.workShift.count({ where }),
    prisma.workShift.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return { shifts, total };
}

async function findShiftById(id) {
  return prisma.workShift.findUnique({ where: { id } });
}

async function findShiftByCode(code) {
  return prisma.workShift.findUnique({ where: { code } });
}

async function findShiftByName(name) {
  return prisma.workShift.findUnique({ where: { name } });
}

async function findAllActiveShifts() {
  return prisma.workShift.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      shiftType: true,
      startTime: true,
      endTime: true,
      workMinutes: true,
    },
    orderBy: { name: "asc" },
  });
}

async function createShift(data) {
  return prisma.workShift.create({ data });
}

async function updateShift(id, data) {
  return prisma.workShift.update({ where: { id }, data });
}

async function countShiftUsages(shiftId) {
  return prisma.userWorkShift.count({ where: { shiftId, isActive: true } });
}

// ── UserWorkShift ─────────────────────────────────────────────

async function findUserWorkShifts(userId) {
  return prisma.userWorkShift.findMany({
    where: { userId, isActive: true },
    include: { shift: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

/**
 * Tìm ca làm việc của user tại 1 ngày cụ thể.
 * Ưu tiên: ca theo dayOfWeek > ca mặc định (dayOfWeek = null).
 */
async function findUserShiftForDate(userId, workDate) {
  const dayOfWeek = workDate.getDay() || 7; // 0=CN → 7, 1=T2 → 1...6=T7
  const dateStr = workDate;

  // Lấy tất cả ca active có effectiveFrom <= workDate và effectiveTo null hoặc >= workDate
  const userShifts = await prisma.userWorkShift.findMany({
    where: {
      userId,
      isActive: true,
      effectiveFrom: { lte: dateStr },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateStr } }],
    },
    include: { shift: true },
  });

  if (!userShifts.length) return null;

  // Ưu tiên ca theo ngày cụ thể
  const specificDay = userShifts.find((us) => us.dayOfWeek === dayOfWeek);
  if (specificDay) return specificDay.shift;

  // Fallback: ca mặc định (dayOfWeek = null)
  const defaultShift = userShifts.find((us) => us.dayOfWeek === null);
  return defaultShift?.shift ?? null;
}

async function assignUserShift(data) {
  return prisma.userWorkShift.create({
    data,
    include: { shift: true },
  });
}

async function deactivateUserShift(id) {
  return prisma.userWorkShift.update({
    where: { id },
    data: { isActive: false },
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  HOLIDAY                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyHolidays({ year, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = { ...(year && { year }) };
  const [total, holidays] = await prisma.$transaction([
    prisma.holiday.count({ where }),
    prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return { holidays, total };
}

async function findHolidayById(id) {
  return prisma.holiday.findUnique({ where: { id } });
}

async function findHolidayByDate(date) {
  return prisma.holiday.findUnique({ where: { date } });
}

/**
 * Lấy tất cả ngày lễ trong năm — dùng để check khi duyệt chấm công
 */
async function findHolidaysByYear(year) {
  return prisma.holiday.findMany({
    where: { year },
    select: { date: true, name: true, overtimeMultiplier: true },
  });
}

async function createHoliday(data) {
  return prisma.holiday.create({ data });
}

async function updateHoliday(id, data) {
  return prisma.holiday.update({ where: { id }, data });
}

async function deleteHoliday(id) {
  return prisma.holiday.delete({ where: { id } });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE REQUEST                                      ║
// ╚══════════════════════════════════════════════════════════╝

const REQUEST_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      userCode: true,
      department: { select: { id: true, name: true } },
      jobTitle: { select: { name: true } },
    },
  },
  reviewer: { select: { id: true, fullName: true } },
  shift: { select: { id: true, name: true, startTime: true, endTime: true } },
};

async function findManyRequests({
  userId,
  status,
  requestType,
  fromDate,
  toDate,
  departmentId,
  sortOrder = "desc",
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(status && { status }),
    ...(requestType && { requestType }),
    ...(fromDate && { workDate: { gte: fromDate } }),
    ...(toDate && { workDate: { lte: toDate } }),
    ...(fromDate && toDate && { workDate: { gte: fromDate, lte: toDate } }),
    ...(departmentId && { user: { departmentId } }),
  };
  const [total, requests] = await prisma.$transaction([
    prisma.attendanceRequest.count({ where }),
    prisma.attendanceRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { requests, total };
}

async function findRequestById(id) {
  return prisma.attendanceRequest.findUnique({
    where: { id },
    include: {
      ...REQUEST_INCLUDE,
      generatedCheckinRecord: true,
      generatedCheckoutRecord: true,
    },
  });
}

/**
 * Tìm request CHECK_IN đã APPROVED của user tại ngày workDate
 * → dùng để validate khi duyệt CHECK_OUT (phải có check-in trước)
 */
async function findApprovedCheckinForDate(userId, workDate) {
  return prisma.attendanceRequest.findFirst({
    where: { userId, workDate, requestType: "CHECK_IN", status: "APPROVED" },
  });
}

async function createAttendanceRequest(data) {
  return prisma.attendanceRequest.create({
    data,
    include: REQUEST_INCLUDE,
  });
}

async function updateAttendanceRequest(id, data) {
  return prisma.attendanceRequest.update({
    where: { id },
    data,
    include: REQUEST_INCLUDE,
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE RECORD                                       ║
// ╚══════════════════════════════════════════════════════════╝

const RECORD_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      userCode: true,
      department: { select: { id: true, name: true } },
    },
  },
  shift: {
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      workMinutes: true,
    },
  },
  adjustedBy: { select: { id: true, fullName: true } },
  sourceCheckin: { select: { id: true, requestedAt: true, requestType: true } },
  sourceCheckout: {
    select: { id: true, requestedAt: true, requestType: true },
  },
};

async function findManyRecords({
  userId,
  departmentId,
  fromDate,
  toDate,
  status,
  sortOrder = "desc",
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(userId && { userId }),
    ...(status && { status }),
    ...(departmentId && { user: { departmentId } }),
    ...(fromDate && toDate
      ? { workDate: { gte: fromDate, lte: toDate } }
      : fromDate
        ? { workDate: { gte: fromDate } }
        : toDate
          ? { workDate: { lte: toDate } }
          : {}),
  };
  const [total, records] = await prisma.$transaction([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      include: RECORD_INCLUDE,
      orderBy: { workDate: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { records, total };
}

async function findRecordById(id) {
  return prisma.attendanceRecord.findUnique({
    where: { id },
    include: RECORD_INCLUDE,
  });
}

/**
 * Tìm record theo userId + workDate (unique constraint)
 */
async function findRecordByUserAndDate(userId, workDate) {
  return prisma.attendanceRecord.findUnique({
    where: { userId_workDate: { userId, workDate } },
    include: RECORD_INCLUDE,
  });
}

async function createAttendanceRecord(data) {
  return prisma.attendanceRecord.create({
    data,
    include: RECORD_INCLUDE,
  });
}

async function updateAttendanceRecord(id, data) {
  return prisma.attendanceRecord.update({
    where: { id },
    data,
    include: RECORD_INCLUDE,
  });
}

async function upsertAttendanceRecord(userId, workDate, data) {
  return prisma.attendanceRecord.upsert({
    where: { userId_workDate: { userId, workDate } },
    create: { userId, workDate, ...data },
    update: data,
    include: RECORD_INCLUDE,
  });
}

async function deleteAttendanceRecord(id) {
  return prisma.attendanceRecord.delete({ where: { id } });
}

/**
 * Thống kê chấm công theo tháng cho 1 user
 */
async function getMonthlyStats(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // ngày cuối tháng

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      workDate: { gte: startDate, lte: endDate },
    },
    select: {
      status: true,
      totalWorkMinutes: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      overtimeMinutes: true,
      isHolidayWork: true,
      isWeekendWork: true,
    },
  });

  return records;
}

module.exports = {
  // Shift
  findManyShifts,
  findShiftById,
  findShiftByCode,
  findShiftByName,
  findAllActiveShifts,
  createShift,
  updateShift,
  countShiftUsages,
  // UserWorkShift
  findUserWorkShifts,
  findUserShiftForDate,
  assignUserShift,
  deactivateUserShift,
  // Holiday
  findManyHolidays,
  findHolidayById,
  findHolidayByDate,
  findHolidaysByYear,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  // Request
  findManyRequests,
  findRequestById,
  findApprovedCheckinForDate,
  createAttendanceRequest,
  updateAttendanceRequest,
  // Record
  findManyRecords,
  findRecordById,
  findRecordByUserAndDate,
  createAttendanceRecord,
  updateAttendanceRecord,
  upsertAttendanceRecord,
  deleteAttendanceRecord,
  getMonthlyStats,
};
