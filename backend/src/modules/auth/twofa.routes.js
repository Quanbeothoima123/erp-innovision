"use strict";

/**
 * twofa.routes.js
 *
 * Mount vào auth.routes.js:
 *   const twofaRouter = require("./twofa.routes");
 *   router.use("/2fa", twofaRouter);
 *
 * Kết quả:
 *   GET    /api/auth/2fa/status        — trạng thái 2FA
 *   POST   /api/auth/2fa/setup         — bước 1: tạo QR
 *   POST   /api/auth/2fa/enable        — bước 2: xác nhận TOTP → bật
 *   POST   /api/auth/2fa/disable       — tắt 2FA
 *   POST   /api/auth/2fa/reset         — reset secret (QR bị lộ)
 *   POST   /api/auth/2fa/verify-login  — bước 2 login (public, dùng twoFactorToken)
 */

const { Router } = require("express");
const ctrl = require("./twofa.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");
const { loginRateLimit } = require("../../middlewares/rateLimit.middleware");
const {
  enableTwoFactorSchema,
  disableTwoFactorSchema,
  resetTwoFactorSchema,
  verifyLoginSchema,
} = require("./twofa.validation");

const router = Router();

// ── Public — không cần auth (dùng twoFactorToken thay thế) ───

/**
 * @route  POST /api/auth/2fa/verify-login
 * @desc   Bước 2 đăng nhập: xác thực TOTP → trả full tokens
 * @access Public (rate-limited)
 */
router.post(
  "/verify-login",
  loginRateLimit,
  validate(verifyLoginSchema),
  ctrl.verifyLogin,
);

// ── Protected — cần đăng nhập ────────────────────────────────

router.use(authenticate);

/**
 * @route  GET /api/auth/2fa/status
 * @desc   Lấy trạng thái 2FA: { enabled, enabledAt, hasPending }
 * @access Private
 */
router.get("/status", ctrl.getStatus);

/**
 * @route  POST /api/auth/2fa/setup
 * @desc   Bước 1 bật 2FA: sinh secret tạm, trả QR code + manualKey
 * @access Private
 */
router.post("/setup", ctrl.setup);

/**
 * @route  POST /api/auth/2fa/enable
 * @desc   Bước 2 bật 2FA: xác nhận TOTP → kích hoạt chính thức
 * @access Private
 */
router.post("/enable", validate(enableTwoFactorSchema), ctrl.enable);

/**
 * @route  POST /api/auth/2fa/disable
 * @desc   Tắt 2FA (cần mật khẩu + TOTP hiện tại)
 * @access Private
 */
router.post("/disable", validate(disableTwoFactorSchema), ctrl.disable);

/**
 * @route  POST /api/auth/2fa/reset
 * @desc   Reset secret 2FA (QR bị lộ) — cần mật khẩu, sinh QR mới
 * @access Private
 */
router.post("/reset", validate(resetTwoFactorSchema), ctrl.reset);

module.exports = router;
