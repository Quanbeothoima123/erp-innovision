"use strict";

const { Router } = require("express");
const authRoutes = require("../modules/auth/auth.routes");

const router = Router();

// ── Module routes ────────────────────────────────────────────
router.use("/auth", authRoutes);

// Các module sau sẽ thêm vào đây:
// router.use('/users', userRoutes);
// router.use('/departments', departmentRoutes);
// router.use('/attendance', attendanceRoutes);
// router.use('/leave', leaveRoutes);
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
