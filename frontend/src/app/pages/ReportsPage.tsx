// ================================================================
// REPORTS PAGE — Module 10 (Full API integration)
// All sub-pages fetch from /api/reports/* via reports.service
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
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Handshake,
  Receipt,
  Activity,
  Target,
  Calendar,
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
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────
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
const fmtAxis = (v: number) => fmtShort(v);
const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];
const MONTHS = [
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

// ─── Shared UI ────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${color ?? "bg-blue-600"}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-[20px] leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 ${className ?? ""}`}
    >
      <div className="text-[13px] text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-[12px]">
      {label !== undefined && (
        <div className="text-muted-foreground mb-1">
          {typeof label === "number" && label >= 1 && label <= 12
            ? MONTHS[label]
            : label}
        </div>
      )}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>
            {typeof p.value === "number" && p.value > 1000
              ? fmtVND(p.value)
              : p.value}
          </span>
        </div>
      ))}
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

function YearSelector({
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

// ═══════════════════════════════════════════════════════════════
// HR REPORT
// ═══════════════════════════════════════════════════════════════
export function HRReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<HRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getHRReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo nhân sự",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const summary = data?.summary;
  const deptData = (data?.departments ?? []).map((d) => ({
    name: d.name.replace("Phòng ", ""),
    value: d.headcount,
  }));
  const statusData = summary
    ? [
        { name: "Đang làm", value: summary.active },
        { name: "Thử việc", value: summary.probation },
        { name: "Nghỉ phép", value: summary.onLeave },
        { name: "Đã nghỉ", value: summary.terminated },
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo nhân sự</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !summary ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Users size={18} />}
              label="Tổng nhân viên"
              value={summary.total}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Đang làm việc"
              value={summary.active}
              sub={`${Math.round((summary.active / Math.max(summary.total, 1)) * 100)}%`}
              color="bg-green-600"
            />
            <StatCard
              icon={<Timer size={18} />}
              label="Thử việc"
              value={summary.probation}
              color="bg-amber-500"
            />
            <StatCard
              icon={<XCircle size={18} />}
              label="Đã nghỉ việc"
              value={summary.terminated}
              color="bg-red-500"
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <ChartCard title="Phân bố theo phòng ban" className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={deptData}
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
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nhân viên" radius={[0, 4, 4, 0]}>
                    {deptData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Trạng thái nhân sự" className="lg:col-span-2">
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
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {hireData.length > 0 && (
              <ChartCard title="Lịch sử tuyển dụng (5 năm)">
                <ResponsiveContainer width="100%" height={220}>
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
              <ChartCard title="Phân bố theo vai trò">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
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
                    <PolarRadiusAxis tick={{ fontSize: 10 }} />
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
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                        Phòng ban
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                        Chức danh
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Thâm niên
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden lg:table-cell">
                        Ngày vào
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topTenured.map((u, i: number) => (
                      <tr
                        key={u.id}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">
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
                        <td className="px-3 py-2 text-[12px] hidden md:table-cell">
                          {u.department?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-[12px] hidden md:table-cell">
                          {u.jobTitle?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-[13px] text-right text-blue-600">
                          {u.tenureYears
                            ? `${u.tenureYears.toFixed(1)} năm`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right text-muted-foreground hidden lg:table-cell">
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
// ATTENDANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function AttendanceReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getAttendanceReport({ year, month });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo chấm công",
      );
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const s = data?.summary;
  const statusPie = s
    ? [
        { name: "Có mặt", value: s.presentCount ?? 0 },
        { name: "Vắng", value: s.absentCount ?? 0 },
        { name: "Nghỉ phép", value: s.leaveCount ?? 0 },
      ].filter((d) => d.value > 0)
    : [];

  const dailyData = (data?.dailyTrend ?? []).map((d) => ({
    date: d.date?.toString().slice(8, 10) ?? "",
    present: Number(d.present ?? 0),
    absent: Number(d.absent ?? 0),
    leave: Number(d.onLeave ?? 0),
    late: Number(d.lateCount ?? 0),
  }));

  const deptChart = (data?.deptRates ?? []).map((d) => ({
    name: d.deptName,
    rate: d.rate,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo chấm công</h1>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          >
            {MONTHS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Users size={18} />}
              label="Tổng bản ghi"
              value={s.totalRecords}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Tỷ lệ có mặt"
              value={`${s.attendanceRate ?? 0}%`}
              color="bg-green-600"
            />
            <StatCard
              icon={<Clock size={18} />}
              label="TB phút trễ/ngày"
              value={`${Math.round(s.avgLateMinutes ?? 0)} phút`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<Activity size={18} />}
              label="TB giờ làm/ngày"
              value={`${(s.avgWorkHours ?? 0).toFixed(1)}h`}
              color="bg-purple-600"
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <ChartCard
              title="Xu hướng chấm công hàng ngày"
              className="lg:col-span-3"
            >
              <ResponsiveContainer width="100%" height={260}>
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
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {statusPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={[COLORS[0], COLORS[3], COLORS[1]][i]}
                      />
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
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Số lần trễ
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Tổng phút
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        TB phút/lần
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topLateUsers.map((t, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="text-[13px]">
                            {t.user?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.user?.department?.name ?? ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] text-amber-600">
                          {t.lateCount}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px]">
                          {t.totalMinutes} phút
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] text-muted-foreground">
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
// LEAVE REPORT
// ═══════════════════════════════════════════════════════════════
export function LeaveReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<LeaveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getLeaveReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo nghỉ phép",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const statusMap =
    data?.statusBreakdown ??
    ({} as Record<string, { count: number; days: number }>);
  const approved = statusMap?.APPROVED ?? { count: 0, days: 0 };
  const pending = statusMap?.PENDING ?? { count: 0, days: 0 };
  const rejected = statusMap?.REJECTED ?? { count: 0, days: 0 };
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo nghỉ phép</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<FileText size={18} />}
              label="Tổng đơn"
              value={total}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Đã duyệt"
              value={approved.count}
              sub={`${approved.days} ngày`}
              color="bg-green-600"
            />
            <StatCard
              icon={<Clock size={18} />}
              label="Chờ duyệt"
              value={pending.count}
              sub={`${pending.days} ngày`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<XCircle size={18} />}
              label="Từ chối"
              value={rejected.count}
              color="bg-red-500"
            />
          </div>

          {balance && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  label: "Tổng ngày được cấp",
                  value: balance.totalEntitled,
                  color: "text-blue-600",
                },
                {
                  label: "Ngày chuyển kỳ",
                  value: balance.totalCarried,
                  color: "text-purple-600",
                },
                {
                  label: "Đã sử dụng",
                  value: balance.totalUsed,
                  color: "text-amber-600",
                },
                {
                  label: "Còn lại",
                  value: balance.totalRemaining,
                  color: "text-green-600",
                },
                {
                  label: "Tỷ lệ sử dụng",
                  value: `${balance.usageRate}%`,
                  color: "text-foreground",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-card border border-border rounded-xl p-3 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {c.label}
                  </div>
                  <div className={`text-[18px] ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {typeData.length > 0 && (
              <ChartCard title="Ngày nghỉ theo loại phép">
                <ResponsiveContainer width="100%" height={240}>
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
                      {typeData.map((_, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {monthlyData.length > 0 && (
              <ChartCard title="Xu hướng nghỉ phép theo tháng">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => MONTHS[m]}
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
                      name="Duyệt"
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
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                        Loại phép
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Được cấp
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Đã dùng
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Còn lại
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Tỷ lệ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topUsers.map((u, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="text-[13px]">
                            {u.user?.fullName ?? "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {u.user?.department?.name ?? ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[12px] hidden md:table-cell">
                          {u.leaveType?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px]">
                          {u.entitledDays}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] text-amber-600">
                          {u.usedDays}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] text-green-600">
                          {u.remainingDays}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] text-muted-foreground">
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
// PAYROLL REPORT
// ═══════════════════════════════════════════════════════════════
export function PayrollReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getPayrollReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo lương",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const stats = data?.summary;
  const trendData = (data?.trend ?? []).map((t) => ({
    month: t.month,
    gross: t.gross,
    net: t.net,
  }));
  const deptData = (data?.deptBreakdown ?? []).map((d) => ({
    name: d.deptName?.replace("Phòng ", ""),
    avgGross: d.avgGross,
    totalNet: d.totalNet,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo lương</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !stats ? (
        <div className="text-center py-16 text-muted-foreground text-[14px]">
          Chưa có dữ liệu lương cho năm {year}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign size={18} />}
              label="Tổng Gross"
              value={fmtShort(stats.totalGross)}
              color="bg-blue-600"
            />
            <StatCard
              icon={<CreditCard size={18} />}
              label="Tổng Net"
              value={fmtShort(stats.totalNet)}
              color="bg-purple-600"
            />
            <StatCard
              icon={<TrendingDown size={18} />}
              label="Tỉ lệ khấu trừ"
              value={`${stats.deductionRate}%`}
              color="bg-red-500"
            />
            <StatCard
              icon={<Users size={18} />}
              label="Số nhân viên"
              value={stats.headcount}
              sub={`Avg: ${fmtShort(stats.avgGross)}`}
              color="bg-orange-500"
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
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
                    tickFormatter={(m) => MONTHS[m]}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="gross"
                    name="Gross"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="net"
                    name="Net"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cơ cấu lương" className="lg:col-span-2">
              {(data?.payrollComposition ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
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
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-[13px]">
                  Không có dữ liệu
                </div>
              )}
            </ChartCard>
          </div>

          {deptData.length > 0 && (
            <ChartCard title="Lương trung bình theo phòng ban">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptData} margin={{ left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="avgGross"
                    name="Avg Gross"
                    radius={[4, 4, 0, 0]}
                  >
                    {deptData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Chi tiết khấu trừ">
              <div className="space-y-2 mt-1">
                {[
                  { label: "BHXH (8%)", value: stats.totalSocialIns },
                  { label: "BHYT (1.5%)", value: stats.totalHealthIns },
                  { label: "BHTN (1%)", value: stats.totalUnemploymentIns },
                  { label: "Thuế TNCN", value: stats.totalPIT },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="text-[13px]">{d.label}</span>
                    <span className="text-[13px] text-red-500">
                      -{fmtVND(d.value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 pt-3">
                  <span className="text-[14px]">Tổng khấu trừ</span>
                  <span className="text-[14px] text-red-500">
                    -{fmtVND(stats.totalDeductions)}
                  </span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Tổng hợp kỳ lương">
              <div className="space-y-2 mt-1">
                {[
                  {
                    label: "Tổng Gross",
                    value: stats.totalGross,
                    cls: "text-blue-600",
                  },
                  {
                    label: "Phụ cấp",
                    value: stats.totalAllowances,
                    cls: "text-teal-600",
                  },
                  {
                    label: "Thưởng",
                    value: stats.totalBonus,
                    cls: "text-amber-600",
                  },
                  {
                    label: "Làm thêm giờ",
                    value: stats.totalOTPay,
                    cls: "text-indigo-600",
                  },
                  {
                    label: "Tổng Net",
                    value: stats.totalNet,
                    cls: "text-green-600",
                  },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="text-[13px]">{d.label}</span>
                    <span className={`text-[13px] ${d.cls}`}>
                      {fmtVND(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT REPORT
// ═══════════════════════════════════════════════════════════════
export function ProjectReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getProjectReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo dự án",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const statusMap = data?.statusBreakdown ?? {};
  const healthMap = data?.healthBreakdown ?? {};
  const ms = data?.milestones ?? {};

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
  const statusData = Object.entries(
    statusMap as Record<
      string,
      { count: number; budget: number; spent: number }
    >,
  ).map(([k, v]) => ({
    name: statusLabels[k] ?? k,
    value: v.count,
    budget: v.budget,
    spent: v.spent,
  }));
  const healthData = Object.entries(healthMap as Record<string, number>).map(
    ([k, v]) => ({
      name: healthLabels[k] ?? k,
      value: v,
    }),
  );
  const expenseData = (data?.expenseByCategory ?? []).map((e) => ({
    name: e.category,
    value: e.amount,
  }));

  const totalProjects = Object.values(
    statusMap as Record<
      string,
      { count: number; budget: number; spent: number }
    >,
  ).reduce((s, v) => s + v.count, 0);
  const activeCount =
    (statusMap as Record<string, { count: number }>)?.ACTIVE?.count ?? 0;
  const completedCount =
    (statusMap as Record<string, { count: number }>)?.COMPLETED?.count ?? 0;
  const atRiskCount = (healthMap as Record<string, number>)?.AT_RISK ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo dự án</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<FolderKanban size={18} />}
              label="Tổng dự án"
              value={totalProjects}
              color="bg-blue-600"
            />
            <StatCard
              icon={<Activity size={18} />}
              label="Đang thực hiện"
              value={activeCount}
              color="bg-green-600"
            />
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Hoàn thành"
              value={completedCount}
              color="bg-teal-600"
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label="Có rủi ro"
              value={atRiskCount}
              color="bg-red-500"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <ChartCard title="Phân bổ theo trạng thái">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {healthData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={
                            d.name.includes("Đúng")
                              ? "#22c55e"
                              : d.name.includes("rủi")
                                ? "#f59e0b"
                                : "#ef4444"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <ChartCard title="Milestone">
              <div className="space-y-3 mt-2">
                {Object.entries(ms).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between items-center py-1 border-b border-border last:border-0"
                  >
                    <span className="text-[12px] text-muted-foreground capitalize">
                      {k.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-[14px]">{v}</span>
                  </div>
                ))}
              </div>
              {expenseData.length > 0 && (
                <>
                  <div className="text-[12px] text-muted-foreground mt-4 mb-2">
                    Chi phí theo loại
                  </div>
                  {expenseData.map((e) => (
                    <div
                      key={e.name}
                      className="flex justify-between items-center py-1 border-b border-border last:border-0"
                    >
                      <span className="text-[12px]">{e.name}</span>
                      <span className="text-[12px]">{fmtVND(e.value)}</span>
                    </div>
                  ))}
                </>
              )}
            </ChartCard>
          </div>

          {(data?.projects ?? []).length > 0 && (
            <ChartCard title="Các dự án — Ngân sách vs Chi tiêu">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Dự án
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Trạng thái
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Tiến độ
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Ngân sách
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Đã chi
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        % Ngân sách
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.projects.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="text-[13px]">{p.projectName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.projectCode}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"}`}
                          >
                            {statusLabels[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px]">
                          {p.progressPercent}%
                        </td>
                        <td className="px-3 py-2 text-right text-[12px]">
                          {fmtVND(p.budgetAmount)}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px]">
                          {fmtVND(p.spentAmount)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right text-[13px] ${p.isOverBudget ? "text-red-500" : "text-green-600"}`}
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
// FINANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function FinanceReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getFinanceReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo tài chính",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const rev = data?.revenue;
  const ar = data?.ar;
  const monthlyData = (rev?.monthlyTrend ?? []).map((m) => ({
    month: m.month,
    amount: m.amount,
    count: m.count,
  }));
  const methodData = (data?.revenueByMethod ?? []).map((m) => ({
    name: m.method,
    value: m.amount,
  }));
  const clientData = (data?.revenueByClient ?? []).map((c) => ({
    name: c.client?.shortName ?? c.client?.companyName ?? "—",
    value: c.totalAmount,
  }));
  const invByStatus = data?.invoices?.byStatus ?? {};
  const totalInvoiced = data?.invoices?.totalInvoiced ?? 0;
  const totalOutstandingInv = data?.invoices?.totalOutstanding ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo tài chính</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign size={18} />}
              label="Đã thu"
              value={fmtShort(rev?.totalReceived ?? 0)}
              color="bg-green-600"
            />
            <StatCard
              icon={<FileText size={18} />}
              label="Tổng hóa đơn"
              value={fmtShort(totalInvoiced)}
              color="bg-blue-600"
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label="Còn phải thu"
              value={fmtShort(totalOutstandingInv)}
              color="bg-amber-500"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Tỷ lệ thu"
              value={`${ar?.collectionRate ?? 0}%`}
              sub={`AR: ${fmtShort(ar?.totalOutstanding ?? 0)}`}
              color="bg-purple-600"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <ChartCard title="Doanh thu theo tháng" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => MONTHS[m]}
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

            <ChartCard title="Theo phương thức TT">
              {methodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {methodData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-[13px]">
                  Chưa có dữ liệu
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {clientData.length > 0 && (
              <ChartCard title="Top khách hàng theo doanh thu">
                <ResponsiveContainer width="100%" height={240}>
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
                      width={100}
                      tick={{
                        fontSize: 11,
                        fill: "var(--color-text-secondary)",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Doanh thu" radius={[0, 4, 4, 0]}>
                      {clientData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {(ar?.topDebtors ?? []).length > 0 && (
              <ChartCard title="Top công nợ chưa thu">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                          Khách hàng
                        </th>
                        <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                          Còn nợ
                        </th>
                        <th className="text-right px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                          Tổng HD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ar!.topDebtors.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-border last:border-0 hover:bg-accent/30"
                        >
                          <td className="px-3 py-2">
                            <div className="text-[13px]">{d.companyName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {d.clientCode}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-[13px] text-red-500">
                            {fmtVND(d.outstandingBalance)}
                          </td>
                          <td className="px-3 py-2 text-right text-[12px] text-muted-foreground hidden md:table-cell">
                            {fmtVND(d.totalContractValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERTIME REPORT
// ═══════════════════════════════════════════════════════════════
export function OvertimeReportPage() {
  const [year, setYear] = useState(NOW.getFullYear());
  const [data, setData] = useState<OvertimeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsService.getOvertimeReport({ year });
      setData(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không thể tải báo cáo tăng ca",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const s = data?.summary;
  const monthlyData = (data?.monthlyTrend ?? []).map((m) => ({
    month: m.month,
    totalHours: m.totalHours,
    weekendH: +(m.weekendMinutes / 60).toFixed(1),
    holidayH: +(m.holidayMinutes / 60).toFixed(1),
  }));
  const dayTypeData = (data?.byDayType ?? []).map((d) => ({
    name: d.label,
    value: d.totalHours,
    count: d.count,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[20px]">Báo cáo tăng ca (OT)</h1>
        <div className="flex items-center gap-2">
          <YearSelector year={year} onChange={setYear} />
          <button
            onClick={fetch}
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
        <ErrorState message={error} onRetry={fetch} />
      ) : !s ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Clock size={18} />}
              label="Tổng giờ OT"
              value={`${s.totalApprovedHours}h`}
              color="bg-blue-600"
            />
            <StatCard
              icon={<Activity size={18} />}
              label="Số phiên OT"
              value={s.sessionCount}
              color="bg-purple-600"
            />
            <StatCard
              icon={<Timer size={18} />}
              label="TB phút/phiên"
              value={`${s.sessionCount > 0 ? Math.round(s.totalApprovedMinutes / s.sessionCount) : 0} phút`}
              color="bg-amber-500"
            />
            <StatCard
              icon={<Users size={18} />}
              label="Nhân viên OT"
              value={data?.topUsers?.length ?? 0}
              color="bg-green-600"
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <ChartCard title="OT theo tháng" className="lg:col-span-3">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => MONTHS[m]}
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
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-[13px]">
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
                        {dayTypeData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={[COLORS[0], COLORS[2], COLORS[3]][i % 3]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 px-2">
                    {dayTypeData.map((d, i) => (
                      <div
                        key={d.name}
                        className="flex items-center gap-1.5 text-[11px]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: [COLORS[0], COLORS[2], COLORS[3]][
                              i % 3
                            ],
                          }}
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
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">
                        Nhân viên
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">
                        Phòng ban
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Số phiên
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Tổng phút
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] text-muted-foreground">
                        Tổng giờ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topUsers.map((u, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">
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
                        <td className="px-3 py-2 text-[12px] hidden md:table-cell">
                          {u.user?.department?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px]">
                          {u.sessionCount}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px]">
                          {u.totalMinutes}
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] text-blue-600">
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
