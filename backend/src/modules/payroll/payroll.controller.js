'use strict';

const service = require('./payroll.service');
const mapper  = require('./payroll.mapper');
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL PERIOD                                          ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/payroll/periods
 * Danh sách kỳ lương (HR/Admin)
 */
async function listPeriods(req, res, next) {
  try {
    const { periods, pagination } = await service.listPeriods(req.query);
    return paginatedResponse(
      res,
      periods.map(mapper.toPeriodDto),
      pagination,
      'Lấy danh sách kỳ lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/periods/:id
 */
async function getPeriodById(req, res, next) {
  try {
    const period = await service.getPeriodById(req.params.id);
    return successResponse(res, mapper.toPeriodDto(period), 'Lấy kỳ lương thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/periods
 * Tạo kỳ lương mới (HR/Admin)
 */
async function createPeriod(req, res, next) {
  try {
    const period = await service.createPeriod(req.body);
    return successResponse(res, mapper.toPeriodDto(period), 'Tạo kỳ lương thành công', 201);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/payroll/periods/:id
 * Cập nhật thông tin kỳ lương (chỉ khi DRAFT/CALCULATING)
 */
async function updatePeriod(req, res, next) {
  try {
    const period = await service.updatePeriod(req.params.id, req.body);
    return successResponse(res, mapper.toPeriodDto(period), 'Cập nhật kỳ lương thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/periods/:id/calculate
 * Chạy engine tính lương cho tất cả nhân viên trong kỳ
 * Có thể chạy lại nhiều lần khi status = DRAFT / CALCULATING
 */
async function calculatePeriod(req, res, next) {
  try {
    const result = await service.calculatePeriod(req.params.id, req.user);
    return successResponse(
      res,
      {
        period: mapper.toPeriodDto(result.period),
        calculatedCount: result.calculatedCount,
        totalUsers: result.totalUsers,
        errors: result.errors,
      },
      `Đã tính lương cho ${result.calculatedCount}/${result.totalUsers} nhân viên`,
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/periods/:id/approve
 * Duyệt kỳ lương → APPROVED, khóa không cho chỉnh sửa
 */
async function approvePeriod(req, res, next) {
  try {
    const period = await service.approvePeriod(
      req.params.id,
      req.user,
      req.body?.notes ?? null,
    );
    return successResponse(res, mapper.toPeriodDto(period), 'Duyệt kỳ lương thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/periods/:id/mark-paid
 * Đánh dấu đã chi trả → PAID
 */
async function markPeriodPaid(req, res, next) {
  try {
    const period = await service.markPeriodPaid(req.params.id, req.body);
    return successResponse(res, mapper.toPeriodDto(period), 'Đánh dấu đã thanh toán thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/periods/:id/cancel
 * Hủy kỳ lương (chỉ DRAFT/CALCULATING)
 */
async function cancelPeriod(req, res, next) {
  try {
    const period = await service.cancelPeriod(req.params.id);
    return successResponse(res, mapper.toPeriodDto(period), 'Hủy kỳ lương thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  USER COMPENSATION (Cấu hình lương)                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/payroll/compensations
 * Danh sách cấu hình lương (HR/Admin)
 */
async function listCompensations(req, res, next) {
  try {
    const { compensations, pagination } = await service.listCompensations(req.query);
    return paginatedResponse(
      res,
      compensations.map(mapper.toCompensationDto),
      pagination,
      'Lấy danh sách cấu hình lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/compensations/:id
 */
async function getCompensationById(req, res, next) {
  try {
    const comp = await service.getCompensationById(req.params.id);
    return successResponse(res, mapper.toCompensationDto(comp), 'Lấy cấu hình lương thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/compensations/user/:userId/active
 * Cấu hình lương đang active của 1 nhân viên
 */
async function getActiveCompensation(req, res, next) {
  try {
    const comp = await service.getActiveCompensation(req.params.userId);
    return successResponse(
      res,
      comp ? mapper.toCompensationDto(comp) : null,
      'Lấy cấu hình lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/compensations/user/:userId/history
 * Lịch sử thay đổi lương
 */
async function getCompensationHistory(req, res, next) {
  try {
    const history = await service.getCompensationHistory(req.params.userId);
    return successResponse(
      res,
      history.map(mapper.toCompensationDto),
      'Lấy lịch sử lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/compensations/my
 * Nhân viên xem cấu hình lương của chính mình
 */
async function getMyCompensation(req, res, next) {
  try {
    const comp = await service.getActiveCompensation(req.user.id);
    return successResponse(
      res,
      comp ? mapper.toCompensationDto(comp) : null,
      'Lấy thông tin lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/compensations
 * Tạo cấu hình lương mới — tự động deactivate record cũ
 */
async function createCompensation(req, res, next) {
  try {
    const comp = await service.createCompensation(req.body);
    return successResponse(
      res,
      mapper.toCompensationDto(comp),
      'Tạo cấu hình lương thành công',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * PATCH /api/payroll/compensations/:id
 */
async function updateCompensation(req, res, next) {
  try {
    const comp = await service.updateCompensation(req.params.id, req.body);
    return successResponse(res, mapper.toCompensationDto(comp), 'Cập nhật cấu hình lương thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SALARY COMPONENT (Danh mục thành phần lương)            ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/payroll/salary-components/options — Dropdown (mọi role)
 * GET /api/payroll/salary-components          — Danh sách đầy đủ (HR/Admin)
 */
async function getSalaryComponentOptions(req, res, next) {
  try {
    const components = await service.getSalaryComponentOptions();
    return successResponse(
      res,
      components.map(mapper.toSalaryComponentDto),
      'Lấy danh sách thành phần lương thành công',
    );
  } catch (err) { next(err); }
}

async function listSalaryComponents(req, res, next) {
  try {
    const { components, pagination } = await service.listSalaryComponents(req.query);
    return paginatedResponse(
      res,
      components.map(mapper.toSalaryComponentDto),
      pagination,
      'Lấy danh sách thành phần lương thành công',
    );
  } catch (err) { next(err); }
}

async function getSalaryComponentById(req, res, next) {
  try {
    const sc = await service.getSalaryComponentById(req.params.id);
    return successResponse(res, mapper.toSalaryComponentDto(sc), 'Lấy thành phần lương thành công');
  } catch (err) { next(err); }
}

async function createSalaryComponent(req, res, next) {
  try {
    const sc = await service.createSalaryComponent(req.body);
    return successResponse(
      res,
      mapper.toSalaryComponentDto(sc),
      'Tạo thành phần lương thành công',
      201,
    );
  } catch (err) { next(err); }
}

async function updateSalaryComponent(req, res, next) {
  try {
    const sc = await service.updateSalaryComponent(req.params.id, req.body);
    return successResponse(res, mapper.toSalaryComponentDto(sc), 'Cập nhật thành phần lương thành công');
  } catch (err) { next(err); }
}

// ── UserSalaryComponent (Gán thành phần cho NV) ───────────────

/**
 * GET /api/payroll/salary-components/user/:userId
 */
async function getUserSalaryComponents(req, res, next) {
  try {
    const uscs = await service.getUserSalaryComponents(req.params.userId);
    return successResponse(
      res,
      uscs.map(mapper.toUserSalaryComponentDto),
      'Lấy thành phần lương của nhân viên thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/salary-components/assign
 * Gán thành phần lương cụ thể cho nhân viên
 */
async function assignSalaryComponent(req, res, next) {
  try {
    const usc = await service.assignSalaryComponent(req.body);
    return successResponse(
      res,
      mapper.toUserSalaryComponentDto(usc),
      'Gán thành phần lương thành công',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * DELETE /api/payroll/salary-components/user-assignments/:id
 * Gỡ thành phần lương khỏi nhân viên
 */
async function removeUserSalaryComponent(req, res, next) {
  try {
    await service.removeUserSalaryComponent(req.params.id);
    return noContentResponse(res, 'Đã gỡ thành phần lương');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL ADJUSTMENT (Điều chỉnh lương)                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/adjustments      — Danh sách (HR/Admin/filter by userId)
 * POST /api/payroll/adjustments      — Tạo điều chỉnh (HR/Admin)
 */
async function listAdjustments(req, res, next) {
  try {
    const { adjustments, pagination } = await service.listAdjustments(req.query);
    return paginatedResponse(
      res,
      adjustments.map(mapper.toAdjustmentDto),
      pagination,
      'Lấy danh sách điều chỉnh lương thành công',
    );
  } catch (err) { next(err); }
}

async function getAdjustmentById(req, res, next) {
  try {
    const adj = await service.getAdjustmentById(req.params.id);
    return successResponse(res, mapper.toAdjustmentDto(adj), 'Lấy điều chỉnh lương thành công');
  } catch (err) { next(err); }
}

async function createAdjustment(req, res, next) {
  try {
    const adj = await service.createAdjustment(req.body, req.user.id);
    return successResponse(
      res,
      mapper.toAdjustmentDto(adj),
      'Tạo điều chỉnh lương thành công',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/adjustments/:id/approve
 * POST /api/payroll/adjustments/:id/reject
 */
async function approveAdjustment(req, res, next) {
  try {
    const adj = await service.approveAdjustment(req.params.id, req.user);
    return successResponse(res, mapper.toAdjustmentDto(adj), 'Duyệt điều chỉnh lương thành công');
  } catch (err) { next(err); }
}

async function rejectAdjustment(req, res, next) {
  try {
    const adj = await service.rejectAdjustment(
      req.params.id,
      req.user,
      req.body.reason,
    );
    return successResponse(res, mapper.toAdjustmentDto(adj), 'Từ chối điều chỉnh lương thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL RECORD (Phiếu lương)                            ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/payroll/records
 * HR/Admin: tất cả | Employee: chỉ của mình (service tự filter)
 */
async function listRecords(req, res, next) {
  try {
    const { records, pagination } = await service.listRecords(req.query, req.user);
    return paginatedResponse(
      res,
      records.map(mapper.toRecordSummaryDto),
      pagination,
      'Lấy danh sách phiếu lương thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/records/:id — Chi tiết phiếu lương (kèm items dòng)
 */
async function getRecordById(req, res, next) {
  try {
    const record = await service.getRecordById(req.params.id, req.user);
    return successResponse(res, mapper.toRecordDto(record), 'Lấy phiếu lương thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/payroll/records/my/:payrollPeriodId
 * Nhân viên xem phiếu lương của mình trong kỳ cụ thể
 */
async function getMyPayslip(req, res, next) {
  try {
    const record = await service.getMyPayslip(req.user.id, req.params.payrollPeriodId);
    return successResponse(res, mapper.toRecordDto(record), 'Lấy phiếu lương thành công');
  } catch (err) { next(err); }
}

/**
 * PATCH /api/payroll/records/:id/notes
 * HR/Admin thêm ghi chú vào phiếu lương
 */
async function updateRecordNotes(req, res, next) {
  try {
    const record = await service.updateRecordNotes(req.params.id, req.body.notes);
    return successResponse(res, mapper.toRecordDto(record), 'Cập nhật ghi chú thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/payroll/records/:id/mark-paid
 * Đánh dấu 1 phiếu lương cá nhân đã thanh toán
 */
async function markRecordPaid(req, res, next) {
  try {
    const record = await service.markRecordPaid(req.params.id, req.body);
    return successResponse(res, mapper.toRecordDto(record), 'Đánh dấu phiếu lương đã thanh toán');
  } catch (err) { next(err); }
}

module.exports = {
  // Period
  listPeriods, getPeriodById, createPeriod, updatePeriod,
  calculatePeriod, approvePeriod, markPeriodPaid, cancelPeriod,
  // Compensation
  listCompensations, getCompensationById, getActiveCompensation,
  getCompensationHistory, getMyCompensation,
  createCompensation, updateCompensation,
  // SalaryComponent
  getSalaryComponentOptions, listSalaryComponents,
  getSalaryComponentById, createSalaryComponent, updateSalaryComponent,
  // UserSalaryComponent
  getUserSalaryComponents, assignSalaryComponent, removeUserSalaryComponent,
  // Adjustment
  listAdjustments, getAdjustmentById, createAdjustment,
  approveAdjustment, rejectAdjustment,
  // Record
  listRecords, getRecordById, getMyPayslip,
  updateRecordNotes, markRecordPaid,
};
