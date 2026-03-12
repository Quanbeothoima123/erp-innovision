"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { BCRYPT_ROUNDS } = require("../../config/constants");

/**
 * Hash mật khẩu bằng bcrypt
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * So sánh mật khẩu với hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Tạo token ngẫu nhiên an toàn (dùng cho AuthToken, reset link)
 * @param {number} [bytes=32]
 * @returns {string} hex string
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hash token bằng SHA-256 để lưu vào DB (không lưu plaintext)
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  hashPassword,
  comparePassword,
  generateSecureToken,
  hashToken,
};
