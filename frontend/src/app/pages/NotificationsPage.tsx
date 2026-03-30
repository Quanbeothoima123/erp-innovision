// ================================================================
// NOTIFICATIONS PAGE — Module 11 (Full API integration)
// Thay toàn bộ mock/AuthContext bằng notifications.service
//
// Endpoints dùng:
//   GET  /notifications/my                  — danh sách + unreadCount
//   GET  /notifications/my/unread-count     — badge count
//   PATCH /notifications/:id/read           — mark 1 đã đọc
//   POST  /notifications/my/mark-all-read   — đọc tất cả
//   POST  /notifications/my/batch-mark-read — đọc nhiều
//   POST  /notifications/my/batch-delete    — xoá nhiều
//   DELETE /notifications/my/read           — xoá tất cả đã đọc
//   DELETE /notifications/:id               — xoá 1
// ================================================================
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  Check,
  CheckCheck,
  Mail,
  MailOpen,
  Trash2,
  X,
  Clock,
  CalendarDays,
  Briefcase,
  DollarSign,
  FileText,
  AlertTriangle,
  Timer,
  UserCheck,
  FolderKanban,
  MessageSquare,
  Search,
  Loader2,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import * as notificationsService from "../../lib/services/notifications.service";
import type { ApiNotification } from "../../lib/services/notifications.service";
import { ApiError } from "../../lib/apiClient";

// ─── Constants ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  ATTENDANCE_CHECKIN_REQUEST:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ATTENDANCE_CHECKOUT_REQUEST:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ATTENDANCE_REQUEST_APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ATTENDANCE_REQUEST_REJECTED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LEAVE_REQUEST_CREATED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  LEAVE_REQUEST_APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LEAVE_REQUEST_REJECTED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LEAVE_BALANCE_LOW:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  OVERTIME_REQUEST_CREATED:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  OVERTIME_APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERTIME_REJECTED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PROJECT_ASSIGNED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  PROJECT_STATUS_CHANGED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MILESTONE_DUE_SOON:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  PAYROLL_READY:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PAYSLIP_AVAILABLE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPENSATION_CHANGED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CONTRACT_SIGNED:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  CONTRACT_EXPIRING_SOON:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  INVOICE_SENT:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  PAYMENT_RECEIVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INVOICE_OVERDUE:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  GENERAL: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

function getTypeIcon(type: string): React.ReactNode {
  const cls = "shrink-0";
  if (type.startsWith("ATTENDANCE"))
    return <Clock size={16} className={`${cls} text-blue-500`} />;
  if (type.startsWith("LEAVE"))
    return <CalendarDays size={16} className={`${cls} text-orange-500`} />;
  if (type.startsWith("OVERTIME"))
    return <Timer size={16} className={`${cls} text-indigo-500`} />;
  if (type.startsWith("PROJECT") || type === "MILESTONE_DUE_SOON")
    return <FolderKanban size={16} className={`${cls} text-purple-500`} />;
  if (
    type.startsWith("PAYROLL") ||
    type.startsWith("PAYSLIP") ||
    type === "COMPENSATION_CHANGED"
  )
    return <DollarSign size={16} className={`${cls} text-emerald-500`} />;
  if (type.startsWith("CONTRACT"))
    return <FileText size={16} className={`${cls} text-yellow-500`} />;
  if (type.startsWith("INVOICE") || type === "PAYMENT_RECEIVED")
    return <Briefcase size={16} className={`${cls} text-cyan-500`} />;
  return <MessageSquare size={16} className={`${cls} text-gray-500`} />;
}

// ─── Helpers ──────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toDateString();
  const ystStr = new Date(now.getTime() - 86400000).toDateString();
  if (d.toDateString() === todayStr) return "Hôm nay";
  if (d.toDateString() === ystStr) return "Hôm qua";
  if (now.getTime() - d.getTime() < 7 * 86400000) return "Tuần này";
  if (now.getTime() - d.getTime() < 30 * 86400000) return "Tháng này";
  return "Cũ hơn";
}

