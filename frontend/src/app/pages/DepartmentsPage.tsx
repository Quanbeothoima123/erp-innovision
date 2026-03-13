import { useState } from "react";
import {
  departments as initialDepts,
  jobTitles as initialJobs,
  getUserById,
  users,
} from "../data/mockData";
import type { Department, JobTitle } from "../data/mockData";
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  Users,
  Building,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════
// DEPARTMENTS PAGE — Full CRUD
// ═══════════════════════════════════════════════════════════════
export function DepartmentsPage() {
  const { can } = useAuth();
  const [depts, setDepts] = useState<Department[]>(initialDepts);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    headUserId: "",
    isActive: true,
  });

  const isAdmin = can("ADMIN");

  const filtered = search
    ? depts.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.description.toLowerCase().includes(search.toLowerCase()),
      )
    : depts;

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: "", description: "", headUserId: "", isActive: true });
    setShowForm(true);
  };
  const openEdit = (d: Department) => {
    setEditDept(d);
    setForm({
      name: d.name,
      description: d.description,
      headUserId: d.headUserId || "",
      isActive: d.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Vui lòng nhập tên phòng ban");
      return;
    }
    if (editDept) {
      setDepts((prev) =>
        prev.map((d) =>
          d.id === editDept.id
            ? {
                ...d,
                name: form.name,
                description: form.description,
                headUserId: form.headUserId || null,
                isActive: form.isActive,
              }
            : d,
        ),
      );
      toast.success(`Đã cập nhật phòng ban ${form.name}`);
    } else {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name: form.name,
        description: form.description,
        headUserId: form.headUserId || null,
        isActive: form.isActive,
      };
      setDepts((prev) => [...prev, newDept]);
      toast.success(`Đã tạo phòng ban ${form.name}`);
    }
    setShowForm(false);
    setEditDept(null);
  };

  const handleDelete = (id: string) => {
    const memberCount = users.filter((u) => u.departmentId === id).length;
    if (memberCount > 0) {
      toast.error(`Không thể xoá phòng ban có ${memberCount} nhân viên`);
      setDeleteConfirm(null);
      return;
    }
    setDepts((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    toast.success("Đã xoá phòng ban");
  };

  const toggleActive = (id: string) => {
    setDepts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d)),
    );
    const dept = depts.find((d) => d.id === id);
    toast.success(
      `Đã ${dept?.isActive ? "vô hiệu" : "kích hoạt"} phòng ban ${dept?.name}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Phòng ban</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm phòng ban
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Tìm phòng ban..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((d) => {
          const head = d.headUserId ? getUserById(d.headUserId) : null;
          const memberCount = users.filter(
            (u) => u.departmentId === d.id,
          ).length;
          return (
            <div
              key={d.id}
              className={`bg-card border border-border rounded-xl p-4 transition-opacity ${!d.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-[11px]">
                    <Building size={16} />
                  </div>
                  <span className="text-[14px]">{d.name}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400"}`}
                >
                  {d.isActive ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground mb-3">
                {d.description}
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users size={12} /> {memberCount} nhân viên
                  </div>
                  <div className="text-muted-foreground">
                    TP:{" "}
                    {head?.fullName || <span className="italic">Chưa gán</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(d.id)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                      title={d.isActive ? "Vô hiệu" : "Kích hoạt"}
                    >
                      {d.isActive ? (
                        <ToggleRight size={16} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(d)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(d.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground text-[13px]">
            Không tìm thấy phòng ban
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <DlgHeader
            title={editDept ? "Cập nhật phòng ban" : "Thêm phòng ban mới"}
            onClose={() => setShowForm(false)}
          />
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Tên phòng ban *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Phòng Kinh doanh"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Mô tả chức năng phòng ban"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Trưởng phòng
              </label>
              <select
                value={form.headUserId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headUserId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
              >
                <option value="">-- Chọn --</option>
                {users
                  .filter((u) => u.accountStatus === "ACTIVE")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.userCode})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground">
                Trạng thái:
              </label>
              <button
                onClick={() =>
                  setForm((f) => ({ ...f, isActive: !f.isActive }))
                }
                className={`px-3 py-1 rounded-lg text-[12px] border transition-colors ${form.isActive ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {form.isActive ? "Hoạt động" : "Vô hiệu"}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
            >
              {editDept ? "Cập nhật" : "Tạo"}
            </button>
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
            <h3 className="text-[16px]">Xoá phòng ban?</h3>
            <p className="text-[13px] text-muted-foreground">
              Chỉ có thể xoá phòng ban không có nhân viên nào.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700"
              >
                Xoá
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB TITLES PAGE — Full CRUD
// ═══════════════════════════════════════════════════════════════
export function JobTitlesPage() {
  const { can } = useAuth();
  const [jobs, setJobs] = useState<JobTitle[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<JobTitle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const isAdmin = can("ADMIN");

  const filtered = search
    ? jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(search.toLowerCase()) ||
          j.code.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  const openCreate = () => {
    setEditJob(null);
    setForm({ code: "", name: "", description: "", isActive: true });
    setShowForm(true);
  };
  const openEdit = (j: JobTitle) => {
    setEditJob(j);
    setForm({
      code: j.code,
      name: j.name,
      description: j.description,
      isActive: j.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.code || !form.name) {
      toast.error("Vui lòng nhập mã và tên chức danh");
      return;
    }
    if (editJob) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editJob.id
            ? {
                ...j,
                code: form.code,
                name: form.name,
                description: form.description,
                isActive: form.isActive,
              }
            : j,
        ),
      );
      toast.success(`Đã cập nhật chức danh ${form.name}`);
    } else {
      const newJob: JobTitle = {
        id: `jt-${Date.now()}`,
        code: form.code,
        name: form.name,
        description: form.description,
        isActive: form.isActive,
      };
      setJobs((prev) => [...prev, newJob]);
      toast.success(`Đã tạo chức danh ${form.name}`);
    }
    setShowForm(false);
    setEditJob(null);
  };

  const handleDelete = (id: string) => {
    const count = users.filter((u) => u.jobTitleId === id).length;
    if (count > 0) {
      toast.error(`Không thể xoá chức danh đang có ${count} nhân viên`);
      setDeleteConfirm(null);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setDeleteConfirm(null);
    toast.success("Đã xoá chức danh");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Chức danh</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm chức danh
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Tìm chức danh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                  Mã
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">
                  Tên chức danh
                </th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">
                  Mô tả
                </th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">
                  Số NV
                </th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">
                  Trạng thái
                </th>
                {isAdmin && (
                  <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const count = users.filter((u) => u.jobTitleId === j.id).length;
                return (
                  <tr
                    key={j.id}
                    className={`border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${!j.isActive ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 text-[13px]">
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px]">
                        {j.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px]">{j.name}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">
                      {j.description}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-center">
                      {count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${j.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}
                      >
                        {j.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEdit(j)}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(j.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="text-center py-8 text-muted-foreground text-[13px]"
                  >
                    Không tìm thấy chức danh
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">
          {filtered.length} chức danh
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {showForm && (
        <Overlay onClose={() => setShowForm(false)}>
          <DlgHeader
            title={editJob ? "Cập nhật chức danh" : "Thêm chức danh mới"}
            onClose={() => setShowForm(false)}
          />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">
                  Mã chức danh *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SENIOR_DEV"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">
                  Tên chức danh *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Senior Developer"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Mô tả chức danh"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-16 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground">
                Trạng thái:
              </label>
              <button
                onClick={() =>
                  setForm((f) => ({ ...f, isActive: !f.isActive }))
                }
                className={`px-3 py-1 rounded-lg text-[12px] border transition-colors ${form.isActive ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {form.isActive ? "Hoạt động" : "Vô hiệu"}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700"
            >
              {editJob ? "Cập nhật" : "Tạo"}
            </button>
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
            <h3 className="text-[16px]">Xoá chức danh?</h3>
            <p className="text-[13px] text-muted-foreground">
              Chỉ có thể xoá chức danh không có nhân viên nào.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700"
              >
                Xoá
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────
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
        className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${narrow ? "max-w-sm" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
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
