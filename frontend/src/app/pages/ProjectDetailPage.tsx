import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  projects as initialProjects,
  getUserById,
  getClientById,
  getContractById,
  formatVND,
  formatFullVND,
  users,
  projectExpenses as initialExpenses,
  departments,
} from "../data/mockData";
import type {
  Project,
  ProjectMilestone,
  ProjectAssignment,
  ProjectExpense,
  ProjectExpenseCategory,
  ProjectExpenseStatus,
  MilestoneStatus,
} from "../data/mockData";
import {
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
  ThumbsUp,
  ThumbsDown,
  X,
  Briefcase,
  FileText,
  FolderKanban,
  Activity,
  ArrowLeft,
  MoreHorizontal,
  UserPlus,
  Send,
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

// ─── Constants ──────────────────────────────────────────────
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
};
const expStatusLabels: Record<string, string> = {
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};
const expCategoryLabels: Record<string, string> = {
  LABOR: "Nhân công",
  SOFTWARE: "Phần mềm",
  HARDWARE: "Phần cứng",
  TRAVEL: "Công tác phí",
  TRAINING: "Đào tạo",
  OUTSOURCE: "Thuê ngoài",
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-[12px]">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>
            {typeof p.value === "number" && p.value > 10000
              ? formatFullVND(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN: ProjectDetailPage
// ═══════════════════════════════════════════════════════════════
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const isAdminMgr = can("ADMIN", "MANAGER");

  const [project, setProject] = useState<Project | null>(
    () => initialProjects.find((p) => p.id === id) || null,
  );
  const [expenses, setExpenses] = useState<ProjectExpense[]>(initialExpenses);
  const [tab, setTab] = useState("overview");
  const [msFilter, setMsFilter] = useState("");
  const [expCatFilter, setExpCatFilter] = useState("");
  const [expStatusFilter, setExpStatusFilter] = useState("");
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showMsDialog, setShowMsDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FolderKanban size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-[16px] mb-2">Không tìm thấy dự án</h2>
        <button
          onClick={() => navigate("/projects")}
          className="text-blue-600 text-[13px] hover:underline"
        >
          ← Quay lại danh sách dự án
        </button>
      </div>
    );
  }

  const pm = getUserById(project.projectManagerUserId);
  const client = getClientById(project.clientId);
  const contract = project.contractId
    ? getContractById(project.contractId)
    : null;
  const budgetUsedPct =
    project.budgetAmount > 0
      ? Math.round((project.spentAmount / project.budgetAmount) * 100)
      : 0;
  const budgetRemaining = project.budgetAmount - project.spentAmount;
  const projectExpensesList = expenses.filter(
    (e) => e.projectId === project.id,
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(project.endDate).getTime() - new Date("2025-03-12").getTime()) /
        86400000,
    ),
  );

  // Expense summary by category
  const expenseByCategory = useMemo(() => {
    const catMap = new Map<string, number>();
    projectExpensesList
      .filter((e) => e.status === "APPROVED")
      .forEach((e) => {
        catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
      });
    return Array.from(catMap.entries())
      .map(([cat, amount]) => ({
        name: expCategoryLabels[cat] || cat,
        value: amount,
      }))
      .sort((a, b) => b.value - a.value);
  }, [projectExpensesList]);

  // Handlers
  const handleUpdateProgress = (
    healthStatus: string,
    progressPercent: number,
  ) => {
    setProject((prev) =>
      prev
        ? { ...prev, healthStatus: healthStatus as any, progressPercent }
        : null,
    );
    setShowProgressDialog(false);
    toast.success("Đã cập nhật tiến độ");
  };

  const handleAddMilestone = (
    name: string,
    dueDate: string,
    ownerUserId: string,
  ) => {
    const newMs: ProjectMilestone = {
      id: `ms-${Date.now()}`,
      projectId: project.id,
      name,
      ownerUserId,
      dueDate,
      status: "PENDING",
    };
    setProject((prev) =>
      prev ? { ...prev, milestones: [...prev.milestones, newMs] } : null,
    );
    setShowMsDialog(false);
    toast.success("Đã thêm milestone");
  };

  const handleMarkMsDone = (msId: string) => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) =>
              m.id === msId
                ? {
                    ...m,
                    status: "DONE" as MilestoneStatus,
                    completedAt: "2025-03-12",
                  }
                : m,
            ),
          }
        : null,
    );
    toast.success("Đánh dấu hoàn thành");
  };

  const handleAddMember = (
    userId: string,
    role: string,
    allocation: number,
    isBillable: boolean,
  ) => {
    const newA: ProjectAssignment = {
      userId,
      projectId: project.id,
      roleInProject: role,
      allocationPercent: allocation,
      isBillable,
    };
    setProject((prev) =>
      prev ? { ...prev, assignments: [...prev.assignments, newA] } : null,
    );
    setShowMemberDialog(false);
    toast.success("Đã thêm thành viên");
  };

  const handleSubmitExpense = (
    title: string,
    category: ProjectExpenseCategory,
    amount: number,
    date: string,
  ) => {
    const newExp: ProjectExpense = {
      id: `pex-${Date.now()}`,
      projectId: project.id,
      description: title,
      amount,
      category,
      submittedByUserId: currentUser?.id || "",
      submittedDate: date,
      status: "PENDING",
    };
    setExpenses((prev) => [newExp, ...prev]);
    setShowExpenseDialog(false);
    toast.success("Đã submit chi phí");
  };

  const handleApproveExpense = (expId: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expId
          ? {
              ...e,
              status: "APPROVED" as ProjectExpenseStatus,
              approvedByUserId: currentUser?.id,
              approvedDate: "2025-03-12",
            }
          : e,
      ),
    );
    toast.success("Đã duyệt chi phí");
  };
  const handleRejectExpense = (expId: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expId
          ? {
              ...e,
              status: "REJECTED" as ProjectExpenseStatus,
              approvedByUserId: currentUser?.id,
              approvedDate: "2025-03-12",
              rejectReason: "Không đạt yêu cầu",
            }
          : e,
      ),
    );
    toast.success("Đã từ chối chi phí");
  };

  const handleCloseProject = () => {
    setProject((prev) =>
      prev
        ? { ...prev, status: "COMPLETED" as any, progressPercent: 100 }
        : null,
    );
    setShowMoreMenu(false);
    toast.success("Đã đóng dự án");
  };

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    { key: "members", label: `Thành viên (${project.assignments.length})` },
    { key: "milestones", label: `Milestones (${project.milestones.length})` },
    { key: "expenses", label: `Chi phí (${projectExpensesList.length})` },
  ];

  const filteredMs = project.milestones.filter(
    (m) => !msFilter || m.status === msFilter,
  );
  const filteredExp = projectExpensesList.filter((e) => {
    if (expCatFilter && e.category !== expCatFilter) return false;
    if (expStatusFilter && e.status !== expStatusFilter) return false;
    return true;
  });
  const approvedExpTotal = projectExpensesList
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + e.amount, 0);
  const pendingExpTotal = projectExpensesList
    .filter((e) => e.status === "PENDING")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <button
          onClick={() => navigate("/projects")}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Dự án
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground">{project.projectName}</span>
      </div>

      {/* Header Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[20px]">{project.projectName}</h1>
              {project.healthStatus && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded ${healthColors[project.healthStatus]}`}
                >
                  {healthEmoji[project.healthStatus]}{" "}
                  {healthLabels[project.healthStatus]}
                </span>
              )}
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[project.status]}`}
              >
                {statusLabels[project.status]}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${priorityColors[project.priority]}`}
              >
                {priorityLabels[project.priority]}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground mt-2">
              <span>{project.projectCode}</span>
              <span className="flex items-center gap-1">
                {pm && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">
                      {pm.fullName.split(" ").slice(-1)[0][0]}
                    </div>{" "}
                    PM: {pm.fullName}
                  </>
                )}
              </span>
              {client && <span>KH: {client.shortName}</span>}
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {project.startDate} → {project.endDate}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            {isAdminMgr && (
              <button
                onClick={() => setShowProgressDialog(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] hover:bg-blue-700 transition-colors"
              >
                Cập nhật tiến độ
              </button>
            )}
            {isAdminMgr && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-lg border border-border hover:bg-accent"
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                    {project.status !== "COMPLETED" ? (
                      <button
                        onClick={handleCloseProject}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-accent transition-colors"
                      >
                        Đóng dự án
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setProject((prev) =>
                            prev ? { ...prev, status: "ACTIVE" as any } : null,
                          );
                          setShowMoreMenu(false);
                          toast.success("Đã mở lại dự án");
                        }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-accent transition-colors"
                      >
                        Mở lại dự án
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="text-muted-foreground">Tiến độ</span>
            <span>{project.progressPercent}% hoàn thành</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Budget stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Ngân sách</div>
            <div className="text-[14px]">{formatVND(project.budgetAmount)}</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Đã chi</div>
            <div
              className={`text-[14px] ${budgetUsedPct > 90 ? "text-red-500" : ""}`}
            >
              {formatVND(project.spentAmount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Còn lại</div>
            <div className="text-[14px]">{formatVND(budgetRemaining)}</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">% ngân sách</div>
            <div
              className={`text-[14px] ${budgetUsedPct > 90 ? "text-red-500" : budgetUsedPct > 70 ? "text-yellow-500" : ""}`}
            >
              {budgetUsedPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[14px]">Thông tin dự án</h3>
            <p className="text-[13px] text-muted-foreground">
              {project.description}
            </p>
            {contract && (
              <div className="text-[12px] text-muted-foreground border-t border-border pt-3 mt-3">
                <span className="flex items-center gap-1">
                  <FileText size={12} /> Hợp đồng: {contract.contractCode} —{" "}
                  {contract.title}
                </span>
              </div>
            )}
            <div className="text-[12px] text-muted-foreground flex items-center gap-1">
              <Clock size={12} /> Còn {daysRemaining} ngày đến deadline
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[14px]">Health Snapshot</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[20px]">
                  {project.milestones.filter((m) => m.status === "DONE").length}
                  /{project.milestones.length}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Milestone Done
                </div>
              </div>
              <div>
                <div
                  className={`text-[20px] ${budgetUsedPct > 90 ? "text-red-500" : ""}`}
                >
                  {budgetUsedPct}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Ngân sách đã dùng
                </div>
              </div>
              <div>
                <div className="text-[20px]">{daysRemaining}</div>
                <div className="text-[11px] text-muted-foreground">
                  Ngày còn lại
                </div>
              </div>
            </div>
          </div>
          {expenseByCategory.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden lg:col-span-2">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-[14px]">Chi phí theo danh mục</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={expenseByCategory}
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(0)}M`
                          : String(v)
                      }
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Số tiền" radius={[4, 4, 0, 0]}>
                      {expenseByCategory.map((e, i) => (
                        <Cell
                          key={`ec-${e.name}`}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {tab === "members" && (
        <div className="space-y-3">
          {isAdminMgr && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowMemberDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] hover:bg-blue-700"
              >
                <UserPlus size={14} /> Thêm thành viên
              </button>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Thành viên
                    </th>
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Mã NV
                    </th>
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Vai trò
                    </th>
                    <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                      Allocation
                    </th>
                    <th className="text-center px-4 py-2 text-[12px] text-muted-foreground">
                      Billable
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {project.assignments.map((a) => {
                    const user = getUserById(a.userId);
                    return (
                      <tr
                        key={a.userId}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">
                              {user?.fullName.split(" ").slice(-1)[0][0] || "?"}
                            </div>
                            <span className="text-[13px]">
                              {user?.fullName || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                          {user?.userCode || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]">
                          {a.roleInProject}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {a.allocationPercent}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.isBillable ? (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[11px]">
                              Billable
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Non-billable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {project.assignments.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground text-[13px]"
                      >
                        Chưa có thành viên nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Milestones */}
      {tab === "milestones" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={msFilter}
              onChange={(e) => setMsFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px]"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(msStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {isAdminMgr && (
              <button
                onClick={() => setShowMsDialog(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] hover:bg-blue-700"
              >
                <Plus size={14} /> Thêm milestone
              </button>
            )}
          </div>
          <div className="space-y-2">
            {filteredMs.map((ms, idx) => {
              const owner = getUserById(ms.ownerUserId);
              return (
                <div
                  key={ms.id}
                  className={`bg-card border rounded-xl p-4 ${ms.status === "OVERDUE" ? "border-red-300 dark:border-red-700" : "border-border"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] ${ms.status === "DONE" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : ms.status === "OVERDUE" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : ms.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-[14px]">{ms.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {owner && <span>Owner: {owner.fullName}</span>}
                          <span>Due: {ms.dueDate}</span>
                          {ms.completedAt && (
                            <span className="text-green-600 dark:text-green-400">
                              Done: {ms.completedAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${msStatusColors[ms.status]}`}
                      >
                        {msStatusLabels[ms.status]}
                      </span>
                      {ms.status === "IN_PROGRESS" && isAdminMgr && (
                        <button
                          onClick={() => handleMarkMsDone(ms.id)}
                          className="text-[11px] px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          <CheckCircle2 size={12} className="inline mr-0.5" />{" "}
                          Hoàn thành
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredMs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-[13px]">
                Không có milestone nào
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Expenses */}
      {tab === "expenses" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Đã duyệt</div>
              <div className="text-[16px] text-green-600">
                {formatVND(approvedExpTotal)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Đang chờ</div>
              <div className="text-[16px] text-yellow-600">
                {formatVND(pendingExpTotal)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-[11px] text-muted-foreground">
                Tổng khoản
              </div>
              <div className="text-[16px]">{projectExpensesList.length}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={expCatFilter}
              onChange={(e) => setExpCatFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px]"
            >
              <option value="">Tất cả danh mục</option>
              {Object.entries(expCategoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={expStatusFilter}
              onChange={(e) => setExpStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px]"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(expStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowExpenseDialog(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] hover:bg-blue-700"
            >
              <Plus size={14} /> Submit chi phí
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Tiêu đề
                    </th>
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Danh mục
                    </th>
                    <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                      Số tiền
                    </th>
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Người submit
                    </th>
                    <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                      Ngày
                    </th>
                    <th className="text-center px-4 py-2 text-[12px] text-muted-foreground">
                      Trạng thái
                    </th>
                    {isAdminMgr && (
                      <th className="text-center px-4 py-2 text-[12px] text-muted-foreground">
                        Hành động
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredExp.map((e) => {
                    const submitter = getUserById(e.submittedByUserId);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5 text-[13px] max-w-[200px] truncate">
                          {e.description}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                          {expCategoryLabels[e.category]}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {formatVND(e.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                          {submitter?.fullName.split(" ").slice(-2).join(" ") ||
                            "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                          {e.submittedDate}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${expStatusColors[e.status]}`}
                          >
                            {expStatusLabels[e.status]}
                          </span>
                        </td>
                        {isAdminMgr && (
                          <td className="px-4 py-2.5 text-center">
                            {e.status === "PENDING" && (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleApproveExpense(e.id)}
                                  className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                >
                                  <ThumbsUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleRejectExpense(e.id)}
                                  className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                  <ThumbsDown size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredExp.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdminMgr ? 7 : 6}
                        className="text-center py-8 text-muted-foreground text-[13px]"
                      >
                        Không có chi phí nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showProgressDialog && (
        <ProgressDialog
          project={project}
          onSave={handleUpdateProgress}
          onClose={() => setShowProgressDialog(false)}
        />
      )}
      {showMsDialog && (
        <MilestoneDialog
          onSave={handleAddMilestone}
          onClose={() => setShowMsDialog(false)}
        />
      )}
      {showMemberDialog && (
        <MemberDialog
          projectAssignments={project.assignments}
          onSave={handleAddMember}
          onClose={() => setShowMemberDialog(false)}
        />
      )}
      {showExpenseDialog && (
        <ExpenseDialog
          onSave={handleSubmitExpense}
          onClose={() => setShowExpenseDialog(false)}
        />
      )}
    </div>
  );
}

// ─── Dialogs ────────────────────────────────────────────────
function DialogWrapper({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-[14px]">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ProgressDialog({
  project,
  onSave,
  onClose,
}: {
  project: Project;
  onSave: (h: string, p: number) => void;
  onClose: () => void;
}) {
  const [health, setHealth] = useState(project.healthStatus || "ON_TRACK");
  const [progress, setProgress] = useState(project.progressPercent);
  return (
    <DialogWrapper title="Cập nhật tiến độ" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Tình trạng sức khoẻ
          </label>
          <select
            value={health}
            onChange={(e) => setHealth(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            <option value="ON_TRACK">🟢 Đúng tiến độ</option>
            <option value="AT_RISK">🟡 Có rủi ro</option>
            <option value="DELAYED">🔴 Chậm trễ</option>
          </select>
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Tiến độ: {progress}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          onClick={() => onSave(health, progress)}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
        >
          Lưu
        </button>
      </div>
    </DialogWrapper>
  );
}

function MilestoneDialog({
  onSave,
  onClose,
}: {
  onSave: (name: string, dueDate: string, ownerUserId: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const activeUsers = users.filter((u) => u.accountStatus === "ACTIVE");
  return (
    <DialogWrapper title="Thêm Milestone" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Tên milestone *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Hạn hoàn thành *
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Owner *
          </label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            <option value="">Chọn người phụ trách</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.userCode})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (name && dueDate && ownerId) onSave(name, dueDate, ownerId);
          }}
          disabled={!name || !dueDate || !ownerId}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Thêm
        </button>
      </div>
    </DialogWrapper>
  );
}

function MemberDialog({
  projectAssignments,
  onSave,
  onClose,
}: {
  projectAssignments: ProjectAssignment[];
  onSave: (
    userId: string,
    role: string,
    alloc: number,
    billable: boolean,
  ) => void;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [alloc, setAlloc] = useState(100);
  const [billable, setBillable] = useState(true);
  const existingIds = new Set(projectAssignments.map((a) => a.userId));
  const availableUsers = users.filter(
    (u) => u.accountStatus === "ACTIVE" && !existingIds.has(u.id),
  );
  const roles = [
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
  return (
    <DialogWrapper title="Thêm thành viên" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Nhân viên *
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            <option value="">Chọn nhân viên</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.userCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Vai trò *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            <option value="">Chọn vai trò</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Allocation %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={alloc}
            onChange={(e) => setAlloc(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="rounded"
          />{" "}
          Billable
        </label>
        <button
          onClick={() => {
            if (userId && role) onSave(userId, role, alloc, billable);
          }}
          disabled={!userId || !role}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Thêm
        </button>
      </div>
    </DialogWrapper>
  );
}

function ExpenseDialog({
  onSave,
  onClose,
}: {
  onSave: (
    title: string,
    cat: ProjectExpenseCategory,
    amount: number,
    date: string,
  ) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<ProjectExpenseCategory>("SOFTWARE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("2025-03-12");
  return (
    <DialogWrapper title="Submit chi phí" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Tiêu đề *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Danh mục *
          </label>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as ProjectExpenseCategory)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            {Object.entries(expCategoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Số tiền (VND) *
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted-foreground block mb-1">
            Ngày *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <button
          onClick={() => {
            if (title && amount) onSave(title, cat, parseInt(amount), date);
          }}
          disabled={!title || !amount}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </DialogWrapper>
  );
}
