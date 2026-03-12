"use strict";

const { z } = require("zod");

// ── Password rules ───────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(100, "Mật khẩu không được quá 100 ký tự")
  .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
  .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
  .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
  .regex(/[^A-Za-z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt");

// ── POST /auth/login ─────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(1, "Mật khẩu là bắt buộc"),
});

// ── POST /auth/refresh ───────────────────────────────────────
const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: "Refresh token là bắt buộc" })
    .min(1, "Refresh token không được để trống"),
});

// ── POST /auth/setup-account ─────────────────────────────────
const setupAccountSchema = z
  .object({
    token: z.string({ required_error: "Token là bắt buộc" }).min(1),
    password: passwordSchema,
    confirmPassword: z.string({
      required_error: "Xác nhận mật khẩu là bắt buộc",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

// ── POST /auth/forgot-password ───────────────────────────────
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .email("Email không hợp lệ")
    .toLowerCase()
    .trim(),
});

// ── POST /auth/reset-password ────────────────────────────────
const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: "Token là bắt buộc" }).min(1),
    password: passwordSchema,
    confirmPassword: z.string({
      required_error: "Xác nhận mật khẩu là bắt buộc",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

// ── POST /auth/change-password ───────────────────────────────
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Mật khẩu hiện tại là bắt buộc" })
      .min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: "Xác nhận mật khẩu là bắt buộc",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
    path: ["newPassword"],
  });

// ── POST /auth/logout-all ────────────────────────────────────
const logoutAllSchema = z.object({}).optional();

module.exports = {
  loginSchema,
  refreshTokenSchema,
  setupAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
