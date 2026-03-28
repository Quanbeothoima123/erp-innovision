// src/modules/tasks/tasks.mapper.js

const mapUserBrief = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    userCode: user.userCode ?? null,
  };
};

const mapProjectBrief = (project) => {
  if (!project) return null;
  return {
    id: project.id,
    name: project.name,
    code: project.code ?? null,
    status: project.status,
  };
};

/**
 * Map một Task entity → DTO trả về client (dùng cho list)
 */
const mapTask = (task) => {
  if (!task) return null;
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    deadline: task.deadline ?? null,
    priority: task.priority,
    status: task.status,
    sourceMessage: task.sourceMessage ?? null,
    estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
    actualHours: task.actualHours ? Number(task.actualHours) : null,
    completedAt: task.completedAt ?? null,
    isActive: task.isActive,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,

    project: mapProjectBrief(task.project),
    assignedTo: mapUserBrief(task.assignedTo),
    createdBy: mapUserBrief(task.createdBy),

    // Chỉ có khi query include _count
    commentCount: task._count?.comments ?? undefined,
  };
};

const mapTaskList = (tasks) => tasks.map(mapTask);

/**
 * Map task kèm comments đầy đủ (dùng cho detail)
 */
const mapTaskDetail = (task) => {
  if (!task) return null;
  return {
    ...mapTask(task),
    comments: (task.comments ?? []).map(mapComment),
  };
};

/**
 * Map TaskComment entity → DTO
 */
const mapComment = (comment) => {
  if (!comment) return null;
  return {
    id: comment.id,
    content: comment.content,
    isEdited: comment.isEdited,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: mapUserBrief(comment.user),
  };
};

/**
 * Map thống kê task
 */
const mapTaskStats = (stats) => stats;

module.exports = {
  mapTask,
  mapTaskList,
  mapTaskDetail,
  mapComment,
  mapTaskStats,
};
