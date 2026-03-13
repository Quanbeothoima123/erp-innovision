import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmployeeData } from '../context/EmployeeContext';
import {
  users, departments, getDepartmentById, getJobTitleById, getUserById,
  attendanceRecords, leaveRequests, leaveBalances, overtimeRequests,
  payrollPeriods, projects, clients, contracts, invoices, clientPayments,
  projectExpenses, formatVND, formatFullVND, workShifts, holidays,
} from '../data/mockData';
import {
  Users, Clock, CalendarDays, DollarSign, FolderKanban, FileText,
  TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon,
  Download, Filter, ArrowUpRight, ArrowDownRight, Briefcase,
  AlertTriangle, CheckCircle, XCircle, Handshake, Receipt,
  Activity, Target, Calendar, CreditCard, Timer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart,
} from 'recharts';

// ─── Shared ─────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6'];
const TODAY = '2025-03-12';

const formatAxis = (v: number) => {
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-[12px]">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>{typeof p.value === 'number' && p.value > 10000 ? formatFullVND(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function StatCard({ icon, label, value, subValue, color, trend }: {
  icon: React.ReactNode; label: string; value: string | number; subValue?: string;
  color: string; trend?: { value: string; up: boolean } | null;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}>{icon}</div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[11px] ${trend.up ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[22px]">{value}</div>
        <div className="text-[12px] text-muted-foreground">{label}</div>
        {subValue && <div className="text-[11px] text-muted-foreground mt-0.5">{subValue}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-[14px]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HR REPORT
// ═══════════════════════════════════════════════════════════════
export function HRReportPage() {
  const { allUsers } = useEmployeeData();

  const stats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.employmentStatus === 'ACTIVE').length;
    const probation = allUsers.filter(u => u.employmentStatus === 'PROBATION').length;
    const terminated = allUsers.filter(u => u.employmentStatus === 'TERMINATED').length;

    // Department breakdown
    const deptData = departments.filter(d => d.isActive).map(dept => {
      const count = allUsers.filter(u => u.departmentId === dept.id).length;
      return { name: dept.name.replace('Phòng ', ''), value: count };
    }).filter(d => d.value > 0);

    // Employment status
    const statusData = [
      { name: 'Chính thức', value: active, color: '#22c55e' },
      { name: 'Thử việc', value: probation, color: '#f59e0b' },
      { name: 'Đã nghỉ', value: terminated, color: '#94a3b8' },
    ].filter(s => s.value > 0);

    // Hire timeline (by quarter)
    const hireData = [
      { period: 'Q1/2020', count: allUsers.filter(u => u.hireDate >= '2020-01-01' && u.hireDate < '2020-04-01').length },
      { period: 'Q2/2020', count: allUsers.filter(u => u.hireDate >= '2020-04-01' && u.hireDate < '2020-07-01').length },
      { period: '2021', count: allUsers.filter(u => u.hireDate >= '2021-01-01' && u.hireDate < '2022-01-01').length },
      { period: '2022', count: allUsers.filter(u => u.hireDate >= '2022-01-01' && u.hireDate < '2023-01-01').length },
      { period: '2023', count: allUsers.filter(u => u.hireDate >= '2023-01-01' && u.hireDate < '2024-01-01').length },
      { period: '2024', count: allUsers.filter(u => u.hireDate >= '2024-01-01' && u.hireDate < '2025-01-01').length },
      { period: '2025', count: allUsers.filter(u => u.hireDate >= '2025-01-01').length },
    ];

    // Gender breakdown from profiles
    const males = allUsers.filter(u => {
      // simple name-based heuristic: names ending with common female patterns
      return u.fullName.includes('Văn') || u.fullName.includes('Minh') || u.id.includes('dev2');
    }).length;

    // Role distribution
    const roleData = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SALES', 'ACCOUNTANT'].map(role => ({
      name: role === 'ADMIN' ? 'Admin' : role === 'HR' ? 'Nhân sự' : role === 'MANAGER' ? 'Quản lý' :
        role === 'EMPLOYEE' ? 'Nhân viên' : role === 'SALES' ? 'Kinh doanh' : 'Kế toán',
      count: allUsers.filter(u => u.roles.includes(role as any)).length,
    }));

    // Average tenure
    const tenures = allUsers.filter(u => u.employmentStatus !== 'TERMINATED').map(u => {
      const hire = new Date(u.hireDate);
      const now = new Date(TODAY);
      return (now.getTime() - hire.getTime()) / (365.25 * 86400000);
    });
    const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;

    return { total, active, probation, terminated, deptData, statusData, hireData, roleData, avgTenure };
  }, [allUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Báo cáo Nhân sự</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Tổng quan về lực lượng lao động của công ty</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users size={20} />} label="Tổng nhân viên" value={stats.total} color="bg-blue-600" />
        <StatCard icon={<CheckCircle size={20} />} label="Đang làm việc" value={stats.active} subValue={`${Math.round(stats.active / stats.total * 100)}%`} color="bg-green-600" trend={{ value: '+2', up: true }} />
        <StatCard icon={<AlertTriangle size={20} />} label="Đang thử việc" value={stats.probation} color="bg-yellow-500" />
        <StatCard icon={<Clock size={20} />} label="Thâm niên TB" value={`${stats.avgTenure.toFixed(1)} năm`} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Chart */}
        <ChartCard title="Phân bố theo phòng ban">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.deptData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Nhân viên" radius={[0, 4, 4, 0]}>
                {stats.deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Employment Status Pie */}
        <ChartCard title="Tình trạng nhân sự">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.statusData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ strokeWidth: 1 }}>
                {stats.statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hire Timeline */}
        <ChartCard title="Xu hướng tuyển dụng">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.hireData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Tuyển mới" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Role Distribution */}
        <ChartCard title="Phân bố vai trò">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius={100} data={stats.roleData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
              <Radar name="Số lượng" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// ATTENDANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function AttendanceReportPage() {
  const stats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
    const leave = attendanceRecords.filter(r => r.status === 'LEAVE').length;
    const adjusted = attendanceRecords.filter(r => r.status === 'MANUAL_ADJUSTED').length;
    const remoteWork = attendanceRecords.filter(r => r.isRemoteWork).length;
    const totalLate = attendanceRecords.filter(r => r.lateMinutes > 0).length;
    const avgLate = attendanceRecords.filter(r => r.lateMinutes > 0).reduce((sum, r) => sum + r.lateMinutes, 0) / (totalLate || 1);

    // Status distribution
    const statusPie = [
      { name: 'Có mặt', value: present, color: '#22c55e' },
      { name: 'Vắng mặt', value: absent, color: '#ef4444' },
      { name: 'Nghỉ phép', value: leave, color: '#3b82f6' },
      { name: 'Điều chỉnh', value: adjusted, color: '#f59e0b' },
    ].filter(s => s.value > 0);

    // Daily trend
    const dailyData: { date: string; present: number; absent: number; leave: number; late: number }[] = [];
    for (let d = 3; d <= 12; d++) {
      const ds = `2025-03-${String(d).padStart(2, '0')}`;
      const dayDow = new Date(2025, 2, d).getDay();
      if (dayDow === 0 || dayDow === 6) continue;
      const dayRecs = attendanceRecords.filter(r => r.workDate === ds);
      dailyData.push({
        date: `${d}/3`,
        present: dayRecs.filter(r => r.status === 'PRESENT').length,
        absent: dayRecs.filter(r => r.status === 'ABSENT').length,
        leave: dayRecs.filter(r => r.status === 'LEAVE').length,
        late: dayRecs.filter(r => r.lateMinutes > 0).length,
      });
    }

    // Department attendance rate
    const deptAttendance = departments.filter(d => d.isActive).map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id);
      const deptRecs = attendanceRecords.filter(r => deptUsers.some(u => u.id === r.userId));
      const deptPresent = deptRecs.filter(r => r.status === 'PRESENT').length;
      const rate = deptRecs.length > 0 ? Math.round((deptPresent / deptRecs.length) * 100) : 0;
      return { name: dept.name.replace('Phòng ', ''), rate, total: deptRecs.length, present: deptPresent };
    }).filter(d => d.total > 0);

    // Top late employees
    const lateByUser = new Map<string, { count: number; totalMinutes: number }>();
    attendanceRecords.filter(r => r.lateMinutes > 0).forEach(r => {
      const existing = lateByUser.get(r.userId) || { count: 0, totalMinutes: 0 };
      lateByUser.set(r.userId, { count: existing.count + 1, totalMinutes: existing.totalMinutes + r.lateMinutes });
    });
    const topLate = Array.from(lateByUser.entries())
      .map(([userId, data]) => ({ user: getUserById(userId), ...data }))
      .filter(d => d.user)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // OT summary
    const totalOTApproved = overtimeRequests.filter(r => r.status === 'APPROVED');
    const totalOTMinutes = totalOTApproved.reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes), 0);
    const pendingOT = overtimeRequests.filter(r => r.status === 'PENDING').length;

    return {
      totalRecords, present, absent, leave, remoteWork, totalLate, avgLate,
      statusPie, dailyData, deptAttendance, topLate,
      totalOTApproved: totalOTApproved.length, totalOTMinutes, pendingOT,
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Báo cáo Chấm công & OT</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Dữ liệu chấm công tháng 03/2025</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<CheckCircle size={20} />} label="Tỷ lệ có mặt" value={`${Math.round(stats.present / stats.totalRecords * 100)}%`} subValue={`${stats.present}/${stats.totalRecords} bản ghi`} color="bg-green-600" />
        <StatCard icon={<XCircle size={20} />} label="Vắng mặt" value={stats.absent} subValue={`${(stats.absent / stats.totalRecords * 100).toFixed(1)}%`} color="bg-red-500" />
        <StatCard icon={<Clock size={20} />} label="Đi trễ" value={stats.totalLate} subValue={`TB ${Math.round(stats.avgLate)} phút`} color="bg-yellow-500" />
        <StatCard icon={<Timer size={20} />} label="OT đã duyệt" value={`${Math.round(stats.totalOTMinutes / 60)}h`} subValue={`${stats.totalOTApproved} yêu cầu | ${stats.pendingOT} chờ duyệt`} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily trend */}
        <ChartCard title="Xu hướng chấm công hàng ngày (T3/2025)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={stats.dailyData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Có mặt" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="absent" name="Vắng" fill="#ef4444" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="leave" name="Nghỉ phép" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="a" />
              <Line type="monotone" dataKey="late" name="Đi trễ" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status pie */}
        <ChartCard title="Phân bố trạng thái">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.statusPie} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                {stats.statusPie.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Department rate */}
        <ChartCard title="Tỷ lệ có mặt theo phòng ban">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.deptAttendance} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `${v}%`} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Tỷ lệ (%)" radius={[0, 4, 4, 0]}>
                {stats.deptAttendance.map((d, i) => <Cell key={i} fill={d.rate >= 90 ? '#22c55e' : d.rate >= 75 ? '#f59e0b' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top late employees */}
      <ChartCard title="Nhân viên đi trễ nhiều nhất">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">Nhân viên</th>
                <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">Phòng ban</th>
                <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">Số lần trễ</th>
                <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">Tổng phút trễ</th>
                <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">TB phút/lần</th>
              </tr>
            </thead>
            <tbody>
              {stats.topLate.map((item, idx) => (
                <tr key={item.user!.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">{item.user!.fullName.split(' ').slice(-1)[0][0]}</div>
                      <span className="text-[13px]">{item.user!.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{getDepartmentById(item.user!.departmentId)?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-[13px] text-right">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[11px]">{item.count} lần</span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-right">{item.totalMinutes} phút</td>
                  <td className="px-4 py-2.5 text-[13px] text-right">{Math.round(item.totalMinutes / item.count)} phút</td>
                </tr>
              ))}
              {stats.topLate.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-[13px]">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// FINANCE REPORT
// ═══════════════════════════════════════════════════════════════
export function FinanceReportPage() {
  const stats = useMemo(() => {
    // Payroll summary
    const paidPeriod = payrollPeriods.find(p => p.status === 'PAID' && p.records.length > 0);
    const payrollRecords = paidPeriod?.records || [];
    const totalGross = payrollRecords.reduce((s, r) => s + r.grossSalary, 0);
    const totalNet = payrollRecords.reduce((s, r) => s + r.netSalary, 0);
    const totalDeductions = payrollRecords.reduce((s, r) => s + r.totalDeductions, 0);
    const totalOTPay = payrollRecords.reduce((s, r) => s + r.totalOvertimePay, 0);
    const totalBonuses = payrollRecords.reduce((s, r) => s + r.totalBonus, 0);

    // Payroll by department
    const payrollByDept = departments.filter(d => d.isActive).map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id);
      const deptRecords = payrollRecords.filter(r => deptUsers.some(u => u.id === r.userId));
      return {
        name: dept.name.replace('Phòng ', ''),
        gross: deptRecords.reduce((s, r) => s + r.grossSalary, 0),
        net: deptRecords.reduce((s, r) => s + r.netSalary, 0),
        count: deptRecords.length,
      };
    }).filter(d => d.count > 0).sort((a, b) => b.gross - a.gross);

    // Payroll composition
    const payrollComposition = [
      { name: 'Lương cơ bản', value: payrollRecords.reduce((s, r) => s + r.baseSalary * r.workingDays / (paidPeriod?.workingDaysInPeriod || 23), 0), color: '#3b82f6' },
      { name: 'Phụ cấp', value: payrollRecords.reduce((s, r) => s + r.totalAllowances, 0), color: '#22c55e' },
      { name: 'Thưởng', value: totalBonuses, color: '#f59e0b' },
      { name: 'OT', value: totalOTPay, color: '#8b5cf6' },
    ].filter(c => c.value > 0);

    // Invoice summary
    const totalInvoiceValue = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((s, inv) => s + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((s, inv) => s + inv.outstandingAmount, 0);
    const overdueInv = invoices.filter(i => i.status === 'OVERDUE');

    // Revenue by client
    const revenueByClient = clients.map(cl => ({
      name: cl.shortName,
      received: cl.totalReceivedAmount,
      outstanding: cl.outstandingBalance,
    })).filter(c => c.received > 0 || c.outstanding > 0);

    // Invoice status distribution
    const invStatusData = [
      { name: 'Đã thanh toán', value: invoices.filter(i => i.status === 'PAID').length, color: '#22c55e' },
      { name: 'Đã gửi', value: invoices.filter(i => i.status === 'SENT').length, color: '#3b82f6' },
      { name: 'Thanh toán 1 phần', value: invoices.filter(i => i.status === 'PARTIALLY_PAID').length, color: '#f59e0b' },
      { name: 'Quá hạn', value: invoices.filter(i => i.status === 'OVERDUE').length, color: '#ef4444' },
      { name: 'Nháp', value: invoices.filter(i => i.status === 'DRAFT').length, color: '#94a3b8' },
    ].filter(s => s.value > 0);

    // Payment timeline
    const paymentTimeline = clientPayments
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      .map(p => ({
        date: new Date(p.paymentDate).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        amount: p.amount,
        client: clients.find(c => c.id === p.clientId)?.shortName || '',
      }));

    return {
      totalGross, totalNet, totalDeductions, totalOTPay, totalBonuses,
      payrollByDept, payrollComposition,
      totalInvoiceValue, totalPaid, totalOutstanding, overdueInv,
      revenueByClient, invStatusData, paymentTimeline,
      periodLabel: paidPeriod ? `Tháng ${paidPeriod.month}/${paidPeriod.year}` : 'N/A',
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Báo cáo Tài chính</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Tổng hợp lương ({stats.periodLabel}), doanh thu & công nợ</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<DollarSign size={20} />} label={`Tổng lương Gross`} value={formatVND(stats.totalGross)} subValue={stats.periodLabel} color="bg-blue-600" />
        <StatCard icon={<DollarSign size={20} />} label="Tổng lương Net" value={formatVND(stats.totalNet)} color="bg-green-600" />
        <StatCard icon={<Receipt size={20} />} label="Tổng hoá đơn" value={formatVND(stats.totalInvoiceValue)} subValue={`${invoices.length} hoá đơn`} color="bg-purple-600" />
        <StatCard icon={<AlertTriangle size={20} />} label="Công nợ tồn đọng" value={formatVND(stats.totalOutstanding)} subValue={`${stats.overdueInv.length} quá hạn`} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payroll by department */}
        <ChartCard title="Chi phí lương theo phòng ban">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.payrollByDept} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="gross" name="Gross" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payroll composition */}
        <ChartCard title="Cơ cấu lương">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.payrollComposition} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                {stats.payrollComposition.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by client */}
        <ChartCard title="Doanh thu & Công nợ theo khách hàng" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.revenueByClient} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="received" name="Đã nhận" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Còn lại" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Invoice status */}
        <ChartCard title="Trạng thái hoá đơn">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.invStatusData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {stats.invStatusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment timeline */}
        <ChartCard title="Lịch sử thanh toán">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.paymentTimeline} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="client" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Số tiền" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                {stats.paymentTimeline.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// PROJECT REPORT
// ═══════════════════════════════════════════════════════════════
export function ProjectReportPage() {
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'ACTIVE');
    const totalBudget = activeProjects.reduce((s, p) => s + p.budgetAmount, 0);
    const totalSpent = activeProjects.reduce((s, p) => s + p.spentAmount, 0);
    const avgProgress = activeProjects.length > 0
      ? Math.round(activeProjects.reduce((s, p) => s + p.progressPercent, 0) / activeProjects.length)
      : 0;

    // Project health
    const healthData = [
      { name: 'On Track', value: activeProjects.filter(p => p.healthStatus === 'ON_TRACK').length, color: '#22c55e' },
      { name: 'At Risk', value: activeProjects.filter(p => p.healthStatus === 'AT_RISK').length, color: '#f59e0b' },
      { name: 'Delayed', value: activeProjects.filter(p => p.healthStatus === 'DELAYED').length, color: '#ef4444' },
    ].filter(h => h.value > 0);

    // Budget utilization per project
    const budgetData = projects.filter(p => p.budgetAmount > 0).map(p => ({
      name: p.projectCode,
      budget: p.budgetAmount,
      spent: p.spentAmount,
      remaining: p.budgetAmount - p.spentAmount,
      utilization: Math.round((p.spentAmount / p.budgetAmount) * 100),
    }));

    // Progress per project
    const progressData = activeProjects.map(p => ({
      name: p.projectCode,
      progress: p.progressPercent,
      healthColor: p.healthStatus === 'ON_TRACK' ? '#22c55e' : p.healthStatus === 'AT_RISK' ? '#f59e0b' : '#ef4444',
    }));

    // Expense by category
    const expenseByCategory = new Map<string, number>();
    projectExpenses.filter(e => e.status === 'APPROVED').forEach(e => {
      const existing = expenseByCategory.get(e.category) || 0;
      expenseByCategory.set(e.category, existing + e.amount);
    });
    const categoryLabels: Record<string, string> = {
      LABOR: 'Nhân công', SOFTWARE: 'Phần mềm', HARDWARE: 'Phần cứng',
      TRAVEL: 'Đi lại', TRAINING: 'Đào tạo', OUTSOURCE: 'Thuê ngoài', OTHER: 'Khác',
    };
    const expenseCategories = Array.from(expenseByCategory.entries()).map(([cat, amount]) => ({
      name: categoryLabels[cat] || cat,
      value: amount,
    })).sort((a, b) => b.value - a.value);

    // Milestones overview
    const allMilestones = projects.flatMap(p => p.milestones);
    const msDone = allMilestones.filter(m => m.status === 'DONE').length;
    const msInProgress = allMilestones.filter(m => m.status === 'IN_PROGRESS').length;
    const msOverdue = allMilestones.filter(m => m.status === 'OVERDUE').length;
    const msPending = allMilestones.filter(m => m.status === 'PENDING').length;

    const milestoneData = [
      { name: 'Hoàn thành', value: msDone, color: '#22c55e' },
      { name: 'Đang chạy', value: msInProgress, color: '#3b82f6' },
      { name: 'Quá hạn', value: msOverdue, color: '#ef4444' },
      { name: 'Chờ', value: msPending, color: '#94a3b8' },
    ].filter(m => m.value > 0);

    // Pending expenses
    const pendingExpenses = projectExpenses.filter(e => e.status === 'PENDING');
    const pendingTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      activeCount: activeProjects.length, totalBudget, totalSpent, avgProgress,
      healthData, budgetData, progressData, expenseCategories,
      milestoneData, pendingExpenses, pendingTotal,
      totalProjects: projects.length,
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Báo cáo Dự án</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Tổng hợp tiến độ, ngân sách và sức khoẻ dự án</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FolderKanban size={20} />} label="Dự án đang chạy" value={stats.activeCount} subValue={`/ ${stats.totalProjects} tổng`} color="bg-blue-600" />
        <StatCard icon={<Target size={20} />} label="Tiến độ trung bình" value={`${stats.avgProgress}%`} color="bg-green-600" />
        <StatCard icon={<DollarSign size={20} />} label="Ngân sách sử dụng" value={formatVND(stats.totalSpent)} subValue={`/ ${formatVND(stats.totalBudget)}`} color="bg-purple-600" />
        <StatCard icon={<AlertTriangle size={20} />} label="Chi phí chờ duyệt" value={formatVND(stats.pendingTotal)} subValue={`${stats.pendingExpenses.length} khoản`} color="bg-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget utilization */}
        <ChartCard title="Sử dụng ngân sách theo dự án" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.budgetData} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="spent" name="Đã chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="remaining" name="Còn lại" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Health status */}
        <ChartCard title="Sức khoẻ dự án">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.healthData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {stats.healthData.map((h, i) => <Cell key={i} fill={h.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Milestone status */}
        <ChartCard title="Milestone tổng hợp">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.milestoneData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {stats.milestoneData.map((m, i) => <Cell key={i} fill={m.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Expense by category */}
        <ChartCard title="Chi phí dự án theo danh mục">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.expenseCategories} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={formatAxis} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Số tiền" radius={[0, 4, 4, 0]}>
                {stats.expenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Progress radar */}
        <ChartCard title="Tiến độ dự án">
          <div className="space-y-3">
            {stats.progressData.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-28 shrink-0">{p.name}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%`, backgroundColor: p.healthColor }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px]">{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// LEAVE REPORT
// ═══════════════════════════════════════════════════════════════
export function LeaveReportPage() {
  const stats = useMemo(() => {
    const totalRequests = leaveRequests.length;
    const pending = leaveRequests.filter(r => r.status === 'PENDING').length;
    const approved = leaveRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = leaveRequests.filter(r => r.status === 'REJECTED').length;
    const cancelled = leaveRequests.filter(r => r.status === 'CANCELLED').length;

    // Status pie
    const statusPie = [
      { name: 'Chờ duyệt', value: pending, color: '#f59e0b' },
      { name: 'Đã duyệt', value: approved, color: '#22c55e' },
      { name: 'Từ chối', value: rejected, color: '#ef4444' },
      { name: 'Đã huỷ', value: cancelled, color: '#94a3b8' },
    ].filter(s => s.value > 0);

    // Total days by status
    const totalDaysApproved = leaveRequests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.totalDays, 0);
    const totalDaysPending = leaveRequests.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.totalDays, 0);

    // Leave balance overview
    const annualBalances = leaveBalances.filter(b => b.leaveTypeId === 'lt-1' && b.year === 2025);
    const totalEntitled = annualBalances.reduce((s, b) => s + b.entitledDays + b.carriedDays, 0);
    const totalUsed = annualBalances.reduce((s, b) => s + b.usedDays, 0);
    const totalRemaining = annualBalances.reduce((s, b) => s + b.remainingDays, 0);
    const avgUsed = annualBalances.length > 0 ? totalUsed / annualBalances.length : 0;

    // Top users by used days
    const topUsers = annualBalances
      .map(b => ({ user: getUserById(b.userId), ...b }))
      .filter(b => b.user)
      .sort((a, b) => b.usedDays - a.usedDays)
      .slice(0, 8)
      .map(b => ({
        name: b.user!.fullName.split(' ').slice(-2).join(' '),
        used: b.usedDays,
        remaining: b.remainingDays,
        pending: b.pendingDays,
      }));

    // Leave utilization
    const utilizationData = [
      { name: 'Đã sử dụng', value: totalUsed, color: '#3b82f6' },
      { name: 'Đang chờ', value: annualBalances.reduce((s, b) => s + b.pendingDays, 0), color: '#f59e0b' },
      { name: 'Còn lại', value: totalRemaining, color: '#22c55e' },
    ];

    return {
      totalRequests, pending, approved, rejected, cancelled,
      statusPie, totalDaysApproved, totalDaysPending,
      totalEntitled, totalUsed, totalRemaining, avgUsed,
      topUsers, utilizationData,
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Báo cáo Nghỉ phép</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Tổng hợp tình hình sử dụng phép năm 2025</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<CalendarDays size={20} />} label="Tổng đơn nghỉ" value={stats.totalRequests} color="bg-blue-600" />
        <StatCard icon={<AlertTriangle size={20} />} label="Chờ duyệt" value={stats.pending} subValue={`${stats.totalDaysPending} ngày`} color="bg-yellow-500" />
        <StatCard icon={<CheckCircle size={20} />} label="Đã duyệt" value={`${stats.totalDaysApproved} ngày`} subValue={`${stats.approved} đơn`} color="bg-green-600" />
        <StatCard icon={<Activity size={20} />} label="TB sử dụng" value={`${stats.avgUsed.toFixed(1)} ngày`} subValue="/ nhân viên" color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <ChartCard title="Trạng thái đơn nghỉ phép">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.statusPie} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {stats.statusPie.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Utilization */}
        <ChartCard title="Tổng số ngày phép năm 2025">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.utilizationData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value} ngày`} labelLine={{ strokeWidth: 1 }}>
                {stats.utilizationData.map((u, i) => <Cell key={i} fill={u.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top users */}
        <ChartCard title="Sử dụng phép theo nhân viên" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topUsers} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="used" name="Đã dùng" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="pending" name="Chờ duyệt" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="remaining" name="Còn lại" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}