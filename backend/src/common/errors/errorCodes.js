"use strict";

/**
 * Mã lỗi toàn cục — dùng cho AppError và response body.
 * Format: DOMAIN_DESCRIPTION
 */
const ERROR_CODES = Object.freeze({
  // ── Auth ────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS", // Sai email hoặc mật khẩu
  AUTH_ACCOUNT_PENDING: "AUTH_ACCOUNT_PENDING", // Tài khoản chưa kích hoạt
  AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED", // Tài khoản bị khóa tạm thời
  AUTH_ACCOUNT_DISABLED: "AUTH_ACCOUNT_DISABLED", // Tài khoản bị vô hiệu hóa
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID", // Token không hợp lệ
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED", // Token đã hết hạn
  AUTH_TOKEN_USED: "AUTH_TOKEN_USED", // Token đã được sử dụng
  AUTH_REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID", // Refresh token không hợp lệ
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED", // Chưa xác thực
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN", // Không có quyền
  AUTH_MUST_CHANGE_PASSWORD: "AUTH_MUST_CHANGE_PASSWORD", // Phải đổi mật khẩu
  AUTH_WRONG_PASSWORD: "AUTH_WRONG_PASSWORD", // Sai mật khẩu hiện tại
  AUTH_PASSWORD_SAME: "AUTH_PASSWORD_SAME", // Mật khẩu mới trùng mật khẩu cũ

  // ── User ────────────────────────────────────────────────
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  USER_CODE_EXISTS: "USER_CODE_EXISTS",

  // ── Validation ──────────────────────────────────────────
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // ── General ─────────────────────────────────────────────
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
});

module.exports = { ERROR_CODES };
