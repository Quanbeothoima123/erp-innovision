"use strict";

const rateLimit = require("express-rate-limit");

/**
 * Rate limit cho endpoint đăng nhập — bảo vệ brute force.
 * 10 lần / 15 phút per IP
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.",
    data: null,
  },
  // Key theo IP + email để chính xác hơn (nếu có body)
  keyGenerator: (req) => {
    const email = req.body?.email ?? "";
    return `${req.ip}_${email}`;
  },
});

/**
 * Rate limit chung cho API — 200 request / phút per IP
 */
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    data: null,
  },
});

/**
 * Rate limit cho forgot password — 5 lần / 15 phút per IP
 */
const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message:
      "Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 15 phút.",
    data: null,
  },
});

module.exports = { loginRateLimit, apiRateLimit, forgotPasswordRateLimit };
