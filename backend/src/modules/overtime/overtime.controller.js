'use strict';

const service = require('./overtime.service');
const { toOvertimeDto, toOvertimeDtoWithPay, toMonthlyOTStatsDto } = require('./overtime.mapper');
const {
  successResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ── List ──────────────────────────────────────────────────────

/**
 * GET /api/overtime
 * HR/Admin/Manager: tất cả | Employee: chỉ của mình
 */
async function listOvertimeRequests(req, res, next) {
  try {
    const { requests, pagination } = await service.listOvertimeRequests(
      req.query,
      req.user,
    );
    return paginatedResponse(
      res,
      requests.map(toOvertimeDto),
      pagination,
      'Lấy danh sách yêu cầu OT thành công',
    );
  } catch (err) { next(err); }
}

// ── Get one ───────────────────────────────────────────────────

/**
 * GET /api/overtime/:id
 */
async function getOvertimeById(req, res, next) {
  try {
    const ot = await service.getOvertimeById(req.params.id, req.user);
    return successResponse(res, toOvertimeDto(ot), 'Lấy thông tin yêu cầu OT thành công');
  } catch (err) { next(err); }
}

// ── Create ────────────────────────────────────────────────────

/**
 * POST /api/overtime
 * Nhân viên gửi yêu cầu OT
 */
async function createOvertimeRequest(req, res, next) {
  try {
    const ot = await service.createOvertimeRequest(req.body, req.user);
    return successResponse(
      res,
      toOvertimeDto(ot),
      'Gửi yêu cầu làm thêm giờ thành công. Đang chờ duyệt.',
      201,
    );
  } catch (err) { next(err); }
}

// ── Cancel ────────────────────────────────────────────────────

/**
 * POST /api/overtime/:id/cancel
 */
async function cancelOvertimeRequest(req, res, next) {
  try {
    const ot = await service.cancelOvertimeRequest(
      req.params.id,
      req.user,
      req.body?.comment ?? null,
    );
    return successResponse(res, toOvertimeDto(ot), 'Hủy yêu cầu OT thành công');
  } catch (err) { next(err); }
}

// ── Approve ───────────────────────────────────────────────────

/**
 * POST /api/overtime/:id/approve
 * Manager hoặc HR/Admin duyệt
 */
async function approveOvertimeRequest(req, res, next) {
  try {
    const ot = await service.approveOvertimeRequest(
      req.params.id,
      req.user,
      req.body,
    );
    return successResponse(res, toOvertimeDto(ot), 'Duyệt yêu cầu OT thành công');
  } catch (err) { next(err); }
}

// ── Reject ────────────────────────────────────────────────────

/**
 * POST /api/overtime/:id/reject
 */
async function rejectOvertimeRequest(req, res, next) {
  try {
    const ot = await service.rejectOvertimeRequest(
      req.params.id,
      req.user,
      req.body.comment,
    );
    return successResponse(res, toOvertimeDto(ot), 'Từ chối yêu cầu OT thành công');
  } catch (err) { next(err); }
}

// ── Update actual minutes ─────────────────────────────────────

/**
 * PATCH /api/overtime/:id/actual-minutes
 * HR/Admin điều chỉnh số phút thực tế sau khi đã duyệt
 */
async function updateActualMinutes(req, res, next) {
  try {
    const ot = await service.updateActualMinutes(
      req.params.id,
      req.user,
      req.body,
    );
    return successResponse(res, toOvertimeDto(ot), 'Cập nhật số phút OT thành công');
  } catch (err) { next(err); }
}

// ── My stats ──────────────────────────────────────────────────

/**
 * GET /api/overtime/my/stats?year=2025&month=3
 * Nhân viên xem thống kê OT của mình
 */
async function getMyOTStats(req, res, next) {
  try {
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10);
    const month = req.query.month ? parseInt(req.query.month, 10) : undefined;
    const records = await service.getMyOTStats(req.user.id, year, month);
    return successResponse(
      res,
      toMonthlyOTStatsDto(records, year, month),
      'Lấy thống kê OT thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/overtime/my
 * Nhân viên xem lịch sử OT của mình
 */
async function getMyOvertimeRequests(req, res, next) {
  try {
    const filters = { ...req.query, userId: req.user.id };
    const { requests, pagination } = await service.listOvertimeRequests(filters, req.user);
    return paginatedResponse(
      res,
      requests.map(toOvertimeDto),
      pagination,
      'Lấy lịch sử OT thành công',
    );
  } catch (err) { next(err); }
}

// ── Pay estimate ──────────────────────────────────────────────

/**
 * GET /api/overtime/:id/pay-estimate
 * Xem dự kiến tiền OT (lấy từ UserCompensation)
 */
async function getOTPayEstimate(req, res, next) {
  try {
    const { ot, compensation } = await service.getOTPayEstimate(
      req.params.id,
      req.user,
    );
    return successResponse(
      res,
      toOvertimeDtoWithPay(ot, compensation),
      'Lấy dự tính lương OT thành công',
    );
  } catch (err) { next(err); }
}

// ── Department summary ────────────────────────────────────────

/**
 * GET /api/overtime/summary?departmentId=&year=&month=
 */
async function getDepartmentOTSummary(req, res, next) {
  try {
    const { departmentId, year, month } = req.query;
    const summary = await service.getDepartmentOTSummary(
      departmentId,
      parseInt(year ?? new Date().getFullYear(), 10),
      month ? parseInt(month, 10) : undefined,
      req.user,
    );
    return successResponse(res, summary, 'Lấy tổng hợp OT phòng ban thành công');
  } catch (err) { next(err); }
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
  getMyOvertimeRequests,
  getOTPayEstimate,
  getDepartmentOTSummary,
};
