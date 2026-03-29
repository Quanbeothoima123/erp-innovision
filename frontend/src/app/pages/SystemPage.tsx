import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import * as systemService from "../../lib/services/system.service";
import * as usersService from "../../lib/services/users.service";
import type { ApiUser } from "../../lib/services/auth.service";
import type {
  ApiAuditLog,
  ApiSystemConfig,
} from "../../lib/services/system.service";
import { ApiError } from "../../lib/apiClient";
import {
  Shield,
  Lock,
  RotateCcw,
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  KeyRound,
  ChevronDown,
  ArrowRight,
  Clock,
  RefreshCcw,
  AlertTriangle,
  Activity,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Building2,
  Pencil,
  ScrollText,
  Loader2,
  Sunrise,
  Sun,
  Moon,
  Zap,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
type RoleCode =
  | "ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE"
  | "SALES"
  | "ACCOUNTANT"
  | "DIRECTOR";

// ─── CONFIG constants (used by SystemConfigPage) ──────────────
const CONFIG_LABELS: Record<string, string> = {
  company_name: "Tên công ty",
  company_address: "Địa chỉ công ty",
  default_timezone: "Múi giờ mặc định",
  work_hours_per_day: "Giờ làm việc / ngày",
  work_days_per_week: "Ngày làm việc / tuần",
  default_annual_leave_days: "Ngày phép năm mặc định",
  max_failed_login_attempts: "Số lần đăng nhập sai tối đa",
  session_timeout_minutes: "Thời gian session (phút)",
  late_tolerance_minutes: "Phút trễ được bỏ qua",
  payslip_visible_days_before_payday: "Ngày xem payslip trước hạn trả",
};
const TIMEZONE_OPTIONS = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "UTC",
];
const NUMBER_CONFIGS: Record<string, { min: number; max: number }> = {
  work_hours_per_day: { min: 1, max: 24 },
  work_days_per_week: { min: 1, max: 7 },
  default_annual_leave_days: { min: 0, max: 365 },
  max_failed_login_attempts: { min: 1, max: 20 },
  session_timeout_minutes: { min: 5, max: 10080 },
  late_tolerance_minutes: { min: 0, max: 60 },
  payslip_visible_days_before_payday: { min: 0, max: 30 },
};
const CONFIG_GROUPS: {
  title: string;
  icon: React.ReactNode;
  keys: string[];
}[] = [
  {
    title: "Thông tin công ty",
    icon: <Building2 size={16} />,
    keys: ["company_name", "company_address"],
  },
  {
    title: "Thời gian & làm việc",
    icon: <Clock size={16} />,
    keys: ["default_timezone", "work_hours_per_day", "work_days_per_week"],
  },
  {
    title: "Nhân sự",
    icon: <Users size={16} />,
    keys: [
      "default_annual_leave_days",
      "late_tolerance_minutes",
      "payslip_visible_days_before_payday",
    ],
  },
  {
    title: "Bảo mật",
    icon: <Shield size={16} />,
    keys: ["max_failed_login_attempts", "session_timeout_minutes"],
  },
];

