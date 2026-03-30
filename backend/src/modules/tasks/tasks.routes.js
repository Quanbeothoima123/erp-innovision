// src/modules/tasks/tasks.routes.js
//
// Lưu ý về phân quyền tạo/gán task:
//  - ADMIN và MANAGER role → middleware authorize() xử lý
//  - "Direct manager" (user có thuộc cấp nhưng không có role MANAGER)
//    → service._canManageTask() kiểm tra sau khi authenticate()
//    → Routes không dùng authorize() cứng để cho phép direct manager qua
//
const express = require("express");
const ctrl = require("./tasks.controller");
const v = require("./tasks.validation");
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { auditAction } = require("../../middlewares/audit.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/constants");

const router = express.Router();

// Tất cả routes yêu cầu đăng nhập
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// Thống kê & My Tasks (không cần middleware role)
// ─────────────────────────────────────────────────────────────

// GET /api/tasks/stats
// Mọi user đều thấy stats trong phạm vi quyền của mình
router.get("/stats", ctrl.getTaskStats);

// GET /api/tasks/dashboard-summary
router.get("/dashboard-summary", ctrl.getDashboardSummary);

// GET /api/tasks/my
// Nhân viên dùng route này để xem task của bản thân
router.get("/my", validate(v.listTasksSchema, "query"), ctrl.getMyTasks);

// ─────────────────────────────────────────────────────────────
// Task CRUD
// ─────────────────────────────────────────────────────────────

// GET /api/tasks
// ADMIN/HR thấy tất cả; Manager/direct-manager thấy nhóm; Employee thấy task mình
router.get("/", validate(v.listTasksSchema, "query"), ctrl.listTasks);

// POST /api/tasks
// Không dùng authorize() cứng — service._canManageTask() sẽ kiểm tra:
//   1. Có role ADMIN hoặc MANAGER, HOẶC
//   2. Là direct manager (có ít nhất 1 thuộc cấp trong bảng users)
router.post(
  "/",
  validate(v.createTaskSchema),
  auditAction("TASK", "CREATE", (req, body) => {
    const actor = req.user?.email ?? "Hệ thống";
    const title = body?.data?.title ?? "";
    return `${actor} tạo task "${title}"`;
  }),
  ctrl.createTask,
);

// GET /api/tasks/:id
router.get("/:id", ctrl.getTaskById);

// PATCH /api/tasks/:id   — sửa thông tin (manager / direct manager / admin)
router.patch(
  "/:id",
  validate(v.updateTaskSchema),
  auditAction("TASK", "UPDATE"),
  ctrl.updateTask,
);

// PATCH /api/tasks/:id/assign   — gán người thực hiện
router.patch(
  "/:id/assign",
  validate(v.assignTaskSchema),
  auditAction("TASK", "ASSIGN", (req, body) => {
    const actor = req.user?.email ?? "Hệ thống";
    const title = body?.data?.title ?? "";
    const assignee = body?.data?.assignedTo?.fullName ?? "";
    return `${actor} gán task "${title}" cho ${assignee}`.trim();
  }),
  ctrl.assignTask,
);

// PATCH /api/tasks/:id/status
// - Manager / direct manager / Admin: đổi tự do (kể cả DONE, CANCELLED)
// - Employee (được gán): chỉ TODO → IN_PROGRESS → IN_REVIEW
// Service xử lý rule này, không cần middleware cứng
router.patch(
  "/:id/status",
  validate(v.updateStatusSchema),
  auditAction("TASK", "STATUS_CHANGE", (req, body) => {
    const actor = req.user?.email ?? "Hệ thống";
    const title = body?.data?.title ?? "";
    const status = body?.data?.status ?? "";
    return `${actor} chuyển trạng thái task "${title}" → ${status}`;
  }),
  ctrl.updateTaskStatus,
);

// PATCH /api/tasks/:id/complete
// Người được gán hoặc manager xác nhận hoàn thành
router.patch(
  "/:id/complete",
  validate(v.completeTaskSchema),
  auditAction("TASK", "STATUS_CHANGE", (req, body) => {
    const actor = req.user?.email ?? "Hệ thống";
    const title = body?.data?.title ?? "";
    return `${actor} hoàn thành task "${title}"`;
  }),
  ctrl.completeTask,
);

// PATCH /api/tasks/:id/cancel   — chỉ manager / direct manager / Admin
router.patch(
  "/:id/cancel",
  auditAction("TASK", "CANCEL", (req, body) => {
    const actor = req.user?.email ?? "Hệ thống";
    const title = body?.data?.title ?? "";
    return `${actor} hủy task "${title}"`;
  }),
  ctrl.cancelTask,
);

// DELETE /api/tasks/:id   — chỉ ADMIN (xóa mềm)
router.delete(
  "/:id",
  authorize(ROLES.ADMIN),
  auditAction("TASK", "DEACTIVATE"),
  ctrl.deleteTask,
);

// ─────────────────────────────────────────────────────────────
// Comments — bình luận tiến độ
// ─────────────────────────────────────────────────────────────

// GET  /api/tasks/:id/comments
router.get("/:id/comments", ctrl.getComments);

// POST /api/tasks/:id/comments
// Mọi người có access vào task đều được comment
router.post("/:id/comments", validate(v.createCommentSchema), ctrl.addComment);

// PATCH /api/tasks/:id/comments/:commentId   — chỉ tác giả hoặc Admin
router.patch(
  "/:id/comments/:commentId",
  validate(v.updateCommentSchema),
  ctrl.updateComment,
);

// DELETE /api/tasks/:id/comments/:commentId  — chỉ tác giả hoặc Admin
router.delete("/:id/comments/:commentId", ctrl.deleteComment);

module.exports = router;
