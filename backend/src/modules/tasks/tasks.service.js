// src/modules/tasks/tasks.service.js
const repo = require("./tasks.repository");
const mapper = require("./tasks.mapper");
const { AppError } = require("../../common/errors/AppError");
const { ROLES } = require("../../config/constants");
const { prisma } = require("../../config/db");
const { notify } = require("../notifications/notifications.service");

// ─────────────────────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Kiểm tra user có quyền tạo / quản lý task hay không.
 *
 * Quy tắc:
 *  1. Có role ADMIN → có quyền
 *  2. Có role MANAGER → có quyền
 *  3. Là quản lý trực tiếp của ít nhất 1 nhân viên (managerId trong bảng users
 *     trỏ đến họ) → có quyền, kể cả khi không có role MANAGER
 *
 * Hàm này trả về Promise<boolean> vì cần query DB cho trường hợp số 3.
 */
const _canManageTask = async (currentUser) => {
  const roles = currentUser.roles ?? [];
  if (roles.includes(ROLES.ADMIN) || roles.includes(ROLES.MANAGER)) return true;
  // Fallback: check xem user này có đang quản lý ai không
  return repo.isDirectManager(currentUser.id);
};

/**
 * Kiểm tra user có quyền xem task này không.
 * - ADMIN: xem tất cả
 * - Manager / direct manager: xem task của nhóm + task do mình tạo
 * - EMPLOYEE: chỉ xem task được gán cho mình
 */
const _canViewTask = async (task, currentUser) => {
  const roles = currentUser.roles ?? [];
  if (roles.includes(ROLES.ADMIN)) return true;
  if (task.createdByUserId === currentUser.id) return true;
  if (task.assignedToUserId === currentUser.id) return true;

  // Manager role hoặc direct manager → xem task của subordinates
  const canManage = await _canManageTask(currentUser);
  if (canManage && task.assignedToUserId) {
    const subIds = await repo.findSubordinateIds(currentUser.id);
    if (subIds.includes(task.assignedToUserId)) return true;
  }
  return false;
};

/**
 * Khi tạo / gán task: MANAGER và direct manager chỉ được gán
 * cho subordinates của mình. ADMIN không bị giới hạn.
 */
const _validateAssignee = async (assignedToUserId, currentUser) => {
  const roles = currentUser.roles ?? [];
  // Admin không bị giới hạn
  if (roles.includes(ROLES.ADMIN)) return;

  // Kiểm tra assignee tồn tại & active
  const assignee = await prisma.user.findFirst({
    where: { id: assignedToUserId, accountStatus: "ACTIVE" },
  });
  if (!assignee) {
    throw new AppError(
      "Nhân viên được gán không tồn tại hoặc không active",
      404,
      "NOT_FOUND",
    );
  }

  // Manager / direct manager chỉ được gán cho người thuộc nhóm mình
  const subIds = await repo.findSubordinateIds(currentUser.id);
  if (!subIds.includes(assignedToUserId)) {
    throw new AppError(
      "Bạn chỉ có thể gán task cho nhân viên trong nhóm của mình",
      403,
      "AUTH_FORBIDDEN",
    );
  }
};

/**
 * Tạo nội dung thông báo task chi tiết cho Telegram
 */
const _buildTaskMessage = (task, type = "new") => {
  const priorityLabels = {
    LOW: "🟢 Thấp",
    MEDIUM: "🟡 Trung bình",
    HIGH: "🔴 Cao",
    URGENT: "🚨 Khẩn cấp",
  };

  const lines = [
    type === "new"
      ? `Bạn được giao task mới: "${task.title}"`
      : `Task đã được gán lại cho bạn: "${task.title}"`,
  ];

  if (task.priority) {
    lines.push(`Độ ưu tiên: ${priorityLabels[task.priority] ?? task.priority}`);
  }

  if (task.deadline) {
    const d = new Date(task.deadline);
    const deadlineStr = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    lines.push(`Deadline: ${deadlineStr}`);
  }

  if (task.project?.projectName) {
    lines.push(`Dự án: ${task.project.projectName}`);
  }

  if (task.description) {
    const shortDesc =
      task.description.length > 80
        ? task.description.substring(0, 80) + "..."
        : task.description;
    lines.push(`Mô tả: ${shortDesc}`);
  }

  return lines.join("\n");
};

