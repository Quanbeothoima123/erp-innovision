import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../data/mockData';
import {
  Bell, Check, CheckCheck, Mail, MailOpen, Trash2, X,
  Clock, CalendarDays, Briefcase, DollarSign, FileText, AlertTriangle,
  Timer, UserCheck, FolderKanban, MessageSquare, Search, Filter,
  ChevronDown, ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  ATTENDANCE_CHECKIN_REQUEST: 'Chấm công vào',
  ATTENDANCE_CHECKOUT_REQUEST: 'Chấm công ra',
  ATTENDANCE_REQUEST_APPROVED: 'Chấm công duyệt',
  ATTENDANCE_REQUEST_REJECTED: 'Chấm công từ chối',
  LEAVE_REQUEST_CREATED: 'Đơn nghỉ phép',
  LEAVE_REQUEST_APPROVED: 'Duyệt nghỉ phép',
  LEAVE_REQUEST_REJECTED: 'Từ chối nghỉ phép',
  LEAVE_BALANCE_LOW: 'Hết phép',
  OVERTIME_REQUEST_CREATED: 'Yêu cầu OT',
  OVERTIME_APPROVED: 'Duyệt OT',
  OVERTIME_REJECTED: 'Từ chối OT',
  PROJECT_ASSIGNED: 'Gán dự án',
  MILESTONE_DUE_SOON: 'Milestone sắp hạn',
  PAYSLIP_AVAILABLE: 'Phiếu lương',
  CONTRACT_EXPIRING_SOON: 'HĐ sắp hết hạn',
  INVOICE_OVERDUE: 'Hóa đơn quá hạn',
  GENERAL: 'Thông báo chung',
};

const typeCategories: Record<string, string> = {
  ATTENDANCE_CHECKIN_REQUEST: 'Chấm công',
  ATTENDANCE_CHECKOUT_REQUEST: 'Chấm công',
  ATTENDANCE_REQUEST_APPROVED: 'Chấm công',
  ATTENDANCE_REQUEST_REJECTED: 'Chấm công',
  LEAVE_REQUEST_CREATED: 'Nghỉ phép',
  LEAVE_REQUEST_APPROVED: 'Nghỉ phép',
  LEAVE_REQUEST_REJECTED: 'Nghỉ phép',
  LEAVE_BALANCE_LOW: 'Nghỉ phép',
  OVERTIME_REQUEST_CREATED: 'Tăng ca',
  OVERTIME_APPROVED: 'Tăng ca',
  OVERTIME_REJECTED: 'Tăng ca',
  PROJECT_ASSIGNED: 'Dự án',
  MILESTONE_DUE_SOON: 'Dự án',
  PAYSLIP_AVAILABLE: 'Lương',
  CONTRACT_EXPIRING_SOON: 'Hợp đồng',
  INVOICE_OVERDUE: 'Hóa đơn',
  GENERAL: 'Chung',
};