const DATE_GROUP_ORDER = [
  "Hôm nay",
  "Hôm qua",
  "Tuần này",
  "Tháng này",
  "Cũ hơn",
];

const PAGE_SIZE = 30;

// ═══════════════════════════════════════════════════════════════
// NotificationsPage
// ═══════════════════════════════════════════════════════════════
export function NotificationsPage() {
  const { can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");
  const navigate = useNavigate();

  // ─── Data state ────────────────────────────────────────────
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Filter state ──────────────────────────────────────────
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Selection state ───────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Send notification panel (Admin/HR) ────────────────────
  const [showSendPanel, setShowSendPanel] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
        if (readFilter === "unread") params.isRead = false;
        if (readFilter === "read") params.isRead = true;

        const res = await notificationsService.listMyNotifications(
          params as Parameters<
            typeof notificationsService.listMyNotifications
          >[0],
        );
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
        setTotalCount(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setCurrentPage(res.pagination.page);
        setSelectedIds(new Set());
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [readFilter],
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // ─── Client-side filter (category + search, không cần API) ─
  const displayed = useMemo(() => {
    let list = notifications;
    if (categoryFilter)
      list = list.filter((n) => n.category === categoryFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(s) ||
          n.message.toLowerCase().includes(s),
      );
    }
    return list;
  }, [notifications, categoryFilter, searchTerm]);

  // ─── Group by date ─────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, ApiNotification[]>();
    displayed.forEach((n) => {
      const g = getDateGroup(n.createdAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    });
    const sorted = new Map<string, ApiNotification[]>();
    DATE_GROUP_ORDER.forEach((o) => {
      if (map.has(o)) sorted.set(o, map.get(o)!);
    });
    return sorted;
  }, [displayed]);

  const uniqueCategories = useMemo(
    () => [...new Set(notifications.map((n) => n.category))].sort(),
    [notifications],
  );

  const readCount = notifications.filter((n) => n.isRead).length;
  const hasFilters = readFilter !== "all" || categoryFilter || searchTerm;

  // ─── Individual actions ────────────────────────────────────
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const wasUnread =
        notifications.find((n) => n.id === id)?.isRead === false;
      try {
        await notificationsService.deleteNotification(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
        toast.success("Đã xoá thông báo");
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      }
    },
    [notifications],
  );

  // ─── Bulk actions ──────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    setActionLoading(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleDeleteAllRead = useCallback(async () => {
    setActionLoading(true);
    try {
      await notificationsService.deleteAllRead();
      await fetchData(1);
      toast.success("Đã xoá tất cả thông báo đã đọc");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const handleBatchMarkRead = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setActionLoading(true);
    try {
      await notificationsService.batchMarkAsRead(ids);
      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      const unreadSelected = notifications.filter(
        (n) => ids.includes(n.id) && !n.isRead,
      ).length;
      setUnreadCount((c) => Math.max(0, c - unreadSelected));
      setSelectedIds(new Set());
      toast.success(`Đã đánh dấu ${ids.length} thông báo đã đọc`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, notifications]);

  const handleBatchDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setActionLoading(true);
    try {
      await notificationsService.batchDelete(ids);
      const unreadDeleted = notifications.filter(
        (n) => ids.includes(n.id) && !n.isRead,
      ).length;
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      setUnreadCount((c) => Math.max(0, c - unreadDeleted));
      setSelectedIds(new Set());
      toast.success(`Đã xoá ${ids.length} thông báo`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, notifications]);

  // ─── Selection helpers ─────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === displayed.length && displayed.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map((n) => n.id)));
    }
  };

  // ─── Click notification ────────────────────────────────────
  const handleNotificationClick = useCallback(
    async (n: ApiNotification) => {
      if (!n.isRead) await handleMarkAsRead(n.id);
      setExpandedId((prev) => (prev === n.id ? null : n.id));
      if (n.actionUrl) {
        // nếu là internal route thì navigate, nếu external thì window.open
        if (n.actionUrl.startsWith("/")) navigate(n.actionUrl);
      }
    },
    [handleMarkAsRead, navigate],
  );

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl flex items-center gap-2">
          <Bell size={22} /> Hộp thư thông báo
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchData(currentPage)}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Đọc tất cả
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={handleDeleteAllRead}
              disabled={actionLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 size={14} /> Xoá đã đọc
            </button>
          )}
          {isAdminHR && (
            <button
              onClick={() => setShowSendPanel(!showSendPanel)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent flex items-center gap-1"
            >
              <Send size={14} /> Gửi thông báo
            </button>
          )}
        </div>
      </div>

      {/* Send Notification Panel (Admin/HR) */}
      {showSendPanel && isAdminHR && (
        <SendNotificationPanel
          onClose={() => setShowSendPanel(false)}
          onSent={() => {
            setShowSendPanel(false);
            fetchData(1);
          }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Tổng",
            value: totalCount,
            icon: <Bell size={18} className="text-blue-500" />,
            bg: "bg-blue-50 dark:bg-blue-900/10",
          },
          {
            label: "Chưa đọc",
            value: unreadCount,
            icon: <Mail size={18} className="text-orange-500" />,
            bg: "bg-orange-50 dark:bg-orange-900/10",
          },
          {
            label: "Đã đọc",
            value: readCount,
            icon: <MailOpen size={18} className="text-green-500" />,
            bg: "bg-green-50 dark:bg-green-900/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}
            >
              {s.icon}
            </div>
            <div>
              <div className="text-[0.6875rem] text-muted-foreground">{s.label}</div>
              <div className="text-xl">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Read/unread toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "unread", "read"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setReadFilter(f);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs transition-colors ${readFilter === f ? "bg-blue-600 text-white" : "bg-card hover:bg-accent"}`}
            >
              {f === "all" ? "Tất cả" : f === "unread" ? "Chưa đọc" : "Đã đọc"}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-xs"
        >
          <option value="">Tất cả loại</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm thông báo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-input-background text-xs"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setReadFilter("all");
              setCategoryFilter("");
              setSearchTerm("");
            }}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent"
          >
            Xoá lọc
          </button>
        )}
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between gap-2">
          <span className="text-[0.8125rem] text-blue-700 dark:text-blue-400">
            Đã chọn {selectedIds.size} thông báo
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchMarkRead}
              disabled={actionLoading}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}{" "}
              Đánh dấu đã đọc
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={actionLoading}
              className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 size={12} /> Xoá
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-accent"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Select all bar */}
      {displayed.length > 0 && !loading && (
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.size === displayed.length && displayed.length > 0 ? "bg-blue-600 border-blue-600 text-white" : "border-border"}`}
            >
              {selectedIds.size === displayed.length &&
                displayed.length > 0 && <Check size={10} />}
            </div>
            Chọn tất cả ({displayed.length})
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-[0.8125rem]">Đang tải thông báo...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
            <Bell size={28} className="text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">
            Không có thông báo nào
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {hasFilters
              ? "Thử thay đổi bộ lọc để xem kết quả khác"
              : "Bạn sẽ nhận thông báo khi có cập nhật mới"}
          </div>
        </div>
      ) : (
        /* Notification groups */
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateGroup, items]) => (
            <div key={dateGroup}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {dateGroup}
                </span>
                <div className="flex-1 border-t border-border" />
                <span className="text-[0.6875rem] text-muted-foreground">
                  {items.length}
                </span>
              </div>

              {/* Notification list */}
              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                {items.map((n) => {
                  const isSelected = selectedIds.has(n.id);
                  const isExpanded = expandedId === n.id;
                  const typeColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL;

                  return (
                    <div
                      key={n.id}
                      className={`transition-colors ${!n.isRead ? "bg-blue-50/50 dark:bg-blue-900/5" : ""} ${isSelected ? "bg-blue-100/50 dark:bg-blue-900/15" : ""}`}
                    >
                      <div className="flex items-start gap-3 p-4">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(n.id)}
                          className="mt-0.5 shrink-0"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-border hover:border-blue-400"}`}
                          >
                            {isSelected && <Check size={10} />}
                          </div>
                        </button>

                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? "bg-blue-100 dark:bg-blue-900/20" : "bg-muted"}`}
                        >
                          {getTypeIcon(n.type)}
                        </div>

                        {/* Content */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span
                              className={`text-[0.625rem] px-1.5 py-0.5 rounded ${typeColor}`}
                            >
                              {n.typeLabel}
                            </span>
                            <span className="text-[0.625rem] text-muted-foreground">
                              {relativeTime(n.createdAt)}
                            </span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>

                          <div
                            className={`text-[0.8125rem] ${!n.isRead ? "font-medium" : "text-muted-foreground"}`}
                          >
                            {n.title}
                          </div>
                          <div
                            className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? "" : "line-clamp-2"}`}
                          >
                            {n.message}
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs">
                              {n.sender && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.5625rem] shrink-0">
                                    {n.sender.fullName
                                      .split(" ")
                                      .slice(-1)[0]?.[0] ?? "?"}
                                  </div>
                                  <span className="text-muted-foreground">
                                    Từ:{" "}
                                    <span className="text-foreground">
                                      {n.sender.fullName}
                                    </span>
                                  </span>
                                </div>
                              )}
                              <div className="text-muted-foreground">
                                Ngày gửi:{" "}
                                <span className="text-foreground">
                                  {new Date(n.createdAt).toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                              </div>
                              {n.isRead && n.readAt && (
                                <div className="text-muted-foreground">
                                  Đã đọc:{" "}
                                  <span className="text-foreground">
                                    {new Date(n.readAt).toLocaleString("vi-VN")}
                                  </span>
                                </div>
                              )}
                              {n.actionUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (n.actionUrl!.startsWith("/"))
                                      navigate(n.actionUrl!);
                                    else window.open(n.actionUrl!, "_blank");
                                  }}
                                  className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  Xem chi tiết →
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                              title="Đánh dấu đã đọc"
                              className="p-1.5 rounded-lg hover:bg-accent text-blue-500"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(n.id);
                            }}
                            title="Xoá"
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Trang {currentPage}/{totalPages} — {totalCount} thông báo
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50 flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <button
                  onClick={() => fetchData(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50 flex items-center gap-1"
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Send Notification Panel (Admin / HR only)
// POST /api/notifications/admin/send
// ═══════════════════════════════════════════════════════════════
function SendNotificationPanel({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [recipientIds, setRecipientIds] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] =
    useState<notificationsService.NotificationType>("GENERAL");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const ids = recipientIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) {
      toast.error("Nhập ít nhất 1 User ID người nhận");
      return;
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề thông báo");
      return;
    }
    if (!message.trim()) {
      toast.error("Nhập nội dung thông báo");
      return;
    }

    setSending(true);
    try {
      await notificationsService.sendManual({
        recipientUserIds: ids,
        type,
        title: title.trim(),
        message: message.trim(),
      });
      toast.success(`Đã gửi thông báo cho ${ids.length} người`);
      onSent();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể gửi thông báo",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm flex items-center gap-2">
          <Send size={14} className="text-blue-600" /> Gửi thông báo thủ công
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          User ID người nhận * (phân cách bởi dấu phẩy hoặc dòng mới)
        </label>
        <textarea
          value={recipientIds}
          onChange={(e) => setRecipientIds(e.target.value)}
          rows={2}
          placeholder="user-id-1, user-id-2, ..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Loại thông báo
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as notificationsService.NotificationType)
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
          >
            <option value="GENERAL">Thông báo chung</option>
            <option value="PAYROLL_READY">Bảng lương sẵn sàng</option>
            <option value="PAYSLIP_AVAILABLE">Phiếu lương đã có</option>
            <option value="CONTRACT_EXPIRING_SOON">Hợp đồng sắp hết hạn</option>
            <option value="LEAVE_BALANCE_LOW">Số dư phép thấp</option>
            <option value="PROJECT_ASSIGNED">Gán dự án</option>
            <option value="COMPENSATION_CHANGED">Lương được điều chỉnh</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Tiêu đề *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề thông báo..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Nội dung *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Nội dung chi tiết của thông báo..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent"
        >
          Huỷ
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Gửi thông báo
        </button>
      </div>
    </div>
  );
}
