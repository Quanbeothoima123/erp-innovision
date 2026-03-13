import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useEmployeeData } from '../context/EmployeeContext';
import { getDepartmentById, getJobTitleById, getUserById } from '../data/mockData';
import type { UserProfile, Gender } from '../data/mockData';
import {
  User, Mail, Phone, Building2, Calendar, Shield, Edit2, Save, Lock, Eye, EyeOff,
  Camera, MapPin, CreditCard, GraduationCap, Heart, Briefcase, Clock, FileText,
  Check, X, ChevronRight, AlertTriangle, IdCard, Landmark, UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-violet-500',
];

const genderLabels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác', UNDISCLOSED: 'Không tiết lộ' };
const empStatusLabels: Record<string, { label: string; color: string }> = {
  PROBATION: { label: 'Thử việc', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  ACTIVE: { label: 'Chính thức', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ON_LEAVE: { label: 'Nghỉ dài hạn', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  TERMINATED: { label: 'Đã nghỉ việc', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

type TabKey = 'work' | 'personal' | 'bank' | 'education' | 'emergency';

const roleLabels: Record<string, string> = {
  ADMIN: 'Quản trị', HR: 'Nhân sự', MANAGER: 'Quản lý',
  EMPLOYEE: 'Nhân viên', SALES: 'Kinh doanh', ACCOUNTANT: 'Kế toán',
};

export function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { allProfiles, upsertProfile } = useEmployeeData();
  const navigate = useNavigate();

  const profile = useMemo(() => allProfiles.find(p => p.userId === currentUser?.id), [allProfiles, currentUser?.id]);

  const [activeTab, setActiveTab] = useState<TabKey>('work');
  const [editing, setEditing] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    phoneNumber: currentUser?.phoneNumber || '',
    dateOfBirth: profile?.dateOfBirth || '',
    gender: (profile?.gender || '') as string,
    nationalIdNumber: profile?.nationalIdNumber || '',
    taxCode: profile?.taxCode || '',
    socialInsuranceNumber: profile?.socialInsuranceNumber || '',
    healthInsuranceNumber: profile?.healthInsuranceNumber || '',
    bankName: profile?.bankName || '',
    bankAccountNumber: profile?.bankAccountNumber || '',
    bankAccountHolder: profile?.bankAccountHolder || '',
    permanentAddress: profile?.permanentAddress || '',
    emergencyContactName: profile?.emergencyContactName || '',
    emergencyContactPhone: profile?.emergencyContactPhone || '',
    emergencyContactRel: profile?.emergencyContactRel || '',
    educationLevel: profile?.educationLevel || '',
    educationMajor: profile?.educationMajor || '',
    university: profile?.university || '',
  });

  if (!currentUser) return null;

  const dept = getDepartmentById(currentUser.departmentId);
  const job = getJobTitleById(currentUser.jobTitleId);
  const manager = currentUser.managerId ? getUserById(currentUser.managerId) : null;
  const empStatus = empStatusLabels[currentUser.employmentStatus];
  const initials = currentUser.fullName.split(' ').slice(-1)[0][0];

  const handleSave = () => {
    // Update user phone
    updateCurrentUser({ phoneNumber: form.phoneNumber });
    // Update profile
    upsertProfile(currentUser.id, {
      dateOfBirth: form.dateOfBirth || undefined,
      gender: (form.gender || undefined) as Gender | undefined,
      nationalIdNumber: form.nationalIdNumber || undefined,
      taxCode: form.taxCode || undefined,
      socialInsuranceNumber: form.socialInsuranceNumber || undefined,
      healthInsuranceNumber: form.healthInsuranceNumber || undefined,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      bankAccountHolder: form.bankAccountHolder || undefined,
      permanentAddress: form.permanentAddress || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      emergencyContactRel: form.emergencyContactRel || undefined,
      educationLevel: form.educationLevel || undefined,
      educationMajor: form.educationMajor || undefined,
      university: form.university || undefined,
    });
    setEditing(false);
    toast.success('Đã cập nhật thông tin cá nhân');
  };

  const handleCancel = () => {
    setForm({
      phoneNumber: currentUser.phoneNumber || '',
      dateOfBirth: profile?.dateOfBirth || '',
      gender: (profile?.gender || '') as string,
      nationalIdNumber: profile?.nationalIdNumber || '',
      taxCode: profile?.taxCode || '',
      socialInsuranceNumber: profile?.socialInsuranceNumber || '',
      healthInsuranceNumber: profile?.healthInsuranceNumber || '',
      bankName: profile?.bankName || '',
      bankAccountNumber: profile?.bankAccountNumber || '',
      bankAccountHolder: profile?.bankAccountHolder || '',
      permanentAddress: profile?.permanentAddress || '',
      emergencyContactName: profile?.emergencyContactName || '',
      emergencyContactPhone: profile?.emergencyContactPhone || '',
      emergencyContactRel: profile?.emergencyContactRel || '',
      educationLevel: profile?.educationLevel || '',
      educationMajor: profile?.educationMajor || '',
      university: profile?.university || '',
    });
    setEditing(false);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'work', label: 'Công việc', icon: <Briefcase size={14} /> },
    { key: 'personal', label: 'Cá nhân', icon: <UserCircle size={14} /> },
    { key: 'bank', label: 'Ngân hàng & BH', icon: <Landmark size={14} /> },
    { key: 'education', label: 'Học vấn', icon: <GraduationCap size={14} /> },
    { key: 'emergency', label: 'Liên hệ KC', icon: <Heart size={14} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* mustChangePassword Banner */}
      {currentUser.mustChangePassword && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0" />
          <div className="flex-1">
            <div className="text-[14px] text-yellow-700 dark:text-yellow-400">Bạn cần đổi mật khẩu</div>
            <div className="text-[12px] text-yellow-600 dark:text-yellow-500">Mật khẩu của bạn đã được reset. Vui lòng đổi mật khẩu mới.</div>
          </div>
          <button onClick={() => navigate('/change-password')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-[13px] hover:bg-yellow-700 shrink-0">Đổi ngay</button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            {/* Avatar */}
            <div className="relative">
              <div className={`w-20 h-20 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-[32px] border-4 border-card shadow-lg`}>
                {initials}
              </div>
              <button onClick={() => setShowColorPicker(!showColorPicker)} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-accent" title="Đổi màu avatar">
                <Camera size={12} />
              </button>
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-xl p-3 shadow-xl">
                    <div className="text-[11px] text-muted-foreground mb-2">Chọn màu avatar</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => { setAvatarColor(c); setShowColorPicker(false); }}
                          className={`w-8 h-8 rounded-lg ${c} flex items-center justify-center text-white text-[12px] ${avatarColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-card' : ''}`}>
                          {avatarColor === c && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Name + Info */}
            <div className="flex-1 pt-2 sm:pt-0">
              <h1 className="text-[22px]">{currentUser.fullName}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[12px] text-muted-foreground">{currentUser.userCode}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-[12px] text-muted-foreground">{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {currentUser.roles.map(r => (
                  <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{roleLabels[r] || r}</span>
                ))}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${empStatus.color}`}>{empStatus.label}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button onClick={() => navigate('/change-password')} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent flex items-center gap-1">
                <Lock size={12} /> Đổi mật khẩu
              </button>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] hover:bg-blue-700 flex items-center gap-1">
                  <Edit2 size={12} /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-1">
                  <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent">Huỷ</button>
                  <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[12px] hover:bg-green-700 flex items-center gap-1"><Save size={12} /> Lưu</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat icon={<Building2 size={16} className="text-indigo-500" />} label="Phòng ban" value={dept?.name || '—'} />
        <QuickStat icon={<Briefcase size={16} className="text-blue-500" />} label="Chức danh" value={job?.name || '—'} />
        <QuickStat icon={<Calendar size={16} className="text-green-500" />} label="Ngày vào làm" value={new Date(currentUser.hireDate).toLocaleDateString('vi-VN')} />
        <QuickStat icon={<Clock size={16} className="text-orange-500" />} label="Đăng nhập cuối" value={currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'} />
      </div>

      {/* Tabbed Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="border-b border-border px-2 flex overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13px] border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* WORK TAB */}
          {activeTab === 'work' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={<Building2 size={14} />} label="Phòng ban" value={dept?.name} />
              <InfoField icon={<Briefcase size={14} />} label="Chức danh" value={job?.name} />
              <InfoField icon={<User size={14} />} label="Quản lý trực tiếp" value={manager?.fullName || 'Không có'} />
              <InfoField icon={<Calendar size={14} />} label="Ngày vào làm" value={new Date(currentUser.hireDate).toLocaleDateString('vi-VN')} />
              <InfoField icon={<Shield size={14} />} label="Trạng thái" value={empStatus.label} badge={empStatus.color} />
              <InfoField icon={<Mail size={14} />} label="Email công ty" value={currentUser.email} />
              <InfoField icon={<Phone size={14} />} label="Số điện thoại"
                value={editing ? undefined : (form.phoneNumber || '—')}
                editNode={editing ? <input type="text" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="0901234567" /> : undefined}
              />
              <InfoField icon={<Clock size={14} />} label="Đăng nhập cuối" value={currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleString('vi-VN') : '—'} />
            </div>
          )}

          {/* PERSONAL TAB */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={<Calendar size={14} />} label="Ngày sinh"
                value={editing ? undefined : (form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString('vi-VN') : '—')}
                editNode={editing ? <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" /> : undefined}
              />
              <InfoField icon={<User size={14} />} label="Giới tính"
                value={editing ? undefined : genderLabels[form.gender] || '—'}
                editNode={editing ? (
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                    <option value="">-- Chọn --</option>
                    {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : undefined}
              />
              <InfoField icon={<IdCard size={14} />} label="CMND/CCCD"
                value={editing ? undefined : (form.nationalIdNumber || '—')}
                editNode={editing ? <input type="text" value={form.nationalIdNumber} onChange={e => setForm(f => ({ ...f, nationalIdNumber: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="001099012345" /> : undefined}
              />
              <InfoField icon={<FileText size={14} />} label="Mã số thuế"
                value={editing ? undefined : (form.taxCode || '—')}
                editNode={editing ? <input type="text" value={form.taxCode} onChange={e => setForm(f => ({ ...f, taxCode: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="1234567890" /> : undefined}
              />
              <div className="sm:col-span-2">
                <InfoField icon={<MapPin size={14} />} label="Địa chỉ thường trú"
                  value={editing ? undefined : (form.permanentAddress || '—')}
                  editNode={editing ? <input type="text" value={form.permanentAddress} onChange={e => setForm(f => ({ ...f, permanentAddress: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" /> : undefined}
                />
              </div>
            </div>
          )}

          {/* BANK & INSURANCE TAB */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] mb-3 flex items-center gap-2"><Landmark size={14} className="text-blue-500" /> Thông tin ngân hàng</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InfoField label="Ngân hàng"
                    value={editing ? undefined : (form.bankName || '—')}
                    editNode={editing ? <input type="text" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="Vietcombank" /> : undefined}
                  />
                  <InfoField label="Số tài khoản"
                    value={editing ? undefined : (form.bankAccountNumber || '—')}
                    editNode={editing ? <input type="text" value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="0011004567890" /> : undefined}
                  />
                  <InfoField label="Chủ tài khoản"
                    value={editing ? undefined : (form.bankAccountHolder || '—')}
                    editNode={editing ? <input type="text" value={form.bankAccountHolder} onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="NGUYEN VAN AN" /> : undefined}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <h3 className="text-[14px] mb-3 flex items-center gap-2"><Shield size={14} className="text-green-500" /> Bảo hiểm</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label="Số BHXH"
                    value={editing ? undefined : (form.socialInsuranceNumber || '—')}
                    editNode={editing ? <input type="text" value={form.socialInsuranceNumber} onChange={e => setForm(f => ({ ...f, socialInsuranceNumber: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="1234567890" /> : undefined}
                  />
                  <InfoField label="Số BHYT"
                    value={editing ? undefined : (form.healthInsuranceNumber || '—')}
                    editNode={editing ? <input type="text" value={form.healthInsuranceNumber} onChange={e => setForm(f => ({ ...f, healthInsuranceNumber: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="HN1234567890" /> : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === 'education' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={<GraduationCap size={14} />} label="Trình độ học vấn"
                value={editing ? undefined : (form.educationLevel || '—')}
                editNode={editing ? (
                  <select value={form.educationLevel} onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                    <option value="">-- Chọn --</option>
                    <option value="Trung cấp">Trung cấp</option>
                    <option value="Cao đẳng">Cao đẳng</option>
                    <option value="Đại học">Đại học</option>
                    <option value="Thạc sĩ">Thạc sĩ</option>
                    <option value="Tiến sĩ">Tiến sĩ</option>
                    <option value="Khác">Khác</option>
                  </select>
                ) : undefined}
              />
              <InfoField label="Chuyên ngành"
                value={editing ? undefined : (form.educationMajor || '—')}
                editNode={editing ? <input type="text" value={form.educationMajor} onChange={e => setForm(f => ({ ...f, educationMajor: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="Khoa học máy tính" /> : undefined}
              />
              <div className="sm:col-span-2">
                <InfoField label="Trường"
                  value={editing ? undefined : (form.university || '—')}
                  editNode={editing ? <input type="text" value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="Đại học Bách khoa TP.HCM" /> : undefined}
                />
              </div>
            </div>
          )}

          {/* EMERGENCY CONTACT TAB */}
          {activeTab === 'emergency' && (
            <div>
              <div className="bg-yellow-50/50 dark:bg-yellow-900/5 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2 text-[12px] text-yellow-700 dark:text-yellow-500">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>Thông tin liên hệ khẩn cấp rất quan trọng trong trường hợp cần thiết. Vui lòng cập nhật đầy đủ.</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoField icon={<User size={14} />} label="Họ và tên"
                  value={editing ? undefined : (form.emergencyContactName || '—')}
                  editNode={editing ? <input type="text" value={form.emergencyContactName} onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="Nguyễn Thị Mai" /> : undefined}
                />
                <InfoField icon={<Phone size={14} />} label="Số điện thoại"
                  value={editing ? undefined : (form.emergencyContactPhone || '—')}
                  editNode={editing ? <input type="text" value={form.emergencyContactPhone} onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" placeholder="0912345678" /> : undefined}
                />
                <InfoField icon={<Heart size={14} />} label="Mối quan hệ"
                  value={editing ? undefined : (form.emergencyContactRel || '—')}
                  editNode={editing ? (
                    <select value={form.emergencyContactRel} onChange={e => setForm(f => ({ ...f, emergencyContactRel: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                      <option value="">-- Chọn --</option>
                      <option value="Vợ/Chồng">Vợ/Chồng</option>
                      <option value="Bố/Mẹ">Bố/Mẹ</option>
                      <option value="Anh/Chị/Em">Anh/Chị/Em</option>
                      <option value="Con">Con</option>
                      <option value="Bạn bè">Bạn bè</option>
                      <option value="Khác">Khác</option>
                    </select>
                  ) : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editing hint */}
      {editing && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] text-blue-700 dark:text-blue-400">
            <Edit2 size={14} /> Bạn đang ở chế độ chỉnh sửa. Chuyển qua các tab khác để cập nhật tất cả thông tin, sau đó nhấn "Lưu".
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent">Huỷ</button>
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[12px] hover:bg-green-700 flex items-center gap-1"><Save size={12} /> Lưu tất cả</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────
function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-[13px] truncate">{value}</div>
      </div>
    </div>
  );
}

function InfoField({ icon, label, value, badge, editNode }: {
  icon?: React.ReactNode; label: string; value?: string; badge?: string; editNode?: React.ReactNode;
}) {
  if (editNode) {
    return (
      <div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">{icon}{label}</div>
        {editNode}
      </div>
    );
  }
  return (
    <div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5">{icon}{label}</div>
      {badge ? (
        <span className={`text-[12px] px-2 py-0.5 rounded-full ${badge}`}>{value}</span>
      ) : (
        <div className="text-[13px]">{value || '—'}</div>
      )}
    </div>
  );
}
