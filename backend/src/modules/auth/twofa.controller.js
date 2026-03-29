"use strict";

/**
 * twofa.controller.js
 * Xử lý HTTP cho các endpoint 2FA.
 */

const twofaService = require("./twofa.service");
const {
  successResponse,
  noContentResponse,
} = require("../../common/utils/response.util");

// ── GET /api/auth/2fa/status ─────────────────────────────────

/**
 * Lấy trạng thái 2FA của người dùng hiện tại.
 * Response: { enabled, enabledAt, hasPending }
 */
async function getStatus(req, res, next) {
  try {
    const status = await twofaService.getTwoFactorStatus(req.user.id);
    return successResponse(res, status, "Lấy trạng thái 2FA thành công");
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/2fa/setup ─────────────────────────────────

/**
 * Bước 1 bật 2FA: tạo secret tạm + trả QR code.
 * Frontend hiển thị QR → user quét bằng Google Authenticator.
 * Response: { qrCodeDataUrl, manualKey }
 */
async function setup(req, res, next) {
  try {
    const result = await twofaService.setupTwoFactor(req.user.id);
    return successResponse(res, result, "QR code đã được tạo. Quét bằng ứng dụng xác thực.");
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/2fa/enable ────────────────────────────────

/**
 * Bước 2 bật 2FA: user nhập mã TOTP từ app để xác nhận.
 * Nếu đúng → bật 2FA chính thức.
 * Body: { totpCode }
 */
async function enable(req, res, next) {
  try {
    const { totpCode } = req.body;
    await twofaService.enableTwoFactor(req.user.id, totpCode);
    return noContentResponse(res, "Xác thực 2 lớp đã được bật thành công.");
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/2fa/disable ───────────────────────────────

/**
 * Tắt 2FA — yêu cầu mật khẩu + mã TOTP hiện tại.
 * Body: { password, totpCode }
 */
async function disable(req, res, next) {
  try {
    const { password, totpCode } = req.body;
    await twofaService.disableTwoFactor(req.user.id, password, totpCode);
    return noContentResponse(res, "Xác thực 2 lớp đã được tắt.");
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/2fa/reset ─────────────────────────────────

/**
 * Reset secret (trường hợp QR bị lộ) — yêu cầu mật khẩu.
 * Tắt 2FA cũ ngay lập tức, sinh QR mới chờ xác nhận lại.
 * Body: { password }
 * Response: { qrCodeDataUrl, manualKey }
 */
async function reset(req, res, next) {
  try {
    const { password } = req.body;
    const result = await twofaService.resetTwoFactor(req.user.id, password);
    return successResponse(
      res,
      result,
      "Mã bảo mật đã được tạo lại. Quét QR mới và xác nhận để kích hoạt lại.",
    );
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/2fa/verify-login ─────────────────────────

/**
 * Bước 2 của login khi 2FA bật.
 * User nhập mã TOTP + twoFactorToken nhận từ bước 1 đăng nhập.
 * Nếu đúng → trả accessToken + refreshToken đầy đủ.
 * Body: { twoFactorToken, totpCode }
 */
async function verifyLogin(req, res, next) {
  try {
    const { twoFactorToken, totpCode } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await twofaService.verifyLoginTwoFactor(
      twoFactorToken,
      totpCode,
      ipAddress,
      userAgent,
    );

    return successResponse(res, result, "Xác thực 2 lớp thành công. Đăng nhập hoàn tất.");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  setup,
  enable,
  disable,
  reset,
  verifyLogin,
};
