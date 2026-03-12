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

    // Gán data đã được parse/coerce vào request
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
