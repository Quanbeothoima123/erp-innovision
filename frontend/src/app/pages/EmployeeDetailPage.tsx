// ================================================================
// EMPLOYEE DETAIL PAGE — API-integrated, 7 tabs đầy đủ
// Tabs: info | profile | compensation | components | actions | work_shift | audit
// ================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../lib/apiClient";
import * as usersService from "../../lib/services/users.service";
import * as payrollService from "../../lib/services/payroll.service";
import * as attendanceService from "../../lib/services/attendance.service";
import type { ApiWorkShift as ApiShift } from "../../lib/services/attendance.service";
import type {
  ApiCompensation,
  ApiUserSalaryComponent,
  ApiSalaryComponent,
} from "../../lib/services/payroll.service";
import * as departmentsService from "../../lib/services/departments.service";
import * as jobTitlesService from "../../lib/services/jobTitles.service";
import type { ApiUser } from "../../lib/services/auth.service";
import type { UserProfile } from "../../lib/services/users.service";
import type { DepartmentOption } from "../../lib/services/departments.service";
import type { JobTitleOption } from "../../lib/services/jobTitles.service";

const formatFullVND = (amount: number): string =>
  new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " ₫";

import {
  ChevronLeft,
  Edit2,
  Lock,
  Unlock,
  UserX,
  KeyRound,
  DollarSign,
  Wallet,
  AlertTriangle,
  X,
  Plus,
  Ban,
  ScrollText,
  Clock,
  User as UserIcon,
  Shield,
  Building2,
  Phone,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
  Search,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const USE_API = !!import.meta.env.VITE_API_URL;

// ── Types cho 2 endpoint mới ────────────────────────────────────
interface ApiWorkShift {
  id: string;
  userId: string;
  shiftId: string;
  dayOfWeek: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shift: {
    id: string;
    code: string;
    name: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    workMinutes: number;
    isNightShift: boolean;
    overtimeAfterMinutes: number;
  } | null;
}

interface ApiAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorUserId: string | null;
  actorUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    userCode: string;
  } | null;
  description: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

// ── Status constants ────────────────────────────────────────────
const empStatusColors: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PROBATION:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ON_LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TERMINATED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};
const accStatusColors: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  LOCKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DISABLED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};
const empStatusLabels: Record<string, string> = {
  ACTIVE: "Chính thức",
  PROBATION: "Thử việc",
  ON_LEAVE: "Nghỉ phép",
  TERMINATED: "Đã nghỉ",
};
const accStatusLabels: Record<string, string> = {
  ACTIVE: "Hoạt động",
  PENDING: "Chờ kích hoạt",
  LOCKED: "Bị khoá",
  DISABLED: "Vô hiệu",
};
const genderLabels: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
  UNDISCLOSED: "Không tiết lộ",
};
const salaryTypeLabels: Record<string, string> = {
  MONTHLY: "Theo tháng",
  DAILY: "Theo ngày",
  HOURLY: "Theo giờ",
};
const payFrequencyLabels: Record<string, string> = {
  MONTHLY: "Hàng tháng",
  BIWEEKLY: "2 tuần/lần",
  WEEKLY: "Hàng tuần",
};
const actionTypeColors: Record<string, string> = {
  CREATE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  STATUS_CHANGE:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DEACTIVATE:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  LOGIN: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  ASSIGN:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};
const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

// ── Shared UI components ─────────────────────────────────────────
function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  // ✅ Guard: tránh crash khi name là undefined/null (e.g. API trả về data lỗi)
  const safeName = name ?? "";
  const initials =
    safeName
      .split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
  ];
  const color = colors[(safeName.charCodeAt(0) || 0) % colors.length];
  if (avatarUrl)
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        className="w-full h-full object-cover rounded-2xl"
      />
    );
  return (
    <div
      className={`w-full h-full rounded-2xl ${color} flex items-center justify-center text-white text-3xl font-bold`}
    >
      {initials}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[13px]">
        {value || <span className="text-muted-foreground italic">—</span>}
      </div>
    </div>
  );
}

