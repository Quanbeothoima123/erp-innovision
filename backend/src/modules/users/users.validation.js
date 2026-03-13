"use strict";

const { z } = require("zod");

// ── Shared ───────────────────────────────────────────────────
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── GET /users ───────────────────────────────────────────────
const listUsersSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  departmentId: z.string().optional(),
  jobTitleId: z.string().optional(),
  managerId: z.string().optional(),
  role: z
    .enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"])
    .optional(),
  accountStatus: z.enum(["PENDING", "ACTIVE", "LOCKED", "DISABLED"]).optional(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .optional(),
  sortBy: z
    .enum(["fullName", "email", "userCode", "hireDate", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── POST /users ──────────────────────────────────────────────
const createUserSchema = z.object({
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  fullName: z
    .string({ required_error: "Họ tên là bắt buộc" })
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(191)
    .trim(),
  userCode: z.string().max(50).trim().optional(),
  phoneNumber: z
    .string()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable(),
  departmentId: z.string().optional().nullable(),
  jobTitleId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hireDate: z.coerce.date().optional().nullable(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .default("PROBATION"),
  roles: z
    .array(
      z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"]),
    )
    .min(1, "Phải chọn ít nhất 1 role")
    .default(["EMPLOYEE"]),
  adminNotes: z.string().max(5000).optional().nullable(),
  sendSetupEmail: z.boolean().default(true),
});

// ── PATCH /users/:id ─────────────────────────────────────────
const updateUserSchema = z.object({
  fullName: z.string().min(2).max(191).trim().optional(),
  phoneNumber: z
    .string()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable(),
  avatarUrl: z.string().url("URL không hợp lệ").max(2048).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  jobTitleId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  hireDate: z.coerce.date().optional().nullable(),
  employmentStatus: z
    .enum(["PROBATION", "ACTIVE", "ON_LEAVE", "TERMINATED"])
    .optional(),
  adminNotes: z.string().max(5000).optional().nullable(),
});

// ── PUT /users/:id/roles ──────────────────────────────────────
const updateUserRolesSchema = z.object({
  roles: z
    .array(
      z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"]),
    )
    .min(1, "Phải chọn ít nhất 1 role"),
});

// ── PATCH /users/:id/status ───────────────────────────────────
const updateAccountStatusSchema = z.object({
  accountStatus: z.enum(["ACTIVE", "LOCKED", "DISABLED"], {
    required_error: "Trạng thái tài khoản là bắt buộc",
  }),
  reason: z.string().max(500).optional(),
});

// ── POST /users/:id/terminate ─────────────────────────────────
const terminateUserSchema = z.object({
  terminatedAt: z.coerce.date({ required_error: "Ngày nghỉ việc là bắt buộc" }),
  terminationReason: z.string().max(2000).optional().nullable(),
  revokeAccess: z.boolean().default(true),
});

// ── PUT /users/:id/profile ────────────────────────────────────
const updateProfileSchema = z.object({
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"])
    .optional()
    .nullable(),
  placeOfBirth: z.string().max(191).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  ethnicity: z.string().max(100).optional().nullable(),
  permanentAddress: z.string().max(500).optional().nullable(),
  currentAddress: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  nationalIdNumber: z.string().max(50).optional().nullable(),
  nationalIdIssueDate: z.coerce.date().optional().nullable(),
  nationalIdIssuePlace: z.string().max(191).optional().nullable(),
  passportNumber: z.string().max(50).optional().nullable(),
  passportExpiry: z.coerce.date().optional().nullable(),
  taxCode: z.string().max(50).optional().nullable(),
  socialInsuranceNumber: z.string().max(50).optional().nullable(),
  healthInsuranceNumber: z.string().max(50).optional().nullable(),
  healthInsuranceExpiry: z.coerce.date().optional().nullable(),
  bankName: z.string().max(191).optional().nullable(),
  bankBranch: z.string().max(191).optional().nullable(),
  bankAccountNumber: z.string().max(100).optional().nullable(),
  bankAccountHolder: z.string().max(191).optional().nullable(),
  emergencyContactName: z.string().max(191).optional().nullable(),
  emergencyContactPhone: z.string().max(30).optional().nullable(),
  emergencyContactRel: z.string().max(100).optional().nullable(),
  dependantCount: z.coerce.number().int().min(0).max(20).optional(),
  educationLevel: z.string().max(100).optional().nullable(),
  educationMajor: z.string().max(191).optional().nullable(),
  university: z.string().max(191).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// ── PATCH /users/me ───────────────────────────────────────────
// Nhân viên chỉ được tự sửa phone và avatar
const updateMeSchema = z.object({
  phoneNumber: z
    .string()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .nullable(),
  avatarUrl: z.string().url("URL không hợp lệ").max(2048).optional().nullable(),
});

// ── GET /users — params ───────────────────────────────────────
const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID không hợp lệ"),
});

module.exports = {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRolesSchema,
  updateAccountStatusSchema,
  terminateUserSchema,
  updateProfileSchema,
  updateMeSchema,
  userIdParamSchema,
};
