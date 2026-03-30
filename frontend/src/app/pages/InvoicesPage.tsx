// ================================================================
// INVOICES PAGE + PAYMENTS PAGE — Module 9 (Full API integration)
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Receipt,
  Plus,
  Search,
  X,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingUp,
  Send,
  Eye,
  Ban,
  MessageSquare,
  CreditCard,
  Banknote,
  ArrowDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import * as clientsService from "../../lib/services/clients.service";
import type {
  ApiInvoice,
  ApiPayment,
  ApiInvoiceItem,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
} from "../../lib/services/clients.service";
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

// ─── Constants ────────────────────────────────────────────────
const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  VIEWED:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  PARTIALLY_PAID:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DISPUTED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
};
const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Bản nháp",
  SENT: "Đã gửi",
  VIEWED: "Đã xem",
  PARTIALLY_PAID: "Thanh toán 1 phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  DISPUTED: "Tranh chấp",
  CANCELLED: "Đã huỷ",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};
const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn",
};
const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản",
  CASH: "Tiền mặt",
  CHECK: "Séc",
  CREDIT_CARD: "Thẻ tín dụng",
  ONLINE: "Trực tuyến",
  CRYPTO: "Crypto",
};

// ═══════════════════════════════════════════════════════════════
// InvoicesPage
// ═══════════════════════════════════════════════════════════════
export function InvoicesPage() {
  const { can } = useAuth();
  const canManage = can("ADMIN", "ACCOUNTANT", "MANAGER");

  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selected, setSelected] = useState<ApiInvoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchInvoices = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await clientsService.listInvoices({
          page: p,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
          ...(statusFilter && { status: statusFilter as InvoiceStatus }),
          ...(overdueOnly && { overdueOnly: true }),
        });
        setInvoices(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, overdueOnly],
  );

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const detail = await clientsService.getInvoiceById(id);
      setSelected(detail);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }, []);

  const displayed = useMemo(() => {
    if (!search) return invoices;
    const s = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceCode?.toLowerCase().includes(s) ||
        inv.client?.companyName.toLowerCase().includes(s),
    );
  }, [invoices, search]);

  const stats = useMemo(
    () => ({
      totalAmount: invoices.reduce((s, i) => s + i.totalAmount, 0),
      outstanding: invoices.reduce((s, i) => s + i.outstandingAmount, 0),
      overdue: invoices.filter((i) => i.isOverdue).length,
      paid: invoices.filter((i) => i.status === "PAID").length,
    }),
    [invoices],
  );

  const handleCreate = async (
    payload: Parameters<typeof clientsService.createInvoice>[0],
  ) => {
    try {
      await clientsService.createInvoice(payload);
      toast.success("Đã tạo hóa đơn mới");
      setShowCreate(false);
      fetchInvoices(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể tạo");
    }
  };

  const handleAction = async (
    id: string,
    action: "send" | "cancel" | "viewed",
  ) => {
    try {
      if (action === "send") await clientsService.sendInvoice(id);
      else if (action === "cancel") await clientsService.cancelInvoice(id);
      else await clientsService.markInvoiceViewed(id);
      toast.success("Đã cập nhật hóa đơn");
      fetchInvoices(page);
      if (selected?.id === id) loadDetail(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl flex items-center gap-2">
          <Receipt size={22} className="text-blue-600" /> Hóa đơn
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchInvoices(page)}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1 hover:bg-blue-700"
            >
              <Plus size={16} /> Tạo hóa đơn
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Tổng giá trị",
            value: fmtVND(stats.totalAmount),
            color: "text-blue-600",
            icon: <Receipt size={16} className="text-blue-500" />,
          },
          {
            label: "Chưa thu",
            value: fmtVND(stats.outstanding),
            color: stats.outstanding > 0 ? "text-red-500" : "text-green-600",
            icon: <DollarSign size={16} className="text-orange-500" />,
          },
          {
            label: "Quá hạn",
            value: String(stats.overdue),
            color: stats.overdue > 0 ? "text-red-500" : "text-muted-foreground",
            icon: <AlertTriangle size={16} className="text-red-500" />,
          },
          {
            label: "Đã thanh toán",
            value: String(stats.paid),
            color: "text-green-600",
            icon: <CheckCircle2 size={16} className="text-green-500" />,
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
              <div className="text-[0.625rem] text-muted-foreground">{s.label}</div>
              <div className={`text-base ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm mã, khách hàng..."
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
          {Object.entries(invoiceStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`px-3 py-2 rounded-lg border text-[0.8125rem] flex items-center gap-1 ${overdueOnly ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20" : "border-border hover:bg-accent"}`}
        >
          <AlertTriangle size={13} /> Quá hạn
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[0.8125rem]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground">
                    Hóa đơn
                  </th>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden md:table-cell">
                    Khách hàng
                  </th>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-right px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                    Tổng tiền
                  </th>
                  <th className="text-right px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                    Còn lại
                  </th>
                  <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground hidden xl:table-cell">
                    Hạn
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => loadDetail(inv.id)}
                    className={`border-t border-border hover:bg-accent/50 cursor-pointer ${inv.isOverdue ? "bg-red-50/20 dark:bg-red-900/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {inv.invoiceCode ?? "—"}
                      </div>
                      <div className="text-[0.6875rem] text-muted-foreground">
                        {fmtDate(inv.issuedDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">
                      {inv.client?.shortName ?? inv.client?.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[0.625rem] px-2 py-0.5 rounded-full w-fit ${invoiceStatusColors[inv.status]}`}
                        >
                          {invoiceStatusLabels[inv.status]}
                        </span>
                        {inv.isOverdue && inv.daysOverdue != null && (
                          <span className="text-[0.625rem] text-red-500">
                            Quá {inv.daysOverdue} ngày
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {fmtVND(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span
                        className={
                          inv.outstandingAmount > 0
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }
                      >
                        {fmtVND(inv.outstandingAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden xl:table-cell">
                      {fmtDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                      />
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Chưa có hóa đơn
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} hóa đơn</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => fetchInvoices(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-border text-[0.6875rem] disabled:opacity-50 hover:bg-accent"
                >
                  Trước
                </button>
                <span className="px-2 py-1 text-[0.6875rem]">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchInvoices(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-border text-[0.6875rem] disabled:opacity-50 hover:bg-accent"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
      {showCreate && (
        <InvoiceFormDialog
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}

// ─── InvoiceDetailModal ────────────────────────────────────────
function InvoiceDetailModal({
  invoice: inv,
  canManage,
  onClose,
  onAction,
}: {
  invoice: ApiInvoice;
  canManage: boolean;
  onClose: () => void;
  onAction: (id: string, action: "send" | "cancel" | "viewed") => void;
}) {
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const handleDispute = async () => {
    if (!disputeReason.trim() || disputeReason.trim().length < 10) {
      toast.error("Lý do tranh chấp phải ít nhất 10 ký tự");
      return;
    }
    try {
      await clientsService.disputeInvoice(inv.id, disputeReason.trim());
      toast.success("Đã ghi nhận tranh chấp");
      setDisputeMode(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.8125rem] font-mono font-medium">
                  {inv.invoiceCode ?? "—"}
                </span>
                <span
                  className={`text-[0.625rem] px-2 py-0.5 rounded-full ${invoiceStatusColors[inv.status]}`}
                >
                  {invoiceStatusLabels[inv.status]}
                </span>
                {inv.isOverdue && (
                  <span className="text-[0.625rem] text-red-500 flex items-center gap-0.5">
                    <AlertTriangle size={9} />
                    Quá hạn {inv.daysOverdue} ngày
                  </span>
                )}
              </div>
              <div className="text-sm mt-1">
                {inv.client?.companyName ?? "—"}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Tổng tiền",
                value: fmtVND(inv.totalAmount),
                color: "text-foreground",
              },
              {
                label: "Đã trả",
                value: fmtVND(inv.paidAmount),
                color: "text-green-600",
              },
              {
                label: "Còn lại",
                value: fmtVND(inv.outstandingAmount),
                color:
                  inv.outstandingAmount > 0
                    ? "text-red-500"
                    : "text-muted-foreground",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-muted/30 rounded-lg p-2.5 text-center"
              >
                <div className="text-[0.625rem] text-muted-foreground">
                  {s.label}
                </div>
                <div className={`text-sm ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Ngày phát hành
              </div>
              {fmtDate(inv.issuedDate)}
            </div>
            <div>
              <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                Hạn thanh toán
              </div>
              {fmtDate(inv.dueDate)}
            </div>
            {inv.contract && (
              <div>
                <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                  Hợp đồng
                </div>
                {inv.contract.title}
              </div>
            )}
            {inv.project && (
              <div>
                <div className="text-[0.6875rem] text-muted-foreground mb-0.5">
                  Dự án
                </div>
                {inv.project.projectName}
              </div>
            )}
          </div>

          {/* Line items */}
          {inv.items && inv.items.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Chi tiết dòng hàng
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-[0.6875rem] text-muted-foreground">
                        Mô tả
                      </th>
                      <th className="text-right px-3 py-2 text-[0.6875rem] text-muted-foreground">
                        SL
                      </th>
                      <th className="text-right px-3 py-2 text-[0.6875rem] text-muted-foreground">
                        Đơn giá
                      </th>
                      <th className="text-right px-3 py-2 text-[0.6875rem] text-muted-foreground">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtVND(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtVND(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right text-muted-foreground"
                      >
                        Thuế (
                        {((inv.items[0]?.taxRate ?? 0.1) * 100).toFixed(0)}%)
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtVND(inv.taxAmount)}
                      </td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right font-medium"
                      >
                        Tổng cộng
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">
                        {fmtVND(inv.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {inv.notes && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              {inv.notes}
            </div>
          )}

          {/* Dispute form */}
          {disputeMode && (
            <div className="space-y-2 pt-2 border-t border-border">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Lý do tranh chấp (ít nhất 10 ký tự)..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-orange-300 bg-input-background text-[0.8125rem] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setDisputeMode(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-[0.8125rem]"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleDispute}
                  className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-[0.8125rem]"
                >
                  Ghi nhận tranh chấp
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {canManage && !disputeMode && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {inv.status === "DRAFT" && (
                <button
                  onClick={() => onAction(inv.id, "send")}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-700"
                >
                  <Send size={12} /> Gửi hóa đơn
                </button>
              )}
              {!["CANCELLED", "PAID", "DISPUTED"].includes(inv.status) && (
                <button
                  onClick={() => setDisputeMode(true)}
                  className="px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 rounded-lg text-xs flex items-center gap-1"
                >
                  <MessageSquare size={12} /> Tranh chấp
                </button>
              )}
              {!["CANCELLED", "PAID"].includes(inv.status) && (
                <button
                  onClick={() => onAction(inv.id, "cancel")}
                  className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 rounded-lg text-xs flex items-center gap-1"
                >
                  <Ban size={12} /> Huỷ
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── InvoiceFormDialog (simplified) ───────────────────────────
function InvoiceFormDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.createInvoice>[0]) => void;
}) {
  const [form, setForm] = useState({
    clientId: "",
    issuedDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
  });
  const [items, setItems] = useState([
    {
      description: "",
      quantity: "1",
      unitPrice: "",
      taxRate: "0.1",
      unit: "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: "1",
        unitPrice: "",
        taxRate: "0.1",
        unit: "",
      },
    ]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.clientId.trim() || !form.issuedDate || !form.dueDate) {
      toast.error("Điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (items.some((it) => !it.description.trim() || !it.unitPrice)) {
      toast.error("Điền đầy đủ thông tin dòng hàng");
      return;
    }
    setSubmitting(true);
    await onSave({
      clientId: form.clientId.trim(),
      issuedDate: form.issuedDate,
      dueDate: form.dueDate,
      notes: form.notes || null,
      items: items.map((it, i) => ({
        description: it.description.trim(),
        quantity: parseFloat(it.quantity) || 1,
        unitPrice: parseFloat(it.unitPrice) || 0,
        taxRate: parseFloat(it.taxRate) || 0.1,
        unit: it.unit || null,
        displayOrder: i,
      })),
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Tạo hóa đơn mới</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                ID Khách hàng *
              </label>
              <input
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientId: e.target.value }))
                }
                placeholder="Client ID"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày phát hành *
              </label>
              <input
                type="date"
                value={form.issuedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issuedDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Hạn thanh toán *
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.8125rem] font-medium">Dòng hàng</div>
              <button
                onClick={addItem}
                className="px-2 py-1 text-[0.6875rem] border border-border rounded hover:bg-accent flex items-center gap-1"
              >
                <Plus size={11} /> Thêm dòng
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) =>
                          j === i ? { ...it, description: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Mô tả dịch vụ/hàng hoá *"
                    className="col-span-5 px-3 py-2 rounded-lg border border-border bg-input-background text-xs"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) =>
                          j === i ? { ...it, quantity: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="SL"
                    className="col-span-2 px-3 py-2 rounded-lg border border-border bg-input-background text-xs"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) =>
                          j === i ? { ...it, unitPrice: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Đơn giá *"
                    className="col-span-3 px-3 py-2 rounded-lg border border-border bg-input-background text-xs"
                  />
                  <input
                    type="number"
                    value={item.taxRate}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) =>
                          j === i ? { ...it, taxRate: e.target.value } : it,
                        ),
                      )
                    }
                    placeholder="Thuế"
                    step={0.01}
                    className="col-span-1 px-2 py-2 rounded-lg border border-border bg-input-background text-xs"
                  />
                  <button
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="col-span-1 p-2 rounded hover:bg-red-100 text-red-500 disabled:opacity-30"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none"
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
            Tạo hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PaymentsPage
// ═══════════════════════════════════════════════════════════════
export function PaymentsPage() {
  const { can } = useAuth();
  const canManage = can("ADMIN", "ACCOUNTANT", "MANAGER");

  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchPayments = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await clientsService.listPayments({
          page: p,
          limit: 20,
          sortOrder: "desc",
          ...(statusFilter && { status: statusFilter as PaymentStatus }),
          ...(methodFilter && { method: methodFilter as PaymentMethod }),
        });
        setPayments(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, methodFilter],
  );

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleCreate = async (
    payload: Parameters<typeof clientsService.recordPayment>[0],
  ) => {
    try {
      await clientsService.recordPayment(payload);
      toast.success("Đã ghi nhận thanh toán");
      setShowCreate(false);
      fetchPayments(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể ghi nhận");
    }
  };

  const handleRefund = async (id: string) => {
    try {
      await clientsService.refundPayment(id);
      toast.success("Đã ghi nhận hoàn tiền");
      fetchPayments(page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const stats = useMemo(
    () => ({
      totalCompleted: payments
        .filter((p) => p.status === "COMPLETED")
        .reduce((s, p) => s + p.amountInVnd, 0),
      pending: payments.filter((p) => p.status === "PENDING").length,
      refunded: payments
        .filter((p) => p.status === "REFUNDED")
        .reduce((s, p) => s + p.amountInVnd, 0),
    }),
    [payments],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl flex items-center gap-2">
          <CreditCard size={22} className="text-blue-600" /> Thanh toán
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchPayments(page)}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1 hover:bg-blue-700"
            >
              <Plus size={16} /> Ghi nhận TT
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Tổng đã nhận",
            value: fmtVND(stats.totalCompleted),
            color: "text-green-600",
            icon: <ArrowDownLeft size={16} className="text-green-500" />,
          },
          {
            label: "Đang xử lý",
            value: String(stats.pending),
            color: "text-yellow-600",
            icon: <Clock size={16} className="text-yellow-500" />,
          },
          {
            label: "Đã hoàn tiền",
            value: fmtVND(stats.refunded),
            color: "text-orange-600",
            icon: <TrendingUp size={16} className="text-orange-500" />,
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
              <div className="text-[0.625rem] text-muted-foreground">{s.label}</div>
              <div className={`text-base ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(paymentStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
        >
          <option value="">Tất cả phương thức</option>
          {Object.entries(paymentMethodLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[0.8125rem]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground">
                    Mã TT
                  </th>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden md:table-cell">
                    Khách hàng
                  </th>
                  <th className="text-right px-4 py-3 text-[0.6875rem] text-muted-foreground">
                    Số tiền
                  </th>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                    Phương thức
                  </th>
                  <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                    Hóa đơn
                  </th>
                  <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground hidden xl:table-cell">
                    Ngày
                  </th>
                  <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground">
                    Trạng thái
                  </th>
                  {canManage && <th className="px-4 py-3 w-20" />}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-accent/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {p.paymentCode ?? "—"}
                      </div>
                      {p.referenceNumber && (
                        <div className="text-[0.625rem] text-muted-foreground">
                          {p.referenceNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">
                      {p.client?.shortName ?? p.client?.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-green-600">
                        {fmtVND(p.amountInVnd)}
                      </div>
                      {p.currency !== "VND" && (
                        <div className="text-[0.625rem] text-muted-foreground">
                          {p.amount} {p.currency}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Banknote size={12} className="text-muted-foreground" />
                        {paymentMethodLabels[p.paymentMethod]}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {p.invoice?.invoiceCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden xl:table-cell">
                      {fmtDate(p.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[0.625rem] px-2 py-0.5 rounded-full ${paymentStatusColors[p.status]}`}
                      >
                        {paymentStatusLabels[p.status]}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        {p.status === "COMPLETED" && (
                          <button
                            onClick={() => handleRefund(p.id)}
                            className="text-[0.6875rem] px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 hover:bg-orange-200"
                          >
                            Hoàn tiền
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Chưa có thanh toán
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} thanh toán</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPayments(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-border text-[0.6875rem] disabled:opacity-50 hover:bg-accent"
                >
                  Trước
                </button>
                <span className="px-2 py-1 text-[0.6875rem]">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchPayments(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-border text-[0.6875rem] disabled:opacity-50 hover:bg-accent"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <AddPaymentDialog
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}

// ─── AddPaymentDialog ─────────────────────────────────────────
function AddPaymentDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.recordPayment>[0]) => void;
}) {
  const [form, setForm] = useState({
    clientId: "",
    invoiceId: "",
    contractId: "",
    amount: "",
    currency: "VND",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "BANK_TRANSFER" as PaymentMethod,
    referenceNumber: "",
    receivedBankName: "",
    receivedAccountNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.clientId.trim() || !form.amount || !form.paymentDate) {
      toast.error("Nhập đầy đủ thông tin bắt buộc");
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    setSubmitting(true);
    await onSave({
      clientId: form.clientId.trim(),
      invoiceId: form.invoiceId || null,
      contractId: form.contractId || null,
      amount: amt,
      currency: form.currency,
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber || null,
      receivedBankName: form.receivedBankName || null,
      receivedAccountNumber: form.receivedAccountNumber || null,
      notes: form.notes || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Ghi nhận thanh toán</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                ID Khách hàng *
              </label>
              <input
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientId: e.target.value }))
                }
                placeholder="Client ID"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                ID Hóa đơn
              </label>
              <input
                value={form.invoiceId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, invoiceId: e.target.value }))
                }
                placeholder="Invoice ID (tuỳ chọn)"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Số tiền *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày thanh toán *
              </label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Phương thức *
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paymentMethod: e.target.value as PaymentMethod,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            >
              {Object.entries(paymentMethodLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Số tham chiếu
              </label>
              <input
                value={form.referenceNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referenceNumber: e.target.value }))
                }
                placeholder="Mã GD ngân hàng..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngân hàng nhận
              </label>
              <input
                value={form.receivedBankName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, receivedBankName: e.target.value }))
                }
                placeholder="Vietcombank..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none"
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
            Ghi nhận
          </button>
        </div>
      </div>
    </div>
  );
}
