"use strict";

require("dotenv").config();

/**
 * Validate và export tất cả biến môi trường.
 * Crash sớm nếu thiếu biến bắt buộc.
 */
function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Thiếu biến môi trường bắt buộc: ${key}`);
  }
  return value;
}

const env = {
  // ── App ─────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  IS_PRODUCTION: process.env.NODE_ENV === "production",

  // ── Database ─────────────────────────────────────────────
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // ── JWT ──────────────────────────────────────────────────
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // ── Mail ─────────────────────────────────────────────────
  MAIL_HOST: process.env.MAIL_HOST || "smtp.gmail.com",
  MAIL_PORT: parseInt(process.env.MAIL_PORT || "587", 10),
  MAIL_USER: process.env.MAIL_USER || "",
  MAIL_PASS: process.env.MAIL_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "noreply@company.com",

  // ── Security ─────────────────────────────────────────────
  MAX_FAILED_LOGIN: parseInt(process.env.MAX_FAILED_LOGIN || "5", 10),
  LOCK_DURATION_MINUTES: parseInt(
    process.env.LOCK_DURATION_MINUTES || "30",
    10,
  ),
  AUTH_TOKEN_EXPIRES_HOURS: parseInt(
    process.env.AUTH_TOKEN_EXPIRES_HOURS || "24",
    10,
  ),

  // ── Upload ───────────────────────────────────────────────
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10),

  // ── Cloudinary ───────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",

  // ── Telegram Bot ─────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
};

module.exports = { env };
