'use strict';

const { z } = require('zod');

const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

// ── Dùng chung ────────────────────────────────────────────────
const yearSchema  = z.coerce.number().int().min(2020).max(2100).default(thisYear);
const monthSchema = z.coerce.number().int().min(1).max(12).default(thisMonth);

// ── Dashboard tổng quan ───────────────────────────────────────
const dashboardSchema = z.object({
  year:  yearSchema,
  month: monthSchema,
});

// ── Báo cáo nhân sự (HR) ─────────────────────────────────────
const hrReportSchema = z.object({
  departmentId: z.string().optional(),
  year:         yearSchema,
});

// ── Báo cáo chấm công ────────────────────────────────────────
const attendanceReportSchema = z.object({
  year:         yearSchema,
  month:        monthSchema,
  departmentId: z.string().optional(),
  userId:       z.string().optional(),
});

// ── Báo cáo nghỉ phép ────────────────────────────────────────
const leaveReportSchema = z.object({
  year:         yearSchema,
  departmentId: z.string().optional(),
  leaveTypeId:  z.string().optional(),
});

// ── Báo cáo lương ────────────────────────────────────────────
const payrollReportSchema = z.object({
  year:         yearSchema,
  month:        monthSchema.optional(),
  departmentId: z.string().optional(),
});

// ── Báo cáo dự án ────────────────────────────────────────────
const projectReportSchema = z.object({
  year:         yearSchema,
  status:       z.enum(['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED']).optional(),
});

// ── Báo cáo tài chính (doanh thu & công nợ) ──────────────────
const financeReportSchema = z.object({
  year:     yearSchema,
  month:    monthSchema.optional(),
  clientId: z.string().optional(),
});

// ── Báo cáo OT ───────────────────────────────────────────────
const overtimeReportSchema = z.object({
  year:         yearSchema,
  month:        monthSchema.optional(),
  departmentId: z.string().optional(),
});

module.exports = {
  dashboardSchema,
  hrReportSchema,
  attendanceReportSchema,
  leaveReportSchema,
  payrollReportSchema,
  projectReportSchema,
  financeReportSchema,
  overtimeReportSchema,
};
