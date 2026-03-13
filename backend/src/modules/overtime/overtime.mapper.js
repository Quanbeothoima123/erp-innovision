'use strict';

// ── OvertimeRequest DTO ───────────────────────────────────────

function toOvertimeDto(ot) {
  if (!ot) return null;
  return {
    id: ot.id,
    user: ot.user ?? null,
    workDate: ot.workDate,
    startTime: ot.startTime,
    endTime: ot.endTime,
    plannedMinutes: ot.plannedMinutes,
    plannedHours: _minsToHours(ot.plannedMinutes),
    actualMinutes: ot.actualMinutes,
    actualHours: ot.actualMinutes ? _minsToHours(ot.actualMinutes) : null,
    isHoliday: ot.isHoliday,
    isWeekend: ot.isWeekend,
    dayType: _dayTypeLabel(ot.isHoliday, ot.isWeekend),
    reason: ot.reason,
    status: ot.status,
    approver: ot.approver ?? null,
    comment: ot.comment,
    submittedAt: ot.submittedAt,
    actionAt: ot.actionAt,
    createdAt: ot.createdAt,
    updatedAt: ot.updatedAt,
  };
}

/**
 * DTO kèm tính toán OT pay (chỉ dùng khi có compensation)
 */
function toOvertimeDtoWithPay(ot, compensation) {
  const base = toOvertimeDto(ot);
  if (!compensation) return { ...base, otPay: null };

  const otPay = _calcOTPay(
    ot.actualMinutes ?? ot.plannedMinutes,
    compensation,
    ot.isHoliday,
    ot.isWeekend,
  );

  return {
    ...base,
    otPay: {
      currency: compensation.currency,
      amount: otPay,
      rate: _getRate(compensation, ot.isHoliday, ot.isWeekend),
      baseSalary: Number(compensation.baseSalary),
    },
  };
}

// ── Monthly Stats DTO ─────────────────────────────────────────

function toMonthlyOTStatsDto(records, year, month) {
  let totalPlannedMinutes = 0;
  let totalApprovedMinutes = 0;
  let weekdayMinutes = 0;
  let weekendMinutes = 0;
  let holidayMinutes = 0;
  let sessionCount = records.length;

  for (const r of records) {
    const mins = r.actualMinutes ?? r.plannedMinutes;
    totalPlannedMinutes += r.plannedMinutes;
    totalApprovedMinutes += mins;

    if (r.isHoliday) holidayMinutes += mins;
    else if (r.isWeekend) weekendMinutes += mins;
    else weekdayMinutes += mins;
  }

  return {
    year,
    month: month ?? null,
    sessionCount,
    totalPlannedMinutes,
    totalPlannedHours: _minsToHours(totalPlannedMinutes),
    totalApprovedMinutes,
    totalApprovedHours: _minsToHours(totalApprovedMinutes),
    breakdown: {
      weekdayMinutes,
      weekdayHours: _minsToHours(weekdayMinutes),
      weekendMinutes,
      weekendHours: _minsToHours(weekendMinutes),
      holidayMinutes,
      holidayHours: _minsToHours(holidayMinutes),
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────

function _minsToHours(minutes) {
  if (!minutes) return 0;
  return Math.round((minutes / 60) * 100) / 100; // 2 chữ số thập phân
}

function _dayTypeLabel(isHoliday, isWeekend) {
  if (isHoliday) return 'Ngày lễ';
  if (isWeekend) return 'Cuối tuần';
  return 'Ngày thường';
}

/**
 * Tính tiền OT = (baseSalary / standardWorkingDays / standardWorkingHours) × rate × hours
 */
function _calcOTPay(minutes, compensation, isHoliday, isWeekend) {
  if (!compensation?.baseSalary) return null;

  const rate = _getRate(compensation, isHoliday, isWeekend);
  const workingDays = compensation.standardWorkingDays ?? 26;
  const workingHours = Number(compensation.standardWorkingHours ?? 8);
  const baseSalary = Number(compensation.baseSalary);

  // Đơn giá giờ = lương cơ bản / (số ngày chuẩn × số giờ chuẩn)
  const hourlyRate = baseSalary / workingDays / workingHours;
  const otHours = minutes / 60;

  return Math.round(hourlyRate * rate * otHours);
}

function _getRate(compensation, isHoliday, isWeekend) {
  if (isHoliday) return Number(compensation.overtimeRateHoliday ?? 3.0);
  if (isWeekend) return Number(compensation.overtimeRateWeekend ?? 2.0);
  return Number(compensation.overtimeRateWeekday ?? 1.5);
}

module.exports = {
  toOvertimeDto,
  toOvertimeDtoWithPay,
  toMonthlyOTStatsDto,
};
