'use strict';

const repo = require('./leave.repository');
const { AppError } = require('../../common/errors/AppError');
const { ROLES } = require('../../config/constants');
const { prisma } = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE TYPE                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function listLeaveTypes(filters) {
  const { leaveTypes, total } = await repo.findManyLeaveTypes(filters);
  return { leaveTypes, pagination: _page(filters, total) };
}

async function getLeaveTypeById(id) {
  const lt = await repo.findLeaveTypeById(id);
  if (!lt) throw AppError.notFound('Không tìm thấy loại nghỉ phép.');
  return lt;
}

async function getLeaveTypeOptions() {
  return repo.findAllActiveLeaveTypes();
}

async function createLeaveType(dto) {
  const byCode = await repo.findLeaveTypeByCode(dto.code);
  if (byCode) throw AppError.conflict(`Mã loại phép '${dto.code}' đã tồn tại.`);

  const byName = await repo.findLeaveTypeByName(dto.name);
  if (byName) throw AppError.conflict(`Tên loại phép '${dto.name}' đã tồn tại.`);

  return repo.createLeaveType({
    code: dto.code,
    name: dto.name,
    description: dto.description ?? null,
    isPaid: dto.isPaid ?? true,
    isActive: dto.isActive ?? true,
    maxDaysPerYear: dto.maxDaysPerYear ?? null,
    requiresDocument: dto.requiresDocument ?? false,
  });
}

