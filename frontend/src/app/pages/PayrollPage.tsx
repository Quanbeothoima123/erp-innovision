import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  payrollPeriods as initialPeriods, payrollAdjustments as initialAdjustments,
  insurancePolicies as initialInsurance, taxPolicies as initialTax,
  userCompensations, userSalaryComponents, overtimeRequests,
  attendanceRecords, users,
  getUserById, getDepartmentById, formatFullVND, formatVND,
  getNextPayDate, getActiveCompensation, payFrequencyLabels, getPayDayLabel,
} from '../data/mockData';
import type {
  PayrollPeriod, PayrollRecord, PayrollRecordItem, PayrollPeriodStatus,
  PayrollAdjustment, PayrollAdjustmentType,
  InsurancePolicy, TaxPolicy, TaxBracket,
} from '../data/mockData';
import {
  DollarSign, Download, X, Check, Plus, Search, Loader2,
  Clock, TrendingUp, ArrowRight, Edit3,
  Shield, Users, Calculator, Receipt, Wallet, Eye,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
// Shared constants
// ═══════════════════════════════════════════════════════════════
const periodStatusColors: Record<PayrollPeriodStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  CALCULATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const periodStatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp', CALCULATING: 'Đang tính', APPROVED: 'Đã duyệt', PAID: 'Đã chi trả', CANCELLED: 'Đã huỷ',
};
const adjustTypeLabels: Record<PayrollAdjustmentType, string> = { BONUS: 'Thưởng', DEDUCTION: 'Khấu trừ', ADVANCE: 'Tạm ứng' };
const adjustTypeColors: Record<PayrollAdjustmentType, string> = {
  BONUS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEDUCTION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ADVANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};
const adjustStatusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', APPLIED: 'Đã áp dụng' };
const adjustStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  APPLIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ═══════════════════════════════════════════════════════════════
// calcPayroll helper (matches mockData logic)
// ═══════════════════════════════════════════════════════════════
const calcPayroll = (base: number, allowances: number, workDays: number, daysInPeriod: number, otMinutes: number, bonus: number) => {
  const earnedBase = (base / daysInPeriod) * workDays;
  const hourlyRate = base / daysInPeriod / 8;
  const otPay = (otMinutes / 60) * 1.5 * hourlyRate;
  const gross = earnedBase + allowances + otPay + bonus;
  const insBase = Math.min(base, 36000000);
  const bhxh = insBase * 0.08;
  const bhyt = insBase * 0.015;
  const bhtn = insBase * 0.01;
  const taxableIncome = gross - bhxh - bhyt - bhtn - 11000000;
  let tax = 0;
  if (taxableIncome > 0) {
    if (taxableIncome <= 5000000) tax = taxableIncome * 0.05;
    else if (taxableIncome <= 10000000) tax = 250000 + (taxableIncome - 5000000) * 0.1;
    else if (taxableIncome <= 18000000) tax = 750000 + (taxableIncome - 10000000) * 0.15;
    else if (taxableIncome <= 32000000) tax = 1950000 + (taxableIncome - 18000000) * 0.2;
    else if (taxableIncome <= 52000000) tax = 4750000 + (taxableIncome - 32000000) * 0.25;
    else if (taxableIncome <= 80000000) tax = 9750000 + (taxableIncome - 52000000) * 0.3;
    else tax = 18150000 + (taxableIncome - 80000000) * 0.35;
  }
  const totalDeductions = bhxh + bhyt + bhtn + (tax > 0 ? tax : 0);
  const net = gross - totalDeductions;
  return { earnedBase, grossSalary: gross, totalAllowances: allowances, totalBonus: bonus, totalOvertimePay: otPay, socialInsuranceEmployee: bhxh, healthInsuranceEmployee: bhyt, unemploymentInsuranceEmployee: bhtn, personalIncomeTax: tax > 0 ? tax : 0, totalDeductions, netSalary: net };
};

// Get latest baseSalary for a user
const getBaseSalary = (userId: string): number => {
  const comps = userCompensations.filter(c => c.userId === userId).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return comps.length > 0 ? comps[0].baseSalary : 15000000;
};

// Get user's allowances total
const getAllowancesTotal = (userId: string): number => {
  return userSalaryComponents.filter(c => c.userId === userId && c.isActive).reduce((s, c) => s + c.amount, 0);
};

// Get user's OT minutes for a month
const getOTMinutes = (userId: string, month: number, year: number): number => {
  return overtimeRequests
    .filter(r => r.userId === userId && r.status === 'APPROVED')
    .filter(r => {
      const d = new Date(r.workDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes), 0);
};

// Get user's working days for a month (from attendance)
const getWorkingDays = (userId: string, month: number, year: number): number => {
  const recs = attendanceRecords.filter(r => r.userId === userId && r.status === 'APPROVED');
  const days = new Set(recs.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  }).map(r => r.date));
  return days.size || 22; // fallback to 22
};

