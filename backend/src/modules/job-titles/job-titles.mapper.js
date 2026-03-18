"use strict";

function toJobTitleDto(jt) {
  if (!jt) return null;
  return {
    id: jt.id,
    name: jt.name,
    code: jt.code,
    description: jt.description,
    isActive: jt.isActive,
    // ✅ Map _count.users từ Prisma include
    _count: {
      users: jt._count?.users ?? 0,
    },
    createdAt: jt.createdAt,
    updatedAt: jt.updatedAt,
  };
}

function toJobTitleDetailDto(jt, userCount = 0) {
  if (!jt) return null;
  return { ...toJobTitleDto(jt), userCount };
}

function toJobTitleOptionDto(jt) {
  return { id: jt.id, name: jt.name, code: jt.code };
}

module.exports = { toJobTitleDto, toJobTitleDetailDto, toJobTitleOptionDto };
