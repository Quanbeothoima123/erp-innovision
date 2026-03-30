// ================================================================
// OVERTIME PAGE — Module 6 (Full API integration)
// Replaces all mock data with real API calls via overtime.service
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Check,
  X,
  Search,
  Clock,
  Timer,
  AlertTriangle,
  ListChecks,
  Ban,
  CheckCircle2,
  MessageSquare,
  Info,
  DollarSign,
  Zap,
  FileText,
  Edit3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as overtimeService from "../../lib/services/overtime.service";
import type {
  ApiOvertimeRequest,
  OvertimeStatus,
  OTMonthlyStats,
} from "../../lib/services/overtime.service";
import { ApiError } from "../../lib/apiClient";

// ─── Constants ────────────────────────────────────────────────────
const statusColors: Record<OvertimeStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};
const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã huỷ",
};

const getMultiplierBadge = (isHoliday: boolean, isWeekend: boolean) =>
  isHoliday
    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    : isWeekend
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

const getMultiplierLabel = (isHoliday: boolean, isWeekend: boolean) =>
  isHoliday
    ? "Ngày lễ ×3.0"
    : isWeekend
      ? "Cuối tuần ×2.0"
      : "Ngày thường ×1.5";

const calcMinutes = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
};

const formatVND = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const emptyForm = {
  workDate: "",
  startTime: "18:00",
  endTime: "20:00",
  reason: "",
  isWeekend: false,
  isHoliday: false,
};