function Overlay({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
function DlgHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
      <h3 className="text-[16px] font-medium">{title}</h3>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
        <X size={16} />
      </button>
    </div>
  );
}
function DlgFooter({
  onCancel,
  onConfirm,
  label,
  loading,
  variant = "primary",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  label: string;
  loading?: boolean;
  variant?: "primary" | "danger";
}) {
  return (
    <div className="flex justify-end gap-2 p-4 border-t border-border">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition"
      >
        Huỷ
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`px-4 py-2 text-white rounded-lg text-[13px] flex items-center gap-1.5 transition disabled:opacity-50 ${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
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

  const isAdminHR = can("ADMIN", "HR");
  const isAdmin = can("ADMIN");

  // ── Core state ─────────────────────────────────────────────
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [deptOptions, setDeptOptions] = useState<DepartmentOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobTitleOption[]>([]);
  const [allUsersForSelect, setAllUsersForSelect] = useState<ApiUser[]>([]);

  // ── Compensation state ──────────────────────────────────────
  const [compensations, setCompensations] = useState<ApiCompensation[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const compFetched = useRef(false);

  // ── Work shift state ────────────────────────────────────────
  const [workShifts, setWorkShifts] = useState<ApiWorkShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  // Assign shift modal
  const [showAssignShift, setShowAssignShift] = useState(false);
  const [availableShifts, setAvailableShifts] = useState<ApiShift[]>([]);
  const [assignShiftForm, setAssignShiftForm] = useState({
    shiftId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [assigningSavng, setAssigningSavng] = useState(false);
  const shiftsFetched = useRef(false);

  // ── Audit log state ─────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditMode, setAuditMode] = useState<"about" | "by" | "all">("about");
  const AUDIT_LIMIT = 20;

  // ── Dialog states ───────────────────────────────────────────
  const [showEditUser, setShowEditUser] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showStatusAction, setShowStatusAction] = useState<string | null>(null);
  const [showTerminate, setShowTerminate] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch core user ─────────────────────────────────────────
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
      }
    } catch {
      toast.error("Không tải được thông tin nhân viên");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    departmentsService
      .getDepartmentOptions()
      .then(setDeptOptions)
      .catch(() => {});
    jobTitlesService
      .getJobTitleOptions()
      .then(setJobOptions)
      .catch(() => {});
    usersService
      .listUsers({ limit: 200 })
      .then((r) => setAllUsersForSelect(r.items))
      .catch(() => {});
  }, []);

  // ── Lazy fetch: compensation khi vào tab ────────────────────
  const fetchCompensations = useCallback(async () => {
    if (!id || compFetched.current) return;
    setCompLoading(true);
    compFetched.current = true;
    try {
      if (USE_API) {
        const data = await payrollService.getCompensationHistory(id);
        setCompensations(
          Array.isArray(data)
            ? data
            : ((data as { items?: ApiCompensation[] }).items ?? []),
        );
      }
    } catch {
      toast.error("Không tải được lịch sử lương");
    } finally {
      setCompLoading(false);
    }
  }, [id]);

  // ── Lazy fetch: work shifts khi vào tab ─────────────────────
  const fetchWorkShifts = useCallback(async () => {
    if (!id || shiftsFetched.current) return;
    setShiftsLoading(true);
    shiftsFetched.current = true;
    try {
      if (USE_API) {
        const data = await usersService.getUserWorkShifts(id);
        setWorkShifts(data);
      }
    } catch {
      toast.error("Không tải được ca làm việc");
    } finally {
      setShiftsLoading(false);
    }
  }, [id]);

  // ── Fetch audit logs (có pagination + mode) ─────────────────
  const fetchAuditLogs = useCallback(
    async (page: number, mode: "about" | "by" | "all") => {
      if (!id) return;
      setAuditLoading(true);
      try {
        if (USE_API) {
          const data = await usersService.getUserAuditLogs(id, {
            page,
            limit: AUDIT_LIMIT,
            mode,
          });
          setAuditLogs(data.items ?? data.logs ?? []);
          setAuditTotal(data.pagination?.total ?? data.total ?? 0);
        }
      } catch {
        toast.error("Không tải được nhật ký hoạt động");
      } finally {
        setAuditLoading(false);
      }
    },
    [id],
  );

  // Khi đổi tab → lazy load
  useEffect(() => {
    if (activeTab === "compensation") fetchCompensations();
    if (activeTab === "work_shift") fetchWorkShifts();
    if (activeTab === "audit") fetchAuditLogs(auditPage, auditMode);
  }, [activeTab]); // eslint-disable-line

  // Khi đổi page/mode audit
  useEffect(() => {
    if (activeTab === "audit") fetchAuditLogs(auditPage, auditMode);
  }, [auditPage, auditMode]); // eslint-disable-line

  const getDeptName = (dId: string) =>
    deptOptions.find((d) => d.id === dId)?.name ?? dId;
  const getJobName = (jId: string) =>
    jobOptions.find((j) => j.id === jId)?.name ?? jId;

  // ── Handlers ───────────────────────────────────────────────
  const handleUpdateUser = async (data: Partial<ApiUser>) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateUser(
          user.id,
          data as usersService.UpdateUserPayload,
        );
        setUser(updated);
      } else {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
      }
      toast.success("Đã cập nhật thông tin nhân viên");
      setShowEditUser(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateUserProfile(user.id, data);
        setProfile(updated);
      } else {
        setProfile((prev) =>
          prev
            ? { ...prev, ...data }
            : ({ userId: user.id, ...data } as UserProfile),
        );
      }
      toast.success("Đã cập nhật hồ sơ cá nhân");
      setShowEditProfile(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Cập nhật hồ sơ thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAccountStatus = async (newStatus: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.updateAccountStatus(user.id, {
          accountStatus: newStatus as "ACTIVE" | "LOCKED" | "DISABLED",
        });
        // ✅ Guard: chỉ setUser nếu API trả về object hợp lệ có fullName
        // (tránh crash Avatar khi backend trả về null hoặc response không đúng format)
        if (updated && updated.fullName) {
          setUser(updated);
        } else {
          // Fallback: fetch lại user từ server để đảm bảo UI đồng bộ
          await fetchUser();
        }
      } else {
        setUser((prev) =>
          prev ? { ...prev, accountStatus: newStatus } : null,
        );
      }
      toast.success(
        `Đã ${newStatus === "ACTIVE" ? "mở khoá" : newStatus === "LOCKED" ? "khoá" : "vô hiệu hoá"} tài khoản`,
      );
      setShowStatusAction(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Open assign-shift modal + load shift options
  const openAssignShift = async () => {
    setAssignShiftForm({
      shiftId: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      notes: "",
    });
    if (USE_API && availableShifts.length === 0) {
      try {
        const opts = await attendanceService.getShiftOptions();
        setAvailableShifts(opts); // backend đã query isActive=true rồi
      } catch {
        /* ignore */
      }
    }
    setShowAssignShift(true);
  };

  const handleAssignShift = async () => {
    if (!user || !assignShiftForm.shiftId) {
      return;
    }
    setAssigningSavng(true);
    try {
      if (USE_API) {
        await attendanceService.assignUserShift({
          userId: user.id,
          shiftId: assignShiftForm.shiftId,
          effectiveFrom: assignShiftForm.effectiveFrom,
          notes: assignShiftForm.notes || null,
        });
        await fetchWorkShifts();
      }
      toast.success("Đã gắn ca làm việc cho nhân viên");
      setShowAssignShift(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Gán ca làm việc thất bại",
      );
    } finally {
      setAssigningSavng(false);
    }
  };

  const handleTerminate = async (reason: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (USE_API) {
        const updated = await usersService.terminateUser(user.id, { reason });
        setUser(updated);
      } else {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                employmentStatus: "TERMINATED",
                accountStatus: "DISABLED",
              }
            : null,
        );
      }
      toast.success("Đã xử lý nghỉ việc cho nhân viên");
      setShowTerminate(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleResendSetup = async () => {
    if (!user) return;
    try {
      if (USE_API) await usersService.resendSetupEmail(user.id);
      toast.success("Đã gửi lại email kích hoạt tài khoản");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi email thất bại");
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
        <p className="text-muted-foreground text-[14px] mb-4">
          Không tìm thấy nhân viên
        </p>
        <Link
          to="/employees"
          className="text-[13px] text-blue-600 hover:underline flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const managerName = user.managerId
    ? (allUsersForSelect.find((u) => u.id === user.managerId)?.fullName ??
      user.managerId)
    : null;

  const tabs = [
    { key: "info", label: "Thông tin", icon: <UserIcon size={14} /> },
    ...(isAdminHR || user.id === currentUser?.id
      ? [{ key: "profile", label: "Hồ sơ", icon: <Shield size={14} /> }]
      : []),
    ...(isAdminHR
      ? [
          {
            key: "compensation",
            label: "Lịch sử lương",
            icon: <DollarSign size={14} />,
          },
          { key: "components", label: "Phụ cấp", icon: <Wallet size={14} /> },
          { key: "actions", label: "Hành động", icon: <Lock size={14} /> },
          {
            key: "work_shift",
            label: "Ca làm việc",
            icon: <Clock size={14} />,
          },
          { key: "audit", label: "Nhật ký", icon: <ScrollText size={14} /> },
        ]
      : []),
  ];

  const activeComp =
    compensations.find((c) => c.isActive) ?? compensations[0] ?? null;
  const auditTotalPages = Math.ceil(auditTotal / AUDIT_LIMIT);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Back */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
      >
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
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${empStatusColors[user.employmentStatus] ?? ""}`}
            >
              {empStatusLabels[user.employmentStatus] ?? user.employmentStatus}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${accStatusColors[user.accountStatus] ?? ""}`}
            >
              {accStatusLabels[user.accountStatus] ?? user.accountStatus}
            </span>
          </div>
          <div className="text-[13px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <Building2 size={12} />
              {getDeptName(user.departmentId)}
            </span>
            <span>{getJobName(user.jobTitleId)}</span>
            <span className="flex items-center gap-1">
              <Mail size={12} />
              {user.email}
            </span>
            {user.phoneNumber && (
              <span className="flex items-center gap-1">
                <Phone size={12} />
                {user.phoneNumber}
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 flex gap-3">
            <span className="font-mono bg-muted px-2 py-0.5 rounded">
              {user.userCode}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Vào làm:{" "}
              {new Date(user.hireDate).toLocaleDateString("vi-VN")}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={fetchUser}
            className="p-2 rounded-lg border border-border hover:bg-accent transition"
            title="Làm mới"
          >
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          {isAdminHR && (
            <button
              onClick={() => setShowEditUser(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition"
            >
              <Edit2 size={13} /> Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: INFO ─── */}
      {activeTab === "info" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5">
              <UserIcon size={14} /> Thông tin làm việc
            </h3>
            <InfoRow label="Mã nhân viên" value={user.userCode} />
            <InfoRow label="Phòng ban" value={getDeptName(user.departmentId)} />
            <InfoRow label="Chức danh" value={getJobName(user.jobTitleId)} />
            <InfoRow
              label="Quản lý trực tiếp"
              value={managerName ?? undefined}
            />
            <InfoRow
              label="Ngày vào làm"
              value={new Date(user.hireDate).toLocaleDateString("vi-VN")}
            />
            <InfoRow
              label="Loại nhân viên"
              value={empStatusLabels[user.employmentStatus]}
            />
            <InfoRow
              label="Trạng thái TK"
              value={accStatusLabels[user.accountStatus]}
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5">
              <Shield size={14} /> Phân quyền
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(user.roles ?? []).map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                >
                  {r}
                </span>
              ))}
            </div>
            {user.lastLoginAt && (
              <InfoRow
                label="Đăng nhập lần cuối"
                value={new Date(user.lastLoginAt).toLocaleString("vi-VN")}
              />
            )}
            {user.mustChangePassword && (
              <div className="text-[12px] px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                ⚠ Chưa đổi mật khẩu lần đầu
              </div>
            )}
            {isAdminHR && (
              <div className="pt-2">
                <button
                  onClick={handleResendSetup}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition flex items-center gap-1.5"
                >
                  <KeyRound size={12} /> Gửi lại email kích hoạt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: PROFILE ─── */}
      {activeTab === "profile" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium">Hồ sơ cá nhân</h3>
            {(isAdminHR || user.id === currentUser?.id) && (
              <button
                onClick={() => setShowEditProfile(true)}
                className="px-3 py-1.5 rounded-lg border border-border text-[12px] flex items-center gap-1.5 hover:bg-accent transition"
              >
                <Edit2 size={12} /> Chỉnh sửa
              </button>
            )}
          </div>
          {profile ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow
                label="Ngày sinh"
                value={
                  profile.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString("vi-VN")
                    : undefined
                }
              />
              <InfoRow
                label="Giới tính"
                value={genderLabels[profile.gender ?? ""] ?? profile.gender}
              />
              <InfoRow label="CCCD/CMND" value={profile.nationalIdNumber} />
              <InfoRow label="Mã số thuế" value={profile.taxCode} />
              <InfoRow label="Số BHXH" value={profile.socialInsuranceNumber} />
              <InfoRow label="Số BHYT" value={profile.healthInsuranceNumber} />
              <InfoRow label="Ngân hàng" value={profile.bankName} />
              <InfoRow label="Số tài khoản" value={profile.bankAccountNumber} />
              <InfoRow
                label="Chủ tài khoản"
                value={profile.bankAccountHolder}
              />
              <InfoRow
                label="Người liên hệ khẩn"
                value={profile.emergencyContactName}
              />
              <InfoRow
                label="SĐT liên hệ khẩn"
                value={profile.emergencyContactPhone}
              />
              <InfoRow label="Quan hệ" value={profile.emergencyContactRel} />
              <InfoRow
                label="Người phụ thuộc"
                value={String(profile.dependantCount ?? 0)}
              />
              <InfoRow label="Trình độ" value={profile.educationLevel} />
              <InfoRow label="Trường học" value={profile.university} />
              {profile.permanentAddress && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoRow
                    label="Địa chỉ thường trú"
                    value={profile.permanentAddress}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <UserIcon size={32} className="mx-auto opacity-20 mb-2" />
              <p className="text-[13px]">Chưa có thông tin hồ sơ</p>
              {(isAdminHR || user.id === currentUser?.id) && (
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="mt-3 text-[12px] text-blue-600 hover:underline"
                >
                  + Thêm thông tin hồ sơ
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: COMPENSATION ─── */}
      {activeTab === "compensation" && isAdminHR && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] flex items-center gap-2">
              <History size={16} /> Lịch sử lương
            </h3>
          </div>

          {compLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : (
            <>
              {/* Summary card — lương đang áp dụng */}
              {activeComp && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="text-[13px] text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-1">
                    <DollarSign size={14} /> Lương hiện tại
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Lương cơ bản
                      </div>
                      <div className="text-[16px]">
                        {formatFullVND(activeComp.baseSalary)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Loại lương
                      </div>
                      <div className="text-[14px]">
                        {salaryTypeLabels[activeComp.salaryType] ??
                          activeComp.salaryType}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Chu kỳ trả lương
                      </div>
                      <div className="text-[14px]">
                        {payFrequencyLabels[activeComp.payFrequency] ??
                          activeComp.payFrequency}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Ngày trả lương
                      </div>
                      <div className="text-[14px]">
                        {activeComp.payDayOfMonth
                          ? `Ngày ${activeComp.payDayOfMonth} hàng tháng`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Hiệu lực từ
                      </div>
                      <div className="text-[14px]">
                        {new Date(activeComp.effectiveFrom).toLocaleDateString(
                          "vi-VN",
                        )}
                      </div>
                    </div>
                    {activeComp.effectiveTo && (
                      <div>
                        <div className="text-[11px] text-muted-foreground">
                          Hiệu lực đến
                        </div>
                        <div className="text-[14px]">
                          {new Date(activeComp.effectiveTo).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {user.employmentStatus === "PROBATION" &&
                    activeComp.probationSalary && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Thử việc
                        </span>
                        <span className="text-[13px]">
                          Lương thử việc:{" "}
                          <strong>
                            {formatFullVND(activeComp.probationSalary)}
                          </strong>
                        </span>
                        {activeComp.probationEndDate && (
                          <span className="text-[12px] text-muted-foreground">
                            Hết thử việc:{" "}
                            {new Date(
                              activeComp.probationEndDate,
                            ).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Timeline lịch sử */}
              {compensations.length > 0 ? (
                <div className="space-y-2">
                  {compensations.map((comp) => (
                    <div
                      key={comp.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border ${comp.isActive ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10" : "border-border bg-card"}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${comp.isActive ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        <DollarSign size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-medium">
                            {formatFullVND(comp.baseSalary)}
                          </span>
                          {comp.isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              Hiện tại
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {salaryTypeLabels[comp.salaryType] ??
                              comp.salaryType}
                          </span>
                        </div>
                        {comp.changeReason && (
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            {comp.changeReason}
                          </div>
                        )}
                        {comp.notes && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 italic">
                            {comp.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-[12px] text-muted-foreground">
                        <div>
                          Từ{" "}
                          {new Date(comp.effectiveFrom).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                        {comp.effectiveTo && (
                          <div>
                            Đến{" "}
                            {new Date(comp.effectiveTo).toLocaleDateString(
                              "vi-VN",
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-[13px]">
                  <DollarSign size={36} className="mx-auto mb-2 opacity-20" />
                  Chưa có lịch sử lương
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Tab: SALARY COMPONENTS ─── */}
      {activeTab === "components" && isAdminHR && (
        <SalaryComponentsTab userId={user.id} canManage={isAdminHR} />
      )}

      {/* ─── Tab: ACTIONS ─── */}
      {activeTab === "actions" && isAdminHR && (
        <div className="space-y-4">
          {/* Account status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[14px] font-medium flex items-center gap-2 mb-3">
              <Lock size={15} /> Quản lý tài khoản
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3">
              Trạng thái hiện tại:{" "}
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${accStatusColors[user.accountStatus] ?? ""}`}
              >
                {accStatusLabels[user.accountStatus] ?? user.accountStatus}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {user.accountStatus !== "ACTIVE" && (
                <button
                  onClick={() => setShowStatusAction("ACTIVE")}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-emerald-700 transition"
                >
                  <Unlock size={13} /> Mở khoá (ACTIVE)
                </button>
              )}
              {user.accountStatus !== "LOCKED" && (
                <button
                  onClick={() => setShowStatusAction("LOCKED")}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-red-700 transition"
                >
                  <Lock size={13} /> Khoá tài khoản
                </button>
              )}
              {user.accountStatus !== "DISABLED" && (
                <button
                  onClick={() => setShowStatusAction("DISABLED")}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-slate-700 transition"
                >
                  <Ban size={13} /> Vô hiệu hoá
                </button>
              )}
            </div>
          </div>

          {/* Role management */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[14px] font-medium flex items-center gap-2 mb-3">
              <Shield size={15} /> Phân quyền
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(user.roles ?? []).map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                >
                  {r}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              Để thay đổi quyền, liên hệ quản trị hệ thống hoặc dùng API PUT
              /users/:id/roles
            </p>
          </div>

          {/* Terminate */}
          {user.employmentStatus !== "TERMINATED" && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="text-[14px] font-medium flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                <UserX size={15} /> Xử lý nghỉ việc
              </h3>
              <p className="text-[12px] text-muted-foreground mb-3">
                Đặt trạng thái TERMINATED và vô hiệu hoá tài khoản nhân viên.
              </p>
              <button
                onClick={() => setShowTerminate(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-red-700 transition"
              >
                <UserX size={13} /> Xử lý nghỉ việc
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: WORK SHIFT ─── */}
      {activeTab === "work_shift" && isAdminHR && (
        <div className="space-y-5">
          {shiftsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : (
            <>
              {/* Header + Gan ca button */}
              {isAdminHR && (
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-medium flex items-center gap-2">
                    <Clock size={15} /> Ca làm việc
                  </h3>
                  <button
                    onClick={openAssignShift}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] flex items-center gap-1.5 hover:bg-blue-700 transition"
                  >
                    <Plus size={13} /> Gán ca mới
                  </button>
                </div>
              )}

              {/* Ca đang áp dụng */}
              {(() => {
                const activeShift = workShifts.find((s) => s.isActive);
                return (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-[14px] flex items-center gap-2 mb-4">
                      <Clock size={16} /> Ca làm việc hiện tại
                    </h3>
                    {activeShift?.shift ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Tên ca
                          </span>
                          <p className="text-[13px] mt-0.5 font-medium">
                            {activeShift.shift.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Giờ làm việc
                          </span>
                          <p className="text-[13px] mt-0.5">
                            {activeShift.shift.startTime} →{" "}
                            {activeShift.shift.endTime}
                            <span className="text-muted-foreground text-[11px] ml-1">
                              (nghỉ giữa ca {activeShift.shift.breakMinutes}{" "}
                              phút)
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Áp dụng ngày
                          </span>
                          <p className="text-[13px] mt-0.5">
                            {activeShift.dayOfWeek
                              ? DAY_OF_WEEK_LABELS[activeShift.dayOfWeek]
                              : "Tất cả ngày trong tuần"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Hiệu lực từ
                          </span>
                          <p className="text-[13px] mt-0.5">
                            {new Date(
                              activeShift.effectiveFrom,
                            ).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Loại ca
                          </span>
                          <p className="text-[13px] mt-0.5 flex items-center gap-1.5">
                            {activeShift.shift.shiftType}
                            {activeShift.shift.isNightShift && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                Ca đêm
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Thời gian làm việc / ngày
                          </span>
                          <p className="text-[13px] mt-0.5">
                            {Math.round(
                              (activeShift.shift.workMinutes / 60) * 10,
                            ) / 10}{" "}
                            giờ
                          </p>
                        </div>
                        {activeShift.notes && (
                          <div className="sm:col-span-2">
                            <span className="text-[11px] text-muted-foreground">
                              Ghi chú
                            </span>
                            <p className="text-[13px] mt-0.5 text-muted-foreground italic">
                              {activeShift.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock
                          size={40}
                          className="mx-auto text-muted-foreground/20 mb-3"
                        />
                        <p className="text-[13px] text-muted-foreground">
                          Nhân viên này chưa được gán ca làm việc
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Lịch sử ca */}
              {workShifts.length > 1 && (
                <div>
                  <h3 className="text-[14px] flex items-center gap-2 mb-3">
                    <History size={16} /> Lịch sử ca làm việc
                  </h3>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground text-[11px]">
                          <th className="px-4 py-2.5 text-left">Tên ca</th>
                          <th className="px-4 py-2.5 text-left hidden sm:table-cell">
                            Giờ làm
                          </th>
                          <th className="px-4 py-2.5 text-left hidden md:table-cell">
                            Áp dụng ngày
                          </th>
                          <th className="px-4 py-2.5 text-left">Từ ngày</th>
                          <th className="px-4 py-2.5 text-left hidden sm:table-cell">
                            Đến ngày
                          </th>
                          <th className="px-4 py-2.5 text-left">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workShifts.map((ws) => (
                          <tr
                            key={ws.id}
                            className="border-t border-border hover:bg-accent/30"
                          >
                            <td className="px-4 py-3 font-medium">
                              {ws.shift?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                              {ws.shift
                                ? `${ws.shift.startTime}–${ws.shift.endTime}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {ws.dayOfWeek
                                ? DAY_OF_WEEK_LABELS[ws.dayOfWeek]
                                : "Tất cả"}
                            </td>
                            <td className="px-4 py-3">
                              {new Date(ws.effectiveFrom).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                              {ws.effectiveTo
                                ? new Date(ws.effectiveTo).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full ${ws.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                              >
                                {ws.isActive ? "Đang áp dụng" : "Kết thúc"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {workShifts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-[13px]">
                  Không có dữ liệu ca làm việc
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Tab: AUDIT LOG ─── */}
      {activeTab === "audit" && isAdminHR && (
        <div className="space-y-4">
          {/* Header + filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[14px] flex items-center gap-2">
              <ScrollText size={16} /> Nhật ký hoạt động
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">
                Hiển thị:
              </span>
              {(["about", "by", "all"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setAuditMode(m);
                    setAuditPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[12px] transition ${auditMode === m ? "bg-blue-600 text-white" : "border border-border hover:bg-accent"}`}
                >
                  {m === "about"
                    ? "Về nhân viên"
                    : m === "by"
                      ? "Do nhân viên"
                      : "Tất cả"}
                </button>
              ))}
            </div>
          </div>

          {auditLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : auditLogs.length > 0 ? (
            <>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-border hover:bg-accent/20 transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar actor */}
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] shrink-0 mt-0.5 font-medium">
                        {log.actorUser?.fullName
                          ?.split(" ")
                          .slice(-1)[0]?.[0]
                          ?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium">
                            {log.actorUser?.fullName ?? "—"}
                          </span>
                          {log.actorUser?.userCode && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {log.actorUser.userCode}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${actionTypeColors[log.actionType] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                          >
                            {log.actionType}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {log.entityType}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            {log.description}
                          </p>
                        )}
                        {(log.oldValues || log.newValues) && (
                          <div className="mt-2 flex gap-3 flex-wrap">
                            {log.oldValues && (
                              <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 flex-1 min-w-[140px]">
                                <div className="text-[10px] text-red-500 mb-0.5 font-medium">
                                  Giá trị cũ
                                </div>
                                <pre className="text-[10px] whitespace-pre-wrap text-red-700 dark:text-red-300">
                                  {JSON.stringify(log.oldValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2 flex-1 min-w-[140px]">
                                <div className="text-[10px] text-green-500 mb-0.5 font-medium">
                                  Giá trị mới
                                </div>
                                <pre className="text-[10px] whitespace-pre-wrap text-green-700 dark:text-green-300">
                                  {JSON.stringify(log.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-[11px] text-muted-foreground">
                        <div>
                          {new Date(log.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                        <div>
                          {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {log.ipAddress && (
                          <div className="text-[10px] font-mono mt-0.5">
                            {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {auditTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[12px] text-muted-foreground">
                    {(auditPage - 1) * AUDIT_LIMIT + 1}–
                    {Math.min(auditPage * AUDIT_LIMIT, auditTotal)} /{" "}
                    {auditTotal} bản ghi
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40 transition"
                    >
                      <ChevronUp size={14} className="rotate-[-90deg]" />
                    </button>
                    <span className="text-[12px] px-2">
                      {auditPage} / {auditTotalPages}
                    </span>
                    <button
                      onClick={() =>
                        setAuditPage((p) => Math.min(auditTotalPages, p + 1))
                      }
                      disabled={auditPage === auditTotalPages}
                      className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40 transition"
                    >
                      <ChevronDown size={14} className="rotate-[-90deg]" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-[13px]">
              <ScrollText size={36} className="mx-auto mb-2 opacity-20" />
              Chưa có nhật ký nào liên quan
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ── */}
      {showEditUser && (
        <Overlay onClose={() => setShowEditUser(false)} wide>
          <DlgHeader
            title="Cập nhật thông tin nhân viên"
            onClose={() => setShowEditUser(false)}
          />
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

      {showEditProfile && (
        <Overlay onClose={() => setShowEditProfile(false)} wide>
          <DlgHeader
            title="Chỉnh sửa hồ sơ cá nhân"
            onClose={() => setShowEditProfile(false)}
          />
          <EditProfileForm
            profile={profile}
            onSave={handleUpdateProfile}
            saving={saving}
            onCancel={() => setShowEditProfile(false)}
          />
        </Overlay>
      )}

      {showStatusAction && (
        <Overlay onClose={() => setShowStatusAction(null)}>
          <DlgHeader
            title="Xác nhận thay đổi trạng thái"
            onClose={() => setShowStatusAction(null)}
          />
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">
              Bạn có chắc muốn chuyển tài khoản của{" "}
              <strong>{user.fullName}</strong> sang trạng thái{" "}
              <strong>{accStatusLabels[showStatusAction]}</strong>?
            </p>
          </div>
          <DlgFooter
            onCancel={() => setShowStatusAction(null)}
            onConfirm={() => handleAccountStatus(showStatusAction)}
            label="Xác nhận"
            loading={saving}
            variant={showStatusAction === "ACTIVE" ? "primary" : "danger"}
          />
        </Overlay>
      )}

      {showTerminate && (
        <Overlay onClose={() => setShowTerminate(false)}>
          <DlgHeader
            title="Xử lý nghỉ việc"
            onClose={() => setShowTerminate(false)}
          />
          <TerminateForm
            userName={user.fullName}
            onSave={handleTerminate}
            saving={saving}
            onCancel={() => setShowTerminate(false)}
          />
        </Overlay>
      )}

      {/* ── Assign Shift Modal ─────────────────────────────────── */}
      {showAssignShift && (
        <Overlay onClose={() => setShowAssignShift(false)}>
          <DlgHeader
            title="Gán ca làm việc"
            onClose={() => setShowAssignShift(false)}
          />
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Chọn ca *
              </label>
              <select
                value={assignShiftForm.shiftId}
                onChange={(e) =>
                  setAssignShiftForm((p) => ({ ...p, shiftId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn ca --</option>
                {availableShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} – {s.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Hiệu lực từ *
              </label>
              <input
                type="date"
                value={assignShiftForm.effectiveFrom}
                onChange={(e) =>
                  setAssignShiftForm((p) => ({
                    ...p,
                    effectiveFrom: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                value={assignShiftForm.notes}
                onChange={(e) =>
                  setAssignShiftForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="VD: Chuyển ca theo yêu cầu..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={() => setShowAssignShift(false)}
              className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition"
            >
              Huỷ
            </button>
            <button
              onClick={handleAssignShift}
              disabled={assigningSavng || !assignShiftForm.shiftId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {assigningSavng && <Loader2 size={13} className="animate-spin" />}{" "}
              Gán ca
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ── EditUserForm ────────────────────────────────────────────────
function EditUserForm({
  user,
  deptOptions,
  jobOptions,
  allUsers,
  onSave,
  saving,
  onCancel,
}: {
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
    phoneNumber: user.phoneNumber ?? "",
    departmentId: user.departmentId,
    jobTitleId: user.jobTitleId,
    managerId: user.managerId ?? "",
    hireDate: user.hireDate ? user.hireDate.split("T")[0] : "",
    employmentStatus: user.employmentStatus,
  });
  return (
    <>
      <div className="p-5 space-y-3">
        {[
          { label: "Họ và tên *", key: "fullName", type: "text" },
          { label: "Số điện thoại", key: "phoneNumber", type: "tel" },
          { label: "Ngày vào làm", key: "hireDate", type: "date" },
        ].map((fi) => (
          <div key={fi.key}>
            <label className="text-[12px] text-muted-foreground block mb-1">
              {fi.label}
            </label>
            <input
              type={fi.type}
              value={(f as Record<string, string>)[fi.key]}
              onChange={(e) =>
                setF((p) => ({ ...p, [fi.key]: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Phòng ban *
          </label>
          <select
            value={f.departmentId}
            onChange={(e) =>
              setF((p) => ({ ...p, departmentId: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Chức danh *
          </label>
          <select
            value={f.jobTitleId}
            onChange={(e) =>
              setF((p) => ({ ...p, jobTitleId: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Quản lý trực tiếp
          </label>
          <select
            value={f.managerId}
            onChange={(e) => setF((p) => ({ ...p, managerId: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            <option value="">-- Không có --</option>
            {allUsers
              .filter((u) => u.id !== user.id)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.userCode})
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Trạng thái làm việc
          </label>
          <select
            value={f.employmentStatus}
            onChange={(e) =>
              setF((p) => ({ ...p, employmentStatus: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            <option value="PROBATION">Thử việc</option>
            <option value="ACTIVE">Chính thức</option>
            <option value="ON_LEAVE">Nghỉ phép dài hạn</option>
          </select>
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() => {
          if (!f.fullName || !f.departmentId || !f.jobTitleId) {
            toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
            return;
          }
          onSave({ ...f, managerId: f.managerId || null });
        }}
        label="Lưu thay đổi"
        loading={saving}
      />
    </>
  );
}

// ── EditProfileForm ─────────────────────────────────────────────
function EditProfileForm({
  profile,
  onSave,
  saving,
  onCancel,
}: {
  profile: UserProfile | null;
  onSave: (d: Partial<UserProfile>) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
    gender: profile?.gender ?? "",
    nationalIdNumber: profile?.nationalIdNumber ?? "",
    taxCode: profile?.taxCode ?? "",
    socialInsuranceNumber: profile?.socialInsuranceNumber ?? "",
    healthInsuranceNumber: profile?.healthInsuranceNumber ?? "",
    bankName: profile?.bankName ?? "",
    bankAccountNumber: profile?.bankAccountNumber ?? "",
    bankAccountHolder: profile?.bankAccountHolder ?? "",
    permanentAddress: profile?.permanentAddress ?? "",
    emergencyContactName: profile?.emergencyContactName ?? "",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "",
    emergencyContactRel: profile?.emergencyContactRel ?? "",
    dependantCount: String(profile?.dependantCount ?? 0),
    educationLevel: profile?.educationLevel ?? "",
    educationMajor: profile?.educationMajor ?? "",
    university: profile?.university ?? "",
  });
  const inp = (label: string, key: keyof typeof f, type = "text") => (
    <div>
      <label className="text-[11px] text-muted-foreground block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={f[key]}
        onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
  return (
    <>
      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">
          Thông tin cơ bản
        </p>
        <div className="grid grid-cols-2 gap-3">
          {inp("Ngày sinh", "dateOfBirth", "date")}
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Giới tính
            </label>
            <select
              value={f.gender}
              onChange={(e) => setF((p) => ({ ...p, gender: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
            >
              <option value="">-- Chọn --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
              <option value="UNDISCLOSED">Không tiết lộ</option>
            </select>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">
          Giấy tờ
        </p>
        <div className="grid grid-cols-2 gap-3">
          {inp("Số CCCD/CMND", "nationalIdNumber")}
          {inp("Mã số thuế", "taxCode")}
          {inp("Số BHXH", "socialInsuranceNumber")}
          {inp("Số BHYT", "healthInsuranceNumber")}
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">
          Ngân hàng
        </p>
        <div className="grid grid-cols-3 gap-3">
          {inp("Ngân hàng", "bankName")}
          {inp("Số tài khoản", "bankAccountNumber")}
          {inp("Chủ tài khoản", "bankAccountHolder")}
        </div>
        {inp("Địa chỉ thường trú", "permanentAddress")}
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">
          Liên hệ khẩn cấp
        </p>
        <div className="grid grid-cols-3 gap-3">
          {inp("Họ tên", "emergencyContactName")}
          {inp("Số điện thoại", "emergencyContactPhone")}
          {inp("Quan hệ", "emergencyContactRel")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp("Số người phụ thuộc", "dependantCount", "number")}
        </div>
        <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide pt-1">
          Học vấn
        </p>
        <div className="grid grid-cols-3 gap-3">
          {inp("Trình độ", "educationLevel")}
          {inp("Chuyên ngành", "educationMajor")}
          {inp("Trường", "university")}
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() =>
          onSave({
            ...f,
            dependantCount: parseInt(f.dependantCount) || 0,
            gender:
              (f.gender as
                | "MALE"
                | "FEMALE"
                | "OTHER"
                | "UNDISCLOSED"
                | undefined) || undefined,
          })
        }
        label="Lưu hồ sơ"
        loading={saving}
      />
    </>
  );
}

// ── TerminateForm ───────────────────────────────────────────────
function TerminateForm({
  userName,
  onSave,
  saving,
  onCancel,
}: {
  userName: string;
  onSave: (r: string) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="p-5 space-y-3">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div className="text-[12px] text-red-700 dark:text-red-400">
            Đang xử lý nghỉ việc cho <strong>{userName}</strong>. Hành động này
            sẽ:
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li>Đặt trạng thái TERMINATED</li>
              <li>Vô hiệu hoá tài khoản</li>
            </ul>
          </div>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground block mb-1">
            Lý do nghỉ việc *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="VD: Xin nghỉ theo nguyện vọng cá nhân..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
      <DlgFooter
        onCancel={onCancel}
        onConfirm={() => {
          if (!reason.trim()) {
            toast.error("Vui lòng nhập lý do");
            return;
          }
          onSave(reason.trim());
        }}
        label="Xác nhận nghỉ việc"
        loading={saving}
        variant="danger"
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SalaryComponentsTab
// ═══════════════════════════════════════════════════════════════
function SalaryComponentsTab({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const [components, setComponents] = useState<ApiUserSalaryComponent[]>([]);
  const [options, setOptions] = useState<ApiSalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fmtVND = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const [comps, opts] = await Promise.all([
        payrollService.getUserSalaryComponents(userId),
        payrollService.getSalaryComponentOptions(),
      ]);
      setComponents(comps);
      setOptions(opts);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleRemove = async (id: string, name: string) => {
    try {
      await payrollService.removeUserSalaryComponent(id);
      toast.success(`Đã gỡ phụ cấp ${name}`);
      fetchComponents();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  const handleAssign = async (
    payload: Parameters<typeof payrollService.assignSalaryComponent>[0],
  ) => {
    try {
      await payrollService.assignSalaryComponent(payload);
      toast.success("Đã gán phụ cấp");
      setShowAdd(false);
      fetchComponents();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể gán phụ cấp",
      );
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-[13px]">Đang tải...</span>
      </div>
    );

  const activeComponents = components.filter((c) => c.isActive);
  const totalActive = activeComponents.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] flex items-center gap-2">
          <Wallet size={16} /> Phụ cấp đang áp dụng
        </h3>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] px-3 py-1.5 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={13} /> Gán phụ cấp
          </button>
        )}
      </div>
      {components.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Wallet size={32} className="mx-auto mb-2 opacity-20" />
          <div className="text-[13px]">Nhân viên này chưa có phụ cấp nào</div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Tên phụ cấp
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Mã
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Loại
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">
                    Số tiền
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Hiệu lực từ
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    Kết thúc
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">
                    Trạng thái
                  </th>
                  {canManage && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-accent/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      {c.salaryComponent?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground hidden md:table-cell">
                      {c.salaryComponent?.code}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${c.salaryComponent?.componentType === "EARNING" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                      >
                        {c.salaryComponent?.componentType === "EARNING"
                          ? "Phụ cấp"
                          : "Khấu trừ"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(c as Record<string, unknown>).isPercentage ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {c.amount}%
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          {fmtVND(c.amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                      {fmtDate(c.effectiveFrom)}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                      {fmtDate(c.effectiveTo)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400"}`}
                      >
                        {c.isActive ? "Đang áp dụng" : "Hết hạn"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        {c.isActive && (
                          <button
                            onClick={() =>
                              handleRemove(c.id, c.salaryComponent?.name ?? "")
                            }
                            title="Gỡ phụ cấp"
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <X size={13} className="text-red-500" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-1 text-[12px] text-muted-foreground">
            <span>{activeComponents.length} phụ cấp đang hoạt động</span>
            <span>
              Tổng:{" "}
              <strong className="text-foreground">{fmtVND(totalActive)}</strong>
            </span>
          </div>
        </>
      )}
      {showAdd && (
        <AssignComponentDialog
          options={options}
          existingIds={components
            .filter((c) => c.isActive)
            .map((c) => c.salaryComponent?.id ?? "")}
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSave={handleAssign}
        />
      )}
    </div>
  );
}

// ── AssignComponentDialog ───────────────────────────────────────
function AssignComponentDialog({
  options,
  existingIds,
  userId,
  onClose,
  onSave,
}: {
  options: ApiSalaryComponent[];
  existingIds: string[];
  userId: string;
  onClose: () => void;
  onSave: (
    p: Parameters<typeof payrollService.assignSalaryComponent>[0],
  ) => void;
}) {
  const [compSearch, setCompSearch] = useState("");
  const [compDropdownOpen, setCompDropdownOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<ApiSalaryComponent | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [isPercentage, setIsPercentage] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [effectiveTo, setEffectiveTo] = useState("");
  const [notes, setNotes] = useState("");

  const fmtVND = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  const available = options.filter(
    (o) => o.isActive && !existingIds.includes(o.id),
  );
  const filtered = available.filter((o) => {
    if (!compSearch) return true;
    const s = compSearch.toLowerCase();
    return o.name.toLowerCase().includes(s) || o.code.toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-[440px]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Gán thành phần lương</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <label className="block text-[12px] text-muted-foreground mb-1">
              Thành phần lương *{" "}
              {selectedComp && <span className="text-green-600">✓</span>}
            </label>
            {selectedComp ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500 bg-input-background">
                <span className="text-[13px] flex-1">{selectedComp.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                  {selectedComp.code}
                </span>
                <button
                  onClick={() => {
                    setSelectedComp(null);
                    setCompDropdownOpen(true);
                  }}
                  className="text-[11px] text-blue-600 hover:underline ml-1"
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc mã phụ cấp..."
                  value={compSearch}
                  onChange={(e) => {
                    setCompSearch(e.target.value);
                    setCompDropdownOpen(true);
                  }}
                  onFocus={() => setCompDropdownOpen(true)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                />
                {compDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setCompDropdownOpen(false)}
                    />
                    <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-40 overflow-y-auto">
                      {filtered.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setSelectedComp(o);
                            setCompDropdownOpen(false);
                            setCompSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-[12px]"
                        >
                          <span className="flex-1 truncate">{o.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                            {o.code}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${o.componentType === "EARNING" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                          >
                            {o.componentType === "EARNING"
                              ? "Phụ cấp"
                              : "Khấu trừ"}
                          </span>
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <div className="px-3 py-2 text-[12px] text-muted-foreground">
                          {available.length === 0
                            ? "Tất cả phụ cấp đã được gán"
                            : "Không tìm thấy"}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* isPercentage toggle + amount */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1.5">
              Kiểu giá trị *
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden mb-2">
              <button
                type="button"
                onClick={() => setIsPercentage(false)}
                className={`flex-1 py-2 text-[12px] transition-colors ${!isPercentage ? "bg-blue-600 text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}
              >
                Số tiền cố định (đ)
              </button>
              <button
                type="button"
                onClick={() => setIsPercentage(true)}
                className={`flex-1 py-2 text-[12px] transition-colors ${isPercentage ? "bg-blue-600 text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}
              >
                % lương cơ bản
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={
                  isPercentage ? "VD: 8 (= 8% lương CB)" : "VD: 500000"
                }
                className="w-full px-3 py-2 pr-12 rounded-lg border border-border bg-input-background text-[13px]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">
                {isPercentage ? "%" : "đ"}
              </span>
            </div>
            {amount && !isPercentage && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {fmtVND(parseFloat(amount) || 0)}
              </div>
            )}
            {amount && isPercentage && (
              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                = {parseFloat(amount) || 0}% của lương cơ bản nhân viên
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày hiệu lực *
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Ngày kết thúc{" "}
                <span className="text-[10px]">— để trống = không giới hạn</span>
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">
              Ghi chú <span className="text-[10px]">— tuỳ chọn</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Nhập ghi chú..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
          >
            Huỷ
          </button>
          <button
            onClick={() => {
              const amt = parseFloat(amount);
              if (!selectedComp) {
                toast.error("Chọn thành phần lương");
                return;
              }
              if (!amt || amt <= 0) {
                toast.error("Nhập số tiền hợp lệ");
                return;
              }
              if (!effectiveFrom) {
                toast.error("Chọn ngày hiệu lực");
                return;
              }
              onSave({
                userId,
                salaryComponentId: selectedComp.id,
                amount: amt,
                isPercentage,
                effectiveFrom,
                effectiveTo: effectiveTo || null,
                notes: notes || null,
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
