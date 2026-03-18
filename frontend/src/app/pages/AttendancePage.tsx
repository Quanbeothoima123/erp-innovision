// ================================================================
// ATTENDANCE PAGE — Module 4 (API-integrated + type-fixed)
// Fixes:
//   - requestType vs type field mismatch
//   - requestedAt vs requestedTime mismatch
//   - overtimeMinutes removed (not in API response)
//   - Proper API/mock switching
// ================================================================
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  attendanceRequests as mockReqs,
  attendanceRecords as mockRecords,
  workShifts as mockShifts,
  holidays as mockHolidays,
} from "../data/mockData";
import { Link } from "react-router";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  CalendarDays,
  ListChecks,
  Plus,
  Loader2,
  Clock,
  AlertCircle,
  Users,
  Building2,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as attendanceService from "../../lib/services/attendance.service";
import type {
  ApiAttendanceRequest,
  ApiAttendanceRecord,
  ApiWorkShift,
  MonthlyStats,
  ShiftMember,
} from "../../lib/services/attendance.service";
import { ApiError } from "../../lib/apiClient";

const USE_API = !!import.meta.env.VITE_API_URL;
const TODAY = new Date().toISOString().split("T")[0];

const reqStatusColors: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const reqStatusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
const attStatusBg: Record<string, string> = {
  PRESENT:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ABSENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  HOLIDAY:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANUAL_ADJUSTED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};
const attStatusLabels: Record<string, string> = {
  PRESENT: "Có mặt",
  ABSENT: "Vắng mặt",
  LEAVE: "Nghỉ phép",
  HOLIDAY: "Ngày lễ",
  MANUAL_ADJUSTED: "Điều chỉnh",
};
const monthNames = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper to get request type — handles both API (type) and mock (requestType)
function getReqType(r: unknown): string {
  const obj = r as Record<string, unknown>;
  return (obj.type ?? obj.requestType ?? "") as string;
}
// Helper to get requested time — handles both API (requestedTime) and mock (requestedAt)
function getReqTime(r: unknown): string {
  const obj = r as Record<string, unknown>;
  return (obj.requestedTime ?? obj.requestedAt ?? "") as string;
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const c: Record<string, string> = {
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    orange:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20",
    yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20",
    purple:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20",
  };
  return (
    <div className={`rounded-lg border p-2 text-center ${c[color] ?? ""}`}>
      <div className="text-[18px] font-semibold">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
    </div>
  );
}

