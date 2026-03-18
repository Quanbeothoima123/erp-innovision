"use strict";

const service = require("./attendance.service");
const mapper = require("./attendance.mapper");
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require("../../common/utils/response.util");

// ╔══════════════════════════════════════════════════════════╗
// ║  WORK SHIFT                                              ║
// ╚══════════════════════════════════════════════════════════╝

async function listShifts(req, res, next) {
  try {
    const { shifts, pagination } = await service.listShifts(req.query);
    return paginatedResponse(
      res,
      shifts.map(mapper.toShiftDto),
      pagination,
      "Lấy danh sách ca làm việc thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getShiftOptions(req, res, next) {
  try {
    const options = await service.getShiftOptions();
    return successResponse(
      res,
      options.map(mapper.toShiftOptionDto),
      "Lấy danh sách ca thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getShiftById(req, res, next) {
  try {
    const shift = await service.getShiftById(req.params.id);
    return successResponse(
      res,
      mapper.toShiftDto(shift),
      "Lấy thông tin ca làm việc thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function createShift(req, res, next) {
  try {
    const shift = await service.createShift(req.body);
    return successResponse(
      res,
      mapper.toShiftDto(shift),
      "Tạo ca làm việc thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function updateShift(req, res, next) {
  try {
    const shift = await service.updateShift(req.params.id, req.body);
    return successResponse(
      res,
      mapper.toShiftDto(shift),
      "Cập nhật ca làm việc thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function deleteShift(req, res, next) {
  try {
    const result = await service.deleteShift(req.params.id);
    return successResponse(
      res,
      result,
      result.deactivated
        ? "Đã vô hiệu hóa ca làm việc"
        : "Xóa ca làm việc thành công",
    );
  } catch (err) {
    next(err);
  }
}

// ── UserWorkShift ─────────────────────────────────────────────

async function getUserWorkShifts(req, res, next) {
  try {
    const shifts = await service.getUserWorkShifts(req.params.userId);
    return successResponse(
      res,
      shifts.map(mapper.toUserWorkShiftDto),
      "Lấy ca làm việc của nhân viên thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getShiftMembers(req, res, next) {
  try {
    const members = await service.getShiftMembers(req.params.id);
    return successResponse(res, members, "Lay danh sach nhan vien thanh cong");
  } catch (err) {
    next(err);
  }
}

async function assignUserShift(req, res, next) {
  try {
    const uws = await service.assignUserShift(req.body);
    return successResponse(
      res,
      mapper.toUserWorkShiftDto(uws),
      "Gán ca làm việc thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function removeUserShift(req, res, next) {
  try {
    await service.removeUserShift(req.params.id);
    return noContentResponse(res, "Đã xóa ca làm việc của nhân viên");
  } catch (err) {
    next(err);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  HOLIDAY                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listHolidays(req, res, next) {
  try {
    const { holidays, pagination } = await service.listHolidays(req.query);
    return paginatedResponse(
      res,
      holidays.map(mapper.toHolidayDto),
      pagination,
      "Lấy danh sách ngày lễ thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getHolidayById(req, res, next) {
  try {
    const holiday = await service.getHolidayById(req.params.id);
    return successResponse(
      res,
      mapper.toHolidayDto(holiday),
      "Lấy thông tin ngày lễ thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function createHoliday(req, res, next) {
  try {
    const holiday = await service.createHoliday(req.body);
    return successResponse(
      res,
      mapper.toHolidayDto(holiday),
      "Tạo ngày lễ thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function updateHoliday(req, res, next) {
  try {
    const holiday = await service.updateHoliday(req.params.id, req.body);
    return successResponse(
      res,
      mapper.toHolidayDto(holiday),
      "Cập nhật ngày lễ thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function deleteHoliday(req, res, next) {
  try {
    await service.deleteHoliday(req.params.id);
    return noContentResponse(res, "Xóa ngày lễ thành công");
  } catch (err) {
    next(err);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE REQUEST                                      ║
// ╚══════════════════════════════════════════════════════════╝

async function listRequests(req, res, next) {
  try {
    const { requests, pagination } = await service.listRequests(
      req.query,
      req.user,
    );
    return paginatedResponse(
      res,
      requests.map(mapper.toAttendanceRequestDto),
      pagination,
      "Lấy danh sách yêu cầu chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getRequestById(req, res, next) {
  try {
    const request = await service.getRequestById(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toAttendanceRequestDto(request),
      "Lấy thông tin yêu cầu thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const request = await service.createRequest(req.body, req.user);
    return successResponse(
      res,
      mapper.toAttendanceRequestDto(request),
      "Gửi yêu cầu chấm công thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const request = await service.approveRequest(
      req.params.id,
      req.user.id,
      req.body?.note ?? null,
    );
    return successResponse(
      res,
      mapper.toAttendanceRequestDto(request),
      "Duyệt yêu cầu chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const request = await service.rejectRequest(
      req.params.id,
      req.user.id,
      req.body.rejectReason,
    );
    return successResponse(
      res,
      mapper.toAttendanceRequestDto(request),
      "Từ chối yêu cầu chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ATTENDANCE RECORD                                       ║
// ╚══════════════════════════════════════════════════════════╝

async function listRecords(req, res, next) {
  try {
    const { records, pagination } = await service.listRecords(
      req.query,
      req.user,
    );
    return paginatedResponse(
      res,
      records.map(mapper.toAttendanceRecordDto),
      pagination,
      "Lấy danh sách bản ghi chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getRecordById(req, res, next) {
  try {
    const record = await service.getRecordById(req.params.id, req.user);
    return successResponse(
      res,
      mapper.toAttendanceRecordDto(record),
      "Lấy bản ghi chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function manualAdjust(req, res, next) {
  try {
    const record = await service.manualAdjust(req.body, req.user.id);
    return successResponse(
      res,
      mapper.toAttendanceRecordDto(record),
      "Điều chỉnh chấm công thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const record = await service.updateRecord(
      req.params.id,
      req.body,
      req.user.id,
    );
    return successResponse(
      res,
      mapper.toAttendanceRecordDto(record),
      "Cập nhật bản ghi chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    await service.deleteRecord(req.params.id);
    return noContentResponse(res, "Xóa bản ghi chấm công thành công");
  } catch (err) {
    next(err);
  }
}

// ── My Attendance ─────────────────────────────────────────────

async function getMyAttendance(req, res, next) {
  try {
    const { records, pagination } = await service.getMyAttendance(
      req.query,
      req.user.id,
    );
    return paginatedResponse(
      res,
      records.map(mapper.toAttendanceRecordDto),
      pagination,
      "Lấy lịch sử chấm công thành công",
    );
  } catch (err) {
    next(err);
  }
}

async function getMyMonthlyStats(req, res, next) {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const records = await service.getMyMonthlyStats(req.user.id, year, month);
    return successResponse(
      res,
      mapper.toMonthlyStatsDto(records, year, month),
      "Lấy thống kê tháng thành công",
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Shift
  listShifts,
  getShiftOptions,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  // UserWorkShift
  getUserWorkShifts,
  getShiftMembers,
  assignUserShift,
  removeUserShift,
  // Holiday
  listHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  // Request
  listRequests,
  getRequestById,
  createRequest,
  approveRequest,
  rejectRequest,
  // Record
  listRecords,
  getRecordById,
  manualAdjust,
  updateRecord,
  deleteRecord,
  // My
  getMyAttendance,
  getMyMonthlyStats,
};
