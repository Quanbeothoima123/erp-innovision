"use strict";

const { prisma } = require("../../config/db");

// ── Select fields ────────────────────────────────────────────

const USER_LIST_INCLUDE = {
  roles: { include: { role: true } },
  department: { select: { id: true, name: true } },
  jobTitle: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true, avatarUrl: true } },
};

const USER_DETAIL_INCLUDE = {
  ...USER_LIST_INCLUDE,
  createdBy: { select: { id: true, fullName: true } },
};

// ── List & Search ────────────────────────────────────────────

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
  // FIX: Prisma yêu cầu Int — coerce phòng trường hợp nhận string từ query
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where = {
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
    ...(role && {
      roles: {
        some: {
          role: { code: role },
        },
      },
    }),
  };

  // ✅ Dùng Promise.all thay vì prisma.$transaction([]) để tránh lỗi P2028
  // (transaction timeout khi DB có nhiều kết nối đồng thời)
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: USER_LIST_INCLUDE,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  return { users, total };
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: USER_DETAIL_INCLUDE,
  });
}

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findByUserCode(userCode) {
  return prisma.user.findUnique({ where: { userCode } });
}

async function countByDepartment(departmentId) {
  return prisma.user.count({
    where: { departmentId, employmentStatus: { not: "TERMINATED" } },
  });
}

async function createUser({ userData, roleIds }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });

    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }

    await tx.userProfile.create({ data: { userId: user.id } });

    return tx.user.findUnique({
      where: { id: user.id },
      include: USER_DETAIL_INCLUDE,
    });
  });
}

async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    include: USER_DETAIL_INCLUDE,
  });
}

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

async function updateAccountStatus(userId, accountStatus) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus,
      ...(accountStatus === "ACTIVE" && {
        failedLoginCount: 0,
        lockedUntil: null,
      }),
    },
  });
}

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

async function findProfile(userId) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

async function upsertProfile(userId, data) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

async function findRolesByCodes(codes) {
  return prisma.role.findMany({ where: { code: { in: codes } } });
}

async function findAllRoles() {
  return prisma.role.findMany({ orderBy: { code: "asc" } });
}

async function getLastUserCode() {
  const user = await prisma.user.findFirst({
    where: { userCode: { startsWith: "EMP" } },
    orderBy: { userCode: "desc" },
    select: { userCode: true },
  });
  return user?.userCode ?? null;
}

/**
 * Lấy danh sách nhân viên trực tiếp dưới quyền của managerId.
 * Dùng cho endpoint /my-team và scope listUsers cho direct manager.
 */
async function findSubordinates(managerId) {
  return prisma.user.findMany({
    where: { managerId, accountStatus: "ACTIVE" },
    include: USER_LIST_INCLUDE,
    orderBy: { fullName: "asc" },
  });
}

/**
 * Kiểm tra user này có đang quản lý ít nhất 1 nhân viên active không.
 */
async function isDirectManager(userId) {
  const count = await prisma.user.count({
    where: { managerId: userId, accountStatus: "ACTIVE" },
  });
  return count > 0;
}

async function getUserStats() {
  const [total, byEmployment, byAccount] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["employmentStatus"], _count: { id: true } }),
    prisma.user.groupBy({ by: ["accountStatus"], _count: { id: true } }),
  ]);

  return { total, byEmployment, byAccount };
}

// ── Work Shifts ───────────────────────────────────────────────

/**
 * Lấy toàn bộ lịch sử ca làm việc của 1 nhân viên,
 * kèm thông tin shift (tên, giờ, loại...).
 * Sắp xếp: ca đang active lên đầu, sau đó theo effectiveFrom mới → cũ.
 */
async function findWorkShifts(userId) {
  return prisma.userWorkShift.findMany({
    where: { userId },
    include: {
      shift: {
        select: {
          id: true,
          code: true,
          name: true,
          shiftType: true,
          startTime: true,
          endTime: true,
          breakMinutes: true,
          workMinutes: true,
          isNightShift: true,
          overtimeAfterMinutes: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { effectiveFrom: "desc" }],
  });
}

// ── Audit Logs ────────────────────────────────────────────────

/**
 * Lấy audit logs liên quan đến 1 nhân viên:
 * - Các log có entityId = userId (hành động trực tiếp lên user)
 * - Các log có actorUserId = userId (hành động do user đó thực hiện)
 * Hỗ trợ filter theo entityType, actionType và phân trang.
 */
async function findAuditLogs(
  userId,
  {
    entityType,
    actionType,
    mode = "about", // "about" | "by" | "all"
    page = 1,
    limit = 20,
  } = {},
) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Xây dựng điều kiện theo mode
  let userCondition;
  if (mode === "by") {
    userCondition = { actorUserId: userId };
  } else if (mode === "all") {
    userCondition = {
      OR: [{ entityId: userId }, { actorUserId: userId }],
    };
  } else {
    // "about" — mặc định: log về user này (các entityType liên quan đến user)
    userCondition = {
      OR: [
        {
          entityId: userId,
          entityType: {
            in: [
              "USER",
              "USER_PROFILE",
              "USER_COMPENSATION",
              "USER_SALARY_COMPONENT",
              "WORK_SHIFT",
            ],
          },
        },
        // Cũng lấy cả log leave/attendance/overtime có entityId là userId
        { entityId: userId },
      ],
    };
  }

  const where = {
    ...userCondition,
    ...(entityType && { entityType }),
    ...(actionType && { actionType }),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actorUser: {
          select: { id: true, fullName: true, avatarUrl: true, userCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
  ]);

  return { logs, total };
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
  findWorkShifts,
  findAuditLogs,
  findSubordinates,
  isDirectManager,
};
