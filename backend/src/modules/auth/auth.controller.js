"use strict";

const authService = require("./auth.service");
const { toAuthResponse, toUserDto } = require("./auth.mapper");
const {
  successResponse,
  noContentResponse,
} = require("../../common/utils/response.util");

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await authService.login({
      email,
      password,
      ipAddress,
      userAgent,
    });

    const responseData = {
      ...toAuthResponse(result.user, result.accessToken, result.refreshToken),
      mustChangePassword: result.mustChangePassword,
    };

    return successResponse(res, responseData, "Đăng nhập thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);

    return successResponse(
      res,
      toAuthResponse(result.user, result.accessToken, result.refreshToken),
      "Làm mới token thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user?.sessionId);
    return noContentResponse(res, "Đăng xuất thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout-all
 * Thu hồi tất cả session trên mọi thiết bị
 */
async function logoutAll(req, res, next) {
  try {
    await authService.logoutAll(req.user.id);
    return noContentResponse(res, "Đã đăng xuất khỏi tất cả thiết bị");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/setup-account
 * Body: { token, password, confirmPassword }
 * Kích hoạt tài khoản lần đầu (PENDING → ACTIVE)
 */
async function setupAccount(req, res, next) {
  try {
    const { token, password } = req.body;
    await authService.setupAccount({ token, password });

    return noContentResponse(
      res,
      "Tài khoản đã được kích hoạt thành công. Bạn có thể đăng nhập.",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    // Luôn trả về response thành công (tránh user enumeration)
    return noContentResponse(
      res,
      "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút.",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, password, confirmPassword }
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });

    return noContentResponse(
      res,
      "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập.",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password  [requires auth]
 * Body: { currentPassword, newPassword, confirmPassword }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword({
      userId: req.user.id,
      sessionId: req.user.sessionId,
      currentPassword,
      newPassword,
    });

    return noContentResponse(res, "Đổi mật khẩu thành công.");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me  [requires auth]
 * Trả về thông tin người dùng hiện tại
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, toUserDto(user), "Lấy thông tin thành công");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll,
  setupAccount,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
