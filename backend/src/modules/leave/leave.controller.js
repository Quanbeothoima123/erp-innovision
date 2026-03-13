'use strict';

const service = require('./leave.service');
const mapper = require('./leave.mapper');
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE TYPE                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function listLeaveTypes(req, res, next) {
  try {
    const { leaveTypes, pagination } = await service.listLeaveTypes(req.query);
    return paginatedResponse(
      res,
      leaveTypes.map(mapper.toLeaveTypeDto),
      pagination,
      'Lấy danh sách loại nghỉ phép thành công',
    );
  } catch (err) { next(err); }
}

async function getLeaveTypeOptions(req, res, next) {
  try {
    const options = await service.getLeaveTypeOptions();
    return successResponse(
      res,
      options.map(mapper.toLeaveTypeOptionDto),
      'Lấy danh sách loại nghỉ phép thành công',
    );
  } catch (err) { next(err); }
}

async function getLeaveTypeById(req, res, next) {
  try {
    const lt = await service.getLeaveTypeById(req.params.id);
    return successResponse(res, mapper.toLeaveTypeDto(lt), 'Lấy thông tin loại nghỉ phép thành công');
  } catch (err) { next(err); }
}

async function createLeaveType(req, res, next) {
  try {
    const lt = await service.createLeaveType(req.body);
    return successResponse(res, mapper.toLeaveTypeDto(lt), 'Tạo loại nghỉ phép thành công', 201);
  } catch (err) { next(err); }
}

async function updateLeaveType(req, res, next) {
  try {
    const lt = await service.updateLeaveType(req.params.id, req.body);
    return successResponse(res, mapper.toLeaveTypeDto(lt), 'Cập nhật loại nghỉ phép thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE BALANCE                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function listBalances(req, res, next) {
  try {
    const { balances, pagination } = await service.listBalances(req.query);
    return paginatedResponse(
      res,
      balances.map(mapper.toLeaveBalanceDto),
      pagination,
      'Lấy danh sách số dư phép thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/leave/balances/me?year=2025
 * Nhân viên xem số dư phép của chính mình
 */
async function getMyBalances(req, res, next) {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const balances = await service.getUserBalances(req.user.id, year);
    return successResponse(
      res,
      balances.map(mapper.toLeaveBalanceDto),
      'Lấy số dư phép thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/leave/balances/user/:userId?year=2025
 * HR/Admin xem số dư phép của 1 nhân viên
 */
async function getUserBalances(req, res, next) {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const balances = await service.getUserBalances(req.params.userId, year);
    return successResponse(
      res,
      balances.map(mapper.toLeaveBalanceDto),
      'Lấy số dư phép thành công',
    );
  } catch (err) { next(err); }
}

/**
 * PUT /api/leave/balances
 * HR/Admin set quota phép cho user (upsert)
 */
async function upsertBalance(req, res, next) {
  try {
    const balance = await service.upsertBalance(req.body);
    return successResponse(res, mapper.toLeaveBalanceDto(balance), 'Cập nhật số dư phép thành công');
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leave/balances/:userId/:leaveTypeId/:year/adjust
 * HR điều chỉnh + / - ngày phép
 */
async function adjustBalance(req, res, next) {
  try {
    const { userId, leaveTypeId, year } = req.params;
    const balance = await service.adjustBalance(userId, leaveTypeId, parseInt(year, 10), req.body);
    return successResponse(res, mapper.toLeaveBalanceDto(balance), 'Điều chỉnh số dư phép thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/leave/balances/init/:userId/:year
 * HR khởi tạo phép đầu năm cho 1 nhân viên
 */
async function initUserBalances(req, res, next) {
  try {
    const { userId, year } = req.params;
    const balances = await service.initUserBalances(userId, parseInt(year, 10));
    return successResponse(
      res,
      balances.map(mapper.toLeaveBalanceDto),
      `Khởi tạo số dư phép năm ${year} thành công`,
      201,
    );
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE REQUEST                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function listRequests(req, res, next) {
  try {
    const { requests, pagination } = await service.listRequests(req.query, req.user);
    return paginatedResponse(
      res,
      requests.map(mapper.toLeaveRequestDto),
      pagination,
      'Lấy danh sách đơn nghỉ phép thành công',
    );
  } catch (err) { next(err); }
}

async function getRequestById(req, res, next) {
  try {
    const req_ = await service.getRequestById(req.params.id, req.user);
    return successResponse(res, mapper.toLeaveRequestDto(req_), 'Lấy thông tin đơn nghỉ phép thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/leave/requests
 * Nhân viên gửi đơn xin nghỉ phép
 */
async function createRequest(req, res, next) {
  try {
    const request = await service.createRequest(req.body, req.user);
    return successResponse(
      res,
      mapper.toLeaveRequestDto(request),
      'Gửi đơn nghỉ phép thành công. Đang chờ Manager duyệt.',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/leave/requests/:id/cancel
 * Nhân viên hủy đơn của mình
 */
async function cancelRequest(req, res, next) {
  try {
    const request = await service.cancelRequest(
      req.params.id,
      req.user,
      req.body?.cancelReason ?? null,
    );
    return successResponse(res, mapper.toLeaveRequestDto(request), 'Hủy đơn nghỉ phép thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  APPROVAL                                                ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/leave/approvals/pending
 * Xem các đơn đang chờ mình duyệt (Manager / HR tùy role)
 */
async function getMyPendingApprovals(req, res, next) {
  try {
    const approvals = await service.getMyPendingApprovals(req.user);
    return successResponse(
      res,
      approvals.map(mapper.toPendingApprovalDto),
      'Lấy danh sách đơn chờ duyệt thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/leave/requests/:id/approve
 * Manager duyệt bước 1 HOẶC HR duyệt bước 2 (tự động xác định)
 */
async function approveRequest(req, res, next) {
  try {
    const request = await service.approveRequest(
      req.params.id,
      req.user,
      req.body?.comment ?? null,
    );
    return successResponse(res, mapper.toLeaveRequestDto(request), 'Duyệt đơn nghỉ phép thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/leave/requests/:id/reject
 * Manager hoặc HR từ chối
 */
async function rejectRequest(req, res, next) {
  try {
    const request = await service.rejectRequest(
      req.params.id,
      req.user,
      req.body.rejectionReason,
    );
    return successResponse(res, mapper.toLeaveRequestDto(request), 'Từ chối đơn nghỉ phép thành công');
  } catch (err) { next(err); }
}

module.exports = {
  // LeaveType
  listLeaveTypes, getLeaveTypeOptions, getLeaveTypeById,
  createLeaveType, updateLeaveType,
  // LeaveBalance
  listBalances, getMyBalances, getUserBalances,
  upsertBalance, adjustBalance, initUserBalances,
  // LeaveRequest
  listRequests, getRequestById, createRequest, cancelRequest,
  // Approval
  getMyPendingApprovals, approveRequest, rejectRequest,
};
