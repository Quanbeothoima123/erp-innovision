"use strict";

const { prisma } = require("../config/db");

/**
 * audit.middleware.js
 * ─────────────────────────────────────────────────────────────
 * Middleware ghi AuditLog tự động cho các mutation API.
 *
 * Cách dùng:
 *   // Gắn vào route cụ thể (recommended)
 *   router.post('/contracts', auditAction('CONTRACT', 'CREATE'), ctrl.create);
 *
 *   // Hoặc gắn vào toàn bộ router group
 *   router.use(autoAudit);
 * ─────────────────────────────────────────────────────────────
 */

// ── HTTP method → AuditActionType mapping ─────────────────────
const METHOD_TO_ACTION = {
  POST: "CREATE",
  PATCH: "UPDATE",
  PUT: "UPDATE",
  DELETE: "DEACTIVATE",
};

// ── URL segment → AuditEntityType mapping ────────────────────
const SEGMENT_TO_ENTITY = {
  users: "USER",
  departments: "DEPARTMENT",
  "job-titles": "JOB_TITLE",
  attendance: "ATTENDANCE_RECORD",
  leave: "LEAVE_REQUEST",
  overtime: "OVERTIME_REQUEST",
  payroll: "PAYROLL_RECORD",
  projects: "PROJECT",
  clients: "CLIENT",
  contracts: "CONTRACT",
  invoices: "INVOICE",
  payments: "CLIENT_PAYMENT",
  notifications: "NOTIFICATION",
  tasks: "TASK",
  system: "USER",
};

// URL path action overrides (pattern → actionType)
const PATH_ACTION_OVERRIDES = [
  { pattern: /\/approve$/, action: "APPROVE" },
  { pattern: /\/reject$/, action: "REJECT" },
  { pattern: /\/cancel$/, action: "CANCEL" },
  { pattern: /\/sign$/, action: "SIGN" },
  { pattern: /\/assign$/, action: "ASSIGN" },
  { pattern: /\/terminate$/, action: "STATUS_CHANGE" },
  { pattern: /\/status$/, action: "STATUS_CHANGE" },
  { pattern: /\/lock$/, action: "STATUS_CHANGE" },
  { pattern: /\/unlock$/, action: "STATUS_CHANGE" },
  { pattern: /\/roles$/, action: "ASSIGN" },
  { pattern: /\/send$/, action: "SEND" },
  { pattern: /\/mark-paid$/, action: "PAYMENT" },
  { pattern: /\/close$/, action: "STATUS_CHANGE" },
  { pattern: /\/payments/, action: "PAYMENT" },
  { pattern: /\/reset-password$/, action: "UPDATE" },
];

// ── Factory: tạo middleware cho 1 action cụ thể ───────────────

/**
 * Tạo audit middleware cho 1 route cụ thể.
 *
 * @param {string} entityType   — AuditEntityType enum value
 * @param {string} [actionType] — AuditActionType enum value (auto-detect nếu không truyền)
 * @param {Function} [getDescription] — fn(req) → string mô tả tuỳ chỉnh
 */
function auditAction(entityType, actionType, getDescription) {
  return async (req, res, next) => {
    // Lưu original json để capture response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Chỉ ghi log khi response thành công (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = _extractEntityId(req, body);
        const action = actionType ?? _detectAction(req);
        const desc = getDescription
          ? getDescription(req, body)
          : _buildDescription(action, entityType, entityId, req, body);

        // Fire-and-forget — không block response
        prisma.auditLog
          .create({
            data: {
              entityType,
              entityId: entityId ?? "N/A",
              actionType: action,
              actorUserId: req.user.id,
              description: desc,
              ipAddress: _getClientIP(req),
              userAgent: req.headers["user-agent"]?.slice(0, 1024) ?? null,
            },
          })
          .catch((err) => console.error("[AuditLog] Error:", err.message));
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Auto audit middleware — tự phát hiện entity và action từ URL + method.
 * Dùng cho toàn bộ router group nếu không muốn khai báo từng route.
 */
function autoAudit(req, res, next) {
  // Chỉ audit mutations
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();
  if (!req.user) return next();

  const entityType = _detectEntityType(req.path);
  if (!entityType) return next();

  return auditAction(entityType)(req, res, next);
}

// ── Private helpers ───────────────────────────────────────────

function _detectEntityType(path) {
  const segments = path.split("/").filter(Boolean);
  for (const seg of segments) {
    if (SEGMENT_TO_ENTITY[seg]) return SEGMENT_TO_ENTITY[seg];
  }
  return null;
}

function _detectAction(req) {
  // Check path overrides first
  for (const { pattern, action } of PATH_ACTION_OVERRIDES) {
    if (pattern.test(req.path)) return action;
  }
  // Fallback to HTTP method
  return METHOD_TO_ACTION[req.method] ?? "UPDATE";
}

function _extractEntityId(req, responseBody) {
  // Từ URL params
  if (req.params?.id) return req.params.id;

  // Từ response body
  const data = responseBody?.data;
  if (data?.id) return data.id;

  return null;
}

function _buildDescription(action, entityType, entityId, req, responseBody) {
  const actor = req.user?.fullName || req.user?.email || "Hệ thống";
  const entity = entityType.replace(/_/g, " ").toLowerCase();

  // Try to extract a human-readable name from the response body
  const data = responseBody?.data;
  const entityName =
    data?.title || data?.name || data?.projectName || data?.fullName || null;
  const idLabel = entityName
    ? `"${entityName}"`
    : entityId
      ? `#${entityId.slice(-8)}`
      : "";

  const labels = {
    CREATE: `${actor} tạo ${entity} ${idLabel}`.trim(),
    UPDATE: `${actor} cập nhật ${entity} ${idLabel}`.trim(),
    DEACTIVATE: `${actor} vô hiệu hoá ${entity} ${idLabel}`.trim(),
    APPROVE: `${actor} duyệt ${entity} ${idLabel}`.trim(),
    REJECT: `${actor} từ chối ${entity} ${idLabel}`.trim(),
    CANCEL: `${actor} hủy ${entity} ${idLabel}`.trim(),
    SIGN: `${actor} ký ${entity} ${idLabel}`.trim(),
    ASSIGN: `${actor} gán ${entity} ${idLabel}`.trim(),
    STATUS_CHANGE: `${actor} thay đổi trạng thái ${entity} ${idLabel}`.trim(),
    SEND: `${actor} gửi ${entity} ${idLabel}`.trim(),
    PAYMENT: `${actor} ghi nhận thanh toán ${entity} ${idLabel}`.trim(),
    REMOVE: `${actor} xóa ${entity} ${idLabel}`.trim(),
  };

  return (
    labels[action] ??
    `${actor} ${action.toLowerCase()} ${entity} ${idLabel}`.trim()
  );
}

function _getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    req.headers["x-real-ip"] ??
    req.connection?.remoteAddress ??
    req.socket?.remoteAddress ??
    null
  );
}

module.exports = { auditAction, autoAudit };
