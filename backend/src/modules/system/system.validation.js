'use strict';

const { z } = require('zod');

const pg = {
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
};

// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTEM CONFIG                                           ║
// ╚══════════════════════════════════════════════════════════╝

const upsertConfigSchema = z.object({
  key:         z.string({ required_error: 'Key là bắt buộc' }).min(1).max(100).trim(),
  value:       z.string({ required_error: 'Value là bắt buộc' }).max(10000),
  description: z.string().max(500).optional().nullable(),
});

const batchUpsertConfigSchema = z.object({
  configs: z.array(z.object({
    key:   z.string().min(1).max(100).trim(),
    value: z.string().max(10000),
  })).min(1, 'Cần ít nhất 1 cấu hình'),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  AUDIT LOG                                               ║
// ╚══════════════════════════════════════════════════════════╝

const listAuditLogsSchema = z.object({
  entityType: z.string().optional(),
  actionType: z.string().optional(),
  actorUserId: z.string().optional(),
  entityId:    z.string().optional(),
  fromDate:    z.coerce.date().optional(),
  toDate:      z.coerce.date().optional(),
  search:      z.string().trim().optional(),
  ...pg,
  sortOrder: z.enum(['asc','desc']).default('desc'),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  ACCOUNT MANAGEMENT (Admin)                              ║
// ╚══════════════════════════════════════════════════════════╝

const lockAccountSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(100)
    .regex(/[A-Z]/, 'Phải có chữ hoa')
    .regex(/[0-9]/, 'Phải có số')
    .optional(),
  // Nếu không truyền newPassword → dùng default password từ SystemConfig
});

const updateRolesSchema = z.object({
  roles: z
    .array(z.enum(['ADMIN','HR','MANAGER','EMPLOYEE','SALES','ACCOUNTANT']))
    .min(1, 'Người dùng phải có ít nhất 1 vai trò'),
});

module.exports = {
  upsertConfigSchema,
  batchUpsertConfigSchema,
  listAuditLogsSchema,
  lockAccountSchema,
  resetPasswordSchema,
  updateRolesSchema,
};
