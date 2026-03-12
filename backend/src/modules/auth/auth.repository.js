"use strict";

const { prisma } = require("../../config/db");

// ── User queries ─────────────────────────────────────────────

/**
 * Tìm user bằng email, kèm theo roles.
 * Dùng khi đăng nhập.
 */
async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });
}

/**
 * Tìm user bằng ID, kèm roles.
 */
async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: { role: true },
      },
      department: { select: { id: true, name: true } },
      jobTitle: { select: { id: true, name: true } },
    },
  });
}

/**
 * Cập nhật thông tin đăng nhập sau khi login thành công.
 * Reset failedLoginCount, ghi lastLoginAt.
 */
async function updateLoginSuccess(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Tăng failedLoginCount.
 * Nếu đủ ngưỡng, lock tài khoản thêm lockedUntil.
 */
async function incrementFailedLogin(userId, maxAttempts, lockDurationMinutes) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginCount: true },
  });

  const newCount = (user?.failedLoginCount ?? 0) + 1;
  const shouldLock = newCount >= maxAttempts;

  return prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: newCount,
      accountStatus: shouldLock ? "LOCKED" : undefined,
      lockedUntil: shouldLock
        ? new Date(Date.now() + lockDurationMinutes * 60 * 1000)
        : undefined,
    },
  });
}

/**
 * Cập nhật password hash và trạng thái buộc đổi mật khẩu.
 */
async function updatePassword(
  userId,
  passwordHash,
  mustChangePassword = false,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword },
  });
}

/**
 * Kích hoạt tài khoản sau khi setup lần đầu.
 */
async function activateAccount(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      failedLoginCount: 0,
    },
  });
}

// ── UserSession queries ──────────────────────────────────────

/**
 * Tạo session mới (lưu refresh token đã hash).
 */
async function createSession({
  userId,
  refreshTokenHash,
  ipAddress,
  userAgent,
  expiresAt,
}) {
  return prisma.userSession.create({
    data: { userId, refreshTokenHash, ipAddress, userAgent, expiresAt },
  });
}

/**
 * Tìm session còn hợp lệ bằng refresh token hash.
 */
async function findValidSession(refreshTokenHash) {
  return prisma.userSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
        },
      },
    },
  });
}

/**
 * Thu hồi 1 session (logout).
 */
async function revokeSession(sessionId) {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Thu hồi toàn bộ session của user (logout all devices).
 * @param {string} userId
 * @param {string} [exceptSessionId] - Giữ lại session hiện tại (nếu cần)
 */
async function revokeAllSessions(userId, exceptSessionId = null) {
  return prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * Cập nhật refresh token hash sau khi rotate (bảo mật hơn).
 */
async function rotateSessionToken(
  sessionId,
  newRefreshTokenHash,
  newExpiresAt,
) {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
    },
  });
}

// ── AuthToken queries ────────────────────────────────────────

/**
 * Tạo AuthToken cho account setup hoặc password reset.
 * Xóa token cũ cùng loại của user trước khi tạo mới.
 */
async function createAuthToken({ userId, tokenType, tokenHash, expiresAt }) {
  // Xóa token cũ cùng loại (chưa dùng) của user này
  await prisma.authToken.deleteMany({
    where: { userId, tokenType, usedAt: null },
  });

  return prisma.authToken.create({
    data: { userId, tokenType, tokenHash, expiresAt },
  });
}

/**
 * Tìm AuthToken hợp lệ bằng hash.
 * Token hợp lệ = chưa dùng, chưa hết hạn.
 */
async function findValidAuthToken(tokenHash, tokenType) {
  return prisma.authToken.findFirst({
    where: {
      tokenHash,
      tokenType,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
        },
      },
    },
  });
}

/**
 * Đánh dấu AuthToken đã dùng.
 */
async function markAuthTokenUsed(tokenId) {
  return prisma.authToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

module.exports = {
  // User
  findUserByEmail,
  findUserById,
  updateLoginSuccess,
  incrementFailedLogin,
  updatePassword,
  activateAccount,
  // Session
  createSession,
  findValidSession,
  revokeSession,
  revokeAllSessions,
  rotateSessionToken,
  // AuthToken
  createAuthToken,
  findValidAuthToken,
  markAuthTokenUsed,
};
