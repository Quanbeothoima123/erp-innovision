'use strict';

const { Router } = require('express');
const ctrl = require('./reports.controller');
const { validate }    = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const v               = require('./reports.validation');

const router = Router();
router.use(authenticate); // Tất cả reports đều cần đăng nhập; quyền kiểm tra trong service

/**
 * GET /api/reports/dashboard        — Snapshot tổng quan (all managers+)
 * GET /api/reports/hr               — Nhân sự (HR/Admin)
 * GET /api/reports/attendance        — Chấm công (Manager+, Employee chỉ xem mình)
 * GET /api/reports/leave             — Nghỉ phép (HR/Admin)
 * GET /api/reports/payroll           — Lương (HR/Admin/Accountant)
 * GET /api/reports/projects          — Dự án (Manager+)
 * GET /api/reports/finance           — Tài chính / Doanh thu (HR/Admin/Accountant)
 * GET /api/reports/overtime          — Làm thêm giờ (Manager+)
 */
router.get('/dashboard',  validate(v.dashboardSchema,   'query'), ctrl.getDashboard);
router.get('/hr',         validate(v.hrReportSchema,    'query'), ctrl.getHRReport);
router.get('/attendance', validate(v.attendanceReportSchema, 'query'), ctrl.getAttendanceReport);
router.get('/leave',      validate(v.leaveReportSchema, 'query'), ctrl.getLeaveReport);
router.get('/payroll',    validate(v.payrollReportSchema, 'query'), ctrl.getPayrollReport);
router.get('/projects',   validate(v.projectReportSchema, 'query'), ctrl.getProjectReport);
router.get('/finance',    validate(v.financeReportSchema, 'query'), ctrl.getFinanceReport);
router.get('/overtime',   validate(v.overtimeReportSchema, 'query'), ctrl.getOvertimeReport);

module.exports = router;
