'use strict';

const repo = require('./projects.repository');
const { AppError } = require('../../common/errors/AppError');
const { ROLES }    = require('../../config/constants');

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT CRUD                                            ║
// ╚══════════════════════════════════════════════════════════╝

async function listProjects(filters, requestingUser) {
  // MANAGER / SALES tự động lọc về projects liên quan đến họ
  // trừ khi HR/Admin xem toàn bộ
  const query = { ...filters };
  if (!_isHrOrAdmin(requestingUser) && !_hasRole(requestingUser, ROLES.MANAGER)) {
    query.myProjects = true;
    query.userId     = requestingUser.id;
  } else if (query.myProjects) {
    query.userId = requestingUser.id;
  }

  const { projects, total } = await repo.findMany(query);
  return { projects, pagination: _page(filters, total) };
}

async function getProjectById(id, requestingUser) {
  const project = await _assertProjectExists(id);

  // Đánh dấu milestones OVERDUE trước khi trả về
  await repo.markOverdueMilestones();

  // Nhân viên thường chỉ xem project mình tham gia
  if (!_isHrOrAdmin(requestingUser) && !_hasRole(requestingUser, ROLES.MANAGER)) {
    const assignment = await repo.findActiveAssignment(requestingUser.id, id);
    if (!assignment && project.projectManagerUserId !== requestingUser.id) {
      throw AppError.forbidden('Bạn không có quyền xem dự án này.');
    }
  }

  return repo.findById(id);
}

async function createProject(dto, requestingUser) {
  // Kiểm tra projectCode trùng
  if (dto.projectCode) {
    const dup = await repo.findByCode(dto.projectCode);
    if (dup) throw AppError.conflict(`Mã dự án '${dto.projectCode}' đã tồn tại.`);
  }

  return repo.create({
    projectCode:          dto.projectCode ?? null,
    projectName:          dto.projectName,
    description:          dto.description ?? null,
    projectManagerUserId: dto.projectManagerUserId ?? null,
    clientId:             dto.clientId             ?? null,
    contractId:           dto.contractId           ?? null,
    status:               dto.status   ?? 'PLANNING',
    priority:             dto.priority ?? null,
    startDate:            dto.startDate ? _date(dto.startDate) : null,
    endDate:              dto.endDate   ? _date(dto.endDate)   : null,
    budgetAmount:         dto.budgetAmount  ?? null,
    contractValue:        dto.contractValue ?? null,
    currency:             dto.currency ?? 'VND',
    spentAmount:          0,
    invoicedAmount:       0,
    receivedAmount:       0,
    progressPercent:      0,
  });
}

async function updateProject(id, dto, requestingUser) {
  const project = await _assertProjectExists(id);
  _assertCanManageProject(project, requestingUser);

  if (['COMPLETED','CANCELLED','ARCHIVED'].includes(project.status)) {
    throw AppError.badRequest('Không thể chỉnh sửa dự án đã đóng. Dùng endpoint /reopen nếu cần.');
  }

  // Kiểm tra projectCode mới trùng
  if (dto.projectCode && dto.projectCode !== project.projectCode) {
    const dup = await repo.findByCode(dto.projectCode);
    if (dup) throw AppError.conflict(`Mã dự án '${dto.projectCode}' đã tồn tại.`);
  }

  const data = _clean({
    projectCode:          dto.projectCode,
    projectName:          dto.projectName,
    description:          dto.description,
    projectManagerUserId: dto.projectManagerUserId,
    clientId:             dto.clientId,
    contractId:           dto.contractId,
    status:               dto.status,
    priority:             dto.priority,
    startDate:  dto.startDate ? _date(dto.startDate) : undefined,
    endDate:    dto.endDate   ? _date(dto.endDate)   : undefined,
    budgetAmount:  dto.budgetAmount,
    contractValue: dto.contractValue,
    currency:      dto.currency,
  });

  return repo.update(id, data);
}

/**
 * Cập nhật health status + tiến độ
 * PM hoặc HR/Admin mới được cập nhật
 */
