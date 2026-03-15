'use strict';

const { z } = require('zod');

const NOTIFICATION_TYPES = [
  'ATTENDANCE_CHECKIN_REQUEST','ATTENDANCE_CHECKOUT_REQUEST',
  'ATTENDANCE_REQUEST_APPROVED','ATTENDANCE_REQUEST_REJECTED',
  'LEAVE_REQUEST_CREATED','LEAVE_REQUEST_APPROVED','LEAVE_REQUEST_REJECTED','LEAVE_BALANCE_LOW',
  'OVERTIME_REQUEST_CREATED','OVERTIME_APPROVED','OVERTIME_REJECTED',
  'PROJECT_ASSIGNED','PROJECT_STATUS_CHANGED','MILESTONE_DUE_SOON',
  'PAYROLL_READY','PAYSLIP_AVAILABLE','COMPENSATION_CHANGED',
  'CONTRACT_SIGNED','CONTRACT_EXPIRING_SOON',
  'INVOICE_SENT','PAYMENT_RECEIVED','INVOICE_OVERDUE',
  'GENERAL',
];

// ── List thông báo ────────────────────────────────────────────
const listNotificationsSchema = z.object({
  isRead:    z.enum(['true','false']).transform(v => v === 'true').optional(),
  type:      z.enum(NOTIFICATION_TYPES).optional(),
  fromDate:  z.coerce.date().optional(),
  toDate:    z.coerce.date().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(30),
});

// ── Tạo thông báo (Admin/System) ─────────────────────────────
const createNotificationSchema = z.object({
  recipientUserIds:  z.array(z.string()).min(1, 'Phải có ít nhất 1 người nhận'),
  type:              z.enum(NOTIFICATION_TYPES).default('GENERAL'),
  title:             z.string({ required_error: 'Tiêu đề là bắt buộc' }).min(1).max(191).trim(),
  message:           z.string({ required_error: 'Nội dung là bắt buộc' }).min(1).max(2000),
  relatedEntityType: z.string().max(50).optional().nullable(),
  relatedEntityId:   z.string().max(30).optional().nullable(),
  actionUrl:         z.string().url().max(2048).optional().nullable(),
});

// ── Batch operations ──────────────────────────────────────────
const batchMarkReadSchema = z.object({
  ids: z.array(z.string()).min(1, 'Cần ít nhất 1 ID'),
});

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'Cần ít nhất 1 ID'),
});

module.exports = {
  listNotificationsSchema,
  createNotificationSchema,
  batchMarkReadSchema,
  batchDeleteSchema,
  NOTIFICATION_TYPES,
};
