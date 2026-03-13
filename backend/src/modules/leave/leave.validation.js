'use strict';

const { z } = require('zod');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE TYPE (Loại nghỉ phép)                             ║
// ╚══════════════════════════════════════════════════════════╝

const listLeaveTypesSchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isPaid: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  ...pagination,
});

const createLeaveTypeSchema = z.object({
  code: z
    .string({ required_error: 'Mã loại phép là bắt buộc' })
    .min(2)
    .max(50)
    .trim()
    .toUpperCase(),
  name: z
    .string({ required_error: 'Tên loại phép là bắt buộc' })
    .min(2)
    .max(191)
    .trim(),
  description: z.string().max(2000).optional().nullable(),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
  maxDaysPerYear: z.coerce
    .number()
    .min(0.5)
    .max(365)
    .optional()
    .nullable(),
  requiresDocument: z.boolean().default(false),
});

const updateLeaveTypeSchema = createLeaveTypeSchema.partial().omit({ code: true });

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE BALANCE (Số dư phép)                              ║
// ╚══════════════════════════════════════════════════════════╝

const listBalancesSchema = z.object({
  userId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  ...pagination,
});

const upsertBalanceSchema = z.object({
  userId: z.string({ required_error: 'User ID là bắt buộc' }),
  leaveTypeId: z.string({ required_error: 'Loại phép là bắt buộc' }),
  year: z.coerce.number().int().min(2000).max(2100, 'Năm không hợp lệ'),
  entitledDays: z.coerce
    .number()
    .min(0, 'Số ngày không được âm')
    .max(365),
  carriedDays: z.coerce.number().min(0).max(365).default(0),
  adjustedDays: z.coerce.number().min(-365).max(365).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

// HR điều chỉnh số dư (tăng/giảm thủ công)
const adjustBalanceSchema = z.object({
  adjustedDays: z.coerce
    .number()
    .min(-365)
    .max(365, 'Số ngày điều chỉnh không hợp lệ'),
  notes: z.string({ required_error: 'Ghi chú lý do điều chỉnh là bắt buộc' })
    .min(5, 'Ghi chú phải có ít nhất 5 ký tự')
    .max(1000),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  LEAVE REQUEST (Đơn nghỉ phép)                           ║
// ╚══════════════════════════════════════════════════════════╝

const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string({ required_error: 'Loại nghỉ phép là bắt buộc' }),
    startDate: z.coerce.date({ required_error: 'Ngày bắt đầu là bắt buộc' }),
    endDate: z.coerce.date({ required_error: 'Ngày kết thúc là bắt buộc' }),
    isHalfDay: z.boolean().default(false),
    halfDayPeriod: z
      .enum(['MORNING', 'AFTERNOON'])
      .optional()
      .nullable(),
    reason: z.string().max(2000).optional().nullable(),
    documentUrl: z
      .string()
      .url('URL tài liệu không hợp lệ')
      .max(2048)
      .optional()
      .nullable(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['endDate'],
  })
  .refine(
    (d) => !d.isHalfDay || d.halfDayPeriod,
    {
      message: 'Vui lòng chọn buổi nghỉ (sáng hoặc chiều) khi chọn nửa ngày',
      path: ['halfDayPeriod'],
    },
  )
  .refine(
    (d) => !d.isHalfDay || (d.startDate.getTime() === d.endDate.getTime()),
    {
      message: 'Nghỉ nửa ngày chỉ áp dụng cho 1 ngày duy nhất',
      path: ['isHalfDay'],
    },
  );

const listLeaveRequestsSchema = z.object({
  userId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
    .optional(),
  currentStep: z.enum(['MANAGER', 'HR']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  departmentId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  ...pagination,
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Nhân viên hủy đơn của mình
const cancelLeaveRequestSchema = z.object({
  cancelReason: z.string().max(500).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  APPROVAL (Duyệt / Từ chối từng bước)                   ║
// ╚══════════════════════════════════════════════════════════╝

const approveLeaveSchema = z.object({
  comment: z.string().max(1000).optional().nullable(),
});

const rejectLeaveSchema = z.object({
  rejectionReason: z
    .string({ required_error: 'Lý do từ chối là bắt buộc' })
    .min(5, 'Lý do từ chối phải có ít nhất 5 ký tự')
    .max(1000),
});

module.exports = {
  listLeaveTypesSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  listBalancesSchema,
  upsertBalanceSchema,
  adjustBalanceSchema,
  createLeaveRequestSchema,
  listLeaveRequestsSchema,
  cancelLeaveRequestSchema,
  approveLeaveSchema,
  rejectLeaveSchema,
};
