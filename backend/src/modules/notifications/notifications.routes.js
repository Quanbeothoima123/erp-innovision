'use strict';

const { Router } = require('express');
const ctrl = require('./notifications.controller');
const { validate }              = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin } = require('../../middlewares/auth.middleware');
const v                         = require('./notifications.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  SELF-SERVICE — Hộp thư của từng user                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/notifications/my          — Hộp thư (filter: isRead, type, date)
 * GET  /api/notifications/my/unread-count — Badge count
 * POST /api/notifications/my/mark-all-read
 * POST /api/notifications/my/batch-mark-read
 * POST /api/notifications/my/batch-delete
 * DELETE /api/notifications/my/read   — Xoá tất cả đã đọc
 */
router.get(
  '/my',
  validate(v.listNotificationsSchema, 'query'),
  ctrl.listMyNotifications,
);

router.get('/my/unread-count', ctrl.getUnreadCount);

router.post('/my/mark-all-read', ctrl.markAllAsRead);

router.post(
  '/my/batch-mark-read',
  validate(v.batchMarkReadSchema),
  ctrl.batchMarkAsRead,
);

router.post(
  '/my/batch-delete',
  validate(v.batchDeleteSchema),
  ctrl.batchDelete,
);

router.delete('/my/read', ctrl.deleteAllRead);

/**
 * PATCH  /api/notifications/:id/read  — Đánh dấu 1 thông báo đã đọc
 * DELETE /api/notifications/:id       — Xoá 1 thông báo
 */
router.patch('/:id/read',   ctrl.markAsRead);
router.delete('/:id',       ctrl.deleteNotification);

// ╔══════════════════════════════════════════════════════════╗
// ║  ADMIN                                                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/notifications/admin/all    — Toàn bộ thông báo hệ thống
 * GET  /api/notifications/admin/stats  — Thống kê theo type
 * POST /api/notifications/admin/send   — Gửi thủ công
 */
router.get('/admin/all',   hrOrAdmin, ctrl.listAllNotifications);
router.get('/admin/stats', hrOrAdmin, ctrl.getTypeStats);
router.post(
  '/admin/send',
  hrOrAdmin,
  validate(v.createNotificationSchema),
  ctrl.sendManual,
);

module.exports = router;
