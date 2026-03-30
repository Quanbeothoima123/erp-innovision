"use strict";

// ── WorkShift ─────────────────────────────────────────────────

function toShiftDto(shift) {
  if (!shift) return null;
  return {
    id: shift.id,
    code: shift.code,
    name: shift.name,
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: shift.breakMinutes,
    workMinutes: shift.workMinutes,
    isNightShift: shift.isNightShift,
    overtimeAfterMinutes: shift.overtimeAfterMinutes,
    isActive: shift.isActive,
    // Map _count.userWorkShifts từ Prisma include
    _count: { members: shift._count?.userWorkShifts ?? 0 },
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

function toShiftOptionDto(shift) {
  return {
    id: shift.id,
    code: shift.code,
    name: shift.name,
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    endTime: shift.endTime,
    workMinutes: shift.workMinutes,
    isActive: shift.isActive ?? true, // FIX: cần cho frontend filter
  };
}

function toUserWorkShiftDto(uws) {
  if (!uws) return null;
  return {
    id: uws.id,
    userId: uws.userId,
    shift: uws.shift ? toShiftOptionDto(uws.shift) : null,
    dayOfWeek: uws.dayOfWeek,
    dayOfWeekLabel: _dayLabel(uws.dayOfWeek),
    effectiveFrom: uws.effectiveFrom,
    effectiveTo: uws.effectiveTo,
    isActive: uws.isActive,
    notes: uws.notes,
    createdAt: uws.createdAt,
  };
}

// ── Holiday ───────────────────────────────────────────────────

function toHolidayDto(holiday) {
  if (!holiday) return null;
  return {
    id: holiday.id,
    name: holiday.name,
    date: holiday.date,
    year: holiday.year,
    isRecurring: holiday.isRecurring,
    description: holiday.description,
    overtimeMultiplier: holiday.overtimeMultiplier,
    createdAt: holiday.createdAt,
    updatedAt: holiday.updatedAt,
  };
}

// ── AttendanceRequest ─────────────────────────────────────────

function toAttendanceRequestDto(req) {
  if (!req) return null;
  return {
    id: req.id,
    user: req.user ?? null,
    requestType: req.requestType,
    requestedAt: req.requestedAt,
    workDate: req.workDate,
    shift: req.shift ?? null,
    isRemoteWork: req.isRemoteWork,
    note: req.note,
    imageUrl: req.imageUrl,
    status: req.status,
    reviewer: req.reviewer ?? null,
    reviewedAt: req.reviewedAt,
    rejectReason: req.rejectReason,
    generatedCheckinRecord: req.generatedCheckinRecord ?? null,
    generatedCheckoutRecord: req.generatedCheckoutRecord ?? null,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

// ── AttendanceRecord ──────────────────────────────────────────

function toAttendanceRecordDto(record) {
  if (!record) return null;
  return {
    id: record.id,
    user: record.user ?? null,
    workDate: record.workDate,
    shift: record.shift ?? null,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    totalWorkMinutes: record.totalWorkMinutes,
    lateMinutes: record.lateMinutes,
    earlyLeaveMinutes: record.earlyLeaveMinutes,
    overtimeMinutes: record.overtimeMinutes,
    overtimeApprovedMinutes: record.overtimeApprovedMinutes,
    isHolidayWork: record.isHolidayWork,
    isWeekendWork: record.isWeekendWork,
    isRemoteWork: record.isRemoteWork,
    status: record.status,
    note: record.note,
    adjustedBy: record.adjustedBy ?? null,
    sourceCheckin: record.sourceCheckin ?? null,
    sourceCheckout: record.sourceCheckout ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * DTO tổng hợp thống kê tháng
 */
function toMonthlyStatsDto(records, year, month) {
  const summary = {
    year,
    month,
    totalDays: records.length,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    adjustedDays: 0,
    totalWorkMinutes: 0,
    totalLateMinutes: 0,
    totalEarlyLeaveMinutes: 0,
    totalOvertimeMinutes: 0,
    weekendWorkDays: 0,
    holidayWorkDays: 0,
  };

  for (const r of records) {
    if (r.status === "PRESENT") summary.presentDays++;
    else if (r.status === "MANUAL_ADJUSTED") {
      summary.presentDays++;
      summary.adjustedDays++;
    } else if (r.status === "ABSENT") summary.absentDays++;
    else if (r.status === "LEAVE") summary.leaveDays++;
    else if (r.status === "HOLIDAY") summary.holidayDays++;

    summary.totalWorkMinutes += r.totalWorkMinutes ?? 0;
    summary.totalLateMinutes += r.lateMinutes ?? 0;
    summary.totalEarlyLeaveMinutes += r.earlyLeaveMinutes ?? 0;
    summary.totalOvertimeMinutes += r.overtimeMinutes ?? 0;
    if (r.isWeekendWork) summary.weekendWorkDays++;
    if (r.isHolidayWork) summary.holidayWorkDays++;
  }

  return summary;
}

// ── Private helper ────────────────────────────────────────────

function _dayLabel(dayOfWeek) {
  const labels = {
    null: "Tất cả ngày",
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
    7: "Chủ Nhật",
  };
  return labels[dayOfWeek] ?? "Tất cả ngày";
}

module.exports = {
  toShiftDto,
  toShiftOptionDto,
  toUserWorkShiftDto,
  toHolidayDto,
  toAttendanceRequestDto,
  toAttendanceRecordDto,
  toMonthlyStatsDto,
};
