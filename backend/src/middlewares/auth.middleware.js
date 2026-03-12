"use strict";

const { verifyAccessToken } = require("../common/utils/token.util");
const { AppError } = require("../common/errors/AppError");
const { ERROR_CODES } = require("../common/errors/errorCodes");
const { ROLES } = require("../config/constants");

/**
 * Middleware xác thực JWT Access Token.
 * Gắn req.user = { id, email, roles, sessionId } nếu hợp lệ.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("Vui lòng đăng nhập để tiếp tục.");
    }

    const token = authHeader.slice(7); // bỏ "Bearer "
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      sessionId: payload.sid,
    };

    next();
  } catch (err) {
    // JWT errors sẽ được xử lý bởi errorMiddleware
    next(err);
  }
}

/**
 * Middleware kiểm tra user có ít nhất 1 trong các roles được phép.
 * Phải dùng SAU authenticate.
 *
 * @param {...string} allowedRoles - các role code được phép
 *
 * @example
 * router.get('/admin', authenticate, authorize(ROLES.ADMIN, ROLES.HR), controller)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const hasPermission = req.user.roles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!hasPermission) {
      return next(
        new AppError(
          "Bạn không có quyền thực hiện hành động này.",
          403,
          ERROR_CODES.AUTH_FORBIDDEN,
        ),
      );
    }

    next();
  };
}

/**
 * Shortcut: chỉ cho ADMIN
 */
const adminOnly = authorize(ROLES.ADMIN);

/**
 * Shortcut: cho ADMIN và HR
 */
const hrOrAdmin = authorize(ROLES.ADMIN, ROLES.HR);

module.exports = { authenticate, authorize, adminOnly, hrOrAdmin };
