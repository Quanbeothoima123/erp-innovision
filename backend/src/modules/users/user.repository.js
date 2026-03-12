"use strict";

const { prisma } = require("../../config/db");

// ─────────────────────────────────────────────────────────────
//  SELECT helpers — tránh lặp lại các include/select
// ─────────────────────────────────────────────────────────────

/** Select tối thiểu cho list (không include sensitive data) */
const USER_LIST_SELECT = {
  id: true,
  userCode: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  avatarUrl: true,
  departmentId: true,
  jobTitleId: true,
  managerId: true,
  hireDate: true,
  employmentStatus: true,
  accountStatus: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  jobTitle: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true, avatarUrl: true } },
  roles: {
    include: { role: { select: { id: true, code: true, name: true } } },
  },
};

/** Include đầy đủ cho detail (thêm profile nếu được phép) */
const USER_DETAIL_INCLUDE = {
  department: { select: { id: true, name: true } },
  jobTitle: { select: { id: true, name: true } },
  manager: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
    },
  },
  roles: { include: { role: true } },
  createdBy: { select: { id: true, fullName: true } },
  subordinates: {
    where: { employmentStatus: { not: "TERMINATED" } },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
    },
  },
};

// ─────────────────────────────────────────────────────────────
//  User queries
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách nhân viên có filter + phân trang
 * @param {object} filters
 * @param {{ page, limit, sortBy, sortOrder }} pagination
 */
async function findMany(filters, pagination) {
  const {
    search,
    departmentId,
    jobTitleId,
    managerId,
    roles,
    accountStatus,
    employmentStatus,
  } = filters;

  const { page, limit, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause động
  const where = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { userCode: { contains: search } },
      { phoneNumber: { contains: search } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (jobTitleId) where.jobTitleId = jobTitleId;
  if (managerId) where.managerId = managerId;
  if (accountStatus) where.accountStatus = accountStatus;
  if (employmentStatus) where.employmentStatus = employmentStatus;

  // Filter theo roles (nhiều role → OR)
  if (roles && roles.length > 0) {
    where.roles = {
      some: {
        role: { code: { in: roles } },
      },
    };
  }

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_LIST_SELECT,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return { total, items };
}

/**
 * Lấy chi tiết 1 user theo id
 * @param {string} id
 */
async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: USER_DETAIL_INCLUDE,
  });
}

/**
 * Kiểm tra email đã tồn tại chưa (dùng khi tạo mới)
 */
async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
}

/**
 * Kiểm tra userCode đã tồn tại chưa
 */
async function findByCode(userCode) {
  return prisma.user.findUnique({
    where: { userCode },
    select: { id: true, userCode: true },
  });
}

/**
 * Tạo user mới (KHÔNG có password — chờ activate)
 * Dùng transaction để tạo UserRole cùng lúc
 * @param {object} data
 * @param {string[]} roleCodes - mảng role codes ["EMPLOYEE", "MANAGER"]
 */
async function createUser(data, roleCodes) {
  const { sendActivationEmail: _skip, roles: _r, ...userData } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Tạo user
    const user = await tx.user.create({
      data: {
        ...userData,
        accountStatus: "PENDING",
        mustChangePassword: true,
        passwordHash: null,
      },
    });

    // 2. Lấy role records theo code
    const roleRecords = await tx.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true },
    });

    // 3. Gán roles
    if (roleRecords.length > 0) {
      await tx.userRole.createMany({
        data: roleRecords.map((r) => ({ userId: user.id, roleId: r.id })),
        skipDuplicates: true,
      });
    }

    // 4. Tạo profile trống
    await tx.userProfile.create({
      data: { userId: user.id },
    });

    // 5. Trả về user đầy đủ
    return tx.user.findUnique({
      where: { id: user.id },
      include: USER_DETAIL_INCLUDE,
    });
  });
}

/**
 * Cập nhật thông tin cơ bản user
 */
async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    include: USER_DETAIL_INCLUDE,
  });
}

/**
 * Cập nhật roles: xóa hết role cũ, gán role mới
 */
async function updateRoles(userId, roleCodes) {
  return prisma.$transaction(async (tx) => {
    // Xóa hết role cũ
    await tx.userRole.deleteMany({ where: { userId } });

    // Lấy role records
    const roleRecords = await tx.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true },
    });

    // Gán role mới
    await tx.userRole.createMany({
      data: roleRecords.map((r) => ({ userId, roleId: r.id })),
    });

    return tx.user.findUnique({
      where: { id: userId },
      include: USER_DETAIL_INCLUDE,
    });
  });
}

/**
 * Cập nhật accountStatus (ACTIVE / LOCKED / DISABLED)
 */
async function updateAccountStatus(id, accountStatus) {
  return prisma.user.update({
    where: { id },
    data: {
      accountStatus,
      // Khi unlock → reset failed count
      ...(accountStatus === "ACTIVE" && {
        failedLoginCount: 0,
        lockedUntil: null,
      }),
    },
    include: USER_DETAIL_INCLUDE,
  });
}

/**
 * Ghi nhận nghỉ việc (terminate)
 */
async function terminateUser(id, terminatedAt, terminationReason) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        employmentStatus: "TERMINATED",
        accountStatus: "DISABLED",
        terminatedAt: new Date(terminatedAt),
        terminationReason,
      },
      include: USER_DETAIL_INCLUDE,
    });

    // Thu hồi toàn bộ session
    await tx.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return user;
  });
}

// ─────────────────────────────────────────────────────────────
//  UserProfile queries
// ─────────────────────────────────────────────────────────────

/**
 * Lấy profile của user (chỉ HR/Admin/bản thân)
 */
async function findProfileByUserId(userId) {
  return prisma.userProfile.findUnique({
    where: { userId },
  });
}

/**
 * Tạo hoặc cập nhật UserProfile (upsert)
 */
async function upsertProfile(userId, data) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ─────────────────────────────────────────────────────────────
//  Helper queries
// ─────────────────────────────────────────────────────────────

/** Lấy danh sách manager có thể gán (là User có role MANAGER/ADMIN/HR) */
async function findAvailableManagers(excludeUserId) {
  return prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      accountStatus: "ACTIVE",
      employmentStatus: { not: "TERMINATED" },
      roles: {
        some: {
          role: { code: { in: ["ADMIN", "MANAGER", "HR"] } },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });
}

/** Lấy số lượng nhân viên theo department */
async function countByDepartment() {
  return prisma.user.groupBy({
    by: ["departmentId"],
    where: { employmentStatus: { not: "TERMINATED" } },
    _count: { id: true },
  });
}

/** Lấy danh sách toàn bộ Role trong hệ thống */
async function findAllRoles() {
  return prisma.role.findMany({ orderBy: { code: "asc" } });
}

module.exports = {
  findMany,
  findById,
  findByEmail,
  findByCode,
  createUser,
  updateUser,
  updateRoles,
  updateAccountStatus,
  terminateUser,
  findProfileByUserId,
  upsertProfile,
  findAvailableManagers,
  countByDepartment,
  findAllRoles,
};