/**
 * Gửi notification cho assignee (không block nếu thất bại)
 */
const _notifyAssignee = async (task, currentUser, message) => {
  try {
    if (!task.assignedToUserId || task.assignedToUserId === currentUser.id)
      return;
    await notify({
      recipientIds: task.assignedToUserId,
      senderUserId: currentUser.id,
      type: "TASK_ASSIGNED",
      title: "Task mới được giao",
      message,
      relatedEntityType: "Task",
      relatedEntityId: task.id,
      actionUrl: `/tasks/${task.id}`,
    });
  } catch (_) {
    /* notification không block nghiệp vụ chính */
  }
};

/**
 * Build Prisma where clause khi list tasks, tuỳ theo quyền của user
 */
const _buildListWhere = async (query, currentUser) => {
  const roles = currentUser.roles ?? [];
  const isAdmin = roles.includes(ROLES.ADMIN);
  const canManage = !isAdmin ? await _canManageTask(currentUser) : true;
  const now = new Date();

  const where = { isActive: true };

  // ── Giới hạn phạm vi theo quyền ──────────────────────────
  if (!isAdmin) {
    if (canManage) {
      const subIds = await repo.findSubordinateIds(currentUser.id);
      where.OR = [
        { createdByUserId: currentUser.id },
        { assignedToUserId: currentUser.id },
        { assignedToUserId: { in: subIds } },
      ];
    } else {
      where.assignedToUserId = currentUser.id;
    }
  }

  // ── Filters từ query params ───────────────────────────────
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.projectId) where.projectId = query.projectId;
  if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;

  if (query.search) {
    const searchClause = [
      { title: { contains: query.search } },
      { description: { contains: query.search } },
      { sourceMessage: { contains: query.search } },
    ];
    where.AND = [...(where.AND ?? []), { OR: searchClause }];
    if (where.OR) {
      where.AND.push({ OR: where.OR });
      delete where.OR;
    }
  }

  // ── Lọc theo deadlineFilter ───────────────────────────────
  if (query.deadlineFilter) {
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const deadlineMap = {
      overdue: {
        deadline: { lt: now },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      today: { deadline: { gte: now, lte: endOfToday } },
      this_week: { deadline: { gte: now, lte: endOfWeek } },
      upcoming: {
        deadline: { gte: now },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
    };
    Object.assign(where, deadlineMap[query.deadlineFilter]);
  }

  // ── Lọc theo khoảng thời gian (Calendar view) ────────────
  if (query.deadlineFrom || query.deadlineTo) {
    where.deadline = {
      ...(query.deadlineFrom ? { gte: new Date(query.deadlineFrom) } : {}),
      ...(query.deadlineTo ? { lte: new Date(query.deadlineTo) } : {}),
    };
  }

  return where;
};

// ─────────────────────────────────────────────────────────────
// TASK CRUD
// ─────────────────────────────────────────────────────────────

const createTask = async (body, currentUser) => {
  // Chỉ ADMIN, MANAGER role, hoặc direct manager mới được tạo task
  const canManage = await _canManageTask(currentUser);
  if (!canManage) {
    throw new AppError("Bạn không có quyền tạo task", 403, "AUTH_FORBIDDEN");
  }

  const {
    title,
    description,
    deadline,
    priority = "MEDIUM",
    sourceMessage,
    projectId,
    assignedToUserId,
    estimatedHours,
  } = body;

  // Validate project nếu có
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId },
    });
    if (!project) throw new AppError("Dự án không tồn tại", 404, "NOT_FOUND");
  }

  // Validate assignee nếu có
  if (assignedToUserId) {
    await _validateAssignee(assignedToUserId, currentUser);
  }

  const task = await repo.createTask({
    title,
    description: description ?? null,
    deadline: deadline ? new Date(deadline) : null,
    priority,
    sourceMessage: sourceMessage ?? null,
    projectId: projectId ?? null,
    assignedToUserId: assignedToUserId ?? null,
    createdByUserId: currentUser.id,
    estimatedHours: estimatedHours ?? null,
  });

  await _notifyAssignee(task, currentUser, _buildTaskMessage(task, "new"));

  return task;
};

