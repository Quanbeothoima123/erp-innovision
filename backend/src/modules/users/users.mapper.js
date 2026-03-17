"use strict";

/**
 * 3 mức DTO theo phân quyền:
 *
 *  toPublicDto    — Bất kỳ nhân viên nào cũng thấy (tên, phòng ban, chức danh)
 *  toEmployeeDto  — Nhân viên xem hồ sơ của chính mình (+ phone, email, hireDate...)
 *  toAdminDto     — HR/Admin xem toàn bộ (+ adminNotes, failedLoginCount...)
 *
 *  toProfileDto   — Thông tin profile nhạy cảm (chỉ HR/Admin và bản thân)
 */

// ── User DTOs ─────────────────────────────────────────────────

/** Thông tin tối thiểu — an toàn để hiển thị cho mọi nhân viên */
function toPublicDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    userCode: user.userCode,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    department: user.department ?? null,
    jobTitle: user.jobTitle ?? null,
    employmentStatus: user.employmentStatus,
  };
}

/** Nhân viên xem hồ sơ của chính mình */
function toEmployeeDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    userCode: user.userCode,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    roles: _extractRoleCodes(user.roles),
    department: user.department ?? null,
    jobTitle: user.jobTitle ?? null,
    manager: user.manager
      ? {
          id: user.manager.id,
          fullName: user.manager.fullName,
          avatarUrl: user.manager.avatarUrl,
        }
      : null,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
    accountStatus: user.accountStatus,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/** HR/Admin xem — bao gồm adminNotes, failedLoginCount, terminationReason */
function toAdminDto(user) {
  if (!user) return null;
  return {
    ...toEmployeeDto(user),
    managerId: user.managerId,
    departmentId: user.departmentId,
    jobTitleId: user.jobTitleId,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    terminatedAt: user.terminatedAt,
    terminationReason: user.terminationReason,
    adminNotes: user.adminNotes,
    createdByUserId: user.createdByUserId,
    createdBy: user.createdBy ?? null,
    updatedAt: user.updatedAt,
  };
}

/** DTO cho danh sách (list) — gọn hơn detail */
function toListItemDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    userCode: user.userCode,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    roles: _extractRoleCodes(user.roles),
    department: user.department ?? null,
    jobTitle: user.jobTitle ?? null,
    manager: user.manager
      ? { id: user.manager.id, fullName: user.manager.fullName }
      : null,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
  };
}

// ── Profile DTO ───────────────────────────────────────────────

/** Profile nhạy cảm — chỉ HR/Admin và bản thân mới xem được */
function toProfileDto(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    placeOfBirth: profile.placeOfBirth,
    nationality: profile.nationality,
    ethnicity: profile.ethnicity,
    permanentAddress: profile.permanentAddress,
    currentAddress: profile.currentAddress,
    city: profile.city,
    province: profile.province,
    nationalIdNumber: profile.nationalIdNumber,
    nationalIdIssueDate: profile.nationalIdIssueDate,
    nationalIdIssuePlace: profile.nationalIdIssuePlace,
    passportNumber: profile.passportNumber,
    passportExpiry: profile.passportExpiry,
    taxCode: profile.taxCode,
    socialInsuranceNumber: profile.socialInsuranceNumber,
    healthInsuranceNumber: profile.healthInsuranceNumber,
    healthInsuranceExpiry: profile.healthInsuranceExpiry,
    bankName: profile.bankName,
    bankBranch: profile.bankBranch,
    bankAccountNumber: profile.bankAccountNumber,
    bankAccountHolder: profile.bankAccountHolder,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRel: profile.emergencyContactRel,
    dependantCount: profile.dependantCount,
    educationLevel: profile.educationLevel,
    educationMajor: profile.educationMajor,
    university: profile.university,
    notes: profile.notes,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ── Work Shift DTO ────────────────────────────────────────────

/**
 * DTO cho 1 bản ghi UserWorkShift, kèm thông tin shift detail.
 */
function toWorkShiftDto(uws) {
  if (!uws) return null;
  return {
    id: uws.id,
    userId: uws.userId,
    shiftId: uws.shiftId,
    dayOfWeek: uws.dayOfWeek,       // null = áp dụng tất cả ngày trong tuần
    effectiveFrom: uws.effectiveFrom,
    effectiveTo: uws.effectiveTo,
    isActive: uws.isActive,
    notes: uws.notes,
    createdAt: uws.createdAt,
    updatedAt: uws.updatedAt,
    shift: uws.shift
      ? {
          id: uws.shift.id,
          code: uws.shift.code,
          name: uws.shift.name,
          shiftType: uws.shift.shiftType,
          startTime: uws.shift.startTime,
          endTime: uws.shift.endTime,
          breakMinutes: uws.shift.breakMinutes,
          workMinutes: uws.shift.workMinutes,
          isNightShift: uws.shift.isNightShift,
          overtimeAfterMinutes: uws.shift.overtimeAfterMinutes,
        }
      : null,
  };
}

// ── Audit Log DTO ─────────────────────────────────────────────

/**
 * DTO cho 1 bản ghi AuditLog, kèm thông tin actor (người thực hiện).
 */
function toAuditLogDto(log) {
  if (!log) return null;
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    actionType: log.actionType,
    actorUserId: log.actorUserId,
    actorUser: log.actorUser
      ? {
          id: log.actorUser.id,
          fullName: log.actorUser.fullName,
          avatarUrl: log.actorUser.avatarUrl,
          userCode: log.actorUser.userCode,
        }
      : null,
    description: log.description,
    oldValues: log.oldValues,
    newValues: log.newValues,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
}

// ── Role DTO ──────────────────────────────────────────────────

function toRoleDto(role) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
  };
}

// ── Private helpers ───────────────────────────────────────────

function _extractRoleCodes(userRoles = []) {
  return userRoles.map((ur) => ur.role?.code ?? ur.roleCode).filter(Boolean);
}

module.exports = {
  toPublicDto,
  toEmployeeDto,
  toAdminDto,
  toListItemDto,
  toProfileDto,
  toWorkShiftDto,
  toAuditLogDto,
  toRoleDto,
};