async function updateHealth(id, dto, requestingUser) {
  const project = await _assertProjectExists(id);
  _assertCanManageProject(project, requestingUser);

  return repo.update(id, _clean({
    healthStatus:    dto.healthStatus,
    progressPercent: dto.progressPercent,
    notes:           dto.notes,
  }));
}

/**
 * Tự động tính và cập nhật health dựa trên:
 * - % ngân sách đã dùng
 * - % milestone overdue
 * - Ngày deadline còn lại
 */
async function autoComputeHealth(id) {
  const project = await _assertProjectExists(id);
  const milestoneStats = await repo.getMilestoneStats(id);

  const now           = new Date();
  const budgetPercent = project.budgetAmount
    ? Number(project.spentAmount) / Number(project.budgetAmount)
    : 0;
  const totalMs  = Object.values(milestoneStats).reduce((s, n) => s + n, 0);
  const overdueMs = milestoneStats.OVERDUE ?? 0;
  const overdueRate = totalMs > 0 ? overdueMs / totalMs : 0;

  const deadlineDays = project.endDate
    ? Math.ceil((new Date(project.endDate) - now) / 86_400_000)
    : null;

  // Quy tắc tính health
  let health = 'ON_TRACK';
  if (budgetPercent > 1.0 || overdueRate > 0.3 || (deadlineDays !== null && deadlineDays < 0)) {
    health = 'DELAYED';
  } else if (budgetPercent > 0.85 || overdueRate > 0.1 || (deadlineDays !== null && deadlineDays < 7)) {
    health = 'AT_RISK';
  }

  await repo.update(id, { healthStatus: health });
  return { healthStatus: health, budgetPercent, overdueRate, deadlineDays };
}

/**
 * Đóng / Hoàn thành / Hủy dự án
 */
async function closeProject(id, dto, requestingUser) {
  const project = await _assertProjectExists(id);
  _assertCanManageProject(project, requestingUser);

  if (['COMPLETED','CANCELLED','ARCHIVED'].includes(project.status)) {
    throw AppError.badRequest(`Dự án đã ở trạng thái '${project.status}'.`);
  }

  // Kết thúc tất cả assignments còn ACTIVE
  await _endAllActiveAssignments(id, dto.actualEndDate ?? new Date());

  return repo.update(id, {
    status:       dto.status,
    actualEndDate: dto.actualEndDate ? _date(dto.actualEndDate) : _date(new Date()),
    closureNote:   dto.closureNote ?? null,
    closedAt:      new Date(),
    progressPercent: dto.status === 'COMPLETED' ? 100 : undefined,
  });
}

/**
 * Mở lại dự án đã đóng → ACTIVE
 */
