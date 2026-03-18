"use strict";

const service = require("./job-titles.service");
const {
  toJobTitleDto,
  toJobTitleDetailDto,
  toJobTitleOptionDto,
} = require("./job-titles.mapper");
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require("../../common/utils/response.util");

async function listJobTitles(req, res, next) {
  try {
    const { jobTitles, pagination } = await service.listJobTitles(req.query);
    return paginatedResponse(
      res,
      jobTitles.map(toJobTitleDto),
      pagination,
      "Lấy danh sách chức danh thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getJobTitleOptions(req, res, next) {
  try {
    const options = await service.getJobTitleOptions();
    return successResponse(
      res,
      options.map(toJobTitleOptionDto),
      "Lấy danh sách chức danh thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getJobTitleById(req, res, next) {
  try {
    const { jt, userCount } = await service.getJobTitleById(req.params.id);
    return successResponse(
      res,
      toJobTitleDetailDto(jt, userCount),
      "Lấy thông tin chức danh thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getJobTitleMembers(req, res, next) {
  try {
    const members = await service.getJobTitleMembers(req.params.id);
    return successResponse(res, members, "Lấy danh sách nhân viên thành công");
  } catch (err) {
    next(err);
  }
}

async function createJobTitle(req, res, next) {
  try {
    const jt = await service.createJobTitle(req.body);
    return successResponse(
      res,
      toJobTitleDto(jt),
      "Tạo chức danh thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function updateJobTitle(req, res, next) {
  try {
    const jt = await service.updateJobTitle(req.params.id, req.body);
    return successResponse(
      res,
      toJobTitleDto(jt),
      "Cập nhật chức danh thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function deleteJobTitle(req, res, next) {
  try {
    const result = await service.deleteJobTitle(req.params.id);
    if (result.deactivated) {
      return successResponse(
        res,
        result,
        `Chức danh đang được ${result.userCount} nhân viên sử dụng — đã chuyển sang không hoạt động thay vì xóa.`,
      );
    }
    return noContentResponse(res, "Xóa chức danh thành công");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listJobTitles,
  getJobTitleOptions,
  getJobTitleById,
  getJobTitleMembers,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
};
