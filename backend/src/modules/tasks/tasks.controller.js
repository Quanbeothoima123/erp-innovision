// src/modules/tasks/tasks.controller.js
const service = require("./tasks.service");
const mapper = require("./tasks.mapper");
const {
  successResponse,
  noContentResponse,
} = require("../../common/utils/response.util");

// ── Tasks ────────────────────────────────────────────────────

const createTask = async (req, res) => {
  const task = await service.createTask(req.body, req.user);
  return successResponse(
    res,
    mapper.mapTask(task),
    "Task đã được tạo thành công",
    201,
  );
};

const listTasks = async (req, res) => {
  const { data, total } = await service.listTasks(req.query, req.user);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const totalPages = Math.ceil(total / limit);
  return successResponse(
    res,
    {
      items: mapper.mapTaskList(data),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    "Lấy danh sách task thành công",
  );
};

const getMyTasks = async (req, res) => {
  const { data, total } = await service.getMyTasks(req.query, req.user);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const totalPages = Math.ceil(total / limit);
  return successResponse(
    res,
    {
      items: mapper.mapTaskList(data),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    "Lấy task của tôi thành công",
  );
};

const getTaskStats = async (req, res) => {
  const stats = await service.getTaskStats(req.user);
  return successResponse(
    res,
    mapper.mapTaskStats(stats),
    "Lấy thống kê task thành công",
  );
};

const getTaskById = async (req, res) => {
  const task = await service.getTaskById(req.params.id, req.user);
  return successResponse(
    res,
    mapper.mapTaskDetail(task),
    "Lấy chi tiết task thành công",
  );
};

const updateTask = async (req, res) => {
  const task = await service.updateTask(req.params.id, req.body, req.user);
  return successResponse(res, mapper.mapTask(task), "Cập nhật task thành công");
};

const assignTask = async (req, res) => {
  const task = await service.assignTask(req.params.id, req.body, req.user);
  return successResponse(res, mapper.mapTask(task), "Gán task thành công");
};

const updateTaskStatus = async (req, res) => {
  const task = await service.updateTaskStatus(
    req.params.id,
    req.body,
    req.user,
  );
  return successResponse(
    res,
    mapper.mapTask(task),
    "Cập nhật trạng thái thành công",
  );
};

const completeTask = async (req, res) => {
  const task = await service.completeTask(req.params.id, req.body, req.user);
  return successResponse(res, mapper.mapTask(task), "Task đã được hoàn thành");
};

const cancelTask = async (req, res) => {
  const task = await service.cancelTask(req.params.id, req.user);
  return successResponse(res, mapper.mapTask(task), "Task đã được huỷ");
};

const deleteTask = async (req, res) => {
  await service.deleteTask(req.params.id, req.user);
  return noContentResponse(res, "Task đã được xóa");
};

// ── Comments ─────────────────────────────────────────────────

const addComment = async (req, res) => {
  const comment = await service.addComment(req.params.id, req.body, req.user);
  return successResponse(
    res,
    mapper.mapComment(comment),
    "Bình luận đã được thêm",
    201,
  );
};

const getComments = async (req, res) => {
  const comments = await service.getComments(req.params.id, req.user);
  return successResponse(
    res,
    comments.map(mapper.mapComment),
    "Lấy bình luận thành công",
  );
};

const updateComment = async (req, res) => {
  const comment = await service.updateComment(
    req.params.id,
    req.params.commentId,
    req.body,
    req.user,
  );
  return successResponse(
    res,
    mapper.mapComment(comment),
    "Cập nhật bình luận thành công",
  );
};

const deleteComment = async (req, res) => {
  await service.deleteComment(req.params.id, req.params.commentId, req.user);
  return noContentResponse(res, "Bình luận đã được xóa");
};

module.exports = {
  createTask,
  listTasks,
  getMyTasks,
  getTaskStats,
  getTaskById,
  updateTask,
  assignTask,
  updateTaskStatus,
  completeTask,
  cancelTask,
  deleteTask,
  addComment,
  getComments,
  updateComment,
  deleteComment,
};
