'use strict';

// ── Project ───────────────────────────────────────────────────

function toProjectSummaryDto(p) {
  if (!p) return null;
  return {
    id:           p.id,
    projectCode:  p.projectCode,
    projectName:  p.projectName,
    description:  p.description,
    status:       p.status,
    priority:     p.priority,
    healthStatus: p.healthStatus,
    progressPercent: _n(p.progressPercent),
    startDate:    p.startDate,
    endDate:      p.endDate,
    actualEndDate: p.actualEndDate,

    // Tài chính
    budgetAmount:  p.budgetAmount  ? _money(p.budgetAmount)  : null,
    spentAmount:   _money(p.spentAmount),
    currency:      p.currency,
    budgetUsedPercent: _budgetPercent(p.budgetAmount, p.spentAmount),

    contractValue:  p.contractValue  ? _money(p.contractValue)  : null,
    invoicedAmount: _money(p.invoicedAmount),
    receivedAmount: _money(p.receivedAmount),

    projectManager: p.projectManager ?? null,
    client:         p.client ?? null,

    // Counts (từ _count)
    activeMemberCount: p._count?.assignments ?? 0,
    milestoneCount:    p._count?.milestones  ?? 0,
    approvedExpenseCount: p._count?.expenses ?? 0,

    closedAt:    p.closedAt,
    closureNote: p.closureNote,
    createdAt:   p.createdAt,
    updatedAt:   p.updatedAt,
  };
}

function toProjectDetailDto(p) {
  if (!p) return null;
  const summary = toProjectSummaryDto(p);
  return {
    ...summary,
    contract:    p.contract ?? null,
    assignments: (p.assignments ?? []).map(toAssignmentDto),
    milestones:  (p.milestones  ?? []).map(toMilestoneDto),
  };
}

// ── Assignment ────────────────────────────────────────────────

function toAssignmentDto(a) {
  if (!a) return null;
  return {
    id:      a.id,
    user:    a.user    ?? null,
    project: a.project ?? null,
    roleInProject:     a.roleInProject,
    allocationPercent: a.allocationPercent ? _n(a.allocationPercent) : null,
    hourlyRate:        a.hourlyRate ? _money(a.hourlyRate) : null,
    joinedAt:   a.joinedAt,
    leftAt:     a.leftAt,
    status:     a.status,
    isBillable: a.isBillable,
    notes:      a.notes,
    createdAt:  a.createdAt,
    updatedAt:  a.updatedAt,
  };
}

// ── Milestone ─────────────────────────────────────────────────

function toMilestoneDto(m) {
  if (!m) return null;
  const now = new Date();
  const isOverdue =
    m.status !== 'DONE' && m.dueDate && new Date(m.dueDate) < now;

  return {
    id:          m.id,
    projectId:   m.projectId,
    name:        m.name,
    description: m.description,
    owner:       m.owner ?? null,
    dueDate:     m.dueDate,
    completedAt: m.completedAt,
    status:      m.status,
    isOverdue,
    invoiceId:   m.invoiceId,
    createdAt:   m.createdAt,
    updatedAt:   m.updatedAt,
  };
}

// ── Expense ───────────────────────────────────────────────────

function toExpenseDto(e) {
  if (!e) return null;
  return {
    id:          e.id,
    project:     e.project     ?? null,
    submittedBy: e.submittedBy ?? null,
    approvedBy:  e.approvedBy  ?? null,
    category:    e.category,
    title:       e.title,
    description: e.description,
    amount:      _money(e.amount),
    currency:    e.currency,
    expenseDate: e.expenseDate,
    receiptUrl:  e.receiptUrl,
    status:      e.status,
    rejectReason: e.rejectReason,
    submittedAt:  e.submittedAt,
    approvedAt:   e.approvedAt,
    createdAt:    e.createdAt,
    updatedAt:    e.updatedAt,
  };
}

// ── Expense summary (theo category) ──────────────────────────

function toExpenseSummaryDto(rows, project) {
  const categories = {};
  let totalApproved = 0;
  let totalPending  = 0;

  for (const row of rows) {
    const cat = row.category;
    const amt = Number(row._sum.amount ?? 0);
    if (!categories[cat]) categories[cat] = { approved: 0, pending: 0, rejected: 0, reimbursed: 0, count: 0 };
    categories[cat][row.status.toLowerCase()] += amt;
    categories[cat].count += row._count.id;
    if (['APPROVED','REIMBURSED'].includes(row.status)) totalApproved += amt;
    if (row.status === 'PENDING') totalPending += amt;
  }

  return {
    projectId:      project?.id,
    budgetAmount:   project?.budgetAmount ? _money(project.budgetAmount) : null,
    spentAmount:    _money(project?.spentAmount ?? 0),
    budgetUsedPercent: _budgetPercent(project?.budgetAmount, project?.spentAmount),
    currency:       project?.currency ?? 'VND',
    totalApproved,
    totalPending,
    byCategory: categories,
  };
}

// ── Project health snapshot ───────────────────────────────────

function toHealthDto(p, milestoneStats) {
  const budgetPercent = _budgetPercent(p.budgetAmount, p.spentAmount);
  const now = new Date();
  const daysUntilDeadline = p.endDate
    ? Math.ceil((new Date(p.endDate) - now) / 86_400_000)
    : null;

  return {
    id:           p.id,
    projectName:  p.projectName,
    status:       p.status,
    healthStatus: p.healthStatus,
    progressPercent: _n(p.progressPercent),

    timeline: {
      startDate:    p.startDate,
      endDate:      p.endDate,
      daysUntilDeadline,
      isOverdue: p.endDate && new Date(p.endDate) < now && !['COMPLETED','CANCELLED','ARCHIVED'].includes(p.status),
    },

    budget: {
      budgetAmount:     p.budgetAmount ? _money(p.budgetAmount) : null,
      spentAmount:      _money(p.spentAmount),
      remainingAmount:  p.budgetAmount ? _money(Number(p.budgetAmount) - Number(p.spentAmount)) : null,
      budgetUsedPercent: budgetPercent,
      isOverBudget:     p.budgetAmount ? Number(p.spentAmount) > Number(p.budgetAmount) : false,
    },

    milestones: {
      pending:    milestoneStats.PENDING    ?? 0,
      inProgress: milestoneStats.IN_PROGRESS ?? 0,
      done:       milestoneStats.DONE       ?? 0,
      overdue:    milestoneStats.OVERDUE    ?? 0,
      total: Object.values(milestoneStats).reduce((s, n) => s + n, 0),
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────

function _n(val) {
  if (val == null) return 0;
  return Math.round(Number(val) * 100) / 100;
}

function _money(val) {
  if (val == null) return 0;
  return Math.round(Number(val));
}

function _budgetPercent(budget, spent) {
  if (!budget || Number(budget) === 0) return null;
  return Math.round((Number(spent) / Number(budget)) * 10000) / 100; // 2 chữ số
}

module.exports = {
  toProjectSummaryDto,
  toProjectDetailDto,
  toAssignmentDto,
  toMilestoneDto,
  toExpenseDto,
  toExpenseSummaryDto,
  toHealthDto,
};
