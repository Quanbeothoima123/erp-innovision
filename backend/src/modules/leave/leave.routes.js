'use strict';

const { Router } = require('express');
const ctrl = require('./leave.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../config/constants');
const v = require('./leave.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  LOẠI NGHỈ PHÉP (LeaveType)                              ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/leave/types/options  — Dropdown (mọi role)
 * GET /api/leave/types          — Danh sách đầy đủ
 * POST /api/leave/types         — Tạo mới (HR/Admin)
 */
router.get('/types/options', ctrl.getLeaveTypeOptions);
router.get('/types', validate(v.listLeaveTypesSchema, 'query'), ctrl.listLeaveTypes);
router.post('/types', hrOrAdmin, validate(v.createLeaveTypeSchema), ctrl.createLeaveType);

/**
 * GET   /api/leave/types/:id    — Chi tiết
 * PATCH /api/leave/types/:id    — Cập nhật (HR/Admin)
 */
router.get('/types/:id', ctrl.getLeaveTypeById);
router.patch('/types/:id', hrOrAdmin, validate(v.updateLeaveTypeSchema), ctrl.updateLeaveType);

// ╔══════════════════════════════════════════════════════════╗
// ║  SỐ DƯ PHÉP (LeaveBalance)                               ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/leave/balances/me            — Nhân viên xem số dư của mình
 * GET  /api/leave/balances               — HR/Admin xem tất cả (có filter)
 * PUT  /api/leave/balances               — HR/Admin set quota (upsert)
 */
router.get('/balances/me', ctrl.getMyBalances);
router.get('/balances', hrOrAdmin, validate(v.listBalancesSchema, 'query'), ctrl.listBalances);
router.put('/balances', hrOrAdmin, validate(v.upsertBalanceSchema), ctrl.upsertBalance);

/**
 * GET  /api/leave/balances/user/:userId  — HR/Admin xem balance 1 nhân viên
 * POST /api/leave/balances/init/:userId/:year — Khởi tạo phép đầu năm
 * PATCH /api/leave/balances/:userId/:leaveTypeId/:year/adjust — Điều chỉnh
 */
router.get('/balances/user/:userId', hrOrAdmin, ctrl.getUserBalances);
router.post('/balances/init/:userId/:year', hrOrAdmin, ctrl.initUserBalances);
router.patch(
  '/balances/:userId/:leaveTypeId/:year/adjust',
  hrOrAdmin,
  validate(v.adjustBalanceSchema),
  ctrl.adjustBalance,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  DUYỆT (Approvals)                                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/leave/approvals/pending
 * Manager / HR xem đơn đang chờ mình duyệt
 */
router.get(
  '/approvals/pending',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  ctrl.getMyPendingApprovals,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  ĐƠN NGHỈ PHÉP (LeaveRequest)                            ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/leave/requests
 *   — HR/Admin: tất cả
 *   — Manager:  phòng mình
 *   — Employee: chỉ của mình
 *
 * POST /api/leave/requests
 *   — Nhân viên gửi đơn
 */
router.get('/requests', validate(v.listLeaveRequestsSchema, 'query'), ctrl.listRequests);
router.post('/requests', validate(v.createLeaveRequestSchema), ctrl.createRequest);

/**
 * GET  /api/leave/requests/:id            — Chi tiết đơn
 * POST /api/leave/requests/:id/cancel     — Nhân viên hủy đơn
 * POST /api/leave/requests/:id/approve    — Manager (bước 1) / HR (bước 2) duyệt
 * POST /api/leave/requests/:id/reject     — Manager / HR từ chối
 */
router.get('/requests/:id', ctrl.getRequestById);

router.post(
  '/requests/:id/cancel',
  validate(v.cancelLeaveRequestSchema),
  ctrl.cancelRequest,
);

router.post(
  '/requests/:id/approve',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.approveLeaveSchema),
  ctrl.approveRequest,
);

router.post(
  '/requests/:id/reject',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.rejectLeaveSchema),
  ctrl.rejectRequest,
);

module.exports = router;
