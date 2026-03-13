'use strict';

const { prisma } = require('../../config/db');

// ── Include fragments ─────────────────────────────────────────

const PROJECT_SUMMARY_INCLUDE = {
  projectManager: { select: { id: true, fullName: true, avatarUrl: true } },
  client:         { select: { id: true, companyName: true, shortName: true } },
  _count: {
    select: {
      assignments: { where: { status: 'ACTIVE' } },
      milestones:  true,
      expenses:    { where: { status: 'APPROVED' } },
    },
  },
};

const PROJECT_DETAIL_INCLUDE = {
  ...PROJECT_SUMMARY_INCLUDE,
  contract: { select: { id: true, contractCode: true, contractName: true } },
  assignments: {
    where: { status: 'ACTIVE' },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: { select: { name: true } } } },
    },
    orderBy: { joinedAt: 'asc' },
  },
  milestones: {
    include: {
      owner: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: { dueDate: 'asc' },
  },
};

const EXPENSE_INCLUDE = {
  project: { select: { id: true, projectCode: true, projectName: true } },
  submittedBy: { select: { id: true, fullName: true, avatarUrl: true } },
  approvedBy:  { select: { id: true, fullName: true } },
};

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function findMany({
  search, status, priority, healthStatus,
  clientId, managerId, myProjects, userId,
  fromDate, toDate,
  sortBy = 'createdAt', sortOrder = 'desc',
  page = 1, limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [
        { projectName: { contains: search } },
        { projectCode: { contains: search } },
        { description: { contains: search } },
      ],
    }),
    ...(status       && { status }),
    ...(priority     && { priority }),
    ...(healthStatus && { healthStatus }),
    ...(clientId     && { clientId }),
    ...(managerId    && { projectManagerUserId: managerId }),
    ...(myProjects   && userId && {
      OR: [
        { projectManagerUserId: userId },
        { assignments: { some: { userId, status: 'ACTIVE' } } },
      ],
    }),
    ...(fromDate && toDate
      ? { startDate: { gte: fromDate }, endDate: { lte: toDate } }
      : fromDate ? { startDate: { gte: fromDate } }
      : toDate   ? { endDate:   { lte: toDate } }
      : {}),
  };

  const orderBy = sortBy === 'projectName'
    ? { projectName: sortOrder }
    : { [sortBy]: sortOrder };

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where, include: PROJECT_SUMMARY_INCLUDE,
      orderBy, skip, take: limit,
    }),
  ]);
  return { projects, total };
}

async function findById(id) {
  return prisma.project.findUnique({
    where: { id },
    include: PROJECT_DETAIL_INCLUDE,
  });
}

async function findByCode(projectCode) {
  return prisma.project.findUnique({ where: { projectCode } });
}

async function create(data) {
  return prisma.project.create({ data, include: PROJECT_SUMMARY_INCLUDE });
}

async function update(id, data) {
  return prisma.project.update({ where: { id }, data, include: PROJECT_SUMMARY_INCLUDE });
}

