"use strict";

/**
 * Xử lý route không tồn tại — đặt TRƯỚC errorMiddleware, SAU tất cả routes.
 */
function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    errorCode: "NOT_FOUND",
    message: `Route '${req.method} ${req.originalUrl}' không tồn tại.`,
    data: null,
  });
}

module.exports = { notFoundMiddleware };
