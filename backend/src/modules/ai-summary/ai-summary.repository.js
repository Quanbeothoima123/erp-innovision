"use strict";

const { prisma } = require("../../config/db");
const crypto = require("crypto");

/** Tạo SHA-256 hash từ object data để phát hiện thay đổi */
function hashData(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/** Tạo periodKey theo loại câu hỏi */
function buildPeriodKey(questionType) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  // Tuần theo ISO (W01-W53)
  const startOfYear = new Date(y, 0, 1);
  const weekNum = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  const ww = String(weekNum).padStart(2, "0");

  const map = {
    TASKS_TODAY: `${y}-${m}-${d}`,
    TASKS_THIS_WEEK: `${y}-W${ww}`,
    TASKS_THIS_MONTH: `${y}-${m}`,
    TASKS_COMPLETED: `${y}-${m}`,
    TASKS_NEAR_DEADLINE: `${y}-${m}-${d}`,
    TASKS_URGENT: `${y}-${m}-${d}`,
    TASKS_OVERDUE: `${y}-${m}-${d}`,
    SALARY_CURRENT_MONTH: `${y}-${m}`,
  };

  return map[questionType] ?? `${y}-${m}-${d}`;
}

/** TTL (giây) cho từng loại câu hỏi */
function getTTLSeconds(questionType) {
  const map = {
    TASKS_TODAY: 30 * 60, // 30 phút
    TASKS_THIS_WEEK: 60 * 60, // 1 giờ
    TASKS_THIS_MONTH: 2 * 60 * 60, // 2 giờ
    TASKS_COMPLETED: 2 * 60 * 60,
    TASKS_NEAR_DEADLINE: 30 * 60,
    TASKS_URGENT: 15 * 60, // 15 phút — hay thay đổi
    TASKS_OVERDUE: 15 * 60,
    SALARY_CURRENT_MONTH: 6 * 60 * 60, // 6 giờ — ít thay đổi
  };
  return map[questionType] ?? 30 * 60;
}

/** Tìm cache hợp lệ cho user + questionType + period hiện tại */
async function findValidCache(userId, questionType, dataHash) {
  const periodKey = buildPeriodKey(questionType);
  const cache = await prisma.aiSummaryCache.findUnique({
    where: {
      userId_questionType_periodKey: { userId, questionType, periodKey },
    },
  });

  if (!cache) return null;
  if (cache.expiresAt < new Date()) return null; // hết TTL
  if (cache.dataHash !== dataHash) return null; // data đã thay đổi

  return cache;
}

/** Upsert cache (tạo mới hoặc overwrite) */
async function upsertCache(userId, questionType, dataHash, answer, tokensUsed) {
  const periodKey = buildPeriodKey(questionType);
  const ttl = getTTLSeconds(questionType);
  const expiresAt = new Date(Date.now() + ttl * 1000);

  return prisma.aiSummaryCache.upsert({
    where: {
      userId_questionType_periodKey: { userId, questionType, periodKey },
    },
    create: {
      userId,
      questionType,
      dataHash,
      periodKey,
      answer,
      tokensUsed,
      expiresAt,
    },
    update: { dataHash, answer, tokensUsed, expiresAt, createdAt: new Date() },
  });
}

/** Xóa cache cũ đã hết hạn (có thể chạy định kỳ) */
async function cleanExpiredCaches() {
  return prisma.aiSummaryCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

module.exports = {
  hashData,
  buildPeriodKey,
  findValidCache,
  upsertCache,
  cleanExpiredCaches,
};
