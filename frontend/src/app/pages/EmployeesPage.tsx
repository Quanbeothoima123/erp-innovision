import { useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmployeeData } from '../context/EmployeeContext';
import {
  departments, getDepartmentById, getJobTitleById, getUserById, jobTitles, formatFullVND,
  userCompensations,
} from '../data/mockData';
import type { User, UserCompensation, EmploymentStatus, AccountStatus, RoleCode, AuthToken } from '../data/mockData';
import {
  Search, Plus, X, Filter, ChevronDown, ChevronUp, Users, ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────────
const empStatusColors: Record<EmploymentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PROBATION: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ON_LEAVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TERMINATED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
const accStatusColors: Record<AccountStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISABLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
const empStatusLabels: Record<string, string> = { ACTIVE: 'Chính thức', PROBATION: 'Thử việc', ON_LEAVE: 'Nghỉ phép', TERMINATED: 'Đã nghỉ' };
const accStatusLabels: Record<string, string> = { ACTIVE: 'Hoạt động', PENDING: 'Chờ kích hoạt', LOCKED: 'Bị khoá', DISABLED: 'Vô hiệu' };

const ALL_ROLES: RoleCode[] = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'SALES', 'ACCOUNTANT'];

const emptyForm = {
  fullName: '', email: '', phoneNumber: '', departmentId: '', jobTitleId: '',
  managerId: '', hireDate: '', employmentStatus: 'PROBATION' as EmploymentStatus,
};

type SortKey = 'fullName' | 'hireDate' | 'department' | 'employmentStatus';

