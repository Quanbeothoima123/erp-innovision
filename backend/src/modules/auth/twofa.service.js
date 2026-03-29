"use strict";

/**
 * twofa.service.js
 *
 * Xử lý toàn bộ nghiệp vụ xác thực 2 lớp (TOTP — Google Authenticator style).
 * Thư viện: speakeasy (TOTP) + qrcode (QR image)
 *
 * Flow bật 2FA:
 *   1. POST /2fa/setup      → tạo secret tạm (twoFactorPending), trả QR
 *   2. POST /2fa/enable     → user nhập mã TOTP, xác nhận → lưu secret thật, bật flag
 *
 * Flow đăng nhập khi 2FA bật:
 *   1. POST /login          → password OK → trả { requiresTwoFactor: true, twoFactorToken }
 *   2. POST /2fa/verify-login → user nhập TOTP + twoFactorToken → trả accessToken + refreshToken
 */

const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { prisma } = require("../../config/db");
const { AppError } = require("../../common/errors/AppError");
const { ERROR_CODES } = require("../../common/errors/errorCodes");
const { comparePassword } = require("../../common/utils/hash.util");
const {
  signTwoFactorToken,
  verifyTwoFactorToken,
} = require("../../common/utils/token.util");
const authRepo = require("./auth.repository");
const { extractRoleCodes } = require("./auth.mapper");

// Tên app hiển thị trong Google Authenticator
const APP_NAME = process.env.APP_NAME || "ERP Innovision";

// ── Bước 1: Khởi tạo setup — sinh secret tạm + trả QR ───────

/**
 * Tạo TOTP secret tạm thời, lưu vào twoFactorPending.
 * Trả về QR code (base64 PNG) để user quét bằng Google Authenticator.
 *
 * @param {string} userId
 * @returns {{ qrCodeDataUrl: string, manualKey: string }}
 */
async function setupTwoFactor(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  if (user.twoFactorEnabled) {
    throw new AppError(
      "Xác thực 2 lớp đã được bật. Hãy reset nếu muốn tạo mã mới.",
      400,
      ERROR_CODES.TWO_FACTOR_ALREADY_ENABLED,
    );
  }

  // Tạo secret ngẫu nhiên (base32, 20 bytes)
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${APP_NAME} (${user.email})`,
    issuer: APP_NAME,
  });

  // Lưu secret tạm (chưa confirmed) vào DB
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorPending: secret.base32 },
  });

  // Sinh QR code dạng base64 PNG
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCodeDataUrl,                  // base64 PNG → frontend hiển thị <img src={...}>
    manualKey: secret.base32,       // fallback: nhập tay vào app
  };
}

// ── Bước 2: Xác nhận mã TOTP → bật 2FA chính thức ───────────

/**
 * Xác nhận mã TOTP từ app, nếu đúng thì bật 2FA.
 *
 * @param {string} userId
 * @param {string} totpCode - 6 chữ số từ Google Authenticator
 */
async function enableTwoFactor(userId, totpCode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorPending: true,
    },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  if (user.twoFactorEnabled) {
    throw new AppError(
      "Xác thực 2 lớp đã được bật rồi.",
      400,
      ERROR_CODES.TWO_FACTOR_ALREADY_ENABLED,
    );
  }

  if (!user.twoFactorPending) {
    throw new AppError(
      "Chưa khởi tạo setup. Vui lòng bắt đầu lại từ bước tạo QR.",
      400,
      ERROR_CODES.TWO_FACTOR_NOT_SETUP,
    );
  }

  // Xác thực mã TOTP với secret tạm
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorPending,
    encoding: "base32",
    token: totpCode,
    window: 1, // cho phép lệch ±30 giây
  });

  if (!isValid) {
    throw new AppError(
      "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.",
      400,
      ERROR_CODES.TWO_FACTOR_INVALID_CODE,
    );
  }

  // Chốt: chuyển pending → secret thật, bật 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: user.twoFactorPending,
      twoFactorPending: null,
      twoFactorEnabledAt: new Date(),
    },
  });
}

// ── Tắt 2FA ──────────────────────────────────────────────────

/**
 * Tắt 2FA — yêu cầu xác nhận mật khẩu + mã TOTP hiện tại.
 *
 * @param {string} userId
 * @param {string} password
 * @param {string} totpCode
 */
async function disableTwoFactor(userId, password, totpCode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  if (!user.twoFactorEnabled) {
    throw new AppError(
      "Xác thực 2 lớp chưa được bật.",
      400,
      ERROR_CODES.TWO_FACTOR_NOT_ENABLED,
    );
  }

  // Xác nhận mật khẩu
  const isPasswordValid = user.passwordHash
    ? await comparePassword(password, user.passwordHash)
    : false;

  if (!isPasswordValid) {
    throw new AppError(
      "Mật khẩu không đúng.",
      400,
      ERROR_CODES.AUTH_WRONG_PASSWORD,
    );
  }

  // Xác nhận mã TOTP
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });

  if (!isValid) {
    throw new AppError(
      "Mã xác thực không đúng hoặc đã hết hạn.",
      400,
      ERROR_CODES.TWO_FACTOR_INVALID_CODE,
    );
  }

  // Tắt 2FA, xóa secret
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorPending: null,
      twoFactorEnabledAt: null,
    },
  });
}

// ── Reset secret (QR bị lộ) ──────────────────────────────────

/**
 * Reset secret 2FA — tạo secret tạm mới, user cần quét lại QR và xác nhận.
 * Yêu cầu mật khẩu để xác nhận danh tính.
 * 2FA sẽ bị TẮT ngay khi reset, chỉ bật lại sau khi xác nhận mã TOTP mới.
 *
 * @param {string} userId
 * @param {string} password
 * @returns {{ qrCodeDataUrl: string, manualKey: string }}
 */
async function resetTwoFactor(userId, password) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      twoFactorEnabled: true,
    },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  if (!user.twoFactorEnabled) {
    throw new AppError(
      "Xác thực 2 lớp chưa được bật. Không thể reset.",
      400,
      ERROR_CODES.TWO_FACTOR_NOT_ENABLED,
    );
  }

  // Xác nhận mật khẩu
  const isPasswordValid = user.passwordHash
    ? await comparePassword(password, user.passwordHash)
    : false;

  if (!isPasswordValid) {
    throw new AppError(
      "Mật khẩu không đúng.",
      400,
      ERROR_CODES.AUTH_WRONG_PASSWORD,
    );
  }

  // Sinh secret mới
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${APP_NAME} (${user.email})`,
    issuer: APP_NAME,
  });

  // Tắt 2FA cũ, lưu secret tạm mới — chờ user xác nhận lại
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorPending: secret.base32,
      twoFactorEnabledAt: null,
    },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCodeDataUrl,
    manualKey: secret.base32,
  };
}

