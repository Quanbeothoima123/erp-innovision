// ================================================================
// CONTRACTS PAGE — Module 9 (Full API integration)
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  Plus,
  Search,
  X,
  Edit2,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingUp,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import * as clientsService from "../../lib/services/clients.service";
import type {
  ApiContract,
  ApiAmendment,
  ContractStatus,
  ContractType,
  AmendmentStatus,
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
const contractStatusColors: Record<ContractStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  PENDING_SIGN:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SUSPENDED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  EXPIRED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};
const contractStatusLabels: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_SIGN: "Chờ ký",
  ACTIVE: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  TERMINATED: "Chấm dứt",
  SUSPENDED: "Tạm dừng",
  EXPIRED: "Hết hạn",
};
const contractTypeLabels: Record<ContractType, string> = {
  FIXED_PRICE: "Trọn gói",
  TIME_AND_MATERIAL: "Thời gian & Vật liệu",
  RETAINER: "Dịch vụ thuê bao",
  MILESTONE_BASED: "Theo mốc",
  MIXED: "Kết hợp",
};

// ═══════════════════════════════════════════════════════════════
// ContractsPage
// ═══════════════════════════════════════════════════════════════
export function ContractsPage() {
  const { can } = useAuth();
  const canManage = can("ADMIN", "MANAGER", "SALES");

  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [selected, setSelected] = useState<ApiContract | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editContract, setEditContract] = useState<ApiContract | null>(null);

  const fetchContracts = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await clientsService.listContracts({
          page: p,
          limit: 20,
          sortOrder: "desc",
          ...(statusFilter && { status: statusFilter as ContractStatus }),
          ...(typeFilter && { contractType: typeFilter as ContractType }),
          ...(expiringFilter && { expiringDays: 30 }),
        });
        setContracts(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter, expiringFilter],
  );

  useEffect(() => {
    fetchContracts(1);
  }, [fetchContracts]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const detail = await clientsService.getContractById(id);
      setSelected(detail);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }, []);

  // Client-side search filter
  const displayed = useMemo(() => {
    if (!search) return contracts;
    const s = search.toLowerCase();
    return contracts.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        c.contractCode?.toLowerCase().includes(s) ||
        c.client?.companyName.toLowerCase().includes(s),
    );
  }, [contracts, search]);

  // Stats
  const stats = useMemo(
    () => ({
      active: contracts.filter((c) => c.status === "ACTIVE").length,
      expiringSoon: contracts.filter((c) => c.isExpiringSoon).length,
      totalValue: contracts.reduce((s, c) => s + c.totalValue, 0),
      outstanding: contracts.reduce((s, c) => s + c.remainingAmount, 0),
    }),
    [contracts],
  );

  const handleCreate = async (
    payload: Parameters<typeof clientsService.createContract>[0],
  ) => {
    try {
      await clientsService.createContract(payload);
      toast.success("Đã tạo hợp đồng mới");
      setShowCreate(false);
      fetchContracts(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể tạo");
    }
  };

  const handleUpdate = async (
    id: string,
    payload: Parameters<typeof clientsService.updateContract>[1],
  ) => {
    try {
      await clientsService.updateContract(id, payload);
      toast.success("Đã cập nhật hợp đồng");
      setEditContract(null);
      fetchContracts(page);
      if (selected?.id === id) loadDetail(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleStatusChange = async (id: string, status: ContractStatus) => {
    try {
      await clientsService.updateContractStatus(id, { status });
      toast.success("Đã đổi trạng thái hợp đồng");
      fetchContracts(page);
      if (selected?.id === id) loadDetail(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleAddAmendment = async (
    contractId: string,
    payload: Parameters<typeof clientsService.addAmendment>[1],
  ) => {
    try {
      await clientsService.addAmendment(contractId, payload);
      toast.success("Đã thêm phụ lục");
      loadDetail(contractId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleDeleteAmendment = async (
    contractId: string,
    amendmentId: string,
  ) => {
    try {
      await clientsService.deleteAmendment(contractId, amendmentId);
      toast.success("Đã xoá phụ lục");
      loadDetail(contractId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2">
          <FileText size={22} className="text-blue-600" /> Hợp đồng
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchContracts(page)}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
            >
              <Plus size={16} /> Tạo hợp đồng
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Đang thực hiện",
            value: stats.active,
            color: "text-green-600",
            icon: <CheckCircle2 size={16} className="text-green-500" />,
          },
          {
            label: "Sắp hết hạn",
            value: stats.expiringSoon,
            color: "text-orange-600",
            icon: <AlertTriangle size={16} className="text-orange-500" />,
          },
          {
            label: "Tổng giá trị",
            value: fmtVND(stats.totalValue),
            color: "text-blue-600",
            icon: <DollarSign size={16} className="text-blue-500" />,
          },
          {
            label: "Còn phải thu",
            value: fmtVND(stats.outstanding),
            color: stats.outstanding > 0 ? "text-red-500" : "text-green-600",
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
              <div className={`text-[16px] ${s.color}`}>{s.value}</div>
            </div>
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
            placeholder="Tìm tiêu đề, mã, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(contractStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(contractTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => setExpiringFilter(!expiringFilter)}
          className={`px-3 py-2 rounded-lg border text-[13px] flex items-center gap-1 ${expiringFilter ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20" : "border-border hover:bg-accent"}`}
        >
          <AlertTriangle size={13} /> Sắp hết hạn
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Hợp đồng
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Khách hàng
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Giá trị
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Thu được
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground hidden xl:table-cell">
                    Kết thúc
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      loadDetail(c.id);
                    }}
                    className={`border-t border-border hover:bg-accent/50 cursor-pointer ${c.isExpiringSoon ? "bg-orange-50/30 dark:bg-orange-900/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.contractCode && (
                            <span className="font-mono">
                              {c.contractCode} •{" "}
                            </span>
                          )}
                          {contractTypeLabels[c.contractType]}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] hidden md:table-cell">
                      {c.client?.shortName ?? c.client?.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${contractStatusColors[c.status]}`}
                        >
                          {contractStatusLabels[c.status]}
                        </span>
                        {c.isExpiringSoon && !c.isExpired && (
                          <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                            <AlertTriangle size={9} /> Còn {c.daysLeft} ngày
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {fmtVND(c.totalValue)}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <div className="text-[12px]">
                        {fmtVND(c.receivedAmount)}
                      </div>
                      {c.collectionPercent != null && (
                        <div className="text-[10px] text-muted-foreground">
                          {c.collectionPercent.toFixed(0)}%
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-muted-foreground hidden xl:table-cell">
                      {fmtDate(c.endDate)}
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
                      Chưa có hợp đồng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} hợp đồng</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => fetchContracts(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-border text-[11px] disabled:opacity-50 hover:bg-accent"
                >
                  Trước
                </button>
                <span className="px-2 py-1 text-[11px]">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchContracts(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-border text-[11px] disabled:opacity-50 hover:bg-accent"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <ContractDetailPanel
          contract={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onEdit={() => setEditContract(selected)}
          onStatusChange={(s) => handleStatusChange(selected.id, s)}
          onAddAmendment={(p) => handleAddAmendment(selected.id, p)}
          onDeleteAmendment={(aid) => handleDeleteAmendment(selected.id, aid)}
        />
      )}
      {showCreate && (
        <ContractFormDialog
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editContract && (
        <ContractFormDialog
          contract={editContract}
          onClose={() => setEditContract(null)}
          onSave={(p) => handleUpdate(editContract.id, p)}
        />
      )}
    </div>
  );
}

// ─── ContractDetailPanel ───────────────────────────────────────
function ContractDetailPanel({
  contract: c,
  canManage,
  onClose,
  onEdit,
  onStatusChange,
  onAddAmendment,
  onDeleteAmendment,
}: {
  contract: ApiContract;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (s: ContractStatus) => void;
  onAddAmendment: (
    p: Parameters<typeof clientsService.addAmendment>[1],
  ) => void;
  onDeleteAmendment: (id: string) => void;
}) {
  const [tab, setTab] = useState<"info" | "amendments">("info");
  const [showAddAmendment, setShowAddAmendment] = useState(false);

  const nextStatuses: ContractStatus[] =
    {
      DRAFT: ["PENDING_SIGN", "ACTIVE"],
      PENDING_SIGN: ["ACTIVE", "DRAFT"],
      ACTIVE: ["COMPLETED", "TERMINATED", "SUSPENDED"],
      SUSPENDED: ["ACTIVE", "TERMINATED"],
      COMPLETED: [],
      TERMINATED: [],
      EXPIRED: [],
    }[c.status] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {c.contractCode && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {c.contractCode}
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${contractStatusColors[c.status]}`}
              >
                {contractStatusLabels[c.status]}
              </span>
              {c.isExpiringSoon && (
                <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
                  <AlertTriangle size={9} />
                  Sắp hết hạn
                </span>
              )}
            </div>
            <h2 className="text-[18px] mt-1">{c.title}</h2>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {c.client?.companyName ?? "—"} •{" "}
              {contractTypeLabels[c.contractType]}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {canManage && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 border border-border rounded-lg text-[12px] hover:bg-accent flex items-center gap-1"
              >
                <Edit2 size={12} />
                Sửa
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-accent">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-border">
          {(["info", "amendments"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] border-b-2 transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground"}`}
            >
              {t === "info"
                ? "Thông tin"
                : `Phụ lục (${(c.amendments ?? []).length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                {[
                  { label: "Giá trị HĐ", value: fmtVND(c.totalValue) },
                  { label: "Đã thu", value: fmtVND(c.receivedAmount) },
                  { label: "Còn lại", value: fmtVND(c.remainingAmount) },
                  {
                    label: "Tỉ lệ thu",
                    value:
                      c.collectionPercent != null
                        ? `${c.collectionPercent.toFixed(1)}%`
                        : "—",
                  },
                  { label: "Ngày bắt đầu", value: fmtDate(c.startDate) },
                  { label: "Ngày kết thúc", value: fmtDate(c.endDate) },
                  { label: "Ngày ký", value: fmtDate(c.signedDate) },
                  { label: "Người ký", value: c.signedBy?.fullName ?? "—" },
                  { label: "Số hóa đơn", value: String(c.invoiceCount) },
                  { label: "Số phụ lục", value: String(c.amendmentCount) },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-[11px] text-muted-foreground mb-0.5">
                      {f.label}
                    </div>
                    <div>{f.value}</div>
                  </div>
                ))}
              </div>
              {c.description && (
                <div className="bg-muted/30 rounded-lg p-3 text-[12px] text-muted-foreground">
                  {c.description}
                </div>
              )}
              {canManage && nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-[12px] text-muted-foreground self-center">
                    Chuyển sang:
                  </span>
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(s)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg ${contractStatusColors[s]}`}
                    >
                      {contractStatusLabels[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "amendments" && (
            <div className="space-y-3">
              {canManage && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddAmendment(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Plus size={12} /> Thêm phụ lục
                  </button>
                </div>
              )}
              {(c.amendments ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-[13px]">
                  Chưa có phụ lục
                </div>
              ) : (
                (c.amendments ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-muted/20 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {a.amendmentCode}
                        </span>
                        <span className="text-[13px] font-medium">
                          {a.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${a.status === "SIGNED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600"}`}
                        >
                          {a.status === "SIGNED"
                            ? "Đã ký"
                            : a.status === "DRAFT"
                              ? "Nháp"
                              : a.status}
                        </span>
                      </div>
                      {canManage && a.status === "DRAFT" && (
                        <button
                          onClick={() => onDeleteAmendment(a.id)}
                          className="p-1 rounded hover:bg-red-100 text-red-500"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>Hiệu lực: {fmtDate(a.effectiveDate)}</span>
                      {a.valueChange != null && (
                        <span
                          className={
                            a.valueChange >= 0
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {a.valueChange >= 0 ? "+" : ""}
                          {fmtVND(a.valueChange)}
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <div className="text-[12px] text-muted-foreground">
                        {a.description}
                      </div>
                    )}
                  </div>
                ))
              )}
              {showAddAmendment && (
                <AmendmentFormDialog
                  onClose={() => setShowAddAmendment(false)}
                  onSave={(p) => {
                    onAddAmendment(p);
                    setShowAddAmendment(false);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AmendmentFormDialog ───────────────────────────────────────
function AmendmentFormDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.addAmendment>[1]) => void;
}) {
  const [form, setForm] = useState({
    amendmentCode: "",
    title: "",
    description: "",
    valueChange: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    status: "DRAFT" as AmendmentStatus,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Thêm phụ lục</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mã phụ lục *
              </label>
              <input
                value={form.amendmentCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amendmentCode: e.target.value }))
                }
                placeholder="PL-01"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày hiệu lực *
              </label>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Tiêu đề *
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Phụ lục bổ sung..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Thay đổi giá trị (VND, để trống = không thay đổi)
            </label>
            <input
              type="number"
              value={form.valueChange}
              onChange={(e) =>
                setForm((f) => ({ ...f, valueChange: e.target.value }))
              }
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
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
            onClick={() => {
              if (!form.amendmentCode.trim() || !form.title.trim()) {
                toast.error("Nhập mã và tiêu đề");
                return;
              }
              onSave({
                amendmentCode: form.amendmentCode.trim(),
                title: form.title.trim(),
                description: form.description || null,
                valueChange: form.valueChange
                  ? parseFloat(form.valueChange)
                  : null,
                effectiveDate: form.effectiveDate,
                status: form.status,
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ContractFormDialog ────────────────────────────────────────
function ContractFormDialog({
  contract,
  onClose,
  onSave,
}: {
  contract?: ApiContract;
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.createContract>[0]) => void;
}) {
  const [form, setForm] = useState({
    clientId: "",
    title: contract?.title ?? "",
    contractType: (contract?.contractType ?? "FIXED_PRICE") as ContractType,
    totalValue: contract?.totalValue?.toString() ?? "",
    currency: contract?.currency ?? "VND",
    startDate: contract?.startDate?.split("T")[0] ?? "",
    endDate: contract?.endDate?.split("T")[0] ?? "",
    signedDate: contract?.signedDate?.split("T")[0] ?? "",
    notes: contract?.notes ?? "",
    description: contract?.description ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (
      !form.title.trim() ||
      !form.totalValue ||
      !form.startDate ||
      !form.endDate
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (!contract && !form.clientId.trim()) {
      toast.error("Nhập ID khách hàng");
      return;
    }
    setSubmitting(true);
    await onSave({
      clientId: contract?.client?.id ?? form.clientId.trim(),
      title: form.title.trim(),
      contractType: form.contractType,
      totalValue: parseFloat(form.totalValue),
      currency: form.currency,
      startDate: form.startDate,
      endDate: form.endDate,
      signedDate: form.signedDate || null,
      notes: form.notes || null,
      description: form.description || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">
            {contract ? "Cập nhật hợp đồng" : "Tạo hợp đồng mới"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {!contract && (
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                ID Khách hàng *
              </label>
              <input
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientId: e.target.value }))
                }
                placeholder="Client ID..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] font-mono"
              />
            </div>
          )}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Tiêu đề hợp đồng *
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Hợp đồng cung cấp dịch vụ phần mềm..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Loại hợp đồng *
              </label>
              <select
                value={form.contractType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contractType: e.target.value as ContractType,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                {Object.entries(contractTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Giá trị (VND) *
              </label>
              <input
                type="number"
                value={form.totalValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalValue: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày bắt đầu *
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày kết thúc *
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Ngày ký
            </label>
            <input
              type="date"
              value={form.signedDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, signedDate: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
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
            )}
            {contract ? "Cập nhật" : "Tạo hợp đồng"}
          </button>
        </div>
      </div>
    </div>
  );
}
