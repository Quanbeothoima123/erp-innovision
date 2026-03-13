import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmployeeData } from '../context/EmployeeContext';
import {
  departments, getDepartmentById, getJobTitleById, getUserById,
  attendanceRequests, leaveRequests, overtimeRequests, payrollPeriods,
  invoices, contracts, clients, leaveBalances, leaveTypes, getLeaveTypeById,
  projects, formatVND, formatFullVND, attendanceRecords,
  clientPayments,
} from '../data/mockData';
import {
  Users, Clock, CalendarDays, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Timer, TrendingUp, FolderKanban, FileText, Handshake, Receipt, ArrowUpRight,
  ArrowDownRight, CreditCard, Building2, Target, BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

// ─── Chart colors ───────────────────────────────────────────
const DEPT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ─── Helpers ────────────────────────────────────────────────
const formatAxis = (v: number) => {
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
  return String(v);
};

const CustomTooltipVND = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-[12px]">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>{formatFullVND(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ icon, label, value, subValue, color, trend, onClick }: {
  icon: React.ReactNode; label: string; value: string | number; subValue?: string;
  color: string; trend?: 'up' | 'down' | null; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`bg-card border border-border rounded-xl p-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/30 transition-all' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}>{icon}</div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[11px] ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend === 'up' ? '+5%' : '-2%'}
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

// ─── Mini Badge ─────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { currentUser, can } = useAuth();
  const { allUsers } = useEmployeeData();
  const navigate = useNavigate();
  if (!currentUser) return null;

  const isAdminHR = can('ADMIN', 'HR');
  const isManager = can('MANAGER');
  const isSales = can('SALES');
  const isAccountant = can('ACCOUNTANT');
  const isEmployee = can('EMPLOYEE');

  // ─── Shared computations ──────────────────────────────────
  const activeUsers = allUsers.filter(u => u.accountStatus === 'ACTIVE');
  const totalEmployees = activeUsers.length;
  const probation = allUsers.filter(u => u.employmentStatus === 'PROBATION').length;
  const pendingCheckins = attendanceRequests.filter(r => r.status === 'PENDING').length;
  const pendingLeaves = leaveRequests.filter(r => r.status === 'PENDING').length;
  const pendingOT = overtimeRequests.filter(r => r.status === 'PENDING').length;
  const paidPeriod = payrollPeriods.find(p => p.status === 'PAID');
  const totalNet = paidPeriod ? paidPeriod.records.reduce((s, r) => s + r.netSalary, 0) : 0;
  const totalGross = paidPeriod ? paidPeriod.records.reduce((s, r) => s + r.grossSalary, 0) : 0;
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE');
  const expiringContracts = contracts.filter(c => c.status === 'ACTIVE' && new Date(c.endDate) <= new Date('2025-06-30'));

  // Manager
  const deptUsers = isManager ? allUsers.filter(u => u.departmentId === currentUser.departmentId && u.id !== currentUser.id) : [];

  // Employee
  const myLeaveBalances = leaveBalances.filter(b => b.userId === currentUser.id);
  const myPayroll = paidPeriod?.records.find(r => r.userId === currentUser.id);
  const myProjects = projects.filter(p => p.assignments.some(a => a.userId === currentUser.id) || p.projectManagerUserId === currentUser.id);
  const myPendingLeaves = leaveRequests.filter(r => r.userId === currentUser.id && r.status === 'PENDING').length;
  const myApprovedOT = overtimeRequests.filter(r => r.userId === currentUser.id && r.status === 'APPROVED');

  // ─── Chart data ───────────────────────────────────────────
  // Department distribution
  const deptDistribution = useMemo(() => {
    return departments.filter(d => d.isActive).map(d => ({
      id: d.id,
      name: d.name.replace('Phòng ', '').replace('Ban ', ''),
      value: allUsers.filter(u => u.departmentId === d.id && u.accountStatus === 'ACTIVE').length,
    })).filter(d => d.value > 0);
  }, [allUsers]);

  // Employment status distribution
  const empStatusData = useMemo(() => {
    const statuses = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED'] as const;
    const labels: Record<string, string> = { ACTIVE: 'Chính thức', PROBATION: 'Thử việc', ON_LEAVE: 'Nghỉ phép', TERMINATED: 'Đã nghỉ' };
    return statuses.map(s => ({
      name: labels[s],
      value: allUsers.filter(u => u.employmentStatus === s).length,
    })).filter(d => d.value > 0);
  }, [allUsers]);

  // Salary trend (from payroll periods)
  const salaryTrend = useMemo(() => {
    return payrollPeriods
      .filter(p => p.records.length > 0)
      .sort((a, b) => a.periodCode.localeCompare(b.periodCode))
      .map(p => ({
        name: `T${p.month}/${p.year}`,
        gross: p.records.reduce((s, r) => s + r.grossSalary, 0),
        net: p.records.reduce((s, r) => s + r.netSalary, 0),
        deductions: p.records.reduce((s, r) => s + r.totalDeductions, 0),
      }));
  }, []);

  // Attendance summary (this week)
  const attendanceSummary = useMemo(() => {
    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
    const leave = attendanceRecords.filter(r => r.status === 'LEAVE').length;
    const adjusted = attendanceRecords.filter(r => r.status === 'MANUAL_ADJUSTED').length;
    return [
      { name: 'Có mặt', value: present, color: '#22c55e' },
      { name: 'Vắng', value: absent, color: '#ef4444' },
      { name: 'Nghỉ phép', value: leave, color: '#3b82f6' },
      { name: 'Điều chỉnh', value: adjusted, color: '#f59e0b' },
    ];
  }, []);

  // Invoice status
  const invoiceStatusData = useMemo(() => {
    const labels: Record<string, string> = {
      DRAFT: 'Nháp', SENT: 'Đã gửi', PAID: 'Đã TT', PARTIALLY_PAID: 'TT 1 phần',
      OVERDUE: 'Quá hạn', VIEWED: 'Đã xem', DISPUTED: 'Tranh chấp', CANCELLED: 'Huỷ',
    };
    const colors: Record<string, string> = {
      DRAFT: '#6b7280', SENT: '#3b82f6', PAID: '#22c55e', PARTIALLY_PAID: '#eab308',
      OVERDUE: '#ef4444', VIEWED: '#6366f1', DISPUTED: '#f97316', CANCELLED: '#9ca3af',
    };
    const grouped: Record<string, number> = {};
    invoices.forEach(inv => { grouped[inv.status] = (grouped[inv.status] || 0) + 1; });
    return Object.entries(grouped).map(([status, count]) => ({
      name: labels[status] || status,
      value: count,
      color: colors[status] || '#6b7280',
    }));
  }, []);

  // Client revenue
  const clientRevenue = useMemo(() => {
    return clients.filter(c => c.totalContractValue > 0).map(c => ({
      name: c.shortName,
      total: c.totalContractValue,
      received: c.totalReceivedAmount,
      outstanding: c.outstandingBalance,
    })).sort((a, b) => b.total - a.total);
  }, []);

  // Project health
  const projectHealth = useMemo(() => {
    const active = projects.filter(p => p.status === 'ACTIVE' || p.status === 'PLANNING');
    return {
      onTrack: active.filter(p => p.healthStatus === 'ON_TRACK').length,
      atRisk: active.filter(p => p.healthStatus === 'AT_RISK').length,
      delayed: active.filter(p => p.healthStatus === 'DELAYED').length,
      total: active.length,
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ADMIN/HR DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  if (isAdminHR) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
          <p className="text-muted-foreground text-[13px]">Hôm nay là Thứ Năm, 12 tháng 3, 2026 · Dashboard Quản trị</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users size={20} />} label="Tổng nhân viên" value={totalEmployees} subValue={`${probation} thử việc`} color="bg-blue-500" trend="up" onClick={() => navigate('/employees')} />
          <StatCard icon={<Clock size={20} />} label="Chờ duyệt chấm công" value={pendingCheckins} color="bg-red-500" onClick={() => navigate('/attendance/requests')} />
          <StatCard icon={<CalendarDays size={20} />} label="Đơn nghỉ chờ duyệt" value={pendingLeaves} color="bg-orange-500" onClick={() => navigate('/leave/requests')} />
          <StatCard icon={<Timer size={20} />} label="OT chờ duyệt" value={pendingOT} color="bg-purple-500" onClick={() => navigate('/overtime')} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<DollarSign size={20} />} label="Tổng lương NET" value={formatVND(totalNet)} subValue={paidPeriod ? `T${paidPeriod.month}/${paidPeriod.year}` : ''} color="bg-green-500" onClick={() => navigate('/payroll')} />
          <StatCard icon={<Receipt size={20} />} label="Hóa đơn quá hạn" value={overdueInvoices.length} subValue={overdueInvoices.length > 0 ? formatVND(overdueInvoices.reduce((s, i) => s + i.outstandingAmount, 0)) : ''} color="bg-red-600" onClick={() => navigate('/invoices')} />
          <StatCard icon={<FileText size={20} />} label="HĐ sắp hết hạn" value={expiringContracts.length} color="bg-amber-500" onClick={() => navigate('/contracts')} />
          <StatCard icon={<FolderKanban size={20} />} label="Dự án đang chạy" value={projects.filter(p => p.status === 'ACTIVE').length} subValue={`${projectHealth.atRisk + projectHealth.delayed} cần chú ý`} color="bg-teal-500" onClick={() => navigate('/projects')} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Employee by Department */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-500" /> Phân bố nhân viên theo phòng ban</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="dept-pie" data={deptDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false} style={{ fontSize: 11 }}>
                    {deptDistribution.map((d, i) => <Cell key={`dept-${d.id}`} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip key="dept-tooltip" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employment Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><Users size={16} className="text-green-500" /> Trạng thái nhân viên</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={empStatusData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid key="empstat-grid" strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis key="empstat-xaxis" type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis key="empstat-yaxis" type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip key="empstat-tooltip" />
                  <Bar key="empstat-bar" dataKey="value" name="Số người" radius={[0, 6, 6, 0]}>
                    {empStatusData.map((entry, i) => {
                      const colors = ['#22c55e', '#eab308', '#3b82f6', '#6b7280'];
                      return <Cell key={`empstat-${entry.name}-${i}`} fill={colors[i] || '#3b82f6'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Salary Trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> Xu hướng lương theo kỳ</h3>
            {salaryTrend.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryTrend}>
                    <CartesianGrid key="salary-grid" strokeDasharray="3 3" className="stroke-border" />
                    <XAxis key="salary-xaxis" dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis key="salary-yaxis" tickFormatter={formatAxis} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip key="salary-tooltip" content={<CustomTooltipVND />} />
                    <Legend key="salary-legend" wrapperStyle={{ fontSize: 11 }} />
                    <Bar key="bar-gross" dataKey="gross" name="Gross" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar key="bar-net" dataKey="net" name="Net" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar key="bar-deductions" dataKey="deductions" name="Khấu trừ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-[13px]">Chưa có dữ liệu kỳ lương</div>
            )}
          </div>

          {/* Attendance Pie */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Tổng hợp chấm công T3/2025</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="att-pie" data={attendanceSummary} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                    {attendanceSummary.map((entry) => <Cell key={`att-${entry.name}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip key="att-tooltip" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><Clock size={16} className="text-red-500" /> Yêu cầu chấm công gần đây</h3>
            <div className="space-y-2">
              {attendanceRequests.filter(r => r.status === 'PENDING').slice(0, 5).map(r => {
                const u = getUserById(r.userId);
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                      <div>
                        <span className="text-[13px]">{u?.fullName}</span>
                        <Badge color={r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                          {r.requestType === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              {attendanceRequests.filter(r => r.status === 'PENDING').length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">Không có yêu cầu chờ duyệt</div>
              )}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><CalendarDays size={16} className="text-orange-500" /> Đơn nghỉ phép chờ duyệt</h3>
            <div className="space-y-2">
              {leaveRequests.filter(r => r.status === 'PENDING').slice(0, 5).map(r => {
                const u = getUserById(r.userId);
                const lt = getLeaveTypeById(r.leaveTypeId);
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px]">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                      <div>
                        <span className="text-[13px]">{u?.fullName}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{lt?.name} · {r.totalDays} ngày</span>
                      </div>
                    </div>
                    <Badge color={r.currentStep === 'MANAGER' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                      Chờ {r.currentStep}
                    </Badge>
                  </div>
                );
              })}
              {leaveRequests.filter(r => r.status === 'PENDING').length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">Không có đơn chờ duyệt</div>
              )}
            </div>
          </div>
        </div>

        {/* Project Health + Recent OT */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><FolderKanban size={16} className="text-teal-500" /> Sức khoẻ dự án</h3>
            <div className="space-y-3">
              {projects.filter(p => p.status === 'ACTIVE').map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate">{p.projectName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${p.progressPercent}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{p.progressPercent}%</span>
                    </div>
                  </div>
                  <Badge color={
                    p.healthStatus === 'ON_TRACK' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : p.healthStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }>
                    {p.healthStatus === 'ON_TRACK' ? '🟢 Tốt' : p.healthStatus === 'AT_RISK' ? '🟡 Rủi ro' : '🔴 Trễ'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><Timer size={16} className="text-purple-500" /> OT chờ duyệt</h3>
            <div className="space-y-2">
              {overtimeRequests.filter(r => r.status === 'PENDING').slice(0, 5).map(r => {
                const u = getUserById(r.userId);
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px]">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                      <div>
                        <span className="text-[13px]">{u?.fullName}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{r.plannedMinutes} phút</span>
                      </div>
                    </div>
                    <Badge color={r.isHoliday ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : r.isWeekend ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                      {r.isHoliday ? 'Lễ ×3' : r.isWeekend ? 'CN ×2' : 'Thường ×1.5'}
                    </Badge>
                  </div>
                );
              })}
              {overtimeRequests.filter(r => r.status === 'PENDING').length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">Không có OT chờ duyệt</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SALES DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  if (isSales && !isAdminHR) {
    const myClients = clients.filter(c => c.accountManagerUserId === currentUser.id);
    const totalContractValue = myClients.reduce((s, c) => s + c.totalContractValue, 0);
    const totalReceived = myClients.reduce((s, c) => s + c.totalReceivedAmount, 0);
    const totalOutstanding = myClients.reduce((s, c) => s + c.outstandingBalance, 0);
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    const prospectClients = clients.filter(c => c.status === 'PROSPECT').length;
    const activeClientsCount = clients.filter(c => c.status === 'ACTIVE').length;

    const clientPipeline = [
      { name: 'Tiềm năng', value: prospectClients, color: '#3b82f6' },
      { name: 'Hoạt động', value: activeClientsCount, color: '#22c55e' },
      { name: 'Ngừng HĐ', value: clients.filter(c => c.status === 'INACTIVE').length, color: '#6b7280' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
          <p className="text-muted-foreground text-[13px]">Hôm nay là Thứ Năm, 12 tháng 3, 2026 · Dashboard Kinh doanh</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Handshake size={20} />} label="Khách hàng của tôi" value={myClients.length} color="bg-blue-500" onClick={() => navigate('/clients')} />
          <StatCard icon={<DollarSign size={20} />} label="Tổng giá trị HĐ" value={formatVND(totalContractValue)} color="bg-green-500" onClick={() => navigate('/contracts')} />
          <StatCard icon={<CreditCard size={20} />} label="Đã thu" value={formatVND(totalReceived)} color="bg-teal-500" />
          <StatCard icon={<AlertTriangle size={20} />} label="Công nợ" value={formatVND(totalOutstanding)} color="bg-red-500" onClick={() => navigate('/invoices')} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<FileText size={20} />} label="HĐ đang thực hiện" value={activeContracts} color="bg-indigo-500" onClick={() => navigate('/contracts')} />
          <StatCard icon={<Target size={20} />} label="KH tiềm năng" value={prospectClients} color="bg-amber-500" onClick={() => navigate('/clients')} />
          <StatCard icon={<Receipt size={20} />} label="Hóa đơn quá hạn" value={overdueInvoices.length} color="bg-red-600" onClick={() => navigate('/invoices')} />
          <StatCard icon={<FolderKanban size={20} />} label="Dự án tham gia" value={myProjects.length} color="bg-purple-500" onClick={() => navigate('/projects')} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Client Pipeline */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><Handshake size={16} className="text-blue-500" /> Pipeline khách hàng</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="pipeline-pie" data={clientPipeline} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false} style={{ fontSize: 11 }}>
                    {clientPipeline.map((entry) => <Cell key={`pipeline-${entry.name}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip key="pipeline-tooltip" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client Revenue */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> Doanh thu theo khách hàng</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientRevenue} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid key="rev-grid" strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis key="rev-xaxis" type="number" tickFormatter={formatAxis} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis key="rev-yaxis" type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip key="rev-tooltip" content={<CustomTooltipVND />} />
                  <Legend key="rev-legend" wrapperStyle={{ fontSize: 11 }} />
                  <Bar key="bar-received" dataKey="received" name="Đã thu" fill="#22c55e" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar key="bar-outstanding" dataKey="outstanding" name="Công nợ" fill="#ef4444" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Clients & Contracts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><Building2 size={16} className="text-blue-500" /> Khách hàng mới nhất</h3>
            <div className="space-y-2">
              {clients.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <div className="text-[13px]">{c.companyName}</div>
                    <div className="text-[11px] text-muted-foreground">{c.industry || 'N/A'} · {c.city || 'N/A'}</div>
                  </div>
                  <Badge color={
                    c.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : c.status === 'PROSPECT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }>
                    {c.status === 'ACTIVE' ? 'Hoạt động' : c.status === 'PROSPECT' ? 'Tiềm năng' : 'Ngừng HĐ'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><FileText size={16} className="text-indigo-500" /> Hợp đồng đang thực hiện</h3>
            <div className="space-y-2">
              {contracts.filter(c => c.status === 'ACTIVE').map(c => {
                const client = clients.find(cl => cl.id === c.clientId);
                const pct = c.totalValue > 0 ? (c.receivedAmount / c.totalValue * 100) : 0;
                return (
                  <div key={c.id} className="py-1.5 border-b border-border last:border-0">
                    <div className="flex justify-between">
                      <div className="text-[13px] truncate">{c.title}</div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{formatVND(c.totalValue)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">{client?.shortName}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNTANT DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  if (isAccountant && !isAdminHR && !isSales) {
    const totalInvoiceValue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstandingInv = invoices.reduce((s, i) => s + i.outstandingAmount, 0);
    const overdueAmount = overdueInvoices.reduce((s, i) => s + i.outstandingAmount, 0);
    const paymentTotal = clientPayments.reduce((s, p) => s + p.amount, 0);

    const invoiceAgingData = [
      { name: 'Đã TT', amount: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0), color: '#22c55e' },
      { name: 'TT 1 phần', amount: invoices.filter(i => i.status === 'PARTIALLY_PAID').reduce((s, i) => s + i.totalAmount, 0), color: '#eab308' },
      { name: 'Chưa TT', amount: invoices.filter(i => ['SENT', 'VIEWED', 'DRAFT'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0), color: '#3b82f6' },
      { name: 'Quá hạn', amount: overdueAmount, color: '#ef4444' },
    ].filter(d => d.amount > 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
          <p className="text-muted-foreground text-[13px]">Hôm nay là Thứ Năm, 12 tháng 3, 2026 · Dashboard Kế toán</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Receipt size={20} />} label="Tổng hóa đơn" value={invoices.length} subValue={formatVND(totalInvoiceValue)} color="bg-blue-500" onClick={() => navigate('/invoices')} />
          <StatCard icon={<CheckCircle size={20} />} label="Đã thanh toán" value={formatVND(totalPaid)} color="bg-green-500" />
          <StatCard icon={<AlertTriangle size={20} />} label="Công nợ" value={formatVND(totalOutstandingInv)} color="bg-amber-500" />
          <StatCard icon={<XCircle size={20} />} label="Quá hạn" value={formatVND(overdueAmount)} subValue={`${overdueInvoices.length} hóa đơn`} color="bg-red-500" onClick={() => navigate('/invoices')} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<DollarSign size={20} />} label="Tổng lương NET" value={formatVND(totalNet)} subValue={paidPeriod ? `Kỳ T${paidPeriod.month}/${paidPeriod.year}` : ''} color="bg-green-600" onClick={() => navigate('/payroll')} />
          <StatCard icon={<TrendingUp size={20} />} label="Tổng lương Gross" value={formatVND(totalGross)} color="bg-blue-600" />
          <StatCard icon={<CreditCard size={20} />} label="Tổng thu thanh toán" value={formatVND(paymentTotal)} color="bg-teal-500" onClick={() => navigate('/payments')} />
          <StatCard icon={<FileText size={20} />} label="HĐ đang thực hiện" value={contracts.filter(c => c.status === 'ACTIVE').length} color="bg-indigo-500" onClick={() => navigate('/contracts')} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Invoice Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-500" /> Trạng thái hóa đơn</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="invst-pie" data={invoiceStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false} style={{ fontSize: 11 }}>
                    {invoiceStatusData.map((entry) => <Cell key={`invst-${entry.name}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip key="invst-tooltip" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Aging */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-red-500" /> Phân tích tuổi nợ</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceAgingData}>
                  <CartesianGrid key="aging-grid" strokeDasharray="3 3" className="stroke-border" />
                  <XAxis key="aging-xaxis" dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis key="aging-yaxis" tickFormatter={formatAxis} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip key="aging-tooltip" content={<CustomTooltipVND />} />
                  <Bar key="aging-bar" dataKey="amount" name="Giá trị" radius={[6, 6, 0, 0]}>
                    {invoiceAgingData.map((entry) => <Cell key={`aging-${entry.name}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Salary Trend + Overdue Invoices */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> Xu hướng lương</h3>
            {salaryTrend.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salaryTrend}>
                    <CartesianGrid key="trend-grid" strokeDasharray="3 3" className="stroke-border" />
                    <XAxis key="trend-xaxis" dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis key="trend-yaxis" tickFormatter={formatAxis} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip key="trend-tooltip" content={<CustomTooltipVND />} />
                    <Area key="area-gross" type="monotone" dataKey="gross" name="Gross" stroke="#3b82f6" fill="#3b82f620" />
                    <Area key="area-net" type="monotone" dataKey="net" name="Net" stroke="#22c55e" fill="#22c55e20" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-[13px]">Chưa có dữ liệu</div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Hóa đơn quá hạn</h3>
            <div className="space-y-2">
              {overdueInvoices.length > 0 ? overdueInvoices.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-[13px]">{inv.invoiceCode}</div>
                      <div className="text-[11px] text-muted-foreground">{client?.shortName} · Hạn: {new Date(inv.dueDate).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <span className="text-[13px] text-red-500">{formatVND(inv.outstandingAmount)}</span>
                  </div>
                );
              }) : (
                <div className="text-center text-muted-foreground text-[13px] py-4">Không có hóa đơn quá hạn</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MANAGER DASHBOARD (non-Admin/HR/Sales/Accountant)
  // ═══════════════════════════════════════════════════════════════
  if (isManager && !isAdminHR && !isSales && !isAccountant) {
    const deptPendingLeaves = leaveRequests.filter(r => r.status === 'PENDING' && deptUsers.some(u => u.id === r.userId)).length;
    const deptPendingOT = overtimeRequests.filter(r => r.status === 'PENDING' && deptUsers.some(u => u.id === r.userId)).length;
    const deptActive = deptUsers.filter(u => u.employmentStatus === 'ACTIVE').length;
    const deptProbation = deptUsers.filter(u => u.employmentStatus === 'PROBATION').length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
          <p className="text-muted-foreground text-[13px]">Hôm nay là Thứ Năm, 12 tháng 3, 2026 · Dashboard Quản lý</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users size={20} />} label="NV phòng ban" value={deptUsers.length} subValue={`${deptActive} chính thức, ${deptProbation} thử việc`} color="bg-blue-500" onClick={() => navigate('/employees')} />
          <StatCard icon={<CalendarDays size={20} />} label="Đơn nghỉ chờ" value={deptPendingLeaves} color="bg-orange-500" onClick={() => navigate('/leave/requests')} />
          <StatCard icon={<Timer size={20} />} label="OT chờ duyệt" value={deptPendingOT} color="bg-purple-500" onClick={() => navigate('/overtime')} />
          <StatCard icon={<FolderKanban size={20} />} label="Dự án của tôi" value={myProjects.length} color="bg-teal-500" onClick={() => navigate('/projects')} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Team Members */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Nhân viên phòng ban</h3>
            <div className="space-y-2">
              {deptUsers.slice(0, 8).map(u => {
                const job = getJobTitleById(u.jobTitleId);
                return (
                  <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-accent rounded-lg px-2 -mx-2 transition-colors" onClick={() => navigate(`/employees/${u.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">{u.fullName.split(' ').slice(-1)[0][0]}</div>
                      <div>
                        <div className="text-[13px]">{u.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{job?.name}</div>
                      </div>
                    </div>
                    <Badge color={u.employmentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}>
                      {u.employmentStatus === 'ACTIVE' ? 'Chính thức' : 'Thử việc'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Projects */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[14px] mb-3 flex items-center gap-2"><FolderKanban size={16} className="text-teal-500" /> Dự án của tôi</h3>
            <div className="space-y-3">
              {myProjects.filter(p => ['ACTIVE', 'PLANNING'].includes(p.status)).map(p => (
                <div key={p.id} className="py-1.5 border-b border-border last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="text-[13px]">{p.projectName}</div>
                    {p.healthStatus && (
                      <Badge color={
                        p.healthStatus === 'ON_TRACK' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : p.healthStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }>
                        {p.healthStatus === 'ON_TRACK' ? '🟢 Tốt' : p.healthStatus === 'AT_RISK' ? '🟡 Rủi ro' : '🔴 Trễ'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progressPercent}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{p.progressPercent}%</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{p.assignments.length} thành viên · Ngân sách: {formatVND(p.budgetAmount)}</div>
                </div>
              ))}
              {myProjects.filter(p => ['ACTIVE', 'PLANNING'].includes(p.status)).length === 0 && (
                <div className="text-center text-muted-foreground text-[13px] py-4">Chưa tham gia dự án nào</div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={<Clock size={20} />} label="Chấm công của tôi" value="Xem" color="bg-green-500" onClick={() => navigate('/attendance/my')} />
          <StatCard icon={<CalendarDays size={20} />} label="Phép năm còn lại" value={myLeaveBalances.find(b => b.leaveTypeId === 'lt-1')?.remainingDays ?? 0} color="bg-blue-500" onClick={() => navigate('/leave/requests')} />
          <StatCard icon={<DollarSign size={20} />} label="Lương NET gần nhất" value={myPayroll ? formatVND(myPayroll.netSalary) : '—'} color="bg-green-600" onClick={() => navigate('/payroll')} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // EMPLOYEE DASHBOARD (default)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px]">Xin chào, {currentUser.fullName}</h1>
        <p className="text-muted-foreground text-[13px]">Hôm nay là Thứ Năm, 12 tháng 3, 2026 · Dashboard Nhân viên</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-6 col-span-2 md:col-span-1 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all" onClick={() => navigate('/attendance/my')}>
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white mb-2"><Clock size={28} /></div>
          <div className="text-[15px]">Gửi yêu cầu Check-in</div>
          <div className="text-[12px] text-muted-foreground">Nhấn để chấm công</div>
        </div>
        <StatCard icon={<CalendarDays size={20} />} label="Phép năm còn lại" value={myLeaveBalances.find(b => b.leaveTypeId === 'lt-1')?.remainingDays ?? 0} subValue={myPendingLeaves > 0 ? `${myPendingLeaves} đơn đang chờ` : undefined} color="bg-blue-500" onClick={() => navigate('/leave/requests')} />
        <StatCard icon={<DollarSign size={20} />} label="Lương NET gần nhất" value={myPayroll ? formatVND(myPayroll.netSalary) : '—'} subValue={paidPeriod ? `T${paidPeriod.month}/${paidPeriod.year}` : ''} color="bg-green-500" onClick={() => navigate('/payroll')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Timer size={20} />} label="OT đã duyệt" value={myApprovedOT.length} subValue={myApprovedOT.length > 0 ? `${myApprovedOT.reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes), 0)} phút tổng` : 'Chưa có OT'} color="bg-purple-500" onClick={() => navigate('/overtime')} />
        <StatCard icon={<FolderKanban size={20} />} label="Dự án tham gia" value={myProjects.filter(p => ['ACTIVE', 'PLANNING'].includes(p.status)).length} color="bg-teal-500" onClick={() => navigate('/projects')} />
      </div>

      {/* Leave Balances */}
      {myLeaveBalances.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2"><CalendarDays size={16} className="text-blue-500" /> Số dư phép năm 2025</h3>
          <div className="space-y-3">
            {myLeaveBalances.map(b => {
              const lt = getLeaveTypeById(b.leaveTypeId);
              const total = b.entitledDays + b.carriedDays;
              const pct = total > 0 ? (b.usedDays / total) * 100 : 0;
              return (
                <div key={`${b.userId}-${b.leaveTypeId}`}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span>{lt?.name}</span>
                    <span className="text-muted-foreground">Đã dùng {b.usedDays}/{total} · Còn <span className="text-foreground">{b.remainingDays}</span> ngày</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Projects */}
      {myProjects.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2"><FolderKanban size={16} className="text-teal-500" /> Dự án đang tham gia</h3>
          <div className="space-y-3">
            {myProjects.filter(p => p.status === 'ACTIVE' || p.status === 'PLANNING').map(p => {
              const myAssignment = p.assignments.find(a => a.userId === currentUser.id);
              return (
                <div key={p.id} className="py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px]">{p.projectName}</div>
                    {p.healthStatus && (
                      <Badge color={
                        p.healthStatus === 'ON_TRACK' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : p.healthStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }>
                        {p.healthStatus === 'ON_TRACK' ? '🟢 Tốt' : p.healthStatus === 'AT_RISK' ? '🟡 Rủi ro' : '🔴 Trễ'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progressPercent}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{p.progressPercent}%</span>
                  </div>
                  {myAssignment && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Vai trò: {myAssignment.roleInProject} · Phân bổ: {myAssignment.allocationPercent}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payslip Summary */}
      {myPayroll && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[14px] mb-3 flex items-center gap-2"><DollarSign size={16} className="text-green-500" /> Tóm tắt lương {paidPeriod ? `T${paidPeriod.month}/${paidPeriod.year}` : ''}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">Lương cơ bản</div>
              <div className="text-[15px] mt-0.5">{formatFullVND(myPayroll.baseSalary)}</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">Lương Gross</div>
              <div className="text-[15px] mt-0.5">{formatFullVND(myPayroll.grossSalary)}</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[11px] text-muted-foreground">Tổng khấu trừ</div>
              <div className="text-[15px] mt-0.5 text-red-500">-{formatFullVND(myPayroll.totalDeductions)}</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-[11px] text-green-600 dark:text-green-400">Thực nhận (NET)</div>
              <div className="text-[15px] mt-0.5 text-green-700 dark:text-green-400">{formatFullVND(myPayroll.netSalary)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}