async function updateLeaveType(id, dto) {
  await _assertLeaveTypeExists(id);

  if (dto.name) {
    const other = await repo.findLeaveTypeByName(dto.name);
    if (other && other.id !== id) throw AppError.conflict(`Tên loại phép '${dto.name}' đã tồn tại.`);
  }

  return repo.updateLeaveType(id, _clean(dto));
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE BALANCE                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function listBalances(filters) {
  const { balances, total } = await repo.findManyBalances(filters);
  return { balances, pagination: _page(filters, total) };
}

/** Lấy toàn bộ số dư phép của 1 user trong 1 năm */
async function getUserBalances(userId, year) {
  const currentYear = year ?? new Date().getFullYear();
  return repo.findUserBalancesByYear(userId, currentYear);
}

/** HR/Admin set quota phép cho user */
async function upsertBalance(dto) {
  await _assertLeaveTypeExists(dto.leaveTypeId);

  return repo.upsertBalance(dto.userId, dto.leaveTypeId, dto.year, {
    entitledDays: dto.entitledDays,
    carriedDays: dto.carriedDays ?? 0,
    adjustedDays: dto.adjustedDays ?? 0,
    usedDays: 0,
    pendingDays: 0,
    notes: dto.notes ?? null,
  });
}

/** HR điều chỉnh số ngày (+ hoặc -) */
async function adjustBalance(userId, leaveTypeId, year, dto) {
  const balance = await repo.findBalance(userId, leaveTypeId, year);
  if (!balance) throw AppError.notFound('Không tìm thấy số dư phép. Hãy khởi tạo trước.');

  // Kiểm tra không cho remainingDays âm quá mức
  const newRemaining = Number(balance.remainingDays) + dto.adjustedDays;
  if (newRemaining < 0) {
    throw AppError.badRequest(
      `Số ngày phép còn lại sau điều chỉnh sẽ là ${newRemaining} ngày. Không thể âm.`,
    );
  }

  return repo.adjustBalance(userId, leaveTypeId, year, dto.adjustedDays, dto.notes);
}

/**
 * HR khởi tạo số dư phép đầu năm cho 1 user
 * — tạo balance cho tất cả loại phép đang active
 */
async function initUserBalances(userId, year) {
  const leaveTypes = await repo.findAllActiveLeaveTypes();
  if (!leaveTypes.length) throw AppError.badRequest('Chưa có loại nghỉ phép nào được kích hoạt.');

  await repo.initBalancesForUser(userId, year, leaveTypes);
  return repo.findUserBalancesByYear(userId, year);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE REQUEST                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function listRequests(filters, requestingUser) {
  // Nhân viên chỉ thấy đơn của mình
  if (!_isHrOrAdmin(requestingUser)) {
    if (!requestingUser.roles.includes(ROLES.MANAGER)) {
      filters.userId = requestingUser.id;
    }
    // Manager thấy đơn của phòng mình — departmentId sẽ được filter ở repo
  }

  const { requests, total } = await repo.findManyRequests(filters);
  return { requests, pagination: _page(filters, total) };
}

async function getRequestById(id, requestingUser) {
  const req = await repo.findRequestById(id);
  if (!req) throw AppError.notFound('Không tìm thấy đơn nghỉ phép.');

  // Nhân viên thường chỉ xem đơn của chính mình
  if (!_isHrOrAdmin(requestingUser) && !requestingUser.roles.includes(ROLES.MANAGER)) {
    if (req.userId !== requestingUser.id) throw AppError.forbidden('Bạn không có quyền xem đơn này.');
  }

  return req;
}

/**
 * Nhân viên tạo đơn xin nghỉ phép.
 *
 * Luồng sau khi tạo:
 *  1. Tính totalDays (trừ cuối tuần + ngày lễ)
 *  2. Kiểm tra số dư phép đủ không
 *  3. Kiểm tra không trùng ngày với đơn khác
 *  4. Tạo LeaveRequest (status = PENDING, currentStep = MANAGER)
 *  5. Tạo 2 bản ghi LeaveRequestApproval (MANAGER step1, HR step2)
 *  6. Tăng pendingDays trên LeaveBalance
 */
async function createRequest(dto, requestingUser) {
  const leaveType = await _assertLeaveTypeExists(dto.leaveTypeId);
  if (!leaveType.isActive) throw AppError.badRequest('Loại nghỉ phép này không còn hoạt động.');

  const startDate = _toDateOnly(dto.startDate);
  const endDate = _toDateOnly(dto.endDate);
  const year = startDate.getFullYear();

  // Kiểm tra ngày trong quá khứ (không cho phép gửi đơn cho ngày đã qua quá 7 ngày)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);
  if (startDate < minDate) {
    throw AppError.badRequest('Không thể gửi đơn nghỉ phép cho ngày đã qua quá 7 ngày.');
  }

  // Kiểm tra trùng ngày
  const overlap = await repo.findOverlappingRequest(requestingUser.id, startDate, endDate, null);
  if (overlap) {
    throw AppError.conflict(
      `Bạn đã có đơn nghỉ phép trùng ngày (${_fmtDate(overlap.startDate)} – ${_fmtDate(overlap.endDate)}).`,
    );
  }

  // Tính số ngày nghỉ thực (trừ cuối tuần và ngày lễ)
  const holidays = await _getHolidaysForRange(startDate, endDate);
  const totalDays = dto.isHalfDay ? 0.5 : _calcWorkDays(startDate, endDate, holidays);

  if (totalDays <= 0) {
    throw AppError.badRequest('Khoảng thời gian đã chọn không có ngày làm việc nào.');
  }

  // Kiểm tra cần tài liệu đính kèm không
  if (leaveType.requiresDocument && !dto.documentUrl) {
    throw AppError.badRequest(`Loại nghỉ phép '${leaveType.name}' yêu cầu phải đính kèm tài liệu.`);
  }

  // Kiểm tra số dư phép còn đủ
  const balance = await repo.findBalance(requestingUser.id, dto.leaveTypeId, year);
  if (!balance) {
    throw AppError.badRequest(
      `Bạn chưa được cấp phép năm ${year} cho loại '${leaveType.name}'. Vui lòng liên hệ HR.`,
    );
  }
  if (Number(balance.remainingDays) < totalDays) {
    throw AppError.badRequest(
      `Số ngày phép còn lại không đủ. Bạn còn ${Number(balance.remainingDays)} ngày, cần ${totalDays} ngày.`,
    );
  }

  // Xác định manager duyệt bước 1
  const requester = await prisma.user.findUnique({
    where: { id: requestingUser.id },
    select: { managerId: true },
  });

  const managerApproverId = requester?.managerId;

  // Tạo LeaveRequest + LeaveRequestApproval trong transaction
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.leaveRequest.create({
      data: {
        userId: requestingUser.id,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        isHalfDay: dto.isHalfDay ?? false,
        halfDayPeriod: dto.isHalfDay ? (dto.halfDayPeriod ?? null) : null,
        reason: dto.reason ?? null,
        documentUrl: dto.documentUrl ?? null,
        status: 'PENDING',
        currentStep: 'MANAGER',
        submittedAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, userCode: true } },
        leaveType: { select: { id: true, code: true, name: true } },
        approvals: true,
      },
    });

    // Bước 1: Manager duyệt
    await tx.leaveRequestApproval.create({
      data: {
        leaveRequestId: created.id,
        approverUserId: managerApproverId ?? requestingUser.id, // fallback: tự duyệt nếu không có manager
        stepType: 'MANAGER',
        stepOrder: 1,
        status: managerApproverId ? 'PENDING' : 'SKIPPED',
        actionAt: managerApproverId ? null : new Date(),
        comment: managerApproverId ? null : 'Tự động bỏ qua do không có manager',
      },
    });

    // Bước 2: HR duyệt — approverUserId để null, bất kỳ HR nào cũng có thể duyệt
    // (resolve approverUserId thực khi duyệt)
    await tx.leaveRequestApproval.create({
      data: {
        leaveRequestId: created.id,
        approverUserId: requestingUser.id, // placeholder, sẽ update khi HR duyệt
        stepType: 'HR',
        stepOrder: 2,
        status: 'PENDING',
      },
    });

    // Tăng pendingDays
    await tx.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId: requestingUser.id, leaveTypeId: dto.leaveTypeId, year } },
      data: {
        pendingDays: { increment: totalDays },
        remainingDays: { decrement: totalDays },
      },
    });

    // Nếu không có manager → currentStep nhảy thẳng sang HR
    if (!managerApproverId) {
      await tx.leaveRequest.update({
        where: { id: created.id },
        data: { currentStep: 'HR' },
      });
    }

    return created;
  });

  // Reload đầy đủ
  return repo.findRequestById(request.id);
}

