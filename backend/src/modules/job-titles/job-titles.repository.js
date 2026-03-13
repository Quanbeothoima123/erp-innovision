'use strict';

const { prisma } = require('../../config/db');

async function findMany({ search, isActive, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 50 }) {
  // FIX: Prisma yêu cầu Int — coerce phòng trường hợp nhận string từ query
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
      ],
    }),
    ...(isActive !== undefined && { isActive }),
  };

  const [total, jobTitles] = await prisma.$transaction([
    prisma.jobTitle.count({ where }),
    prisma.jobTitle.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    }),
  ]);

  return { jobTitles, total };
}

async function findById(id) {
  return prisma.jobTitle.findUnique({ where: { id } });
}

async function findByName(name) {
  return prisma.jobTitle.findUnique({ where: { name } });
}

async function findByCode(code) {
  return prisma.jobTitle.findUnique({ where: { code } });
}

async function countActiveUsers(jobTitleId) {
  return prisma.user.count({
    where: { jobTitleId, employmentStatus: { not: 'TERMINATED' } },
  });
}

async function create(data) {
  return prisma.jobTitle.create({ data });
}

async function update(id, data) {
  return prisma.jobTitle.update({ where: { id }, data });
}

async function deactivate(id) {
  return prisma.jobTitle.update({ where: { id }, data: { isActive: false } });
}

async function hardDelete(id) {
  return prisma.jobTitle.delete({ where: { id } });
}

async function findAllActive() {
  return prisma.jobTitle.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
}

module.exports = {
  findMany,
  findById,
  findByName,
  findByCode,
  countActiveUsers,
  create,
  update,
  deactivate,
  hardDelete,
  findAllActive,
};
