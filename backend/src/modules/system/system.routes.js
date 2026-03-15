'use strict';

const { Router } = require('express');
const ctrl = require('./system.controller');
const { validate }             = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES }               = require('../../config/constants');
const v                       = require('./system.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTEM CONFIG (Admin only)                              ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/system/configs           — Tất cả config (grouped + flat)
 * PUT  /api/system/configs           — Batch upsert nhiều config
 * GET  /api/system/configs/:key      — 1 config theo key
 * PUT  /api/system/configs/:key      — Upsert 1 config
 * DELETE /api/system/configs/:key   — Xoá config
 */
router.get(
  '/configs',
  authorize(ROLES.ADMIN, ROLES.HR),
  ctrl.getAllConfigs,
);

router.put(
  '/configs',
  authorize(ROLES.ADMIN),
  validate(v.batchUpsertConfigSchema),
  ctrl.batchUpsertConfigs,
);

// Specific config routes — TRƯỚC /:key
router.get('/configs/:key',    authorize(ROLES.ADMIN, ROLES.HR), ctrl.getConfigByKey);
router.put(
  '/configs/:key',
  authorize(ROLES.ADMIN),
  validate(v.upsertConfigSchema),
  ctrl.upsertConfig,
);
router.delete('/configs/:key', authorize(ROLES.ADMIN), ctrl.deleteConfig);

// ╔══════════════════════════════════════════════════════════╗
// ║  AUDIT LOG (HR/Admin)                                    ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/system/audit-logs/stats   — Top actions, actors, entities
 * GET /api/system/audit-logs         — Danh sách với filter, sort
 * GET /api/system/audit-logs/:id     — Chi tiết + diff view
 */
// stats TRƯỚC /:id để Express match đúng
router.get('/audit-logs/stats', hrOrAdmin, ctrl.getAuditStats);
router.get(
  '/audit-logs',
  hrOrAdmin,
  validate(v.listAuditLogsSchema, 'query'),
  ctrl.listAuditLogs,
);
router.get('/audit-logs/:id',   hrOrAdmin, ctrl.getAuditLogById);

// ╔══════════════════════════════════════════════════════════╗
// ║  ACCOUNT MANAGEMENT (Admin only)                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/system/accounts                     — Danh sách tài khoản
 * POST /api/system/accounts/:id/lock            — Khoá TK + revoke sessions
 * POST /api/system/accounts/:id/unlock          — Mở khoá TK
 * POST /api/system/accounts/:id/reset-password  — Reset mật khẩu
 * PUT  /api/system/accounts/:id/roles           — Cập nhật vai trò
 */
router.get(
  '/accounts',
  authorize(ROLES.ADMIN),
  validate(v.listAuditLogsSchema, 'query'),   // reuse pagination schema
  ctrl.listAccounts,
);

router.post(
  '/accounts/:id/lock',
  authorize(ROLES.ADMIN),
  validate(v.lockAccountSchema),
  ctrl.lockAccount,
);

router.post(
  '/accounts/:id/unlock',
  authorize(ROLES.ADMIN),
  ctrl.unlockAccount,
);

router.post(
  '/accounts/:id/reset-password',
  authorize(ROLES.ADMIN),
  validate(v.resetPasswordSchema),
  ctrl.resetPassword,
);

router.put(
  '/accounts/:id/roles',
  authorize(ROLES.ADMIN),
  validate(v.updateRolesSchema),
  ctrl.updateUserRoles,
);

module.exports = router;
