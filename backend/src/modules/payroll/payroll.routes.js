'use strict';

const { Router } = require('express');
const ctrl = require('./payroll.controller');
const { validate }               = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES }                  = require('../../config/constants');
const v                          = require('./payroll.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  SELF-SERVICE (nhân viên tự xem)                        ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/payroll/my/compensation        — Cấu hình lương hiện tại
 * GET /api/payroll/my/payslip/:periodId   — Phiếu lương kỳ cụ thể
 * GET /api/payroll/records                — Lịch sử phiếu (service tự filter userId)
 */
router.get('/my/compensation', ctrl.getMyCompensation);
router.get('/my/payslip/:payrollPeriodId', ctrl.getMyPayslip);

// ╔══════════════════════════════════════════════════════════╗
// ║  KỲ LƯƠNG (PayrollPeriod)                                ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/periods                  — Danh sách kỳ lương
 * POST /api/payroll/periods                  — Tạo kỳ mới (HR/Admin)
 */
router.get(
  '/periods',
  hrOrAdmin,
  validate(v.listPeriodsSchema, 'query'),
  ctrl.listPeriods,
);
router.post('/periods', hrOrAdmin, validate(v.createPeriodSchema), ctrl.createPeriod);

/**
 * GET   /api/payroll/periods/:id             — Chi tiết kỳ lương
 * PATCH /api/payroll/periods/:id             — Cập nhật kỳ (khi DRAFT/CALCULATING)
 * POST  /api/payroll/periods/:id/calculate   — Tính lương toàn bộ NV
 * POST  /api/payroll/periods/:id/approve     — Duyệt kỳ lương → APPROVED
 * POST  /api/payroll/periods/:id/mark-paid   — Đánh dấu đã chi trả → PAID
 * POST  /api/payroll/periods/:id/cancel      — Hủy kỳ lương
 */
router.get('/periods/:id', hrOrAdmin, ctrl.getPeriodById);
router.patch('/periods/:id', hrOrAdmin, validate(v.updatePeriodSchema), ctrl.updatePeriod);

router.post('/periods/:id/calculate', hrOrAdmin, ctrl.calculatePeriod);

router.post(
  '/periods/:id/approve',
  hrOrAdmin,
  validate(v.approvePeriodSchema),
  ctrl.approvePeriod,
);
router.post(
  '/periods/:id/mark-paid',
  hrOrAdmin,
  validate(v.markPaidSchema),
  ctrl.markPeriodPaid,
);
router.post('/periods/:id/cancel', authorize(ROLES.ADMIN), ctrl.cancelPeriod);

// ╔══════════════════════════════════════════════════════════╗
// ║  CẤU HÌNH LƯƠNG (UserCompensation)                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/compensations                         — Danh sách (HR/Admin)
 * POST /api/payroll/compensations                         — Tạo mới (HR/Admin)
 *
 * GET  /api/payroll/compensations/user/:userId/active     — Active compensation của NV
 * GET  /api/payroll/compensations/user/:userId/history    — Lịch sử thay đổi lương
 * GET  /api/payroll/compensations/:id                     — Chi tiết 1 record
 * PATCH/api/payroll/compensations/:id                     — Cập nhật
 */

// Phải đặt routes /user/:userId/* TRƯỚC /:id để Express khớp đúng
router.get(
  '/compensations/user/:userId/active',
  hrOrAdmin,
  ctrl.getActiveCompensation,
);
router.get(
  '/compensations/user/:userId/history',
  hrOrAdmin,
  ctrl.getCompensationHistory,
);

router.get(
  '/compensations',
  hrOrAdmin,
  validate(v.listCompensationsSchema, 'query'),
  ctrl.listCompensations,
);
router.post(
  '/compensations',
  hrOrAdmin,
  validate(v.createCompensationSchema),
  ctrl.createCompensation,
);

router.get('/compensations/:id', hrOrAdmin, ctrl.getCompensationById);
router.patch(
  '/compensations/:id',
  hrOrAdmin,
  validate(v.updateCompensationSchema),
  ctrl.updateCompensation,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  THÀNH PHẦN LƯƠNG (SalaryComponent)                     ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/salary-components/options            — Dropdown (mọi role)
 * GET  /api/payroll/salary-components/user/:userId       — Thành phần gán cho NV
 * POST /api/payroll/salary-components/assign             — Gán cho NV (HR/Admin)
 * DELETE /api/payroll/salary-components/user-assignments/:id  — Gỡ gán
 *
 * GET  /api/payroll/salary-components                    — Danh sách (HR/Admin)
 * POST /api/payroll/salary-components                    — Tạo mới (HR/Admin)
 * GET  /api/payroll/salary-components/:id                — Chi tiết
 * PATCH/api/payroll/salary-components/:id                — Cập nhật
 */

// Specific paths TRƯỚC /:id
router.get('/salary-components/options', ctrl.getSalaryComponentOptions);
router.get(
  '/salary-components/user/:userId',
  hrOrAdmin,
  ctrl.getUserSalaryComponents,
);
router.post(
  '/salary-components/assign',
  hrOrAdmin,
  validate(v.assignSalaryComponentSchema),
  ctrl.assignSalaryComponent,
);
router.delete(
  '/salary-components/user-assignments/:id',
  hrOrAdmin,
  ctrl.removeUserSalaryComponent,
);

router.get(
  '/salary-components',
  hrOrAdmin,
  validate(v.listSalaryComponentsSchema, 'query'),
  ctrl.listSalaryComponents,
);
router.post(
  '/salary-components',
  hrOrAdmin,
  validate(v.createSalaryComponentSchema),
  ctrl.createSalaryComponent,
);
router.get('/salary-components/:id', hrOrAdmin, ctrl.getSalaryComponentById);
router.patch(
  '/salary-components/:id',
  hrOrAdmin,
  validate(v.updateSalaryComponentSchema),
  ctrl.updateSalaryComponent,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  ĐIỀU CHỈNH LƯƠNG (PayrollAdjustment)                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/adjustments                 — Danh sách (HR/Admin)
 * POST /api/payroll/adjustments                 — Tạo điều chỉnh (HR/Admin)
 * GET  /api/payroll/adjustments/:id             — Chi tiết
 * POST /api/payroll/adjustments/:id/approve     — Duyệt (HR/Admin)
 * POST /api/payroll/adjustments/:id/reject      — Từ chối
 */
router.get(
  '/adjustments',
  hrOrAdmin,
  validate(v.listAdjustmentsSchema, 'query'),
  ctrl.listAdjustments,
);
router.post(
  '/adjustments',
  hrOrAdmin,
  validate(v.createAdjustmentSchema),
  ctrl.createAdjustment,
);
router.get('/adjustments/:id', hrOrAdmin, ctrl.getAdjustmentById);
router.post(
  '/adjustments/:id/approve',
  hrOrAdmin,
  validate(v.approveAdjustmentSchema),
  ctrl.approveAdjustment,
);
router.post(
  '/adjustments/:id/reject',
  hrOrAdmin,
  validate(v.rejectAdjustmentSchema),
  ctrl.rejectAdjustment,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  PHIẾU LƯƠNG (PayrollRecord)                             ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/payroll/records
 *   — HR/Admin: xem tất cả (filter by periodId, userId, dept, status)
 *   — Employee: chỉ xem của mình (service tự filter)
 *
 * GET  /api/payroll/records/:id              — Chi tiết phiếu lương kèm items
 * PATCH /api/payroll/records/:id/notes       — HR/Admin thêm ghi chú
 * POST /api/payroll/records/:id/mark-paid    — HR/Admin đánh dấu thanh toán riêng lẻ
 */
router.get('/records', validate(v.listRecordsSchema, 'query'), ctrl.listRecords);
router.get('/records/:id', ctrl.getRecordById);
router.patch(
  '/records/:id/notes',
  hrOrAdmin,
  validate(v.updateRecordNotesSchema),
  ctrl.updateRecordNotes,
);
router.post(
  '/records/:id/mark-paid',
  hrOrAdmin,
  validate(v.markRecordPaidSchema),
  ctrl.markRecordPaid,
);

module.exports = router;
