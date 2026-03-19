'use strict';

const repo = require('./payroll.repository');
const { AppError } = require('../../common/errors/AppError');
const { prisma } = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL PERIOD                                          ║
// ╚══════════════════════════════════════════════════════════╝

async function listPeriods(filters) {
  const { periods, total } = await repo.findManyPeriods(filters);
  return { periods, pagination: _page(filters, total) };
}

async function getPeriodById(id) {
  const p = await repo.findPeriodById(id);
  if (!p) throw AppError.notFound('Không tìm thấy kỳ lương.');
  return p;
}

async function createPeriod(dto) {
  const existing = await repo.findPeriodByMonthYear(dto.month, dto.year);
  if (existing) {
    throw AppError.conflict(`Kỳ lương tháng ${dto.month}/${dto.year} đã tồn tại.`);
  }

  const periodCode = `${dto.year}-${String(dto.month).padStart(2, '0')}`;

  return repo.createPeriod({
    periodCode,
    month: dto.month,
    year: dto.year,
    startDate: _toDateOnly(dto.startDate),
    endDate: _toDateOnly(dto.endDate),
    payDate: dto.payDate ? _toDateOnly(dto.payDate) : null,
    workingDaysInPeriod: dto.workingDaysInPeriod ?? null,
    notes: dto.notes ?? null,
    status: 'DRAFT',
  });
}

async function updatePeriod(id, dto) {
  const period = await _assertPeriodExists(id);
  if (['APPROVED', 'PAID'].includes(period.status)) {
    throw AppError.badRequest('Không thể chỉnh sửa kỳ lương đã duyệt hoặc đã thanh toán.');
  }
  return repo.updatePeriod(id, _clean(dto));
}

/**
 * Tính lương toàn bộ nhân viên cho kỳ lương.
 * Period phải ở trạng thái DRAFT hoặc CALCULATING.
 * Sau khi chạy xong → status = CALCULATING (có thể chạy lại).
 */
async function calculatePeriod(id, requestingUser) {
  const period = await _assertPeriodExists(id);

  if (['APPROVED', 'PAID', 'CANCELLED'].includes(period.status)) {
    throw AppError.badRequest(`Không thể tính lại kỳ ở trạng thái '${period.status}'.`);
  }

  // Chuyển sang CALCULATING
  await repo.updatePeriod(id, { status: 'CALCULATING' });

  const users = await repo.findActiveUsersForPayroll();
  const [insurancePolicies, taxPolicy] = await Promise.all([
    repo.findActiveInsurancePolicies(),
    repo.findActiveTaxPolicy(period.year),
  ]);

  const errors = [];
  let calculatedCount = 0;

  for (const user of users) {
    try {
      await _calculateUserPayroll(user.id, period, insurancePolicies, taxPolicy);
      calculatedCount++;
    } catch (err) {
      errors.push({ userId: user.id, fullName: user.fullName, error: err.message });
    }
  }

  return {
    period: await repo.findPeriodById(id),
    calculatedCount,
    totalUsers: users.length,
    errors,
  };
}

/**
 * HR/Admin duyệt kỳ lương → APPROVED → khóa không cho tính lại.
 */
async function approvePeriod(id, requestingUser, notes) {
  const period = await _assertPeriodExists(id);

  if (period.status !== 'CALCULATING') {
    throw AppError.badRequest('Chỉ có thể duyệt kỳ lương ở trạng thái CALCULATING.');
  }

  // Kiểm tra còn record DRAFT không
  const draftCount = await prisma.payrollRecord.count({
    where: { payrollPeriodId: id, status: 'DRAFT' },
  });
  if (draftCount > 0) {
    throw AppError.badRequest(
      `Còn ${draftCount} phiếu lương chưa được tính. Vui lòng chạy tính lương lại.`,
    );
  }

  // Approve toàn bộ records
  await prisma.payrollRecord.updateMany({
    where: { payrollPeriodId: id, status: 'DRAFT' },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });

  return repo.updatePeriod(id, {
    status: 'APPROVED',
    approvedAt: new Date(),
    lockedAt: new Date(),
    approvedByUserId: requestingUser.id,
    ...(notes && { notes }),
  });
}

