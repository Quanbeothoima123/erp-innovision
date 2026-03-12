"use strict";

const { Router } = require("express");
const controller = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");
const {
  loginRateLimit,
  forgotPasswordRateLimit,
} = require("../../middlewares/rateLimit.middleware");
const {
  loginSchema,
  refreshTokenSchema,
  setupAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("./auth.validation");

const router = Router();

// ── Public routes (không cần auth) ──────────────────────────

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập → trả về accessToken + refreshToken
 * @access  Public
 */
router.post("/login", loginRateLimit, validate(loginSchema), controller.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Cấp accessToken mới từ refreshToken (rotate)
 * @access  Public
 */
router.post("/refresh", validate(refreshTokenSchema), controller.refreshToken);

/**
 * @route   POST /api/auth/setup-account
 * @desc    Kích hoạt tài khoản lần đầu (nhân viên mới nhận email)
 * @access  Public (có token từ email)
 */
router.post(
  "/setup-account",
  validate(setupAccountSchema),
  controller.setupAccount,
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Gửi email chứa link đặt lại mật khẩu
 * @access  Public
 */
router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Đặt lại mật khẩu bằng token từ email
 * @access  Public (có token từ email)
 */
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  controller.resetPassword,
);

// ── Protected routes (cần auth) ──────────────────────────────

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin người dùng đang đăng nhập
 * @access  Private
 */
router.get("/me", authenticate, controller.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất thiết bị hiện tại
 * @access  Private
 */
router.post("/logout", authenticate, controller.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Đăng xuất tất cả thiết bị
 * @access  Private
 */
router.post("/logout-all", authenticate, controller.logoutAll);

/**
 * @route   POST /api/auth/change-password
 * @desc    Đổi mật khẩu khi đã đăng nhập
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword,
);

module.exports = router;
