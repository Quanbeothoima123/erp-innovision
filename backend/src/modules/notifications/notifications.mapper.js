'use strict';

// ── Labels dùng chung với frontend ───────────────────────────
const TYPE_LABELS = {
  ATTENDANCE_CHECKIN_REQUEST:   'Yêu cầu chấm công vào',
  ATTENDANCE_CHECKOUT_REQUEST:  'Yêu cầu chấm công ra',
  ATTENDANCE_REQUEST_APPROVED:  'Chấm công đã duyệt',
  ATTENDANCE_REQUEST_REJECTED:  'Chấm công bị từ chối',
  LEAVE_REQUEST_CREATED:        'Đơn nghỉ phép mới',
  LEAVE_REQUEST_APPROVED:       'Nghỉ phép được duyệt',
  LEAVE_REQUEST_REJECTED:       'Nghỉ phép bị từ chối',
  LEAVE_BALANCE_LOW:            'Số dư phép thấp',
  OVERTIME_REQUEST_CREATED:     'Yêu cầu làm thêm giờ',
  OVERTIME_APPROVED:            'OT đã được duyệt',
  OVERTIME_REJECTED:            'OT bị từ chối',
  PROJECT_ASSIGNED:             'Được gán vào dự án',
  PROJECT_STATUS_CHANGED:       'Trạng thái dự án thay đổi',
  MILESTONE_DUE_SOON:           'Milestone sắp đến hạn',
  PAYROLL_READY:                'Bảng lương sẵn sàng',
  PAYSLIP_AVAILABLE:            'Phiếu lương đã có',
  COMPENSATION_CHANGED:         'Lương được điều chỉnh',
  CONTRACT_SIGNED:              'Hợp đồng đã ký',
  CONTRACT_EXPIRING_SOON:       'Hợp đồng sắp hết hạn',
  INVOICE_SENT:                 'Hóa đơn đã gửi',
  PAYMENT_RECEIVED:             'Nhận được thanh toán',
  INVOICE_OVERDUE:              'Hóa đơn quá hạn',
  GENERAL:                      'Thông báo chung',
};

const TYPE_CATEGORIES = {
  ATTENDANCE_CHECKIN_REQUEST:   'Chấm công',
  ATTENDANCE_CHECKOUT_REQUEST:  'Chấm công',
  ATTENDANCE_REQUEST_APPROVED:  'Chấm công',
  ATTENDANCE_REQUEST_REJECTED:  'Chấm công',
  LEAVE_REQUEST_CREATED:        'Nghỉ phép',
  LEAVE_REQUEST_APPROVED:       'Nghỉ phép',
  LEAVE_REQUEST_REJECTED:       'Nghỉ phép',
  LEAVE_BALANCE_LOW:            'Nghỉ phép',
  OVERTIME_REQUEST_CREATED:     'Tăng ca',
  OVERTIME_APPROVED:            'Tăng ca',
  OVERTIME_REJECTED:            'Tăng ca',
  PROJECT_ASSIGNED:             'Dự án',
  PROJECT_STATUS_CHANGED:       'Dự án',
  MILESTONE_DUE_SOON:           'Dự án',
  PAYROLL_READY:                'Lương',
  PAYSLIP_AVAILABLE:            'Lương',
  COMPENSATION_CHANGED:         'Lương',
  CONTRACT_SIGNED:              'Hợp đồng',
  CONTRACT_EXPIRING_SOON:       'Hợp đồng',
  INVOICE_SENT:                 'Hóa đơn',
  PAYMENT_RECEIVED:             'Hóa đơn',
  INVOICE_OVERDUE:              'Hóa đơn',
  GENERAL:                      'Chung',
};

function toNotificationDto(n) {
  if (!n) return null;
  return {
    id:                n.id,
    type:              n.type,
    typeLabel:         TYPE_LABELS[n.type] ?? n.type,
    category:          TYPE_CATEGORIES[n.type] ?? 'Chung',
    title:             n.title,
    message:           n.message,
    relatedEntityType: n.relatedEntityType,
    relatedEntityId:   n.relatedEntityId,
    actionUrl:         n.actionUrl,
    isRead:            n.isRead,
    readAt:            n.readAt,
    sender:            n.senderUser ?? null,
    createdAt:         n.createdAt,
    updatedAt:         n.updatedAt,
  };
}

function toNotificationListDto(notifications, unreadCount, pagination) {
  return {
    notifications: notifications.map(toNotificationDto),
    unreadCount,
    pagination,
  };
}

module.exports = {
  toNotificationDto,
  toNotificationListDto,
  TYPE_LABELS,
  TYPE_CATEGORIES,
};