const listTasks = async (query, currentUser) => {
  const where = await _buildListWhere(query, currentUser);
  return repo.findTasks({ where, page: query.page, limit: query.limit });
};

const getMyTasks = async (query, currentUser) => {
  const baseWhere = await _buildListWhere(query, currentUser);
  // Ghi đè: chỉ lấy task của mình, bất kể role
  const where = { ...baseWhere, assignedToUserId: currentUser.id };
  // Xóa OR/AND scope nếu đã set bên trên (vì giờ đã filter cứng)
  delete where.OR;
  delete where.AND;
  // Giữ lại các filter khác
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  return repo.findTasks({ where, page: query.page, limit: query.limit });
};

const getTaskById = async (id, currentUser) => {
  const task = await repo.findTaskById(id, true);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canView = await _canViewTask(task, currentUser);
  if (!canView)
    throw new AppError(
      "Bạn không có quyền xem task này",
      403,
      "AUTH_FORBIDDEN",
    );

  return task;
};

const updateTask = async (id, body, currentUser) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canManage = await _canManageTask(currentUser);
  if (!canManage) {
    throw new AppError(
      "Bạn không có quyền cập nhật task",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  // Non-admin manager chỉ sửa được task do mình tạo hoặc task của nhóm mình
  const roles = currentUser.roles ?? [];
  if (!roles.includes(ROLES.ADMIN)) {
    const subIds = await repo.findSubordinateIds(currentUser.id);
    const isMyTask = task.createdByUserId === currentUser.id;
    const isMyTeamTask =
      task.assignedToUserId && subIds.includes(task.assignedToUserId);
    if (!isMyTask && !isMyTeamTask) {
      throw new AppError(
        "Bạn không có quyền sửa task này",
        403,
        "AUTH_FORBIDDEN",
      );
    }
  }

  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId },
    });
    if (!project) throw new AppError("Dự án không tồn tại", 404, "NOT_FOUND");
  }

  const patch = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.deadline !== undefined)
    patch.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.sourceMessage !== undefined)
    patch.sourceMessage = body.sourceMessage;
  if (body.projectId !== undefined) patch.projectId = body.projectId;
  if (body.estimatedHours !== undefined)
    patch.estimatedHours = body.estimatedHours;

  return repo.updateTask(id, patch);
};

const assignTask = async (id, { assignedToUserId }, currentUser) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canManage = await _canManageTask(currentUser);
  if (!canManage) {
    throw new AppError("Bạn không có quyền gán task", 403, "AUTH_FORBIDDEN");
  }

  if (assignedToUserId) {
    await _validateAssignee(assignedToUserId, currentUser);
  }

  const updated = await repo.updateTask(id, {
    assignedToUserId: assignedToUserId ?? null,
  });

  await _notifyAssignee(
    updated,
    currentUser,
    _buildTaskMessage(updated, "assign"),
  );

  return updated;
};

/**
 * Cập nhật trạng thái task.
 *
 * Quy tắc flow:
 *  - EMPLOYEE / người được gán: TODO → IN_PROGRESS → IN_REVIEW (không được DONE/CANCELLED)
 *  - ADMIN / Manager / direct manager: thay đổi tự do (kể cả DONE, CANCELLED)
 */
