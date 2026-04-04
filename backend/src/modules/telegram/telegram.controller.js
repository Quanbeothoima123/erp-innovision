"use strict";

const svc = require("./telegram.service");
const {
  successResponse,
  noContentResponse,
} = require("../../common/utils/response.util");
const { validate } = require("../../middlewares/validate.middleware");
const {
  settingsSchema,
  toggleSchema,
  groupSchema,
  broadcastSchema,
} = require("./telegram.validation");

// ─── User endpoints ───────────────────────────────────────────

/** GET /api/telegram/status — trạng thái kết nối hiện tại */
async function getStatus(req, res, next) {
  try {
    const data = await svc.getMyTelegramStatus(req.user.id);
    return successResponse(res, data, "Lấy trạng thái kết nối thành công");
  } catch (e) {
    next(e);
  }
}

/** GET /api/telegram/connect-link — lấy deep link kết nối */
async function getConnectLink(req, res, next) {
  try {
    const data = svc.generateConnectLink(req.user.id);
    return successResponse(res, data, "Lấy link kết nối thành công");
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/telegram/unlink — huỷ kết nối */
async function unlink(req, res, next) {
  try {
    await svc.unlinkTelegram(req.user.id);
    return noContentResponse(res, "Đã huỷ kết nối Telegram.");
  } catch (e) {
    next(e);
  }
}

/** PATCH /api/telegram/toggle — bật/tắt nhận thông báo */
async function toggle(req, res, next) {
  try {
    const { enabled } = req.body;
    await svc.toggleTelegram(req.user.id, enabled);
    return successResponse(
      res,
      null,
      `Thông báo Telegram đã được ${enabled ? "bật" : "tắt"}.`,
    );
  } catch (e) {
    next(e);
  }
}

/** GET /api/telegram/settings — lấy settings thông báo */
async function getSettings(req, res, next) {
  try {
    const status = await svc.getMyTelegramStatus(req.user.id);
    return successResponse(
      res,
      status.settings,
      "Lấy cài đặt thông báo thành công",
    );
  } catch (e) {
    next(e);
  }
}

/** PUT /api/telegram/settings — cập nhật settings thông báo */
async function updateSettings(req, res, next) {
  try {
    const data = await svc.updateSettings(req.user.id, req.body);
    return successResponse(res, data, "Đã cập nhật cài đặt thông báo.");
  } catch (e) {
    next(e);
  }
}

// ─── Webhook (PUBLIC — không cần auth) ───────────────────────

/** POST /api/telegram/webhook — Telegram gọi vào đây */
async function webhook(req, res) {
  // Phải trả 200 ngay, xử lý bất đồng bộ
  res.sendStatus(200);
  try {
    await svc.handleWebhook(req.body);
  } catch (e) {
    console.error("[TelegramWebhook] Error:", e.message);
  }
}

// ─── Admin endpoints ──────────────────────────────────────────

/** GET /api/telegram/admin/groups */
async function listGroups(req, res, next) {
  try {
    const data = await svc.listGroups();
    return successResponse(res, data, "Lấy danh sách group thành công");
  } catch (e) {
    next(e);
  }
}

/** POST /api/telegram/admin/groups */
async function addGroup(req, res, next) {
  try {
    const data = await svc.addGroup(req.body);
    return successResponse(res, data, "Đã thêm group bot.", 201);
  } catch (e) {
    next(e);
  }
}

/** PUT /api/telegram/admin/groups/:id */
async function editGroup(req, res, next) {
  try {
    const data = await svc.editGroup(req.params.id, req.body);
    return successResponse(res, data, "Đã cập nhật group bot.");
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/telegram/admin/groups/:id */
async function removeGroup(req, res, next) {
  try {
    await svc.removeGroup(req.params.id);
    return noContentResponse(res, "Đã xoá group bot.");
  } catch (e) {
    next(e);
  }
}

/** POST /api/telegram/admin/broadcast — broadcast tới tất cả groups */
async function broadcast(req, res, next) {
  try {
    const { title, message } = req.body;
    const result = await svc.broadcastToGroups(title, message);
    return successResponse(
      res,
      result,
      `Đã gửi broadcast tới ${result.sent} group.`,
    );
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getStatus,
  getConnectLink,
  unlink,
  toggle,
  getSettings,
  updateSettings,
  webhook,
  listGroups,
  addGroup,
  editGroup,
  removeGroup,
  broadcast,
};
