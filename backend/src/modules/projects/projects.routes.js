'use strict';

const { Router }  = require('express');
const ctrl        = require('./projects.controller');
const { validate }             = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES }               = require('../../config/constants');
const v                       = require('./projects.validation');

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  SELF-SERVICE                                            ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/projects/my          — Danh sách dự án nhân viên đang tham gia
 * GET  /api/projects/expenses    — Cross-project: tất cả chi phí (employee: chỉ của mình)
 */
router.get('/my', ctrl.getMyProjects);

router.get(
  '/expenses',
  validate(v.listExpensesSchema, 'query'),
  ctrl.listExpenses,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT CRUD                                            ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/projects              — Danh sách dự án (filter, search, paginate)
 * POST /api/projects              — Tạo dự án mới (HR/Admin/Manager)
 */
router.get(
  '/',
  validate(v.listProjectsSchema, 'query'),
  ctrl.listProjects,
);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.createProjectSchema),
  ctrl.createProject,
);

/**
 * GET   /api/projects/:id             — Chi tiết dự án (kèm members + milestones)
 * PATCH /api/projects/:id             — Cập nhật thông tin dự án
 * PATCH /api/projects/:id/health      — Cập nhật health + progress (PM / HR / Admin)
 * POST  /api/projects/:id/compute-health — Auto-compute health từ dữ liệu thực
 * GET   /api/projects/:id/health      — Dashboard health snapshot
 * POST  /api/projects/:id/close       — Đóng / hoàn thành / hủy dự án
 * POST  /api/projects/:id/reopen      — Mở lại dự án đã đóng (HR/Admin)
 */
router.get('/:id', ctrl.getProjectById);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.updateProjectSchema),
  ctrl.updateProject,
);

router.patch(
  '/:id/health',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.updateHealthSchema),
  ctrl.updateHealth,
);

router.post(
  '/:id/compute-health',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  ctrl.autoComputeHealth,
);

router.get('/:id/health', ctrl.getProjectHealth);

router.post(
  '/:id/close',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.closeProjectSchema),
  ctrl.closeProject,
);

router.post('/:id/reopen', hrOrAdmin, ctrl.reopenProject);

// ╔══════════════════════════════════════════════════════════╗
// ║  MEMBERS (UserProjectAssignment)                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/projects/:id/members
 *      ?includeEnded=true  → gồm cả thành viên đã rời
 *
 * POST /api/projects/:id/members
 *      Body: { userId, roleInProject, allocationPercent, hourlyRate, joinedAt, isBillable }
 *
 * PATCH /api/projects/:id/members/:assignmentId
 *       Cập nhật role, allocation, hourlyRate
 *
 * POST  /api/projects/:id/members/:assignmentId/end
 *       Kết thúc assignment → status = ENDED
 */
router.get('/:id/members', ctrl.getProjectMembers);

router.post(
  '/:id/members',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.assignMemberSchema),
  ctrl.assignMember,
);

router.patch(
  '/:id/members/:assignmentId',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.updateAssignmentSchema),
  ctrl.updateAssignment,
);

router.post(
  '/:id/members/:assignmentId/end',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.endAssignmentSchema),
  ctrl.endAssignment,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  MILESTONES                                              ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET    /api/projects/:id/milestones                   — Danh sách
 *         ?status=PENDING|IN_PROGRESS|DONE|OVERDUE
 *         ?overdueOnly=true
 *
 * POST   /api/projects/:id/milestones                   — Tạo milestone
 * GET    /api/projects/:id/milestones/:milestoneId       — Chi tiết
 * PATCH  /api/projects/:id/milestones/:milestoneId       — Cập nhật (kể cả mark DONE)
 * DELETE /api/projects/:id/milestones/:milestoneId       — Xóa (chỉ khi chưa DONE)
 */
router.get(
  '/:id/milestones',
  validate(v.listMilestonesSchema, 'query'),
  ctrl.getMilestones,
);

router.post(
  '/:id/milestones',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.createMilestoneSchema),
  ctrl.createMilestone,
);

router.get('/:id/milestones/:milestoneId', ctrl.getMilestoneById);

router.patch(
  '/:id/milestones/:milestoneId',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.updateMilestoneSchema),
  ctrl.updateMilestone,
);

router.delete(
  '/:id/milestones/:milestoneId',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  ctrl.deleteMilestone,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  EXPENSES (Chi phí dự án)                                ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/projects/:id/expenses           — Chi phí trong dự án
 *       filter: category, status, fromDate, toDate
 *
 * GET  /api/projects/:id/expenses/summary   — Tổng hợp theo category + budget
 *
 * POST /api/projects/:id/expenses           — Gửi chi phí (thành viên dự án)
 *
 * GET    /api/projects/:id/expenses/:expenseId              — Chi tiết
 * PATCH  /api/projects/:id/expenses/:expenseId              — Chỉnh sửa (PENDING only)
 * DELETE /api/projects/:id/expenses/:expenseId              — Xóa (PENDING only)
 * POST   /api/projects/:id/expenses/:expenseId/approve      — Duyệt
 * POST   /api/projects/:id/expenses/:expenseId/reject       — Từ chối
 * POST   /api/projects/:id/expenses/:expenseId/reimburse    — Đánh dấu đã hoàn tiền
 */

// summary TRƯỚC /:expenseId để Express khớp đúng
router.get('/:id/expenses/summary', ctrl.getExpenseSummary);

router.get(
  '/:id/expenses',
  validate(v.listExpensesSchema, 'query'),
  ctrl.getProjectExpenses,
);

router.post(
  '/:id/expenses',
  validate(v.createExpenseSchema),
  ctrl.createExpense,
);

router.get('/:id/expenses/:expenseId', ctrl.getExpenseById);

router.patch(
  '/:id/expenses/:expenseId',
  validate(v.updateExpenseSchema),
  ctrl.updateExpense,
);

router.delete('/:id/expenses/:expenseId', ctrl.deleteExpense);

router.post(
  '/:id/expenses/:expenseId/approve',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.approveExpenseSchema),
  ctrl.approveExpense,
);

router.post(
  '/:id/expenses/:expenseId/reject',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.rejectExpenseSchema),
  ctrl.rejectExpense,
);

router.post(
  '/:id/expenses/:expenseId/reimburse',
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  ctrl.reimburseExpense,
);

module.exports = router;
