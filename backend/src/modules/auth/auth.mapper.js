"use strict";

/**
 * Chuyển User (từ Prisma) thành object trả về client.
 * KHÔNG bao giờ expose passwordHash, failedLoginCount, adminNotes ra ngoài.
 *
 * @param {object} user - Prisma User với roles[]
 */
function toUserDto(user) {
  if (!user) return null;

  return {
    id: user.id,
    userCode: user.userCode,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    roles: extractRoleCodes(user.roles),
    departmentId: user.departmentId,
    department: user.department ?? null,
    jobTitleId: user.jobTitleId,
    jobTitle: user.jobTitle ?? null,
    managerId: user.managerId,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
    accountStatus: user.accountStatus,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Response sau khi login/refresh thành công.
 */
function toAuthResponse(user, accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    user: toUserDto(user),
  };
}

/**
 * Extract mảng role codes từ UserRole[] (Prisma include)
 * @param {Array} userRoles
 * @returns {string[]}
 */
function extractRoleCodes(userRoles = []) {
  return userRoles.map((ur) => ur.role?.code ?? ur.roleCode).filter(Boolean);
}

module.exports = { toUserDto, toAuthResponse, extractRoleCodes };
