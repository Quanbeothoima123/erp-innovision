import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  attendanceRequests as initialReqs,
  attendanceRecords as initialRecords,
  users, departments, getUserById, getShiftById, getDepartmentById, workShifts, holidays,
} from '../data/mockData';
import type {
  AttendanceRequest, AttendanceRequestStatus, AttendanceRecord, AttendanceStatus,
} from '../data/mockData';
import {
  Check, X, Clock, Search, Home, ChevronLeft, ChevronRight, Download,
  Edit3, Save, XCircle, AlertTriangle, Building2, CalendarDays,
  ListChecks, Wifi, LogIn, LogOut, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────────
const TODAY = '2025-03-12';

const reqStatusColors: Record<AttendanceRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const reqStatusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };

const attStatusBg: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LEAVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HOLIDAY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MANUAL_ADJUSTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};
const attStatusLabels: Record<string, string> = {
  PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', LEAVE: 'Nghỉ phép', HOLIDAY: 'Ngày lễ', MANUAL_ADJUSTED: 'Điều chỉnh',
};

// ═══════════════════════════════════════════════════════════════
// Main Admin Attendance Page — 3 tabs
// ═══════════════════════════════════════════════════════════════
export function AttendanceAdminPage() {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<'approve' | 'adjust' | 'summary'>('approve');
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [reqs, setReqs] = useState<AttendanceRequest[]>(initialReqs);

  // Shared callbacks for child tabs
  const onApprove = useCallback((reqId: string) => {
    const req = reqs.find(r => r.id === reqId);
    if (!req) return;
    // Update request status
    setReqs(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date().toISOString() } : r));

    // Auto-create or update AttendanceRecord
    setRecords(prev => {
      const existing = prev.find(rec => rec.userId === req.userId && rec.workDate === req.workDate);
      if (existing) {
        return prev.map(rec => {
          if (rec.userId === req.userId && rec.workDate === req.workDate) {
            if (req.requestType === 'CHECK_IN') {
              return { ...rec, checkInAt: req.requestedAt, status: 'PRESENT' as const, isRemoteWork: req.isRemoteWork };
            } else {
              const checkIn = rec.checkInAt ? new Date(rec.checkInAt).getTime() : null;
              const checkOut = new Date(req.requestedAt).getTime();
              const totalMin = checkIn ? Math.round((checkOut - checkIn) / 60000) : rec.totalWorkMinutes;
              return { ...rec, checkOutAt: req.requestedAt, totalWorkMinutes: totalMin, status: 'PRESENT' as const };
            }
          }
          return rec;
        });
      } else {
        // Create new record
        const newRec: AttendanceRecord = {
          id: `attrec-auto-${Date.now()}`,
          userId: req.userId,
          shiftId: req.shiftId || 'ws-1',
          workDate: req.workDate,
          checkInAt: req.requestType === 'CHECK_IN' ? req.requestedAt : undefined,
          checkOutAt: req.requestType === 'CHECK_OUT' ? req.requestedAt : undefined,
          totalWorkMinutes: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          isRemoteWork: req.isRemoteWork,
          status: 'PRESENT',
        };
        return [...prev, newRec];
      }
    });
    toast.success('Đã duyệt yêu cầu & cập nhật bảng chấm công');
  }, [reqs]);

  const onReject = useCallback((reqId: string, reason: string) => {
    setReqs(prev => prev.map(r => r.id === reqId ? { ...r, status: 'REJECTED' as const, rejectReason: reason, reviewedAt: new Date().toISOString() } : r));
    toast.success('Đã từ chối yêu cầu chấm công');
  }, []);

  const onApproveAll = useCallback((ids: string[]) => {
    ids.forEach(id => onApprove(id));
  }, [onApprove]);

  const onAdjustRecord = useCallback((record: AttendanceRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        return prev.map(r => r.id === record.id ? record : r);
      }
      return [...prev, record];
    });
    toast.success('Đã điều chỉnh bản ghi chấm công');
  }, []);

  const tabs = [
    { key: 'approve' as const, label: 'Duyệt yêu cầu', icon: <ListChecks size={14} />, badge: reqs.filter(r => r.status === 'PENDING').length },
    { key: 'adjust' as const, label: 'Điều chỉnh thủ công', icon: <Edit3 size={14} /> },
    { key: 'summary' as const, label: 'Tổng hợp phòng ban', icon: <Building2 size={14} /> },
  ];

  if (!can('ADMIN', 'HR')) {
    return <div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Quản lý chấm công</h1>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
            {t.badge ? <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {activeTab === 'approve' && (
        <ApproveTab reqs={reqs} onApprove={onApprove} onReject={onReject} onApproveAll={onApproveAll} />
      )}
      {activeTab === 'adjust' && (
        <AdjustTab records={records} onAdjust={onAdjustRecord} />
      )}
      {activeTab === 'summary' && (
        <SummaryTab records={records} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: Duyệt yêu cầu
// ═══════════════════════════════════════════════════════════════
function ApproveTab({ reqs, onApprove, onReject, onApproveAll }: {
  reqs: AttendanceRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onApproveAll: (ids: string[]) => void;
}) {
  const [subTab, setSubTab] = useState<'checkin' | 'checkout' | 'processed'>('checkin');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  let allReqs = reqs;
  if (search) {
    const s = search.toLowerCase();
    allReqs = allReqs.filter(r => {
      const u = getUserById(r.userId);
      return u?.fullName.toLowerCase().includes(s) || r.note?.toLowerCase().includes(s) || r.workDate.includes(s);
    });
  }
  const pendingCheckins = allReqs.filter(r => r.status === 'PENDING' && r.requestType === 'CHECK_IN');
  const pendingCheckouts = allReqs.filter(r => r.status === 'PENDING' && r.requestType === 'CHECK_OUT');
  const processed = allReqs.filter(r => r.status !== 'PENDING');
  const displayed = subTab === 'checkin' ? pendingCheckins : subTab === 'checkout' ? pendingCheckouts : processed;

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    if (rejectDialog) { onReject(rejectDialog, rejectReason); }
    setRejectDialog(null); setRejectReason('');
  };

  const handleApproveAll = () => {
    const ids = displayed.filter(r => r.status === 'PENDING').map(r => r.id);
    if (ids.length === 0) return;
    onApproveAll(ids);
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-blue-700 dark:text-blue-400">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Khi duyệt yêu cầu, hệ thống sẽ tự động tạo hoặc cập nhật bản ghi chấm công (<code className="px-1 bg-blue-100 dark:bg-blue-900/30 rounded">AttendanceRecord</code>) cho nhân viên tương ứng.</span>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Tìm nhân viên, ghi chú, ngày..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        {[
          { key: 'checkin' as const, label: `Check-in chờ duyệt (${pendingCheckins.length})`, icon: <LogIn size={12} /> },
          { key: 'checkout' as const, label: `Check-out chờ duyệt (${pendingCheckouts.length})`, icon: <LogOut size={12} /> },
          { key: 'processed' as const, label: `Đã xử lý (${processed.length})`, icon: <Check size={12} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} className={`px-3 py-2 text-[13px] border-b-2 flex items-center gap-1 ${subTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {subTab !== 'processed' && displayed.length > 0 && (
        <button onClick={handleApproveAll} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700 flex items-center gap-1">
          <Check size={14} /> Duyệt tất cả ({displayed.length})
        </button>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Ngày làm</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giờ yêu cầu</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ca</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Ghi chú</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              {subTab !== 'processed' && <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Hành động</th>}
            </tr></thead>
            <tbody>
              {displayed.map(r => {
                const u = getUserById(r.userId);
                const shift = r.shiftId ? getShiftById(r.shiftId) : null;
                const dept = u ? getDepartmentById(u.departmentId) : null;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shrink-0">{u?.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <div className="text-[13px]">{u?.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">{dept?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {r.requestType === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                      </span>
                      {r.isRemoteWork && <span className="ml-1 text-[10px] text-orange-500"><Home size={10} className="inline" /> WFH</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{new Date(r.workDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{shift?.name || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell max-w-[180px] truncate">{r.note || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                      {r.rejectReason && <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-[120px]">{r.rejectReason}</div>}
                    </td>
                    {subTab !== 'processed' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onApprove(r.id)} title="Duyệt" className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors"><Check size={14} /></button>
                          <button onClick={() => setRejectDialog(r.id)} title="Từ chối" className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"><X size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {displayed.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-[13px]">Không có yêu cầu nào</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{displayed.length} yêu cầu</div>
      </div>

      {/* Reject Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setRejectDialog(null); setRejectReason(''); }} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-[16px] mb-3">Từ chối yêu cầu</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Lý do từ chối *" className="w-full p-3 rounded-lg border border-border bg-input-background text-[13px] h-24 resize-none" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setRejectDialog(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg border border-border text-[13px]">Huỷ</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] disabled:opacity-50">Từ chối</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: Điều chỉnh thủ công
// ═══════════════════════════════════════════════════════════════
function AdjustTab({ records, onAdjust }: {
  records: AttendanceRecord[];
  onAdjust: (record: AttendanceRecord) => void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [shiftId, setShiftId] = useState('ws-1');
  const [isRemote, setIsRemote] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');

  const activeUsers = users.filter(u => u.employmentStatus !== 'TERMINATED' && u.accountStatus === 'ACTIVE');

  // Find existing record
  const existingRecord = useMemo(() => {
    if (!selectedUser || !selectedDate) return null;
    return records.find(r => r.userId === selectedUser && r.workDate === selectedDate) || null;
  }, [selectedUser, selectedDate, records]);

  // User records for the month
  const userMonthRecords = useMemo(() => {
    if (!selectedUser) return [];
    const [y, m] = selectedDate.split('-').map(Number);
    return records.filter(r => {
      const d = new Date(r.workDate);
      return r.userId === selectedUser && d.getFullYear() === y && d.getMonth() === m - 1;
    }).sort((a, b) => a.workDate.localeCompare(b.workDate));
  }, [selectedUser, selectedDate, records]);

  const startEdit = () => {
    if (existingRecord) {
      setCheckIn(existingRecord.checkInAt ? existingRecord.checkInAt.split('T')[1]?.substring(0, 5) || '' : '');
      setCheckOut(existingRecord.checkOutAt ? existingRecord.checkOutAt.split('T')[1]?.substring(0, 5) || '' : '');
      setShiftId(existingRecord.shiftId);
      setIsRemote(existingRecord.isRemoteWork);
    } else {
      setCheckIn('08:00');
      setCheckOut('17:30');
      setShiftId('ws-1');
      setIsRemote(false);
    }
    setAdjustReason('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setAdjustReason('');
  };

  const saveAdjust = () => {
    if (!adjustReason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh');
      return;
    }
    if (!selectedUser || !selectedDate) return;

    const ciTime = checkIn ? `${selectedDate}T${checkIn}:00` : undefined;
    const coTime = checkOut ? `${selectedDate}T${checkOut}:00` : undefined;

    let totalMin = 0;
    let lateMin = 0;
    if (ciTime && coTime) {
      totalMin = Math.max(0, Math.round((new Date(coTime).getTime() - new Date(ciTime).getTime()) / 60000));
    }
    // Calculate late based on shift start
    const shift = getShiftById(shiftId);
    if (shift && ciTime) {
      const shiftStart = `${selectedDate}T${shift.startTime}:00`;
      const diff = Math.round((new Date(ciTime).getTime() - new Date(shiftStart).getTime()) / 60000);
      lateMin = Math.max(0, diff);
    }

    const record: AttendanceRecord = existingRecord ? {
      ...existingRecord,
      checkInAt: ciTime,
      checkOutAt: coTime,
      totalWorkMinutes: totalMin,
      lateMinutes: lateMin,
      isRemoteWork: isRemote,
      shiftId,
      status: 'MANUAL_ADJUSTED',
    } : {
      id: `attrec-adj-${Date.now()}`,
      userId: selectedUser,
      shiftId,
      workDate: selectedDate,
      checkInAt: ciTime,
      checkOutAt: coTime,
      totalWorkMinutes: totalMin,
      lateMinutes: lateMin,
      overtimeMinutes: 0,
      isRemoteWork: isRemote,
      status: 'MANUAL_ADJUSTED',
    };

    onAdjust(record);
    setEditMode(false);
    setAdjustReason('');
  };

  const selectedUserObj = selectedUser ? getUserById(selectedUser) : null;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-start gap-2 text-[12px] text-orange-700 dark:text-orange-400">
        <Edit3 size={14} className="shrink-0 mt-0.5" />
        <span>Chỉnh sửa trực tiếp bản ghi chấm công của nhân viên. Bản ghi sẽ được đánh dấu trạng thái <code className="px-1 bg-orange-100 dark:bg-orange-900/30 rounded">MANUAL_ADJUSTED</code>.</span>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] text-muted-foreground mb-1">Chọn nhân viên</label>
          <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setEditMode(false); }} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">-- Chọn nhân viên --</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.userCode}) — {getDepartmentById(u.departmentId)?.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Ngày làm việc</label>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setEditMode(false); }} max={TODAY} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
      </div>

      {/* Current Record & Edit Form */}
      {selectedUser && selectedDate && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Current Record Card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] flex items-center gap-2">
                <Clock size={14} /> Bản ghi hiện tại
              </h3>
              {!editMode && (
                <button onClick={startEdit} className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 text-[12px] flex items-center gap-1">
                  <Pencil size={12} /> {existingRecord ? 'Chỉnh sửa' : 'Tạo mới'}
                </button>
              )}
            </div>

            {existingRecord ? (
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Trạng thái</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${attStatusBg[existingRecord.status]}`}>{attStatusLabels[existingRecord.status]}</span>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Ca</div>
                  <div>{getShiftById(existingRecord.shiftId)?.name || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Check-in</div>
                  <div>{existingRecord.checkInAt ? new Date(existingRecord.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Check-out</div>
                  <div>{existingRecord.checkOutAt ? new Date(existingRecord.checkOutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Tổng (phút)</div>
                  <div>{existingRecord.totalWorkMinutes}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Trễ (phút)</div>
                  <div className={existingRecord.lateMinutes > 0 ? 'text-red-500' : ''}>{existingRecord.lateMinutes}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">OT (phút)</div>
                  <div className={existingRecord.overtimeMinutes > 0 ? 'text-blue-500' : ''}>{existingRecord.overtimeMinutes}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Từ xa</div>
                  <div>{existingRecord.isRemoteWork ? <span className="text-orange-500 flex items-center gap-1"><Wifi size={12} /> WFH</span> : 'Không'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-[13px]">
                <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                Chưa có bản ghi chấm công cho ngày này
              </div>
            )}
          </div>

          {/* Edit Form */}
          {editMode && (
            <div className="bg-card border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
              <h3 className="text-[14px] flex items-center gap-2 mb-4 text-orange-700 dark:text-orange-400">
                <Edit3 size={14} /> Điều chỉnh thủ công — {selectedUserObj?.fullName}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Giờ Check-in</label>
                    <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Giờ Check-out</label>
                    <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Ca làm việc</label>
                    <select value={shiftId} onChange={e => setShiftId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                      {workShifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Làm từ xa</label>
                    <button onClick={() => setIsRemote(p => !p)} className={`w-full px-3 py-2 rounded-lg text-[13px] flex items-center gap-1 border ${isRemote ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'border-border bg-input-background text-muted-foreground'}`}>
                      <Home size={14} /> {isRemote ? 'WFH: Bật' : 'WFH: Tắt'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Lý do điều chỉnh *</label>
                  <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="VD: Nhân viên quên check-out, điều chỉnh theo camera..." className="w-full p-3 rounded-lg border border-border bg-input-background text-[13px] h-16 resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-border text-[13px] flex items-center gap-1"><XCircle size={14} /> Huỷ</button>
                  <button onClick={saveAdjust} disabled={!adjustReason.trim()} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-[13px] disabled:opacity-50 flex items-center gap-1 hover:bg-orange-700"><Save size={14} /> Lưu điều chỉnh</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Monthly Records */}
      {selectedUser && userMonthRecords.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="text-[13px] text-muted-foreground">Bản ghi chấm công tháng — {selectedUserObj?.fullName}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">Ngày</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">Trạng thái</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden sm:table-cell">Check-in</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden sm:table-cell">Check-out</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">Làm (phút)</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">Trễ</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground">Ghi chú</th>
              </tr></thead>
              <tbody>
                {userMonthRecords.map(r => (
                  <tr key={r.id} className={`border-b border-border last:border-0 text-[12px] ${r.status === 'MANUAL_ADJUSTED' ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}>
                    <td className="px-3 py-2">{new Date(r.workDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                    <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${attStatusBg[r.status]}`}>{attStatusLabels[r.status]}</span></td>
                    <td className="px-3 py-2 hidden sm:table-cell">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{r.totalWorkMinutes}</td>
                    <td className={`px-3 py-2 hidden md:table-cell ${r.lateMinutes > 0 ? 'text-red-500' : ''}`}>{r.lateMinutes > 0 ? `${r.lateMinutes}p` : '—'}</td>
                    <td className="px-3 py-2">
                      {r.isRemoteWork && <span className="text-[10px] text-orange-500 mr-1">WFH</span>}
                      {r.status === 'MANUAL_ADJUSTED' && <span className="text-[10px] text-orange-600">Đã điều chỉnh</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Tổng hợp phòng ban
// ═══════════════════════════════════════════════════════════════
function SummaryTab({ records }: { records: AttendanceRecord[] }) {
  const [deptFilter, setDeptFilter] = useState('all');
  const [calMonth, setCalMonth] = useState(2); // March (0-indexed)
  const [calYear, setCalYear] = useState(2025);
  const [search, setSearch] = useState('');

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  // Days in month
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthDates = useMemo(() => {
    const dates: { day: number; dateStr: string; dow: number; isWeekend: boolean; isHoliday: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(calYear, calMonth, d);
      const dow = date.getDay();
      dates.push({
        day: d,
        dateStr,
        dow,
        isWeekend: dow === 0 || dow === 6,
        isHoliday: holidays.some(h => h.date === dateStr),
      });
    }
    return dates;
  }, [calYear, calMonth, daysInMonth]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    let list = users.filter(u => u.employmentStatus !== 'TERMINATED' && u.accountStatus === 'ACTIVE');
    if (deptFilter !== 'all') list = list.filter(u => u.departmentId === deptFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.userCode.toLowerCase().includes(s));
    }
    return list.sort((a, b) => a.departmentId.localeCompare(b.departmentId) || a.fullName.localeCompare(b.fullName));
  }, [deptFilter, search]);

  // Build lookup: userId+date → record
  const recordLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach(r => {
      const d = new Date(r.workDate);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        map.set(`${r.userId}_${r.workDate}`, r);
      }
    });
    return map;
  }, [records, calYear, calMonth]);

  // Summary per user
  const userSummaries = useMemo(() => {
    return filteredUsers.map(u => {
      let present = 0, absent = 0, leave = 0, adjusted = 0, totalLate = 0, totalOT = 0, totalWork = 0;
      monthDates.forEach(d => {
        if (d.isWeekend || d.isHoliday) return;
        if (d.dateStr > TODAY) return;
        const rec = recordLookup.get(`${u.id}_${d.dateStr}`);
        if (rec) {
          if (rec.status === 'PRESENT') present++;
          else if (rec.status === 'ABSENT') absent++;
          else if (rec.status === 'LEAVE') leave++;
          else if (rec.status === 'MANUAL_ADJUSTED') adjusted++;
          totalLate += rec.lateMinutes;
          totalOT += rec.overtimeMinutes;
          totalWork += rec.totalWorkMinutes;
        }
      });
      return { user: u, present, absent, leave, adjusted, totalLate, totalOT, totalWork };
    });
  }, [filteredUsers, monthDates, recordLookup]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Mã NV', 'Họ tên', 'Phòng ban', ...monthDates.map(d => String(d.day)), 'Có mặt', 'Vắng', 'Phép', 'Đ.chỉnh', 'Trễ(p)', 'OT(p)'];
    const rows = userSummaries.map(({ user: u, present, absent, leave, adjusted, totalLate, totalOT }) => {
      const dept = getDepartmentById(u.departmentId);
      const dayCells = monthDates.map(d => {
        if (d.isWeekend) return 'T7/CN';
        if (d.isHoliday) return 'LỄ';
        if (d.dateStr > TODAY) return '';
        const rec = recordLookup.get(`${u.id}_${d.dateStr}`);
        if (!rec) return '';
        return rec.status === 'PRESENT' ? 'CM' : rec.status === 'ABSENT' ? 'V' : rec.status === 'LEAVE' ? 'P' : rec.status === 'MANUAL_ADJUSTED' ? 'ĐC' : '';
      });
      return [u.userCode, u.fullName, dept?.name || '', ...dayCells, present, absent, leave, adjusted, totalLate, totalOT];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bang-cham-cong-${monthNames[calMonth]}-${calYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV thành công');
  };

  // Cell abbreviations
  const cellContent = (userId: string, date: typeof monthDates[0]) => {
    if (date.isWeekend) return { text: '', cls: 'bg-gray-50 dark:bg-gray-900/20' };
    if (date.isHoliday) return { text: 'L', cls: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' };
    if (date.dateStr > TODAY) return { text: '', cls: 'bg-muted/20' };
    const rec = recordLookup.get(`${userId}_${date.dateStr}`);
    if (!rec) return { text: '', cls: '' };
    switch (rec.status) {
      case 'PRESENT': return { text: rec.lateMinutes > 0 ? `T${rec.lateMinutes}` : '✓', cls: rec.lateMinutes > 0 ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' };
      case 'ABSENT': return { text: '✗', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' };
      case 'LEAVE': return { text: 'P', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' };
      case 'MANUAL_ADJUSTED': return { text: 'ĐC', cls: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' };
      default: return { text: '', cls: '' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Phòng ban</label>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="all">Tất cả phòng ban</option>
            {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="block text-[11px] text-muted-foreground mb-1">Tìm nhân viên</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Tên hoặc mã NV..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px] w-48" />
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-2 rounded-lg hover:bg-accent"><ChevronLeft size={16} /></button>
          <span className="text-[14px] min-w-[120px] text-center">{monthNames[calMonth]} {calYear}</span>
          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-2 rounded-lg hover:bg-accent"><ChevronRight size={16} /></button>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
          <Download size={14} /> Xuất CSV
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 text-[9px]">✓</span> Có mặt</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 text-[9px]">T5</span> Trễ (phút)</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[9px]">✗</span> Vắng</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[9px]">P</span> Nghỉ phép</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 text-[9px]">ĐC</span> Điều chỉnh</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 text-[9px]">L</span> Ngày lễ</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-900/20 text-[9px]"> </span> Cuối tuần</span>
      </div>

      {/* Big Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[140px] border-r border-border">Nhân viên</th>
                <th className="text-left px-2 py-2 text-[11px] text-muted-foreground sticky left-[140px] bg-muted/50 z-10 min-w-[80px] border-r border-border hidden md:table-cell">Phòng ban</th>
                {monthDates.map(d => (
                  <th key={d.day} className={`px-0 py-2 text-center text-[10px] min-w-[28px] ${d.isWeekend ? 'bg-gray-100 dark:bg-gray-800/50 text-muted-foreground' : d.isHoliday ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                    <div>{d.day}</div>
                    <div className="text-[8px]">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.dow]}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[10px] text-muted-foreground border-l border-border bg-green-50/50 dark:bg-green-900/10">CM</th>
                <th className="px-2 py-2 text-center text-[10px] text-muted-foreground bg-red-50/50 dark:bg-red-900/10">V</th>
                <th className="px-2 py-2 text-center text-[10px] text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10">P</th>
                <th className="px-2 py-2 text-center text-[10px] text-muted-foreground bg-orange-50/50 dark:bg-orange-900/10 hidden sm:table-cell">ĐC</th>
                <th className="px-2 py-2 text-center text-[10px] text-red-500 hidden lg:table-cell">Trễ</th>
                <th className="px-2 py-2 text-center text-[10px] text-blue-500 hidden lg:table-cell">OT</th>
              </tr>
            </thead>
            <tbody>
              {userSummaries.map(({ user: u, present, absent, leave, adjusted, totalLate, totalOT }) => {
                const dept = getDepartmentById(u.departmentId);
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                    <td className="px-3 py-1.5 sticky left-0 bg-card z-10 border-r border-border">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] shrink-0">{u.fullName.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <div className="text-[11px] truncate max-w-[100px]">{u.fullName}</div>
                          <div className="text-[9px] text-muted-foreground">{u.userCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-muted-foreground sticky left-[140px] bg-card z-10 border-r border-border truncate max-w-[80px] hidden md:table-cell">{dept?.name}</td>
                    {monthDates.map(d => {
                      const cell = cellContent(u.id, d);
                      return (
                        <td key={d.day} className={`px-0 py-1.5 text-center text-[10px] ${d.isWeekend ? 'bg-gray-50 dark:bg-gray-900/10' : ''} ${cell.cls}`}>
                          {cell.text}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center text-[11px] border-l border-border bg-green-50/30 dark:bg-green-900/5">{present || ''}</td>
                    <td className={`px-2 py-1.5 text-center text-[11px] bg-red-50/30 dark:bg-red-900/5 ${absent > 0 ? 'text-red-600' : ''}`}>{absent || ''}</td>
                    <td className={`px-2 py-1.5 text-center text-[11px] bg-blue-50/30 dark:bg-blue-900/5 ${leave > 0 ? 'text-blue-600' : ''}`}>{leave || ''}</td>
                    <td className={`px-2 py-1.5 text-center text-[11px] bg-orange-50/30 dark:bg-orange-900/5 hidden sm:table-cell ${adjusted > 0 ? 'text-orange-600' : ''}`}>{adjusted || ''}</td>
                    <td className={`px-2 py-1.5 text-center text-[11px] hidden lg:table-cell ${totalLate > 0 ? 'text-red-500' : ''}`}>{totalLate || ''}</td>
                    <td className={`px-2 py-1.5 text-center text-[11px] hidden lg:table-cell ${totalOT > 0 ? 'text-blue-500' : ''}`}>{totalOT || ''}</td>
                  </tr>
                );
              })}
              {userSummaries.length === 0 && (
                <tr><td colSpan={monthDates.length + 8} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy nhân viên</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border flex justify-between items-center">
          <span>{filteredUsers.length} nhân viên {deptFilter !== 'all' ? `— ${getDepartmentById(deptFilter)?.name}` : ''}</span>
          <span>{monthNames[calMonth]} {calYear}</span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceAdminPage;