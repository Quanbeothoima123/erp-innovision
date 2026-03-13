// ================================================================
// EMPLOYEES PAGE — Module 2
// API-integrated: usersService + departmentsService + jobTitlesService
// Mock fallback when VITE_API_URL not set
// ================================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, X, Filter, Users, ChevronRight, RefreshCw, Loader2,
  Building2, Briefcase, UserCheck, UserX, AlertCircle, SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Services ──────────────────────────────────────────────────
import * as usersService from '../../lib/services/users.service';
import * as departmentsService from '../../lib/services/departments.service';
import * as jobTitlesService from '../../lib/services/jobTitles.service';
import type { ApiUser } from '../../lib/services/auth.service';
import type { DepartmentOption } from '../../lib/services/departments.service';
import type { JobTitleOption } from '../../lib/services/jobTitles.service';
import { ApiError } from '../../lib/apiClient';

// ── Mock fallback ──────────────────────────────────────────────
import {
  users as mockUsers, departments as mockDepts, jobTitles as mockJobTitles,
  getDepartmentById, getJobTitleById,
} from '../data/mockData';

const USE_API = !!import.meta.env.VITE_API_URL;

// ── Constants ──────────────────────────────────────────────────
const empStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PROBATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ON_LEAVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TERMINATED: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
};
const accStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISABLED: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
};
const empStatusLabels: Record<string, string> = {
  ACTIVE: 'Chính thức', PROBATION: 'Thử việc', ON_LEAVE: 'Nghỉ phép', TERMINATED: 'Đã nghỉ',
};
const accStatusLabels: Record<string, string> = {
  ACTIVE: 'Hoạt động', PENDING: 'Chờ kích hoạt', LOCKED: 'Bị khoá', DISABLED: 'Vô hiệu',
};

