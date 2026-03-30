"use strict";

const repo = require("./users.repository");
const { AppError } = require("../../common/errors/AppError");
const { ERROR_CODES } = require("../../common/errors/errorCodes");
const {
  generateSecureToken,
  hashToken,
} = require("../../common/utils/hash.util");
const { sendAccountSetupEmail } = require("../../common/services/mail.service");
const { env } = require("../../config/env");
const { ROLES, PAGINATION } = require("../../config/constants");
const { prisma } = require("../../config/db");

// ── List ─────────────────────────────────────────────────────

/**
 * Lấy danh sách nhân viên với phân quyền:
 * - ADMIN / HR: thấy tất cả
 * - MANAGER (role): chỉ thấy nhân viên cùng phòng
 * - Direct manager (không có role MANAGER nhưng có thuộc cấp): chỉ thấy thuộc cấp trực tiếp
 * - EMPLOYEE thuần (không quản lý ai): throw 403
 */
async function listUsers(filters, requestingUser) {
  const isHrOrAdmin = requestingUser.roles.some((r) =>
    [ROLES.ADMIN, ROLES.HR].includes(r),
  );
  const hasManagerRole = requestingUser.roles.includes(ROLES.MANAGER);

  if (isHrOrAdmin) {
    // ADMIN/HR: không giới hạn phạm vi, chỉ áp dụng filters từ query
    const { users, total } = await repo.findMany(filters);
    return {
      users,
      pagination: {
        page: filters.page ?? PAGINATION.DEFAULT_PAGE,
        limit: filters.limit ?? PAGINATION.DEFAULT_LIMIT,
        total,
      },
    };
  }

  if (hasManagerRole) {
    // MANAGER role: giới hạn theo phòng ban của manager
    const managerUser = await repo.findById(requestingUser.id);
    if (managerUser?.departmentId) {
      filters.departmentId = managerUser.departmentId;
    }
    const { users, total } = await repo.findMany(filters);
    return {
      users,
      pagination: {
        page: filters.page ?? PAGINATION.DEFAULT_PAGE,
        limit: filters.limit ?? PAGINATION.DEFAULT_LIMIT,
        total,
      },
    };
  }

  // Không phải ADMIN/HR/MANAGER → kiểm tra có phải direct manager không
  const isDirect = await repo.isDirectManager(requestingUser.id);
  if (!isDirect) {
    throw AppError.forbidden("Bạn không có quyền xem danh sách nhân viên.");
  }

  // Direct manager: chỉ thấy thuộc cấp trực tiếp của mình
  filters.managerId = requestingUser.id;
  const { users, total } = await repo.findMany(filters);
  return {
    users,
    pagination: {
      page: filters.page ?? PAGINATION.DEFAULT_PAGE,
      limit: filters.limit ?? PAGINATION.DEFAULT_LIMIT,
      total,
    },
  };
}

// ── My Team ───────────────────────────────────────────────────

/**
 * Lấy danh sách nhân viên trực tiếp dưới quyền của user đang đăng nhập.
 * Dùng cho: dropdown gán task, xem nhóm, phê duyệt OT/nghỉ phép...
 * Mở cho mọi role — trả về mảng rỗng nếu không quản lý ai.
 */
async function getMyTeam(requestingUser) {
  const subordinates = await repo.findSubordinates(requestingUser.id);
  return subordinates;
}

/**
 * Kiểm tra xem targetId có phải là thuộc cấp trực tiếp của managerId không.
 */
async function isSubordinateOf(managerId, targetId) {
  if (!managerId || !targetId) return false;
  const subordinates = await repo.findSubordinates(managerId);
  return subordinates.some((u) => u.id === targetId);
}

// ── Get one ───────────────────────────────────────────────────

/**
 * Lấy chi tiết 1 user.
 * - HR/Admin: toAdminDto
 * - Bản thân: toEmployeeDto
 * - Người khác (MANAGER nhìn NV cùng phòng): toPublicDto
 */
