// ================================================================
// PROJECT DETAIL PAGE — Module 8 (/projects/:id)
// 4 tabs: Tổng quan | Thành viên | Milestones | Chi phí
// ================================================================
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Target,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  X,
  Loader2,
  FolderKanban,
  Activity,
  Briefcase,
  FileText,
  MoreHorizontal,
  UserPlus,
  Send,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Gauge,
  TrendingUp,
  BarChart3,
  Search,
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
  Cell,
} from "recharts";
import * as projectsService from "../../lib/services/projects.service";
import * as usersService from "../../lib/services/users.service";
import type { ApiUser } from "../../lib/services/auth.service";
import type {
  ApiProject,
  ApiAssignment,
  ApiMilestone,
  ApiExpense,
  ApiExpenseSummary,
  ProjectStatus,
  ProjectHealthStatus,
  MilestoneStatus,
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
  ARCHIVED: "bg-gray-100 text-gray-500",
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
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
const priorityLabels: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "TB",
  HIGH: "Cao",
  URGENT: "Khẩn",
};
const msStatusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const msStatusLabels: Record<string, string> = {
  PENDING: "Chờ",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  OVERDUE: "Quá hạn",
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
  REJECTED: "Từ chối",
  REIMBURSED: "Hoàn tiền",
};
const expCategoryLabels: Record<string, string> = {
  LABOR: "Nhân công",
  SOFTWARE: "Phần mềm",
  HARDWARE: "Phần cứng",
  TRAVEL: "Công tác",
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
const PROJECT_ROLES = [
  "Project Manager",
  "Tech Lead",
  "Senior Dev",
  "Backend Dev",
  "Frontend Dev",
  "Full-Stack Dev",
  "BA",
  "QA Engineer",
  "DevOps",
  "Designer",
  "Support Eng",
  "Junior Dev",
];

type TabKey = "overview" | "members" | "milestones" | "expenses";

// ═══════════════════════════════════════════════════════════════
// ProjectDetailPage
// ═══════════════════════════════════════════════════════════════
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const isAdminMgr = can("ADMIN", "MANAGER", "HR");

  // ─── State ──────────────────────────────────────────────────
  const [project, setProject] = useState<ApiProject | null>(null);
  const [members, setMembers] = useState<ApiAssignment[]>([]);
  const [milestones, setMilestones] = useState<ApiMilestone[]>([]);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [expSummary, setExpSummary] = useState<ApiExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Dialog states
  const [showHealthEdit, setShowHealthEdit] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editMilestone, setEditMilestone] = useState<ApiMilestone | null>(null);
  const [msStatusFilter, setMsStatusFilter] = useState("");
  const [expStatusFilter, setExpStatusFilter] = useState("");

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, mbrs, mstones, exps, summary] = await Promise.all([
        projectsService.getProjectById(id),
        projectsService.getProjectMembers(id, { includeEnded: true }),
        projectsService.getMilestones(id),
        projectsService.getProjectExpenses(id, { limit: 50 }),
        projectsService.getExpenseSummary(id).catch(() => null),
      ]);
      setProject(proj);
      setMembers(mbrs);
      setMilestones(mstones);
      setExpenses(exps.items);
      if (summary) setExpSummary(summary);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleUpdateHealth = async (payload: {
    healthStatus?: ProjectHealthStatus;
    progressPercent?: number;
    notes?: string | null;
  }) => {
    if (!id) return;
    try {
      await projectsService.updateHealth(id, payload);
      toast.success("Đã cập nhật tiến độ");
      setShowHealthEdit(false);
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleCloseProject = async (
    status: "COMPLETED" | "CANCELLED" | "ARCHIVED",
  ) => {
    if (!id) return;
    try {
      await projectsService.closeProject(id, { status });
      toast.success(
        `Đã ${status === "COMPLETED" ? "hoàn thành" : status === "CANCELLED" ? "huỷ" : "lưu trữ"} dự án`,
      );
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleReopenProject = async () => {
    if (!id) return;
    try {
      await projectsService.reopenProject(id);
      toast.success("Đã mở lại dự án");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleAssignMember = async (
    payload: Parameters<typeof projectsService.assignMember>[1],
  ) => {
    if (!id) return;
    try {
      await projectsService.assignMember(id, payload);
      toast.success("Đã thêm thành viên");
      setShowAddMember(false);
      fetchProject();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể thêm thành viên",
      );
    }
  };

  const handleEndAssignment = async (assignmentId: string) => {
    if (!id) return;
    try {
      await projectsService.endAssignment(id, assignmentId, {
        leftAt: new Date().toISOString(),
      });
      toast.success("Đã kết thúc assignment");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleCreateMilestone = async (
    payload: Parameters<typeof projectsService.createMilestone>[1],
  ) => {
    if (!id) return;
    try {
      await projectsService.createMilestone(id, payload);
      toast.success("Đã tạo milestone");
      setShowAddMilestone(false);
      fetchProject();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể tạo milestone",
      );
    }
  };

  const handleUpdateMilestone = async (
    msId: string,
    payload: Parameters<typeof projectsService.updateMilestone>[2],
  ) => {
    if (!id) return;
    try {
      await projectsService.updateMilestone(id, msId, payload);
      toast.success("Đã cập nhật milestone");
      setEditMilestone(null);
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleMarkDone = async (msId: string) => {
    if (!id) return;
    try {
      await projectsService.updateMilestone(id, msId, { status: "DONE" });
      toast.success("Milestone đã hoàn thành!");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleDeleteMilestone = async (msId: string) => {
    if (!id) return;
    try {
      await projectsService.deleteMilestone(id, msId);
      toast.success("Đã xoá milestone");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleCreateExpense = async (
    payload: Parameters<typeof projectsService.createExpense>[1],
  ) => {
    if (!id) return;
    try {
      await projectsService.createExpense(id, payload);
      toast.success("Đã gửi chi phí — chờ duyệt");
      setShowAddExpense(false);
      fetchProject();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể gửi chi phí",
      );
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    if (!id) return;
    try {
      await projectsService.approveExpense(id, expenseId);
      toast.success("Đã duyệt chi phí");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleRejectExpense = async (expenseId: string, reason: string) => {
    if (!id) return;
    try {
      await projectsService.rejectExpense(id, expenseId, reason);
      toast.success("Đã từ chối chi phí");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  const handleReimburseExpense = async (expenseId: string) => {
    if (!id) return;
    try {
      await projectsService.reimburseExpense(id, expenseId);
      toast.success("Đã đánh dấu hoàn tiền");
      fetchProject();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi");
    }
  };

  // ─── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-[0.8125rem]">Đang tải dự án...</span>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="text-center py-20">
        <FolderKanban
          size={40}
          className="mx-auto mb-2 opacity-30 text-muted-foreground"
        />
        <div className="text-sm text-muted-foreground">
          Không tìm thấy dự án
        </div>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 px-4 py-2 border border-border rounded-lg text-[0.8125rem] hover:bg-accent flex items-center gap-1 mx-auto"
        >
          <ArrowLeft size={14} /> Quay lại
        </button>
      </div>
    );
  }

  const budgetPct = project.budgetUsedPercent ?? 0;
  const remaining = project.budgetAmount
    ? project.budgetAmount - project.spentAmount
    : null;
  const doneMilestones = milestones.filter((m) => m.status === "DONE").length;
  const overdueMilestones = milestones.filter((m) => m.isOverdue).length;

  const filteredMilestones = msStatusFilter
    ? milestones.filter((m) => m.status === msStatusFilter)
    : milestones;
  const filteredExpenses = expStatusFilter
    ? expenses.filter((e) => e.status === expStatusFilter)
    : expenses;

  const expenseSummaryTotals = {
    approved: expenses
      .filter((e) => ["APPROVED", "REIMBURSED"].includes(e.status))
      .reduce((s, e) => s + e.amount, 0),
    pending: expenses
      .filter((e) => e.status === "PENDING")
      .reduce((s, e) => s + e.amount, 0),
    reimbursed: expenses
      .filter((e) => e.status === "REIMBURSED")
      .reduce((s, e) => s + e.amount, 0),
  };

  const expensePieData = expSummary
    ? Object.entries(expSummary.byCategory ?? {})
        .map(([cat, data]) => ({
          name: expCategoryLabels[cat] ?? cat,
          value: data.approved + data.reimbursed,
        }))
        .filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => navigate("/projects")}
          className="hover:text-foreground flex items-center gap-1"
        >
          <FolderKanban size={12} /> Dự án
        </button>
        <ChevronRight size={12} />
        <span className="text-foreground">{project.projectName}</span>
      </div>

      {/* ── Project Header Card ── */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {project.healthStatus && (
                <span
                  className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${healthColors[project.healthStatus]}`}
                >
                  {healthEmoji[project.healthStatus]}{" "}
                  {healthLabels[project.healthStatus]}
                </span>
              )}
              <span
                className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${statusColors[project.status]}`}
              >
                {statusLabels[project.status]}
              </span>
              {project.priority && (
                <span
                  className={`text-[0.6875rem] px-2 py-0.5 rounded ${priorityColors[project.priority]}`}
                >
                  {priorityLabels[project.priority]}
                </span>
              )}
            </div>
            <h1 className="text-[1.375rem] mt-1">{project.projectName}</h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {project.projectCode && (
                <span className="font-mono">{project.projectCode}</span>
              )}
              {project.projectManager && (
                <span className="flex items-center gap-1">
                  <Briefcase size={11} /> PM: {project.projectManager.fullName}
                </span>
              )}
              {project.client && (
                <span className="flex items-center gap-1">
                  <Users size={11} />{" "}
                  {project.client.shortName ?? project.client.companyName}
                </span>
              )}
              {(project.startDate || project.endDate) && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {fmtDate(project.startDate)} →{" "}
                  {fmtDate(project.endDate)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchProject}
              className="p-2 rounded-lg border border-border hover:bg-accent"
            >
              <RefreshCw size={14} />
            </button>
            {isAdminMgr && (
              <>
                <button
                  onClick={() => setShowHealthEdit(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 flex items-center gap-1"
                >
                  <Edit2 size={12} /> Cập nhật tiến độ
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 rounded-lg border border-border hover:bg-accent"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40 cursor-pointer"
                        onClick={() => setShowMoreMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-44">
                        {["ACTIVE", "PLANNING", "ON_HOLD"].includes(
                          project.status,
                        ) && (
                          <>
                            <button
                              onClick={() => {
                                handleCloseProject("COMPLETED");
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-[0.8125rem] hover:bg-accent flex items-center gap-2"
                            >
                              <CheckCircle2
                                size={14}
                                className="text-green-600"
                              />{" "}
                              Đánh dấu hoàn thành
                            </button>
                            <button
                              onClick={() => {
                                handleCloseProject("CANCELLED");
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-[0.8125rem] hover:bg-accent text-red-600 flex items-center gap-2"
                            >
                              <X size={14} /> Huỷ dự án
                            </button>
                            <button
                              onClick={() => {
                                handleCloseProject("ARCHIVED");
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-[0.8125rem] hover:bg-accent text-muted-foreground flex items-center gap-2"
                            >
                              <FileText size={14} /> Lưu trữ
                            </button>
                          </>
                        )}
                        {["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
                          project.status,
                        ) && (
                          <button
                            onClick={() => {
                              handleReopenProject();
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-[0.8125rem] hover:bg-accent flex items-center gap-2"
                          >
                            <Activity size={14} className="text-blue-600" /> Mở
                            lại dự án
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Tiến độ hoàn thành</span>
            <span className="font-medium text-foreground">
              {project.progressPercent}%
            </span>
          </div>
          <div className="h-2.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Financial summary */}
        {project.budgetAmount && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <div className="text-[0.625rem] text-muted-foreground">Ngân sách</div>
              <div className="font-medium">{fmtVND(project.budgetAmount)}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <div className="text-[0.625rem] text-muted-foreground">Đã chi</div>
              <div
                className={`font-medium ${budgetPct > 90 ? "text-red-500" : ""}`}
              >
                {fmtVND(project.spentAmount)}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <div className="text-[0.625rem] text-muted-foreground">Còn lại</div>
              <div
                className={`font-medium ${remaining && remaining < 0 ? "text-red-500" : "text-green-600"}`}
              >
                {remaining != null ? fmtVND(remaining) : "—"}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center">
              <div className="text-[0.625rem] text-muted-foreground">% đã dùng</div>
              <div
                className={`font-medium ${budgetPct > 90 ? "text-red-500" : budgetPct > 70 ? "text-yellow-600" : "text-green-600"}`}
              >
                {budgetPct.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {(
            [
              {
                key: "overview",
                label: "Tổng quan",
                icon: <BarChart3 size={14} />,
              },
              {
                key: "members",
                label: `Thành viên (${members.filter((m) => m.status === "ACTIVE").length})`,
                icon: <Users size={14} />,
              },
              {
                key: "milestones",
                label: `Milestones (${milestones.length})`,
                icon: <Target size={14} />,
              },
              {
                key: "expenses",
                label: `Chi phí (${expenses.length})`,
                icon: <DollarSign size={14} />,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[0.8125rem] border-b-2 whitespace-nowrap transition-colors
                ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {/* ── TAB: TỔNG QUAN ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Edit project info button */}
              {isAdminMgr && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowEditProject(true)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-accent flex items-center gap-1"
                  >
                    <Edit2 size={12} /> Sửa thông tin dự án
                  </button>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Left: Description + info */}
                <div className="space-y-4">
                  {project.description ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Mô tả dự án
                      </div>
                      <div className="text-[0.8125rem] leading-relaxed">
                        {project.description}
                      </div>
                    </div>
                  ) : isAdminMgr ? (
                    <button
                      onClick={() => setShowEditProject(true)}
                      className="text-[0.8125rem] text-muted-foreground italic hover:text-blue-600 text-left"
                    >
                      + Thêm mô tả dự án...
                    </button>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                    {[
                      { label: "Bắt đầu", value: fmtDate(project.startDate) },
                      { label: "Kết thúc DK", value: fmtDate(project.endDate) },
                      {
                        label: "Kết thúc TT",
                        value: fmtDate(project.actualEndDate),
                      },
                      {
                        label: "Thành viên",
                        value: `${project.activeMemberCount} người`,
                      },
                    ].map((f) => (
                      <div key={f.label}>
                        <div className="text-[0.6875rem] text-muted-foreground">
                          {f.label}
                        </div>
                        <div
                          className={
                            f.value === "—"
                              ? "text-muted-foreground text-xs italic"
                              : ""
                          }
                        >
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {project.contract && (
                    <div className="bg-muted/30 rounded-lg p-3 text-xs">
                      <div className="text-[0.6875rem] text-muted-foreground mb-1">
                        Hợp đồng liên kết
                      </div>
                      <div>
                        {project.contract.contractCode} —{" "}
                        {project.contract.title} (
                        {fmtVND(project.contract.totalValue)})
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Health snapshot */}
                <div className="bg-muted/20 rounded-xl p-4 space-y-3">
                  <div className="text-[0.8125rem] flex items-center gap-1">
                    <Gauge size={14} /> Health Snapshot
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Milestones hoàn thành",
                        value: `${doneMilestones}/${milestones.length}`,
                        pct:
                          milestones.length > 0
                            ? Math.round(
                                (doneMilestones / milestones.length) * 100,
                              )
                            : 0,
                        color: "bg-green-500",
                      },
                      {
                        label: "Ngân sách sử dụng",
                        value: `${budgetPct.toFixed(0)}%`,
                        pct: Math.min(100, budgetPct),
                        color:
                          budgetPct > 90
                            ? "bg-red-500"
                            : budgetPct > 70
                              ? "bg-yellow-500"
                              : "bg-green-500",
                      },
                      {
                        label: "Tiến độ tổng thể",
                        value: `${project.progressPercent}%`,
                        pct: project.progressPercent,
                        color: "bg-blue-500",
                      },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {s.label}
                          </span>
                          <span className="font-medium">{s.value}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.color}`}
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {overdueMilestones > 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg p-2">
                      <AlertTriangle size={14} /> {overdueMilestones} milestone
                      quá hạn
                    </div>
                  )}
                </div>
              </div>

              {/* Expense by category chart */}
              {expensePieData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-[0.8125rem] mb-3">
                    Chi phí theo danh mục (đã duyệt)
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={expensePieData}>
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
                        tickFormatter={(v) => `${(v / 1e6).toFixed(0)}tr`}
                      />
                      <Tooltip
                        formatter={(v: number) => [fmtVND(v)]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar
                        dataKey="value"
                        name="Đã duyệt"
                        radius={[4, 4, 0, 0]}
                      >
                        {expensePieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: THÀNH VIÊN ── */}
          {activeTab === "members" && (
            <div className="space-y-3">
              {isAdminMgr && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1 hover:bg-blue-700"
                  >
                    <UserPlus size={14} /> Thêm thành viên
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground">
                        Thành viên
                      </th>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden md:table-cell">
                        Vai trò
                      </th>
                      <th className="text-right px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                        Phân bổ
                      </th>
                      <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground hidden md:table-cell">
                        Billable
                      </th>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                        Ngày vào
                      </th>
                      <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground">
                        Trạng thái
                      </th>
                      {isAdminMgr && <th className="px-4 py-3 w-20" />}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-border hover:bg-accent/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.625rem] shrink-0">
                              {a.user?.fullName.split(" ").slice(-1)[0]?.[0] ??
                                "?"}
                            </div>
                            <div>
                              <div className="text-[0.8125rem]">
                                {a.user?.fullName ?? "—"}
                              </div>
                              <div className="text-[0.625rem] text-muted-foreground">
                                {a.user?.userCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                          {a.roleInProject ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-right hidden lg:table-cell">
                          {a.allocationPercent != null
                            ? `${a.allocationPercent}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {a.isBillable ? (
                            <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Billable
                            </span>
                          ) : (
                            <span className="text-[0.625rem] text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {fmtDate(a.joinedAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-[0.625rem] px-2 py-0.5 rounded-full ${a.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}
                          >
                            {a.status === "ACTIVE" ? "Đang tham gia" : "Đã rời"}
                          </span>
                        </td>
                        {isAdminMgr && (
                          <td className="px-4 py-3 text-center">
                            {a.status === "ACTIVE" && (
                              <button
                                onClick={() => handleEndAssignment(a.id)}
                                className="text-[0.6875rem] text-red-500 hover:underline"
                              >
                                Kết thúc
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Chưa có thành viên
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: MILESTONES ── */}
          {activeTab === "milestones" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1">
                  {(
                    ["", "PENDING", "IN_PROGRESS", "DONE", "OVERDUE"] as const
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => setMsStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${msStatusFilter === s ? "bg-blue-600 text-white" : "border border-border hover:bg-accent"}`}
                    >
                      {s === "" ? "Tất cả" : msStatusLabels[s]}
                    </button>
                  ))}
                </div>
                {isAdminMgr && (
                  <button
                    onClick={() => setShowAddMilestone(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Plus size={13} /> Thêm milestone
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {filteredMilestones.map((m) => (
                  <div
                    key={m.id}
                    className={`bg-card border rounded-xl p-4 ${m.isOverdue ? "border-red-300 dark:border-red-800" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[0.8125rem] font-medium">
                            {m.name}
                          </span>
                          {m.isOverdue && (
                            <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5">
                              <AlertTriangle size={10} /> OVERDUE
                            </span>
                          )}
                          <span
                            className={`text-[0.625rem] px-2 py-0.5 rounded-full ${msStatusColors[m.status]}`}
                          >
                            {msStatusLabels[m.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[0.6875rem] text-muted-foreground">
                          {m.owner && (
                            <span className="flex items-center gap-1">
                              <Users size={10} /> {m.owner.fullName}
                            </span>
                          )}
                          {m.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} /> {fmtDate(m.dueDate)}
                            </span>
                          )}
                          {m.completedAt && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 size={10} /> Xong:{" "}
                              {fmtDate(m.completedAt)}
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <div className="text-xs text-muted-foreground mt-1.5">
                            {m.description}
                          </div>
                        )}
                      </div>
                      {isAdminMgr && (
                        <div className="flex gap-1 shrink-0">
                          {m.status !== "DONE" && (
                            <button
                              onClick={() => handleMarkDone(m.id)}
                              className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-[0.6875rem] hover:bg-green-200 flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} /> Xong
                            </button>
                          )}
                          <button
                            onClick={() => setEditMilestone(m)}
                            className="p-1.5 rounded hover:bg-accent"
                          >
                            <Edit2
                              size={13}
                              className="text-muted-foreground"
                            />
                          </button>
                          {m.status !== "DONE" && (
                            <button
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                              <X size={13} className="text-red-500" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredMilestones.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Target size={32} className="mx-auto mb-2 opacity-30" />
                    <div className="text-[0.8125rem]">Chưa có milestone nào</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: CHI PHÍ ── */}
          {activeTab === "expenses" && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Đã duyệt",
                    value: expenseSummaryTotals.approved,
                    color: "text-green-600",
                  },
                  {
                    label: "Đang chờ",
                    value: expenseSummaryTotals.pending,
                    color: "text-yellow-600",
                  },
                  {
                    label: "Đã hoàn tiền",
                    value: expenseSummaryTotals.reimbursed,
                    color: "text-teal-600",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-muted/30 rounded-xl p-3 text-center"
                  >
                    <div className="text-[0.625rem] text-muted-foreground">
                      {s.label}
                    </div>
                    <div className={`text-[0.9375rem] ${s.color}`}>
                      {fmtVND(s.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 flex-wrap">
                  {(
                    [
                      "",
                      "PENDING",
                      "APPROVED",
                      "REJECTED",
                      "REIMBURSED",
                    ] as const
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => setExpStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${expStatusFilter === s ? "bg-blue-600 text-white" : "border border-border hover:bg-accent"}`}
                    >
                      {s === "" ? "Tất cả" : expStatusLabels[s]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-700"
                >
                  <Send size={13} /> Gửi chi phí
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground">
                        Tiêu đề
                      </th>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden md:table-cell">
                        Danh mục
                      </th>
                      <th className="text-right px-4 py-3 text-[0.6875rem] text-muted-foreground">
                        Số tiền
                      </th>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                        Người gửi
                      </th>
                      <th className="text-left px-4 py-3 text-[0.6875rem] text-muted-foreground hidden lg:table-cell">
                        Ngày
                      </th>
                      <th className="text-center px-4 py-3 text-[0.6875rem] text-muted-foreground">
                        Trạng thái
                      </th>
                      {isAdminMgr && (
                        <th className="px-4 py-3 text-[0.6875rem] text-muted-foreground">
                          Thao tác
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        isAdminMgr={isAdminMgr}
                        onApprove={() => handleApproveExpense(e.id)}
                        onReject={(reason) => handleRejectExpense(e.id, reason)}
                        onReimburse={() => handleReimburseExpense(e.id)}
                      />
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Chưa có chi phí
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {showHealthEdit && (
        <UpdateHealthDialog
          project={project}
          onClose={() => setShowHealthEdit(false)}
          onSave={handleUpdateHealth}
        />
      )}
      {showEditProject && (
        <EditProjectDialog
          project={project}
          onClose={() => setShowEditProject(false)}
          onSave={async (payload) => {
            try {
              await projectsService.updateProject(project.id, payload);
              toast.success("Đã cập nhật thông tin dự án");
              setShowEditProject(false);
              fetchProject();
            } catch (err) {
              toast.error(
                err instanceof ApiError ? err.message : "Không thể cập nhật",
              );
            }
          }}
        />
      )}
      {showAddMember && (
        <AddMemberDialog
          onClose={() => setShowAddMember(false)}
          onSave={handleAssignMember}
        />
      )}
      {showAddMilestone && (
        <MilestoneFormDialog
          onClose={() => setShowAddMilestone(false)}
          onSave={handleCreateMilestone}
          title="Thêm milestone"
        />
      )}
      {editMilestone && (
        <MilestoneFormDialog
          milestone={editMilestone}
          onClose={() => setEditMilestone(null)}
          onSave={(payload) => handleUpdateMilestone(editMilestone.id, payload)}
          title="Sửa milestone"
        />
      )}
      {showAddExpense && (
        <AddExpenseDialog
          onClose={() => setShowAddExpense(false)}
          onSave={handleCreateExpense}
        />
      )}
    </div>
  );
}

// ─── ExpenseRow ────────────────────────────────────────────────
function ExpenseRow({
  expense: e,
  isAdminMgr,
  onApprove,
  onReject,
  onReimburse,
}: {
  expense: ApiExpense;
  isAdminMgr: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onReimburse: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <tr className="border-t border-border hover:bg-accent/30">
      <td className="px-4 py-3">
        <div>{e.title}</div>
        {e.rejectReason && (
          <div className="text-[0.6875rem] text-red-500 mt-0.5">
            ↳ {e.rejectReason}
          </div>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-[0.6875rem] px-2 py-0.5 rounded bg-muted">
          {expCategoryLabels[e.category]}
        </span>
      </td>
      <td className="px-4 py-3 text-right">{fmtVND(e.amount)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
        {e.submittedBy?.fullName ?? "—"}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
        {fmtDate(e.expenseDate)}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`text-[0.625rem] px-2 py-0.5 rounded-full ${expStatusColors[e.status]}`}
        >
          {expStatusLabels[e.status]}
        </span>
      </td>
      {isAdminMgr && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 flex-wrap">
            {e.status === "PENDING" &&
              (rejecting ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={reason}
                    onChange={(ev) => setReason(ev.target.value)}
                    placeholder="Lý do *"
                    autoFocus
                    className="w-28 px-2 py-1 rounded border border-red-300 text-[0.6875rem] bg-input-background"
                  />
                  <button
                    onClick={() => {
                      onReject(reason);
                      setRejecting(false);
                      setReason("");
                    }}
                    className="p-1 bg-red-600 text-white rounded text-[0.625rem]"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(false);
                      setReason("");
                    }}
                    className="p-1 border border-border rounded text-[0.625rem]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={onApprove}
                    className="p-1.5 rounded hover:bg-green-100 text-green-600"
                    title="Duyệt"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    onClick={() => setRejecting(true)}
                    className="p-1.5 rounded hover:bg-red-100 text-red-500"
                    title="Từ chối"
                  >
                    <ThumbsDown size={13} />
                  </button>
                </>
              ))}
            {e.status === "APPROVED" && (
              <button
                onClick={onReimburse}
                className="text-[0.6875rem] px-2 py-0.5 rounded bg-teal-100 text-teal-700 hover:bg-teal-200"
              >
                Hoàn tiền
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

// ─── UpdateHealthDialog ────────────────────────────────────────
function UpdateHealthDialog({
  project,
  onClose,
  onSave,
}: {
  project: ApiProject;
  onClose: () => void;
  onSave: (p: {
    healthStatus?: ProjectHealthStatus;
    progressPercent?: number;
    notes?: string | null;
  }) => void;
}) {
  const [health, setHealth] = useState<ProjectHealthStatus | "">(
    project.healthStatus ?? "",
  );
  const [progress, setProgress] = useState(project.progressPercent);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSave({
      ...(health && { healthStatus: health as ProjectHealthStatus }),
      progressPercent: progress,
      notes: notes || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Cập nhật tiến độ</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Sức khoẻ dự án
            </label>
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value as ProjectHealthStatus)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            >
              <option value="">Chưa xác định</option>
              {Object.entries(healthLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {healthEmoji[k]} {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Tiến độ:{" "}
              <span className="font-medium text-foreground">{progress}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(+e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ghi chú cập nhật..."
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
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}{" "}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddMemberDialog (with user search dropdown) ──────────────
function AddMemberDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof projectsService.assignMember>[1]) => void;
}) {
  // ── User search state ────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      fullName: string;
      userCode: string;
      department?: { name: string } | null;
    }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    fullName: string;
    userCode: string;
  } | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Other fields ─────────────────────────────────────────────
  const [role, setRole] = useState("");
  const [allocation, setAllocation] = useState("100");
  const [isBillable, setIsBillable] = useState(false);
  const [joinedAt, setJoinedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [submitting, setSubmitting] = useState(false);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchText(val);
    setSelectedUser(null);
    setShowDropdown(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await usersService.listUsers({
          search: val.trim(),
          limit: 10,
        });
        const items = res.items ?? [];
        setSearchResults(
          items.map(
            (u: ApiUser & { department?: { name: string } | null }) => ({
              id: u.id,
              fullName: u.fullName,
              userCode: u.userCode,
              department:
                (u as { department?: { name: string } | null }).department ??
                null,
            }),
          ),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const selectUser = (u: {
    id: string;
    fullName: string;
    userCode: string;
  }) => {
    setSelectedUser(u);
    setSearchText(u.fullName + " (" + u.userCode + ")");
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Vui lòng chọn nhân viên từ danh sách");
      return;
    }
    setSubmitting(true);
    await onSave({
      userId: selectedUser.id,
      roleInProject: role || null,
      allocationPercent: allocation ? +allocation : null,
      joinedAt,
      isBillable,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Thêm thành viên</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* User search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs text-muted-foreground mb-1">
              Nhân viên *{" "}
              {selectedUser && (
                <span className="text-green-600">✓ Đã chọn</span>
              )}
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchText.length >= 2 && setShowDropdown(true)}
                placeholder="Tìm theo tên hoặc mã nhân viên..."
                className={`w-full pl-9 pr-3 py-2 rounded-lg border bg-input-background text-[0.8125rem] ${
                  selectedUser ? "border-green-500" : "border-border"
                }`}
              />
              {searchLoading && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown &&
              (searchResults.length > 0 ||
                (searchText.length >= 2 && !searchLoading)) && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-pointer"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute top-full mt-1 w-full z-50 bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        Không tìm thấy nhân viên
                      </div>
                    ) : (
                      searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => selectUser(u)}
                          className="w-full text-left px-4 py-2.5 hover:bg-accent flex items-center gap-3 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.6875rem] shrink-0">
                            {u.fullName.split(" ").slice(-1)[0]?.[0] ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[0.8125rem] truncate">
                              {u.fullName}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground">
                              {u.userCode}
                              {u.department ? ` • ${u.department.name}` : ""}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Vai trò trong dự án
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            >
              <option value="">-- Chọn vai trò --</option>
              {PROJECT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Phân bổ (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày tham gia *
              </label>
              <input
                type="date"
                value={joinedAt}
                onChange={(e) => setJoinedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[0.8125rem] cursor-pointer">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
            />
            Billable (tính phí khách hàng)
          </label>
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
            disabled={submitting || !selectedUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}{" "}
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MilestoneFormDialog ───────────────────────────────────────
function MilestoneFormDialog({
  milestone,
  title,
  onClose,
  onSave,
}: {
  milestone?: ApiMilestone;
  title: string;
  onClose: () => void;
  onSave: (p: {
    name: string;
    description?: string | null;
    dueDate?: string | null;
    status?: MilestoneStatus;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: milestone?.name ?? "",
    description: milestone?.description ?? "",
    dueDate: milestone?.dueDate?.split("T")[0] ?? "",
    status: (milestone?.status ?? "PENDING") as MilestoneStatus,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Tên milestone là bắt buộc");
      return;
    }
    setSubmitting(true);
    await onSave({
      name: form.name.trim(),
      description: form.description || null,
      dueDate: form.dueDate || null,
      status: form.status,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Tên milestone *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tên milestone..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Deadline
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
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as MilestoneStatus,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              >
                {(["PENDING", "IN_PROGRESS", "DONE"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s === "PENDING"
                      ? "Chờ"
                      : s === "IN_PROGRESS"
                        ? "Đang làm"
                        : "Hoàn thành"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Mô tả
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
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
            )}
            {milestone ? "Cập nhật" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddExpenseDialog ──────────────────────────────────────────
function AddExpenseDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Parameters<typeof projectsService.createExpense>[1]) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "OTHER" as ExpenseCategory,
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Nhập tiêu đề");
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    setSubmitting(true);
    await onSave({
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      amount: amt,
      expenseDate: form.expenseDate,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base">Gửi chi phí</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Tiêu đề *
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Mô tả chi phí..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Danh mục *
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as ExpenseCategory,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              >
                {Object.entries(expCategoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày *
              </label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expenseDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Số tiền (VND) *
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              placeholder="0"
              min={1}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ghi chú
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
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
              <Send size={14} />
            )}{" "}
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditProjectDialog ─────────────────────────────────────────
// Cho phép sửa toàn bộ thông tin cơ bản của dự án:
// projectName, description, status, priority, startDate, endDate,
// budgetAmount, projectManagerUserId
function EditProjectDialog({
  project,
  onClose,
  onSave,
}: {
  project: ApiProject;
  onClose: () => void;
  onSave: (
    payload: Parameters<typeof projectsService.updateProject>[1],
  ) => Promise<void>;
}) {
  const [form, setForm] = useState({
    projectName: project.projectName,
    projectCode: project.projectCode ?? "",
    description: project.description ?? "",
    status: project.status as string,
    priority: (project.priority ?? "MEDIUM") as string,
    startDate: project.startDate?.split("T")[0] ?? "",
    endDate: project.endDate?.split("T")[0] ?? "",
    budgetAmount: project.budgetAmount?.toString() ?? "",
    contractValue: project.contractValue?.toString() ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.projectName.trim()) {
      toast.error("Tên dự án là bắt buộc");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    setSubmitting(true);
    await onSave({
      projectName: form.projectName.trim(),
      projectCode: form.projectCode.trim().toUpperCase() || null,
      description: form.description.trim() || null,
      status: form.status as Parameters<
        typeof projectsService.updateProject
      >[1]["status"],
      priority:
        (form.priority as Parameters<
          typeof projectsService.updateProject
        >[1]["priority"]) ?? null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
      contractValue: form.contractValue ? parseFloat(form.contractValue) : null,
    });
    setSubmitting(false);
  };

  const statusOpts = [
    { value: "PLANNING", label: "Lập kế hoạch" },
    { value: "ACTIVE", label: "Đang thực hiện" },
    { value: "ON_HOLD", label: "Tạm dừng" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Huỷ bỏ" },
    { value: "ARCHIVED", label: "Lưu trữ" },
  ];
  const priorityOpts = [
    { value: "LOW", label: "Thấp" },
    { value: "MEDIUM", label: "Trung bình" },
    { value: "HIGH", label: "Cao" },
    { value: "URGENT", label: "Khẩn cấp" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-base flex items-center gap-2">
            <Edit2 size={15} /> Sửa thông tin dự án
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Tên + Mã */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">
                Tên dự án *
              </label>
              <input
                value={form.projectName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, projectName: e.target.value }))
                }
                placeholder="Tên dự án..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
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
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] uppercase"
              />
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              >
                {statusOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ưu tiên
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              >
                {priorityOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ngày bắt đầu + kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày bắt đầu
                {!form.startDate && (
                  <span className="ml-1 text-orange-500">— chưa có</span>
                )}
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngày kết thúc dự kiến
                {!form.endDate && (
                  <span className="ml-1 text-orange-500">— chưa có</span>
                )}
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>

          {/* Date validation hint */}
          {form.startDate && form.endDate && form.endDate < form.startDate && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg p-2">
              <AlertTriangle size={13} /> Ngày kết thúc phải sau ngày bắt đầu
            </div>
          )}

          {/* Budget + Contract value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Ngân sách (VND)
              </label>
              <input
                type="number"
                value={form.budgetAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetAmount: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Giá trị hợp đồng (VND)
              </label>
              <input
                type="number"
                value={form.contractValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractValue: e.target.value }))
                }
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Mô tả dự án
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              placeholder="Mô tả mục tiêu, phạm vi dự án..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
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
              <Edit2 size={14} />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
