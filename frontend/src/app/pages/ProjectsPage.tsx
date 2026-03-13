import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  projects as initialProjects, getUserById, getClientById, getContractById,
  formatVND, formatFullVND, clients, contracts, users, projectExpenses as initialExpenses,
} from '../data/mockData';
import type {
  Project, ProjectStatus, ProjectPriority, ProjectHealthStatus,
  ProjectMilestone, ProjectAssignment, ProjectExpense, ProjectExpenseCategory,
  ProjectExpenseStatus, MilestoneStatus,
} from '../data/mockData';
import {
  X, Search, Plus, Edit2, Trash2, Users, Target, DollarSign, Calendar, Filter,
  FolderKanban, TrendingUp, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Activity, ArrowUpDown, UserPlus, UserMinus,
  FileText, Send, ThumbsUp, ThumbsDown, Eye, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

// ─── Constants ──────────────────────────────────────────────
const healthColors: Record<string, string> = {
  ON_TRACK: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  AT_RISK: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELAYED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const healthLabels: Record<string, string> = { ON_TRACK: 'Đúng tiến độ', AT_RISK: 'Có rủi ro', DELAYED: 'Chậm trễ' };
const healthEmoji: Record<string, string> = { ON_TRACK: '🟢', AT_RISK: '🟡', DELAYED: '🔴' };

const statusColors: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ON_HOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
};
const statusLabels: Record<string, string> = {
  PLANNING: 'Lập kế hoạch', ACTIVE: 'Đang thực hiện', ON_HOLD: 'Tạm dừng',
  COMPLETED: 'Hoàn thành', CANCELLED: 'Huỷ bỏ', ARCHIVED: 'Lưu trữ',
};
const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const priorityLabels: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', URGENT: 'Khẩn cấp' };
const msStatusColors: Record<MilestoneStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const msStatusLabels: Record<string, string> = { PENDING: 'Chờ', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành', OVERDUE: 'Quá hạn' };
const expStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const expStatusLabels: Record<string, string> = { PENDING: 'Đang chờ', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' };
const expCategoryLabels: Record<string, string> = {
  LABOR: 'Nhân công', SOFTWARE: 'Phần mềm', HARDWARE: 'Phần cứng',
  TRAVEL: 'Công tác phí', TRAINING: 'Đào tạo', OUTSOURCE: 'Thuê ngoài', OTHER: 'Khác',
};
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const PROJECT_ROLES = ['Project Manager', 'Tech Lead', 'Senior Dev', 'Backend Dev', 'Frontend Dev', 'Full-Stack Dev', 'BA', 'QA Engineer', 'DevOps', 'Designer', 'Support Eng', 'Junior Dev'];

// ═══════════════════════════════════════════════════════════════
// MAIN: ProjectsPage — Danh sách + Tạo/Sửa + Chi tiết (Members, Milestones)
// ═══════════════════════════════════════════════════════════════
export function ProjectsPage() {
  const { currentUser, can } = useAuth();
  const isAdminMgr = can('ADMIN', 'MANAGER');

  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [tab, setTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  // Filter
  let filtered = allProjects;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(p => {
      const cl = getClientById(p.clientId);
      const pm = getUserById(p.projectManagerUserId);
      return p.projectName.toLowerCase().includes(s) || p.projectCode.toLowerCase().includes(s) ||
        cl?.shortName.toLowerCase().includes(s) || pm?.fullName.toLowerCase().includes(s);
    });
  }
  if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
  if (clientFilter) filtered = filtered.filter(p => p.clientId === clientFilter);
  if (healthFilter) filtered = filtered.filter(p => p.healthStatus === healthFilter);

  const hasFilters = search || statusFilter || clientFilter || healthFilter;

  // Handlers
  const handleSaveProject = (data: Partial<Project>) => {
    if (editProject) {
      setAllProjects(prev => prev.map(p => p.id === editProject.id ? { ...p, ...data } : p));
      if (selected?.id === editProject.id) setSelected(prev => prev ? { ...prev, ...data } : null);
      toast.success('Đã cập nhật dự án');
    } else {
      const newP: Project = {
        id: `prj-${Date.now()}`, projectCode: `PRJ-${new Date().getFullYear()}-${String(allProjects.length + 1).padStart(3, '0')}`,
        projectName: data.projectName || '', description: data.description || '',
        projectManagerUserId: data.projectManagerUserId || currentUser!.id,
        clientId: data.clientId || '', contractId: data.contractId || null,
        status: data.status || 'PLANNING', priority: data.priority || 'MEDIUM',
        healthStatus: null, progressPercent: 0,
        startDate: data.startDate || '', endDate: data.endDate || '',
        budgetAmount: data.budgetAmount || 0, spentAmount: 0,
        milestones: [], assignments: [],
      };
      setAllProjects(prev => [newP, ...prev]);
      toast.success('Đã tạo dự án mới');
    }
    setShowForm(false);
    setEditProject(null);
  };

  const handleUpdateProject = (updated: Project) => {
    setAllProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const openEdit = (p: Project) => { setEditProject(p); setShowForm(true); };
  const openCreate = () => { setEditProject(null); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px]">Dự án</h1>
        {isAdminMgr && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">
            <Plus size={16} /> Tạo dự án
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm tên dự án, mã, PM, khách hàng..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả KH</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
        </select>
        <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả tình trạng</option>
          <option value="ON_TRACK">🟢 Đúng tiến độ</option>
          <option value="AT_RISK">🟡 Có rủi ro</option>
          <option value="DELAYED">🔴 Chậm trễ</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setClientFilter(''); setHealthFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Project Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(p => {
          const cl = getClientById(p.clientId);
          const pm = getUserById(p.projectManagerUserId);
          const doneMilestones = p.milestones.filter(m => m.status === 'DONE').length;
          const totalMilestones = p.milestones.length;
          const budgetUsed = p.budgetAmount > 0 ? Math.round((p.spentAmount / p.budgetAmount) * 100) : 0;
          return (
            <div key={p.id} onClick={() => { setSelected(p); setTab('overview'); }} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColors[p.priority]}`}>{priorityLabels[p.priority]}</span>
                </div>
                {p.healthStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded ${healthColors[p.healthStatus]}`}>
                    {healthEmoji[p.healthStatus]} {healthLabels[p.healthStatus]}
                  </span>
                )}
              </div>
              <div className="text-[14px] mb-1 group-hover:text-blue-600 transition-colors">{p.projectName}</div>
              <div className="text-[12px] text-muted-foreground mb-2">{cl?.shortName || '—'} • PM: {pm?.fullName}</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${p.progressPercent}%` }} />
                </div>
                <span className="text-[11px] text-muted-foreground">{p.progressPercent}%</span>
              </div>
              {totalMilestones > 0 && (
                <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Target size={11} /> Milestone: {doneMilestones}/{totalMilestones}
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Ngân sách: {formatVND(p.budgetAmount)}</span>
                <span className={budgetUsed > 90 ? 'text-red-500' : budgetUsed > 70 ? 'text-yellow-500' : ''}>
                  Đã chi: {formatVND(p.spentAmount)} ({budgetUsed}%)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                <Calendar size={11} /> {p.startDate} → {p.endDate}
                {p.assignments.length > 0 && (
                  <span className="flex items-center gap-0.5 ml-auto"><Users size={11} /> {p.assignments.length}</span>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-[13px]">Không tìm thấy dự án nào</div>
        )}
      </div>

      {/* Detail Dialog */}
      {selected && (
        <ProjectDetailDialog
          project={selected}
          onClose={() => setSelected(null)}
          tab={tab}
          setTab={setTab}
          isAdminMgr={isAdminMgr}
          currentUser={currentUser}
          onEdit={() => openEdit(selected)}
          onUpdate={handleUpdateProject}
        />
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <ProjectFormDialog
          project={editProject}
          onSave={handleSaveProject}
          onClose={() => { setShowForm(false); setEditProject(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════
function ProjectDetailDialog({ project, onClose, tab, setTab, isAdminMgr, currentUser, onEdit, onUpdate }: {
  project: Project; onClose: () => void; tab: string; setTab: (t: string) => void;
  isAdminMgr: boolean; currentUser: any; onEdit: () => void;
  onUpdate: (p: Project) => void;
}) {
  const tabs = [
    { key: 'overview', label: 'Tổng quan', icon: <Eye size={14} /> },
    { key: 'team', label: 'Thành viên', icon: <Users size={14} /> },
    { key: 'milestones', label: 'Cột mốc', icon: <Target size={14} /> },
  ];

  const cl = getClientById(project.clientId);
  const ct = project.contractId ? getContractById(project.contractId) : null;
  const pm = getUserById(project.projectManagerUserId);
  const isPM = currentUser?.id === project.projectManagerUserId;
  const canManage = isAdminMgr || isPM;

  return (
    <Overlay onClose={onClose} wide>
      <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px]">{project.projectName}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>{statusLabels[project.status]}</span>
            {project.healthStatus && <span className={`text-[10px] px-2 py-0.5 rounded ${healthColors[project.healthStatus]}`}>{healthEmoji[project.healthStatus]} {healthLabels[project.healthStatus]}</span>}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{project.projectCode} • {cl?.shortName}</div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <button onClick={onEdit} className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"><Edit2 size={12} /> Sửa</button>}
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
      </div>

      <div className="flex border-b border-border px-4 gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2.5 text-[13px] border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'overview' && <OverviewTab project={project} pm={pm} cl={cl} ct={ct} canManage={canManage} onUpdate={onUpdate} />}
        {tab === 'team' && <TeamTab project={project} canManage={canManage} onUpdate={onUpdate} />}
        {tab === 'milestones' && <MilestonesTab project={project} canManage={canManage} onUpdate={onUpdate} />}
      </div>
    </Overlay>
  );
}

// ─── Overview Tab ───
function OverviewTab({ project, pm, cl, ct, canManage, onUpdate }: {
  project: Project; pm: any; cl: any; ct: any; canManage: boolean;
  onUpdate: (p: Project) => void;
}) {
  const budgetUsed = project.budgetAmount > 0 ? Math.round((project.spentAmount / project.budgetAmount) * 100) : 0;
  const remaining = project.budgetAmount - project.spentAmount;
  const doneMilestones = project.milestones.filter(m => m.status === 'DONE').length;
  const totalMilestones = project.milestones.length;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">{project.description}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InfoBox icon={<Calendar size={14} />} label="Bắt đầu" value={project.startDate} />
        <InfoBox icon={<Calendar size={14} />} label="Kết thúc" value={project.endDate} />
        <InfoBox label="Trạng thái" value={statusLabels[project.status]} />
        <InfoBox label="Ưu tiên" value={priorityLabels[project.priority]} />
        <InfoBox icon={<DollarSign size={14} />} label="Ngân sách" value={formatFullVND(project.budgetAmount)} />
        <InfoBox icon={<DollarSign size={14} />} label="Đã chi" value={`${formatFullVND(project.spentAmount)} (${budgetUsed}%)`} />
        <InfoBox icon={<DollarSign size={14} />} label="Còn lại" value={formatFullVND(remaining)} />
        <InfoBox label="Khách hàng" value={cl?.shortName || '—'} />
        <InfoBox label="Hợp đồng" value={ct?.contractCode || 'Chưa có'} />
        <InfoBox label="PM" value={pm?.fullName || '—'} />
        <InfoBox label="Tiến độ" value={`${project.progressPercent}%`} />
        <InfoBox label="Cột mốc" value={totalMilestones > 0 ? `${doneMilestones}/${totalMilestones} hoàn thành` : 'Chưa có'} />
      </div>

      {/* Progress & Budget bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="text-[13px] mb-2 flex items-center gap-1"><TrendingUp size={14} /> Tiến độ dự án</div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${project.progressPercent}%` }} />
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">{project.progressPercent}% hoàn thành</div>
          {canManage && (
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min="0" max="100" value={project.progressPercent}
                onChange={e => onUpdate({ ...project, progressPercent: parseInt(e.target.value) })}
                className="flex-1 h-1.5 accent-blue-500" />
              <span className="text-[12px] w-10 text-right">{project.progressPercent}%</span>
            </div>
          )}
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="text-[13px] mb-2 flex items-center gap-1"><DollarSign size={14} /> Ngân sách</div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            {formatFullVND(project.spentAmount)} / {formatFullVND(project.budgetAmount)}
            {budgetUsed > 90 && <span className="text-red-500 ml-2">⚠ Gần hết ngân sách</span>}
          </div>
        </div>
      </div>

      {/* Health Status Update */}
      {canManage && (
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="text-[13px] mb-2 flex items-center gap-1"><Activity size={14} /> Cập nhật tình trạng sức khoẻ</div>
          <div className="flex flex-wrap gap-2">
            {(['ON_TRACK', 'AT_RISK', 'DELAYED'] as ProjectHealthStatus[]).map(h => (
              <button key={h} onClick={() => onUpdate({ ...project, healthStatus: h })}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${project.healthStatus === h ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:bg-accent'}`}>
                {healthEmoji[h]} {healthLabels[h]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Update */}
      {canManage && (
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="text-[13px] mb-2 flex items-center gap-1"><FolderKanban size={14} /> Chuyển trạng thái</div>
          <div className="flex flex-wrap gap-2">
            {(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as ProjectStatus[]).map(s => (
              <button key={s} onClick={() => onUpdate({ ...project, status: s, progressPercent: s === 'COMPLETED' ? 100 : project.progressPercent })}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${project.status === s ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:bg-accent'}`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Tab ───
function TeamTab({ project, canManage, onUpdate }: {
  project: Project; canManage: boolean; onUpdate: (p: Project) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editAssign, setEditAssign] = useState<ProjectAssignment | null>(null);

  const assignedIds = project.assignments.map(a => a.userId);
  const availUsers = users.filter(u => u.accountStatus === 'ACTIVE' && !assignedIds.includes(u.id));
  const totalAllocation = project.assignments.reduce((sum, a) => sum + a.allocationPercent, 0);
  const billableCount = project.assignments.filter(a => a.isBillable).length;

  const handleAdd = (data: { userId: string; roleInProject: string; allocationPercent: number; isBillable: boolean }) => {
    const newAssign: ProjectAssignment = { ...data, projectId: project.id };
    onUpdate({ ...project, assignments: [...project.assignments, newAssign] });
    setShowAdd(false);
    toast.success('Đã thêm thành viên vào dự án');
  };

  const handleRemove = (userId: string) => {
    onUpdate({ ...project, assignments: project.assignments.filter(a => a.userId !== userId) });
    toast.success('Đã xoá thành viên khỏi dự án');
  };

  const handleEditSave = (data: { userId: string; roleInProject: string; allocationPercent: number; isBillable: boolean }) => {
    onUpdate({
      ...project,
      assignments: project.assignments.map(a => a.userId === data.userId ? { ...a, ...data } : a),
    });
    setEditAssign(null);
    toast.success('Đã cập nhật phân công');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {project.assignments.length} thành viên • Tổng phân bổ: {totalAllocation}% • Billable: {billableCount}
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px]">
            <UserPlus size={14} /> Thêm
          </button>
        )}
      </div>

      {project.assignments.length > 0 ? (
        <div className="space-y-2">
          {project.assignments.map(a => {
            const u = getUserById(a.userId);
            return (
              <div key={a.userId} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-[12px] shrink-0">
                  {u?.fullName.split(' ').slice(-1)[0][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]">{u?.fullName} <span className="text-muted-foreground">({u?.userCode})</span></div>
                  <div className="text-[11px] text-muted-foreground">{a.roleInProject}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[12px]">{a.allocationPercent}%</div>
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${a.allocationPercent}%` }} />
                    </div>
                  </div>
                  {a.isBillable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Billable</span>}
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditAssign(a)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={12} /></button>
                      <button onClick={() => handleRemove(a.userId)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><UserMinus size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có thành viên nào được gán</div>
      )}

      {showAdd && (
        <AssignmentFormDialog
          title="Thêm thành viên"
          availUsers={availUsers}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editAssign && (
        <AssignmentFormDialog
          title={`Sửa phân công: ${getUserById(editAssign.userId)?.fullName}`}
          initial={editAssign}
          onSave={handleEditSave}
          onClose={() => setEditAssign(null)}
        />
      )}
    </div>
  );
}

// ─── Milestones Tab ───
function MilestonesTab({ project, canManage, onUpdate }: {
  project: Project; canManage: boolean; onUpdate: (p: Project) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editMs, setEditMs] = useState<ProjectMilestone | null>(null);

  const handleAdd = (data: { name: string; ownerUserId: string; dueDate: string }) => {
    const ms: ProjectMilestone = {
      id: `ms-${Date.now()}`, projectId: project.id,
      name: data.name, ownerUserId: data.ownerUserId, dueDate: data.dueDate, status: 'PENDING',
    };
    onUpdate({ ...project, milestones: [...project.milestones, ms] });
    setShowAdd(false);
    toast.success('Đã thêm cột mốc');
  };

  const handleEditSave = (msId: string, data: { name: string; ownerUserId: string; dueDate: string }) => {
    onUpdate({
      ...project,
      milestones: project.milestones.map(m => m.id === msId ? { ...m, ...data } : m),
    });
    setEditMs(null);
    toast.success('Đã cập nhật cột mốc');
  };

  const handleStatusChange = (msId: string, newStatus: MilestoneStatus) => {
    onUpdate({
      ...project,
      milestones: project.milestones.map(m =>
        m.id === msId ? { ...m, status: newStatus, completedAt: newStatus === 'DONE' ? new Date().toISOString().slice(0, 10) : m.completedAt } : m
      ),
    });
    toast.success(`Đã chuyển trạng thái → ${msStatusLabels[newStatus]}`);
  };

  const handleDelete = (msId: string) => {
    onUpdate({ ...project, milestones: project.milestones.filter(m => m.id !== msId) });
    toast.success('Đã xoá cột mốc');
  };

  // All people in project
  const projectMembers = project.assignments.map(a => getUserById(a.userId)).filter(Boolean);

  // Status transition rules
  const nextStatuses: Record<MilestoneStatus, MilestoneStatus[]> = {
    PENDING: ['IN_PROGRESS'],
    IN_PROGRESS: ['DONE', 'PENDING'],
    DONE: ['IN_PROGRESS'],
    OVERDUE: ['IN_PROGRESS', 'DONE'],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {project.milestones.length} cột mốc •
          <span className="text-green-600 ml-1">{project.milestones.filter(m => m.status === 'DONE').length} hoàn thành</span> •
          <span className="text-blue-600 ml-1">{project.milestones.filter(m => m.status === 'IN_PROGRESS').length} đang làm</span>
          {project.milestones.filter(m => m.status === 'OVERDUE').length > 0 && (
            <span className="text-red-600 ml-1">• {project.milestones.filter(m => m.status === 'OVERDUE').length} quá hạn</span>
          )}
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px]">
            <Plus size={14} /> Thêm cột mốc
          </button>
        )}
      </div>

      {project.milestones.length > 0 ? (
        <div className="space-y-2">
          {project.milestones.map((m, idx) => {
            const owner = getUserById(m.ownerUserId);
            const avail = nextStatuses[m.status] || [];
            return (
              <div key={m.id} className={`p-4 rounded-lg border ${m.status === 'DONE' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : m.status === 'OVERDUE' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] shrink-0 mt-0.5 ${m.status === 'DONE' ? 'bg-green-500 text-white' : m.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' : m.status === 'OVERDUE' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px]">{m.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${msStatusColors[m.status]}`}>{msStatusLabels[m.status]}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Chủ sở hữu: {owner?.fullName || '—'} • Hạn: {m.dueDate}
                      {m.completedAt && <span className="text-green-600"> • Hoàn thành: {m.completedAt}</span>}
                    </div>
                    {canManage && avail.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {avail.map(ns => (
                          <button key={ns} onClick={() => handleStatusChange(m.id, ns)}
                            className={`text-[11px] px-2 py-1 rounded border border-border hover:bg-accent flex items-center gap-1`}>
                            {ns === 'IN_PROGRESS' ? <Clock size={10} /> : ns === 'DONE' ? <CheckCircle2 size={10} /> : null}
                            → {msStatusLabels[ns]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditMs(m)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={12} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có cột mốc nào</div>
      )}

      {showAdd && (
        <MilestoneFormDialog
          members={projectMembers as any[]}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editMs && (
        <MilestoneFormDialog
          members={projectMembers as any[]}
          initial={editMs}
          onSave={(d) => handleEditSave(editMs.id, d)}
          onClose={() => setEditMs(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT EXPENSES PAGE
// ═══════════════════════════════════════════════════════════════
export function ProjectExpensesPage() {
  const { currentUser, can } = useAuth();
  const isAdminMgr = can('ADMIN', 'MANAGER');

  const [expenses, setExpenses] = useState<ProjectExpense[]>(initialExpenses);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<ProjectExpense | null>(null);

  let filtered = expenses;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(e => e.description.toLowerCase().includes(s));
  }
  if (projectFilter) filtered = filtered.filter(e => e.projectId === projectFilter);
  if (statusFilter) filtered = filtered.filter(e => e.status === statusFilter);
  if (categoryFilter) filtered = filtered.filter(e => e.category === categoryFilter);

  const pendingCount = expenses.filter(e => e.status === 'PENDING').length;
  const totalApproved = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0);

  const handleAdd = (data: { projectId: string; description: string; amount: number; category: ProjectExpenseCategory; note: string }) => {
    const exp: ProjectExpense = {
      id: `pex-${Date.now()}`, ...data,
      submittedByUserId: currentUser!.id, submittedDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
    };
    setExpenses(prev => [exp, ...prev]);
    setShowAdd(false);
    toast.success('Đã gửi chi phí chờ duyệt');
  };

  const handleApprove = (id: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' as ProjectExpenseStatus, approvedByUserId: currentUser!.id, approvedDate: new Date().toISOString().slice(0, 10) } : e));
    setShowDetail(null);
    toast.success('Đã duyệt chi phí');
  };

  const handleReject = (id: string, reason: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED' as ProjectExpenseStatus, approvedByUserId: currentUser!.id, approvedDate: new Date().toISOString().slice(0, 10), rejectReason: reason } : e));
    setShowDetail(null);
    toast.success('Đã từ chối chi phí');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px]">Chi phí dự án</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">
          <Send size={16} /> Gửi chi phí
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock size={12} /> Đang chờ duyệt</div>
          <div className="text-[20px] mt-1 text-yellow-600">{pendingCount}</div>
          <div className="text-[12px] text-muted-foreground">{formatFullVND(totalPending)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><CheckCircle2 size={12} /> Đã duyệt</div>
          <div className="text-[20px] mt-1 text-green-600">{expenses.filter(e => e.status === 'APPROVED').length}</div>
          <div className="text-[12px] text-muted-foreground">{formatFullVND(totalApproved)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle size={12} /> Bị từ chối</div>
          <div className="text-[20px] mt-1 text-red-600">{expenses.filter(e => e.status === 'REJECTED').length}</div>
          <div className="text-[12px] text-muted-foreground">{formatFullVND(expenses.filter(e => e.status === 'REJECTED').reduce((s, e) => s + e.amount, 0))}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm mô tả chi phí..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả dự án</option>
          {initialProjects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả TT</option>
          {Object.entries(expStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả loại</option>
          {Object.entries(expCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Dự án</th>
                <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Mô tả</th>
                <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Loại</th>
                <th className="text-right px-4 py-3 text-[11px] text-muted-foreground">Số tiền</th>
                <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Người gửi</th>
                <th className="text-left px-4 py-3 text-[11px] text-muted-foreground">Ngày gửi</th>
                <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">Trạng thái</th>
                <th className="text-center px-4 py-3 text-[11px] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const prj = initialProjects.find(p => p.id === e.projectId);
                const submitter = getUserById(e.submittedByUserId);
                return (
                  <tr key={e.id} className="border-t border-border hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-[12px]">{prj?.projectName || '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{e.description}</td>
                    <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded bg-muted">{expCategoryLabels[e.category]}</span></td>
                    <td className="px-4 py-3 text-right">{formatFullVND(e.amount)}</td>
                    <td className="px-4 py-3 text-[12px]">{submitter?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-[12px]">{e.submittedDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${expStatusColors[e.status]}`}>{expStatusLabels[e.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setShowDetail(e)} className="text-[11px] text-blue-600 hover:underline">Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Không có chi phí nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddExpenseDialog onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {showDetail && (
        <ExpenseDetailDialog
          expense={showDetail}
          isAdminMgr={isAdminMgr}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowDetail(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT HEALTH DASHBOARD
// ═══════════════════════════════════════════════════════════════
export function ProjectHealthPage() {
  const allProjects = initialProjects;
  const allExpenses = initialExpenses;
  const activeProjects = allProjects.filter(p => ['ACTIVE', 'ON_HOLD'].includes(p.status));

  const healthCounts = {
    ON_TRACK: activeProjects.filter(p => p.healthStatus === 'ON_TRACK').length,
    AT_RISK: activeProjects.filter(p => p.healthStatus === 'AT_RISK').length,
    DELAYED: activeProjects.filter(p => p.healthStatus === 'DELAYED').length,
  };

  const totalBudget = activeProjects.reduce((s, p) => s + p.budgetAmount, 0);
  const totalSpent = activeProjects.reduce((s, p) => s + p.spentAmount, 0);
  const avgProgress = activeProjects.length > 0 ? Math.round(activeProjects.reduce((s, p) => s + p.progressPercent, 0) / activeProjects.length) : 0;

  // Budget vs Spent bar chart data
  const budgetChartData = activeProjects.map(p => ({
    id: p.id,
    name: p.projectCode,
    'Ngân sách': p.budgetAmount / 1000000,
    'Đã chi': p.spentAmount / 1000000,
  }));

  // Expense category pie chart
  const approvedExpenses = allExpenses.filter(e => e.status === 'APPROVED');
  const categoryTotals: Record<string, number> = {};
  approvedExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const categoryPieData = Object.entries(categoryTotals).map(([k, v]) => ({
    name: expCategoryLabels[k] || k,
    value: v / 1000000,
  }));

  // Health pie
  const healthPieData = [
    { name: 'Đúng tiến độ', value: healthCounts.ON_TRACK, color: '#22c55e' },
    { name: 'Có rủi ro', value: healthCounts.AT_RISK, color: '#f59e0b' },
    { name: 'Chậm trễ', value: healthCounts.DELAYED, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // All milestones
  const allMilestones = activeProjects.flatMap(p => p.milestones);
  const overdueMilestones = allMilestones.filter(m => m.status === 'OVERDUE');
  const upcomingMilestones = allMilestones
    .filter(m => m.status === 'IN_PROGRESS' || m.status === 'PENDING')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Dashboard sức khoẻ dự án</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><FolderKanban size={12} /> Dự án đang chạy</div>
          <div className="text-[24px] mt-1">{activeProjects.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp size={12} /> Tiến độ TB</div>
          <div className="text-[24px] mt-1">{avgProgress}%</div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><DollarSign size={12} /> Tổng ngân sách</div>
          <div className="text-[20px] mt-1">{formatVND(totalBudget)}</div>
          <div className="text-[12px] text-muted-foreground">Đã chi: {formatVND(totalSpent)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle size={12} /> Cột mốc quá hạn</div>
          <div className={`text-[24px] mt-1 ${overdueMilestones.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{overdueMilestones.length}</div>
        </div>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-3 gap-3">
        {([['ON_TRACK', '🟢', 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'],
           ['AT_RISK', '🟡', 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'],
           ['DELAYED', '🔴', 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800']] as const).map(([key, emoji, cls]) => (
          <div key={key} className={`border rounded-xl p-4 ${cls}`}>
            <div className="text-[28px] mb-1">{emoji}</div>
            <div className="text-[14px]">{healthLabels[key]}</div>
            <div className="text-[24px] mt-1">{healthCounts[key]}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {activeProjects.filter(p => p.healthStatus === key).map(p => p.projectCode).join(', ') || 'Không có'}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget vs Spent */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[14px] mb-3 flex items-center gap-1.5"><BarChart3 size={16} /> Ngân sách vs Chi tiêu (triệu ₫)</div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData}>
                <CartesianGrid key="budget-grid" strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis key="budget-xaxis" dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis key="budget-yaxis" tick={{ fontSize: 11 }} />
                <Tooltip key="budget-tooltip" formatter={(v: number) => `${v.toFixed(0)} tr`} />
                <Legend key="budget-legend" wrapperStyle={{ fontSize: 12 }} />
                <Bar key="bar-budget" dataKey="Ngân sách" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar key="bar-spent" dataKey="Đã chi" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Pie */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[14px] mb-3 flex items-center gap-1.5"><PieChartIcon size={16} /> Phân bố tình trạng sức khoẻ</div>
          <div className="h-[280px]">
            {healthPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="health-pie" data={healthPieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {healthPieData.map((d) => <Cell key={`health-${d.name}`} fill={d.color} />)}
                  </Pie>
                  <Tooltip key="health-tooltip" />
                  <Legend key="health-legend" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[14px] mb-3 flex items-center gap-1.5"><PieChartIcon size={16} /> Chi phí theo danh mục (triệu ₫)</div>
          <div className="h-[280px]">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie key="cat-pie" data={categoryPieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(0)}tr`}>
                    {categoryPieData.map((d, i) => <Cell key={`cat-${d.name}-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip key="cat-tooltip" formatter={(v: number) => `${v.toFixed(0)} tr`} />
                  <Legend key="cat-legend" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Upcoming milestones */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[14px] mb-3 flex items-center gap-1.5"><Target size={16} /> Cột mốc sắp tới</div>
          {upcomingMilestones.length > 0 ? (
            <div className="space-y-2">
              {upcomingMilestones.map(m => {
                const prj = activeProjects.find(p => p.milestones.some(ms => ms.id === m.id));
                const owner = getUserById(m.ownerUserId);
                const daysLeft = Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${daysLeft <= 7 ? 'bg-red-500' : daysLeft <= 14 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px]">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{prj?.projectCode} • {owner?.fullName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px]">{m.dueDate}</div>
                      <div className={`text-[11px] ${daysLeft <= 7 ? 'text-red-500' : daysLeft <= 14 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {daysLeft > 0 ? `Còn ${daysLeft} ngày` : daysLeft === 0 ? 'Hôm nay' : `Quá ${-daysLeft} ngày`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-[13px]">Không có cột mốc sắp tới</div>
          )}

          {/* Overdue milestones */}
          {overdueMilestones.length > 0 && (
            <div className="mt-4">
              <div className="text-[13px] text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Quá hạn ({overdueMilestones.length})</div>
              {overdueMilestones.map(m => {
                const prj = activeProjects.find(p => p.milestones.some(ms => ms.id === m.id));
                return (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-900/10 text-[12px] mb-1">
                    <span className="text-red-600">{m.name}</span>
                    <span className="text-muted-foreground">• {prj?.projectCode} • Hạn: {m.dueDate}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Detail Cards */}
      <div className="space-y-3">
        <h2 className="text-[16px] flex items-center gap-1.5"><Gauge size={18} /> Chi tiết từng dự án</h2>
        {activeProjects.map(p => {
          const cl = getClientById(p.clientId);
          const pm = getUserById(p.projectManagerUserId);
          const budgetUsed = p.budgetAmount > 0 ? Math.round((p.spentAmount / p.budgetAmount) * 100) : 0;
          const doneMilestones = p.milestones.filter(m => m.status === 'DONE').length;
          const totalMs = p.milestones.length;
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[18px] shrink-0 ${p.healthStatus === 'ON_TRACK' ? 'bg-green-100 dark:bg-green-900/30' : p.healthStatus === 'AT_RISK' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {p.healthStatus ? healthEmoji[p.healthStatus] : '⚪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px]">{p.projectName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColors[p.priority]}`}>{priorityLabels[p.priority]}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{cl?.shortName} • PM: {pm?.fullName} • {p.startDate} → {p.endDate}</div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Tiến độ</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progressPercent}%` }} />
                        </div>
                        <span className="text-[12px]">{p.progressPercent}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Ngân sách</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
                        </div>
                        <span className="text-[12px]">{budgetUsed}%</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{formatVND(p.spentAmount)} / {formatVND(p.budgetAmount)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Cột mốc</div>
                      <div className="text-[13px]">{totalMs > 0 ? `${doneMilestones}/${totalMs}` : '—'}</div>
                      {p.milestones.some(m => m.status === 'OVERDUE') && (
                        <div className="text-[11px] text-red-500 flex items-center gap-0.5"><AlertTriangle size={10} /> Có quá hạn</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>{children}</div>
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

function InfoBox({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-[13px] mt-0.5">{value}</div>
    </div>
  );
}

// ─── Project Form Dialog ───
function ProjectFormDialog({ project, onSave, onClose }: {
  project: Project | null;
  onSave: (data: Partial<Project>) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    projectName: project?.projectName || '',
    description: project?.description || '',
    projectManagerUserId: project?.projectManagerUserId || '',
    clientId: project?.clientId || '',
    contractId: project?.contractId || '',
    status: project?.status || 'PLANNING',
    priority: project?.priority || 'MEDIUM',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    budgetAmount: project?.budgetAmount ? String(project.budgetAmount) : '',
  });

  const activeManagers = users.filter(u => u.accountStatus === 'ACTIVE' && (u.roles.includes('MANAGER') || u.roles.includes('ADMIN')));
  const clientContracts = f.clientId ? contracts.filter(c => c.clientId === f.clientId) : [];

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={project ? 'Cập nhật dự án' : 'Tạo dự án mới'} onClose={onClose} />
      <div className="p-4 space-y-3">
        <Field label="Tên dự án *" value={f.projectName} onChange={v => setF(p => ({ ...p, projectName: v }))} placeholder="VD: Smart Warehouse v2.0" />
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Mô tả</label>
          <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="PM (Quản lý) *" value={f.projectManagerUserId} onChange={v => setF(p => ({ ...p, projectManagerUserId: v }))} options={activeManagers.map(u => ({ value: u.id, label: `${u.fullName} (${u.userCode})` }))} placeholder="-- Chọn PM --" />
          <Sel label="Khách hàng *" value={f.clientId} onChange={v => setF(p => ({ ...p, clientId: v, contractId: '' }))} options={clients.map(c => ({ value: c.id, label: c.shortName }))} placeholder="-- Chọn KH --" />
        </div>
        {clientContracts.length > 0 && (
          <Sel label="Hợp đồng" value={f.contractId || ''} onChange={v => setF(p => ({ ...p, contractId: v }))} options={clientContracts.map(c => ({ value: c.id, label: `${c.contractCode} - ${c.title}` }))} placeholder="-- Chọn HĐ (tuỳ chọn) --" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Trạng thái" value={f.status} onChange={v => setF(p => ({ ...p, status: v as ProjectStatus }))} options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))} />
          <Sel label="Độ ưu tiên" value={f.priority} onChange={v => setF(p => ({ ...p, priority: v as ProjectPriority }))} options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày bắt đầu *" value={f.startDate} onChange={v => setF(p => ({ ...p, startDate: v }))} type="date" />
          <Field label="Ngày kết thúc *" value={f.endDate} onChange={v => setF(p => ({ ...p, endDate: v }))} type="date" />
        </div>
        <Field label="Ngân sách (VNĐ) *" value={f.budgetAmount} onChange={v => setF(p => ({ ...p, budgetAmount: v }))} type="number" placeholder="VD: 1500000000" />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => {
        if (!f.projectName || !f.projectManagerUserId || !f.clientId || !f.startDate || !f.endDate || !f.budgetAmount) {
          toast.error('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
        }
        onSave({
          projectName: f.projectName, description: f.description,
          projectManagerUserId: f.projectManagerUserId, clientId: f.clientId,
          contractId: f.contractId || null,
          status: f.status as ProjectStatus, priority: f.priority as ProjectPriority,
          startDate: f.startDate, endDate: f.endDate,
          budgetAmount: parseFloat(f.budgetAmount),
        });
      }} label={project ? 'Cập nhật' : 'Tạo dự án'} />
    </Overlay>
  );
}

// ─── Assignment Form Dialog ───
function AssignmentFormDialog({ title, availUsers, initial, onSave, onClose }: {
  title: string;
  availUsers?: any[];
  initial?: ProjectAssignment;
  onSave: (data: { userId: string; roleInProject: string; allocationPercent: number; isBillable: boolean }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    userId: initial?.userId || '',
    roleInProject: initial?.roleInProject || '',
    allocationPercent: String(initial?.allocationPercent ?? 100),
    isBillable: initial?.isBillable ?? true,
  });

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={title} onClose={onClose} />
      <div className="p-4 space-y-3">
        {!initial && availUsers && (
          <Sel label="Nhân viên *" value={f.userId} onChange={v => setF(p => ({ ...p, userId: v }))} options={availUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.userCode})` }))} placeholder="-- Chọn nhân viên --" />
        )}
        <Sel label="Vai trò trong dự án *" value={f.roleInProject} onChange={v => setF(p => ({ ...p, roleInProject: v }))} options={PROJECT_ROLES.map(r => ({ value: r, label: r }))} placeholder="-- Chọn vai trò --" />
        <Field label="Phân bổ (%)" value={f.allocationPercent} onChange={v => setF(p => ({ ...p, allocationPercent: v }))} type="number" />
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-muted-foreground">Tính phí (Billable):</label>
          <button onClick={() => setF(p => ({ ...p, isBillable: !p.isBillable }))} className={`px-3 py-1.5 rounded-lg text-[12px] border ${f.isBillable ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-border text-muted-foreground'}`}>
            {f.isBillable ? 'Có' : 'Không'}
          </button>
        </div>
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => {
        if ((!initial && !f.userId) || !f.roleInProject) { toast.error('Vui lòng điền đầy đủ'); return; }
        onSave({ userId: f.userId, roleInProject: f.roleInProject, allocationPercent: parseInt(f.allocationPercent) || 0, isBillable: f.isBillable });
      }} label="Lưu" />
    </Overlay>
  );
}

// ─── Milestone Form Dialog ───
function MilestoneFormDialog({ members, initial, onSave, onClose }: {
  members: any[];
  initial?: ProjectMilestone;
  onSave: (data: { name: string; ownerUserId: string; dueDate: string }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name || '',
    ownerUserId: initial?.ownerUserId || '',
    dueDate: initial?.dueDate || '',
  });

  const ownerOptions = members.length > 0
    ? members.map(u => ({ value: u.id, label: u.fullName }))
    : users.filter(u => u.accountStatus === 'ACTIVE').map(u => ({ value: u.id, label: `${u.fullName} (${u.userCode})` }));

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={initial ? 'Sửa cột mốc' : 'Thêm cột mốc'} onClose={onClose} />
      <div className="p-4 space-y-3">
        <Field label="Tên cột mốc *" value={f.name} onChange={v => setF(p => ({ ...p, name: v }))} placeholder="VD: UAT & Deployment" />
        <Sel label="Chủ sở hữu *" value={f.ownerUserId} onChange={v => setF(p => ({ ...p, ownerUserId: v }))} options={ownerOptions} placeholder="-- Chọn --" />
        <Field label="Hạn hoàn thành *" value={f.dueDate} onChange={v => setF(p => ({ ...p, dueDate: v }))} type="date" />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => {
        if (!f.name || !f.ownerUserId || !f.dueDate) { toast.error('Vui lòng điền đầy đủ'); return; }
        onSave(f);
      }} label="Lưu" />
    </Overlay>
  );
}

// ─── Add Expense Dialog ───
function AddExpenseDialog({ onSave, onClose }: {
  onSave: (d: { projectId: string; description: string; amount: number; category: ProjectExpenseCategory; note: string }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({ projectId: '', description: '', amount: '', category: '' as string, note: '' });
  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Gửi chi phí dự án" onClose={onClose} />
      <div className="p-4 space-y-3">
        <Sel label="Dự án *" value={f.projectId} onChange={v => setF(p => ({ ...p, projectId: v }))} options={initialProjects.filter(p => ['ACTIVE', 'PLANNING'].includes(p.status)).map(p => ({ value: p.id, label: p.projectName }))} placeholder="-- Chọn dự án --" />
        <Field label="Mô tả chi phí *" value={f.description} onChange={v => setF(p => ({ ...p, description: v }))} placeholder="VD: Mua license phần mềm..." />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số tiền (VNĐ) *" value={f.amount} onChange={v => setF(p => ({ ...p, amount: v }))} type="number" placeholder="VD: 50000000" />
          <Sel label="Danh mục *" value={f.category} onChange={v => setF(p => ({ ...p, category: v }))} options={Object.entries(expCategoryLabels).map(([k, v]) => ({ value: k, label: v }))} placeholder="-- Chọn --" />
        </div>
        <Field label="Ghi chú" value={f.note} onChange={v => setF(p => ({ ...p, note: v }))} />
      </div>
      <DlgFooter onCancel={onClose} onConfirm={() => {
        const a = parseFloat(f.amount);
        if (!f.projectId || !f.description || !a || !f.category) { toast.error('Vui lòng điền đầy đủ'); return; }
        onSave({ projectId: f.projectId, description: f.description, amount: a, category: f.category as ProjectExpenseCategory, note: f.note });
      }} label="Gửi chi phí" />
    </Overlay>
  );
}

// ─── Expense Detail Dialog ───
function ExpenseDetailDialog({ expense, isAdminMgr, onApprove, onReject, onClose }: {
  expense: ProjectExpense; isAdminMgr: boolean;
  onApprove: (id: string) => void; onReject: (id: string, reason: string) => void;
  onClose: () => void;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const prj = initialProjects.find(p => p.id === expense.projectId);
  const submitter = getUserById(expense.submittedByUserId);
  const approver = expense.approvedByUserId ? getUserById(expense.approvedByUserId) : null;

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Chi tiết chi phí" onClose={onClose} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="Dự án" value={prj?.projectName || '—'} />
          <InfoBox label="Danh mục" value={expCategoryLabels[expense.category]} />
          <InfoBox label="Số tiền" value={formatFullVND(expense.amount)} icon={<DollarSign size={12} />} />
          <InfoBox label="Trạng thái" value={expStatusLabels[expense.status]} />
          <InfoBox label="Người gửi" value={submitter?.fullName || '—'} />
          <InfoBox label="Ngày gửi" value={expense.submittedDate} />
          {approver && <InfoBox label="Người duyệt" value={approver.fullName} />}
          {expense.approvedDate && <InfoBox label="Ngày duyệt" value={expense.approvedDate} />}
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-[11px] text-muted-foreground mb-1">Mô tả</div>
          <div className="text-[13px]">{expense.description}</div>
        </div>
        {expense.rejectReason && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="text-[11px] text-red-500 mb-1">Lý do từ chối</div>
            <div className="text-[13px] text-red-700 dark:text-red-400">{expense.rejectReason}</div>
          </div>
        )}
        {expense.note && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Ghi chú</div>
            <div className="text-[13px]">{expense.note}</div>
          </div>
        )}

        {isAdminMgr && expense.status === 'PENDING' && !showReject && (
          <div className="flex gap-2">
            <button onClick={() => onApprove(expense.id)} className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700">
              <ThumbsUp size={14} /> Duyệt
            </button>
            <button onClick={() => setShowReject(true)} className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700">
              <ThumbsDown size={14} /> Từ chối
            </button>
          </div>
        )}

        {showReject && (
          <div className="space-y-2">
            <label className="block text-[12px] text-muted-foreground">Lý do từ chối *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="Nhập lý do..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-lg border border-border text-[13px]">Huỷ</button>
              <button onClick={() => {
                if (!rejectReason.trim()) { toast.error('Vui lòng nhập lý do'); return; }
                onReject(expense.id, rejectReason);
              }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px]">Xác nhận từ chối</button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
