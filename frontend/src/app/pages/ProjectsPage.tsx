// ================================================================
// PROJECTS PAGE — Module 8 (Full API integration)
// 3 exports: ProjectsPage, ProjectExpensesPage, ProjectHealthPage
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  X,
  Search,
  Plus,
  Edit2,
  Users,
  Target,
  DollarSign,
  Calendar,
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Activity,
  Send,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Gauge,
  Loader2,
  RefreshCw,
  BarChart3,
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
  Legend,
} from "recharts";
import * as projectsService from "../../lib/services/projects.service";
import * as clientsService from "../../lib/services/clients.service";
import * as usersService from "../../lib/services/users.service";
import type { ApiUser } from "../../lib/services/auth.service";
import type {
  ApiProject,
  ApiExpense,
  ApiProjectHealth,
  ProjectStatus,
  ProjectPriority,
  ProjectHealthStatus,
  ExpenseCategory,
  ExpenseStatus,
} from "../../lib/services/projects.service";
import { ApiError } from "../../lib/apiClient";

// ─── Helpers ──────────────────────────────────────────────────
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const fmtVNDShort = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
  return fmtVND(n);
};
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

// ─── Constants ────────────────────────────────────────────────
const healthColors: Record<string, string> = {
  ON_TRACK:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  AT_RISK:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELAYED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const healthLabels: Record<string, string> = {
  ON_TRACK: "Đúng tiến độ",
  AT_RISK: "Có rủi ro",
  DELAYED: "Chậm trễ",
};
const healthEmoji: Record<string, string> = {
  ON_TRACK: "🟢",
  AT_RISK: "🟡",
  DELAYED: "🔴",
};

const statusColors: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_HOLD:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
};
const statusLabels: Record<string, string> = {
  PLANNING: "Lập kế hoạch",
  ACTIVE: "Đang thực hiện",
  ON_HOLD: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Huỷ bỏ",
  ARCHIVED: "Lưu trữ",
};
const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const priorityLabels: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const expStatusColors: Record<string, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REIMBURSED:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};
const expStatusLabels: Record<string, string> = {
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  REIMBURSED: "Đã hoàn tiền",
};
const expCategoryLabels: Record<string, string> = {
  LABOR: "Nhân công",
  SOFTWARE: "Phần mềm",
  HARDWARE: "Phần cứng",
  TRAVEL: "Công tác phí",
  TRAINING: "Đào tạo",
  SUBCONTRACT: "Thuê ngoài",
  OTHER: "Khác",
};
const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

// ═══════════════════════════════════════════════════════════════
// 1. ProjectsPage — Danh sách dự án
// ═══════════════════════════════════════════════════════════════
export function ProjectsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const isAdminMgr = can("ADMIN", "MANAGER", "HR");

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<ApiProject | null>(null);

  const fetchProjects = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: projectsService.ListProjectsParams = {
          page: p,
          limit: 20,
          sortOrder: "desc",
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter as ProjectStatus }),
          ...(priorityFilter && {
            priority: priorityFilter as ProjectPriority,
          }),
          ...(healthFilter && {
            healthStatus: healthFilter as ProjectHealthStatus,
          }),
        };
        const res = await projectsService.listProjects(params);
        setProjects(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, priorityFilter, healthFilter],
  );

  useEffect(() => {
    fetchProjects(1);
  }, [fetchProjects]);

  const handleCreate = async (
    payload: Parameters<typeof projectsService.createProject>[0],
  ) => {
    try {
      await projectsService.createProject(payload);
      toast.success("Đã tạo dự án mới");
      setShowCreate(false);
      fetchProjects(1);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể tạo dự án",
      );
    }
  };

  const handleUpdate = async (
    id: string,
    payload: Parameters<typeof projectsService.updateProject>[1],
  ) => {
    try {
      await projectsService.updateProject(id, payload);
      toast.success("Đã cập nhật dự án");
      setEditProject(null);
      fetchProjects(page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật");
    }
  };

  // Stats
  const stats = useMemo(
    () => ({
      total,
      active: projects.filter((p) => p.status === "ACTIVE").length,
      atRisk: projects.filter(
        (p) => p.healthStatus === "AT_RISK" || p.healthStatus === "DELAYED",
      ).length,
      totalBudget: projects.reduce((s, p) => s + (p.budgetAmount ?? 0), 0),
    }),
    [projects, total],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px] flex items-center gap-2">
          <FolderKanban size={22} className="text-blue-600" /> Quản lý dự án
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchProjects(page)}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {isAdminMgr && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
            >
              <Plus size={16} /> Tạo dự án
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Tổng dự án",
            value: total,
            color: "text-foreground",
            icon: <FolderKanban size={16} className="text-blue-500" />,
          },
          {
            label: "Đang thực hiện",
            value: stats.active,
            color: "text-green-600",
            icon: <Activity size={16} className="text-green-500" />,
          },
          {
            label: "Có rủi ro",
            value: stats.atRisk,
            color: "text-red-500",
            icon: <AlertTriangle size={16} className="text-red-500" />,
          },
          {
            label: "Tổng ngân sách",
            value: fmtVNDShort(stats.totalBudget),
            color: "text-blue-600",
            icon: <DollarSign size={16} className="text-blue-500" />,
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
              <div className={`text-[18px] ${s.color}`}>{s.value}</div>
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
            placeholder="Tìm dự án, mã, khách hàng..."
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
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả ưu tiên</option>
          {Object.entries(priorityLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả sức khoẻ</option>
          {Object.entries(healthLabels).map(([k, v]) => (
            <option key={k} value={k}>{`${healthEmoji[k]} ${v}`}</option>
          ))}
        </select>
        {(search || statusFilter || priorityFilter || healthFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPriorityFilter("");
              setHealthFilter("");
            }}
            className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent"
          >
            Xoá lọc
          </button>
        )}
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <FolderKanban size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Chưa có dự án nào</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isAdminMgr={isAdminMgr}
              onClick={() => navigate(`/projects/${p.id}`)}
              onEdit={() => setEditProject(p)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">
            Trang {page}/{totalPages} — {total} dự án
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchProjects(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => fetchProjects(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <ProjectFormDialog
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          title="Tạo dự án mới"
        />
      )}
      {editProject && (
        <ProjectFormDialog
          project={editProject}
          onClose={() => setEditProject(null)}
          onSave={(payload) => handleUpdate(editProject.id, payload)}
          title="Cập nhật dự án"
        />
      )}
    </div>
  );
}

