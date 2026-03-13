"use strict";

const { prisma } = require("../../config/db");

// ── Include chuẩn ────────────────────────────────────────────

const DEPARTMENT_INCLUDE = {
  headUser: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
    },
  },
};

// ── List ─────────────────────────────────────────────────────

async function findMany({
  search,
  isActive,
  sortBy = "name",
  sortOrder = "asc",
  page = 1,
  limit = 50,
}) {
  const skip = (page - 1) * limit;

  const where = {
    ...(search && { name: { contains: search } }),
    ...(isActive !== undefined && { isActive }),
  };

  const [total, departments] = await prisma.$transaction([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      include: DEPARTMENT_INCLUDE,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return { departments, total };
}

// ── Find one ─────────────────────────────────────────────────

async function findById(id) {
  return prisma.department.findUnique({
    where: { id },
    include: DEPARTMENT_INCLUDE,
  });
}

async function findByName(name) {
  return prisma.department.findUnique({ where: { name } });
}

// ── Count members ─────────────────────────────────────────────

/**
 * Đếm số nhân viên còn làm việc trong phòng ban
 */
async function countActiveMembers(departmentId) {
  return prisma.user.count({
    where: {
      departmentId,
      employmentStatus: { not: "TERMINATED" },
    },
  });
}

/**
 * Lấy stats từng phòng ban: số NV active, PROBATION, ON_LEAVE
 */
async function getDepartmentMemberStats(departmentId) {
  const stats = await prisma.user.groupBy({
    by: ["employmentStatus"],
    where: { departmentId },
    _count: { id: true },
  });

  return stats.reduce((acc, s) => {
    acc[s.employmentStatus] = s._count.id;
    return acc;
  }, {});
}

/**
 * Lấy danh sách nhân viên trong phòng ban (gọn)
 */
async function findMembers(departmentId) {
  return prisma.user.findMany({
    where: {
      departmentId,
      employmentStatus: { not: "TERMINATED" },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
      employmentStatus: true,
      accountStatus: true,
    },
    orderBy: { fullName: "asc" },
  });
}

// ── Create / Update / Delete ──────────────────────────────────

async function create(data) {
  return prisma.department.create({
    data,
    include: DEPARTMENT_INCLUDE,
  });
}

async function update(id, data) {
  return prisma.department.update({
    where: { id },
    data,
    include: DEPARTMENT_INCLUDE,
  });
}

/**
 * Deactivate thay vì xóa cứng nếu còn nhân viên
 */
async function deactivate(id) {
  return prisma.department.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Xóa cứng — chỉ dùng khi không còn nhân viên nào
 */
async function hardDelete(id) {
  return prisma.department.delete({ where: { id } });
}

// ── All active (dùng cho dropdown) ───────────────────────────

async function findAllActive() {
  return prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

module.exports = {
  findMany,
  findById,
  findByName,
  countActiveMembers,
  getDepartmentMemberStats,
  findMembers,
  create,
  update,
  deactivate,
  hardDelete,
  findAllActive,
};
