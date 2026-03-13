'use strict';

const service = require('./projects.service');
const mapper  = require('./projects.mapper');
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/projects
 * HR/Admin: tất cả | Manager: có filter myProjects | Employee: chỉ dự án mình tham gia
 */
async function listProjects(req, res, next) {
  try {
    const { projects, pagination } = await service.listProjects(req.query, req.user);
    return paginatedResponse(
      res,
      projects.map(mapper.toProjectSummaryDto),
      pagination,
      'Lấy danh sách dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/projects/:id
 * Kèm full: assignments, milestones
 */
async function getProjectById(req, res, next) {
  try {
    const project = await service.getProjectById(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toProjectDetailDto(project),
      'Lấy thông tin dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects
 */
async function createProject(req, res, next) {
  try {
    const project = await service.createProject(req.body, req.user);
    return successResponse(
      res,
      mapper.toProjectSummaryDto(project),
      'Tạo dự án thành công',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * PATCH /api/projects/:id
 */
async function updateProject(req, res, next) {
  try {
    const project = await service.updateProject(req.params.id, req.body, req.user);
    return successResponse(
      res,
      mapper.toProjectSummaryDto(project),
      'Cập nhật dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * PATCH /api/projects/:id/health
 * PM / HR / Admin cập nhật health status + progress
 */
async function updateHealth(req, res, next) {
  try {
    const project = await service.updateHealth(req.params.id, req.body, req.user);
    return successResponse(
      res,
      mapper.toProjectSummaryDto(project),
      'Cập nhật trạng thái sức khoẻ dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/compute-health
 * Tự động tính health dựa trên budget % + milestone overdue rate + deadline
 */
async function autoComputeHealth(req, res, next) {
  try {
    const result = await service.autoComputeHealth(req.params.id);
    return successResponse(
      res,
      result,
      `Tự động tính health: ${result.healthStatus}`,
    );
  } catch (err) { next(err); }
}

/**
 * GET /api/projects/:id/health
 * Dashboard health — budget, timeline, milestone breakdown
 */
async function getProjectHealth(req, res, next) {
  try {
    const { project, milestoneStats } = await service.getProjectHealth(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toHealthDto(project, milestoneStats),
      'Lấy thông tin health dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/close
 * Đóng / hoàn thành / hủy dự án
 */
async function closeProject(req, res, next) {
  try {
    const project = await service.closeProject(req.params.id, req.body, req.user);
    return successResponse(
      res,
      mapper.toProjectSummaryDto(project),
      'Đóng dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/reopen
 * Mở lại dự án đã đóng (chỉ HR/Admin)
 */
async function reopenProject(req, res, next) {
  try {
    const project = await service.reopenProject(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toProjectSummaryDto(project),
      'Mở lại dự án thành công',
    );
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ASSIGNMENT (Thành viên dự án)                           ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/projects/my
 * Nhân viên xem danh sách dự án mình đang tham gia
 */
async function getMyProjects(req, res, next) {
  try {
    const assignments = await service.getMyProjects(req.user.id);
    return successResponse(
      res,
      assignments.map(mapper.toAssignmentDto),
      'Lấy danh sách dự án của bạn thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET  /api/projects/:id/members             — Danh sách thành viên
 *       ?includeEnded=true  → gồm cả đã rời
 */
async function getProjectMembers(req, res, next) {
  try {
    const includeEnded = req.query.includeEnded === 'true';
    const members = await service.getProjectMembers(req.params.id, includeEnded, req.user);
    return successResponse(
      res,
      members.map(mapper.toAssignmentDto),
      'Lấy danh sách thành viên dự án thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/members
 * Gán nhân viên vào dự án
 */
async function assignMember(req, res, next) {
  try {
    const assignment = await service.assignMember(req.params.id, req.body, req.user);
    return successResponse(
      res,
      mapper.toAssignmentDto(assignment),
      'Thêm thành viên vào dự án thành công',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * PATCH /api/projects/:id/members/:assignmentId
 * Cập nhật role, allocation, hourlyRate
 */
async function updateAssignment(req, res, next) {
  try {
    const assignment = await service.updateAssignment(
      req.params.id,
      req.params.assignmentId,
      req.body,
      req.user,
    );
    return successResponse(
      res,
      mapper.toAssignmentDto(assignment),
      'Cập nhật thông tin thành viên thành công',
    );
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/members/:assignmentId/end
 * Kết thúc assignment của thành viên
 */
async function endAssignment(req, res, next) {
  try {
    const assignment = await service.endAssignment(
      req.params.id,
      req.params.assignmentId,
      req.body,
      req.user,
    );
    return successResponse(
      res,
      mapper.toAssignmentDto(assignment),
      'Kết thúc thành viên dự án thành công',
    );
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  MILESTONE                                               ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/projects/:id/milestones
 * POST /api/projects/:id/milestones
 */
async function getMilestones(req, res, next) {
  try {
    const { milestones, pagination } = await service.getMilestones(
      req.params.id, req.query, req.user,
    );
    return paginatedResponse(
      res,
      milestones.map(mapper.toMilestoneDto),
      pagination,
      'Lấy danh sách milestone thành công',
    );
  } catch (err) { next(err); }
}

async function getMilestoneById(req, res, next) {
  try {
    const m = await service.getMilestoneById(
      req.params.id, req.params.milestoneId, req.user,
    );
    return successResponse(res, mapper.toMilestoneDto(m), 'Lấy milestone thành công');
  } catch (err) { next(err); }
}

async function createMilestone(req, res, next) {
  try {
    const m = await service.createMilestone(req.params.id, req.body, req.user);
    return successResponse(res, mapper.toMilestoneDto(m), 'Tạo milestone thành công', 201);
  } catch (err) { next(err); }
}

async function updateMilestone(req, res, next) {
  try {
    const m = await service.updateMilestone(
      req.params.id, req.params.milestoneId, req.body, req.user,
    );
    return successResponse(res, mapper.toMilestoneDto(m), 'Cập nhật milestone thành công');
  } catch (err) { next(err); }
}

async function deleteMilestone(req, res, next) {
  try {
    await service.deleteMilestone(req.params.id, req.params.milestoneId, req.user);
    return noContentResponse(res, 'Xóa milestone thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  EXPENSE (Chi phí dự án)                                 ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/projects/expenses
 * Danh sách tất cả chi phí (cross-project) — HR/Admin/Manager
 * Employee chỉ thấy của mình
 */
async function listExpenses(req, res, next) {
  try {
    const { expenses, pagination } = await service.listExpenses(req.query, req.user);
    return paginatedResponse(
      res,
      expenses.map(mapper.toExpenseDto),
      pagination,
      'Lấy danh sách chi phí thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET  /api/projects/:id/expenses          — Chi phí trong 1 dự án
 * GET  /api/projects/:id/expenses/summary  — Tổng hợp theo category
 */
async function getProjectExpenses(req, res, next) {
  try {
    const { expenses, pagination } = await service.getProjectExpenses(
      req.params.id, req.query, req.user,
    );
    return paginatedResponse(
      res,
      expenses.map(mapper.toExpenseDto),
      pagination,
      'Lấy danh sách chi phí dự án thành công',
    );
  } catch (err) { next(err); }
}

async function getExpenseSummary(req, res, next) {
  try {
    const { rows, project } = await service.getExpenseSummary(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toExpenseSummaryDto(rows, project),
      'Lấy tổng hợp chi phí thành công',
    );
  } catch (err) { next(err); }
}

/**
 * GET  /api/projects/:id/expenses/:expenseId
 */
async function getExpenseById(req, res, next) {
  try {
    const expense = await service.getExpenseById(req.params.expenseId, req.user);
    return successResponse(res, mapper.toExpenseDto(expense), 'Lấy chi phí thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/expenses
 * Nhân viên gửi chi phí trong dự án mình tham gia
 */
async function createExpense(req, res, next) {
  try {
    const expense = await service.createExpense(req.params.id, req.body, req.user);
    return successResponse(
      res,
      mapper.toExpenseDto(expense),
      'Gửi chi phí thành công. Đang chờ duyệt.',
      201,
    );
  } catch (err) { next(err); }
}

/**
 * PATCH  /api/projects/:id/expenses/:expenseId
 * DELETE /api/projects/:id/expenses/:expenseId
 * Chỉ chỉnh sửa / xóa khi status = PENDING
 */
async function updateExpense(req, res, next) {
  try {
    const expense = await service.updateExpense(req.params.expenseId, req.body, req.user);
    return successResponse(res, mapper.toExpenseDto(expense), 'Cập nhật chi phí thành công');
  } catch (err) { next(err); }
}

async function deleteExpense(req, res, next) {
  try {
    await service.deleteExpense(req.params.expenseId, req.user);
    return noContentResponse(res, 'Xóa chi phí thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/projects/:id/expenses/:expenseId/approve
 * POST /api/projects/:id/expenses/:expenseId/reject
 * POST /api/projects/:id/expenses/:expenseId/reimburse
 */
async function approveExpense(req, res, next) {
  try {
    const expense = await service.approveExpense(req.params.expenseId, req.user);
    return successResponse(res, mapper.toExpenseDto(expense), 'Duyệt chi phí thành công');
  } catch (err) { next(err); }
}

async function rejectExpense(req, res, next) {
  try {
    const expense = await service.rejectExpense(
      req.params.expenseId,
      req.body.rejectReason,
      req.user,
    );
    return successResponse(res, mapper.toExpenseDto(expense), 'Từ chối chi phí thành công');
  } catch (err) { next(err); }
}

async function reimburseExpense(req, res, next) {
  try {
    const expense = await service.reimburseExpense(req.params.expenseId, req.user);
    return successResponse(res, mapper.toExpenseDto(expense), 'Đánh dấu hoàn tiền thành công');
  } catch (err) { next(err); }
}

module.exports = {
  // Project
  listProjects, getProjectById, createProject, updateProject,
  updateHealth, autoComputeHealth, getProjectHealth,
  closeProject, reopenProject,
  // Assignment
  getMyProjects, getProjectMembers, assignMember,
  updateAssignment, endAssignment,
  // Milestone
  getMilestones, getMilestoneById, createMilestone,
  updateMilestone, deleteMilestone,
  // Expense
  listExpenses, getProjectExpenses, getExpenseSummary,
  getExpenseById, createExpense, updateExpense, deleteExpense,
  approveExpense, rejectExpense, reimburseExpense,
};
