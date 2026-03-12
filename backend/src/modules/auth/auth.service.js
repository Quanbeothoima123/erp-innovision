"use strict";

const repo = require("./auth.repository");
const { extractRoleCodes } = require("./auth.mapper");
const {
  hashPassword,
  comparePassword,
  generateSecureToken,
  hashToken,
} = require("../../common/utils/hash.util");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
} = require("../../common/utils/token.util");
const {
  sendAccountSetupEmail,
  sendPasswordResetEmail,
} = require("../../common/services/mail.service");
const { AppError } = require("../../common/errors/AppError");
const { ERROR_CODES } = require("../../common/errors/errorCodes");
const { ACCOUNT_STATUS, AUTH_TOKEN_TYPE } = require("../../config/constants");
const { env } = require("../../config/env");

// ── Login ────────────────────────────────────────────────────

/**
 * Xử lý đăng nhập.
 * @returns {{ accessToken, refreshToken, user, mustChangePassword }}
 */
async function login({ email, password, ipAddress, userAgent }) {
  // 1. Tìm user
  const user = await repo.findUserByEmail(email);

  if (!user) {
    throw new AppError(
      "Email hoặc mật khẩu không đúng.",
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
  }

  // 2. Kiểm tra trạng thái tài khoản
  _checkAccountStatus(user);

  // 3. Kiểm tra mật khẩu
  const isPasswordValid = user.passwordHash
    ? await comparePassword(password, user.passwordHash)
    : false;

  if (!isPasswordValid) {
    // Tăng failed login count, có thể lock account
    await repo.incrementFailedLogin(
      user.id,
      env.MAX_FAILED_LOGIN,
      env.LOCK_DURATION_MINUTES,
    );
    throw new AppError(
      "Email hoặc mật khẩu không đúng.",
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
  }

  // 4. Reset failed count + ghi lastLoginAt
  await repo.updateLoginSuccess(user.id);

  // 5. Tạo tokens
  const roleCodes = extractRoleCodes(user.roles);
  const { accessToken, refreshToken, session } = await _createTokenPair(
    user,
    roleCodes,
    ipAddress,
    userAgent,
  );

  return {
    accessToken,
    refreshToken,
    user,
    mustChangePassword: user.mustChangePassword,
  };
}

// ── Refresh Token ────────────────────────────────────────────

/**
 * Cấp access token mới từ refresh token.
 * Rotate refresh token để bảo mật (Refresh Token Rotation).
 */
async function refreshTokens(refreshToken) {
  // 1. Verify JWT refresh token
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(
      "Refresh token không hợp lệ hoặc đã hết hạn.",
      401,
      ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
    );
  }

  // 2. Tìm session trong DB
  const tokenHash = hashToken(refreshToken);
  const session = await repo.findValidSession(tokenHash);

  if (!session) {
    throw new AppError(
      "Phiên đăng nhập không tồn tại hoặc đã hết hạn.",
      401,
      ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
    );
  }

  // 3. Kiểm tra tài khoản vẫn còn hợp lệ
  const user = session.user;
  _checkAccountStatus(user);

  // 4. Rotate: tạo refresh token mới, cập nhật session
  const roleCodes = extractRoleCodes(user.roles);
  const newRefreshToken = generateSecureToken(48);
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = getRefreshTokenExpiresAt();

  await repo.rotateSessionToken(session.id, newRefreshTokenHash, newExpiresAt);

  // 5. Tạo access token mới
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    roles: roleCodes,
    sid: session.id,
  });

  return { accessToken, refreshToken: newRefreshToken, user };
}

// ── Logout ───────────────────────────────────────────────────

/** Logout thiết bị hiện tại */
async function logout(sessionId) {
  if (!sessionId) return;
  await repo.revokeSession(sessionId).catch(() => {}); // Không throw nếu session không tìm thấy
}

/** Logout tất cả thiết bị */
async function logoutAll(userId) {
  await repo.revokeAllSessions(userId);
}

// ── Account Setup (kích hoạt lần đầu) ───────────────────────

/**
 * Validate token và set mật khẩu lần đầu để kích hoạt tài khoản.
 */
async function setupAccount({ token, password }) {
  const tokenHash = hashToken(token);

  const authToken = await repo.findValidAuthToken(
    tokenHash,
    AUTH_TOKEN_TYPE.ACCOUNT_SETUP,
  );

  if (!authToken) {
    throw new AppError(
      "Link kích hoạt không hợp lệ hoặc đã hết hạn.",
      400,
      ERROR_CODES.AUTH_TOKEN_INVALID,
    );
  }

  const user = authToken.user;

  // Kiểm tra account chưa được setup (PENDING)
  if (user.accountStatus !== ACCOUNT_STATUS.PENDING) {
    throw new AppError(
      "Tài khoản đã được kích hoạt trước đó.",
      400,
      ERROR_CODES.AUTH_TOKEN_USED,
    );
  }

  const passwordHash = await hashPassword(password);

  // Kích hoạt tài khoản + đánh dấu token đã dùng (transaction)
  const { prisma } = require("../../config/db");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        failedLoginCount: 0,
      },
    }),
    prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return true;
}

// ── Forgot Password ──────────────────────────────────────────

