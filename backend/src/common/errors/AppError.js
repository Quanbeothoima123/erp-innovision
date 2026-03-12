"use strict";

const { ERROR_CODES } = require("./errorCodes");

/**
 * Lỗi nghiệp vụ tùy chỉnh — tất cả lỗi có thể dự đoán đều throw AppError.
 * Middleware error.middleware.js sẽ bắt và format response phù hợp.
 */
class AppError extends Error {
  /**
   * @param {string} message    - Thông điệp lỗi (tiếng Việt cho dev/log)
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode  - Mã lỗi từ ERROR_CODES
   * @param {any}    [data]     - Dữ liệu bổ sung (VD: validation errors)
   */
  constructor(
    message,
    statusCode = 500,
    errorCode = ERROR_CODES.INTERNAL_ERROR,
    data = null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.data = data;
    this.isOperational = true; // Lỗi đã biết trước, không crash server

    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory methods thường dùng ──────────────────────────

  static badRequest(message, errorCode = ERROR_CODES.BAD_REQUEST, data = null) {
    return new AppError(message, 400, errorCode, data);
  }

  static unauthorized(
    message = "Chưa xác thực",
    errorCode = ERROR_CODES.AUTH_UNAUTHORIZED,
  ) {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(
    message = "Không có quyền truy cập",
    errorCode = ERROR_CODES.AUTH_FORBIDDEN,
  ) {
    return new AppError(message, 403, errorCode);
  }

  static notFound(
    message = "Không tìm thấy tài nguyên",
    errorCode = ERROR_CODES.NOT_FOUND,
  ) {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message, errorCode = ERROR_CODES.CONFLICT) {
    return new AppError(message, 409, errorCode);
  }

  static internal(message = "Lỗi hệ thống") {
    return new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

module.exports = { AppError };
