"use strict";

const { ROLES } = require("../../config/constants");

/**
 * Tiện ích kiểm tra role — dùng trong middleware và service.
 */

/** Kiểm tra user có role cụ thể không */
function hasRole(user, role) {
  return user?.roles?.includes(role) ?? false;
}

/** Kiểm tra user có ít nhất 1 trong các roles không */
function hasAnyRole(user, roles = []) {
  return roles.some((role) => hasRole(user, role));
}

/** Kiểm tra user có tất cả roles không */
function hasAllRoles(user, roles = []) {
  return roles.every((role) => hasRole(user, role));
}

/** Roles có quyền quản lý nhân sự */
const HR_ROLES = [ROLES.ADMIN, ROLES.HR];

/** Roles có thể duyệt nghỉ phép / OT */
const APPROVER_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER];

/** Roles có quyền xem tài chính */
const FINANCE_ROLES = [ROLES.ADMIN, ROLES.ACCOUNTANT];

module.exports = {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  HR_ROLES,
  APPROVER_ROLES,
  FINANCE_ROLES,
};
