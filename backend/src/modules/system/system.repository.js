'use strict';

const { prisma } = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTEM CONFIG                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function findAllConfigs() {
  return prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
}

async function findConfigByKey(key) {
  return prisma.systemConfig.findUnique({ where: { key } });
}

async function upsertConfig(key, value, description) {
  return prisma.systemConfig.upsert({
    where:  { key },
    update: { value, ...(description !== undefined && { description }) },
    create: { key, value, description: description ?? null },
  });
}

async function batchUpsertConfigs(configs) {
  return prisma.$transaction(
    configs.map(c =>
      prisma.systemConfig.upsert({
        where:  { key: c.key },
        update: { value: c.value },
        create: { key: c.key, value: c.value },
      }),
    ),
  );
}

async function deleteConfig(key) {
  return prisma.systemConfig.delete({ where: { key } });
}

// ── Helper: lấy value theo key (trả về string|null) ─────────
async function getConfigValue(key, defaultValue = null) {
  const c = await prisma.systemConfig.findUnique({ where: { key } });
  return c?.value ?? defaultValue;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  AUDIT LOG                                               ║
// ╚══════════════════════════════════════════════════════════╝

const AUDIT_INCLUDE = {
  actorUser: { select: { id: true, fullName: true, userCode: true, avatarUrl: true } },
};

async function findManyAuditLogs({
  entityType, actionType, actorUserId, entityId,
  fromDate, toDate, search,
  sortOrder = 'desc', page = 1, limit = 50,
}) {
  const skip  = (page - 1) * limit;
  const where = {
    ...(entityType  && { entityType }),
    ...(actionType  && { actionType }),
    ...(actorUserId && { actorUserId }),
    ...(entityId    && { entityId }),
    ...(fromDate && toDate
      ? { createdAt: { gte: fromDate, lte: toDate } }
      : fromDate ? { createdAt: { gte: fromDate } }
      : toDate   ? { createdAt: { lte: toDate } }
      : {}),
    ...(search && {
      description: { contains: search },
    }),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: AUDIT_INCLUDE,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return { logs, total };
}

async function findAuditLogById(id) {
  return prisma.auditLog.findUnique({ where: { id }, include: AUDIT_INCLUDE });
}

/**
 * Tạo AuditLog — gọi từ service layer bất kỳ module nào
 */
async function createAuditLog({
  entityType, entityId, actionType, actorUserId,
  description, oldValues, newValues, metadata,
  ipAddress, userAgent,
}) {
  return prisma.auditLog.create({
    data: {
      entityType,
      entityId:    entityId ?? 'N/A',
      actionType,
      actorUserId: actorUserId ?? null,
      description: description ?? null,
      oldValues:   oldValues   ?? undefined,
      newValues:   newValues   ?? undefined,
      metadata:    metadata    ?? undefined,
      ipAddress:   ipAddress   ?? null,
      userAgent:   userAgent   ?? null,
    },
  });
}

/** Thống kê audit: top actions, top actors */
async function getAuditStats() {
  const [byAction, byActor, byEntity] = await Promise.all([
    prisma.auditLog.groupBy({
      by:    ['actionType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by:    ['actorUserId'],
      where:  { actorUserId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by:    ['entityType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  // Enrich actor data
  const actorIds  = byActor.map(a => a.actorUserId).filter(Boolean);
  const actorUsers = await prisma.user.findMany({
    where:  { id: { in: actorIds } },
    select: { id: true, fullName: true, userCode: true },
  });
  const actorMap = Object.fromEntries(actorUsers.map(u => [u.id, u]));

  return {
    byAction: byAction.map(a => ({ actionType: a.actionType, count: a._count.id })),
    byActor:  byActor.map(a => ({
      user:  actorMap[a.actorUserId] ?? null,
      count: a._count.id,
    })),
    byEntity: byEntity.map(e => ({ entityType: e.entityType, count: e._count.id })),
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ACCOUNT MANAGEMENT (Admin)                              ║
// ╚══════════════════════════════════════════════════════════╝

const ACCOUNT_INCLUDE = {
  department: { select: { id: true, name: true } },
  jobTitle:   { select: { name: true } },
  roles:      { select: { role: true } },
};

async function findManyAccounts({ search, accountStatus, role, page = 1, limit = 30 }) {
  const skip  = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [
        { fullName: { contains: search } },
        { email:    { contains: search } },
        { userCode: { contains: search } },
      ],
    }),
    ...(accountStatus && { accountStatus }),
    ...(role && { roles: { some: { role } } }),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, userCode: true, email: true,
        accountStatus: true, mustChangePassword: true,
        lastLoginAt: true, avatarUrl: true,
        ...ACCOUNT_INCLUDE,
      },
      orderBy: { fullName: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  return { users, total };
}

async function updateAccountStatus(userId, accountStatus) {
  return prisma.user.update({
    where: { id: userId },
    data:  { accountStatus },
    select: { id: true, fullName: true, accountStatus: true },
  });
}

async function forcePasswordReset(userId, hashedPassword, mustChangePassword = true) {
  return prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: hashedPassword, mustChangePassword },
    select: { id: true, fullName: true, email: true },
  });
}

async function replaceUserRoles(userId, roles) {
  return prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({
      data: roles.map(role => ({ userId, role })),
    }),
  ]);
}

async function revokeAllSessions(userId) {
  return prisma.userSession.deleteMany({ where: { userId } });
}

module.exports = {
  // Config
  findAllConfigs, findConfigByKey, upsertConfig,
  batchUpsertConfigs, deleteConfig, getConfigValue,
  // Audit
  findManyAuditLogs, findAuditLogById, createAuditLog, getAuditStats,
  // Account
  findManyAccounts, updateAccountStatus, forcePasswordReset,
  replaceUserRoles, revokeAllSessions,
};
