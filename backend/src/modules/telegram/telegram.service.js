"use strict";

const jwt = require("jsonwebtoken");
const repo = require("./telegram.repository");
const telegramBot = require("../../common/services/telegram.service");
const { env } = require("../../config/env");
const { AppError } = require("../../common/errors/AppError");
const { prisma } = require("../../config/db");

const CONNECT_TOKEN_EXPIRES = "15m"; // token kết nối hết hạn sau 15 phút

// ─── Personal connect ─────────────────────────────────────────

/**
 * Tạo deep link cho user bấm "Kết nối Telegram".
 * Link có dạng: https://t.me/YOUR_BOT?start=<jwt>
 */
function generateConnectLink(userId) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_BOT_USERNAME) {
    throw AppError.badRequest("Telegram bot chưa được cấu hình.");
  }
  // Encode userId vào JWT, bot sẽ gửi lại để backend verify
  const token = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: CONNECT_TOKEN_EXPIRES,
  });
  // Telegram start payload không được chứa '.' và '+', dùng base64url
  const payload = Buffer.from(token).toString("base64url");
  return {
    connectUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${payload}`,
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
    const payload = text.split(" ")[1];
    if (!payload) {
      await telegramBot.sendMessage(
        chatId,
        "⚠️ Link kết nối không hợp lệ. Vui lòng thử lại từ hệ thống.",
      );
      return;
    }

    try {
      const rawToken = Buffer.from(payload, "base64url").toString("utf8");
      const decoded = jwt.verify(rawToken, env.JWT_ACCESS_SECRET);
      const { userId } = decoded;

      await repo.linkUserChatId(userId, chatId);

      await telegramBot.sendMessage(
        chatId,
        `✅ Xin chào <b>${username}</b>! Tài khoản của bạn đã được kết nối thành công.\n\n` +
          `Từ bây giờ bạn sẽ nhận thông báo từ hệ thống tại đây. 🎉\n\n` +
          `Bạn có thể tuỳ chỉnh loại thông báo muốn nhận trong phần cài đặt của ứng dụng.`,
      );
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      await telegramBot.sendMessage(
        chatId,
        isExpired
          ? "⏰ Link kết nối đã hết hạn. Vui lòng tạo link mới từ hệ thống."
          : "❌ Link kết nối không hợp lệ.",
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