/**
 * Nhân viên hủy đơn của chính mình
 * — chỉ hủy được khi PENDING (chưa qua final approve)
 */
async function cancelRequest(requestId, requestingUser, cancelReason) {
  const req = await _assertRequestExists(requestId);

  if (req.userId !== requestingUser.id && !_isHrOrAdmin(requestingUser)) {
    throw AppError.forbidden('Bạn không có quyền hủy đơn này.');
  }

  if (req.status !== 'PENDING') {
    throw AppError.badRequest(
      `Không thể hủy đơn ở trạng thái '${req.status}'.`,
    );
  }

  const year = new Date(req.startDate).getFullYear();

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        currentStep: null,
        cancelledAt: new Date(),
        cancelReason: cancelReason ?? null,
      },
    });

    // Hoàn trả pendingDays về remainingDays
    await tx.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId: req.userId, leaveTypeId: req.leaveTypeId, year } },
      data: {
        pendingDays: { decrement: Number(req.totalDays) },
        remainingDays: { increment: Number(req.totalDays) },
      },
    });
  });

  return repo.findRequestById(requestId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LUỒNG DUYỆT 2 BƯỚC                                     ║
// ╚══════════════════════════════════════════════════════════╝
//
//  Bước 1 — MANAGER:
//    · Ai duyệt: manager trực tiếp của nhân viên
//    · Sau khi approve → currentStep = 'HR', step HR status = PENDING
//    · Sau khi reject → status = REJECTED, hoàn trả pendingDays
//
//  Bước 2 — HR (final):
//    · Ai duyệt: bất kỳ HR hoặc Admin
//    · Sau khi approve → status = APPROVED, finalApprovedAt, pendingDays → usedDays
//    · Sau khi reject → status = REJECTED, hoàn trả pendingDays

/**
 * Duyệt đơn (Manager bước 1 hoặc HR bước 2).
 * Hệ thống tự xác định người dùng đang duyệt bước nào.
 */
async function approveRequest(requestId, requestingUser, comment) {
  const req = await _assertRequestExists(requestId);

  if (req.status !== 'PENDING') {
    throw AppError.badRequest(`Đơn đã ở trạng thái '${req.status}', không thể duyệt.`);
  }

  const stepType = req.currentStep; // 'MANAGER' | 'HR'
  const approvalStep = await repo.findApprovalStep(requestId, stepType);
  if (!approvalStep) throw AppError.internal('Không tìm thấy bước duyệt.');

  // Kiểm tra quyền duyệt
  _assertCanApprove(stepType, req, requestingUser);

  const year = new Date(req.startDate).getFullYear();

  if (stepType === 'MANAGER') {
    // ── BƯỚC 1: Manager duyệt → chuyển sang HR ───────────────
    await prisma.$transaction(async (tx) => {
      // Đánh dấu bước Manager = APPROVED
      await tx.leaveRequestApproval.update({
        where: { id: approvalStep.id },
        data: { status: 'APPROVED', comment: comment ?? null, actionAt: new Date() },
      });

      // Cập nhật approverUserId thực cho bước HR + giữ nguyên status = PENDING
      const hrStep = await tx.leaveRequestApproval.findUnique({
        where: { leaveRequestId_stepType: { leaveRequestId: requestId, stepType: 'HR' } },
      });
      if (hrStep) {
        await tx.leaveRequestApproval.update({
          where: { id: hrStep.id },
          data: { approverUserId: requestingUser.id }, // reset, HR thực sẽ ghi đè khi duyệt
        });
      }

      // Chuyển currentStep → HR
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: { currentStep: 'HR' },
      });
    });
  } else {
    // ── BƯỚC 2: HR duyệt cuối → APPROVED hoàn toàn ──────────
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequestApproval.update({
        where: { id: approvalStep.id },
        data: {
          status: 'APPROVED',
          approverUserId: requestingUser.id,
          comment: comment ?? null,
          actionAt: new Date(),
        },
      });

      await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          currentStep: null,
          finalApprovedAt: new Date(),
        },
      });

      // pendingDays → usedDays
      await tx.leaveBalance.update({
        where: { userId_leaveTypeId_year: { userId: req.userId, leaveTypeId: req.leaveTypeId, year } },
        data: {
          pendingDays: { decrement: Number(req.totalDays) },
          usedDays: { increment: Number(req.totalDays) },
        },
      });
    });
  }

  return repo.findRequestById(requestId);
}

