// ================================================================
// SALARY CONFIG PAGE — Cấu hình lương nhân viên
// Route: /payroll/salary-config
// Quyền: HR / Admin
//
// APIs:
//   GET  /payroll/compensations                        — danh sách
//   POST /payroll/compensations                        — tạo mới
//   PATCH /payroll/compensations/:id                   — cập nhật
//   GET  /payroll/compensations/user/:userId/active    — active hiện tại
//   GET  /payroll/compensations/user/:userId/history   — lịch sử
//   GET  /users?limit=200                              — employee dropdown
// ================================================================
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  DollarSign,
  Plus,
  Search,
  Edit2,
  History,
  X,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Users,
  Shield,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import * as payrollService from "../../lib/services/payroll.service";
import type {
  ApiCompensation,
  SalaryType,
} from "../../lib/services/payroll.service";
import * as usersService from "../../lib/services/users.service";
import type { ApiUser } from "../../lib/services/auth.service";
import { ApiError } from "../../lib/apiClient";

// ─── Helpers ──────────────────────────────────────────────────
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const salaryTypeLabels: Record<SalaryType, string> = {
  MONTHLY: "Theo tháng",
  DAILY: "Theo ngày",
  HOURLY: "Theo giờ",
};
const salaryTypeColors: Record<SalaryType, string> = {
  MONTHLY: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DAILY:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  HOURLY: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

// ═══════════════════════════════════════════════════════════════
// SalaryConfigPage
// ═══════════════════════════════════════════════════════════════
export function SalaryConfigPage() {
  const { can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");

  const [compensations, setCompensations] = useState<ApiCompensation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [editComp, setEditComp] = useState<ApiCompensation | null>(null);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [historyUser, setHistoryUser] = useState<string>("");

  const fetchCompensations = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await payrollService.listCompensations({
          page: p,
          limit: 20,
          ...(activeOnly !== undefined ? { isActive: activeOnly } : {}),
        });
        setCompensations(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [activeOnly],
  );

  useEffect(() => {
    fetchCompensations(1);
  }, [fetchCompensations]);

  // Client-side search filter
  const displayed = useMemo(() => {
    if (!search) return compensations;
    const s = search.toLowerCase();
    return compensations.filter(
      (c) =>
        c.user?.fullName.toLowerCase().includes(s) ||
        c.user?.userCode.toLowerCase().includes(s),
    );
  }, [compensations, search]);

  const stats = useMemo(
    () => ({
      total,
      avgBase:
        compensations.length > 0
          ? compensations.reduce((s, c) => s + c.baseSalary, 0) /
            compensations.length
          : 0,
      monthly: compensations.filter((c) => c.salaryType === "MONTHLY").length,
    }),
    [compensations, total],
  );

  if (!isAdminHR) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
        <Shield size={40} className="mx-auto mb-2 opacity-30" />
        <div>Bạn không có quyền truy cập trang này</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2">
          <DollarSign size={22} className="text-blue-600" /> Cấu hình lương nhân
          viên
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchCompensations(page)}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Tổng cấu hình",
            value: total,
            icon: <Users size={16} className="text-blue-500" />,
          },
          {
            label: "Theo tháng",
            value: stats.monthly,
            icon: <DollarSign size={16} className="text-green-500" />,
          },
          {
            label: "Lương TB",
            value: fmtVND(stats.avgBase),
            icon: <TrendingUp size={16} className="text-purple-500" />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="text-[16px]">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm tên, mã nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setActiveOnly(true)}
            className={`px-3 py-2 text-[12px] transition-colors ${activeOnly ? "bg-blue-600 text-white" : "bg-card hover:bg-accent"}`}
          >
            Đang hiệu lực
          </button>
          <button
            onClick={() => setActiveOnly(false)}
            className={`px-3 py-2 text-[12px] transition-colors ${!activeOnly ? "bg-blue-600 text-white" : "bg-card hover:bg-accent"}`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <DollarSign
            size={40}
            className="mx-auto mb-2 opacity-20 text-muted-foreground"
          />
          <div className="text-[14px] text-muted-foreground">
            Chưa có cấu hình lương nào
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Nhấn "Thêm mới" để bắt đầu
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Nhân viên
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Loại lương
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                    Lương cơ bản
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Hệ số OT (T/CN/Lễ)
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Hiệu lực từ
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] shrink-0">
                          {c.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                        </div>
                        <div>
                          <div className="font-medium">
                            {c.user?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.user?.userCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${salaryTypeColors[c.salaryType]}`}
                      >
                        {salaryTypeLabels[c.salaryType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {fmtVND(c.baseSalary)}
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-muted-foreground hidden lg:table-cell">
                      {c.overtimeRateWeekday}× / {c.overtimeRateWeekend}× /{" "}
                      {c.overtimeRateHoliday}×
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                      {fmtDate(c.effectiveFrom)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.isActive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-0.5 w-fit mx-auto">
                          <Check size={9} /> Hiệu lực
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400">
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditComp(c)}
                          title="Chỉnh sửa"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setHistoryUserId(c.user?.id ?? null);
                            setHistoryUser(c.user?.fullName ?? "");
                          }}
                          title="Lịch sử thay đổi"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} cấu hình lương</span>
            {totalPages > 1 && (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => fetchCompensations(page - 1)}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchCompensations(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded border border-border hover:bg-accent disabled:opacity-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showAdd && (
        <CompensationFormDialog
          title="Thêm cấu hình lương"
          onClose={() => setShowAdd(false)}
          onSave={async (payload) => {
            try {
              await payrollService.createCompensation(payload);
              toast.success("Đã tạo cấu hình lương");
              setShowAdd(false);
              fetchCompensations(1);
            } catch (err) {
              toast.error(
                err instanceof ApiError ? err.message : "Không thể tạo",
              );
            }
          }}
        />
      )}
      {editComp && (
        <CompensationFormDialog
          title="Cập nhật cấu hình lương"
          existing={editComp}
          onClose={() => setEditComp(null)}
          onSave={async (payload) => {
            try {
              await payrollService.updateCompensation(editComp.id, payload);
              toast.success("Đã cập nhật cấu hình lương");
              setEditComp(null);
              fetchCompensations(page);
            } catch (err) {
              toast.error(
                err instanceof ApiError ? err.message : "Không thể cập nhật",
              );
            }
          }}
        />
      )}
      {historyUserId && (
        <SalaryHistoryModal
          userId={historyUserId}
          userName={historyUser}
          onClose={() => setHistoryUserId(null)}
        />
      )}
    </div>
  );
}

// ─── CompensationFormDialog ────────────────────────────────────
function CompensationFormDialog({
  title,
  existing,
  onClose,
  onSave,
}: {
  title: string;
  existing?: ApiCompensation;
  onClose: () => void;
  onSave: (
    payload: Parameters<typeof payrollService.createCompensation>[0],
  ) => Promise<void>;
}) {
  // Employee search (only for new)
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empList, setEmpList] = useState<ApiUser[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    salaryType: (existing?.salaryType ?? "MONTHLY") as SalaryType,
    baseSalary: existing?.baseSalary?.toString() ?? "",
    probationSalary: existing?.probationSalary?.toString() ?? "",
    standardWorkingDays: existing?.standardWorkingDays?.toString() ?? "26",
    effectiveFrom:
      existing?.effectiveFrom?.split("T")[0] ??
      new Date().toISOString().split("T")[0],
    effectiveTo: existing?.effectiveTo?.split("T")[0] ?? "",
    changeReason: existing?.changeReason ?? "",
    overtimeRateWeekday: existing?.overtimeRateWeekday?.toString() ?? "1.5",
    overtimeRateWeekend: existing?.overtimeRateWeekend?.toString() ?? "2.0",
    overtimeRateHoliday: existing?.overtimeRateHoliday?.toString() ?? "3.0",
    notes: existing?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Debounced employee search
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
        const res = await usersService.listUsers({
          search: val.trim(),
          limit: 10,
        });
        setEmpList(res.items);
      } catch {
        setEmpList([]);
      } finally {
        setEmpLoading(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!existing && !selectedUser) {
      toast.error("Chọn nhân viên");
      return;
    }
    const base = parseFloat(form.baseSalary);
    if (!base || base <= 0) {
      toast.error("Nhập lương cơ bản hợp lệ");
      return;
    }
    if (!form.effectiveFrom) {
      toast.error("Chọn ngày hiệu lực");
      return;
    }
    setSubmitting(true);
    await onSave({
      userId: existing?.user?.id ?? selectedUser!.id,
      salaryType: form.salaryType,
      baseSalary: base,
      probationSalary: form.probationSalary
        ? parseFloat(form.probationSalary)
        : null,
      standardWorkingDays: form.standardWorkingDays
        ? parseInt(form.standardWorkingDays)
        : null,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      changeReason: form.changeReason || null,
      overtimeRateWeekday: parseFloat(form.overtimeRateWeekday) || 1.5,
      overtimeRateWeekend: parseFloat(form.overtimeRateWeekend) || 2.0,
      overtimeRateHoliday: parseFloat(form.overtimeRateHoliday) || 3.0,
      notes: form.notes || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-[16px] flex items-center gap-2">
            <DollarSign size={15} /> {title}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Employee selector — only for new */}
          {!existing ? (
            <div className="relative">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Nhân viên *{" "}
                {selectedUser && (
                  <span className="text-green-600">✓ Đã chọn</span>
                )}
              </label>
              {selectedUser ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500 bg-input-background">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                    {selectedUser.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate">
                      {selectedUser.fullName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {selectedUser.userCode}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
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
                    value={empSearch}
                    onChange={(e) => handleEmpSearch(e.target.value)}
                    onFocus={() =>
                      empSearch.length >= 2 && setEmpDropdownOpen(true)
                    }
                    placeholder="Tìm tên hoặc mã nhân viên..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                  />
                  {empDropdownOpen && empList.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setEmpDropdownOpen(false)}
                      />
                      <div className="absolute top-full mt-1 w-full z-50 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {empList.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setEmpSearch("");
                              setEmpDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-[13px] transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                              {u.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="truncate">{u.fullName}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {u.userCode}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px]">
                {existing.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
              </div>
              <div>
                <div className="text-[13px] font-medium">
                  {existing.user?.fullName ?? "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {existing.user?.userCode}
                </div>
              </div>
            </div>
          )}

          {/* Salary type radio */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-2">
              Loại lương *
            </label>
            <div className="flex gap-2">
              {(["MONTHLY", "DAILY", "HOURLY"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, salaryType: t }))}
                  className={`flex-1 py-2 rounded-lg text-[12px] border transition-colors ${form.salaryType === t ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-border text-muted-foreground hover:bg-accent"}`}
                >
                  {salaryTypeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Base salary + Probation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Lương cơ bản (VND) *
              </label>
              <input
                type="number"
                value={form.baseSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, baseSalary: e.target.value }))
                }
                placeholder="VD: 15,000,000"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
              {form.baseSalary && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fmtVND(parseFloat(form.baseSalary) || 0)}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Lương thử việc (VND)
              </label>
              <input
                type="number"
                value={form.probationSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, probationSalary: e.target.value }))
                }
                placeholder="Để trống nếu bằng lương CB"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>

          {/* Standard working days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày công chuẩn/tháng
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.standardWorkingDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    standardWorkingDays: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày hiệu lực *
              </label>
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>

          {/* OT Rates */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-2">
              Hệ số OT
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Ngày thường", key: "overtimeRateWeekday" as const },
                { label: "Cuối tuần", key: "overtimeRateWeekend" as const },
                { label: "Ngày lễ", key: "overtimeRateHoliday" as const },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={5}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Lý do thay đổi
            </label>
            <textarea
              value={form.changeReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, changeReason: e.target.value }))
              }
              rows={2}
              placeholder="Tăng lương định kỳ, điều chỉnh thị trường..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
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
              <Check size={14} />
            )}
            {existing ? "Cập nhật" : "Tạo cấu hình"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SalaryHistoryModal ────────────────────────────────────────
function SalaryHistoryModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ApiCompensation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollService
      .getCompensationHistory(userId)
      .then(setHistory)
      .catch(() => toast.error("Không tải được lịch sử"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px] flex items-center gap-2">
            <History size={15} /> Lịch sử lương — {userName}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />{" "}
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-[13px]">
              Chưa có lịch sử thay đổi
            </div>
          ) : (
            <div className="relative space-y-0">
              {history.map((comp, i) => {
                const prev = history[i + 1];
                const diff = prev ? comp.baseSalary - prev.baseSalary : null;
                return (
                  <div key={comp.id} className="flex gap-3 pb-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 shrink-0 ${comp.isActive ? "bg-blue-500" : "bg-muted-foreground"}`}
                      />
                      {i < history.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-green-600">
                          {fmtVND(comp.baseSalary)}
                        </span>
                        {diff !== null && (
                          <span
                            className={`text-[11px] ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            {diff > 0 ? "▲" : diff < 0 ? "▼" : "="}{" "}
                            {diff !== 0 ? fmtVND(Math.abs(diff)) : "Không đổi"}
                          </span>
                        )}
                        {comp.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> Hiệu lực:{" "}
                          {fmtDate(comp.effectiveFrom)}
                          {comp.effectiveTo &&
                            ` → ${fmtDate(comp.effectiveTo)}`}
                        </span>
                      </div>
                      {comp.changeReason && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 italic">
                          "{comp.changeReason}"
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {salaryTypeLabels[comp.salaryType]} • Ngày công:{" "}
                        {comp.standardWorkingDays ?? "—"}/tháng
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
