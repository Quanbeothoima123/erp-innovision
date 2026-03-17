"use strict";

const service = require("./system.service");
const mapper = require("./system.mapper");
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require("../../common/utils/response.util");

// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTEM CONFIG                                           ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/system/configs
 * Tất cả cấu hình — grouped theo category
 */
async function getAllConfigs(req, res, next) {
  try {
    const configs = await service.getAllConfigs();
    const grouped = mapper.toConfigsGroupedDto(configs);
    return successResponse(
      res,
      { grouped, all: configs.map(mapper.toConfigDto) },
      "Lấy cấu hình hệ thống thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/configs/:key
 */
async function getConfigByKey(req, res, next) {
  try {
    const config = await service.getConfigByKey(req.params.key);
    return successResponse(
      res,
      mapper.toConfigDto(config),
      "Lấy cấu hình thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/system/configs/:key  — Tạo hoặc cập nhật 1 config
 */
async function upsertConfig(req, res, next) {
  try {
    const config = await service.upsertConfig(
      { key: req.params.key, ...req.body },
      req.user,
    );
    return successResponse(
      res,
      mapper.toConfigDto(config),
      "Lưu cấu hình thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/system/configs  — Batch upsert nhiều config cùng lúc
 */
async function batchUpsertConfigs(req, res, next) {
  try {
    await service.batchUpsertConfigs(req.body.configs, req.user);
    return successResponse(
      res,
      null,
      `Đã lưu ${req.body.configs.length} cấu hình`,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/system/configs/:key
 */
async function deleteConfig(req, res, next) {
  try {
    await service.deleteConfig(req.params.key, req.user);
    return noContentResponse(res, "Xoá cấu hình thành công");
  } catch (err) {
    next(err);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  AUDIT LOG                                               ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/system/audit-logs
 * Filter: entityType, actionType, actorUserId, entityId, fromDate, toDate, search
 * View modes: table (default) hoặc timeline (frontend tự render)
 */
async function listAuditLogs(req, res, next) {
  try {
    const { logs, pagination } = await service.listAuditLogs(req.query);
    return paginatedResponse(
      res,
      logs.map(mapper.toAuditLogDto),
      pagination,
      "Lấy nhật ký hệ thống thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/audit-logs/:id
 * Chi tiết 1 log — kèm diff view
 */
async function getAuditLogById(req, res, next) {
  try {
    const log = await service.getAuditLogById(req.params.id);
    return successResponse(
      res,
      mapper.toAuditLogDto(log),
      "Lấy chi tiết log thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/system/audit-logs/stats
 * Top actions, actors, entities
 */
async function getAuditStats(req, res, next) {
  try {
    const stats = await service.getAuditStats();
    return successResponse(res, stats, "Lấy thống kê audit thành công");
  } catch (err) {
    next(err);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ACCOUNT MANAGEMENT                                      ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/system/accounts
 * Danh sách tài khoản (filter: search, accountStatus, role)
 */
async function listAccounts(req, res, next) {
  try {
    const { users, pagination } = await service.listAccounts(req.query);
    return paginatedResponse(
      res,
      users.map(mapper.toAccountDto),
      pagination,
      "Lấy danh sách tài khoản thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/system/accounts/:id/lock
 * Khoá tài khoản + thu hồi tất cả sessions
 */
async function lockAccount(req, res, next) {
  try {
    const result = await service.lockAccount(
      req.params.id,
      req.user,
      req.body?.reason ?? null,
    );
    return successResponse(res, result, "Khoá tài khoản thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/system/accounts/:id/unlock
 * Mở khoá tài khoản
 */
async function unlockAccount(req, res, next) {
  try {
    const result = await service.unlockAccount(req.params.id, req.user);
    return successResponse(res, result, "Mở khoá tài khoản thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/system/accounts/:id/reset-password
 * Reset mật khẩu về default hoặc mật khẩu chỉ định
 * Response: { user, temporaryPassword } — hiển thị 1 lần rồi không show lại
 */
async function resetPassword(req, res, next) {
  try {
    const result = await service.resetPassword(
      req.params.id,
      req.user,
      req.body?.newPassword ?? null,
    );
    return successResponse(
      res,
      result,
      "Reset mật khẩu thành công. Hiển thị mật khẩu tạm 1 lần duy nhất.",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/system/accounts/:id/roles
 * Cập nhật vai trò người dùng
 */
async function updateUserRoles(req, res, next) {
  try {
    const result = await service.updateUserRoles(
      req.params.id,
      req.body.roles,
      req.user,
    );
    return successResponse(res, result, "Cập nhật vai trò thành công");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Config
  getAllConfigs,
  getConfigByKey,
  upsertConfig,
  batchUpsertConfigs,
  deleteConfig,
  // Audit
  listAuditLogs,
  getAuditLogById,
  getAuditStats,
  // Account
  listAccounts,
  lockAccount,
  unlockAccount,
  resetPassword,
  updateUserRoles,
};
