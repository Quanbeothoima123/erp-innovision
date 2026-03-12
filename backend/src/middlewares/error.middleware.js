"use strict";

const { AppError } = require("../common/errors/AppError");
const { ERROR_CODES } = require("../common/errors/errorCodes");
const { env } = require("../config/env");

/**
 * Global error handler — phải đặt CUỐI CÙNG trong app.js (sau tất cả routes)
 * Express nhận diện error middleware qua 4 tham số: (err, req, res, next)
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  // ── Prisma errors ──────────────────────────────────────
  if (err.code === "P2002") {
    // Unique constraint violation
    const field = err.meta?.target?.[0] ?? "field";
    return res.status(409).json({
      success: false,
      errorCode: ERROR_CODES.CONFLICT,
      message: `Giá trị của '${field}' đã tồn tại trong hệ thống.`,
      data: null,
    });
  }

  if (err.code === "P2025") {
    // Record not found (prisma update/delete trên bản ghi không tồn tại)
    return res.status(404).json({
      success: false,
      errorCode: ERROR_CODES.NOT_FOUND,
      message: "Không tìm thấy bản ghi.",
      data: null,
    });
  }

  // ── JWT errors ─────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      errorCode: ERROR_CODES.AUTH_TOKEN_EXPIRED,
      message: "Token đã hết hạn.",
      data: null,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      errorCode: ERROR_CODES.AUTH_TOKEN_INVALID,
      message: "Token không hợp lệ.",
      data: null,
    });
  }

  // ── AppError (lỗi nghiệp vụ đã biết) ──────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message,
      data: err.data ?? null,
    });
  }

  // ── Unexpected error ───────────────────────────────────
  console.error("[ERROR]", err);

  return res.status(500).json({
    success: false,
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    message: env.IS_PRODUCTION ? "Đã xảy ra lỗi hệ thống." : err.message,
    data: env.IS_PRODUCTION ? null : { stack: err.stack },
  });
}

module.exports = { errorMiddleware };
