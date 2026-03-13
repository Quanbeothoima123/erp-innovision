"use strict";

const { z } = require("zod");

// ── GET /departments ─────────────────────────────────────────
const listDepartmentsSchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  includeStats: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(), // Có kèm số lượng nhân viên không
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ── POST /departments ────────────────────────────────────────
const createDepartmentSchema = z.object({
  name: z
    .string({ required_error: "Tên phòng ban là bắt buộc" })
    .min(2, "Tên phòng ban phải có ít nhất 2 ký tự")
    .max(191, "Tên phòng ban không được quá 191 ký tự")
    .trim(),
  description: z.string().max(5000).optional().nullable(),
  headUserId: z.string().optional().nullable(), // Trưởng phòng (User.id)
  isActive: z.boolean().default(true),
});

// ── PATCH /departments/:id ───────────────────────────────────
const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(191).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  headUserId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ── DELETE /departments/:id — chỉ cần confirm không còn NV ──
// Không cần schema, xử lý hết ở service

module.exports = {
  listDepartmentsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
};
