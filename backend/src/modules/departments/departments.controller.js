"use strict";

const service = require("./departments.service");
const {
  toDepartmentDto,
  toDepartmentDetailDto,
  toDepartmentOptionDto,
} = require("./departments.mapper");
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require("../../common/utils/response.util");

/**
 * GET /api/departments
 */
async function listDepartments(req, res, next) {
  try {
    const { departments, pagination } = await service.listDepartments(
      req.query,
    );
    return paginatedResponse(
      res,
      departments.map(toDepartmentDto),
      pagination,
      "Lấy danh sách phòng ban thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/options
 * Dropdown dùng cho form chọn phòng ban
 */
async function getDepartmentOptions(req, res, next) {
  try {
    const options = await service.getDepartmentOptions();
    return successResponse(
      res,
      options.map(toDepartmentOptionDto),
      "Lấy danh sách phòng ban thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/:id
 */
async function getDepartmentById(req, res, next) {
  try {
    const { dept, memberCount, stats } = await service.getDepartmentById(
      req.params.id,
    );
    return successResponse(
      res,
      toDepartmentDetailDto(dept, stats, memberCount),
      "Lấy thông tin phòng ban thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/:id/members
 */
async function getDepartmentMembers(req, res, next) {
  try {
    const members = await service.getDepartmentMembers(req.params.id);
    return successResponse(res, members, "Lấy danh sách nhân viên thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/departments
 */
async function createDepartment(req, res, next) {
  try {
    const dept = await service.createDepartment(req.body);
    return successResponse(
      res,
      toDepartmentDto(dept),
      "Tạo phòng ban thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/departments/:id
 */
async function updateDepartment(req, res, next) {
  try {
    const dept = await service.updateDepartment(req.params.id, req.body);
    return successResponse(
      res,
      toDepartmentDto(dept),
      "Cập nhật phòng ban thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/departments/:id
 */
async function deleteDepartment(req, res, next) {
  try {
    const result = await service.deleteDepartment(req.params.id);
    if (result.deactivated) {
      return successResponse(
        res,
        result,
        `Phòng ban có ${result.memberCount} nhân viên — đã chuyển sang trạng thái không hoạt động thay vì xóa.`,
      );
    }
    return noContentResponse(res, "Xóa phòng ban thành công");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDepartments,
  getDepartmentOptions,
  getDepartmentById,
  getDepartmentMembers,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