// ═══════════════════════════════════════════════════════════════════
// MAIN: OvertimePage
// ═══════════════════════════════════════════════════════════════════
export function OvertimePage() {
  const { currentUser, can } = useAuth();

  const isAdmin = can("ADMIN");
  const isHR = can("HR");
  const isAdminHR = isAdmin || isHR;
  const isManager = can("MANAGER");

  type TabKey = "my" | "approve" | "all";
  const defaultTab: TabKey = isAdminHR
    ? "approve"
    : isManager
      ? "approve"
      : "my";
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<ApiOvertimeRequest | null>(null);

  // ─── Data state ─────────────────────────────────────────────
  const [myReqs, setMyReqs] = useState<ApiOvertimeRequest[]>([]);
  const [allReqs, setAllReqs] = useState<ApiOvertimeRequest[]>([]);
  const [myStats, setMyStats] = useState<OTMonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  const now = new Date();

  // ─── Fetch my requests ────────────────────────────────────────
  const fetchMyReqs = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, stats] = await Promise.all([
        overtimeService.getMyOvertimeRequests({ limit: 100 }),
        overtimeService
          .getMyOTStats({ year: now.getFullYear(), month: now.getMonth() + 1 })
          .catch(() => null),
      ]);
      setMyReqs(reqs.items);
      if (stats) setMyStats(stats);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch all requests (admin/hr/manager) ───────────────────
  const fetchAllReqs = useCallback(async () => {
    if (!isAdminHR && !isManager) return;
    setLoadingAll(true);
    try {
      const result = await overtimeService.listOvertimeRequests({ limit: 100 });
      setAllReqs(result.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoadingAll(false);
    }
  }, [isAdminHR, isManager]);

  useEffect(() => {
    fetchMyReqs();
  }, [fetchMyReqs]);
  useEffect(() => {
    fetchAllReqs();
  }, [fetchAllReqs]);

  // ─── Tabs ──────────────────────────────────────────────────────
  const pendingForMe = allReqs.filter((r) => r.status === "PENDING");

  const availableTabs = useMemo(() => {
    const tabs: {
      key: TabKey;
      label: string;
      icon: React.ReactNode;
      badge?: number;
    }[] = [];
    tabs.push({ key: "my", label: "OT của tôi", icon: <Timer size={14} /> });
    if (isManager || isAdminHR) {
      tabs.push({
        key: "approve",
        label: "Duyệt yêu cầu OT",
        icon: <ListChecks size={14} />,
        badge: pendingForMe.length,
      });
    }
    if (isAdminHR) {
      tabs.push({
        key: "all",
        label: "Tổng hợp OT",
        icon: <FileText size={14} />,
      });
    }
    return tabs;
  }, [isManager, isAdminHR, pendingForMe.length]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleCreate = useCallback(
    async (form: typeof emptyForm): Promise<boolean> => {
      if (
        !form.workDate ||
        !form.startTime ||
        !form.endTime ||
        !form.reason.trim()
      ) {
        toast.error("Vui lòng điền đầy đủ thông tin");
        return false;
      }
      const minutes = calcMinutes(form.startTime, form.endTime);
      if (minutes <= 0) {
        toast.error("Giờ kết thúc phải sau giờ bắt đầu");
        return false;
      }
      if (minutes > 12 * 60) {
        toast.error("Ca OT không được quá 12 giờ");
        return false;
      }
      try {
        await overtimeService.createOvertimeRequest({
          workDate: form.workDate,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason,
          isWeekend: form.isWeekend,
          isHoliday: form.isHoliday,
        });
        toast.success("Đã gửi yêu cầu OT — chờ phê duyệt");
        fetchMyReqs();
        return true;
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể tạo yêu cầu",
        );
        return false;
      }
    },
    [fetchMyReqs],
  );

  const handleApprove = useCallback(
    async (id: string, comment?: string) => {
      try {
        await overtimeService.approveOvertimeRequest(id, comment);
        toast.success("Đã duyệt yêu cầu OT");
        fetchMyReqs();
        fetchAllReqs();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Không thể duyệt");
      }
    },
    [fetchMyReqs, fetchAllReqs],
  );

  const handleReject = useCallback(
    async (id: string, comment: string) => {
      if (!comment.trim()) {
        toast.error("Vui lòng nhập lý do từ chối");
        return;
      }
      try {
        await overtimeService.rejectOvertimeRequest(id, comment);
        toast.success("Đã từ chối yêu cầu OT");
        fetchMyReqs();
        fetchAllReqs();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể từ chối",
        );
      }
    },
    [fetchMyReqs, fetchAllReqs],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await overtimeService.cancelOvertimeRequest(id);
        toast.success("Đã huỷ yêu cầu OT");
        fetchMyReqs();
        fetchAllReqs();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Không thể huỷ");
      }
    },
    [fetchMyReqs, fetchAllReqs],
  );

  const handleUpdateActual = useCallback(
    async (id: string, actualMinutes: number) => {
      try {
        await overtimeService.updateActualMinutes(id, actualMinutes);
        toast.success("Đã cập nhật số giờ thực tế");
        fetchAllReqs();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể cập nhật",
        );
      }
    },
    [fetchAllReqs],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl">Quản lý làm thêm giờ (OT)</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchMyReqs();
              fetchAllReqs();
            }}
            className="px-3 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent flex items-center gap-1"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> Tạo yêu cầu OT
          </button>
        </div>
      </div>

      {/* Rate info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Hệ số tính OT:</span>{" "}
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[0.6875rem]">
            Ngày thường ×1.5
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[0.6875rem] ml-1">
            Cuối tuần ×2.0
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-[0.6875rem] ml-1">
            Ngày lễ ×3.0
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as TabKey)}
            className={`px-3 py-2.5 text-[0.8125rem] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span className="ml-1 px-1.5 py-0.5 text-[0.625rem] bg-red-500 text-white rounded-full">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "my" &&
        (loading ? (
          <LoadingState />
        ) : (
          <MyOTTab
            reqs={myReqs}
            stats={myStats}
            onCancel={handleCancel}
            onViewDetail={setDetailReq}
          />
        ))}
      {activeTab === "approve" &&
        (loadingAll ? (
          <LoadingState />
        ) : (
          <ApproveOTTab
            pendingReqs={pendingForMe}
            recentApprovedReqs={allReqs
              .filter((r) => r.status === "APPROVED" && !r.actualMinutes)
              .slice(0, 10)}
            onApprove={handleApprove}
            onReject={handleReject}
            onUpdateActual={handleUpdateActual}
            onViewDetail={setDetailReq}
          />
        ))}
      {activeTab === "all" &&
        (loadingAll ? (
          <LoadingState />
        ) : (
          <AllOTTab
            reqs={allReqs}
            onViewDetail={setDetailReq}
            onUpdateActual={handleUpdateActual}
          />
        ))}

      {/* Create Dialog */}
      {showForm && (
        <CreateOTDialog
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail Dialog */}
      {detailReq && (
        <OTDetailDialog
          req={detailReq}
          onClose={() => setDetailReq(null)}
          canApprove={
            detailReq.status === "PENDING" && (isAdminHR || isManager)
          }
          canCancel={
            detailReq.status === "PENDING" &&
            detailReq.user?.id === currentUser?.id
          }
          canEditActual={detailReq.status === "APPROVED" && isAdminHR}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          onUpdateActual={handleUpdateActual}
        />
      )}
    </div>
  );
}

