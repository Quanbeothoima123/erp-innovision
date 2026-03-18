// ================================================================
// DEPARTMENTS PAGE + JOB TITLES PAGE — Module 3
// Fixed: headUserOptions now loads from API, mockUsers used in mock mode
// Fixed: _count.members luôn hiển thị đúng
// Feature: click card → slide-over hiển thị danh sách nhân viên
// UI: upgraded to match Figma design
// ================================================================
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  Users,
  Building,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Loader2,
  ChevronRight,
  UserCircle2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "../../lib/apiClient";
import * as departmentsService from "../../lib/services/departments.service";
import type { ApiDepartment } from "../../lib/services/departments.service";
import * as jobTitlesService from "../../lib/services/jobTitles.service";
import type { ApiJobTitle } from "../../lib/services/jobTitles.service";
import * as usersService from "../../lib/services/users.service";

// Mock fallback
import {
  departments as mockDepts,
  jobTitles as mockJobTitles,
  users as mockUsers,
} from "../data/mockData";

const USE_API = !!import.meta.env.VITE_API_URL;

// ── Member type (từ GET /departments/:id/members) ─────────────
interface DeptMember {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  jobTitle?: { name: string } | null;
  employmentStatus: string;
  accountStatus: string;
}

// ── Shared UI helpers ──────────────────────────────────────────
function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
function DlgHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-accent transition"
      >
        <X size={15} />
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
// DEPARTMENTS PAGE
// ================================================================
export function DepartmentsPage() {
  const { can } = useAuth();
  const isAdmin = can("ADMIN", "HR");

  const [depts, setDepts] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState<ApiDepartment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    headUserId: "",
    isActive: true,
  });

  // Member panel state
  const [selectedDept, setSelectedDept] = useState<ApiDepartment | null>(null);
  const [deptMembers, setDeptMembers] = useState<DeptMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // ── Head-user options: load from API or fall back to mock ──────
  const [headUserOptions, setHeadUserOptions] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (USE_API) {
      // Load danh sách nhân viên để chọn trưởng phòng
      usersService
        .listUsers({ limit: 200 })
        .then((res) =>
          setHeadUserOptions(
            res.items.map((u) => ({ id: u.id, name: u.fullName })),
          ),
        )
        .catch(() => {});
    } else {
      setHeadUserOptions(
        mockUsers.map((u) => ({ id: u.id, name: u.fullName })),
      );
    }
  }, []);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_API) {
        const res = await departmentsService.listDepartments({ limit: 200 });
        setDepts(res.items);
      } else {
        setDepts(
          mockDepts.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            headUserId: d.headUserId,
            isActive: d.isActive,
            _count: {
              members: mockUsers.filter((u) => u.departmentId === d.id).length,
            },
          })),
        );
      }
    } catch {
      toast.error("Không tải được danh sách phòng ban");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: "", description: "", headUserId: "", isActive: true });
    setShowForm(true);
  };
  const openEdit = (d: ApiDepartment) => {
    setEditDept(d);
    setForm({
      name: d.name,
      description: d.description ?? "",
      headUserId: d.headUserId ?? "",
      isActive: d.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên phòng ban");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        headUserId: form.headUserId || null,
        isActive: form.isActive,
      };
      if (USE_API) {
        if (editDept) {
          const updated = await departmentsService.updateDepartment(
            editDept.id,
            payload,
          );
          setDepts((prev) =>
            prev.map((d) => (d.id === editDept.id ? updated : d)),
          );
        } else {
          const created = await departmentsService.createDepartment({
            ...payload,
            description: payload.description || undefined,
            headUserId: payload.headUserId ?? undefined,
          });
          setDepts((prev) => [...prev, created]);
        }
      } else {
        if (editDept) {
          setDepts((prev) =>
            prev.map((d) => (d.id === editDept.id ? { ...d, ...payload } : d)),
          );
        } else {
          const newDept: ApiDepartment = {
            id: `dept-${Date.now()}`,
            ...payload,
            description: payload.description || "",
            headUserId: payload.headUserId,
            _count: { members: 0 },
          };
          setDepts((prev) => [...prev, newDept]);
        }
      }
      toast.success(
        editDept
          ? `Đã cập nhật phòng ban ${form.name}`
          : `Đã tạo phòng ban ${form.name}`,
      );
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const dept = depts.find((d) => d.id === id);
    if ((dept?._count?.members ?? 0) > 0) {
      toast.error(
        `Không thể xoá phòng ban có ${dept?._count?.members} nhân viên`,
      );
      setDeleteConfirm(null);
      return;
    }
    setSaving(true);
    try {
      if (USE_API) await departmentsService.deleteDepartment(id);
      setDepts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Đã xoá phòng ban");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setSaving(false);
      setDeleteConfirm(null);
    }
  };

  const toggleActive = async (d: ApiDepartment) => {
    try {
      if (USE_API) {
        const updated = await departmentsService.updateDepartment(d.id, {
          isActive: !d.isActive,
        });
        setDepts((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
      } else {
        setDepts((prev) =>
          prev.map((x) =>
            x.id === d.id ? { ...x, isActive: !x.isActive } : x,
          ),
        );
      }
      toast.success(
        `Đã ${d.isActive ? "vô hiệu" : "kích hoạt"} phòng ban ${d.name}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  };

  // Open member slide-over panel
  const openMemberPanel = async (dept: ApiDepartment) => {
    setSelectedDept(dept);
    setDeptMembers([]);
    setMembersLoading(true);
    try {
      if (USE_API) {
        const members = await departmentsService.getDepartmentMembers(dept.id);
        setDeptMembers(members as DeptMember[]);
      } else {
        const mock = mockUsers
          .filter((u) => u.departmentId === dept.id)
          .map((u) => ({
            id: u.id,
            fullName: u.fullName,
            avatarUrl: null,
            jobTitle: null,
            employmentStatus: u.employmentStatus ?? "ACTIVE",
            accountStatus: u.accountStatus ?? "ACTIVE",
          }));
        setDeptMembers(mock);
      }
    } catch {
      toast.error("Không tải được danh sách nhân viên");
    } finally {
      setMembersLoading(false);
    }
  };

  // Resolve head user display name
  const getHeadName = (d: ApiDepartment) => {
    if (d.headUser?.fullName) return d.headUser.fullName;
    if (!d.headUserId) return null;
    return headUserOptions.find((u) => u.id === d.headUserId)?.name ?? null;
  };

  const filtered = search
    ? depts.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          (d.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : depts;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold">Phòng ban</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Quản lý các phòng ban trong tổ chức
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDepts}
            className="p-2 rounded-lg border border-border hover:bg-accent transition"
          >
            <RefreshCw
              size={14}
              className={`text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition"
            >
              <Plus size={15} /> Thêm phòng ban
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Tìm phòng ban..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid / States */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building size={32} className="opacity-20 mb-2" />
          <p className="text-[13px]">Không có phòng ban nào</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d) => {
            const headName = getHeadName(d);
            return (
              <div
                key={d.id}
                onClick={() => openMemberPanel(d)}
                className={`bg-card border border-border rounded-xl p-4 transition-all cursor-pointer hover:border-blue-400 hover:shadow-md ${!d.isActive ? "opacity-60" : ""}`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                      <Building size={16} />
                    </div>
                    <div>
                      <div className="text-[14px] font-medium leading-tight">
                        {d.name}
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          d.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {d.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {d.description && (
                  <p className="text-[12px] text-muted-foreground mb-3 line-clamp-2">
                    {d.description}
                  </p>
                )}

                {/* Footer: stats + actions */}
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Users size={11} /> {d._count?.members ?? 0} nhân viên
                    </div>
                    <div className="flex items-center gap-1">
                      <span>TP:</span>
                      {headName ? (
                        <span className="text-foreground">{headName}</span>
                      ) : (
                        <span className="italic">Chưa gán</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleActive(d)}
                        className="p-1.5 rounded-lg hover:bg-accent transition"
                        title={d.isActive ? "Vô hiệu hoá" : "Kích hoạt"}
                      >
                        {d.isActive ? (
                          <ToggleRight size={16} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft
                            size={16}
                            className="text-muted-foreground"
                          />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg hover:bg-accent transition"
                      >
                        <Edit2 size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(d.id)}
                        className="p-1.5 rounded-lg hover:bg-accent transition"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <DlgHeader
            title={editDept ? `Sửa: ${editDept.name}` : "Thêm phòng ban"}
            onClose={() => setShowForm(false)}
          />
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Tên phòng ban *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="VD: Phòng Kỹ Thuật"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Trưởng phòng
              </label>
              <select
                value={form.headUserId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, headUserId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
              >
                <option value="">-- Chưa gán --</option>
                {headUserOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deptIsActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="accent-blue-600"
              />
              <label
                htmlFor="deptIsActive"
                className="text-[13px] cursor-pointer"
              >
                Kích hoạt
              </label>
            </div>
          </div>
          <DlgFooter
            onCancel={() => setShowForm(false)}
            onConfirm={handleSave}
            label={editDept ? "Lưu thay đổi" : "Tạo phòng ban"}
            loading={saving}
          />
        </Overlay>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)}>
          <DlgHeader
            title="Xác nhận xoá"
            onClose={() => setDeleteConfirm(null)}
          />
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">
              Bạn có chắc muốn xoá phòng ban{" "}
              <strong>{depts.find((d) => d.id === deleteConfirm)?.name}</strong>
              ? Hành động này không thể hoàn tác.
            </p>
          </div>
          <DlgFooter
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={() => handleDelete(deleteConfirm)}
            label="Xoá"
            loading={saving}
            variant="danger"
          />
        </Overlay>
      )}

      {/* ── Member Slide-Over Panel ───────────────────────────── */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedDept(null)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                  <Building size={15} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold leading-tight">
                    {selectedDept.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {membersLoading
                      ? "Đang tải..."
                      : `${deptMembers.length} nhân viên`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-[13px]">Đang tải nhân viên...</span>
                </div>
              ) : deptMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users size={32} className="opacity-20 mb-2" />
                  <p className="text-[13px]">Chưa có nhân viên nào</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {deptMembers.map((m) => (
                    <Link
                      key={m.id}
                      to={`/employees/${m.id}`}
                      onClick={() => setSelectedDept(null)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-accent transition group"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {m.fullName
                              .split(" ")
                              .slice(-2)
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate group-hover:text-blue-600 transition">
                          {m.fullName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <UserCircle2 size={10} />
                          {m.jobTitle?.name ?? "—"}
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            m.employmentStatus === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : m.employmentStatus === "PROBATION"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {m.employmentStatus === "ACTIVE"
                            ? "Chính thức"
                            : m.employmentStatus === "PROBATION"
                              ? "Thử việc"
                              : m.employmentStatus}
                        </span>
                        {m.accountStatus !== "ACTIVE" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                            {m.accountStatus === "LOCKED"
                              ? "Bị khoá"
                              : "Vô hiệu"}
                          </span>
                        )}
                      </div>

                      <ChevronRight
                        size={13}
                        className="text-muted-foreground group-hover:text-blue-500 flex-shrink-0 transition"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            {!membersLoading && deptMembers.length > 0 && (
              <div className="flex-shrink-0 px-5 py-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{deptMembers.length} nhân viên trong phòng ban</span>
                <Link
                  to={`/employees?department=${selectedDept.id}`}
                  onClick={() => setSelectedDept(null)}
                  className="text-blue-600 hover:underline text-[11px] flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// JOB TITLES PAGE
// ================================================================
export function JobTitlesPage() {
  const { can } = useAuth();
  const isAdmin = can("ADMIN", "HR");

  const [jobs, setJobs] = useState<ApiJobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<ApiJobTitle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_API) {
        const res = await jobTitlesService.listJobTitles({ limit: 200 });
        setJobs(res.items);
      } else {
        setJobs(mockJobTitles as ApiJobTitle[]);
      }
    } catch {
      toast.error("Không tải được danh sách chức danh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openCreate = () => {
    setEditJob(null);
    setForm({ code: "", name: "", description: "", isActive: true });
    setShowForm(true);
  };
  const openEdit = (j: ApiJobTitle) => {
    setEditJob(j);
    setForm({
      code: j.code,
      name: j.name,
      description: j.description ?? "",
      isActive: j.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Vui lòng nhập mã và tên chức danh");
      return;
    }
    setSaving(true);
    try {
      if (USE_API) {
        if (editJob) {
          const updated = await jobTitlesService.updateJobTitle(editJob.id, {
            code: form.code,
            name: form.name,
            description: form.description || undefined,
            isActive: form.isActive,
          });
          setJobs((prev) =>
            prev.map((j) => (j.id === editJob.id ? updated : j)),
          );
        } else {
          const created = await jobTitlesService.createJobTitle({
            code: form.code,
            name: form.name,
            description: form.description || undefined,
            isActive: form.isActive,
          });
          setJobs((prev) => [...prev, created]);
        }
      } else {
        if (editJob) {
          setJobs((prev) =>
            prev.map((j) => (j.id === editJob.id ? { ...j, ...form } : j)),
          );
        } else {
          setJobs((prev) => [
            ...prev,
            {
              id: `jt-${Date.now()}`,
              ...form,
              description: form.description,
            } as ApiJobTitle,
          ]);
        }
      }
      toast.success(
        editJob ? "Đã cập nhật chức danh" : `Đã tạo chức danh ${form.name}`,
      );
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if ((job?._count?.users ?? 0) > 0) {
      toast.error("Không thể xoá chức danh đang có nhân viên");
      setDeleteConfirm(null);
      return;
    }
    setSaving(true);
    try {
      if (USE_API) await jobTitlesService.deleteJobTitle(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Đã xoá chức danh");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setSaving(false);
      setDeleteConfirm(null);
    }
  };

  const toggleActive = async (j: ApiJobTitle) => {
    try {
      if (USE_API) {
        const updated = await jobTitlesService.updateJobTitle(j.id, {
          isActive: !j.isActive,
        });
        setJobs((prev) => prev.map((x) => (x.id === j.id ? updated : x)));
      } else {
        setJobs((prev) =>
          prev.map((x) =>
            x.id === j.id ? { ...x, isActive: !x.isActive } : x,
          ),
        );
      }
      toast.success(
        `Đã ${j.isActive ? "vô hiệu" : "kích hoạt"} chức danh ${j.name}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  };

  const filtered = search
    ? jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(search.toLowerCase()) ||
          (j.code ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold">Chức danh</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Quản lý danh sách chức danh công việc
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            className="p-2 rounded-lg border border-border hover:bg-accent transition"
          >
            <RefreshCw
              size={14}
              className={`text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition"
            >
              <Plus size={15} /> Thêm chức danh
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Tìm chức danh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users size={32} className="opacity-20 mb-2" />
          <p className="text-[13px]">Không có chức danh nào</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div
            className="grid gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            style={{ gridTemplateColumns: "90px 1fr 2fr 80px 100px 120px" }}
          >
            <span>Mã</span>
            <span>Tên chức danh</span>
            <span>Mô tả</span>
            <span>Nhân viên</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border">
            {filtered.map((j) => (
              <div
                key={j.id}
                className="grid gap-3 px-4 py-3 items-center hover:bg-muted/30 transition"
                style={{ gridTemplateColumns: "90px 1fr 2fr 80px 100px 120px" }}
              >
                {/* Mã */}
                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-center truncate">
                  {j.code}
                </span>
                {/* Tên */}
                <span className="text-[13px] font-medium">{j.name}</span>
                {/* Mô tả */}
                <span className="text-[12px] text-muted-foreground truncate">
                  {j.description || "—"}
                </span>
                {/* Nhân viên */}
                <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                  <Users size={11} />
                  {j._count?.users ?? 0}
                </span>
                {/* Trạng thái */}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full text-center font-medium w-fit ${
                    j.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {j.isActive ? "Hoạt động" : "Vô hiệu"}
                </span>
                {/* Thao tác */}
                {isAdmin ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => toggleActive(j)}
                      className="p-1.5 rounded-lg hover:bg-accent transition"
                      title={j.isActive ? "Vô hiệu hoá" : "Kích hoạt"}
                    >
                      {j.isActive ? (
                        <ToggleRight size={15} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft
                          size={15}
                          className="text-muted-foreground"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(j)}
                      className="p-1.5 rounded-lg hover:bg-accent transition"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={13} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(j.id)}
                      className="p-1.5 rounded-lg hover:bg-accent transition"
                      title="Xoá"
                    >
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div className="px-4 py-3 border-t border-border text-[12px] text-muted-foreground">
            {filtered.length} / {jobs.length} chức danh
          </div>
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <DlgHeader
            title={editJob ? `Sửa: ${editJob.name}` : "Thêm chức danh"}
            onClose={() => setShowForm(false)}
          />
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Mã chức danh *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                placeholder="VD: SR_DEV"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Tên chức danh *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="VD: Senior Developer"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="jtIsActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="accent-blue-600"
              />
              <label
                htmlFor="jtIsActive"
                className="text-[13px] cursor-pointer"
              >
                Kích hoạt
              </label>
            </div>
          </div>
          <DlgFooter
            onCancel={() => setShowForm(false)}
            onConfirm={handleSave}
            label={editJob ? "Lưu thay đổi" : "Tạo chức danh"}
            loading={saving}
          />
        </Overlay>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)}>
          <DlgHeader
            title="Xác nhận xoá"
            onClose={() => setDeleteConfirm(null)}
          />
          <div className="p-5">
            <p className="text-[13px] text-muted-foreground">
              Bạn có chắc muốn xoá chức danh{" "}
              <strong>{jobs.find((j) => j.id === deleteConfirm)?.name}</strong>?
            </p>
          </div>
          <DlgFooter
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={() => handleDelete(deleteConfirm)}
            label="Xoá"
            loading={saving}
            variant="danger"
          />
        </Overlay>
      )}
    </div>
  );
}
