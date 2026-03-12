"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { env } = require("./env"); // Đảm bảo file này đã đọc được biến môi trường

// Khởi tạo Adapter với chuỗi kết nối từ biến môi trường
// (Dùng process.env.DATABASE_URL hoặc env.DATABASE_URL tùy cách bạn setup trong file env.js)
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

/** Prisma singleton — tránh tạo nhiều connection khi hot-reload */
const prisma =
  global._prisma ??
  new PrismaClient({
    adapter, // <-- Điểm mấu chốt để fix lỗi PrismaClientConstructorValidationError nằm ở đây!
    log:
      env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global._prisma = prisma;
}

module.exports = { prisma };