// ─── Loading ─────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-[0.8125rem]">Đang tải...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: My OT (Employee timeline)
// ═══════════════════════════════════════════════════════════════════
function MyOTTab({
  reqs,
  stats,
  onCancel,
  onViewDetail,
}: {
  reqs: ApiOvertimeRequest[];
  stats: OTMonthlyStats | null;
  onCancel: (id: string) => void;
  onViewDetail: (req: ApiOvertimeRequest) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered =
    statusFilter === "all"
      ? reqs
      : reqs.filter((r) => r.status === statusFilter);
  const sorted = [...filtered].sort((a, b) =>
    b.workDate.localeCompare(a.workDate),
  );

  const pendingCount = reqs.filter((r) => r.status === "PENDING").length;
  const approvedCount = reqs.filter((r) => r.status === "APPROVED").length;
  const totalApprovedHours = reqs
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + (r.actualHours ?? r.plannedHours), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <Clock size={12} /> Tổng giờ OT
          </div>
          <div className="text-xl mt-1">
            {totalApprovedHours.toFixed(1)}
            <span className="text-xs text-muted-foreground">h</span>
          </div>
          <div className="text-[0.625rem] text-muted-foreground">
            {approvedCount} ca đã duyệt
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <DollarSign size={12} /> OT tháng này
          </div>
          <div className="text-lg mt-1 text-green-600">
            {stats ? `${stats.totalApprovedHours.toFixed(1)}h` : "—"}
          </div>
          <div className="text-[0.625rem] text-muted-foreground">
            {stats ? `${stats.sessionCount} ca` : "Đang tải..."}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <Zap size={12} /> Phân bổ
          </div>
          <div className="text-xs mt-1 space-y-0.5">
            {stats ? (
              <>
                <div className="text-blue-600">
                  {stats.breakdown.weekdayHours.toFixed(1)}h thường
                </div>
                <div className="text-purple-600">
                  {stats.breakdown.weekendHours.toFixed(1)}h cuối tuần
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <AlertTriangle size={12} /> Đang chờ
          </div>
          <div className="text-xl mt-1 text-yellow-600">{pendingCount}</div>
          <div className="text-[0.625rem] text-muted-foreground">
            yêu cầu chờ duyệt
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {["all", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => {
          const count =
            s === "all"
              ? reqs.length
              : reqs.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-[0.8125rem] border-b-2 whitespace-nowrap ${statusFilter === s ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground"}`}
            >
              {s === "all" ? "Tất cả" : statusLabels[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {sorted.map((r, i) => {
          const isLast = i === sorted.length - 1;
          return (
            <div key={r.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 mt-2 ${r.status === "APPROVED" ? "bg-green-500" : r.status === "REJECTED" ? "bg-red-500" : r.status === "CANCELLED" ? "bg-gray-400" : "bg-yellow-400"}`}
                />
                {!isLast && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div
                className="flex-1 bg-card border border-border rounded-xl p-3 mb-3 hover:shadow-sm cursor-pointer transition-shadow"
                onClick={() => onViewDetail(r)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[0.8125rem]">
                        {new Date(r.workDate).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={`text-[0.625rem] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}
                      >
                        {getMultiplierLabel(r.isHoliday, r.isWeekend)}
                      </span>
                      <span
                        className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${statusColors[r.status]}`}
                      >
                        {statusLabels[r.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.startTime} — {r.endTime} ({r.plannedHours.toFixed(1)}h
                      dự kiến
                      {r.actualHours
                        ? `, ${r.actualHours.toFixed(1)}h thực tế`
                        : ""}
                      )
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === "APPROVED" && r.otPay && (
                      <div className="text-[0.8125rem] text-green-600">
                        {formatVND(r.otPay.amount)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {r.reason}
                </div>
                {r.comment && (
                  <div className="text-[0.6875rem] mt-1.5 flex items-start gap-1 text-muted-foreground">
                    <MessageSquare size={10} className="mt-0.5 shrink-0" /> "
                    {r.comment}"
                    {r.approver && <span>— {r.approver.fullName}</span>}
                  </div>
                )}
                {r.status === "PENDING" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(r.id);
                    }}
                    className="mt-2 px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-[0.6875rem] flex items-center gap-1"
                  >
                    <Ban size={10} /> Huỷ
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Timer size={40} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm">Chưa có yêu cầu OT nào</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Approve OT (Manager/HR)
// ═══════════════════════════════════════════════════════════════════
function ApproveOTTab({
  pendingReqs,
  recentApprovedReqs,
  onApprove,
  onReject,
  onUpdateActual,
  onViewDetail,
}: {
  pendingReqs: ApiOvertimeRequest[];
  recentApprovedReqs: ApiOvertimeRequest[];
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment: string) => void;
  onUpdateActual: (id: string, minutes: number) => void;
  onViewDetail: (req: ApiOvertimeRequest) => void;
}) {
  const [approveComment, setApproveComment] = useState<Record<string, string>>(
    {},
  );
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 text-center">
          <div className="text-xl text-yellow-600">
            {pendingReqs.length}
          </div>
          <div className="text-[0.625rem] text-muted-foreground">Chờ duyệt</div>
        </div>
        <div
          className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-3 text-center cursor-pointer"
          onClick={() => setShowRecent(!showRecent)}
        >
          <div className="text-xl text-orange-600">
            {recentApprovedReqs.length}
          </div>
          <div className="text-[0.625rem] text-muted-foreground">
            Cần nhập giờ thực tế
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-center">
          <div className="text-[0.8125rem] text-green-600 flex items-center justify-center gap-1">
            <CheckCircle2 size={14} /> Sẵn sàng duyệt
          </div>
          <div className="text-[0.625rem] text-muted-foreground mt-1">
            Kiểm tra lý do trước khi duyệt
          </div>
        </div>
      </div>

      {/* Need actual minutes */}
      {showRecent && recentApprovedReqs.length > 0 && (
        <div className="bg-card border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-3">
          <div className="text-[0.8125rem] flex items-center gap-1.5">
            <Edit3 size={14} className="text-orange-600" /> Nhập số giờ thực tế
            cho ca OT đã duyệt
          </div>
          {recentApprovedReqs.map((r) => (
            <ActualMinutesInput key={r.id} req={r} onUpdate={onUpdateActual} />
          ))}
        </div>
      )}

      {/* Pending requests */}
      {pendingReqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-sm">Không có yêu cầu OT nào chờ duyệt</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingReqs.map((r) => {
            const u = r.user;
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onViewDetail(r)}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">
                      {u?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                    </div>
                    <div>
                      <div className="text-sm">
                        {u?.fullName ?? "—"}{" "}
                        <span className="text-[0.6875rem] text-muted-foreground">
                          ({u?.userCode})
                        </span>
                      </div>
                      <div className="text-[0.6875rem] text-muted-foreground">
                        {(u as { department?: { name: string } } | null)
                          ?.department?.name ?? "—"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[0.625rem] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}
                  >
                    {getMultiplierLabel(r.isHoliday, r.isWeekend)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ngày:</span>{" "}
                    {new Date(r.workDate).toLocaleDateString("vi-VN")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giờ:</span>{" "}
                    {r.startTime} — {r.endTime}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Số giờ:</span>{" "}
                    {r.plannedHours.toFixed(1)}h
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lý do:</span>{" "}
                    {r.reason}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhận xét (không bắt buộc)..."
                    value={approveComment[r.id] || ""}
                    onChange={(e) =>
                      setApproveComment((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-xs"
                  />
                  <button
                    onClick={() => {
                      onApprove(r.id, approveComment[r.id]);
                      setApproveComment((prev) => {
                        const n = { ...prev };
                        delete n[r.id];
                        return n;
                      });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 flex items-center gap-1 shrink-0"
                  >
                    <Check size={14} /> Duyệt
                  </button>
                  {rejectingId === r.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="text"
                        placeholder="Lý do từ chối *"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-red-300 bg-input-background text-xs w-40"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onReject(r.id, rejectComment);
                          setRejectingId(null);
                          setRejectComment("");
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectComment("");
                        }}
                        className="px-3 py-2 border border-border rounded-lg text-xs"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(r.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 dark:bg-red-900/30 flex items-center gap-1 shrink-0"
                    >
                      <X size={14} /> Từ chối
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Actual Minutes Input ─────────────
function ActualMinutesInput({
  req,
  onUpdate,
}: {
  req: ApiOvertimeRequest;
  onUpdate: (id: string, minutes: number) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="min-w-[120px]">{req.user?.fullName ?? "—"}</span>
      <span className="text-muted-foreground">
        {new Date(req.workDate).toLocaleDateString("vi-VN")}
      </span>
      <span className="text-muted-foreground">
        {req.startTime}—{req.endTime}
      </span>
      <span className="text-muted-foreground">
        ({req.plannedHours.toFixed(1)}h kế hoạch)
      </span>
      <input
        type="number"
        placeholder="Phút thực tế"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 px-2 py-1 rounded border border-border bg-input-background text-xs"
      />
      <button
        onClick={() => {
          const mins = parseInt(value);
          if (!mins || mins <= 0) {
            toast.error("Nhập số phút hợp lệ");
            return;
          }
          onUpdate(req.id, mins);
          setValue("");
        }}
        className="px-2 py-1 bg-blue-600 text-white rounded text-[0.6875rem] hover:bg-blue-700"
      >
        Lưu
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: All OT (Admin summary)
// ═══════════════════════════════════════════════════════════════════
function AllOTTab({
  reqs,
  onViewDetail,
  onUpdateActual,
}: {
  reqs: ApiOvertimeRequest[];
  onViewDetail: (req: ApiOvertimeRequest) => void;
  onUpdateActual: (id: string, minutes: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let list = reqs;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.user?.fullName.toLowerCase().includes(s) ||
          r.reason?.toLowerCase().includes(s),
      );
    }
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (typeFilter === "WEEKEND") list = list.filter((r) => r.isWeekend);
    else if (typeFilter === "HOLIDAY") list = list.filter((r) => r.isHoliday);
    else if (typeFilter === "NORMAL")
      list = list.filter((r) => !r.isWeekend && !r.isHoliday);
    return list;
  }, [reqs, search, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const approved = filtered.filter((r) => r.status === "APPROVED");
    const totalHours = approved.reduce(
      (s, r) => s + (r.actualHours ?? r.plannedHours),
      0,
    );
    const totalCost = approved.reduce((s, r) => s + (r.otPay?.amount ?? 0), 0);
    return {
      total: filtered.length,
      pending: filtered.filter((r) => r.status === "PENDING").length,
      approved: approved.length,
      rejected: filtered.filter((r) => r.status === "REJECTED").length,
      totalHours,
      totalCost,
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          {
            label: "Tổng",
            value: summary.total.toString(),
            color: "text-foreground",
            bg: "bg-muted/50",
          },
          {
            label: "Chờ duyệt",
            value: summary.pending.toString(),
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-900/10",
          },
          {
            label: "Đã duyệt",
            value: summary.approved.toString(),
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/10",
          },
          {
            label: "Từ chối",
            value: summary.rejected.toString(),
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-900/10",
          },
          {
            label: "Tổng giờ",
            value: `${summary.totalHours.toFixed(0)}h`,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/10",
          },
          {
            label: "Chi phí OT",
            value: formatVND(summary.totalCost),
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/10",
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <div className={`text-base ${s.color}`}>{s.value}</div>
            <div className="text-[0.625rem] text-muted-foreground">{s.label}</div>
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
            placeholder="Tìm nhân viên, lý do..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
        >
          <option value="">Tất cả loại</option>
          <option value="NORMAL">Ngày thường</option>
          <option value="WEEKEND">Cuối tuần</option>
          <option value="HOLIDAY">Ngày lễ</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">
                  Nhân viên
                </th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">
                  Ngày
                </th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  Giờ
                </th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  Kế hoạch
                </th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  Thực tế
                </th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  Loại
                </th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                  Chi phí OT
                </th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onViewDetail(r)}
                  className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.625rem] shrink-0">
                        {r.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                      </div>
                      <div>
                        <div className="text-[0.8125rem]">
                          {r.user?.fullName ?? "—"}
                        </div>
                        <div className="text-[0.625rem] text-muted-foreground">
                          {(r.user as { department?: { name: string } } | null)
                            ?.department?.name ?? "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem]">
                    {new Date(r.workDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] hidden sm:table-cell">
                    {r.startTime}—{r.endTime}
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] text-right hidden sm:table-cell">
                    {r.plannedHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] text-right hidden md:table-cell">
                    {r.actualHours ? `${r.actualHours.toFixed(1)}h` : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`text-[0.625rem] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}
                    >
                      {r.dayType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-right hidden lg:table-cell text-green-600">
                    {r.status === "APPROVED" && r.otPay
                      ? formatVND(r.otPay.amount)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${statusColors[r.status]}`}
                    >
                      {statusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground text-[0.8125rem]"
                  >
                    Không tìm thấy yêu cầu OT
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
          {filtered.length} / {reqs.length} yêu cầu
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create OT Dialog
// ═══════════════════════════════════════════════════════════════════
function CreateOTDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: typeof emptyForm) => Promise<boolean>;
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const dateInfo = useMemo(() => {
    if (!form.workDate) return null;
    const date = new Date(form.workDate + "T00:00:00");
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    return {
      isWeekend,
      dayName: date.toLocaleDateString("vi-VN", { weekday: "long" }),
    };
  }, [form.workDate]);

  const effectiveIsWeekend = form.isWeekend || (dateInfo?.isWeekend ?? false);
  const minutes =
    form.startTime && form.endTime
      ? calcMinutes(form.startTime, form.endTime)
      : 0;
  const hours = minutes > 0 ? (minutes / 60).toFixed(1) : "0";
  const multiplier = form.isHoliday ? 3.0 : effectiveIsWeekend ? 2.0 : 1.5;

  const handleSubmit = async () => {
    setSubmitting(true);
    const f = { ...form, isWeekend: effectiveIsWeekend };
    const ok = await onCreate(f);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Tạo yêu cầu OT</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ngày làm thêm *
            </label>
            <input
              type="date"
              value={form.workDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, workDate: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            />
            {dateInfo && (
              <div className="mt-1 flex items-center gap-2 text-[0.6875rem]">
                <span className="text-muted-foreground">
                  {dateInfo.dayName}
                </span>
                {dateInfo.isWeekend && (
                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                    Cuối tuần
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Giờ bắt đầu *
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Giờ kết thúc *
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveIsWeekend}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isWeekend: e.target.checked }))
                }
                className="w-4 h-4 rounded"
              />
              Cuối tuần (×2.0)
            </label>
            <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isHoliday}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isHoliday: e.target.checked }))
                }
                className="w-4 h-4 rounded"
              />
              Ngày lễ (×3.0)
            </label>
          </div>

          {/* Preview */}
          {minutes > 0 && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="text-xs text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <DollarSign size={14} /> Thông tin OT
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Số giờ:</span>
                <span>{hours}h</span>
                <span className="text-muted-foreground">Hệ số:</span>
                <span
                  className={
                    form.isHoliday
                      ? "text-orange-600"
                      : effectiveIsWeekend
                        ? "text-purple-600"
                        : "text-blue-600"
                  }
                >
                  ×{multiplier.toFixed(1)} (
                  {form.isHoliday
                    ? "Ngày lễ"
                    : effectiveIsWeekend
                      ? "Cuối tuần"
                      : "Ngày thường"}
                  )
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Lý do *
            </label>
            <textarea
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="Nhập lý do làm thêm giờ..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] h-20 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OT Detail Dialog
// ═══════════════════════════════════════════════════════════════════
function OTDetailDialog({
  req,
  onClose,
  canApprove,
  canCancel,
  canEditActual,
  onApprove,
  onReject,
  onCancel,
  onUpdateActual,
}: {
  req: ApiOvertimeRequest;
  onClose: () => void;
  canApprove: boolean;
  canCancel: boolean;
  canEditActual: boolean;
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment: string) => void;
  onCancel: (id: string) => void;
  onUpdateActual: (id: string, minutes: number) => void;
}) {
  const [actionComment, setActionComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actualInput, setActualInput] = useState(
    req.actualMinutes?.toString() || "",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Chi tiết yêu cầu OT</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Employee */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
              {req.user?.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
            </div>
            <div>
              <div className="text-sm">
                {req.user?.fullName ?? "—"}{" "}
                <span className="text-[0.6875rem] text-muted-foreground">
                  ({req.user?.userCode})
                </span>
              </div>
              <div className="text-[0.6875rem] text-muted-foreground">
                {(req.user as { department?: { name: string } } | null)
                  ?.department?.name ?? "—"}
              </div>
            </div>
            <span
              className={`ml-auto text-[0.6875rem] px-2 py-0.5 rounded-full ${statusColors[req.status]}`}
            >
              {statusLabels[req.status]}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Ngày
              </div>
              {new Date(req.workDate).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Giờ
              </div>
              {req.startTime} — {req.endTime}
            </div>
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Loại ngày
              </div>
              <span
                className={`text-[0.6875rem] px-1.5 py-0.5 rounded ${getMultiplierBadge(req.isHoliday, req.isWeekend)}`}
              >
                {req.dayType}
              </span>
            </div>
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Giờ kế hoạch
              </div>
              {req.plannedHours.toFixed(1)}h ({req.plannedMinutes} phút)
            </div>
          </div>

          {req.actualMinutes && (
            <div className="text-[0.8125rem]">
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Giờ thực tế
              </div>
              {req.actualHours?.toFixed(1)}h ({req.actualMinutes} phút)
            </div>
          )}

          <div className="text-[0.8125rem]">
            <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
              Lý do
            </div>
            {req.reason}
          </div>

          {req.approver && (
            <div className="text-[0.8125rem]">
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Người duyệt
              </div>
              {req.approver.fullName}
              {req.comment && (
                <span className="text-muted-foreground">
                  {" "}
                  — "{req.comment}"
                </span>
              )}
            </div>
          )}

          {/* Cost breakdown from API */}
          {req.status === "APPROVED" && req.otPay && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="text-xs text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <DollarSign size={14} /> Chi phí OT
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Số giờ:</span>
                <span>
                  {req.actualHours?.toFixed(1) ?? req.plannedHours.toFixed(1)}h
                </span>
                <span className="text-muted-foreground">Hệ số:</span>
                <span>×{req.otPay.rate.toFixed(1)}</span>
                <span className="text-muted-foreground">Lương cơ bản:</span>
                <span>{formatVND(req.otPay.baseSalary)}</span>
                <span className="text-muted-foreground border-t border-green-200 pt-1">
                  Thành tiền:
                </span>
                <span className="text-sm text-green-600 border-t border-green-200 pt-1">
                  {formatVND(req.otPay.amount)}
                </span>
              </div>
            </div>
          )}

          {/* Edit actual minutes */}
          {canEditActual && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Cập nhật số phút thực tế
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={actualInput}
                  onChange={(e) => setActualInput(e.target.value)}
                  placeholder="Phút thực tế"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                />
                <button
                  onClick={() => {
                    const mins = parseInt(actualInput);
                    if (!mins || mins <= 0) {
                      toast.error("Nhập số phút hợp lệ");
                      return;
                    }
                    onUpdateActual(req.id, mins);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          )}

          {/* Approve/Reject */}
          {canApprove && !showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <input
                type="text"
                placeholder="Nhận xét (không bắt buộc)..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onApprove(req.id, actionComment || undefined);
                    onClose();
                  }}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-[0.8125rem] hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  <Check size={14} /> Duyệt
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[0.8125rem] hover:bg-red-700 flex items-center justify-center gap-1"
                >
                  <X size={14} /> Từ chối
                </button>
              </div>
            </div>
          )}
          {canApprove && showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Lý do từ chối * (bắt buộc)"
                className="w-full p-3 rounded-lg border border-red-300 bg-input-background text-[0.8125rem] h-20 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-[0.8125rem]"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    onReject(req.id, actionComment);
                    onClose();
                  }}
                  disabled={!actionComment.trim()}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[0.8125rem] disabled:opacity-50"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <button
              onClick={() => {
                onCancel(req.id);
                onClose();
              }}
              className="w-full py-2 border border-red-300 text-red-600 rounded-lg text-[0.8125rem] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1"
            >
              <Ban size={14} /> Huỷ yêu cầu OT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
