'use strict';

const { Router } = require('express');
const ctrl = require('./overtime.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../config/constants');
const v = require('./overtime.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  SELF-SERVICE — nhân viên tự phục vụ                    ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/overtime/my           — Lịch sử OT của mình
 * GET  /api/overtime/my/stats     — Thống kê OT theo tháng/năm
 */
router.get('/my', validate(v.listOvertimeSchema, 'query'), ctrl.getMyOvertimeRequests);
router.get('/my/stats', validate(v.myOvertimeStatsSchema, 'query'), ctrl.getMyOTStats);

// ╔══════════════════════════════════════════════════════════╗
// ║  MANAGER / HR — quản lý                                 ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/overtime/summary
 * Tổng hợp OT theo phòng ban (Manager / HR / Admin)
 */
router.get(
  '/summary',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  ctrl.getDepartmentOTSummary,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  CRUD chính                                              ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/overtime              — Danh sách
 *                                   HR/Admin/Manager: tất cả
 *                                   Employee: chỉ của mình
 * POST /api/overtime              — Nhân viên gửi yêu cầu OT
 */
router.get('/', validate(v.listOvertimeSchema, 'query'), ctrl.listOvertimeRequests);
router.post('/', validate(v.createOvertimeSchema), ctrl.createOvertimeRequest);

/**
 * GET   /api/overtime/:id                  — Chi tiết
 * POST  /api/overtime/:id/cancel           — Hủy yêu cầu
 * POST  /api/overtime/:id/approve          — Manager / HR duyệt
 * POST  /api/overtime/:id/reject           — Manager / HR từ chối
 * PATCH /api/overtime/:id/actual-minutes   — HR/Admin điều chỉnh phút thực tế
 * GET   /api/overtime/:id/pay-estimate     — Dự tính tiền OT
 */
router.get('/:id', ctrl.getOvertimeById);

router.post(
  '/:id/cancel',
  validate(v.cancelOvertimeSchema),
  ctrl.cancelOvertimeRequest,
);

router.post(
  '/:id/approve',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.approveOvertimeSchema),
  ctrl.approveOvertimeRequest,
);

router.post(
  '/:id/reject',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.rejectOvertimeSchema),
  ctrl.rejectOvertimeRequest,
);

router.patch(
  '/:id/actual-minutes',
  hrOrAdmin,
  validate(v.updateActualMinutesSchema),
  ctrl.updateActualMinutes,
);

router.get('/:id/pay-estimate', ctrl.getOTPayEstimate);

module.exports = router;
