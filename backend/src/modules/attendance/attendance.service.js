"use strict";

const repo = require("./attendance.repository");
const { AppError } = require("../../common/errors/AppError");
const { ROLES } = require("../../config/constants");

// ╔══════════════════════════════════════════════════════════╗
// ║  WORK SHIFT                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function listShifts(filters) {
  const { shifts, total } = await repo.findManyShifts(filters);
  return {
    shifts,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total },
  };
}

async function getShiftById(id) {
  const shift = await repo.findShiftById(id);
  if (!shift) throw AppError.notFound("Không tìm thấy ca làm việc.");
  return shift;
}

async function getShiftOptions() {
  return repo.findAllActiveShifts();
}

async function createShift(dto) {
  const existCode = await repo.findShiftByCode(dto.code);
  if (existCode) throw AppError.conflict(`Mã ca '${dto.code}' đã tồn tại.`);

  const existName = await repo.findShiftByName(dto.name);
  if (existName) throw AppError.conflict(`Tên ca '${dto.name}' đã tồn tại.`);

  return repo.createShift(dto);
}

async function updateShift(id, dto) {
  await _assertShiftExists(id);

  if (dto.code) {
    const other = await repo.findShiftByCode(dto.code);
    if (other && other.id !== id)
      throw AppError.conflict(`Mã ca '${dto.code}' đã tồn tại.`);
  }
  if (dto.name) {
    const other = await repo.findShiftByName(dto.name);
    if (other && other.id !== id)
      throw AppError.conflict(`Tên ca '${dto.name}' đã tồn tại.`);
  }

  return repo.updateShift(id, _clean(dto));
}

async function deleteShift(id) {
  await _assertShiftExists(id);
  const usageCount = await repo.countShiftUsages(id);
  if (usageCount > 0) {
    // Còn nhân viên đang dùng → deactivate
    await repo.updateShift(id, { isActive: false });
    return { deleted: false, deactivated: true, usageCount };
  }
  await repo.updateShift(id, { isActive: false });
  return { deleted: false, deactivated: true };
}

// ── UserWorkShift ─────────────────────────────────────────────

async function getUserWorkShifts(userId) {
  return repo.findUserWorkShifts(userId);
}

async function assignUserShift(dto) {
  const shift = await repo.findShiftById(dto.shiftId);
  if (!shift) throw AppError.badRequest("Ca làm việc không tồn tại.");
  if (!shift.isActive)
    throw AppError.badRequest("Ca làm việc đã bị vô hiệu hóa.");

  return repo.assignUserShift({
    userId: dto.userId,
    shiftId: dto.shiftId,
    dayOfWeek: dto.dayOfWeek ?? null,
    effectiveFrom: dto.effectiveFrom,
    effectiveTo: dto.effectiveTo ?? null,
    notes: dto.notes ?? null,
    isActive: true,
  });
}

async function removeUserShift(userWorkShiftId) {
  return repo.deactivateUserShift(userWorkShiftId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  HOLIDAY                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listHolidays(filters) {
  const { holidays, total } = await repo.findManyHolidays(filters);
  return {
    holidays,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total },
  };
}

async function getHolidayById(id) {
  const holiday = await repo.findHolidayById(id);
  if (!holiday) throw AppError.notFound("Không tìm thấy ngày lễ.");
  return holiday;
}

async function createHoliday(dto) {
  const date = new Date(dto.date);
  date.setHours(0, 0, 0, 0);

  const existing = await repo.findHolidayByDate(date);
  if (existing)
    throw AppError.conflict(
      `Ngày ${_formatDate(date)} đã được khai báo là ngày lễ.`,
    );

  return repo.createHoliday({
    name: dto.name,
    date,
    year: date.getFullYear(),
    isRecurring: dto.isRecurring ?? false,
    description: dto.description ?? null,
    overtimeMultiplier: dto.overtimeMultiplier ?? 3.0,
  });
}

async function updateHoliday(id, dto) {
  const existing = await repo.findHolidayById(id);
  if (!existing) throw AppError.notFound("Không tìm thấy ngày lễ.");

  if (dto.date) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const conflict = await repo.findHolidayByDate(date);
    if (conflict && conflict.id !== id) {
      throw AppError.conflict(
        `Ngày ${_formatDate(date)} đã được khai báo là ngày lễ.`,
      );
    }
    dto.date = date;
    dto.year = date.getFullYear();
  }

  return repo.updateHoliday(id, _clean(dto));
}

