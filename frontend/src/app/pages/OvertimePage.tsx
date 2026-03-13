import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  overtimeRequests as initialOTReqs, userCompensations, departments, holidays,
  getUserById, getDepartmentById, formatVND,
} from '../data/mockData';
import type { OvertimeRequest, OvertimeRequestStatus } from '../data/mockData';
import {
  Plus, Check, X, Search, Clock, Timer, AlertTriangle,
  ListChecks, Ban, CheckCircle2, MessageSquare, Info,
  DollarSign, Zap, FileText, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────
const statusColors: Record<OvertimeRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã huỷ',
};

const getMultiplier = (isHoliday: boolean, isWeekend: boolean) =>
  isHoliday ? 3.0 : isWeekend ? 2.0 : 1.5;
const getMultiplierLabel = (isHoliday: boolean, isWeekend: boolean) =>
  isHoliday ? 'Ngày lễ ×3.0' : isWeekend ? 'Cuối tuần ×2.0' : 'Ngày thường ×1.5';
const getMultiplierBadge = (isHoliday: boolean, isWeekend: boolean) =>
  isHoliday ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    : isWeekend ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

// Get latest baseSalary for a user from compensations
const getLatestBaseSalary = (userId: string): number => {
  const comps = userCompensations
    .filter(c => c.userId === userId)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return comps.length > 0 ? comps[0].baseSalary : 15000000; // fallback
};

// hourlyRate = baseSalary / 22 workdays / 8 hours (VN standard)
const getHourlyRate = (userId: string): number => getLatestBaseSalary(userId) / 22 / 8;

// Calculate estimated OT pay
const calcOTPay = (userId: string, minutes: number, isHoliday: boolean, isWeekend: boolean): number => {
  const hourlyRate = getHourlyRate(userId);
  const hours = minutes / 60;
  const multiplier = getMultiplier(isHoliday, isWeekend);
  return Math.round(hours * multiplier * hourlyRate);
};

const calcMinutes = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
};

const emptyForm = { workDate: '', startTime: '18:00', endTime: '20:00', reason: '', isWeekend: false, isHoliday: false };

