import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  attendanceRequests as initialReqs, attendanceRecords, getUserById, getShiftById,
  workShifts, holidays, getActiveWorkShift,
} from '../data/mockData';
import type { AttendanceRequest, AttendanceRequestStatus, AttendanceRecord, AttendanceStatus } from '../data/mockData';
import {
  Check, X, Clock, MapPin, Home, Search, ChevronLeft, ChevronRight,
  LogIn, LogOut, Wifi, CalendarDays, ListChecks, BarChart3, Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Shared constants ───────────────────────────────────────
const reqStatusColors: Record<AttendanceRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const reqStatusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };

const attStatusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-500',
  ABSENT: 'bg-red-500',
  LEAVE: 'bg-blue-500',
  HOLIDAY: 'bg-purple-500',
  MANUAL_ADJUSTED: 'bg-orange-500',
};
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

const TODAY = '2025-03-12';

// ═══════════════════════════════════════════════════════════════
// HR Admin: Attendance Requests Page (existing, kept)
// ═══════════════════════════════════════════════════════════════
export function AttendanceRequestsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<'checkin' | 'checkout' | 'processed'>('checkin');
  const [reqs, setReqs] = useState(initialReqs);
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const isAdminHR = can('ADMIN', 'HR');

  let allReqs = reqs;
  if (search) {
    const s = search.toLowerCase();
    allReqs = allReqs.filter(r => {
      const u = getUserById(r.userId);
      return u?.fullName.toLowerCase().includes(s) || r.note?.toLowerCase().includes(s);
    });
  }
  const pendingCheckins = allReqs.filter(r => r.status === 'PENDING' && r.requestType === 'CHECK_IN');
  const pendingCheckouts = allReqs.filter(r => r.status === 'PENDING' && r.requestType === 'CHECK_OUT');
  const processed = allReqs.filter(r => r.status !== 'PENDING');
  const displayed = tab === 'checkin' ? pendingCheckins : tab === 'checkout' ? pendingCheckouts : processed;

  const approve = (id: string) => {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date().toISOString() } : r));
    toast.success('Đã duyệt yêu cầu chấm công');
  };
  const reject = (id: string) => {
    if (!rejectReason.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' as const, rejectReason, reviewedAt: new Date().toISOString() } : r));
    setRejectDialog(null); setRejectReason('');
    toast.success('Đã từ chối yêu cầu chấm công');
  };
  const approveAll = () => {
    const ids = (tab === 'checkin' ? pendingCheckins : pendingCheckouts).map(r => r.id);
    setReqs(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date().toISOString() } : r));
    toast.success(`Đã duyệt tất cả ${ids.length} yêu cầu`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Yêu cầu chấm công</h1>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Tìm nhân viên, ghi chú..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
      </div>
      <div className="flex items-center gap-2 border-b border-border">
        {(['checkin', 'checkout', 'processed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[13px] border-b-2 ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'}`}>
            {t === 'checkin' ? `Check-in đang chờ (${pendingCheckins.length})` : t === 'checkout' ? `Check-out đang chờ (${pendingCheckouts.length})` : `Đã xử lý (${processed.length})`}
          </button>
        ))}
      </div>
      {isAdminHR && tab !== 'processed' && displayed.length > 0 && (
        <button onClick={approveAll} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700"><Check size={14} className="inline mr-1" /> Duyệt tất cả ({displayed.length})</button>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Nhân viên</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giờ</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ca</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ghi chú</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              {isAdminHR && tab !== 'processed' && <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Hành động</th>}
            </tr></thead>
            <tbody>
              {displayed.map(r => {
                const u = getUserById(r.userId); const shift = r.shiftId ? getShiftById(r.shiftId) : null;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">{u?.fullName.split(' ').slice(-1)[0][0]}</div><span className="text-[13px]">{u?.fullName}</span></div></td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded ${r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{r.requestType === 'CHECK_IN' ? 'Check-in' : 'Check-out'}</span>{r.isRemoteWork && <span className="ml-1 text-[10px] text-orange-500"><Home size={12} className="inline" /> WFH</span>}</td>
                    <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{shift?.name || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{r.note || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>{r.rejectReason && <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-[120px]">{r.rejectReason}</div>}</td>
                    {isAdminHR && tab !== 'processed' && (
                      <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">
                        <button onClick={() => approve(r.id)} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30"><Check size={14} /></button>
                        <button onClick={() => setRejectDialog(r.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30"><X size={14} /></button>
                      </div></td>
                    )}
                  </tr>
                );
              })}
              {displayed.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không có yêu cầu nào</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{displayed.length} yêu cầu</div>
      </div>
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setRejectDialog(null); setRejectReason(''); }} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-[16px] mb-3">Từ chối yêu cầu</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Lý do từ chối *" className="w-full p-3 rounded-lg border border-border bg-input-background text-[13px] h-24 resize-none" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setRejectDialog(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg border border-border text-[13px]">Huỷ</button>
              <button onClick={() => reject(rejectDialog)} disabled={!rejectReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] disabled:opacity-50">Từ chối</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Employee: My Attendance Page (REBUILT)
// ═══════════════════════════════════════════════════════════════
export function MyAttendancePage() {
  const { currentUser } = useAuth();
  const uid = currentUser?.id || '';

  // State
  const [myReqs, setMyReqs] = useState<AttendanceRequest[]>(initialReqs.filter(r => r.userId === uid));
  const [activeTab, setActiveTab] = useState<'checkin' | 'history' | 'calendar'>('checkin');
  const [calMonth, setCalMonth] = useState(2); // 0-indexed → March = 2
  const [calYear, setCalYear] = useState(2025);

  // Check-in form state — pre-fill ca mặc định
  const defaultWorkShift = getActiveWorkShift(uid);
  const [selectedShift, setSelectedShift] = useState(defaultWorkShift?.shiftId || 'ws-1');
  const [isRemote, setIsRemote] = useState(false);
  const [note, setNote] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Today's requests
  const todayReqs = myReqs.filter(r => r.workDate === TODAY);
  const hasCheckin = todayReqs.some(r => r.requestType === 'CHECK_IN');
  const hasCheckout = todayReqs.some(r => r.requestType === 'CHECK_OUT');
  const checkinReq = todayReqs.find(r => r.requestType === 'CHECK_IN');
  const checkoutReq = todayReqs.find(r => r.requestType === 'CHECK_OUT');
  const checkinApproved = checkinReq?.status === 'APPROVED';

  // My attendance records
  const myRecords = attendanceRecords.filter(r => r.userId === uid);

  // ─── Send Request ─────────────────────────────────────────
  const sendRequest = (type: 'CHECK_IN' | 'CHECK_OUT') => {
    const now = new Date();
    const newReq: AttendanceRequest = {
      id: `ar-my-${Date.now()}`,
      userId: uid,
      reviewerId: null,
      requestType: type,
      requestedAt: now.toISOString(),
      workDate: TODAY,
      shiftId: selectedShift,
      isRemoteWork: isRemote,
      note: note || (type === 'CHECK_IN' ? 'Check-in' : 'Check-out'),
      status: 'PENDING',
    };
    setMyReqs(prev => [...prev, newReq]);
    setNote('');
    toast.success(`Đã gửi yêu cầu ${type === 'CHECK_IN' ? 'check-in' : 'check-out'} lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`);
  };

  // ─── Calendar Data ────────────────────────────────────────
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon-based offset
    const holidayDates = new Set(holidays.filter(h => {
      const hd = new Date(h.date);
      return hd.getMonth() === calMonth && hd.getFullYear() === calYear;
    }).map(h => h.date));

    const days: { day: number; dateStr: string; isWeekend: boolean; isHoliday: boolean; holidayName?: string; record?: AttendanceRecord; isFuture: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(calYear, calMonth, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = holidayDates.has(dateStr);
      const holiday = isHoliday ? holidays.find(h => h.date === dateStr) : undefined;
      const record = myRecords.find(r => r.workDate === dateStr);
      const isFuture = dateStr > TODAY;
      days.push({ day: d, dateStr, isWeekend, isHoliday, holidayName: holiday?.name, record, isFuture });
    }
    return { days, offset, daysInMonth };
  }, [calYear, calMonth, uid, myRecords]);

  // ─── Stats ────────────────────────────────────────────────
  const monthRecords = myRecords.filter(r => {
    const d = new Date(r.workDate);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });
  const stats = {
    present: monthRecords.filter(r => r.status === 'PRESENT').length,
    absent: monthRecords.filter(r => r.status === 'ABSENT').length,
    leave: monthRecords.filter(r => r.status === 'LEAVE').length,
    adjusted: monthRecords.filter(r => r.status === 'MANUAL_ADJUSTED').length,
    totalLate: monthRecords.reduce((s, r) => s + r.lateMinutes, 0),
    totalOT: monthRecords.reduce((s, r) => s + r.overtimeMinutes, 0),
  };

  const selectedDayRecord = selectedDay ? myRecords.find(r => r.workDate === selectedDay) : null;
  const selectedDayReqs = selectedDay ? myReqs.filter(r => r.workDate === selectedDay) : [];

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Chấm công của tôi</h1>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {[
          { key: 'checkin', label: 'Check-in / Check-out', icon: <MapPin size={14} /> },
          { key: 'history', label: 'Lịch sử yêu cầu', icon: <ListChecks size={14} /> },
          { key: 'calendar', label: 'Bảng chấm công tháng', icon: <CalendarDays size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)} className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ CHECK-IN / CHECK-OUT TAB ═══ */}
      {activeTab === 'checkin' && (
        <div className="space-y-4">
          {/* Today Status Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px]">Hôm nay — {new Date(TODAY).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Ca: {getShiftById(selectedShift)?.name} ({getShiftById(selectedShift)?.startTime} — {getShiftById(selectedShift)?.endTime})</p>
              </div>
              <div className="flex items-center gap-2">
                {hasCheckin && checkinApproved && <span className="text-[11px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓ Đã check-in</span>}
                {hasCheckout && <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✓ Đã gửi check-out</span>}
              </div>
            </div>

            {/* Timeline */}
            {todayReqs.length > 0 && (
              <div className="mb-4 space-y-2">
                {todayReqs.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                      {r.requestType === 'CHECK_IN' ? <LogIn size={14} /> : <LogOut size={14} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px]">{r.requestType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} — {new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {r.isRemoteWork && <span className="flex items-center gap-0.5"><Wifi size={10} /> WFH</span>}
                        {r.note && <span>{r.note}</span>}
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Options */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Ca làm việc</label>
                  <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
                    {workShifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {defaultWorkShift ? (() => { const si = getShiftById(defaultWorkShift.shiftId); return `Ca mặc định của bạn: ${si?.name} (${si?.startTime} – ${si?.endTime})`; })() : 'Bạn chưa có ca mặc định. Vui lòng chọn ca.'}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Ghi chú</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Vào trễ do tắc đường..." className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] w-60" />
                </div>
                <button onClick={() => setIsRemote(p => !p)} className={`px-3 py-2 rounded-lg text-[12px] flex items-center gap-1 border ${isRemote ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                  <Home size={14} /> {isRemote ? 'WFH: Bật' : 'WFH: Tắt'}
                </button>
              </div>

              {/* Big Buttons */}
              <div className="flex gap-3 flex-wrap">
                {!hasCheckin ? (
                  <button onClick={() => sendRequest('CHECK_IN')} className="px-8 py-4 bg-green-600 text-white rounded-xl text-[15px] hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02]">
                    <LogIn size={20} /> Gửi yêu cầu Check-in
                  </button>
                ) : !hasCheckout ? (
                  <button onClick={() => sendRequest('CHECK_OUT')} className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[15px] hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]">
                    <LogOut size={20} /> Gửi yêu cầu Check-out
                  </button>
                ) : (
                  <div className="px-8 py-4 bg-muted rounded-xl text-[15px] text-muted-foreground flex items-center gap-2">
                    <Check size={20} /> Đã hoàn tất chấm công hôm nay
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Ngày</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Loại</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giờ gửi</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ca</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ghi chú</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              </tr></thead>
              <tbody>
                {[...myReqs].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).map(r => {
                  const shift = r.shiftId ? getShiftById(r.shiftId) : null;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-[13px]">{new Date(r.workDate).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded ${r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {r.requestType === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                        </span>
                        {r.isRemoteWork && <span className="ml-1 text-[10px] text-orange-500"><Home size={10} className="inline" /> WFH</span>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">{new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{shift?.name || '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{r.note || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                        {r.rejectReason && <div className="text-[10px] text-red-500 mt-0.5">{r.rejectReason}</div>}
                      </td>
                    </tr>
                  );
                })}
                {myReqs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-[13px]">Bạn chưa có yêu cầu chấm công nào</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{myReqs.length} yêu cầu</div>
        </div>
      )}

      {/* ═══ CALENDAR TAB ═══ */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Month Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MiniStat label="Có mặt" value={stats.present} color="green" />
            <MiniStat label="Vắng mặt" value={stats.absent} color="red" />
            <MiniStat label="Nghỉ phép" value={stats.leave} color="blue" />
            <MiniStat label="Điều chỉnh" value={stats.adjusted} color="orange" />
            <MiniStat label="Trễ (phút)" value={stats.totalLate} color="yellow" />
            <MiniStat label="OT (phút)" value={stats.totalOT} color="purple" />
          </div>

          {/* Calendar */}
          <div className="bg-card border border-border rounded-xl p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-accent"><ChevronLeft size={18} /></button>
              <h3 className="text-[15px]">{monthNames[calMonth]} {calYear}</h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-accent"><ChevronRight size={18} /></button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3 text-[11px]">
              {Object.entries(attStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${attStatusColors[k as AttendanceStatus]}`} />
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /><span className="text-muted-foreground">Cuối tuần</span></div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <div key={d} className="text-[11px] text-muted-foreground text-center py-1">{d}</div>
              ))}
              {/* Empty offset cells */}
              {Array.from({ length: calendarData.offset }).map((_, i) => <div key={`empty-${i}`} />)}
              {/* Day cells */}
              {calendarData.days.map(d => {
                let cellBg = '';
                let dotColor = '';
                let tooltip = '';

                if (d.isHoliday) {
                  cellBg = 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800';
                  dotColor = 'bg-purple-500';
                  tooltip = d.holidayName || 'Ngày lễ';
                } else if (d.isWeekend) {
                  cellBg = 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
                } else if (d.isFuture) {
                  cellBg = 'border-dashed border-border';
                } else if (d.record) {
                  const s = d.record.status;
                  cellBg = s === 'PRESENT' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                    s === 'ABSENT' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                    s === 'LEAVE' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
                    s === 'MANUAL_ADJUSTED' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : '';
                  dotColor = attStatusColors[s];
                  tooltip = attStatusLabels[s];
                  if (d.record.lateMinutes > 0) tooltip += ` • Trễ ${d.record.lateMinutes}p`;
                  if (d.record.isRemoteWork) tooltip += ' • WFH';
                } else if (!d.isFuture) {
                  cellBg = 'border-border';
                }

                const isSelected = selectedDay === d.dateStr;
                const isToday = d.dateStr === TODAY;

                return (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDay(d.dateStr === selectedDay ? null : d.dateStr)}
                    title={tooltip}
                    className={`relative p-1.5 rounded-lg border text-center transition-all min-h-[52px] flex flex-col items-center justify-center gap-0.5 ${cellBg} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''} ${isToday ? 'ring-1 ring-blue-400' : ''} ${d.isFuture || d.isWeekend ? '' : 'hover:ring-1 hover:ring-blue-300 cursor-pointer'}`}
                  >
                    <span className={`text-[12px] ${isToday ? '' : d.isWeekend ? 'text-muted-foreground' : d.isFuture ? 'text-muted-foreground/50' : ''}`}>{d.day}</span>
                    {dotColor && <div className={`w-2 h-2 rounded-full ${dotColor}`} />}
                    {d.record?.isRemoteWork && <Wifi size={8} className="text-orange-500 absolute top-1 right-1" />}
                    {d.record?.lateMinutes ? <span className="text-[8px] text-red-500 absolute bottom-0.5 right-1">-{d.record.lateMinutes}p</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail */}
          {selectedDay && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-[14px] flex items-center gap-2 mb-3">
                <Info size={14} /> Chi tiết ngày {new Date(selectedDay).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              {selectedDayRecord ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Trạng thái</div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${attStatusBg[selectedDayRecord.status]}`}>{attStatusLabels[selectedDayRecord.status]}</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Check-in</div>
                    <div>{selectedDayRecord.checkInAt ? new Date(selectedDayRecord.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Check-out</div>
                    <div>{selectedDayRecord.checkOutAt ? new Date(selectedDayRecord.checkOutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Làm việc</div>
                    <div>{Math.floor(selectedDayRecord.totalWorkMinutes / 60)}h{selectedDayRecord.totalWorkMinutes % 60 > 0 ? `${selectedDayRecord.totalWorkMinutes % 60}p` : ''}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Trễ</div>
                    <div className={selectedDayRecord.lateMinutes > 0 ? 'text-red-500' : ''}>{selectedDayRecord.lateMinutes > 0 ? `${selectedDayRecord.lateMinutes} phút` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">OT</div>
                    <div className={selectedDayRecord.overtimeMinutes > 0 ? 'text-blue-500' : ''}>{selectedDayRecord.overtimeMinutes > 0 ? `${selectedDayRecord.overtimeMinutes} phút` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Ca</div>
                    <div>{getShiftById(selectedDayRecord.shiftId)?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Làm từ xa</div>
                    <div>{selectedDayRecord.isRemoteWork ? <span className="text-orange-500 flex items-center gap-1"><Wifi size={12} /> WFH</span> : 'Không'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  {calendarData.days.find(dd => dd.dateStr === selectedDay)?.isHoliday
                    ? `Ngày lễ: ${calendarData.days.find(dd => dd.dateStr === selectedDay)?.holidayName}`
                    : calendarData.days.find(dd => dd.dateStr === selectedDay)?.isWeekend
                    ? 'Cuối tuần — không có dữ liệu chấm công'
                    : calendarData.days.find(dd => dd.dateStr === selectedDay)?.isFuture
                    ? 'Ngày trong tương lai'
                    : 'Không có bản ghi chấm công'}
                </p>
              )}
              {selectedDayReqs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[11px] text-muted-foreground mb-2">Yêu cầu chấm công ngày này:</div>
                  {selectedDayReqs.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-[12px] py-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${r.requestType === 'CHECK_IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{r.requestType === 'CHECK_IN' ? 'IN' : 'OUT'}</span>
                      <span>{new Date(r.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                      {r.note && <span className="text-muted-foreground">{r.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };
  return (
    <div className={`rounded-lg border p-2 text-center ${colorMap[color]}`}>
      <div className="text-[18px]">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shifts & Holidays (kept as-is)
// ═══════════════════════════════════════════════════════════════
export function ShiftsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Ca làm việc</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {workShifts.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px]">{s.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{s.shiftType}</span>
            </div>
            <div className="text-[13px] text-muted-foreground">{s.startTime} — {s.endTime}</div>
            <div className="text-[12px] text-muted-foreground mt-1">Nghỉ: {s.breakMinutes} phút | Làm việc: {s.workMinutes} phút</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HolidaysPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[20px]">Ngày lễ 2025</h1>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Ngày lễ</th>
            <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Ngày</th>
            <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Lặp lại</th>
          </tr></thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-[13px]">{h.name}</td>
                <td className="px-4 py-3 text-[13px]">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-3 text-[13px] hidden sm:table-cell">{h.isRecurring ? 'Hàng năm' : 'Không'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
