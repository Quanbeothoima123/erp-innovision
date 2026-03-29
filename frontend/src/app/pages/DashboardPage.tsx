// ================================================================
// DASHBOARD PAGE — API only, no mockData
// Roles: Admin/HR | Sales | Accountant | Manager | Employee
// ================================================================
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  FolderKanban,
  FileText,
  Handshake,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Building2,
  Target,
  BarChart3,
  Loader2,
  PieChart as PieChartIcon,
  CheckSquare,
  ListTodo,
} from "lucide-react";
import { useNavigate } from "react-router";
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
  AreaChart,
  Area,
} from "recharts";
import * as reportsService from "../../lib/services/reports.service";
import type {
  DashboardReport,
  HRReport,
  PayrollReport,
  FinanceReport,
} from "../../lib/services/reports.service";
import * as leaveService from "../../lib/services/leave.service";
import type {
  ApiLeaveRequest,
  ApiLeaveBalance,
} from "../../lib/services/leave.service";
import * as overtimeService from "../../lib/services/overtime.service";
import type { ApiOvertimeRequest } from "../../lib/services/overtime.service";
import * as attendanceService from "../../lib/services/attendance.service";
import type { ApiAttendanceRequest } from "../../lib/services/attendance.service";
import * as projectsService from "../../lib/services/projects.service";
import type { ApiProject } from "../../lib/services/projects.service";
import * as payrollService from "../../lib/services/payroll.service";
import * as clientsService from "../../lib/services/clients.service";
import type {
  ApiClient,
  ApiContract,
  ApiInvoice,
} from "../../lib/services/clients.service";
import * as tasksService from "../../lib/services/tasks.service";
import type { TaskDashboardSummary } from "../../lib/services/tasks.service";

// ─── Constants ──────────────────────────────────────────────
const DEPT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];
const now = new Date();
const TODAY_LABEL = now.toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ─── Helpers ────────────────────────────────────────────────
const fmtVND = (v: number) =>
  v >= 1e9
    ? `${(v / 1e9).toFixed(1)}B đ`
    : v >= 1e6
      ? `${(v / 1e6).toFixed(0)}M đ`
      : `${new Intl.NumberFormat("vi-VN").format(Math.round(v))} đ`;

const fmtFullVND = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v);

const formatAxis = (v: number) =>
  v >= 1e9
    ? `${(v / 1e9).toFixed(1)}B`
    : v >= 1e6
      ? `${(v / 1e6).toFixed(0)}M`
      : String(v);

const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

function initials(name: string) {
  return name.split(" ").slice(-1)[0]?.[0] ?? "?";
}

// ─── UI Components ───────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
  trend,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: "up" | "down" | null;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-xl p-4 ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-[11px] ${trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
          >
            {trend === "up" ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[22px]">{value}</div>
        <div className="text-[12px] text-muted-foreground">{label}</div>
        {subValue && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      {children}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 h-24 animate-pulse bg-muted/30" />
  );
}

function SectionSkeleton({ h = 280 }: { h?: number }) {
  return (
    <div
      className={`bg-card border border-border rounded-xl animate-pulse bg-muted/30`}
      style={{ height: h }}
    />
  );
}

const CustomTooltipVND = ({ active, payload, label }: any) => {
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
          <span>{fmtFullVND(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { currentUser, can } = useAuth();
  const navigate = useNavigate();
  if (!currentUser) return null;

  const isAdminHR = can("ADMIN", "HR");
  const isManager = can("MANAGER");
  const isSales = can("SALES");
  const isAccountant = can("ACCOUNTANT");

  // Shared KPI data
  const [dash, setDash] = useState<DashboardReport | null>(null);
  const [tasksDash, setTasksDash] = useState<TaskDashboardSummary | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      reportsService.getDashboard().then(setDash),
      tasksService.getDashboardSummary().then(setTasksDash),
    ]).finally(() => setDashLoading(false));
  }, []);

  if (dashLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-[22px]">Xin chào, {currentUser.fullName}</div>
          <div className="text-muted-foreground text-[13px]">{TODAY_LABEL}</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <SectionSkeleton h={320} />
          <SectionSkeleton h={320} />
        </div>
      </div>
    );
  }

  if (isAdminHR)
    return (
      <AdminHRDashboard
        dash={dash}
        tasksDash={tasksDash}
        currentUser={currentUser}
        navigate={navigate}
      />
    );
  if (isSales && !isAdminHR)
    return (
      <SalesDashboard dash={dash} tasksDash={tasksDash} navigate={navigate} />
    );
  if (isAccountant && !isAdminHR && !isSales)
    return (
      <AccountantDashboard
        dash={dash}
        tasksDash={tasksDash}
        navigate={navigate}
      />
    );
  if (isManager && !isAdminHR && !isSales && !isAccountant)
    return (
      <ManagerDashboard
        dash={dash}
        tasksDash={tasksDash}
        currentUser={currentUser}
        navigate={navigate}
      />
    );
  return (
    <EmployeeDashboard
      dash={dash}
      tasksDash={tasksDash}
      currentUser={currentUser}
      navigate={navigate}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED TASKS DASHBOARD SECTION
// ═══════════════════════════════════════════════════════════════

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Gấp",
  HIGH: "Cao",
  MEDIUM: "TB",
  LOW: "Thấp",
};
const STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Chờ review",
  DONE: "Xong",
  CANCELLED: "Huỷ",
};