/**
 * Gửi email chứa link reset mật khẩu.
 * KHÔNG tiết lộ user có tồn tại hay không (anti-enumeration).
 */
async function forgotPassword(email) {
  const user = await repo.findUserByEmail(email);

  // Luôn trả về thành công dù email có tồn tại hay không
  if (!user || user.accountStatus === ACCOUNT_STATUS.DISABLED) {
    return true;
  }

  // Tạo token ngẫu nhiên
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.AUTH_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000,
  );

  await repo.createAuthToken({
    userId: user.id,
    tokenType: AUTH_TOKEN_TYPE.PASSWORD_RESET,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  // Gửi email (không await để không block response)
  sendPasswordResetEmail({
    to: user.email,
    fullName: user.fullName,
    resetUrl,
  }).catch((err) => console.error("[MAIL] Lỗi gửi email reset password:", err));

  return true;
}

// ── Reset Password ───────────────────────────────────────────

async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  const authToken = await repo.findValidAuthToken(
    tokenHash,
    AUTH_TOKEN_TYPE.PASSWORD_RESET,
  );

  if (!authToken) {
    throw new AppError(
      "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      400,
      ERROR_CODES.AUTH_TOKEN_INVALID,
    );
  }

  const user = authToken.user;

  if (user.accountStatus === ACCOUNT_STATUS.DISABLED) {
    throw new AppError(
      "Tài khoản đã bị vô hiệu hóa.",
      403,
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
    );
  }

  const passwordHash = await hashPassword(password);

  const { prisma } = require("../../config/db");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        accountStatus:
          user.accountStatus === ACCOUNT_STATUS.LOCKED ? "ACTIVE" : undefined,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() },
    }),
    // Thu hồi tất cả session cũ khi reset password
    prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return true;
}

// ── Change Password (đã đăng nhập) ──────────────────────────

async function changePassword({
  userId,
  sessionId,
  currentPassword,
  newPassword,
}) {
  const user = await repo.findUserById(userId);

  if (!user) {
    throw AppError.notFound("Không tìm thấy người dùng.");
  }

  // Kiểm tra mật khẩu hiện tại
  const isCurrentValid = user.passwordHash
    ? await comparePassword(currentPassword, user.passwordHash)
    : false;

  if (!isCurrentValid) {
    throw new AppError(
      "Mật khẩu hiện tại không đúng.",
      400,
      ERROR_CODES.AUTH_WRONG_PASSWORD,
    );
  }

  // Kiểm tra mật khẩu mới không trùng mật khẩu cũ
  const isSamePassword = await comparePassword(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new AppError(
      "Mật khẩu mới không được trùng với mật khẩu hiện tại.",
      400,
      ERROR_CODES.AUTH_PASSWORD_SAME,
    );
  }

  const newPasswordHash = await hashPassword(newPassword);

  const { prisma } = require("../../config/db");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash, mustChangePassword: false },
    }),
    // Thu hồi session trên các thiết bị khác
    prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(sessionId ? { id: { not: sessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  return true;
}

// ── Get Me ───────────────────────────────────────────────────

async function getMe(userId) {
  const user = await repo.findUserById(userId);

  if (!user) {
    throw AppError.notFound("Không tìm thấy người dùng.");
  }

  return user;
}

// ── Private helpers ──────────────────────────────────────────

/**
 * Kiểm tra trạng thái tài khoản, throw AppError nếu không được phép đăng nhập.
 */
function _checkAccountStatus(user) {
  switch (user.accountStatus) {
    case ACCOUNT_STATUS.PENDING:
      throw new AppError(
        "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để thiết lập mật khẩu.",
        401,
        ERROR_CODES.AUTH_ACCOUNT_PENDING,
      );

    case ACCOUNT_STATUS.LOCKED: {
      const lockedUntil = user.lockedUntil;
      if (lockedUntil && lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
        throw new AppError(
          `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút.`,
          401,
          ERROR_CODES.AUTH_ACCOUNT_LOCKED,
          { lockedUntil },
        );
      }
      // lockedUntil đã qua → tự unlock (sẽ reset khi login thành công)
      break;
    }

    case ACCOUNT_STATUS.DISABLED:
      throw new AppError(
        "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
        401,
        ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      );

    default:
      break; // ACTIVE → tiếp tục
  }
}

/**
 * Tạo access token + refresh token + lưu session vào DB.
 */
async function _createTokenPair(user, roleCodes, ipAddress, userAgent) {
  const rawRefreshToken = generateSecureToken(48);
  const refreshTokenHash = hashToken(rawRefreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  const session = await repo.createSession({
    userId: user.id,
    refreshTokenHash,
    ipAddress,
    userAgent,
    expiresAt,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    roles: roleCodes,
    sid: session.id,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    sid: session.id,
  });

  // Đồng thời lưu hash JWT refresh token vào session
  // (raw refresh token đã được hash trước khi lưu DB ở createSession)
  // Ghi đè hash bằng hash của JWT refresh token (nhất quán hơn)
  const jwtRefreshHash = hashToken(refreshToken);
  await repo.rotateSessionToken(session.id, jwtRefreshHash, expiresAt);

  return { accessToken, refreshToken, session };
}

module.exports = {
  login,
  refreshTokens,
  logout,
  logoutAll,
  setupAccount,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
