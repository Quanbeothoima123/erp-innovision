"use strict";

const repo = require("./notifications.repository");
const { AppError } = require("../../common/errors/AppError");
const { ROLES } = require("../../config/constants");
const { prisma } = require("../../config/db");
const telegramBot = require("../../common/services/telegram.service");

/**
 * Map từ NotificationType sang field trong UserTelegramSetting.
 * Nếu type không có trong map → luôn gửi (hoặc bỏ qua tuỳ logic).
 */
const TELEGRAM_SETTING_MAP = {
  ATTENDANCE_CHECKIN_REQUEST: "notifyAttendanceRequest",
  ATTENDANCE_CHECKOUT_REQUEST: "notifyAttendanceRequest",
  ATTENDANCE_REQUEST_APPROVED: "notifyAttendanceApproved",
  ATTENDANCE_REQUEST_REJECTED: "notifyAttendanceRejected",
  LEAVE_REQUEST_CREATED: "notifyLeaveRequest",
  LEAVE_REQUEST_APPROVED: "notifyLeaveApproved",
  LEAVE_REQUEST_REJECTED: "notifyLeaveRejected",
  LEAVE_BALANCE_LOW: "notifyLeaveBalanceLow",
  OVERTIME_REQUEST_CREATED: "notifyOvertimeRequest",
  OVERTIME_APPROVED: "notifyOvertimeApproved",
  OVERTIME_REJECTED: "notifyOvertimeRejected",
  TASK_ASSIGNED: "notifyTaskAssigned",
  TASK_UPDATED: "notifyTaskUpdated",
  TASK_DUE_SOON: "notifyTaskDueSoon",
  PAYROLL_READY: "notifyPayroll",
  PAYSLIP_AVAILABLE: "notifyPayslip",
  COMPENSATION_CHANGED: "notifyCompensation",
  PROJECT_ASSIGNED: "notifyProject",
  PROJECT_STATUS_CHANGED: "notifyProject",
  MILESTONE_DUE_SOON: "notifyMilestone",
  GENERAL: "notifyGeneral",
};

// ╔══════════════════════════════════════════════════════════╗
// ║  TELEGRAM DISPATCH                                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Dispatch thông báo Telegram cho một user.
 * Được gọi fire-and-forget từ notify().
 *
 * @param {string} userId
 * @param {object} opts   — { type, title, message, actionUrl }
 */
async function _dispatchTelegram(userId, opts) {
  try {
    // Lấy telegram info + settings của user trong 1 query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        telegramEnabled: true,
        telegramSettings: true,
      },
    });

    // Kiểm tra user đã kết nối và bật Telegram chưa
    if (!user?.telegramChatId || !user.telegramEnabled) return;

    // Kiểm tra setting cho loại thông báo này
    const settingField = TELEGRAM_SETTING_MAP[opts.type];
    if (settingField && user.telegramSettings) {
      if (user.telegramSettings[settingField] === false) return;
    }

    // Gửi Telegram
    await telegramBot.sendPersonalNotification(user.telegramChatId, {
      title: opts.title,
      message: opts.message,
      actionUrl: opts.actionUrl,
    });
  } catch (err) {
    console.error(
      "[Notification] Telegram dispatch failed for user",
      userId,
      ":",
      err.message,
    );
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  USER ENDPOINTS                                          ║
// ╚══════════════════════════════════════════════════════════╝

async function listMyNotifications(filters, userId) {
  const { notifications, total } = await repo.findMany({ ...filters, userId });
  const unreadCount = await repo.countUnread(userId);
  return {
    notifications,
    unreadCount,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 30, total },
  };
}

async function getMyUnreadCount(userId) {
  return repo.countUnread(userId);
}

async function markAsRead(id, userId) {
  const result = await repo.markAsRead(id, userId);
  if (result.count === 0) {
    throw AppError.notFound("Không tìm thấy thông báo.");
  }
}

async function batchMarkAsRead(ids, userId) {
  await repo.markManyAsRead(ids, userId);
}

async function markAllAsRead(userId) {
  await repo.markAllAsRead(userId);
}

async function deleteNotification(id, userId) {
  const result = await repo.deleteOne(id, userId);
  if (result.count === 0) {
    throw AppError.notFound("Không tìm thấy thông báo.");
  }
}

async function batchDelete(ids, userId) {
  await repo.deleteMany(ids, userId);
}

