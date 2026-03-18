"use strict";

const { Router } = require("express");
const ctrl = require("./attendance.controller");
const { validate } = require("../../middlewares/validate.middleware");
const {
  authenticate,
  hrOrAdmin,
  authorize,
} = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../config/constants");
const v = require("./attendance.validation");

const router = Router();
router.use(authenticate);

// ╔══════════════════════════════════════════════════════════╗
// ║  MY ATTENDANCE — nhân viên tự phục vụ                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/attendance/my                    — Lịch sử chấm công của mình
 * GET  /api/attendance/my/stats/:year/:month — Thống kê tháng
 * POST /api/attendance/requests              — Gửi yêu cầu check-in / check-out
 */
router.get(
  "/my",
  validate(v.myAttendanceSchema, "query"),
  ctrl.getMyAttendance,
);
router.get("/my/stats/:year/:month", ctrl.getMyMonthlyStats);

// ╔══════════════════════════════════════════════════════════╗
// ║  CA LÀM VIỆC (WorkShift)                                 ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/attendance/shifts/options        — Dropdown ca (mọi role)
 * GET  /api/attendance/shifts                — Danh sách ca (HR/Admin/Manager)
 * POST /api/attendance/shifts                — Tạo ca (HR/Admin)
 */
router.get("/shifts/options", ctrl.getShiftOptions);
router.get(
  "/shifts",
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER),
  validate(v.listShiftsSchema, "query"),
  ctrl.listShifts,
);
router.post(
  "/shifts",
  hrOrAdmin,
  validate(v.createShiftSchema),
  ctrl.createShift,
);

/**
 * GET    /api/attendance/shifts/:id          — Chi tiết ca
 * PATCH  /api/attendance/shifts/:id          — Cập nhật ca (HR/Admin)
 * DELETE /api/attendance/shifts/:id          — Xóa / deactivate (Admin)
 */
router.get("/shifts/:id", ctrl.getShiftById);
router.patch(
  "/shifts/:id",
  hrOrAdmin,
  validate(v.updateShiftSchema),
  ctrl.updateShift,
);
router.delete("/shifts/:id", authorize(ROLES.ADMIN), ctrl.deleteShift);

/**
 * GET  /api/attendance/shifts/user/:userId   — Ca làm việc được gán cho nhân viên
 * POST /api/attendance/shifts/assign         — Gán ca cho nhân viên (HR/Admin)
 * DELETE /api/attendance/user-shifts/:id     — Xóa gán ca (HR/Admin)
 */
router.get("/shifts/user/:userId", hrOrAdmin, ctrl.getUserWorkShifts);
router.get("/shifts/:id/members", hrOrAdmin, ctrl.getShiftMembers);
router.post(
  "/shifts/assign",
  hrOrAdmin,
  validate(v.assignUserShiftSchema),
  ctrl.assignUserShift,
);
router.delete("/user-shifts/:id", hrOrAdmin, ctrl.removeUserShift);

// ╔══════════════════════════════════════════════════════════╗
// ║  NGÀY LỄ (Holiday)                                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/attendance/holidays              — Danh sách ngày lễ (mọi role)
 * POST /api/attendance/holidays              — Tạo ngày lễ (HR/Admin)
 */
router.get(
  "/holidays",
  validate(v.listHolidaysSchema, "query"),
  ctrl.listHolidays,
);
router.post(
  "/holidays",
  hrOrAdmin,
  validate(v.createHolidaySchema),
  ctrl.createHoliday,
);

/**
 * GET    /api/attendance/holidays/:id        — Chi tiết
 * PATCH  /api/attendance/holidays/:id        — Cập nhật (HR/Admin)
 * DELETE /api/attendance/holidays/:id        — Xóa (Admin)
 */
router.get("/holidays/:id", ctrl.getHolidayById);
router.patch(
  "/holidays/:id",
  hrOrAdmin,
  validate(v.updateHolidaySchema),
  ctrl.updateHoliday,
);
router.delete("/holidays/:id", authorize(ROLES.ADMIN), ctrl.deleteHoliday);

// ╔══════════════════════════════════════════════════════════╗
// ║  YÊU CẦU CHẤM CÔNG (AttendanceRequest)                  ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/attendance/requests              — Danh sách yêu cầu
 *                                              HR/Admin: xem tất cả
 *                                              Nhân viên: chỉ xem của mình
 * POST /api/attendance/requests              — Nhân viên gửi yêu cầu check-in/out
 */
router.get(
  "/requests",
  validate(v.listAttendanceRequestsSchema, "query"),
  ctrl.listRequests,
);
router.post(
  "/requests",
  validate(v.createAttendanceRequestSchema),
  ctrl.createRequest,
);

/**
 * GET    /api/attendance/requests/:id        — Chi tiết yêu cầu
 * POST   /api/attendance/requests/:id/approve — Admin/HR duyệt → ghi AttendanceRecord
 * POST   /api/attendance/requests/:id/reject  — Admin/HR từ chối
 */
router.get("/requests/:id", ctrl.getRequestById);
router.post(
  "/requests/:id/approve",
  hrOrAdmin,
  validate(v.approveAttendanceRequestSchema),
  ctrl.approveRequest,
);
router.post(
  "/requests/:id/reject",
  hrOrAdmin,
  validate(v.rejectAttendanceRequestSchema),
  ctrl.rejectRequest,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  BẢN GHI CHẤM CÔNG (AttendanceRecord)                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/attendance/records               — Danh sách bản ghi
 *                                              HR/Admin: tất cả
 *                                              Nhân viên: chỉ của mình
 * POST /api/attendance/records/adjust        — Admin/HR tạo / điều chỉnh thủ công
 */
router.get(
  "/records",
  validate(v.listAttendanceRecordsSchema, "query"),
  ctrl.listRecords,
);
router.post(
  "/records/adjust",
  hrOrAdmin,
  validate(v.manualAdjustSchema),
  ctrl.manualAdjust,
);

/**
 * GET    /api/attendance/records/:id         — Chi tiết bản ghi
 * PATCH  /api/attendance/records/:id         — Admin/HR cập nhật
 * DELETE /api/attendance/records/:id         — Admin xóa bản ghi
 */
router.get("/records/:id", ctrl.getRecordById);
router.patch(
  "/records/:id",
  hrOrAdmin,
  validate(v.updateAttendanceRecordSchema),
  ctrl.updateRecord,
);
router.delete("/records/:id", authorize(ROLES.ADMIN), ctrl.deleteRecord);

module.exports = router;
