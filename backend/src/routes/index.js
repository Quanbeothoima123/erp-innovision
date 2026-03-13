"use strict";

const { Router } = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const departmentsRoutes = require("../modules/departments/departments.routes");
const jobTitlesRoutes = require("../modules/job-titles/job-titles.routes");
const attendanceRoutes = require("../modules/attendance/attendance.routes");
const leaveRoutes = require("../modules/leave/leave.routes");
const router = Router();

// ── Module routes ────────────────────────────────────────────
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/departments", departmentsRoutes);
router.use("/job-titles", jobTitlesRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
// router.use('/overtime', overtimeRoutes);
// router.use('/payroll', payrollRoutes);
// router.use('/projects', projectRoutes);
// router.use('/clients', clientRoutes);
// router.use('/contracts', contractRoutes);
// router.use('/invoices', invoiceRoutes);
// router.use('/reports', reportRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/system', systemRoutes);

module.exports = router;
