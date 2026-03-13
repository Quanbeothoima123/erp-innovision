"use strict";

const { z } = require("zod");

// ── Shared ────────────────────────────────────────────────────
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
};

// ╔══════════════════════════════════════════════════════════╗
// ║  WORK SHIFT                                              ║
// ╚══════════════════════════════════════════════════════════╝

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:MM"

const listShiftsSchema = z.object({
  search: z.string().trim().optional(),
  shiftType: z
    .enum(["MORNING", "AFTERNOON", "NIGHT", "FLEXIBLE", "SPLIT"])
    .optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  ...pagination,
});

const createShiftSchema = z.object({
  code: z
    .string({ required_error: "Mã ca là bắt buộc" })
    .max(50)
    .trim()
    .toUpperCase(),
  name: z
    .string({ required_error: "Tên ca là bắt buộc" })
    .min(2)
    .max(191)
    .trim(),
  shiftType: z.enum(["MORNING", "AFTERNOON", "NIGHT", "FLEXIBLE", "SPLIT"], {
    required_error: "Loại ca là bắt buộc",
  }),
  startTime: z
    .string({ required_error: "Giờ bắt đầu là bắt buộc" })
    .regex(timeRegex, "Định dạng giờ không hợp lệ (HH:MM)"),
  endTime: z
    .string({ required_error: "Giờ kết thúc là bắt buộc" })
    .regex(timeRegex, "Định dạng giờ không hợp lệ (HH:MM)"),
  breakMinutes: z.coerce.number().int().min(0).max(480).default(60),
  workMinutes: z.coerce.number().int().min(1, "Số phút làm việc là bắt buộc"),
  isNightShift: z.boolean().default(false),
  overtimeAfterMinutes: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateShiftSchema = createShiftSchema.partial().omit({ code: true });

// ── User Work Shift (gán ca cho nhân viên) ────────────────────
const assignUserShiftSchema = z.object({
  userId: z.string({ required_error: "User ID là bắt buộc" }),
  shiftId: z.string({ required_error: "Shift ID là bắt buộc" }),
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional().nullable(), // null = tất cả ngày
  effectiveFrom: z.coerce.date({ required_error: "Ngày hiệu lực là bắt buộc" }),
  effectiveTo: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  HOLIDAY                                                 ║
// ╚══════════════════════════════════════════════════════════╝

const listHolidaysSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  ...pagination,
});

const createHolidaySchema = z.object({
  name: z
    .string({ required_error: "Tên ngày lễ là bắt buộc" })
    .min(2)
    .max(191)
    .trim(),
  date: z.coerce.date({ required_error: "Ngày lễ là bắt buộc" }),
  isRecurring: z.boolean().default(false),
  description: z.string().max(2000).optional().nullable(),
  overtimeMultiplier: z.coerce.number().min(1).max(5).default(3.0),
});

const updateHolidaySchema = createHolidaySchema.partial();

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE REQUEST (Nhân viên gửi)                      ║
// ╚══════════════════════════════════════════════════════════╝

const createAttendanceRequestSchema = z.object({
  requestType: z.enum(["CHECK_IN", "CHECK_OUT"], {
    required_error: "Loại yêu cầu là bắt buộc",
  }),
  requestedAt: z.coerce.date({
    required_error: "Thời gian yêu cầu ghi nhận là bắt buộc",
  }),
  workDate: z.coerce.date({ required_error: "Ngày làm việc là bắt buộc" }),
  shiftId: z.string().optional().nullable(),
  isRemoteWork: z.boolean().default(false),
  note: z.string().max(1000).optional().nullable(),
  imageUrl: z
    .string()
    .url("URL ảnh không hợp lệ")
    .max(2048)
    .optional()
    .nullable(),
});

const listAttendanceRequestsSchema = z.object({
  userId: z.string().optional(), // Admin/HR filter theo nhân viên
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  requestType: z.enum(["CHECK_IN", "CHECK_OUT"]).optional(),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]).optional(), // alias
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(), // alias cho fromDate
  endDate: z.coerce.date().optional(),   // alias cho toDate
  departmentId: z.string().optional(),
  ...pagination,
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── Admin/HR duyệt yêu cầu ────────────────────────────────────
const approveAttendanceRequestSchema = z.object({
  note: z.string().max(500).optional().nullable(),
});

const rejectAttendanceRequestSchema = z.object({
  rejectReason: z
    .string({ required_error: "Lý do từ chối là bắt buộc" })
    .min(5, "Lý do từ chối phải có ít nhất 5 ký tự")
    .max(500),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE RECORD (Admin/HR)                            ║
// ╚══════════════════════════════════════════════════════════╝

const listAttendanceRecordsSchema = z.object({
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(), // alias cho fromDate
  endDate: z.coerce.date().optional(),   // alias cho toDate
  status: z
    .enum(["PRESENT", "ABSENT", "LEAVE", "HOLIDAY", "MANUAL_ADJUSTED"])
    .optional(),
  ...pagination,
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Admin/HR tạo thủ công hoặc điều chỉnh bản ghi
const manualAdjustSchema = z.object({
  userId: z.string({ required_error: "User ID là bắt buộc" }),
  workDate: z.coerce.date({ required_error: "Ngày làm việc là bắt buộc" }),
  shiftId: z.string().optional().nullable(),
  checkInAt: z.coerce.date().optional().nullable(),
  checkOutAt: z.coerce.date().optional().nullable(),
  status: z
    .enum(["PRESENT", "ABSENT", "LEAVE", "HOLIDAY", "MANUAL_ADJUSTED"])
    .default("MANUAL_ADJUSTED"),
  lateMinutes: z.coerce.number().int().min(0).default(0),
  earlyLeaveMinutes: z.coerce.number().int().min(0).default(0),
  overtimeMinutes: z.coerce.number().int().min(0).default(0),
  isHolidayWork: z.boolean().default(false),
  isWeekendWork: z.boolean().default(false),
  isRemoteWork: z.boolean().default(false),
  note: z.string().max(1000).optional().nullable(),
});

const updateAttendanceRecordSchema = manualAdjustSchema
  .omit({ userId: true, workDate: true })
  .partial();

// ── My attendance query ───────────────────────────────────────
const myAttendanceSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  ...pagination,
});

module.exports = {
  // Shift
  listShiftsSchema,
  createShiftSchema,
  updateShiftSchema,
  assignUserShiftSchema,
  // Holiday
  listHolidaysSchema,
  createHolidaySchema,
  updateHolidaySchema,
  // Request
  createAttendanceRequestSchema,
  listAttendanceRequestsSchema,
  approveAttendanceRequestSchema,
  rejectAttendanceRequestSchema,
  // Record
  listAttendanceRecordsSchema,
  manualAdjustSchema,
  updateAttendanceRecordSchema,
  myAttendanceSchema,
};
