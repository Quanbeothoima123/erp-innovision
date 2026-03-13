// ================================================================
// LEAVE PAGE — Module 5 (API-integrated + type-fixed)
// Fixes:
//   - approvals[].approverUserId → approverId
//   - .actionAt → .actedAt
//   - .comment → .note
//   - proper API/mock switching
// ================================================================
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  leaveRequests as initialLeaveRequests,
  leaveBalances as initialBalances,
  leaveTypes,
  getUserById,
  getLeaveTypeById,
} from '../data/mockData';
import type { LeaveRequest, LeaveRequestStatus, LeaveBalance } from '../data/mockData';
import {
  Plus, Check, X, Search, CalendarDays, AlertTriangle,
  FileText, Ban, ListChecks, Shield, CheckCircle2,
  MessageSquare, Info, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import * as leaveService from '../../lib/services/leave.service';
import type { ApiLeaveRequest, ApiLeaveBalance, ApiLeaveType } from '../../lib/services/leave.service';
import { ApiError } from '../../lib/apiClient';

const USE_API = !!import.meta.env.VITE_API_URL;

// ── Type helpers for mock/API compat ──────────────────────────
function getApprovalApproverId(approval: unknown): string {
  const obj = approval as Record<string, unknown>;
  return (obj.approverId ?? obj.approverUserId ?? '') as string;
}
function getApprovalActedAt(approval: unknown): string | null {
  const obj = approval as Record<string, unknown>;
  return (obj.actedAt ?? obj.actionAt ?? null) as string | null;
}
function getApprovalNote(approval: unknown): string | null {
  const obj = approval as Record<string, unknown>;
  return (obj.note ?? obj.comment ?? null) as string | null;
}

// ── Constants ──────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};
const statusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã huỷ' };
const stepLabels: Record<string, string> = { MANAGER: 'Quản lý', HR: 'Nhân sự' };

const emptyForm = { leaveTypeId: '', startDate: '', endDate: '', isHalfDay: false, halfDayPeriod: 'MORNING', reason: '' };

// ── Canmanager approve helper ──────────────────────────────────
function canManagerApprove(req: LeaveRequest | ApiLeaveRequest, managerId: string): boolean {
  return true; // simplified — real logic checks team hierarchy
}

// ================================================================
// MAIN
// ================================================================
export function LeaveRequestsPage() {
  const { currentUser, can } = useAuth();
  const [reqs, setReqs] = useState<(LeaveRequest | ApiLeaveRequest)[]>(USE_API ? [] : initialLeaveRequests);
  const [balances, setBalances] = useState<(LeaveBalance | ApiLeaveBalance)[]>(USE_API ? [] : initialBalances);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<ApiLeaveType[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(USE_API);
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<LeaveRequest | ApiLeaveRequest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = can('ADMIN');
  const isHR = can('HR');
  const isAdminHR = isAdmin || isHR;
  const isManager = can('MANAGER');

  // ── Fetch ──────────────────────────────────────────────────
  const fetchReqs = useCallback(async () => {
    if (!USE_API) return;
    setLoadingReqs(true);
    try {
      const res = await leaveService.listRequests({ limit: 100 });
      setReqs(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không tải được danh sách đơn nghỉ');
    } finally { setLoadingReqs(false); }
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!USE_API) return;
    try {
      const data = await leaveService.getMyBalances();
      setBalances(data);
    } catch { /**/ }
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    if (USE_API) {
      try {
        const data = await leaveService.getLeaveTypeOptions();
        setLeaveTypeOptions(data);
      } catch { /**/ }
    } else {
      setLeaveTypeOptions(leaveTypes as unknown as ApiLeaveType[]);
    }
  }, []);

  useEffect(() => { fetchReqs(); fetchBalances(); fetchLeaveTypes(); }, [fetchReqs, fetchBalances, fetchLeaveTypes]);

  // ── Tabs ───────────────────────────────────────────────────
  type TabKey = 'my' | 'manager_approve' | 'hr_approve' | 'all';

  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [];

    if (!isAdminHR || isManager) {
      tabs.push({ key: 'my', label: 'Đơn nghỉ của tôi', icon: <CalendarDays size={14} /> });
    }
    if (isManager) {
      const pending = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'MANAGER').length;
      tabs.push({ key: 'manager_approve', label: 'Duyệt bước 1 (Quản lý)', icon: <ListChecks size={14} />, badge: pending });
    }
    if (isAdminHR) {
      const pending = reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'HR').length;
      tabs.push({ key: 'hr_approve', label: 'Duyệt bước 2 (HR)', icon: <Shield size={14} />, badge: pending });
      tabs.push({ key: 'all', label: 'Tất cả đơn nghỉ', icon: <FileText size={14} /> });
    }
    return tabs;
  }, [isAdminHR, isManager, reqs]);

  const defaultTab: TabKey = isAdminHR ? 'hr_approve' : isManager ? 'manager_approve' : 'my';
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // ── Approve / Reject ───────────────────────────────────────
  const handleApprove = useCallback(async (reqId: string, step: 'MANAGER' | 'HR', note: string) => {
    if (USE_API) {
      try {
        await leaveService.approveRequest(reqId, note || undefined);
        toast.success(`Đã duyệt bước ${step === 'MANAGER' ? '1 (Quản lý)' : '2 (HR)'}`);
        fetchReqs();
      } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi duyệt đơn'); }
      return;
    }
    setReqs(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const mockR = r as LeaveRequest;
      const updatedApprovals = [...mockR.approvals];
      const idx = updatedApprovals.findIndex(a => a.stepType === step && a.status === 'PENDING');
      const approvalUpdate = { status: 'APPROVED' as const, comment: note || undefined, actionAt: new Date().toISOString(), approverUserId: currentUser!.id };
      if (idx >= 0) { updatedApprovals[idx] = { ...updatedApprovals[idx], ...approvalUpdate }; }
      else { updatedApprovals.push({ approverUserId: currentUser!.id, stepType: step, stepOrder: step === 'MANAGER' ? 1 : 2, ...approvalUpdate }); }
      if (step === 'MANAGER') {
        if (!updatedApprovals.find(a => a.stepType === 'HR')) updatedApprovals.push({ approverUserId: '', stepType: 'HR', stepOrder: 2, status: 'PENDING' });
        return { ...r, approvals: updatedApprovals, currentStep: 'HR' as const };
      } else {
        return { ...r, approvals: updatedApprovals, status: 'APPROVED' as const, currentStep: null };
      }
    }));
    toast.success(`Đã duyệt bước ${step === 'MANAGER' ? '1 (Quản lý)' : '2 (HR)'}`);
  }, [currentUser, fetchReqs]);

  const handleReject = useCallback(async (reqId: string, step: 'MANAGER' | 'HR', note: string) => {
    if (!note.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    if (USE_API) {
      try {
        await leaveService.rejectRequest(reqId, note);
        toast.success('Đã từ chối đơn nghỉ phép');
        fetchReqs();
      } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi từ chối đơn'); }
      return;
    }
    setReqs(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const mockR = r as LeaveRequest;
      const updatedApprovals = [...mockR.approvals];
      const idx = updatedApprovals.findIndex(a => a.stepType === step && a.status === 'PENDING');
      const rejectUpdate = { status: 'REJECTED' as const, comment: note, actionAt: new Date().toISOString(), approverUserId: currentUser!.id };
      if (idx >= 0) { updatedApprovals[idx] = { ...updatedApprovals[idx], ...rejectUpdate }; }
      else { updatedApprovals.push({ approverUserId: currentUser!.id, stepType: step, stepOrder: step === 'MANAGER' ? 1 : 2, ...rejectUpdate }); }
      return { ...r, approvals: updatedApprovals, status: 'REJECTED' as const, currentStep: null };
    }));
    toast.success('Đã từ chối đơn nghỉ phép');
  }, [currentUser, fetchReqs]);

  const handleCancel = useCallback(async (reqId: string) => {
    if (USE_API) {
      try { await leaveService.cancelRequest(reqId); toast.success('Đã huỷ đơn nghỉ phép'); fetchReqs(); }
      catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi huỷ đơn'); }
    } else {
      setReqs(prev => prev.map(r => r.id !== reqId || r.status !== 'PENDING' ? r : { ...r, status: 'CANCELLED' as const, currentStep: null }));
      toast.success('Đã huỷ đơn nghỉ phép');
    }
  }, [fetchReqs]);

  // ── Create ─────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) { toast.error('Ngày kết thúc phải sau ngày bắt đầu'); return; }

    setSubmitting(true);
    try {
      if (USE_API) {
        await leaveService.createRequest({
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          isHalfDay: form.isHalfDay,
          halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
          reason: form.reason || undefined,
        });
        fetchReqs(); fetchBalances();
      } else {
        const totalDays = form.isHalfDay ? 0.5 : Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
        const newReq: LeaveRequest = {
          id: `lr-${Date.now()}`, userId: currentUser!.id,
          leaveTypeId: form.leaveTypeId, startDate: form.startDate, endDate: form.endDate,
          totalDays, isHalfDay: form.isHalfDay, halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : null,
          reason: form.reason || null, status: 'PENDING', currentStep: 'MANAGER',
          attachmentUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          approvals: [{ approverUserId: currentUser!.managerId || '', stepType: 'MANAGER', stepOrder: 1, status: 'PENDING' }],
        };
        setReqs(prev => [newReq, ...prev]);
      }
      toast.success('Đã gửi đơn nghỉ phép thành công');
      setShowForm(false);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gửi đơn thất bại');
    } finally { setSubmitting(false); }
  }, [form, currentUser, fetchReqs, fetchBalances]);

  // ── Filter reqs by tab ─────────────────────────────────────
  const filteredReqs = useMemo(() => {
    switch (activeTab) {
      case 'my': return reqs.filter(r => r.userId === currentUser?.id);
      case 'manager_approve': return reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'MANAGER');
      case 'hr_approve': return reqs.filter(r => r.status === 'PENDING' && r.currentStep === 'HR');
      case 'all': return reqs;
      default: return [];
    }
  }, [reqs, activeTab, currentUser?.id]);

  const myBalances = balances.filter(b => {
    const bal = b as LeaveBalance | ApiLeaveBalance;
    return (bal as LeaveBalance).userId === currentUser?.id || (bal as ApiLeaveBalance).userId === currentUser?.id;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold">Nghỉ phép</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Gửi và quản lý đơn nghỉ phép</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchReqs(); fetchBalances(); }} className="p-2 rounded-lg border border-border hover:bg-accent transition">
            <RefreshCw size={14} className={`text-muted-foreground ${loadingReqs ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition">
            <Plus size={14} /> Tạo đơn nghỉ
          </button>
        </div>
      </div>

      {/* My balances */}
      {myBalances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {myBalances.slice(0, 4).map((b, i) => {
            const bal = b as LeaveBalance & ApiLeaveBalance;
            const lt = (b as ApiLeaveBalance).leaveType ?? getLeaveTypeById(bal.leaveTypeId);
            return (
              <div key={i} className="bg-card border border-border rounded-xl p-3">
                <div className="text-[11px] text-muted-foreground mb-1">{(lt as { name: string } | undefined)?.name ?? 'Loại phép'}</div>
                <div className="text-[22px] font-semibold text-blue-600">{bal.remainingDays ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">còn lại / {bal.entitledDays ?? 0} ngày</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {availableTabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon}{t.label}
            {(t.badge ?? 0) > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loadingReqs ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Đang tải...</span>
        </div>
      ) : filteredReqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <CalendarDays size={32} className="opacity-20 mb-2" />
          <p className="text-[13px]">Không có đơn nghỉ nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReqs.map(req => {
            const user = getUserById(req.userId);
            const lt = (req as ApiLeaveRequest).leaveType ?? getLeaveTypeById(req.leaveTypeId);
            const approvals = (req as LeaveRequest).approvals ?? (req as ApiLeaveRequest).approvals ?? [];
            const canApprove = activeTab === 'manager_approve' || activeTab === 'hr_approve';
            const step = activeTab === 'manager_approve' ? 'MANAGER' : 'HR';

            return (
              <div key={req.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[14px] font-medium">{user?.fullName ?? req.userId}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] ?? ''}`}>{statusLabels[req.status] ?? req.status}</span>
                      {req.currentStep && req.status === 'PENDING' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          Chờ {stepLabels[req.currentStep] ?? req.currentStep}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={11} />
                        {(lt as { name: string } | undefined)?.name ?? req.leaveTypeId} ·{' '}
                        {new Date(req.startDate).toLocaleDateString('vi-VN')} → {new Date(req.endDate).toLocaleDateString('vi-VN')} ({req.totalDays} ngày)
                        {req.isHalfDay && ' — Nửa ngày'}
                      </div>
                      {req.reason && <div className="text-[11px] italic">{req.reason}</div>}
                    </div>

                    {/* Approval steps */}
                    {approvals.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {approvals.map((a, i) => {
                          const approver = getUserById(getApprovalApproverId(a));
                          const aStatus = (a as Record<string, unknown>).status as string;
                          const aNote = getApprovalNote(a);
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {aStatus === 'APPROVED' ? <CheckCircle2 size={12} className="text-emerald-500" /> :
                               aStatus === 'REJECTED' ? <X size={12} className="text-red-500" /> :
                               aStatus === 'SKIPPED' ? <Ban size={12} /> : <MessageSquare size={12} className="text-amber-500" />}
                              {stepLabels[(a as Record<string, unknown>).stepType as string] ?? (a as Record<string, unknown>).stepType as string}
                              {approver && `: ${approver.fullName}`}
                              {aNote && ` — "${aNote}"`}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 items-end">
                    <button onClick={() => setDetailReq(req)} className="text-[11px] text-blue-600 hover:underline">
                      Chi tiết
                    </button>
                    {activeTab === 'my' && req.status === 'PENDING' && req.userId === currentUser?.id && (
                      <button onClick={() => handleCancel(req.id)} className="text-[11px] text-red-600 hover:underline flex items-center gap-1">
                        <Ban size={11} /> Huỷ đơn
                      </button>
                    )}
                    {canApprove && req.status === 'PENDING' && (
                      <ApproveRejectButtons
                        onApprove={(note) => handleApprove(req.id, step, note)}
                        onReject={(note) => handleReject(req.id, step, note)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-semibold">Tạo đơn nghỉ phép</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-accent"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Loại nghỉ phép *</label>
                <select value={form.leaveTypeId} onChange={e => setForm(p => ({ ...p, leaveTypeId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chọn loại nghỉ --</option>
                  {leaveTypeOptions.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Ngày bắt đầu *', key: 'startDate' }, { label: 'Ngày kết thúc *', key: 'endDate' }].map(f => (
                  <div key={f.key}>
                    <label className="text-[12px] text-muted-foreground block mb-1">{f.label}</label>
                    <input type="date" value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isHalfDay" checked={form.isHalfDay} onChange={e => setForm(p => ({ ...p, isHalfDay: e.target.checked }))} className="accent-blue-600" />
                <label htmlFor="isHalfDay" className="text-[13px] cursor-pointer">Nghỉ nửa ngày</label>
              </div>
              {form.isHalfDay && (
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">Buổi</label>
                  <div className="flex gap-3">
                    {[{ v: 'MORNING', l: 'Buổi sáng' }, { v: 'AFTERNOON', l: 'Buổi chiều' }].map(opt => (
                      <label key={opt.v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                        <input type="radio" value={opt.v} checked={form.halfDayPeriod === opt.v} onChange={() => setForm(p => ({ ...p, halfDayPeriod: opt.v }))} className="accent-blue-600" />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Lý do</label>
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                  placeholder="VD: Nghỉ phép cá nhân..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition">Huỷ</button>
              <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition disabled:opacity-50">
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {submitting ? 'Đang gửi...' : 'Gửi đơn nghỉ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailReq && <LeaveDetailDialog req={detailReq} onClose={() => setDetailReq(null)} />}
    </div>
  );
}

// ── Approve/Reject Buttons ─────────────────────────────────────
function ApproveRejectButtons({ onApprove, onReject }: { onApprove: (note: string) => void; onReject: (note: string) => void }) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [note, setNote] = useState('');

  if (mode === 'idle') {
    return (
      <div className="flex gap-1.5">
        <button onClick={() => setMode('approve')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] flex items-center gap-1 hover:bg-emerald-700 transition">
          <Check size={11} /> Duyệt
        </button>
        <button onClick={() => setMode('reject')} className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] flex items-center gap-1 hover:bg-red-700 transition">
          <X size={11} /> Từ chối
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-48">
      <input type="text" value={note} onChange={e => setNote(e.target.value)}
        placeholder={mode === 'approve' ? 'Ghi chú (tuỳ chọn)' : 'Lý do từ chối *'}
        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex gap-1">
        <button onClick={() => setMode('idle')} className="flex-1 py-1 rounded-lg border border-border text-[11px] hover:bg-accent transition">Huỷ</button>
        <button
          onClick={() => { mode === 'approve' ? onApprove(note) : onReject(note); setMode('idle'); setNote(''); }}
          className={`flex-1 py-1 rounded-lg text-white text-[11px] transition ${mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {mode === 'approve' ? 'Xác nhận' : 'Từ chối'}
        </button>
      </div>
    </div>
  );
}

// ── Leave Detail Dialog ─────────────────────────────────────────
function LeaveDetailDialog({ req, onClose }: { req: LeaveRequest | ApiLeaveRequest; onClose: () => void }) {
  const user = getUserById(req.userId);
  const lt = (req as ApiLeaveRequest).leaveType ?? getLeaveTypeById(req.leaveTypeId);
  const approvals = (req as LeaveRequest).approvals ?? (req as ApiLeaveRequest).approvals ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-[16px] font-semibold">Chi tiết đơn nghỉ phép</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Nhân viên" value={user?.fullName} />
            <InfoRow label="Trạng thái" value={statusLabels[req.status] ?? req.status} colored={statusColors[req.status]} />
            <InfoRow label="Loại nghỉ phép" value={(lt as { name: string } | undefined)?.name} />
            <InfoRow label="Số ngày" value={`${req.totalDays} ngày${req.isHalfDay ? ' (nửa ngày)' : ''}`} />
            <InfoRow label="Ngày bắt đầu" value={new Date(req.startDate).toLocaleDateString('vi-VN')} />
            <InfoRow label="Ngày kết thúc" value={new Date(req.endDate).toLocaleDateString('vi-VN')} />
            {req.reason && <div className="col-span-2"><InfoRow label="Lý do" value={req.reason} /></div>}
          </div>

          {approvals.length > 0 && (
            <div>
              <p className="text-[12px] text-muted-foreground font-medium mb-2">Tiến trình duyệt</p>
              <div className="space-y-2">
                {approvals.map((a, i) => {
                  const approver = getUserById(getApprovalApproverId(a));
                  const aStatus = (a as Record<string, unknown>).status as string;
                  const aNote = getApprovalNote(a);
                  const aAt = getApprovalActedAt(a);
                  return (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
                      {aStatus === 'APPROVED' ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> :
                       aStatus === 'REJECTED' ? <X size={14} className="text-red-500 mt-0.5 shrink-0" /> :
                       <MessageSquare size={14} className="text-amber-500 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium">
                          {stepLabels[(a as Record<string, unknown>).stepType as string] ?? (a as Record<string, unknown>).stepType as string}
                          {approver && ` — ${approver.fullName}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {aStatus === 'PENDING' ? 'Đang chờ duyệt' : aStatus === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                          {aAt && ` · ${new Date(aAt).toLocaleDateString('vi-VN')}`}
                        </div>
                        {aNote && <div className="text-[11px] italic text-muted-foreground mt-0.5">"{aNote}"</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, colored }: { label: string; value?: string | null; colored?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      {colored ? (
        <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${colored}`}>{value ?? '—'}</span>
      ) : (
        <div className="text-[13px]">{value ?? <span className="text-muted-foreground italic">—</span>}</div>
      )}
    </div>
  );
}

// ================================================================
// LEAVE BALANCES PAGE
// ================================================================
export function LeaveBalancesPage() {
  const { can } = useAuth();
  const isAdminHR = can('ADMIN', 'HR');
  const [balances, setBalances] = useState<ApiLeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_API) {
        const res = await leaveService.listBalances({ year, limit: 200 });
        setBalances(res.data);
      } else {
        setBalances(initialBalances.map(b => ({
          ...b,
          leaveType: getLeaveTypeById(b.leaveTypeId) as unknown as ApiLeaveType,
        })));
      }
    } catch { toast.error('Không tải được số dư phép'); } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const filtered = search
    ? balances.filter(b => b.user?.fullName.toLowerCase().includes(search.toLowerCase()) || getUserById(b.userId)?.fullName.toLowerCase().includes(search.toLowerCase()))
    : balances;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Số dư phép</h1>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
          <button onClick={fetchBalances} className="p-2 rounded-lg border border-border hover:bg-accent transition">
            <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isAdminHR && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm nhân viên..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_60px_60px_60px_60px_80px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>Nhân viên</span><span>Loại phép</span><span>Được phép</span><span>Đã dùng</span><span>Chờ duyệt</span><span>Còn lại</span><span>Trạng thái</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-[13px]">Không có dữ liệu số dư phép</div>
            )}
            {filtered.map((b, i) => {
              const user = b.user ?? getUserById(b.userId);
              const lt = b.leaveType ?? getLeaveTypeById(b.leaveTypeId);
              const remaining = b.remainingDays ?? 0;
              const entitled = b.entitledDays ?? 0;
              const pct = entitled > 0 ? (remaining / entitled) * 100 : 0;
              return (
                <div key={i} className="grid sm:grid-cols-[2fr_1.5fr_60px_60px_60px_60px_80px] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition">
                  <span className="text-[13px]">{(user as { fullName?: string } | undefined)?.fullName ?? b.userId}</span>
                  <span className="text-[12px] text-muted-foreground">{(lt as { name: string } | undefined)?.name ?? b.leaveTypeId}</span>
                  <span className="text-[12px]">{entitled}</span>
                  <span className="text-[12px] text-amber-600">{b.usedDays ?? 0}</span>
                  <span className="text-[12px] text-blue-600">{b.pendingDays ?? 0}</span>
                  <span className={`text-[12px] font-medium ${remaining <= 0 ? 'text-red-500' : remaining < 3 ? 'text-amber-500' : 'text-emerald-600'}`}>{remaining}</span>
                  <div className="hidden sm:block w-full bg-muted rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