// ─── ProjectCard ───────────────────────────────────────────────
function ProjectCard({
  project: p,
  isAdminMgr,
  onClick,
  onEdit,
}: {
  project: ApiProject;
  isAdminMgr: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  const budgetPct = p.budgetUsedPercent ?? 0;
  const budgetBar = Math.min(100, budgetPct);
  const budgetColor =
    budgetPct > 90
      ? "bg-red-500"
      : budgetPct > 70
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.healthStatus && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${healthColors[p.healthStatus]}`}
              >
                {healthEmoji[p.healthStatus]} {healthLabels[p.healthStatus]}
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[p.status]}`}
            >
              {statusLabels[p.status]}
            </span>
          </div>
          <h3 className="text-[14px] font-medium truncate">{p.projectName}</h3>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {p.projectCode && (
              <span className="font-mono">{p.projectCode} • </span>
            )}
            {p.client?.shortName ?? p.client?.companyName ?? "Nội bộ"}
          </div>
        </div>
        {p.priority && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${priorityColors[p.priority]}`}
          >
            {priorityLabels[p.priority]}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Tiến độ</span>
          <span>{p.progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${p.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Budget */}
      {p.budgetAmount && (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Ngân sách</span>
            <span className={budgetPct > 90 ? "text-red-500" : ""}>
              {budgetPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${budgetColor}`}
              style={{ width: `${budgetBar}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Đã dùng: {fmtVNDShort(p.spentAmount)}</span>
            <span>Tổng: {fmtVNDShort(p.budgetAmount)}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users size={11} /> {p.activeMemberCount}
          </span>
          <span className="flex items-center gap-1">
            <Target size={11} /> {p.milestoneCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {p.endDate && (
            <span className="flex items-center gap-0.5">
              <Calendar size={10} /> {fmtDate(p.endDate)}
            </span>
          )}
          <span
            className="ml-1 flex items-center gap-0.5 text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <ChevronRight size={12} />
          </span>
        </div>
      </div>

      {/* PM */}
      {p.projectManager && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">
            {p.projectManager.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
          </div>
          <span>PM: {p.projectManager.fullName}</span>
        </div>
      )}
    </div>
  );
}

// ─── ProjectFormDialog ─────────────────────────────────────────
function ProjectFormDialog({
  project,
  title,
  onClose,
  onSave,
}: {
  project?: ApiProject;
  title: string;
  onClose: () => void;
  onSave: (
    payload: Parameters<typeof projectsService.createProject>[0],
  ) => Promise<void>;
}) {
  const [form, setForm] = useState({
    projectName: project?.projectName ?? "",
    projectCode: project?.projectCode ?? "",
    description: project?.description ?? "",
    status: (project?.status ?? "PLANNING") as ProjectStatus,
    priority: (project?.priority ?? "MEDIUM") as ProjectPriority,
    startDate: project?.startDate?.split("T")[0] ?? "",
    endDate: project?.endDate?.split("T")[0] ?? "",
    budgetAmount: project?.budgetAmount?.toString() ?? "",
    clientId: (project as any)?.clientId ?? project?.client?.id ?? "",
    projectManagerUserId:
      (project as any)?.projectManagerUserId ??
      project?.projectManager?.id ??
      "",
    contractId: (project as any)?.contractId ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Dropdown data
  const [clients, setClients] = useState<
    { id: string; companyName: string; shortName: string | null }[]
  >([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [contracts, setContracts] = useState<
    { id: string; contractCode: string | null; title: string }[]
  >([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingDropdowns(true);
      try {
        const [clientsRes, usersRes] = await Promise.all([
          clientsService.listClients({ limit: 200, status: "ACTIVE" }),
          usersService.listUsers({ limit: 200, accountStatus: "ACTIVE" }),
        ]);
        setClients(
          clientsRes.items.map((c) => ({
            id: c.id,
            companyName: c.companyName,
            shortName: c.shortName,
          })),
        );
        setUsers(usersRes.items);
      } catch {
        // silently skip — dropdowns just won't be populated
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadData();
  }, []);

  // Load contracts when client changes
  useEffect(() => {
    if (!form.clientId) {
      setContracts([]);
      return;
    }
    clientsService
      .listContracts({ clientId: form.clientId, limit: 100 })
      .then((res) =>
        setContracts(
          res.items.map((c) => ({
            id: c.id,
            contractCode: c.contractCode,
            title: c.title,
          })),
        ),
      )
      .catch(() => setContracts([]));
  }, [form.clientId]);

  const handleSubmit = async () => {
    if (!form.projectName.trim()) {
      toast.error("Tên dự án là bắt buộc");
      return;
    }
    setSubmitting(true);
    await onSave({
      projectName: form.projectName.trim(),
      projectCode: form.projectCode || null,
      description: form.description || null,
      status: form.status,
      priority: form.priority || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
      clientId: form.clientId || null,
      projectManagerUserId: form.projectManagerUserId || null,
      contractId: form.contractId || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Tên dự án *
              </label>
              <input
                value={form.projectName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, projectName: e.target.value }))
                }
                placeholder="Nhập tên dự án..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mã dự án
              </label>
              <input
                value={form.projectCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    projectCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="DA-001"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] uppercase"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ưu tiên
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as ProjectPriority,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as ProjectStatus,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày bắt đầu
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
                Ngày kết thúc
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

            {/* ── Project Manager ── */}
            <div className="col-span-2">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Quản lý dự án (PM)
              </label>
              <select
                value={form.projectManagerUserId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    projectManagerUserId: e.target.value,
                  }))
                }
                disabled={loadingDropdowns}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] disabled:opacity-60"
              >
                <option value="">-- Chưa chọn PM --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.userCode})
                  </option>
                ))}
              </select>
            </div>

            {/* ── Client ── */}
            <div className="col-span-2">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Khách hàng
              </label>
              <select
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    clientId: e.target.value,
                    contractId: "",
                  }))
                }
                disabled={loadingDropdowns}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] disabled:opacity-60"
              >
                <option value="">-- Nội bộ (không có KH) --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                    {c.shortName ? ` (${c.shortName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Contract (only show if client selected) ── */}
            {form.clientId && (
              <div className="col-span-2">
                <label className="block text-[12px] text-muted-foreground mb-1">
                  Hợp đồng liên kết
                </label>
                <select
                  value={form.contractId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contractId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                >
                  <option value="">-- Không liên kết hợp đồng --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractCode ? `${c.contractCode} — ` : ""}
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngân sách (VND)
              </label>
              <input
                type="number"
                value={form.budgetAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetAmount: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Mô tả ngắn về dự án..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none"
              />
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
            )}
            {project ? "Cập nhật" : "Tạo dự án"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. ProjectExpensesPage — Chi phí cross-project
// ═══════════════════════════════════════════════════════════════
export function ProjectExpensesPage() {
  const { can } = useAuth();
  const isAdminMgr = can("ADMIN", "MANAGER", "HR");

  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showDetail, setShowDetail] = useState<ApiExpense | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchExpenses = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: projectsService.ListExpensesParams = {
          page: p,
          limit: 30,
          ...(statusFilter && { status: statusFilter as ExpenseStatus }),
          ...(categoryFilter && {
            category: categoryFilter as ExpenseCategory,
          }),
        };
        const res = await projectsService.listExpenses(params);
        setExpenses(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, categoryFilter],
  );

  useEffect(() => {
    fetchExpenses(1);
  }, [fetchExpenses]);

  const displayed = useMemo(() => {
    if (!search) return expenses;
    const s = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s),
    );
  }, [expenses, search]);

  const stats = useMemo(
    () => ({
      pending: expenses.filter((e) => e.status === "PENDING").length,
      totalPending: expenses
        .filter((e) => e.status === "PENDING")
        .reduce((s, e) => s + e.amount, 0),
      approved: expenses.filter((e) => e.status === "APPROVED").length,
      totalApproved: expenses
        .filter((e) => ["APPROVED", "REIMBURSED"].includes(e.status))
        .reduce((s, e) => s + e.amount, 0),
      rejected: expenses.filter((e) => e.status === "REJECTED").length,
    }),
    [expenses],
  );

  const handleApprove = async (projectId: string, expenseId: string) => {
    try {
      await projectsService.approveExpense(projectId, expenseId);
      toast.success("Đã duyệt chi phí");
      fetchExpenses(page);
      setShowDetail(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể duyệt");
    }
  };

  const handleReject = async (projectId: string, expenseId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Nhập lý do từ chối");
      return;
    }
    try {
      await projectsService.rejectExpense(projectId, expenseId, rejectReason);
      toast.success("Đã từ chối chi phí");
      setRejectingId(null);
      setRejectReason("");
      fetchExpenses(page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể từ chối");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px]">Chi phí dự án</h1>
        <button
          onClick={() => fetchExpenses(page)}
          disabled={loading}
          className="p-2 border border-border rounded-lg hover:bg-accent"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock size={12} /> Đang chờ duyệt
          </div>
          <div className="text-[20px] mt-1 text-yellow-600">
            {stats.pending}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {fmtVND(stats.totalPending)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 size={12} /> Đã duyệt
          </div>
          <div className="text-[20px] mt-1 text-green-600">
            {stats.approved}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {fmtVND(stats.totalApproved)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle size={12} /> Bị từ chối
          </div>
          <div className="text-[20px] mt-1 text-red-600">{stats.rejected}</div>
          <div className="text-[12px] text-muted-foreground">{total} tổng</div>
        </div>
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
            placeholder="Tìm tiêu đề, mô tả..."
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
          <option value="">Tất cả TT</option>
          {Object.entries(expStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(expCategoryLabels).map(([k, v]) => (
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
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Dự án
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Tiêu đề
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Loại
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                    Số tiền
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Người gửi
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Ngày
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
                {displayed.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 text-[12px]">
                      {e.project?.projectName ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate">
                      {e.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-muted">
                        {expCategoryLabels[e.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{fmtVND(e.amount)}</td>
                    <td className="px-4 py-3 text-[12px] hidden md:table-cell">
                      {e.submittedBy?.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] hidden lg:table-cell">
                      {fmtDate(e.expenseDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${expStatusColors[e.status]}`}
                      >
                        {expStatusLabels[e.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setShowDetail(e)}
                          className="p-1.5 rounded hover:bg-accent"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        {isAdminMgr && e.status === "PENDING" && e.project && (
                          <>
                            <button
                              onClick={() => handleApprove(e.project!.id, e.id)}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600"
                            >
                              <ThumbsUp size={14} />
                            </button>
                            {rejectingId === e.id ? (
                              <>
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(ev) =>
                                    setRejectReason(ev.target.value)
                                  }
                                  placeholder="Lý do *"
                                  autoFocus
                                  className="w-28 px-2 py-1 rounded border border-red-300 text-[11px] bg-input-background"
                                />
                                <button
                                  onClick={() =>
                                    handleReject(e.project!.id, e.id)
                                  }
                                  className="p-1.5 bg-red-600 text-white rounded text-[11px]"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                  className="p-1.5 border border-border rounded text-[11px]"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setRejectingId(e.id)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Không có chi phí nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">
            {displayed.length} / {total} chi phí
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchExpenses(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => fetchExpenses(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {showDetail && (
        <ExpenseDetailDialog
          expense={showDetail}
          onClose={() => setShowDetail(null)}
        />
      )}
    </div>
  );
}

// ─── ExpenseDetailDialog ───────────────────────────────────────
function ExpenseDetailDialog({
  expense: e,
  onClose,
}: {
  expense: ApiExpense;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Chi tiết chi phí</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tiêu đề:</span>
            <span>{e.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dự án:</span>
            <span>{e.project?.projectName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Danh mục:</span>
            <span>{expCategoryLabels[e.category]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số tiền:</span>
            <span className="text-green-600">{fmtVND(e.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Người gửi:</span>
            <span>{e.submittedBy?.fullName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ngày chi:</span>
            <span>{fmtDate(e.expenseDate)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Trạng thái:</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${expStatusColors[e.status]}`}
            >
              {expStatusLabels[e.status]}
            </span>
          </div>
          {e.rejectReason && (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 text-[12px] text-red-700 dark:text-red-400">
              Lý do từ chối: {e.rejectReason}
            </div>
          )}
          {e.description && (
            <div className="text-[12px] text-muted-foreground">
              {e.description}
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

// ═══════════════════════════════════════════════════════════════
// 3. ProjectHealthPage — Dashboard health tất cả dự án
// ═══════════════════════════════════════════════════════════════
export function ProjectHealthPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: projectsService.ListProjectsParams = {
        limit: 50,
        sortOrder: "desc",
        ...(statusFilter && { status: statusFilter as ProjectStatus }),
      };
      const res = await projectsService.listProjects(params);
      setProjects(res.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Health distribution
  const healthDist = useMemo(() => {
    const counts = { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0, null: 0 };
    projects.forEach((p) => {
      if (p.healthStatus) counts[p.healthStatus]++;
      else counts.null++;
    });
    return [
      { name: "🟢 Đúng tiến độ", value: counts.ON_TRACK, color: "#22c55e" },
      { name: "🟡 Có rủi ro", value: counts.AT_RISK, color: "#f59e0b" },
      { name: "🔴 Chậm trễ", value: counts.DELAYED, color: "#ef4444" },
      { name: "⚪ Chưa xác định", value: counts.null, color: "#9ca3af" },
    ].filter((d) => d.value > 0);
  }, [projects]);

  const budgetByProject = useMemo(
    () =>
      projects
        .filter((p) => p.budgetAmount && p.budgetAmount > 0)
        .sort((a, b) => (b.budgetUsedPercent ?? 0) - (a.budgetUsedPercent ?? 0))
        .slice(0, 8)
        .map((p) => ({
          name:
            p.projectName.length > 20
              ? p.projectName.slice(0, 20) + "…"
              : p.projectName,
          pct: p.budgetUsedPercent ?? 0,
          color:
            (p.budgetUsedPercent ?? 0) > 90
              ? "#ef4444"
              : (p.budgetUsedPercent ?? 0) > 70
                ? "#f59e0b"
                : "#22c55e",
        })),
    [projects],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2">
          <Gauge size={22} /> Project Health Dashboard
        </h1>
        <div className="flex gap-2">
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
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />{" "}
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Health Pie */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Phân bố sức khoẻ dự án</div>
              {healthDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={healthDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={30}
                      label={({ name, value }) => `${value}`}
                    >
                      {healthDist.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v} dự án`]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-[13px]">
                  Không có dữ liệu
                </div>
              )}
            </div>

            {/* Budget usage bar */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">
                Tỉ lệ sử dụng ngân sách (%)
              </div>
              {budgetByProject.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={budgetByProject}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      fontSize={10}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      fontSize={10}
                      tick={{ fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)}%`]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {budgetByProject.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-[13px]">
                  Không có dự án có ngân sách
                </div>
              )}
            </div>
          </div>

          {/* Project health table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[13px]">
                Danh sách dự án ({projects.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                      Dự án
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                      Trạng thái
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">
                      Sức khoẻ
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                      Tiến độ
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                      Ngân sách dùng
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                      PM
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                      Kết thúc
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border hover:bg-accent/50 cursor-pointer"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px]">{p.projectName}</div>
                        {p.projectCode && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {p.projectCode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[p.status]}`}
                        >
                          {statusLabels[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.healthStatus ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${healthColors[p.healthStatus]}`}
                          >
                            {healthEmoji[p.healthStatus]}{" "}
                            {healthLabels[p.healthStatus]}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                          <span>{p.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {p.budgetUsedPercent != null ? (
                          <span
                            className={
                              p.budgetUsedPercent > 90
                                ? "text-red-500"
                                : p.budgetUsedPercent > 70
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }
                          >
                            {p.budgetUsedPercent.toFixed(0)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                        {p.projectManager?.fullName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-muted-foreground hidden lg:table-cell">
                        {fmtDate(p.endDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground"
                        />
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Không có dự án
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
