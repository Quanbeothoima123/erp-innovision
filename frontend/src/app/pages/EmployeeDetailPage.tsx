import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useEmployeeData } from '../context/EmployeeContext';
import {
  departments, getDepartmentById, getJobTitleById, getUserById, jobTitles, formatFullVND,
  getNextPayDate, getActiveCompensation, payFrequencyLabels, salaryTypeLabels, getPayDayLabel,
  workShifts, userWorkShifts as initialUserWorkShifts, getShiftById, getActiveWorkShift,
} from '../data/mockData';
import type {
  User, UserProfile, UserSalaryComponent, UserCompensation, EmploymentStatus, AccountStatus, Gender, AuthToken, PayFrequency,
  UserWorkShift,
} from '../data/mockData';
import {
  X, Building2, Mail, Phone, Calendar, Shield, User as UserIcon,
  Edit2, Lock, Unlock, UserX, KeyRound, DollarSign, Wallet, AlertTriangle,
  Check, ChevronRight, ChevronLeft, History, Plus, Ban, ScrollText, Clock,
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
const genderLabels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác', UNDISCLOSED: 'Không tiết lộ' };

const SALARY_COMPONENT_PRESETS = [
  { code: 'PC_DIEN_THOAI', name: 'Phụ cấp điện thoại' },
  { code: 'PC_AN_TRUA', name: 'Phụ cấp ăn trưa' },
  { code: 'PC_XANG_XE', name: 'Phụ cấp xăng xe' },
  { code: 'PC_CHUYEN_CAN', name: 'Phụ cấp chuyên cần' },
  { code: 'PC_NHA_O', name: 'Phụ cấp nhà ở' },
  { code: 'PC_TRACH_NHIEM', name: 'Phụ cấp trách nhiệm' },
  { code: 'PC_KHAC', name: 'Phụ cấp khác' },
];

const actionTypeColors: Record<string, string> = {
  CREATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UPDATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  STATUS_CHANGE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  TERMINATE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PASSWORD_RESET: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PROFILE_UPDATE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  COMPENSATION_ADD: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SALARY_COMPONENT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function EmployeeDetailPage() {
  const { id } = useParams();
  const { currentUser, can } = useAuth();
  const {
    allUsers, allProfiles, allCompensations, allSalaryComponents, allAuthTokens, allAuditLogs,
    updateUser, upsertProfile, addCompensation, addSalaryComponent, updateSalaryComponent,
    addAuthToken, addAuditLog,
  } = useEmployeeData();

  const [activeTab, setActiveTab] = useState('info');

  // Dialog states
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddCompensation, setShowAddCompensation] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showEditComponent, setShowEditComponent] = useState<UserSalaryComponent | null>(null);
  const [showTerminate, setShowTerminate] = useState(false);
  const [showLockAction, setShowLockAction] = useState<AccountStatus | null>(null);
  const [showAssignShift, setShowAssignShift] = useState(false);
  const [employeeWorkShifts, setEmployeeWorkShifts] = useState<UserWorkShift[]>(initialUserWorkShifts);

  const isAdminHR = can('ADMIN', 'HR');
  const isAdmin = can('ADMIN');

  const user = allUsers.find(u => u.id === id);
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-[14px] mb-4">Không tìm thấy nhân viên</p>
        <Link to="/employees" className="text-[13px] text-blue-600 hover:underline flex items-center gap-1"><ChevronLeft size={14} /> Quay lại danh sách</Link>
      </div>
    );
  }

  const profile = allProfiles.find(p => p.userId === user.id);
  const compensations = allCompensations.filter(c => c.userId === user.id).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const salaryComponents = allSalaryComponents.filter(c => c.userId === user.id);
  const manager = user.managerId ? getUserById(user.managerId) : null;
  const tokens = allAuthTokens.filter(t => t.userId === user.id);
  const userLogs = allAuditLogs.filter(l =>
    l.description.toLowerCase().includes(user.fullName.toLowerCase()) ||
    l.description.toLowerCase().includes(user.userCode.toLowerCase()) ||
    (l.entityType === 'USER' && l.actorUserId === user.id) ||
    (l.newValues && typeof l.newValues === 'object' && 'userId' in l.newValues && l.newValues.userId === user.id)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ─── Tabs ─────────────────────────────────────────────────
  const tabs = [
    { key: 'info', label: 'Thông tin', icon: <UserIcon size={14} /> },
    ...(isAdminHR || user.id === currentUser?.id ? [{ key: 'profile', label: 'Hồ sơ', icon: <Shield size={14} /> }] : []),
    ...(isAdminHR ? [
      { key: 'compensation', label: 'Lịch sử lương', icon: <DollarSign size={14} /> },
      { key: 'components', label: 'Phụ cấp', icon: <Wallet size={14} /> },
      { key: 'actions', label: 'Hành động', icon: <Lock size={14} /> },
      { key: 'work_shift', label: 'Ca làm việc', icon: <Clock size={14} /> },
      { key: 'audit', label: 'Nhật ký', icon: <ScrollText size={14} /> },
    ] : []),
  ];

  // ─── Handlers ─────────────────────────────────────────────
  const handleEditUser = (data: { fullName: string; phoneNumber: string; departmentId: string; jobTitleId: string; managerId: string; employmentStatus: EmploymentStatus }) => {
    const oldUser = { ...user };
    updateUser(user.id, {
      fullName: data.fullName, phoneNumber: data.phoneNumber,
      departmentId: data.departmentId, jobTitleId: data.jobTitleId,
      managerId: data.managerId || null, employmentStatus: data.employmentStatus,
    });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'UPDATE', description: `Cập nhật thông tin ${user.fullName} (${user.userCode})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: { fullName: oldUser.fullName, departmentId: oldUser.departmentId, jobTitleId: oldUser.jobTitleId, employmentStatus: oldUser.employmentStatus },
      newValues: { fullName: data.fullName, departmentId: data.departmentId, jobTitleId: data.jobTitleId, employmentStatus: data.employmentStatus },
    });
    setShowEditForm(false);
    toast.success('Đã cập nhật thông tin nhân viên');
  };

  const handleEditProfile = (data: Partial<UserProfile>) => {
    upsertProfile(user.id, data);
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'PROFILE_UPDATE', description: `Cập nhật hồ sơ cá nhân ${user.fullName} (${user.userCode})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      newValues: { userId: user.id, ...data },
    });
    setShowEditProfile(false);
    toast.success('Đã cập nhật hồ sơ cá nhân');
  };

  const handleAddCompensation = (data: {
    effectiveDate: string; baseSalary: number; reason: string;
    salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY'; payFrequency: PayFrequency;
    payDayOfMonth?: number; isProbation: boolean; probationSalary?: number; probationEndDate?: string;
  }) => {
    // Deactivate old compensations for this user
    const oldComps = allCompensations.filter(c => c.userId === user.id && c.isActive);
    oldComps.forEach(oc => {
      // We can't directly update, so we'll mark via the new comp being the active one
    });
    const comp: UserCompensation = {
      id: `uc-${Date.now()}`, userId: user.id, effectiveDate: data.effectiveDate,
      baseSalary: data.baseSalary, reason: data.reason, changeReason: data.reason,
      salaryType: data.salaryType, currency: 'VND',
      overtimeRateWeekday: 1.5, overtimeRateWeekend: 2.0, overtimeRateHoliday: 3.0,
      isActive: true, payFrequency: data.payFrequency,
      payDayOfMonth: data.payDayOfMonth,
      probationSalary: data.isProbation ? data.probationSalary : undefined,
      probationEndDate: data.isProbation ? data.probationEndDate : undefined,
      createdByUserId: currentUser!.id, createdAt: new Date().toISOString().slice(0, 10),
    };
    addCompensation(comp);
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'COMPENSATION_ADD', description: `Thêm kỳ lương ${formatFullVND(data.baseSalary)} cho ${user.fullName} (${user.userCode}) từ ${data.effectiveDate}`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      newValues: { userId: user.id, baseSalary: data.baseSalary, effectiveDate: data.effectiveDate, reason: data.reason },
    });
    setShowAddCompensation(false);
    toast.success('Đã thêm kỳ lương mới');
  };

  const handleAddComponent = (data: { componentCode: string; componentName: string; amount: number; effectiveDate: string; note: string }) => {
    addSalaryComponent({
      id: `usc-${Date.now()}`, userId: user.id, componentCode: data.componentCode,
      componentName: data.componentName, amount: data.amount, isActive: true,
      effectiveDate: data.effectiveDate, note: data.note || undefined,
    });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'SALARY_COMPONENT', description: `Thêm phụ cấp ${data.componentName} (${formatFullVND(data.amount)}) cho ${user.fullName} (${user.userCode})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      newValues: { userId: user.id, componentName: data.componentName, amount: data.amount },
    });
    setShowAddComponent(false);
    toast.success(`Đã thêm ${data.componentName}`);
  };

  const handleEditComponentSave = (scId: string, data: { amount: number; isActive: boolean; note: string }) => {
    const old = salaryComponents.find(s => s.id === scId);
    updateSalaryComponent(scId, { ...data, note: data.note || undefined });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'SALARY_COMPONENT', description: `Cập nhật phụ cấp ${old?.componentName} cho ${user.fullName} (${user.userCode})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: old ? { amount: old.amount, isActive: old.isActive } : undefined,
      newValues: { amount: data.amount, isActive: data.isActive },
    });
    setShowEditComponent(null);
    toast.success('Đã cập nhật phụ cấp');
  };

  const handleLockUnlock = (newStatus: AccountStatus) => {
    const oldStatus = user.accountStatus;
    updateUser(user.id, { accountStatus: newStatus });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'STATUS_CHANGE', description: `Đổi trạng thái tài khoản ${user.fullName} (${user.userCode}) từ ${accStatusLabels[oldStatus]} → ${accStatusLabels[newStatus]}`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: { accountStatus: oldStatus },
      newValues: { accountStatus: newStatus },
    });
    setShowLockAction(null);
    toast.success(`Đã chuyển trạng thái tài khoản sang ${accStatusLabels[newStatus]}`);
  };

  const handleTerminate = (reason: string) => {
    updateUser(user.id, { employmentStatus: 'TERMINATED' as EmploymentStatus, accountStatus: 'DISABLED' as AccountStatus });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'TERMINATE', description: `Xử lý nghỉ việc ${user.fullName} (${user.userCode}). Lý do: ${reason}`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      oldValues: { employmentStatus: user.employmentStatus, accountStatus: user.accountStatus },
      newValues: { employmentStatus: 'TERMINATED', accountStatus: 'DISABLED', terminationReason: reason, terminatedAt: new Date().toISOString() },
    });
    setShowTerminate(false);
    toast.success(`Đã xử lý nghỉ việc cho ${user.fullName}`);
  };

  const handleResetPassword = () => {
    const newToken: AuthToken = {
      id: `at-${Date.now()}`, userId: user.id, tokenType: 'PASSWORD_RESET',
      token: `reset-${Math.random().toString(36).slice(2, 10)}`,
      isUsed: false, expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(), createdByUserId: currentUser!.id,
    };
    addAuthToken(newToken);
    updateUser(user.id, { mustChangePassword: true });
    addAuditLog({
      id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'USER',
      actionType: 'PASSWORD_RESET', description: `Tạo token reset mật khẩu cho ${user.fullName} (${user.userCode})`,
      ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
      newValues: { userId: user.id, tokenType: 'PASSWORD_RESET' },
    });
    toast.success(`Token reset MK: ${newToken.token}`);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <Link to="/employees" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft size={14} /> Danh sách nhân viên</Link>
        <span className="text-muted-foreground">/</span>
        <span>{user.fullName}</span>
      </div>

      {/* Header Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-[22px] shrink-0">
            {user.fullName.split(' ').slice(-1)[0][0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px]">{user.fullName}</h1>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${empStatusColors[user.employmentStatus]}`}>{empStatusLabels[user.employmentStatus]}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${accStatusColors[user.accountStatus]}`}>{accStatusLabels[user.accountStatus]}</span>
            </div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {user.userCode} • {user.email} • {user.phoneNumber}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 size={12} /> {getDepartmentById(user.departmentId)?.name}</span>
              <span className="flex items-center gap-1"><UserIcon size={12} /> {getJobTitleById(user.jobTitleId)?.name}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> Vào {user.hireDate}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.roles.map(r => (
                <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-2.5 text-[13px] border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-5">
        {/* ─── INFO TAB ─── */}
        {activeTab === 'info' && (
          <div>
            {isAdminHR && (
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowEditForm(true)} className="text-[12px] text-blue-600 flex items-center gap-1 hover:underline"><Edit2 size={12} /> Chỉnh sửa</button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
              <InfoRow icon={<Phone size={14} />} label="Điện thoại" value={user.phoneNumber} />
              <InfoRow icon={<Building2 size={14} />} label="Phòng ban" value={getDepartmentById(user.departmentId)?.name} />
              <InfoRow icon={<UserIcon size={14} />} label="Chức danh" value={getJobTitleById(user.jobTitleId)?.name} />
              <InfoRow icon={<UserIcon size={14} />} label="Quản lý trực tiếp" value={manager?.fullName || '—'} />
              <InfoRow icon={<Calendar size={14} />} label="Ngày vào làm" value={user.hireDate} />
              <InfoRow icon={<Shield size={14} />} label="Vai trò" value={user.roles.join(', ')} />
              <InfoRow label="Trạng thái NV" value={empStatusLabels[user.employmentStatus]} />
              <InfoRow label="Trạng thái TK" value={accStatusLabels[user.accountStatus]} />
              <InfoRow label="Đăng nhập cuối" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('vi-VN') : '—'} />
              <InfoRow label="Đổi MK bắt buộc" value={user.mustChangePassword ? 'Có' : 'Không'} />
              <InfoRow label="Ngày tạo" value={user.createdAt} />
            </div>
          </div>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <div>
            {isAdminHR && (
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowEditProfile(true)} className="text-[12px] text-blue-600 flex items-center gap-1 hover:underline"><Edit2 size={12} /> Chỉnh sửa hồ sơ</button>
              </div>
            )}
            {profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoRow label="Ngày sinh" value={profile.dateOfBirth || '—'} />
                <InfoRow label="Giới tính" value={profile.gender ? genderLabels[profile.gender] : '—'} />
                <InfoRow label="Số CCCD" value={profile.nationalIdNumber || '—'} />
                <InfoRow label="Mã số thuế" value={profile.taxCode || '—'} />
                <InfoRow label="Số BHXH" value={profile.socialInsuranceNumber || '—'} />
                <InfoRow label="Số BHYT" value={profile.healthInsuranceNumber || '—'} />
                <InfoRow label="Ngân hàng" value={profile.bankName ? `${profile.bankName} - ${profile.bankAccountNumber}` : '—'} />
                <InfoRow label="Chủ tài khoản" value={profile.bankAccountHolder || '—'} />
                <InfoRow label="Địa chỉ thường trú" value={profile.permanentAddress || '—'} />
                <InfoRow label="Liên hệ khẩn cấp" value={profile.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactRel}) - ${profile.emergencyContactPhone}` : '—'} />
                <InfoRow label="Số người phụ thuộc" value={String(profile.dependantCount)} />
                <InfoRow label="Trình độ" value={profile.educationLevel || '—'} />
                <InfoRow label="Chuyên ngành" value={profile.educationMajor || '—'} />
                <InfoRow label="Trường" value={profile.university || '—'} />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-[13px] mb-3">Chưa có hồ sơ chi tiết</p>
                {isAdminHR && <button onClick={() => setShowEditProfile(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px]">Tạo hồ sơ</button>}
              </div>
            )}
          </div>
        )}

        {/* ─── COMPENSATION TAB ─── */}
        {activeTab === 'compensation' && (() => {
          const activeComp = compensations.find(c => c.isActive) || compensations[0];
          const nextPay = activeComp ? getNextPayDate(user.id) : null;
          const isProbation = user.employmentStatus === 'PROBATION';
          return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] flex items-center gap-2"><History size={16} /> Lịch sử lương</h3>
              <button onClick={() => setShowAddCompensation(true)} className="text-[12px] px-3 py-1.5 bg-blue-600 text-white rounded-lg flex items-center gap-1"><Plus size={14} /> Thêm kỳ lương</button>
            </div>

            {/* Summary Card */}
            {activeComp && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                <div className="text-[13px] text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-1"><DollarSign size={14} /> Lương hiện tại</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Lương cơ bản</div>
                    <div className="text-[16px]">{formatFullVND(activeComp.baseSalary)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Loại lương</div>
                    <div className="text-[14px]">{salaryTypeLabels[activeComp.salaryType] || activeComp.salaryType}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Chu kỳ trả lương</div>
                    <div className="text-[14px]">{payFrequencyLabels[activeComp.payFrequency]}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Ngày trả lương</div>
                    <div className="text-[14px]">{getPayDayLabel(activeComp)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Ngày trả tiếp theo</div>
                    <div className="text-[14px]">{nextPay ? new Date(nextPay).toLocaleDateString('vi-VN') : 'Theo lịch công ty'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Hiệu lực từ</div>
                    <div className="text-[14px]">{new Date(activeComp.effectiveDate).toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>
                {isProbation && activeComp.probationSalary && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 flex flex-wrap items-center gap-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Thử việc</span>
                    <span className="text-[13px]">Lương thử việc: <strong>{formatFullVND(activeComp.probationSalary)}</strong></span>
                    {activeComp.probationEndDate && (
                      <span className="text-[12px] text-muted-foreground">Hết thử việc: {new Date(activeComp.probationEndDate).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {compensations.length > 0 ? (
              <div className="space-y-2">
                {compensations.map((comp, idx) => (
                  <div key={comp.id} className={`flex items-center gap-3 p-4 rounded-lg border ${comp.isActive ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-border'}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${comp.isActive ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}><DollarSign size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px]">{formatFullVND(comp.baseSalary)}</span>
                        {comp.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Hiện tại</span>}
                      </div>
                      <div className="text-[12px] text-muted-foreground">{comp.changeReason || comp.reason}</div>
                      {comp.payDayOfMonth != null && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">Trả ngày {comp.payDayOfMonth} hàng tháng</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px]">Từ {comp.effectiveDate}</div>
                      <div className="text-[11px] text-muted-foreground">Bởi {getUserById(comp.createdByUserId)?.fullName || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[13px]">Chưa có lịch sử lương</div>
            )}
          </div>
          );
        })()}

        {/* ─── SALARY COMPONENTS TAB ─── */}
        {activeTab === 'components' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] flex items-center gap-2"><Wallet size={16} /> Phụ cấp cá nhân</h3>
              <button onClick={() => setShowAddComponent(true)} className="text-[12px] px-3 py-1.5 bg-blue-600 text-white rounded-lg flex items-center gap-1"><Plus size={14} /> Thêm phụ cấp</button>
            </div>
            {salaryComponents.length > 0 ? (
              <div className="space-y-2">
                {salaryComponents.map(sc => (
                  <div key={sc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setShowEditComponent(sc)}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px]">{sc.componentName}</div>
                      <div className="text-[11px] text-muted-foreground">{sc.componentCode} • Từ {sc.effectiveDate}{sc.note ? ` • ${sc.note}` : ''}</div>
                    </div>
                    <div className="text-[13px]">{formatFullVND(sc.amount)}</div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                ))}
                <div className="pt-3 border-t border-border flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Tổng phụ cấp (đang hoạt động)</span>
                  <span>{formatFullVND(salaryComponents.filter(s => s.isActive).reduce((sum, s) => sum + s.amount, 0))}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[13px]">Chưa có phụ cấp nào</div>
            )}
          </div>
        )}

        {/* ─── ACTIONS TAB ─── */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            {/* Lock / Unlock / Disable */}
            <div className="bg-muted/50 rounded-xl p-5">
              <h3 className="text-[14px] flex items-center gap-2 mb-3"><Lock size={16} /> Quản lý tài khoản</h3>
              <p className="text-[12px] text-muted-foreground mb-3">Trạng thái hiện tại: <span className={`px-2 py-0.5 rounded-full ${accStatusColors[user.accountStatus]}`}>{accStatusLabels[user.accountStatus]}</span></p>
              <div className="flex flex-wrap gap-2">
                {user.accountStatus !== 'ACTIVE' && (
                  <button onClick={() => setShowLockAction('ACTIVE')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-[12px] flex items-center gap-1"><Unlock size={14} /> Mở khoá (ACTIVE)</button>
                )}
                {user.accountStatus !== 'LOCKED' && user.accountStatus !== 'DISABLED' && (
                  <button onClick={() => setShowLockAction('LOCKED')} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1"><Lock size={14} /> Khoá tài khoản</button>
                )}
                {user.accountStatus !== 'DISABLED' && (
                  <button onClick={() => setShowLockAction('DISABLED')} className="px-3 py-2 bg-gray-600 text-white rounded-lg text-[12px] flex items-center gap-1"><Ban size={14} /> Vô hiệu hoá</button>
                )}
              </div>
            </div>
            {/* Terminate */}
            {user.employmentStatus !== 'TERMINATED' && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5">
                <h3 className="text-[14px] flex items-center gap-2 mb-2 text-red-700 dark:text-red-400"><UserX size={16} /> Xử lý nghỉ việc</h3>
                <p className="text-[12px] text-muted-foreground mb-3">Đánh dấu nhân viên đã nghỉ việc. Đặt trạng thái TERMINATED và vô hiệu hoá tài khoản.</p>
                <button onClick={() => setShowTerminate(true)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1"><UserX size={14} /> Nghỉ việc</button>
              </div>
            )}
            {/* Reset Password */}
            {isAdmin && (
              <div className="bg-muted/50 rounded-xl p-5">
                <h3 className="text-[14px] flex items-center gap-2 mb-2"><KeyRound size={16} /> Reset mật khẩu</h3>
                <p className="text-[12px] text-muted-foreground mb-3">Tạo AuthToken PASSWORD_RESET. Token hết hạn sau 24 giờ.</p>
                <button onClick={handleResetPassword} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-[12px] flex items-center gap-1"><KeyRound size={14} /> Tạo token reset MK</button>
                {tokens.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground">Token hiện có:</p>
                    {tokens.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-[11px] bg-background p-2 rounded border border-border">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.tokenType === 'ACCOUNT_SETUP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{t.tokenType}</span>
                        <code className="flex-1 font-mono text-[11px]">{t.token}</code>
                        <span className={t.isUsed ? 'text-green-600' : 'text-yellow-600'}>{t.isUsed ? 'Đã dùng' : 'Chưa dùng'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── WORK SHIFT TAB ─── */}
        {activeTab === 'work_shift' && (() => {
          const dayOfWeekLabels: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật' };
          const empShifts = employeeWorkShifts.filter(s => s.userId === user.id);
          const activeShift = empShifts.find(s => s.isActive);
          const shiftInfo = activeShift ? getShiftById(activeShift.shiftId) : null;

          return (
            <div className="space-y-6">
              {/* Current shift card */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] flex items-center gap-2"><Clock size={16} /> Ca làm việc hiện tại</h3>
                  <button onClick={() => setShowAssignShift(true)} className="text-[12px] px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                    <Plus size={12} /> {activeShift ? 'Đổi ca' : 'Gán ca làm việc'}
                  </button>
                </div>
                {activeShift && shiftInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span className="text-[11px] text-muted-foreground">Tên ca</span><p className="text-[13px] mt-0.5">{shiftInfo.name}</p></div>
                    <div><span className="text-[11px] text-muted-foreground">Giờ</span><p className="text-[13px] mt-0.5">{shiftInfo.startTime} → {shiftInfo.endTime} | Nghỉ giữa ca: {shiftInfo.breakMinutes} phút</p></div>
                    <div><span className="text-[11px] text-muted-foreground">Áp dụng</span><p className="text-[13px] mt-0.5">{activeShift.dayOfWeek ? dayOfWeekLabels[activeShift.dayOfWeek] : 'Tất cả ngày trong tuần'}</p></div>
                    <div><span className="text-[11px] text-muted-foreground">Hiệu lực từ</span><p className="text-[13px] mt-0.5">{new Date(activeShift.effectiveFrom).toLocaleDateString('vi-VN')}</p></div>
                    {activeShift.notes && <div className="sm:col-span-2"><span className="text-[11px] text-muted-foreground">Ghi chú</span><p className="text-[13px] mt-0.5">{activeShift.notes}</p></div>}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-[13px] text-muted-foreground">Nhân viên này chưa được gán ca làm việc</p>
                  </div>
                )}
              </div>

              {/* Shift history table */}
              {empShifts.length > 0 && (
                <div>
                  <h3 className="text-[14px] flex items-center gap-2 mb-3"><History size={16} /> Lịch sử ca làm việc</h3>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-[13px]">
                      <thead><tr className="bg-muted/50 text-muted-foreground text-[11px]">
                        <th className="px-4 py-2.5 text-left">Tên ca</th>
                        <th className="px-4 py-2.5 text-left">Áp dụng ngày</th>
                        <th className="px-4 py-2.5 text-left">Từ ngày</th>
                        <th className="px-4 py-2.5 text-left">Đến ngày</th>
                        <th className="px-4 py-2.5 text-left">Trạng thái</th>
                      </tr></thead>
                      <tbody>
                        {empShifts.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(ws => {
                          const si = getShiftById(ws.shiftId);
                          return (
                            <tr key={ws.id} className="border-t border-border">
                              <td className="px-4 py-3">{si?.name || '—'} ({si?.startTime}–{si?.endTime})</td>
                              <td className="px-4 py-3">{ws.dayOfWeek ? dayOfWeekLabels[ws.dayOfWeek] : 'Tất cả'}</td>
                              <td className="px-4 py-3">{new Date(ws.effectiveFrom).toLocaleDateString('vi-VN')}</td>
                              <td className="px-4 py-3">{ws.effectiveTo ? new Date(ws.effectiveTo).toLocaleDateString('vi-VN') : '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${ws.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                  {ws.isActive ? 'Đang áp dụng' : 'Kết thúc'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── AUDIT LOG TAB ─── */}
        {activeTab === 'audit' && (
          <div>
            <h3 className="text-[14px] flex items-center gap-2 mb-4"><ScrollText size={16} /> Nhật ký hoạt động liên quan</h3>
            {userLogs.length > 0 ? (
              <div className="space-y-2">
                {userLogs.map(log => {
                  const actor = getUserById(log.actorUserId);
                  return (
                    <div key={log.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] shrink-0 mt-0.5">{actor?.fullName?.split(' ').slice(-1)[0][0] || '?'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px]">{actor?.fullName || '—'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${actionTypeColors[log.actionType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{log.actionType}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{log.entityType}</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-0.5">{log.description}</p>
                          {(log.oldValues || log.newValues) && (
                            <div className="mt-2 flex gap-3 flex-wrap">
                              {log.oldValues && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded p-2 text-[10px] flex-1 min-w-[140px]">
                                  <div className="text-red-500 mb-0.5">Giá trị cũ</div>
                                  <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(log.oldValues, null, 1)}</pre>
                                </div>
                              )}
                              {log.newValues && (
                                <div className="bg-green-50 dark:bg-green-900/10 rounded p-2 text-[10px] flex-1 min-w-[140px]">
                                  <div className="text-green-500 mb-0.5">Giá trị mới</div>
                                  <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(log.newValues, null, 1)}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground shrink-0 text-right">
                          <div>{new Date(log.createdAt).toLocaleDateString('vi-VN')}</div>
                          <div>{new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-[10px]">{log.ipAddress}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[13px]">Chưa có nhật ký nào liên quan</div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Dialogs ═══ */}
      {showEditForm && <EditUserDialog user={user} allUsers={allUsers} onSave={handleEditUser} onClose={() => setShowEditForm(false)} />}
      {showEditProfile && <EditProfileDialog profile={profile} onSave={handleEditProfile} onClose={() => setShowEditProfile(false)} />}
      {showAddCompensation && <AddCompensationDialog currentSalary={compensations[0]?.baseSalary} onSave={handleAddCompensation} onClose={() => setShowAddCompensation(false)} />}
      {showAddComponent && <AddComponentDialog existingCodes={salaryComponents.map(s => s.componentCode)} onSave={handleAddComponent} onClose={() => setShowAddComponent(false)} />}
      {showEditComponent && <EditComponentDialog component={showEditComponent} onSave={handleEditComponentSave} onClose={() => setShowEditComponent(null)} />}
      {showLockAction && (
        <ConfirmDialog
          title={`Xác nhận ${showLockAction === 'ACTIVE' ? 'mở khoá' : showLockAction === 'LOCKED' ? 'khoá' : 'vô hiệu hoá'} tài khoản`}
          message={`Bạn có chắc muốn chuyển trạng thái tài khoản của ${user.fullName} sang ${accStatusLabels[showLockAction]}?`}
          confirmLabel="Xác nhận" variant={showLockAction === 'ACTIVE' ? 'primary' : 'danger'}
          onConfirm={() => handleLockUnlock(showLockAction)} onClose={() => setShowLockAction(null)}
        />
      )}
      {showTerminate && <TerminateDialog userName={user.fullName} onConfirm={handleTerminate} onClose={() => setShowTerminate(false)} />}
      {showAssignShift && (
        <AssignShiftDialog
          onSave={(data) => {
            // Deactivate current active shift
            setEmployeeWorkShifts(prev => {
              const updated = prev.map(s => {
                if (s.userId === user.id && s.isActive) {
                  const effectiveTo = new Date(data.effectiveFrom);
                  effectiveTo.setDate(effectiveTo.getDate() - 1);
                  return { ...s, isActive: false, effectiveTo: effectiveTo.toISOString().slice(0, 10) };
                }
                return s;
              });
              const newShift: UserWorkShift = {
                id: `uws-${Date.now()}`,
                userId: user.id,
                shiftId: data.shiftId,
                dayOfWeek: data.dayOfWeek,
                effectiveFrom: data.effectiveFrom,
                effectiveTo: null,
                isActive: true,
                notes: data.notes || undefined,
                createdAt: new Date().toISOString(),
              };
              return [...updated, newShift];
            });
            addAuditLog({
              id: `al-${Date.now()}`, actorUserId: currentUser!.id, entityType: 'WORK_SHIFT',
              actionType: 'ASSIGN', description: `Gán ca làm việc cho ${user.fullName} (${user.userCode})`,
              ipAddress: '192.168.1.100', createdAt: new Date().toISOString(),
              newValues: { userId: user.id, shiftId: data.shiftId, effectiveFrom: data.effectiveFrom },
            });
            setShowAssignShift(false);
            toast.success('Đã gán ca làm việc thành công');
          }}
          onClose={() => setShowAssignShift(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS (dialogs & helpers)
// ═══════════════════════════════════════════════════════════════

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>{children}</div>
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

function DlgFooter({ onCancel, onConfirm, label, variant = 'primary' }: { onCancel: () => void; onConfirm: () => void; label: string; variant?: 'primary' | 'danger' }) {
  return (
    <div className="flex justify-end gap-2 p-4 border-t border-border">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
      <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg text-[13px] ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{label}</button>
    </div>
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

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5">{icon}{label}</div>
      <div className="text-[13px]">{value || '—'}</div>
    </div>
  );
}

// ─── Edit User Dialog ───
function EditUserDialog({ user, allUsers, onSave, onClose }: {
  user: User; allUsers: User[];
  onSave: (d: { fullName: string; phoneNumber: string; departmentId: string; jobTitleId: string; managerId: string; employmentStatus: EmploymentStatus }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({ fullName: user.fullName, phoneNumber: user.phoneNumber, departmentId: user.departmentId, jobTitleId: user.jobTitleId, managerId: user.managerId || '', employmentStatus: user.employmentStatus });
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Cập nhật thông tin nhân viên" onClose={onClose} />
      <div className="p-4 space-y-3">
        <Field label="Họ tên *" value={f.fullName} onChange={v => setF(p => ({ ...p, fullName: v }))} />
        <Field label="Số điện thoại" value={f.phoneNumber} onChange={v => setF(p => ({ ...p, phoneNumber: v }))} />
        <Sel label="Phòng ban *" value={f.departmentId} onChange={v => setF(p => ({ ...p, departmentId: v }))} options={departments.filter(d => d.isActive).map(d => ({ value: d.id, label: d.name }))} />
        <Sel label="Chức danh *" value={f.jobTitleId} onChange={v => setF(p => ({ ...p, jobTitleId: v }))} options={jobTitles.filter(j => j.isActive).map(j => ({ value: j.id, label: j.name }))} />
        <Sel label="Quản lý" value={f.managerId} onChange={v => setF(p => ({ ...p, managerId: v }))} options={allUsers.filter(u => u.accountStatus === 'ACTIVE' && u.id !== user.id).map(u => ({ value: u.id, label: `${u.fullName} (${u.userCode})` }))} placeholder="-- Không chọn --" />
        <Sel label="Trạng thái NV" value={f.employmentStatus} onChange={v => setF(p => ({ ...p, employmentStatus: v as EmploymentStatus }))} options={[{ value: 'PROBATION', label: 'Thử việc' }, { value: 'ACTIVE', label: 'Chính thức' }, { value: 'ON_LEAVE', label: 'Nghỉ phép' }]} />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => { if (!f.fullName || !f.departmentId || !f.jobTitleId) { toast.error('Vui lòng điền đầy đủ'); return; } onSave(f); }} label="Lưu thay đổi" />
    </Overlay>
  );
}

// ─── Edit Profile Dialog ───
function EditProfileDialog({ profile, onSave, onClose }: { profile: UserProfile | null | undefined; onSave: (d: Partial<UserProfile>) => void; onClose: () => void }) {
  const [f, setF] = useState({
    dateOfBirth: profile?.dateOfBirth || '', gender: (profile?.gender || '') as Gender | '',
    nationalIdNumber: profile?.nationalIdNumber || '', taxCode: profile?.taxCode || '',
    socialInsuranceNumber: profile?.socialInsuranceNumber || '', healthInsuranceNumber: profile?.healthInsuranceNumber || '',
    bankName: profile?.bankName || '', bankAccountNumber: profile?.bankAccountNumber || '', bankAccountHolder: profile?.bankAccountHolder || '',
    permanentAddress: profile?.permanentAddress || '',
    emergencyContactName: profile?.emergencyContactName || '', emergencyContactPhone: profile?.emergencyContactPhone || '', emergencyContactRel: profile?.emergencyContactRel || '',
    dependantCount: String(profile?.dependantCount ?? 0),
    educationLevel: profile?.educationLevel || '', educationMajor: profile?.educationMajor || '', university: profile?.university || '',
  });
  return (
    <Overlay onClose={onClose} wide>
      <DlgHeader title="Chỉnh sửa hồ sơ cá nhân" onClose={onClose} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày sinh" value={f.dateOfBirth} onChange={v => setF(p => ({ ...p, dateOfBirth: v }))} type="date" />
          <Sel label="Giới tính" value={f.gender} onChange={v => setF(p => ({ ...p, gender: v as Gender }))} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} placeholder="-- Chọn --" />
        </div>
        <h4 className="text-[13px] text-muted-foreground pt-2">Giấy tờ</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số CCCD" value={f.nationalIdNumber} onChange={v => setF(p => ({ ...p, nationalIdNumber: v }))} />
          <Field label="Mã số thuế" value={f.taxCode} onChange={v => setF(p => ({ ...p, taxCode: v }))} />
          <Field label="Số BHXH" value={f.socialInsuranceNumber} onChange={v => setF(p => ({ ...p, socialInsuranceNumber: v }))} />
          <Field label="Số BHYT" value={f.healthInsuranceNumber} onChange={v => setF(p => ({ ...p, healthInsuranceNumber: v }))} />
        </div>
        <h4 className="text-[13px] text-muted-foreground pt-2">Ngân hàng</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Ngân hàng" value={f.bankName} onChange={v => setF(p => ({ ...p, bankName: v }))} />
          <Field label="Số tài khoản" value={f.bankAccountNumber} onChange={v => setF(p => ({ ...p, bankAccountNumber: v }))} />
          <Field label="Chủ tài khoản" value={f.bankAccountHolder} onChange={v => setF(p => ({ ...p, bankAccountHolder: v }))} />
        </div>
        <Field label="Địa chỉ thường trú" value={f.permanentAddress} onChange={v => setF(p => ({ ...p, permanentAddress: v }))} />
        <h4 className="text-[13px] text-muted-foreground pt-2">Liên hệ khẩn cấp</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Họ tên" value={f.emergencyContactName} onChange={v => setF(p => ({ ...p, emergencyContactName: v }))} />
          <Field label="Số điện thoại" value={f.emergencyContactPhone} onChange={v => setF(p => ({ ...p, emergencyContactPhone: v }))} />
          <Field label="Quan hệ" value={f.emergencyContactRel} onChange={v => setF(p => ({ ...p, emergencyContactRel: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số người phụ thuộc" value={f.dependantCount} onChange={v => setF(p => ({ ...p, dependantCount: v }))} type="number" />
        </div>
        <h4 className="text-[13px] text-muted-foreground pt-2">Học vấn</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Trình độ" value={f.educationLevel} onChange={v => setF(p => ({ ...p, educationLevel: v }))} placeholder="VD: Đại học" />
          <Field label="Chuyên ngành" value={f.educationMajor} onChange={v => setF(p => ({ ...p, educationMajor: v }))} />
          <Field label="Trường" value={f.university} onChange={v => setF(p => ({ ...p, university: v }))} />
        </div>
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => onSave({ ...f, gender: (f.gender || undefined) as Gender | undefined, dependantCount: parseInt(f.dependantCount) || 0 })} label="Lưu hồ sơ" />
    </Overlay>
  );
}

// ─── Add Compensation Dialog ───
function AddCompensationDialog({ currentSalary, onSave, onClose }: {
  currentSalary?: number;
  onSave: (d: {
    effectiveDate: string; baseSalary: number; reason: string;
    salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY'; payFrequency: PayFrequency;
    payDayOfMonth?: number; isProbation: boolean; probationSalary?: number; probationEndDate?: string;
  }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    effectiveDate: '', baseSalary: '', reason: '',
    salaryType: 'MONTHLY' as 'MONTHLY' | 'DAILY' | 'HOURLY',
    payFrequency: 'MONTHLY' as PayFrequency,
    payDayOfMonth: '10',
    isProbation: false,
    probationSalary: '',
    probationEndDate: '',
  });
  const showPayDay = f.payFrequency === 'MONTHLY' || f.payFrequency === 'BIWEEKLY';
  const baseSalaryNum = parseFloat(f.baseSalary) || 0;

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Thêm kỳ lương mới" onClose={onClose} />
      <div className="p-4 space-y-3">
        {currentSalary != null && currentSalary > 0 && <div className="bg-muted/50 rounded-lg p-3 text-[13px]">Lương hiện tại: <span className="text-blue-600">{formatFullVND(currentSalary)}</span></div>}
        <Field label="Mức lương mới (VNĐ) *" value={f.baseSalary} onChange={v => setF(p => ({ ...p, baseSalary: v }))} type="number" placeholder="VD: 25000000" />
        {baseSalaryNum > 0 && <div className="text-[12px] text-blue-600 -mt-2 pl-1">{formatFullVND(baseSalaryNum)}</div>}
        <Field label="Ngày hiệu lực *" value={f.effectiveDate} onChange={v => setF(p => ({ ...p, effectiveDate: v }))} type="date" />
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Lý do thay đổi *</label>
          <textarea value={f.reason} onChange={e => setF(p => ({ ...p, reason: e.target.value }))} rows={2} placeholder="VD: Tăng lương định kỳ..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
        </div>
        <Sel label="Loại lương" value={f.salaryType} onChange={v => setF(p => ({ ...p, salaryType: v as typeof f.salaryType }))} options={[{ value: 'MONTHLY', label: 'Tháng' }, { value: 'DAILY', label: 'Ngày' }, { value: 'HOURLY', label: 'Giờ' }]} />
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Chu kỳ trả lương</label>
          <div className="flex gap-3">
            {(['MONTHLY', 'BIWEEKLY', 'WEEKLY'] as PayFrequency[]).map(pf => (
              <label key={pf} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                <input type="radio" name="payFrequency" checked={f.payFrequency === pf} onChange={() => setF(p => ({ ...p, payFrequency: pf }))} className="accent-blue-600" />
                {payFrequencyLabels[pf]}
              </label>
            ))}
          </div>
        </div>
        {showPayDay && (
          <Field label="Ngày trả lương trong tháng (1–31)" value={f.payDayOfMonth} onChange={v => setF(p => ({ ...p, payDayOfMonth: v }))} type="number" placeholder="10" />
        )}
        <div className="flex items-center gap-2 pt-1">
          <input type="checkbox" id="isProbation" checked={f.isProbation} onChange={e => {
            const checked = e.target.checked;
            setF(p => ({
              ...p, isProbation: checked,
              probationSalary: checked && baseSalaryNum > 0 ? String(Math.round(baseSalaryNum * 0.85)) : '',
            }));
          }} className="accent-blue-600" />
          <label htmlFor="isProbation" className="text-[13px] cursor-pointer">Đây là lương thử việc?</label>
        </div>
        {f.isProbation && (
          <div className="pl-5 space-y-3 border-l-2 border-yellow-300 dark:border-yellow-700">
            <Field label="Lương thử việc (VNĐ)" value={f.probationSalary} onChange={v => setF(p => ({ ...p, probationSalary: v }))} type="number" placeholder="VD: 85% lương chính thức" />
            <Field label="Ngày hết thử việc" value={f.probationEndDate} onChange={v => setF(p => ({ ...p, probationEndDate: v }))} type="date" />
          </div>
        )}
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => {
        const s = parseFloat(f.baseSalary);
        if (!f.effectiveDate || !s || !f.reason.trim()) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
        const payDay = showPayDay ? parseInt(f.payDayOfMonth) || undefined : undefined;
        onSave({
          effectiveDate: f.effectiveDate, baseSalary: s, reason: f.reason.trim(),
          salaryType: f.salaryType, payFrequency: f.payFrequency,
          payDayOfMonth: payDay,
          isProbation: f.isProbation,
          probationSalary: f.isProbation ? (parseFloat(f.probationSalary) || undefined) : undefined,
          probationEndDate: f.isProbation ? (f.probationEndDate || undefined) : undefined,
        });
      }} label="Thêm kỳ lương" />
    </Overlay>
  );
}

// ─── Add Salary Component Dialog ───
function AddComponentDialog({ existingCodes, onSave, onClose }: { existingCodes: string[]; onSave: (d: { componentCode: string; componentName: string; amount: number; effectiveDate: string; note: string }) => void; onClose: () => void }) {
  const [f, setF] = useState({ componentCode: '', amount: '', effectiveDate: new Date().toISOString().slice(0, 10), note: '' });
  const avail = SALARY_COMPONENT_PRESETS.filter(p => !existingCodes.includes(p.code));
  const preset = SALARY_COMPONENT_PRESETS.find(p => p.code === f.componentCode);
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Thêm phụ cấp cá nhân" onClose={onClose} />
      <div className="p-4 space-y-3">
        <Sel label="Loại phụ cấp *" value={f.componentCode} onChange={v => setF(p => ({ ...p, componentCode: v }))} options={avail.map(p => ({ value: p.code, label: p.name }))} placeholder="-- Chọn loại --" />
        <Field label="Số tiền (VNĐ/tháng) *" value={f.amount} onChange={v => setF(p => ({ ...p, amount: v }))} type="number" placeholder="VD: 730000" />
        <Field label="Ngày hiệu lực *" value={f.effectiveDate} onChange={v => setF(p => ({ ...p, effectiveDate: v }))} type="date" />
        <Field label="Ghi chú" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => { const a = parseFloat(f.amount); if (!f.componentCode || !a || !f.effectiveDate) { toast.error('Vui lòng điền đầy đủ'); return; } onSave({ componentCode: f.componentCode, componentName: preset?.name || f.componentCode, amount: a, effectiveDate: f.effectiveDate, note: f.note }); }} label="Thêm phụ cấp" />
    </Overlay>
  );
}

// ─── Edit Salary Component Dialog ───
function EditComponentDialog({ component, onSave, onClose }: { component: UserSalaryComponent; onSave: (id: string, d: { amount: number; isActive: boolean; note: string }) => void; onClose: () => void }) {
  const [f, setF] = useState({ amount: String(component.amount), isActive: component.isActive, note: component.note || '' });
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={`Sửa: ${component.componentName}`} onClose={onClose} />
      <div className="p-4 space-y-3">
        <div className="bg-muted/50 rounded-lg p-3 text-[13px]"><span className="text-muted-foreground">Mã:</span> {component.componentCode} • <span className="text-muted-foreground">Từ:</span> {component.effectiveDate}</div>
        <Field label="Số tiền (VNĐ/tháng) *" value={f.amount} onChange={v => setF(p => ({ ...p, amount: v }))} type="number" />
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-muted-foreground">Trạng thái:</label>
          <button onClick={() => setF(p => ({ ...p, isActive: !p.isActive }))} className={`px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1 ${f.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
            {f.isActive ? <><Check size={12} /> Đang hoạt động</> : <><X size={12} /> Đã ngưng</>}
          </button>
        </div>
        <Field label="Ghi chú" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => { const a = parseFloat(f.amount); if (!a) { toast.error('Số tiền không hợp lệ'); return; } onSave(component.id, { amount: a, isActive: f.isActive, note: f.note }); }} label="Lưu thay đổi" />
    </Overlay>
  );
}

// ─── Terminate Dialog ───
function TerminateDialog({ userName, onConfirm, onClose }: { userName: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Xử lý nghỉ việc" onClose={onClose} />
      <div className="p-4 space-y-3">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="text-[13px] text-red-700 dark:text-red-400">
            Bạn đang xử lý nghỉ việc cho <strong>{userName}</strong>. Hành động này sẽ:
            <ul className="list-disc ml-4 mt-1 space-y-0.5 text-[12px]"><li>Đặt trạng thái thành TERMINATED</li><li>Vô hiệu hoá tài khoản (DISABLED)</li></ul>
          </div>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Lý do nghỉ việc *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="VD: Xin nghỉ theo nguyện vọng cá nhân..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
        </div>
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => { if (!reason.trim()) { toast.error('Vui lòng nhập lý do'); return; } onConfirm(reason); }} label="Xác nhận nghỉ việc" variant="danger" />
    </Overlay>
  );
}

// ─── Assign Shift Dialog ───
function AssignShiftDialog({ onSave, onClose }: { onSave: (data: { shiftId: string; dayOfWeek: number | null; effectiveFrom: string; notes: string }) => void; onClose: () => void }) {
  const [shiftId, setShiftId] = useState('ws-1');
  const [dayMode, setDayMode] = useState<'all' | 'specific'>('all');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  const dayLabels = [
    { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
    { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' }, { value: 7, label: 'CN' },
  ];

  const handleSubmit = () => {
    if (!confirmStep) { setConfirmStep(true); return; }
    onSave({ shiftId, dayOfWeek: dayMode === 'all' ? null : (selectedDays[0] || null), effectiveFrom, notes });
  };

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Gán / Đổi ca làm việc" onClose={onClose} />
      <div className="p-4 space-y-4">
        {confirmStep ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] text-yellow-800 dark:text-yellow-400">Bạn có chắc muốn đổi ca làm việc?</p>
                <p className="text-[12px] text-yellow-600 dark:text-yellow-500 mt-1">Ca cũ sẽ bị kết thúc, ca mới sẽ có hiệu lực từ {new Date(effectiveFrom).toLocaleDateString('vi-VN')}.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Sel label="Ca làm việc" value={shiftId} onChange={setShiftId} options={workShifts.map(s => ({ value: s.id, label: `${s.name} — ${s.startTime}→${s.endTime}` }))} />
            <div>
              <label className="block text-[12px] text-muted-foreground mb-2">Áp dụng ngày</label>
              <div className="flex gap-3">
                <button onClick={() => setDayMode('all')} className={`px-3 py-1.5 rounded-lg text-[12px] border ${dayMode === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-border text-muted-foreground'}`}>Tất cả ngày</button>
                <button onClick={() => setDayMode('specific')} className={`px-3 py-1.5 rounded-lg text-[12px] border ${dayMode === 'specific' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-border text-muted-foreground'}`}>Chọn ngày cụ thể</button>
              </div>
              {dayMode === 'specific' && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {dayLabels.map(d => (
                    <button key={d.value} onClick={() => setSelectedDays(prev => prev.includes(d.value) ? prev.filter(v => v !== d.value) : [...prev, d.value])} className={`w-10 h-10 rounded-lg text-[12px] border ${selectedDays.includes(d.value) ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-border text-muted-foreground'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label="Ngày hiệu lực" value={effectiveFrom} onChange={setEffectiveFrom} type="date" />
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Ghi chú (tuỳ chọn)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="VD: Chuyển ca theo yêu cầu cá nhân..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
            </div>
          </>
        )}
      </div>
      <DlgFooter onCancel={() => { if (confirmStep) setConfirmStep(false); else onClose(); }} onConfirm={handleSubmit} label={confirmStep ? 'Xác nhận đổi ca' : 'Tiếp tục'} variant={confirmStep ? 'danger' : 'primary'} />
    </Overlay>
  );
}

// ─── Confirm Dialog ───
function ConfirmDialog({ title, message, confirmLabel, variant, onConfirm, onClose }: { title: string; message: string; confirmLabel: string; variant: 'primary' | 'danger'; onConfirm: () => void; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={title} onClose={onClose} />
      <div className="p-4"><p className="text-[13px] text-muted-foreground">{message}</p></div>
      <DlgFooter onCancel={onClose} onConfirm={onConfirm} label={confirmLabel} variant={variant} />
    </Overlay>
  );
}