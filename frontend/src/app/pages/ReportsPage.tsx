// ================================================================
// REPORTS PAGE — Module 10 (Full API integration)
// 7 exports: HRReportPage, AttendanceReportPage, FinanceReportPage,
//            ProjectReportPage, LeaveReportPage,
//            PayrollReportPage, OvertimeReportPage
// ================================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, Clock, DollarSign, FolderKanban, CalendarDays,
  TrendingUp, AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  Activity, Timer, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import * as reportsService from '../../lib/services/reports.service';
import type {
  HRReport, AttendanceReport, LeaveReport, PayrollReport,
  ProjectReport, FinanceReport, OvertimeReport,
} from '../../lib/services/reports.service';
import { ApiError } from '../../lib/apiClient';

const fmtVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
const fmtVNDShort = (n: number) => {
  if (n >= 1e9) return String((n / 1e9).toFixed(1)) + 'ty';
  if (n >= 1e6) return String((n / 1e6).toFixed(0)) + 'tr';
  return fmtVND(n);
};
const MONTHS = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;

function FilterBar({ year, setYear, month, setMonth, showMonth = true, children }: {
  year: number; setYear: (y: number) => void;
  month?: number; setMonth?: (m: number) => void;
  showMonth?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select value={year} onChange={e => setYear(+e.target.value)}
        className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      {showMonth && month !== undefined && setMonth && (
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value={0}>Tat ca thang</option>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      )}
      {children}
      <button className="px-3 py-2 border border-border rounded-lg text-[12px] text-muted-foreground hover:bg-accent flex items-center gap-1 ml-auto">
        <Download size={13} /> Xuat bao cao
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = 'text-foreground' }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={`text-[20px] leading-tight ${color}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
      <Loader2 size={22} className="animate-spin" />
      <span className="text-[13px]">Dang tai bao cao...</span>
    </div>
  );
}

export function HRReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [data, setData] = useState<HRReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getHRReport({ year })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><Users size={22} className="text-blue-600" />Bao cao nhan su</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} showMonth={false} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong nhan vien" value={data.headcount.total} icon={<Users size={18} className="text-blue-500" />} />
            <StatCard label="Dang lam viec" value={data.headcount.active} icon={<CheckCircle2 size={18} className="text-green-500" />} color="text-green-600" />
            <StatCard label="Thu viec" value={data.headcount.probation} icon={<Clock size={18} className="text-yellow-500" />} color="text-yellow-600" />
            <StatCard label="Da nghi" value={data.headcount.terminated} icon={<AlertTriangle size={18} className="text-gray-400" />} color="text-muted-foreground" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Nhan vien theo phong ban</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={10} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Tong" fill="#3b82f6" radius={[0,4,4,0]} />
                  <Bar dataKey="activeCount" name="Dang lam" fill="#22c55e" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Tuyen dung theo thang ({year})</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.newHires}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickFormatter={(m: number) => MONTHS[m-1]} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => [v + ' nguoi']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Nhan vien moi" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AttendanceReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getAttendanceReport({ year, month: month || undefined })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><Clock size={22} className="text-blue-600" />Bao cao cham cong</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} month={month} setMonth={setMonth} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Ti le di lam" value={data.summary.attendanceRate.toFixed(1) + '%'} icon={<CheckCircle2 size={18} className="text-green-500" />} color="text-green-600" />
            <StatCard label="Di tre" value={data.summary.lateCount} icon={<Clock size={18} className="text-yellow-500" />} color="text-yellow-600" />
            <StatCard label="Vang mat" value={data.summary.absentCount} icon={<AlertTriangle size={18} className="text-red-500" />} color="text-red-500" />
            <StatCard label="Tong gio OT" value={data.summary.totalOTHours.toFixed(1) + 'h'} icon={<Timer size={18} className="text-purple-500" />} color="text-purple-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Xu huong cham cong theo ngay</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="present" name="Co mat" stroke="#22c55e" fill="#22c55e20" />
                  <Area type="monotone" dataKey="late" name="Tre" stroke="#f59e0b" fill="#f59e0b20" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Ti le cham cong theo phong ban</div>
              <div className="space-y-2 mt-2">
                {data.byDepartment.slice(0, 8).map(d => (
                  <div key={d.name} className="text-[12px]">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span>{d.attendanceRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: d.attendanceRate + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {data.topLate.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-[13px]">Top nhan vien di tre</div>
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-[11px] text-muted-foreground">Nhan vien</th>
                    <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">So lan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLate.map((u, i) => (
                    <tr key={u.user.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <span className={`inline-block w-5 h-5 rounded-full text-center text-[10px] leading-5 mr-2 ${i === 0 ? 'bg-yellow-400 text-white' : 'bg-muted text-muted-foreground'}`}>{i+1}</span>
                        {u.user.fullName} <span className="text-muted-foreground text-[11px]">({u.user.userCode})</span>
                      </td>
                      <td className="px-4 py-2 text-right text-orange-600">{u.count} lan</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function FinanceReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getFinanceReport({ year, ...(month > 0 ? { month } : {}) })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><TrendingUp size={22} className="text-blue-600" />Bao cao tai chinh</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} month={month} setMonth={setMonth} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong hoa don" value={fmtVNDShort(data.revenue.total)} icon={<DollarSign size={18} className="text-blue-500" />} />
            <StatCard label="Da thu" value={fmtVNDShort(data.revenue.received)} icon={<CheckCircle2 size={18} className="text-green-500" />} color="text-green-600" />
            <StatCard label="Con no" value={fmtVNDShort(data.revenue.outstanding)} icon={<AlertTriangle size={18} className="text-orange-500" />} color={data.revenue.outstanding > 0 ? 'text-orange-600' : 'text-muted-foreground'} />
            <StatCard label="Ti le thu" value={data.revenue.collectionRate.toFixed(1) + '%'} icon={<TrendingUp size={18} className="text-purple-500" />} color="text-purple-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Doanh thu theo thang</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickFormatter={(m: number) => MONTHS[m-1]} fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v: number) => fmtVNDShort(v)} />
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="received" name="Da thu" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="invoiced" name="Hoa don" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Top khach hang</div>
              <div className="space-y-2 mt-2">
                {data.byClient.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground truncate flex-1">{c.clientName}</span>
                    <span className="text-green-600 ml-2">{fmtVNDShort(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ProjectReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [data, setData] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getProjectReport({ year })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><FolderKanban size={22} className="text-blue-600" />Bao cao du an</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} showMonth={false} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong du an" value={data.summary.total} icon={<FolderKanban size={18} className="text-blue-500" />} />
            <StatCard label="Dang thuc hien" value={data.summary.active} icon={<Activity size={18} className="text-green-500" />} color="text-green-600" />
            <StatCard label="Hoan thanh" value={data.summary.completed} icon={<CheckCircle2 size={18} className="text-teal-500" />} color="text-teal-600" />
            <StatCard label="Co rui ro" value={data.summary.atRisk} icon={<AlertTriangle size={18} className="text-orange-500" />} color="text-orange-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Phan bo theo trang thai</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.byStatus.map(s => ({ name: s.status, value: s.count }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30}>
                    {data.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Chi phi theo danh muc</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.expenseByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v: number) => fmtVNDShort(v)} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={10} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {data.expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Tong milestones', value: data.milestones.total },
              { label: 'Hoan thanh', value: data.milestones.done },
              { label: 'Qua han', value: data.milestones.overdue, color: data.milestones.overdue > 0 ? 'text-red-500' : '' },
              { label: 'Ti le xong', value: data.milestones.doneRate.toFixed(0) + '%' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
                <div className={'text-[18px] ' + (s.color ?? '')}>{s.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LeaveReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [data, setData] = useState<LeaveReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getLeaveReport({ year })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><CalendarDays size={22} className="text-blue-600" />Bao cao nghi phep</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} showMonth={false} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong don" value={data.summary.total} icon={<CalendarDays size={18} className="text-blue-500" />} />
            <StatCard label="Da duyet" value={data.summary.approved} icon={<CheckCircle2 size={18} className="text-green-500" />} color="text-green-600" />
            <StatCard label="Dang cho" value={data.summary.pending} icon={<Clock size={18} className="text-yellow-500" />} color="text-yellow-600" />
            <StatCard label="Tu choi" value={data.summary.rejected} icon={<AlertTriangle size={18} className="text-red-500" />} color="text-red-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Don nghi theo thang ({year})</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickFormatter={(m: number) => MONTHS[m-1]} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="approved" name="Da duyet" fill="#22c55e" radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="pending" name="Dang cho" fill="#f59e0b" radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Phan loai nghi phep</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.byType.map(t => ({ name: t.name, value: t.total }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                    {data.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PayrollReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getPayrollReport({ year, ...(month > 0 ? { month } : {}) })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><DollarSign size={22} className="text-blue-600" />Bao cao bang luong</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} month={month} setMonth={setMonth} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong Gross" value={fmtVNDShort(summary?.totalGross ?? 0)} icon={<DollarSign size={18} className="text-blue-500" />} />
            <StatCard label="Tong Net" value={fmtVNDShort(summary?.totalNet ?? 0)} icon={<TrendingUp size={18} className="text-purple-500" />} color="text-purple-600" />
            <StatCard label="Ti le khau tru" value={(summary?.deductionRate ?? 0).toFixed(1) + '%'} icon={<AlertTriangle size={18} className="text-red-500" />} color="text-red-500" />
            <StatCard label="So NV trong ky" value={summary?._count?.id ?? 0} icon={<Users size={18} className="text-orange-500" />} color="text-orange-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Xu huong luong Gross vs Net</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickFormatter={(m: number) => MONTHS[m-1]} fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v: number) => (v/1e6).toFixed(0) + 'tr'} />
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="totalGross" name="Gross" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="totalNet" name="Net" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Co cau luong</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.payrollComposition} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={30}>
                    {data.payrollComposition.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Co cau khau tru</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.deductionBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25}>
                    {data.deductionBreakdown.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#8b5cf6'][i % 4]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Luong TB theo phong ban</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[...data.deptBreakdown].sort((a,b) => b.avgGross - a.avgGross)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v: number) => (v/1e6).toFixed(0) + 'tr'} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={10} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip formatter={(v: number) => [fmtVND(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="avgGross" name="Avg Gross" fill="#6366f1" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-[13px]">Chi tiet theo phong ban</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-[11px] text-muted-foreground">Phong ban</th>
                    <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">So NV</th>
                    <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">Avg Gross</th>
                    <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">Tong Gross</th>
                    <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">Tong Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deptBreakdown.map(d => (
                    <tr key={d.name} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-2">{d.name}</td>
                      <td className="px-4 py-2 text-right">{d.employeeCount}</td>
                      <td className="px-4 py-2 text-right">{fmtVND(d.avgGross)}</td>
                      <td className="px-4 py-2 text-right">{fmtVND(d.totalGross)}</td>
                      <td className="px-4 py-2 text-right text-purple-600">{fmtVND(d.totalNet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function OvertimeReportPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<OvertimeReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await reportsService.getOvertimeReport({ year, ...(month > 0 ? { month } : {}) })); }
    catch (err) { if (err instanceof ApiError) toast.error(err.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const topHours = data && data.topUsers.length > 0 ? data.topUsers[0].totalMinutes / 60 : 1;
  const dayTypeColors: Record<string, string> = { 'Ngay thuong': '#3b82f6', 'Cuoi tuan': '#f59e0b', 'Ngay le': '#ef4444' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2"><Timer size={22} className="text-blue-600" />Bao cao tang ca (OT)</h1>
        <button onClick={fetchData} disabled={loading} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <FilterBar year={year} setYear={setYear} month={month} setMonth={setMonth} />
      {loading || !data ? <ReportSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Tong gio OT" value={data.summary.totalApprovedHours.toFixed(1) + 'h'} icon={<Timer size={18} className="text-purple-500" />} color="text-purple-600" />
            <StatCard label="Tong luot OT" value={data.summary.totalSessions} icon={<Activity size={18} className="text-blue-500" />} />
            <StatCard label="So NV co OT" value={data.summary.uniqueUsers} icon={<Users size={18} className="text-orange-500" />} color="text-orange-600" />
            <StatCard label="TB gio/luot" value={(data.summary.avgMinutesPerSession / 60).toFixed(1) + 'h'} icon={<TrendingUp size={18} className="text-green-500" />} color="text-green-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Xu huong OT theo thang</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickFormatter={(m: number) => MONTHS[m-1]} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => [v.toFixed(1) + 'h']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="totalHours" name="Tong gio" stroke="#8b5cf6" fill="#8b5cf620" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] mb-3">Phan loai ngay OT</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.byDayType.map(d => ({ name: d.label, value: d.totalHours }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                    {data.byDayType.map((d, i) => <Cell key={i} fill={dayTypeColors[d.label] ?? PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v.toFixed(1) + 'h']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-[13px]">Top 10 nhan vien OT nhieu nhat</div>
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-center px-4 py-2 text-[11px] text-muted-foreground w-12">Hang</th>
                  <th className="text-left px-4 py-2 text-[11px] text-muted-foreground">Nhan vien</th>
                  <th className="text-left px-4 py-2 text-[11px] text-muted-foreground hidden md:table-cell">Phong ban</th>
                  <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">So luot</th>
                  <th className="text-right px-4 py-2 text-[11px] text-muted-foreground">Tong gio</th>
                  <th className="text-left px-4 py-2 text-[11px] text-muted-foreground hidden lg:table-cell w-32">Ti le</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u, i) => {
                  const hours = u.totalMinutes / 60;
                  const pct = Math.round(hours / topHours * 100);
                  return (
                    <tr key={u.user.id} className={'border-t border-border ' + (i === 0 ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : 'hover:bg-accent/30')}>
                      <td className="px-4 py-2 text-center">
                        <span className={'inline-block w-6 h-6 rounded-full text-[11px] leading-6 text-center ' + (i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-muted text-muted-foreground')}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] shrink-0">
                            {u.user.fullName.split(' ').slice(-1)[0]?.[0] ?? '?'}
                          </div>
                          <div>
                            <div>{u.user.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{u.user.userCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[12px] text-muted-foreground hidden md:table-cell">{u.user.department.name}</td>
                      <td className="px-4 py-2 text-right">{u.sessionCount}</td>
                      <td className="px-4 py-2 text-right text-purple-600">{hours.toFixed(1)}h</td>
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: pct + '%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.topUsers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Khong co du lieu OT</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