function TasksDashboardCards({
  tasksDash,
  navigate,
}: {
  tasksDash: TaskDashboardSummary | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (!tasksDash) return null;
  const { stats } = tasksDash;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<ListTodo size={20} />}
        label="Task đang mở"
        value={stats.totalOpen}
        color="bg-blue-500"
        onClick={() => navigate("/tasks")}
      />
      <StatCard
        icon={<AlertTriangle size={20} />}
        label="Quá hạn"
        value={stats.overdue}
        color={stats.overdue > 0 ? "bg-red-500" : "bg-gray-400"}
        onClick={() => navigate("/tasks")}
      />
      <StatCard
        icon={<Clock size={20} />}
        label="Chờ review"
        value={stats.inReview}
        color="bg-amber-500"
        onClick={() => navigate("/tasks")}
      />
      <StatCard
        icon={<CheckSquare size={20} />}
        label="Hoàn thành tuần này"
        value={stats.completedThisWeek}
        color="bg-green-500"
        onClick={() => navigate("/tasks")}
      />
    </div>
  );
}

function TasksDashboardLists({
  tasksDash,
  navigate,
}: {
  tasksDash: TaskDashboardSummary | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (!tasksDash) return null;
  const { myUpcomingTasks, teamOverdueTasks } = tasksDash;
  if (myUpcomingTasks.length === 0 && teamOverdueTasks.length === 0)
    return null;

  return (
    <div
      className={`grid ${teamOverdueTasks.length > 0 ? "lg:grid-cols-2" : ""} gap-4`}
    >
      {myUpcomingTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <ListTodo size={16} className="text-blue-500" /> Task sắp tới của
            tôi
          </h3>
          <div className="space-y-2">
            {myUpcomingTasks.map((t) => (
              <div
                key={t.id}
                className="py-2 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-2 -mx-2"
                onClick={() => navigate("/tasks")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] truncate flex-1">{t.title}</span>
                  <Badge
                    color={
                      PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.MEDIUM
                    }
                  >
                    {PRIORITY_LABELS[t.priority] ?? t.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  {t.deadline && (
                    <span
                      className={
                        new Date(t.deadline) < new Date() ? "text-red-500" : ""
                      }
                    >
                      ⏰ {fmtDate(t.deadline)}
                    </span>
                  )}
                  <span>{STATUS_LABELS[t.status] ?? t.status}</span>
                  {t.project && <span>📁 {t.project.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {teamOverdueTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Task quá hạn
            (team)
          </h3>
          <div className="space-y-2">
            {teamOverdueTasks.map((t) => (
              <div
                key={t.id}
                className="py-2 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-2 -mx-2"
                onClick={() => navigate("/tasks")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] truncate flex-1">{t.title}</span>
                  <Badge
                    color={
                      PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.MEDIUM
                    }
                  >
                    {PRIORITY_LABELS[t.priority] ?? t.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  {t.deadline && (
                    <span className="text-red-500">
                      ⏰ {fmtDate(t.deadline)}
                    </span>
                  )}
                  {t.assignedTo && <span>👤 {t.assignedTo.fullName}</span>}
                  {t.project && <span>📁 {t.project.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN / HR DASHBOARD
// ═══════════════════════════════════════════════════════════════
function AdminHRDashboard({
  dash,
  tasksDash,
  currentUser,
  navigate,
}: {
  dash: DashboardReport | null;
  tasksDash: TaskDashboardSummary | null;
  currentUser: any;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [hr, setHr] = useState<HRReport | null>(null);
  const [payroll, setPayroll] = useState<PayrollReport | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<ApiLeaveRequest[]>([]);
  const [pendingOT, setPendingOT] = useState<ApiOvertimeRequest[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<
    ApiAttendanceRequest[]
  >([]);
  const [activeProjects, setActiveProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    Promise.allSettled([
      reportsService.getHRReport({ year: y }).then(setHr),
      reportsService.getPayrollReport({ year: y }).then(setPayroll),
      leaveService
        .listRequests({ status: "PENDING", limit: 5 })
        .then((r) => setPendingLeaves(r.items)),
      overtimeService
        .listOvertimeRequests({ status: "PENDING", limit: 5 })
        .then((r) => setPendingOT(r.items)),
      attendanceService
        .listRequests({ status: "PENDING", limit: 5 })
        .then((r) => setPendingAttendance(r.items)),
      projectsService
        .listProjects({ status: "ACTIVE", limit: 5 })
        .then((r) => setActiveProjects(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  // Chart data
  const deptDistribution = useMemo(
    () =>
      (hr?.departments ?? [])
        .map((d) => ({
          name: d.name.replace("Phòng ", "").replace("Ban ", ""),
          value: d.headcount,
        }))
        .filter((d) => d.value > 0),
    [hr],
  );

  const empStatusData = useMemo(() => {
    if (!hr) return [];
    const { active, probation, terminated, onLeave } = hr.summary;
    return [
      { name: "Chính thức", value: active },
      { name: "Thử việc", value: probation },
      { name: "Nghỉ phép", value: onLeave },
      { name: "Đã nghỉ", value: terminated },
    ].filter((d) => d.value > 0);
  }, [hr]);

  const salaryTrend = useMemo(
    () =>
      (payroll?.trend ?? []).map((t) => ({
        name: `T${t.month}`,
        gross: t.gross,
        net: t.net,
        deductions: t.gross - t.net,
      })),
    [payroll],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
        <p className="text-muted-foreground text-[13px]">
          {TODAY_LABEL} · Dashboard Quản trị
        </p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={20} />}
          label="Tổng nhân viên"
          value={dash?.employees.total ?? "—"}
          subValue={`${dash?.employees.probation ?? 0} thử việc`}
          color="bg-blue-500"
          trend="up"
          onClick={() => navigate("/employees")}
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Chờ duyệt chấm công"
          value={dash?.pending.attendanceRequests ?? 0}
          color="bg-red-500"
          onClick={() => navigate("/attendance/requests")}
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Đơn nghỉ chờ duyệt"
          value={dash?.pending.leaveRequests ?? 0}
          color="bg-orange-500"
          onClick={() => navigate("/leave/requests")}
        />
        <StatCard
          icon={<Timer size={20} />}
          label="OT chờ duyệt"
          value={dash?.pending.otRequests ?? 0}
          color="bg-purple-500"
          onClick={() => navigate("/overtime")}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Tổng lương NET"
          value={
            dash?.finance.latestPayroll
              ? fmtVND(dash.finance.latestPayroll.totalNet)
              : "—"
          }
          subValue={
            dash?.finance.latestPayroll
              ? `T${dash.finance.latestPayroll.month}/${dash.finance.latestPayroll.year}`
              : ""
          }
          color="bg-green-500"
          onClick={() => navigate("/payroll")}
        />
        <StatCard
          icon={<Receipt size={20} />}
          label="Hóa đơn quá hạn"
          value={dash?.finance.overdueInvoices ?? 0}
          color="bg-red-600"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Công nợ tổng"
          value={
            dash?.finance.outstandingBalance
              ? fmtVND(Number(dash.finance.outstandingBalance))
              : "0 đ"
          }
          color="bg-amber-500"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Dự án đang chạy"
          value={dash?.projects.active ?? 0}
          color="bg-teal-500"
          onClick={() => navigate("/projects")}
        />
      </div>

      {/* Charts Row 1 */}
      {loading ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <SectionSkeleton h={300} />
          <SectionSkeleton h={300} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Department Distribution */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <PieChartIcon size={16} className="text-blue-500" /> Phân bố nhân
              viên theo phòng ban
            </h3>
            {deptDistribution.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                      style={{ fontSize: 11 }}
                    >
                      {deptDistribution.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">
                Chưa có dữ liệu
              </div>
            )}
          </div>

          {/* Employment Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <Users size={16} className="text-green-500" /> Trạng thái nhân
              viên
            </h3>
            {empStatusData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={empStatusData}
                    layout="vertical"
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      className="stroke-border"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip />
                    <Bar dataKey="value" name="Số người" radius={[0, 6, 6, 0]}>
                      {empStatusData.map((_, i) => {
                        const colors = [
                          "#22c55e",
                          "#eab308",
                          "#3b82f6",
                          "#6b7280",
                        ];
                        return <Cell key={i} fill={colors[i] || "#3b82f6"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Salary Trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-green-500" /> Xu hướng lương
              theo kỳ ({new Date().getFullYear()})
            </h3>
            {salaryTrend.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={formatAxis}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomTooltipVND />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="gross"
                      name="Gross"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="net"
                      name="Net"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="deductions"
                      name="Khấu trừ"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">
                Chưa có dữ liệu kỳ lương
              </div>
            )}
          </div>

          {/* Active Projects health */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <FolderKanban size={16} className="text-teal-500" /> Sức khoẻ dự
              án đang chạy
            </h3>
            <div className="space-y-2">
              {activeProjects.length > 0 ? (
                activeProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">
                        {p.projectName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${p.progressPercent ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {p.progressPercent ?? 0}%
                        </span>
                      </div>
                    </div>
                    <Badge
                      color={
                        p.healthStatus === "ON_TRACK"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : p.healthStatus === "AT_RISK"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }
                    >
                      {p.healthStatus === "ON_TRACK"
                        ? "🟢 Tốt"
                        : p.healthStatus === "AT_RISK"
                          ? "🟡 Rủi ro"
                          : "🔴 Trễ"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-[13px] py-8">
                  Không có dự án đang chạy
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {!loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pending Leave */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-orange-500" /> Đơn nghỉ
              phép chờ duyệt
            </h3>
            <div className="space-y-2">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px]">
                        {initials(r.user?.fullName ?? "?")}
                      </div>
                      <div>
                        <span className="text-[13px]">
                          {r.user?.fullName ?? "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-2">
                          {r.leaveType?.name} · {r.totalDays} ngày
                        </span>
                      </div>
                    </div>
                    <Badge
                      color={
                        r.currentStep === "MANAGER"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }
                    >
                      Chờ {r.currentStep === "MANAGER" ? "Quản lý" : "HR"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-[13px] py-4">
                  Không có đơn chờ duyệt
                </div>
              )}
            </div>
          </div>

          {/* Pending OT */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <Timer size={16} className="text-purple-500" /> OT chờ duyệt
            </h3>
            <div className="space-y-2">
              {pendingOT.length > 0 ? (
                pendingOT.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px]">
                        {initials(r.user?.fullName ?? "?")}
                      </div>
                      <div>
                        <span className="text-[13px]">
                          {r.user?.fullName ?? "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-2">
                          {r.plannedMinutes} phút · {fmtDate(r.workDate)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      color={
                        r.isHoliday
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : r.isWeekend
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }
                    >
                      {r.isHoliday
                        ? "Lễ ×3"
                        : r.isWeekend
                          ? "CN ×2"
                          : "Thường ×1.5"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-[13px] py-4">
                  Không có OT chờ duyệt
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Pending */}
      {!loading && pendingAttendance.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <Clock size={16} className="text-red-500" /> Yêu cầu chấm công chờ
            duyệt
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {pendingAttendance.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">
                    {initials(r.user?.fullName ?? "?")}
                  </div>
                  <div>
                    <span className="text-[13px]">
                      {r.user?.fullName ?? "—"}
                    </span>
                    <Badge
                      color={
                        r.requestType === "CHECK_IN"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }
                    >
                      {r.requestType === "CHECK_IN" ? "Check-in" : "Check-out"}
                    </Badge>
                  </div>
                </div>
                {r.requestedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.requestedAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <TasksDashboardCards tasksDash={tasksDash} navigate={navigate} />
      <TasksDashboardLists tasksDash={tasksDash} navigate={navigate} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SALES DASHBOARD
// ═══════════════════════════════════════════════════════════════
function SalesDashboard({
  dash,
  tasksDash,
  navigate,
}: {
  dash: DashboardReport | null;
  tasksDash: TaskDashboardSummary | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [myProjects, setMyProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      reportsService
        .getFinanceReport({ year: new Date().getFullYear() })
        .then(setFinance),
      clientsService
        .listClients({ limit: 5, sortBy: "createdAt", sortOrder: "desc" })
        .then((r) => setClients(r.items)),
      clientsService
        .listContracts({ status: "ACTIVE", limit: 5 })
        .then((r) => setContracts(r.items)),
      clientsService
        .listInvoices({ status: "OVERDUE", limit: 5 })
        .then((r) => setInvoices(r.items)),
      projectsService
        .listProjects({ limit: 10 })
        .then((r) => setMyProjects(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  const clientPipeline = useMemo(() => {
    const byStatus: Record<string, number> = {};
    clients.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });
    return [
      { name: "Tiềm năng", value: byStatus["PROSPECT"] ?? 0, color: "#3b82f6" },
      { name: "Hoạt động", value: byStatus["ACTIVE"] ?? 0, color: "#22c55e" },
      { name: "Ngừng HĐ", value: byStatus["INACTIVE"] ?? 0, color: "#6b7280" },
    ].filter((d) => d.value > 0);
  }, [clients]);

  const totalContractValue = finance?.ar.totalContractValue ?? 0;
  const totalReceived = finance?.ar.totalReceived ?? 0;
  const totalOutstanding = finance?.ar.totalOutstanding ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Tổng quan kinh doanh</h1>
        <p className="text-muted-foreground text-[13px]">
          {TODAY_LABEL} · Dashboard Kinh doanh
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Handshake size={20} />}
          label="Tổng khách hàng"
          value={clients.length}
          color="bg-blue-500"
          onClick={() => navigate("/clients")}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Tổng giá trị HĐ"
          value={fmtVND(totalContractValue)}
          color="bg-green-500"
          onClick={() => navigate("/contracts")}
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="Đã thu"
          value={fmtVND(totalReceived)}
          color="bg-teal-500"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Công nợ"
          value={fmtVND(totalOutstanding)}
          color="bg-red-500"
          onClick={() => navigate("/invoices")}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<FileText size={20} />}
          label="HĐ đang thực hiện"
          value={contracts.length}
          color="bg-indigo-500"
          onClick={() => navigate("/contracts")}
        />
        <StatCard
          icon={<Receipt size={20} />}
          label="Hóa đơn quá hạn"
          value={dash?.finance.overdueInvoices ?? 0}
          color="bg-red-600"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Dự án tham gia"
          value={myProjects.length}
          color="bg-purple-500"
          onClick={() => navigate("/projects")}
        />
        <StatCard
          icon={<Target size={20} />}
          label="Tỷ lệ thu nợ"
          value={
            totalContractValue > 0
              ? `${((totalReceived / totalContractValue) * 100).toFixed(0)}%`
              : "—"
          }
          color="bg-amber-500"
        />
      </div>

      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Client Pipeline */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <Handshake size={16} className="text-blue-500" /> Pipeline khách
              hàng
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientPipeline}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                    style={{ fontSize: 11 }}
                  >
                    {clientPipeline.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by client */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-green-500" /> Top khách hàng
              theo công nợ
            </h3>
            {finance?.ar.topDebtors?.length ? (
              <div className="space-y-2 mt-2">
                {finance.ar.topDebtors.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div>
                      <div className="text-[13px]">
                        {d.shortName || d.companyName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        HĐ: {fmtVND(d.totalContractValue)}
                      </div>
                    </div>
                    <span className="text-[13px] text-red-500">
                      {fmtVND(d.outstandingBalance)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-[13px]">
                Không có công nợ
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Clients */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" /> Khách hàng mới
              nhất
            </h3>
            <div className="space-y-2">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <div>
                    <div className="text-[13px]">{c.companyName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.industry || "N/A"} · {c.city || "N/A"}
                    </div>
                  </div>
                  <Badge
                    color={
                      c.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : c.status === "PROSPECT"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                    }
                  >
                    {c.status === "ACTIVE"
                      ? "Hoạt động"
                      : c.status === "PROSPECT"
                        ? "Tiềm năng"
                        : "Ngừng HĐ"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Active Contracts */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" /> Hợp đồng đang
              thực hiện
            </h3>
            <div className="space-y-2">
              {contracts.map((c) => {
                const pct =
                  Number(c.totalValue) > 0
                    ? (Number(c.receivedAmount) / Number(c.totalValue)) * 100
                    : 0;
                return (
                  <div
                    key={c.id}
                    className="py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex justify-between">
                      <div className="text-[13px] truncate">{c.title}</div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                        {fmtVND(Number(c.totalValue))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {contracts.length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">
                  Không có hợp đồng đang chạy
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Overview ── */}
      <TasksDashboardCards tasksDash={tasksDash} navigate={navigate} />
      <TasksDashboardLists tasksDash={tasksDash} navigate={navigate} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTANT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function AccountantDashboard({
  dash,
  navigate,
  tasksDash,
}: {
  dash: DashboardReport | null;
  navigate: ReturnType<typeof useNavigate>;
  tasksDash: TaskDashboardSummary | null;
}) {
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [payroll, setPayroll] = useState<PayrollReport | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const y = new Date().getFullYear();

  useEffect(() => {
    Promise.allSettled([
      reportsService.getFinanceReport({ year: y }).then(setFinance),
      reportsService.getPayrollReport({ year: y }).then(setPayroll),
      clientsService
        .listInvoices({ status: "OVERDUE", limit: 8 })
        .then((r) => setOverdueInvoices(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  const totalNet = dash?.finance.latestPayroll?.totalNet ?? 0;

  const invoiceStatusData = useMemo(() => {
    if (!finance) return [];
    const labels: Record<string, string> = {
      DRAFT: "Nháp",
      SENT: "Đã gửi",
      PAID: "Đã TT",
      PARTIALLY_PAID: "TT 1 phần",
      OVERDUE: "Quá hạn",
      VIEWED: "Đã xem",
      DISPUTED: "Tranh chấp",
      CANCELLED: "Huỷ",
    };
    const colors: Record<string, string> = {
      DRAFT: "#6b7280",
      SENT: "#3b82f6",
      PAID: "#22c55e",
      PARTIALLY_PAID: "#eab308",
      OVERDUE: "#ef4444",
      VIEWED: "#6366f1",
      DISPUTED: "#f97316",
      CANCELLED: "#9ca3af",
    };
    return Object.entries(finance.invoices.byStatus ?? {})
      .map(([status, data]) => ({
        name: labels[status] || status,
        value: data.count,
        color: colors[status] || "#6b7280",
      }))
      .filter((d) => d.value > 0);
  }, [finance]);

  const salaryTrend = useMemo(
    () =>
      (payroll?.trend ?? []).map((t) => ({
        name: `T${t.month}`,
        gross: t.gross,
        net: t.net,
      })),
    [payroll],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Tổng quan tài chính</h1>
        <p className="text-muted-foreground text-[13px]">
          {TODAY_LABEL} · Dashboard Kế toán
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Receipt size={20} />}
          label="Tổng hóa đơn"
          value={fmtVND(finance?.invoices.totalInvoiced ?? 0)}
          color="bg-blue-500"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Đã thu"
          value={fmtVND(finance?.ar.totalReceived ?? 0)}
          color="bg-green-500"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Công nợ"
          value={fmtVND(finance?.invoices.totalOutstanding ?? 0)}
          color="bg-amber-500"
        />
        <StatCard
          icon={<XCircle size={20} />}
          label="Quá hạn"
          value={`${dash?.finance.overdueInvoices ?? 0} hóa đơn`}
          subValue={fmtVND(Number(dash?.finance.outstandingBalance ?? 0))}
          color="bg-red-500"
          onClick={() => navigate("/invoices")}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Tổng lương NET"
          value={fmtVND(totalNet)}
          subValue={
            dash?.finance.latestPayroll
              ? `Kỳ T${dash.finance.latestPayroll.month}/${dash.finance.latestPayroll.year}`
              : ""
          }
          color="bg-green-600"
          onClick={() => navigate("/payroll")}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Tổng thu thanh toán"
          value={fmtVND(finance?.revenue.totalReceived ?? 0)}
          color="bg-teal-500"
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="Tỷ lệ thu nợ"
          value={
            finance?.ar.totalContractValue
              ? `${((finance.ar.totalReceived / finance.ar.totalContractValue) * 100).toFixed(0)}%`
              : "—"
          }
          color="bg-indigo-500"
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Thanh toán tháng này"
          value={finance?.revenue.paymentCount ?? 0}
          color="bg-purple-500"
        />
      </div>

      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Invoice Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <PieChartIcon size={16} className="text-blue-500" /> Trạng thái
              hóa đơn
            </h3>
            {invoiceStatusData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                      style={{ fontSize: 11 }}
                    >
                      {invoiceStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">
                Chưa có dữ liệu
              </div>
            )}
          </div>

          {/* Salary Trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-green-500" /> Xu hướng lương{" "}
              {y}
            </h3>
            {salaryTrend.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salaryTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={formatAxis}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomTooltipVND />} />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      name="Gross"
                      stroke="#3b82f6"
                      fill="#3b82f620"
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#22c55e"
                      fill="#22c55e20"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Hóa đơn quá hạn
          </h3>
          {overdueInvoices.length > 0 ? (
            <div className="divide-y divide-border">
              {overdueInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <div className="text-[13px]">{inv.invoiceCode}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Hạn: {inv.dueDate ? fmtDate(inv.dueDate) : "—"}
                    </div>
                  </div>
                  <span className="text-[13px] text-red-500">
                    {fmtVND(Number(inv.outstandingAmount ?? 0))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-[13px] py-4">
              Không có hóa đơn quá hạn
            </div>
          )}
        </div>
      )}

      {/* ── Task Overview ── */}
      <TasksDashboardCards tasksDash={tasksDash} navigate={navigate} />
      <TasksDashboardLists tasksDash={tasksDash} navigate={navigate} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ManagerDashboard({
  dash,
  currentUser,
  navigate,
  tasksDash,
}: {
  dash: DashboardReport | null;
  currentUser: any;
  navigate: ReturnType<typeof useNavigate>;
  tasksDash: TaskDashboardSummary | null;
}) {
  const [pendingLeaves, setPendingLeaves] = useState<ApiLeaveRequest[]>([]);
  const [pendingOT, setPendingOT] = useState<ApiOvertimeRequest[]>([]);
  const [myProjects, setMyProjects] = useState<ApiProject[]>([]);
  const [myBalances, setMyBalances] = useState<ApiLeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      leaveService
        .listRequests({ status: "PENDING", limit: 5 })
        .then((r) => setPendingLeaves(r.items)),
      overtimeService
        .listOvertimeRequests({ status: "PENDING", limit: 5 })
        .then((r) => setPendingOT(r.items)),
      projectsService.getMyProjects().then(async (assignments) => {
        // getMyProjects trả về ApiAssignment[], project chỉ có id/name
        // Lấy full project list để có healthStatus, progressPercent
        const projectIds = [
          ...new Set(assignments.map((a) => a.project?.id).filter(Boolean)),
        ];
        if (projectIds.length > 0) {
          const r = await projectsService.listProjects({ limit: 20 });
          const myIds = new Set(projectIds);
          setMyProjects(r.items.filter((p) => myIds.has(p.id)));
        }
      }),
      leaveService.getMyBalances().then(setMyBalances),
    ]).finally(() => setLoading(false));
  }, []);

  const annualBalance = myBalances.find(
    (b) => b.leaveType?.code === "ANNUAL" || b.leaveType?.name?.includes("Năm"),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
        <p className="text-muted-foreground text-[13px]">
          {TODAY_LABEL} · Dashboard Quản lý
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Đơn nghỉ chờ duyệt"
          value={dash?.pending.leaveRequests ?? pendingLeaves.length}
          color="bg-orange-500"
          onClick={() => navigate("/leave/requests")}
        />
        <StatCard
          icon={<Timer size={20} />}
          label="OT chờ duyệt"
          value={dash?.pending.otRequests ?? pendingOT.length}
          color="bg-purple-500"
          onClick={() => navigate("/overtime")}
        />
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Dự án của tôi"
          value={myProjects.length}
          color="bg-teal-500"
          onClick={() => navigate("/projects")}
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Phép năm còn lại"
          value={annualBalance?.remainingDays ?? "—"}
          color="bg-blue-500"
          onClick={() => navigate("/leave/requests")}
        />
      </div>

      {!loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pending Leave */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-orange-500" /> Đơn nghỉ
              chờ duyệt
            </h3>
            <div className="space-y-2">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px]">
                        {initials(r.user?.fullName ?? "?")}
                      </div>
                      <div>
                        <div className="text-[13px]">
                          {r.user?.fullName ?? "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.leaveType?.name} · {r.totalDays} ngày ·{" "}
                          {fmtDate(r.startDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-[13px] py-4">
                  Không có đơn chờ duyệt
                </div>
              )}
            </div>
          </div>

          {/* My Projects */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <FolderKanban size={16} className="text-teal-500" /> Dự án của tôi
            </h3>
            <div className="space-y-3">
              {myProjects
                .filter((p) => ["ACTIVE", "PLANNING"].includes(p.status))
                .map((p) => (
                  <div
                    key={p.id}
                    className="py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-[13px]">{p.projectName}</div>
                      {p.healthStatus && (
                        <Badge
                          color={
                            p.healthStatus === "ON_TRACK"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : p.healthStatus === "AT_RISK"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {p.healthStatus === "ON_TRACK"
                            ? "🟢"
                            : p.healthStatus === "AT_RISK"
                              ? "🟡"
                              : "🔴"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${p.progressPercent ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {p.progressPercent ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
              {myProjects.filter((p) =>
                ["ACTIVE", "PLANNING"].includes(p.status),
              ).length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">
                  Chưa tham gia dự án nào
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Overview ── */}
      <TasksDashboardCards tasksDash={tasksDash} navigate={navigate} />
      <TasksDashboardLists tasksDash={tasksDash} navigate={navigate} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE DASHBOARD
// ═══════════════════════════════════════════════════════════════
function EmployeeDashboard({
  dash,
  currentUser,
  navigate,
  tasksDash,
}: {
  dash: DashboardReport | null;
  currentUser: any;
  navigate: ReturnType<typeof useNavigate>;
  tasksDash: TaskDashboardSummary | null;
}) {
  const [myBalances, setMyBalances] = useState<ApiLeaveBalance[]>([]);
  const [myProjects, setMyProjects] = useState<ApiProject[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<{
    netSalary: number;
    grossSalary: number;
    baseSalary: number;
    totalDeductions: number;
  } | null>(null);
  const [myOT, setMyOT] = useState<ApiOvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      leaveService.getMyBalances().then(setMyBalances),
      projectsService.getMyProjects().then(async (assignments) => {
        const projectIds = [
          ...new Set(assignments.map((a) => a.project?.id).filter(Boolean)),
        ];
        if (projectIds.length > 0) {
          const r = await projectsService.listProjects({ limit: 20 });
          const myIds = new Set(projectIds);
          setMyProjects(r.items.filter((p) => myIds.has(p.id)));
        }
      }),
      overtimeService
        .getMyOvertimeRequests({ status: "APPROVED", limit: 10 })
        .then((r) => setMyOT(r.items)),
      // Get latest payslip from most recent period
      payrollService.listPeriods({ limit: 1 }).then(async (r) => {
        if (r.items?.[0]) {
          try {
            const slip = await payrollService.getMyPayslip(r.items[0].id);
            setLatestPayroll({
              netSalary: slip.netSalary,
              grossSalary: slip.grossSalary,
              baseSalary: slip.baseSalary,
              totalDeductions: slip.totalDeductions,
            });
          } catch {
            /* no payslip yet */
          }
        }
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const annualBalance = myBalances.find(
    (b) => b.leaveType?.code === "ANNUAL" || b.leaveType?.name?.includes("Năm"),
  );
  const pendingLeaveCount = myBalances.reduce(
    (s, b) => s + (b.pendingDays ?? 0),
    0,
  );
  const totalOTMinutes = myOT.reduce(
    (s, r) => s + (r.actualMinutes ?? r.plannedMinutes),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
        <p className="text-muted-foreground text-[13px]">
          {TODAY_LABEL} · Dashboard Nhân viên
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div
          className="bg-card border border-border rounded-xl p-6 col-span-2 md:col-span-1 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all"
          onClick={() => navigate("/attendance/my")}
        >
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white mb-2">
            <Clock size={28} />
          </div>
          <div className="text-[15px]">Chấm công</div>
          <div className="text-[12px] text-muted-foreground">
            Gửi yêu cầu Check-in/out
          </div>
        </div>
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Phép năm còn lại"
          value={annualBalance?.remainingDays ?? "—"}
          subValue={
            pendingLeaveCount > 0
              ? `${pendingLeaveCount} ngày đang chờ`
              : undefined
          }
          color="bg-blue-500"
          onClick={() => navigate("/leave/requests")}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Lương NET gần nhất"
          value={latestPayroll ? fmtVND(latestPayroll.netSalary) : "—"}
          subValue={
            dash?.finance.latestPayroll
              ? `T${dash.finance.latestPayroll.month}/${dash.finance.latestPayroll.year}`
              : ""
          }
          color="bg-green-500"
          onClick={() => navigate("/payroll")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Timer size={20} />}
          label="OT đã duyệt"
          value={myOT.length}
          subValue={
            totalOTMinutes > 0
              ? `${Math.round(totalOTMinutes / 60)}h tổng`
              : "Chưa có OT"
          }
          color="bg-purple-500"
          onClick={() => navigate("/overtime")}
        />
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Dự án tham gia"
          value={
            myProjects.filter((p) => ["ACTIVE", "PLANNING"].includes(p.status))
              .length
          }
          color="bg-teal-500"
          onClick={() => navigate("/projects")}
        />
      </div>

      {!loading && myBalances.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-500" /> Số dư phép năm{" "}
            {new Date().getFullYear()}
          </h3>
          <div className="space-y-3">
            {myBalances
              .filter((b) => b.year === new Date().getFullYear())
              .map((b) => {
                const total = (b.entitledDays ?? 0) + (b.carriedDays ?? 0);
                const pct = total > 0 ? ((b.usedDays ?? 0) / total) * 100 : 0;
                return (
                  <div key={`${b.userId}-${b.leaveTypeId}`}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span>{b.leaveType?.name ?? "—"}</span>
                      <span className="text-muted-foreground">
                        Đã dùng {b.usedDays ?? 0}/{total} · Còn{" "}
                        <span className="text-foreground">
                          {b.remainingDays ?? 0}
                        </span>{" "}
                        ngày
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {!loading && latestPayroll && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" /> Tóm tắt lương{" "}
            {dash?.finance.latestPayroll
              ? `T${dash.finance.latestPayroll.month}/${dash.finance.latestPayroll.year}`
              : ""}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">
                Lương cơ bản
              </div>
              <div className="text-[15px] mt-0.5">
                {fmtFullVND(latestPayroll.baseSalary)}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">
                Lương Gross
              </div>
              <div className="text-[15px] mt-0.5">
                {fmtFullVND(latestPayroll.grossSalary)}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">
                Tổng khấu trừ
              </div>
              <div className="text-[15px] mt-0.5 text-red-500">
                -{fmtFullVND(latestPayroll.totalDeductions)}
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-[11px] text-green-600 dark:text-green-400">
                Thực nhận (NET)
              </div>
              <div className="text-[15px] mt-0.5 text-green-700 dark:text-green-400">
                {fmtFullVND(latestPayroll.netSalary)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading &&
        myProjects.filter((p) => ["ACTIVE", "PLANNING"].includes(p.status))
          .length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2">
              <FolderKanban size={16} className="text-teal-500" /> Dự án đang
              tham gia
            </h3>
            <div className="space-y-3">
              {myProjects
                .filter((p) => ["ACTIVE", "PLANNING"].includes(p.status))
                .map((p) => (
                  <div
                    key={p.id}
                    className="py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[13px]">{p.projectName}</div>
                      {p.healthStatus && (
                        <Badge
                          color={
                            p.healthStatus === "ON_TRACK"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : p.healthStatus === "AT_RISK"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {p.healthStatus === "ON_TRACK"
                            ? "🟢 Tốt"
                            : p.healthStatus === "AT_RISK"
                              ? "🟡 Rủi ro"
                              : "🔴 Trễ"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${p.progressPercent ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {p.progressPercent ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* ── Task Overview ── */}
      <TasksDashboardCards tasksDash={tasksDash} navigate={navigate} />
      <TasksDashboardLists tasksDash={tasksDash} navigate={navigate} />
    </div>
  );
}
