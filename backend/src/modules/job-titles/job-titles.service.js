"use strict";

const repo = require("./job-titles.repository");
const { AppError } = require("../../common/errors/AppError");

// ── List ─────────────────────────────────────────────────────

async function listJobTitles(filters) {
  const { jobTitles, total } = await repo.findMany(filters);
  return {
    jobTitles,
    pagination: { page: filters.page ?? 1, limit: filters.limit ?? 50, total },
  };
}

// ── Get one ───────────────────────────────────────────────────

async function getJobTitleById(id) {
  const jt = await repo.findById(id);
  if (!jt) throw AppError.notFound("Không tìm thấy chức danh.");

  const userCount = await repo.countActiveUsers(id);
  return { jt, userCount };
}

// ── Get members ───────────────────────────────────────────────

async function getJobTitleMembers(id) {
  const jt = await repo.findById(id);
  if (!jt) throw AppError.notFound("Không tìm thấy chức danh.");
  return repo.findMembers(id);
}

// ── Options ───────────────────────────────────────────────────

async function getJobTitleOptions() {
  return repo.findAllActive();
}

// ── Create ────────────────────────────────────────────────────

async function createJobTitle(dto) {
  // Kiểm tra tên trùng
  const existByName = await repo.findByName(dto.name);
  if (existByName)
    throw AppError.conflict(`Chức danh '${dto.name}' đã tồn tại.`);

  // Kiểm tra code trùng (nếu cung cấp)
  if (dto.code) {
    const existByCode = await repo.findByCode(dto.code);
    if (existByCode)
      throw AppError.conflict(`Mã chức danh '${dto.code}' đã tồn tại.`);
  }

  return repo.create({
    name: dto.name,
    code: dto.code ?? null,
    description: dto.description ?? null,
    isActive: dto.isActive ?? true,
  });
}

// ── Update ────────────────────────────────────────────────────

async function updateJobTitle(id, dto) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Không tìm thấy chức danh.");

  if (dto.name) {
    const sameNameOther = await repo.findByName(dto.name);
    if (sameNameOther && sameNameOther.id !== id) {
      throw AppError.conflict(`Chức danh '${dto.name}' đã tồn tại.`);
    }
  }

  if (dto.code) {
    const sameCodeOther = await repo.findByCode(dto.code);
    if (sameCodeOther && sameCodeOther.id !== id) {
      throw AppError.conflict(`Mã chức danh '${dto.code}' đã tồn tại.`);
    }
  }

  return repo.update(id, _clean(dto));
}

// ── Delete ────────────────────────────────────────────────────

async function deleteJobTitle(id) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Không tìm thấy chức danh.");

  const userCount = await repo.countActiveUsers(id);

  if (userCount > 0) {
    // Vẫn còn NV đang dùng → deactivate
    await repo.deactivate(id);
    return { deleted: false, deactivated: true, userCount };
  }

  await repo.hardDelete(id);
  return { deleted: true, deactivated: false };
}

// ── Helper ────────────────────────────────────────────────────

function _clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

module.exports = {
  listJobTitles,
  getJobTitleById,
  getJobTitleMembers,
  getJobTitleOptions,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
};