// ═══════════════════════════════════════════════════════════════════
// MAIN: OvertimePage
// ═══════════════════════════════════════════════════════════════════
export function OvertimePage() {
  const { currentUser, can } = useAuth();
  const [reqs, setReqs] = useState<OvertimeRequest[]>(initialOTReqs);
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<OvertimeRequest | null>(null);

  const isAdmin = can('ADMIN');
  const isHR = can('HR');
  const isAdminHR = isAdmin || isHR;
  const isManager = can('MANAGER');
  const isEmployee = can('EMPLOYEE');

  // Tabs
  type TabKey = 'my' | 'approve' | 'all';
  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; icon: JSX.Element; badge?: number }[] = [];

    if (isEmployee || isManager) {
      tabs.push({ key: 'my', label: 'OT của tôi', icon: <Timer size={14} /> });
    }
    if (isManager || isAdminHR) {
      const pending = reqs.filter(r => r.status === 'PENDING' && (isAdminHR || canApproveOT(r, currentUser!.id))).length;
      tabs.push({ key: 'approve', label: 'Duyệt yêu cầu OT', icon: <ListChecks size={14} />, badge: pending });
    }
    if (isAdminHR) {
      tabs.push({ key: 'all', label: 'Tổng hợp OT', icon: <FileText size={14} /> });
    }
    return tabs;
  }, [isEmployee, isManager, isAdminHR, reqs, currentUser]);

  const defaultTab: TabKey = isAdminHR ? 'approve' : isManager ? 'approve' : 'my';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // ─── Handlers ─────────────
  const handleApprove = useCallback((id: string, comment?: string) => {
    setReqs(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'APPROVED' as const,
      approverUserId: currentUser?.id || null,
      comment: comment || r.comment,
    } : r));
    toast.success('Đã duyệt yêu cầu OT');
  }, [currentUser]);

  const handleReject = useCallback((id: string, comment: string) => {
    if (!comment.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    setReqs(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'REJECTED' as const,
      approverUserId: currentUser?.id || null,
      comment,
    } : r));
    toast.success('Đã từ chối yêu cầu OT');
  }, [currentUser]);

  const handleCancel = useCallback((id: string) => {
    setReqs(prev => prev.map(r => r.id === id && r.status === 'PENDING' ? { ...r, status: 'CANCELLED' as const } : r));
    toast.success('Đã huỷ yêu cầu OT');
  }, []);

  const handleUpdateActual = useCallback((id: string, actualMinutes: number) => {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, actualMinutes } : r));
    toast.success('Đã cập nhật số giờ thực tế');
  }, []);

  const handleCreate = useCallback((form: typeof emptyForm) => {
    if (!form.workDate || !form.startTime || !form.endTime || !form.reason.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return false;
    }
    const minutes = calcMinutes(form.startTime, form.endTime);
    if (minutes <= 0) { toast.error('Giờ kết thúc phải sau giờ bắt đầu'); return false; }
    if (minutes > 12 * 60) { toast.error('Ca OT không được quá 12 giờ'); return false; }

    const date = new Date(form.workDate);
    const dow = date.getDay();
    const isWeekendAuto = form.isWeekend || dow === 0 || dow === 6;
    const isHolidayCheck = form.isHoliday || holidays.some(h => h.date === form.workDate);

    const newReq: OvertimeRequest = {
      id: `ot-new-${Date.now()}`,
      userId: currentUser!.id,
      approverUserId: null,
      workDate: form.workDate,
      startTime: form.startTime,
      endTime: form.endTime,
      plannedMinutes: minutes,
      isWeekend: isWeekendAuto,
      isHoliday: isHolidayCheck,
      reason: form.reason,
      status: 'PENDING',
    };
    setReqs(prev => [newReq, ...prev]);
    toast.success('Đã gửi yêu cầu OT — chờ phê duyệt');
    return true;
  }, [currentUser]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Quản lý làm thêm giờ (OT)</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
          <Plus size={16} /> Tạo yêu cầu OT
        </button>
      </div>

      {/* Rate info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Hệ số tính OT:</span>{' '}
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[11px]">Ngày thường ×1.5</span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[11px] ml-1">Cuối tuần ×2.0</span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-[11px] ml-1">Ngày lễ ×3.0</span>
          <span className="ml-2 text-muted-foreground">| Công thức: Số giờ × Hệ số × (Lương cơ bản / 22 ngày / 8 giờ)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {availableTabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
            {t.badge ? <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {activeTab === 'my' && (
        <MyOTTab
          reqs={reqs.filter(r => r.userId === currentUser!.id)}
          userId={currentUser!.id}
          onCancel={handleCancel}
          onViewDetail={setDetailReq}
        />
      )}
      {activeTab === 'approve' && (
        <ApproveOTTab
          reqs={reqs.filter(r => r.status === 'PENDING' && (isAdminHR || canApproveOT(r, currentUser!.id)))}
          allReqs={reqs}
          isAdminHR={isAdminHR}
          onApprove={handleApprove}
          onReject={handleReject}
          onUpdateActual={handleUpdateActual}
          onViewDetail={setDetailReq}
        />
      )}
      {activeTab === 'all' && (
        <AllOTTab reqs={reqs} onViewDetail={setDetailReq} onUpdateActual={handleUpdateActual} />
      )}

      {/* Create Dialog */}
      {showForm && (
        <CreateOTDialog
          userId={currentUser!.id}
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail Dialog */}
      {detailReq && (
        <OTDetailDialog
          req={reqs.find(r => r.id === detailReq.id) || detailReq}
          onClose={() => setDetailReq(null)}
          canApprove={(detailReq.status === 'PENDING') && (isAdminHR || isManager)}
          canCancel={detailReq.status === 'PENDING' && detailReq.userId === currentUser!.id}
          canEditActual={detailReq.status === 'APPROVED' && isAdminHR}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          onUpdateActual={handleUpdateActual}
        />
      )}
    </div>
  );
}

