'use strict';

const service = require('./notifications.service');
const mapper  = require('./notifications.mapper');
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ╔══════════════════════════════════════════════════════════╗
// ║  USER — tự phục vụ hộp thư của mình                     ║
// ╚══════════════════════════════════════════════════════════╝

async function listMyNotifications(req, res, next) {
  try {
    const { notifications, unreadCount, pagination } =
      await service.listMyNotifications(req.query, req.user.id);

    return res.json({
      success: true,
      message: 'Lấy thông báo thành công',
      data: mapper.toNotificationListDto(notifications, unreadCount, pagination),
    });
  } catch (err) { next(err); }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await service.getMyUnreadCount(req.user.id);
    return successResponse(res, { unreadCount: count }, 'Lấy số thông báo chưa đọc thành công');
  } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
  try {
    await service.markAsRead(req.params.id, req.user.id);
    return noContentResponse(res, 'Đánh dấu đã đọc thành công');
  } catch (err) { next(err); }
}

async function batchMarkAsRead(req, res, next) {
  try {
    await service.batchMarkAsRead(req.body.ids, req.user.id);
    return successResponse(res, null, `Đã đánh dấu ${req.body.ids.length} thông báo đã đọc`);
  } catch (err) { next(err); }
}

async function markAllAsRead(req, res, next) {
  try {
    await service.markAllAsRead(req.user.id);
    return successResponse(res, null, 'Đã đánh dấu tất cả đã đọc');
  } catch (err) { next(err); }
}

async function deleteNotification(req, res, next) {
  try {
    await service.deleteNotification(req.params.id, req.user.id);
    return noContentResponse(res, 'Xoá thông báo thành công');
  } catch (err) { next(err); }
}

async function batchDelete(req, res, next) {
  try {
    await service.batchDelete(req.body.ids, req.user.id);
    return successResponse(res, null, `Đã xoá ${req.body.ids.length} thông báo`);
  } catch (err) { next(err); }
}

async function deleteAllRead(req, res, next) {
  try {
    await service.deleteAllRead(req.user.id);
    return successResponse(res, null, 'Đã xoá tất cả thông báo đã đọc');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ADMIN                                                   ║
// ╚══════════════════════════════════════════════════════════╝

async function sendManual(req, res, next) {
  try {
    const result = await service.sendManual(req.body, req.user.id);
    return successResponse(res, { sent: result.count }, `Đã gửi ${result.count} thông báo`, 201);
  } catch (err) { next(err); }
}

async function listAllNotifications(req, res, next) {
  try {
    const { notifications, total } = await service.listAllNotifications(req.query);
    return paginatedResponse(
      res,
      notifications.map(n => ({
        ...mapper.toNotificationDto(n),
        recipient: n.recipientUser ?? null,
      })),
      { page: req.query.page ?? 1, limit: req.query.limit ?? 30, total },
      'Lấy tất cả thông báo thành công',
    );
  } catch (err) { next(err); }
}

async function getTypeStats(req, res, next) {
  try {
    const stats = await service.getTypeStats();
    return successResponse(res, stats, 'Lấy thống kê thông báo thành công');
  } catch (err) { next(err); }
}

module.exports = {
  listMyNotifications, getUnreadCount,
  markAsRead, batchMarkAsRead, markAllAsRead,
  deleteNotification, batchDelete, deleteAllRead,
  sendManual, listAllNotifications, getTypeStats,
};
