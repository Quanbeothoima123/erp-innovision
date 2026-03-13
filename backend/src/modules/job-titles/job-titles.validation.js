'use strict';

const { z } = require('zod');

// ── GET /job-titles ──────────────────────────────────────────
const listJobTitlesSchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  // FIX: tăng max lên 500 để frontend có thể load toàn bộ danh sách
  limit: z.coerce.number().int().min(1).max(500).default(50),
  sortBy: z.enum(['name', 'code', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ── POST /job-titles ─────────────────────────────────────────
const createJobTitleSchema = z.object({
  name: z
    .string({ required_error: 'Tên chức danh là bắt buộc' })
    .min(2, 'Tên chức danh phải có ít nhất 2 ký tự')
    .max(191)
    .trim(),
  code: z
    .string()
    .max(50)
    .trim()
    .toUpperCase()
    .optional()
    .nullable(),
  description: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().default(true),
});

// ── PATCH /job-titles/:id ────────────────────────────────────
const updateJobTitleSchema = z.object({
  name: z.string().min(2).max(191).trim().optional(),
  code: z.string().max(50).trim().toUpperCase().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

module.exports = {
  listJobTitlesSchema,
  createJobTitleSchema,
  updateJobTitleSchema,
};
