'use strict';

const { z } = require('zod');

const pagination = {
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const PROJECT_STATUSES   = ['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'];
const PROJECT_PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];
const HEALTH_STATUSES    = ['ON_TRACK','AT_RISK','DELAYED'];
const EXPENSE_CATEGORIES = ['LABOR','SOFTWARE','HARDWARE','TRAVEL','TRAINING','SUBCONTRACT','OTHER'];
const EXPENSE_STATUSES   = ['PENDING','APPROVED','REJECTED','REIMBURSED'];
const MILESTONE_STATUSES = ['PENDING','IN_PROGRESS','DONE','OVERDUE'];

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

const listProjectsSchema = z.object({
  search:       z.string().trim().optional(),
  status:       z.enum(PROJECT_STATUSES).optional(),
  priority:     z.enum(PROJECT_PRIORITIES).optional(),
  healthStatus: z.enum(HEALTH_STATUSES).optional(),
  clientId:     z.string().optional(),
  managerId:    z.string().optional(),
  myProjects:   z.enum(['true','false']).transform(v => v === 'true').optional(),
  fromDate:     z.coerce.date().optional(),
  toDate:       z.coerce.date().optional(),
  ...pagination,
  sortBy:    z.enum(['startDate','endDate','createdAt','projectName','spentAmount']).default('createdAt'),
  sortOrder: z.enum(['asc','desc']).default('desc'),
});

const createProjectSchema = z.object({
  projectCode: z.string().max(50).trim().toUpperCase().optional().nullable(),
  projectName: z.string({ required_error: 'Tên dự án là bắt buộc' }).min(2).max(191).trim(),
  description: z.string().max(5000).optional().nullable(),
  projectManagerUserId: z.string().optional().nullable(),
  clientId:             z.string().optional().nullable(),
  contractId:           z.string().optional().nullable(),
  status:   z.enum(PROJECT_STATUSES).default('PLANNING'),
  priority: z.enum(PROJECT_PRIORITIES).optional().nullable(),
  startDate:     z.coerce.date().optional().nullable(),
  endDate:       z.coerce.date().optional().nullable(),
  budgetAmount:  z.coerce.number().min(0).optional().nullable(),
  contractValue: z.coerce.number().min(0).optional().nullable(),
  currency:      z.string().max(10).default('VND'),
}).refine(d => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['endDate'],
});

const updateProjectSchema = createProjectSchema.partial();

// Cập nhật health / tiến độ
const updateHealthSchema = z.object({
  healthStatus:    z.enum(HEALTH_STATUSES).optional(),
  progressPercent: z.coerce.number().min(0).max(100).optional(),
  notes:           z.string().max(2000).optional().nullable(),
});

// Đóng / hoàn thành project
const closeProjectSchema = z.object({
  status:       z.enum(['COMPLETED','CANCELLED','ARCHIVED']),
  actualEndDate: z.coerce.date().optional().nullable(),
  closureNote:   z.string().max(5000).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  USER PROJECT ASSIGNMENT (Gán nhân viên)                 ║
// ╚══════════════════════════════════════════════════════════╝

const assignMemberSchema = z.object({
  userId:            z.string({ required_error: 'User ID là bắt buộc' }),
  roleInProject:     z.string().max(100).optional().nullable(),
  allocationPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  hourlyRate:        z.coerce.number().min(0).optional().nullable(),
  joinedAt:          z.coerce.date({ required_error: 'Ngày tham gia là bắt buộc' }),
  isBillable:        z.boolean().default(false),
  notes:             z.string().max(1000).optional().nullable(),
});

const updateAssignmentSchema = z.object({
  roleInProject:     z.string().max(100).optional().nullable(),
  allocationPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  hourlyRate:        z.coerce.number().min(0).optional().nullable(),
  isBillable:        z.boolean().optional(),
  notes:             z.string().max(1000).optional().nullable(),
});

const endAssignmentSchema = z.object({
  leftAt: z.coerce.date({ required_error: 'Ngày kết thúc là bắt buộc' }),
  notes:  z.string().max(500).optional().nullable(),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT MILESTONE                                       ║
// ╚══════════════════════════════════════════════════════════╝

const listMilestonesSchema = z.object({
  status:    z.enum(MILESTONE_STATUSES).optional(),
  overdueOnly: z.enum(['true','false']).transform(v => v === 'true').optional(),
  ...pagination,
});

const createMilestoneSchema = z.object({
  name:        z.string({ required_error: 'Tên milestone là bắt buộc' }).min(2).max(191).trim(),
  description: z.string().max(3000).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  dueDate:     z.coerce.date().optional().nullable(),
  status:      z.enum(MILESTONE_STATUSES).default('PENDING'),
  invoiceId:   z.string().optional().nullable(),
});

const updateMilestoneSchema = createMilestoneSchema.partial();

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT EXPENSE (Chi phí dự án)                         ║
// ╚══════════════════════════════════════════════════════════╝

const listExpensesSchema = z.object({
  projectId:  z.string().optional(),
  category:   z.enum(EXPENSE_CATEGORIES).optional(),
  status:     z.enum(EXPENSE_STATUSES).optional(),
  submittedBy: z.string().optional(),
  fromDate:   z.coerce.date().optional(),
  toDate:     z.coerce.date().optional(),
  ...pagination,
  sortOrder: z.enum(['asc','desc']).default('desc'),
});

const createExpenseSchema = z.object({
  category:    z.enum(EXPENSE_CATEGORIES, { required_error: 'Danh mục chi phí là bắt buộc' }),
  title:       z.string({ required_error: 'Tiêu đề chi phí là bắt buộc' }).min(2).max(191).trim(),
  description: z.string().max(3000).optional().nullable(),
  amount:      z.coerce.number({ required_error: 'Số tiền là bắt buộc' }).min(1, 'Số tiền phải lớn hơn 0'),
  currency:    z.string().max(10).default('VND'),
  expenseDate: z.coerce.date({ required_error: 'Ngày chi phí là bắt buộc' }),
  receiptUrl:  z.string().url('URL hoá đơn không hợp lệ').max(2048).optional().nullable(),
});

const updateExpenseSchema = createExpenseSchema.partial();

const approveExpenseSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

const rejectExpenseSchema = z.object({
  rejectReason: z
    .string({ required_error: 'Lý do từ chối là bắt buộc' })
    .min(5, 'Lý do phải có ít nhất 5 ký tự')
    .max(1000),
});

module.exports = {
  listProjectsSchema, createProjectSchema, updateProjectSchema,
  updateHealthSchema, closeProjectSchema,
  assignMemberSchema, updateAssignmentSchema, endAssignmentSchema,
  listMilestonesSchema, createMilestoneSchema, updateMilestoneSchema,
  listExpensesSchema, createExpenseSchema, updateExpenseSchema,
  approveExpenseSchema, rejectExpenseSchema,
};
