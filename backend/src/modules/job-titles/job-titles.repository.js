'use strict';

const { prisma } = require('../../config/db');

// ── List ─────────────────────────────────────────────────────

async function findMany({ search, isActive, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 50 }) {
  const skip = (page - 1) * limit;

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
      take: limit,
    }),
  ]);

  return { jobTitles, total };
}

// ── Find one ─────────────────────────────────────────────────

async function findById(id) {
  return prisma.jobTitle.findUnique({ where: { id } });
}

async function findByName(name) {
  return prisma.jobTitle.findUnique({ where: { name } });
}

async function findByCode(code) {
  return prisma.jobTitle.findUnique({ where: { code } });
}

// ── Count users ───────────────────────────────────────────────

async function countActiveUsers(jobTitleId) {
  return prisma.user.count({
    where: { jobTitleId, employmentStatus: { not: 'TERMINATED' } },
  });
}

// ── Create / Update / Delete ──────────────────────────────────

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

// ── All active (dùng cho dropdown) ───────────────────────────

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
