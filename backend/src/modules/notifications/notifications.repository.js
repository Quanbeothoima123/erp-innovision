'use strict';

const { prisma } = require('../../config/db');

const NOTIF_INCLUDE = {
  senderUser: {
    select: { id: true, fullName: true, avatarUrl: true },
  },
};

// ── List & filter ─────────────────────────────────────────────

async function findMany({ userId, isRead, type, fromDate, toDate, page = 1, limit = 30 }) {
  const skip  = (page - 1) * limit;
  const where = {
    recipientUserId: userId,
    ...(isRead !== undefined && { isRead }),
    ...(type   && { type }),
    ...(fromDate && toDate
      ? { createdAt: { gte: fromDate, lte: toDate } }
      : fromDate ? { createdAt: { gte: fromDate } }
      : toDate   ? { createdAt: { lte: toDate } }
      : {}),
  };

  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: NOTIF_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { notifications, total };
}

// ── Unread count ──────────────────────────────────────────────

async function countUnread(userId) {
  return prisma.notification.count({
    where: { recipientUserId: userId, isRead: false },
  });
}

// ── Find single ───────────────────────────────────────────────

async function findById(id) {
  return prisma.notification.findUnique({
    where: { id },
    include: NOTIF_INCLUDE,
  });
}

// ── Create (1 người nhận) ─────────────────────────────────────

async function create(data) {
  return prisma.notification.create({ data, include: NOTIF_INCLUDE });
}

/**
 * Gửi thông báo cho nhiều người nhận cùng lúc.
 * Dùng createMany để tối ưu — không trả về records vì Prisma createMany không support.
 */
async function createMany(records) {
  return prisma.notification.createMany({ data: records, skipDuplicates: true });
}

// ── Mark as read ──────────────────────────────────────────────

async function markAsRead(id, userId) {
  return prisma.notification.updateMany({
    where: { id, recipientUserId: userId },
    data:  { isRead: true, readAt: new Date() },
  });
}

async function markManyAsRead(ids, userId) {
  return prisma.notification.updateMany({
    where: { id: { in: ids }, recipientUserId: userId },
    data:  { isRead: true, readAt: new Date() },
  });
}

async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { recipientUserId: userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
}

// ── Delete ────────────────────────────────────────────────────

async function deleteOne(id, userId) {
  return prisma.notification.deleteMany({
    where: { id, recipientUserId: userId },
  });
}

async function deleteMany(ids, userId) {
  return prisma.notification.deleteMany({
    where: { id: { in: ids }, recipientUserId: userId },
  });
}

async function deleteAllRead(userId) {
  return prisma.notification.deleteMany({
    where: { recipientUserId: userId, isRead: true },
  });
}

// ── Admin queries ─────────────────────────────────────────────

/** Admin xem tất cả thông báo của toàn hệ thống (cho dashboard) */
async function findAll({ type, page = 1, limit = 30 }) {
  const skip  = (page - 1) * limit;
  const where = { ...(type && { type }) };
  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: {
        ...NOTIF_INCLUDE,
        recipientUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return { notifications, total };
}

/** Thống kê theo type — cho báo cáo */
async function getTypeStats() {
  return prisma.notification.groupBy({
    by:    ['type', 'isRead'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
}

module.exports = {
  findMany, countUnread, findById,
  create, createMany,
  markAsRead, markManyAsRead, markAllAsRead,
  deleteOne, deleteMany, deleteAllRead,
  findAll, getTypeStats,
};
