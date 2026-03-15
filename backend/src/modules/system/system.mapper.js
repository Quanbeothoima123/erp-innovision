'use strict';

// ── Config ────────────────────────────────────────────────────

// Nhóm config theo category để frontend render đẹp
const CONFIG_GROUPS = {
  company:  ['company_name','company_address','company_email','company_phone','company_website','company_logo_url'],
  schedule: ['default_timezone','work_hours_per_day','work_days_per_week','late_tolerance_minutes','payslip_visible_days_before_payday'],
  hr:       ['default_annual_leave_days','max_overtime_hours_per_month','probation_days'],
  security: ['max_failed_login_attempts','session_timeout_minutes','password_min_length','default_password'],
  payroll:  ['payroll_currency','standard_working_days_per_month'],
};

function toConfigDto(c) {
  if (!c) return null;
  return {
    id:          c.id,
    key:         c.key,
    value:       c.value,
    description: c.description,
    group:       _getGroup(c.key),
    updatedAt:   c.updatedAt,
    createdAt:   c.createdAt,
  };
}

function toConfigsGroupedDto(configs) {
  const grouped = {};
  for (const c of configs) {
    const group = _getGroup(c.key);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(toConfigDto(c));
  }
  return grouped;
}

// ── AuditLog ──────────────────────────────────────────────────

const AUDIT_ACTION_LABELS = {
  CREATE:        'Tạo mới',
  UPDATE:        'Cập nhật',
  DEACTIVATE:    'Vô hiệu hóa',
  APPROVE:       'Duyệt',
  REJECT:        'Từ chối',
  ASSIGN:        'Gán',
  REMOVE:        'Gỡ bỏ',
  STATUS_CHANGE: 'Thay đổi trạng thái',
  SEND:          'Gửi',
  PAYMENT:       'Thanh toán',
  CANCEL:        'Hủy',
  SIGN:          'Ký',
};

function toAuditLogDto(log) {
  if (!log) return null;
  return {
    id:          log.id,
    entityType:  log.entityType,
    entityId:    log.entityId,
    actionType:  log.actionType,
    actionLabel: AUDIT_ACTION_LABELS[log.actionType] ?? log.actionType,
    actor:       log.actorUser ?? null,
    description: log.description,
    oldValues:   log.oldValues,
    newValues:   log.newValues,
    metadata:    log.metadata,
    diff:        _buildDiff(log.oldValues, log.newValues),
    ipAddress:   log.ipAddress,
    userAgent:   log.userAgent,
    createdAt:   log.createdAt,
  };
}

// ── Account ───────────────────────────────────────────────────

function toAccountDto(u) {
  if (!u) return null;
  return {
    id:                u.id,
    fullName:          u.fullName,
    userCode:          u.userCode,
    email:             u.email,
    avatarUrl:         u.avatarUrl,
    accountStatus:     u.accountStatus,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt:       u.lastLoginAt,
    department:        u.department ?? null,
    jobTitle:          u.jobTitle   ?? null,
    roles:             (u.roles ?? []).map(r => r.role),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function _getGroup(key) {
  for (const [group, keys] of Object.entries(CONFIG_GROUPS)) {
    if (keys.includes(key)) return group;
  }
  return 'other';
}

/**
 * Tạo diff object để frontend hiển thị thay đổi
 * [ { key, oldValue, newValue, changed } ]
 */
function _buildDiff(oldValues, newValues) {
  if (!oldValues && !newValues) return null;

  const allKeys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);

  return Array.from(allKeys).map(key => ({
    key,
    oldValue: oldValues?.[key] ?? null,
    newValue: newValues?.[key] ?? null,
    changed:  JSON.stringify(oldValues?.[key]) !== JSON.stringify(newValues?.[key]),
  }));
}

module.exports = {
  toConfigDto,
  toConfigsGroupedDto,
  toAuditLogDto,
  toAccountDto,
  CONFIG_GROUPS,
  AUDIT_ACTION_LABELS,
};
