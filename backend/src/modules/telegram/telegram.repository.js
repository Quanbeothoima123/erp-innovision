"use strict";

const { prisma } = require("../../config/db");

/** Lưu telegram_chat_id cho user sau khi connect bot */
async function linkUserChatId(userId, chatId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: chatId,
      telegramEnabled: true,
      telegramLinkedAt: new Date(),
      // Tạo setting mặc định nếu chưa có
      telegramSettings: {
        upsert: {
          create: {},
          update: {},
        },
      },
    },
  });
}

/** Huỷ liên kết Telegram */
async function unlinkUserChatId(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: null,
      telegramEnabled: false,
      telegramLinkedAt: null,
    },
  });
}

/** Lấy settings telegram của user */
async function getSettings(userId) {
  return prisma.userTelegramSetting.findUnique({ where: { userId } });
}

/** Upsert settings telegram của user */
async function upsertSettings(userId, data) {
  return prisma.userTelegramSetting.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

/** Lấy user kèm telegram info theo userId */
async function getUserTelegramInfo(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramChatId: true,
      telegramEnabled: true,
      telegramSettings: true,
    },
  });
}

/** Lấy tất cả group configs đang active */
async function getActiveGroups() {
  return prisma.telegramGroupConfig.findMany({ where: { isActive: true } });
}

/** Lấy toàn bộ group config (admin) */
async function listGroups() {
  return prisma.telegramGroupConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/** Tạo group config mới */
async function createGroup(data) {
  return prisma.telegramGroupConfig.create({ data });
}

/** Cập nhật group config */
async function updateGroup(id, data) {
  return prisma.telegramGroupConfig.update({ where: { id }, data });
}

/** Xoá group config */
async function deleteGroup(id) {
  return prisma.telegramGroupConfig.delete({ where: { id } });
}

module.exports = {
  linkUserChatId,
  unlinkUserChatId,
  getSettings,
  upsertSettings,
  getUserTelegramInfo,
  getActiveGroups,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