const updateTaskStatus = async (id, { status, actualHours }, currentUser) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canManage = await _canManageTask(currentUser);
  const isAssignee = task.assignedToUserId === currentUser.id;

  // Chỉ người có liên quan đến task mới được cập nhật status
  if (!canManage && !isAssignee) {
    throw new AppError(
      "Bạn không có quyền cập nhật trạng thái task này",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  // Employee bị giới hạn flow
  if (!canManage && isAssignee) {
    const allowedStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW"];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(
        "Bạn chỉ có thể chuyển trạng thái sang IN_PROGRESS hoặc IN_REVIEW. " +
          'Vui lòng dùng nút "Hoàn thành" khi kết thúc.',
        403,
        "AUTH_FORBIDDEN",
      );
    }
  }

  // Không ai (trừ Admin) được sửa task đã CANCELLED
  const roles = currentUser.roles ?? [];
  if (task.status === "CANCELLED" && !roles.includes(ROLES.ADMIN)) {
    throw new AppError(
      "Task đã bị huỷ, không thể thay đổi trạng thái",
      400,
      "VALIDATION_ERROR",
    );
  }

  const patch = { status };
  if (actualHours !== undefined) patch.actualHours = actualHours;
  if (status === "DONE") patch.completedAt = new Date();

  return repo.updateTask(id, patch);
};

/**
 * Hoàn thành task — shortcut PATCH /complete.
 * Dành cho người được gán hoặc manager xác nhận hoàn thành.
 */