/**
 * Từ chối đơn (ở bất kỳ bước nào — Manager hoặc HR).
 * Sau khi reject: hoàn trả toàn bộ pendingDays.
 */
async function rejectRequest(requestId, requestingUser, rejectionReason) {
  const req = await _assertRequestExists(requestId);

  if (req.status !== 'PENDING') {
    throw AppError.badRequest(`Đơn đã ở trạng thái '${req.status}', không thể từ chối.`);
  }

  const stepType = req.currentStep;
  const approvalStep = await repo.findApprovalStep(requestId, stepType);
  if (!approvalStep) throw AppError.internal('Không tìm thấy bước duyệt.');

  _assertCanApprove(stepType, req, requestingUser);

  const year = new Date(req.startDate).getFullYear();

  await prisma.$transaction(async (tx) => {
    // Đánh dấu bước hiện tại = REJECTED
    await tx.leaveRequestApproval.update({
      where: { id: approvalStep.id },
      data: {
        status: 'REJECTED',
        approverUserId: requestingUser.id,
        comment: rejectionReason,
        actionAt: new Date(),
      },
    });

    // Đánh dấu bước còn lại = SKIPPED (nếu có)
    await tx.leaveRequestApproval.updateMany({
      where: { leaveRequestId: requestId, status: 'PENDING' },
      data: { status: 'SKIPPED' },
    });

    // Cập nhật đơn
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        currentStep: null,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });

    // Hoàn trả pendingDays
    await tx.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId: req.userId, leaveTypeId: req.leaveTypeId, year } },
      data: {
        pendingDays: { decrement: Number(req.totalDays) },
        remainingDays: { increment: Number(req.totalDays) },
      },
    });
  });

  return repo.findRequestById(requestId);
}

