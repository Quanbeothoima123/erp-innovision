'use strict';

const { z } = require('zod');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ── GET /overtime ─────────────────────────────────────────────
const listOvertimeSchema = z.object({
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  isHoliday: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isWeekend: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  ...pagination,
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── POST /overtime ────────────────────────────────────────────
const createOvertimeSchema = z
  .object({
    workDate: z.coerce.date({ required_error: 'Ngày làm thêm là bắt buộc' }),
    startTime: z
      .string({ required_error: 'Giờ bắt đầu OT là bắt buộc' })
      .regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:MM)'),
    endTime: z
      .string({ required_error: 'Giờ kết thúc OT là bắt buộc' })
      .regex(timeRegex, 'Định dạng giờ không hợp lệ (HH:MM)'),
    reason: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (d) => {
      // Cho phép endTime < startTime nếu OT qua đêm (VD: 22:00 → 01:00)
      // Nhưng cần tổng phút > 0
      const [sh, sm] = d.startTime.split(':').map(Number);
      const [eh, em] = d.endTime.split(':').map(Number);
      let startMins = sh * 60 + sm;
      let endMins = eh * 60 + em;
      if (endMins <= startMins) endMins += 24 * 60; // qua đêm
      return endMins - startMins > 0;
    },
    {
      message: 'Giờ kết thúc phải sau giờ bắt đầu',
      path: ['endTime'],
    },
  )
  .refine(
    (d) => {
      const [sh, sm] = d.startTime.split(':').map(Number);
      const [eh, em] = d.endTime.split(':').map(Number);
      let startMins = sh * 60 + sm;
      let endMins = eh * 60 + em;
      if (endMins <= startMins) endMins += 24 * 60;
      const minutes = endMins - startMins;
      return minutes <= 720; // tối đa 12 giờ OT / ngày
    },
    {
      message: 'Số giờ OT không được vượt quá 12 giờ / ngày',
      path: ['endTime'],
    },
  );

// ── PATCH /overtime/:id (Admin cập nhật actualMinutes sau khi duyệt) ──
const updateActualMinutesSchema = z.object({
  actualMinutes: z.coerce
    .number({ required_error: 'Số phút thực tế là bắt buộc' })
    .int()
    .min(1, 'Số phút phải lớn hơn 0')
    .max(720, 'Tối đa 720 phút (12 giờ)'),
  comment: z.string().max(500).optional().nullable(),
});

// ── POST /overtime/:id/approve ────────────────────────────────
const approveOvertimeSchema = z.object({
  actualMinutes: z.coerce
    .number()
    .int()
    .min(1, 'Số phút thực tế phải lớn hơn 0')
    .max(720)
    .optional()
    .nullable(), // null = dùng plannedMinutes
  comment: z.string().max(500).optional().nullable(),
});

// ── POST /overtime/:id/reject ─────────────────────────────────
const rejectOvertimeSchema = z.object({
  comment: z
    .string({ required_error: 'Lý do từ chối là bắt buộc' })
    .min(5, 'Lý do từ chối phải có ít nhất 5 ký tự')
    .max(500),
});

// ── POST /overtime/:id/cancel ─────────────────────────────────
const cancelOvertimeSchema = z.object({
  comment: z.string().max(500).optional().nullable(),
});

// ── GET /overtime/my/stats ────────────────────────────────────
const myOvertimeStatsSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(() => new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

module.exports = {
  listOvertimeSchema,
  createOvertimeSchema,
  updateActualMinutesSchema,
  approveOvertimeSchema,
  rejectOvertimeSchema,
  cancelOvertimeSchema,
  myOvertimeStatsSchema,
};