const emptyCreateForm = {
  fullName: '', email: '', phoneNumber: '',
  departmentId: '', jobTitleId: '', managerId: '',
  hireDate: new Date().toISOString().slice(0, 10),
  employmentStatus: 'PROBATION',
};

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[22px] font-semibold leading-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover" />;
  return <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0`}>{initials}</div>;
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export function EmployeesPage() {
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const isAdminHR = can('ADMIN', 'HR');

  // ── Data state ─────────────────────────────────────────────
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, probation: 0, terminated: 0 });
  const [deptOptions, setDeptOptions] = useState<DepartmentOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobTitleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState('');

  // ── Filter state ───────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Create dialog ──────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  // ── Load options ───────────────────────────────────────────
  useEffect(() => {
    if (USE_API) {
      departmentsService.getDepartmentOptions().then(setDeptOptions).catch(() => {});
      jobTitlesService.getJobTitleOptions().then(setJobOptions).catch(() => {});
    } else {
      setDeptOptions(mockDepts.map(d => ({ id: d.id, name: d.name })));
      setJobOptions(mockJobTitles.map(j => ({ id: j.id, name: j.name, code: j.code })));
    }
  }, []);

  // ── Load users ─────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (USE_API) {
        const [usersRes, statsRes] = await Promise.all([
          usersService.listUsers({
            search: search || undefined,
            departmentId: deptFilter || undefined,
            employmentStatus: empStatusFilter || undefined,
            accountStatus: accStatusFilter || undefined,
            page,
            limit: PAGE_SIZE,
          }),
          usersService.getUserStats(),
        ]);
        setUsers(usersRes.items);
        setTotalCount(usersRes.pagination.total);
        // Backend trả { total, byEmployment: [{employmentStatus, _count:{id}}], byAccount: [...] }
        const byEmp = statsRes.byEmployment ?? [];
        const getCount = (arr: typeof byEmp, key: string) =>
          arr.find(x => x.employmentStatus === key)?._count?.id ?? 0;
        setStats({
          total: statsRes.total,
          active: getCount(byEmp, 'ACTIVE'),
          probation: getCount(byEmp, 'PROBATION'),
          terminated: getCount(byEmp, 'TERMINATED'),
        });
      } else {
        // Mock fallback
        let filtered = [...mockUsers] as unknown as ApiUser[];
        if (!isAdminHR) filtered = filtered.filter(u => u.departmentId === currentUser?.departmentId);
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.userCode.toLowerCase().includes(s));
        }
        if (deptFilter) filtered = filtered.filter(u => u.departmentId === deptFilter);
        if (empStatusFilter) filtered = filtered.filter(u => u.employmentStatus === empStatusFilter);
        if (accStatusFilter) filtered = filtered.filter(u => u.accountStatus === accStatusFilter);
        setTotalCount(filtered.length);
        setUsers(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
        setStats({
          total: mockUsers.length,
          active: mockUsers.filter(u => u.employmentStatus === 'ACTIVE').length,
          probation: mockUsers.filter(u => u.employmentStatus === 'PROBATION').length,
          terminated: mockUsers.filter(u => u.employmentStatus === 'TERMINATED').length,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, empStatusFilter, accStatusFilter, page, isAdminHR, currentUser?.departmentId]);

  useEffect(() => { setPage(1); }, [search, deptFilter, empStatusFilter, accStatusFilter]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create employee ────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.fullName || !createForm.email || !createForm.departmentId || !createForm.jobTitleId || !createForm.hireDate) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    setLoadingCreate(true);
    try {
      if (USE_API) {
        await usersService.createUser({
          fullName: createForm.fullName,
          email: createForm.email,
          phoneNumber: createForm.phoneNumber || undefined,
          departmentId: createForm.departmentId,
          jobTitleId: createForm.jobTitleId,
          managerId: createForm.managerId || null,
          hireDate: createForm.hireDate,
          employmentStatus: createForm.employmentStatus,
        });
      }
      toast.success(`Đã tạo nhân viên ${createForm.fullName}. Email kích hoạt đã được gửi.`);
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tạo nhân viên thất bại');
    } finally {
      setLoadingCreate(false);
    }
  };

  const getDeptName = (id: string) => {
    if (USE_API) return deptOptions.find(d => d.id === id)?.name ?? id;
    return getDepartmentById(id)?.name ?? id;
  };
  const getJobName = (id: string) => {
    if (USE_API) return jobOptions.find(j => j.id === id)?.name ?? id;
    return getJobTitleById(id)?.name ?? id;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const activeFilters = [deptFilter, empStatusFilter, accStatusFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold">Danh sách nhân viên</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Quản lý thông tin và tài khoản nhân viên</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-border hover:bg-accent transition" title="Làm mới">
            <RefreshCw size={15} className={loading ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
          </button>
          {isAdminHR && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition">
              <Plus size={15} /> Thêm nhân viên
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tổng nhân viên" value={stats.total} icon={Users} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Chính thức" value={stats.active} icon={UserCheck} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="Thử việc" value={stats.probation} icon={Briefcase} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Đã nghỉ" value={stats.terminated} icon={UserX} color="bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" />
      </div>

      {/* Search + Filter bar */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã nhân viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] transition ${showFilters || activeFilters > 0 ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-border text-muted-foreground hover:bg-accent'}`}
        >
          <SlidersHorizontal size={14} />
          Bộ lọc
          {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">{activeFilters}</span>}
        </button>

        {(search || activeFilters > 0) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setEmpStatusFilter(''); setAccStatusFilter(''); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-accent transition"
          >
            <X size={13} /> Xoá lọc
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-3 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Phòng ban</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[13px]">
              <option value="">Tất cả</option>
              {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Trạng thái làm việc</label>
            <select value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[13px]">
              <option value="">Tất cả</option>
              {Object.entries(empStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Trạng thái tài khoản</label>
            <select value={accStatusFilter} onChange={e => setAccStatusFilter(e.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[13px]">
              <option value="">Tất cả</option>
              {Object.entries(accStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Employee list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px]">Đang tải...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <AlertCircle size={24} className="text-red-400" />
            <p className="text-[13px]">{error}</p>
            <button onClick={fetchUsers} className="text-[12px] text-blue-600 hover:underline">Thử lại</button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users size={32} className="opacity-30" />
            <p className="text-[13px]">Không có nhân viên nào phù hợp</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <span>Nhân viên</span>
              <span>Phòng ban / Chức danh</span>
              <span>Ngày vào</span>
              <span>Trạng thái làm việc</span>
              <span>Tài khoản</span>
              <span />
            </div>

            <div className="divide-y divide-border">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/employees/${u.id}`)}
                  className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition items-center"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.fullName} avatarUrl={u.avatarUrl} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{u.fullName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      <div className="text-[10px] text-muted-foreground md:hidden">{u.userCode}</div>
                    </div>
                  </div>
                  {/* Dept */}
                  <div className="hidden md:block">
                    <div className="text-[12px] flex items-center gap-1"><Building2 size={11} className="text-muted-foreground" /> {getDeptName(u.departmentId)}</div>
                    <div className="text-[11px] text-muted-foreground">{getJobName(u.jobTitleId)}</div>
                  </div>
                  {/* Hire date */}
                  <div className="hidden md:block text-[12px] text-muted-foreground">
                    {new Date(u.hireDate).toLocaleDateString('vi-VN')}
                  </div>
                  {/* Emp status */}
                  <div className="hidden md:block">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${empStatusColors[u.employmentStatus] ?? ''}`}>
                      {empStatusLabels[u.employmentStatus] ?? u.employmentStatus}
                    </span>
                  </div>
                  {/* Acc status */}
                  <div className="hidden md:block">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${accStatusColors[u.accountStatus] ?? ''}`}>
                      {accStatusLabels[u.accountStatus] ?? u.accountStatus}
                    </span>
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-end">
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-[12px]">
                <span className="text-muted-foreground">
                  Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent transition">
                    ← Trước
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent transition">
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-semibold">Thêm nhân viên mới</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-accent transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Họ và tên *', key: 'fullName', type: 'text', placeholder: 'Nguyễn Văn A' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'nva@techvn.com' },
                { label: 'Số điện thoại', key: 'phoneNumber', type: 'tel', placeholder: '0912345678' },
                { label: 'Ngày vào làm *', key: 'hireDate', type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[12px] text-muted-foreground block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={(createForm as Record<string, string>)[f.key]}
                    onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Phòng ban *</label>
                <select value={createForm.departmentId} onChange={e => setCreateForm(p => ({ ...p, departmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
                  <option value="">-- Chọn phòng ban --</option>
                  {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Chức danh *</label>
                <select value={createForm.jobTitleId} onChange={e => setCreateForm(p => ({ ...p, jobTitleId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
                  <option value="">-- Chọn chức danh --</option>
                  {jobOptions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Hình thức làm việc</label>
                <select value={createForm.employmentStatus} onChange={e => setCreateForm(p => ({ ...p, employmentStatus: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
                  <option value="PROBATION">Thử việc</option>
                  <option value="ACTIVE">Chính thức</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition">
                Huỷ
              </button>
              <button
                onClick={handleCreate}
                disabled={loadingCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loadingCreate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {loadingCreate ? 'Đang tạo...' : 'Tạo nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