async function deleteHoliday(id) {
  await repo.findHolidayById(id).then((h) => {
    if (!h) throw AppError.notFound("Không tìm thấy ngày lễ.");
  });
  await repo.deleteHoliday(id);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE REQUEST                                      ║
// ╚══════════════════════════════════════════════════════════╝

async function listRequests(filters, requestingUser) {
  // Map alias startDate/endDate → fromDate/toDate
  if (filters.startDate && !filters.fromDate) filters.fromDate = filters.startDate;
  if (filters.endDate && !filters.toDate) filters.toDate = filters.endDate;
  if (filters.type && !filters.requestType) filters.requestType = filters.type;
  // Nhân viên chỉ xem của chính mình
  const isHrOrAdmin = _isHrOrAdmin(requestingUser);
  if (!isHrOrAdmin) {
    filters.userId = requestingUser.id;
  }

  const { requests, total } = await repo.findManyRequests(filters);
  return {
    requests,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total },
  };
}

async function getRequestById(id, requestingUser) {
  const req = await repo.findRequestById(id);
  if (!req) throw AppError.notFound("Không tìm thấy yêu cầu chấm công.");

  // Nhân viên chỉ được xem của mình
  if (!_isHrOrAdmin(requestingUser) && req.userId !== requestingUser.id) {
    throw AppError.forbidden("Bạn không có quyền xem yêu cầu này.");
  }

  return req;
}

/**
 * Nhân viên tạo yêu cầu chấm công (CHECK_IN hoặc CHECK_OUT)
 */
async function createRequest(dto, requestingUser) {
  const workDate = new Date(dto.workDate);
  workDate.setHours(0, 0, 0, 0);

  // Không được tạo yêu cầu cho ngày trong tương lai xa (> 3 ngày)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 1);
  if (workDate > maxDate) {
    throw AppError.badRequest(
      "Không thể tạo yêu cầu chấm công cho ngày trong tương lai.",
    );
  }

  // Kiểm tra CHECK_OUT: phải có CHECK_IN đã duyệt trong ngày
  if (dto.requestType === "CHECK_OUT") {
    const approvedCheckIn = await repo.findApprovedCheckinForDate(
      requestingUser.id,
      workDate,
    );
    if (!approvedCheckIn) {
      throw AppError.badRequest(
        "Bạn chưa có yêu cầu check-in được duyệt trong ngày này. Vui lòng gửi check-in trước.",
      );
    }
  }

  // Kiểm tra không có request PENDING cùng loại cùng ngày
  const { requests } = await repo.findManyRequests({
    userId: requestingUser.id,
    requestType: dto.requestType,
    fromDate: workDate,
    toDate: workDate,
    status: "PENDING",
    page: 1,
    limit: 1,
  });
  if (requests.length > 0) {
    throw AppError.conflict(
      `Bạn đã có yêu cầu ${dto.requestType === "CHECK_IN" ? "check-in" : "check-out"} đang chờ duyệt trong ngày này.`,
    );
  }

  return repo.createAttendanceRequest({
    userId: requestingUser.id,
    requestType: dto.requestType,
    requestedAt: dto.requestedAt,
    workDate,
    shiftId: dto.shiftId ?? null,
    isRemoteWork: dto.isRemoteWork ?? false,
    note: dto.note ?? null,
    imageUrl: dto.imageUrl ?? null,
    status: "PENDING",
  });
}

/**
 * Admin/HR duyệt yêu cầu chấm công.
 *
 * Luồng:
 * CHECK_IN approved  → upsert AttendanceRecord (tạo mới nếu chưa có)
 *                       ghi checkInAt = request.requestedAt
 *                       tính lateMinutes từ ca làm việc của user
 *
 * CHECK_OUT approved → update AttendanceRecord cùng ngày
 *                       ghi checkOutAt = request.requestedAt
 *                       tính totalWorkMinutes, earlyLeaveMinutes, overtimeMinutes
 */
