"use strict";

const usersService = require("./users.service");
const {
  toAdminDto,
  toEmployeeDto,
  toPublicDto,
  toListItemDto,
  toProfileDto,
  toWorkShiftDto,
  toAuditLogDto,
  toRoleDto,
} = require("./users.mapper");
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require("../../common/utils/response.util");
const { ROLES } = require("../../config/constants");

// ── Helpers ───────────────────────────────────────────────────

/**
 * Chọn DTO phù hợp cho user dựa vào người đang xem.
 */
async function _pickUserDto(user, requestingUser, targetId) {
  const isHrOrAdmin = requestingUser.roles.some((r) =>
    [ROLES.ADMIN, ROLES.HR].includes(r),
  );
  if (isHrOrAdmin) return toAdminDto(user);
  if (targetId === requestingUser.id) return toEmployeeDto(user);
  // Direct manager xem thông tin thuộc cấp → dùng toEmployeeDto (không có dữ liệu nhạy cảm)
  const isSub = await usersService.isSubordinateOf(requestingUser.id, targetId);
  if (isSub) return toEmployeeDto(user);
  return toPublicDto(user);
}

// ── Controllers ───────────────────────────────────────────────

/**
 * GET /api/users/my-team
 * Danh sách nhân viên trực tiếp dưới quyền của user đang đăng nhập.
 * Mở cho mọi role — trả về mảng rỗng nếu không quản lý ai.
 */