async function deleteAllRead(userId) {
  await repo.deleteAllRead(userId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ADMIN ENDPOINTS                                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Admin gửi thông báo thủ công tới 1 hoặc nhiều người dùng.
 */
async function sendManual(dto, senderUserId) {
  const records = dto.recipientUserIds.map((recipientUserId) => ({
    recipientUserId,
    senderUserId,
    type: dto.type ?? "GENERAL",
    title: dto.title,
    message: dto.message,
    relatedEntityType: dto.relatedEntityType ?? null,
    relatedEntityId: dto.relatedEntityId ?? null,
    actionUrl: dto.actionUrl ?? null,
    isRead: false,
  }));

  return repo.createMany(records);
}

async function listAllNotifications(filters) {
  return repo.findAll(filters);
}

async function getTypeStats() {
  const raw = await repo.getTypeStats();
  // Gom theo type, tách read/unread
  const map = {};
  for (const r of raw) {
    if (!map[r.type])
      map[r.type] = { type: r.type, read: 0, unread: 0, total: 0 };
    if (r.isRead) map[r.type].read += r._count.id;
    else map[r.type].unread += r._count.id;
    map[r.type].total += r._count.id;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  FACTORY — gọi từ các modules khác                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tạo thông báo từ 1 event — gọi từ service layer của các modules.
 *
 * @param {object} opts
 * @param {string|string[]} opts.recipientIds  — 1 hoặc nhiều userId
 * @param {string} opts.type                   — NotificationType enum
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.senderUserId]
 * @param {string} [opts.relatedEntityType]
 * @param {string} [opts.relatedEntityId]
 * @param {string} [opts.actionUrl]
 */
async function notify(opts) {
  const ids = Array.isArray(opts.recipientIds)
    ? opts.recipientIds
    : [opts.recipientIds];
  if (ids.length === 0) return;

  const records = ids.map((recipientUserId) => ({
    recipientUserId,
    senderUserId: opts.senderUserId ?? null,
    type: opts.type ?? "GENERAL",
    title: opts.title,
    message: opts.message,
    relatedEntityType: opts.relatedEntityType ?? null,
    relatedEntityId: opts.relatedEntityId ?? null,
    actionUrl: opts.actionUrl ?? null,
    isRead: false,
  }));

  // Fire-and-forget: không block business flow dù notification fail
  repo
    .createMany(records)
    .catch((err) =>
      console.error(
        "[Notification] Failed to create notifications:",
        err.message,
      ),
    );

  // ── TELEGRAM DISPATCH (fire-and-forget) ──────────────────────
  // Gửi cho từng user song song, không block business flow
  ids.forEach((userId) =>
    _dispatchTelegram(userId, {
      type: opts.type ?? "GENERAL",
      title: opts.title,
      message: opts.message,
      actionUrl: opts.actionUrl,
    }),
  );
  // ─────────────────────────────────────────────────────────────
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRESET HELPERS — chuẩn hoá messages theo từng event    ║
// ╚══════════════════════════════════════════════════════════╝

const notifyHelpers = {
  // ── Attendance ────────────────────────────────────────────

  attendanceCheckInRequest(
    recipientIds,
    { requesterName, workDate, senderUserId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "ATTENDANCE_CHECKIN_REQUEST",
      title: "Yêu cầu chấm công vào",
      message: `${requesterName} gửi yêu cầu chấm công vào ngày ${_fmtDate(workDate)}. Vui lòng xem xét và duyệt.`,
      relatedEntityType: "AttendanceRequest",
    });
  },

  attendanceCheckOutRequest(
    recipientIds,
    { requesterName, workDate, senderUserId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "ATTENDANCE_CHECKOUT_REQUEST",
      title: "Yêu cầu chấm công ra",
      message: `${requesterName} gửi yêu cầu chấm công ra ngày ${_fmtDate(workDate)}.`,
      relatedEntityType: "AttendanceRequest",
    });
  },

  attendanceApproved(recipientId, { workDate, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "ATTENDANCE_REQUEST_APPROVED",
      title: "Yêu cầu chấm công đã được duyệt",
      message: `Yêu cầu chấm công ngày ${_fmtDate(workDate)} của bạn đã được duyệt.`,
    });
  },

  attendanceRejected(recipientId, { workDate, reason, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "ATTENDANCE_REQUEST_REJECTED",
      title: "Yêu cầu chấm công bị từ chối",
      message: `Yêu cầu chấm công ngày ${_fmtDate(workDate)} của bạn bị từ chối.${reason ? ` Lý do: ${reason}` : ""}`,
    });
  },

  // ── Leave ─────────────────────────────────────────────────

  leaveRequestCreated(
    recipientIds,
    {
      requesterName,
      leaveType,
      startDate,
      endDate,
      totalDays,
      senderUserId,
      entityId,
    },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "LEAVE_REQUEST_CREATED",
      title: "Đơn nghỉ phép mới cần duyệt",
      message: `${requesterName} xin nghỉ ${leaveType} ${totalDays} ngày (${_fmtDate(startDate)} – ${_fmtDate(endDate)}).`,
      relatedEntityType: "LeaveRequest",
      relatedEntityId: entityId,
      actionUrl: "/leave",
    });
  },

  leaveApproved(
    recipientId,
    { leaveType, startDate, endDate, totalDays, senderUserId },
  ) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "LEAVE_REQUEST_APPROVED",
      title: "Đơn nghỉ phép đã được duyệt",
      message: `Đơn nghỉ ${leaveType} ${totalDays} ngày (${_fmtDate(startDate)} – ${_fmtDate(endDate)}) đã được duyệt.`,
    });
  },

  leaveRejected(recipientId, { leaveType, startDate, reason, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "LEAVE_REQUEST_REJECTED",
      title: "Đơn nghỉ phép bị từ chối",
      message: `Đơn nghỉ ${leaveType} từ ${_fmtDate(startDate)} bị từ chối.${reason ? ` Lý do: ${reason}` : ""}`,
    });
  },

  leaveBalanceLow(recipientId, { leaveType, remainingDays }) {
    return notify({
      recipientIds: recipientId,
      type: "LEAVE_BALANCE_LOW",
      title: "Số dư ngày phép thấp",
      message: `Số dư phép ${leaveType} còn ${remainingDays} ngày. Hãy sử dụng hợp lý.`,
    });
  },

  // ── Overtime ──────────────────────────────────────────────

  overtimeRequestCreated(
    recipientIds,
    { requesterName, workDate, hours, senderUserId, entityId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "OVERTIME_REQUEST_CREATED",
      title: "Yêu cầu làm thêm giờ mới",
      message: `${requesterName} đăng ký OT ${hours}h ngày ${_fmtDate(workDate)}.`,
      relatedEntityType: "OvertimeRequest",
      relatedEntityId: entityId,
      actionUrl: "/overtime",
    });
  },

  overtimeApproved(recipientId, { workDate, hours, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "OVERTIME_APPROVED",
      title: "Yêu cầu OT đã được duyệt",
      message: `Yêu cầu làm thêm giờ ${hours}h ngày ${_fmtDate(workDate)} đã được duyệt.`,
    });
  },

  overtimeRejected(recipientId, { workDate, reason, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "OVERTIME_REJECTED",
      title: "Yêu cầu OT bị từ chối",
      message: `Yêu cầu OT ngày ${_fmtDate(workDate)} bị từ chối.${reason ? ` Lý do: ${reason}` : ""}`,
    });
  },

  // ── Project ───────────────────────────────────────────────

  projectAssigned(
    recipientId,
    { projectName, roleName, senderUserId, entityId },
  ) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "PROJECT_ASSIGNED",
      title: "Được gán vào dự án",
      message: `Bạn đã được thêm vào dự án "${projectName}"${roleName ? ` với vai trò ${roleName}` : ""}.`,
      relatedEntityType: "Project",
      relatedEntityId: entityId,
      actionUrl: `/projects/${entityId}`,
    });
  },

  projectStatusChanged(
    recipientIds,
    { projectName, newStatus, senderUserId, entityId },
  ) {
    const statusLabels = {
      ACTIVE: "Đang thực hiện",
      COMPLETED: "Hoàn thành",
      ON_HOLD: "Tạm dừng",
      CANCELLED: "Đã hủy",
    };
    return notify({
      recipientIds,
      senderUserId,
      type: "PROJECT_STATUS_CHANGED",
      title: "Trạng thái dự án thay đổi",
      message: `Dự án "${projectName}" chuyển sang trạng thái ${statusLabels[newStatus] ?? newStatus}.`,
      relatedEntityType: "Project",
      relatedEntityId: entityId,
    });
  },

  milestoneDueSoon(
    recipientId,
    { milestoneName, projectName, daysLeft, entityId },
  ) {
    return notify({
      recipientIds: recipientId,
      type: "MILESTONE_DUE_SOON",
      title: "Milestone sắp đến hạn",
      message: `Milestone "${milestoneName}" (${projectName}) còn ${daysLeft} ngày nữa đến hạn.`,
      relatedEntityType: "ProjectMilestone",
      relatedEntityId: entityId,
    });
  },

  // ── Payroll ───────────────────────────────────────────────

  payrollReady(recipientIds, { month, year }) {
    return notify({
      recipientIds,
      type: "PAYROLL_READY",
      title: "Bảng lương đã sẵn sàng",
      message: `Bảng lương tháng ${month}/${year} đã được duyệt. Vui lòng kiểm tra.`,
      actionUrl: "/payroll",
    });
  },

  payslipAvailable(recipientId, { month, year, netSalary }) {
    return notify({
      recipientIds: recipientId,
      type: "PAYSLIP_AVAILABLE",
      title: "Phiếu lương đã có",
      message: `Phiếu lương tháng ${month}/${year} của bạn đã có. Lương thực nhận: ${_fmtMoney(netSalary)} đ.`,
      actionUrl: "/payroll",
    });
  },

  compensationChanged(recipientId, { changeReason, senderUserId }) {
    return notify({
      recipientIds: recipientId,
      senderUserId,
      type: "COMPENSATION_CHANGED",
      title: "Lương được điều chỉnh",
      message: `Cấu hình lương của bạn đã được cập nhật.${changeReason ? ` Lý do: ${changeReason}` : ""}`,
    });
  },

  // ── Client / Contract / Invoice ───────────────────────────

  contractSigned(
    recipientIds,
    { contractCode, clientName, senderUserId, entityId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "CONTRACT_SIGNED",
      title: "Hợp đồng đã ký",
      message: `Hợp đồng ${contractCode} với khách hàng ${clientName} đã được ký kết.`,
      relatedEntityType: "Contract",
      relatedEntityId: entityId,
    });
  },

  contractExpiringSoon(
    recipientIds,
    { contractCode, clientName, daysLeft, entityId },
  ) {
    return notify({
      recipientIds,
      type: "CONTRACT_EXPIRING_SOON",
      title: "Hợp đồng sắp hết hạn",
      message: `Hợp đồng ${contractCode} với ${clientName} sẽ hết hạn sau ${daysLeft} ngày.`,
      relatedEntityType: "Contract",
      relatedEntityId: entityId,
    });
  },

  invoiceSent(
    recipientIds,
    { invoiceCode, clientName, amount, senderUserId, entityId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "INVOICE_SENT",
      title: "Hóa đơn đã gửi",
      message: `Hóa đơn ${invoiceCode} (${_fmtMoney(amount)} đ) đã được gửi tới ${clientName}.`,
      relatedEntityType: "Invoice",
      relatedEntityId: entityId,
    });
  },

  paymentReceived(
    recipientIds,
    { invoiceCode, amount, clientName, senderUserId },
  ) {
    return notify({
      recipientIds,
      senderUserId,
      type: "PAYMENT_RECEIVED",
      title: "Nhận được thanh toán",
      message: `${clientName} đã thanh toán ${_fmtMoney(amount)} đ cho hóa đơn ${invoiceCode}.`,
    });
  },

  invoiceOverdue(
    recipientIds,
    { invoiceCode, clientName, daysOverdue, entityId },
  ) {
    return notify({
      recipientIds,
      type: "INVOICE_OVERDUE",
      title: "Hóa đơn quá hạn",
      message: `Hóa đơn ${invoiceCode} của ${clientName} đã quá hạn ${daysOverdue} ngày.`,
      relatedEntityType: "Invoice",
      relatedEntityId: entityId,
    });
  },
};

// ── Private helpers ───────────────────────────────────────────

function _fmtDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
}

function _fmtMoney(amount) {
  if (!amount) return "0";
  return Number(amount).toLocaleString("vi-VN");
}

module.exports = {
  // User
  listMyNotifications,
  getMyUnreadCount,
  markAsRead,
  batchMarkAsRead,
  markAllAsRead,
  deleteNotification,
  batchDelete,
  deleteAllRead,
  // Admin
  sendManual,
  listAllNotifications,
  getTypeStats,
  // Factory — export cho các modules khác import
  notify,
  notifyHelpers,
};
