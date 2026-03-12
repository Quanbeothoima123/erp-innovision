"use strict";

/**
 * Format response thành công
 * @param {import('express').Response} res
 * @param {any}    data
 * @param {string} [message]
 * @param {number} [statusCode=200]
 */
function successResponse(res, data, message = "Thành công", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Format response thành công không có data (VD: logout, delete)
 */
function noContentResponse(res, message = "Thành công") {
  return res.status(200).json({
    success: true,
    message,
    data: null,
  });
}

/**
 * Format response danh sách có phân trang
 * @param {import('express').Response} res
 * @param {any[]}  items
 * @param {{ page: number; limit: number; total: number }} pagination
 * @param {string} [message]
 */
function paginatedResponse(res, items, pagination, message = "Thành công") {
  const { page, limit, total } = pagination;
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
  });
}

module.exports = { successResponse, noContentResponse, paginatedResponse };
