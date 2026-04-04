"use strict";

const { env } = require("../../config/env");

const TELEGRAM_API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

/**
 * Gửi text message tới một chat_id cụ thể.
 * Dùng parse_mode HTML để format được bold, italic, link.
 */
async function sendMessage(chatId, text, opts = {}) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn("[TelegramService] TELEGRAM_BOT_TOKEN chưa được cấu hình.");
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...opts,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[TelegramService] sendMessage failed:", data.description);
    }
    return data;
  } catch (err) {
    console.error("[TelegramService] sendMessage error:", err.message);
  }
}

/**
 * Gửi thông báo tới một user cá nhân.
 * @param {string} chatId      - telegram_chat_id của user
 * @param {string} title       - Tiêu đề thông báo
 * @param {string} message     - Nội dung
 * @param {string} [actionUrl] - URL hành động (tuỳ chọn)
 */
async function sendPersonalNotification(chatId, { title, message, actionUrl }) {
  const appUrl = env.FRONTEND_URL || "";
  let text = `🔔 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  if (actionUrl) {
    text += `\n\n<a href="${appUrl}${actionUrl}">👉 Xem chi tiết</a>`;
  }
  return sendMessage(chatId, text);
}

/**
 * Gửi thông báo broadcast tới group chat.
 * @param {string} groupChatId
 * @param {string} title
 * @param {string} message
 */
async function sendGroupNotification(groupChatId, { title, message }) {
  const text = `📢 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  return sendMessage(groupChatId, text);
}

/**
 * Gọi setWebhook để đăng ký URL nhận update từ Telegram.
 * Chạy 1 lần khi khởi động server.
 */
async function setWebhook(webhookUrl) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log("[TelegramService] Webhook set successfully:", webhookUrl);
    } else {
      console.error("[TelegramService] setWebhook failed:", data.description);
    }
  } catch (err) {
    console.error("[TelegramService] setWebhook error:", err.message);
  }
}

// Escape HTML để tránh lỗi parse_mode HTML
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  sendMessage,
  sendPersonalNotification,
  sendGroupNotification,
  setWebhook,
};