async function getUserById(targetId, requestingUser) {
  const user = await repo.findById(targetId);
  if (!user) {
    throw AppError.notFound(
      "Không tìm thấy nhân viên.",
      ERROR_CODES.USER_NOT_FOUND,
    );
  }
  return user;
}

// ── Create ────────────────────────────────────────────────────

async function createUser(dto, creatorId) {
  // 1. Kiểm tra email trùng
  const existingByEmail = await repo.findByEmail(dto.email);
  if (existingByEmail) {
    throw AppError.conflict(
      `Email '${dto.email}' đã được sử dụng.`,
      ERROR_CODES.USER_EMAIL_EXISTS,
    );
  }

  // 2. Kiểm tra userCode trùng (nếu cung cấp)
  let userCode = dto.userCode;
  if (userCode) {
    const existingByCode = await repo.findByUserCode(userCode);
    if (existingByCode) {
      throw AppError.conflict(
        `Mã nhân viên '${userCode}' đã tồn tại.`,
        ERROR_CODES.USER_CODE_EXISTS,
      );
    }
  } else {
    // Tự sinh mã NV: EMP001, EMP002...
    userCode = await _generateUserCode();
  }

  // 3. Resolve role IDs từ role codes
  const roleIds = await _resolveRoleIds(dto.roles);

  // 4. Kiểm tra managerId / departmentId / jobTitleId hợp lệ
  await _validateForeignKeys(dto);

  // 5. Tạo user
  const user = await repo.createUser({
    userData: {
      email: dto.email,
      fullName: dto.fullName,
      userCode,
      phoneNumber: dto.phoneNumber ?? null,
      departmentId: dto.departmentId ?? null,
      jobTitleId: dto.jobTitleId ?? null,
      managerId: dto.managerId ?? null,
      hireDate: dto.hireDate ?? null,
      employmentStatus: dto.employmentStatus,
      accountStatus: "PENDING",
      mustChangePassword: true,
      adminNotes: dto.adminNotes ?? null,
      createdByUserId: creatorId,
    },
    roleIds,
  });

  // 6. Gửi email setup account
  if (dto.sendSetupEmail) {
    await _sendSetupEmail(user);
  }

  return user;
}

// ── Update ────────────────────────────────────────────────────

async function updateUser(targetId, dto, requestingUser) {
  const user = await _assertUserExists(targetId);

  // Kiểm tra managerId không phải là chính mình
  if (dto.managerId === targetId) {
    throw AppError.badRequest("Nhân viên không thể là manager của chính mình.");
  }

  // Validate FK nếu có thay đổi
  await _validateForeignKeys(dto);

  return repo.updateUser(targetId, _cleanUndefined(dto));
}

// ── Nhân viên tự cập nhật thông tin của mình ─────────────────

async function updateMe(userId, dto) {
  await _assertUserExists(userId);
  return repo.updateUser(userId, _cleanUndefined(dto));
}

/**
 * Upload avatar → Cloudinary, lưu URL vào user record.
 * @param {string} userId
 * @param {Buffer} fileBuffer
 * @param {string} mimetype
 * @returns {Promise<object>} updated user
 */
