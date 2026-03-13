"use strict";

const { Router } = require("express");
const controller = require("./departments.controller");
const { validate } = require("../../middlewares/validate.middleware");
const {
  authenticate,
  hrOrAdmin,
  authorize,
} = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../config/constants");
const {
  listDepartmentsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} = require("./departments.validation");

const router = Router();

router.use(authenticate);

/**
 * GET /api/departments/options  — Dropdown, mọi role đều xem được
 */
router.get("/options", controller.getDepartmentOptions);

/**
 * GET  /api/departments         — Danh sách phòng ban
 * POST /api/departments         — Tạo phòng ban mới (HR/Admin)
 */
router.get(
  "/",
  validate(listDepartmentsSchema, "query"),
  controller.listDepartments,
);
router.post(
  "/",
  hrOrAdmin,
  validate(createDepartmentSchema),
  controller.createDepartment,
);

/**
 * GET    /api/departments/:id           — Chi tiết + stats
 * PATCH  /api/departments/:id           — Cập nhật (HR/Admin)
 * DELETE /api/departments/:id           — Xóa / deactivate (Admin only)
 */
router.get("/:id", controller.getDepartmentById);
router.patch(
  "/:id",
  hrOrAdmin,
  validate(updateDepartmentSchema),
  controller.updateDepartment,
);
router.delete("/:id", authorize(ROLES.ADMIN), controller.deleteDepartment);

/**
 * GET /api/departments/:id/members      — Danh sách nhân viên trong phòng
 */
router.get(
  "/:id/members",
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  controller.getDepartmentMembers,
);

module.exports = router;