// ─── Shared UI helpers ────────────────────────────────────────
function Overlay({
  children,
  onClose,
  narrow,
}: {
  children: React.ReactNode;
  onClose: () => void;
  narrow?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${narrow ? "max-w-sm" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
function DlgHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
      <h3 className="text-[16px]">{title}</h3>
      <button onClick={onClose} className="p-1 rounded hover:bg-accent">
        <X size={18} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS & ROLE MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════
const accStatusColors: Record<string, string> = {
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOCKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DISABLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};
const accStatusLabels: Record<string, string> = {
  ACTIVE: "Hoạt động",
  PENDING: "Chờ kích hoạt",
  LOCKED: "Đã khoá",
  DISABLED: "Vô hiệu",
};
const ALL_ROLES: {
  code: RoleCode;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    code: "ADMIN",
    label: "Admin",
    desc: "Toàn quyền hệ thống",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    code: "HR",
    label: "Nhân sự",
    desc: "Quản lý nhân viên, chấm công, nghỉ phép",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    code: "MANAGER",
    label: "Quản lý",
    desc: "Quản lý team, duyệt yêu cầu",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    code: "EMPLOYEE",
    label: "Nhân viên",
    desc: "Vai trò cơ bản",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    code: "SALES",
    label: "Kinh doanh",
    desc: "Quản lý KH, hợp đồng",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    code: "ACCOUNTANT",
    label: "Kế toán",
    desc: "Quản lý tài chính, hóa đơn",
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
];

export function AccountsPage() {
  const { currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [roleDialogUser, setRoleDialogUser] = useState<string | null>(null);
  const [lockDialogUser, setLockDialogUser] = useState<string | null>(null);
  const [resetDialogUser, setResetDialogUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersService.listUsers({ limit: 500 });
      setAllUsers(res.items);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách tài khoản",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  let filtered = allUsers;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.fullName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.userCode.toLowerCase().includes(s),
    );
  }
  if (statusFilter)
    filtered = filtered.filter((u) => u.accountStatus === statusFilter);
  if (roleFilter)
    filtered = filtered.filter((u) => u.roles.includes(roleFilter as RoleCode));

  const hasFilters = search || statusFilter || roleFilter;

  // Stats
  const total = allUsers.length;
  const active = allUsers.filter((u) => u.accountStatus === "ACTIVE").length;
  const locked = allUsers.filter((u) => u.accountStatus === "LOCKED").length;

  const handleToggleRole = async (userId: string, role: RoleCode) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;
    const newRoles = user.roles.includes(role)
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];
    if (newRoles.length === 0) {
      toast.error("Người dùng phải có ít nhất 1 vai trò");
      return;
    }
    setActionLoading(true);
    try {
      await usersService.updateUserRoles(userId, { roles: newRoles });
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: newRoles } : u)),
      );
      toast.success(`Đã cập nhật vai trò cho ${user.fullName}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Cập nhật vai trò thất bại",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockToggle = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = user.accountStatus === "LOCKED" ? "ACTIVE" : "LOCKED";
    setActionLoading(true);
    try {
      await usersService.updateAccountStatus(userId, {
        accountStatus: newStatus as "ACTIVE" | "LOCKED" | "DISABLED",
      });
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, accountStatus: newStatus } : u,
        ),
      );
      toast.success(
        `Đã ${newStatus === "LOCKED" ? "khoá" : "mở khoá"} tài khoản ${user.fullName}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setActionLoading(false);
      setLockDialogUser(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;
    setActionLoading(true);
    try {
      await usersService.resendSetupEmail(userId);
      toast.success(`Đã gửi email đặt lại mật khẩu cho ${user.fullName}.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Reset mật khẩu thất bại",
      );
    } finally {
      setActionLoading(false);
      setResetDialogUser(null);
    }
  };

  const roleDialogUserObj = roleDialogUser
    ? allUsers.find((u) => u.id === roleDialogUser)
    : null;
  const lockDialogUserObj = lockDialogUser
    ? allUsers.find((u) => u.id === lockDialogUser)
    : null;
  const resetDialogUserObj = resetDialogUser
    ? allUsers.find((u) => u.id === resetDialogUser)
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Tài khoản & Phân quyền</h1>

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Đang tải...
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              Tổng tài khoản
            </div>
            <div className="text-[20px]">{total}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <UserCheck size={20} className="text-green-600" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              Đang hoạt động
            </div>
            <div className="text-[20px] text-green-600">{active}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Lock size={20} className="text-red-600" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Đã khoá</div>
            <div className="text-[20px] text-red-500">{locked}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm tên, email, mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả TT</option>
          {Object.entries(accStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tất cả role</option>
          {ALL_ROLES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setRoleFilter("");
            }}
            className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent"
          >
            Xoá lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                  Nhân viên
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                  Phòng ban
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                  Vai trò
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                  Tài khoản
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                  Đăng nhập cuối
                </th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">
                          {u.fullName.split(" ").slice(-1)[0][0]}
                        </div>
                        <div>
                          <span className="text-[13px]">{u.fullName}</span>
                          <div className="text-[10px] text-muted-foreground">
                            {u.userCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-[13px] hidden lg:table-cell">
                      {(u as any).department?.name || u.departmentId || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => {
                          const roleInfo = ALL_ROLES.find(
                            (ar) => ar.code === r,
                          );
                          return (
                            <span
                              key={r}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${roleInfo?.color || "bg-gray-100 text-gray-700"}`}
                            >
                              {roleInfo?.label || r}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${accStatusColors[u.accountStatus]}`}
                        >
                          {accStatusLabels[u.accountStatus]}
                        </span>
                        {u.mustChangePassword && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Đổi MK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => setRoleDialogUser(u.id)}
                          title="Quản lý vai trò"
                          className="p-1.5 rounded-lg hover:bg-accent text-blue-600"
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => setLockDialogUser(u.id)}
                          title={
                            u.accountStatus === "LOCKED" ? "Mở khoá" : "Khoá"
                          }
                          className={`p-1.5 rounded-lg hover:bg-accent ${u.accountStatus === "LOCKED" ? "text-green-600" : "text-red-500"}`}
                        >
                          {u.accountStatus === "LOCKED" ? (
                            <UserCheck size={14} />
                          ) : (
                            <Lock size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => setResetDialogUser(u.id)}
                          title="Reset mật khẩu"
                          className="p-1.5 rounded-lg hover:bg-accent text-orange-500"
                        >
                          <KeyRound size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground text-[13px]"
                  >
                    Không tìm thấy tài khoản
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">
          {filtered.length} tài khoản
        </div>
      </div>

      {/* Role Management Dialog */}
      {roleDialogUserObj && (
        <Overlay onClose={() => setRoleDialogUser(null)}>
          <DlgHeader
            title={`Quản lý vai trò — ${roleDialogUserObj.fullName}`}
            onClose={() => setRoleDialogUser(null)}
          />
          <div className="p-4 space-y-3">
            <div className="text-[12px] text-muted-foreground mb-2">
              Nhấn vào vai trò để gán/bỏ gán. Người dùng phải có ít nhất 1 vai
              trò.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => {
                const has = roleDialogUserObj.roles.includes(r.code);
                return (
                  <button
                    key={r.code}
                    onClick={() =>
                      handleToggleRole(roleDialogUserObj.id, r.code)
                    }
                    className={`p-3 rounded-xl border-2 text-left transition-all ${has ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-border hover:border-blue-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[12px] px-2 py-0.5 rounded ${r.color}`}
                      >
                        {r.label}
                      </span>
                      {has && <Check size={16} className="text-blue-600" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {r.desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-[12px] text-muted-foreground">
              Vai trò hiện tại:{" "}
              <span className="text-foreground">
                {roleDialogUserObj.roles
                  .map((r) => ALL_ROLES.find((ar) => ar.code === r)?.label || r)
                  .join(", ")}
              </span>
            </div>
          </div>
        </Overlay>
      )}

      {/* Lock/Unlock Confirm Dialog */}
      {lockDialogUserObj && (
        <Overlay onClose={() => setLockDialogUser(null)} narrow>
          <div className="p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${lockDialogUserObj.accountStatus === "LOCKED" ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`}
            >
              {lockDialogUserObj.accountStatus === "LOCKED" ? (
                <UserCheck size={28} className="text-green-600" />
              ) : (
                <Lock size={28} className="text-red-500" />
              )}
            </div>
            <h3 className="text-[16px]">
              {lockDialogUserObj.accountStatus === "LOCKED"
                ? "Mở khoá"
                : "Khoá"}{" "}
              tài khoản?
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {lockDialogUserObj.accountStatus === "LOCKED"
                ? `Mở khoá tài khoản cho ${lockDialogUserObj.fullName}. Người dùng sẽ có thể đăng nhập lại.`
                : `Khoá tài khoản ${lockDialogUserObj.fullName}. Người dùng sẽ không thể đăng nhập.`}
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setLockDialogUser(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleLockToggle(lockDialogUserObj.id)}
                className={`px-4 py-2 rounded-lg text-white text-[13px] ${lockDialogUserObj.accountStatus === "LOCKED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {lockDialogUserObj.accountStatus === "LOCKED"
                  ? "Mở khoá"
                  : "Khoá tài khoản"}
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
              Đặt lại mật khẩu cho{" "}
              <strong>{resetDialogUserObj.fullName}</strong>.<br />
              Mật khẩu mặc định:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-[12px]">
                TechVN@2025
              </code>
              <br />
              Người dùng sẽ được yêu cầu đổi mật khẩu ngay lần đăng nhập tiếp
              theo.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setResetDialogUser(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleResetPassword(resetDialogUserObj.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-[13px] hover:bg-orange-700"
              >
                Reset mật khẩu
              </button>
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
const shiftTypeLabels: Record<string, string> = {
  MORNING: "Sáng",
  AFTERNOON: "Chiều",
  NIGHT: "Đêm",
  FLEXIBLE: "Linh hoạt",
  SPLIT: "Chia ca",
};
const shiftTypeIcons: Record<string, React.ReactNode> = {
  MORNING: <Sunrise size={14} className="text-yellow-500" />,
  AFTERNOON: <Sun size={14} className="text-orange-500" />,
  NIGHT: <Moon size={14} className="text-indigo-500" />,
  FLEXIBLE: <Zap size={14} className="text-green-500" />,
  SPLIT: <RefreshCcw size={14} className="text-blue-500" />,
};

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG PAGE — Enhanced with diff view & timeline
// ═══════════════════════════════════════════════════════════════
const actionColors: Record<string, string> = {
  CREATE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  UPDATE_ROLE:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  APPROVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LOGIN:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  LOCK_ACCOUNT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  UNLOCK_ACCOUNT:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  RESET_PASSWORD:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  TERMINATE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  STATUS_CHANGE:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCEL: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  SUBMIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
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
  const { can } = useAuth();
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await systemService.listAuditLogs({
          page: p,
          limit: 30,
          ...(entityFilter && { entityType: entityFilter }),
          ...(actionFilter && { actionType: actionFilter }),
        });
        setLogs(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [entityFilter, actionFilter],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const displayed = useMemo(() => {
    if (!search) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.description.toLowerCase().includes(s) ||
        l.actor?.fullName.toLowerCase().includes(s),
    );
  }, [logs, search]);

  const actionTypeColors: Record<string, string> = {
    CREATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    UPDATE:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    STATUS_CHANGE:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    TERMINATE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    PASSWORD_RESET:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    LOGIN: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    LOGOUT: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] flex items-center gap-2">
          <ScrollText size={20} /> Nhật ký hệ thống
        </h1>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="p-2 border border-border rounded-lg hover:bg-accent"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tim mo ta, actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tat ca entity</option>
          {[
            "USER",
            "DEPARTMENT",
            "LEAVE",
            "ATTENDANCE",
            "OVERTIME",
            "PAYROLL",
            "PROJECT",
            "CONTRACT",
            "INVOICE",
          ].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        >
          <option value="">Tat ca action</option>
          {[
            "CREATE",
            "UPDATE",
            "DELETE",
            "STATUS_CHANGE",
            "LOGIN",
            "LOGOUT",
            "PASSWORD_RESET",
            "TERMINATE",
          ].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />{" "}
          <span className="text-[13px]">Dang tai...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Thoi gian
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Actor
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Hanh dong
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                    Entity
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">
                    Mo ta
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-border hover:bg-accent/30 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px]">
                        {log.actor?.fullName ?? "System"}
                      </div>
                      {log.actor && (
                        <div className="text-[10px] text-muted-foreground">
                          {log.actor.userCode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "text-[10px] px-1.5 py-0.5 rounded " +
                          (actionTypeColors[log.actionType] ??
                            "bg-gray-100 text-gray-600")
                        }
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 text-[12px] max-w-[300px] truncate">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Eye size={13} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Chua co du lieu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border flex items-center justify-between">
            <span>{total} ban ghi</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLogs(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-border text-[11px] disabled:opacity-50 hover:bg-accent"
                >
                  Truoc
                </button>
                <span className="px-2 py-1 text-[11px]">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => fetchLogs(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-border text-[11px] disabled:opacity-50 hover:bg-accent"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-[16px]">Chi tiết nhật ký</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded hover:bg-accent"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Thoi gian",
                    value: new Date(selectedLog.createdAt).toLocaleString(
                      "vi-VN",
                    ),
                  },
                  {
                    label: "Actor",
                    value: selectedLog.actor?.fullName ?? "System",
                  },
                  { label: "Hanh dong", value: selectedLog.actionType },
                  { label: "Entity", value: selectedLog.entityType },
                  { label: "Entity ID", value: selectedLog.entityId ?? "—" },
                  { label: "IP", value: selectedLog.ipAddress ?? "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-[11px] text-muted-foreground">
                      {f.label}
                    </div>
                    <div>{f.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">
                  Mo ta
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-[12px]">
                  {selectedLog.description}
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-border">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Dong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    systemService
      .getAllConfigs()
      .then(({ all }) => {
        const vals: Record<string, string> = {};
        const descs: Record<string, string> = {};
        all.forEach((c) => {
          vals[c.key] = c.value;
          descs[c.key] = c.description ?? "";
        });
        setConfigs(vals);
        setDescriptions(descs);
      })
      .catch(() => toast.error("Không tải được cấu hình hệ thống"))
      .finally(() => setLoading(false));
  }, []);

  const getVal = (key: string) => configs[key] ?? "";
  const getDesc = (key: string) =>
    descriptions[key] ?? CONFIG_LABELS[key] ?? "";

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(getVal(key));
  };
  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (key: string) => {
    setSaving(true);
    try {
      await systemService.upsertConfig(key, { value: editValue });
      setConfigs((prev) => ({ ...prev, [key]: editValue }));
      toast.success("Đã lưu cấu hình");
      setEditingKey(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (key: string) => {
    if (key === "default_timezone") {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-full max-w-[300px]"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      );
    }
    if (key === "work_days_per_week") {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-24"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      );
    }
    if (NUMBER_CONFIGS[key]) {
      const { min, max } = NUMBER_CONFIGS[key];
      return (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          min={min}
          max={max}
          className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-28"
        />
      );
    }
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px] w-full max-w-[400px]"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-[13px]">Đang tải cấu hình...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px]">Cấu hình hệ thống</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Quản lý các thông số vận hành của hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONFIG_GROUPS.map((group) => (
          <div
            key={group.title}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-muted-foreground">{group.icon}</span>
              <h3 className="text-[14px]">{group.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {group.keys.map((key) => (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px]">
                        {CONFIG_LABELS[key] || key}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {getDesc(key)}
                      </div>
                    </div>
                    {editingKey === key ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {renderInput(key)}
                        <button
                          onClick={() => saveEdit(key)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          title="Lưu"
                        >
                          {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg border border-border hover:bg-accent"
                          title="Huỷ"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[13px] bg-muted/50 px-3 py-1 rounded-lg">
                          {getVal(key) || (
                            <span className="text-muted-foreground italic">
                              Chưa cấu hình
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => startEdit(key)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={14} />
                        </button>
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
