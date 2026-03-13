import { useState, useMemo } from 'react';
import { getUserById, departments, workShifts as initialShifts, holidays as initialHolidays, systemConfigs as initialConfigs } from '../data/mockData';
import type { RoleCode, AuditLog, WorkShift, ShiftType, Holiday, SystemConfig } from '../data/mockData';
import { useEmployeeData } from '../context/EmployeeContext';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Lock, RotateCcw, X, Search, Plus, Edit2, Trash2, Check,
  Eye, EyeOff, UserCheck, UserX, KeyRound, ChevronDown, ArrowRight,
  Clock, Calendar, Sun, Moon, Sunrise, Sunset, Zap, Filter, RefreshCcw,
  AlertTriangle, Activity, FileText, Users, Briefcase, DollarSign,
  ArrowUpDown, ArrowDown, ArrowUp, Building2, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS & ROLE MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════
const accStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISABLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
const accStatusLabels: Record<string, string> = { ACTIVE: 'Hoạt động', PENDING: 'Chờ kích hoạt', LOCKED: 'Đã khoá', DISABLED: 'Vô hiệu' };
const ALL_ROLES: { code: RoleCode; label: string; desc: string; color: string }[] = [
  { code: 'ADMIN', label: 'Admin', desc: 'Toàn quyền hệ thống', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { code: 'HR', label: 'Nhân sự', desc: 'Quản lý nhân viên, chấm công, nghỉ phép', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { code: 'MANAGER', label: 'Quản lý', desc: 'Quản lý team, duyệt yêu cầu', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { code: 'EMPLOYEE', label: 'Nhân viên', desc: 'Vai trò cơ bản', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { code: 'SALES', label: 'Kinh doanh', desc: 'Quản lý KH, hợp đồng', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { code: 'ACCOUNTANT', label: 'Kế toán', desc: 'Quản lý tài chính, hóa đơn', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
];

export function AccountsPage() {
  const { allUsers, updateUser, addAuditLog } = useEmployeeData();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleDialogUser, setRoleDialogUser] = useState<string | null>(null);
  const [lockDialogUser, setLockDialogUser] = useState<string | null>(null);
  const [resetDialogUser, setResetDialogUser] = useState<string | null>(null);

  let filtered = allUsers;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.userCode.toLowerCase().includes(s));
  }
  if (statusFilter) filtered = filtered.filter(u => u.accountStatus === statusFilter);
  if (roleFilter) filtered = filtered.filter(u => u.roles.includes(roleFilter as RoleCode));

  const hasFilters = search || statusFilter || roleFilter;

  // Stats
  const total = allUsers.length;
  const active = allUsers.filter(u => u.accountStatus === 'ACTIVE').length;
  const locked = allUsers.filter(u => u.accountStatus === 'LOCKED').length;

  const logAction = (actionType: string, description: string, userId: string, oldV?: Record<string, unknown>, newV?: Record<string, unknown>) => {
    addAuditLog({
      id: `audit-${Date.now()}`, actorUserId: currentUser!.id,
      entityType: 'User', actionType, description,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: oldV, newValues: newV,
    });
  };

  const handleToggleRole = (userId: string, role: RoleCode) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const oldRoles = [...user.roles];
    const newRoles = user.roles.includes(role) ? user.roles.filter(r => r !== role) : [...user.roles, role];
    if (newRoles.length === 0) { toast.error('Người dùng phải có ít nhất 1 vai trò'); return; }
    updateUser(userId, { roles: newRoles });
    logAction('UPDATE_ROLE', `Cập nhật vai trò ${user.fullName}: ${oldRoles.join(',')} → ${newRoles.join(',')}`, userId,
      { roles: oldRoles }, { roles: newRoles });
    toast.success(`Đã cập nhật vai trò cho ${user.fullName}`);
  };

  const handleLockToggle = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.accountStatus === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    updateUser(userId, { accountStatus: newStatus as any });
    logAction(newStatus === 'LOCKED' ? 'LOCK_ACCOUNT' : 'UNLOCK_ACCOUNT',
      `${newStatus === 'LOCKED' ? 'Khoá' : 'Mở khoá'} tài khoản ${user.fullName}`, userId,
      { accountStatus: user.accountStatus }, { accountStatus: newStatus });
    toast.success(`Đã ${newStatus === 'LOCKED' ? 'khoá' : 'mở khoá'} tài khoản ${user.fullName}`);
    setLockDialogUser(null);
  };

  const handleResetPassword = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    updateUser(userId, { mustChangePassword: true });
    logAction('RESET_PASSWORD', `Reset mật khẩu cho ${user.fullName}`, userId);
    toast.success(`Đã reset mật khẩu cho ${user.fullName}. Mật khẩu mặc định: TechVN@2025`);
    setResetDialogUser(null);
  };

  const roleDialogUserObj = roleDialogUser ? allUsers.find(u => u.id === roleDialogUser) : null;
  const lockDialogUserObj = lockDialogUser ? allUsers.find(u => u.id === lockDialogUser) : null;
  const resetDialogUserObj = resetDialogUser ? allUsers.find(u => u.id === resetDialogUser) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Tài khoản & Phân quyền</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
          <div><div className="text-[11px] text-muted-foreground">Tổng tài khoản</div><div className="text-[20px]">{total}</div></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center"><UserCheck size={20} className="text-green-600" /></div>
          <div><div className="text-[11px] text-muted-foreground">Đang hoạt động</div><div className="text-[20px] text-green-600">{active}</div></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><Lock size={20} className="text-red-600" /></div>
          <div><div className="text-[11px] text-muted-foreground">Đã khoá</div><div className="text-[20px] text-red-500">{locked}</div></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm tên, email, mã NV..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả TT</option>
          {Object.entries(accStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả role</option>
          {ALL_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setRoleFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Phòng ban</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Vai trò</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Tài khoản</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Đăng nhập cuối</th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const dept = departments.find(d => d.id === u.departmentId);
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">{u.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <span className="text-[13px]">{u.fullName}</span>
                          <div className="text-[10px] text-muted-foreground">{u.userCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3 text-[13px] hidden lg:table-cell">{dept?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(r => {
                          const roleInfo = ALL_ROLES.find(ar => ar.code === r);
                          return <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded ${roleInfo?.color || 'bg-gray-100 text-gray-700'}`}>{roleInfo?.label || r}</span>;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${accStatusColors[u.accountStatus]}`}>{accStatusLabels[u.accountStatus]}</span>
                        {u.mustChangePassword && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Đổi MK</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setRoleDialogUser(u.id)} title="Quản lý vai trò" className="p-1.5 rounded-lg hover:bg-accent text-blue-600"><Shield size={14} /></button>
                        <button onClick={() => setLockDialogUser(u.id)} title={u.accountStatus === 'LOCKED' ? 'Mở khoá' : 'Khoá'}
                          className={`p-1.5 rounded-lg hover:bg-accent ${u.accountStatus === 'LOCKED' ? 'text-green-600' : 'text-red-500'}`}>
                          {u.accountStatus === 'LOCKED' ? <UserCheck size={14} /> : <Lock size={14} />}
                        </button>
                        <button onClick={() => setResetDialogUser(u.id)} title="Reset mật khẩu" className="p-1.5 rounded-lg hover:bg-accent text-orange-500"><KeyRound size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy tài khoản</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} tài khoản</div>
      </div>

      {/* Role Management Dialog */}
      {roleDialogUserObj && (
        <Overlay onClose={() => setRoleDialogUser(null)}>
          <DlgHeader title={`Quản lý vai trò — ${roleDialogUserObj.fullName}`} onClose={() => setRoleDialogUser(null)} />
          <div className="p-4 space-y-3">
            <div className="text-[12px] text-muted-foreground mb-2">Nhấn vào vai trò để gán/bỏ gán. Người dùng phải có ít nhất 1 vai trò.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ROLES.map(r => {
                const has = roleDialogUserObj.roles.includes(r.code);
                return (
                  <button key={r.code} onClick={() => handleToggleRole(roleDialogUserObj.id, r.code)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${has ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-border hover:border-blue-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] px-2 py-0.5 rounded ${r.color}`}>{r.label}</span>
                      {has && <Check size={16} className="text-blue-600" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{r.desc}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-[12px] text-muted-foreground">
              Vai trò hiện tại: <span className="text-foreground">{roleDialogUserObj.roles.map(r => ALL_ROLES.find(ar => ar.code === r)?.label || r).join(', ')}</span>
            </div>
          </div>
        </Overlay>
      )}

      {/* Lock/Unlock Confirm Dialog */}
      {lockDialogUserObj && (
        <Overlay onClose={() => setLockDialogUser(null)} narrow>
          <div className="p-6 text-center space-y-4">
            <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${lockDialogUserObj.accountStatus === 'LOCKED' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              {lockDialogUserObj.accountStatus === 'LOCKED' ? <UserCheck size={28} className="text-green-600" /> : <Lock size={28} className="text-red-500" />}
            </div>
            <h3 className="text-[16px]">{lockDialogUserObj.accountStatus === 'LOCKED' ? 'Mở khoá' : 'Khoá'} tài khoản?</h3>
            <p className="text-[13px] text-muted-foreground">
              {lockDialogUserObj.accountStatus === 'LOCKED'
                ? `Mở khoá tài khoản cho ${lockDialogUserObj.fullName}. Người dùng sẽ có thể đăng nhập lại.`
                : `Khoá tài khoản ${lockDialogUserObj.fullName}. Người dùng sẽ không thể đăng nhập.`
              }
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setLockDialogUser(null)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
              <button onClick={() => handleLockToggle(lockDialogUserObj.id)}
                className={`px-4 py-2 rounded-lg text-white text-[13px] ${lockDialogUserObj.accountStatus === 'LOCKED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {lockDialogUserObj.accountStatus === 'LOCKED' ? 'Mở khoá' : 'Khoá tài khoản'}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Reset Password Confirm Dialog */}
      {resetDialogUserObj && (
        <Overlay onClose={() => setResetDialogUser(null)} narrow>
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-orange-100 dark:bg-orange-900/20">
              <KeyRound size={28} className="text-orange-500" />
            </div>
            <h3 className="text-[16px]">Reset mật khẩu?</h3>
            <p className="text-[13px] text-muted-foreground">
              Đặt lại mật khẩu cho <strong>{resetDialogUserObj.fullName}</strong>.<br />
              Mật khẩu mặc định: <code className="bg-muted px-1.5 py-0.5 rounded text-[12px]">TechVN@2025</code><br />
              Người dùng sẽ được yêu cầu đổi mật khẩu ngay lần đăng nhập tiếp theo.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setResetDialogUser(null)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
              <button onClick={() => handleResetPassword(resetDialogUserObj.id)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-[13px] hover:bg-orange-700">Reset mật khẩu</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SYSTEM SHIFTS PAGE — Full CRUD
// ═══════════════════════════════════════════════════════════════
const shiftTypeLabels: Record<string, string> = { MORNING: 'Sáng', AFTERNOON: 'Chiều', NIGHT: 'Đêm', FLEXIBLE: 'Linh hoạt', SPLIT: 'Chia ca' };
const shiftTypeIcons: Record<string, React.ReactNode> = {
  MORNING: <Sunrise size={14} className="text-yellow-500" />,
  AFTERNOON: <Sun size={14} className="text-orange-500" />,
  NIGHT: <Moon size={14} className="text-indigo-500" />,
  FLEXIBLE: <Zap size={14} className="text-green-500" />,
  SPLIT: <RefreshCcw size={14} className="text-blue-500" />,
};

export function SystemShiftsPage() {
  const [shifts, setShifts] = useState<WorkShift[]>(initialShifts);
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState<WorkShift | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm = () => ({
    code: '', name: '', shiftType: 'MORNING' as ShiftType,
    startTime: '08:00', endTime: '17:00', breakMinutes: '60', workMinutes: '480',
  });
  const [form, setForm] = useState(emptyForm());

  const openCreate = () => { setEditShift(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (s: WorkShift) => {
    setEditShift(s);
    setForm({
      code: s.code, name: s.name, shiftType: s.shiftType,
      startTime: s.startTime, endTime: s.endTime,
      breakMinutes: String(s.breakMinutes), workMinutes: String(s.workMinutes),
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.code || !form.name) { toast.error('Vui lòng nhập mã và tên ca'); return; }
    if (editShift) {
      setShifts(prev => prev.map(s => s.id === editShift.id ? {
        ...s, code: form.code, name: form.name, shiftType: form.shiftType,
        startTime: form.startTime, endTime: form.endTime,
        breakMinutes: parseInt(form.breakMinutes) || 0, workMinutes: parseInt(form.workMinutes) || 0,
      } : s));
      toast.success(`Đã cập nhật ca ${form.name}`);
    } else {
      const newShift: WorkShift = {
        id: `ws-${Date.now()}`, code: form.code, name: form.name,
        shiftType: form.shiftType, startTime: form.startTime, endTime: form.endTime,
        breakMinutes: parseInt(form.breakMinutes) || 0, workMinutes: parseInt(form.workMinutes) || 0,
      };
      setShifts(prev => [...prev, newShift]);
      toast.success(`Đã tạo ca ${form.name}`);
    }
    setShowForm(false);
    setEditShift(null);
  };

  const handleDelete = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
    toast.success('Đã xoá ca làm việc');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px]">Ca làm việc</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Thêm ca</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shifts.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {shiftTypeIcons[s.shiftType]}
                <span className="text-[14px]">{s.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted">{s.code}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Loại ca:</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{shiftTypeLabels[s.shiftType]}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Giờ làm:</span>
                <span>{s.startTime} — {s.endTime}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Nghỉ:</span>
                <span>{s.breakMinutes} phút</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Thời gian làm:</span>
                <span>{s.workMinutes} phút ({Math.round(s.workMinutes / 60 * 10) / 10}h)</span>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
              <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <DlgHeader title={editShift ? 'Cập nhật ca làm việc' : 'Thêm ca làm việc mới'} onClose={() => setShowForm(false)} />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Mã ca *</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CA_SANG" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Tên ca *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ca sáng" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Loại ca</label>
              <select value={form.shiftType} onChange={e => setForm(f => ({ ...f, shiftType: e.target.value as ShiftType }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                {Object.entries(shiftTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Giờ bắt đầu</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Giờ kết thúc</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Phút nghỉ</label>
                <input type="number" value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Phút làm việc</label>
                <input type="number" value={form.workMinutes} onChange={e => setForm(f => ({ ...f, workMinutes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">{editShift ? 'Cập nhật' : 'Tạo ca'}</button>
          </div>
        </Overlay>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)} narrow>
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-red-100 dark:bg-red-900/20">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-[16px]">Xoá ca làm việc?</h3>
            <p className="text-[13px] text-muted-foreground">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700">Xoá</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SYSTEM HOLIDAYS PAGE — Full CRUD with year management
// ═══════════════════════════════════════════════════════════════
export function SystemHolidaysPage() {
  const [allHolidays, setAllHolidays] = useState<Holiday[]>(initialHolidays);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [showForm, setShowForm] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm = () => ({ name: '', date: '', isRecurring: false });
  const [form, setForm] = useState(emptyForm());

  const years = [...new Set(allHolidays.map(h => h.year))].sort();
  const filtered = allHolidays.filter(h => h.year === selectedYear).sort((a, b) => a.date.localeCompare(b.date));
  const totalDays = filtered.length;

  const openCreate = () => { setEditHoliday(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (h: Holiday) => { setEditHoliday(h); setForm({ name: h.name, date: h.date, isRecurring: h.isRecurring }); setShowForm(true); };

  const handleSave = () => {
    if (!form.name || !form.date) { toast.error('Vui lòng nhập tên và ngày lễ'); return; }
    const year = parseInt(form.date.split('-')[0]);
    if (editHoliday) {
      setAllHolidays(prev => prev.map(h => h.id === editHoliday.id ? { ...h, name: form.name, date: form.date, year, isRecurring: form.isRecurring } : h));
      toast.success(`Đã cập nhật ${form.name}`);
    } else {
      const newH: Holiday = { id: `h-${Date.now()}`, name: form.name, date: form.date, year, isRecurring: form.isRecurring };
      setAllHolidays(prev => [...prev, newH]);
      toast.success(`Đã thêm ngày lễ ${form.name}`);
    }
    setShowForm(false);
    setEditHoliday(null);
  };

  const handleDelete = (id: string) => {
    setAllHolidays(prev => prev.filter(h => h.id !== id));
    setDeleteConfirm(null);
    toast.success('Đã xoá ngày lễ');
  };

  const getDayOfWeek = (dateStr: string) => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return days[new Date(dateStr).getDay()];
  };

  const getMonthGroup = (dateStr: string) => {
    return parseInt(dateStr.split('-')[1]);
  };

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    filtered.forEach(h => {
      const m = getMonthGroup(h.date);
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(h);
    });
    return map;
  }, [filtered]);

  const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Ngày lễ</h1>
        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Thêm ngày lễ</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><Calendar size={24} className="text-red-600" /></div>
        <div>
          <div className="text-[11px] text-muted-foreground">Tổng ngày lễ năm {selectedYear}</div>
          <div className="text-[24px] text-red-600">{totalDays} ngày</div>
        </div>
      </div>

      {/* Grouped by month */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([month, hols]) => (
          <div key={month} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <span className="text-[14px]">{monthNames[month]}</span>
              <span className="text-[12px] text-muted-foreground">{hols.length} ngày</span>
            </div>
            <div className="divide-y divide-border">
              {hols.map(h => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/10 flex flex-col items-center justify-center">
                      <span className="text-[14px] text-red-600">{parseInt(h.date.split('-')[2])}</span>
                    </div>
                    <div>
                      <div className="text-[13px]">{h.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {getDayOfWeek(h.date)} • {new Date(h.date).toLocaleDateString('vi-VN')}
                        {h.isRecurring && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Hàng năm</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(h.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có ngày lễ nào cho năm {selectedYear}</div>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)} narrow>
          <DlgHeader title={editHoliday ? 'Cập nhật ngày lễ' : 'Thêm ngày lễ mới'} onClose={() => setShowForm(false)} />
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Tên ngày lễ *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tết Nguyên Đán" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Ngày *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground">Lặp lại hàng năm:</label>
              <button onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                className={`px-3 py-1 rounded-lg text-[12px] border transition-colors ${form.isRecurring ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                {form.isRecurring ? 'Có' : 'Không'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">{editHoliday ? 'Cập nhật' : 'Thêm'}</button>
          </div>
        </Overlay>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)} narrow>
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-red-100 dark:bg-red-900/20"><Trash2 size={28} className="text-red-500" /></div>
            <h3 className="text-[16px]">Xoá ngày lễ?</h3>
            <p className="text-[13px] text-muted-foreground">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700">Xoá</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// AUDIT LOG PAGE — Enhanced with diff view & timeline
// ═══════════════════════════════════════════════════════════════
const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UPDATE_ROLE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  APPROVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  LOCK_ACCOUNT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNLOCK_ACCOUNT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESET_PASSWORD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  TERMINATE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  STATUS_CHANGE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CANCEL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  SUBMIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const entityIcons: Record<string, React.ReactNode> = {
  User: <Users size={14} />,
  LeaveRequest: <Calendar size={14} />,
  Attendance: <Clock size={14} />,
  Overtime: <Activity size={14} />,
  Contract: <FileText size={14} />,
  Invoice: <DollarSign size={14} />,
  Project: <Briefcase size={14} />,
};

export function AuditLogPage() {
  const { allAuditLogs } = useEmployeeData();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  let filtered = allAuditLogs;
  if (entityFilter) filtered = filtered.filter(l => l.entityType === entityFilter);
  if (actionFilter) filtered = filtered.filter(l => l.actionType === actionFilter);
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(l => l.description.toLowerCase().includes(s) || l.actionType.toLowerCase().includes(s) || (getUserById(l.actorUserId)?.fullName || '').toLowerCase().includes(s));
  }
  filtered = [...filtered].sort((a, b) => sortDir === 'desc' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));

  const entityTypes = [...new Set(allAuditLogs.map(l => l.entityType))].sort();
  const actionTypes = [...new Set(allAuditLogs.map(l => l.actionType))].sort();
  const hasFilters = entityFilter || actionFilter || searchTerm;

  // Group by date for timeline
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    filtered.forEach(l => {
      const d = l.createdAt.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(l);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Nhật ký kiểm toán</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-[12px] ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>Bảng</button>
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-[12px] ${viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>Timeline</button>
          </div>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} className="p-2 rounded-lg border border-border hover:bg-accent" title={sortDir === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}>
            {sortDir === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm theo mô tả, hành động, người thực hiện..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả đối tượng</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả hành động</option>
          {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearchTerm(''); setEntityFilter(''); setActionFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Thời gian</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Người thực hiện</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Đối tượng</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Hành động</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Mô tả</th>
                  <th className="text-center px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Dữ liệu</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const actor = getUserById(log.actorUserId);
                  const hasDiff = !!log.oldValues || !!log.newValues;
                  return (
                    <tr key={log.id} onClick={() => setSelectedLog(log)} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">{actor?.fullName.split(' ').slice(-1)[0][0]}</div>
                          <span className="text-[13px]">{actor?.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {entityIcons[log.entityType] || <FileText size={14} />}
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{log.entityType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${actionColors[log.actionType] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>{log.actionType}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[300px] truncate">{log.description}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {hasDiff && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Có diff</span>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{log.ipAddress}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy nhật ký nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} bản ghi</div>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {Array.from(groupedByDate.entries()).map(([date, logs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[12px]">
                  {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
                </div>
                <span className="text-[11px] text-muted-foreground">{logs.length} thao tác</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
                {logs.map(log => {
                  const actor = getUserById(log.actorUserId);
                  const hasDiff = !!log.oldValues || !!log.newValues;
                  return (
                    <div key={log.id} className="relative" onClick={() => setSelectedLog(log)}>
                      {/* Timeline dot */}
                      <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-card ${log.actionType === 'DELETE' || log.actionType === 'REJECT' || log.actionType === 'TERMINATE' ? 'bg-red-500' : log.actionType === 'APPROVE' || log.actionType === 'CREATE' ? 'bg-green-500' : 'bg-blue-500'}`} />

                      <div className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">{actor?.fullName.split(' ').slice(-1)[0][0]}</div>
                            <span className="text-[13px]">{actor?.fullName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${actionColors[log.actionType] || 'bg-gray-100 text-gray-700'}`}>{log.actionType}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted flex items-center gap-0.5">{entityIcons[log.entityType] || <FileText size={10} />} {log.entityType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasDiff && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">diff</span>}
                            <span className="text-[11px] text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</span>
                          </div>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-1">{log.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy nhật ký nào</div>
          )}
        </div>
      )}

      {/* LOG DETAIL DIALOG with enhanced diff */}
      {selectedLog && (
        <Overlay onClose={() => setSelectedLog(null)}>
          <DlgHeader title="Chi tiết nhật ký kiểm toán" onClose={() => setSelectedLog(null)} />
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Thời gian" value={new Date(selectedLog.createdAt).toLocaleString('vi-VN')} />
              <InfoBox label="Người thực hiện" value={getUserById(selectedLog.actorUserId)?.fullName || '—'} />
              <InfoBox label="Đối tượng" value={selectedLog.entityType} />
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-[11px] text-muted-foreground">Hành động</div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${actionColors[selectedLog.actionType] || ''}`}>{selectedLog.actionType}</span>
              </div>
              <div className="col-span-2"><InfoBox label="Mô tả" value={selectedLog.description} /></div>
              <InfoBox label="Địa chỉ IP" value={selectedLog.ipAddress} />
            </div>

            {/* Enhanced Diff View */}
            {(selectedLog.oldValues || selectedLog.newValues) && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border text-[13px] flex items-center gap-1">
                  <ArrowUpDown size={14} /> So sánh thay đổi
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-4 py-2 bg-red-50/50 dark:bg-red-900/5">
                    <div className="text-[11px] text-red-500 mb-2 flex items-center gap-1"><ArrowUp size={10} /> Giá trị cũ</div>
                    {selectedLog.oldValues ? (
                      <div className="space-y-1.5">
                        {Object.entries(selectedLog.oldValues).map(([key, val]) => {
                          const newVal = selectedLog.newValues?.[key];
                          const changed = newVal !== undefined && JSON.stringify(val) !== JSON.stringify(newVal);
                          return (
                            <div key={key} className={`text-[12px] ${changed ? 'bg-red-100/80 dark:bg-red-900/15 px-2 py-1 rounded' : ''}`}>
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <span className={changed ? 'line-through text-red-500' : ''}>{JSON.stringify(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[12px] text-muted-foreground italic">Không có dữ liệu</div>
                    )}
                  </div>
                  <div className="px-4 py-2 bg-green-50/50 dark:bg-green-900/5">
                    <div className="text-[11px] text-green-500 mb-2 flex items-center gap-1"><ArrowDown size={10} /> Giá trị mới</div>
                    {selectedLog.newValues ? (
                      <div className="space-y-1.5">
                        {Object.entries(selectedLog.newValues).map(([key, val]) => {
                          const oldVal = selectedLog.oldValues?.[key];
                          const changed = oldVal !== undefined && JSON.stringify(val) !== JSON.stringify(oldVal);
                          return (
                            <div key={key} className={`text-[12px] ${changed ? 'bg-green-100/80 dark:bg-green-900/15 px-2 py-1 rounded' : ''}`}>
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <span className={changed ? 'text-green-600' : ''}>{JSON.stringify(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[12px] text-muted-foreground italic">Không có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Raw JSON fallback */}
            {(selectedLog.oldValues || selectedLog.newValues) && (
              <details className="text-[12px]">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Xem dữ liệu gốc (JSON)</summary>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {selectedLog.oldValues && (
                    <div>
                      <div className="text-[11px] text-red-500 mb-1">oldValues:</div>
                      <pre className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 text-[10px] overflow-x-auto max-h-40">{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                    </div>
                  )}
                  {selectedLog.newValues && (
                    <div>
                      <div className="text-[11px] text-green-500 mb-1">newValues:</div>
                      <pre className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2 text-[10px] overflow-x-auto max-h-40">{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}


// ─── Shared Components ──────────────────────────────────────
function Overlay({ children, onClose, narrow }: { children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${narrow ? 'max-w-sm' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>{children}</div>
    </div>
  );
}

function DlgHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
      <h3 className="text-[16px]">{title}</h3>
      <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[13px] mt-0.5 break-words">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM CONFIG PAGE (ADMIN ONLY)
// ═══════════════════════════════════════════════════════════════

const CONFIG_LABELS: Record<string, string> = {
  company_name: 'Tên công ty',
  company_address: 'Địa chỉ công ty',
  default_timezone: 'Múi giờ mặc định',
  work_hours_per_day: 'Giờ làm việc/ngày',
  work_days_per_week: 'Ngày làm việc/tuần',
  default_annual_leave_days: 'Ngày phép năm mặc định',
  max_failed_login_attempts: 'Lần đăng nhập sai tối đa',
  session_timeout_minutes: 'Hết hạn session (phút)',
  late_tolerance_minutes: 'Phút trễ chấp nhận',
  payslip_visible_days_before_payday: 'Xem payslip trước (ngày)',
};

const TIMEZONE_OPTIONS = [
  'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Shanghai', 'UTC', 'Europe/London', 'America/New_York',
];

interface ConfigGroup {
  title: string;
  icon: React.ReactNode;
  keys: string[];
}

const CONFIG_GROUPS: ConfigGroup[] = [
  { title: 'Thông tin công ty', icon: <Building2 size={18} />, keys: ['company_name', 'company_address'] },
  { title: 'Thời gian & Lịch làm việc', icon: <Clock size={18} />, keys: ['default_timezone', 'work_hours_per_day', 'work_days_per_week', 'late_tolerance_minutes'] },
  { title: 'Chính sách nhân sự', icon: <Users size={18} />, keys: ['default_annual_leave_days', 'payslip_visible_days_before_payday'] },
  { title: 'Bảo mật', icon: <Shield size={18} />, keys: ['max_failed_login_attempts', 'session_timeout_minutes'] },
];

const NUMBER_CONFIGS: Record<string, { min: number; max: number }> = {
  work_hours_per_day: { min: 1, max: 24 },
  work_days_per_week: { min: 1, max: 7 },
  default_annual_leave_days: { min: 0, max: 365 },
  max_failed_login_attempts: { min: 1, max: 20 },
  session_timeout_minutes: { min: 5, max: 1440 },
  late_tolerance_minutes: { min: 0, max: 60 },
  payslip_visible_days_before_payday: { min: 0, max: 30 },
};

export function SystemConfigPage() {
  const { addAuditLog } = useEmployeeData();
  const { currentUser } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>(initialConfigs);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getVal = (key: string) => configs.find(c => c.key === key)?.value || '';
  const getDesc = (key: string) => configs.find(c => c.key === key)?.description || '';

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(getVal(key));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = (key: string) => {
    const oldValue = getVal(key);
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: editValue } : c));
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'SYSTEM_CONFIG',
      actionType: 'UPDATE', description: `Cập nhật cấu hình: ${CONFIG_LABELS[key] || key}`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: { key, value: oldValue },
      newValues: { key, value: editValue },
    });
    setEditingKey(null);
    setEditValue('');
    toast.success('Đã lưu cấu hình');
  };

  const renderInput = (key: string) => {
    if (key === 'default_timezone') {
      return (
        <select value={editValue} onChange={e => setEditValue(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-full max-w-[300px]">
          {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      );
    }
    if (key === 'work_days_per_week') {
      return (
        <select value={editValue} onChange={e => setEditValue(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-24">
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={String(n)}>{n}</option>)}
        </select>
      );
    }
    if (NUMBER_CONFIGS[key]) {
      const { min, max } = NUMBER_CONFIGS[key];
      return (
        <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} min={min} max={max} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-28" />
      );
    }
    return (
      <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-full max-w-[400px]" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Cấu hình hệ thống</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Quản lý các thông số vận hành của hệ thống</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONFIG_GROUPS.map(group => (
          <div key={group.title} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-muted-foreground">{group.icon}</span>
              <h3 className="text-[14px]">{group.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {group.keys.map(key => (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px]">{CONFIG_LABELS[key] || key}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{getDesc(key)}</div>
                    </div>
                    {editingKey === key ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {renderInput(key)}
                        <button onClick={() => saveEdit(key)} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700" title="Lưu"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg border border-border hover:bg-accent" title="Huỷ"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[13px] bg-muted/50 px-3 py-1 rounded-lg">{getVal(key)}</span>
                        <button onClick={() => startEdit(key)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" title="Chỉnh sửa"><Pencil size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