const typeColors: Record<string, string> = {
  ATTENDANCE_CHECKIN_REQUEST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ATTENDANCE_CHECKOUT_REQUEST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ATTENDANCE_REQUEST_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ATTENDANCE_REQUEST_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LEAVE_REQUEST_CREATED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  LEAVE_REQUEST_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LEAVE_REQUEST_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LEAVE_BALANCE_LOW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  OVERTIME_REQUEST_CREATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  OVERTIME_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERTIME_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PROJECT_ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MILESTONE_DUE_SOON: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PAYSLIP_AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONTRACT_EXPIRING_SOON: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  INVOICE_OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  GENERAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const typeIcons: Record<string, React.ReactNode> = {
  ATTENDANCE_CHECKIN_REQUEST: <Clock size={16} className="text-blue-500" />,
  ATTENDANCE_CHECKOUT_REQUEST: <Clock size={16} className="text-blue-500" />,
  ATTENDANCE_REQUEST_APPROVED: <UserCheck size={16} className="text-green-500" />,
  ATTENDANCE_REQUEST_REJECTED: <X size={16} className="text-red-500" />,
  LEAVE_REQUEST_CREATED: <CalendarDays size={16} className="text-orange-500" />,
  LEAVE_REQUEST_APPROVED: <Check size={16} className="text-green-500" />,
  LEAVE_REQUEST_REJECTED: <X size={16} className="text-red-500" />,
  LEAVE_BALANCE_LOW: <AlertTriangle size={16} className="text-yellow-500" />,
  OVERTIME_REQUEST_CREATED: <Timer size={16} className="text-indigo-500" />,
  OVERTIME_APPROVED: <Check size={16} className="text-green-500" />,
  OVERTIME_REJECTED: <X size={16} className="text-red-500" />,
  PROJECT_ASSIGNED: <FolderKanban size={16} className="text-purple-500" />,
  MILESTONE_DUE_SOON: <AlertTriangle size={16} className="text-purple-500" />,
  PAYSLIP_AVAILABLE: <DollarSign size={16} className="text-emerald-500" />,
  CONTRACT_EXPIRING_SOON: <FileText size={16} className="text-yellow-500" />,
  INVOICE_OVERDUE: <AlertTriangle size={16} className="text-red-500" />,
  GENERAL: <MessageSquare size={16} className="text-gray-500" />,
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

function groupByDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  if (d.toDateString() === today) return 'Hôm nay';
  if (d.toDateString() === yesterday) return 'Hôm qua';
  if (now.getTime() - d.getTime() < 7 * 86400000) return 'Tuần này';
  if (now.getTime() - d.getTime() < 30 * 86400000) return 'Tháng này';
  return 'Cũ hơn';
}

export function NotificationsPage() {
  const { notifications, markAsRead, markAllRead, deleteNotification, deleteAllRead, unreadCount } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  // Filter
  let displayed = notifications;
  if (filter === 'unread') displayed = displayed.filter(n => !n.isRead);
  if (filter === 'read') displayed = displayed.filter(n => n.isRead);
  if (categoryFilter) displayed = displayed.filter(n => typeCategories[n.type] === categoryFilter);
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    displayed = displayed.filter(n => n.title.toLowerCase().includes(s) || n.message.toLowerCase().includes(s));
  }

  const uniqueCategories = [...new Set(notifications.map(n => typeCategories[n.type]))].sort();
  const readCount = notifications.filter(n => n.isRead).length;
  const hasFilters = filter !== 'all' || categoryFilter || searchTerm;

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof displayed>();
    const order = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tháng này', 'Cũ hơn'];
    displayed.forEach(n => {
      const g = groupByDate(n.createdAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    });
    // Sort by order
    const sorted = new Map<string, typeof displayed>();
    order.forEach(o => { if (map.has(o)) sorted.set(o, map.get(o)!); });
    return sorted;
  }, [displayed]);

  // Batch actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === displayed.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayed.map(n => n.id)));
  };
  const batchMarkRead = () => {
    selectedIds.forEach(id => markAsRead(id));
    setSelectedIds(new Set());
    toast.success(`Đã đánh dấu ${selectedIds.size} thông báo đã đọc`);
  };
  const batchDelete = () => {
    selectedIds.forEach(id => deleteNotification(id));
    setSelectedIds(new Set());
    toast.success(`Đã xoá ${selectedIds.size} thông báo`);
  };

  // Stats
  const statCards = [
    { label: 'Tổng', value: notifications.length, icon: <Bell size={18} className="text-blue-500" />, color: 'bg-blue-50 dark:bg-blue-900/10' },
    { label: 'Chưa đọc', value: unreadCount, icon: <Mail size={18} className="text-orange-500" />, color: 'bg-orange-50 dark:bg-orange-900/10' },
    { label: 'Đã đọc', value: readCount, icon: <MailOpen size={18} className="text-green-500" />, color: 'bg-green-50 dark:bg-green-900/10' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-[20px] flex items-center gap-2">
          <Bell size={22} /> Hộp thư thông báo
          {unreadCount > 0 && <span className="text-[12px] px-2 py-0.5 rounded-full bg-red-500 text-white">{unreadCount}</span>}
        </h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[12px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
              <CheckCheck size={14} /> Đọc tất cả
            </button>
          )}
          {readCount > 0 && (
            <button onClick={() => { deleteAllRead(); toast.success('Đã xoá thông báo đã đọc'); }} className="text-[12px] px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground flex items-center gap-1">
              <Trash2 size={14} /> Xoá đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className="text-[20px]">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[12px] transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>
              {f === 'all' ? 'Tất cả' : f === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-[12px]">
          <option value="">Tất cả loại</option>
          {uniqueCategories.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm thông báo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-input-background text-[12px]" />
        </div>
        {hasFilters && (
          <button onClick={() => { setFilter('all'); setCategoryFilter(''); setSearchTerm(''); }} className="px-3 py-1.5 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
          <span className="text-[13px] text-blue-700 dark:text-blue-400">Đã chọn {selectedIds.size} thông báo</span>
          <div className="flex items-center gap-2">
            <button onClick={batchMarkRead} className="text-[12px] px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><Check size={12} /> Đánh dấu đã đọc</button>
            <button onClick={batchDelete} className="text-[12px] px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"><Trash2 size={12} /> Xoá</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-[12px] px-3 py-1 rounded-lg border border-border hover:bg-accent">Bỏ chọn</button>
          </div>
        </div>
      )}

      {/* Select All */}
      {displayed.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.size === displayed.length && displayed.length > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-border'}`}>
              {selectedIds.size === displayed.length && displayed.length > 0 && <Check size={10} />}
            </div>
            Chọn tất cả ({displayed.length})
          </button>
        </div>
      )}

      {/* Notification Groups */}
      {displayed.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-3"><Bell size={28} className="text-muted-foreground" /></div>
          <div className="text-[14px] text-muted-foreground">Không có thông báo nào</div>
          <div className="text-[12px] text-muted-foreground mt-1">
            {hasFilters ? 'Thử thay đổi bộ lọc để xem kết quả khác' : 'Bạn sẽ nhận thông báo khi có cập nhật mới'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateGroup, items]) => (
            <div key={dateGroup}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">{dateGroup}</span>
                <div className="flex-1 border-t border-border" />
                <span className="text-[11px] text-muted-foreground">{items.length}</span>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                {items.map(n => {
                  const sender = getUserById(n.senderUserId);
                  const typeColor = typeColors[n.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
                  const icon = typeIcons[n.type] || <Bell size={16} className="text-gray-500" />;
                  const isSelected = selectedIds.has(n.id);
                  const isExpanded = expandedDetail === n.id;

                  return (
                    <div key={n.id} className={`transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''} ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/15' : ''}`}>
                      <div className="flex items-start gap-3 p-4">
                        {/* Checkbox */}
                        <button onClick={() => toggleSelect(n.id)} className="mt-0.5 shrink-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-border hover:border-blue-400'}`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </button>

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-muted'}`}>
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!n.isRead) markAsRead(n.id); setExpandedDetail(isExpanded ? null : n.id); }}>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor}`}>{typeLabels[n.type] || n.type}</span>
                            <span className="text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                          </div>
                          <div className={`text-[13px] ${!n.isRead ? '' : 'text-muted-foreground'}`}>{n.title}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2 text-[12px]">
                              {sender && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">{sender.fullName.split(' ').slice(-1)[0][0]}</div>
                                  <span className="text-muted-foreground">Từ: <span className="text-foreground">{sender.fullName}</span></span>
                                </div>
                              )}
                              <div className="text-muted-foreground">
                                Ngày gửi: <span className="text-foreground">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                              </div>
                              {n.isRead && n.readAt && (
                                <div className="text-muted-foreground">
                                  Đã đọc: <span className="text-foreground">{new Date(n.readAt).toLocaleString('vi-VN')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.isRead && (
                            <button onClick={() => markAsRead(n.id)} title="Đánh dấu đã đọc" className="p-1.5 rounded-lg hover:bg-accent text-blue-500"><Check size={14} /></button>
                          )}
                          <button onClick={() => { deleteNotification(n.id); toast.success('Đã xoá thông báo'); }} title="Xoá" className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
