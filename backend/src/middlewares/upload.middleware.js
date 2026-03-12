"use strict";

const path = require("path");
const fs = require("fs");
const { env } = require("../config/env");
const { AppError } = require("../common/errors/AppError");

/**
 * Upload middleware đơn giản dùng multipart/form-data thủ công
 * (không dùng multer vì muốn kiểm soát hoàn toàn).
 *
 * Trong thực tế nên dùng S3/GCS. File này là placeholder.
 */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = ["application/pdf", ...ALLOWED_IMAGE_TYPES];

/**
 * Helper: tạo thư mục upload nếu chưa tồn tại
 */
function ensureUploadDir(subDir = "") {
  const dir = path.join(process.cwd(), env.UPLOAD_DIR, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Placeholder — sẽ implement đầy đủ ở module liên quan (avatars, documents)
 */
function uploadAvatar(req, res, next) {
  // TODO: implement khi cần
  next();
}

module.exports = {
  ensureUploadDir,
  uploadAvatar,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
};
