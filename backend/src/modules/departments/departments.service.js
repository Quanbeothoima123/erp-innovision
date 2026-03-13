'use strict';

const repo = require('./departments.repository');
const { AppError } = require('../../common/errors/AppError');
const { prisma } = require('../../config/db');

// ── List ─────────────────────────────────────────────────────

async function listDepartments(filters) {
  const { departments, total } = await repo.findMany(filters);

  // Nếu yêu cầu kèm stats thì query thêm memberCount từng phòng
  let memberCounts = {};
  if (filters.includeStats) {
    const counts = await Promise.all(
      departments.map((d) =>
        repo.countActiveMembers(d.id).then((c) => ({ id: d.id, count: c })),
      ),
    );
    memberCounts = Object.fromEntries(counts.map((c) => [c.id, c.count]));
  }

  return {
    departments: departments.map((d) => ({
      ...d,
      memberCount: memberCounts[d.id] ?? undefined,
    })),
    pagination: {
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
      total,
    },
  };
}

// ── Get one ───────────────────────────────────────────────────

async function getDepartmentById(id) {
  const dept = await repo.findById(id);
  if (!dept) throw AppError.notFound('Không tìm thấy phòng ban.');

  const [memberCount, stats] = await Promise.all([
    repo.countActiveMembers(id),
    repo.getDepartmentMemberStats(id),
  ]);

  return { dept, memberCount, stats };
}

// ── Get members ───────────────────────────────────────────────

async function getDepartmentMembers(id) {
  const dept = await repo.findById(id);
  if (!dept) throw AppError.notFound('Không tìm thấy phòng ban.');
  return repo.findMembers(id);
}

// ── Get options (dropdown) ────────────────────────────────────

async function getDepartmentOptions() {
  return repo.findAllActive();
}

// ── Create ────────────────────────────────────────────────────

async function createDepartment(dto) {
  // Kiểm tra tên trùng
  const existing = await repo.findByName(dto.name);
  if (existing) {
    throw AppError.conflict(`Phòng ban '${dto.name}' đã tồn tại.`);
  }

  // Kiểm tra headUser hợp lệ nếu có
  if (dto.headUserId) {
    await _assertUserExists(dto.headUserId, 'Trưởng phòng');
  }

  return repo.create({
    name: dto.name,
    description: dto.description ?? null,
    headUserId: dto.headUserId ?? null,
    isActive: dto.isActive ?? true,
  });
}

// ── Update ────────────────────────────────────────────────────

async function updateDepartment(id, dto) {
  await _assertDeptExists(id);

  // Kiểm tra tên trùng với phòng ban khác
  if (dto.name) {
    const existing = await repo.findByName(dto.name);
    if (existing && existing.id !== id) {
      throw AppError.conflict(`Phòng ban '${dto.name}' đã tồn tại.`);
    }
  }

  // Kiểm tra headUser
  if (dto.headUserId) {
    await _assertUserExists(dto.headUserId, 'Trưởng phòng');
  }

  return repo.update(id, _clean(dto));
}

// ── Delete ────────────────────────────────────────────────────

/**
 * Xóa phòng ban:
 * - Nếu còn nhân viên đang làm việc → deactivate (không xóa cứng)
 * - Nếu không còn ai → xóa cứng
 */
async function deleteDepartment(id) {
  await _assertDeptExists(id);

  const memberCount = await repo.countActiveMembers(id);

  if (memberCount > 0) {
    // Còn nhân viên → chỉ deactivate
    await repo.deactivate(id);
    return { deleted: false, deactivated: true, memberCount };
  }

  // Không còn ai → xóa cứng
  // Trước khi xóa, tách headUserId ra (nếu có) để tránh FK constraint
  await prisma.department.update({
    where: { id },
    data: { headUserId: null },
  });

  await repo.hardDelete(id);
  return { deleted: true, deactivated: false };
}

// ── Helpers ───────────────────────────────────────────────────

async function _assertDeptExists(id) {
  const dept = await repo.findById(id);
  if (!dept) throw AppError.notFound('Không tìm thấy phòng ban.');
  return dept;
}

async function _assertUserExists(userId, label = 'Người dùng') {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.badRequest(`${label} không tồn tại.`);
  if (user.employmentStatus === 'TERMINATED') {
    throw AppError.badRequest(`${label} đã nghỉ việc, không thể gán.`);
  }
  return user;
}

function _clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

module.exports = {
  listDepartments,
  getDepartmentById,
  getDepartmentMembers,
  getDepartmentOptions,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};