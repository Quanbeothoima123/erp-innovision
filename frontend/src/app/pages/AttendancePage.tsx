
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  attendanceRequests as mockReqs, attendanceRecords as mockRecords,
  workShifts as mockShifts, holidays as mockHolidays,
  getShiftById, getActiveWorkShift,
} from '../data/mockData';
import type { AttendanceRequest, AttendanceRequestStatus, AttendanceRecord, AttendanceStatus, WorkShift, Holiday } from '../data/mockData';
import {
  Check, X, Home, ChevronLeft, ChevronRight, LogIn, LogOut, Wifi,
  CalendarDays, ListChecks, Info, Plus, Edit2, Trash2, Loader2, AlertCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import * as attendanceService from '../../lib/services/attendance.service';
import { ApiError } from '../../lib/apiClient';

const USE_API = !!import.meta.env.VITE_API_URL;
const TODAY = new Date().toISOString().split('T')[0];

const reqStatusColors: Record<AttendanceRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const reqStatusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const attStatusColors: Record<AttendanceStatus, string> = { PRESENT: 'bg-green-500', ABSENT: 'bg-red-500', LEAVE: 'bg-blue-500', HOLIDAY: 'bg-purple-500', MANUAL_ADJUSTED: 'bg-orange-500' };
const attStatusBg: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LEAVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HOLIDAY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MANUAL_ADJUSTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};
const attStatusLabels: Record<string, string> = { PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', LEAVE: 'Nghỉ phép', HOLIDAY: 'Ngày lễ', MANUAL_ADJUSTED: 'Điều chỉnh' };
const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const fmtTime = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  const c: Record<string, string> = { green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800', red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20', yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20', purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20' };
  return <div className={`rounded-lg border p-2 text-center ${c[color]}`}><div className="text-[18px] font-semibold">{value}</div><div className="text-[10px] opacity-70">{label}</div></div>;
}

