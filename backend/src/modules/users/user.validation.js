"use strict";

const { z } = require("zod");

// ── Shared ───────────────────────────────────────────────────
const cuidSchema = z.string().min(1).max(30);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── POST /users — Tạo nhân viên mới ─────────────────────────
const createUserSchema = z.object({
  // Thông tin cơ bản
  email: z.string().email("Email không hợp lệ").toLowerCase().trim(),
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(191).trim(),
  userCode: z.string().max(50).trim().optional(),
  phoneNumber: z.string().max(30).trim().optional(),

  // Vị trí tổ chức
  departmentId: cuidSchema.optional().nullable(),
  jobTitleId: cuidSchema.optional().nullable(),
  managerId: cuidSchema.optional().nullable(),

  // Tuyển dụng
  hireDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .default("PROBATION"),

  // Roles (mảng role codes)
  roles: z
    .array(
      z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"]),
    )
    .min(1, "Phải gán ít nhất 1 role")
    .default(["EMPLOYEE"]),

  // Ghi chú nội bộ (chỉ Admin/HR thấy)
  adminNotes: z.string().max(5000).trim().optional().nullable(),

  // Có gửi email kích hoạt không (default true)
  sendActivationEmail: z.boolean().default(true),
});

// ── PUT /users/:id — Cập nhật thông tin cơ bản ──────────────
const updateUserSchema = z.object({
  fullName: z.string().min(2).max(191).trim().optional(),
  phoneNumber: z.string().max(30).trim().optional().nullable(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),

  departmentId: cuidSchema.optional().nullable(),
  jobTitleId: cuidSchema.optional().nullable(),
  managerId: cuidSchema.optional().nullable(),

  hireDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .optional(),

  adminNotes: z.string().max(5000).trim().optional().nullable(),
});

// ── PATCH /users/:id/roles — Gán/cập nhật roles ─────────────
const updateRolesSchema = z.object({
  roles: z
    .array(
      z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"]),
    )
    .min(1, "Phải có ít nhất 1 role"),
});

// ── PATCH /users/:id/status — Khóa / mở khóa / disable ──────
const updateStatusSchema = z.object({
  accountStatus: z.enum(["ACTIVE", "LOCKED", "DISABLED"]),
  reason: z.string().max(500).trim().optional(),
});

// ── PATCH /users/:id/terminate — Nghỉ việc ──────────────────
const terminateUserSchema = z.object({
  terminatedAt: z.string().datetime({ offset: true }).or(z.string().date()),
  terminationReason: z
    .string()
    .min(5, "Vui lòng ghi rõ lý do")
    .max(1000)
    .trim(),
});

// ── PUT /users/:id/profile — Cập nhật UserProfile ───────────
const upsertProfileSchema = z.object({
  // Nhân thân
  dateOfBirth: z.string().date().optional().nullable(),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"])
    .optional()
    .nullable(),
  placeOfBirth: z.string().max(191).trim().optional().nullable(),
  nationality: z.string().max(100).trim().optional().nullable(),
  ethnicity: z.string().max(100).trim().optional().nullable(),

  // Địa chỉ
  permanentAddress: z.string().max(500).trim().optional().nullable(),
  currentAddress: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  province: z.string().max(100).trim().optional().nullable(),

  // Giấy tờ
  nationalIdNumber: z.string().max(50).trim().optional().nullable(),
  nationalIdIssueDate: z.string().date().optional().nullable(),
  nationalIdIssuePlace: z.string().max(191).trim().optional().nullable(),
  passportNumber: z.string().max(50).trim().optional().nullable(),
  passportExpiry: z.string().date().optional().nullable(),

  // Thuế & BHXH
  taxCode: z.string().max(50).trim().optional().nullable(),
  socialInsuranceNumber: z.string().max(50).trim().optional().nullable(),
  healthInsuranceNumber: z.string().max(50).trim().optional().nullable(),
  healthInsuranceExpiry: z.string().date().optional().nullable(),

  // Ngân hàng
  bankName: z.string().max(191).trim().optional().nullable(),
  bankBranch: z.string().max(191).trim().optional().nullable(),
  bankAccountNumber: z.string().max(100).trim().optional().nullable(),
  bankAccountHolder: z.string().max(191).trim().optional().nullable(),

  // Người liên hệ khẩn cấp
  emergencyContactName: z.string().max(191).trim().optional().nullable(),
  emergencyContactPhone: z.string().max(30).trim().optional().nullable(),
  emergencyContactRel: z.string().max(100).trim().optional().nullable(),

  // Thuế TNCN
  dependantCount: z.coerce.number().int().min(0).max(20).optional(),

  // Học vấn
  educationLevel: z.string().max(100).trim().optional().nullable(),
  educationMajor: z.string().max(191).trim().optional().nullable(),
  university: z.string().max(191).trim().optional().nullable(),

  notes: z.string().max(5000).trim().optional().nullable(),
});

// ── GET /users — query params ────────────────────────────────
const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  departmentId: cuidSchema.optional(),
  jobTitleId: cuidSchema.optional(),
  managerId: cuidSchema.optional(),
  roles: z.string().trim().optional(), // comma-separated: "ADMIN,HR"
  accountStatus: z.enum(["PENDING", "ACTIVE", "LOCKED", "DISABLED"]).optional(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .optional(),
  sortBy: z
    .enum(["fullName", "email", "createdAt", "hireDate", "userCode"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── POST /users/:id/resend-activation ────────────────────────
const resendActivationSchema = z.object({}).optional();

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateRolesSchema,
  updateStatusSchema,
  terminateUserSchema,
  upsertProfileSchema,
  listUsersQuerySchema,
};
