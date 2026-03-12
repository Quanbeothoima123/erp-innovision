"use strict";

// ── Roles ────────────────────────────────────────────────────
const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  HR: "HR",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  SALES: "SALES",
  ACCOUNTANT: "ACCOUNTANT",
});

// ── Account Status ───────────────────────────────────────────
const ACCOUNT_STATUS = Object.freeze({
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  LOCKED: "LOCKED",
  DISABLED: "DISABLED",
});

// ── Auth Token Types ─────────────────────────────────────────
const AUTH_TOKEN_TYPE = Object.freeze({
  ACCOUNT_SETUP: "ACCOUNT_SETUP",
  PASSWORD_RESET: "PASSWORD_RESET",
});

// ── Employment Status ────────────────────────────────────────
const EMPLOYMENT_STATUS = Object.freeze({
  PROBATION: "PROBATION",
  ACTIVE: "ACTIVE",
  ON_LEAVE: "ON_LEAVE",
  TERMINATED: "TERMINATED",
});

// ── Pagination ───────────────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

// ── Bcrypt ───────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  AUTH_TOKEN_TYPE,
  EMPLOYMENT_STATUS,
  PAGINATION,
  BCRYPT_ROUNDS,
};
