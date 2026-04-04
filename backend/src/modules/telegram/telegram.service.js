"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const repo = require("./telegram.repository");
const telegramBot = require("../../common/services/telegram.service");
const { env } = require("../../config/env");
const { AppError } = require("../../common/errors/AppError");
const { prisma } = require("../../config/db");

const CONNECT_TOKEN_EXPIRES = "15m"; // token kết nối hết hạn sau 15 phút

// ─── Personal connect ─────────────────────────────────────────

/**
 * Tạo deep link cho user bấm "Kết nối Telegram".
 * Dùng short random token lưu DB thay vì JWT,
 * vì Telegram giới hạn start parameter tối đa 64 ký tự.
 */
async function generateConnectLink(userId) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_BOT_USERNAME) {
    throw AppError.badRequest("Telegram bot chưa được cấu hình.");
  }

  // Tạo random token 32 ký tự hex (an toàn, đủ ngắn cho Telegram)
  const rawToken = crypto.randomBytes(16).toString("hex"); // 32 chars ✅

  // Hash trước khi lưu DB (best practice bảo mật)
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Hết hạn sau 15 phút
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Lưu vào bảng auth_tokens (tái dụng có sẵn)
  await prisma.authToken.create({
    data: {
      userId,
      tokenType: "TELEGRAM_CONNECT",
      tokenHash,
      expiresAt,
    },
  });

  return {
    connectUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${rawToken}`,
    botUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}`,
    rawToken,
    startCommand: `/start ${rawToken}`,
    botUsername: env.TELEGRAM_BOT_USERNAME,
    expiresIn: CONNECT_TOKEN_EXPIRES,
  };
}

/**
 * Xử lý webhook từ Telegram bot.
 * Khi user chat /start <payload>, bot forward về đây.
 */
async function handleWebhook(body) {
  const message = body?.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = message.text || "";
  const username = message.from?.username || message.from?.first_name || "bạn";

  // Chỉ xử lý lệnh /start <payload>
  if (text.startsWith("/start ")) {
    const rawToken = text.split(" ")[1];
    if (!rawToken) {
      await telegramBot.sendMessage(
        chatId,
        "⚠️ Link kết nối không hợp lệ. Vui lòng thử lại từ hệ thống.",
      );
      return;
    }

    // Hash token nhận được để so sánh với DB
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    try {
      // Tra cứu token trong DB
      const authToken = await prisma.authToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, fullName: true } } },
      });

      // Kiểm tra token tồn tại, đúng type, chưa hết hạn, chưa dùng
      if (
        !authToken ||
        authToken.tokenType !== "TELEGRAM_CONNECT" ||
        authToken.expiresAt < new Date() ||
        authToken.usedAt !== null
      ) {
        const isExpired = authToken && authToken.expiresAt < new Date();
        await telegramBot.sendMessage(
          chatId,
          isExpired
            ? "⏰ Link kết nối đã hết hạn. Vui lòng tạo link mới từ hệ thống."
            : "❌ Link kết nối không hợp lệ hoặc đã được sử dụng.",
        );
        return;
      }

      // Đánh dấu token đã dùng (one-time use)
      await prisma.authToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      // Liên kết chat_id với user
      await repo.linkUserChatId(authToken.userId, chatId);

      const displayName = authToken.user?.fullName || username;

      await telegramBot.sendMessage(
        chatId,
        `✅ Xin chào <b>${displayName}</b>! Tài khoản của bạn đã được kết nối thành công.\n\n` +
          `Từ bây giờ bạn sẽ nhận thông báo từ hệ thống tại đây. 🎉\n\n` +
          `Bạn có thể tuỳ chỉnh loại thông báo muốn nhận trong phần cài đặt của ứng dụng.`,
      );
    } catch (err) {
      console.error("[TelegramWebhook] handleWebhook error:", err.message);
      await telegramBot.sendMessage(
        chatId,
        "❌ Đã có lỗi xảy ra. Vui lòng thử lại.",
      );
    }
    return;
  }

  // Lệnh /start không có payload — user tự chat vào bot
  if (text === "/start") {
    await telegramBot.sendMessage(
      chatId,
      "👋 Xin chào! Đây là bot thông báo của hệ thống InnoVision ERP.\n\n" +
        'Để kết nối tài khoản, vui lòng bấm nút <b>"Kết nối Telegram"</b> trong ứng dụng của bạn.',
    );
  }
}

// ─── Settings ─────────────────────────────────────────────────

async function getMyTelegramStatus(userId) {
  const info = await repo.getUserTelegramInfo(userId);
  return {
    isLinked: !!info?.telegramChatId,
    telegramEnabled: info?.telegramEnabled ?? false,
    linkedAt: info?.telegramLinkedAt ?? null,
    settings: info?.telegramSettings ?? null,
  };
}

async function unlinkTelegram(userId) {
  return repo.unlinkUserChatId(userId);
}

async function toggleTelegram(userId, enabled) {
  return prisma.user.update({
    where: { id: userId },
    data: { telegramEnabled: enabled },
  });
}

async function updateSettings(userId, settings) {
  return repo.upsertSettings(userId, settings);
}

// ─── Group management (Admin) ─────────────────────────────────

async function listGroups() {
  return repo.listGroups();
}

async function addGroup(data) {
  return repo.createGroup(data);
}

async function editGroup(id, data) {
  return repo.updateGroup(id, data);
}

async function removeGroup(id) {
  return repo.deleteGroup(id);
}

/**
 * Admin broadcast thông báo tới tất cả group đang active.
 */
async function broadcastToGroups(title, message) {
  const groups = await repo.getActiveGroups();
  const results = await Promise.allSettled(
    groups.map((g) =>
      telegramBot.sendGroupNotification(g.groupChatId, { title, message }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent: groups.length - failed, failed };
}

module.exports = {
  generateConnectLink,
  handleWebhook,
  getMyTelegramStatus,
  unlinkTelegram,
  toggleTelegram,
  updateSettings,
  listGroups,
  addGroup,
  editGroup,
  removeGroup,
  broadcastToGroups,
};