/**
 * Đánh dấu kỳ lương đã thanh toán → PAID.
 */
async function markPeriodPaid(id, dto) {
  const period = await _assertPeriodExists(id);
  if (period.status !== 'APPROVED') {
    throw AppError.badRequest('Chỉ có thể đánh dấu đã trả cho kỳ lương đã duyệt.');
  }

  await prisma.payrollRecord.updateMany({
    where: { payrollPeriodId: id, status: 'APPROVED' },
    data: { status: 'PAID', paidAt: dto.paidAt ?? new Date() },
  });

  return repo.updatePeriod(id, {
    status: 'PAID',
    paidAt: dto.paidAt ?? new Date(),
    ...(dto.notes && { notes: dto.notes }),
  });
}

async function cancelPeriod(id) {
  const period = await _assertPeriodExists(id);
  if (['APPROVED', 'PAID'].includes(period.status)) {
    throw AppError.badRequest('Không thể hủy kỳ lương đã duyệt hoặc đã thanh toán.');
  }
  return repo.updatePeriod(id, { status: 'CANCELLED' });
}

/**
 * Xóa hẳn kỳ lương — CHỈ được xóa khi status = CANCELLED.
 * Cho phép tạo lại kỳ lương cùng tháng/năm sau khi đã hủy.
 */
