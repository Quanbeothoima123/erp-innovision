// ================================================================
// ATTENDANCE ADMIN PAGE — Module 4
// FIX: Thay toàn bộ mock state bằng API fetch khi USE_API=true
// ================================================================
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  attendanceRecords as initialRecords,
  users,
  getDepartmentById,
} from "../data/mockData";
import {
  Check,
  X,
  Clock,
  Search,
  Edit3,
  AlertTriangle,
  Building2,
  ListChecks,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as attendanceService from "../../lib/services/attendance.service";
import type {
  ApiAttendanceRequest,
  ApiAttendanceRecord,
} from "../../lib/services/attendance.service";
import { ApiError } from "../../lib/apiClient";

const USE_API = !!import.meta.env.VITE_API_URL;
const TODAY = new Date().toISOString().split("T")[0];

// ── Type helpers (hỗ trợ cả mock lẫn API shape) ───────────────
function getReqType(r: unknown): string {
  const obj = r as Record<string, unknown>;
  return (obj.type ?? obj.requestType ?? "") as string;
}
function getReqTime(r: unknown): string {
  const obj = r as Record<string, unknown>;
  return (obj.requestedTime ?? obj.requestedAt ?? "") as string;
}
function getUserId(r: unknown): string {
  return (r as Record<string, unknown>).userId as string;
}
function getWorkDate(r: unknown): string {
  const obj = r as Record<string, unknown>;
  return (obj.workDate ?? getReqTime(r).split("T")[0] ?? "") as string;
}
function getUserName(r: unknown): string {
  const obj = r as Record<string, unknown>;
  // API trả về user object embedded
  const user = obj.user as { fullName?: string } | undefined;
  if (user?.fullName) return user.fullName;
  // Mock fallback: tìm trong mock users
  const uid = getUserId(r);
  return users.find((u) => u.id === uid)?.fullName ?? uid;
}

const reqStatusColors: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const reqStatusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const attStatusBg: Record<string, string> = {
  PRESENT:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ABSENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  HOLIDAY:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANUAL_ADJUSTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};
const attStatusLabels: Record<string, string> = {
  PRESENT: "Có mặt",
  ABSENT: "Vắng mặt",
  LEAVE: "Nghỉ phép",
  HOLIDAY: "Ngày lễ",
  MANUAL_ADJUSTED: "Điều chỉnh",
};

// ================================================================
// MAIN
// ================================================================
export function AttendanceAdminPage() {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<"approve" | "adjust" | "summary">(
    "approve",
  );

  // FIX: Không khởi tạo bằng mock — bắt đầu bằng mảng rỗng, fetch API sau
  const [reqs, setReqs] = useState<ApiAttendanceRequest[]>([]);
  const [records, setRecords] = useState<ApiAttendanceRecord[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // ── Fetch requests từ API ─────────────────────────────────
  const fetchReqs = useCallback(async () => {
    if (!USE_API) {
      // Mock fallback
      const { attendanceRequests } = await import("../data/mockData");
      setReqs(attendanceRequests as unknown as ApiAttendanceRequest[]);
      return;
    }
    setLoadingReqs(true);
    try {
      const res = await attendanceService.listRequests({ limit: 200 });
      setReqs(res.items);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách yêu cầu",
      );
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  // ── Fetch records từ API ──────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!USE_API) {
      setRecords(initialRecords as unknown as ApiAttendanceRecord[]);
      return;
    }
    setLoadingRecords(true);
    try {
      // Lấy records trong vòng 30 ngày gần nhất
      const endDate = TODAY;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const res = await attendanceService.listRecords({
        startDate,
        endDate,
        limit: 500,
      });
      setRecords(res.items);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Không tải được bản ghi chấm công",
      );
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchReqs();
  }, [fetchReqs]);
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Approve ───────────────────────────────────────────────
  const onApprove = useCallback(
    async (reqId: string) => {
      try {
        if (USE_API) {
          await attendanceService.approveRequest(reqId);
          toast.success("Đã duyệt yêu cầu chấm công");
          // Cập nhật local state + refresh records
          setReqs((prev) =>
            prev.map((r) =>
              r.id === reqId ? { ...r, status: "APPROVED" as const } : r,
            ),
          );
          fetchRecords(); // Refresh records vì backend đã tạo/cập nhật record mới
          return;
        }
        // Mock mode
        const req = reqs.find((r) => r.id === reqId);
        if (!req) return;
        setReqs((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: "APPROVED" as const,
                  reviewedAt: new Date().toISOString(),
                }
              : r,
          ),
        );
        toast.success("Đã duyệt yêu cầu (mock)");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Duyệt thất bại");
      }
    },
    [reqs, fetchRecords],
  );

  // ── Reject ────────────────────────────────────────────────
  const onReject = useCallback(async (reqId: string, reason: string) => {
    try {
      if (USE_API) {
        await attendanceService.rejectRequest(reqId, reason);
        setReqs((prev) =>
          prev.map((r) =>
            r.id === reqId ? { ...r, status: "REJECTED" as const } : r,
          ),
        );
      } else {
        setReqs((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: "REJECTED" as const,
                  reviewedAt: new Date().toISOString(),
                }
              : r,
          ),
        );
      }
      toast.success("Đã từ chối yêu cầu chấm công");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Từ chối thất bại");
    }
  }, []);

  const onApproveAll = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => onApprove(id));
    },
    [onApprove],
  );

  // ── Adjust record ─────────────────────────────────────────
  const onAdjustRecord = useCallback(async (record: ApiAttendanceRecord) => {
    try {
      if (USE_API) {
        await attendanceService.updateRecord(record.id, {
          checkInAt: record.checkInAt ?? undefined,
          checkOutAt: record.checkOutAt ?? undefined,
          status: record.status,
          note: record.note ?? undefined,
        });
      }
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id);
        if (idx >= 0) return prev.map((r) => (r.id === record.id ? record : r));
        return [...prev, record];
      });
      toast.success("Đã điều chỉnh bản ghi chấm công");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Điều chỉnh thất bại",
      );
    }
  }, []);

  const pendingCount = reqs.filter((r) => r.status === "PENDING").length;

  const tabs = [
    {
      key: "approve" as const,
      label: "Duyệt yêu cầu",
      icon: <ListChecks size={14} />,
      badge: pendingCount,
    },
    {
      key: "adjust" as const,
      label: "Điều chỉnh thủ công",
      icon: <Edit3 size={14} />,
    },
    {
      key: "summary" as const,
      label: "Tổng hợp phòng ban",
      icon: <Building2 size={14} />,
    },
  ];

  if (!can("ADMIN", "HR")) {
    return (
      <div className="p-8 text-center text-muted-foreground text-[14px]">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Quản lý chấm công</h1>
        <button
          onClick={() => {
            fetchReqs();
            fetchRecords();
          }}
          className="p-2 rounded-lg border border-border hover:bg-accent transition"
          title="Làm mới"
        >
          <RefreshCw
            size={14}
            className={`text-muted-foreground ${loadingReqs || loadingRecords ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}
            {t.label}
            {t.badge ? (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "approve" && (
        <ApproveTab
          reqs={reqs}
          loading={loadingReqs}
          onApprove={onApprove}
          onReject={onReject}
          onApproveAll={onApproveAll}
        />
      )}
      {activeTab === "adjust" && (
        <AdjustTab
          records={records}
          loading={loadingRecords}
          onAdjust={onAdjustRecord}
        />
      )}
      {activeTab === "summary" && <SummaryTab records={records} />}
    </div>
  );
}

// ── Approve Tab ────────────────────────────────────────────────
function ApproveTab({
  reqs,
  loading,
  onApprove,
  onReject,
  onApproveAll,
}: {
  reqs: ApiAttendanceRequest[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onApproveAll: (ids: string[]) => void;
}) {
  const [subTab, setSubTab] = useState<"checkin" | "checkout" | "processed">(
    "checkin",
  );
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  let displayed = reqs;
  if (search) {
    const s = search.toLowerCase();
    displayed = displayed.filter((r) => {
      const name = getUserName(r).toLowerCase();
      return name.includes(s) || getWorkDate(r).includes(s);
    });
  }
  const pendingCheckins = displayed.filter(
    (r) => r.status === "PENDING" && getReqType(r) === "CHECK_IN",
  );
  const pendingCheckouts = displayed.filter(
    (r) => r.status === "PENDING" && getReqType(r) === "CHECK_OUT",
  );
  const processed = displayed.filter((r) => r.status !== "PENDING");
  const shown =
    subTab === "checkin"
      ? pendingCheckins
      : subTab === "checkout"
        ? pendingCheckouts
        : processed;

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    if (rejectDialog) {
      onReject(rejectDialog, rejectReason);
    }
    setRejectDialog(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-400">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          Khi duyệt yêu cầu, hệ thống sẽ tự động tạo hoặc cập nhật bản ghi chấm
          công cho nhân viên.
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Tìm nhân viên, ngày..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "checkin", label: "Check-in", count: pendingCheckins.length },
          {
            key: "checkout",
            label: "Check-out",
            count: pendingCheckouts.length,
          },
          { key: "processed", label: "Đã xử lý", count: processed.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key as typeof subTab)}
            className={`px-3 py-1.5 rounded-lg text-[12px] border transition ${subTab === t.key ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-border text-muted-foreground hover:bg-accent"}`}
          >
            {t.label}{" "}
            {t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
        {subTab !== "processed" && shown.length > 0 && (
          <button
            onClick={() => onApproveAll(shown.map((r) => r.id))}
            className="px-3 py-1.5 rounded-lg text-[12px] bg-emerald-600 text-white hover:bg-emerald-700 transition ml-auto"
          >
            <Check size={12} className="inline mr-1" />
            Duyệt tất cả ({shown.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Đang tải yêu cầu...</span>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-[13px]">
          Không có yêu cầu nào
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const rType = getReqType(r);
            const rTime = getReqTime(r);
            const workDate = getWorkDate(r);
            const userName = getUserName(r);
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${rType === "CHECK_IN" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"}`}
                    >
                      {rType === "CHECK_IN" ? (
                        <LogIn size={15} />
                      ) : (
                        <LogOut size={15} />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{userName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {rType === "CHECK_IN" ? "Check-in" : "Check-out"} ·{" "}
                        {rTime ? new Date(rTime).toLocaleString("vi-VN") : "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Ngày: {workDate}
                      </div>
                      {(r as Record<string, unknown>).reason && (
                        <div className="text-[11px] italic text-muted-foreground">
                          {String((r as Record<string, unknown>).reason)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status] ?? ""}`}
                    >
                      {reqStatusLabels[r.status] ?? r.status}
                    </span>
                    {r.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => onApprove(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[12px] flex items-center gap-1 hover:bg-emerald-700 transition"
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button
                          onClick={() => {
                            setRejectDialog(r.id);
                            setRejectReason("");
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1 hover:bg-red-700 transition"
                        >
                          <X size={12} /> Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRejectDialog(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-[15px] font-medium">Lý do từ chối</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do từ chối..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectDialog(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700 transition"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Adjust Tab ─────────────────────────────────────────────────
function AdjustTab({
  records,
  loading,
  onAdjust,
}: {
  records: ApiAttendanceRecord[];
  loading: boolean;
  onAdjust: (r: ApiAttendanceRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(TODAY);
  const [editRecord, setEditRecord] = useState<ApiAttendanceRecord | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    checkInAt: "",
    checkOutAt: "",
    status: "PRESENT",
    note: "",
  });

  const filtered = useMemo(() => {
    let r = records.filter(
      (rec) => rec.workDate >= dateFrom && rec.workDate <= dateTo,
    );
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((rec) => {
        const user = (rec as Record<string, unknown>).user as
          | { fullName?: string }
          | undefined;
        const name =
          user?.fullName ??
          users.find((u) => u.id === rec.userId)?.fullName ??
          "";
        return name.toLowerCase().includes(s);
      });
    }
    return r.sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [records, search, dateFrom, dateTo]);

  const getUserDisplayName = (rec: ApiAttendanceRecord) => {
    const user = (rec as Record<string, unknown>).user as
      | { fullName?: string }
      | undefined;
    return (
      user?.fullName ??
      users.find((u) => u.id === rec.userId)?.fullName ??
      rec.userId
    );
  };

  const openEdit = (rec: ApiAttendanceRecord) => {
    setEditRecord(rec);
    const toTimeInput = (iso?: string | null) =>
      iso ? new Date(iso).toISOString().slice(0, 16) : "";
    setEditForm({
      checkInAt: toTimeInput(rec.checkInAt),
      checkOutAt: toTimeInput(rec.checkOutAt),
      status: rec.status,
      note: rec.note ?? "",
    });
  };

  const handleSave = () => {
    if (!editRecord) return;
    const toISO = (val: string) => (val ? new Date(val).toISOString() : null);
    onAdjust({
      ...editRecord,
      checkInAt: toISO(editForm.checkInAt),
      checkOutAt: toISO(editForm.checkOutAt),
      status: editForm.status as AttendanceStatus,
      note: editForm.note || null,
    });
    setEditRecord(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_120px_120px_80px_80px_40px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <span>Nhân viên</span>
          <span>Ngày</span>
          <span>Check-in</span>
          <span>Check-out</span>
          <span>Giờ làm</span>
          <span>Trạng thái</span>
          <span />
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px]">Đang tải bản ghi...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              Không có bản ghi nào trong khoảng thời gian này
            </div>
          ) : (
            filtered.map((r) => {
              const fmtT = (iso?: string | null) =>
                iso
                  ? new Date(iso).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
              return (
                <div
                  key={r.id}
                  className="grid sm:grid-cols-[1fr_100px_120px_120px_80px_80px_40px] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition"
                >
                  <div>
                    <div className="text-[13px]">{getUserDisplayName(r)}</div>
                  </div>
                  <div className="text-[12px]">
                    {new Date(r.workDate).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="text-[12px]">{fmtT(r.checkInAt)}</div>
                  <div className="text-[12px]">{fmtT(r.checkOutAt)}</div>
                  <div className="text-[12px]">
                    {Math.floor((r.totalWorkMinutes ?? 0) / 60)}h
                    {(r.totalWorkMinutes ?? 0) % 60}m
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${attStatusBg[r.status] ?? ""}`}
                  >
                    {attStatusLabels[r.status] ?? r.status}
                  </span>
                  <button
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-lg hover:bg-accent transition"
                  >
                    <Edit3 size={13} className="text-muted-foreground" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditRecord(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium">Điều chỉnh bản ghi</h3>
              <button
                onClick={() => setEditRecord(null)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X size={15} />
              </button>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-[12px]">
              <div>
                {getUserDisplayName(editRecord)} —{" "}
                {new Date(editRecord.workDate).toLocaleDateString("vi-VN")}
              </div>
            </div>
            {[
              { label: "Giờ check-in", key: "checkInAt" },
              { label: "Giờ check-out", key: "checkOutAt" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[12px] text-muted-foreground block mb-1">
                  {f.label}
                </label>
                <input
                  type="datetime-local"
                  value={(editForm as Record<string, string>)[f.key]}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
                />
              </div>
            ))}
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Trạng thái
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
              >
                {Object.entries(attStatusLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                value={editForm.note}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 transition"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export AttendanceStatus type locally for use inside component
type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LEAVE"
  | "HOLIDAY"
  | "MANUAL_ADJUSTED";

// ── Summary Tab ────────────────────────────────────────────────
function SummaryTab({ records }: { records: ApiAttendanceRecord[] }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const summary = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthRecords = records.filter((r) => {
      const d = new Date(r.workDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    // Xây dựng dept map từ mock users (nếu API mode thì dùng user embedded trong record)
    const deptMap: Record<
      string,
      {
        name: string;
        present: number;
        absent: number;
        leave: number;
        totalMinutes: number;
        lateMinutes: number;
        employees: Set<string>;
      }
    > = {};

    monthRecords.forEach((r) => {
      // Lấy departmentId từ user embedded (API) hoặc mock users
      const apiUser = (r as Record<string, unknown>).user as
        | { id?: string; departmentId?: string }
        | undefined;
      const mockUser = users.find((u) => u.id === r.userId);
      const deptId =
        apiUser?.departmentId ?? mockUser?.departmentId ?? "unknown";
      const dept = getDepartmentById(deptId);
      const deptName = dept?.name ?? deptId;

      if (!deptMap[deptId]) {
        deptMap[deptId] = {
          name: deptName,
          present: 0,
          absent: 0,
          leave: 0,
          totalMinutes: 0,
          lateMinutes: 0,
          employees: new Set(),
        };
      }
      deptMap[deptId].employees.add(r.userId);
      if (r.status === "PRESENT" || r.status === "MANUAL_ADJUSTED")
        deptMap[deptId].present++;
      else if (r.status === "ABSENT") deptMap[deptId].absent++;
      else if (r.status === "LEAVE") deptMap[deptId].leave++;
      deptMap[deptId].totalMinutes += r.totalWorkMinutes ?? 0;
      deptMap[deptId].lateMinutes += r.lateMinutes ?? 0;
    });

    return Object.values(deptMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [records, selectedMonth]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Tháng
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_80px_80px_80px_80px_80px_100px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <span>Phòng ban</span>
          <span>NV</span>
          <span>Có mặt</span>
          <span>Vắng</span>
          <span>Nghỉ phép</span>
          <span>Trễ (phút)</span>
          <span>Tổng giờ</span>
        </div>
        <div className="divide-y divide-border">
          {summary.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              Không có dữ liệu tháng này
            </div>
          ) : (
            summary.map((d) => (
              <div
                key={d.name}
                className="grid sm:grid-cols-[2fr_80px_80px_80px_80px_80px_100px] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted-foreground" />
                  <span className="text-[13px]">{d.name}</span>
                </div>
                <span className="text-[12px]">{d.employees.size}</span>
                <span className="text-[12px] text-emerald-600">
                  {d.present}
                </span>
                <span className="text-[12px] text-red-500">{d.absent}</span>
                <span className="text-[12px] text-blue-500">{d.leave}</span>
                <span
                  className={`text-[12px] ${d.lateMinutes > 0 ? "text-amber-600" : "text-muted-foreground"}`}
                >
                  {d.lateMinutes}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {Math.floor(d.totalMinutes / 60)}h{d.totalMinutes % 60}m
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
