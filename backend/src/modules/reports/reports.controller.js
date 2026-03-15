'use strict';

const service = require('./reports.service');
const { successResponse } = require('../../common/utils/response.util');

/**
 * GET /api/reports/dashboard
 * Tổng quan nhanh: số nhân viên, pending tasks, công nợ, dự án active
 */
async function getDashboard(req, res, next) {
  try {
    const data = await service.getDashboard(req.query, req.user);
    return successResponse(res, data, 'Lấy dashboard thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/hr
 * Phân bố nhân sự, thâm niên, tuyển dụng theo năm, role distribution
 */
async function getHRReport(req, res, next) {
  try {
    const data = await service.getHRReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo nhân sự thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/attendance
 * Chấm công theo tháng: daily trend, tỷ lệ phòng ban, top trễ, OT
 */
async function getAttendanceReport(req, res, next) {
  try {
    const data = await service.getAttendanceReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo chấm công thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/leave
 * Nghỉ phép: status breakdown, loại phép, số dư, xu hướng theo tháng
 */
async function getLeaveReport(req, res, next) {
  try {
    const data = await service.getLeaveReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo nghỉ phép thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/payroll
 * Bảng lương: gross/net, cơ cấu, theo phòng ban, xu hướng theo tháng
 */
async function getPayrollReport(req, res, next) {
  try {
    const data = await service.getPayrollReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo lương thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/projects
 * Dự án: health, budget, tiến độ, milestone, chi phí, sắp hết hạn
 */
async function getProjectReport(req, res, next) {
  try {
    const data = await service.getProjectReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo dự án thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/finance
 * Tài chính: doanh thu, hóa đơn, công nợ, top debtors, by client
 */
async function getFinanceReport(req, res, next) {
  try {
    const data = await service.getFinanceReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo tài chính thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/reports/overtime
 * OT: phân loại ngày, top users, xu hướng theo tháng
 */
async function getOvertimeReport(req, res, next) {
  try {
    const data = await service.getOvertimeReport(req.query, req.user);
    return successResponse(res, data, 'Lấy báo cáo OT thành công');
  } catch (err) { next(err); }
}

module.exports = {
  getDashboard,
  getHRReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getProjectReport,
  getFinanceReport,
  getOvertimeReport,
};
