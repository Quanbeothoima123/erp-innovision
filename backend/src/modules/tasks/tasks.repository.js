// src/modules/tasks/tasks.repository.js
const { prisma } = require("../../config/db");

// ── Select helpers ───────────────────────────────────────────

const USER_BRIEF = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
  userCode: true,
};

const PROJECT_BRIEF = {
  id: true,
  projectName: true,
  projectCode: true,
  status: true,
};

const TASK_BASE_INCLUDE = {
  assignedTo: { select: USER_BRIEF },
  createdBy: { select: USER_BRIEF },
  project: { select: PROJECT_BRIEF },
  _count: { select: { comments: true } },
};

const TASK_DETAIL_INCLUDE = {
  ...TASK_BASE_INCLUDE,
  comments: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: USER_BRIEF } },
  },
};

// ── Task CRUD ────────────────────────────────────────────────

const createTask = (data) =>
  prisma.task.create({ data, include: TASK_BASE_INCLUDE });

const findTaskById = (id, includeDetail = false) =>
  prisma.task.findFirst({
    where: { id, isActive: true },
    include: includeDetail ? TASK_DETAIL_INCLUDE : TASK_BASE_INCLUDE,
  });

const findTasks = async ({ where, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [data, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: TASK_BASE_INCLUDE,
      // Sắp xếp: quá hạn lên đầu, rồi theo priority, rồi ngày tạo
      orderBy: [
        { deadline: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);
  return { data, total };
};

const updateTask = (id, data) =>
  prisma.task.update({ where: { id }, data, include: TASK_BASE_INCLUDE });

/** Soft delete */
const softDeleteTask = (id) =>
  prisma.task.update({ where: { id }, data: { isActive: false } });

// ── Stats ────────────────────────────────────────────────────

const countByStatus = async (where = {}) => {
  const rows = await prisma.task.groupBy({
    by: ["status"],
    where: { ...where, isActive: true },
    _count: { _all: true },
  });
  const map = {};
  rows.forEach((r) => {
    map[r.status] = r._count._all;
  });
  // Đảm bảo tất cả status đều có giá trị (kể cả 0)
  for (const s of ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]) {
    map[s] = map[s] ?? 0;
  }
  return map;
};

const countOverdue = (where = {}) =>
  prisma.task.count({
    where: {
      ...where,
      isActive: true,
      status: { notIn: ["DONE", "CANCELLED"] },
      deadline: { lt: new Date() },
    },
  });

// ── Comments ─────────────────────────────────────────────────

const createComment = (data) =>
  prisma.taskComment.create({
    data,
    include: { user: { select: USER_BRIEF } },
  });

const findCommentById = (id) =>
  prisma.taskComment.findUnique({
    where: { id },
    include: { user: { select: USER_BRIEF } },
  });

const findCommentsByTask = (taskId) =>
  prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: USER_BRIEF } },
  });

const updateComment = (id, data) =>
  prisma.taskComment.update({
    where: { id },
    data,
    include: { user: { select: USER_BRIEF } },
  });

const deleteComment = (id) => prisma.taskComment.delete({ where: { id } });

// ── Permission helpers ───────────────────────────────────────

/**
 * Kiểm tra user này có phải là quản lý trực tiếp của ai đó không.
 * (tức là có ít nhất 1 user có managerId = userId này)
 */
const isDirectManager = async (userId) => {
  const count = await prisma.user.count({
    where: { managerId: userId, accountStatus: "ACTIVE" },
  });
  return count > 0;
};

/**
 * Lấy danh sách id nhân viên trực tiếp dưới quyền
 */
const findSubordinateIds = async (managerId) => {
  const rows = await prisma.user.findMany({
    where: { managerId, accountStatus: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((u) => u.id);
};

const getDashboardMyTasks = (userId, limit = 5) =>
  prisma.task.findMany({
    where: {
      assignedToUserId: userId,
      isActive: true,
      status: { notIn: ["DONE", "CANCELLED"] },
      deadline: { not: null },
    },
    orderBy: { deadline: "asc" },
    take: limit,
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          projectCode: true,
          status: true,
        },
      },
    },
  });

const getDashboardTeamOverdue = async (managerId, limit = 5) => {
  const subIds = await findSubordinateIds(managerId);
  if (subIds.length === 0) return [];
  return prisma.task.findMany({
    where: {
      assignedToUserId: { in: subIds },
      isActive: true,
      status: { notIn: ["DONE", "CANCELLED"] },
      deadline: { lt: new Date() },
    },
    orderBy: { deadline: "asc" },
    take: limit,
    include: {
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });
};

module.exports = {
  createTask,
  findTaskById,
  findTasks,
  updateTask,
  softDeleteTask,
  countByStatus,
  countOverdue,
  createComment,
  findCommentById,
  findCommentsByTask,
  updateComment,
  deleteComment,
  isDirectManager,
  getDashboardMyTasks,
  getDashboardTeamOverdue,
  findSubordinateIds,
};
