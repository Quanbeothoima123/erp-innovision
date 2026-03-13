'use strict';

// ── LeaveType ─────────────────────────────────────────────────

function toLeaveTypeDto(lt) {
  if (!lt) return null;
  return {
    id: lt.id,
    code: lt.code,
    name: lt.name,
    description: lt.description,
    isPaid: lt.isPaid,
    isActive: lt.isActive,
    maxDaysPerYear: lt.maxDaysPerYear ? Number(lt.maxDaysPerYear) : null,
    requiresDocument: lt.requiresDocument,
    createdAt: lt.createdAt,
    updatedAt: lt.updatedAt,
  };
}

function toLeaveTypeOptionDto(lt) {
  return {
    id: lt.id,
    code: lt.code,
    name: lt.name,
    isPaid: lt.isPaid,
    maxDaysPerYear: lt.maxDaysPerYear ? Number(lt.maxDaysPerYear) : null,
    requiresDocument: lt.requiresDocument,
  };
}

// ── LeaveBalance ──────────────────────────────────────────────

function toLeaveBalanceDto(b) {
  if (!b) return null;
  return {
    id: b.id,
    user: b.user ?? null,
    leaveType: b.leaveType ?? null,
    year: b.year,
    entitledDays: Number(b.entitledDays),
    carriedDays: Number(b.carriedDays),
    adjustedDays: Number(b.adjustedDays),
    usedDays: Number(b.usedDays),
    pendingDays: Number(b.pendingDays),
    remainingDays: Number(b.remainingDays),
    notes: b.notes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// ── LeaveRequest ──────────────────────────────────────────────

function toLeaveRequestDto(req) {
  if (!req) return null;
  return {
    id: req.id,
    user: req.user ?? null,
    leaveType: req.leaveType ?? null,
    startDate: req.startDate,
    endDate: req.endDate,
    totalDays: Number(req.totalDays),
    isHalfDay: req.isHalfDay,
    halfDayPeriod: req.halfDayPeriod,
    reason: req.reason,
    documentUrl: req.documentUrl,
    status: req.status,
    currentStep: req.currentStep,
    approvals: (req.approvals ?? []).map(toApprovalStepDto),
    submittedAt: req.submittedAt,
    finalApprovedAt: req.finalApprovedAt,
    rejectedAt: req.rejectedAt,
    rejectionReason: req.rejectionReason,
    cancelledAt: req.cancelledAt,
    cancelReason: req.cancelReason,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

// ── Approval Step ─────────────────────────────────────────────

function toApprovalStepDto(step) {
  if (!step) return null;
  return {
    id: step.id,
    stepType: step.stepType,
    stepOrder: step.stepOrder,
    status: step.status,
    approver: step.approver ?? null,
    comment: step.comment,
    actionAt: step.actionAt,
  };
}

/**
 * DTO tổng hợp cho trang "đơn chờ tôi duyệt"
 */
function toPendingApprovalDto(approval) {
  if (!approval) return null;
  return {
    approvalId: approval.id,
    stepType: approval.stepType,
    stepOrder: approval.stepOrder,
    leaveRequest: approval.leaveRequest
      ? toLeaveRequestDto(approval.leaveRequest)
      : null,
  };
}

module.exports = {
  toLeaveTypeDto,
  toLeaveTypeOptionDto,
  toLeaveBalanceDto,
  toLeaveRequestDto,
  toApprovalStepDto,
  toPendingApprovalDto,
};
