/// <reference types="vite/client" />
// ================================================================
// EMPLOYEES PAGE — Module 2
// API-integrated: usersService + departmentsService + jobTitlesService
// Upgraded UI to match Figma design
// ================================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Plus,
  X,
  Users,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ── Services ──────────────────────────────────────────────────
import * as usersService from "../../lib/services/users.service";
import * as departmentsService from "../../lib/services/departments.service";
import * as jobTitlesService from "../../lib/services/jobTitles.service";
import type { ApiUser } from "../../lib/services/auth.service";
import type { DepartmentOption } from "../../lib/services/departments.service";
import type { JobTitleOption } from "../../lib/services/jobTitles.service";
import { ApiError } from "../../lib/apiClient";
import * as attendanceService from "../../lib/services/attendance.service";
import type { ApiWorkShift } from "../../lib/services/attendance.service";
import * as payrollService from "../../lib/services/payroll.service";

const USE_API = !!import.meta.env.VITE_API_URL;

type SortKey = "fullName" | "hireDate" | "department" | "employmentStatus";

const empStatusColors: Record<string, string> = {
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PROBATION:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ON_LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TERMINATED:
    "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};
const accStatusColors: Record<string, string> = {
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOCKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DISABLED: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
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
const ALL_ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SALES", "ACCOUNTANT"];
const emptyCreateForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  departmentId: "",
  jobTitleId: "",
  managerId: "",
  hireDate: new Date().toISOString().slice(0, 10),
  employmentStatus: "PROBATION",
};

// ── Sub-components ─────────────────────────────────────────────
function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initials = name
    .split(" ")
    .slice(-2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatarUrl)
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  return (
    <div
      className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-[0.6875rem] font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${colorClass}`}>
      <div className="text-[0.6875rem] opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-0.5 leading-tight">
        {value}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  asc,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`text-left px-4 py-3 text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wide ${className}`}
    >
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          asc ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )
        ) : (
          <ArrowUpDown size={10} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ================================================================
export function EmployeesPage() {
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const isAdminHR = can("ADMIN", "HR");

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    probation: 0,
    terminated: 0,
  });
  const [deptOptions, setDeptOptions] = useState<DepartmentOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobTitleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [empStatusFilter, setEmpStatusFilter] = useState("");
  const [accStatusFilter, setAccStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [hireDateFrom, setHireDateFrom] = useState("");
  const [hireDateTo, setHireDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortAsc, setSortAsc] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  // Step 3 extras: shift + salary
  const [shiftOptions, setShiftOptions] = useState<ApiWorkShift[]>([]);

  const [createExtras, setCreateExtras] = useState({
    // Ca làm việc
    shiftId: "",
    shiftEffectiveFrom: new Date().toISOString().slice(0, 10),
    // Cấu hình lương cơ bản (UserCompensation — đúng nghiệp vụ)
    baseSalary: "",
    salaryType: "MONTHLY" as "MONTHLY" | "DAILY" | "HOURLY",
    changeReason: "Lương ban đầu khi tạo nhân viên",
  });
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  useEffect(() => {
    departmentsService
      .getDepartmentOptions()
      .then(setDeptOptions)
      .catch(() => {});
    jobTitlesService
      .getJobTitleOptions()
      .then(setJobOptions)
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (USE_API) {
        const [usersRes, statsRes] = await Promise.all([
          usersService.listUsers({
            search: search || undefined,
            departmentId: deptFilter || undefined,
            employmentStatus: empStatusFilter || undefined,
            accountStatus: accStatusFilter || undefined,
            role: roleFilter || undefined,
            hireDateFrom: hireDateFrom || undefined,
            hireDateTo: hireDateTo || undefined,
            page,
            limit: PAGE_SIZE,
          }),
          usersService.getUserStats(),
        ]);
        setUsers(usersRes.items);
        setTotalCount(usersRes.pagination.total);
        const byEmp = statsRes.byEmployment ?? [];
        const gc = (k: string) =>
          byEmp.find((x) => x.employmentStatus === k)?._count?.id ?? 0;
        setStats({
          total: statsRes.total,
          active: gc("ACTIVE"),
          probation: gc("PROBATION"),
          terminated: gc("TERMINATED"),
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách nhân viên",
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    deptFilter,
    empStatusFilter,
    accStatusFilter,
    roleFilter,
    hireDateFrom,
    hireDateTo,
    page,
    sortKey,
    sortAsc,
    isAdminHR,
    currentUser?.departmentId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    deptFilter,
    empStatusFilter,
    accStatusFilter,
    roleFilter,
    hireDateFrom,
    hireDateTo,
  ]);
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pre-load shift options on mount so step 2 dropdown is ready
  useEffect(() => {
    if (!USE_API) return;
    attendanceService
      .getShiftOptions()
      .then(
        (res) => setShiftOptions(res), // backend đã query isActive=true rồi
      )
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (
      !createForm.fullName ||
      !createForm.email ||
      !createForm.departmentId ||
      !createForm.jobTitleId ||
      !createForm.hireDate
    ) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }
    setLoadingCreate(true);
    try {
      if (USE_API) {
        const newUser = await usersService.createUser({
          fullName: createForm.fullName,
          email: createForm.email,
          phoneNumber: createForm.phoneNumber || undefined,
          departmentId: createForm.departmentId,
          jobTitleId: createForm.jobTitleId,
          managerId: createForm.managerId || null,
          hireDate: createForm.hireDate,
          employmentStatus: createForm.employmentStatus,
        });

        // Gán ca làm việc nếu đã chọn
        if (createExtras.shiftId && newUser?.id) {
          try {
            await attendanceService.assignUserShift({
              userId: newUser.id,
              shiftId: createExtras.shiftId,
              effectiveFrom: createExtras.shiftEffectiveFrom,
            });
          } catch {
            /* không block nếu gán ca lỗi */
          }
        }

        // Tạo cấu hình lương cơ bản (UserCompensation) nếu đã nhập
        if (createExtras.baseSalary && newUser?.id) {
          try {
            await payrollService.createCompensation({
              userId: newUser.id,
              salaryType: createExtras.salaryType,
              baseSalary: Number(createExtras.baseSalary),
              probationSalary: null,
              standardWorkingDays: 26,
              standardWorkingHours: 8,
              currency: "VND",
              payFrequency: "MONTHLY",
              payDayOfMonth: null,
              probationEndDate: null,
              changeReason:
                createExtras.changeReason || "Luong ban dau khi tao nhan vien",
              overtimeRateWeekday: 1.5,
              overtimeRateWeekend: 2.0,
              overtimeRateHoliday: 3.0,
              effectiveFrom: createForm.hireDate,
              effectiveTo: null,
              notes: null,
            });
          } catch {
            /* không block nếu tạo lương lỗi */
          }
        }
      }
      toast.success(
        `Đã tạo nhân viên ${createForm.fullName}. Email kích hoạt đã được gửi.`,
      );
      setShowCreate(false);
      setCreateStep(1);
      setCreateForm(emptyCreateForm);
      setCreateExtras({
        shiftId: "",
        shiftEffectiveFrom: new Date().toISOString().slice(0, 10),
        baseSalary: "",
        salaryType: "MONTHLY",
        changeReason: "Lương ban đầu khi tạo nhân viên",
      });
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Tạo nhân viên thất bại",
      );
    } finally {
      setLoadingCreate(false);
    }
  };

  const getDeptName = (u: ApiUser) => {
    if (u.department?.name) return u.department.name;
    return (
      deptOptions.find((d) => d.id === u.departmentId)?.name ?? u.departmentId
    );
  };
  const getJobName = (u: ApiUser) => {
    if (u.jobTitle?.name) return u.jobTitle.name;
    return jobOptions.find((j) => j.id === u.jobTitleId)?.name ?? u.jobTitleId;
  };
  const getMgrName = (u: ApiUser) => {
    if (u.manager?.fullName) return u.manager.fullName;
    if (!u.managerId) return "—";
    const found = users.find((x) => x.id === u.managerId);
    if (found) return found.fullName;
    return "—";
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const activeFilters = [
    deptFilter,
    empStatusFilter,
    accStatusFilter,
    roleFilter,
    hireDateFrom,
    hireDateTo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Danh sách nhân viên</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý thông tin và tài khoản nhân viên
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg border border-border hover:bg-accent transition"
            title="Làm mới"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin text-muted-foreground"
                  : "text-muted-foreground"
              }
            />
          </button>
          {isAdminHR && (
            <button
              onClick={() => {
                setShowCreate(true);
                setCreateStep(1);
                setCreateForm(emptyCreateForm);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1.5 hover:bg-blue-700 transition"
            >
              <Plus size={15} /> Thêm nhân viên
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Tổng nhân viên"
          value={stats.total}
          colorClass="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
        />
        <StatCard
          label="Chính thức"
          value={stats.active}
          colorClass="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
        />
        <StatCard
          label="Thử việc"
          value={stats.probation}
          colorClass="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
        />
        <StatCard
          label="Đã nghỉ"
          value={stats.terminated}
          colorClass="bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-700"
        />
      </div>

      {/* Search + Filter */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[0.8125rem] transition ${showFilters || activeFilters > 0 ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-border text-muted-foreground hover:bg-accent"}`}
        >
          <SlidersHorizontal size={14} /> Nâng cao
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[0.5625rem] flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        {(search || activeFilters > 0) && (
          <button
            onClick={() => {
              setSearch("");
              setDeptFilter("");
              setEmpStatusFilter("");
              setAccStatusFilter("");
              setRoleFilter("");
              setHireDateFrom("");
              setHireDateTo("");
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent transition"
          >
            <X size={13} /> Xoá lọc
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-3 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Phòng ban
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            >
              <option value="">Tất cả</option>
              {deptOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Trạng thái làm việc
            </label>
            <select
              value={empStatusFilter}
              onChange={(e) => setEmpStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            >
              <option value="">Tất cả</option>
              {Object.entries(empStatusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Trạng thái tài khoản
            </label>
            <select
              value={accStatusFilter}
              onChange={(e) => setAccStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            >
              <option value="">Tất cả</option>
              {Object.entries(accStatusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Vai trò
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            >
              <option value="">Tất cả vai trò</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Ngày vào từ
            </label>
            <input
              type="date"
              value={hireDateFrom}
              onChange={(e) => setHireDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            />
          </div>
          <div>
            <label className="text-[0.6875rem] text-muted-foreground block mb-1">
              Ngày vào đến
            </label>
            <input
              type="date"
              value={hireDateTo}
              onChange={(e) => setHireDateTo(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-[0.8125rem]"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[0.8125rem]">Đang tải...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <AlertCircle size={24} className="text-red-400" />
            <p className="text-[0.8125rem]">{error}</p>
            <button
              onClick={fetchUsers}
              className="text-xs text-blue-600 hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users size={32} className="opacity-30" />
            <p className="text-[0.8125rem]">Không có nhân viên nào phù hợp</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <SortHeader
                      label="Nhân viên"
                      sortKey="fullName"
                      currentKey={sortKey}
                      asc={sortAsc}
                      onSort={toggleSort}
                    />
                    <SortHeader
                      label="Phòng ban"
                      sortKey="department"
                      currentKey={sortKey}
                      asc={sortAsc}
                      onSort={toggleSort}
                      className="hidden md:table-cell"
                    />
                    <th className="text-left px-4 py-3 text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Chức danh
                    </th>
                    <th className="text-left px-4 py-3 text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                      Quản lý
                    </th>
                    <SortHeader
                      label="Ngày vào"
                      sortKey="hireDate"
                      currentKey={sortKey}
                      asc={sortAsc}
                      onSort={toggleSort}
                      className="hidden lg:table-cell"
                    />
                    <th className="text-left px-4 py-3 text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Roles
                    </th>
                    <SortHeader
                      label="Trạng thái"
                      sortKey="employmentStatus"
                      currentKey={sortKey}
                      asc={sortAsc}
                      onSort={toggleSort}
                    />
                    <th className="text-left px-4 py-3 text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Tài khoản
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/employees/${u.id}`)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.fullName} avatarUrl={u.avatarUrl} />
                          <div className="min-w-0">
                            <div className="text-[0.8125rem] font-medium truncate">
                              {u.fullName}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground truncate">
                              {u.userCode} · {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] hidden md:table-cell">
                        {getDeptName(u)}
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] hidden lg:table-cell text-muted-foreground">
                        {getJobName(u)}
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] hidden xl:table-cell text-muted-foreground">
                        {getMgrName(u)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {new Date(u.hireDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-0.5">
                          {(u.roles as string[]).map((r) => (
                            <span
                              key={r}
                              className="text-[0.5625rem] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-medium ${empStatusColors[u.employmentStatus] ?? ""}`}
                        >
                          {empStatusLabels[u.employmentStatus] ??
                            u.employmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-medium ${accStatusColors[u.accountStatus] ?? ""}`}
                        >
                          {accStatusLabels[u.accountStatus] ?? u.accountStatus}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
              <span className="text-muted-foreground">
                Hiển thị {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–
                {Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} nhân
                viên
              </span>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent transition"
                  >
                    ← Trước
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent transition"
                  >
                    Sau →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => {
              setShowCreate(false);
              setCreateStep(1);
              setCreateExtras({
                shiftId: "",
                shiftEffectiveFrom: new Date().toISOString().slice(0, 10),
                baseSalary: "",
                salaryType: "MONTHLY",
                changeReason: "Lương ban đầu khi tạo nhân viên",
              });
            }}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-base font-semibold">
                  Thêm nhân viên mới
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${createStep === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}
                  >
                    1. Thông tin
                  </span>
                  <span className="text-muted-foreground text-[0.625rem]">›</span>
                  <span
                    className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${createStep === 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}
                  >
                    2. Ca &amp; Lương
                  </span>
                  <span className="text-muted-foreground text-[0.625rem]">›</span>
                  <span
                    className={`text-[0.6875rem] px-2 py-0.5 rounded-full ${createStep === 3 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}
                  >
                    3. Xác nhận
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateStep(1);
                }}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X size={16} />
              </button>
            </div>

            {createStep === 1 && (
              <>
                <div className="p-5 space-y-3">
                  <Field
                    label="Họ tên *"
                    value={createForm.fullName}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, fullName: v }))
                    }
                    placeholder="Nguyễn Văn A"
                  />
                  <Field
                    label="Email *"
                    value={createForm.email}
                    onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))}
                    placeholder="nguyen.van.a@company.com"
                    type="email"
                  />
                  <Field
                    label="Số điện thoại"
                    value={createForm.phoneNumber}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, phoneNumber: v }))
                    }
                    placeholder="0901234567"
                  />
                  <Sel
                    label="Phòng ban *"
                    value={createForm.departmentId}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, departmentId: v }))
                    }
                    options={deptOptions.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                    placeholder="-- Chọn phòng ban --"
                  />
                  <Sel
                    label="Chức danh *"
                    value={createForm.jobTitleId}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, jobTitleId: v }))
                    }
                    options={jobOptions.map((j) => ({
                      value: j.id,
                      label: j.name,
                    }))}
                    placeholder="-- Chọn chức danh --"
                  />
                  <Sel
                    label="Quản lý trực tiếp"
                    value={createForm.managerId}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, managerId: v }))
                    }
                    options={users
                      .filter((u) => u.accountStatus === "ACTIVE")
                      .map((u) => ({
                        value: u.id,
                        label: `${u.fullName} (${u.userCode})`,
                      }))}
                    placeholder="-- Không chọn --"
                  />
                  <Field
                    label="Ngày vào làm *"
                    value={createForm.hireDate}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, hireDate: v }))
                    }
                    type="date"
                  />
                  <Sel
                    label="Trạng thái hợp đồng"
                    value={createForm.employmentStatus}
                    onChange={(v) =>
                      setCreateForm((f) => ({ ...f, employmentStatus: v }))
                    }
                    options={[
                      { value: "PROBATION", label: "Thử việc" },
                      { value: "ACTIVE", label: "Chính thức" },
                    ]}
                  />
                </div>
                <div className="flex justify-end gap-2 p-5 border-t border-border">
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setCreateStep(1);
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent transition"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => {
                      if (
                        !createForm.fullName ||
                        !createForm.email ||
                        !createForm.departmentId ||
                        !createForm.jobTitleId ||
                        !createForm.hireDate
                      ) {
                        toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
                        return;
                      }
                      setCreateStep(2);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] hover:bg-blue-700 transition"
                  >
                    Tiếp theo →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: Ca làm việc & Lương ban đầu ── */}
            {createStep === 2 && (
              <>
                <div className="p-5 space-y-4">
                  {/* Ca làm việc */}
                  <div>
                    <div className="text-[0.8125rem] font-medium mb-3 flex items-center gap-2">
                      🕐 Gán ca làm việc
                      <span className="text-[0.6875rem] text-muted-foreground font-normal">
                        (tuỳ chọn)
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                          Ca làm việc
                        </label>
                        <select
                          value={createExtras.shiftId}
                          onChange={(e) =>
                            setCreateExtras((p) => ({
                              ...p,
                              shiftId: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Bỏ qua, gán sau --</option>
                          {shiftOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.startTime} – {s.endTime})
                            </option>
                          ))}
                        </select>
                      </div>
                      {createExtras.shiftId && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Hiệu lực từ
                          </label>
                          <input
                            type="date"
                            value={createExtras.shiftEffectiveFrom}
                            onChange={(e) =>
                              setCreateExtras((p) => ({
                                ...p,
                                shiftEffectiveFrom: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Cấu hình lương cơ bản — UserCompensation */}
                  <div>
                    <div className="text-[0.8125rem] font-medium mb-3 flex items-center gap-2">
                      💰 Lương cơ bản ban đầu
                      <span className="text-[0.6875rem] text-muted-foreground font-normal">
                        (tuỳ chọn — có thể cấu hình sau)
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Loại lương
                          </label>
                          <select
                            value={createExtras.salaryType}
                            onChange={(e) =>
                              setCreateExtras((p) => ({
                                ...p,
                                salaryType: e.target.value as
                                  | "MONTHLY"
                                  | "DAILY"
                                  | "HOURLY",
                              }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="MONTHLY">Theo tháng</option>
                            <option value="DAILY">Theo ngày</option>
                            <option value="HOURLY">Theo giờ</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Mức lương (VNĐ)
                          </label>
                          <input
                            type="number"
                            value={createExtras.baseSalary}
                            onChange={(e) =>
                              setCreateExtras((p) => ({
                                ...p,
                                baseSalary: e.target.value,
                              }))
                            }
                            placeholder="VD: 15000000"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      {createExtras.baseSalary && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                          ✓ Sẽ tạo cấu hình lương:{" "}
                          <strong>
                            {Number(createExtras.baseSalary).toLocaleString(
                              "vi-VN",
                            )}{" "}
                            đ/
                            {createExtras.salaryType === "MONTHLY"
                              ? "tháng"
                              : createExtras.salaryType === "DAILY"
                                ? "ngày"
                                : "giờ"}
                          </strong>
                          <br />
                          Hiệu lực từ ngày vào làm · Hệ số OT mặc định (×1.5 /
                          ×2 / ×3)
                        </div>
                      )}
                      {!createExtras.baseSalary && (
                        <p className="text-[0.6875rem] text-muted-foreground">
                          Để trống nếu muốn cấu hình lương sau tại{" "}
                          <strong>Cấu hình lương NV</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-5 border-t border-border">
                  <button
                    onClick={() => setCreateStep(1)}
                    className="px-4 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent transition"
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={() => setCreateStep(3)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] hover:bg-blue-700 transition"
                  >
                    Tiếp theo →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Xác nhận ── */}
            {createStep === 3 && (
              <>
                <div className="p-5 space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-[0.8125rem]">
                    <div className="font-medium mb-2">Xác nhận thông tin</div>
                    {(
                      [
                        ["Họ tên", createForm.fullName],
                        ["Email", createForm.email],
                        [
                          "Phòng ban",
                          deptOptions.find(
                            (d) => d.id === createForm.departmentId,
                          )?.name ?? createForm.departmentId,
                        ],
                        [
                          "Chức danh",
                          jobOptions.find((j) => j.id === createForm.jobTitleId)
                            ?.name ?? createForm.jobTitleId,
                        ],
                        [
                          "Ngày vào làm",
                          new Date(createForm.hireDate).toLocaleDateString(
                            "vi-VN",
                          ),
                        ],
                        [
                          "Trạng thái",
                          createForm.employmentStatus === "PROBATION"
                            ? "Thử việc"
                            : "Chính thức",
                        ],
                        [
                          "Ca làm việc",
                          createExtras.shiftId
                            ? (shiftOptions.find(
                                (s) => s.id === createExtras.shiftId,
                              )?.name ?? "—")
                            : "Bỏ qua",
                        ],
                        [
                          "Lương cơ bản",
                          createExtras.baseSalary
                            ? `${Number(createExtras.baseSalary).toLocaleString("vi-VN")} đ/${createExtras.salaryType === "MONTHLY" ? "tháng" : createExtras.salaryType === "DAILY" ? "ngày" : "giờ"}`
                            : "Bỏ qua (cấu hình sau)",
                        ],
                      ] as [string, string][]
                    ).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sau khi tạo, email kích hoạt sẽ gửi đến{" "}
                    <strong>{createForm.email}</strong>.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 p-5 border-t border-border">
                  <button
                    onClick={() => setCreateStep(2)}
                    className="px-4 py-2 rounded-lg border border-border text-[0.8125rem] hover:bg-accent transition"
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loadingCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[0.8125rem] flex items-center gap-1.5 hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loadingCreate ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    {loadingCreate ? "Đang tạo..." : "Tạo nhân viên"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