async function getMyTeam(req, res, next) {
  try {
    const subordinates = await usersService.getMyTeam(req.user);
    const items = subordinates.map((u) => toPublicDto(u));
    return successResponse(res, items, "Lấy danh sách nhóm thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users
 * Danh sách nhân viên (phân trang, filter)
 */
async function listUsers(req, res, next) {
  try {
    const { users, pagination } = await usersService.listUsers(
      req.query,
      req.user,
    );

    const isHrOrAdmin = req.user.roles.some((r) =>
      [ROLES.ADMIN, ROLES.HR].includes(r),
    );
    const items = users.map((u) =>
      isHrOrAdmin ? toListItemDto(u) : toPublicDto(u),
    );

    return paginatedResponse(
      res,
      items,
      pagination,
      "Lấy danh sách nhân viên thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/stats
 * Thống kê nhân viên (dùng cho dashboard)
 */
async function getUserStats(req, res, next) {
  try {
    const stats = await usersService.getUserStats();
    return successResponse(res, stats, "Lấy thống kê thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/roles
 * Danh sách tất cả roles trong hệ thống
 */
async function listRoles(req, res, next) {
  try {
    const roles = await usersService.listRoles();
    return successResponse(
      res,
      roles.map(toRoleDto),
      "Lấy danh sách roles thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/me
 * Thông tin của user đang đăng nhập
 */
async function getMe(req, res, next) {
  try {
    const user = await usersService.getUserById(req.user.id, req.user);
    return successResponse(
      res,
      toEmployeeDto(user),
      "Lấy thông tin thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/me
 * Nhân viên tự cập nhật phone, avatar
 */
async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateMe(req.user.id, req.body);
    return successResponse(
      res,
      toEmployeeDto(user),
      "Cập nhật thông tin thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/me/profile
 * Nhân viên xem profile nhạy cảm của chính mình
 */
async function getMyProfile(req, res, next) {
  try {
    const profile = await usersService.getProfile(req.user.id, req.user);
    return successResponse(
      res,
      toProfileDto(profile),
      "Lấy thông tin profile thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/me/profile
 * Nhân viên tự cập nhật profile của mình
 */
async function updateMyProfile(req, res, next) {
  try {
    const profile = await usersService.updateProfile(
      req.user.id,
      req.body,
      req.user,
    );
    return successResponse(
      res,
      toProfileDto(profile),
      "Cập nhật profile thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id
 * Chi tiết 1 nhân viên
 */
async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id, req.user);
    const dto = await _pickUserDto(user, req.user, req.params.id);
    return successResponse(res, dto, "Lấy thông tin nhân viên thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users
 * HR/Admin tạo nhân viên mới
 */
async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(req.body, req.user.id);
    return successResponse(
      res,
      toAdminDto(user),
      "Tạo nhân viên thành công",
      201,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id
 * HR/Admin cập nhật thông tin nhân viên
 */
async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(
      req.params.id,
      req.body,
      req.user,
    );
    const dto = await _pickUserDto(user, req.user, req.params.id);
    return successResponse(res, dto, "Cập nhật thông tin thành công");
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id/roles
 * HR/Admin thay đổi roles của nhân viên
 */
async function updateUserRoles(req, res, next) {
  try {
    const user = await usersService.updateUserRoles(
      req.params.id,
      req.body.roles,
      req.user,
    );
    return successResponse(
      res,
      toAdminDto(user),
      "Cập nhật phân quyền thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id/status
 * HR/Admin thay đổi trạng thái tài khoản (ACTIVE / LOCKED / DISABLED)
 */
async function updateAccountStatus(req, res, next) {
  try {
    // ✅ Service giờ trả về user đã cập nhật
    const user = await usersService.updateAccountStatus(
      req.params.id,
      req.body.accountStatus,
      req.user,
    );
    const dto = await _pickUserDto(user, req.user, req.params.id);
    return successResponse(
      res,
      dto,
      "Cập nhật trạng thái tài khoản thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:id/terminate
 * HR/Admin cho nhân viên nghỉ việc
 */
async function terminateUser(req, res, next) {
  try {
    await usersService.terminateUser(req.params.id, req.body, req.user);
    return noContentResponse(res, "Đã ghi nhận nhân viên nghỉ việc");
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:id/resend-setup-email
 * Gửi lại email kích hoạt tài khoản (PENDING)
 */
async function resendSetupEmail(req, res, next) {
  try {
    await usersService.resendSetupEmail(req.params.id);
    return noContentResponse(res, "Đã gửi lại email kích hoạt");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id/profile
 * HR/Admin xem profile chi tiết của nhân viên
 */
async function getProfile(req, res, next) {
  try {
    const profile = await usersService.getProfile(req.params.id, req.user);
    return successResponse(
      res,
      toProfileDto(profile),
      "Lấy profile thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id/profile
 * HR/Admin cập nhật profile của nhân viên
 */
async function updateProfile(req, res, next) {
  try {
    const profile = await usersService.updateProfile(
      req.params.id,
      req.body,
      req.user,
    );
    return successResponse(
      res,
      toProfileDto(profile),
      "Cập nhật profile thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id/work-shifts
 * Lịch sử ca làm việc của nhân viên.
 * Bản thân + HR/Admin xem được.
 */
async function getUserWorkShifts(req, res, next) {
  try {
    const shifts = await usersService.getUserWorkShifts(
      req.params.id,
      req.user,
    );
    return successResponse(
      res,
      shifts.map(toWorkShiftDto),
      "Lấy lịch sử ca làm việc thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id/audit-logs
 * Nhật ký hoạt động liên quan đến nhân viên.
 * Chỉ HR/Admin được xem.
 * Query: page, limit, entityType, actionType, mode (about | by | all)
 */
async function getUserAuditLogs(req, res, next) {
  try {
    const { logs, total } = await usersService.getUserAuditLogs(
      req.params.id,
      req.user,
      req.query,
    );
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    return paginatedResponse(
      res,
      logs.map(toAuditLogDto),
      { page, limit, total },
      "Lấy nhật ký hoạt động thành công",
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/me/avatar
 * Upload avatar ảnh → Cloudinary → lưu URL vào user.
 * Middleware uploadAvatar (multer) đã parse file vào req.file.
 */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return next(
        require("../../common/errors/AppError").AppError.badRequest(
          "Vui lòng chọn file ảnh.",
        ),
      );
    }
    const user = await usersService.uploadAvatar(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
    );
    return successResponse(
      res,
      toEmployeeDto(user),
      "Cập nhật avatar thành công",
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUserStats,
  listRoles,
  getMe,
  updateMe,
  uploadAvatar,
  getMyProfile,
  updateMyProfile,
  getMyTeam,
  getUserById,
  createUser,
  updateUser,
  updateUserRoles,
  updateAccountStatus,
  terminateUser,
  resendSetupEmail,
  getProfile,
  updateProfile,
  getUserWorkShifts,
  getUserAuditLogs,
};