/** Lấy danh sách đơn đang chờ người dùng này duyệt */
async function getMyPendingApprovals(requestingUser) {
  const stepType = _isHrOrAdmin(requestingUser) ? 'HR' : 'MANAGER';
  return repo.findPendingApprovalsForUser(requestingUser.id, stepType);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE HELPERS                                         ║
// ╚══════════════════════════════════════════════════════════╝

/** Kiểm tra người dùng có quyền duyệt bước này không */
function _assertCanApprove(stepType, req, requestingUser) {
  if (stepType === 'MANAGER') {
    const isHrOrAdmin = _isHrOrAdmin(requestingUser);
    const isManager = requestingUser.roles.includes(ROLES.MANAGER);
    if (!isHrOrAdmin && !isManager) {
      throw AppError.forbidden('Chỉ Manager hoặc HR/Admin mới có thể duyệt bước này.');
    }
    // Manager không được tự duyệt đơn của chính mình
    if (req.userId === requestingUser.id && !isHrOrAdmin) {
      throw AppError.forbidden('Bạn không thể tự duyệt đơn của chính mình.');
    }
  } else if (stepType === 'HR') {
    if (!_isHrOrAdmin(requestingUser)) {
      throw AppError.forbidden('Chỉ HR hoặc Admin mới có thể duyệt bước này.');
    }
  }
}

async function _getHolidaysForRange(startDate, endDate) {
  const years = new Set();
  const d = new Date(startDate);
  while (d <= endDate) {
    years.add(d.getFullYear());
    d.setFullYear(d.getFullYear() + 1);
  }

  const holidays = await prisma.holiday.findMany({
    where: { year: { in: [...years] } },
    select: { date: true },
  });

  return holidays.map((h) => _toDateOnly(h.date).getTime());
}

/**
 * Tính số ngày làm việc thực giữa startDate và endDate
 * (bỏ T7, CN và ngày lễ)
 */
function _calcWorkDays(startDate, endDate, holidayTimestamps = []) {
  let count = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidayTimestamps.includes(d.getTime());
    if (!isWeekend && !isHoliday) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

async function _assertLeaveTypeExists(id) {
  const lt = await repo.findLeaveTypeById(id);
  if (!lt) throw AppError.notFound('Không tìm thấy loại nghỉ phép.');
  return lt;
}

async function _assertRequestExists(id) {
  const req = await repo.findRequestById(id);
  if (!req) throw AppError.notFound('Không tìm thấy đơn nghỉ phép.');
  return req;
}

function _toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function _fmtDate(date) {
  return new Date(date).toLocaleDateString('vi-VN');
}

function _isHrOrAdmin(user) {
  return user.roles.some((r) => [ROLES.ADMIN, ROLES.HR].includes(r));
}

function _page(filters, total) {
  return { page: filters.page ?? 1, limit: filters.limit ?? 20, total };
}

function _clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

module.exports = {
  // LeaveType
  listLeaveTypes, getLeaveTypeById, getLeaveTypeOptions,
  createLeaveType, updateLeaveType,
  // LeaveBalance
  listBalances, getUserBalances, upsertBalance,
  adjustBalance, initUserBalances,
  // LeaveRequest
  listRequests, getRequestById, createRequest, cancelRequest,
  // Approval
  approveRequest, rejectRequest, getMyPendingApprovals,
};
