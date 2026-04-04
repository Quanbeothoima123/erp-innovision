"use strict";

const app = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/db");
const { setWebhook } = require("./common/services/telegram.service");

const PORT = env.PORT;

async function startServer() {
  try {
    // Kiểm tra kết nối database
    await prisma.$connect();
    console.log("✅ Kết nối database thành công");

    const server = app.listen(PORT, async () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(`📦 Môi trường: ${env.NODE_ENV}`);
      console.log(`🔒 API: http://localhost:${PORT}/api`);

      // Đăng ký Telegram webhook (chỉ chạy nếu đã cấu hình token)
      if (env.TELEGRAM_BOT_TOKEN && env.APP_URL) {
        const webhookUrl = `${env.APP_URL}/api/telegram/webhook`;
        await setWebhook(webhookUrl);
      }
    });

    // ── Graceful shutdown ─────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n⏳ Nhận tín hiệu ${signal}, đang tắt server...`);

      server.close(async () => {
        try {
          await prisma.$disconnect();
          console.log("✅ Đã ngắt kết nối database");
          console.log("👋 Server đã dừng");
          process.exit(0);
        } catch (err) {
          console.error("❌ Lỗi khi ngắt kết nối database:", err);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // ── Unhandled errors ──────────────────────────────────────
    process.on("unhandledRejection", (reason) => {
      console.error("❌ Unhandled Promise Rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err);
      process.exit(1);
    });

    return server;
  } catch (err) {
    console.error("❌ Không thể khởi động server:", err);
    process.exit(1);
  }
}

startServer();
