// ================================================================
// REPORTS PAGE — Module 10 (Full API + Figma UI)
// Combines figma design (filters, tables, rich charts) + real API
// ================================================================
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import * as reportsService from "../../lib/services/reports.service";
import type {
  HRReport,
  AttendanceReport,
  LeaveReport,
  PayrollReport,
  ProjectReport,
  FinanceReport,
  OvertimeReport,
} from "../../lib/services/reports.service";
import * as departmentsService from "../../lib/services/departments.service";
import { ApiError } from "../../lib/apiClient";
import {
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  FolderKanban,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Receipt,
  Activity,
  CreditCard,
  Timer,
  Loader2,
  RefreshCw,
} from "lucide-react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
} from "recharts";

// ─── Shared helpers ───────────────────────────────────────────
const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
];
const DEDUCT_COLORS = ["#ef4444", "#f97316", "#eab308", "#8b5cf6"];
const MONTHS_LABEL = [
  "",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];
const NOW = new Date();

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}tr`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};
const fmtAxis = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

// ─── Shared UI ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-[12px]">
      <div className="text-muted-foreground mb-1">
        {typeof label === "number" && label >= 1 && label <= 12
          ? MONTHS_LABEL[label]
          : label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>
            {typeof p.value === "number" && p.value > 10000
              ? fmtVND(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: { value: string; up: boolean } | null;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-[11px] ${trend.up ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
          >
            {trend.up ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {trend.value}
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

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}
    >
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-[14px]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-[13px]">Đang tải báo cáo...</span>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <AlertTriangle size={32} className="text-amber-500" />
      <div className="text-[14px] text-center">{message}</div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent flex items-center gap-1"
      >
        <RefreshCw size={14} /> Thử lại
      </button>
    </div>
  );
}

function YearSelect({
  year,
  onChange,
}: {
  year: number;
  onChange: (y: number) => void;
}) {
  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);
  return (
    <select
      value={year}
      onChange={(e) => onChange(+e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function MonthSelect({
  month,
  onChange,
}: {
  month: number;
  onChange: (m: number) => void;
}) {
  return (
    <select
      value={month}
      onChange={(e) => onChange(+e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
    >
      <option value={0}>Tất cả tháng</option>
      {Array.from({ length: 12 }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          Tháng {i + 1}
        </option>
      ))}
    </select>
  );
}

function DeptSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    departmentsService
      .listDepartments({ limit: 100 })
      .then((r: any) => setDepts(r.items ?? r))
      .catch(() => {});
  }, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
    >
      <option value="">Tất cả phòng ban</option>
      {depts.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. HR REPORT
// ═══════════════════════════════════════════════════════════════
export function HRReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<HRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getHRReport({ year }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const deptData = (data?.departments ?? []).map((d) => ({
    name: d.name.replace("Phòng ", ""),
    value: d.headcount,
  }));
  const statusData = s
    ? [
        { name: "Chính thức", value: s.active, color: "#22c55e" },
        { name: "Thử việc", value: s.probation, color: "#f59e0b" },
        { name: "Nghỉ phép", value: s.onLeave, color: "#3b82f6" },
        { name: "Đã nghỉ", value: s.terminated, color: "#94a3b8" },
      ].filter((d) => d.value > 0)
    : [];
  const hireData = (data?.hireHistory ?? []).map((h) => ({
    period: String(h.year),
    count: h.count,
  }));
  const roleData = (data?.roles ?? []).map((r) => ({
    name: r.role,
    count: r.count,
  }));
  const avgTenure = (() => {
    const t = data?.topTenured ?? [];
    return t.length > 0
      ? t.reduce((s, u) => s + (u.tenureYears ?? 0), 0) / t.length
      : 0;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Nhân sự</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tổng quan về lực lượng lao động của công ty
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect year={year} onChange={setYear} />
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Users size={20} />}
              label="Tổng nhân viên"
              value={s.total}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Đang làm việc"
              value={s.active}
              subValue={`${Math.round((s.active / Math.max(s.total, 1)) * 100)}%`}
              color="bg-green-600"
              trend={{ value: "+2", up: true }}
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Đang thử việc"
              value={s.probation}
              color="bg-yellow-500"
            />
            <StatCard
              icon={<Clock size={20} />}
              label="Thâm niên TB"
              value={`${avgTenure.toFixed(1)} năm`}
              color="bg-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Phân bố theo phòng ban">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={deptData}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nhân viên" radius={[0, 4, 4, 0]}>
                    {deptData.map((d, i) => (
                      <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tình trạng nhân sự">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {statusData.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {hireData.length > 0 && (
              <ChartCard title="Xu hướng tuyển dụng">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={hireData} margin={{ left: 0, right: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="period"
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Tuyển mới"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {roleData.length > 0 && (
              <ChartCard title="Phân bố vai trò">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    data={roleData}
                  >
                    <PolarGrid stroke="var(--color-border-tertiary)" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <PolarRadiusAxis
                      tick={{
                        fontSize: 10,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Radar
                      name="Số lượng"
                      dataKey="count"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {(data?.topTenured ?? []).length > 0 && (
            <ChartCard title="Top 10 nhân viên thâm niên cao nhất">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground hidden md:table-cell">
                        Phòng ban
                      </th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground hidden md:table-cell">
                        Chức danh
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Thâm niên
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground hidden lg:table-cell">
                        Ngày vào
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topTenured.map((u, i) => (
                      <tr
                        key={u.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-[13px]">{u.fullName}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {u.userCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] hidden md:table-cell">
                          {u.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] hidden md:table-cell">
                          {u.jobTitle?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right text-blue-600">
                          {u.tenureYears
                            ? `${u.tenureYears.toFixed(1)} năm`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-right text-muted-foreground hidden lg:table-cell">
                          {u.hireDate
                            ? new Date(u.hireDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. ATTENDANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function AttendanceReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [deptId, setDeptId] = useState("");
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await reportsService.getAttendanceReport({
          year,
          month,
          departmentId: deptId || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year, month, deptId]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const dailyData = (data?.dailyTrend ?? []).map((d) => ({
    date: String(d.date).slice(8, 10),
    present: Number(d.present ?? 0),
    absent: Number(d.absent ?? 0),
    leave: Number(d.onLeave ?? 0),
    late: Number(d.lateCount ?? 0),
  }));
  const statusPie = s
    ? [
        { name: "Có mặt", value: s.presentCount ?? 0, color: "#22c55e" },
        { name: "Vắng", value: s.absentCount ?? 0, color: "#ef4444" },
        { name: "Nghỉ phép", value: s.leaveCount ?? 0, color: "#3b82f6" },
      ].filter((d) => d.value > 0)
    : [];
  const deptChart = (data?.deptRates ?? []).map((d) => ({
    name: d.deptName,
    rate: d.rate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Chấm công</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Thống kê chấm công, đi trễ và tỷ lệ có mặt
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-border rounded-lg hover:bg-accent"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <MonthSelect month={month} onChange={setMonth} />
        <YearSelect year={year} onChange={setYear} />
        <DeptSelect value={deptId} onChange={setDeptId} />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Users size={20} />}
              label="Tổng bản ghi"
              value={s.totalRecords}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Tỷ lệ có mặt"
              value={`${s.attendanceRate ?? 0}%`}
              color="bg-green-600"
            />
            <StatCard
              icon={<Clock size={20} />}
              label="TB phút trễ/ngày"
              value={`${Math.round(s.avgLateMinutes ?? 0)} phút`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<Activity size={20} />}
              label="TB giờ làm/ngày"
              value={`${(s.avgWorkHours ?? 0).toFixed(1)}h`}
              color="bg-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Xu hướng chấm công hàng ngày"
              className="lg:col-span-3"
            >
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dailyData} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="present"
                    name="Có mặt"
                    fill="#22c55e"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="absent"
                    name="Vắng"
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="leave"
                    name="Nghỉ phép"
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    name="Đi trễ"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Phân bổ trạng thái" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {statusPie.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {deptChart.length > 0 && (
            <ChartCard title="Tỷ lệ chấm công theo phòng ban">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={deptChart}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Tỷ lệ có mặt"]}
                  />
                  <Bar
                    dataKey="rate"
                    name="Tỷ lệ (%)"
                    radius={[0, 4, 4, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {(data?.topLateUsers ?? []).length > 0 && (
            <ChartCard title="Top nhân viên đi trễ nhiều nhất">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Số lần
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng phút
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        TB phút/lần
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topLateUsers.map((t, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-[13px]">
                            {t.user?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.user?.department?.name ?? ""}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-amber-600">
                          {t.lateCount}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          {t.totalMinutes} phút
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">
                          {t.avgMinutes} phút
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. FINANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function FinanceReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getFinanceReport({ year }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const rev = data?.revenue;
  const ar = data?.ar;
  const monthlyData = (rev?.monthlyTrend ?? []).map((m) => ({
    month: m.month,
    amount: m.amount,
  }));
  const methodData = (data?.revenueByMethod ?? []).map((m) => ({
    name: m.method,
    value: m.amount,
  }));
  const clientData = (data?.revenueByClient ?? []).map((c) => ({
    name: c.client?.shortName ?? c.client?.companyName ?? "—",
    value: c.totalAmount,
  }));
  const invByStatus =
    data?.invoices?.byStatus ??
    ({} as Record<
      string,
      {
        count: number;
        totalAmount: number;
        paidAmount: number;
        outstanding: number;
      }
    >);
  const invStatusData = Object.entries(invByStatus)
    .map(([k, v]) => ({ name: k, value: v.count }))
    .filter((d) => d.value > 0);
  const totalInvoiced = data?.invoices?.totalInvoiced ?? 0;
  const totalOutstandingInv = data?.invoices?.totalOutstanding ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Tài chính</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Doanh thu, thanh toán & công nợ khách hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect year={year} onChange={setYear} />
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign size={20} />}
              label="Đã thu"
              value={fmtShort(rev?.totalReceived ?? 0)}
              color="bg-green-600"
            />
            <StatCard
              icon={<FileText size={20} />}
              label="Tổng hóa đơn"
              value={fmtShort(totalInvoiced)}
              subValue={`${invStatusData.reduce((s, v) => s + v.value, 0)} HĐ`}
              color="bg-blue-600"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Công nợ tồn đọng"
              value={fmtShort(totalOutstandingInv)}
              color="bg-red-500"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Tỷ lệ thu"
              value={`${ar?.collectionRate ?? 0}%`}
              subValue={`AR: ${fmtShort(ar?.totalOutstanding ?? 0)}`}
              color="bg-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Doanh thu theo tháng" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => MONTHS_LABEL[m]}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Số tiền" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {clientData.length > 0 && (
              <ChartCard
                title="Doanh thu theo khách hàng"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={clientData}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={fmtAxis}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Đã nhận" radius={[0, 4, 4, 0]}>
                      {clientData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {invStatusData.length > 0 && (
              <ChartCard title="Trạng thái hóa đơn">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={invStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {invStatusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {methodData.length > 0 && (
              <ChartCard title="Theo phương thức thanh toán">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {methodData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {(ar?.topDebtors ?? []).length > 0 && (
            <ChartCard title="Top công nợ chưa thu">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Khách hàng
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng HĐ
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Đã thu
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Còn nợ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ar!.topDebtors.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-[13px]">{d.companyName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {d.clientCode}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px]">
                          {fmtVND(d.totalContractValue)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px] text-green-600">
                          {fmtVND(d.totalReceivedAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-red-500">
                          {fmtVND(d.outstandingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. PROJECT REPORT
// ═══════════════════════════════════════════════════════════════
export function ProjectReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getProjectReport({ year }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const sMap =
    data?.statusBreakdown ??
    ({} as Record<string, { count: number; budget: number; spent: number }>);
  const hMap = data?.healthBreakdown ?? ({} as Record<string, number>);
  const statusLabels: Record<string, string> = {
    ACTIVE: "Đang TH",
    COMPLETED: "Hoàn thành",
    PLANNING: "Lập KH",
    ON_HOLD: "Tạm dừng",
    CANCELLED: "Huỷ",
  };
  const healthLabels: Record<string, string> = {
    ON_TRACK: "Đúng tiến độ",
    AT_RISK: "Có rủi ro",
    OFF_TRACK: "Trễ tiến độ",
  };
  const statusData = Object.entries(sMap).map(([k, v]) => ({
    name: statusLabels[k] ?? k,
    value: v.count,
  }));
  const healthData = Object.entries(hMap).map(([k, v]) => ({
    name: healthLabels[k] ?? k,
    value: v,
    color:
      k === "ON_TRACK" ? "#22c55e" : k === "AT_RISK" ? "#f59e0b" : "#ef4444",
  }));
  const totalP = statusData.reduce((s, d) => s + d.value, 0);
  const activeP = sMap?.ACTIVE?.count ?? 0;
  const completedP = sMap?.COMPLETED?.count ?? 0;
  const atRiskP = hMap?.AT_RISK ?? 0;
  const expenseData = (data?.expenseByCategory ?? []).map((e) => ({
    name: e.category,
    value: e.amount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Dự án</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tiến độ, ngân sách và sức khoẻ dự án
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect year={year} onChange={setYear} />
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<FolderKanban size={20} />}
              label="Tổng dự án"
              value={totalP}
              color="bg-blue-600"
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Đang thực hiện"
              value={activeP}
              color="bg-green-600"
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Hoàn thành"
              value={completedP}
              color="bg-teal-600"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Có rủi ro"
              value={atRiskP}
              color="bg-red-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Phân bổ theo trạng thái">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {healthData.length > 0 && (
              <ChartCard title="Sức khoẻ dự án đang TH">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {healthData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {expenseData.length > 0 && (
              <ChartCard title="Chi phí theo loại">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {expenseData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {(data?.projects ?? []).length > 0 && (
            <ChartCard title="Ngân sách vs Chi tiêu — tất cả dự án">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Dự án
                      </th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Trạng thái
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tiến độ
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Ngân sách
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Đã chi
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        % Ngân sách
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.projects.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-[13px]">{p.projectName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.projectCode}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"}`}
                          >
                            {statusLabels[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          {p.progressPercent}%
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px]">
                          {fmtVND(p.budgetAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px]">
                          {fmtVND(p.spentAmount)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right text-[13px] ${p.isOverBudget ? "text-red-500" : "text-green-600"}`}
                        >
                          {p.budgetUsedPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {(data?.expiringSoon ?? []).length > 0 && (
            <ChartCard title="Dự án sắp hết hạn (30 ngày tới)">
              <div className="space-y-2">
                {data!.expiringSoon.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <div>
                      <div className="text-[13px]">{p.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        PM: {p.projectManager?.fullName ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] text-amber-600">
                        {new Date(p.endDate).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.progressPercent}% tiến độ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5. LEAVE REPORT
// ═══════════════════════════════════════════════════════════════
export function LeaveReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<LeaveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getLeaveReport({ year }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const sMap =
    data?.statusBreakdown ??
    ({} as Record<string, { count: number; days: number }>);
  const approved = sMap?.APPROVED ?? { count: 0, days: 0 };
  const pending = sMap?.PENDING ?? { count: 0, days: 0 };
  const rejected = sMap?.REJECTED ?? { count: 0, days: 0 };
  const total = approved.count + pending.count + rejected.count;
  const balance = data?.balanceSummary;
  const typeData = (data?.byLeaveType ?? []).map((lt) => ({
    name: lt.leaveType?.name ?? "Khác",
    days: lt.days,
    count: lt.count,
  }));
  const monthlyData = (data?.monthlyTrend ?? []).map((m) => ({
    month: m.month,
    approved: m.approved,
    rejected: m.rejected,
    approvedDays: m.approvedDays,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Nghỉ phép</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tổng hợp đơn nghỉ phép và số dư phép năm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect year={year} onChange={setYear} />
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-border rounded-lg hover:bg-accent"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<FileText size={20} />}
              label="Tổng đơn"
              value={total}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Đã duyệt"
              value={approved.count}
              subValue={`${approved.days} ngày`}
              color="bg-green-600"
            />
            <StatCard
              icon={<Clock size={20} />}
              label="Chờ duyệt"
              value={pending.count}
              subValue={`${pending.days} ngày`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<XCircle size={20} />}
              label="Từ chối"
              value={rejected.count}
              color="bg-red-500"
            />
          </div>

          {balance && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  label: "Tổng được cấp",
                  value: balance.totalEntitled,
                  cls: "text-blue-600",
                },
                {
                  label: "Ngày chuyển kỳ",
                  value: balance.totalCarried,
                  cls: "text-purple-600",
                },
                {
                  label: "Đã sử dụng",
                  value: balance.totalUsed,
                  cls: "text-amber-600",
                },
                {
                  label: "Còn lại",
                  value: balance.totalRemaining,
                  cls: "text-green-600",
                },
                {
                  label: "Tỷ lệ sử dụng",
                  value: `${balance.usageRate}%`,
                  cls: "text-foreground",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-card border border-border rounded-xl p-3 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {c.label}
                  </div>
                  <div className={`text-[18px] ${c.cls}`}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {typeData.length > 0 && (
              <ChartCard title="Ngày nghỉ theo loại phép">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={typeData} margin={{ left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="days" name="Ngày" radius={[4, 4, 0, 0]}>
                      {typeData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
            {monthlyData.length > 0 && (
              <ChartCard title="Xu hướng nghỉ phép theo tháng">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => MONTHS_LABEL[m]}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="approved"
                      name="Đã duyệt"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="rejected"
                      name="Từ chối"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {(data?.topUsers ?? []).length > 0 && (
            <ChartCard title="Top nhân viên nghỉ nhiều nhất">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground hidden md:table-cell">
                        Loại phép
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Được cấp
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Đã dùng
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Còn lại
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tỷ lệ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topUsers.map((u, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-[13px]">
                            {u.user?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {u.user?.department?.name ?? ""}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] hidden md:table-cell">
                          {u.leaveType?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px]">
                          {u.entitledDays}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-amber-600">
                          {u.usedDays}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-green-600">
                          {u.remainingDays}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">
                          {u.usageRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. PAYROLL REPORT — richest page, mirrors figma exactly
// ═══════════════════════════════════════════════════════════════
export function PayrollReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(0);
  const [deptId, setDeptId] = useState("");
  const [data, setData] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await reportsService.getPayrollReport({
          year,
          month: month || undefined,
          departmentId: deptId || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year, month, deptId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.summary;
  const trendData = (data?.trend ?? []).map((t) => ({
    month: `T${t.month}`,
    totalGross: t.gross,
    totalNet: t.net,
    employeeCount: t.headcount,
  }));
  const deptBreakdown = (data?.deptBreakdown ?? [])
    .map((d) => ({
      name: d.deptName?.replace("Phòng ", "") ?? "",
      avgGross: d.avgGross,
      totalGross: d.totalGross,
      totalNet: d.totalNet,
      employeeCount: d.headcount,
    }))
    .filter((d) => d.employeeCount > 0)
    .sort((a, b) => b.totalGross - a.totalGross);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Bảng lương</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tổng hợp chi phí lương, khấu trừ và cơ cấu thu nhập
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 transition-colors">
          <Download size={14} /> Xuất báo cáo
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <YearSelect year={year} onChange={setYear} />
        <MonthSelect month={month} onChange={setMonth} />
        <DeptSelect value={deptId} onChange={setDeptId} />
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-border rounded-lg hover:bg-accent"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !stats ? (
        <div className="text-center py-16 text-muted-foreground text-[14px]">
          Chưa có dữ liệu lương cho kỳ này
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign size={20} />}
              label="Tổng Gross"
              value={fmtShort(stats.totalGross)}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CreditCard size={20} />}
              label="Tổng Net"
              value={fmtShort(stats.totalNet)}
              color="bg-purple-600"
            />
            <StatCard
              icon={<TrendingDown size={20} />}
              label="Tỉ lệ khấu trừ"
              value={`${stats.deductionRate}%`}
              color="bg-red-500"
            />
            <StatCard
              icon={<Users size={20} />}
              label="Số nhân viên"
              value={stats.headcount}
              subValue={`Avg: ${fmtVND(stats.avgGross)}`}
              color="bg-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Xu hướng lương theo tháng"
              className="lg:col-span-3"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="totalGross"
                    name="Gross"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalNet"
                    name="Net"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cơ cấu lương" className="lg:col-span-2">
              {(data?.payrollComposition ?? []).length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={data!.payrollComposition}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={50}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {data!.payrollComposition.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 px-2">
                    {data!.payrollComposition.map((c, i) => (
                      <div
                        key={c.name}
                        className="flex items-center gap-1.5 text-[11px]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{c.name}:</span>
                        <span>{fmtShort(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-muted-foreground text-[13px]">
                  Không có dữ liệu
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(data?.deductionBreakdown ?? []).length > 0 && (
              <ChartCard title="Cơ cấu khấu trừ">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data!.deductionBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {data!.deductionBreakdown.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DEDUCT_COLORS[i % DEDUCT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {deptBreakdown.length > 0 && (
              <ChartCard title="Lương trung bình theo phòng ban">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={[...deptBreakdown].sort(
                      (a, b) => b.avgGross - a.avgGross,
                    )}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={fmtAxis}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="avgGross"
                      name="Avg Gross"
                      radius={[0, 4, 4, 0]}
                    >
                      {deptBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {deptBreakdown.length > 0 && (
            <ChartCard title="Chi tiết kỳ lương theo phòng ban">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Phòng ban
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Số NV
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Avg Gross
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng Gross
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptBreakdown.map((d) => (
                      <tr
                        key={d.name}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5 text-[13px]">{d.name}</td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {d.employeeCount}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {fmtVND(d.avgGross)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {fmtVND(d.totalGross)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-right">
                          {fmtVND(d.totalNet)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-accent/30 border-t-2 border-border">
                      <td className="px-4 py-2.5 text-[13px]">Tổng cộng</td>
                      <td className="px-4 py-2.5 text-[13px] text-right">
                        {stats.headcount}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-right">
                        {fmtVND(stats.avgGross)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-right">
                        {fmtVND(stats.totalGross)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-right">
                        {fmtVND(stats.totalNet)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. OVERTIME REPORT
// ═══════════════════════════════════════════════════════════════
export function OvertimeReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(0);
  const [deptId, setDeptId] = useState("");
  const [data, setData] = useState<OvertimeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await reportsService.getOvertimeReport({
          year,
          month: month || undefined,
          departmentId: deptId || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể tải báo cáo");
    } finally {
      setLoading(false);
    }
  }, [year, month, deptId]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const monthlyData = (data?.monthlyTrend ?? []).map((m) => ({
    month: `T${m.month}`,
    totalHours: m.totalHours,
    weekendH: +(m.weekendMinutes / 60).toFixed(1),
    holidayH: +(m.holidayMinutes / 60).toFixed(1),
  }));
  const dayTypeData = (data?.byDayType ?? []).map((d) => ({
    name: d.label,
    value: d.totalHours,
    count: d.count,
    color: d.isHoliday ? "#ef4444" : d.isWeekend ? "#f59e0b" : "#3b82f6",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Báo cáo Tăng ca (OT)</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Thống kê giờ làm thêm theo nhân viên và loại ngày
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 transition-colors">
          <Download size={14} /> Xuất báo cáo
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <YearSelect year={year} onChange={setYear} />
        <MonthSelect month={month} onChange={setMonth} />
        <DeptSelect value={deptId} onChange={setDeptId} />
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-border rounded-lg hover:bg-accent"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Clock size={20} />}
              label="Tổng giờ OT"
              value={`${s.totalApprovedHours}h`}
              color="bg-blue-600"
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Số phiên OT"
              value={s.sessionCount}
              color="bg-purple-600"
            />
            <StatCard
              icon={<Timer size={20} />}
              label="TB phút/phiên"
              value={`${s.sessionCount > 0 ? Math.round(s.totalApprovedMinutes / s.sessionCount) : 0} phút`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<Users size={20} />}
              label="Nhân viên OT"
              value={data?.topUsers?.length ?? 0}
              color="bg-green-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard title="OT theo tháng" className="lg:col-span-3">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="totalHours"
                      name="Tổng giờ"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="weekendH"
                      name="Cuối tuần"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="holidayH"
                      name="Ngày lễ"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-[13px]">
                  Chưa có dữ liệu tháng
                </div>
              )}
            </ChartCard>

            <ChartCard title="Phân bổ loại ngày" className="lg:col-span-2">
              {dayTypeData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dayTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {dayTypeData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 px-2">
                    {dayTypeData.map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center gap-1.5 text-[11px]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-muted-foreground">{d.name}:</span>
                        <span>
                          {d.value}h ({d.count} lượt)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">
                  Chưa có dữ liệu
                </div>
              )}
            </ChartCard>
          </div>

          {(data?.topUsers ?? []).length > 0 && (
            <ChartCard title="Top 10 nhân viên OT nhiều nhất">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground hidden md:table-cell">
                        Phòng ban
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Số phiên
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng phút
                      </th>
                      <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">
                        Tổng giờ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topUsers.map((u, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-[13px]">
                                {u.user?.fullName ?? "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {u.user?.userCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] hidden md:table-cell">
                          {u.user?.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          {u.sessionCount}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px]">
                          {u.totalMinutes}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] text-blue-600">
                          {(u.totalMinutes / 60).toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
