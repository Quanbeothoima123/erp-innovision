import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  leaveRequests as initialLeaveRequests, leaveBalances as initialBalances, leaveBalances,
  leaveTypes, departments, getUserById, getLeaveTypeById, getDepartmentById,
} from '../data/mockData';
import type { LeaveRequest, LeaveRequestStatus, LeaveRequestApproval, LeaveBalance } from '../data/mockData';
import {
  Plus, Check, X, Search, CalendarDays, AlertTriangle,
  User, FileText, Ban, ListChecks, Shield, ArrowRight,
  CheckCircle2, MessageSquare, Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────
const statusColors: Record<LeaveRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã huỷ',
};
const approvalStatusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', SKIPPED: 'Bỏ qua',
};
const stepLabels: Record<string, string> = { MANAGER: 'Quản lý trực tiếp', HR: 'Phòng Nhân sự' };

const emptyForm = {
  leaveTypeId: '', startDate: '', endDate: '', isHalfDay: false,
  halfDayPeriod: 'MORNING', reason: '',
};

// ═══════════════════════════════════════════════════════════════════
// MAIN: LeaveRequestsPage
// ═══════════════════════════════════════════════════════════════════
export function LeaveRequestsPage() {
  const { currentUser, can } = useAuth();
  const [reqs, setReqs] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [balances, setBalances] = useState<LeaveBalance[]>(initialBalances);
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<LeaveRequest | null>(null);

  const isAdmin = can('ADMIN');
  const isHR = can('HR');
  const isAdminHR = isAdmin || isHR;
  const isManager = can('MANAGER');
  const isEmployee = can('EMPLOYEE');

  // Determine available tabs
  type TabKey = 'my' | 'manager_approve' | 'hr_approve' | 'all';
  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; icon: JSX.Element; badge?: number }[] = [];

    // Employees see "my" tab
    if (isEmployee || isManager) {
      tabs.push({ key: 'my', label: 'Đơn nghỉ của tôi', icon: <CalendarDays size={14} /> });
    }

    // Managers see step 1 approval
    if (isManager) {
      const pendingMgr = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'MANAGER' && canManagerApprove(r, currentUser!.id)).length;
      tabs.push({ key: 'manager_approve', label: 'Duyệt bước 1 (Quản lý)', icon: <ListChecks size={14} />, badge: pendingMgr });
    }

    // HR/Admin see step 2 approval
    if (isAdminHR) {
      const pendingHR = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'HR').length;
      tabs.push({ key: 'hr_approve', label: 'Duyệt bước 2 (HR)', icon: <Shield size={14} />, badge: pendingHR });
    }

    // Admin/HR see all
    if (isAdminHR) {
      tabs.push({ key: 'all', label: 'Tất cả đơn nghỉ', icon: <FileText size={14} /> });
    }

    return tabs;
  }, [isEmployee, isManager, isAdminHR, reqs, currentUser]);

  const defaultTab: TabKey = isAdminHR ? 'hr_approve' : isManager ? 'manager_approve' : 'my';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // ─── Approval logic: 2-step MANAGER → HR ─────────────
  const handleApproveStep = useCallback((reqId: string, step: 'MANAGER' | 'HR', comment: string) => {
    setReqs(prev => prev.map(r => {
      if (r.id !== reqId) return r;

      const updatedApprovals = [...r.approvals];
      const stepIdx = updatedApprovals.findIndex(a => a.stepType === step && a.status === 'PENDING');

      if (stepIdx >= 0) {
        updatedApprovals[stepIdx] = {
          ...updatedApprovals[stepIdx],
          status: 'APPROVED',
          comment: comment || undefined,
          actionAt: new Date().toISOString(),
          approverUserId: currentUser!.id,
        };
      } else {
        // Add approval entry if missing
        updatedApprovals.push({
          approverUserId: currentUser!.id,
          stepType: step,
          stepOrder: step === 'MANAGER' ? 1 : 2,
          status: 'APPROVED',
          comment: comment || undefined,
          actionAt: new Date().toISOString(),
        });
      }

      if (step === 'MANAGER') {
        // Move to HR step
        const hrApproval: LeaveRequestApproval = {
          approverUserId: 'user-hr-mgr',
          stepType: 'HR',
          stepOrder: 2,
          status: 'PENDING',
        };
        // Only add HR step if not already there
        if (!updatedApprovals.find(a => a.stepType === 'HR')) {
          updatedApprovals.push(hrApproval);
        }
        return { ...r, approvals: updatedApprovals, currentStep: 'HR' as const };
      } else {
        // HR approved → final APPROVED, update balance
        updateBalanceOnApprove(r);
        return { ...r, approvals: updatedApprovals, status: 'APPROVED' as const, currentStep: null };
      }
    }));
    toast.success(`Đã duyệt bước ${step === 'MANAGER' ? '1 (Quản lý)' : '2 (HR)'}`);
  }, [currentUser]);

  const handleRejectStep = useCallback((reqId: string, step: 'MANAGER' | 'HR', comment: string) => {
    if (!comment.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }

    setReqs(prev => prev.map(r => {
      if (r.id !== reqId) return r;

      const updatedApprovals = [...r.approvals];
      const stepIdx = updatedApprovals.findIndex(a => a.stepType === step && a.status === 'PENDING');

      if (stepIdx >= 0) {
        updatedApprovals[stepIdx] = {
          ...updatedApprovals[stepIdx],
          status: 'REJECTED',
          comment,
          actionAt: new Date().toISOString(),
          approverUserId: currentUser!.id,
        };
      } else {
        updatedApprovals.push({
          approverUserId: currentUser!.id,
          stepType: step,
          stepOrder: step === 'MANAGER' ? 1 : 2,
          status: 'REJECTED',
          comment,
          actionAt: new Date().toISOString(),
        });
      }

      return { ...r, approvals: updatedApprovals, status: 'REJECTED' as const, currentStep: null };
    }));
    toast.success(`Đã từ chối đơn nghỉ phép`);
  }, [currentUser]);

  const handleCancel = useCallback((reqId: string) => {
    setReqs(prev => prev.map(r => {
      if (r.id !== reqId || r.status !== 'PENDING') return r;
      return { ...r, status: 'CANCELLED' as const, currentStep: null };
    }));
    toast.success('Đã huỷ đơn nghỉ phép');
  }, []);

  // Update balance when leave is approved
  const updateBalanceOnApprove = useCallback((req: LeaveRequest) => {
    setBalances(prev => prev.map(b => {
      if (b.userId === req.userId && b.leaveTypeId === req.leaveTypeId && b.year === 2025) {
        return {
          ...b,
          usedDays: b.usedDays + req.totalDays,
          pendingDays: Math.max(0, b.pendingDays - req.totalDays),
          remainingDays: b.remainingDays - req.totalDays,
        };
      }
      return b;
    }));
  }, []);

  // Create new request
  const handleCreateLeave = useCallback((form: typeof emptyForm) => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return false;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) { toast.error('Ngày kết thúc phải sau ngày bắt đầu'); return false; }

    const diffDays = form.isHalfDay ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const balance = balances.find(b => b.userId === currentUser!.id && b.leaveTypeId === form.leaveTypeId && b.year === 2025);
    if (balance && balance.remainingDays < diffDays) {
      toast.error(`Số ngày phép còn lại không đủ (còn ${balance.remainingDays} ngày)`);
      return false;
    }

    // Determine manager
    const managerApproval: LeaveRequestApproval = currentUser!.managerId ? {
      approverUserId: currentUser!.managerId,
      stepType: 'MANAGER',
      stepOrder: 1,
      status: 'PENDING',
    } : {
      approverUserId: 'user-hr-mgr',
      stepType: 'MANAGER',
      stepOrder: 1,
      status: 'PENDING',
    };

    const newReq: LeaveRequest = {
      id: `lr-new-${Date.now()}`,
      userId: currentUser!.id,
      leaveTypeId: form.leaveTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      totalDays: diffDays,
      isHalfDay: form.isHalfDay,
      halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
      reason: form.reason,
      status: 'PENDING',
      currentStep: 'MANAGER',
      submittedAt: new Date().toISOString().slice(0, 10),
      approvals: [managerApproval],
    };

    setReqs(prev => [newReq, ...prev]);

    // Update pending balance
    setBalances(prev => prev.map(b => {
      if (b.userId === currentUser!.id && b.leaveTypeId === form.leaveTypeId && b.year === 2025) {
        return { ...b, pendingDays: b.pendingDays + diffDays };
      }
      return b;
    }));

    toast.success('Đã gửi đơn nghỉ phép — chờ Quản lý duyệt bước 1');
    return true;
  }, [currentUser, balances]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px]">Quản lý nghỉ phép</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
          <Plus size={16} /> Tạo đơn nghỉ
        </button>
      </div>

      {/* 2-step flow explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Quy trình duyệt 2 bước:</span>{' '}
          Nhân viên gửi đơn → <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[11px]"><User size={10} /> Bước 1: Quản lý trực tiếp</span>
          <ArrowRight size={10} className="inline mx-1" />
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[11px]"><Shield size={10} /> Bước 2: HR</span>
          → Hoàn tất
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
        <MyLeaveTab
          reqs={reqs.filter(r => r.userId === currentUser!.id)}
          balances={balances.filter(b => b.userId === currentUser!.id && b.year === 2025)}
          onCancel={handleCancel}
          onViewDetail={setDetailReq}
        />
      )}
      {activeTab === 'manager_approve' && (
        <ManagerApproveTab
          reqs={reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'MANAGER' && canManagerApprove(r, currentUser!.id))}
          allReqs={reqs}
          onApprove={(id, comment) => handleApproveStep(id, 'MANAGER', comment)}
          onReject={(id, comment) => handleRejectStep(id, 'MANAGER', comment)}
          onViewDetail={setDetailReq}
        />
      )}
      {activeTab === 'hr_approve' && (
        <HRApproveTab
          reqs={reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'HR')}
          allReqs={reqs}
          onApprove={(id, comment) => handleApproveStep(id, 'HR', comment)}
          onReject={(id, comment) => handleRejectStep(id, 'HR', comment)}
          onViewDetail={setDetailReq}
        />
      )}
      {activeTab === 'all' && (
        <AllRequestsTab reqs={reqs} onViewDetail={setDetailReq} />
      )}

      {/* Create Leave Dialog */}
      {showForm && (
        <CreateLeaveDialog
          balances={balances.filter(b => b.userId === currentUser!.id && b.year === 2025)}
          onClose={() => setShowForm(false)}
          onCreate={handleCreateLeave}
        />
      )}

      {/* Detail Dialog */}
      {detailReq && (
        <LeaveDetailDialog
          req={reqs.find(r => r.id === detailReq.id) || detailReq}
          onClose={() => setDetailReq(null)}
          canApprove={
            (detailReq.status === 'PENDING' && detailReq.currentStep === 'MANAGER' && isManager && canManagerApprove(detailReq, currentUser!.id)) ||
            (detailReq.status === 'PENDING' && detailReq.currentStep === 'HR' && isAdminHR)
          }
          canCancel={detailReq.status === 'PENDING' && detailReq.userId === currentUser!.id}
          onApprove={(id, comment) => handleApproveStep(id, detailReq.currentStep!, comment)}
          onReject={(id, comment) => handleRejectStep(id, detailReq.currentStep!, comment)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// ─── Helper: Can this manager approve this request? ─────────────
function canManagerApprove(req: LeaveRequest, managerId: string): boolean {
  const user = getUserById(req.userId);
  if (!user) return false;
  // Direct manager or the approval is assigned to them
  if (user.managerId === managerId) return true;
  const assigned = req.approvals.find(a => a.stepType === 'MANAGER' && a.status === 'PENDING');
  if (assigned && assigned.approverUserId === managerId) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// Tab: My Leave (Employee view)
// ═══════════════════════════════════════════════════════════════════
function MyLeaveTab({ reqs, balances, onCancel, onViewDetail }: {
  reqs: LeaveRequest[];
  balances: LeaveBalance[];
  onCancel: (id: string) => void;
  onViewDetail: (req: LeaveRequest) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = statusFilter === 'all' ? reqs : reqs.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      {balances.length > 0 && (
        <div>
          <h3 className="text-[13px] text-muted-foreground mb-2">Số dư phép năm 2025</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map(b => {
              const lt = getLeaveTypeById(b.leaveTypeId);
              const total = b.entitledDays + b.carriedDays;
              const usedPct = total > 0 ? (b.usedDays / total) * 100 : 0;
              const pendingPct = total > 0 ? (b.pendingDays / total) * 100 : 0;
              return (
                <div key={`${b.userId}-${b.leaveTypeId}`} className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[12px] text-muted-foreground">{lt?.name}</div>
                  <div className="text-[20px] mt-1">
                    {b.remainingDays}
                    <span className="text-[12px] text-muted-foreground"> / {total} ngày</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mt-2 flex">
                    <div className="h-full bg-blue-500 rounded-l-full" style={{ width: `${usedPct}%` }} />
                    <div className="h-full bg-yellow-400" style={{ width: `${pendingPct}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Đã dùng: {b.usedDays}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Chờ: {b.pendingDays}</span>
                  </div>
                  {b.carriedDays > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">Chuyển từ năm trước: {b.carriedDays}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 border-b border-border">
        {['all', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => {
          const count = s === 'all' ? reqs.length : reqs.filter(r => r.status === s).length;
          const label = s === 'all' ? 'Tất cả' : statusLabels[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-[13px] border-b-2 ${statusFilter === s ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* My requests table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại phép</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Thời gian</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Số ngày</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Lý do</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Bước hiện tại</th>
              <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Hành động</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const lt = getLeaveTypeById(r.leaveTypeId);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer" onClick={() => onViewDetail(r)}>
                    <td className="px-4 py-3 text-[13px]">{lt?.name}</td>
                    <td className="px-4 py-3 text-[13px]">{r.startDate} → {r.endDate}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">
                      {r.totalDays} {r.isHalfDay ? <span className="text-[10px] text-muted-foreground">({r.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều'})</span> : ''}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[180px] truncate">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.currentStep ? (
                        <ApprovalStepBadge step={r.currentStep} />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {r.status === 'PENDING' && (
                        <button onClick={() => onCancel(r.id)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-[11px] flex items-center gap-1 ml-auto">
                          <Ban size={12} /> Huỷ đơn
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không có đơn nào</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} đơn</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab: Manager Approval (Step 1)
// ═══════════════════════════════════════════════════════════════════
function ManagerApproveTab({ reqs, allReqs, onApprove, onReject, onViewDetail }: {
  reqs: LeaveRequest[];
  allReqs: LeaveRequest[];
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
  onViewDetail: (req: LeaveRequest) => void;
}) {
  const [approveComment, setApproveComment] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Recently processed by this manager
  const recentProcessed = allReqs.filter(r =>
    r.approvals.some(a => a.stepType === 'MANAGER' && a.status !== 'PENDING' && a.actionAt)
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-orange-700 dark:text-orange-400">
        <User size={14} className="shrink-0 mt-0.5" />
        <span>Bước 1: Duyệt với vai trò <strong>Quản lý trực tiếp</strong>. Sau khi duyệt, đơn sẽ chuyển sang bước 2 cho Phòng Nhân sự.</span>
      </div>

      {reqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Không có đơn nào chờ duyệt</div>
          <div className="text-[12px] mt-1">Tất cả đơn nghỉ đã được xử lý ở bước 1</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => {
            const u = getUserById(r.userId);
            const lt = getLeaveTypeById(r.leaveTypeId);
            const dept = u ? getDepartmentById(u.departmentId) : null;
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
                    <div className="text-[12px] text-muted-foreground">Ngày gửi: {r.submittedAt}</div>
                    <ApprovalStepBadge step="MANAGER" active />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                  <div><span className="text-muted-foreground">Loại phép:</span> <span>{lt?.name}</span></div>
                  <div><span className="text-muted-foreground">Thời gian:</span> {r.startDate} → {r.endDate}</div>
                  <div><span className="text-muted-foreground">Số ngày:</span> {r.totalDays} {r.isHalfDay ? `(${r.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều'})` : ''}</div>
                  <div><span className="text-muted-foreground">Lý do:</span> {r.reason || '—'}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhận xét (không bắt buộc)..."
                    value={approveComment[r.id] || ''}
                    onChange={e => setApproveComment(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-[12px]"
                    onClick={e => e.stopPropagation()}
                  />
                  <button onClick={() => { onApprove(r.id, approveComment[r.id] || ''); setApproveComment(prev => { const next = { ...prev }; delete next[r.id]; return next; }); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] hover:bg-green-700 flex items-center gap-1 shrink-0">
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

// ═══════════════════════════════════════════════════════════════════
// Tab: HR Approval (Step 2)
// ═══════════════════════════════════════════════════════════════════
function HRApproveTab({ reqs, allReqs, onApprove, onReject, onViewDetail }: {
  reqs: LeaveRequest[];
  allReqs: LeaveRequest[];
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
  onViewDetail: (req: LeaveRequest) => void;
}) {
  const [approveComment, setApproveComment] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-purple-700 dark:text-purple-400">
        <Shield size={14} className="shrink-0 mt-0.5" />
        <span>Bước 2: Duyệt với vai trò <strong>HR</strong>. Đơn đã qua bước duyệt Quản lý. Duyệt xong sẽ hoàn tất quy trình & cập nhật số dư phép.</span>
      </div>

      {reqs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto mb-2 opacity-30" />
          <div className="text-[14px]">Không có đơn nào chờ HR duyệt</div>
          <div className="text-[12px] mt-1">Tất cả đơn đã được xử lý ở bước 2</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => {
            const u = getUserById(r.userId);
            const lt = getLeaveTypeById(r.leaveTypeId);
            const dept = u ? getDepartmentById(u.departmentId) : null;
            const mgrApproval = r.approvals.find(a => a.stepType === 'MANAGER' && a.status === 'APPROVED');
            const mgrUser = mgrApproval ? getUserById(mgrApproval.approverUserId) : null;

            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewDetail(r)}>
                    <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white text-[12px] shrink-0">
                      {u?.fullName.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="text-[14px]">{u?.fullName} <span className="text-[11px] text-muted-foreground">({u?.userCode})</span></div>
                      <div className="text-[11px] text-muted-foreground">{dept?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <ApprovalStepBadge step="HR" active />
                  </div>
                </div>

                {/* Manager approval info */}
                {mgrApproval && (
                  <div className="mt-2 px-3 py-2 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800 text-[11px] flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-green-600 shrink-0" />
                    <span>Quản lý <strong>{mgrUser?.fullName}</strong> đã duyệt bước 1</span>
                    {mgrApproval.comment && <span className="text-muted-foreground">— "{mgrApproval.comment}"</span>}
                    {mgrApproval.actionAt && <span className="text-muted-foreground ml-auto">{new Date(mgrApproval.actionAt).toLocaleDateString('vi-VN')}</span>}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                  <div><span className="text-muted-foreground">Loại phép:</span> <span>{lt?.name}</span></div>
                  <div><span className="text-muted-foreground">Thời gian:</span> {r.startDate} → {r.endDate}</div>
                  <div><span className="text-muted-foreground">Số ngày:</span> {r.totalDays} {r.isHalfDay ? `(${r.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều'})` : ''}</div>
                  <div><span className="text-muted-foreground">Lý do:</span> {r.reason || '—'}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhận xét HR (không bắt buộc)..."
                    value={approveComment[r.id] || ''}
                    onChange={e => setApproveComment(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input-background text-[12px]"
                  />
                  <button onClick={() => { onApprove(r.id, approveComment[r.id] || ''); setApproveComment(prev => { const next = { ...prev }; delete next[r.id]; return next; }); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] hover:bg-green-700 flex items-center gap-1 shrink-0">
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

// ═══════════════════════════════════════════════════════════════════
// Tab: All Requests (Admin/HR overview)
// ═══════════════════════════════════════════════════════════════════
function AllRequestsTab({ reqs, onViewDetail }: {
  reqs: LeaveRequest[];
  onViewDetail: (req: LeaveRequest) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  const filtered = useMemo(() => {
    let list = reqs;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => {
        const u = getUserById(r.userId);
        return u?.fullName.toLowerCase().includes(s) || u?.userCode.toLowerCase().includes(s) || r.reason?.toLowerCase().includes(s);
      });
    }
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (leaveTypeFilter) list = list.filter(r => r.leaveTypeId === leaveTypeFilter);
    if (deptFilter) list = list.filter(r => getUserById(r.userId)?.departmentId === deptFilter);
    return list;
  }, [reqs, search, statusFilter, deptFilter, leaveTypeFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const pending = reqs.filter(r => r.status === 'PENDING').length;
    const pendingMgr = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'MANAGER').length;
    const pendingHR = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'HR').length;
    const approved = reqs.filter(r => r.status === 'APPROVED').length;
    const rejected = reqs.filter(r => r.status === 'REJECTED').length;
    const cancelled = reqs.filter(r => r.status === 'CANCELLED').length;
    return { pending, pendingMgr, pendingHR, approved, rejected, cancelled };
  }, [reqs]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Chờ duyệt', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
          { label: 'Chờ QL', value: stats.pendingMgr, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' },
          { label: 'Chờ HR', value: stats.pendingHR, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10' },
          { label: 'Đã duyệt', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
          { label: 'Từ chối', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: 'Đã huỷ', value: stats.cancelled, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <div className={`text-[18px] ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm nhân viên, mã NV, lý do..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={leaveTypeFilter} onChange={e => setLeaveTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả loại phép</option>
          {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả phòng ban</option>
          {departments.filter((d: any) => d.isActive).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại phép</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Thời gian</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Số ngày</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Lý do</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Bước duyệt</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const u = getUserById(r.userId);
                const lt = getLeaveTypeById(r.leaveTypeId);
                const dept = u ? getDepartmentById(u.departmentId) : null;
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
                    <td className="px-4 py-3 text-[13px]">{lt?.name}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{r.startDate} → {r.endDate}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{r.totalDays} {r.isHalfDay ? '(½)' : ''}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell max-w-[180px] truncate">{r.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <ApprovalProgressBar approvals={r.approvals} currentStep={r.currentStep} status={r.status} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy đơn</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} / {reqs.length} đơn</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create Leave Dialog
// ═══════════════════════════════════════════════════════════════════
function CreateLeaveDialog({ balances, onClose, onCreate }: {
  balances: LeaveBalance[];
  onClose: () => void;
  onCreate: (form: typeof emptyForm) => boolean;
}) {
  const [form, setForm] = useState(emptyForm);

  const selectedBalance = balances.find(b => b.leaveTypeId === form.leaveTypeId);
  const selectedType = form.leaveTypeId ? getLeaveTypeById(form.leaveTypeId) : null;

  const diffDays = form.startDate && form.endDate && !form.isHalfDay
    ? Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : form.isHalfDay ? 0.5 : 0;

  const handleSubmit = () => {
    const ok = onCreate(form);
    if (ok) { setForm(emptyForm); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Tạo đơn nghỉ phép</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Flow explanation */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Gửi đơn</span>
            <ArrowRight size={10} />
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">Quản lý duyệt</span>
            <ArrowRight size={10} />
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">HR duyệt</span>
            <ArrowRight size={10} />
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Hoàn tất</span>
          </div>

          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Loại phép *</label>
            <select value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">-- Chọn loại phép --</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} {lt.isPaid ? '(có lương)' : '(không lương)'}</option>)}
            </select>
          </div>

          {selectedBalance && (
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2 text-[11px] flex items-center gap-3">
              <span>Còn lại: <strong className="text-blue-600">{selectedBalance.remainingDays}</strong> ngày</span>
              <span className="text-muted-foreground">Đã dùng: {selectedBalance.usedDays}</span>
              <span className="text-muted-foreground">Chờ: {selectedBalance.pendingDays}</span>
              {selectedType?.requiresDocument && <span className="text-orange-600">⚠ Cần giấy xác nhận</span>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Từ ngày *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Đến ngày *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))} className="w-4 h-4 rounded border-border" />
              Nghỉ nửa ngày
            </label>
            {form.isHalfDay && (
              <select value={form.halfDayPeriod} onChange={e => setForm(f => ({ ...f, halfDayPeriod: e.target.value }))} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[13px]">
                <option value="MORNING">Buổi sáng</option>
                <option value="AFTERNOON">Buổi chiều</option>
              </select>
            )}
            {diffDays > 0 && (
              <span className="ml-auto text-[13px] text-blue-600">{diffDays} ngày</span>
            )}
          </div>

          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Lý do</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Nhập lý do nghỉ phép..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-20 resize-none" />
          </div>

          {selectedBalance && diffDays > selectedBalance.remainingDays && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-2 text-[12px] text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} /> Số ngày nghỉ ({diffDays}) vượt quá số dư ({selectedBalance.remainingDays})
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1">
            <Plus size={14} /> Gửi đơn nghỉ
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Leave Detail Dialog
// ═══════════════════════════════════════════════════════════════════
function LeaveDetailDialog({ req, onClose, canApprove, canCancel, onApprove, onReject, onCancel }: {
  req: LeaveRequest;
  onClose: () => void;
  canApprove: boolean;
  canCancel: boolean;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
  onCancel: (id: string) => void;
}) {
  const [actionComment, setActionComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const u = getUserById(req.userId);
  const lt = getLeaveTypeById(req.leaveTypeId);
  const dept = u ? getDepartmentById(u.departmentId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px]">Chi tiết đơn nghỉ phép</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* Employee info */}
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

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Loại phép</div><div>{lt?.name} {lt?.isPaid ? <span className="text-[10px] text-green-600">(có lương)</span> : ''}</div></div>
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Thời gian</div><div>{req.startDate} → {req.endDate}</div></div>
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Số ngày</div><div>{req.totalDays} {req.isHalfDay ? `(${req.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'})` : ''}</div></div>
            <div><div className="text-[11px] text-muted-foreground mb-0.5">Ngày gửi</div><div>{req.submittedAt}</div></div>
          </div>
          {req.reason && (
            <div className="text-[13px]"><div className="text-[11px] text-muted-foreground mb-0.5">Lý do</div>{req.reason}</div>
          )}

          {/* 2-step Approval Timeline */}
          <div>
            <div className="text-[13px] mb-2">Quy trình duyệt 2 bước</div>
            <div className="space-y-0">
              {/* Step 1: Manager */}
              <ApprovalTimelineStep
                stepNumber={1}
                stepLabel="Quản lý trực tiếp"
                approval={req.approvals.find(a => a.stepType === 'MANAGER')}
                isActive={req.currentStep === 'MANAGER'}
                isLast={false}
              />
              {/* Step 2: HR */}
              <ApprovalTimelineStep
                stepNumber={2}
                stepLabel="Phòng Nhân sự (HR)"
                approval={req.approvals.find(a => a.stepType === 'HR')}
                isActive={req.currentStep === 'HR'}
                isLast
              />
            </div>
          </div>

          {/* Actions */}
          {canApprove && !showRejectForm && (
            <div className="space-y-2 pt-2 border-t border-border">
              <input type="text" placeholder="Nhận xét (không bắt buộc)..." value={actionComment} onChange={e => setActionComment(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
              <div className="flex gap-2">
                <button onClick={() => { onApprove(req.id, actionComment); onClose(); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700 flex items-center justify-center gap-1">
                  <Check size={14} /> Duyệt bước {req.currentStep === 'MANAGER' ? '1' : '2'}
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
          {canCancel && (
            <button onClick={() => { onCancel(req.id); onClose(); }} className="w-full py-2 border border-red-300 text-red-600 rounded-lg text-[13px] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1">
              <Ban size={14} /> Huỷ đơn nghỉ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared UI Components
// ═══════════════════════════════════════════════════════════════════
function ApprovalStepBadge({ step, active }: { step: string; active?: boolean }) {
  const isManager = step === 'MANAGER';
  const base = isManager
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${base} ${active ? 'ring-1 ring-current' : ''}`}>
      {isManager ? <User size={10} /> : <Shield size={10} />}
      {isManager ? 'Bước 1: QL' : 'Bước 2: HR'}
    </span>
  );
}

function ApprovalProgressBar({ approvals, currentStep, status }: {
  approvals: LeaveRequestApproval[];
  currentStep: string | null;
  status: LeaveRequestStatus;
}) {
  const mgrA = approvals.find(a => a.stepType === 'MANAGER');
  const hrA = approvals.find(a => a.stepType === 'HR');

  const mgrStatus = mgrA?.status || (status === 'CANCELLED' ? 'SKIPPED' : 'PENDING');
  const hrStatus = hrA?.status || (status === 'CANCELLED' ? 'SKIPPED' : (mgrStatus === 'APPROVED' || currentStep === 'HR' ? 'PENDING' : 'SKIPPED'));

  const stepColor = (s: string) => {
    if (s === 'APPROVED') return 'bg-green-500 text-white';
    if (s === 'REJECTED') return 'bg-red-500 text-white';
    if (s === 'PENDING') return 'bg-yellow-400 text-yellow-900';
    return 'bg-gray-200 text-gray-400 dark:bg-gray-700';
  };

  const lineColor = (s: string) => {
    if (s === 'APPROVED') return 'bg-green-400';
    if (s === 'REJECTED') return 'bg-red-400';
    return 'bg-gray-200 dark:bg-gray-700';
  };

  return (
    <div className="flex items-center gap-0.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${stepColor(mgrStatus)}`}>
        {mgrStatus === 'APPROVED' ? '✓' : mgrStatus === 'REJECTED' ? '✗' : '1'}
      </div>
      <div className={`w-6 h-0.5 ${lineColor(mgrStatus)}`} />
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${stepColor(hrStatus)}`}>
        {hrStatus === 'APPROVED' ? '✓' : hrStatus === 'REJECTED' ? '✗' : '2'}
      </div>
    </div>
  );
}

function ApprovalTimelineStep({ stepNumber, stepLabel, approval, isActive, isLast }: {
  stepNumber: number;
  stepLabel: string;
  approval?: LeaveRequestApproval;
  isActive: boolean;
  isLast: boolean;
}) {
  const status = approval?.status || 'PENDING';
  const approverUser = approval ? getUserById(approval.approverUserId) : null;

  const dotColor = status === 'APPROVED' ? 'bg-green-500' : status === 'REJECTED' ? 'bg-red-500' : isActive ? 'bg-yellow-400 ring-4 ring-yellow-100 dark:ring-yellow-900/30' : 'bg-gray-300 dark:bg-gray-600';
  const lineColor = status === 'APPROVED' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${dotColor}`}>
          {status === 'APPROVED' ? <Check size={12} /> : status === 'REJECTED' ? <X size={12} /> : stepNumber}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 min-h-[24px] ${lineColor}`} />}
      </div>
      <div className="pb-4">
        <div className="text-[12px] flex items-center gap-2">
          <span>Bước {stepNumber}: {stepLabel}</span>
          {status !== 'PENDING' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {approvalStatusLabels[status]}
            </span>
          )}
          {isActive && status === 'PENDING' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse">Đang chờ</span>
          )}
        </div>
        {approverUser && <div className="text-[11px] text-muted-foreground mt-0.5">Người duyệt: {approverUser.fullName}</div>}
        {approval?.comment && (
          <div className="text-[11px] mt-0.5 flex items-start gap-1">
            <MessageSquare size={10} className="text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">"{approval.comment}"</span>
          </div>
        )}
        {approval?.actionAt && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(approval.actionAt).toLocaleString('vi-VN')}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LeaveBalancesPage — kept for /leave/balances route
// ═══════════════════════════════════════════════════════════════════
export function LeaveBalancesPage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const filtered = leaveBalances.filter(b => {
    const u = getUserById(b.userId);
    const lt = getLeaveTypeById(b.leaveTypeId);
    if (deptFilter && u?.departmentId !== deptFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return u?.fullName.toLowerCase().includes(s) || lt?.name.toLowerCase().includes(s);
  });

  // Group by user
  const userGroups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach(b => {
      const key = b.userId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Số dư phép nhân viên</h1>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm nhân viên, loại phép..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả phòng ban</option>
          {departments.filter((d: any) => d.isActive).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Phòng ban</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại phép</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Được cấp</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Chuyển</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Đã dùng</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Chờ</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Còn lại</th>
                <th className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Sử dụng</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const u = getUserById(b.userId);
                const lt = getLeaveTypeById(b.leaveTypeId);
                const dept = u ? getDepartmentById(u.departmentId) : null;
                const total = b.entitledDays + b.carriedDays;
                const pct = total > 0 ? (b.usedDays / total) * 100 : 0;
                return (
                  <tr key={`${b.userId}-${b.leaveTypeId}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <div className="text-[13px]">{u?.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">{u?.userCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{dept?.name}</td>
                    <td className="px-4 py-3 text-[13px]">{lt?.name}</td>
                    <td className="px-4 py-3 text-[13px] text-right">{b.entitledDays}</td>
                    <td className="px-4 py-3 text-[13px] text-right hidden sm:table-cell">{b.carriedDays}</td>
                    <td className="px-4 py-3 text-[13px] text-right">{b.usedDays}</td>
                    <td className="px-4 py-3 text-[13px] text-right hidden sm:table-cell">{b.pendingDays}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[13px] ${b.remainingDays <= 2 ? 'text-red-500' : ''}`}>{b.remainingDays}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{Math.round(pct)}%</div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} bản ghi</div>
      </div>
    </div>
  );
}