async function deletePeriod(id) {
  const period = await _assertPeriodExists(id);
  if (period.status !== 'CANCELLED') {
    throw AppError.badRequest(
      'Chỉ có thể xóa kỳ lương đã hủy (CANCELLED). Vui lòng hủy kỳ lương trước.',
    );
  }
  // Xóa records và adjustments liên quan trước
  await prisma.payrollRecord.deleteMany({ where: { payrollPeriodId: id } });
  await prisma.payrollAdjustment.deleteMany({ where: { payrollPeriodId: id } });
  return prisma.payrollPeriod.delete({ where: { id } });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  USER COMPENSATION                                       ║
// ╚══════════════════════════════════════════════════════════╝

async function listCompensations(filters) {
  const { compensations, total } = await repo.findManyCompensations(filters);
  return { compensations, pagination: _page(filters, total) };
}

async function getCompensationById(id) {
  const c = await repo.findCompensationById(id);
  if (!c) throw AppError.notFound('Không tìm thấy cấu hình lương.');
  return c;
}

async function getActiveCompensation(userId) {
  return repo.findActiveCompensation(userId);
}

async function getCompensationHistory(userId) {
  return repo.findCompensationHistory(userId);
}

/**
 * Tạo cấu hình lương mới.
 * Deactivate record cũ (isActive=false, effectiveTo = effectiveFrom - 1 ngày).
 */
async function createCompensation(dto) {
  const effectiveFrom = _toDateOnly(dto.effectiveFrom);

  return prisma.$transaction(async (tx) => {
    // Deactivate tất cả compensation active cũ của user
    const existing = await tx.userCompensation.findMany({
      where: { userId: dto.userId, isActive: true },
    });

    for (const old of existing) {
      const effectiveTo = new Date(effectiveFrom);
      effectiveTo.setDate(effectiveTo.getDate() - 1);
      await tx.userCompensation.update({
        where: { id: old.id },
        data: { isActive: false, effectiveTo },
      });
    }

    // Tạo mới
    return tx.userCompensation.create({
      data: {
        userId: dto.userId,
        salaryType: dto.salaryType,
        baseSalary: dto.baseSalary,
        probationSalary: dto.probationSalary ?? null,
        standardWorkingDays: dto.standardWorkingDays ?? 26,
        standardWorkingHours: dto.standardWorkingHours ?? 8,
        currency: dto.currency ?? 'VND',
        payFrequency: dto.payFrequency ?? 'MONTHLY',
        payDayOfMonth: dto.payDayOfMonth ?? null,
        probationEndDate: dto.probationEndDate ?? null,
        changeReason: dto.changeReason ?? null,
        overtimeRateWeekday: dto.overtimeRateWeekday ?? 1.5,
        overtimeRateWeekend: dto.overtimeRateWeekend ?? 2.0,
        overtimeRateHoliday: dto.overtimeRateHoliday ?? 3.0,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? _toDateOnly(dto.effectiveTo) : null,
        isActive: true,
        notes: dto.notes ?? null,
      },
      include: { user: { select: { id: true, fullName: true, userCode: true } } },
    });
  });
}

async function updateCompensation(id, dto) {
  const comp = await repo.findCompensationById(id);
  if (!comp) throw AppError.notFound('Không tìm thấy cấu hình lương.');
  return repo.updateCompensation(id, _clean(dto));
}

// ╔══════════════════════════════════════════════════════════╗
// ║  SALARY COMPONENT                                        ║
// ╚══════════════════════════════════════════════════════════╝

async function listSalaryComponents(filters) {
  const { components, total } = await repo.findManySalaryComponents(filters);
  return { components, pagination: _page(filters, total) };
}

async function getSalaryComponentOptions() {
  return repo.findAllActiveSalaryComponents();
}

async function getSalaryComponentById(id) {
  const sc = await repo.findSalaryComponentById(id);
  if (!sc) throw AppError.notFound('Không tìm thấy thành phần lương.');
  return sc;
}

async function createSalaryComponent(dto) {
  const existing = await repo.findSalaryComponentByCode(dto.code);
  if (existing) throw AppError.conflict(`Mã thành phần '${dto.code}' đã tồn tại.`);
  return repo.createSalaryComponent(dto);
}

async function updateSalaryComponent(id, dto) {
  const sc = await repo.findSalaryComponentById(id);
  if (!sc) throw AppError.notFound('Không tìm thấy thành phần lương.');
  return repo.updateSalaryComponent(id, _clean(dto));
}

// ── UserSalaryComponent ───────────────────────────────────────

async function getUserSalaryComponents(userId) {
  return repo.findUserSalaryComponents(userId);
}

async function assignSalaryComponent(dto) {
  const sc = await repo.findSalaryComponentById(dto.salaryComponentId);
  if (!sc) throw AppError.badRequest('Thành phần lương không tồn tại.');
  if (!sc.isActive) throw AppError.badRequest('Thành phần lương đã bị vô hiệu hóa.');

  return repo.assignSalaryComponent({
    userId: dto.userId,
    salaryComponentId: dto.salaryComponentId,
    amount: dto.amount,
    effectiveFrom: _toDateOnly(dto.effectiveFrom),
    effectiveTo: dto.effectiveTo ? _toDateOnly(dto.effectiveTo) : null,
    isActive: true,
    notes: dto.notes ?? null,
  });
}

async function removeUserSalaryComponent(id) {
  return repo.deactivateUserSalaryComponent(id);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL ADJUSTMENT                                      ║
// ╚══════════════════════════════════════════════════════════╝

async function listAdjustments(filters) {
  const { adjustments, total } = await repo.findManyAdjustments(filters);
  return { adjustments, pagination: _page(filters, total) };
}

async function getAdjustmentById(id) {
  const adj = await repo.findAdjustmentById(id);
  if (!adj) throw AppError.notFound('Không tìm thấy điều chỉnh lương.');
  return adj;
}

async function createAdjustment(dto, createdByUserId) {
  return repo.createAdjustment({
    userId: dto.userId,
    payrollPeriodId: dto.payrollPeriodId ?? null,
    adjustmentType: dto.adjustmentType,
    amount: dto.amount,
    reason: dto.reason ?? null,
    status: 'PENDING',
    isAdvance: dto.adjustmentType === 'ADVANCE',
    createdByUserId,
  });
}

async function approveAdjustment(id, requestingUser) {
  const adj = await repo.findAdjustmentById(id);
  if (!adj) throw AppError.notFound('Không tìm thấy điều chỉnh lương.');
  if (adj.status !== 'PENDING') {
    throw AppError.badRequest(`Điều chỉnh đã ở trạng thái '${adj.status}'.`);
  }
  return repo.updateAdjustment(id, {
    status: 'APPROVED',
    approvedByUserId: requestingUser.id,
  });
}

async function rejectAdjustment(id, requestingUser, reason) {
  const adj = await repo.findAdjustmentById(id);
  if (!adj) throw AppError.notFound('Không tìm thấy điều chỉnh lương.');
  if (adj.status !== 'PENDING') {
    throw AppError.badRequest(`Điều chỉnh đã ở trạng thái '${adj.status}'.`);
  }
  return repo.updateAdjustment(id, {
    status: 'REJECTED',
    approvedByUserId: requestingUser.id,
    reason: reason ?? adj.reason,
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYROLL RECORD                                          ║
// ╚══════════════════════════════════════════════════════════╝

async function listRecords(filters, requestingUser) {
  // Nhân viên chỉ xem phiếu lương của mình
  if (!_isHrOrAdmin(requestingUser)) {
    filters.userId = requestingUser.id;
  }
  const { records, total } = await repo.findManyRecords(filters);
  return { records, pagination: _page(filters, total) };
}

async function getRecordById(id, requestingUser) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound('Không tìm thấy phiếu lương.');
  if (!_isHrOrAdmin(requestingUser) && record.userId !== requestingUser.id) {
    throw AppError.forbidden('Bạn không có quyền xem phiếu lương này.');
  }
  return record;
}

async function getMyPayslip(userId, payrollPeriodId) {
  const record = await repo.findRecordByPeriodAndUser(payrollPeriodId, userId);
  if (!record) throw AppError.notFound('Không tìm thấy phiếu lương trong kỳ này.');
  return record;
}

async function updateRecordNotes(id, notes) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound('Không tìm thấy phiếu lương.');
  if (record.status === 'PAID') throw AppError.badRequest('Không thể chỉnh sửa phiếu đã thanh toán.');
  return repo.updatePayrollRecord(id, { notes });
}

async function markRecordPaid(id, dto) {
  const record = await repo.findRecordById(id);
  if (!record) throw AppError.notFound('Không tìm thấy phiếu lương.');
  if (record.status === 'PAID') throw AppError.badRequest('Phiếu đã được đánh dấu thanh toán.');
  return repo.updatePayrollRecord(id, {
    status: 'PAID',
    paidAt: dto.paidAt ?? new Date(),
    paymentRef: dto.paymentRef ?? null,
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CALCULATION ENGINE                                      ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tính lương cho 1 nhân viên trong 1 kỳ.
 * Được gọi trong vòng lặp của calculatePeriod().
 */
async function _calculateUserPayroll(userId, period, insurancePolicies, taxPolicy) {
  // 1. Lấy cấu hình lương
  const compensation = await repo.findActiveCompensation(userId);
  if (!compensation) return; // Skip nếu chưa cấu hình lương

  const baseSalary = Number(compensation.baseSalary);
  const workingDaysStandard = compensation.standardWorkingDays ?? 26;
  const workingHoursStandard = Number(compensation.standardWorkingHours ?? 8);
  const dailyRate = baseSalary / workingDaysStandard;
  const hourlyRate = dailyRate / workingHoursStandard;

  // 2. Tổng hợp chấm công
  const attendanceRecords = await repo.getAttendanceSummary(
    userId, period.startDate, period.endDate,
  );

  const workingDays = attendanceRecords.filter(
    (r) => ['PRESENT', 'MANUAL_ADJUSTED', 'HOLIDAY', 'LEAVE'].includes(r.status),
  ).length;
  const absentDays = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
  const lateDays = attendanceRecords.filter((r) => r.lateMinutes > 30).length; // > 30 phút mới tính ngày trễ

  // 3. Nghỉ phép
  const leaveRecords = await repo.getApprovedLeaveSummary(
    userId, period.startDate, period.endDate,
  );
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  for (const lr of leaveRecords) {
    const days = Number(lr.totalDays);
    if (lr.leaveType?.isPaid) paidLeaveDays += days;
    else unpaidLeaveDays += days;
  }

  // 4. Lương theo ngày công thực tế
  // Nếu nhân viên vắng không phép → trừ tiền
  const effectiveDays = workingDays - absentDays - unpaidLeaveDays;
  const actualBaseSalary = baseSalary * (effectiveDays / workingDaysStandard);

  // 5. Phụ cấp & khấu trừ cố định từ UserSalaryComponent
  const userComponents = await repo.findUserSalaryComponentsAtDate(userId, period.endDate);
  const allowanceItems = [];
  const deductionItems = [];
  let totalAllowances = 0;

  for (const uc of userComponents) {
    const sc = uc.salaryComponent;
    const amount = Number(uc.amount);
    if (sc.componentType === 'EARNING') {
      totalAllowances += amount;
      allowanceItems.push({
        salaryComponentId: sc.id,
        itemName: sc.name,
        itemType: 'EARNING',
        amount,
        sourceType: 'ALLOWANCE',
        quantity: null, unitRate: null, notes: null,
      });
    } else {
      deductionItems.push({
        salaryComponentId: sc.id,
        itemName: sc.name,
        itemType: 'DEDUCTION',
        amount,
        sourceType: 'MANUAL',
        quantity: null, unitRate: null, notes: null,
      });
    }
  }

  // 6. Tính OT
  const otRecords = await repo.getApprovedOTSummary(userId, period.startDate, period.endDate);
  let otWeekdayMins = 0, otWeekendMins = 0, otHolidayMins = 0;
  let totalOvertimePay = 0;

  for (const ot of otRecords) {
    const mins = ot.actualMinutes ?? ot.plannedMinutes;
    const hours = mins / 60;
    let rate, otPay;

    if (ot.isHoliday) {
      otHolidayMins += mins;
      rate = Number(compensation.overtimeRateHoliday ?? 3.0);
    } else if (ot.isWeekend) {
      otWeekendMins += mins;
      rate = Number(compensation.overtimeRateWeekend ?? 2.0);
    } else {
      otWeekdayMins += mins;
      rate = Number(compensation.overtimeRateWeekday ?? 1.5);
    }

    otPay = Math.round(hourlyRate * rate * hours);
    totalOvertimePay += otPay;
  }

  if (totalOvertimePay > 0) {
    allowanceItems.push({
      salaryComponentId: null,
      itemName: 'Lương làm thêm giờ',
      itemType: 'EARNING',
      amount: totalOvertimePay,
      sourceType: 'OVERTIME',
      quantity: null, unitRate: null, notes: null,
    });
  }

  // 7. Điều chỉnh lương (bonus / deduction đã duyệt)
  const adjustments = await repo.findApprovedAdjustmentsForPeriod(userId, period.id);
  let totalBonus = 0;
  let totalAdjDeductions = 0;

  for (const adj of adjustments) {
    const amount = Number(adj.amount);
    if (['BONUS', 'REIMBURSEMENT'].includes(adj.adjustmentType)) {
      totalBonus += amount;
      allowanceItems.push({
        salaryComponentId: null,
        itemName: adj.adjustmentType === 'BONUS' ? 'Thưởng' : 'Hoàn tiền',
        itemType: 'EARNING',
        amount,
        sourceType: 'BONUS',
        quantity: null, unitRate: null,
        notes: adj.reason ?? null,
      });
    } else if (['DEDUCTION', 'ADVANCE'].includes(adj.adjustmentType)) {
      totalAdjDeductions += amount;
      deductionItems.push({
        salaryComponentId: null,
        itemName: adj.adjustmentType === 'ADVANCE' ? 'Khấu trừ tạm ứng' : 'Khấu trừ khác',
        itemType: 'DEDUCTION',
        amount,
        sourceType: adj.adjustmentType === 'ADVANCE' ? 'ADVANCE' : 'MANUAL',
        quantity: null, unitRate: null,
        notes: adj.reason ?? null,
      });
    }
  }

  // 8. Tổng gross = lương thực tế + phụ cấp + OT + bonus
  const grossSalary = actualBaseSalary + totalAllowances + totalOvertimePay + totalBonus;

  // 9. Bảo hiểm xã hội (BHXH, BHYT, BHTN) — trích trên lương cơ bản
  const insuranceBase = Math.min(baseSalary, _getInsuranceCap(insurancePolicies));

  const socialIns = _getInsuranceAmount(insurancePolicies, 'SOCIAL', insuranceBase);
  const healthIns = _getInsuranceAmount(insurancePolicies, 'HEALTH', insuranceBase);
  const unemploymentIns = _getInsuranceAmount(insurancePolicies, 'UNEMPLOYMENT', insuranceBase);

  const totalInsurance = socialIns + healthIns + unemploymentIns;

  // Thêm items bảo hiểm
  if (socialIns > 0) {
    deductionItems.push({
      salaryComponentId: null, itemName: 'BHXH (8%)',
      itemType: 'DEDUCTION', amount: socialIns, sourceType: 'INSURANCE',
      quantity: null, unitRate: null, notes: null,
    });
  }
  if (healthIns > 0) {
    deductionItems.push({
      salaryComponentId: null, itemName: 'BHYT (1.5%)',
      itemType: 'DEDUCTION', amount: healthIns, sourceType: 'INSURANCE',
      quantity: null, unitRate: null, notes: null,
    });
  }
  if (unemploymentIns > 0) {
    deductionItems.push({
      salaryComponentId: null, itemName: 'BHTN (1%)',
      itemType: 'DEDUCTION', amount: unemploymentIns, sourceType: 'INSURANCE',
      quantity: null, unitRate: null, notes: null,
    });
  }

  // 10. Thuế TNCN
  // Thu nhập chịu thuế = Gross - BHXH - BHYT - BHTN - giảm trừ bản thân - giảm trừ người phụ thuộc
  let taxableIncome = 0;
  let personalIncomeTax = 0;

  if (taxPolicy) {
    // Lấy số người phụ thuộc từ UserProfile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { dependantCount: true },
    });
    const dependants = userProfile?.dependantCount ?? 0;

    const personalDeduction = Number(taxPolicy.personalDeduction);
    const dependantDeduction = Number(taxPolicy.dependantDeduction) * dependants;

    taxableIncome = Math.max(
      0,
      grossSalary - totalInsurance - personalDeduction - dependantDeduction,
    );

    personalIncomeTax = _calcProgressiveTax(taxableIncome, taxPolicy.brackets);

    if (personalIncomeTax > 0) {
      deductionItems.push({
        salaryComponentId: null, itemName: 'Thuế TNCN',
        itemType: 'DEDUCTION', amount: Math.round(personalIncomeTax),
        sourceType: 'TAX', quantity: null, unitRate: null, notes: null,
      });
    }
  }

  // 11. Tổng khấu trừ & lương thực nhận
  const fixedDeductions = deductionItems
    .filter((i) => !['INSURANCE', 'TAX'].includes(i.sourceType))
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalDeductions = totalInsurance + Math.round(personalIncomeTax) +
    totalAdjDeductions + fixedDeductions;

  const netSalary = Math.round(grossSalary - totalDeductions);

  // 12. Item lương cơ bản (đặt đầu tiên)
  const baseItem = {
    salaryComponentId: null,
    itemName: 'Lương cơ bản',
    itemType: 'EARNING',
    amount: Math.round(actualBaseSalary),
    sourceType: 'BASE',
    quantity: effectiveDays,
    unitRate: Math.round(dailyRate),
    notes: `${effectiveDays}/${workingDaysStandard} ngày`,
  };

  const allItems = [baseItem, ...allowanceItems, ...deductionItems];

  // 13. Upsert PayrollRecord
  await repo.upsertPayrollRecord(period.id, userId, {
    baseSalary: Math.round(actualBaseSalary),
    workingDays: effectiveDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    lateDays,
    overtimeWeekdayMinutes: otWeekdayMins,
    overtimeWeekendMinutes: otWeekendMins,
    overtimeHolidayMinutes: otHolidayMins,
    totalOvertimePay: Math.round(totalOvertimePay),
    grossSalary: Math.round(grossSalary),
    totalAllowances: Math.round(totalAllowances),
    totalBonus: Math.round(totalBonus),
    socialInsuranceEmployee: Math.round(socialIns),
    healthInsuranceEmployee: Math.round(healthIns),
    unemploymentInsuranceEmployee: Math.round(unemploymentIns),
    taxableIncome: Math.round(taxableIncome),
    personalIncomeTax: Math.round(personalIncomeTax),
    totalDeductions: Math.round(totalDeductions),
    netSalary: Math.max(0, netSalary),
    dailyRate: Math.round(dailyRate),
    hourlyRate: Math.round(hourlyRate),
    status: 'DRAFT',
    generatedAt: new Date(),
  }, allItems);

  // 14. Đánh dấu adjustments đã áp dụng
  if (adjustments.length > 0) {
    await prisma.payrollAdjustment.updateMany({
      where: { id: { in: adjustments.map((a) => a.id) } },
      data: { status: 'APPLIED' },
    });
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE CALCULATION HELPERS                             ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tính thuế TNCN lũy tiến theo bậc thang.
 * brackets: [{ minIncome, maxIncome, taxRate }] đã sort theo bracketOrder.
 */
function _calcProgressiveTax(taxableIncome, brackets) {
  if (!taxableIncome || taxableIncome <= 0 || !brackets?.length) return 0;

  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of brackets) {
    const min = Number(bracket.minIncome);
    const max = bracket.maxIncome ? Number(bracket.maxIncome) : Infinity;
    const rate = Number(bracket.taxRate);

    if (remaining <= 0) break;
    if (taxableIncome <= min) break;

    const taxableInBracket = Math.min(remaining, max - min);
    if (taxableInBracket <= 0) continue;

    tax += taxableInBracket * rate;
    remaining -= taxableInBracket;
  }

  return Math.round(tax);
}

/**
 * Lấy số tiền bảo hiểm nhân viên theo loại
 */
function _getInsuranceAmount(policies, policyType, insuranceBase) {
  const policy = policies.find((p) => p.policyType === policyType);
  if (!policy) return 0;

  const base = policy.salaryCapAmount
    ? Math.min(insuranceBase, Number(policy.salaryCapAmount))
    : insuranceBase;

  return Math.round(base * Number(policy.employeeRate));
}

/**
 * Lấy mức trần bảo hiểm (dùng mức cao nhất trong các policies có cap)
 */
function _getInsuranceCap(policies) {
  const caps = policies
    .filter((p) => p.salaryCapAmount)
    .map((p) => Number(p.salaryCapAmount));
  return caps.length > 0 ? Math.max(...caps) : Infinity;
}

function _toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function _assertPeriodExists(id) {
  const p = await repo.findPeriodById(id);
  if (!p) throw AppError.notFound('Không tìm thấy kỳ lương.');
  return p;
}

function _isHrOrAdmin(user) {
  return user.roles.some((r) => ['ADMIN', 'HR'].includes(r));
}

function _page(filters, total) {
  return { page: filters.page ?? 1, limit: filters.limit ?? 20, total };
}

function _clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

module.exports = {
  // Period
  listPeriods, getPeriodById, createPeriod, updatePeriod,
  calculatePeriod, approvePeriod, markPeriodPaid, cancelPeriod, deletePeriod,
  // Compensation
  listCompensations, getCompensationById, getActiveCompensation,
  getCompensationHistory, createCompensation, updateCompensation,
  // SalaryComponent
  listSalaryComponents, getSalaryComponentOptions, getSalaryComponentById,
  createSalaryComponent, updateSalaryComponent,
  // UserSalaryComponent
  getUserSalaryComponents, assignSalaryComponent, removeUserSalaryComponent,
  // Adjustment
  listAdjustments, getAdjustmentById, createAdjustment,
  approveAdjustment, rejectAdjustment,
  // Record
  listRecords, getRecordById, getMyPayslip,
  updateRecordNotes, markRecordPaid,
};
