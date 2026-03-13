'use strict';

const repo = require('./overtime.repository');
const { AppError } = require('../../common/errors/AppError');
const { ROLES } = require('../../config/constants');
const { prisma } = require('../../config/db');

// ── List ──────────────────────────────────────────────────────

async function listOvertimeRequests(filters, requestingUser) {
  // Nhân viên thường chỉ xem của mình
  if (!_canManageOT(requestingUser)) {
    filters.userId = requestingUser.id;
  }

  const { requests, total } = await repo.findMany(filters);
  return { requests, pagination: _page(filters, total) };
}

// ── Get one ───────────────────────────────────────────────────

async function getOvertimeById(id, requestingUser) {
  const ot = await repo.findById(id);
  if (!ot) throw AppError.notFound('Không tìm thấy yêu cầu làm thêm giờ.');

  if (!_canManageOT(requestingUser) && ot.userId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền xem yêu cầu này.');
  }

  return ot;
}

// ── Create ────────────────────────────────────────────────────

/**
 * Nhân viên gửi yêu cầu OT.
 *
 * Xử lý:
 *  1. Tính plannedMinutes từ startTime–endTime (hỗ trợ OT qua đêm)
 *  2. Tự động detect isHoliday + isWeekend từ ngày workDate
 *  3. Kiểm tra trùng khung giờ OT trong ngày
 *  4. Không cho gửi đơn cho ngày quá 30 ngày trước
 */
async function createOvertimeRequest(dto, requestingUser) {
  const workDate = _toDateOnly(dto.workDate);

  // Giới hạn gửi đơn ngược (tối đa 30 ngày trước)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 30);
  if (workDate < minDate) {
    throw AppError.badRequest('Không thể gửi yêu cầu OT cho ngày đã qua quá 30 ngày.');
  }

  const plannedMinutes = _calcMinutes(dto.startTime, dto.endTime);
  if (plannedMinutes <= 0) {
    throw AppError.badRequest('Giờ kết thúc phải sau giờ bắt đầu.');
  }

  // Detect ngày lễ và cuối tuần
  const year = workDate.getFullYear();
  const holidays = await _getHolidaysForYear(year);
  const isHoliday = _isHoliday(workDate, holidays);
  const isWeekend = _isWeekend(workDate);

  // Kiểm tra trùng khung giờ
  const overlap = await repo.findOverlapping(
    requestingUser.id,
    workDate,
    dto.startTime,
    dto.endTime,
    null,
  );
  if (overlap) {
    throw AppError.conflict(
      `Bạn đã có yêu cầu OT trùng khung giờ (${overlap.startTime}–${overlap.endTime}) trong ngày này.`,
    );
  }

  // Xác định người duyệt mặc định = manager trực tiếp
  const requester = await prisma.user.findUnique({
    where: { id: requestingUser.id },
    select: { managerId: true },
  });

  return repo.create({
    userId: requestingUser.id,
    approverUserId: requester?.managerId ?? null,
    workDate,
    startTime: dto.startTime,
    endTime: dto.endTime,
    plannedMinutes,
    actualMinutes: null,
    isHoliday,
    isWeekend,
    reason: dto.reason ?? null,
    status: 'PENDING',
    submittedAt: new Date(),
  });
}

// ── Cancel ────────────────────────────────────────────────────

async function cancelOvertimeRequest(id, requestingUser, comment) {
  const ot = await _assertExists(id);

  // Chỉ chủ đơn hoặc HR/Admin mới hủy được
  if (ot.userId !== requestingUser.id && !_canManageOT(requestingUser)) {
    throw AppError.forbidden('Bạn không có quyền hủy yêu cầu này.');
  }

  if (ot.status !== 'PENDING') {
    throw AppError.badRequest(`Không thể hủy yêu cầu ở trạng thái '${ot.status}'.`);
  }

  return repo.update(id, {
    status: 'CANCELLED',
    comment: comment ?? null,
    actionAt: new Date(),
  });
}

// ── Approve ───────────────────────────────────────────────────

/**
 * Manager / HR duyệt yêu cầu OT.
 *
 * Xử lý:
 *  1. Validate quyền duyệt
 *  2. actualMinutes = body.actualMinutes ?? plannedMinutes
 *  3. Cập nhật OvertimeRequest → APPROVED
 *  4. Cập nhật AttendanceRecord.overtimeApprovedMinutes (nếu tồn tại)
 */
async function approveOvertimeRequest(id, requestingUser, dto) {
  const ot = await _assertExists(id);
  _assertCanApprove(ot, requestingUser);

  if (ot.status !== 'PENDING') {
    throw AppError.badRequest(`Yêu cầu đã ở trạng thái '${ot.status}', không thể duyệt.`);
  }

  const actualMinutes = dto.actualMinutes ?? ot.plannedMinutes;

  if (actualMinutes > ot.plannedMinutes) {
    throw AppError.badRequest(
      `Số phút thực tế (${actualMinutes}) không được vượt quá số phút đăng ký (${ot.plannedMinutes}).`,
    );
  }

  // Cập nhật OT request
  const updated = await repo.update(id, {
    status: 'APPROVED',
    approverUserId: requestingUser.id,
    actualMinutes,
    comment: dto.comment ?? null,
    actionAt: new Date(),
  });

  // Ghi overtimeApprovedMinutes vào AttendanceRecord nếu có
  await repo.updateAttendanceOTMinutes(ot.userId, ot.workDate, actualMinutes);

  return updated;
}

