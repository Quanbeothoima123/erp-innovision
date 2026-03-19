// ================================================================
// PAYROLL PAGE — Module 7 (Full API integration)
// Replaces all mockData with real API via payroll.service
// ================================================================
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  DollarSign,
  Download,
  X,
  Check,
  Plus,
  Search,
  Loader2,
  Clock,
  TrendingUp,
  ArrowRight,
  Edit3,
  Shield,
  Users,
  Calculator,
  Receipt,
  Wallet,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Ban,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as payrollService from "../../lib/services/payroll.service";
import type {
  ApiPayrollPeriod,
  ApiPayrollRecord,
  ApiAdjustment,
  ApiCompensation,
  PeriodStatus,
  AdjustmentType,
  AdjustmentStatus,
} from "../../lib/services/payroll.service";
import { ApiError } from "../../lib/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const fmtVNDShort = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return `${n}`;
};
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

// ─── Constants ────────────────────────────────────────────────────
const periodStatusColors: Record<PeriodStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  CALCULATING:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const periodStatusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  CALCULATING: "Đang tính",
  APPROVED: "Đã duyệt",
  PAID: "Đã chi trả",
  CANCELLED: "Đã huỷ",
};
const adjustTypeLabels: Record<AdjustmentType, string> = {
  BONUS: "Thưởng",
  DEDUCTION: "Khấu trừ",
  ADVANCE: "Tạm ứng",
  REIMBURSEMENT: "Hoàn tiền",
};
const adjustTypeColors: Record<AdjustmentType, string> = {
  BONUS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DEDUCTION: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ADVANCE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REIMBURSEMENT:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};
const adjustStatusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  APPLIED: "Đã áp dụng",
};
const adjustStatusColors: Record<string, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  APPLIED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};
const PIE_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