/** Cập nhật spentAmount khi expense được approve/reject/reimburse */
async function recalcSpentAmount(projectId) {
  const agg = await prisma.projectExpense.aggregate({
    where: { projectId, status: { in: ['APPROVED', 'REIMBURSED'] } },
    _sum: { amount: true },
  });
  const total = Number(agg._sum.amount ?? 0);
  return prisma.project.update({
    where: { id: projectId },
    data:  { spentAmount: total },
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  USER PROJECT ASSIGNMENT                                 ║
// ╚══════════════════════════════════════════════════════════╝

const ASSIGNMENT_INCLUDE = {
  user: {
    select: {
      id: true, fullName: true, userCode: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
      jobTitle:   { select: { name: true } },
    },
  },
  project: { select: { id: true, projectCode: true, projectName: true } },
};

async function findAssignments(projectId, includeEnded = false) {
  return prisma.userProjectAssignment.findMany({
    where: {
      projectId,
      ...(!includeEnded && { status: 'ACTIVE' }),
    },
    include: ASSIGNMENT_INCLUDE,
    orderBy: { joinedAt: 'asc' },
  });
}

async function findAssignmentById(id) {
  return prisma.userProjectAssignment.findUnique({
    where: { id }, include: ASSIGNMENT_INCLUDE,
  });
}

/** Kiểm tra user đã active trong project chưa */
async function findActiveAssignment(userId, projectId) {
  return prisma.userProjectAssignment.findFirst({
    where: { userId, projectId, status: 'ACTIVE' },
  });
}

/** Tất cả dự án đang active của 1 user */
async function findUserActiveProjects(userId) {
  return prisma.userProjectAssignment.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      project: { select: { id: true, projectCode: true, projectName: true, status: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });
}

async function createAssignment(data) {
  return prisma.userProjectAssignment.create({ data, include: ASSIGNMENT_INCLUDE });
}

async function updateAssignment(id, data) {
  return prisma.userProjectAssignment.update({ where: { id }, data, include: ASSIGNMENT_INCLUDE });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT MILESTONE                                       ║
// ╚══════════════════════════════════════════════════════════╝

const MILESTONE_INCLUDE = {
  owner: { select: { id: true, fullName: true, avatarUrl: true } },
};

async function findMilestones(projectId, { status, overdueOnly, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const where = {
    projectId,
    ...(status && { status }),
    ...(overdueOnly && { dueDate: { lt: new Date() }, status: { not: 'DONE' } }),
  };
  const [total, milestones] = await prisma.$transaction([
    prisma.projectMilestone.count({ where }),
    prisma.projectMilestone.findMany({
      where, include: MILESTONE_INCLUDE,
      orderBy: { dueDate: 'asc' }, skip, take: limit,
    }),
  ]);
  return { milestones, total };
}

async function findMilestoneById(id) {
  return prisma.projectMilestone.findUnique({ where: { id }, include: MILESTONE_INCLUDE });
}

async function createMilestone(data) {
  return prisma.projectMilestone.create({ data, include: MILESTONE_INCLUDE });
}

async function updateMilestone(id, data) {
  return prisma.projectMilestone.update({ where: { id }, data, include: MILESTONE_INCLUDE });
}

async function deleteMilestone(id) {
  return prisma.projectMilestone.delete({ where: { id } });
}

/**
 * Đánh dấu OVERDUE cho milestones quá hạn chưa xong.
 * Gọi bởi cron job hoặc khi load project.
 */
async function markOverdueMilestones() {
  return prisma.projectMilestone.updateMany({
    where: {
      dueDate: { lt: new Date() },
      status:  { in: ['PENDING', 'IN_PROGRESS'] },
    },
    data: { status: 'OVERDUE' },
  });
}

/** Thống kê milestone của project — dùng để tính health */
async function getMilestoneStats(projectId) {
  const stats = await prisma.projectMilestone.groupBy({
    by: ['status'],
    where: { projectId },
    _count: { id: true },
  });
  return stats.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PROJECT EXPENSE                                         ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyExpenses({
  projectId, category, status, submittedBy,
  fromDate, toDate, sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(projectId   && { projectId }),
    ...(category    && { category }),
    ...(status      && { status }),
    ...(submittedBy && { submittedByUserId: submittedBy }),
    ...(fromDate && toDate
      ? { expenseDate: { gte: fromDate, lte: toDate } }
      : fromDate ? { expenseDate: { gte: fromDate } }
      : toDate   ? { expenseDate: { lte: toDate } }
      : {}),
  };
  const [total, expenses] = await prisma.$transaction([
    prisma.projectExpense.count({ where }),
    prisma.projectExpense.findMany({
      where, include: EXPENSE_INCLUDE,
      orderBy: { expenseDate: sortOrder }, skip, take: limit,
    }),
  ]);
  return { expenses, total };
}

async function findExpenseById(id) {
  return prisma.projectExpense.findUnique({ where: { id }, include: EXPENSE_INCLUDE });
}

async function createExpense(data) {
  return prisma.projectExpense.create({ data, include: EXPENSE_INCLUDE });
}

async function updateExpense(id, data) {
  return prisma.projectExpense.update({ where: { id }, data, include: EXPENSE_INCLUDE });
}

async function deleteExpense(id) {
  return prisma.projectExpense.delete({ where: { id } });
}

/** Tổng chi phí theo category của 1 project */
async function getExpenseSummary(projectId) {
  const rows = await prisma.projectExpense.groupBy({
    by: ['category', 'status'],
    where: { projectId },
    _sum: { amount: true },
    _count: { id: true },
  });
  return rows;
}

module.exports = {
  // Project
  findMany, findById, findByCode, create, update, recalcSpentAmount,
  // Assignment
  findAssignments, findAssignmentById, findActiveAssignment,
  findUserActiveProjects, createAssignment, updateAssignment,
  // Milestone
  findMilestones, findMilestoneById, createMilestone,
  updateMilestone, deleteMilestone,
  markOverdueMilestones, getMilestoneStats,
  // Expense
  findManyExpenses, findExpenseById, createExpense,
  updateExpense, deleteExpense, getExpenseSummary,
};
