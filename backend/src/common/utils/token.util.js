"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");

/**
 * Payload cơ bản của Access Token
 * @typedef {Object} AccessTokenPayload
 * @property {string}   sub   - userId
 * @property {string}   email
 * @property {string[]} roles - mảng role codes
 * @property {string}   [sid] - sessionId (UserSession.id)
 */

/**
 * Ký Access Token (JWT ngắn hạn — 15m)
 * @param {AccessTokenPayload} payload
 * @returns {string}
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: "hr-system",
  });
}

/**
 * Ký Refresh Token (JWT dài hạn — 7d)
 * Chỉ chứa sub + sid để minimize exposure.
 * @param {{ sub: string; sid: string }} payload
 * @returns {string}
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: "hr-system",
  });
}

/**
 * Verify Access Token
 * @param {string} token
 * @returns {AccessTokenPayload}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "hr-system" });
}

/**
 * Verify Refresh Token
 * @param {string} token
 * @returns {{ sub: string; sid: string }}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: "hr-system" });
}

/**
 * Decode token KHÔNG verify (dùng để đọc payload khi token đã expired)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Tính thời điểm hết hạn của Refresh Token (Date object)
 */
function getRefreshTokenExpiresAt() {
  const ms = parseMs(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
}

/** Chuyển chuỗi "7d", "15m" thành milliseconds */
function parseMs(duration) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return parseInt(match[1], 10) * units[match[2]];
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getRefreshTokenExpiresAt,
};
