import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  clients as initialClients, getUserById, formatVND, formatFullVND,
  contracts, invoices, users,
} from '../data/mockData';
import type { Client, ClientStatus, ClientType, ClientContact } from '../data/mockData';
import {
  X, Globe, Mail, Phone, MapPin, Building, Search, Plus, Edit2, Trash2,
  UserPlus, Users, FileText, ChevronRight, Star, GripHorizontal, ArrowRight,
  Eye, DollarSign, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────────
const statusColors: Record<ClientStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PROSPECT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  BLACKLISTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const typeLabels: Record<string, string> = { INDIVIDUAL: 'Cá nhân', COMPANY: 'Công ty', GOVERNMENT: 'Nhà nước', NGO: 'Tổ chức phi LN' };
const statusLabels: Record<string, string> = { PROSPECT: 'Tiềm năng', ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng HĐ', BLACKLISTED: 'Danh sách đen' };

const PIPELINE_STATUSES: ClientStatus[] = ['PROSPECT', 'ACTIVE', 'INACTIVE'];
const pipelineColors: Record<string, string> = {
  PROSPECT: 'border-t-blue-500',
  ACTIVE: 'border-t-green-500',
  INACTIVE: 'border-t-gray-400',
};
const pipelineBg: Record<string, string> = {
  PROSPECT: 'bg-blue-50 dark:bg-blue-900/10',
  ACTIVE: 'bg-green-50 dark:bg-green-900/10',
  INACTIVE: 'bg-gray-50 dark:bg-gray-900/10',
};

const emptyForm = () => ({
  companyName: '', shortName: '', clientType: 'COMPANY' as ClientType, status: 'PROSPECT' as ClientStatus,
  taxCode: '', industry: '', website: '', email: '', phone: '', address: '', city: '',
  accountManagerUserId: '',
});
const emptyContact = () => ({ fullName: '', jobTitle: '', email: '', phone: '', isPrimary: false });

export function ClientsPage() {
  const { can, currentUser } = useAuth();
  const [allClients, setAllClients] = useState<Client[]>(initialClients);
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab, setTab] = useState('info');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const canManage = can('ADMIN', 'SALES', 'MANAGER');

  let filtered = allClients;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.companyName.toLowerCase().includes(s) || c.shortName.toLowerCase().includes(s) ||
      c.clientCode.toLowerCase().includes(s) || (c.email?.toLowerCase().includes(s)) ||
      (c.industry?.toLowerCase().includes(s))
    );
  }
  if (statusFilter) filtered = filtered.filter(c => c.status === statusFilter);
  if (typeFilter) filtered = filtered.filter(c => c.clientType === typeFilter);

  const hasFilters = search || statusFilter || typeFilter;

  const handleSave = (data: Partial<Client>, contacts: ClientContact[]) => {
    if (editClient) {
      setAllClients(prev => prev.map(c => c.id === editClient.id ? { ...c, ...data, contacts } : c));
      if (selected?.id === editClient.id) setSelected(prev => prev ? { ...prev, ...data, contacts } : null);
      toast.success('Đã cập nhật khách hàng');
    } else {
      const code = `KH${String(allClients.length + 1).padStart(3, '0')}`;
      const newClient: Client = {
        id: `cl-${Date.now()}`, clientCode: code,
        clientType: data.clientType || 'COMPANY', status: data.status || 'PROSPECT',
        companyName: data.companyName || '', shortName: data.shortName || '',
        taxCode: data.taxCode, industry: data.industry, website: data.website,
        email: data.email, phone: data.phone, address: data.address, city: data.city,
        accountManagerUserId: data.accountManagerUserId || currentUser!.id,
        totalContractValue: 0, totalReceivedAmount: 0, outstandingBalance: 0,
        contacts,
      };
      setAllClients(prev => [newClient, ...prev]);
      toast.success(`Đã tạo khách hàng ${data.shortName}`);
    }
    setShowForm(false);
    setEditClient(null);
  };

  const handleStatusChange = (clientId: string, newStatus: ClientStatus) => {
    setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
    if (selected?.id === clientId) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    toast.success(`Đã chuyển trạng thái → ${statusLabels[newStatus]}`);
  };

  const openEdit = (c: Client) => { setEditClient(c); setShowForm(true); };
  const openCreate = () => { setEditClient(null); setShowForm(true); };
  const openDetail = (c: Client) => { setSelected(c); setTab('info'); };

  const handleUpdateContacts = (clientId: string, contacts: ClientContact[]) => {
    setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, contacts } : c));
    if (selected?.id === clientId) setSelected(prev => prev ? { ...prev, contacts } : null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Khách hàng</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-[12px] ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>Bảng</button>
            <button onClick={() => setViewMode('pipeline')} className={`px-3 py-1.5 text-[12px] ${viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}>Pipeline</button>
          </div>
          {canManage && (
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Thêm KH</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm tên, mã KH, email, ngành..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        {viewMode === 'table' && (
          <>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">Tất cả loại</option>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Loại</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Account Mgr</th>
                  <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giá trị HĐ</th>
                  <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Còn nợ</th>
                  <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const mgr = getUserById(c.accountManagerUserId);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => openDetail(c)}>
                          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-[11px] shrink-0">{c.shortName[0]}</div>
                          <div>
                            <div className="text-[13px] hover:text-blue-600">{c.shortName}</div>
                            <div className="text-[11px] text-muted-foreground">{c.clientCode} • {c.industry || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] hidden md:table-cell">{typeLabels[c.clientType]}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>{statusLabels[c.status]}</span></td>
                      <td className="px-4 py-3 text-[13px] hidden lg:table-cell">{mgr?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-right hidden sm:table-cell">{formatVND(c.totalContractValue)}</td>
                      <td className="px-4 py-3 text-[13px] text-right hidden md:table-cell">{c.outstandingBalance > 0 ? <span className="text-red-500">{formatVND(c.outstandingBalance)}</span> : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openDetail(c)} className="p-1 rounded hover:bg-accent text-muted-foreground" title="Xem"><Eye size={14} /></button>
                          {canManage && <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-accent text-muted-foreground" title="Sửa"><Edit2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy khách hàng</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} khách hàng</div>
        </div>
      )}

      {/* PIPELINE VIEW */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PIPELINE_STATUSES.map(st => {
            const pClients = filtered.filter(c => c.status === st);
            const totalValue = pClients.reduce((s, c) => s + c.totalContractValue, 0);
            return (
              <div key={st} className={`rounded-xl border border-border border-t-4 ${pipelineColors[st]}`}>
                <div className={`p-3 ${pipelineBg[st]} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] px-2 py-0.5 rounded-full ${statusColors[st]}`}>{statusLabels[st]}</span>
                      <span className="text-[12px] text-muted-foreground">{pClients.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{formatVND(totalValue)}</span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[100px]">
                  {pClients.map(c => {
                    const mgr = getUserById(c.accountManagerUserId);
                    return (
                      <div key={c.id} onClick={() => openDetail(c)} className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-white text-[10px] shrink-0">{c.shortName[0]}</div>
                          <div className="min-w-0">
                            <div className="text-[13px] truncate">{c.shortName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{c.companyName}</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-1.5">
                          <span>{mgr?.fullName || '—'}</span>
                          <span>{c.totalContractValue > 0 ? formatVND(c.totalContractValue) : '—'}</span>
                        </div>
                        {c.outstandingBalance > 0 && (
                          <div className="text-[10px] text-red-500 mt-1">Nợ: {formatVND(c.outstandingBalance)}</div>
                        )}
                        {canManage && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                            {PIPELINE_STATUSES.filter(s => s !== st).map(s => (
                              <button key={s} onClick={e => { e.stopPropagation(); handleStatusChange(c.id, s); }}
                                className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-accent flex items-center gap-0.5">
                                <ArrowRight size={9} /> {statusLabels[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {pClients.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-[12px]">Không có KH</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL DIALOG */}
      {selected && (
        <ClientDetailDialog
          client={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          tab={tab}
          setTab={setTab}
          onEdit={() => openEdit(selected)}
          onStatusChange={(st) => handleStatusChange(selected.id, st)}
          onUpdateContacts={(contacts) => handleUpdateContacts(selected.id, contacts)}
        />
      )}

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <ClientFormDialog
          client={editClient}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditClient(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLIENT DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════
function ClientDetailDialog({ client, canManage, onClose, tab, setTab, onEdit, onStatusChange, onUpdateContacts }: {
  client: Client; canManage: boolean; onClose: () => void;
  tab: string; setTab: (t: string) => void;
  onEdit: () => void;
  onStatusChange: (st: ClientStatus) => void;
  onUpdateContacts: (contacts: ClientContact[]) => void;
}) {
  const mgr = getUserById(client.accountManagerUserId);
  const clientContracts = contracts.filter(ct => ct.clientId === client.id);
  const clientInvoices = invoices.filter(inv => inv.clientId === client.id);

  const tabs = [
    { key: 'info', label: 'Thông tin', icon: <Building size={14} /> },
    { key: 'contacts', label: `Liên hệ (${client.contacts.length})`, icon: <Users size={14} /> },
    { key: 'contracts', label: `Hợp đồng (${clientContracts.length})`, icon: <Briefcase size={14} /> },
    { key: 'invoices', label: `Hóa đơn (${clientInvoices.length})`, icon: <FileText size={14} /> },
  ];

  const statusLabelsMap: Record<string, string> = { PROSPECT: 'Tiềm năng', ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng HĐ', BLACKLISTED: 'Danh sách đen' };
  const typeLabelsMap: Record<string, string> = { INDIVIDUAL: 'Cá nhân', COMPANY: 'Công ty', GOVERNMENT: 'Nhà nước', NGO: 'Tổ chức phi LN' };
  const ctStatusLabels: Record<string, string> = { DRAFT: 'Nháp', PENDING_SIGN: 'Chờ ký', ACTIVE: 'Đang thực hiện', COMPLETED: 'Hoàn thành', TERMINATED: 'Chấm dứt', SUSPENDED: 'Tạm dừng', EXPIRED: 'Hết hạn' };
  const ctStatusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    PENDING_SIGN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    TERMINATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
  };
  const invStatusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    VIEWED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    DISPUTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
  };
  const invStatusLabels: Record<string, string> = { DRAFT: 'Nháp', SENT: 'Đã gửi', VIEWED: 'Đã xem', PARTIALLY_PAID: 'Trả 1 phần', PAID: 'Đã TT', OVERDUE: 'Quá hạn', DISPUTED: 'Tranh chấp', CANCELLED: 'Huỷ' };

  return (
    <Overlay onClose={onClose} wide>
      <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-[14px] shrink-0">{client.shortName[0]}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px]">{client.companyName}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[client.status]}`}>{statusLabelsMap[client.status]}</span>
            </div>
            <div className="text-[12px] text-muted-foreground">{client.clientCode} • {typeLabelsMap[client.clientType]} • {client.industry || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && <button onClick={onEdit} className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"><Edit2 size={12} /> Sửa</button>}
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
      </div>

      <div className="flex border-b border-border px-4 gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2.5 text-[13px] border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {client.email && <IB icon={<Mail size={12} />} label="Email" value={client.email} />}
              {client.phone && <IB icon={<Phone size={12} />} label="Điện thoại" value={client.phone} />}
              {client.website && <IB icon={<Globe size={12} />} label="Website" value={client.website} />}
              {client.address && <IB icon={<MapPin size={12} />} label="Địa chỉ" value={`${client.address}${client.city ? ', ' + client.city : ''}`} />}
              {client.taxCode && <IB label="Mã số thuế" value={client.taxCode} />}
              <IB label="Account Manager" value={mgr?.fullName || '—'} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><DollarSign size={12} /> Giá trị HĐ</div>
                <div className="text-[18px] mt-1">{formatVND(client.totalContractValue)}</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground">Đã nhận</div>
                <div className="text-[18px] mt-1 text-green-600">{formatVND(client.totalReceivedAmount)}</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground">Còn nợ</div>
                <div className={`text-[18px] mt-1 ${client.outstandingBalance > 0 ? 'text-red-500' : ''}`}>{formatVND(client.outstandingBalance)}</div>
              </div>
            </div>

            {/* Status change */}
            {canManage && (
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="text-[13px] mb-2">Chuyển trạng thái</div>
                <div className="flex flex-wrap gap-2">
                  {(['PROSPECT', 'ACTIVE', 'INACTIVE', 'BLACKLISTED'] as ClientStatus[]).map(s => (
                    <button key={s} onClick={() => onStatusChange(s)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${client.status === s ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:bg-accent'}`}>
                      {statusLabelsMap[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'contacts' && (
          <ContactsTab
            contacts={client.contacts}
            canManage={canManage}
            onUpdate={onUpdateContacts}
          />
        )}

        {tab === 'contracts' && (
          <div className="space-y-2">
            {clientContracts.map(ct => (
              <div key={ct.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="min-w-0">
                  <div className="text-[13px]">{ct.title}</div>
                  <div className="text-[11px] text-muted-foreground">{ct.contractCode} • {ct.startDate} → {ct.endDate}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[13px]">{formatVND(ct.totalValue)}</div>
                    {ct.remainingAmount > 0 && <div className="text-[11px] text-orange-500">Còn: {formatVND(ct.remainingAmount)}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ctStatusColors[ct.status]}`}>{ctStatusLabels[ct.status]}</span>
                </div>
              </div>
            ))}
            {clientContracts.length === 0 && <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có hợp đồng nào</div>}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-2">
            {clientInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="min-w-0">
                  <div className="text-[13px]">{inv.invoiceCode}</div>
                  <div className="text-[11px] text-muted-foreground">Phát hành: {inv.issuedDate} • Hạn: {inv.dueDate}</div>
                  {inv.notes && <div className="text-[11px] text-muted-foreground mt-0.5">{inv.notes}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[13px]">{formatVND(inv.totalAmount)}</div>
                    {inv.outstandingAmount > 0 && <div className="text-[11px] text-red-500">Nợ: {formatVND(inv.outstandingAmount)}</div>}
                    {inv.paidAmount > 0 && inv.outstandingAmount > 0 && <div className="text-[10px] text-green-600">Đã TT: {formatVND(inv.paidAmount)}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${invStatusColors[inv.status] || ''}`}>{invStatusLabels[inv.status] || inv.status}</span>
                </div>
              </div>
            ))}
            {clientInvoices.length === 0 && <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có hóa đơn nào</div>}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS TAB
// ═══════════════════════════════════════════════════════════════
function ContactsTab({ contacts, canManage, onUpdate }: {
  contacts: ClientContact[]; canManage: boolean;
  onUpdate: (contacts: ClientContact[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState(emptyContact());

  const handleAdd = () => {
    if (!form.fullName) { toast.error('Vui lòng nhập họ tên'); return; }
    const isPrimary = contacts.length === 0 ? true : form.isPrimary;
    let updated = [...contacts];
    if (isPrimary) updated = updated.map(c => ({ ...c, isPrimary: false }));
    updated.push({ ...form, isPrimary });
    onUpdate(updated);
    setShowAdd(false);
    setForm(emptyContact());
    toast.success('Đã thêm liên hệ');
  };

  const handleEditSave = () => {
    if (editIdx === null || !form.fullName) return;
    let updated = [...contacts];
    if (form.isPrimary) updated = updated.map(c => ({ ...c, isPrimary: false }));
    updated[editIdx] = { ...form };
    onUpdate(updated);
    setEditIdx(null);
    setForm(emptyContact());
    toast.success('Đã cập nhật liên hệ');
  };

  const handleDelete = (idx: number) => {
    const updated = contacts.filter((_, i) => i !== idx);
    if (updated.length > 0 && !updated.some(c => c.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onUpdate(updated);
    toast.success('Đã xoá liên hệ');
  };

  const handleSetPrimary = (idx: number) => {
    const updated = contacts.map((c, i) => ({ ...c, isPrimary: i === idx }));
    onUpdate(updated);
    toast.success('Đã đặt làm liên hệ chính');
  };

  const openEdit = (idx: number) => {
    setEditIdx(idx);
    setForm({ ...contacts[idx] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">{contacts.length} người liên hệ</div>
        {canManage && (
          <button onClick={() => { setShowAdd(true); setForm(emptyContact()); }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px]">
            <UserPlus size={14} /> Thêm
          </button>
        )}
      </div>

      {contacts.length > 0 ? (
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white text-[12px] shrink-0">
                {c.fullName.split(' ').slice(-1)[0][0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] flex items-center gap-1.5">
                  {c.fullName}
                  {c.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Chính</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">{c.jobTitle}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                  {c.email && <span className="flex items-center gap-0.5"><Mail size={10} /> {c.email}</span>}
                  {c.phone && <span className="flex items-center gap-0.5"><Phone size={10} /> {c.phone}</span>}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  {!c.isPrimary && <button onClick={() => handleSetPrimary(i)} className="p-1 rounded hover:bg-accent text-muted-foreground" title="Đặt làm chính"><Star size={12} /></button>}
                  <button onClick={() => openEdit(i)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={12} /></button>
                  <button onClick={() => handleDelete(i)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có liên hệ nào</div>
      )}

      {/* Add/Edit Contact inline form */}
      {(showAdd || editIdx !== null) && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
          <div className="text-[13px]">{editIdx !== null ? 'Sửa liên hệ' : 'Thêm liên hệ mới'}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Họ tên *</label>
              <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Chức vụ</label>
              <input type="text" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1">SĐT</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground">Liên hệ chính:</label>
            <button onClick={() => setForm(f => ({ ...f, isPrimary: !f.isPrimary }))} className={`px-2 py-1 rounded text-[12px] border ${form.isPrimary ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-border text-muted-foreground'}`}>
              {form.isPrimary ? 'Có' : 'Không'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setEditIdx(null); setForm(emptyContact()); }} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent">Huỷ</button>
            <button onClick={editIdx !== null ? handleEditSave : handleAdd} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px]">{editIdx !== null ? 'Cập nhật' : 'Thêm'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLIENT FORM DIALOG
// ═══════════════════════════════════════════════════════════════
function ClientFormDialog({ client, onSave, onClose }: {
  client: Client | null;
  onSave: (data: Partial<Client>, contacts: ClientContact[]) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(client ? {
    companyName: client.companyName, shortName: client.shortName,
    clientType: client.clientType, status: client.status,
    taxCode: client.taxCode || '', industry: client.industry || '',
    website: client.website || '', email: client.email || '',
    phone: client.phone || '', address: client.address || '',
    city: client.city || '', accountManagerUserId: client.accountManagerUserId,
  } : emptyForm());
  const [contacts, setContacts] = useState<ClientContact[]>(client?.contacts || []);

  const activeUsers = users.filter(u => u.accountStatus === 'ACTIVE');

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={client ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'} onClose={onClose} />
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[12px] text-muted-foreground mb-1">Tên công ty *</label>
            <input type="text" value={f.companyName} onChange={e => setF(p => ({ ...p, companyName: e.target.value }))} placeholder="Công ty TNHH ABC" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Tên ngắn *</label>
            <input type="text" value={f.shortName} onChange={e => setF(p => ({ ...p, shortName: e.target.value }))} placeholder="ABC" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Loại KH</label>
            <select value={f.clientType} onChange={e => setF(p => ({ ...p, clientType: e.target.value as ClientType }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Trạng thái</label>
            <select value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value as ClientStatus }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Mã số thuế</label>
            <input type="text" value={f.taxCode} onChange={e => setF(p => ({ ...p, taxCode: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Ngành nghề</label>
            <input type="text" value={f.industry} onChange={e => setF(p => ({ ...p, industry: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Website</label>
            <input type="text" value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Email</label>
            <input type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Điện thoại</label>
            <input type="text" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Địa chỉ</label>
            <input type="text" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Thành phố</label>
            <input type="text" value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Account Manager</label>
          <select value={f.accountManagerUserId} onChange={e => setF(p => ({ ...p, accountManagerUserId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">-- Chọn --</option>
            {activeUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.userCode})</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
        <button onClick={() => {
          if (!f.companyName || !f.shortName) { toast.error('Vui lòng nhập tên công ty'); return; }
          onSave(f, contacts);
        }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">{client ? 'Cập nhật' : 'Tạo KH'}</button>
      </div>
    </Overlay>
  );
}

// ─── Shared helpers ───
function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>{children}</div>
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

function IB({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-[13px] mt-0.5 break-words">{value}</div>
    </div>
  );
}