// ================================================================
// MY ATTENDANCE PAGE
// ================================================================
export function MyAttendancePage() {
  const { currentUser } = useAuth();
  const uid = currentUser?.id ?? "";
  const todayDate = new Date();
  const [activeTab, setActiveTab] = useState<
    "checkin" | "history" | "calendar"
  >("checkin");
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  // API-aware state
  const [shifts, setShifts] = useState<ApiWorkShift[]>([]);
  const [selectedShift, setSelectedShift] = useState("");
  const [myReqs, setMyReqs] = useState<ApiAttendanceRequest[]>([]);
  const [myRecords, setMyRecords] = useState<ApiAttendanceRecord[]>([]);
  const [monthStats, setMonthStats] = useState<MonthlyStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load shifts
  useEffect(() => {
    if (USE_API) {
      attendanceService
        .getShiftOptions()
        .then((data) => {
          setShifts(data);
          if (data.length > 0) setSelectedShift(data[0].id);
        })
        .catch(() => {});
    } else {
      const s = mockShifts as unknown as ApiWorkShift[];
      setShifts(s);
      if (s.length > 0) setSelectedShift(s[0].id);
    }
  }, []);

  const fetchMyData = useCallback(async () => {
    setLoadingData(true);
    try {
      const pad = (n: number) => String(n).padStart(2, "0");
      if (USE_API) {
        const [reqsRes, recsRes, statsRes] = await Promise.all([
          attendanceService.listRequests({ userId: uid, limit: 50 }),
          attendanceService.getMyAttendance({
            fromDate: `${calYear}-${pad(calMonth + 1)}-01`,
            toDate: `${calYear}-${pad(calMonth + 1)}-31`,
            limit: 100,
          }),
          attendanceService.getMyMonthlyStats(calYear, calMonth + 1),
        ]);
        setMyReqs(reqsRes.items ?? []);
        setMyRecords(recsRes.items ?? []);
        setMonthStats(statsRes);
      } else {
        setMyReqs(
          mockReqs.filter(
            (r) => r.userId === uid,
          ) as unknown as ApiAttendanceRequest[],
        );
        setMyRecords(
          mockRecords.filter(
            (r) =>
              r.userId === uid &&
              (() => {
                const d = new Date(r.workDate);
                return d.getMonth() === calMonth && d.getFullYear() === calYear;
              })(),
          ) as unknown as ApiAttendanceRecord[],
        );
      }
    } catch {
      /**/
    } finally {
      setLoadingData(false);
    }
  }, [uid, calYear, calMonth]);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  const sendRequest = async (type: "CHECK_IN" | "CHECK_OUT") => {
    setSending(true);
    const now = new Date();
    try {
      if (USE_API) {
        await attendanceService.createRequest({
          type,
          requestedTime: now.toISOString(),
          reason: note || undefined,
        });
        await fetchMyData();
      } else {
        const newReq = {
          id: `ar-${Date.now()}`,
          userId: uid,
          type,
          status: "PENDING" as const,
          requestedTime: now.toISOString(),
          reason: note || null,
          reviewedAt: null,
          reviewNote: null,
          reviewedBy: null,
          createdAt: now.toISOString(),
        };
        setMyReqs((prev) => [...prev, newReq]);
      }
      toast.success(
        `Đã gửi yêu cầu ${type === "CHECK_IN" ? "check-in" : "check-out"}`,
      );
      setNote("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Gửi yêu cầu thất bại",
      );
    } finally {
      setSending(false);
    }
  };

  // Today requests
  const todayReqs = myReqs.filter((r) => {
    const t = getReqTime(r);
    return t.startsWith(TODAY);
  });
  const hasCheckin = todayReqs.some((r) => getReqType(r) === "CHECK_IN");
  const hasCheckout = todayReqs.some((r) => getReqType(r) === "CHECK_OUT");

  // Stats
  const stats = useMemo(() => {
    if (USE_API && monthStats) {
      return {
        present: monthStats.presentDays,
        absent: monthStats.absentDays,
        leave: monthStats.leaveDays,
        adjusted: 0,
        totalLate: monthStats.totalLateMinutes,
      };
    }
    const recs = myRecords;
    return {
      present: recs.filter((r) => r.status === "PRESENT").length,
      absent: recs.filter((r) => r.status === "ABSENT").length,
      leave: recs.filter((r) => r.status === "LEAVE").length,
      adjusted: recs.filter((r) => r.status === "MANUAL_ADJUSTED").length,
      totalLate: recs.reduce((s, r) => s + (r.lateMinutes ?? 0), 0),
    };
  }, [monthStats, myRecords]);

  // Calendar
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const hDates = new Set(
      (mockHolidays as { date: string; name: string }[])
        .filter((h) => {
          const d = new Date(h.date);
          return d.getMonth() === calMonth && d.getFullYear() === calYear;
        })
        .map((h) => h.date),
    );

    const days = [];
    const pad = (n: number) => String(n).padStart(2, "0");
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
      const dow = new Date(calYear, calMonth, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = hDates.has(dateStr);
      const record = myRecords.find((r) => r.workDate === dateStr);
      days.push({
        day: d,
        dateStr,
        isWeekend,
        isHoliday,
        record,
        isFuture: dateStr > TODAY,
      });
    }
    return { days, offset };
  }, [calYear, calMonth, myRecords]);

  const selectedDayRecord = selectedDay
    ? myRecords.find((r) => r.workDate === selectedDay)
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold">Chấm công của tôi</h1>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {[
          {
            key: "checkin",
            label: "Check-in / Check-out",
            icon: <Clock size={14} />,
          },
          {
            key: "history",
            label: "Lịch sử yêu cầu",
            icon: <ListChecks size={14} />,
          },
          {
            key: "calendar",
            label: "Bảng chấm công tháng",
            icon: <CalendarDays size={14} />,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-3 py-2.5 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: CHECK-IN */}
      {activeTab === "checkin" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-[16px] font-medium">
              Hôm nay —{" "}
              {new Date(TODAY).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {hasCheckin && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  ✓ Đã gửi check-in
                </span>
              )}
              {hasCheckout && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  ✓ Đã gửi check-out
                </span>
              )}
            </div>
          </div>

          {/* Today's requests summary */}
          {todayReqs.length > 0 && (
            <div className="space-y-2">
              {todayReqs.map((r) => {
                const rType = getReqType(r);
                const rTime = getReqTime(r);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rType === "CHECK_IN" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {rType === "CHECK_IN" ? (
                        <LogIn size={14} />
                      ) : (
                        <LogOut size={14} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px]">
                        {rType === "CHECK_IN" ? "Check-in" : "Check-out"} —{" "}
                        {fmtTime(rTime)}
                      </div>
                      {r.reason && (
                        <div className="text-[11px] text-muted-foreground">
                          {r.reason}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status] ?? ""}`}
                    >
                      {reqStatusLabels[r.status] ?? r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ca làm */}
          {shifts.length > 0 && (
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Ca làm việc
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Ghi chú (tuỳ chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Làm việc remote..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => sendRequest("CHECK_IN")}
              disabled={sending || hasCheckin}
              className="flex-1 min-w-[140px] py-3 bg-emerald-600 text-white rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              Gửi Check-in
            </button>
            <button
              onClick={() => sendRequest("CHECK_OUT")}
              disabled={sending || hasCheckout}
              className="flex-1 min-w-[140px] py-3 bg-blue-600 text-white rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={18} />
              )}
              Gửi Check-out
            </button>
          </div>
        </div>
      )}

      {/* Tab: HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {loadingData ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Đang tải...</span>
            </div>
          ) : myReqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ListChecks size={28} className="opacity-20 mb-2" />
              <p className="text-[13px]">Chưa có yêu cầu chấm công nào</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[100px_120px_1fr_100px_100px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Loại</span>
                <span>Thời gian</span>
                <span>Ghi chú</span>
                <span>Ngày</span>
                <span>Trạng thái</span>
              </div>
              <div className="divide-y divide-border">
                {[...myReqs].reverse().map((r) => {
                  const rType = getReqType(r);
                  const rTime = getReqTime(r);
                  return (
                    <div
                      key={r.id}
                      className="grid sm:grid-cols-[100px_120px_1fr_100px_100px] gap-3 px-4 py-3 items-center"
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[12px] ${rType === "CHECK_IN" ? "text-emerald-600" : "text-blue-600"}`}
                      >
                        {rType === "CHECK_IN" ? (
                          <LogIn size={13} />
                        ) : (
                          <LogOut size={13} />
                        )}
                        {rType === "CHECK_IN" ? "Check-in" : "Check-out"}
                      </div>
                      <div className="text-[12px]">{fmtTime(rTime)}</div>
                      <div className="text-[12px] text-muted-foreground">
                        {r.reason || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {rTime
                          ? new Date(rTime).toLocaleDateString("vi-VN")
                          : "—"}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${reqStatusColors[r.status] ?? ""}`}
                      >
                        {reqStatusLabels[r.status] ?? r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (calMonth === 0) {
                    setCalMonth(11);
                    setCalYear((y) => y - 1);
                  } else setCalMonth((m) => m - 1);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-accent transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[14px] font-medium">
                {monthNames[calMonth]} {calYear}
              </span>
              <button
                onClick={() => {
                  if (calMonth === 11) {
                    setCalMonth(0);
                    setCalYear((y) => y + 1);
                  } else setCalMonth((m) => m + 1);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-accent transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {/* Mini stats */}
            <div className="hidden sm:grid grid-cols-5 gap-2">
              <MiniStat label="Có mặt" value={stats.present} color="green" />
              <MiniStat label="Vắng" value={stats.absent} color="red" />
              <MiniStat label="Nghỉ phép" value={stats.leave} color="blue" />
              <MiniStat
                label="Điều chỉnh"
                value={stats.adjusted}
                color="orange"
              />
              <MiniStat
                label="Phút trễ"
                value={stats.totalLate}
                color="yellow"
              />
            </div>
          </div>

          {/* Calendar grid */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Day of week header */}
            <div className="grid grid-cols-7 border-b border-border">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] text-muted-foreground font-medium"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: calendarData.offset }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="border-b border-r border-border min-h-[60px]"
                />
              ))}
              {calendarData.days.map(
                ({ day, dateStr, isWeekend, isHoliday, record, isFuture }) => {
                  const isToday = dateStr === TODAY;
                  const isSelected = dateStr === selectedDay;
                  return (
                    <div
                      key={dateStr}
                      onClick={() =>
                        setSelectedDay(isSelected ? null : dateStr)
                      }
                      className={`border-b border-r border-border min-h-[60px] p-1.5 cursor-pointer transition ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : isToday ? "bg-blue-50/50 dark:bg-blue-900/10" : isWeekend || isHoliday ? "bg-muted/30" : "hover:bg-muted/30"}`}
                    >
                      <div
                        className={`text-[12px] font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : isWeekend || isHoliday ? "text-muted-foreground" : ""}`}
                      >
                        {day}
                      </div>
                      {record && (
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded ${attStatusBg[record.status] ?? ""}`}
                        >
                          {attStatusLabels[record.status] ?? record.status}
                        </span>
                      )}
                      {isHoliday && !record && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Lễ
                        </span>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && selectedDayRecord && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-[14px] font-medium">
                Chi tiết ngày{" "}
                {new Date(selectedDay).toLocaleDateString("vi-VN")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Trạng thái
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${attStatusBg[selectedDayRecord.status] ?? ""}`}
                  >
                    {attStatusLabels[selectedDayRecord.status]}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Check-in
                  </span>
                  {fmtTime(selectedDayRecord.checkInAt)}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Check-out
                  </span>
                  {fmtTime(selectedDayRecord.checkOutAt)}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Giờ làm
                  </span>
                  {Math.floor((selectedDayRecord.totalWorkMinutes ?? 0) / 60)}h
                  {(selectedDayRecord.totalWorkMinutes ?? 0) % 60}m
                </div>
                {(selectedDayRecord.lateMinutes ?? 0) > 0 && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Phút trễ
                    </span>
                    <span className="text-amber-600">
                      {selectedDayRecord.lateMinutes} phút
                    </span>
                  </div>
                )}
                {selectedDayRecord.note && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">
                      Ghi chú
                    </span>
                    {selectedDayRecord.note}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// SHIFTS PAGE
// ================================================================
export function ShiftsPage() {
  const { can } = useAuth();
  const isAdmin = can("ADMIN", "HR");
  const [shifts, setShifts] = useState<ApiWorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState<ApiWorkShift | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    shiftType: "MORNING",
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: 60,
    isActive: true,
    description: "",
  });
  // Member panel
  const [selectedShift, setSelectedShift] = useState<ApiWorkShift | null>(null);
  const [shiftMembers, setShiftMembers] = useState<ShiftMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_API) {
        const res = await attendanceService.listShifts({ limit: 100 });
        setShifts(res.items);
      } else {
        setShifts(mockShifts as unknown as ApiWorkShift[]);
      }
    } catch {
      toast.error("Không tải được ca làm việc");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error("Vui lòng nhập tên và mã ca");
      return;
    }
    setSaving(true);
    try {
      if (USE_API) {
        if (editShift) {
          const u = await attendanceService.updateShift(editShift.id, form);
          setShifts((prev) => prev.map((s) => (s.id === editShift.id ? u : s)));
        } else {
          const c = await attendanceService.createShift(form);
          setShifts((prev) => [...prev, c]);
        }
      } else {
        if (editShift) {
          setShifts((prev) =>
            prev.map((s) => (s.id === editShift.id ? { ...s, ...form } : s)),
          );
        } else {
          setShifts((prev) => [
            ...prev,
            {
              id: `ws-${Date.now()}`,
              ...form,
              description: form.description || null,
            },
          ]);
        }
      }
      toast.success(
        editShift ? "Đã cập nhật ca làm việc" : "Đã tạo ca làm việc",
      );
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thất bại");
    } finally {
      setSaving(false);
    }
  };

  const openMemberPanel = async (s: ApiWorkShift) => {
    setSelectedShift(s);
    setShiftMembers([]);
    setMembersLoading(true);
    try {
      if (USE_API) {
        const members = await attendanceService.getShiftMembers(s.id);
        setShiftMembers(members);
      }
    } catch {
      toast.error("Khong tai duoc danh sach nhan vien");
    } finally {
      setMembersLoading(false);
    }
  };

  const openCreate = () => {
    setEditShift(null);
    setForm({
      name: "",
      code: "",
      shiftType: "MORNING",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
      isActive: true,
      description: "",
    });
    setShowForm(true);
  };
  const openEdit = (s: ApiWorkShift) => {
    setEditShift(s);
    setForm({
      name: s.name,
      code: s.code,
      shiftType: s.shiftType,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakMinutes,
      isActive: s.isActive,
      description: s.description ?? "",
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Ca làm việc</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Thêm ca
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shifts.map((s) => (
            <div
              key={s.id}
              onClick={() => openMemberPanel(s)}
              className={`bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all ${!s.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[14px] font-medium">{s.name}</div>
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {s.code}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500"}`}
                >
                  {s.isActive ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
              <div className="text-[13px] text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} /> {s.startTime} — {s.endTime}
                </div>
                <div>☕ Nghỉ giữa ca: {s.breakMinutes} phút</div>
                <div>📋 Loại: {s.shiftType}</div>
                {/* So NV dang o ca */}
                <div className="flex items-center gap-1 pt-1 text-blue-600 dark:text-blue-400 font-medium">
                  <Users size={11} />
                  {s._count?.members ?? 0} nhân viên
                </div>
              </div>
              {isAdmin && (
                <div
                  className="flex gap-1 mt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent transition text-[12px] flex items-center gap-1"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(s.id)}
                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition text-[12px]"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-[15px] font-medium">
                {editShift ? "Sửa ca làm việc" : "Thêm ca làm việc"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  label: "Tên ca *",
                  key: "name",
                  type: "text",
                  placeholder: "VD: Ca Sáng",
                },
                {
                  label: "Mã ca *",
                  key: "code",
                  type: "text",
                  placeholder: "VD: MORNING",
                },
                {
                  label: "Giờ bắt đầu *",
                  key: "startTime",
                  type: "time",
                  placeholder: "",
                },
                {
                  label: "Giờ kết thúc *",
                  key: "endTime",
                  type: "time",
                  placeholder: "",
                },
                {
                  label: "Nghỉ giữa ca (phút)",
                  key: "breakMinutes",
                  type: "number",
                  placeholder: "60",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-[12px] text-muted-foreground block mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={String((form as Record<string, unknown>)[f.key])}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        [f.key]:
                          f.type === "number"
                            ? parseInt(e.target.value) || 0
                            : e.target.value,
                      }))
                    }
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">
                  Loại ca
                </label>
                <select
                  value={form.shiftType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, shiftType: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
                >
                  {["MORNING", "AFTERNOON", "NIGHT", "FLEXIBLE", "SPLIT"].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                <label
                  htmlFor="shiftActive"
                  className="text-[13px] cursor-pointer"
                >
                  Kích hoạt
                </label>
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
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}{" "}
                {editShift ? "Lưu" : "Tạo ca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <p className="text-[14px] font-medium">Xác nhận xoá ca làm việc?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={async () => {
                  if (!deleteConfirm) return;
                  try {
                    if (USE_API)
                      await attendanceService.deleteShift(deleteConfirm);
                    setShifts((prev) =>
                      prev.filter((s) => s.id !== deleteConfirm),
                    );
                    toast.success("Đã xoá ca làm việc");
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError ? err.message : "Xoá thất bại",
                    );
                  }
                  setDeleteConfirm(null);
                }}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-[13px] hover:bg-red-700"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Member Slide-Over Panel */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedShift(null)}
          />
          <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                  <Clock size={15} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold leading-tight">
                    {selectedShift.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {membersLoading
                      ? "Đang tải..."
                      : `${shiftMembers.length} nhân viên`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-1.5 rounded-lg hover:bg-accent transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Shift info bar */}
            <div className="px-5 py-2 border-b border-border bg-muted/30 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={10} /> {selectedShift.startTime} —{" "}
                {selectedShift.endTime}
              </span>
              <span>☕ {selectedShift.breakMinutes} phút nghỉ</span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {selectedShift.code}
              </span>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-[13px]">Đang tải nhân viên...</span>
                </div>
              ) : shiftMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users size={32} className="opacity-20 mb-2" />
                  <p className="text-[13px]">
                    Chưa có nhân viên nào trong ca này
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {shiftMembers.map((m) => (
                    <Link
                      key={m.id}
                      to={`/employees/${m.id}`}
                      onClick={() => setSelectedShift(null)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-accent transition group"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">
                            {m.fullName
                              .split(" ")
                              .slice(-2)
                              .map((w: string) => w[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate group-hover:text-blue-600 transition">
                          {m.fullName}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Building2 size={10} />
                            {m.department?.name ?? "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCircle2 size={10} />
                            {m.jobTitle?.name ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            m.employmentStatus === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : m.employmentStatus === "PROBATION"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.employmentStatus === "ACTIVE"
                            ? "Chính thức"
                            : m.employmentStatus === "PROBATION"
                              ? "Thử việc"
                              : m.employmentStatus}
                        </span>
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

            {/* Footer */}
            {!membersLoading && shiftMembers.length > 0 && (
              <div className="flex-shrink-0 px-5 py-3 border-t border-border text-[11px] text-muted-foreground">
                {shiftMembers.length} nhân viên đang trong ca này
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// HOLIDAYS PAGE
// ================================================================
export function HolidaysPage() {
  const { can } = useAuth();
  const isAdmin = can("ADMIN", "HR");
  type Holiday = {
    id: string;
    name: string;
    date: string;
    isRecurring: boolean;
    description: string | null;
  };
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editH, setEditH] = useState<Holiday | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    isRecurring: false,
    description: "",
  });
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_API) {
        const res = await attendanceService.listHolidays({ year, limit: 100 });
        setHolidays(res.items);
      } else {
        setHolidays(
          (mockHolidays as Holiday[]).filter(
            (h) => new Date(h.date).getFullYear() === year,
          ),
        );
      }
    } catch {
      toast.error("Không tải được ngày lễ");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleSave = async () => {
    if (!form.name || !form.date) {
      toast.error("Vui lòng nhập đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      if (USE_API) {
        if (editH) {
          const u = await attendanceService.updateHoliday(editH.id, {
            ...form,
            description: form.description || null,
          });
          setHolidays((prev) => prev.map((h) => (h.id === editH.id ? u : h)));
        } else {
          const c = await attendanceService.createHoliday({
            ...form,
            description: form.description || null,
          });
          setHolidays((prev) => [...prev, c]);
        }
      } else {
        if (editH)
          setHolidays((prev) =>
            prev.map((h) =>
              h.id === editH.id
                ? { ...h, ...form, description: form.description || null }
                : h,
            ),
          );
        else
          setHolidays((prev) => [
            ...prev,
            {
              id: `hol-${Date.now()}`,
              ...form,
              description: form.description || null,
            },
          ]);
      }
      toast.success(editH ? "Đã cập nhật ngày lễ" : "Đã thêm ngày lễ");
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thất bại");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditH(null);
    setForm({ name: "", date: "", isRecurring: false, description: "" });
    setShowForm(true);
  };
  const openEdit = (h: Holiday) => {
    setEditH(h);
    setForm({
      name: h.name,
      date: h.date,
      isRecurring: h.isRecurring,
      description: h.description ?? "",
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Ngày lễ</h1>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Plus size={14} /> Thêm
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Đang tải...</span>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[120px_1fr_2fr_80px_80px] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>Ngày</span>
            <span>Tên ngày lễ</span>
            <span>Mô tả</span>
            <span>Hàng năm</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {holidays.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-[13px]">
                Không có ngày lễ nào trong năm {year}
              </div>
            )}
            {holidays
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <div
                  key={h.id}
                  className="grid grid-cols-[120px_1fr_2fr_80px_80px] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition"
                >
                  <span className="text-[12px] font-mono">
                    {new Date(h.date).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="text-[13px] font-medium">{h.name}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {h.description || "—"}
                  </span>
                  <span className="text-[11px]">
                    {h.isRecurring ? "✓ Có" : "Không"}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(h)}
                        className="p-1 rounded hover:bg-accent text-[12px]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (USE_API)
                              await attendanceService.deleteHoliday(h.id);
                            setHolidays((prev) =>
                              prev.filter((x) => x.id !== h.id),
                            );
                            toast.success("Đã xoá ngày lễ");
                          } catch (err) {
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Xoá thất bại",
                            );
                          }
                        }}
                        className="p-1 rounded hover:bg-accent text-[12px] text-red-500"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-medium">
                {editH ? "Sửa ngày lễ" : "Thêm ngày lễ"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-accent"
              >
                <X size={15} />
              </button>
            </div>
            {[
              { label: "Tên ngày lễ *", key: "name", type: "text" },
              { label: "Ngày *", key: "date", type: "date" },
              { label: "Mô tả", key: "description", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[12px] text-muted-foreground block mb-1">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px]"
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={form.isRecurring}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isRecurring: e.target.checked }))
                }
                className="accent-blue-600"
              />
              <label
                htmlFor="isRecurring"
                className="text-[13px] cursor-pointer"
              >
                Lặp lại hàng năm
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}{" "}
                {editH ? "Lưu" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