async function approveRequest(requestId, reviewerId, note) {
  const request = await repo.findRequestById(requestId);
  if (!request) throw AppError.notFound("Không tìm thấy yêu cầu chấm công.");
  if (request.status !== "PENDING") {
    throw AppError.badRequest(
      `Yêu cầu đã ở trạng thái '${request.status}', không thể duyệt lại.`,
    );
  }

  const workDate = new Date(request.workDate);
  workDate.setHours(0, 0, 0, 0);
  const userId = request.userId;

  // Lấy ca làm việc của user tại ngày đó
  const userShift = await repo.findUserShiftForDate(userId, workDate);
  const shift = request.shift ?? userShift;

  // Kiểm tra ngày lễ và cuối tuần
  const year = workDate.getFullYear();
  const holidays = await repo.findHolidaysByYear(year);
  const isHolidayWork = _isHoliday(workDate, holidays);
  const isWeekendWork = _isWeekend(workDate);

  let recordData = {};

  if (request.requestType === "CHECK_IN") {
    // ── CHECK_IN ───────────────────────────────────────────
    const lateMinutes = _calcLateMinutes(request.requestedAt, shift);

    recordData = {
      shiftId: shift?.id ?? request.shiftId ?? null,
      checkInAt: request.requestedAt,
      isRemoteWork: request.isRemoteWork,
      isHolidayWork,
      isWeekendWork,
      status: "PRESENT",
      lateMinutes,
      sourceCheckinRequestId: request.id,
    };

    // Tìm record hiện tại (nếu có check-out trước — trường hợp hiếm)
    const existingRecord = await repo.findRecordByUserAndDate(userId, workDate);

    if (existingRecord) {
      // Update record đã có, giữ lại checkOutAt
      await repo.updateAttendanceRecord(existingRecord.id, {
        ...recordData,
        // Nếu đã có checkOut thì tính lại totalWorkMinutes
        ...(existingRecord.checkOutAt && {
          totalWorkMinutes: _calcWorkMinutes(
            request.requestedAt,
            existingRecord.checkOutAt,
            shift,
          ),
          earlyLeaveMinutes: _calcEarlyLeaveMinutes(
            existingRecord.checkOutAt,
            shift,
          ),
          overtimeMinutes: _calcOvertimeMinutes(
            request.requestedAt,
            existingRecord.checkOutAt,
            shift,
          ),
        }),
      });
    } else {
      await repo.createAttendanceRecord({ userId, workDate, ...recordData });
    }
  } else {
    // ── CHECK_OUT ──────────────────────────────────────────
    const existingRecord = await repo.findRecordByUserAndDate(userId, workDate);
    if (!existingRecord) {
      throw AppError.badRequest(
        "Chưa có bản ghi check-in trong ngày này. Vui lòng duyệt check-in trước.",
      );
    }

    const checkInAt = existingRecord.checkInAt ?? request.requestedAt;
    const checkOutAt = request.requestedAt;

    const totalWorkMinutes = _calcWorkMinutes(checkInAt, checkOutAt, shift);
    const earlyLeaveMinutes = _calcEarlyLeaveMinutes(checkOutAt, shift);
    const overtimeMinutes = _calcOvertimeMinutes(checkInAt, checkOutAt, shift);

    await repo.updateAttendanceRecord(existingRecord.id, {
      checkOutAt,
      totalWorkMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      sourceCheckoutRequestId: request.id,
    });
  }

  // Cập nhật request → APPROVED
  return repo.updateAttendanceRequest(requestId, {
    status: "APPROVED",
    reviewerId,
    reviewedAt: new Date(),
    rejectReason: null,
  });
}

/**
 * Admin/HR từ chối yêu cầu chấm công
 */