// ── Reject ────────────────────────────────────────────────────

async function rejectOvertimeRequest(id, requestingUser, comment) {
  const ot = await _assertExists(id);
  _assertCanApprove(ot, requestingUser);

  if (ot.status !== 'PENDING') {
    throw AppError.badRequest(`Yêu cầu đã ở trạng thái '${ot.status}', không thể từ chối.`);
  }

  return repo.update(id, {
    status: 'REJECTED',
    approverUserId: requestingUser.id,
    comment,
    actionAt: new Date(),
  });
}

// ── Update actualMinutes (Admin điều chỉnh sau duyệt) ────────

async function updateActualMinutes(id, requestingUser, dto) {
  const ot = await _assertExists(id);

  if (!_canManageOT(requestingUser)) {
    throw AppError.forbidden('Chỉ HR/Admin mới có thể điều chỉnh sau duyệt.');
  }

  if (ot.status !== 'APPROVED') {
    throw AppError.badRequest('Chỉ có thể điều chỉnh yêu cầu đã được duyệt.');
  }

  const updated = await repo.update(id, {
    actualMinutes: dto.actualMinutes,
    comment: dto.comment ?? ot.comment,
  });

  // Cập nhật lại AttendanceRecord
  await repo.updateAttendanceOTMinutes(ot.userId, ot.workDate, dto.actualMinutes);

  return updated;
}

// ── My OT stats ───────────────────────────────────────────────

async function getMyOTStats(userId, year, month) {
  return repo.getMonthlyOTStats(userId, year, month);
}

// ── Department OT summary ─────────────────────────────────────

async function getDepartmentOTSummary(departmentId, year, month, requestingUser) {
  if (!_canManageOT(requestingUser)) {
    throw AppError.forbidden('Bạn không có quyền xem báo cáo OT phòng ban.');
  }
  return repo.getDepartmentOTSummary(departmentId, year, month);
}

// ── OT pay estimate cho 1 request ────────────────────────────

/**
 * Tính dự kiến tiền OT từ compensation hiện tại của user.
 * Chỉ HR/Admin và chủ đơn mới xem được.
 */
async function getOTPayEstimate(id, requestingUser) {
  const ot = await _assertExists(id);

  if (!_canManageOT(requestingUser) && ot.userId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền xem thông tin lương OT này.');
  }

  const compensation = await repo.findActiveCompensation(ot.userId);
  return { ot, compensation };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE HELPERS                                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tính số phút OT giữa startTime và endTime.
 * Hỗ trợ OT qua đêm: nếu endTime ≤ startTime → cộng thêm 1440 phút (24h).
 */
function _calcMinutes(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // qua đêm
  return endMins - startMins;
}

function _assertCanApprove(ot, requestingUser) {
  const isHrOrAdmin = _isHrOrAdmin(requestingUser);
  const isManager = requestingUser.roles.includes(ROLES.MANAGER);

  if (!isHrOrAdmin && !isManager) {
    throw AppError.forbidden('Chỉ Manager hoặc HR/Admin mới có thể duyệt yêu cầu OT.');
  }

  // Manager không tự duyệt đơn của mình
  if (ot.userId === requestingUser.id && !isHrOrAdmin) {
    throw AppError.forbidden('Bạn không thể tự duyệt yêu cầu OT của chính mình.');
  }
}

async function _assertExists(id) {
  const ot = await repo.findById(id);
  if (!ot) throw AppError.notFound('Không tìm thấy yêu cầu làm thêm giờ.');
  return ot;
}

async function _getHolidaysForYear(year) {
  return prisma.holiday.findMany({
    where: { year },
    select: { date: true },
  });
}

function _isHoliday(date, holidays) {
  const d = date.toISOString().split('T')[0];
  return holidays.some(
    (h) => new Date(h.date).toISOString().split('T')[0] === d,
  );
}

function _isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function _toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function _isHrOrAdmin(user) {
  return user.roles.some((r) => [ROLES.ADMIN, ROLES.HR].includes(r));
}

function _canManageOT(user) {
  return user.roles.some((r) =>
    [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(r),
  );
}

function _page(filters, total) {
  return { page: filters.page ?? 1, limit: filters.limit ?? 20, total };
}

module.exports = {
  listOvertimeRequests,
  getOvertimeById,
  createOvertimeRequest,
  cancelOvertimeRequest,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  updateActualMinutes,
  getMyOTStats,
  getDepartmentOTSummary,
  getOTPayEstimate,
};
