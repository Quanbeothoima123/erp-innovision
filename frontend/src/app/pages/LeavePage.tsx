// ================================================================
// LEAVE PAGE — API only (no mockData)
// Route: /leave/requests  |  /leave/balances  (via tabs/router)
// ================================================================
import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Check,
  X,
  Search,
  CalendarDays,
  AlertTriangle,
  FileText,
  Ban,
  ListChecks,
  Shield,
  CheckCircle2,
  MessageSquare,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as leaveService from "../../lib/services/leave.service";
import type {
  ApiLeaveRequest,
  ApiLeaveBalance,
  ApiLeaveType,
  ApiLeaveRequestApproval,
} from "../../lib/services/leave.service";
import { ApiError } from "../../lib/apiClient";

// ── Constants ──────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};
const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã huỷ",
};
const stepLabels: Record<string, string> = {
  MANAGER: "Quản lý",
  HR: "Nhân sự",
};

const emptyForm = {
  leaveTypeId: "",
  startDate: "",
  endDate: "",
  isHalfDay: false,
  halfDayPeriod: "MORNING",
  reason: "",
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

// ================================================================
// MAIN
// ================================================================
export function LeaveRequestsPage() {
  const { currentUser, can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");
  const isManager = can("MANAGER");

  const [reqs, setReqs] = useState<ApiLeaveRequest[]>([]);
  const [myBalances, setMyBalances] = useState<ApiLeaveBalance[]>([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<ApiLeaveType[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<ApiLeaveRequest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchReqs = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const res = await leaveService.listRequests({ limit: 100 });
      setReqs(res.items);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách đơn nghỉ",
      );
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  const fetchMyBalances = useCallback(async () => {
    try {
      const data = await leaveService.getMyBalances();
      setMyBalances(data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const data = await leaveService.getLeaveTypeOptions();
      setLeaveTypeOptions(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchReqs();
    fetchMyBalances();
    fetchLeaveTypes();
  }, [fetchReqs, fetchMyBalances, fetchLeaveTypes]);

  // ── Tabs ───────────────────────────────────────────────────
  type TabKey = "my" | "manager_approve" | "hr_approve" | "all";
  const availableTabs = useMemo(() => {
    const tabs: {
      key: TabKey;
      label: string;
      icon: React.ReactNode;
      badge?: number;
    }[] = [];
    tabs.push({
      key: "my",
      label: "Đơn nghỉ của tôi",
      icon: <FileText size={14} />,
    });
    if (isManager || isAdminHR) {
      const pending = reqs.filter(
        (r) => r.status === "PENDING" && r.currentStep === "MANAGER",
      ).length;
      tabs.push({
        key: "manager_approve",
        label: "Duyệt bước 1 (Quản lý)",
        icon: <ListChecks size={14} />,
        badge: pending,
      });
    }
    if (isAdminHR) {
      const pending = reqs.filter(
        (r) => r.status === "PENDING" && r.currentStep === "HR",
      ).length;
      tabs.push({
        key: "hr_approve",
        label: "Duyệt bước 2 (HR)",
        icon: <Shield size={14} />,
        badge: pending,
      });
      tabs.push({
        key: "all",
        label: "Tất cả đơn nghỉ",
        icon: <AlertTriangle size={14} />,
      });
    }
    return tabs;
  }, [reqs, isAdminHR, isManager]);

  const defaultTab: TabKey = isAdminHR
    ? "hr_approve"
    : isManager
      ? "manager_approve"
      : "my";
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // ── Actions ────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (reqId: string, note: string) => {
      try {
        await leaveService.approveRequest(reqId, note || undefined);
        toast.success("Đã duyệt đơn nghỉ phép");
        fetchReqs();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Lỗi duyệt đơn");
      }
    },
    [fetchReqs],
  );

  const handleReject = useCallback(
    async (reqId: string, note: string) => {
      if (!note.trim()) {
        toast.error("Vui lòng nhập lý do từ chối");
        return;
      }
      try {
        await leaveService.rejectRequest(reqId, note);
        toast.success("Đã từ chối đơn nghỉ phép");
        fetchReqs();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Lỗi từ chối đơn");
      }
    },
    [fetchReqs],
  );

  const handleCancel = useCallback(
    async (reqId: string) => {
      try {
        await leaveService.cancelRequest(reqId);
        toast.success("Đã huỷ đơn nghỉ phép");
        fetchReqs();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Lỗi huỷ đơn");
      }
    },
    [fetchReqs],
  );

  const handleCreate = useCallback(async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    setSubmitting(true);
    try {
      await leaveService.createRequest({
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        isHalfDay: form.isHalfDay,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
        reason: form.reason || undefined,
      });
      toast.success("Đã gửi đơn nghỉ phép thành công");
      setShowForm(false);
      setForm(emptyForm);
      fetchReqs();
      fetchMyBalances();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi đơn thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchReqs, fetchMyBalances]);

  // ── Filter ─────────────────────────────────────────────────
  const filteredReqs = useMemo(() => {
    switch (activeTab) {
      case "my":
        return reqs.filter((r) => r.userId === currentUser?.id);
      case "manager_approve":
        return reqs.filter(
          (r) => r.status === "PENDING" && r.currentStep === "MANAGER",
        );
      case "hr_approve":
        return reqs.filter(
          (r) => r.status === "PENDING" && r.currentStep === "HR",
        );
      case "all":
        return reqs;
      default:
        return [];
    }
  }, [reqs, activeTab, currentUser?.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold">Nghỉ phép</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Gửi và quản lý đơn nghỉ phép
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchReqs();
              fetchMyBalances();
            }}
            className="p-2 rounded-lg border border-border hover:bg-accent transition"
          >
            <RefreshCw
              size={14}
              className={`text-muted-foreground ${loadingReqs ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Tạo đơn nghỉ
          </button>
        </div>
      </div>

      {/* My balances */}
      {myBalances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {myBalances.slice(0, 4).map((b, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-3"
            >
              <div className="text-[11px] text-muted-foreground mb-1">
                {b.leaveType?.name ?? "Loại phép"}
              </div>
              <div className="text-[22px] font-semibold text-blue-600">
                {b.remainingDays ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">
                còn lại / {b.entitledDays ?? 0} ngày
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loadingReqs ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : filteredReqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <CalendarDays size={32} className="opacity-20 mb-2" />
          <p className="text-[13px]">Không có đơn nghỉ nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReqs.map((req) => {
            const approvals = req.approvals ?? [];
            const canApprove =
              activeTab === "manager_approve" || activeTab === "hr_approve";
            const step = activeTab === "manager_approve" ? "MANAGER" : "HR";

            return (
              <div
                key={req.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* User name — từ req.user (API đã include) */}
                      <span className="text-[14px] font-medium">
                        {req.user?.fullName ?? "—"}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] ?? ""}`}
                      >
                        {statusLabels[req.status] ?? req.status}
                      </span>
                      {req.currentStep && req.status === "PENDING" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          Chờ {stepLabels[req.currentStep] ?? req.currentStep}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={11} />
                        {req.leaveType?.name ?? "—"} · {fmtDate(req.startDate)}{" "}
                        → {fmtDate(req.endDate)} ({req.totalDays} ngày)
                        {req.isHalfDay && " — Nửa ngày"}
                      </div>
                      {req.reason && (
                        <div className="text-[11px] italic">{req.reason}</div>
                      )}
                    </div>

                    {/* Approval steps */}
                    {approvals.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {approvals.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                          >
                            {a.status === "APPROVED" ? (
                              <CheckCircle2
                                size={12}
                                className="text-emerald-500"
                              />
                            ) : a.status === "REJECTED" ? (
                              <X size={12} className="text-red-500" />
                            ) : (
                              <MessageSquare
                                size={12}
                                className="text-amber-500"
                              />
                            )}
                            {stepLabels[a.stepType] ?? a.stepType}
                            {a.approver && `: ${a.approver.fullName}`}
                            {a.comment && ` — "${a.comment}"`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 items-end">
                    <button
                      onClick={() => setDetailReq(req)}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Chi tiết
                    </button>
                    {activeTab === "my" &&
                      req.status === "PENDING" &&
                      req.userId === currentUser?.id && (
                        <button
                          onClick={() => handleCancel(req.id)}
                          className="text-[11px] text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Ban size={11} /> Huỷ đơn
                        </button>
                      )}
                    {canApprove && req.status === "PENDING" && (
                      <ApproveRejectButtons
                        onApprove={(note) => handleApprove(req.id, note)}
                        onReject={(note) => handleReject(req.id, note)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-semibold">Tạo đơn nghỉ phép</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">
                  Loại nghỉ phép *
                </label>
                <select
                  value={form.leaveTypeId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, leaveTypeId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
                >
                  <option value="">-- Chọn loại nghỉ --</option>
                  {leaveTypeOptions.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ngày bắt đầu *", key: "startDate" },
                  { label: "Ngày kết thúc *", key: "endDate" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[12px] text-muted-foreground block mb-1">
                      {f.label}
                    </label>
                    <input
                      type="date"
                      value={(form as Record<string, string>)[f.key]}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHalfDay"
                  checked={form.isHalfDay}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isHalfDay: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                <label
                  htmlFor="isHalfDay"
                  className="text-[13px] cursor-pointer"
                >
                  Nghỉ nửa ngày
                </label>
              </div>
              {form.isHalfDay && (
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">
                    Buổi
                  </label>
                  <div className="flex gap-3">
                    {[
                      { v: "MORNING", l: "Buổi sáng" },
                      { v: "AFTERNOON", l: "Buổi chiều" },
                    ].map((opt) => (
                      <label
                        key={opt.v}
                        className="flex items-center gap-1.5 text-[13px] cursor-pointer"
                      >
                        <input
                          type="radio"
                          value={opt.v}
                          checked={form.halfDayPeriod === opt.v}
                          onChange={() =>
                            setForm((p) => ({ ...p, halfDayPeriod: opt.v }))
                          }
                          className="accent-blue-600"
                        />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">
                  Lý do
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  rows={3}
                  placeholder="VD: Nghỉ phép cá nhân..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {submitting ? "Đang gửi..." : "Gửi đơn nghỉ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailReq && (
        <LeaveDetailDialog req={detailReq} onClose={() => setDetailReq(null)} />
      )}
    </div>
  );
}

// ── Approve/Reject Buttons ─────────────────────────────────────
function ApproveRejectButtons({
  onApprove,
  onReject,
}: {
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [note, setNote] = useState("");

  if (mode === "idle") {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode("approve")}
          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] flex items-center gap-1 hover:bg-emerald-700"
        >
          <Check size={11} /> Duyệt
        </button>
        <button
          onClick={() => setMode("reject")}
          className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] flex items-center gap-1 hover:bg-red-700"
        >
          <X size={11} /> Từ chối
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-48">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          mode === "approve" ? "Ghi chú (tuỳ chọn)" : "Lý do từ chối *"
        }
        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-[11px]"
      />
      <div className="flex gap-1">
        <button
          onClick={() => {
            setMode("idle");
            setNote("");
          }}
          className="flex-1 py-1 rounded-lg border border-border text-[11px] hover:bg-accent"
        >
          Huỷ
        </button>
        <button
          onClick={() => {
            mode === "approve" ? onApprove(note) : onReject(note);
            setMode("idle");
            setNote("");
          }}
          className={`flex-1 py-1 rounded-lg text-white text-[11px] ${mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
        >
          {mode === "approve" ? "Xác nhận" : "Từ chối"}
        </button>
      </div>
    </div>
  );
}

// ── Leave Detail Dialog ─────────────────────────────────────────
function LeaveDetailDialog({
  req,
  onClose,
}: {
  req: ApiLeaveRequest;
  onClose: () => void;
}) {
  const approvals = req.approvals ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-[16px] font-semibold">Chi tiết đơn nghỉ phép</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Nhân viên" value={req.user?.fullName ?? "—"} />
            <InfoRow
              label="Trạng thái"
              value={statusLabels[req.status] ?? req.status}
              colored={statusColors[req.status]}
            />
            <InfoRow
              label="Loại nghỉ phép"
              value={req.leaveType?.name ?? "—"}
            />
            <InfoRow
              label="Số ngày"
              value={`${req.totalDays} ngày${req.isHalfDay ? " (nửa ngày)" : ""}`}
            />
            <InfoRow label="Ngày bắt đầu" value={fmtDate(req.startDate)} />
            <InfoRow label="Ngày kết thúc" value={fmtDate(req.endDate)} />
            {req.reason && (
              <div className="col-span-2">
                <InfoRow label="Lý do" value={req.reason} />
              </div>
            )}
          </div>

          {approvals.length > 0 && (
            <div>
              <p className="text-[12px] text-muted-foreground font-medium mb-2">
                Tiến trình duyệt
              </p>
              <div className="space-y-2">
                {approvals.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50"
                  >
                    {a.status === "APPROVED" ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500 mt-0.5 shrink-0"
                      />
                    ) : a.status === "REJECTED" ? (
                      <X size={14} className="text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <MessageSquare
                        size={14}
                        className="text-amber-500 mt-0.5 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium">
                        {stepLabels[a.stepType] ?? a.stepType}
                        {a.approver && ` — ${a.approver.fullName}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.status === "PENDING"
                          ? "Đang chờ duyệt"
                          : a.status === "APPROVED"
                            ? "Đã duyệt"
                            : "Đã từ chối"}
                        {a.actionAt && ` · ${fmtDate(a.actionAt)}`}
                      </div>
                      {a.comment && (
                        <div className="text-[11px] italic text-muted-foreground mt-0.5">
                          "{a.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end p-5 border-t border-border">
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

// ── Balance View ───────────────────────────────────────────────
export function LeaveBalancesPage() {
  const { can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");

  const [balances, setBalances] = useState<ApiLeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveService.listBalances({ year, limit: 100 });
      setBalances(res.items);
    } catch {
      toast.error("Không tải được số dư phép");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const filtered = search
    ? balances.filter((b) =>
        (b.user?.fullName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : balances;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Số dư phép</h1>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
          <button
            onClick={fetchBalances}
            className="p-2 rounded-lg border border-border hover:bg-accent"
          >
            <RefreshCw
              size={14}
              className={`text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {isAdminHR && (
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_60px_60px_60px_60px_80px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>Nhân viên</span>
            <span>Loại phép</span>
            <span>Được phép</span>
            <span>Đã dùng</span>
            <span>Chờ duyệt</span>
            <span>Còn lại</span>
            <span>Trạng thái</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-[13px]">
                Không có dữ liệu số dư phép
              </div>
            )}
            {filtered.map((b, i) => {
              const remaining = b.remainingDays ?? 0;
              const entitled = b.entitledDays ?? 0;
              const pct = entitled > 0 ? (remaining / entitled) * 100 : 0;
              return (
                <div
                  key={i}
                  className="grid sm:grid-cols-[2fr_1.5fr_60px_60px_60px_60px_80px] gap-3 px-4 py-3 items-center hover:bg-muted/20"
                >
                  <span className="text-[13px]">{b.user?.fullName ?? "—"}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {b.leaveType?.name ?? "—"}
                  </span>
                  <span className="text-[13px] text-center">{entitled}</span>
                  <span className="text-[13px] text-center">
                    {b.usedDays ?? 0}
                  </span>
                  <span className="text-[13px] text-center text-amber-600">
                    {b.pendingDays ?? 0}
                  </span>
                  <span
                    className={`text-[13px] text-center font-medium ${remaining <= 0 ? "text-red-500" : remaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}
                  >
                    {remaining}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function InfoRow({
  label,
  value,
  colored,
}: {
  label: string;
  value?: string | null;
  colored?: string;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      {colored ? (
        <span
          className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${colored}`}
        >
          {value ?? "—"}
        </span>
      ) : (
        <div className="text-[13px]">{value ?? "—"}</div>
      )}
    </div>
  );
}
