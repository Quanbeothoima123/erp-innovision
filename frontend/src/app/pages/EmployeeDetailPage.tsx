// ================================================================
// EMPLOYEE DETAIL PAGE — Module 2 (API-integrated)
// Fixes: properly fetches from API, falls back to mock
// ================================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../../lib/apiClient';
import * as usersService from '../../lib/services/users.service';
import * as departmentsService from '../../lib/services/departments.service';
import * as jobTitlesService from '../../lib/services/jobTitles.service';
import type { ApiUser } from '../../lib/services/auth.service';
import type { UserProfile } from '../../lib/services/users.service';
import type { DepartmentOption } from '../../lib/services/departments.service';
import type { JobTitleOption } from '../../lib/services/jobTitles.service';
import {
  departments as mockDepts, jobTitles as mockJobTitles,
  getDepartmentById, getJobTitleById, getUserById,
  formatFullVND, users as mockUsers, workShifts,
} from '../data/mockData';
import {
  ChevronLeft, Edit2, Lock, Unlock, UserX, KeyRound, DollarSign,
  Wallet, AlertTriangle, Check, X, Plus, Ban, ScrollText, Clock,
  User as UserIcon, Shield, Building2, Phone, Mail, Calendar,
  Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const USE_API = !!import.meta.env.VITE_API_URL;

// ── Status constants ────────────────────────────────────────────
const empStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PROBATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ON_LEAVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TERMINATED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};
const accStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISABLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};
const empStatusLabels: Record<string, string> = { ACTIVE: 'Chính thức', PROBATION: 'Thử việc', ON_LEAVE: 'Nghỉ phép', TERMINATED: 'Đã nghỉ' };
const accStatusLabels: Record<string, string> = { ACTIVE: 'Hoạt động', PENDING: 'Chờ kích hoạt', LOCKED: 'Bị khoá', DISABLED: 'Vô hiệu' };
const genderLabels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác', UNDISCLOSED: 'Không tiết lộ' };

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-2xl" />;
  return <div className={`w-full h-full rounded-2xl ${color} flex items-center justify-center text-white text-3xl font-bold`}>{initials}</div>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[13px]">{value || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