async function rejectRequest(requestId, reviewerId, rejectReason) {
  const request = await repo.findRequestById(requestId);
  if (!request) throw AppError.notFound("Không tìm thấy yêu cầu chấm công.");
  if (request.status !== "PENDING") {
    throw AppError.badRequest(
      `Yêu cầu đã ở trạng thái '${request.status}', không thể từ chối.`,
    );
  }

  return repo.updateAttendanceRequest(requestId, {
    status: "REJECTED",
    reviewerId,
    reviewedAt: new Date(),
    rejectReason,
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE RECORD                                       ║
// ╚══════════════════════════════════════════════════════════╝

async function listRecords(filters, requestingUser) {
  // Map alias startDate/endDate → fromDate/toDate
  if (filters.startDate && !filters.fromDate) filters.fromDate = filters.startDate;
  if (filters.endDate && !filters.toDate) filters.toDate = filters.endDate;
  if (!_isHrOrAdmin(requestingUser)) {
    filters.userId = requestingUser.id;
  }
  const { records, total } = await repo.findManyRecords(filters);
  return {
    records,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total },
  };
}

async function getRecordById(id, requestingUser) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound("Không tìm thấy bản ghi chấm công.");

  if (!_isHrOrAdmin(requestingUser) && record.userId !== requestingUser.id) {
    throw AppError.forbidden("Bạn không có quyền xem bản ghi này.");
  }

  return record;
}

/**
 * Admin/HR tạo / điều chỉnh bản ghi thủ công (MANUAL_ADJUSTED)
 * Dùng khi nhân viên quên chấm công hoặc cần sửa dữ liệu
 */
async function manualAdjust(dto, adjustedByUserId) {
  const workDate = new Date(dto.workDate);
  workDate.setHours(0, 0, 0, 0);

  const year = workDate.getFullYear();
  const holidays = await repo.findHolidaysByYear(year);
  const isHolidayWork = dto.isHolidayWork ?? _isHoliday(workDate, holidays);
  const isWeekendWork = dto.isWeekendWork ?? _isWeekend(workDate);

  // Tính totalWorkMinutes nếu có đủ checkIn & checkOut
  let totalWorkMinutes = null;
  if (dto.checkInAt && dto.checkOutAt) {
    const shift = dto.shiftId ? await repo.findShiftById(dto.shiftId) : null;
    totalWorkMinutes = _calcWorkMinutes(dto.checkInAt, dto.checkOutAt, shift);
  }

  return repo.upsertAttendanceRecord(dto.userId, workDate, {
    shiftId: dto.shiftId ?? null,
    checkInAt: dto.checkInAt ?? null,
    checkOutAt: dto.checkOutAt ?? null,
    totalWorkMinutes,
    lateMinutes: dto.lateMinutes ?? 0,
    earlyLeaveMinutes: dto.earlyLeaveMinutes ?? 0,
    overtimeMinutes: dto.overtimeMinutes ?? 0,
    overtimeApprovedMinutes: 0,
    isHolidayWork,
    isWeekendWork,
    isRemoteWork: dto.isRemoteWork ?? false,
    status: "MANUAL_ADJUSTED",
    note: dto.note ?? null,
    adjustedByUserId,
    // Xóa liên kết với request cũ (đây là điều chỉnh thủ công)
    sourceCheckinRequestId: null,
    sourceCheckoutRequestId: null,
  });
}

async function updateRecord(id, dto, adjustedByUserId) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound("Không tìm thấy bản ghi chấm công.");

  // Tính lại totalWorkMinutes nếu cập nhật checkIn/checkOut
  const checkInAt = dto.checkInAt ?? record.checkInAt;
  const checkOutAt = dto.checkOutAt ?? record.checkOutAt;
  let totalWorkMinutes = record.totalWorkMinutes;
  if (checkInAt && checkOutAt) {
    const shift = dto.shiftId
      ? await repo.findShiftById(dto.shiftId)
      : record.shift;
    totalWorkMinutes = _calcWorkMinutes(checkInAt, checkOutAt, shift);
  }

  return repo.updateAttendanceRecord(id, {
    ..._clean(dto),
    totalWorkMinutes,
    status: "MANUAL_ADJUSTED",
    adjustedByUserId,
  });
}

async function deleteRecord(id) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound("Không tìm thấy bản ghi chấm công.");
  await repo.deleteAttendanceRecord(id);
}

// ── My Attendance ─────────────────────────────────────────────

