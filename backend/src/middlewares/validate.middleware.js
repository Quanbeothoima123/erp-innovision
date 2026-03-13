"use strict";

const { z } = require("zod");
const { AppError } = require("../common/errors/AppError");
const { ERROR_CODES } = require("../common/errors/errorCodes");

/**
 * Middleware validate request bằng Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema để validate
 * @param {'body' | 'query' | 'params'} [source='body'] - Phần nào của request cần validate
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
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

    // FIX: req.query và req.params là getter-only trong Express/Node —
    // không thể gán trực tiếp (req.query = ...) sẽ throw TypeError.
    // Dùng Object.defineProperty để override thành writable property.
    if (source === "query" || source === "params") {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      req[source] = result.data;
    }

    next();
  };
}

module.exports = { validate };