// ── Lấy trạng thái 2FA ───────────────────────────────────────

/**
 * Trả về trạng thái 2FA của user.
 *
 * @param {string} userId
 * @returns {{ enabled: boolean, enabledAt: Date|null, hasPending: boolean }}
 */
async function getTwoFactorStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorEnabledAt: true,
      twoFactorPending: true,
    },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, ERROR_CODES.USER_NOT_FOUND);
  }

  return {
    enabled: user.twoFactorEnabled,
    enabledAt: user.twoFactorEnabledAt ?? null,
    hasPending: !!user.twoFactorPending, // đang trong quá trình setup dở
  };
}

// ── Xác thực TOTP trong flow đăng nhập ──────────────────────

/**
 * Bước 2 của login khi 2FA bật:
 * Xác thực twoFactorToken (JWT ngắn hạn từ bước 1) + mã TOTP từ app.
 * Nếu OK → tạo session thật và trả về accessToken + refreshToken.
 *
 * @param {string} twoFactorToken - JWT ngắn hạn được trả từ /login
 * @param {string} totpCode       - Mã 6 số từ Google Authenticator
 * @param {string} ipAddress
 * @param {string} userAgent
 */
async function verifyLoginTwoFactor(twoFactorToken, totpCode, ipAddress, userAgent) {
  // 1. Verify JWT twoFactorToken
  let payload;
  try {
    payload = verifyTwoFactorToken(twoFactorToken);
  } catch {
    throw new AppError(
      "Token xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      401,
      ERROR_CODES.TWO_FACTOR_TOKEN_INVALID,
    );
  }

  // 2. Lấy user + secret
  const user = await authRepo.findUserById(payload.sub);

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError(
      "Không thể xác thực. Vui lòng đăng nhập lại.",
      401,
      ERROR_CODES.TWO_FACTOR_TOKEN_INVALID,
    );
  }

  // 3. Xác thực mã TOTP
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });

  if (!isValid) {
    throw new AppError(
      "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.",
      400,
      ERROR_CODES.TWO_FACTOR_INVALID_CODE,
    );
  }

  // 4. TOTP OK → tạo session thật (import inline để tránh circular)
  const authService = require("./auth.service");
  return authService.createSessionForUser(user, ipAddress, userAgent);
}

module.exports = {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  resetTwoFactor,
  getTwoFactorStatus,
  verifyLoginTwoFactor,
};
