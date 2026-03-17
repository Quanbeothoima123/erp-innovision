"use strict";

const { Router } = require("express");
const controller = require("./users.controller");
const { validate } = require("../../middlewares/validate.middleware");
const {
  authenticate,
  authorize,
  hrOrAdmin,
} = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../config/constants");
const {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRolesSchema,
  updateAccountStatusSchema,
  terminateUserSchema,
  updateProfileSchema,
  updateMeSchema,
  userIdParamSchema,
  auditLogQuerySchema,
} = require("./users.validation");

const router = Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(authenticate);

// ── Self-service routes (nhân viên tự phục vụ) ───────────────
// Đặt TRƯỚC /:id để tránh conflict

/**
 * GET  /api/users/me          — Xem thông tin của mình
 * PATCH /api/users/me         — Cập nhật phone, avatar của mình
 * GET  /api/users/me/profile  — Xem profile nhạy cảm của mình
 * PUT  /api/users/me/profile  — Cập nhật profile của mình
 */
router.get("/me", controller.getMe);
router.patch("/me", validate(updateMeSchema), controller.updateMe);
router.get("/me/profile", controller.getMyProfile);
router.put(
  "/me/profile",
  validate(updateProfileSchema),
  controller.updateMyProfile,
);

// ── Admin/HR only routes ──────────────────────────────────────

/**
 * GET /api/users/stats        — Thống kê nhân viên (dashboard)
 */
router.get("/stats", authorize(ROLES.ADMIN, ROLES.HR), controller.getUserStats);

/**
 * GET /api/users/roles        — Danh sách roles
 */
router.get("/roles", authorize(ROLES.ADMIN, ROLES.HR), controller.listRoles);

/**
 * GET  /api/users             — Danh sách nhân viên
 * ADMIN/HR: thấy tất cả
 * MANAGER: thấy nhân viên phòng mình
 */
router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(listUsersSchema, "query"),
  controller.listUsers,
);

/**
 * POST /api/users             — Tạo nhân viên mới
 */
router.post("/", hrOrAdmin, validate(createUserSchema), controller.createUser);

// ── Routes theo :id ──────────────────────────────────────────

/**
 * GET /api/users/:id          — Chi tiết nhân viên
 * Mọi người đều xem được (phân quyền data ở mapper)
 */
router.get(
  "/:id",
  authorize(
    ROLES.ADMIN,
    ROLES.HR,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
    ROLES.SALES,
    ROLES.ACCOUNTANT,
  ),
  controller.getUserById,
);

/**
 * PATCH /api/users/:id        — Cập nhật thông tin cơ bản
 */
router.patch(
  "/:id",
  hrOrAdmin,
  validate(updateUserSchema),
  controller.updateUser,
);

/**
 * PUT /api/users/:id/roles    — Cập nhật phân quyền
 */
router.put(
  "/:id/roles",
  authorize(ROLES.ADMIN), // Chỉ ADMIN mới được đổi role
  validate(updateUserRolesSchema),
  controller.updateUserRoles,
);

/**
 * PATCH /api/users/:id/status — Khóa / mở khóa / vô hiệu hóa tài khoản
 */
router.patch(
  "/:id/status",
  hrOrAdmin,
  validate(updateAccountStatusSchema),
  controller.updateAccountStatus,
);

/**
 * POST /api/users/:id/terminate — Cho nhân viên nghỉ việc
 */
router.post(
  "/:id/terminate",
  hrOrAdmin,
  validate(terminateUserSchema),
  controller.terminateUser,
);

/**
 * POST /api/users/:id/resend-setup-email — Gửi lại email kích hoạt
 */
router.post("/:id/resend-setup-email", hrOrAdmin, controller.resendSetupEmail);

/**
 * GET  /api/users/:id/profile — Xem profile nhạy cảm
 * PUT  /api/users/:id/profile — Cập nhật profile
 * (Bản thân + HR/Admin xem được — xử lý trong service)
 */
router.get("/:id/profile", controller.getProfile);
router.put(
  "/:id/profile",
  validate(updateProfileSchema),
  controller.updateProfile,
);

/**
 * GET /api/users/:id/work-shifts
 * Lịch sử ca làm việc của nhân viên.
 * Bản thân + HR/Admin xem được — xử lý phân quyền trong service.
 */
router.get("/:id/work-shifts", controller.getUserWorkShifts);

/**
 * GET /api/users/:id/audit-logs
 * Nhật ký hoạt động liên quan đến nhân viên.
 * Chỉ HR/Admin được xem.
 * Query: page, limit, entityType, actionType, mode (about|by|all)
 */
router.get(
  "/:id/audit-logs",
  authorize(ROLES.ADMIN, ROLES.HR),
  validate(auditLogQuerySchema, "query"),
  controller.getUserAuditLogs,
);

module.exports = router;