const completeTask = async (
  id,
  { actualHours, completionNote },
  currentUser,
) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canManage = await _canManageTask(currentUser);
  const isAssignee = task.assignedToUserId === currentUser.id;

  if (!canManage && !isAssignee) {
    throw new AppError(
      "Bạn không có quyền hoàn thành task này",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  if (task.status === "CANCELLED") {
    throw new AppError(
      "Không thể hoàn thành task đã bị huỷ",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (task.status === "DONE") {
    throw new AppError("Task đã hoàn thành rồi", 400, "VALIDATION_ERROR");
  }

  const updated = await repo.updateTask(id, {
    status: "DONE",
    completedAt: new Date(),
    actualHours: actualHours ?? task.actualHours,
  });

  // Tự động thêm comment ghi chú nếu có
  if (completionNote?.trim()) {
    await repo
      .createComment({
        taskId: id,
        userId: currentUser.id,
        content: `✅ Hoàn thành. Ghi chú: ${completionNote.trim()}`,
      })
      .catch(() => {});
  }

  return updated;
};

/**
 * Huỷ task — chỉ manager / direct manager / Admin
 */
const cancelTask = async (id, currentUser) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canManage = await _canManageTask(currentUser);
  if (!canManage) {
    throw new AppError("Bạn không có quyền huỷ task", 403, "AUTH_FORBIDDEN");
  }
  if (task.status === "DONE") {
    throw new AppError(
      "Không thể huỷ task đã hoàn thành",
      400,
      "VALIDATION_ERROR",
    );
  }

  return repo.updateTask(id, { status: "CANCELLED" });
};

/**
 * Xóa mềm — chỉ ADMIN
 */
const deleteTask = async (id, currentUser) => {
  const task = await repo.findTaskById(id);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const roles = currentUser.roles ?? [];
  if (!roles.includes(ROLES.ADMIN)) {
    throw new AppError(
      "Chỉ Admin mới có quyền xóa task",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  return repo.softDeleteTask(id);
};

const getTaskStats = async (currentUser) => {
  const roles = currentUser.roles ?? [];
  const isAdmin = roles.includes(ROLES.ADMIN);

  let where = {};
  if (!isAdmin) {
    const canManage = await _canManageTask(currentUser);
    if (canManage) {
      const subIds = await repo.findSubordinateIds(currentUser.id);
      where.OR = [
        { createdByUserId: currentUser.id },
        { assignedToUserId: { in: [currentUser.id, ...subIds] } },
      ];
    } else {
      where.assignedToUserId = currentUser.id;
    }
  }

  const [byStatus, overdue] = await Promise.all([
    repo.countByStatus(where),
    repo.countOverdue(where),
  ]);

  return { byStatus, overdue };
};

// ─────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────

/**
 * Thêm bình luận tiến độ.
 * Mọi người có quyền xem task đều được bình luận.
 */
const addComment = async (taskId, { content }, currentUser) => {
  const task = await repo.findTaskById(taskId);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canView = await _canViewTask(task, currentUser);
  if (!canView) {
    throw new AppError(
      "Bạn không có quyền bình luận trên task này",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  return repo.createComment({ taskId, userId: currentUser.id, content });
};

const getComments = async (taskId, currentUser) => {
  const task = await repo.findTaskById(taskId);
  if (!task) throw new AppError("Task không tồn tại", 404, "NOT_FOUND");

  const canView = await _canViewTask(task, currentUser);
  if (!canView) {
    throw new AppError(
      "Bạn không có quyền xem bình luận task này",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  return repo.findCommentsByTask(taskId);
};

/**
 * Sửa bình luận — chỉ tác giả hoặc Admin
 */
const updateComment = async (taskId, commentId, { content }, currentUser) => {
  const comment = await repo.findCommentById(commentId);
  if (!comment || comment.taskId !== taskId) {
    throw new AppError("Bình luận không tồn tại", 404, "NOT_FOUND");
  }

  const roles = currentUser.roles ?? [];
  if (comment.userId !== currentUser.id && !roles.includes(ROLES.ADMIN)) {
    throw new AppError(
      "Bạn chỉ được sửa bình luận của chính mình",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  return repo.updateComment(commentId, { content, isEdited: true });
};

/**
 * Xóa bình luận — chỉ tác giả hoặc Admin
 */
const deleteComment = async (taskId, commentId, currentUser) => {
  const comment = await repo.findCommentById(commentId);
  if (!comment || comment.taskId !== taskId) {
    throw new AppError("Bình luận không tồn tại", 404, "NOT_FOUND");
  }

  const roles = currentUser.roles ?? [];
  if (comment.userId !== currentUser.id && !roles.includes(ROLES.ADMIN)) {
    throw new AppError(
      "Bạn chỉ được xóa bình luận của chính mình",
      403,
      "AUTH_FORBIDDEN",
    );
  }

  return repo.deleteComment(commentId);
};

const getDashboardSummary = async (currentUser) => {
  const roles = currentUser.roles ?? [];
  const isAdmin = roles.includes(ROLES.ADMIN);

  // Stats scope
  const statsWhere = isAdmin ? {} : { assignedToUserId: currentUser.id };

  const [byStatus, overdue, completedThisWeek, myUpcoming, teamOverdue] =
    await Promise.all([
      repo.countByStatus(statsWhere),
      repo.countOverdue(statsWhere),
      prisma.task.count({
        where: {
          ...statsWhere,
          isActive: true,
          status: "DONE",
          completedAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      repo.getDashboardMyTasks(currentUser.id),
      (await _canManageTask(currentUser))
        ? repo.getDashboardTeamOverdue(currentUser.id)
        : Promise.resolve([]),
    ]);

  const totalOpen =
    (byStatus.TODO ?? 0) +
    (byStatus.IN_PROGRESS ?? 0) +
    (byStatus.IN_REVIEW ?? 0);

  return {
    stats: {
      totalOpen,
      overdue,
      inReview: byStatus.IN_REVIEW ?? 0,
      completedThisWeek,
    },
    myUpcomingTasks: myUpcoming.map(mapper.mapTask),
    teamOverdueTasks: teamOverdue.map(mapper.mapTask),
  };
};

module.exports = {
  createTask,
  listTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  assignTask,
  updateTaskStatus,
  completeTask,
  cancelTask,
  deleteTask,
  getTaskStats,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getDashboardSummary,
};
