'use strict';

// ── PayrollPeriod ─────────────────────────────────────────────

function toPeriodDto(period) {
  if (!period) return null;
  return {
    id: period.id,
    periodCode: period.periodCode,
    month: period.month,
    year: period.year,
    startDate: period.startDate,
    endDate: period.endDate,
    payDate: period.payDate,
    status: period.status,
    workingDaysInPeriod: period.workingDaysInPeriod,
    standardWorkingMinutes: period.standardWorkingMinutes,
    approvedBy: period.approvedBy ?? null,
    approvedAt: period.approvedAt,
    paidAt: period.paidAt,
    lockedAt: period.lockedAt,
    notes: period.notes,
    recordCount: period._count?.payrollRecords ?? 0,
    adjustmentCount: period._count?.payrollAdjustments ?? 0,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  };
}

// ── UserCompensation ──────────────────────────────────────────

function toCompensationDto(comp) {
  if (!comp) return null;
  return {
    id: comp.id,
    user: comp.user ?? null,
    salaryType: comp.salaryType,
    baseSalary: _n(comp.baseSalary),
    probationSalary: comp.probationSalary ? _n(comp.probationSalary) : null,
    standardWorkingDays: comp.standardWorkingDays,
    standardWorkingHours: comp.standardWorkingHours ? _n(comp.standardWorkingHours) : null,
    currency: comp.currency,
    payFrequency: comp.payFrequency,
    payDayOfMonth: comp.payDayOfMonth,
    probationEndDate: comp.probationEndDate,
    changeReason: comp.changeReason,
    overtimeRateWeekday: _n(comp.overtimeRateWeekday),
    overtimeRateWeekend: _n(comp.overtimeRateWeekend),
    overtimeRateHoliday: _n(comp.overtimeRateHoliday),
    effectiveFrom: comp.effectiveFrom,
    effectiveTo: comp.effectiveTo,
    isActive: comp.isActive,
    notes: comp.notes,
    createdAt: comp.createdAt,
    updatedAt: comp.updatedAt,
  };
}

// ── SalaryComponent ───────────────────────────────────────────

function toSalaryComponentDto(sc) {
  if (!sc) return null;
  return {
    id: sc.id,
    code: sc.code,
    name: sc.name,
    componentType: sc.componentType,
    calculationType: sc.calculationType,
    isTaxable: sc.isTaxable,
    isInsurable: sc.isInsurable,
    isActive: sc.isActive,
    displayOrder: sc.displayOrder,
    description: sc.description,
    createdAt: sc.createdAt,
    updatedAt: sc.updatedAt,
  };
}

function toUserSalaryComponentDto(usc) {
  if (!usc) return null;
  return {
    id: usc.id,
    userId: usc.userId,
    salaryComponent: usc.salaryComponent ? toSalaryComponentDto(usc.salaryComponent) : null,
    amount: _n(usc.amount),
    effectiveFrom: usc.effectiveFrom,
    effectiveTo: usc.effectiveTo,
    isActive: usc.isActive,
    notes: usc.notes,
    createdAt: usc.createdAt,
  };
}

// ── PayrollAdjustment ─────────────────────────────────────────

function toAdjustmentDto(adj) {
  if (!adj) return null;
  return {
    id: adj.id,
    user: adj.user ?? null,
    payrollPeriod: adj.payrollPeriod ?? null,
    adjustmentType: adj.adjustmentType,
    amount: _n(adj.amount),
    reason: adj.reason,
    status: adj.status,
    isAdvance: adj.isAdvance,
    advanceRecoveredAmount: _n(adj.advanceRecoveredAmount),
    advanceFullyRecovered: adj.advanceFullyRecovered,
    createdBy: adj.createdBy ?? null,
    approvedBy: adj.approvedBy ?? null,
    createdAt: adj.createdAt,
    updatedAt: adj.updatedAt,
  };
}

// ── PayrollRecord (Phiếu lương) ───────────────────────────────

function toRecordDto(record) {
  if (!record) return null;
  return {
    id: record.id,
    user: record.user ?? null,
    payrollPeriod: record.payrollPeriod ?? null,

    // Ngày công
    baseSalary: _n(record.baseSalary),
    workingDays: record.workingDays ? _n(record.workingDays) : null,
    paidLeaveDays: record.paidLeaveDays ? _n(record.paidLeaveDays) : null,
    unpaidLeaveDays: record.unpaidLeaveDays ? _n(record.unpaidLeaveDays) : null,
    absentDays: record.absentDays ? _n(record.absentDays) : null,
    lateDays: record.lateDays,

    // OT
    overtimeWeekdayMinutes: record.overtimeWeekdayMinutes,
    overtimeWeekendMinutes: record.overtimeWeekendMinutes,
    overtimeHolidayMinutes: record.overtimeHolidayMinutes,
    totalOvertimePay: _n(record.totalOvertimePay),

    // Tổng thu nhập
    grossSalary: _n(record.grossSalary),
    totalAllowances: _n(record.totalAllowances),
    totalBonus: _n(record.totalBonus),

    // Bảo hiểm & thuế
    socialInsuranceEmployee: _n(record.socialInsuranceEmployee),
    healthInsuranceEmployee: _n(record.healthInsuranceEmployee),
    unemploymentInsuranceEmployee: _n(record.unemploymentInsuranceEmployee),
    taxableIncome: _n(record.taxableIncome),
    personalIncomeTax: _n(record.personalIncomeTax),

    // Tổng khấu trừ & thực nhận
    totalDeductions: _n(record.totalDeductions),
    netSalary: _n(record.netSalary),

    dailyRate: record.dailyRate ? _n(record.dailyRate) : null,
    hourlyRate: record.hourlyRate ? _n(record.hourlyRate) : null,

    status: record.status,
    items: (record.items ?? []).map(toRecordItemDto),
    generatedAt: record.generatedAt,
    approvedAt: record.approvedAt,
    paidAt: record.paidAt,
    paymentRef: record.paymentRef,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toRecordItemDto(item) {
  if (!item) return null;
  return {
    id: item.id,
    salaryComponent: item.salaryComponent ?? null,
    itemName: item.itemName,
    itemType: item.itemType,
    amount: _n(item.amount),
    sourceType: item.sourceType,
    quantity: item.quantity ? _n(item.quantity) : null,
    unitRate: item.unitRate ? _n(item.unitRate) : null,
    notes: item.notes,
  };
}

/**
 * DTO tóm tắt cho danh sách bảng lương (không kèm items chi tiết)
 */
function toRecordSummaryDto(record) {
  const dto = toRecordDto(record);
  if (!dto) return null;
  const { items, ...summary } = dto;
  return summary;
}

// ── Helpers ───────────────────────────────────────────────────

/** Chuyển Decimal Prisma → số JS, làm tròn 2 chữ số */
function _n(val) {
  if (val === null || val === undefined) return 0;
  return Math.round(Number(val) * 100) / 100;
}

module.exports = {
  toPeriodDto,
  toCompensationDto,
  toSalaryComponentDto,
  toUserSalaryComponentDto,
  toAdjustmentDto,
  toRecordDto,
  toRecordItemDto,
  toRecordSummaryDto,
};