async function getMyAttendance(filters, userId) {
  // Map alias startDate/endDate → fromDate/toDate
  if (filters.startDate && !filters.fromDate) filters.fromDate = filters.startDate;
  if (filters.endDate && !filters.toDate) filters.toDate = filters.endDate;
  // Nếu truyền month + year thì tính fromDate/toDate
  if (filters.month && filters.year) {
    filters.fromDate = new Date(filters.year, filters.month - 1, 1);
    filters.toDate = new Date(filters.year, filters.month, 0);
  }
  filters.userId = userId;
  const { records, total } = await repo.findManyRecords(filters);
  return {
    records,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total },
  };
}

async function getMyMonthlyStats(userId, year, month) {
  const records = await repo.getMonthlyStats(userId, year, month);
  return records;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE CALCULATION HELPERS                             ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tính số phút đi trễ.
 * lateMinutes = checkInAt - shift.startTime (nếu dương)
 * @param {Date}   checkInAt
 * @param {object} shift — { startTime: "08:00" }
 */
function _calcLateMinutes(checkInAt, shift) {
  if (!shift?.startTime) return 0;
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const shiftStart = new Date(checkInAt);
  shiftStart.setHours(sh, sm, 0, 0);

  const diff = Math.floor((checkInAt - shiftStart) / 60000);
  return Math.max(0, diff);
}

/**
 * Tính số phút về sớm.
 * earlyLeaveMinutes = shift.endTime - checkOutAt (nếu dương)
 */
function _calcEarlyLeaveMinutes(checkOutAt, shift) {
  if (!shift?.endTime) return 0;
  const [eh, em] = shift.endTime.split(":").map(Number);
  const shiftEnd = new Date(checkOutAt);
  shiftEnd.setHours(eh, em, 0, 0);

  // Nếu ca đêm qua ngày hôm sau cần điều chỉnh, nhưng đơn giản hóa ở đây
  const diff = Math.floor((shiftEnd - checkOutAt) / 60000);
  return Math.max(0, diff);
}

/**
 * Tính tổng phút làm việc thực tế (không trừ break, service layer tính gross).
 */
function _calcWorkMinutes(checkInAt, checkOutAt, shift) {
  if (!checkInAt || !checkOutAt) return null;
  const gross = Math.floor(
    (new Date(checkOutAt) - new Date(checkInAt)) / 60000,
  );
  const breakMinutes = shift?.breakMinutes ?? 0;
  return Math.max(0, gross - breakMinutes);
}

/**
 * Tính số phút OT = totalWorkMinutes - workMinutes (chuẩn của ca) nếu dương.
 * overtimeAfterMinutes là ngưỡng buffer trước khi tính OT.
 */
function _calcOvertimeMinutes(checkInAt, checkOutAt, shift) {
  if (!shift) return 0;
  const workMinutes = _calcWorkMinutes(checkInAt, checkOutAt, shift);
  if (!workMinutes) return 0;
  const threshold = shift.workMinutes + (shift.overtimeAfterMinutes ?? 0);
  return Math.max(0, workMinutes - threshold);
}

function _isHoliday(date, holidays) {
  const d = date.toISOString().split("T")[0];
  return holidays.some(
    (h) => new Date(h.date).toISOString().split("T")[0] === d,
  );
}

function _isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // CN hoặc T7
}

function _formatDate(date) {
  return date.toLocaleDateString("vi-VN");
}

function _clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

function _isHrOrAdmin(user) {
  return user.roles.some((r) => [ROLES.ADMIN, ROLES.HR].includes(r));
}

async function _assertShiftExists(id) {
  const shift = await repo.findShiftById(id);
  if (!shift) throw AppError.notFound("Không tìm thấy ca làm việc.");
  return shift;
}

module.exports = {
  // Shift
  listShifts,
  getShiftById,
  getShiftOptions,
  createShift,
  updateShift,
  deleteShift,
  // UserWorkShift
  getUserWorkShifts,
  assignUserShift,
  removeUserShift,
  // Holiday
  listHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  // Request
  listRequests,
  getRequestById,
  createRequest,
  approveRequest,
  rejectRequest,
  // Record
  listRecords,
  getRecordById,
  manualAdjust,
  updateRecord,
  deleteRecord,
  // My
  getMyAttendance,
  getMyMonthlyStats,
};