// ─── Helper ─────────────
function canApproveOT(req: OvertimeRequest, userId: string): boolean {
  const user = getUserById(req.userId);
  if (!user) return false;
  return user.managerId === userId;
}

// ═══════════════════════════════════════════════════════════════════
// Tab: My OT (Employee timeline)
// ═══════════════════════════════════════════════════════════════════
function MyOTTab({ reqs, userId, onCancel, onViewDetail }: {
  reqs: OvertimeRequest[];
  userId: string;
  onCancel: (id: string) => void;
  onViewDetail: (req: OvertimeRequest) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const stats = useMemo(() => {
    const approved = reqs.filter(r => r.status === 'APPROVED');
    const totalHours = approved.reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes) / 60, 0);
    const totalPay = approved.reduce((s, r) => s + calcOTPay(userId, r.actualMinutes || r.plannedMinutes, r.isHoliday, r.isWeekend), 0);
    const pending = reqs.filter(r => r.status === 'PENDING').length;
    return { totalHours, totalPay, approvedCount: approved.length, pending };
  }, [reqs, userId]);

  const filtered = statusFilter === 'all' ? reqs : reqs.filter(r => r.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => b.workDate.localeCompare(a.workDate));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock size={12} /> Tổng giờ OT</div>
          <div className="text-[20px] mt-1">{stats.totalHours.toFixed(1)}<span className="text-[12px] text-muted-foreground">h</span></div>
          <div className="text-[10px] text-muted-foreground">{stats.approvedCount} ca đã duyệt</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><DollarSign size={12} /> Ước tính OT</div>
          <div className="text-[18px] mt-1 text-green-600">{formatVND(stats.totalPay)}</div>
          <div className="text-[10px] text-muted-foreground">Dựa trên lương cơ bản</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Zap size={12} /> Giờ rate</div>
          <div className="text-[18px] mt-1">{formatVND(Math.round(getHourlyRate(userId)))}<span className="text-[12px] text-muted-foreground">/h</span></div>
          <div className="text-[10px] text-muted-foreground">= Lương / 22 / 8</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertTriangle size={12} /> Đang chờ</div>
          <div className="text-[20px] mt-1 text-yellow-600">{stats.pending}</div>
          <div className="text-[10px] text-muted-foreground">yêu cầu chờ duyệt</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 border-b border-border">
        {['all', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => {
          const count = s === 'all' ? reqs.length : reqs.filter(r => r.status === s).length;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-[13px] border-b-2 ${statusFilter === s ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
              {s === 'all' ? 'Tất cả' : statusLabels[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {sorted.map((r, i) => {
          const hours = (r.plannedMinutes / 60).toFixed(1);
          const actualHours = r.actualMinutes ? (r.actualMinutes / 60).toFixed(1) : null;
          const pay = calcOTPay(userId, r.actualMinutes || r.plannedMinutes, r.isHoliday, r.isWeekend);
          const approver = r.approverUserId ? getUserById(r.approverUserId) : null;
          const isLast = i === sorted.length - 1;

          return (
            <div key={r.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full shrink-0 mt-2 ${r.status === 'APPROVED' ? 'bg-green-500' : r.status === 'REJECTED' ? 'bg-red-500' : r.status === 'CANCELLED' ? 'bg-gray-400' : 'bg-yellow-400'}`} />
                {!isLast && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className={`flex-1 bg-card border border-border rounded-xl p-3 mb-3 hover:shadow-sm cursor-pointer transition-shadow ${!isLast ? '' : ''}`} onClick={() => onViewDetail(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px]">{new Date(r.workDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}>
                        {getMultiplierLabel(r.isHoliday, r.isWeekend)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-1">{r.startTime} — {r.endTime} ({hours}h dự kiến{actualHours ? `, ${actualHours}h thực tế` : ''})</div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === 'APPROVED' && <div className="text-[13px] text-green-600">{formatVND(pay)}</div>}
                    {r.status === 'PENDING' && <div className="text-[12px] text-muted-foreground">~{formatVND(pay)}</div>}
                  </div>
                </div>
                <div className="text-[12px] text-muted-foreground mt-1.5">{r.reason}</div>
                {r.comment && (
                  <div className="text-[11px] mt-1.5 flex items-start gap-1 text-muted-foreground">
                    <MessageSquare size={10} className="mt-0.5 shrink-0" /> "{r.comment}"
                    {approver && <span>— {approver.fullName}</span>}
                  </div>
                )}
                {r.status === 'PENDING' && (
                  <button onClick={e => { e.stopPropagation(); onCancel(r.id); }} className="mt-2 px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-[11px] flex items-center gap-1">
                    <Ban size={10} /> Huỷ
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Timer size={40} className="mx-auto mb-2 opacity-30" />
            <div className="text-[14px]">Chưa có yêu cầu OT nào</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Approve OT (Manager/HR)
// ═══════════════════════════════════════════════════════════════════
function ApproveOTTab({ reqs, allReqs, isAdminHR, onApprove, onReject, onUpdateActual, onViewDetail }: {
  reqs: OvertimeRequest[];
  allReqs: OvertimeRequest[];
  isAdminHR: boolean;
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment: string) => void;
  onUpdateActual: (id: string, minutes: number) => void;
  onViewDetail: (req: OvertimeRequest) => void;
}) {
  const [approveComment, setApproveComment] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRecent, setShowRecent] = useState(false);

  // Recently approved (need actualMinutes input)
  const recentApproved = allReqs.filter(r => r.status === 'APPROVED' && !r.actualMinutes).slice(0, 10);

  // Stats
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthReqs = allReqs.filter(r => r.workDate.startsWith('2025-03'));
    const approvedHrs = monthReqs.filter(r => r.status === 'APPROVED').reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes) / 60, 0);
    const totalCost = monthReqs.filter(r => r.status === 'APPROVED').reduce((s, r) => s + calcOTPay(r.userId, r.actualMinutes || r.plannedMinutes, r.isHoliday, r.isWeekend), 0);
    return { pending: reqs.length, approvedHrs, totalCost, needActual: recentApproved.length };
  }, [reqs, allReqs, recentApproved]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 text-center">
          <div className="text-[20px] text-yellow-600">{stats.pending}</div>
          <div className="text-[10px] text-muted-foreground">Chờ duyệt</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-center">
          <div className="text-[18px] text-green-600">{stats.approvedHrs.toFixed(0)}h</div>
          <div className="text-[10px] text-muted-foreground">Giờ OT tháng 3</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 text-center">
          <div className="text-[16px] text-blue-600">{formatVND(stats.totalCost)}</div>
          <div className="text-[10px] text-muted-foreground">Chi phí OT tháng 3</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-3 text-center cursor-pointer" onClick={() => setShowRecent(!showRecent)}>
          <div className="text-[20px] text-orange-600">{stats.needActual}</div>
          <div className="text-[10px] text-muted-foreground">Cần nhập giờ thực tế</div>
        </div>
      </div>

      {/* Need actual minutes input */}
      {showRecent && recentApproved.length > 0 && (
        <div className="bg-card border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-3">
          <div className="text-[13px] flex items-center gap-1.5">
            <Edit3 size={14} className="text-orange-600" />
            Nhập số giờ thực tế cho ca OT đã duyệt
          </div>
          {recentApproved.map(r => {
            const u = getUserById(r.userId);
            return (
              <ActualMinutesInput key={r.id} req={r} userName={u?.fullName || ''} onUpdate={onUpdateActual} />
            );
          })}
        </div>
      )}

      {/* Pending requests */}
      {reqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Không có yêu cầu OT nào chờ duyệt</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => {
            const u = getUserById(r.userId);
            const dept = u ? getDepartmentById(u.departmentId) : null;
            const hours = (r.plannedMinutes / 60).toFixed(1);
            const pay = calcOTPay(r.userId, r.plannedMinutes, r.isHoliday, r.isWeekend);

            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewDetail(r)}>
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-[12px] shrink-0">
                      {u?.fullName.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="text-[14px]">{u?.fullName} <span className="text-[11px] text-muted-foreground">({u?.userCode})</span></div>
                      <div className="text-[11px] text-muted-foreground">{dept?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}>
                      {getMultiplierLabel(r.isHoliday, r.isWeekend)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[12px]">
                  <div><span className="text-muted-foreground">Ngày:</span> {new Date(r.workDate).toLocaleDateString('vi-VN')}</div>
                  <div><span className="text-muted-foreground">Giờ:</span> {r.startTime} — {r.endTime}</div>
                  <div><span className="text-muted-foreground">Số giờ:</span> {hours}h</div>
                  <div><span className="text-muted-foreground">Ước tính:</span> <span className="text-green-600">{formatVND(pay)}</span></div>
                  <div><span className="text-muted-foreground">Lý do:</span> {r.reason}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhận xét (không bắt buộc)..."
                    value={approveComment[r.id] || ''}
                    onChange={e => setApproveComment(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-[12px]"
                  />
                  <button onClick={() => { onApprove(r.id, approveComment[r.id]); setApproveComment(prev => { const n = { ...prev }; delete n[r.id]; return n; }); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] hover:bg-green-700 flex items-center gap-1 shrink-0">
                    <Check size={14} /> Duyệt
                  </button>
                  {rejectingId === r.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="text" placeholder="Lý do từ chối *" value={rejectComment} onChange={e => setRejectComment(e.target.value)} className="px-3 py-2 rounded-lg border border-red-300 bg-input-background text-[12px] w-40" autoFocus />
                      <button onClick={() => { onReject(r.id, rejectComment); setRejectingId(null); setRejectComment(''); }} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px]"><Check size={14} /></button>
                      <button onClick={() => { setRejectingId(null); setRejectComment(''); }} className="px-3 py-2 border border-border rounded-lg text-[12px]"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(r.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-[12px] hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 flex items-center gap-1 shrink-0">
                      <X size={14} /> Từ chối
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Actual Minutes Input ─────────────
function ActualMinutesInput({ req, userName, onUpdate }: {
  req: OvertimeRequest;
  userName: string;
  onUpdate: (id: string, minutes: number) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="min-w-[100px]">{userName}</span>
      <span className="text-muted-foreground">{new Date(req.workDate).toLocaleDateString('vi-VN')}</span>
      <span className="text-muted-foreground">{req.startTime}—{req.endTime}</span>
      <span className="text-muted-foreground">({(req.plannedMinutes / 60).toFixed(1)}h kế hoạch)</span>
      <input
        type="number"
        placeholder="Phút thực tế"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-24 px-2 py-1 rounded border border-border bg-input-background text-[12px]"
      />
      <button
        onClick={() => {
          const mins = parseInt(value);
          if (!mins || mins <= 0) { toast.error('Nhập số phút hợp lệ'); return; }
          onUpdate(req.id, mins);
          setValue('');
        }}
        className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] hover:bg-blue-700"
      >Lưu</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: All OT (Admin summary)
// ═══════════════════════════════════════════════════════════════════
function AllOTTab({ reqs, onViewDetail, onUpdateActual }: {
  reqs: OvertimeRequest[];
  onViewDetail: (req: OvertimeRequest) => void;
  onUpdateActual: (id: string, minutes: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const filtered = useMemo(() => {
    let list = reqs;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => {
        const u = getUserById(r.userId);
        return u?.fullName.toLowerCase().includes(s) || r.reason.toLowerCase().includes(s);
      });
    }
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (typeFilter === 'WEEKEND') list = list.filter(r => r.isWeekend);
    else if (typeFilter === 'HOLIDAY') list = list.filter(r => r.isHoliday);
    else if (typeFilter === 'NORMAL') list = list.filter(r => !r.isWeekend && !r.isHoliday);
    if (deptFilter) list = list.filter(r => getUserById(r.userId)?.departmentId === deptFilter);
    return list;
  }, [reqs, search, statusFilter, typeFilter, deptFilter]);

  // Summary
  const summary = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'APPROVED');
    const totalHours = approved.reduce((s, r) => s + (r.actualMinutes || r.plannedMinutes) / 60, 0);
    const totalCost = approved.reduce((s, r) => s + calcOTPay(r.userId, r.actualMinutes || r.plannedMinutes, r.isHoliday, r.isWeekend), 0);
    return {
      total: filtered.length,
      pending: filtered.filter(r => r.status === 'PENDING').length,
      approved: approved.length,
      rejected: filtered.filter(r => r.status === 'REJECTED').length,
      totalHours,
      totalCost,
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Tổng', value: summary.total.toString(), color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Chờ duyệt', value: summary.pending.toString(), color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
          { label: 'Đã duyệt', value: summary.approved.toString(), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
          { label: 'Từ chối', value: summary.rejected.toString(), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: 'Tổng giờ', value: `${summary.totalHours.toFixed(0)}h`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Chi phí OT', value: formatVND(summary.totalCost), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <div className={`text-[16px] ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm nhân viên, lý do..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả loại</option>
          <option value="NORMAL">Ngày thường</option>
          <option value="WEEKEND">Cuối tuần</option>
          <option value="HOLIDAY">Ngày lễ</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả phòng ban</option>
          {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Ngày</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giờ</th>
              <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Kế hoạch</th>
              <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Thực tế</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Loại</th>
              <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Ước tính</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Lý do</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const u = getUserById(r.userId);
                const dept = u ? getDepartmentById(u.departmentId) : null;
                const hours = (r.plannedMinutes / 60).toFixed(1);
                const actualHours = r.actualMinutes ? (r.actualMinutes / 60).toFixed(1) : '—';
                const pay = calcOTPay(r.userId, r.actualMinutes || r.plannedMinutes, r.isHoliday, r.isWeekend);
                return (
                  <tr key={r.id} onClick={() => onViewDetail(r)} className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <div className="text-[13px]">{u?.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">{dept?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px]">{new Date(r.workDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{r.startTime}—{r.endTime}</td>
                    <td className="px-4 py-3 text-[13px] text-right hidden sm:table-cell">{hours}h</td>
                    <td className="px-4 py-3 text-[13px] text-right hidden md:table-cell">{actualHours}{r.actualMinutes ? 'h' : ''}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getMultiplierBadge(r.isHoliday, r.isWeekend)}`}>
                        {r.isHoliday ? '×3.0' : r.isWeekend ? '×2.0' : '×1.5'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-right hidden lg:table-cell text-green-600">{r.status === 'APPROVED' ? formatVND(pay) : '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell max-w-[150px] truncate">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy yêu cầu OT</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} / {reqs.length} yêu cầu</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create OT Dialog
// ═══════════════════════════════════════════════════════════════════
function CreateOTDialog({ userId, onClose, onCreate }: {
  userId: string;
  onClose: () => void;
  onCreate: (form: typeof emptyForm) => boolean;
}) {
  const [form, setForm] = useState(emptyForm);

  // Auto-detect weekend/holiday
  const dateInfo = useMemo(() => {
    if (!form.workDate) return null;
    const date = new Date(form.workDate);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const holiday = holidays.find(h => h.date === form.workDate);
    return { isWeekend, holiday, dayName: date.toLocaleDateString('vi-VN', { weekday: 'long' }) };
  }, [form.workDate]);

  // Auto-set checkboxes
  const effectiveIsWeekend = form.isWeekend || (dateInfo?.isWeekend ?? false);
  const effectiveIsHoliday = form.isHoliday || (!!dateInfo?.holiday);

  const minutes = form.startTime && form.endTime ? calcMinutes(form.startTime, form.endTime) : 0;
  const hours = minutes > 0 ? (minutes / 60).toFixed(1) : '0';
  const multiplier = getMultiplier(effectiveIsHoliday, effectiveIsWeekend);
  const hourlyRate = getHourlyRate(userId);
  const estimatedPay = minutes > 0 ? Math.round((minutes / 60) * multiplier * hourlyRate) : 0;

  const handleSubmit = () => {
    const f = { ...form, isWeekend: effectiveIsWeekend, isHoliday: effectiveIsHoliday };
    const ok = onCreate(f);
    if (ok) { setForm(emptyForm); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo yêu cầu OT</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Ngày làm thêm *</label>
            <input type="date" value={form.workDate} onChange={e => setForm(f => ({ ...f, workDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            {dateInfo && (
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">{dateInfo.dayName}</span>
                {dateInfo.isWeekend && <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">Cuối tuần</span>}
                {dateInfo.holiday && <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">{dateInfo.holiday.name}</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Giờ bắt đầu *</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Giờ kết thúc *</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={effectiveIsWeekend} onChange={e => setForm(f => ({ ...f, isWeekend: e.target.checked }))} className="w-4 h-4 rounded border-border" />
              Cuối tuần (×2.0)
            </label>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={effectiveIsHoliday} onChange={e => setForm(f => ({ ...f, isHoliday: e.target.checked }))} className="w-4 h-4 rounded border-border" />
              Ngày lễ (×3.0)
            </label>
          </div>

          {/* Cost estimation box */}
          {minutes > 0 && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="text-[12px] text-green-700 dark:text-green-400 mb-2 flex items-center gap-1"><DollarSign size={14} /> Ước tính chi phí OT</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="text-muted-foreground">Số giờ:</div>
                <div>{hours}h</div>
                <div className="text-muted-foreground">Hệ số:</div>
                <div className={effectiveIsHoliday ? 'text-orange-600' : effectiveIsWeekend ? 'text-purple-600' : 'text-blue-600'}>
                  ×{multiplier.toFixed(1)} ({effectiveIsHoliday ? 'Ngày lễ' : effectiveIsWeekend ? 'Cuối tuần' : 'Ngày thường'})
                </div>
                <div className="text-muted-foreground">Giờ rate:</div>
                <div>{formatVND(Math.round(hourlyRate))}/h</div>
                <div className="text-muted-foreground border-t border-green-200 dark:border-green-800 pt-1">Ước tính:</div>
                <div className="text-[14px] text-green-600 border-t border-green-200 dark:border-green-800 pt-1">{formatVND(estimatedPay)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5">= {hours}h × {multiplier.toFixed(1)} × {formatVND(Math.round(hourlyRate))}/h</div>
            </div>
          )}

          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Lý do *</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Nhập lý do làm thêm giờ..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-20 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1">
            <Plus size={14} /> Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OT Detail Dialog
// ═══════════════════════════════════════════════════════════════════
function OTDetailDialog({ req, onClose, canApprove, canCancel, canEditActual, onApprove, onReject, onCancel, onUpdateActual }: {
  req: OvertimeRequest;
  onClose: () => void;
  canApprove: boolean;
  canCancel: boolean;
  canEditActual: boolean;
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment: string) => void;
  onCancel: (id: string) => void;
  onUpdateActual: (id: string, minutes: number) => void;
}) {
  const [actionComment, setActionComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actualInput, setActualInput] = useState(req.actualMinutes?.toString() || '');

  const u = getUserById(req.userId);
  const dept = u ? getDepartmentById(u.departmentId) : null;
  const approver = req.approverUserId ? getUserById(req.approverUserId) : null;
  const hours = (req.plannedMinutes / 60).toFixed(1);
  const actualHours = req.actualMinutes ? (req.actualMinutes / 60).toFixed(1) : null;
  const pay = calcOTPay(req.userId, req.actualMinutes || req.plannedMinutes, req.isHoliday, req.isWeekend);
  const multiplier = getMultiplier(req.isHoliday, req.isWeekend);
  const hourlyRate = getHourlyRate(req.userId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Chi tiết yêu cầu OT</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* Employee */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-[14px]">
              {u?.fullName.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <div className="text-[14px]">{u?.fullName} <span className="text-[11px] text-muted-foreground">({u?.userCode})</span></div>
              <div className="text-[11px] text-muted-foreground">{dept?.name}</div>
            </div>
            <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${statusColors[req.status]}`}>{statusLabels[req.status]}</span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Ngày</div>{new Date(req.workDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Giờ</div>{req.startTime} — {req.endTime}</div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-0.5">Loại</div>
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${getMultiplierBadge(req.isHoliday, req.isWeekend)}`}>
                {getMultiplierLabel(req.isHoliday, req.isWeekend)}
              </span>
            </div>
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Giờ kế hoạch</div>{hours}h ({req.plannedMinutes} phút)</div>
          </div>

          {/* Actual minutes */}
          {req.actualMinutes && (
            <div className="text-[13px]"><div className="text-[11px] text-muted-foreground mb-0.5">Giờ thực tế</div>{actualHours}h ({req.actualMinutes} phút)</div>
          )}

          {/* Reason */}
          <div className="text-[13px]"><div className="text-[11px] text-muted-foreground mb-0.5">Lý do</div>{req.reason}</div>

          {/* Approval info */}
          {approver && (
            <div className="text-[13px]">
              <div className="text-[11px] text-muted-foreground mb-0.5">Người duyệt</div>
              {approver.fullName}
              {req.comment && <span className="text-muted-foreground"> — "{req.comment}"</span>}
            </div>
          )}

          {/* Cost breakdown */}
          {req.status === 'APPROVED' && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="text-[12px] text-green-700 dark:text-green-400 mb-2 flex items-center gap-1"><DollarSign size={14} /> Chi phí OT</div>
              <div className="grid grid-cols-2 gap-1 text-[12px]">
                <span className="text-muted-foreground">Số giờ:</span><span>{actualHours || hours}h</span>
                <span className="text-muted-foreground">Hệ số:</span><span>×{multiplier.toFixed(1)}</span>
                <span className="text-muted-foreground">Giờ rate:</span><span>{formatVND(Math.round(hourlyRate))}/h</span>
                <span className="text-muted-foreground border-t border-green-200 dark:border-green-800 pt-1">Thành tiền:</span>
                <span className="text-[14px] text-green-600 border-t border-green-200 dark:border-green-800 pt-1">{formatVND(pay)}</span>
              </div>
            </div>
          )}

          {/* Edit actual minutes */}
          {canEditActual && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-[12px] text-muted-foreground">Cập nhật số phút thực tế</div>
              <div className="flex gap-2">
                <input type="number" value={actualInput} onChange={e => setActualInput(e.target.value)} placeholder="Phút thực tế" className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
                <button onClick={() => {
                  const mins = parseInt(actualInput);
                  if (!mins || mins <= 0) { toast.error('Nhập số phút hợp lệ'); return; }
                  onUpdateActual(req.id, mins);
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] hover:bg-blue-700">Lưu</button>
              </div>
            </div>
          )}

          {/* Approve/Reject */}
          {canApprove && !showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <input type="text" placeholder="Nhận xét (không bắt buộc)..." value={actionComment} onChange={e => setActionComment(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              <div className="flex gap-2">
                <button onClick={() => { onApprove(req.id, actionComment || undefined); onClose(); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700 flex items-center justify-center gap-1">
                  <Check size={14} /> Duyệt
                </button>
                <button onClick={() => setShowRejectForm(true)} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700 flex items-center justify-center gap-1">
                  <X size={14} /> Từ chối
                </button>
              </div>
            </div>
          )}
          {canApprove && showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Lý do từ chối * (bắt buộc)" className="w-full p-3 rounded-lg border border-red-300 bg-input-background text-[13px] h-20 resize-none" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowRejectForm(false)} className="flex-1 py-2 rounded-lg border border-border text-[13px]">Quay lại</button>
                <button onClick={() => { onReject(req.id, actionComment); onClose(); }} disabled={!actionComment.trim()} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[13px] disabled:opacity-50">Xác nhận từ chối</button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <button onClick={() => { onCancel(req.id); onClose(); }} className="w-full py-2 border border-red-300 text-red-600 rounded-lg text-[13px] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1">
              <Ban size={14} /> Huỷ yêu cầu OT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}