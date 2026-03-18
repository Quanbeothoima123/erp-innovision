"use strict";

/**
 * toDepartmentDto — Trả về cho tất cả roles
 * toDepartmentDetailDto — Kèm stats thành viên (HR/Admin)
 */

function toDepartmentDto(dept) {
  if (!dept) return null;
  return {
    id: dept.id,
    name: dept.name,
    description: dept.description,
    headUserId: dept.headUserId,
    headUser: dept.headUser ?? null,
    isActive: dept.isActive,
    // ✅ Map từ Prisma _count (luôn có nhờ DEPARTMENT_INCLUDE) hoặc memberCount từ service
    _count: {
      members: dept._count?.members ?? dept.memberCount ?? 0,
    },
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
  };
}

function toDepartmentDetailDto(dept, stats = null, memberCount = 0) {
  if (!dept) return null;
  return {
    ...toDepartmentDto(dept),
    memberCount,
    memberStats: stats ?? null,
  };
}

/** DTO gọn cho dropdown/select */
function toDepartmentOptionDto(dept) {
  return { id: dept.id, name: dept.name };
}

module.exports = {
  toDepartmentDto,
  toDepartmentDetailDto,
  toDepartmentOptionDto,
};
