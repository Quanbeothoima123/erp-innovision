"use strict";

const { prisma } = require("../../config/db");

// ── Select fields ────────────────────────────────────────────

/** Include chuẩn cho danh sách — không lấy các trường nhạy cảm */
const USER_LIST_INCLUDE = {
  roles: { include: { role: true } },
  department: { select: { id: true, name: true } },
  jobTitle: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true, avatarUrl: true } },
};

/** Include đầy đủ cho detail page */
const USER_DETAIL_INCLUDE = {
  ...USER_LIST_INCLUDE,
  createdBy: { select: { id: true, fullName: true } },
};

// ── List & Search ────────────────────────────────────────────

/**
 * Lấy danh sách user có filter + phân trang.
 * HR/Admin thấy tất cả; Manager chỉ thấy nhân viên trong phòng mình (xử lý ở service).
 */
async function findMany({
  search,
  departmentId,
  jobTitleId,
  managerId,
  role,
  accountStatus,
  employmentStatus,
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    // Tìm kiếm full-text trên tên, email, mã NV
    ...(search && {
      OR: [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { userCode: { contains: search } },
      ],
    }),
    ...(departmentId !== undefined && { departmentId }),
    ...(jobTitleId !== undefined && { jobTitleId }),
    ...(managerId !== undefined && { managerId }),
    ...(accountStatus && { accountStatus }),
    ...(employmentStatus && { employmentStatus }),
    // Lọc theo role (join qua UserRole)
    ...(role && {
      roles: {
        some: {
          role: { code: role },
        },
      },
    }),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: USER_LIST_INCLUDE,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return { users, total };
}

/**
 * Tìm user theo ID — dùng cho detail, update, delete
 */
async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: USER_DETAIL_INCLUDE,
  });
}

/**
 * Tìm user theo email (kiểm tra trùng khi tạo)
 */
async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Tìm user theo userCode (kiểm tra trùng)
 */
async function findByUserCode(userCode) {
  return prisma.user.findUnique({ where: { userCode } });
}

/**
 * Đếm số nhân viên trong phòng ban
 */
async function countByDepartment(departmentId) {
  return prisma.user.count({
    where: { departmentId, employmentStatus: { not: "TERMINATED" } },
  });
}

// ── Create ───────────────────────────────────────────────────

/**
 * Tạo user mới + gán roles (trong 1 transaction).
 * roleIds: mảng Role.id (đã resolve từ role codes)
 */
async function createUser({ userData, roleIds }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: userData,
    });

    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }

    // Tạo profile trống
    await tx.userProfile.create({
      data: { userId: user.id },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: USER_DETAIL_INCLUDE,
    });
  });
}

// ── Update ───────────────────────────────────────────────────

/**
 * Cập nhật thông tin user
 */
async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    include: USER_DETAIL_INCLUDE,
  });
}

/**
 * Cập nhật roles của user:
 * Xóa tất cả roles cũ → insert roles mới (trong 1 transaction).
 */
async function replaceUserRoles(userId, roleIds) {
  return prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } });

    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      });
    }

    return tx.user.findUnique({
      where: { id: userId },
      include: USER_LIST_INCLUDE,
    });
  });
}

/**
 * Thay đổi trạng thái tài khoản (ACTIVE / LOCKED / DISABLED)
 */
async function updateAccountStatus(userId, accountStatus) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus,
      // Nếu re-activate thì reset lock
      ...(accountStatus === "ACTIVE" && {
        failedLoginCount: 0,
        lockedUntil: null,
      }),
    },
  });
}

/**
 * Cho nghỉ việc: set employmentStatus = TERMINATED + ghi terminatedAt/reason
 * Optionally: DISABLED account + revoke all sessions
 */
async function terminateUser({
  userId,
  terminatedAt,
  terminationReason,
  revokeAccess,
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        employmentStatus: "TERMINATED",
        terminatedAt,
        terminationReason,
        ...(revokeAccess && { accountStatus: "DISABLED" }),
      },
    });

    if (revokeAccess) {
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return user;
  });
}

// ── Profile ──────────────────────────────────────────────────

/**
 * Lấy profile của user (bao gồm các trường nhạy cảm)
 */
async function findProfile(userId) {
  return prisma.userProfile.findUnique({
    where: { userId },
  });
}

/**
 * Upsert UserProfile — tạo mới nếu chưa có, update nếu đã có
 */
async function upsertProfile(userId, data) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ── Role lookup ───────────────────────────────────────────────

/**
 * Tìm nhiều Role theo codes — dùng khi assign role
 */
async function findRolesByCodes(codes) {
  return prisma.role.findMany({
    where: { code: { in: codes } },
  });
}

/**
 * Lấy tất cả roles trong hệ thống
 */
async function findAllRoles() {
  return prisma.role.findMany({ orderBy: { code: "asc" } });
}

// ── Auto-generate userCode ────────────────────────────────────

/**
 * Lấy userCode lớn nhất hiện tại để tự sinh mã NV mới.
 * Format: EMP001, EMP002, ...
 */
async function getLastUserCode() {
  const user = await prisma.user.findFirst({
    where: { userCode: { startsWith: "EMP" } },
    orderBy: { userCode: "desc" },
    select: { userCode: true },
  });
  return user?.userCode ?? null;
}

// ── Stats ────────────────────────────────────────────────────

/**
 * Thống kê nhân viên theo trạng thái (dùng cho dashboard)
 */
async function getUserStats() {
  const [total, byEmployment, byAccount] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["employmentStatus"],
      _count: { id: true },
    }),
    prisma.user.groupBy({
      by: ["accountStatus"],
      _count: { id: true },
    }),
  ]);

  return { total, byEmployment, byAccount };
}

module.exports = {
  findMany,
  findById,
  findByEmail,
  findByUserCode,
  countByDepartment,
  createUser,
  updateUser,
  replaceUserRoles,
  updateAccountStatus,
  terminateUser,
  findProfile,
  upsertProfile,
  findRolesByCodes,
  findAllRoles,
  getLastUserCode,
  getUserStats,
};
