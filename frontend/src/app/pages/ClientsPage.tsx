// ================================================================
// CLIENTS PAGE — Module 9 (Full API integration)
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Plus,
  Search,
  X,
  Edit2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import * as clientsService from "../../lib/services/clients.service";
import type {
  ApiClient,
  ApiContact,
  ClientStatus,
  ClientType,
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
const statusColors: Record<ClientStatus, string> = {
  PROSPECT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  BLACKLISTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const statusLabels: Record<ClientStatus, string> = {
  PROSPECT: "Tiềm năng",
  ACTIVE: "Đang hợp tác",
  INACTIVE: "Không hoạt động",
  BLACKLISTED: "Danh sách đen",
};
const typeLabels: Record<ClientType, string> = {
  INDIVIDUAL: "Cá nhân",
  COMPANY: "Công ty",
  GOVERNMENT: "Chính phủ",
  NGO: "Tổ chức phi lợi nhuận",
};

// ═══════════════════════════════════════════════════════════════
// ClientsPage
// ═══════════════════════════════════════════════════════════════
export function ClientsPage() {
  const { can } = useAuth();
  const canManage = can("ADMIN", "MANAGER", "SALES", "HR", "ACCOUNTANT");

  const [clients, setClients] = useState<ApiClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<ApiClient | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "info" | "contacts" | "finance"
  >("info");
  const [editClient, setEditClient] = useState<ApiClient | null>(null);

  const fetchClients = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await clientsService.listClients({
          page: p,
          limit: 20,
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter as ClientStatus }),
          ...(typeFilter && { clientType: typeFilter as ClientType }),
        });
        setClients(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, typeFilter],
  );

  useEffect(() => {
    fetchClients(1);
  }, [fetchClients]);

  // Load detail when selected
  const loadDetail = useCallback(async (id: string) => {
    try {
      const detail = await clientsService.getClientById(id);
      setSelected(detail);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }, []);

  const handleCreate = async (
    payload: Parameters<typeof clientsService.createClient>[0],
  ) => {
    try {
      await clientsService.createClient(payload);
      toast.success("Đã tạo khách hàng mới");
      setShowCreate(false);
      fetchClients(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể tạo");
    }
  };

  const handleUpdate = async (
    id: string,
    payload: Parameters<typeof clientsService.updateClient>[1],
  ) => {
    try {
      await clientsService.updateClient(id, payload);
      toast.success("Đã cập nhật khách hàng");
      setEditClient(null);
      fetchClients(page);
      if (selected?.id === id) loadDetail(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật");
    }
  };

  const handleStatusChange = async (id: string, status: ClientStatus) => {
    if (changingStatus) return;

    try {
      setChangingStatus(true);
      await clientsService.updateClientStatus(id, status);
      toast.success("Đã đổi trạng thái");
      await fetchClients(page);
      if (selected?.id === id) {
        await loadDetail(id);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddContact = async (
    clientId: string,
    payload: Parameters<typeof clientsService.addContact>[1],
  ) => {
    try {
      await clientsService.addContact(clientId, payload);
      toast.success("Đã thêm liên hệ");
      loadDetail(clientId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleDeleteContact = async (clientId: string, contactId: string) => {
    try {
      await clientsService.deleteContact(clientId, contactId);
      toast.success("Đã xoá liên hệ");
      loadDetail(clientId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleSetPrimary = async (clientId: string, contactId: string) => {
    try {
      await clientsService.setPrimaryContact(clientId, contactId);
      toast.success("Đã đặt làm liên hệ chính");
      loadDetail(clientId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  // Stats
  const stats = useMemo(
    () => ({
      total,
      active: clients.filter((c) => c.status === "ACTIVE").length,
      totalValue: clients.reduce((s, c) => s + c.totalContractValue, 0),
      outstanding: clients.reduce((s, c) => s + c.outstandingBalance, 0),
    }),
    [clients, total],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2">
          <Building2 size={22} className="text-blue-600" /> Khách hàng
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchClients(page)}
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
              <Plus size={16} /> Thêm khách hàng
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Tổng KH",
            value: total,
            color: "text-foreground",
            icon: <Building2 size={16} className="text-blue-500" />,
          },
          {
            label: "Đang hợp tác",
            value: stats.active,
            color: "text-green-600",
            icon: <CheckCircle2 size={16} className="text-green-500" />,
          },
          {
            label: "Tổng giá trị HĐ",
            value: fmtVND(stats.totalValue),
            color: "text-blue-600",
            icon: <DollarSign size={16} className="text-blue-500" />,
          },
          {
            label: "Còn nợ",
            value: fmtVND(stats.outstanding),
            color: stats.outstanding > 0 ? "text-red-500" : "text-green-600",
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
            placeholder="Tìm tên, mã, ngành..."
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
          {Object.entries(statusLabels).map(([k, v]) => (
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
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {(search || statusFilter || typeFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setTypeFilter("");
            }}
            className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent"
          >
            Xoá lọc
          </button>
        )}
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
                    Khách hàng
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Loại
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Tổng HĐ
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Còn nợ
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden xl:table-cell">
                    Quản lý
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      loadDetail(c.id);
                      setSelectedTab("info");
                    }}
                    className="border-t border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[12px] shrink-0 font-medium">
                          {c.companyName[0]}
                        </div>
                        <div>
                          <div className="font-medium">{c.companyName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.clientCode && (
                              <span className="font-mono">
                                {c.clientCode} •{" "}
                              </span>
                            )}
                            {c.industry ?? c.city ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">
                      {typeLabels[c.clientType]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[c.status]}`}
                      >
                        {statusLabels[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {fmtVND(c.totalContractValue)}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span
                        className={
                          c.outstandingBalance > 0
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }
                      >
                        {fmtVND(c.outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden xl:table-cell">
                      {c.accountManager?.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                      />
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Chưa có khách hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} khách hàng</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => fetchClients(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-border text-[11px] disabled:opacity-50 hover:bg-accent"
                >
                  Trước
                </button>
                <span className="px-3 py-1 text-[11px]">
                  Trang {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchClients(page + 1)}
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

      {/* Detail panel */}
      {selected && (
        <ClientDetailPanel
          client={selected}
          tab={selectedTab}
          setTab={setSelectedTab}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onEdit={() => setEditClient(selected)}
          onStatusChange={(s) => handleStatusChange(selected.id, s)}
          statusChanging={changingStatus}
          onAddContact={(p) => handleAddContact(selected.id, p)}
          onDeleteContact={(contactId) =>
            handleDeleteContact(selected.id, contactId)
          }
          onSetPrimary={(contactId) => handleSetPrimary(selected.id, contactId)}
        />
      )}

      {showCreate && (
        <ClientFormDialog
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editClient && (
        <ClientFormDialog
          client={editClient}
          onClose={() => setEditClient(null)}
          onSave={(p) => handleUpdate(editClient.id, p)}
        />
      )}
    </div>
  );
}

// ─── ClientDetailPanel ────────────────────────────────────────
function ClientDetailPanel({
  client: c,
  tab,
  setTab,
  canManage,
  onClose,
  onEdit,
  onStatusChange,
  statusChanging,
  onAddContact,
  onDeleteContact,
  onSetPrimary,
}: {
  client: ApiClient;
  tab: "info" | "contacts" | "finance";
  setTab: (t: "info" | "contacts" | "finance") => void;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (s: ClientStatus) => void;
  statusChanging: boolean;
  onAddContact: (p: Parameters<typeof clientsService.addContact>[1]) => void;
  onDeleteContact: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [showAddContact, setShowAddContact] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[18px] font-medium">
              {c.companyName[0]}
            </div>
            <div>
              <h2 className="text-[18px]">{c.companyName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {c.clientCode && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {c.clientCode}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[c.status]}`}
                >
                  {statusLabels[c.status]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {typeLabels[c.clientType]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 border border-border rounded-lg text-[12px] hover:bg-accent flex items-center gap-1"
              >
                <Edit2 size={12} /> Sửa
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-accent">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["info", "contacts", "finance"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] border-b-2 transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground"}`}
            >
              {t === "info"
                ? "Thông tin"
                : t === "contacts"
                  ? `Liên hệ (${(c.contacts ?? []).length})`
                  : "Tài chính"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                {[
                  {
                    label: "Ngành nghề",
                    value: c.industry ?? "—",
                    icon: <Building2 size={13} />,
                  },
                  {
                    label: "Website",
                    value: c.website ?? "—",
                    icon: <Globe size={13} />,
                  },
                  {
                    label: "Email",
                    value: c.email ?? "—",
                    icon: <Mail size={13} />,
                  },
                  {
                    label: "Điện thoại",
                    value: c.phone ?? "—",
                    icon: <Phone size={13} />,
                  },
                  {
                    label: "Địa chỉ",
                    value: c.address ?? "—",
                    icon: <MapPin size={13} />,
                  },
                  {
                    label: "Thành phố",
                    value: c.city ?? "—",
                    icon: <MapPin size={13} />,
                  },
                  {
                    label: "Quốc gia",
                    value: c.country,
                    icon: <Globe size={13} />,
                  },
                  {
                    label: "Mã số thuế",
                    value: c.taxCode ?? "—",
                    icon: <FileText size={13} />,
                  },
                  {
                    label: "Quản lý tài khoản",
                    value: c.accountManager?.fullName ?? "—",
                    icon: <User size={13} />,
                  },
                  {
                    label: "Ngày tạo",
                    value: fmtDate(c.createdAt),
                    icon: <FileText size={13} />,
                  },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5">
                      {f.icon}
                      {f.label}
                    </div>
                    <div className="truncate">{f.value}</div>
                  </div>
                ))}
              </div>
              {c.notes && (
                <div className="bg-muted/30 rounded-lg p-3 text-[12px] text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">
                    Ghi chú
                  </div>
                  {c.notes}
                </div>
              )}
              {/* Status change */}
              {canManage && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-[12px] text-muted-foreground self-center">
                    Đổi trạng thái:
                  </span>
                  {(
                    [
                      "PROSPECT",
                      "ACTIVE",
                      "INACTIVE",
                      "BLACKLISTED",
                    ] as ClientStatus[]
                  )
                    .filter((s) => s !== c.status)
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        disabled={statusChanging}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition-opacity flex items-center gap-1 ${
                          statusChanging
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:opacity-80"
                        } ${statusColors[s]}`}
                      >
                        {statusChanging ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Đang đổi...
                          </>
                        ) : (
                          <>→ {statusLabels[s]}</>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {tab === "contacts" && (
            <div className="space-y-3">
              {canManage && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Plus size={12} /> Thêm liên hệ
                  </button>
                </div>
              )}
              {(c.contacts ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-[13px]">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  Chưa có liên hệ nào
                </div>
              ) : (
                (c.contacts ?? []).map((ct) => (
                  <div
                    key={ct.id}
                    className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-[12px] shrink-0">
                      {ct.fullName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">
                          {ct.fullName}
                        </span>
                        {ct.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                            Chính
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {ct.jobTitle ?? ""}
                      </div>
                      <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                        {ct.email && (
                          <span className="flex items-center gap-0.5">
                            <Mail size={10} />
                            {ct.email}
                          </span>
                        )}
                        {ct.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone size={10} />
                            {ct.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        {!ct.isPrimary && (
                          <button
                            onClick={() => onSetPrimary(ct.id)}
                            className="px-2 py-1 text-[10px] border border-border rounded hover:bg-accent"
                          >
                            Đặt chính
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteContact(ct.id)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {showAddContact && (
                <AddContactDialog
                  onClose={() => setShowAddContact(false)}
                  onSave={(p) => {
                    onAddContact(p);
                    setShowAddContact(false);
                  }}
                />
              )}
            </div>
          )}

          {tab === "finance" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Tổng giá trị HĐ",
                  value: fmtVND(c.totalContractValue),
                  color: "text-blue-600",
                },
                {
                  label: "Đã nhận",
                  value: fmtVND(c.totalReceivedAmount),
                  color: "text-green-600",
                },
                {
                  label: "Còn nợ",
                  value: fmtVND(c.outstandingBalance),
                  color:
                    c.outstandingBalance > 0
                      ? "text-red-500"
                      : "text-muted-foreground",
                },
                {
                  label: "Số hợp đồng",
                  value: String(c.contractCount),
                  color: "text-foreground",
                },
                {
                  label: "Số hóa đơn",
                  value: String(c.invoiceCount),
                  color: "text-foreground",
                },
                {
                  label: "Số thanh toán",
                  value: String(c.paymentCount),
                  color: "text-foreground",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-muted/30 rounded-xl p-3 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {s.label}
                  </div>
                  <div className={`text-[16px] mt-1 ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AddContactDialog ──────────────────────────────────────────
function AddContactDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.addContact>[1]) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    isPrimary: false,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Thêm liên hệ</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {[
            {
              label: "Họ và tên *",
              key: "fullName",
              placeholder: "Nguyễn Văn A",
            },
            {
              label: "Chức vụ",
              key: "jobTitle",
              placeholder: "Giám đốc kinh doanh",
            },
            { label: "Email", key: "email", placeholder: "email@company.com" },
            { label: "Điện thoại", key: "phone", placeholder: "0901234567" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-[12px] text-muted-foreground mb-1">
                {f.label}
              </label>
              <input
                value={
                  (form as Record<string, string | boolean>)[f.key] as string
                }
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPrimary: e.target.checked }))
              }
            />
            Đặt làm liên hệ chính
          </label>
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
              if (!form.fullName.trim()) {
                toast.error("Nhập họ tên");
                return;
              }
              onSave({
                fullName: form.fullName,
                jobTitle: form.jobTitle || null,
                email: form.email || null,
                phone: form.phone || null,
                isPrimary: form.isPrimary,
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ClientFormDialog ──────────────────────────────────────────
function ClientFormDialog({
  client,
  onClose,
  onSave,
}: {
  client?: ApiClient;
  onClose: () => void;
  onSave: (p: Parameters<typeof clientsService.createClient>[0]) => void;
}) {
  const [form, setForm] = useState({
    clientType: (client?.clientType ?? "COMPANY") as ClientType,
    companyName: client?.companyName ?? "",
    shortName: client?.shortName ?? "",
    taxCode: client?.taxCode ?? "",
    industry: client?.industry ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    website: client?.website ?? "",
    country: client?.country ?? "Vietnam",
    notes: client?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      toast.error("Tên công ty là bắt buộc");
      return;
    }
    setSubmitting(true);
    await onSave({
      clientType: form.clientType,
      companyName: form.companyName.trim(),
      shortName: form.shortName || null,
      taxCode: form.taxCode || null,
      industry: form.industry || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      website: form.website || null,
      country: form.country,
      notes: form.notes || null,
    });
    setSubmitting(false);
  };

  const F = (
    label: string,
    key: keyof typeof form,
    placeholder?: string,
    type = "text",
  ) => (
    <div key={key}>
      <label className="block text-[12px] text-muted-foreground mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">
            {client ? "Cập nhật khách hàng" : "Thêm khách hàng"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Loại *
              </label>
              <select
                value={form.clientType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    clientType: e.target.value as ClientType,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {F("Tên công ty *", "companyName", "Công ty TNHH ABC")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {F("Tên viết tắt", "shortName", "ABC")}
            {F("Mã số thuế", "taxCode", "0123456789")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {F("Ngành nghề", "industry", "Công nghệ thông tin")}
            {F("Email", "email", "info@company.com", "email")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {F("Điện thoại", "phone", "028 1234 5678")}
            {F("Website", "website", "https://company.com")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {F("Thành phố", "city", "TP. Hồ Chí Minh")}
            {F("Quốc gia", "country", "Vietnam")}
          </div>
          {F("Địa chỉ", "address", "123 Nguyễn Huệ, Q.1")}
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
            {client ? "Cập nhật" : "Tạo khách hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
