"use strict";

const { z } = require("zod");
const { AppError } = require("../common/errors/AppError");
const { ERROR_CODES } = require("../common/errors/errorCodes");

/**
 * Middleware validate request bằng Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema để validate
 * @param {'body' | 'query' | 'params'} [source='body'] - Phần nào của request cần validate
 *
 * @example
 * router.post('/login', validate(loginSchema), authController.login)
 * router.get('/users', validate(listQuerySchema, 'query'), userController.list)
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Format lỗi Zod thành mảng { field, message }
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return next(
        new AppError(
          "Dữ liệu không hợp lệ.",
          400,
          ERROR_CODES.VALIDATION_ERROR,
          errors,
        ),
      );
    }

    // FIX: req.query là getter-only trong Express — không thể gán trực tiếp.
    // Dùng Object.defineProperty để override, hoặc lưu parsed data vào req.validated
    if (source === "query" || source === "params") {
      // Merge parsed data vào object gốc thay vì gán lại
      Object.assign(req[source], result.data);
    } else {
      req[source] = result.data;
    }

    next();
  };
}

module.exports = { validate };