async function reopenProject(id, requestingUser) {
  const project = await _assertProjectExists(id);
  _assertHrOrAdmin(requestingUser);

  if (!['COMPLETED','CANCELLED','ARCHIVED'].includes(project.status)) {
    throw AppError.badRequest('Chỉ có thể mở lại dự án đã đóng.');
  }

  return repo.update(id, {
    status:       'ACTIVE',
    closedAt:     null,
    actualEndDate: null,
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ASSIGNMENT                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function getProjectMembers(projectId, includeEnded, requestingUser) {
  await _assertProjectExists(projectId);
  return repo.findAssignments(projectId, includeEnded);
}

async function assignMember(projectId, dto, requestingUser) {
  const project = await _assertProjectExists(projectId);
  _assertCanManageProject(project, requestingUser);

  // Kiểm tra user đã active trong project chưa
  const existing = await repo.findActiveAssignment(dto.userId, projectId);
  if (existing) {
    throw AppError.conflict('Nhân viên đã là thành viên active của dự án này.');
  }

  return repo.createAssignment({
    userId:    dto.userId,
    projectId,
    roleInProject:     dto.roleInProject     ?? null,
    allocationPercent: dto.allocationPercent ?? null,
    hourlyRate:        dto.hourlyRate        ?? null,
    joinedAt:          _date(dto.joinedAt),
    leftAt:            null,
    status:            'ACTIVE',
    isBillable:        dto.isBillable ?? false,
    notes:             dto.notes      ?? null,
  });
}

async function updateAssignment(projectId, assignmentId, dto, requestingUser) {
  const project    = await _assertProjectExists(projectId);
  const assignment = await _assertAssignmentExists(assignmentId, projectId);
  _assertCanManageProject(project, requestingUser);

  return repo.updateAssignment(assignmentId, _clean({
    roleInProject:     dto.roleInProject,
    allocationPercent: dto.allocationPercent,
    hourlyRate:        dto.hourlyRate,
    isBillable:        dto.isBillable,
    notes:             dto.notes,
  }));
}

async function endAssignment(projectId, assignmentId, dto, requestingUser) {
  const project    = await _assertProjectExists(projectId);
  const assignment = await _assertAssignmentExists(assignmentId, projectId);
  _assertCanManageProject(project, requestingUser);

  if (assignment.status === 'ENDED') {
    throw AppError.badRequest('Assignment này đã kết thúc rồi.');
  }

  return repo.updateAssignment(assignmentId, {
    status: 'ENDED',
    leftAt: _date(dto.leftAt),
    notes:  dto.notes ?? assignment.notes,
  });
}

async function getMyProjects(userId) {
  return repo.findUserActiveProjects(userId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  MILESTONE                                               ║
// ╚══════════════════════════════════════════════════════════╝

async function getMilestones(projectId, filters, requestingUser) {
  await _assertProjectMember(projectId, requestingUser);
  // Sync OVERDUE status trước khi trả về
  await repo.markOverdueMilestones();
  const { milestones, total } = await repo.findMilestones(projectId, filters);
  return { milestones, pagination: _page(filters, total) };
}

async function getMilestoneById(projectId, milestoneId, requestingUser) {
  await _assertProjectMember(projectId, requestingUser);
  const m = await repo.findMilestoneById(milestoneId);
  if (!m || m.projectId !== projectId) {
    throw AppError.notFound('Không tìm thấy milestone trong dự án này.');
  }
  return m;
}

async function createMilestone(projectId, dto, requestingUser) {
  const project = await _assertProjectExists(projectId);
  _assertCanManageProject(project, requestingUser);

  return repo.createMilestone({
    projectId,
    name:        dto.name,
    description: dto.description ?? null,
    ownerUserId: dto.ownerUserId ?? null,
    dueDate:     dto.dueDate ? _date(dto.dueDate) : null,
    status:      dto.status  ?? 'PENDING',
    invoiceId:   dto.invoiceId ?? null,
  });
}

async function updateMilestone(projectId, milestoneId, dto, requestingUser) {
  const project = await _assertProjectExists(projectId);
  _assertCanManageProject(project, requestingUser);

  const m = await repo.findMilestoneById(milestoneId);
  if (!m || m.projectId !== projectId) {
    throw AppError.notFound('Không tìm thấy milestone trong dự án này.');
  }

  const data = _clean({
    name:        dto.name,
    description: dto.description,
    ownerUserId: dto.ownerUserId,
    dueDate:     dto.dueDate ? _date(dto.dueDate) : undefined,
    status:      dto.status,
    invoiceId:   dto.invoiceId,
  });

  // Tự động set completedAt khi mark DONE
  if (dto.status === 'DONE' && !m.completedAt) {
    data.completedAt = new Date();
  }
  // Clear completedAt nếu reopen
  if (dto.status && dto.status !== 'DONE') {
    data.completedAt = null;
  }

  return repo.updateMilestone(milestoneId, data);
}

async function deleteMilestone(projectId, milestoneId, requestingUser) {
  const project = await _assertProjectExists(projectId);
  _assertCanManageProject(project, requestingUser);

  const m = await repo.findMilestoneById(milestoneId);
  if (!m || m.projectId !== projectId) {
    throw AppError.notFound('Không tìm thấy milestone trong dự án này.');
  }
  if (m.status === 'DONE') {
    throw AppError.badRequest('Không thể xóa milestone đã hoàn thành.');
  }

  return repo.deleteMilestone(milestoneId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  EXPENSE                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listExpenses(filters, requestingUser) {
  // Nhân viên thường chỉ xem expense của mình
  if (!_isHrOrAdmin(requestingUser) && !_hasRole(requestingUser, ROLES.MANAGER)) {
    filters.submittedBy = requestingUser.id;
  }
  const { expenses, total } = await repo.findManyExpenses(filters);
  return { expenses, pagination: _page(filters, total) };
}

async function getProjectExpenses(projectId, filters, requestingUser) {
  await _assertProjectMember(projectId, requestingUser);
  const { expenses, total } = await repo.findManyExpenses({ ...filters, projectId });
  return { expenses, pagination: _page(filters, total) };
}

async function getExpenseById(expenseId, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  if (!_isHrOrAdmin(requestingUser) &&
      !_hasRole(requestingUser, ROLES.MANAGER) &&
      expense.submittedByUserId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền xem chi phí này.');
  }
  return expense;
}

async function createExpense(projectId, dto, requestingUser) {
  // Kiểm tra user là thành viên hoặc HR/Admin
  await _assertProjectMember(projectId, requestingUser);

  return repo.createExpense({
    projectId,
    submittedByUserId: requestingUser.id,
    approvedByUserId:  null,
    category:    dto.category,
    title:       dto.title,
    description: dto.description ?? null,
    amount:      dto.amount,
    currency:    dto.currency ?? 'VND',
    expenseDate: _date(dto.expenseDate),
    receiptUrl:  dto.receiptUrl ?? null,
    status:      'PENDING',
    submittedAt: new Date(),
  });
}

async function updateExpense(expenseId, dto, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  // Chỉ người tạo hoặc HR/Admin mới sửa được
  if (!_isHrOrAdmin(requestingUser) && expense.submittedByUserId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền chỉnh sửa chi phí này.');
  }
  if (expense.status !== 'PENDING') {
    throw AppError.badRequest(`Chỉ có thể chỉnh sửa chi phí ở trạng thái PENDING.`);
  }

  return repo.updateExpense(expenseId, _clean({
    category:    dto.category,
    title:       dto.title,
    description: dto.description,
    amount:      dto.amount,
    currency:    dto.currency,
    expenseDate: dto.expenseDate ? _date(dto.expenseDate) : undefined,
    receiptUrl:  dto.receiptUrl,
  }));
}

async function deleteExpense(expenseId, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  if (!_isHrOrAdmin(requestingUser) && expense.submittedByUserId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền xóa chi phí này.');
  }
  if (expense.status !== 'PENDING') {
    throw AppError.badRequest('Chỉ có thể xóa chi phí đang PENDING.');
  }

  return repo.deleteExpense(expenseId);
}

/**
 * Duyệt chi phí → APPROVED, cộng vào project.spentAmount
 */
async function approveExpense(expenseId, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  _assertCanManageExpense(requestingUser);

  if (expense.status !== 'PENDING') {
    throw AppError.badRequest(`Chi phí đã ở trạng thái '${expense.status}'.`);
  }

  // Không tự duyệt đơn của mình
  if (expense.submittedByUserId === requestingUser.id && !_isHrOrAdmin(requestingUser)) {
    throw AppError.forbidden('Bạn không thể tự duyệt chi phí của chính mình.');
  }

  const updated = await repo.updateExpense(expenseId, {
    status:          'APPROVED',
    approvedByUserId: requestingUser.id,
    approvedAt:       new Date(),
    rejectReason:     null,
  });

  // Cập nhật spentAmount của project
  await repo.recalcSpentAmount(expense.projectId);

  return updated;
}

/**
 * Từ chối chi phí → REJECTED
 */
async function rejectExpense(expenseId, rejectReason, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  _assertCanManageExpense(requestingUser);

  if (expense.status !== 'PENDING') {
    throw AppError.badRequest(`Chi phí đã ở trạng thái '${expense.status}'.`);
  }

  return repo.updateExpense(expenseId, {
    status:          'REJECTED',
    approvedByUserId: requestingUser.id,
    approvedAt:       new Date(),
    rejectReason,
  });
}

/**
 * Đánh dấu đã hoàn tiền → REIMBURSED
 */
async function reimburseExpense(expenseId, requestingUser) {
  const expense = await repo.findExpenseById(expenseId);
  if (!expense) throw AppError.notFound('Không tìm thấy chi phí.');

  _assertCanManageExpense(requestingUser);

  if (expense.status !== 'APPROVED') {
    throw AppError.badRequest('Chỉ có thể hoàn tiền cho chi phí đã duyệt.');
  }

  return repo.updateExpense(expenseId, { status: 'REIMBURSED' });
}

// ── Expense summary per project ───────────────────────────────

async function getExpenseSummary(projectId, requestingUser) {
  const project = await _assertProjectExists(projectId);
  await _assertProjectMember(projectId, requestingUser);
  const rows = await repo.getExpenseSummary(projectId);
  return { rows, project };
}

// ── Project health snapshot ───────────────────────────────────

async function getProjectHealth(projectId, requestingUser) {
  const project = await _assertProjectExists(projectId);
  await _assertProjectMember(projectId, requestingUser);

  await repo.markOverdueMilestones();
  const milestoneStats = await repo.getMilestoneStats(projectId);
  return { project, milestoneStats };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE HELPERS                                         ║
// ╚══════════════════════════════════════════════════════════╝

function _assertCanManageProject(project, user) {
  if (_isHrOrAdmin(user)) return;
  if (_hasRole(user, ROLES.MANAGER)) return;
  if (project.projectManagerUserId === user.id) return;
  throw AppError.forbidden('Bạn không có quyền quản lý dự án này.');
}

function _assertCanManageExpense(user) {
  if (_isHrOrAdmin(user) || _hasRole(user, ROLES.MANAGER)) return;
  throw AppError.forbidden('Chỉ Manager hoặc HR/Admin mới có thể duyệt chi phí.');
}

function _assertHrOrAdmin(user) {
  if (!_isHrOrAdmin(user)) throw AppError.forbidden('Chỉ HR/Admin mới có quyền thực hiện thao tác này.');
}

async function _assertProjectExists(id) {
  const p = await repo.findById(id);
  if (!p) throw AppError.notFound('Không tìm thấy dự án.');
  return p;
}

async function _assertAssignmentExists(assignmentId, projectId) {
  const a = await repo.findAssignmentById(assignmentId);
  if (!a || a.projectId !== projectId) {
    throw AppError.notFound('Không tìm thấy thành viên trong dự án này.');
  }
  return a;
}

/**
 * Kiểm tra user có quyền truy cập project không:
 * HR/Admin luôn được; thành viên active hoặc PM cũng được.
 */
async function _assertProjectMember(projectId, user) {
  if (_isHrOrAdmin(user) || _hasRole(user, ROLES.MANAGER)) return;

  const project    = await repo.findById(projectId);
  if (!project) throw AppError.notFound('Không tìm thấy dự án.');
  if (project.projectManagerUserId === user.id) return;

  const assignment = await repo.findActiveAssignment(user.id, projectId);
  if (!assignment) {
    throw AppError.forbidden('Bạn không phải thành viên của dự án này.');
  }
}

async function _endAllActiveAssignments(projectId, leftAt) {
  const { prisma } = require('../../config/db');
  return prisma.userProjectAssignment.updateMany({
    where: { projectId, status: 'ACTIVE' },
    data:  { status: 'ENDED', leftAt: _date(leftAt) },
  });
}

function _isHrOrAdmin(user) {
  return user.roles.some(r => [ROLES.ADMIN, ROLES.HR].includes(r));
}

function _hasRole(user, role) {
  return user.roles.includes(role);
}

function _date(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function _page(filters, total) {
  return { page: filters.page ?? 1, limit: filters.limit ?? 20, total };
}

function _clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

module.exports = {
  // Project
  listProjects, getProjectById, createProject, updateProject,
  updateHealth, autoComputeHealth, closeProject, reopenProject,
  // Assignment
  getProjectMembers, assignMember, updateAssignment, endAssignment, getMyProjects,
  // Milestone
  getMilestones, getMilestoneById, createMilestone, updateMilestone, deleteMilestone,
  // Expense
  listExpenses, getProjectExpenses, getExpenseById,
  createExpense, updateExpense, deleteExpense,
  approveExpense, rejectExpense, reimburseExpense, getExpenseSummary,
  // Health
  getProjectHealth,
};
