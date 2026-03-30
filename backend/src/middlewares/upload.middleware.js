"use strict";

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { env } = require("../config/env");
const { AppError } = require("../common/errors/AppError");

/**
 * Upload middleware sử dụng multer (memory storage) cho Cloudinary upload.
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
 * Multer instance cho avatar upload — lưu trong memory (buffer).
 * Max 5 MB, chỉ nhận image/jpeg, image/png, image/webp.
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(AppError.badRequest("Chỉ chấp nhận file ảnh (JPEG, PNG, WebP)."));
    }
  },
});

/**
 * Middleware: parse single avatar file from field "avatar".
 * After this middleware, req.file contains { buffer, mimetype, originalname, size }.
 */
function uploadAvatar(req, res, next) {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(AppError.badRequest("File quá lớn. Tối đa 5 MB."));
        }
        return next(AppError.badRequest(err.message));
      }
      return next(err);
    }
    next();
  });
}

module.exports = {
  ensureUploadDir,
  uploadAvatar,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
};
