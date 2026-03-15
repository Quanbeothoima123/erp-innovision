'use strict';

const repo    = require('./system.repository');
const { AppError }  = require('../../common/errors/AppError');
const { hashPassword } = require('../../common/utils/hash.util');
const { ROLES }     = require('../../config/constants');

// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTEM CONFIG                                           ║
// ╚══════════════════════════════════════════════════════════╝

async function getAllConfigs() {
  return repo.findAllConfigs();
}

async function getConfigByKey(key) {
  const c = await repo.findConfigByKey(key);
  if (!c) throw AppError.notFound(`Không tìm thấy cấu hình '${key}'.`);
  return c;
}

async function upsertConfig(dto, requestingUser) {
  _assertAdmin(requestingUser);

  const oldConfig = await repo.findConfigByKey(dto.key);
  const updated   = await repo.upsertConfig(dto.key, dto.value, dto.description);

  // Ghi audit
  await _audit({
    entityType:  'NOTIFICATION', // dùng NOTIFICATION placeholder vì không có SYSTEM_CONFIG type
    entityId:    dto.key,
    actionType:  'UPDATE',
    actorUserId: requestingUser.id,
    description: `Cập nhật SystemConfig: ${dto.key}`,
    oldValues:   oldConfig ? { value: oldConfig.value } : null,
    newValues:   { value: dto.value },
  });

  return updated;
}

async function batchUpsertConfigs(configs, requestingUser) {
  _assertAdmin(requestingUser);
  const results = await repo.batchUpsertConfigs(configs);

  await _audit({
    entityType:  'NOTIFICATION',
    entityId:    'BATCH',
    actionType:  'UPDATE',
    actorUserId: requestingUser.id,
    description: `Cập nhật batch ${configs.length} SystemConfig`,
    newValues:   Object.fromEntries(configs.map(c => [c.key, c.value])),
  });

  return results;
}

async function deleteConfig(key, requestingUser) {
  _assertAdmin(requestingUser);
  const existing = await repo.findConfigByKey(key);
  if (!existing) throw AppError.notFound(`Cấu hình '${key}' không tồn tại.`);

  await _audit({
    entityType:  'NOTIFICATION',
    entityId:    key,
    actionType:  'DEACTIVATE',
    actorUserId: requestingUser.id,
    description: `Xoá SystemConfig: ${key}`,
    oldValues:   { value: existing.value },
  });

  return repo.deleteConfig(key);
}

// ── Public getter — dùng trong các modules khác ───────────────
async function getConfigValue(key, defaultValue = null) {
  return repo.getConfigValue(key, defaultValue);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  AUDIT LOG                                               ║
// ╚══════════════════════════════════════════════════════════╝

async function listAuditLogs(filters) {
  const { logs, total } = await repo.findManyAuditLogs(filters);
  return {
    logs,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 50, total },
  };
}

async function getAuditLogById(id) {
  const log = await repo.findAuditLogById(id);
  if (!log) throw AppError.notFound('Không tìm thấy bản ghi kiểm toán.');
  return log;
}

async function getAuditStats() {
  return repo.getAuditStats();
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ACCOUNT MANAGEMENT                                      ║
// ╚══════════════════════════════════════════════════════════╝

async function listAccounts(filters) {
  const { users, total } = await repo.findManyAccounts(filters);
  return {
    users,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 30, total },
  };
}

async function lockAccount(userId, requestingUser, reason) {
  _assertAdmin(requestingUser);
  if (userId === requestingUser.id) {
    throw AppError.badRequest('Không thể tự khoá tài khoản của chính mình.');
  }

  const updated = await repo.updateAccountStatus(userId, 'LOCKED');

  // Thu hồi tất cả sessions
  await repo.revokeAllSessions(userId);

  await _audit({
    entityType:  'USER',
    entityId:    userId,
    actionType:  'STATUS_CHANGE',
    actorUserId: requestingUser.id,
    description: `Khoá tài khoản ${updated.fullName}${reason ? `. Lý do: ${reason}` : ''}`,
    newValues:   { accountStatus: 'LOCKED' },
  });

  return updated;
}

async function unlockAccount(userId, requestingUser) {
  _assertAdmin(requestingUser);
  const updated = await repo.updateAccountStatus(userId, 'ACTIVE');

  await _audit({
    entityType:  'USER',
    entityId:    userId,
    actionType:  'STATUS_CHANGE',
    actorUserId: requestingUser.id,
    description: `Mở khoá tài khoản ${updated.fullName}`,
    newValues:   { accountStatus: 'ACTIVE' },
  });

  return updated;
}

async function resetPassword(userId, requestingUser, newPassword) {
  _assertAdmin(requestingUser);

  // Nếu không truyền newPassword → dùng default từ config
  const plainPassword = newPassword ?? await repo.getConfigValue('default_password', 'TechVN@2025');
  const hashed        = await hashPassword(plainPassword);

  const updated = await repo.forcePasswordReset(userId, hashed, true);

  await _audit({
    entityType:  'USER',
    entityId:    userId,
    actionType:  'UPDATE',
    actorUserId: requestingUser.id,
    description: `Reset mật khẩu cho ${updated.fullName}. Yêu cầu đổi mật khẩu lần sau đăng nhập.`,
  });

  return { ...updated, temporaryPassword: plainPassword };
}

async function updateUserRoles(userId, roles, requestingUser) {
  _assertAdmin(requestingUser);

  if (userId === requestingUser.id && !roles.includes('ADMIN')) {
    throw AppError.badRequest('Không thể tự gỡ quyền ADMIN của chính mình.');
  }

  const { prisma } = require('../../config/db');
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, fullName: true, roles: { select: { role: true } } },
  });
  if (!user) throw AppError.notFound('Không tìm thấy người dùng.');

  const oldRoles = user.roles.map(r => r.role);
  await repo.replaceUserRoles(userId, roles);

  await _audit({
    entityType:  'USER_ROLE',
    entityId:    userId,
    actionType:  'UPDATE',
    actorUserId: requestingUser.id,
    description: `Cập nhật vai trò ${user.fullName}: [${oldRoles.join(',')}] → [${roles.join(',')}]`,
    oldValues:   { roles: oldRoles },
    newValues:   { roles },
  });

  return { userId, roles };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PUBLIC AUDIT HELPER — dùng từ các modules khác          ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tạo AuditLog từ bất kỳ module nào.
 * Import: const { audit } = require('../system/system.service');
 */
async function audit(opts) {
  return repo.createAuditLog(opts).catch(err =>
    console.error('[AuditLog] Failed:', err.message),
  );
}

// ── Private helpers ───────────────────────────────────────────

function _assertAdmin(user) {
  if (!user.roles.includes(ROLES.ADMIN)) {
    throw AppError.forbidden('Chỉ Admin mới có thể thực hiện thao tác này.');
  }
}

async function _audit(opts) {
  return repo.createAuditLog(opts).catch(err =>
    console.error('[AuditLog] Warn:', err.message),
  );
}

module.exports = {
  // Config
  getAllConfigs, getConfigByKey, upsertConfig,
  batchUpsertConfigs, deleteConfig, getConfigValue,
  // Audit
  listAuditLogs, getAuditLogById, getAuditStats,
  // Account
  listAccounts, lockAccount, unlockAccount, resetPassword, updateUserRoles,
  // Shared helper
  audit,
};
