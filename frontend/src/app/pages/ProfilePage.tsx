// ================================================================
// PROFILE PAGE — Module 2 (Full API integration)
// Endpoints dùng:
//   GET  /api/users/me              → thông tin cơ bản + công việc
//   GET  /api/users/me/profile      → profile nhạy cảm
//   PATCH /api/users/me             → chỉ phoneNumber, avatarUrl
//   PUT   /api/users/me/profile     → toàn bộ profile
// ================================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Users,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Edit2,
  Save,
  Lock,
  Camera,
  MapPin,
  CreditCard,
  GraduationCap,
  Heart,
  Briefcase,
  Clock,
  FileText,
  Check,
  X,
  AlertTriangle,
  IdCard,
  Landmark,
  UserCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import * as usersService from "../../lib/services/users.service";
import type { UserProfile, TeamMember } from "../../lib/services/users.service";
import type { ApiUser } from "../../lib/services/auth.service";
import { ApiError } from "../../lib/apiClient";

// ─── Constants ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-violet-500",
];

const genderLabels: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
  UNDISCLOSED: "Không tiết lộ",
};

const empStatusMap: Record<string, { label: string; color: string }> = {
  PROBATION: {
    label: "Thử việc",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  ACTIVE: {
    label: "Chính thức",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  ON_LEAVE: {
    label: "Nghỉ dài hạn",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  TERMINATED: {
    label: "Đã nghỉ việc",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị",
  HR: "Nhân sự",
  MANAGER: "Quản lý",
  EMPLOYEE: "Nhân viên",
  SALES: "Kinh doanh",
  ACCOUNTANT: "Kế toán",
};

type TabKey = "work" | "personal" | "bank" | "education" | "emergency" | "team";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

// ─── Empty form ────────────────────────────────────────────────────
const emptyProfile = (): Partial<UserProfile> => ({
  dateOfBirth: null,
  gender: null,
  placeOfBirth: null,
  nationality: null,
  ethnicity: null,
  permanentAddress: null,
  currentAddress: null,
  city: null,
  province: null,
  nationalIdNumber: null,
  nationalIdIssueDate: null,
  nationalIdIssuePlace: null,
  passportNumber: null,
  passportExpiry: null,
  taxCode: null,
  socialInsuranceNumber: null,
  healthInsuranceNumber: null,
  healthInsuranceExpiry: null,
  bankName: null,
  bankBranch: null,
  bankAccountNumber: null,
  bankAccountHolder: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRel: null,
  dependantCount: null,
  educationLevel: null,
  educationMajor: null,
  university: null,
  notes: null,
});

// ═══════════════════════════════════════════════════════════════════
// ProfilePage
// ═══════════════════════════════════════════════════════════════════
export function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────
  const [me, setMe] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("work");
  const [editing, setEditing] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);

  // Editable form — phone (for /me) + full profile (for /me/profile)
  const [phoneForm, setPhoneForm] = useState("");
  const [profileForm, setProfileForm] =
    useState<Partial<UserProfile>>(emptyProfile());

  // My team
  const [myTeam, setMyTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<ApiUser | null>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);

  // ─── Fetch data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meData, profileData] = await Promise.all([
        usersService.getMe(),
        usersService.getMyProfile().catch(() => null),
      ]);
      setMe(meData);
      setPhoneForm(meData.phoneNumber || "");
      if (profileData) {
        setProfile(profileData);
        setProfileForm(profileData);
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch team data
  useEffect(() => {
    setTeamLoading(true);
    usersService
      .getMyTeam()
      .then(setMyTeam)
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }, []);

  // ─── Sync form khi bắt đầu edit ──────────────────────────────────
  const startEditing = () => {
    setPhoneForm(me?.phoneNumber || "");
    setProfileForm(profile ? { ...profile } : emptyProfile());
    setEditing(true);
  };

  const cancelEditing = () => {
    setPhoneForm(me?.phoneNumber || "");
    setProfileForm(profile ? { ...profile } : emptyProfile());
    setEditing(false);
  };

  // ─── Save — gọi 2 endpoints song song ─────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Promise<unknown>[] = [];

      // PATCH /me — chỉ phone (backend chỉ cho sửa phoneNumber + avatarUrl)
      const currentPhone = me?.phoneNumber || "";
      if (phoneForm !== currentPhone) {
        updates.push(
          usersService.updateMe({ phoneNumber: phoneForm || undefined }),
        );
      }

      // PUT /me/profile — toàn bộ profile fields
      updates.push(usersService.updateMyProfile(profileForm));

      await Promise.all(updates);

      // Refetch để đồng bộ
      await fetchData();
      setEditing(false);
      toast.success("Đã cập nhật thông tin cá nhân");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể lưu thông tin",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Avatar upload ──────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn. Tối đa 5 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      await usersService.uploadAvatar(file);
      await fetchData();
      toast.success("Cập nhật avatar thành công");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Upload avatar thất bại",
      );
    } finally {
      setUploadingAvatar(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  // ─── Derived values ───────────────────────────────────────────────
  const user = me ?? currentUser;
  if (!user) return null;

  const empStatus =
    empStatusMap[user.employmentStatus ?? "ACTIVE"] ?? empStatusMap["ACTIVE"];
  const initials =
    user.fullName?.split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "?";
  const dept = (user as ApiUser & { department?: { name: string } }).department;
  const jobTitle = (user as ApiUser & { jobTitle?: { name: string } }).jobTitle;
  const manager = (user as ApiUser & { manager?: { fullName: string } })
    .manager;

  // ─── Tabs ─────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "work", label: "Công việc", icon: <Briefcase size={14} /> },
    { key: "personal", label: "Cá nhân", icon: <UserCircle size={14} /> },
    { key: "bank", label: "Ngân hàng & BH", icon: <Landmark size={14} /> },
    { key: "education", label: "Học vấn", icon: <GraduationCap size={14} /> },
    ...(myTeam.length > 0
      ? [
          {
            key: "team" as TabKey,
            label: "Nhân viên của tôi",
            icon: <Users size={14} />,
          },
        ]
      : []),
    { key: "emergency", label: "Liên hệ KC", icon: <Heart size={14} /> },
  ];

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-[0.8125rem]">Đang tải thông tin...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* mustChangePassword Banner */}
      {user.mustChangePassword && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-yellow-600 shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              Bạn cần đổi mật khẩu
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-500">
              Mật khẩu của bạn đã được reset. Vui lòng đổi mật khẩu mới ngay.
            </div>
          </div>
          <button
            onClick={() => navigate("/change-password")}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-[0.8125rem] hover:bg-yellow-700 shrink-0 flex items-center gap-1"
          >
            Đổi ngay <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Banner gradient */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            {/* Avatar */}
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  onClick={() => setAvatarLightboxOpen(true)}
                  className="w-20 h-20 rounded-2xl border-4 border-card shadow-lg object-cover cursor-zoom-in"
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-[2rem] border-4 border-card shadow-lg select-none`}
                >
                  {initials}
                </div>
              )}
              {/* Upload / color-picker button */}
              <label
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-accent cursor-pointer"
                title={
                  user.avatarUrl ? "Đổi avatar" : "Tải ảnh lên hoặc đổi màu"
                }
              >
                {uploadingAvatar ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Camera size={12} />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {/* Avatar lightbox */}
            {avatarLightboxOpen && user.avatarUrl && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setAvatarLightboxOpen(false)}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain select-none"
                  style={{ maxWidth: "480px", maxHeight: "80vh" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setAvatarLightboxOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Name + meta */}
            <div className="flex-1 pt-2 sm:pt-0">
              <h1 className="text-[1.375rem]">{user.fullName}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {user.userCode}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {(user.roles ?? []).map((r) => (
                  <span
                    key={r}
                    className="text-[0.625rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {roleLabels[r] ?? r}
                  </span>
                ))}
                <span
                  className={`text-[0.625rem] px-2 py-0.5 rounded-full ${empStatus.color}`}
                >
                  {empStatus.label}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap justify-end">
              <button
                onClick={fetchData}
                className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1"
              >
                <RefreshCw size={12} />
              </button>
              <button
                onClick={() => navigate("/change-password")}
                className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent flex items-center gap-1"
              >
                <Lock size={12} /> Đổi mật khẩu
              </button>
              {!editing ? (
                <button
                  onClick={startEditing}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 flex items-center gap-1"
                >
                  <Edit2 size={12} /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Lưu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          icon={<Building2 size={16} className="text-indigo-500" />}
          label="Phòng ban"
          value={dept?.name ?? "—"}
        />
        <QuickStat
          icon={<Briefcase size={16} className="text-blue-500" />}
          label="Chức danh"
          value={jobTitle?.name ?? "—"}
        />
        <QuickStat
          icon={<Calendar size={16} className="text-green-500" />}
          label="Ngày vào làm"
          value={user.hireDate ? fmtDate(user.hireDate) : "—"}
        />
        <QuickStat
          icon={<Clock size={16} className="text-orange-500" />}
          label="Đăng nhập cuối"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
      </div>

      {/* Tabbed Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="border-b border-border px-2 flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[0.8125rem] border-b-2 whitespace-nowrap transition-colors
                ${activeTab === tab.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── WORK TAB ── */}
          {activeTab === "work" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoField
                icon={<Building2 size={14} />}
                label="Phòng ban"
                value={dept?.name}
              />
              <InfoField
                icon={<Briefcase size={14} />}
                label="Chức danh"
                value={jobTitle?.name}
              />
              <InfoField
                icon={<User size={14} />}
                label="Quản lý trực tiếp"
                value={manager?.fullName ?? "Không có"}
              />
              <InfoField
                icon={<Calendar size={14} />}
                label="Ngày vào làm"
                value={user.hireDate ? fmtDate(user.hireDate) : "—"}
              />
              <InfoField
                icon={<Shield size={14} />}
                label="Trạng thái làm việc"
                value={empStatus.label}
                badge={empStatus.color}
              />
              <InfoField
                icon={<Mail size={14} />}
                label="Email công ty"
                value={user.email}
              />

              {/* Phone — có thể chỉnh sửa qua PATCH /me */}
              <InfoField
                icon={<Phone size={14} />}
                label="Số điện thoại"
                value={editing ? undefined : (me?.phoneNumber ?? "—")}
                editNode={
                  editing ? (
                    <input
                      type="tel"
                      value={phoneForm}
                      onChange={(e) => setPhoneForm(e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                    />
                  ) : undefined
                }
              />
              <InfoField
                icon={<Clock size={14} />}
                label="Đăng nhập cuối"
                value={
                  user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString("vi-VN")
                    : "—"
                }
              />
            </div>
          )}

          {/* ── PERSONAL TAB ── */}
          {activeTab === "personal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Ngày sinh */}
                <InfoField
                  icon={<Calendar size={14} />}
                  label="Ngày sinh"
                  value={editing ? undefined : fmtDate(profileForm.dateOfBirth)}
                  editNode={
                    editing ? (
                      <input
                        type="date"
                        value={profileForm.dateOfBirth?.split("T")[0] ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            dateOfBirth: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                {/* Giới tính */}
                <InfoField
                  icon={<User size={14} />}
                  label="Giới tính"
                  value={
                    editing
                      ? undefined
                      : profileForm.gender
                        ? genderLabels[profileForm.gender]
                        : "—"
                  }
                  editNode={
                    editing ? (
                      <select
                        value={profileForm.gender ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            gender: (e.target.value ||
                              null) as UserProfile["gender"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      >
                        <option value="">-- Chọn --</option>
                        {Object.entries(genderLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : undefined
                  }
                />

                {/* CMND/CCCD */}
                <InfoField
                  icon={<IdCard size={14} />}
                  label="Số CMND/CCCD"
                  value={
                    editing ? undefined : (profileForm.nationalIdNumber ?? "—")
                  }
                  editNode={
                    editing ? (
                      <input
                        type="text"
                        value={profileForm.nationalIdNumber ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            nationalIdNumber: e.target.value || null,
                          }))
                        }
                        placeholder="001099012345"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                {/* Ngày cấp CCCD */}
                <InfoField
                  icon={<Calendar size={14} />}
                  label="Ngày cấp CCCD"
                  value={
                    editing
                      ? undefined
                      : fmtDate(profileForm.nationalIdIssueDate)
                  }
                  editNode={
                    editing ? (
                      <input
                        type="date"
                        value={
                          profileForm.nationalIdIssueDate?.split("T")[0] ?? ""
                        }
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            nationalIdIssueDate: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                {/* Nơi cấp */}
                <InfoField
                  icon={<MapPin size={14} />}
                  label="Nơi cấp CCCD"
                  value={
                    editing
                      ? undefined
                      : (profileForm.nationalIdIssuePlace ?? "—")
                  }
                  editNode={
                    editing ? (
                      <input
                        type="text"
                        value={profileForm.nationalIdIssuePlace ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            nationalIdIssuePlace: e.target.value || null,
                          }))
                        }
                        placeholder="Cục CSLTT&PCCC TPHCM"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                {/* Mã số thuế */}
                <InfoField
                  icon={<FileText size={14} />}
                  label="Mã số thuế"
                  value={editing ? undefined : (profileForm.taxCode ?? "—")}
                  editNode={
                    editing ? (
                      <input
                        type="text"
                        value={profileForm.taxCode ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            taxCode: e.target.value || null,
                          }))
                        }
                        placeholder="1234567890"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />
              </div>

              {/* Địa chỉ */}
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <MapPin size={12} /> Địa chỉ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField
                    label="Địa chỉ thường trú"
                    value={
                      editing
                        ? undefined
                        : (profileForm.permanentAddress ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.permanentAddress ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              permanentAddress: e.target.value || null,
                            }))
                          }
                          placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Địa chỉ hiện tại"
                    value={
                      editing ? undefined : (profileForm.currentAddress ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.currentAddress ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              currentAddress: e.target.value || null,
                            }))
                          }
                          placeholder="456 Lê Lợi, Q.3, TP.HCM"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Tỉnh/Thành phố"
                    value={editing ? undefined : (profileForm.city ?? "—")}
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.city ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              city: e.target.value || null,
                            }))
                          }
                          placeholder="TP. Hồ Chí Minh"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Quốc tịch"
                    value={
                      editing ? undefined : (profileForm.nationality ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.nationality ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              nationality: e.target.value || null,
                            }))
                          }
                          placeholder="Việt Nam"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                </div>
              </div>

              {/* Số người phụ thuộc */}
              <div className="pt-3 border-t border-border">
                <InfoField
                  icon={<Heart size={14} />}
                  label="Số người phụ thuộc (cho mục đích giảm trừ thuế)"
                  value={
                    editing
                      ? undefined
                      : String(profileForm.dependantCount ?? 0)
                  }
                  editNode={
                    editing ? (
                      <input
                        type="number"
                        value={profileForm.dependantCount ?? 0}
                        min={0}
                        max={20}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            dependantCount: +e.target.value,
                          }))
                        }
                        className="w-32 px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* ── BANK & INSURANCE TAB ── */}
          {activeTab === "bank" && (
            <div className="space-y-6">
              {/* Ngân hàng */}
              <div>
                <h3 className="text-sm mb-4 flex items-center gap-2">
                  <Landmark size={14} className="text-blue-500" /> Thông tin
                  ngân hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <InfoField
                    label="Ngân hàng"
                    value={editing ? undefined : (profileForm.bankName ?? "—")}
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.bankName ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              bankName: e.target.value || null,
                            }))
                          }
                          placeholder="Vietcombank"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Chi nhánh"
                    value={
                      editing ? undefined : (profileForm.bankBranch ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.bankBranch ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              bankBranch: e.target.value || null,
                            }))
                          }
                          placeholder="CN Hà Nội"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Số tài khoản"
                    value={
                      editing
                        ? undefined
                        : (profileForm.bankAccountNumber ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.bankAccountNumber ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              bankAccountNumber: e.target.value || null,
                            }))
                          }
                          placeholder="0011004567890"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <div className="sm:col-span-3">
                    <InfoField
                      label="Tên chủ tài khoản (viết hoa không dấu)"
                      value={
                        editing
                          ? undefined
                          : (profileForm.bankAccountHolder ?? "—")
                      }
                      editNode={
                        editing ? (
                          <input
                            type="text"
                            value={profileForm.bankAccountHolder ?? ""}
                            onChange={(e) =>
                              setProfileForm((f) => ({
                                ...f,
                                bankAccountHolder:
                                  e.target.value.toUpperCase() || null,
                              }))
                            }
                            placeholder="NGUYEN VAN AN"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] uppercase"
                            style={{ textTransform: "uppercase" }}
                          />
                        ) : undefined
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Bảo hiểm */}
              <div className="border-t border-border pt-6">
                <h3 className="text-sm mb-4 flex items-center gap-2">
                  <Shield size={14} className="text-green-500" /> Bảo hiểm xã
                  hội & Y tế
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField
                    label="Số BHXH"
                    value={
                      editing
                        ? undefined
                        : (profileForm.socialInsuranceNumber ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.socialInsuranceNumber ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              socialInsuranceNumber: e.target.value || null,
                            }))
                          }
                          placeholder="1234567890"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Số thẻ BHYT"
                    value={
                      editing
                        ? undefined
                        : (profileForm.healthInsuranceNumber ?? "—")
                    }
                    editNode={
                      editing ? (
                        <input
                          type="text"
                          value={profileForm.healthInsuranceNumber ?? ""}
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              healthInsuranceNumber: e.target.value || null,
                            }))
                          }
                          placeholder="HN1234567890"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                  <InfoField
                    label="Ngày hết hạn thẻ BHYT"
                    value={
                      editing
                        ? undefined
                        : fmtDate(profileForm.healthInsuranceExpiry)
                    }
                    editNode={
                      editing ? (
                        <input
                          type="date"
                          value={
                            profileForm.healthInsuranceExpiry?.split("T")[0] ??
                            ""
                          }
                          onChange={(e) =>
                            setProfileForm((f) => ({
                              ...f,
                              healthInsuranceExpiry: e.target.value || null,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                        />
                      ) : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── EDUCATION TAB ── */}
          {activeTab === "education" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoField
                icon={<GraduationCap size={14} />}
                label="Trình độ học vấn"
                value={
                  editing ? undefined : (profileForm.educationLevel ?? "—")
                }
                editNode={
                  editing ? (
                    <select
                      value={profileForm.educationLevel ?? ""}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          educationLevel: e.target.value || null,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                    >
                      <option value="">-- Chọn --</option>
                      {[
                        "THPT",
                        "Trung cấp",
                        "Cao đẳng",
                        "Đại học",
                        "Thạc sĩ",
                        "Tiến sĩ",
                        "Khác",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : undefined
                }
              />

              <InfoField
                label="Chuyên ngành"
                value={
                  editing ? undefined : (profileForm.educationMajor ?? "—")
                }
                editNode={
                  editing ? (
                    <input
                      type="text"
                      value={profileForm.educationMajor ?? ""}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          educationMajor: e.target.value || null,
                        }))
                      }
                      placeholder="Khoa học máy tính"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                    />
                  ) : undefined
                }
              />

              <div className="sm:col-span-2">
                <InfoField
                  icon={<Building2 size={14} />}
                  label="Trường/Cơ sở đào tạo"
                  value={editing ? undefined : (profileForm.university ?? "—")}
                  editNode={
                    editing ? (
                      <input
                        type="text"
                        value={profileForm.university ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            university: e.target.value || null,
                          }))
                        }
                        placeholder="Đại học Bách khoa TP.HCM"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* ── EMERGENCY CONTACT TAB ── */}
          {activeTab === "emergency" && (
            <div className="space-y-4">
              <div className="bg-yellow-50/50 dark:bg-yellow-900/5 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-4">
                <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-500">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Thông tin liên hệ khẩn cấp rất quan trọng trong trường hợp
                    cần thiết. Vui lòng cập nhật đầy đủ.
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <InfoField
                  icon={<User size={14} />}
                  label="Họ và tên"
                  value={
                    editing
                      ? undefined
                      : (profileForm.emergencyContactName ?? "—")
                  }
                  editNode={
                    editing ? (
                      <input
                        type="text"
                        value={profileForm.emergencyContactName ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            emergencyContactName: e.target.value || null,
                          }))
                        }
                        placeholder="Nguyễn Thị Mai"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                <InfoField
                  icon={<Phone size={14} />}
                  label="Số điện thoại"
                  value={
                    editing
                      ? undefined
                      : (profileForm.emergencyContactPhone ?? "—")
                  }
                  editNode={
                    editing ? (
                      <input
                        type="tel"
                        value={profileForm.emergencyContactPhone ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            emergencyContactPhone: e.target.value || null,
                          }))
                        }
                        placeholder="0912345678"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      />
                    ) : undefined
                  }
                />

                <InfoField
                  icon={<Heart size={14} />}
                  label="Mối quan hệ"
                  value={
                    editing
                      ? undefined
                      : (profileForm.emergencyContactRel ?? "—")
                  }
                  editNode={
                    editing ? (
                      <select
                        value={profileForm.emergencyContactRel ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            emergencyContactRel: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem]"
                      >
                        <option value="">-- Chọn --</option>
                        {[
                          "Vợ/Chồng",
                          "Bố/Mẹ",
                          "Anh/Chị/Em",
                          "Con",
                          "Bạn bè",
                          "Khác",
                        ].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : undefined
                  }
                />
              </div>

              {/* Notes */}
              <div className="pt-3 border-t border-border">
                <InfoField
                  icon={<FileText size={14} />}
                  label="Ghi chú thêm"
                  value={editing ? undefined : (profileForm.notes ?? "—")}
                  editNode={
                    editing ? (
                      <textarea
                        value={profileForm.notes ?? ""}
                        onChange={(e) =>
                          setProfileForm((f) => ({
                            ...f,
                            notes: e.target.value || null,
                          }))
                        }
                        rows={3}
                        placeholder="Ghi chú thêm về liên hệ khẩn cấp..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[0.8125rem] resize-none"
                      />
                    ) : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* ── TEAM TAB ── */}
          {activeTab === "team" && (
            <div className="flex gap-4">
              {/* Member list */}
              <div
                className={`space-y-2 ${selectedMember ? "w-1/2" : "w-full"}`}
              >
                {teamLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[0.8125rem]">Đang tải...</span>
                  </div>
                ) : myTeam.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users size={28} className="opacity-20 mb-2" />
                    <p className="text-[0.8125rem]">Không có nhân viên trực thuộc</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-3">
                      {myTeam.length} nhân viên trực thuộc
                    </div>
                    {myTeam.map((m) => {
                      const mInitials =
                        m.fullName
                          ?.split(" ")
                          .slice(-1)[0]?.[0]
                          ?.toUpperCase() ?? "?";
                      const mEmpStatus =
                        empStatusMap[m.employmentStatus ?? "ACTIVE"] ??
                        empStatusMap["ACTIVE"];
                      const isSelected = selectedMember?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={async () => {
                            if (isSelected) {
                              setSelectedMember(null);
                              return;
                            }
                            setMemberDetailLoading(true);
                            try {
                              const detail = await usersService.getUserById(
                                m.id,
                              );
                              setSelectedMember(detail);
                            } catch {
                              toast.error("Không thể tải thông tin nhân viên");
                            } finally {
                              setMemberDetailLoading(false);
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border hover:bg-muted/30"}`}
                        >
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.fullName}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.8125rem] shrink-0">
                              {mInitials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.8125rem] truncate">
                              {m.fullName}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground truncate">
                              {m.jobTitle?.name ?? "—"} ·{" "}
                              {m.department?.name ?? "—"}
                            </div>
                          </div>
                          <span
                            className={`text-[0.625rem] px-2 py-0.5 rounded-full shrink-0 ${mEmpStatus.color}`}
                          >
                            {mEmpStatus.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Member detail panel */}
              {selectedMember && (
                <div className="w-1/2 border border-border rounded-xl p-4 space-y-4 self-start">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Thông tin chi tiết
                    </h3>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="p-1 rounded hover:bg-accent"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {memberDetailLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        {selectedMember.avatarUrl ? (
                          <img
                            src={selectedMember.avatarUrl}
                            alt={selectedMember.fullName}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg">
                            {selectedMember.fullName
                              ?.split(" ")
                              .slice(-1)[0]?.[0]
                              ?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {selectedMember.fullName}
                          </div>
                          <div className="text-[0.6875rem] text-muted-foreground font-mono">
                            {selectedMember.userCode}
                          </div>
                        </div>
                      </div>
                      {/* Fields */}
                      <div className="grid grid-cols-1 gap-3 text-xs">
                        <InfoField
                          icon={<Mail size={13} />}
                          label="Email"
                          value={selectedMember.email}
                        />
                        <InfoField
                          icon={<Phone size={13} />}
                          label="Điện thoại"
                          value={selectedMember.phoneNumber || "—"}
                        />
                        <InfoField
                          icon={<Building2 size={13} />}
                          label="Phòng ban"
                          value={
                            (selectedMember as any).department?.name ?? "—"
                          }
                        />
                        <InfoField
                          icon={<Briefcase size={13} />}
                          label="Chức danh"
                          value={(selectedMember as any).jobTitle?.name ?? "—"}
                        />
                        <InfoField
                          icon={<Calendar size={13} />}
                          label="Ngày vào làm"
                          value={
                            selectedMember.hireDate
                              ? fmtDate(selectedMember.hireDate)
                              : "—"
                          }
                        />
                        <InfoField
                          icon={<Shield size={13} />}
                          label="Trạng thái"
                          value={
                            empStatusMap[
                              selectedMember.employmentStatus ?? "ACTIVE"
                            ]?.label ?? selectedMember.employmentStatus
                          }
                          badge={
                            empStatusMap[
                              selectedMember.employmentStatus ?? "ACTIVE"
                            ]?.color
                          }
                        />
                        {selectedMember.lastLoginAt && (
                          <InfoField
                            icon={<Clock size={13} />}
                            label="Đăng nhập cuối"
                            value={new Date(
                              selectedMember.lastLoginAt,
                            ).toLocaleString("vi-VN")}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating save bar when editing */}
      {editing && (
        <div className="sticky bottom-4 bg-card border border-blue-200 dark:border-blue-800 shadow-lg rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.8125rem] text-blue-700 dark:text-blue-400">
            <Edit2 size={14} />
            <span>
              Chế độ chỉnh sửa — chuyển tab để cập nhật toàn bộ, rồi nhấn{" "}
              <strong>Lưu</strong>.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}{" "}
              Lưu tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────
function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[0.625rem] text-muted-foreground">{label}</div>
        <div className="text-[0.8125rem] truncate">{value}</div>
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
  badge,
  editNode,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  badge?: string;
  editNode?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[0.6875rem] text-muted-foreground flex items-center gap-1 mb-1">
        {icon}
        {label}
      </div>
      {editNode ??
        (badge ? (
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>
            {value}
          </span>
        ) : (
          <div className="text-[0.8125rem]">{value || "—"}</div>
        ))}
    </div>
  );
}