// ═══════════════════════════════════════════════════════════════
// MY ATTENDANCE PAGE
// ═══════════════════════════════════════════════════════════════
export function MyAttendancePage() {
  const { currentUser } = useAuth();
  const uid = currentUser?.id ?? '';
  const todayDate = new Date();
  const [activeTab, setActiveTab] = useState<'checkin' | 'history' | 'calendar'>('checkin');
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const defaultShift = !USE_API ? getActiveWorkShift(uid) : null;
  const [selectedShift, setSelectedShift] = useState(defaultShift?.shiftId ?? '');
  const [isRemote, setIsRemote] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [shifts, setShifts] = useState<WorkShift[]>(USE_API ? [] : mockShifts);
  const [myReqs, setMyReqs] = useState<AttendanceRequest[]>(USE_API ? [] : mockReqs.filter(r => r.userId === uid));
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>(USE_API ? [] : mockRecords.filter(r => r.userId === uid));
  const [monthStats, setMonthStats] = useState<attendanceService.MonthlyStats | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(USE_API);

  useEffect(() => {
    if (!USE_API) return;
    attendanceService.getShiftOptions().then(data => {
      setShifts(data as unknown as WorkShift[]);
      if (data.length > 0 && !selectedShift) setSelectedShift(data[0].id);
    }).catch(() => {});
  }, []);

  const fetchMyReqs = useCallback(async () => {
    if (!USE_API) return;
    try {
      const res = await attendanceService.listRequests({ userId: uid, limit: 100 });
      setMyReqs(res.data as unknown as AttendanceRequest[]);
    } catch { /**/ }
  }, [uid]);

  const fetchRecords = useCallback(async () => {
    if (!USE_API) return;
    setLoadingRecords(true);
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const [recordsRes, statsRes] = await Promise.all([
        attendanceService.getMyAttendance({ startDate: `${calYear}-${pad(calMonth + 1)}-01`, endDate: `${calYear}-${pad(calMonth + 1)}-31`, limit: 100 }),
        attendanceService.getMyMonthlyStats(calYear, calMonth + 1),
      ]);
      setMyRecords(recordsRes.data as unknown as AttendanceRecord[]);
      setMonthStats(statsRes);
    } catch { /**/ } finally { setLoadingRecords(false); }
  }, [calYear, calMonth, uid]);

  useEffect(() => { fetchMyReqs(); fetchRecords(); }, [fetchMyReqs, fetchRecords]);

  const sendRequest = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setSending(true);
    const now = new Date();
    try {
      if (USE_API) {
        await attendanceService.createRequest({ type, requestedTime: now.toISOString(), reason: note || undefined });
        await fetchMyReqs();
        toast.success(`Đã gửi yêu cầu ${type === 'CHECK_IN' ? 'check-in' : 'check-out'}`);
      } else {
        setMyReqs(prev => [...prev, { id: `ar-${Date.now()}`, userId: uid, reviewerId: null, requestType: type, requestedAt: now.toISOString(), workDate: TODAY, shiftId: selectedShift, isRemoteWork: isRemote, note: note || type, status: 'PENDING' }]);
        toast.success(`Đã gửi yêu cầu ${type === 'CHECK_IN' ? 'check-in' : 'check-out'}`);
      }
      setNote('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gửi yêu cầu thất bại');
    } finally { setSending(false); }
  };

  const todayReqs = myReqs.filter(r => { const d = r.requestedAt?.split('T')[0]; return d === TODAY || r.workDate === TODAY; });
  const getType = (r: AttendanceRequest) => r.requestType ?? (r as unknown as {type?: string}).type ?? '';
  const hasCheckin = todayReqs.some(r => getType(r) === 'CHECK_IN');
  const hasCheckout = todayReqs.some(r => getType(r) === 'CHECK_OUT');
  const checkinApproved = todayReqs.find(r => getType(r) === 'CHECK_IN')?.status === 'APPROVED';

  const computedStats = useMemo(() => {
    if (USE_API && monthStats) return { present: monthStats.presentDays, absent: monthStats.absentDays, leave: monthStats.leaveDays, adjusted: 0, totalLate: monthStats.totalLateMinutes, totalOT: 0 };
    const recs = mockRecords.filter(r => { const d = new Date(r.workDate); return r.userId === uid && d.getMonth() === calMonth && d.getFullYear() === calYear; });
    return { present: recs.filter(r => r.status === 'PRESENT').length, absent: recs.filter(r => r.status === 'ABSENT').length, leave: recs.filter(r => r.status === 'LEAVE').length, adjusted: recs.filter(r => r.status === 'MANUAL_ADJUSTED').length, totalLate: recs.reduce((s, r) => s + r.lateMinutes, 0), totalOT: recs.reduce((s, r) => s + r.overtimeMinutes, 0) };
  }, [monthStats, calYear, calMonth, uid]);

  const calendarData = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const hDates = new Set(mockHolidays.filter(h => { const d = new Date(h.date); return d.getMonth() === calMonth && d.getFullYear() === calYear; }).map(h => h.date));
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
      const dow = new Date(calYear, calMonth, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = hDates.has(dateStr);
      const holiday = isHoliday ? mockHolidays.find(h => h.date === dateStr) : undefined;
      const record = myRecords.find(r => r.workDate === dateStr);
      days.push({ day: d, dateStr, isWeekend, isHoliday, holidayName: holiday?.name, record, isFuture: dateStr > TODAY });
    }
    return { days, offset };
  }, [calYear, calMonth, myRecords]);

  const selectedDayRecord = selectedDay ? myRecords.find(r => r.workDate === selectedDay) : null;
  const selectedDayReqs = selectedDay ? myReqs.filter(r => r.workDate === selectedDay) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold">Chấm công của tôi</h1>
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {[{ key: 'checkin', label: 'Check-in / Check-out', icon: <Clock size={14} /> }, { key: 'history', label: 'Lịch sử yêu cầu', icon: <ListChecks size={14} /> }, { key: 'calendar', label: 'Bảng chấm công tháng', icon: <CalendarDays size={14} /> }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'checkin' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-[16px] font-medium">Hôm nay — {new Date(TODAY).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
              {selectedShift && <p className="text-[12px] text-muted-foreground mt-0.5">Ca: {shifts.find(s => s.id === selectedShift)?.name ?? selectedShift}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {hasCheckin && checkinApproved && <span className="text-[11px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓ Đã check-in</span>}
              {hasCheckout && <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">✓ Gửi check-out</span>}
            </div>
          </div>
          {todayReqs.length > 0 && (
            <div className="space-y-2">
              {todayReqs.map(r => {
                const rType = getType(r);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rType === 'CHECK_IN' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{rType === 'CHECK_IN' ? <LogIn size={14} /> : <LogOut size={14} />}</div>
                    <div className="flex-1">
                      <div className="text-[13px]">{rType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} — {fmtTime(r.requestedAt)}</div>
                      {r.note && <div className="text-[11px] text-muted-foreground">{r.note}</div>}
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            {shifts.length > 0 && (
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Ca làm việc</label>
                <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({(s as WorkShift).startTime}–{(s as WorkShift).endTime})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Ghi chú</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Vào trễ do tắc đường..." className="px-3 py-2 rounded-lg border border-border bg-background text-[13px] w-52" />
            </div>
            {!USE_API && (
              <button onClick={() => setIsRemote(p => !p)} className={`px-3 py-2 rounded-lg text-[12px] flex items-center gap-1 border transition-colors ${isRemote ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                <Home size={14} /> {isRemote ? 'WFH: Bật' : 'WFH: Tắt'}
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {!hasCheckin ? (
              <button onClick={() => sendRequest('CHECK_IN')} disabled={sending} className="px-8 py-4 bg-green-600 text-white rounded-xl text-[15px] hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] disabled:opacity-50">
                {sending ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />} Gửi yêu cầu Check-in
              </button>
            ) : !hasCheckout ? (
              <button onClick={() => sendRequest('CHECK_OUT')} disabled={sending} className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[15px] hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] disabled:opacity-50">
                {sending ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />} Gửi yêu cầu Check-out
              </button>
            ) : (
              <div className="px-8 py-4 bg-muted rounded-xl text-[15px] text-muted-foreground flex items-center gap-2"><Check size={20} /> Đã hoàn tất chấm công hôm nay</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium">Ngày</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium">Loại</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium hidden sm:table-cell">Giờ gửi</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium hidden md:table-cell">Ghi chú</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium">Trạng thái</th>
              </tr></thead>
              <tbody>
                {[...myReqs].sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? '')).map(r => {
                  const rType = getType(r);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-3 text-[13px]">{fmtDate(r.workDate)}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded ${rType === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{rType === 'CHECK_IN' ? 'Check-in' : 'Check-out'}</span></td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">{fmtTime(r.requestedAt)}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{r.note || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span></td>
                    </tr>
                  );
                })}
                {myReqs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-[13px]">Bạn chưa có yêu cầu chấm công nào</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{myReqs.length} yêu cầu</div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MiniStat label="Có mặt" value={computedStats.present} color="green" />
            <MiniStat label="Vắng mặt" value={computedStats.absent} color="red" />
            <MiniStat label="Nghỉ phép" value={computedStats.leave} color="blue" />
            <MiniStat label="Điều chỉnh" value={computedStats.adjusted} color="orange" />
            <MiniStat label="Trễ (phút)" value={computedStats.totalLate} color="yellow" />
            <MiniStat label="OT (phút)" value={computedStats.totalOT} color="purple" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-accent"><ChevronLeft size={18} /></button>
              <h3 className="text-[15px] font-medium">{monthNames[calMonth]} {calYear}</h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-accent"><ChevronRight size={18} /></button>
            </div>
            <div className="flex flex-wrap gap-3 mb-3 text-[11px]">
              {Object.entries(attStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-sm ${attStatusColors[k as AttendanceStatus]}`} /><span className="text-muted-foreground">{v}</span></div>
              ))}
            </div>
            {loadingRecords ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2"><Loader2 size={18} className="animate-spin" /><span className="text-[13px]">Đang tải...</span></div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="text-[11px] text-muted-foreground text-center py-1">{d}</div>)}
                {Array.from({ length: calendarData.offset }).map((_, i) => <div key={`e-${i}`} />)}
                {calendarData.days.map(d => {
                  let cellBg = 'border-border'; let dotColor = '';
                  if (d.isHoliday) { cellBg = 'bg-purple-50 dark:bg-purple-900/10 border-purple-200'; dotColor = 'bg-purple-500'; }
                  else if (d.isWeekend) { cellBg = 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'; }
                  else if (d.isFuture) { cellBg = 'border-dashed border-border'; }
                  else if (d.record) {
                    const s = d.record.status;
                    const map: Record<string, string> = { PRESENT: 'bg-green-50 dark:bg-green-900/10 border-green-200', ABSENT: 'bg-red-50 dark:bg-red-900/10 border-red-200', LEAVE: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200', MANUAL_ADJUSTED: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200' };
                    cellBg = map[s] ?? ''; dotColor = attStatusColors[s as AttendanceStatus];
                  }
                  const isSelected = selectedDay === d.dateStr; const isToday = d.dateStr === TODAY;
                  return (
                    <button key={d.day} onClick={() => setSelectedDay(d.dateStr === selectedDay ? null : d.dateStr)}
                      className={`relative p-1.5 rounded-lg border text-center min-h-[52px] flex flex-col items-center justify-center gap-0.5 transition-all ${cellBg} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${isToday ? 'ring-1 ring-blue-400' : ''} hover:ring-1 hover:ring-blue-300`}>
                      <span className={`text-[12px] ${d.isWeekend || d.isFuture ? 'text-muted-foreground' : ''}`}>{d.day}</span>
                      {dotColor && <div className={`w-2 h-2 rounded-full ${dotColor}`} />}
                      {d.record?.lateMinutes ? <span className="text-[8px] text-red-500 absolute bottom-0.5 right-1">-{d.record.lateMinutes}p</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {selectedDay && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-[14px] font-medium flex items-center gap-2 mb-3"><Info size={14} /> Chi tiết ngày {new Date(selectedDay).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
              {selectedDayRecord ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Trạng thái</div><span className={`text-[11px] px-2 py-0.5 rounded-full ${attStatusBg[selectedDayRecord.status as AttendanceStatus]}`}>{attStatusLabels[selectedDayRecord.status]}</span></div>
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Check-in</div><div>{fmtTime(selectedDayRecord.checkInAt)}</div></div>
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Check-out</div><div>{fmtTime(selectedDayRecord.checkOutAt)}</div></div>
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Làm việc</div><div>{Math.floor(selectedDayRecord.totalWorkMinutes / 60)}h{selectedDayRecord.totalWorkMinutes % 60 > 0 ? `${selectedDayRecord.totalWorkMinutes % 60}p` : ''}</div></div>
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Trễ</div><div className={selectedDayRecord.lateMinutes > 0 ? 'text-red-500' : ''}>{selectedDayRecord.lateMinutes > 0 ? `${selectedDayRecord.lateMinutes} phút` : '—'}</div></div>
                  <div><div className="text-[11px] text-muted-foreground mb-0.5">Ca</div><div>{getShiftById(selectedDayRecord.shiftId)?.name ?? '—'}</div></div>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">{calendarData.days.find(dd => dd.dateStr === selectedDay)?.isHoliday ? `Ngày lễ: ${calendarData.days.find(dd => dd.dateStr === selectedDay)?.holidayName}` : calendarData.days.find(dd => dd.dateStr === selectedDay)?.isWeekend ? 'Cuối tuần' : calendarData.days.find(dd => dd.dateStr === selectedDay)?.isFuture ? 'Ngày tương lai' : 'Không có bản ghi'}</p>
              )}
              {selectedDayReqs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[11px] text-muted-foreground mb-2">Yêu cầu ngày này:</div>
                  {selectedDayReqs.map(r => {
                    const rType = getType(r);
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-[12px] py-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${rType === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{rType === 'CHECK_IN' ? 'IN' : 'OUT'}</span>
                        <span>{fmtTime(r.requestedAt)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${reqStatusColors[r.status]}`}>{reqStatusLabels[r.status]}</span>
                        {r.note && <span className="text-muted-foreground">{r.note}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHIFTS PAGE
// ═══════════════════════════════════════════════════════════════
export function ShiftsPage() {
  const { can } = useAuth();
  const isAdminHR = can('ADMIN', 'HR');
  const [shifts, setShifts] = useState<WorkShift[]>(USE_API ? [] : mockShifts);
  const [loading, setLoading] = useState(USE_API);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState<WorkShift | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', shiftType: 'MORNING', startTime: '08:00', endTime: '17:00', breakMinutes: 60, isActive: true, description: '' });
  const shiftTypeMap: Record<string, string> = { MORNING: 'Sáng', AFTERNOON: 'Chiều', NIGHT: 'Tối', FLEXIBLE: 'Linh hoạt', SPLIT: 'Chia ca' };
  const shiftColors: Record<string, string> = { MORNING: 'bg-yellow-100 text-yellow-700', AFTERNOON: 'bg-orange-100 text-orange-700', NIGHT: 'bg-indigo-100 text-indigo-700', FLEXIBLE: 'bg-green-100 text-green-700', SPLIT: 'bg-purple-100 text-purple-700' };

  const fetchShifts = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true); setError(null);
    try { const res = await attendanceService.listShifts({ limit: 50 }); setShifts(res.data as unknown as WorkShift[]); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Lỗi tải ca'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const openCreate = () => { setEditShift(null); setForm({ name: '', code: '', shiftType: 'MORNING', startTime: '08:00', endTime: '17:00', breakMinutes: 60, isActive: true, description: '' }); setShowForm(true); };
  const openEdit = (s: WorkShift) => { setEditShift(s); setForm({ name: s.name, code: s.code, shiftType: s.shiftType, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes, isActive: s.isActive, description: (s as unknown as {description?: string}).description ?? '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Nhập tên và mã ca'); return; }
    setSaving(true);
    try {
      if (USE_API) {
        if (editShift) { await attendanceService.updateShift(editShift.id, form); toast.success('Đã cập nhật ca'); }
        else { await attendanceService.createShift(form); toast.success('Đã tạo ca'); }
        fetchShifts();
      } else {
        if (editShift) setShifts(prev => prev.map(s => s.id === editShift.id ? { ...s, ...form } : s));
        else setShifts(prev => [...prev, { id: `ws-${Date.now()}`, workMinutes: 0, ...form } as WorkShift]);
        toast.success(editShift ? 'Đã cập nhật' : 'Đã tạo');
      }
      setShowForm(false); setEditShift(null);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi lưu'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Ca làm việc</h1>
        {isAdminHR && <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700"><Plus size={16} /> Thêm ca</button>}
      </div>
      {loading && <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground"><Loader2 size={18} className="animate-spin" /><span className="text-[13px]">Đang tải...</span></div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-600 text-[13px]"><AlertCircle size={16} />{error}<button onClick={fetchShifts} className="ml-auto text-[12px] underline">Thử lại</button></div>}
      {!loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shifts.map(s => (
            <div key={s.id} className={`bg-card border border-border rounded-xl p-4 ${!s.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${shiftColors[s.shiftType] ?? 'bg-gray-100 text-gray-700'}`}>{shiftTypeMap[s.shiftType] ?? s.shiftType}</span>
                  {isAdminHR && <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={13} /></button>}
                </div>
              </div>
              <div className="text-[14px] font-mono text-blue-600">{s.startTime} — {s.endTime}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground"><span>Nghỉ: {s.breakMinutes}p</span><span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{s.code}</span></div>
            </div>
          ))}
          {shifts.length === 0 && <div className="col-span-full text-center py-10 text-muted-foreground text-[13px]">Chưa có ca làm việc nào</div>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) setShowForm(false); }} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-[16px] font-medium">{editShift ? 'Cập nhật ca' : 'Thêm ca mới'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] text-muted-foreground mb-1">Mã ca *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MORNING" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
                <div><label className="block text-[12px] text-muted-foreground mb-1">Tên ca *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ca sáng" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
              </div>
              <div><label className="block text-[12px] text-muted-foreground mb-1">Loại ca</label>
                <select value={form.shiftType} onChange={e => setForm(f => ({ ...f, shiftType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]">
                  {Object.entries(shiftTypeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] text-muted-foreground mb-1">Bắt đầu</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
                <div><label className="block text-[12px] text-muted-foreground mb-1">Kết thúc</label><input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
                <div><label className="block text-[12px] text-muted-foreground mb-1">Nghỉ (phút)</label><input type="number" value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent disabled:opacity-50">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}{editShift ? 'Cập nhật' : 'Tạo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOLIDAYS PAGE
// ═══════════════════════════════════════════════════════════════
export function HolidaysPage() {
  const { can } = useAuth();
  const isAdminHR = can('ADMIN', 'HR');
  const [holidays, setHolidays] = useState<Holiday[]>(USE_API ? [] : mockHolidays);
  const [loading, setLoading] = useState(USE_API);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: false, description: '' });

  const fetchHolidays = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true); setError(null);
    try { const res = await attendanceService.listHolidays({ year: new Date().getFullYear(), limit: 50 }); setHolidays(res.data as unknown as Holiday[]); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Lỗi tải ngày lễ'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const openCreate = () => { setEditHoliday(null); setForm({ name: '', date: '', isRecurring: false, description: '' }); setShowForm(true); };
  const openEdit = (h: Holiday) => { setEditHoliday(h); setForm({ name: h.name, date: h.date, isRecurring: h.isRecurring, description: h.description ?? '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.date) { toast.error('Nhập tên và ngày'); return; }
    setSaving(true);
    try {
      if (USE_API) {
        if (editHoliday) { await attendanceService.updateHoliday(editHoliday.id, form); } else { await attendanceService.createHoliday(form); }
        toast.success(editHoliday ? 'Đã cập nhật' : 'Đã thêm ngày lễ'); fetchHolidays();
      } else {
        if (editHoliday) setHolidays(prev => prev.map(h => h.id === editHoliday.id ? { ...h, ...form } : h));
        else setHolidays(prev => [...prev, { id: `hd-${Date.now()}`, ...form }]);
        toast.success(editHoliday ? 'Đã cập nhật' : 'Đã thêm');
      }
      setShowForm(false); setEditHoliday(null);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi lưu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (USE_API) { try { await attendanceService.deleteHoliday(id); toast.success('Đã xoá'); fetchHolidays(); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Lỗi xoá'); } }
    else { setHolidays(prev => prev.filter(h => h.id !== id)); toast.success('Đã xoá'); }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Ngày lễ</h1>
        {isAdminHR && <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700"><Plus size={16} /> Thêm ngày lễ</button>}
      </div>
      {loading && <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground"><Loader2 size={18} className="animate-spin" /><span className="text-[13px]">Đang tải...</span></div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-600 text-[13px]"><AlertCircle size={16} />{error}<button onClick={fetchHolidays} className="ml-auto text-[12px] underline">Thử lại</button></div>}
      {!loading && !error && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium">Tên ngày lễ</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium">Ngày</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium hidden sm:table-cell">Lặp lại</th>
              <th className="text-left px-4 py-3 text-[12px] text-muted-foreground font-medium hidden md:table-cell">Mô tả</th>
              {isAdminHR && <th className="text-center px-4 py-3 text-[12px] text-muted-foreground font-medium">Thao tác</th>}
            </tr></thead>
            <tbody>
              {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                <tr key={h.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3 text-[13px] font-medium">{h.name}</td>
                  <td className="px-4 py-3 text-[13px] font-mono text-blue-600">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className={`text-[11px] px-2 py-0.5 rounded-full ${h.isRecurring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{h.isRecurring ? 'Hàng năm' : 'Một lần'}</span></td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{h.description || '—'}</td>
                  {isAdminHR && (
                    <td className="px-4 py-3"><div className="flex justify-center gap-1">
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteConfirm(h.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={13} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
              {holidays.length === 0 && <tr><td colSpan={isAdminHR ? 5 : 4} className="text-center py-10 text-muted-foreground text-[13px]">Chưa có ngày lễ nào</td></tr>}
            </tbody>
          </table>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{holidays.length} ngày lễ</div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) setShowForm(false); }} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-[16px] font-medium">{editHoliday ? 'Cập nhật ngày lễ' : 'Thêm ngày lễ'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="block text-[12px] text-muted-foreground mb-1">Tên *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tết Nguyên Đán" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
              <div><label className="block text-[12px] text-muted-foreground mb-1">Ngày *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
              <div><label className="block text-[12px] text-muted-foreground mb-1">Mô tả</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]" /></div>
              <div className="flex items-center gap-2"><label className="text-[12px] text-muted-foreground">Lặp lại hàng năm:</label>
                <button onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))} className={`px-3 py-1 rounded-lg text-[12px] border transition-colors ${form.isRecurring ? 'border-green-500 bg-green-50 text-green-700' : 'border-border text-muted-foreground hover:bg-accent'}`}>{form.isRecurring ? 'Có' : 'Không'}</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent disabled:opacity-50">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}{editHoliday ? 'Cập nhật' : 'Thêm'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-red-100 dark:bg-red-900/20"><Trash2 size={28} className="text-red-500" /></div>
            <h3 className="text-[16px] font-medium">Xoá ngày lễ này?</h3>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700">Xoá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
