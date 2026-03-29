"use strict";

const { z } = require("zod");

// ── Bật 2FA: bước 2 — xác nhận mã TOTP sau khi quét QR ──────
const enableTwoFactorSchema = z.object({
  body: z.object({
    totpCode: z
      .string({ required_error: "Mã xác thực là bắt buộc" })
      .length(6, "Mã xác thực phải có đúng 6 chữ số")
      .regex(/^\d{6}$/, "Mã xác thực chỉ gồm chữ số"),
  }),
});

// ── Tắt 2FA — cần mật khẩu + mã TOTP hiện tại ───────────────
const disableTwoFactorSchema = z.object({
  body: z.object({
    password: z
      .string({ required_error: "Mật khẩu là bắt buộc" })
      .min(1, "Mật khẩu không được để trống"),
    totpCode: z
      .string({ required_error: "Mã xác thực là bắt buộc" })
      .length(6, "Mã xác thực phải có đúng 6 chữ số")
      .regex(/^\d{6}$/, "Mã xác thực chỉ gồm chữ số"),
  }),
});

// ── Reset secret — cần mật khẩu (tạo QR mới) ────────────────
const resetTwoFactorSchema = z.object({
  body: z.object({
    password: z
      .string({ required_error: "Mật khẩu là bắt buộc" })
      .min(1, "Mật khẩu không được để trống"),
  }),
});

// ── Xác thực 2FA khi đăng nhập ───────────────────────────────
const verifyLoginSchema = z.object({
  body: z.object({
    twoFactorToken: z
      .string({ required_error: "Token xác thực bước 2 là bắt buộc" })
      .min(1),
    totpCode: z
      .string({ required_error: "Mã xác thực là bắt buộc" })
      .length(6, "Mã xác thực phải có đúng 6 chữ số")
      .regex(/^\d{6}$/, "Mã xác thực chỉ gồm chữ số"),
  }),
});

module.exports = {
  enableTwoFactorSchema,
  disableTwoFactorSchema,
  resetTwoFactorSchema,
  verifyLoginSchema,
};