// ── Overlay dialog wrapper ──────────────────────────────────────
function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>{children}</div>
    </div>
  );
}
function DlgHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
      <h3 className="text-[16px] font-medium">{title}</h3>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X size={16} /></button>
    </div>
  );
}
function DlgFooter({ onCancel, onConfirm, label, loading, variant = 'primary' }: {
  onCancel: () => void; onConfirm: () => void; label: string; loading?: boolean; variant?: 'primary' | 'danger';
}) {
  return (
    <div className="flex justify-end gap-2 p-4 border-t border-border">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition">Huỷ</button>
      <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-white rounded-lg text-[13px] flex items-center gap-1.5 transition disabled:opacity-50 ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
        {loading && <Loader2 size={13} className="animate-spin" />} {label}
      </button>
    </div>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export function EmployeeDetailPage() {
  const { id } = useParams();
  const { currentUser, can } = useAuth();
  const navigate = useNavigate();

  const isAdminHR = can('ADMIN', 'HR');
  const isAdmin = can('ADMIN');

  // ── State ──────────────────────────────────────────────────
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [deptOptions, setDeptOptions] = useState<DepartmentOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobTitleOption[]>([]);
  const [allUsersForSelect, setAllUsersForSelect] = useState<ApiUser[]>([]);

  // Dialog states
  const [showEditUser, setShowEditUser] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showStatusAction, setShowStatusAction] = useState<string | null>(null);
  const [showTerminate, setShowTerminate] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (USE_API) {
        const [u, p] = await Promise.all([
          usersService.getUserById(id),
          usersService.getUserProfile(id).catch(() => null),
        ]);
        setUser(u);
        setProfile(p);
      } else {
        const mockUser = mockUsers.find(u => u.id === id) as unknown as ApiUser | undefined;
        if (mockUser) setUser(mockUser);
        setProfile(null);
      }
    } catch {
      toast.error('Không tải được thông tin nhân viên');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  useEffect(() => {
    if (USE_API) {
      departmentsService.getDepartmentOptions().then(setDeptOptions).catch(() => {});
      jobTitlesService.getJobTitleOptions().then(setJobOptions).catch(() => {});
      usersService.listUsers({ limit: 200 }).then(r => setAllUsersForSelect(r.items)).catch(() => {});
    } else {
      setDeptOptions(mockDepts.map(d => ({ id: d.id, name: d.name })));
      setJobOptions(mockJobTitles.map(j => ({ id: j.id, name: j.name, code: j.code })));
      setAllUsersForSelect(mockUsers as unknown as ApiUser[]);
    }
  }, []);

  const getDeptName = (id: string) => deptOptions.find(d => d.id === id)?.name ?? getDepartmentById(id)?.name ?? id;
  const getJobName = (id: string) => jobOptions.find(j => j.id === id)?.name ?? getJobTitleById(id)?.name ?? id;

  // ── Handlers ───────────────────────────────────────────────
  const handleUpdateUser = async (data: Partial<ApiUser>) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateUser(user.id, data as usersService.UpdateUserPayload);
        setUser(updated);
      } else {
        setUser(prev => prev ? { ...prev, ...data } : null);
      }
      toast.success('Đã cập nhật thông tin nhân viên');
      setShowEditUser(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Cập nhật thất bại');
    } finally { setSaving(false); }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateUserProfile(user.id, data);
        setProfile(updated);
      } else {
        setProfile(prev => prev ? { ...prev, ...data } : { userId: user.id, ...data } as UserProfile);
      }
      toast.success('Đã cập nhật hồ sơ cá nhân');
      setShowEditProfile(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Cập nhật hồ sơ thất bại');
    } finally { setSaving(false); }
  };

  const handleAccountStatus = async (newStatus: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateAccountStatus(user.id, { accountStatus: newStatus as 'ACTIVE' | 'LOCKED' | 'DISABLED' });
        setUser(updated);
      } else {
        setUser(prev => prev ? { ...prev, accountStatus: newStatus } : null);
      }
      toast.success(`Đã ${newStatus === 'ACTIVE' ? 'mở khoá' : newStatus === 'LOCKED' ? 'khoá' : 'vô hiệu hoá'} tài khoản`);
      setShowStatusAction(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Thao tác thất bại');
    } finally { setSaving(false); }
  };

  const handleTerminate = async (reason: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.terminateUser(user.id, { reason });
        setUser(updated);
      } else {
        setUser(prev => prev ? { ...prev, employmentStatus: 'TERMINATED', accountStatus: 'DISABLED' } : null);
      }
      toast.success('Đã xử lý nghỉ việc cho nhân viên');
      setShowTerminate(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Thao tác thất bại');
    } finally { setSaving(false); }
  };

  const handleResendSetup = async () => {
    if (!user) return;
    try {
      if (USE_API) await usersService.resendSetupEmail(user.id);
      toast.success('Đã gửi lại email kích hoạt tài khoản');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gửi email thất bại');
    }
  };

  // ── Loading / Not found ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-[13px]">Đang tải...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-[14px] mb-4">Không tìm thấy nhân viên</p>
        <Link to="/employees" className="text-[13px] text-blue-600 hover:underline flex items-center gap-1">
          <ChevronLeft size={14} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const managerName = user.managerId
    ? (allUsersForSelect.find(u => u.id === user.managerId)?.fullName ?? getUserById(user.managerId)?.fullName ?? user.managerId)
    : null;

  const tabs = [
    { key: 'info', label: 'Thông tin', icon: <UserIcon size={14} /> },
    ...(isAdminHR || user.id === currentUser?.id ? [{ key: 'profile', label: 'Hồ sơ', icon: <Shield size={14} /> }] : []),
    ...(isAdminHR ? [
      { key: 'actions', label: 'Hành động', icon: <Lock size={14} /> },
    ] : []),
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Back */}
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition">
        <ChevronLeft size={14} /> Danh sách nhân viên
      </Link>

      {/* Profile header */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row gap-5">
        <div className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border border-border">
          <Avatar name={user.fullName} avatarUrl={user.avatarUrl} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 mb-1">
            <h1 className="text-[20px] font-semibold">{user.fullName}</h1>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${empStatusColors[user.employmentStatus] ?? ''}`}>
              {empStatusLabels[user.employmentStatus] ?? user.employmentStatus}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${accStatusColors[user.accountStatus] ?? ''}`}>
              {accStatusLabels[user.accountStatus] ?? user.accountStatus}
            </span>
          </div>
          <div className="text-[13px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><Building2 size={12} />{getDeptName(user.departmentId)}</span>
            <span>{getJobName(user.jobTitleId)}</span>
            <span className="flex items-center gap-1"><Mail size={12} />{user.email}</span>
            {user.phoneNumber && <span className="flex items-center gap-1"><Phone size={12} />{user.phoneNumber}</span>}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 flex gap-3">
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{user.userCode}</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> Vào làm: {new Date(user.hireDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={fetchUser} className="p-2 rounded-lg border border-border hover:bg-accent transition" title="Làm mới">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          {isAdminHR && (
            <button onClick={() => setShowEditUser(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition">
              <Edit2 size={13} /> Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab: INFO */}
      {activeTab === 'info' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5"><UserIcon size={14} /> Thông tin làm việc</h3>
            <InfoRow label="Mã nhân viên" value={user.userCode} />
            <InfoRow label="Phòng ban" value={getDeptName(user.departmentId)} />
            <InfoRow label="Chức danh" value={getJobName(user.jobTitleId)} />
            <InfoRow label="Quản lý trực tiếp" value={managerName ?? undefined} />
            <InfoRow label="Ngày vào làm" value={new Date(user.hireDate).toLocaleDateString('vi-VN')} />
            <InfoRow label="Loại nhân viên" value={empStatusLabels[user.employmentStatus]} />
            <InfoRow label="Trạng thái TK" value={accStatusLabels[user.accountStatus]} />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5"><Shield size={14} /> Phân quyền</h3>
            <div className="flex flex-wrap gap-1.5">
              {(user.roles ?? []).map(r => (
                <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">{r}</span>
              ))}
            </div>
            {user.lastLoginAt && (
              <InfoRow label="Đăng nhập lần cuối" value={new Date(user.lastLoginAt).toLocaleString('vi-VN')} />
            )}
            {user.mustChangePassword && (
              <div className="text-[12px] px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                ⚠ Chưa đổi mật khẩu lần đầu
              </div>
            )}
            {isAdminHR && (
              <div className="pt-2">
                <button onClick={handleResendSetup} className="text-[12px] px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition flex items-center gap-1.5">
                  <KeyRound size={12} /> Gửi lại email kích hoạt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium">Hồ sơ cá nhân</h3>
            {(isAdminHR || user.id === currentUser?.id) && (
              <button onClick={() => setShowEditProfile(true)} className="px-3 py-1.5 rounded-lg border border-border text-[12px] flex items-center gap-1.5 hover:bg-accent transition">
                <Edit2 size={12} /> Chỉnh sửa
              </button>
            )}
          </div>
          {profile ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow label="Ngày sinh" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : undefined} />
              <InfoRow label="Giới tính" value={genderLabels[profile.gender ?? ''] ?? profile.gender} />
              <InfoRow label="CCCD/CMND" value={profile.nationalIdNumber} />
              <InfoRow label="Mã số thuế" value={profile.taxCode} />
              <InfoRow label="Số BHXH" value={profile.socialInsuranceNumber} />
              <InfoRow label="Số BHYT" value={profile.healthInsuranceNumber} />
              <InfoRow label="Ngân hàng" value={profile.bankName} />
              <InfoRow label="Số tài khoản" value={profile.bankAccountNumber} />
              <InfoRow label="Chủ tài khoản" value={profile.bankAccountHolder} />
              <InfoRow label="Người liên hệ khẩn" value={profile.emergencyContactName} />
              <InfoRow label="SĐT liên hệ khẩn" value={profile.emergencyContactPhone} />
              <InfoRow label="Quan hệ" value={profile.emergencyContactRel} />
              <InfoRow label="Người phụ thuộc" value={String(profile.dependantCount ?? 0)} />
              <InfoRow label="Trình độ" value={profile.educationLevel} />
              <InfoRow label="Trường học" value={profile.university} />
              {profile.permanentAddress && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoRow label="Địa chỉ thường trú" value={profile.permanentAddress} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <UserIcon size={32} className="mx-auto opacity-20 mb-2" />
              <p className="text-[13px]">Chưa có thông tin hồ sơ</p>
              {(isAdminHR || user.id === currentUser?.id) && (
                <button onClick={() => setShowEditProfile(true)} className="mt-3 text-[12px] text-blue-600 hover:underline">
                  + Thêm thông tin hồ sơ
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: ACTIONS */}
      {activeTab === 'actions' && isAdminHR && (
        <div className="space-y-4">
          {/* Account status management */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[14px] font-medium flex items-center gap-2 mb-3"><Lock size={15} /> Quản lý tài khoản</h3>
            <p className="text-[12px] text-muted-foreground mb-3">
              Trạng thái hiện tại:{' '}
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${accStatusColors[user.accountStatus] ?? ''}`}>
                {accStatusLabels[user.accountStatus] ?? user.accountStatus}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {user.accountStatus !== 'ACTIVE' && (
                <button onClick={() => setShowStatusAction('ACTIVE')} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-emerald-700 transition">
                  <Unlock size={13} /> Mở khoá (ACTIVE)
                </button>
              )}
              {user.accountStatus !== 'LOCKED' && (
                <button onClick={() => setShowStatusAction('LOCKED')} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-red-700 transition">
                  <Lock size={13} /> Khoá tài khoản
                </button>
              )}
              {user.accountStatus !== 'DISABLED' && (
                <button onClick={() => setShowStatusAction('DISABLED')} className="px-3 py-2 bg-slate-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-slate-700 transition">
                  <Ban size={13} /> Vô hiệu hoá
                </button>
              )}
            </div>
          </div>

          {/* Role management */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[14px] font-medium flex items-center gap-2 mb-3"><Shield size={15} /> Phân quyền</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(user.roles ?? []).map(r => (
                <span key={r} className="text-[11px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">{r}</span>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">Để thay đổi quyền, liên hệ quản trị hệ thống hoặc dùng API PATCH /users/:id/roles</p>
          </div>

          {/* Terminate */}
          {user.employmentStatus !== 'TERMINATED' && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="text-[14px] font-medium flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                <UserX size={15} /> Xử lý nghỉ việc
              </h3>
              <p className="text-[12px] text-muted-foreground mb-3">
                Đặt trạng thái TERMINATED và vô hiệu hoá tài khoản nhân viên.
              </p>
              <button onClick={() => setShowTerminate(true)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-red-700 transition">
                <UserX size={13} /> Xử lý nghỉ việc
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Edit User */}
      {showEditUser && (
        <Overlay onClose={() => setShowEditUser(false)} wide>
          <DlgHeader title="Cập nhật thông tin nhân viên" onClose={() => setShowEditUser(false)} />
          <EditUserForm
            user={user}
            deptOptions={deptOptions}
            jobOptions={jobOptions}
            allUsers={allUsersForSelect}
            onSave={handleUpdateUser}
            saving={saving}
            onCancel={() => setShowEditUser(false)}
          />
        </Overlay>
      )}

      {/* Edit Profile */}
      {showEditProfile && (
        <Overlay onClose={() => setShowEditProfile(false)} wide>
          <DlgHeader title="Chỉnh sửa hồ sơ cá nhân" onClose={() => setShowEditProfile(false)} />
          <EditProfileForm
            profile={profile}
            onSave={handleUpdateProfile}
            saving={saving}
            onCancel={() => setShowEditProfile(false)}
          />
        </Overlay>
      )}

      {/* Status change confirm */}
      {showStatusAction && (
        <Overlay onClose={() => setShowStatusAction(null)}>
          <DlgHeader title="Xác nhận thay đổi trạng thái" onClose={() => setShowStatusAction(null)} />
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">
              Bạn có chắc muốn chuyển tài khoản của <strong>{user.fullName}</strong> sang trạng thái <strong>{accStatusLabels[showStatusAction]}</strong>?
            </p>
          </div>
          <DlgFooter
            onCancel={() => setShowStatusAction(null)}
            onConfirm={() => handleAccountStatus(showStatusAction)}
            label="Xác nhận"
            loading={saving}
            variant={showStatusAction === 'ACTIVE' ? 'primary' : 'danger'}
          />
        </Overlay>
      )}

      {/* Terminate confirm */}
      {showTerminate && (
        <Overlay onClose={() => setShowTerminate(false)}>
          <DlgHeader title="Xử lý nghỉ việc" onClose={() => setShowTerminate(false)} />
          <TerminateForm userName={user.fullName} onSave={handleTerminate} saving={saving} onCancel={() => setShowTerminate(false)} />
        </Overlay>
      )}
    </div>
  );
}

// ── Sub forms ──────────────────────────────────────────────────

function EditUserForm({ user, deptOptions, jobOptions, allUsers, onSave, saving, onCancel }: {
  user: ApiUser;
  deptOptions: DepartmentOption[];
  jobOptions: JobTitleOption[];
  allUsers: ApiUser[];
  onSave: (d: Partial<ApiUser>) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    fullName: user.fullName,
    phoneNumber: user.phoneNumber ?? '',
    departmentId: user.departmentId,
    jobTitleId: user.jobTitleId,
    managerId: user.managerId ?? '',
    hireDate: user.hireDate ? user.hireDate.split('T')[0] : '',
    employmentStatus: user.employmentStatus,
  });
  return (
    <>
      <div className="p-5 space-y-3">
        {[
          { label: 'Họ và tên *', key: 'fullName', type: 'text' },
          { label: 'Số điện thoại', key: 'phoneNumber', type: 'tel' },
          { label: 'Ngày vào làm', key: 'hireDate', type: 'date' },
        ].map(fi => (
          <div key={fi.key}>
            <label className="text-[12px] text-muted-foreground block mb-1">{fi.label}</label>
            <input type={fi.type} value={(f as Record<string, string>)[fi.key]}
              onChange={e => setF(p => ({ ...p, [fi.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">Phòng ban *</label>
          <select value={f.departmentId} onChange={e => setF(p => ({ ...p, departmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
            {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">Chức danh *</label>
          <select value={f.jobTitleId} onChange={e => setF(p => ({ ...p, jobTitleId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
            {jobOptions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">Quản lý trực tiếp</label>
          <select value={f.managerId} onChange={e => setF(p => ({ ...p, managerId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
            <option value="">-- Không có --</option>
            {allUsers.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.userCode})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">Trạng thái làm việc</label>
          <select value={f.employmentStatus} onChange={e => setF(p => ({ ...p, employmentStatus: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
            <option value="PROBATION">Thử việc</option>
            <option value="ACTIVE">Chính thức</option>
            <option value="ON_LEAVE">Nghỉ phép dài hạn</option>
          </select>
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() => {
          if (!f.fullName || !f.departmentId || !f.jobTitleId) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
          onSave({ ...f, managerId: f.managerId || null });
        }}
        label="Lưu thay đổi"
        loading={saving}
      />
    </>
  );
}

function EditProfileForm({ profile, onSave, saving, onCancel }: {
  profile: UserProfile | null;
  onSave: (d: Partial<UserProfile>) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
    gender: profile?.gender ?? '',
    nationalIdNumber: profile?.nationalIdNumber ?? '',
    taxCode: profile?.taxCode ?? '',
    socialInsuranceNumber: profile?.socialInsuranceNumber ?? '',
    healthInsuranceNumber: profile?.healthInsuranceNumber ?? '',
    bankName: profile?.bankName ?? '',
    bankAccountNumber: profile?.bankAccountNumber ?? '',
    bankAccountHolder: profile?.bankAccountHolder ?? '',
    permanentAddress: profile?.permanentAddress ?? '',
    emergencyContactName: profile?.emergencyContactName ?? '',
    emergencyContactPhone: profile?.emergencyContactPhone ?? '',
    emergencyContactRel: profile?.emergencyContactRel ?? '',
    dependantCount: String(profile?.dependantCount ?? 0),
    educationLevel: profile?.educationLevel ?? '',
    educationMajor: profile?.educationMajor ?? '',
    university: profile?.university ?? '',
  });
  const inp = (label: string, key: keyof typeof f, type = 'text') => (
    <div>
      <label className="text-[11px] text-muted-foreground block mb-1">{label}</label>
      <input type={type} value={f[key]} onChange={e => setF(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
  return (
    <>
      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Thông tin cơ bản</p>
        <div className="grid grid-cols-2 gap-3">
          {inp('Ngày sinh', 'dateOfBirth', 'date')}
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Giới tính</label>
            <select value={f.gender} onChange={e => setF(p => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
              <option value="">-- Chọn --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
              <option value="UNDISCLOSED">Không tiết lộ</option>
            </select>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">Giấy tờ</p>
        <div className="grid grid-cols-2 gap-3">
          {inp('Số CCCD/CMND', 'nationalIdNumber')}
          {inp('Mã số thuế', 'taxCode')}
          {inp('Số BHXH', 'socialInsuranceNumber')}
          {inp('Số BHYT', 'healthInsuranceNumber')}
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">Ngân hàng</p>
        <div className="grid grid-cols-3 gap-3">
          {inp('Ngân hàng', 'bankName')}
          {inp('Số tài khoản', 'bankAccountNumber')}
          {inp('Chủ tài khoản', 'bankAccountHolder')}
        </div>
        {inp('Địa chỉ thường trú', 'permanentAddress')}
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">Liên hệ khẩn cấp</p>
        <div className="grid grid-cols-3 gap-3">
          {inp('Họ tên', 'emergencyContactName')}
          {inp('Số điện thoại', 'emergencyContactPhone')}
          {inp('Quan hệ', 'emergencyContactRel')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp('Số người phụ thuộc', 'dependantCount', 'number')}
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">Học vấn</p>
        <div className="grid grid-cols-3 gap-3">
          {inp('Trình độ', 'educationLevel')}
          {inp('Chuyên ngành', 'educationMajor')}
          {inp('Trường', 'university')}
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() => onSave({ ...f, dependantCount: parseInt(f.dependantCount) || 0, gender: f.gender || undefined })}
        label="Lưu hồ sơ"
        loading={saving}
      />
    </>
  );
}

function TerminateForm({ userName, onSave, saving, onCancel }: { userName: string; onSave: (r: string) => void; saving: boolean; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <>
      <div className="p-5 space-y-3">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div className="text-[12px] text-red-700 dark:text-red-400">
            Đang xử lý nghỉ việc cho <strong>{userName}</strong>. Hành động này sẽ:
            <ul className="list-disc ml-4 mt-1 space-y-0.5"><li>Đặt trạng thái TERMINATED</li><li>Vô hiệu hoá tài khoản</li></ul>
          </div>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">Lý do nghỉ việc *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="VD: Xin nghỉ theo nguyện vọng cá nhân..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() => { if (!reason.trim()) { toast.error('Vui lòng nhập lý do'); return; } onSave(reason.trim()); }}
        label="Xác nhận nghỉ việc"
        loading={saving}
        variant="danger"
      />
    </>
  );
}
