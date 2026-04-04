"use strict";

const router = require("express").Router();
const ctrl = require("./telegram.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  settingsSchema,
  toggleSchema,
  groupSchema,
  broadcastSchema,
} = require("./telegram.validation");

// ── Webhook — PUBLIC (Telegram gọi vào, không cần auth) ──────
router.post("/webhook", ctrl.webhook);

// ── User routes — cần đăng nhập ──────────────────────────────
router.use(authenticate);

router.get("/status", ctrl.getStatus);
router.get("/connect-link", ctrl.getConnectLink);
router.delete("/unlink", ctrl.unlink);
router.patch("/toggle", validate(toggleSchema), ctrl.toggle);
router.get("/settings", ctrl.getSettings);
router.put("/settings", validate(settingsSchema), ctrl.updateSettings);

// ── Admin routes ──────────────────────────────────────────────
router.get("/admin/groups", ctrl.listGroups);
router.post("/admin/groups", validate(groupSchema), ctrl.addGroup);
router.put("/admin/groups/:id", validate(groupSchema), ctrl.editGroup);
router.delete("/admin/groups/:id", ctrl.removeGroup);
router.post("/admin/broadcast", validate(broadcastSchema), ctrl.broadcast);

module.exports = router;
