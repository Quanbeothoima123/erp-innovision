"use strict";

const { prisma } = require("../../config/db");

const DEPARTMENT_INCLUDE = {
  headUser: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      jobTitle: { select: { name: true } },
    },
  },
  // ✅ Luôn kèm số lượng thành viên để toDepartmentDto có thể map _count.members
  _count: {
    select: { members: true },
  },
};

async function findMany({
  search,
  isActive,
  sortBy = "name",
  sortOrder = "asc",
  page = 1,
  limit = 50,
}) {
  // FIX: Prisma yêu cầu Int — coerce phòng trường hợp nhận string từ query
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

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
      take: limitNum,
    }),
  ]);

  return { departments, total };
}

async function findById(id) {
  return prisma.department.findUnique({
    where: { id },
    include: DEPARTMENT_INCLUDE,
  });
}

async function findByName(name) {
  return prisma.department.findUnique({ where: { name } });
}

async function countActiveMembers(departmentId) {
  return prisma.user.count({
    where: {
      departmentId,
      employmentStatus: { not: "TERMINATED" },
    },
  });
}

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

async function create(data) {
  return prisma.department.create({ data, include: DEPARTMENT_INCLUDE });
}

async function update(id, data) {
  return prisma.department.update({
    where: { id },
    data,
    include: DEPARTMENT_INCLUDE,
  });
}

async function deactivate(id) {
  return prisma.department.update({
    where: { id },
    data: { isActive: false },
  });
}

async function hardDelete(id) {
  return prisma.department.delete({ where: { id } });
}

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
