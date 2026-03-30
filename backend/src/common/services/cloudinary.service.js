"use strict";

const { v2: cloudinary } = require("cloudinary");
const { env } = require("../../config/env");
const { AppError } = require("../errors/AppError");

// ── Configure once ───────────────────────────────────────────
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer  — file buffer from multer
 * @param {object} options — { folder, publicId, transformation }
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadBuffer(buffer, options = {}) {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw AppError.internal(
      "Cloudinary chưa được cấu hình. Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    );
  }

  const { folder = "erp-innovision", publicId, transformation } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image",
      overwrite: true,
      ...(publicId && { public_id: publicId }),
      ...(transformation && { transformation }),
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(AppError.internal(`Upload thất bại: ${error.message}`));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      },
    );

    stream.end(buffer);
  });
}

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId
 */
async function deleteByPublicId(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Swallow — noncritical
  }
}

module.exports = { uploadBuffer, deleteByPublicId };