// ═══════════════════════════════════════════════════════════════
// 1. PayrollPage — Kỳ lương (main)
// ═══════════════════════════════════════════════════════════════
export function PayrollPage() {
  const { currentUser, can } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>(initialPeriods);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);

  const isAdminHR = can('ADMIN', 'HR');
  const isAccountant = can('ACCOUNTANT');
  const canManage = isAdminHR || isAccountant;

  // Employee view: personal payslips
  if (!canManage) {
    return <EmployeePayslipView userId={currentUser!.id} periods={periods} />;
  }

  // Summary for charts
  const chartData = periods.filter(p => p.records.length > 0).map((p, idx) => ({
    id: `chart-${p.id}`,
    name: `T${p.month}/${p.year}${periods.filter(pp => pp.month === p.month && pp.year === p.year && pp.records.length > 0).length > 1 ? ` (${p.periodCode})` : ''}`,
    gross: p.records.reduce((s, r) => s + r.grossSalary, 0),
    net: p.records.reduce((s, r) => s + r.netSalary, 0),
    deductions: p.records.reduce((s, r) => s + r.totalDeductions, 0),
    ot: p.records.reduce((s, r) => s + r.totalOvertimePay, 0),
  }));

  // Total stats from latest paid period
  const latestPaid = periods.find(p => p.status === 'PAID' && p.records.length > 0);
  const stats = latestPaid ? {
    totalGross: latestPaid.records.reduce((s, r) => s + r.grossSalary, 0),
    totalNet: latestPaid.records.reduce((s, r) => s + r.netSalary, 0),
    totalDeductions: latestPaid.records.reduce((s, r) => s + r.totalDeductions, 0),
    totalOT: latestPaid.records.reduce((s, r) => s + r.totalOvertimePay, 0),
    totalBonus: latestPaid.records.reduce((s, r) => s + r.totalBonus, 0),
    employees: latestPaid.records.length,
  } : null;

  const handleCreatePeriod = (month: number, year: number, workingDays: number) => {
    const exists = periods.find(p => p.month === month && p.year === year);
    if (exists) { toast.error('Kỳ lương đã tồn tại'); return; }
    const newPeriod: PayrollPeriod = {
      id: `pp-new-${Date.now()}`,
      periodCode: `${year}-${String(month).padStart(2, '0')}`,
      month, year,
      status: 'DRAFT',
      workingDaysInPeriod: workingDays,
      records: [],
    };
    setPeriods(prev => [...prev, newPeriod].sort((a, b) => a.periodCode.localeCompare(b.periodCode)));
    setShowCreatePeriod(false);
    toast.success(`Đã tạo kỳ lương T${month}/${year}`);
  };

  const handleCalculate = (periodId: string) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p;
      // Generate payroll records for active employees
      const activeUsers = users.filter(u => u.employmentStatus === 'ACTIVE' && u.roles.some(r => ['EMPLOYEE', 'MANAGER', 'HR'].includes(r)));
      const records: PayrollRecord[] = activeUsers.map((u, i) => {
        const base = getBaseSalary(u.id);
        const allowances = getAllowancesTotal(u.id);
        const otMin = getOTMinutes(u.id, p.month, p.year);
        const workDays = getWorkingDays(u.id, p.month, p.year);
        const bonus = initialAdjustments
          .filter(a => a.userId === u.id && a.type === 'BONUS' && (a.periodId === p.id || !a.periodId) && (a.status === 'APPROVED' || a.status === 'APPLIED'))
          .reduce((s, a) => s + a.amount, 0);
        const deductAdj = initialAdjustments
          .filter(a => a.userId === u.id && a.type === 'DEDUCTION' && (a.periodId === p.id || !a.periodId) && (a.status === 'APPROVED' || a.status === 'APPLIED'))
          .reduce((s, a) => s + a.amount, 0);

        const calc = calcPayroll(base, allowances, workDays, p.workingDaysInPeriod, otMin, bonus);

        const items: PayrollRecordItem[] = [
          { itemName: 'Lương cơ bản', itemType: 'EARNING', sourceType: 'BASE', amount: calc.earnedBase },
          { itemName: 'Tổng phụ cấp', itemType: 'EARNING', sourceType: 'ALLOWANCE', amount: allowances },
        ];
        if (calc.totalOvertimePay > 0) items.push({ itemName: 'Lương làm thêm giờ', itemType: 'EARNING', sourceType: 'OVERTIME', amount: calc.totalOvertimePay });
        if (bonus > 0) items.push({ itemName: 'Thưởng', itemType: 'EARNING', sourceType: 'BONUS', amount: bonus });
        items.push({ itemName: 'BHXH (8%)', itemType: 'DEDUCTION', sourceType: 'INSURANCE', amount: calc.socialInsuranceEmployee });
        items.push({ itemName: 'BHYT (1.5%)', itemType: 'DEDUCTION', sourceType: 'INSURANCE', amount: calc.healthInsuranceEmployee });
        items.push({ itemName: 'BHTN (1%)', itemType: 'DEDUCTION', sourceType: 'INSURANCE', amount: calc.unemploymentInsuranceEmployee });
        if (calc.personalIncomeTax > 0) items.push({ itemName: 'Thuế TNCN', itemType: 'DEDUCTION', sourceType: 'TAX', amount: calc.personalIncomeTax });
        if (deductAdj > 0) items.push({ itemName: 'Khấu trừ điều chỉnh', itemType: 'DEDUCTION', sourceType: 'ADJUSTMENT', amount: deductAdj });

        const finalNet = calc.netSalary - deductAdj;

        return {
          id: `pr-calc-${i}-${Date.now()}`,
          payrollPeriodId: p.id,
          userId: u.id,
          baseSalary: base,
          workingDays: workDays,
          grossSalary: calc.grossSalary,
          totalAllowances: allowances,
          totalBonus: bonus,
          totalOvertimePay: calc.totalOvertimePay,
          socialInsuranceEmployee: calc.socialInsuranceEmployee,
          healthInsuranceEmployee: calc.healthInsuranceEmployee,
          unemploymentInsuranceEmployee: calc.unemploymentInsuranceEmployee,
          personalIncomeTax: calc.personalIncomeTax,
          totalDeductions: calc.totalDeductions + deductAdj,
          netSalary: finalNet,
          status: 'CALCULATED',
          items,
        };
      });

      return { ...p, status: 'CALCULATING' as const, records };
    }));
    // Simulate calc time
    setTimeout(() => {
      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, status: 'APPROVED' as const } : p));
      toast.success('Tính lương hoàn tất — đã chuyển sang trạng thái Đã duyệt');
    }, 1500);
    toast.info('Đang tính lương...');
  };

  const handleApprove = (periodId: string) => {
    setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, status: 'APPROVED' as const } : p));
    toast.success('Đã duyệt kỳ lương');
  };

  const handlePay = (periodId: string) => {
    setPeriods(prev => prev.map(p => p.id === periodId ? {
      ...p,
      status: 'PAID' as const,
      records: p.records.map(r => ({ ...r, status: 'PAID' })),
    } : p));
    toast.success('Đã đánh dấu chi trả thành công');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Quản lý kỳ lương</h1>
        <button onClick={() => setShowCreatePeriod(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
          <Plus size={16} /> Tạo kỳ lương
        </button>
      </div>

      {/* Summary stats from latest paid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { label: 'Tổng Gross', value: formatVND(stats.totalGross), color: 'text-foreground', icon: <Calculator size={12} /> },
            { label: 'Tổng NET', value: formatVND(stats.totalNet), color: 'text-green-600', icon: <Wallet size={12} /> },
            { label: 'Tổng khấu trừ', value: formatVND(stats.totalDeductions), color: 'text-red-500', icon: <Shield size={12} /> },
            { label: 'Tổng OT', value: formatVND(stats.totalOT), color: 'text-blue-600', icon: <Clock size={12} /> },
            { label: 'Tổng thưởng', value: formatVND(stats.totalBonus), color: 'text-amber-600', icon: <TrendingUp size={12} /> },
            { label: 'Nhân viên', value: stats.employees.toString(), color: 'text-foreground', icon: <Users size={12} /> },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{s.icon} {s.label}</div>
              <div className={`text-[16px] mt-0.5 ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-muted-foreground">Kỳ {latestPaid?.periodCode}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[13px] text-muted-foreground mb-3">Biểu đồ chi phí lương theo kỳ</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis key="xaxis" dataKey="name" fontSize={11} tick={{ fill: 'var(--color-muted-foreground)' }} />
              <YAxis key="yaxis" fontSize={11} tick={{ fill: 'var(--color-muted-foreground)' }} tickFormatter={v => formatVND(v)} />
              <Tooltip key="tooltip" formatter={(value: number) => formatFullVND(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
              <Bar key="bar-gross" dataKey="gross" name="Gross" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar key="bar-net" dataKey="net" name="NET" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar key="bar-deductions" dataKey="deductions" name="Khấu trừ" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Period Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {periods.map(p => {
          const totalNet = p.records.reduce((s, r) => s + r.netSalary, 0);
          const totalGross = p.records.reduce((s, r) => s + r.grossSalary, 0);
          return (
            <div key={p.id} onClick={() => setSelectedPeriod(p)} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[16px]">T{p.month}/{p.year}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${periodStatusColors[p.status]}`}>
                  {p.status === 'CALCULATING' && <Loader2 size={10} className="inline mr-1 animate-spin" />}
                  {periodStatusLabels[p.status]}
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground">{p.records.length} nhân viên • {p.workingDaysInPeriod} ngày</div>
              {p.records.length > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Gross</div>
                    <div className="text-[14px]">{formatVND(totalGross)}</div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">NET</div>
                    <div className="text-[14px] text-green-600">{formatVND(totalNet)}</div>
                  </div>
                </div>
              )}
              {/* Status progress bar */}
              <div className="mt-3 flex gap-1">
                {['DRAFT', 'CALCULATING', 'APPROVED', 'PAID'].map((s, i) => (
                  <div key={s} className={`flex-1 h-1 rounded ${['DRAFT', 'CALCULATING', 'APPROVED', 'PAID'].indexOf(p.status) >= i ? 'bg-blue-500' : 'bg-border'}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Period Detail Modal */}
      {selectedPeriod && !selectedPayslip && (
        <PeriodDetailModal
          period={periods.find(p => p.id === selectedPeriod.id) || selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
          onCalculate={handleCalculate}
          onApprove={handleApprove}
          onPay={handlePay}
          onViewPayslip={setSelectedPayslip}
        />
      )}

      {/* Payslip Modal */}
      {selectedPayslip && <PayslipDialog record={selectedPayslip} onClose={() => setSelectedPayslip(null)} />}

      {/* Create Period Dialog */}
      {showCreatePeriod && <CreatePeriodDialog onClose={() => setShowCreatePeriod(false)} onCreate={handleCreatePeriod} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Employee Payslip View
// ═══════════════════════════════════════════════════════════════
function EmployeePayslipView({ userId, periods }: { userId: string; periods: PayrollPeriod[] }) {
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const myRecords = periods.flatMap(p =>
    p.records.filter(r => r.userId === userId).map(r => ({ ...r, period: p }))
  ).sort((a, b) => b.period.periodCode.localeCompare(a.period.periodCode));

  // Stats
  const latestBase = getBaseSalary(userId);
  const activeComp = getActiveCompensation(userId);
  const nextPayDate = getNextPayDate(userId);
  const user = getUserById(userId);
  const isProbation = user?.employmentStatus === 'PROBATION';

  // Find next DRAFT/CALCULATING period
  const nextPeriod = periods.find(p => p.status === 'DRAFT' || p.status === 'CALCULATING');

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Phiếu lương của tôi</h1>

      {/* My salary summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><DollarSign size={12} /> Lương cơ bản</div>
          <div className="text-[18px] mt-1">{formatVND(latestBase)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Wallet size={12} /> Phụ cấp</div>
          <div className="text-[18px] mt-1">{formatVND(getAllowancesTotal(userId))}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock size={12} /> Ngày nhận lương</div>
          <div className="text-[18px] mt-1">{nextPayDate ? new Date(nextPayDate).toLocaleDateString('vi-VN') : 'Theo lịch công ty'}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{activeComp ? getPayDayLabel(activeComp) : ''}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Receipt size={12} /> Kỳ lương tiếp theo</div>
          {nextPeriod ? (
            <>
              <div className="text-[18px] mt-1">T{nextPeriod.month}/{nextPeriod.year}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${periodStatusColors[nextPeriod.status]}`}>{periodStatusLabels[nextPeriod.status]}</span>
            </>
          ) : (
            <div className="text-[14px] mt-1 text-muted-foreground">Chưa mở kỳ</div>
          )}
        </div>
      </div>

      {/* Current salary info section */}
      {activeComp && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[12px] text-muted-foreground mb-2">Thông tin lương hiện tại</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <span>Lương CB: <strong>{formatFullVND(activeComp.baseSalary)}</strong></span>
            <span>Chu kỳ: <strong>{payFrequencyLabels[activeComp.payFrequency]}</strong> • Ngày {activeComp.payDayOfMonth || '—'}</span>
            <span>Hiệu lực từ: <strong>{new Date(activeComp.effectiveDate).toLocaleDateString('vi-VN')}</strong></span>
          </div>
          {activeComp.changeReason && (
            <div className="text-[12px] text-muted-foreground mt-1">Lý do: {activeComp.changeReason}</div>
          )}
          {isProbation && activeComp.probationSalary && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-[12px]">
              <Clock size={14} className="text-yellow-500" />
              <span className="text-yellow-700 dark:text-yellow-400">
                Thử việc đến {activeComp.probationEndDate ? new Date(activeComp.probationEndDate).toLocaleDateString('vi-VN') : '—'} • Lương thử việc: {formatFullVND(activeComp.probationSalary)}
              </span>
            </div>
          )}
        </div>
      )}

      {myRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Receipt size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Chưa có phiếu lương</div>
        </div>
      ) : (
        <div className="space-y-3">
          {myRecords.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPayslip(r)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px]">Kỳ lương T{r.period.month}/{r.period.year}</div>
                  <div className="text-[12px] text-muted-foreground">{r.workingDays} ngày công</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] text-green-600">{formatFullVND(r.netSalary)}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${periodStatusColors[r.period.status]}`}>{periodStatusLabels[r.period.status]}</span>
                </div>
              </div>
              {/* Quick breakdown */}
              <div className="mt-2 grid grid-cols-5 gap-2 text-[11px] text-muted-foreground">
                <div>CB: {formatVND(r.baseSalary)}</div>
                <div>PC: {formatVND(r.totalAllowances)}</div>
                <div>OT: {r.totalOvertimePay > 0 ? formatVND(r.totalOvertimePay) : '—'}</div>
                <div>Thưởng: {r.totalBonus > 0 ? formatVND(r.totalBonus) : '—'}</div>
                <div className="text-red-500">-{formatVND(r.totalDeductions)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPayslip && <PayslipDialog record={selectedPayslip} onClose={() => setSelectedPayslip(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Period Detail Modal
// ═══════════════════════════════════════════════════════════════
function PeriodDetailModal({ period, onClose, onCalculate, onApprove, onPay, onViewPayslip }: {
  period: PayrollPeriod;
  onClose: () => void;
  onCalculate: (id: string) => void;
  onApprove: (id: string) => void;
  onPay: (id: string) => void;
  onViewPayslip: (r: PayrollRecord) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'net' | 'gross'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const totalGross = period.records.reduce((s, r) => s + r.grossSalary, 0);
  const totalNet = period.records.reduce((s, r) => s + r.netSalary, 0);
  const totalDeductions = period.records.reduce((s, r) => s + r.totalDeductions, 0);
  const totalOT = period.records.reduce((s, r) => s + r.totalOvertimePay, 0);
  const totalBonus = period.records.reduce((s, r) => s + r.totalBonus, 0);

  const filtered = useMemo(() => {
    let list = period.records;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => getUserById(r.userId)?.fullName.toLowerCase().includes(s));
    }
    list = [...list].sort((a, b) => {
      const ua = getUserById(a.userId), ub = getUserById(b.userId);
      if (sortKey === 'name') return sortDir === 'asc' ? (ua?.fullName || '').localeCompare(ub?.fullName || '') : (ub?.fullName || '').localeCompare(ua?.fullName || '');
      if (sortKey === 'net') return sortDir === 'asc' ? a.netSalary - b.netSalary : b.netSalary - a.netSalary;
      return sortDir === 'asc' ? a.grossSalary - b.grossSalary : b.grossSalary - a.grossSalary;
    });
    return list;
  }, [period.records, search, sortKey, sortDir]);

  // Pie chart for cost distribution
  const pieData = [
    { name: 'Lương CB', value: period.records.reduce((s, r) => s + r.baseSalary, 0) },
    { name: 'Phụ cấp', value: period.records.reduce((s, r) => s + r.totalAllowances, 0) },
    { name: 'OT', value: totalOT },
    { name: 'Thưởng', value: totalBonus },
  ].filter(d => d.value > 0);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-[18px]">Kỳ lương T{period.month}/{period.year}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${periodStatusColors[period.status]}`}>
                {period.status === 'CALCULATING' && <Loader2 size={10} className="inline mr-1 animate-spin" />}
                {periodStatusLabels[period.status]}
              </span>
              <span className="text-[11px] text-muted-foreground">{period.workingDaysInPeriod} ngày công chuẩn • {period.records.length} nhân viên</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>

        {/* Summary + Pie */}
        <div className="p-4 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Tổng Gross', value: formatVND(totalGross), color: 'text-foreground' },
              { label: 'Tổng NET', value: formatVND(totalNet), color: 'text-green-600' },
              { label: 'Tổng khấu trừ', value: formatVND(totalDeductions), color: 'text-red-500' },
              { label: 'Tổng OT', value: formatVND(totalOT), color: 'text-blue-600' },
              { label: 'Tổng thưởng', value: formatVND(totalBonus), color: 'text-amber-600' },
              { label: 'TB NET/NV', value: period.records.length > 0 ? formatVND(totalNet / period.records.length) : '—', color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
                <div className={`text-[15px] ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {pieData.length > 0 && (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie key="pie" data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} fontSize={10} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={`pie-cell-${entry.name}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip key="pie-tooltip" formatter={(value: number) => formatFullVND(value)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Search */}
        {period.records.length > 0 && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Tìm nhân viên..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
          </div>
        )}

        {/* Table */}
        {period.records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 text-[11px] text-muted-foreground cursor-pointer" onClick={() => toggleSort('name')}>Nhân viên <SortIcon k="name" /></th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">Ngày</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">Lương CB</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">Phụ cấp</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden lg:table-cell">OT</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden lg:table-cell">Thưởng</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground cursor-pointer" onClick={() => toggleSort('gross')}>Gross <SortIcon k="gross" /></th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">Khấu trừ</th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground cursor-pointer" onClick={() => toggleSort('net')}>NET <SortIcon k="net" /></th>
                  <th className="text-center px-2 py-2 text-[11px] text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const u = getUserById(r.userId);
                  const dept = u ? getDepartmentById(u.departmentId) : null;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                          <div>
                            <div className="text-[12px]">{u?.fullName}</div>
                            <div className="text-[9px] text-muted-foreground">{dept?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-right">{r.workingDays}</td>
                      <td className="px-3 py-2 text-[12px] text-right">{formatVND(r.baseSalary)}</td>
                      <td className="px-3 py-2 text-[12px] text-right hidden md:table-cell">{formatVND(r.totalAllowances)}</td>
                      <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">{r.totalOvertimePay > 0 ? formatVND(r.totalOvertimePay) : '—'}</td>
                      <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">{r.totalBonus > 0 ? formatVND(r.totalBonus) : '—'}</td>
                      <td className="px-3 py-2 text-[12px] text-right">{formatVND(r.grossSalary)}</td>
                      <td className="px-3 py-2 text-[12px] text-right text-red-500 hidden md:table-cell">-{formatVND(r.totalDeductions)}</td>
                      <td className="px-3 py-2 text-[13px] text-right text-green-600">{formatVND(r.netSalary)}</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => onViewPayslip(r)} className="p-1 rounded hover:bg-accent" title="Xem phiếu lương"><Eye size={14} className="text-muted-foreground" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-4 py-2 text-[12px]">Tổng cộng</td>
                  <td className="px-3 py-2 text-[12px] text-right">—</td>
                  <td className="px-3 py-2 text-[12px] text-right">{formatVND(period.records.reduce((s, r) => s + r.baseSalary, 0))}</td>
                  <td className="px-3 py-2 text-[12px] text-right hidden md:table-cell">{formatVND(period.records.reduce((s, r) => s + r.totalAllowances, 0))}</td>
                  <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">{formatVND(totalOT)}</td>
                  <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">{formatVND(totalBonus)}</td>
                  <td className="px-3 py-2 text-[12px] text-right">{formatVND(totalGross)}</td>
                  <td className="px-3 py-2 text-[12px] text-right text-red-500 hidden md:table-cell">-{formatVND(totalDeductions)}</td>
                  <td className="px-3 py-2 text-[13px] text-right text-green-600">{formatVND(totalNet)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-[13px]">
            <Calculator size={40} className="mx-auto mb-2 opacity-30" />
            <div>Chưa có dữ liệu — nhấn "Tính lương" để bắt đầu</div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-border flex flex-wrap justify-between items-center gap-2 sticky bottom-0 bg-card">
          <div className="text-[11px] text-muted-foreground">
            Quy trình: <span className="text-foreground">Bản nháp</span> → <span className="text-blue-600">Đang tính</span> → <span className="text-green-600">Đã duyệt</span> → <span className="text-emerald-600">Đã chi trả</span>
          </div>
          <div className="flex gap-2">
            {period.status === 'DRAFT' && (
              <button onClick={() => onCalculate(period.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
                <Calculator size={14} /> Tính lương
              </button>
            )}
            {period.status === 'CALCULATING' && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 opacity-50" disabled>
                <Loader2 size={14} className="animate-spin" /> Đang tính...
              </button>
            )}
            {period.status === 'APPROVED' && (
              <button onClick={() => onPay(period.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-emerald-700">
                <Wallet size={14} /> Đánh dấu đã chi trả
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Payslip Dialog (detail breakdown)
// ═══════════════════════════════════════════════════════════════
function PayslipDialog({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const u = getUserById(record.userId);
  const dept = u ? getDepartmentById(u.departmentId) : null;
  const earnings = record.items.filter(i => i.itemType === 'EARNING');
  const deductions = record.items.filter(i => i.itemType === 'DEDUCTION');
  const insTotal = record.socialInsuranceEmployee + record.healthInsuranceEmployee + record.unemploymentInsuranceEmployee;

  // Earnings pie
  const earningsPie = earnings.map(e => ({ name: e.itemName, value: e.amount }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] text-muted-foreground tracking-wider">TECHVN — PHIẾU LƯƠNG</div>
              <div className="text-[16px] mt-1">{u?.fullName}</div>
              <div className="text-[12px] text-muted-foreground">{u?.userCode} • {dept?.name}</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px]">{record.status}</span>
              <button onClick={onClose} className="ml-2 p-1 rounded hover:bg-accent"><X size={16} /></button>
            </div>
          </div>

          {/* Info bar */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-[12px]">
            <div className="bg-muted/30 rounded-lg p-2 text-center"><div className="text-[10px] text-muted-foreground">Ngày công</div><div>{record.workingDays}</div></div>
            <div className="bg-muted/30 rounded-lg p-2 text-center"><div className="text-[10px] text-muted-foreground">Lương CB</div><div>{formatVND(record.baseSalary)}</div></div>
            <div className="bg-muted/30 rounded-lg p-2 text-center"><div className="text-[10px] text-muted-foreground">Phụ cấp</div><div>{formatVND(record.totalAllowances)}</div></div>
          </div>

          {/* Earnings */}
          <div className="mb-4">
            <div className="text-[13px] text-green-600 mb-2 flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" /> THU NHẬP
            </div>
            <div className="space-y-1.5">
              {earnings.map((item, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {item.sourceType === 'BASE' && <DollarSign size={12} />}
                    {item.sourceType === 'ALLOWANCE' && <Wallet size={12} />}
                    {item.sourceType === 'OVERTIME' && <Clock size={12} />}
                    {item.sourceType === 'BONUS' && <TrendingUp size={12} />}
                    {item.itemName}
                  </span>
                  <span className="text-green-600">+{formatFullVND(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] pt-2 border-t border-border">
                <span>Tổng thu nhập (Gross)</span>
                <span className="text-green-600">{formatFullVND(record.grossSalary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="mb-4">
            <div className="text-[13px] text-red-500 mb-2 flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" /> KHẤU TRỪ
            </div>
            <div className="space-y-1.5">
              {deductions.map((item, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {item.sourceType === 'INSURANCE' && <Shield size={12} />}
                    {item.sourceType === 'TAX' && <Receipt size={12} />}
                    {item.sourceType === 'ADJUSTMENT' && <Edit3 size={12} />}
                    {item.itemName}
                  </span>
                  <span className="text-red-500">-{formatFullVND(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] pt-2 border-t border-border">
                <span>Tổng khấu trừ</span>
                <span className="text-red-500">-{formatFullVND(record.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Insurance breakdown */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 mb-4 text-[11px]">
            <div className="text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1"><Shield size={12} /> Chi tiết bảo hiểm</div>
            <div className="grid grid-cols-3 gap-2">
              <div>BHXH (8%): {formatFullVND(record.socialInsuranceEmployee)}</div>
              <div>BHYT (1.5%): {formatFullVND(record.healthInsuranceEmployee)}</div>
              <div>BHTN (1%): {formatFullVND(record.unemploymentInsuranceEmployee)}</div>
            </div>
          </div>

          {/* NET */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 text-center">
            <div className="text-[13px] text-muted-foreground">THỰC NHẬN (NET)</div>
            <div className="text-[28px] text-green-600 mt-1">{formatFullVND(record.netSalary)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">= Gross ({formatVND(record.grossSalary)}) − Khấu trừ ({formatVND(record.totalDeductions)})</div>
          </div>

          <button className="w-full mt-4 py-2 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-accent flex items-center justify-center gap-1">
            <Download size={14} /> Tải phiếu lương PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Create Period Dialog
// ═══════════════════════════════════════════════════════════════
function CreatePeriodDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (month: number, year: number, days: number) => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState(22);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo kỳ lương mới</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Tháng</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Năm</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Số ngày công chuẩn</label>
            <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" min={15} max={31} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px]">Huỷ</button>
          <button onClick={() => onCreate(month, year, days)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">Tạo kỳ lương</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. PayrollAdjustmentsPage
// ═══════════════════════════════════════════════════════════════
export function PayrollAdjustmentsPage() {
  const { currentUser, can } = useAuth();
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>(initialAdjustments);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isAdminHR = can('ADMIN', 'HR');

  const filtered = useMemo(() => {
    let list = adjustments;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => getUserById(a.userId)?.fullName.toLowerCase().includes(s) || a.reason.toLowerCase().includes(s));
    }
    if (typeFilter) list = list.filter(a => a.type === typeFilter);
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    return list;
  }, [adjustments, search, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    pending: adjustments.filter(a => a.status === 'PENDING').length,
    totalBonus: adjustments.filter(a => a.type === 'BONUS' && (a.status === 'APPROVED' || a.status === 'APPLIED')).reduce((s, a) => s + a.amount, 0),
    totalDeduct: adjustments.filter(a => a.type === 'DEDUCTION' && (a.status === 'APPROVED' || a.status === 'APPLIED')).reduce((s, a) => s + a.amount, 0),
    totalAdvance: adjustments.filter(a => a.type === 'ADVANCE' && (a.status === 'APPROVED' || a.status === 'APPLIED')).reduce((s, a) => s + a.amount, 0),
  }), [adjustments]);

  const handleApprove = (id: string) => {
    setAdjustments(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' as const, approvedByUserId: currentUser?.id, approvedAt: new Date().toISOString().slice(0, 10) } : a));
    toast.success('Đã duyệt điều chỉnh');
  };
  const handleReject = (id: string) => {
    setAdjustments(prev => prev.map(a => a.id === id ? { ...a, status: 'REJECTED' as const, approvedByUserId: currentUser?.id, approvedAt: new Date().toISOString().slice(0, 10) } : a));
    toast.success('Đã từ chối điều chỉnh');
  };

  const handleCreate = (data: { userId: string; type: PayrollAdjustmentType; amount: number; reason: string }) => {
    const newAdj: PayrollAdjustment = {
      id: `pa-new-${Date.now()}`,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      reason: data.reason,
      status: 'PENDING',
      createdByUserId: currentUser!.id,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setAdjustments(prev => [newAdj, ...prev]);
    setShowCreate(false);
    toast.success('Đã tạo điều chỉnh mới');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Điều chỉnh lương</h1>
        {isAdminHR && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
            <Plus size={16} /> Tạo điều chỉnh
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 text-center">
          <div className="text-[20px] text-yellow-600">{stats.pending}</div>
          <div className="text-[10px] text-muted-foreground">Chờ duyệt</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-center">
          <div className="text-[16px] text-green-600">{formatVND(stats.totalBonus)}</div>
          <div className="text-[10px] text-muted-foreground">Tổng thưởng</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 text-center">
          <div className="text-[16px] text-red-500">{formatVND(stats.totalDeduct)}</div>
          <div className="text-[10px] text-muted-foreground">Tổng khấu trừ</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 text-center">
          <div className="text-[16px] text-blue-600">{formatVND(stats.totalAdvance)}</div>
          <div className="text-[10px] text-muted-foreground">Tổng tạm ứng</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm nhân viên, lý do..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả loại</option>
          <option value="BONUS">Thưởng</option>
          <option value="DEDUCTION">Khấu trừ</option>
          <option value="ADVANCE">Tạm ứng</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(adjustStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Nhân viên</th>
              <th className="text-left px-3 py-3 text-[11px] text-muted-foreground">Loại</th>
              <th className="text-right px-3 py-3 text-[11px] text-muted-foreground">Số tiền</th>
              <th className="text-left px-3 py-3 text-[11px] text-muted-foreground hidden md:table-cell">Lý do</th>
              <th className="text-left px-3 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">Ngày tạo</th>
              <th className="text-left px-3 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">Người tạo</th>
              <th className="text-left px-3 py-3 text-[11px] text-muted-foreground">Trạng thái</th>
              {isAdminHR && <th className="text-right px-3 py-3 text-[11px] text-muted-foreground">Hành động</th>}
            </tr></thead>
            <tbody>
              {filtered.map(a => {
                const u = getUserById(a.userId);
                const creator = getUserById(a.createdByUserId);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3 text-[12px]">{u?.fullName}</td>
                    <td className="px-3 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded ${adjustTypeColors[a.type]}`}>{adjustTypeLabels[a.type]}</span></td>
                    <td className={`px-3 py-3 text-[13px] text-right ${a.type === 'BONUS' ? 'text-green-600' : a.type === 'DEDUCTION' ? 'text-red-500' : 'text-blue-600'}`}>
                      {a.type === 'BONUS' ? '+' : a.type === 'DEDUCTION' ? '-' : ''}{formatFullVND(a.amount)}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{a.reason}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{a.createdAt}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{creator?.fullName}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${adjustStatusColors[a.status]}`}>{adjustStatusLabels[a.status]}</span>
                      {a.note && <div className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[100px]">{a.note}</div>}
                    </td>
                    {isAdminHR && (
                      <td className="px-3 py-3 text-right">
                        {a.status === 'PENDING' && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleApprove(a.id)} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30" title="Duyệt"><Check size={14} /></button>
                            <button onClick={() => handleReject(a.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30" title="Từ chối"><X size={14} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-[13px]">Không có điều chỉnh nào</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} điều chỉnh</div>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <CreateAdjustmentDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}

function CreateAdjustmentDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { userId: string; type: PayrollAdjustmentType; amount: number; reason: string }) => void;
}) {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<PayrollAdjustmentType>('BONUS');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const activeUsers = users.filter(u => u.employmentStatus === 'ACTIVE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo điều chỉnh lương</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Nhân viên *</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">Chọn nhân viên</option>
              {activeUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.userCode})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Loại điều chỉnh *</label>
            <div className="flex gap-2">
              {(['BONUS', 'DEDUCTION', 'ADVANCE'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-lg text-[12px] border ${type === t ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-border text-muted-foreground'}`}>
                  {adjustTypeLabels[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Số tiền (₫) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            {amount && <div className="text-[11px] text-muted-foreground mt-0.5">{formatFullVND(Number(amount))}</div>}
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Lý do *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do điều chỉnh..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-20 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px]">Huỷ</button>
          <button onClick={() => {
            if (!userId || !amount || !reason.trim()) { toast.error('Vui lòng điền đầy đủ'); return; }
            onCreate({ userId, type, amount: Number(amount), reason });
          }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">Tạo</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. PayrollConfigPage
// ═══════════════════════════════════════════════════════════════
export function PayrollConfigPage() {
  const { can } = useAuth();
  const [insurance, setInsurance] = useState<InsurancePolicy[]>(initialInsurance);
  const [taxPolicies, setTaxPolicies] = useState<TaxPolicy[]>(initialTax);
  const [activeSection, setActiveSection] = useState<'insurance' | 'tax'>('insurance');

  const isAdminHR = can('ADMIN', 'HR');

  if (!isAdminHR) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        <Shield size={40} className="mx-auto mb-2 opacity-30" />
        <div>Bạn không có quyền truy cập cấu hình lương</div>
      </div>
    );
  }

  const activeTax = taxPolicies.find(t => t.isActive);

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Cấu hình bảng lương</h1>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveSection('insurance')} className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 ${activeSection === 'insurance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
          <Shield size={14} /> Chính sách bảo hiểm
        </button>
        <button onClick={() => setActiveSection('tax')} className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 ${activeSection === 'tax' ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
          <Receipt size={14} /> Thuế TNCN
        </button>
      </div>

      {/* Insurance Section */}
      {activeSection === 'insurance' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-[12px] text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div>Tỷ lệ đóng bảo hiểm áp dụng cho tất cả nhân viên. Mức trần lương đóng bảo hiểm: <span className="font-medium">{formatFullVND(insurance[0]?.salaryCap || 36000000)}</span></div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {insurance.map(ins => {
              const totalRate = ins.employeeRate + ins.employerRate;
              return (
                <div key={ins.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[14px]">{ins.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ins.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                      {ins.isActive ? 'Đang áp dụng' : 'Không hoạt động'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">Mã:</span>
                      <span className="px-1.5 py-0.5 bg-muted rounded text-[11px]">{ins.code}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">NV đóng:</span>
                      <span className="text-red-500">{(ins.employeeRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">DN đóng:</span>
                      <span className="text-blue-600">{(ins.employerRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-[12px] pt-1 border-t border-border">
                      <span className="text-muted-foreground">Tổng:</span>
                      <span>{(totalRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">Trần lương:</span>
                      <span>{formatFullVND(ins.salaryCap)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">Hiệu lực:</span>
                      <span>{new Date(ins.effectiveDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {ins.note && <div className="mt-2 text-[10px] text-muted-foreground">{ins.note}</div>}

                  {/* Visual bar */}
                  <div className="mt-3">
                    <div className="flex h-2 rounded overflow-hidden">
                      <div className="bg-red-400" style={{ width: `${(ins.employeeRate / totalRate) * 100}%` }} title="NV đóng" />
                      <div className="bg-blue-400" style={{ width: `${(ins.employerRate / totalRate) * 100}%` }} title="DN đóng" />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span className="text-red-500">NV {(ins.employeeRate * 100).toFixed(1)}%</span>
                      <span className="text-blue-600">DN {(ins.employerRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] mb-3">Tổng hợp tỷ lệ đóng bảo hiểm</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              <div className="text-center">
                <div className="text-muted-foreground">NV đóng tổng</div>
                <div className="text-[16px] text-red-500">{(insurance.reduce((s, i) => s + i.employeeRate, 0) * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">DN đóng tổng</div>
                <div className="text-[16px] text-blue-600">{(insurance.reduce((s, i) => s + i.employerRate, 0) * 100).toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">NV max/tháng</div>
                <div className="text-[16px]">{formatVND(insurance.reduce((s, i) => s + i.salaryCap * i.employeeRate, 0))}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">DN max/tháng</div>
                <div className="text-[16px]">{formatVND(insurance.reduce((s, i) => s + i.salaryCap * i.employerRate, 0))}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Section */}
      {activeSection === 'tax' && activeTax && (
        <div className="space-y-4">
          {/* Tax policy info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[14px]">{activeTax.name}</div>
                <div className="text-[11px] text-muted-foreground">Hiệu lực: {new Date(activeTax.effectiveDate).toLocaleDateString('vi-VN')}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Đang áp dụng</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
                <div className="text-[11px] text-muted-foreground">Giảm trừ bản thân</div>
                <div className="text-[18px] text-blue-600">{formatFullVND(activeTax.personalDeduction)}</div>
                <div className="text-[10px] text-muted-foreground">/tháng</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3">
                <div className="text-[11px] text-muted-foreground">Giảm trừ người phụ thuộc</div>
                <div className="text-[18px] text-purple-600">{formatFullVND(activeTax.dependentDeduction)}</div>
                <div className="text-[10px] text-muted-foreground">/người/tháng</div>
              </div>
            </div>
          </div>

          {/* Tax brackets table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="text-[14px]">Biểu thuế lũy tiến từng phần</div>
              <div className="text-[11px] text-muted-foreground">Công thức: Thuế = Thu nhập chịu thuế × Thuế suất − Số tiền giảm trừ nhanh</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground w-16">Bậc</th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">Thu nhập chịu thuế từ</th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">Đến</th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">Thuế suất</th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">Giảm trừ nhanh</th>
                </tr></thead>
                <tbody>
                  {activeTax.brackets.map(b => (
                    <tr key={b.level} className="border-b border-border last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-3 text-[13px] text-center">{b.level}</td>
                      <td className="px-4 py-3 text-[12px] text-right">{formatFullVND(b.fromAmount)}</td>
                      <td className="px-4 py-3 text-[12px] text-right">{b.toAmount ? formatFullVND(b.toAmount) : '∞'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[12px] px-2 py-0.5 rounded ${b.rate <= 0.1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : b.rate <= 0.2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : b.rate <= 0.3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {(b.rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-right">{formatFullVND(b.quickDeduction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax calculator */}
          <TaxCalculator brackets={activeTax.brackets} personalDeduction={activeTax.personalDeduction} />
        </div>
      )}
    </div>
  );
}

// ─── Tax Calculator ─────────────
function TaxCalculator({ brackets, personalDeduction }: { brackets: TaxBracket[]; personalDeduction: number }) {
  const [grossInput, setGrossInput] = useState('');
  const [dependents, setDependents] = useState(0);

  const result = useMemo(() => {
    const gross = Number(grossInput);
    if (!gross || gross <= 0) return null;

    // Assume insurance on capped base
    const insBase = Math.min(gross, 36000000);
    const bhxh = insBase * 0.08;
    const bhyt = insBase * 0.015;
    const bhtn = insBase * 0.01;
    const totalIns = bhxh + bhyt + bhtn;

    const taxableIncome = gross - totalIns - personalDeduction - (dependents * 4400000);
    let tax = 0;
    let appliedBracket = 0;
    if (taxableIncome > 0) {
      for (const b of brackets) {
        if (b.toAmount === null || taxableIncome <= b.toAmount) {
          tax = taxableIncome * b.rate - b.quickDeduction;
          appliedBracket = b.level;
          break;
        }
      }
    }
    if (tax < 0) tax = 0;
    const net = gross - totalIns - tax;

    return { gross, totalIns, bhxh, bhyt, bhtn, personalDeduction, dependentDeduction: dependents * 4400000, taxableIncome: Math.max(0, taxableIncome), tax, net, appliedBracket };
  }, [grossInput, dependents, brackets, personalDeduction]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[14px] mb-3 flex items-center gap-1"><Calculator size={16} /> Tính thử thuế TNCN</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Thu nhập Gross (₫)</label>
          <input type="number" value={grossInput} onChange={e => setGrossInput(e.target.value)} placeholder="VD: 30000000" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Số người phụ thuộc</label>
          <input type="number" value={dependents} onChange={e => setDependents(Number(e.target.value))} min={0} max={10} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
      </div>

      {result && (
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Thu nhập Gross:</span><span>{formatFullVND(result.gross)}</span></div>
          <div className="flex justify-between text-red-500"><span>— BHXH (8%):</span><span>-{formatFullVND(result.bhxh)}</span></div>
          <div className="flex justify-between text-red-500"><span>— BHYT (1.5%):</span><span>-{formatFullVND(result.bhyt)}</span></div>
          <div className="flex justify-between text-red-500"><span>— BHTN (1%):</span><span>-{formatFullVND(result.bhtn)}</span></div>
          <div className="flex justify-between text-blue-600"><span>— Giảm trừ bản thân:</span><span>-{formatFullVND(result.personalDeduction)}</span></div>
          {result.dependentDeduction > 0 && (
            <div className="flex justify-between text-purple-600"><span>— Giảm trừ phụ thuộc ({dependents} người):</span><span>-{formatFullVND(result.dependentDeduction)}</span></div>
          )}
          <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Thu nhập chịu thuế:</span><span>{formatFullVND(result.taxableIncome)}</span></div>
          {result.appliedBracket > 0 && <div className="text-[10px] text-muted-foreground">Áp dụng bậc {result.appliedBracket} ({(brackets[result.appliedBracket - 1].rate * 100).toFixed(0)}%)</div>}
          <div className="flex justify-between text-red-500"><span>Thuế TNCN:</span><span>-{formatFullVND(result.tax)}</span></div>
          <div className="flex justify-between text-[14px] border-t-2 border-border pt-2">
            <span>THỰC NHẬN (NET):</span>
            <span className="text-green-600">{formatFullVND(result.net)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Tỷ lệ thuế thực tế: {result.gross > 0 ? ((result.tax / result.gross) * 100).toFixed(2) : 0}% | Tỷ lệ khấu trừ tổng: {result.gross > 0 ? (((result.totalIns + result.tax) / result.gross) * 100).toFixed(2) : 0}%</div>
        </div>
      )}
    </div>
  );
}
