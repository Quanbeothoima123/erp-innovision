'use strict';

const repo   = require('./reports.repository');
const mapper = require('./reports.mapper');
const { AppError } = require('../../common/errors/AppError');
const { ROLES }    = require('../../config/constants');

// ── Quyền truy cập reports ────────────────────────────────────

function _assertCanViewReports(user) {
  const allowed = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.ACCOUNTANT];
  if (!user.roles.some(r => allowed.includes(r))) {
    throw AppError.forbidden('Bạn không có quyền xem báo cáo.');
  }
}

function _assertHrOrAdmin(user) {
  if (!user.roles.some(r => [ROLES.ADMIN, ROLES.HR].includes(r))) {
    throw AppError.forbidden('Chỉ HR/Admin mới có thể xem báo cáo này.');
  }
}

function _assertFinanceAccess(user) {
  const allowed = [ROLES.ADMIN, ROLES.HR, ROLES.ACCOUNTANT];
  if (!user.roles.some(r => allowed.includes(r))) {
    throw AppError.forbidden('Chỉ HR/Admin/Kế toán mới có thể xem báo cáo tài chính.');
  }
}

// ── Dashboard ─────────────────────────────────────────────────

async function getDashboard(filters, user) {
  _assertCanViewReports(user);
  const raw = await repo.getDashboardStats(filters.year, filters.month);
  return mapper.toDashboardDto(raw);
}

// ── HR Report ─────────────────────────────────────────────────

async function getHRReport(filters, user) {
  _assertHrOrAdmin(user);

  // Manager chỉ xem phòng ban của mình
  if (_hasRole(user, ROLES.MANAGER) && !_isHrOrAdmin(user)) {
    const { prisma } = require('../../config/db');
    const me = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { departmentId: true },
    });
    filters.departmentId = me?.departmentId ?? filters.departmentId;
  }

  const raw = await repo.getHRStats(filters);
  return mapper.toHRReportDto(raw, filters.year);
}

// ── Attendance Report ─────────────────────────────────────────

async function getAttendanceReport(filters, user) {
  _assertCanViewReports(user);

  // Employee chỉ xem của mình
  if (!_isHrOrAdmin(user) && !_hasRole(user, ROLES.MANAGER)) {
    filters.userId = user.id;
    filters.departmentId = undefined;
  }

  const raw = await repo.getAttendanceStats(filters);
  return mapper.toAttendanceReportDto(raw);
}

// ── Leave Report ──────────────────────────────────────────────

async function getLeaveReport(filters, user) {
  _assertHrOrAdmin(user);
  const raw = await repo.getLeaveStats(filters);
  return mapper.toLeaveReportDto(raw);
}

// ── Payroll Report ────────────────────────────────────────────

async function getPayrollReport(filters, user) {
  _assertFinanceAccess(user);
  const raw = await repo.getPayrollStats(filters);
  return mapper.toPayrollReportDto(raw);
}

// ── Project Report ────────────────────────────────────────────

async function getProjectReport(filters, user) {
  _assertCanViewReports(user);
  const raw = await repo.getProjectStats(filters);
  return mapper.toProjectReportDto(raw);
}

// ── Finance Report ────────────────────────────────────────────

async function getFinanceReport(filters, user) {
  _assertFinanceAccess(user);
  const raw = await repo.getFinanceStats(filters);
  return mapper.toFinanceReportDto(raw);
}

// ── Overtime Report ───────────────────────────────────────────

async function getOvertimeReport(filters, user) {
  _assertCanViewReports(user);
  const raw = await repo.getOvertimeStats(filters);
  return mapper.toOvertimeReportDto(raw);
}

// ── Helpers ───────────────────────────────────────────────────

function _isHrOrAdmin(user) {
  return user.roles.some(r => [ROLES.ADMIN, ROLES.HR].includes(r));
}

function _hasRole(user, role) {
  return user.roles.includes(role);
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