// ═══════════════════════════════════════════════════════════════════
// 1. PayrollPage — HR/Admin kỳ lương
// ═══════════════════════════════════════════════════════════════════
export function PayrollPage() {
  const { currentUser, can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");
  const canManage = isAdminHR || can("ACCOUNTANT");

  // Employee view
  if (!canManage) {
    return <EmployeePayslipView />;
  }
  return <HRPayrollView />;
}

// ─── HR/Admin view ─────────────────────────────────────────────────
function HRPayrollView() {
  const { can } = useAuth();
  const isAdmin = can("ADMIN");

  const [periods, setPeriods] = useState<ApiPayrollPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ApiPayrollPeriod | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollService.listPeriods({
        limit: 50,
        sortOrder: "desc",
      });
      setPeriods(res.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreate = async (payload: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    workingDaysInPeriod: number;
  }) => {
    try {
      await payrollService.createPeriod(payload);
      toast.success(`Đã tạo kỳ lương T${payload.month}/${payload.year}`);
      setShowCreate(false);
      fetchPeriods();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể tạo kỳ lương",
      );
    }
  };

  const handleCalculate = async (id: string) => {
    try {
      toast.info("Đang tính lương...");
      const result = await payrollService.calculatePeriod(id);
      // calculatePeriod returns { period, calculatedCount, totalUsers, errors }
      // api wraps in data, so result may be period directly or wrapped
      toast.success(
        `Tính lương hoàn tất — ${(result as Record<string, number>).calculatedCount ?? 0} nhân viên`,
      );
      await fetchPeriods();
      // Cập nhật selectedPeriod với dữ liệu mới nhất từ server
      if (id) {
        try {
          const updated = await payrollService.getPeriodById(id);
          setSelectedPeriod(updated);
        } catch {
          setSelectedPeriod(null);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi tính lương");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await payrollService.approvePeriod(id);
      toast.success("Đã duyệt kỳ lương");
      await fetchPeriods();
      // Cập nhật dialog với trạng thái mới (APPROVED)
      setSelectedPeriod(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể duyệt");
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const updated = await payrollService.markPeriodPaid(id);
      toast.success("Đã đánh dấu chi trả thành công");
      await fetchPeriods();
      // Cập nhật dialog với trạng thái mới (PAID) → nút sẽ biến mất đúng
      setSelectedPeriod(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật");
    }
  };

  const handleCancel = async (id: string) => {
    if (!isAdmin) {
      toast.error("Chỉ Admin mới có thể huỷ kỳ lương");
      return;
    }
    try {
      const updated = await payrollService.cancelPeriod(id);
      toast.success("Đã huỷ kỳ lương — có thể xóa để tạo lại");
      await fetchPeriods();
      // Cập nhật dialog sang trạng thái CANCELLED
      setSelectedPeriod(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể huỷ");
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Xóa hẳn kỳ lương này? Bạn có thể tạo lại cùng tháng/năm sau khi xóa.",
      )
    )
      return;
    try {
      await payrollService.deletePeriod(id);
      toast.success("Đã xóa kỳ lương");
      setSelectedPeriod(null);
      await fetchPeriods();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể xóa");
    }
  };

  // Chart data from periods that have records
  const chartData = [...periods]
    .filter((p) => p.recordCount > 0)
    .reverse()
    .slice(-6)
    .map((p) => ({
      name: `T${p.month}/${String(p.year).slice(-2)}`,
      count: p.recordCount,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Quản lý kỳ lương</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchPeriods}
            className="px-3 py-2 border border-border rounded-lg text-[13px] hover:bg-accent flex items-center gap-1"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> Tạo kỳ lương
          </button>
        </div>
      </div>

      {/* Flow guide */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2 text-[12px] text-blue-700 dark:text-blue-400">
        <Info size={14} className="shrink-0" />
        <span>
          Quy trình: <strong>Bản nháp</strong> → <strong>Tính lương</strong> →{" "}
          <strong>Duyệt</strong> → <strong>Đánh dấu chi trả</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] text-muted-foreground mb-3">
                Số nhân viên theo kỳ lương
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tick={{ fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: "var(--color-muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar
                    dataKey="count"
                    name="Nhân viên"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Period cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {periods.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPeriod(p)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px]">
                    T{p.month}/{p.year}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${periodStatusColors[p.status]}`}
                  >
                    {p.status === "CALCULATING" && (
                      <Loader2 size={10} className="inline mr-1 animate-spin" />
                    )}
                    {periodStatusLabels[p.status]}
                  </span>
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {p.recordCount} nhân viên • {p.workingDaysInPeriod ?? "—"}{" "}
                  ngày • {p.periodCode}
                </div>
                {p.payDate && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Ngày trả: {fmtDate(p.payDate)}
                  </div>
                )}
                {/* Progress bar */}
                <div className="mt-3 flex gap-1">
                  {(["DRAFT", "CALCULATING", "APPROVED", "PAID"] as const).map(
                    (s, i) => (
                      <div
                        key={s}
                        className={`flex-1 h-1 rounded ${["DRAFT", "CALCULATING", "APPROVED", "PAID"].indexOf(p.status) >= i ? "bg-blue-500" : "bg-border"}`}
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Receipt size={40} className="mx-auto mb-2 opacity-30" />
                <div className="text-[14px]">Chưa có kỳ lương nào</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Period detail modal */}
      {selectedPeriod && (
        <PeriodDetailModal
          period={selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
          onCalculate={handleCalculate}
          onApprove={handleApprove}
          onMarkPaid={handleMarkPaid}
          onCancel={handleCancel}
          onDelete={handleDeletePeriod}
        />
      )}

      {/* Create period dialog */}
      {showCreate && (
        <CreatePeriodDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Employee Payslip View
// ═══════════════════════════════════════════════════════════════════
function EmployeePayslipView() {
  const [records, setRecords] = useState<ApiPayrollRecord[]>([]);
  const [compensation, setCompensation] = useState<ApiCompensation | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ApiPayrollRecord | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recs, comp] = await Promise.all([
          payrollService.listRecords({ limit: 24 }),
          payrollService.getMyCompensation().catch(() => null),
        ]);
        setRecords(recs.items);
        setCompensation(comp);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sorted = [...records].sort((a, b) =>
    (b.payrollPeriod?.periodCode ?? "").localeCompare(
      a.payrollPeriod?.periodCode ?? "",
    ),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Phiếu lương của tôi</h1>

      {/* My salary summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <DollarSign size={12} /> Lương cơ bản
          </div>
          <div className="text-[18px] mt-1">
            {compensation ? fmtVND(compensation.baseSalary) : "—"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={12} /> Ngày nhận lương
          </div>
          <div className="text-[18px] mt-1">
            {compensation?.payDayOfMonth
              ? `Ngày ${compensation.payDayOfMonth}`
              : "Theo lịch"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Shield size={12} /> Loại lương
          </div>
          <div className="text-[18px] mt-1">
            {compensation?.salaryType === "MONTHLY"
              ? "Tháng"
              : (compensation?.salaryType ?? "—")}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Receipt size={12} /> Tổng phiếu
          </div>
          <div className="text-[18px] mt-1">{records.length}</div>
        </div>
      </div>

      {/* Compensation info */}
      {compensation && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[12px] text-muted-foreground mb-2">
            Cấu hình lương hiện tại
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <span>
              Lương CB: <strong>{fmtVND(compensation.baseSalary)}</strong>
            </span>
            <span>
              Hiệu lực: <strong>{fmtDate(compensation.effectiveFrom)}</strong>
            </span>
            <span>
              Hệ số OT thường:{" "}
              <strong>×{compensation.overtimeRateWeekday}</strong>
            </span>
            <span>
              Cuối tuần: <strong>×{compensation.overtimeRateWeekend}</strong>
            </span>
            <span>
              Ngày lễ: <strong>×{compensation.overtimeRateHoliday}</strong>
            </span>
          </div>
          {compensation.changeReason && (
            <div className="text-[12px] text-muted-foreground mt-1">
              Lý do: {compensation.changeReason}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Receipt size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Chưa có phiếu lương</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const p = r.payrollPeriod;
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedRecord(r)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px]">
                      Kỳ lương T{p?.month}/{p?.year}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {r.workingDays ?? "—"} ngày công
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] text-green-600">
                      {fmtVND(r.netSalary)}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "PAID" ? periodStatusColors["PAID"] : r.status === "APPROVED" ? periodStatusColors["APPROVED"] : periodStatusColors["DRAFT"]}`}
                    >
                      {r.status === "PAID"
                        ? "Đã chi trả"
                        : r.status === "APPROVED"
                          ? "Đã duyệt"
                          : "Bản nháp"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2 text-[11px] text-muted-foreground">
                  <div>CB: {fmtVNDShort(r.baseSalary)}</div>
                  <div>PC: {fmtVNDShort(r.totalAllowances)}</div>
                  <div>
                    OT:{" "}
                    {r.totalOvertimePay > 0
                      ? fmtVNDShort(r.totalOvertimePay)
                      : "—"}
                  </div>
                  <div>
                    Thưởng: {r.totalBonus > 0 ? fmtVNDShort(r.totalBonus) : "—"}
                  </div>
                  <div className="text-red-500">
                    -{fmtVNDShort(r.totalDeductions)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRecord && (
        <PayslipDialog
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Period Detail Modal — loads records on open
// ═══════════════════════════════════════════════════════════════════
function PeriodDetailModal({
  period,
  onClose,
  onCalculate,
  onApprove,
  onMarkPaid,
  onCancel,
  onDelete,
}: {
  period: ApiPayrollPeriod;
  onClose: () => void;
  onCalculate: (id: string) => void;
  onApprove: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { can } = useAuth();
  const isAdmin = can("ADMIN");

  const [records, setRecords] = useState<ApiPayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "net" | "gross">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRecord, setSelectedRecord] = useState<ApiPayrollRecord | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      if (period.recordCount === 0) return;
      setLoading(true);
      try {
        const res = await payrollService.listRecords({
          payrollPeriodId: period.id,
          limit: 100,
        });
        setRecords(res.items);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [period.id, period.recordCount]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => r.user?.fullName.toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => {
      if (sortKey === "name") {
        const cmp = (a.user?.fullName ?? "").localeCompare(
          b.user?.fullName ?? "",
        );
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "net")
        return sortDir === "asc"
          ? a.netSalary - b.netSalary
          : b.netSalary - a.netSalary;
      return sortDir === "asc"
        ? a.grossSalary - b.grossSalary
        : b.grossSalary - a.grossSalary;
    });
  }, [records, search, sortKey, sortDir]);

  const totals = useMemo(
    () => ({
      gross: records.reduce((s, r) => s + r.grossSalary, 0),
      net: records.reduce((s, r) => s + r.netSalary, 0),
      deductions: records.reduce((s, r) => s + r.totalDeductions, 0),
      ot: records.reduce((s, r) => s + r.totalOvertimePay, 0),
      bonus: records.reduce((s, r) => s + r.totalBonus, 0),
      base: records.reduce((s, r) => s + r.baseSalary, 0),
      allowances: records.reduce((s, r) => s + r.totalAllowances, 0),
    }),
    [records],
  );

  const pieData = [
    { name: "Lương CB", value: totals.base },
    { name: "Phụ cấp", value: totals.allowances },
    { name: "OT", value: totals.ot },
    { name: "Thưởng", value: totals.bonus },
  ].filter((d) => d.value > 0);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp size={10} />
      ) : (
        <ChevronDown size={10} />
      )
    ) : null;

  const handleCalculateClick = async () => {
    setCalculating(true);
    await onCalculate(period.id);
    setCalculating(false);
    // Không đóng dialog — onCalculate sẽ setSelectedPeriod(updated) để re-render
    // với dữ liệu mới (status CALCULATING + danh sách nhân viên)
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-[18px]">
              Kỳ lương T{period.month}/{period.year}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${periodStatusColors[period.status]}`}
              >
                {periodStatusLabels[period.status]}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {period.workingDaysInPeriod ?? "—"} ngày • {period.recordCount}{" "}
                nhân viên • {period.periodCode}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        {/* Summary + Pie */}
        {records.length > 0 && (
          <div className="p-4 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Tổng Gross",
                  value: fmtVND(totals.gross),
                  color: "text-foreground",
                },
                {
                  label: "Tổng NET",
                  value: fmtVND(totals.net),
                  color: "text-green-600",
                },
                {
                  label: "Tổng khấu trừ",
                  value: fmtVND(totals.deductions),
                  color: "text-red-500",
                },
                {
                  label: "Tổng OT",
                  value: fmtVND(totals.ot),
                  color: "text-blue-600",
                },
                {
                  label: "Tổng thưởng",
                  value: fmtVND(totals.bonus),
                  color: "text-amber-600",
                },
                {
                  label: "TB NET/NV",
                  value:
                    records.length > 0
                      ? fmtVND(Math.round(totals.net / records.length))
                      : "—",
                  color: "text-green-600",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-muted/30 rounded-lg p-2.5 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {s.label}
                  </div>
                  <div className={`text-[14px] ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={30}
                    fontSize={10}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtVND(v)}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Search */}
        {records.length > 0 && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Tìm nhân viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />{" "}
            <span className="text-[13px]">Đang tải phiếu lương...</span>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th
                    className="text-left px-4 py-2 text-[11px] text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort("name")}
                  >
                    Nhân viên <SortIcon k="name" />
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                    Ngày
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                    Lương CB
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                    Phụ cấp
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden lg:table-cell">
                    OT
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Thưởng
                  </th>
                  <th
                    className="text-right px-3 py-2 text-[11px] text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort("gross")}
                  >
                    Gross <SortIcon k="gross" />
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                    Khấu trừ
                  </th>
                  <th
                    className="text-right px-3 py-2 text-[11px] text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort("net")}
                  >
                    NET <SortIcon k="net" />
                  </th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                          {r.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                        </div>
                        <div>
                          <div className="text-[12px]">{r.user?.fullName}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {(
                              r.user as { department?: { name: string } } | null
                            )?.department?.name ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right">
                      {r.workingDays ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right">
                      {fmtVND(r.baseSalary)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right hidden md:table-cell">
                      {fmtVND(r.totalAllowances)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">
                      {r.totalOvertimePay > 0
                        ? fmtVND(r.totalOvertimePay)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">
                      {r.totalBonus > 0 ? fmtVND(r.totalBonus) : "—"}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right">
                      {fmtVND(r.grossSalary)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-right text-red-500 hidden md:table-cell">
                      -{fmtVND(r.totalDeductions)}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-right text-green-600">
                      {fmtVND(r.netSalary)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="p-1 rounded hover:bg-accent"
                      >
                        <Eye size={14} className="text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-4 py-2 text-[12px] font-medium">
                    Tổng cộng
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right">—</td>
                  <td className="px-3 py-2 text-[12px] text-right">
                    {fmtVND(totals.base)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right hidden md:table-cell">
                    {fmtVND(totals.allowances)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">
                    {fmtVND(totals.ot)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right hidden lg:table-cell">
                    {fmtVND(totals.bonus)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right font-medium">
                    {fmtVND(totals.gross)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-right text-red-500 hidden md:table-cell">
                    -{fmtVND(totals.deductions)}
                  </td>
                  <td className="px-3 py-2 text-[13px] text-right text-green-600 font-medium">
                    {fmtVND(totals.net)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-[13px] space-y-3">
            <Calculator size={40} className="mx-auto opacity-30" />
            <div className="font-medium text-foreground">
              {period.status === "CANCELLED"
                ? "Kỳ lương đã bị huỷ"
                : 'Chưa có dữ liệu — nhấn "Tính lương" để bắt đầu tính cho kỳ này'}
            </div>
            {period.status !== "CANCELLED" && (
              <div className="max-w-sm mx-auto text-[12px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-700 dark:text-amber-400 text-left space-y-1">
                <div className="font-medium">
                  ⚠️ Nhân viên không xuất hiện nếu:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>
                    Chưa có cấu hình lương (vào{" "}
                    <strong>Cấu hình lương NV</strong> để tạo)
                  </li>
                  <li>Tài khoản không ở trạng thái ACTIVE</li>
                  <li>Trạng thái hợp đồng là TERMINATED</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-border flex flex-wrap justify-between items-center gap-2 sticky bottom-0 bg-card">
          <div className="text-[11px] text-muted-foreground">
            {period.paidAt && <span>Đã chi trả: {fmtDate(period.paidAt)}</span>}
            {period.approvedBy && (
              <span className="ml-2">
                Người duyệt: {period.approvedBy.fullName}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Nút XOÁ: chỉ hiện khi CANCELLED — cho phép tạo lại cùng tháng/năm */}
            {isAdmin && period.status === "CANCELLED" && (
              <button
                onClick={() => onDelete(period.id)}
                className="px-3 py-2 border border-red-400 text-red-600 rounded-lg text-[13px] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
              >
                <Trash2 size={14} /> Xóa kỳ
              </button>
            )}
            {/* Nút HUỶ: DRAFT, CALCULATING (không cho hủy APPROVED/PAID) */}
            {isAdmin && ["DRAFT", "CALCULATING"].includes(period.status) && (
              <button
                onClick={() => onCancel(period.id)}
                className="px-3 py-2 border border-orange-300 text-orange-600 rounded-lg text-[13px] hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-1"
              >
                <Ban size={14} /> Huỷ kỳ
              </button>
            )}
            {/* Nút TÍNH LƯƠNG: chỉ ở DRAFT */}
            {period.status === "DRAFT" && (
              <button
                onClick={handleCalculateClick}
                disabled={calculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
              >
                {calculating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Calculator size={14} />
                )}{" "}
                Tính lương
              </button>
            )}
            {/* Nút TÍNH LẠI: ở CALCULATING (nếu muốn tính lại) */}
            {period.status === "CALCULATING" && (
              <button
                onClick={handleCalculateClick}
                disabled={calculating}
                className="px-3 py-2 border border-blue-300 text-blue-600 rounded-lg text-[13px] hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"
              >
                {calculating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Calculator size={13} />
                )}{" "}
                Tính lại
              </button>
            )}
            {/* Nút DUYỆT: ở CALCULATING */}
            {period.status === "CALCULATING" && (
              <button
                onClick={() => onApprove(period.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-green-700"
              >
                <Check size={14} /> Duyệt kỳ lương
              </button>
            )}
            {/* Nút ĐÁNH DẤU CHI TRẢ: ở APPROVED */}
            {period.status === "APPROVED" && (
              <button
                onClick={() => onMarkPaid(period.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-emerald-700"
              >
                <Wallet size={14} /> Đánh dấu đã chi trả
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedRecord && (
        <PayslipDialog
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Payslip Dialog — full breakdown
// ═══════════════════════════════════════════════════════════════════
function PayslipDialog({
  record,
  onClose,
}: {
  record: ApiPayrollRecord;
  onClose: () => void;
}) {
  const u = record.user;
  const p = record.payrollPeriod;
  const earnings = record.items.filter((i) => i.itemType === "EARNING");
  const deductions = record.items.filter((i) => i.itemType === "DEDUCTION");
  const insTotal =
    record.socialInsuranceEmployee +
    record.healthInsuranceEmployee +
    record.unemploymentInsuranceEmployee;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] text-muted-foreground tracking-wider uppercase">
                Phiếu lương
              </div>
              <div className="text-[18px] mt-0.5">
                T{p?.month}/{p?.year} — {p?.periodCode}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent">
              <X size={18} />
            </button>
          </div>

          {/* Employee info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-[14px]">
              {u?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
            </div>
            <div>
              <div className="text-[14px]">{u?.fullName}</div>
              <div className="text-[12px] text-muted-foreground">
                {u?.userCode} •{" "}
                {(u as { department?: { name: string } } | null)?.department
                  ?.name ?? "—"}
              </div>
            </div>
            <span
              className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${record.status === "PAID" ? periodStatusColors["PAID"] : record.status === "APPROVED" ? periodStatusColors["APPROVED"] : periodStatusColors["DRAFT"]}`}
            >
              {record.status === "PAID"
                ? "Đã chi trả"
                : record.status === "APPROVED"
                  ? "Đã duyệt"
                  : "Bản nháp"}
            </span>
          </div>

          {/* Earnings */}
          <div className="space-y-1 mb-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
              Thu nhập
            </div>
            {earnings.map((item, i) => (
              <div key={i} className="flex justify-between text-[13px]">
                <span>{item.itemName}</span>
                <span className="text-green-600">{fmtVND(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] pt-1 border-t border-border font-medium">
              <span>Tổng thu nhập (Gross)</span>
              <span>{fmtVND(record.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-1 mb-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
              Khấu trừ
            </div>
            <div className="flex justify-between text-[13px]">
              <span>BHXH (8%)</span>
              <span className="text-red-500">
                -{fmtVND(record.socialInsuranceEmployee)}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span>BHYT (1.5%)</span>
              <span className="text-red-500">
                -{fmtVND(record.healthInsuranceEmployee)}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span>BHTN (1%)</span>
              <span className="text-red-500">
                -{fmtVND(record.unemploymentInsuranceEmployee)}
              </span>
            </div>
            {record.personalIncomeTax > 0 && (
              <div className="flex justify-between text-[13px]">
                <span>Thuế TNCN</span>
                <span className="text-red-500">
                  -{fmtVND(record.personalIncomeTax)}
                </span>
              </div>
            )}
            {deductions
              .filter((d) => d.sourceType === "ADJUSTMENT")
              .map((item, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span>{item.itemName}</span>
                  <span className="text-red-500">-{fmtVND(item.amount)}</span>
                </div>
              ))}
            <div className="flex justify-between text-[13px] pt-1 border-t border-border font-medium text-red-500">
              <span>Tổng khấu trừ</span>
              <span>-{fmtVND(record.totalDeductions)}</span>
            </div>
          </div>

          {/* Net */}
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
            <span className="text-[14px] font-medium">Thực nhận (NET)</span>
            <span className="text-[20px] text-green-600 font-semibold">
              {fmtVND(record.netSalary)}
            </span>
          </div>

          {/* Tax info */}
          {record.taxableIncome > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground grid grid-cols-2 gap-1">
              <span>Thu nhập tính thuế:</span>
              <span>{fmtVND(record.taxableIncome)}</span>
              <span>Ngày công:</span>
              <span>{record.workingDays ?? "—"}</span>
              {record.paidAt && (
                <>
                  <span>Ngày chi trả:</span>
                  <span>{fmtDate(record.paidAt)}</span>
                </>
              )}
            </div>
          )}

          {/* Download placeholder */}
          <button className="mt-4 w-full py-2 border border-border rounded-lg text-[13px] hover:bg-accent flex items-center justify-center gap-2">
            <Download size={14} /> Tải phiếu lương (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create Period Dialog
// ═══════════════════════════════════════════════════════════════════
function CreatePeriodDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    workingDaysInPeriod: number;
  }) => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [workingDays, setWorkingDays] = useState(22);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate start/end dates
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const handleSubmit = async () => {
    if (month < 1 || month > 12 || workingDays < 1 || workingDays > 31) {
      toast.error("Thông tin không hợp lệ");
      return;
    }
    setSubmitting(true);
    await onCreate({
      month,
      year,
      startDate,
      endDate,
      workingDaysInPeriod: workingDays,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo kỳ lương mới</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Tháng *
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Tháng {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Năm *
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                min={2020}
                max={2030}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Ngày công chuẩn *
            </label>
            <input
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(+e.target.value)}
              min={1}
              max={31}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-[12px]">
            <div className="text-muted-foreground mb-1">Kỳ tính</div>
            <div>
              {startDate} → {endDate}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Tạo kỳ lương
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. PayrollAdjustmentsPage — Điều chỉnh lương
// ═══════════════════════════════════════════════════════════════════
export function PayrollAdjustmentsPage() {
  const { can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");

  const [adjustments, setAdjustments] = useState<ApiAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollService.listAdjustments({
        limit: 100,
        sortOrder: "desc",
      });
      setAdjustments(res.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleCreate = async (payload: {
    userId: string;
    adjustmentType: AdjustmentType;
    amount: number;
    reason: string;
  }) => {
    try {
      await payrollService.createAdjustment(payload);
      toast.success("Đã tạo điều chỉnh lương");
      setShowCreate(false);
      fetchAdjustments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể tạo");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await payrollService.approveAdjustment(id);
      toast.success("Đã duyệt điều chỉnh");
      fetchAdjustments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể duyệt");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }
    try {
      await payrollService.rejectAdjustment(id, rejectReason);
      toast.success("Đã từ chối điều chỉnh");
      setRejectingId(null);
      setRejectReason("");
      fetchAdjustments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể từ chối");
    }
  };

  const filtered = useMemo(() => {
    let list = adjustments;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.user?.fullName.toLowerCase().includes(s) ||
          a.reason?.toLowerCase().includes(s),
      );
    }
    if (typeFilter) list = list.filter((a) => a.adjustmentType === typeFilter);
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    return list;
  }, [adjustments, search, typeFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: adjustments.filter((a) => a.status === "PENDING").length,
      totalBonus: adjustments
        .filter((a) => a.adjustmentType === "BONUS" && a.status === "APPROVED")
        .reduce((s, a) => s + a.amount, 0),
      totalDeduction: adjustments
        .filter(
          (a) => a.adjustmentType === "DEDUCTION" && a.status === "APPROVED",
        )
        .reduce((s, a) => s + a.amount, 0),
      totalAdvance: adjustments
        .filter(
          (a) => a.adjustmentType === "ADVANCE" && a.status === "APPROVED",
        )
        .reduce((s, a) => s + a.amount, 0),
    }),
    [adjustments],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px]">Điều chỉnh lương</h2>
        {isAdminHR && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={14} /> Tạo điều chỉnh
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Chờ duyệt",
            value: stats.pending,
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-900/10",
          },
          {
            label: "Tổng thưởng",
            value: fmtVND(stats.totalBonus),
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/10",
          },
          {
            label: "Tổng khấu trừ",
            value: fmtVND(stats.totalDeduction),
            color: "text-red-500",
            bg: "bg-red-50 dark:bg-red-900/10",
          },
          {
            label: "Tổng tạm ứng",
            value: fmtVND(stats.totalAdvance),
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/10",
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <div className={`text-[16px] ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm nhân viên, lý do..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(adjustTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(adjustStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                    Nhân viên
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                    Loại
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">
                    Số tiền
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">
                    Lý do
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                    Ngày tạo
                  </th>
                  {isAdminHR && <th className="px-4 py-3 w-32" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                          {a.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                        </div>
                        <div>
                          <div className="text-[13px]">{a.user?.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {a.user?.userCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${adjustTypeColors[a.adjustmentType]}`}
                      >
                        {adjustTypeLabels[a.adjustmentType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-right">
                      <span
                        className={
                          a.adjustmentType === "DEDUCTION"
                            ? "text-red-500"
                            : "text-green-600"
                        }
                      >
                        {a.adjustmentType === "DEDUCTION" ? "-" : "+"}
                        {fmtVND(a.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {a.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${adjustStatusColors[a.status]}`}
                      >
                        {adjustStatusLabels[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                      {fmtDate(a.createdAt)}
                    </td>
                    {isAdminHR && (
                      <td className="px-4 py-3">
                        {a.status === "PENDING" &&
                          (rejectingId === a.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Lý do *"
                                value={rejectReason}
                                onChange={(e) =>
                                  setRejectReason(e.target.value)
                                }
                                autoFocus
                                className="w-28 px-2 py-1 rounded border border-red-300 text-[11px] bg-input-background"
                              />
                              <button
                                onClick={() => handleReject(a.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[11px]"
                              >
                                <Check size={10} />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                }}
                                className="px-2 py-1 border border-border rounded text-[11px]"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApprove(a.id)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-[11px] hover:bg-green-200"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => setRejectingId(a.id)}
                                className="px-3 py-1 bg-red-100 text-red-600 rounded text-[11px] hover:bg-red-200"
                              >
                                Từ chối
                              </button>
                            </div>
                          ))}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-[13px]"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">
            {filtered.length} / {adjustments.length} điều chỉnh
          </div>
        </div>
      )}

      {showCreate && (
        <CreateAdjustmentDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. PayrollConfigPage — Thành phần lương + Tính thuế TNCN
// (Insurance/Tax policy → dùng SystemConfig ở backend, trang này
//  hiển thị salary components và công cụ tính thuế local)
// ═══════════════════════════════════════════════════════════════════
export function PayrollConfigPage() {
  const { can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");

  const [components, setComponents] = useState<
    payrollService.ApiSalaryComponent[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "components" | "insurance" | "tax"
  >("components");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true);
      try {
        const res = await payrollService.listSalaryComponents({ limit: 50 });
        setComponents(res.items);
      } catch (err) {
        if (err instanceof ApiError) toast.error((err as ApiError).message);
      } finally {
        setLoading(false);
      }
    };
    if (isAdminHR) fetchComponents();
  }, [isAdminHR]);

  if (!isAdminHR) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        <Shield size={40} className="mx-auto mb-2 opacity-30" />
        <div>Bạn không có quyền truy cập cấu hình lương</div>
      </div>
    );
  }

  const handleCreateComponent = async (payload: {
    code: string;
    name: string;
    componentType: payrollService.ComponentType;
    calculationType: payrollService.CalculationType;
    isTaxable: boolean;
    isInsurable: boolean;
    description: string | null;
  }) => {
    try {
      const created = await payrollService.createSalaryComponent(payload);
      setComponents((prev) => [...prev, created]);
      toast.success("Đã tạo thành phần lương");
      setShowCreate(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? (err as ApiError).message : "Không thể tạo",
      );
    }
  };

  const earningComponents = components.filter(
    (c) => c.componentType === "EARNING",
  );
  const deductionComponents = components.filter(
    (c) => c.componentType === "DEDUCTION",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px]">Cấu hình bảng lương</h1>
        {activeSection === "components" && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={14} /> Thêm thành phần
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {(
          [
            {
              key: "components",
              label: "Thành phần lương",
              icon: <DollarSign size={14} />,
            },
            {
              key: "insurance",
              label: "Bảo hiểm XH",
              icon: <Shield size={14} />,
            },
            { key: "tax", label: "Thuế TNCN", icon: <Receipt size={14} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors
              ${activeSection === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Salary Components ── */}
      {activeSection === "components" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-400">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              Thành phần lương được gán cho từng nhân viên riêng lẻ. Loại{" "}
              <strong>EARNING</strong> cộng vào Gross, loại{" "}
              <strong>DEDUCTION</strong> trừ vào lương.
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />{" "}
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-green-50 dark:bg-green-900/10 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-600" />
                  <span className="text-[13px] text-green-700 dark:text-green-400">
                    Thu nhập ({earningComponents.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {earningComponents.map((c) => (
                    <div
                      key={c.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px]">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">
                            {c.code}
                          </span>
                          {!c.isActive && (
                            <span className="text-[10px] text-muted-foreground">
                              (ẩn)
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {c.isTaxable && (
                            <span className="text-[10px] text-orange-600">
                              Chịu thuế
                            </span>
                          )}
                          {c.isInsurable && (
                            <span className="text-[10px] text-blue-600">
                              Tính BH
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {c.calculationType}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-gray-300"}`}
                      />
                    </div>
                  ))}
                  {earningComponents.length === 0 && (
                    <div className="px-4 py-6 text-center text-muted-foreground text-[13px]">
                      Chưa có thành phần thu nhập
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-red-50 dark:bg-red-900/10 flex items-center gap-2">
                  <Ban size={14} className="text-red-500" />
                  <span className="text-[13px] text-red-600 dark:text-red-400">
                    Khấu trừ ({deductionComponents.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {deductionComponents.map((c) => (
                    <div
                      key={c.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px]">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">
                            {c.code}
                          </span>
                          {!c.isActive && (
                            <span className="text-[10px] text-muted-foreground">
                              (ẩn)
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {c.isTaxable && (
                            <span className="text-[10px] text-orange-600">
                              Chịu thuế
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {c.calculationType}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-gray-300"}`}
                      />
                    </div>
                  ))}
                  {deductionComponents.length === 0 && (
                    <div className="px-4 py-6 text-center text-muted-foreground text-[13px]">
                      Chưa có thành phần khấu trừ
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Insurance Section (static reference rates) ── */}
      {activeSection === "insurance" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-[12px] text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div>
              Tỷ lệ BHXH/BHYT/BHTN theo quy định hiện hành. Mức trần lương đóng
              BHXH: <strong>36.000.000đ/tháng</strong>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "BHXH — Bảo hiểm xã hội",
                code: "BHXH",
                employeeRate: 0.08,
                employerRate: 0.175,
                cap: 36000000,
                color: "blue",
              },
              {
                name: "BHYT — Bảo hiểm y tế",
                code: "BHYT",
                employeeRate: 0.015,
                employerRate: 0.03,
                cap: 36000000,
                color: "green",
              },
              {
                name: "BHTN — Bảo hiểm thất nghiệp",
                code: "BHTN",
                employeeRate: 0.01,
                employerRate: 0.01,
                cap: 93600000,
                color: "purple",
              },
            ].map((ins) => {
              const total = ins.employeeRate + ins.employerRate;
              return (
                <div
                  key={ins.code}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px]">{ins.name}</div>
                    <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      Đang áp dụng
                    </span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NV đóng:</span>
                      <span className="text-red-500">
                        {(ins.employeeRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DN đóng:</span>
                      <span className="text-blue-600">
                        {(ins.employerRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="text-muted-foreground">Tổng:</span>
                      <span>{(total * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trần lương:</span>
                      <span>{fmtVND(ins.cap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        NV max/tháng:
                      </span>
                      <span className="text-red-500">
                        {fmtVND(ins.cap * ins.employeeRate)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded overflow-hidden flex">
                    <div
                      className="bg-red-400"
                      style={{ width: `${(ins.employeeRate / total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-400"
                      style={{ width: `${(ins.employerRate / total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span className="text-red-500">
                      NV {(ins.employeeRate * 100).toFixed(1)}%
                    </span>
                    <span className="text-blue-600">
                      DN {(ins.employerRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] mb-3">
              Tổng hợp — Nhân viên đóng hàng tháng (tính trên mức trần BHXH)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] text-center">
              <div>
                <div className="text-muted-foreground">NV đóng tổng</div>
                <div className="text-[16px] text-red-500">10.5%</div>
              </div>
              <div>
                <div className="text-muted-foreground">DN đóng tổng</div>
                <div className="text-[16px] text-blue-600">22.5%</div>
              </div>
              <div>
                <div className="text-muted-foreground">NV max/tháng</div>
                <div className="text-[16px]">{fmtVND(36000000 * 0.105)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">DN max/tháng</div>
                <div className="text-[16px]">{fmtVND(36000000 * 0.225)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tax Calculator ── */}
      {activeSection === "tax" && (
        <div className="space-y-4">
          {/* Biểu thuế */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="text-[14px]">
                Biểu thuế TNCN lũy tiến từng phần (2024)
              </div>
              <div className="text-[11px] text-muted-foreground">
                Giảm trừ bản thân: 11.000.000đ/tháng | Người phụ thuộc:
                4.400.000đ/người/tháng
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-center px-4 py-3 text-[11px] text-muted-foreground w-12">
                      Bậc
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                      Thu nhập chịu thuế từ
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                      Đến
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">
                      Thuế suất
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                      Giảm trừ nhanh
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TAX_BRACKETS.map((b) => (
                    <tr
                      key={b.level}
                      className="border-b border-border last:border-0 hover:bg-accent/30"
                    >
                      <td className="px-4 py-3 text-[13px] text-center">
                        {b.level}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-right">
                        {fmtVND(b.from)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-right">
                        {b.to ? fmtVND(b.to) : "∞"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[12px] px-2 py-0.5 rounded ${b.rate <= 0.1 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : b.rate <= 0.2 ? "bg-yellow-100 text-yellow-700" : b.rate <= 0.3 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}
                        >
                          {(b.rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-right">
                        {fmtVND(b.quickDeduction)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax calculator */}
          <TaxCalculator />
        </div>
      )}

      {/* Create component dialog */}
      {showCreate && (
        <CreateSalaryComponentDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateComponent}
        />
      )}
    </div>
  );
}

// ─── Tax brackets (Vietnam 2024) ──────────────────────────────────
const TAX_BRACKETS = [
  { level: 1, from: 0, to: 5_000_000, rate: 0.05, quickDeduction: 0 },
  {
    level: 2,
    from: 5_000_000,
    to: 10_000_000,
    rate: 0.1,
    quickDeduction: 250_000,
  },
  {
    level: 3,
    from: 10_000_000,
    to: 18_000_000,
    rate: 0.15,
    quickDeduction: 750_000,
  },
  {
    level: 4,
    from: 18_000_000,
    to: 32_000_000,
    rate: 0.2,
    quickDeduction: 1_650_000,
  },
  {
    level: 5,
    from: 32_000_000,
    to: 52_000_000,
    rate: 0.25,
    quickDeduction: 3_250_000,
  },
  {
    level: 6,
    from: 52_000_000,
    to: 80_000_000,
    rate: 0.3,
    quickDeduction: 5_850_000,
  },
  {
    level: 7,
    from: 80_000_000,
    to: null,
    rate: 0.35,
    quickDeduction: 9_850_000,
  },
];

// ─── Tax Calculator widget ────────────────────────────────────────
function TaxCalculator() {
  const [grossInput, setGrossInput] = useState("");
  const [dependents, setDependents] = useState(0);

  const PERSONAL_DEDUCTION = 11_000_000;
  const DEPENDENT_DEDUCTION = 4_400_000;

  const result = useMemo(() => {
    const gross = Number(grossInput);
    if (!gross || gross <= 0) return null;

    const insBase = Math.min(gross, 36_000_000);
    const bhxh = insBase * 0.08;
    const bhyt = insBase * 0.015;
    const bhtn = insBase * 0.01;
    const totalIns = bhxh + bhyt + bhtn;

    const taxableIncome = Math.max(
      0,
      gross - totalIns - PERSONAL_DEDUCTION - dependents * DEPENDENT_DEDUCTION,
    );
    let tax = 0;
    let appliedLevel = 0;
    for (const b of TAX_BRACKETS) {
      if (taxableIncome > b.from) {
        if (b.to === null || taxableIncome <= b.to) {
          tax = taxableIncome * b.rate - b.quickDeduction;
          appliedLevel = b.level;
          break;
        }
      }
    }
    if (tax < 0) tax = 0;
    const net = gross - totalIns - Math.max(0, tax);
    return {
      gross,
      bhxh,
      bhyt,
      bhtn,
      totalIns,
      taxableIncome,
      tax: Math.max(0, tax),
      net,
      appliedLevel,
    };
  }, [grossInput, dependents]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[14px] mb-3 flex items-center gap-1">
        <Calculator size={16} /> Tính thử thuế TNCN
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">
            Thu nhập Gross (₫)
          </label>
          <input
            type="number"
            value={grossInput}
            onChange={(e) => setGrossInput(e.target.value)}
            placeholder="VD: 30000000"
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">
            Số người phụ thuộc
          </label>
          <input
            type="number"
            value={dependents}
            onChange={(e) => setDependents(Number(e.target.value))}
            min={0}
            max={10}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
      </div>

      {result && (
        <div className="space-y-1.5 text-[12px] bg-muted/20 rounded-xl p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thu nhập Gross:</span>
            <span>{fmtVND(result.gross)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>— BHXH (8%):</span>
            <span>-{fmtVND(result.bhxh)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>— BHYT (1.5%):</span>
            <span>-{fmtVND(result.bhyt)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>— BHTN (1%):</span>
            <span>-{fmtVND(result.bhtn)}</span>
          </div>
          <div className="flex justify-between text-blue-600">
            <span>— Giảm trừ bản thân:</span>
            <span>-{fmtVND(PERSONAL_DEDUCTION)}</span>
          </div>
          {dependents > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>— Giảm trừ phụ thuộc ({dependents} người):</span>
              <span>-{fmtVND(dependents * DEPENDENT_DEDUCTION)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="text-muted-foreground">Thu nhập chịu thuế:</span>
            <span>{fmtVND(result.taxableIncome)}</span>
          </div>
          {result.appliedLevel > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Áp dụng bậc {result.appliedLevel} (
              {(TAX_BRACKETS[result.appliedLevel - 1].rate * 100).toFixed(0)}%)
            </div>
          )}
          <div className="flex justify-between text-red-500">
            <span>Thuế TNCN:</span>
            <span>-{fmtVND(result.tax)}</span>
          </div>
          <div className="flex justify-between text-[14px] font-medium pt-1.5 border-t-2 border-border">
            <span>THỰC NHẬN (NET):</span>
            <span className="text-green-600">{fmtVND(result.net)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Thuế / Gross: {((result.tax / result.gross) * 100).toFixed(2)}% |
            Tổng khấu trừ:{" "}
            {(((result.totalIns + result.tax) / result.gross) * 100).toFixed(2)}
            %
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Salary Component Dialog ──────────────────────────────
function CreateSalaryComponentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: {
    code: string;
    name: string;
    componentType: payrollService.ComponentType;
    calculationType: payrollService.CalculationType;
    isTaxable: boolean;
    isInsurable: boolean;
    description: string | null;
  }) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    componentType: "EARNING" as payrollService.ComponentType,
    calculationType: "FIXED" as payrollService.CalculationType,
    isTaxable: false,
    isInsurable: false,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Nhập mã và tên thành phần");
      return;
    }
    setSubmitting(true);
    await onCreate({ ...form, description: form.description || null });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Thêm thành phần lương</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mã * (tự động UPPERCASE)
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="VD: PHU_CAP_XANG"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] font-mono"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Loại *
              </label>
              <select
                value={form.componentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    componentType: e.target
                      .value as payrollService.ComponentType,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                <option value="EARNING">Thu nhập</option>
                <option value="DEDUCTION">Khấu trừ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Tên thành phần *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Phụ cấp xăng xe"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Cách tính
            </label>
            <select
              value={form.calculationType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  calculationType: e.target
                    .value as payrollService.CalculationType,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            >
              <option value="FIXED">Cố định (FIXED)</option>
              <option value="FORMULA">Công thức (FORMULA)</option>
              <option value="MANUAL">Nhập tay (MANUAL)</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTaxable}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isTaxable: e.target.checked }))
                }
              />
              Chịu thuế TNCN
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isInsurable}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isInsurable: e.target.checked }))
                }
              />
              Tính bảo hiểm
            </label>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Mô tả
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Tạo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Adjustment Dialog ──────────────────────────────────────
function CreateAdjustmentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: {
    userId: string;
    adjustmentType: AdjustmentType;
    amount: number;
    reason: string;
    payrollPeriodId?: string | null;
  }) => void;
}) {
  const [type, setType] = useState<AdjustmentType>("BONUS");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [payrollPeriodId, setPayrollPeriodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Employee search combobox (real API)
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empList, setEmpList] = useState<
    Array<{
      id: string;
      fullName: string;
      userCode: string;
      departmentName?: string;
    }>
  >([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    fullName: string;
    userCode: string;
    departmentName?: string;
  } | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draft/Calculating periods
  const [draftPeriods, setDraftPeriods] = useState<
    Array<{ id: string; month: number; year: number; status: string }>
  >([]);
  useEffect(() => {
    payrollService
      .listPeriods({ limit: 20 })
      .then((res) => {
        setDraftPeriods(
          res.items.filter(
            (p) => p.status === "DRAFT" || p.status === "CALCULATING",
          ),
        );
      })
      .catch(() => {});
  }, []);

  const handleEmpSearch = (val: string) => {
    setEmpSearch(val);
    setEmpDropdownOpen(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setEmpList([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      setEmpLoading(true);
      try {
        const { listUsers } = await import("../../lib/services/users.service");
        const res = await listUsers({ search: val.trim(), limit: 10 });
        setEmpList(
          res.items.map(
            (u: {
              id: string;
              fullName: string;
              userCode: string;
              department?: { name: string } | null;
            }) => ({
              id: u.id,
              fullName: u.fullName,
              userCode: u.userCode,
              departmentName: (u as { department?: { name: string } | null })
                .department?.name,
            }),
          ),
        );
      } catch {
        setEmpList([]);
      } finally {
        setEmpLoading(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Chọn nhân viên");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    if (!reason.trim()) {
      toast.error("Nhập lý do điều chỉnh");
      return;
    }
    setSubmitting(true);
    await onCreate({
      userId: selectedUser.id,
      adjustmentType: type,
      amount: amt,
      reason: reason.trim(),
      payrollPeriodId: payrollPeriodId || null,
    });
    setSubmitting(false);
  };

  const periodStatusLabels_: Record<string, string> = {
    DRAFT: "Bản nháp",
    CALCULATING: "Đang tính",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-[480px]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo điều chỉnh lương</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Searchable employee combobox */}
          <div className="relative">
            <label className="block text-[12px] text-muted-foreground mb-1">
              Nhân viên *{" "}
              {selectedUser && <span className="text-green-600">✓</span>}
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500 bg-input-background">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">
                  {selectedUser.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate">
                    {selectedUser.fullName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedUser.departmentName &&
                      `${selectedUser.departmentName} • `}
                    {selectedUser.userCode}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setEmpDropdownOpen(true);
                  }}
                  className="text-[11px] text-blue-600 hover:underline shrink-0"
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                {empLoading && (
                  <Loader2
                    size={13}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                  />
                )}
                <input
                  type="text"
                  placeholder="Tìm tên hoặc mã nhân viên..."
                  value={empSearch}
                  onChange={(e) => handleEmpSearch(e.target.value)}
                  onFocus={() =>
                    empSearch.length >= 2 && setEmpDropdownOpen(true)
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                />
                {empDropdownOpen && empList.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setEmpDropdownOpen(false)}
                    />
                    <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {empList.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setEmpDropdownOpen(false);
                            setEmpSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-[12px]"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">
                            {u.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{u.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {u.departmentName && `${u.departmentName} • `}
                              {u.userCode}
                            </div>
                          </div>
                        </button>
                      ))}
                      {empList.length === 0 && (
                        <div className="px-3 py-2 text-[12px] text-muted-foreground">
                          Không tìm thấy
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Adjustment type */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Loại điều chỉnh *
            </label>
            <div className="flex gap-2">
              {(
                ["BONUS", "DEDUCTION", "ADVANCE", "REIMBURSEMENT"] as const
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-[11px] border transition-colors ${type === t ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-border text-muted-foreground hover:bg-accent"}`}
                >
                  {adjustTypeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Số tiền (VND) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={1}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>

          {/* Payroll period selector */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Kỳ lương áp dụng{" "}
              <span className="text-[10px] text-muted-foreground">
                — tuỳ chọn
              </span>
            </label>
            <select
              value={payrollPeriodId}
              onChange={(e) => setPayrollPeriodId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            >
              <option value="">Áp dụng vào kỳ gần nhất</option>
              {draftPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  T{p.month}/{p.year} —{" "}
                  {periodStatusLabels_[p.status] ?? p.status}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Lý do *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do điều chỉnh lương..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Tạo điều chỉnh
          </button>
        </div>
      </div>
    </div>
  );
}