async function uploadAvatar(userId, fileBuffer, mimetype) {
  await _assertUserExists(userId);

  const cloudinary = require("../../common/services/cloudinary.service");

  const ext =
    mimetype === "image/png"
      ? "png"
      : mimetype === "image/webp"
        ? "webp"
        : "jpg";
  const publicId = `avatars/${userId}`;

  const { url } = await cloudinary.uploadBuffer(fileBuffer, {
    folder: "erp-innovision",
    publicId,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  return repo.updateUser(userId, { avatarUrl: url });
}

// ── Roles ─────────────────────────────────────────────────────

async function updateUserRoles(targetId, roleCodes, requestingUser) {
  await _assertUserExists(targetId);

  // Không được tự xóa role ADMIN của chính mình (anti-lockout)
  if (
    targetId === requestingUser.id &&
    requestingUser.roles.includes(ROLES.ADMIN) &&
    !roleCodes.includes(ROLES.ADMIN)
  ) {
    throw AppError.forbidden(
      "Bạn không thể tự xóa quyền ADMIN của chính mình.",
    );
  }

  const roleIds = await _resolveRoleIds(roleCodes);
  return repo.replaceUserRoles(targetId, roleIds);
}

// ── Account Status ────────────────────────────────────────────

async function updateAccountStatus(targetId, accountStatus, requestingUser) {
  await _assertUserExists(targetId);

  // Không được tự DISABLE/LOCK chính mình
  if (targetId === requestingUser.id && accountStatus !== "ACTIVE") {
    throw AppError.forbidden(
      "Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản của mình.",
    );
  }

  await repo.updateAccountStatus(targetId, accountStatus);

  // Nếu DISABLE → thu hồi tất cả session
  if (accountStatus === "DISABLED") {
    await prisma.userSession.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ✅ Trả về user đã cập nhật để frontend có thể setUser()
  return repo.findById(targetId);
}

// ── Terminate ─────────────────────────────────────────────────

async function terminateUser(targetId, dto, requestingUser) {
  const user = await _assertUserExists(targetId);

  if (user.employmentStatus === "TERMINATED") {
    throw AppError.badRequest("Nhân viên này đã ở trạng thái nghỉ việc.");
  }

  if (targetId === requestingUser.id) {
    throw AppError.forbidden("Bạn không thể tự cho chính mình nghỉ việc.");
  }

  return repo.terminateUser({
    userId: targetId,
    terminatedAt: dto.terminatedAt,
    terminationReason: dto.terminationReason ?? null,
    revokeAccess: dto.revokeAccess,
  });
}

// ── Resend setup email ────────────────────────────────────────

async function resendSetupEmail(targetId) {
  const user = await _assertUserExists(targetId);

  if (user.accountStatus !== "PENDING") {
    throw AppError.badRequest(
      "Chỉ có thể gửi lại email cho tài khoản chưa kích hoạt (PENDING).",
    );
  }

  await _sendSetupEmail(user);
}

// ── Profile ───────────────────────────────────────────────────

/**
 * Lấy profile.
 * - Bản thân + HR/Admin: xem đầy đủ
 * - Người khác: throw 403
 */
async function getProfile(targetId, requestingUser) {
  _assertCanViewProfile(targetId, requestingUser);
  await _assertUserExists(targetId);

  const profile = await repo.findProfile(targetId);
  return profile;
}

/**
 * Cập nhật profile.
 * - Bản thân: cập nhật được
 * - HR/Admin: cập nhật được
 * - Người khác: 403
 */
async function updateProfile(targetId, dto, requestingUser) {
  _assertCanViewProfile(targetId, requestingUser);
  await _assertUserExists(targetId);

  return repo.upsertProfile(targetId, dto);
}

// ── Work Shifts ───────────────────────────────────────────────

/**
 * Lấy lịch sử ca làm việc của 1 nhân viên.
 * - HR/Admin: xem của bất kỳ ai
 * - Bản thân: xem của mình
 * - Người khác: 403
 */
async function getUserWorkShifts(targetId, requestingUser) {
  _assertCanViewProfile(targetId, requestingUser);
  await _assertUserExists(targetId);
  return repo.findWorkShifts(targetId);
}

// ── Audit Logs ────────────────────────────────────────────────

/**
 * Lấy audit logs liên quan đến 1 nhân viên.
 * Chỉ HR/Admin mới được xem — nhân viên không tự xem nhật ký của mình.
 */
async function getUserAuditLogs(targetId, requestingUser, filters) {
  _assertHrOrAdmin(requestingUser);
  await _assertUserExists(targetId);
  return repo.findAuditLogs(targetId, filters);
}

function _assertHrOrAdmin(requestingUser) {
  const isHrOrAdmin = requestingUser.roles.some((r) =>
    [ROLES.ADMIN, ROLES.HR].includes(r),
  );
  if (!isHrOrAdmin) {
    throw AppError.forbidden("Chỉ HR/Admin mới có thể xem nhật ký hoạt động.");
  }
}

// ── Roles list ────────────────────────────────────────────────

async function listRoles() {
  return repo.findAllRoles();
}

// ── Stats ─────────────────────────────────────────────────────

async function getUserStats() {
  return repo.getUserStats();
}

// ── Private helpers ───────────────────────────────────────────

async function _assertUserExists(userId) {
  const user = await repo.findById(userId);
  if (!user) {
    throw AppError.notFound(
      "Không tìm thấy nhân viên.",
      ERROR_CODES.USER_NOT_FOUND,
    );
  }
  return user;
}

function _assertCanViewProfile(targetId, requestingUser) {
  const isHrOrAdmin = requestingUser.roles.some((r) =>
    [ROLES.ADMIN, ROLES.HR].includes(r),
  );
  const isSelf = targetId === requestingUser.id;
  if (!isHrOrAdmin && !isSelf) {
    throw AppError.forbidden("Bạn không có quyền xem thông tin profile này.");
  }
}

async function _resolveRoleIds(roleCodes) {
  const roles = await repo.findRolesByCodes(roleCodes);
  if (roles.length !== roleCodes.length) {
    const foundCodes = roles.map((r) => r.code);
    const missing = roleCodes.filter((c) => !foundCodes.includes(c));
    throw AppError.badRequest(`Role không tồn tại: ${missing.join(", ")}`);
  }
  return roles.map((r) => r.id);
}

async function _validateForeignKeys(dto) {
  if (dto.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept) throw AppError.badRequest("Phòng ban không tồn tại.");
    if (!dept.isActive)
      throw AppError.badRequest("Phòng ban đã bị vô hiệu hóa.");
  }
  if (dto.jobTitleId) {
    const jt = await prisma.jobTitle.findUnique({
      where: { id: dto.jobTitleId },
    });
    if (!jt) throw AppError.badRequest("Chức danh không tồn tại.");
  }
  if (dto.managerId) {
    const mgr = await repo.findById(dto.managerId);
    if (!mgr) throw AppError.badRequest("Manager không tồn tại.");
    if (mgr.employmentStatus === "TERMINATED") {
      throw AppError.badRequest(
        "Không thể gán người đã nghỉ việc làm manager.",
      );
    }
  }
}

async function _generateUserCode() {
  const last = await repo.getLastUserCode();
  const lastNum = last ? parseInt(last.replace("EMP", ""), 10) : 0;
  const next = lastNum + 1;
  return `EMP${String(next).padStart(3, "0")}`;
}

async function _sendSetupEmail(user) {
  // Tạo AuthToken cho account setup
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.AUTH_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000,
  );

  // Xóa token cũ chưa dùng
  await prisma.authToken.deleteMany({
    where: { userId: user.id, tokenType: "ACCOUNT_SETUP", usedAt: null },
  });

  await prisma.authToken.create({
    data: {
      userId: user.id,
      tokenType: "ACCOUNT_SETUP",
      tokenHash,
      expiresAt,
    },
  });

  const setupUrl = `${env.FRONTEND_URL}/setup-account?token=${rawToken}`;

  sendAccountSetupEmail({
    to: user.email,
    fullName: user.fullName,
    setupUrl,
  }).catch((err) => console.error("[MAIL] Lỗi gửi email setup:", err));
}

/** Loại bỏ các key có giá trị undefined để Prisma không ghi undefined */
function _cleanUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

module.exports = {
  listUsers,
  getMyTeam,
  isSubordinateOf,
  getUserById,
  createUser,
  updateUser,
  updateMe,
  uploadAvatar,
  updateUserRoles,
  updateAccountStatus,
  terminateUser,
  resendSetupEmail,
  getProfile,
  updateProfile,
  listRoles,
  getUserStats,
  getUserWorkShifts,
  getUserAuditLogs,
};
