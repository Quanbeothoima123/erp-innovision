const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/users.routes");
const departmentRoutes = require("../modules/departments/departments.routes");
const jobTitleRoutes = require("../modules/job-titles/job-titles.routes");
const attendanceRoutes = require("../modules/attendance/attendance.routes");
const leaveRoutes = require("../modules/leave/leave.routes");
const overtimeRoutes = require("../modules/overtime/overtime.routes");
const payrollRoutes = require("../modules/payroll/payroll.routes");
const projectRoutes = require("../modules/projects/projects.routes");
const clientRoutes = require("../modules/clients/clients.routes");
const reportRoutes = require("../modules/reports/reports.routes");
const notificationRoutes = require("../modules/notifications/notifications.routes");
const systemRoutes = require("../modules/system/system.routes");
const taskRoutes = require("../modules/tasks/tasks.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/job-titles", jobTitleRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/overtime", overtimeRoutes);
router.use("/payroll", payrollRoutes);
router.use("/projects", projectRoutes);
router.use("/clients", clientRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/system", systemRoutes);
router.use("/tasks", taskRoutes);

module.exports = router;
