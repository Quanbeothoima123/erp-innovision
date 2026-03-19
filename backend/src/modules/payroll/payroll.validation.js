"use strict";

const { z } = require("zod");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL PERIOD (Kỳ lương)                               ║
// ╚══════════════════════════════════════════════════════════╝

const listPeriodsSchema = z.object({
  status: z
    .enum(["DRAFT", "CALCULATING", "APPROVED", "PAID", "CANCELLED"])
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  ...pagination,
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createPeriodSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12, "Tháng không hợp lệ"),
    year: z.coerce.number().int().min(2000).max(2100),
    startDate: z.coerce.date({ required_error: "Ngày bắt đầu là bắt buộc" }),
    endDate: z.coerce.date({ required_error: "Ngày kết thúc là bắt buộc" }),
    payDate: z.coerce.date().optional().nullable(),
    workingDaysInPeriod: z.coerce
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endDate"],
  });

const updatePeriodSchema = z.object({
  payDate: z.coerce.date().optional().nullable(),
  workingDaysInPeriod: z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ── Chuyển trạng thái period ──────────────────────────────────
const approvePeriodSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

const markPaidSchema = z.object({
  paidAt: z.coerce.date().default(() => new Date()),
  notes: z.string().max(1000).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  USER COMPENSATION (Cấu hình lương)                     ║
// ╚══════════════════════════════════════════════════════════╝

const listCompensationsSchema = z.object({
  userId: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  ...pagination,
});

const createCompensationSchema = z.object({
  userId: z.string({ required_error: "User ID là bắt buộc" }),
  salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"], {
    required_error: "Loại lương là bắt buộc",
  }),
  baseSalary: z.coerce
    .number({ required_error: "Lương cơ bản là bắt buộc" })
    .min(0, "Lương cơ bản không được âm"),
  probationSalary: z.coerce.number().min(0).optional().nullable(),
  standardWorkingDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .nullable(),
  standardWorkingHours: z.coerce.number().min(1).max(24).optional().nullable(),
  currency: z.string().max(10).default("VND"),
  payFrequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY"]).default("MONTHLY"),
  payDayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  probationEndDate: z.coerce.date().optional().nullable(),
  changeReason: z.string().max(500).optional().nullable(),
  overtimeRateWeekday: z.coerce.number().min(1).max(5).default(1.5),
  overtimeRateWeekend: z.coerce.number().min(1).max(5).default(2.0),
  overtimeRateHoliday: z.coerce.number().min(1).max(5).default(3.0),
  effectiveFrom: z.coerce.date({ required_error: "Ngày hiệu lực là bắt buộc" }),
  effectiveTo: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateCompensationSchema = createCompensationSchema
  .partial()
  .omit({ userId: true });

// ╔══════════════════════════════════════════════════════════╗
// ║  SALARY COMPONENT (Danh mục thành phần lương)            ║
// ╚══════════════════════════════════════════════════════════╝

const listSalaryComponentsSchema = z.object({
  componentType: z.enum(["EARNING", "DEDUCTION"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  ...pagination,
});

const createSalaryComponentSchema = z.object({
  code: z
    .string({ required_error: "Mã thành phần là bắt buộc" })
    .max(50)
    .trim()
    .toUpperCase(),
  name: z
    .string({ required_error: "Tên thành phần là bắt buộc" })
    .min(2)
    .max(191)
    .trim(),
  componentType: z.enum(["EARNING", "DEDUCTION"], {
    required_error: "Loại thành phần là bắt buộc",
  }),
  calculationType: z.enum(["FIXED", "FORMULA", "MANUAL"]).default("FIXED"),
  isTaxable: z.boolean().default(false),
  isInsurable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  description: z.string().max(2000).optional().nullable(),
});

const updateSalaryComponentSchema = createSalaryComponentSchema
  .partial()
  .omit({ code: true });

// ╔══════════════════════════════════════════════════════════╗
// ║  USER SALARY COMPONENT (Gán thành phần cho nhân viên)   ║
// ╚══════════════════════════════════════════════════════════╝

const assignSalaryComponentSchema = z.object({
  userId: z.string({ required_error: "User ID là bắt buộc" }),
  salaryComponentId: z.string({
    required_error: "Thành phần lương là bắt buộc",
  }),
  amount: z.coerce.number({ required_error: "Số tiền là bắt buộc" }).min(0),
  /** true = amount là % lương cơ bản (vd: 8.0 = 8%), false = số tiền cố định */
  isPercentage: z.boolean().default(false),
  effectiveFrom: z.coerce.date({ required_error: "Ngày hiệu lực là bắt buộc" }),
  effectiveTo: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL ADJUSTMENT (Điều chỉnh lương)                   ║
// ╚══════════════════════════════════════════════════════════╝

const listAdjustmentsSchema = z.object({
  userId: z.string().optional(),
  payrollPeriodId: z.string().optional(),
  adjustmentType: z
    .enum(["BONUS", "DEDUCTION", "ADVANCE", "REIMBURSEMENT"])
    .optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "APPLIED"]).optional(),
  ...pagination,
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createAdjustmentSchema = z.object({
  userId: z.string({ required_error: "User ID là bắt buộc" }),
  payrollPeriodId: z.string().optional().nullable(),
  adjustmentType: z.enum(["BONUS", "DEDUCTION", "ADVANCE", "REIMBURSEMENT"], {
    required_error: "Loại điều chỉnh là bắt buộc",
  }),
  amount: z.coerce
    .number({ required_error: "Số tiền là bắt buộc" })
    .min(1, "Số tiền phải lớn hơn 0"),
  reason: z.string().max(2000).optional().nullable(),
});

const approveAdjustmentSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

const rejectAdjustmentSchema = z.object({
  reason: z
    .string({ required_error: "Lý do từ chối là bắt buộc" })
    .min(5)
    .max(500),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL RECORD (Phiếu lương)                            ║
// ╚══════════════════════════════════════════════════════════╝

const listRecordsSchema = z.object({
  payrollPeriodId: z.string().optional(),
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(["DRAFT", "APPROVED", "PAID", "VOID"]).optional(),
  ...pagination,
});

// HR ghi chú / điều chỉnh thủ công vào phiếu lương
const updateRecordNotesSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

// Đánh dấu phiếu đã thanh toán riêng lẻ
const markRecordPaidSchema = z.object({
  paymentRef: z.string().max(191).optional().nullable(),
  paidAt: z.coerce.date().default(() => new Date()),
});

module.exports = {
  listPeriodsSchema,
  createPeriodSchema,
  updatePeriodSchema,
  approvePeriodSchema,
  markPaidSchema,
  listCompensationsSchema,
  createCompensationSchema,
  updateCompensationSchema,
  listSalaryComponentsSchema,
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  assignSalaryComponentSchema,
  listAdjustmentsSchema,
  createAdjustmentSchema,
  approveAdjustmentSchema,
  rejectAdjustmentSchema,
  listRecordsSchema,
  updateRecordNotesSchema,
  markRecordPaidSchema,
};