export function EmployeesPage() {
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const { allUsers, addUser, addCompensation, addAuthToken, addAuditLog } = useEmployeeData();

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [hireDateFrom, setHireDateFrom] = useState('');
  const [hireDateTo, setHireDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortAsc, setSortAsc] = useState(true);

  // Create dialog
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createStep, setCreateStep] = useState(1); // 1=info, 2=salary
  const [salaryForm, setSalaryForm] = useState({
    baseSalary: '', salaryType: 'MONTHLY' as 'MONTHLY' | 'DAILY' | 'HOURLY',
    isProbation: false, probationPercent: '85', probationEndDate: '',
    payDayOfMonth: '10', changeReason: '',
  });

  const isAdminHR = can('ADMIN', 'HR');
  const isManager = can('MANAGER');

  // ─── Filter Logic ─────────────────────────────────────────
  let filteredUsers = [...allUsers];
  if (!isAdminHR && isManager) {
    filteredUsers = filteredUsers.filter(u => u.departmentId === currentUser?.departmentId);
  }

  if (search) {
    const s = search.toLowerCase();
    filteredUsers = filteredUsers.filter(u =>
      u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) ||
      u.userCode.toLowerCase().includes(s) || u.phoneNumber.includes(s)
    );
  }
  if (deptFilter) filteredUsers = filteredUsers.filter(u => u.departmentId === deptFilter);
  if (empStatusFilter) filteredUsers = filteredUsers.filter(u => u.employmentStatus === empStatusFilter);
  if (accStatusFilter) filteredUsers = filteredUsers.filter(u => u.accountStatus === accStatusFilter);
  if (roleFilter) filteredUsers = filteredUsers.filter(u => u.roles.includes(roleFilter as RoleCode));
  if (hireDateFrom) filteredUsers = filteredUsers.filter(u => u.hireDate >= hireDateFrom);
  if (hireDateTo) filteredUsers = filteredUsers.filter(u => u.hireDate <= hireDateTo);

  // ─── Sort ─────────────────────────────────────────────────
  filteredUsers.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'fullName': cmp = a.fullName.localeCompare(b.fullName); break;
      case 'hireDate': cmp = a.hireDate.localeCompare(b.hireDate); break;
      case 'department': cmp = (getDepartmentById(a.departmentId)?.name || '').localeCompare(getDepartmentById(b.departmentId)?.name || ''); break;
      case 'employmentStatus': cmp = a.employmentStatus.localeCompare(b.employmentStatus); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ─── Handlers ─────────────────────────────────────────────
  const handleCreate = (skipSalary = false) => {
    if (!createForm.fullName || !createForm.email || !createForm.departmentId || !createForm.jobTitleId || !createForm.hireDate) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return;
    }
    const code = `EMP${String(allUsers.length + 1).padStart(3, '0')}`;
    const newId = `user-new-${Date.now()}`;
    const newUser: User = {
      id: newId, userCode: code, email: createForm.email,
      fullName: createForm.fullName, phoneNumber: createForm.phoneNumber,
      departmentId: createForm.departmentId, jobTitleId: createForm.jobTitleId,
      managerId: createForm.managerId || null, hireDate: createForm.hireDate,
      employmentStatus: createForm.employmentStatus, accountStatus: 'PENDING',
      mustChangePassword: true, roles: ['EMPLOYEE'],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addUser(newUser);

    // Create compensation if salary filled
    const baseSalaryNum = parseFloat(salaryForm.baseSalary);
    if (!skipSalary && baseSalaryNum > 0) {
      const probPct = parseFloat(salaryForm.probationPercent) || 85;
      const probSalary = Math.round(baseSalaryNum * probPct / 100);
      const comp: UserCompensation = {
        id: `uc-${Date.now()}`, userId: newId, effectiveDate: createForm.hireDate,
        baseSalary: baseSalaryNum, salaryType: salaryForm.salaryType, currency: 'VND',
        overtimeRateWeekday: 1.5, overtimeRateWeekend: 2.0, overtimeRateHoliday: 3.0,
        isActive: true, payFrequency: 'MONTHLY', payDayOfMonth: parseInt(salaryForm.payDayOfMonth) || 10,
        reason: salaryForm.changeReason || 'Lương khởi điểm',
        changeReason: salaryForm.changeReason || 'Lương khởi điểm',
        probationSalary: salaryForm.isProbation ? probSalary : undefined,
        probationEndDate: salaryForm.isProbation ? (salaryForm.probationEndDate || undefined) : undefined,
        createdByUserId: currentUser!.id, createdAt: new Date().toISOString().slice(0, 10),
      };
      addCompensation(comp);
    }

    const token: AuthToken = {
      id: `at-${Date.now()}`, userId: newId, tokenType: 'ACCOUNT_SETUP',
      token: `setup-${Math.random().toString(36).slice(2, 10)}`,
      isUsed: false, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(), createdByUserId: currentUser!.id,
    };
    addAuthToken(token);
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'CREATE', description: `Tạo nhân viên ${createForm.fullName} (${code})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      newValues: { fullName: createForm.fullName, email: createForm.email, accountStatus: 'PENDING', baseSalary: baseSalaryNum > 0 && !skipSalary ? baseSalaryNum : undefined },
    });
    setShowCreateForm(false);
    setCreateForm(emptyForm);
    setCreateStep(1);
    setSalaryForm({ baseSalary: '', salaryType: 'MONTHLY', isProbation: false, probationPercent: '85', probationEndDate: '', payDayOfMonth: '10', changeReason: '' });
    toast.success(`Đã tạo nhân viên ${createForm.fullName}. Token: ${token.token}`);
  };

  const clearFilters = () => {
    setSearch(''); setDeptFilter(''); setEmpStatusFilter(''); setAccStatusFilter('');
    setRoleFilter(''); setHireDateFrom(''); setHireDateTo('');
  };
  const hasFilters = search || deptFilter || empStatusFilter || accStatusFilter || roleFilter || hireDateFrom || hireDateTo;
  const activeFilterCount = [deptFilter, empStatusFilter, accStatusFilter, roleFilter, hireDateFrom, hireDateTo].filter(Boolean).length;

  // ─── Stats ────────────────────────────────────────────────
  const baseUsers = isAdminHR ? allUsers : (isManager ? allUsers.filter(u => u.departmentId === currentUser?.departmentId) : allUsers);
  const stats = {
    total: baseUsers.length,
    active: baseUsers.filter(u => u.employmentStatus === 'ACTIVE').length,
    probation: baseUsers.filter(u => u.employmentStatus === 'PROBATION').length,
    terminated: baseUsers.filter(u => u.employmentStatus === 'TERMINATED').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Danh sách nhân viên</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Quản lý thông tin, hồ sơ, lương và tài khoản nhân viên</p>
        </div>
        {isAdminHR && (
          <button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Thêm nhân viên</button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tổng nhân viên" value={stats.total} color="blue" />
        <StatCard label="Chính thức" value={stats.active} color="green" />
        <StatCard label="Thử việc" value={stats.probation} color="yellow" />
        <StatCard label="Đã nghỉ" value={stats.terminated} color="gray" />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Tìm tên, email, mã NV, SĐT..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">Tất cả phòng ban</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">Trạng thái NV</option>
            <option value="ACTIVE">Chính thức</option>
            <option value="PROBATION">Thử việc</option>
            <option value="ON_LEAVE">Nghỉ phép</option>
            <option value="TERMINATED">Đã nghỉ</option>
          </select>
          <button onClick={() => setShowAdvanced(p => !p)} className={`px-3 py-2 rounded-lg border text-[13px] flex items-center gap-1 transition-colors ${showAdvanced ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-border text-muted-foreground hover:bg-accent'}`}>
            <Filter size={14} />
            Nâng cao
            {activeFilterCount > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá bộ lọc</button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="bg-muted/30 border border-border rounded-xl p-3 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Tài khoản</label>
              <select value={accStatusFilter} onChange={e => setAccStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="PENDING">Chờ kích hoạt</option>
                <option value="LOCKED">Bị khoá</option>
                <option value="DISABLED">Vô hiệu</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Vai trò</label>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                <option value="">Tất cả vai trò</option>
                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Ngày vào từ</label>
              <input type="date" value={hireDateFrom} onChange={e => setHireDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Ngày vào đến</label>
              <input type="date" value={hireDateTo} onChange={e => setHireDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <SortHeader label="Nhân viên" sortKey="fullName" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Phòng ban" sortKey="department" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} className="hidden md:table-cell" />
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Chức danh</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden xl:table-cell">Quản lý</th>
                <SortHeader label="Ngày vào" sortKey="hireDate" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} className="hidden lg:table-cell" />
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Roles</th>
                <SortHeader label="Trạng thái" sortKey="employmentStatus" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Tài khoản</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const dept = getDepartmentById(u.departmentId);
                const job = getJobTitleById(u.jobTitleId);
                const mgr = u.managerId ? getUserById(u.managerId) : null;
                return (
                  <tr key={u.id} onClick={() => navigate(`/employees/${u.id}`)} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] shrink-0">{u.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <div className="text-[13px]">{u.fullName}</div>
                          <div className="text-[11px] text-muted-foreground">{u.userCode} • {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{dept?.name}</td>
                    <td className="px-4 py-3 text-[13px] hidden lg:table-cell">{job?.name}</td>
                    <td className="px-4 py-3 text-[13px] hidden xl:table-cell text-muted-foreground">{mgr?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{u.hireDate}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-0.5">
                        {u.roles.map(r => (
                          <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-0.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${empStatusColors[u.employmentStatus]}`}>{empStatusLabels[u.employmentStatus]}</span>
                        {!userCompensations.some(c => c.userId === u.id && c.isActive) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Chưa có lương</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className={`text-[11px] px-2 py-0.5 rounded-full ${accStatusColors[u.accountStatus]}`}>{accStatusLabels[u.accountStatus]}</span></td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy nhân viên nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">
          Hiển thị {filteredUsers.length} / {baseUsers.length} nhân viên
        </div>
      </div>

      {/* ═══ Create Employee Dialog ═══ */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCreateForm(false); setCreateStep(1); }} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-[16px]">Thêm nhân viên mới</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${createStep === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>1. Thông tin</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${createStep === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>2. Lương (tuỳ chọn)</span>
                </div>
              </div>
              <button onClick={() => { setShowCreateForm(false); setCreateStep(1); }} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
            </div>

            {createStep === 1 && (
              <>
                <div className="p-4 space-y-3">
                  <Field label="Họ tên *" value={createForm.fullName} onChange={v => setCreateForm(f => ({ ...f, fullName: v }))} placeholder="Nguyễn Văn A" />
                  <Field label="Email *" value={createForm.email} onChange={v => setCreateForm(f => ({ ...f, email: v }))} placeholder="nguyen.van.a@techvn.com" type="email" />
                  <Field label="Số điện thoại" value={createForm.phoneNumber} onChange={v => setCreateForm(f => ({ ...f, phoneNumber: v }))} placeholder="0901234567" />
                  <Sel label="Phòng ban *" value={createForm.departmentId} onChange={v => setCreateForm(f => ({ ...f, departmentId: v }))} options={departments.filter(d => d.isActive).map(d => ({ value: d.id, label: d.name }))} placeholder="-- Chọn phòng ban --" />
                  <Sel label="Chức danh *" value={createForm.jobTitleId} onChange={v => setCreateForm(f => ({ ...f, jobTitleId: v }))} options={jobTitles.filter(j => j.isActive).map(j => ({ value: j.id, label: j.name }))} placeholder="-- Chọn chức danh --" />
                  <Sel label="Quản lý trực tiếp" value={createForm.managerId} onChange={v => setCreateForm(f => ({ ...f, managerId: v }))} options={allUsers.filter(u => u.accountStatus === 'ACTIVE').map(u => ({ value: u.id, label: `${u.fullName} (${u.userCode})` }))} placeholder="-- Không chọn --" />
                  <Field label="Ngày vào làm *" value={createForm.hireDate} onChange={v => setCreateForm(f => ({ ...f, hireDate: v }))} type="date" />
                  <Sel label="Trạng thái hợp đồng" value={createForm.employmentStatus} onChange={v => setCreateForm(f => ({ ...f, employmentStatus: v as EmploymentStatus }))} options={[{ value: 'PROBATION', label: 'Thử việc' }, { value: 'ACTIVE', label: 'Chính thức' }]} />
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-border">
                  <button onClick={() => { setShowCreateForm(false); setCreateStep(1); }} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
                  <button onClick={() => {
                    if (!createForm.fullName || !createForm.email || !createForm.departmentId || !createForm.jobTitleId || !createForm.hireDate) {
                      toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return;
                    }
                    // Auto-set probation defaults
                    if (createForm.employmentStatus === 'PROBATION') {
                      const hd = new Date(createForm.hireDate);
                      hd.setMonth(hd.getMonth() + 2);
                      setSalaryForm(p => ({ ...p, isProbation: true, probationEndDate: hd.toISOString().slice(0, 10) }));
                    }
                    setCreateStep(2);
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">Tiếp → Cài đặt lương</button>
                </div>
              </>
            )}

            {createStep === 2 && (() => {
              const baseSalaryNum = parseFloat(salaryForm.baseSalary) || 0;
              const probPct = parseFloat(salaryForm.probationPercent) || 85;
              const probSalary = Math.round(baseSalaryNum * probPct / 100);
              return (
                <>
                  <div className="p-4 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-[12px] text-muted-foreground">
                      Bước này là tuỳ chọn. Bạn có thể bỏ qua và cài đặt lương sau trong trang chi tiết nhân viên.
                    </div>
                    <Field label="Lương cơ bản *" value={salaryForm.baseSalary} onChange={v => setSalaryForm(p => ({ ...p, baseSalary: v }))} type="number" placeholder="VD: 15.000.000" />
                    {baseSalaryNum > 0 && <div className="text-[12px] text-blue-600 -mt-2 pl-1">{formatFullVND(baseSalaryNum)}</div>}
                    <Sel label="Loại lương" value={salaryForm.salaryType} onChange={v => setSalaryForm(p => ({ ...p, salaryType: v as typeof p.salaryType }))} options={[{ value: 'MONTHLY', label: 'Tháng' }, { value: 'DAILY', label: 'Ngày' }, { value: 'HOURLY', label: 'Giờ' }]} />
                    <div className="flex items-center gap-2 pt-1">
                      <input type="checkbox" id="isProbCreate" checked={salaryForm.isProbation} onChange={e => setSalaryForm(p => ({ ...p, isProbation: e.target.checked }))} className="accent-blue-600" />
                      <label htmlFor="isProbCreate" className="text-[13px] cursor-pointer">Đây là lương thử việc?</label>
                    </div>
                    {salaryForm.isProbation && (
                      <div className="pl-5 space-y-3 border-l-2 border-yellow-300 dark:border-yellow-700">
                        <div>
                          <label className="block text-[12px] text-muted-foreground mb-1">Lương thử việc = {salaryForm.probationPercent}% lương chính thức</label>
                          <div className="flex items-center gap-2">
                            <input type="number" value={salaryForm.probationPercent} onChange={e => setSalaryForm(p => ({ ...p, probationPercent: e.target.value }))} className="w-20 px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" min="1" max="100" />
                            <span className="text-[12px] text-muted-foreground">%</span>
                            {baseSalaryNum > 0 && <span className="text-[12px] text-blue-600">= {formatFullVND(probSalary)}</span>}
                          </div>
                        </div>
                        <Field label="Ngày hết thử việc" value={salaryForm.probationEndDate} onChange={v => setSalaryForm(p => ({ ...p, probationEndDate: v }))} type="date" />
                      </div>
                    )}
                    <div>
                      <label className="block text-[12px] text-muted-foreground mb-1">Ngày trả lương hàng tháng</label>
                      <input type="number" value={salaryForm.payDayOfMonth} onChange={e => setSalaryForm(p => ({ ...p, payDayOfMonth: e.target.value }))} min="1" max="31" className="w-24 px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
                      <div className="text-[11px] text-muted-foreground mt-0.5">Nhân viên sẽ nhận lương vào ngày này hàng tháng</div>
                    </div>
                    <div>
                      <label className="block text-[12px] text-muted-foreground mb-1">Lý do / Ghi chú</label>
                      <textarea value={salaryForm.changeReason} onChange={e => setSalaryForm(p => ({ ...p, changeReason: e.target.value }))} rows={2} placeholder="VD: Lương khởi điểm theo offer letter" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 p-4 border-t border-border">
                    <button onClick={() => setCreateStep(1)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">← Quay lại</button>
                    <div className="flex gap-2">
                      <button onClick={() => handleCreate(true)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Bỏ qua & Tạo</button>
                      <button onClick={() => handleCreate(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">Tạo nhân viên</button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ─────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="text-[11px] opacity-70">{label}</div>
      <div className="text-[22px] mt-0.5">{value}</div>
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, asc, onSort, className = '' }: {
  label: string; sortKey: SortKey; currentKey: SortKey; asc: boolean;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th className={`text-left px-4 py-3 text-[12px] text-muted-foreground ${className}`}>
      <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        {active ? (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-40" />}
      </button>
    </th>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[12px] text-muted-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
    </div>
  );
}

function Sel({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[12px] text-muted-foreground mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}