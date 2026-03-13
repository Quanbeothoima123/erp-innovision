import { useState } from 'react';
import {
  contracts as initialContracts, contractAmendments as initialAmendments,
  getClientById, getUserById, formatVND, formatFullVND, clients, users, projects, invoices,
} from '../data/mockData';
import type {
  Contract, ContractStatus, ContractType, ContractAmendment,
} from '../data/mockData';
import {
  Search, Plus, X, Edit2, Eye, ChevronRight, FileText, Upload, Paperclip,
  CheckCircle2, Clock, AlertTriangle, DollarSign, Calendar, ArrowRight,
  Briefcase, ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ─── Constants ──────────────────────────────────────────────
const statusColors: Record<ContractStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PENDING_SIGN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TERMINATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
};
const statusLabels: Record<string, string> = {
  DRAFT: 'Nháp', PENDING_SIGN: 'Chờ ký', ACTIVE: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành', TERMINATED: 'Chấm dứt', SUSPENDED: 'Tạm dừng', EXPIRED: 'Hết hạn',
};
const typeLabels: Record<string, string> = {
  FIXED_PRICE: 'Trọn gói', TIME_AND_MATERIAL: 'T&M', RETAINER: 'Retainer',
  MILESTONE_BASED: 'Milestone', MIXED: 'Kết hợp',
};

// Status workflow
const statusTransitions: Record<string, ContractStatus[]> = {
  DRAFT: ['PENDING_SIGN'],
  PENDING_SIGN: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['COMPLETED', 'SUSPENDED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
  EXPIRED: [],
};

export function ContractsPage() {
  const { can, currentUser } = useAuth();
  const [allContracts, setAllContracts] = useState<Contract[]>(initialContracts);
  const [amendments, setAmendments] = useState<ContractAmendment[]>(initialAmendments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailTab, setDetailTab] = useState('info');

  const canManage = can('ADMIN', 'SALES', 'MANAGER');

  let filtered = allContracts;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c => {
      const client = getClientById(c.clientId);
      return c.contractCode.toLowerCase().includes(s) || c.title.toLowerCase().includes(s) ||
        client?.shortName.toLowerCase().includes(s) || client?.companyName.toLowerCase().includes(s);
    });
  }
  if (statusFilter) filtered = filtered.filter(c => c.status === statusFilter);
  if (typeFilter) filtered = filtered.filter(c => c.contractType === typeFilter);
  if (clientFilter) filtered = filtered.filter(c => c.clientId === clientFilter);

  const hasFilters = search || statusFilter || typeFilter || clientFilter;

  // Summary
  const totalValue = filtered.reduce((s, c) => s + c.totalValue, 0);
  const totalReceived = filtered.reduce((s, c) => s + c.receivedAmount, 0);
  const totalRemaining = filtered.reduce((s, c) => s + c.remainingAmount, 0);

  const handleSave = (data: Partial<Contract>) => {
    if (editContract) {
      setAllContracts(prev => prev.map(c => c.id === editContract.id ? { ...c, ...data } : c));
      if (selectedContract?.id === editContract.id) setSelectedContract(prev => prev ? { ...prev, ...data } : null);
      toast.success('Đã cập nhật hợp đồng');
    } else {
      const code = `HĐ-${new Date().getFullYear()}-${String(allContracts.length + 1).padStart(3, '0')}`;
      const val = data.totalValue || 0;
      const newContract: Contract = {
        id: `ct-${Date.now()}`, contractCode: code, clientId: data.clientId || '',
        contractType: data.contractType || 'FIXED_PRICE', status: 'DRAFT',
        title: data.title || '', description: data.description || '',
        totalValue: val, receivedAmount: 0, remainingAmount: val,
        startDate: data.startDate || '', endDate: data.endDate || '',
      };
      setAllContracts(prev => [newContract, ...prev]);
      toast.success(`Đã tạo hợp đồng ${code}`);
    }
    setShowForm(false);
    setEditContract(null);
  };

  const handleStatusChange = (contractId: string, newStatus: ContractStatus) => {
    const updates: Partial<Contract> = { status: newStatus };
    if (newStatus === 'ACTIVE') {
      updates.signedDate = new Date().toISOString().slice(0, 10);
      updates.signedByUserId = currentUser?.id;
    }
    setAllContracts(prev => prev.map(c => c.id === contractId ? { ...c, ...updates } : c));
    if (selectedContract?.id === contractId) setSelectedContract(prev => prev ? { ...prev, ...updates } : null);
    toast.success(`Đã chuyển trạng thái → ${statusLabels[newStatus]}`);
  };

  const handleAddAmendment = (data: Omit<ContractAmendment, 'id' | 'createdAt' | 'createdByUserId'>) => {
    const newAm: ContractAmendment = {
      ...data,
      id: `ca-${Date.now()}`,
      createdByUserId: currentUser!.id,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setAmendments(prev => [...prev, newAm]);
    // Update contract value if needed
    if (data.valueChange !== 0) {
      setAllContracts(prev => prev.map(c => {
        if (c.id === data.contractId) {
          const newTotal = c.totalValue + data.valueChange;
          return { ...c, totalValue: newTotal, remainingAmount: newTotal - c.receivedAmount };
        }
        return c;
      }));
      if (selectedContract?.id === data.contractId) {
        setSelectedContract(prev => {
          if (!prev) return null;
          const newTotal = prev.totalValue + data.valueChange;
          return { ...prev, totalValue: newTotal, remainingAmount: newTotal - prev.receivedAmount };
        });
      }
    }
    if (data.newEndDate && data.contractId) {
      setAllContracts(prev => prev.map(c => c.id === data.contractId ? { ...c, endDate: data.newEndDate! } : c));
      if (selectedContract?.id === data.contractId) setSelectedContract(prev => prev ? { ...prev, endDate: data.newEndDate! } : null);
    }
    toast.success('Đã thêm phụ lục hợp đồng');
  };

  const openEdit = (c: Contract) => { setEditContract(c); setShowForm(true); };
  const openCreate = () => { setEditContract(null); setShowForm(true); };
  const openDetail = (c: Contract) => { setSelectedContract(c); setDetailTab('info'); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Hợp đồng</h1>
        {canManage && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Tạo HĐ</button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><DollarSign size={12} /> Tổng giá trị</div>
          <div className="text-[20px] mt-1">{formatVND(totalValue)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-[11px] text-muted-foreground">Đã nhận</div>
          <div className="text-[20px] mt-1 text-green-600">{formatVND(totalReceived)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-[11px] text-muted-foreground">Còn lại</div>
          <div className={`text-[20px] mt-1 ${totalRemaining > 0 ? 'text-orange-500' : ''}`}>{formatVND(totalRemaining)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm mã HĐ, tên, khách hàng..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả TT</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả loại</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả KH</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setClientFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Mã HĐ</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Tên hợp đồng</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Khách hàng</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Loại</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Giá trị</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Thời gian</th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const client = getClientById(c.clientId);
                const amCount = amendments.filter(a => a.contractId === c.id).length;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-[13px]">{c.contractCode}</td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] cursor-pointer hover:text-blue-600" onClick={() => openDetail(c)}>{c.title}</div>
                      {amCount > 0 && <span className="text-[10px] text-purple-600 dark:text-purple-400">+{amCount} phụ lục</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{client?.shortName}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="text-[11px] px-2 py-0.5 rounded bg-muted">{typeLabels[c.contractType]}</span></td>
                    <td className="px-4 py-3 text-[13px] text-right hidden sm:table-cell">{formatVND(c.totalValue)}</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>{statusLabels[c.status]}</span></td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{c.startDate} → {c.endDate}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openDetail(c)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Eye size={14} /></button>
                        {canManage && <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy hợp đồng</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} hợp đồng</div>
      </div>

      {/* Detail Dialog */}
      {selectedContract && (
        <ContractDetailDialog
          contract={selectedContract}
          amendments={amendments.filter(a => a.contractId === selectedContract.id)}
          canManage={canManage}
          tab={detailTab}
          setTab={setDetailTab}
          onClose={() => setSelectedContract(null)}
          onEdit={() => openEdit(selectedContract)}
          onStatusChange={(st) => handleStatusChange(selectedContract.id, st)}
          onAddAmendment={handleAddAmendment}
        />
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <ContractFormDialog
          contract={editContract}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditContract(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════
function ContractDetailDialog({ contract, amendments, canManage, tab, setTab, onClose, onEdit, onStatusChange, onAddAmendment }: {
  contract: Contract; amendments: ContractAmendment[]; canManage: boolean;
  tab: string; setTab: (t: string) => void;
  onClose: () => void; onEdit: () => void;
  onStatusChange: (st: ContractStatus) => void;
  onAddAmendment: (data: Omit<ContractAmendment, 'id' | 'createdAt' | 'createdByUserId'>) => void;
}) {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showAmendForm, setShowAmendForm] = useState(false);

  const client = getClientById(contract.clientId);
  const signer = contract.signedByUserId ? getUserById(contract.signedByUserId) : null;
  const contractProjects = projects.filter(p => p.contractId === contract.id);
  const contractInvoices = invoices.filter(inv => inv.contractId === contract.id);

  const available = statusTransitions[contract.status] || [];

  const tabs = [
    { key: 'info', label: 'Thông tin', icon: <FileText size={14} /> },
    { key: 'amendments', label: `Phụ lục (${amendments.length})`, icon: <ScrollText size={14} /> },
    { key: 'linked', label: 'Liên kết', icon: <Briefcase size={14} /> },
  ];

  return (
    <Overlay onClose={onClose} wide>
      <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px]">{contract.title}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[contract.status]}`}>{statusLabels[contract.status]}</span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{contract.contractCode} • {client?.shortName} • {typeLabels[contract.contractType]}</div>
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
            {contract.description && <p className="text-[13px] text-muted-foreground">{contract.description}</p>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <IB icon={<Calendar size={12} />} label="Bắt đầu" value={contract.startDate} />
              <IB icon={<Calendar size={12} />} label="Kết thúc" value={contract.endDate} />
              <IB label="Loại HĐ" value={typeLabels[contract.contractType]} />
              {contract.signedDate && <IB label="Ngày ký" value={contract.signedDate} />}
              {signer && <IB label="Người ký" value={signer.fullName} />}
              <IB label="Khách hàng" value={client?.companyName || '—'} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground">Giá trị</div>
                <div className="text-[18px] mt-1">{formatFullVND(contract.totalValue)}</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground">Đã nhận</div>
                <div className="text-[18px] mt-1 text-green-600">{formatFullVND(contract.receivedAmount)}</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <div className="text-[11px] text-muted-foreground">Còn lại</div>
                <div className={`text-[18px] mt-1 ${contract.remainingAmount > 0 ? 'text-orange-500' : ''}`}>{formatFullVND(contract.remainingAmount)}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-[13px] mb-2">Tiến độ thu tiền</div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${contract.totalValue > 0 ? Math.round((contract.receivedAmount / contract.totalValue) * 100) : 0}%` }} />
              </div>
              <div className="text-[12px] text-muted-foreground mt-1">
                {contract.totalValue > 0 ? Math.round((contract.receivedAmount / contract.totalValue) * 100) : 0}% đã thu
              </div>
            </div>

            {/* File upload simulation */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-[13px] mb-2 flex items-center gap-1"><Paperclip size={14} /> Tệp đính kèm</div>
              {uploadedFile ? (
                <div className="flex items-center gap-2 text-[13px]">
                  <FileText size={14} className="text-blue-500" />
                  <span>{uploadedFile}</span>
                  <button onClick={() => setUploadedFile(null)} className="text-[11px] text-red-500 hover:underline">Xoá</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload size={16} className="text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">Tải lên tệp hợp đồng (PDF, DOCX...)</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { setUploadedFile(file.name); toast.success(`Đã tải lên ${file.name}`); }
                  }} />
                </label>
              )}
            </div>

            {/* Status workflow */}
            {canManage && available.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="text-[13px] mb-2">Chuyển trạng thái</div>
                <div className="flex flex-wrap gap-2">
                  {available.map(st => (
                    <button key={st} onClick={() => onStatusChange(st)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] border border-border hover:bg-accent transition-colors">
                      <ArrowRight size={12} /> {statusLabels[st]}
                      {st === 'ACTIVE' && ' (ký)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'amendments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[13px] text-muted-foreground">{amendments.length} phụ lục</div>
              {canManage && (
                <button onClick={() => setShowAmendForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px]">
                  <Plus size={14} /> Thêm phụ lục
                </button>
              )}
            </div>

            {amendments.length > 0 ? (
              <div className="space-y-2">
                {amendments.map(am => {
                  const creator = getUserById(am.createdByUserId);
                  return (
                    <div key={am.id} className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{am.amendmentCode}</span>
                            <span className="text-[13px]">{am.title}</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-1">{am.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span>Hiệu lực: {am.effectiveDate}</span>
                            <span>Người tạo: {creator?.fullName}</span>
                            <span>Ngày tạo: {am.createdAt}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {am.valueChange !== 0 && (
                            <div className={`text-[13px] ${am.valueChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {am.valueChange > 0 ? '+' : ''}{formatFullVND(am.valueChange)}
                            </div>
                          )}
                          {am.newEndDate && <div className="text-[11px] text-muted-foreground mt-0.5">Gia hạn → {am.newEndDate}</div>}
                          {am.attachmentName && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600">
                              <Paperclip size={10} /> {am.attachmentName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-[13px]">Chưa có phụ lục nào</div>
            )}

            {showAmendForm && (
              <AmendmentForm
                contractId={contract.id}
                contractCode={contract.contractCode}
                amendCount={amendments.length}
                onSave={(data) => { onAddAmendment(data); setShowAmendForm(false); }}
                onClose={() => setShowAmendForm(false)}
              />
            )}
          </div>
        )}

        {tab === 'linked' && (
          <div className="space-y-4">
            {/* Linked projects */}
            <div>
              <div className="text-[14px] mb-2 flex items-center gap-1"><Briefcase size={16} /> Dự án liên kết ({contractProjects.length})</div>
              {contractProjects.length > 0 ? (
                <div className="space-y-2">
                  {contractProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <div className="text-[13px]">{p.projectName}</div>
                        <div className="text-[11px] text-muted-foreground">{p.projectCode} • Tiến độ: {p.progressPercent}%</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-[13px]">Chưa có dự án liên kết</div>
              )}
            </div>

            {/* Linked invoices */}
            <div>
              <div className="text-[14px] mb-2 flex items-center gap-1"><FileText size={16} /> Hóa đơn ({contractInvoices.length})</div>
              {contractInvoices.length > 0 ? (
                <div className="space-y-2">
                  {contractInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <div className="text-[13px]">{inv.invoiceCode}</div>
                        <div className="text-[11px] text-muted-foreground">Phát hành: {inv.issuedDate} • Tổng: {formatVND(inv.totalAmount)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.outstandingAmount > 0 && <span className="text-[11px] text-red-500">Nợ: {formatVND(inv.outstandingAmount)}</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-[13px]">Chưa có hóa đơn</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ─── Amendment Form ───
function AmendmentForm({ contractId, contractCode, amendCount, onSave, onClose }: {
  contractId: string; contractCode: string; amendCount: number;
  onSave: (data: Omit<ContractAmendment, 'id' | 'createdAt' | 'createdByUserId'>) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    title: '', description: '', valueChange: '0', newEndDate: '', effectiveDate: '', attachmentName: '',
  });
  const amendCode = `PL-${contractCode}-${String(amendCount + 1).padStart(2, '0')}`;

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-purple-50/50 dark:bg-purple-900/10 space-y-3">
      <div className="text-[13px] flex items-center gap-2"><ScrollText size={14} /> Phụ lục mới: <span className="text-purple-600">{amendCode}</span></div>
      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">Tiêu đề *</label>
        <input type="text" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="VD: Bổ sung module báo cáo" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
      </div>
      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">Mô tả</label>
        <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Thay đổi giá trị (VNĐ)</label>
          <input type="number" value={f.valueChange} onChange={e => setF(p => ({ ...p, valueChange: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          <div className="text-[10px] text-muted-foreground mt-0.5">Dương = tăng, Âm = giảm, 0 = không đổi</div>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Ngày hiệu lực *</label>
          <input type="date" value={f.effectiveDate} onChange={e => setF(p => ({ ...p, effectiveDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
      </div>
      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">Gia hạn đến ngày (nếu có)</label>
        <input type="date" value={f.newEndDate} onChange={e => setF(p => ({ ...p, newEndDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
      </div>
      <div>
        <label className="block text-[12px] text-muted-foreground mb-1">Tệp đính kèm</label>
        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50">
          <Upload size={14} className="text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">{f.attachmentName || 'Chọn tệp...'}</span>
          <input type="file" className="hidden" onChange={e => {
            const file = e.target.files?.[0];
            if (file) setF(p => ({ ...p, attachmentName: file.name }));
          }} />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-accent">Huỷ</button>
        <button onClick={() => {
          if (!f.title || !f.effectiveDate) { toast.error('Vui lòng điền đầy đủ'); return; }
          onSave({
            contractId, amendmentCode: amendCode, title: f.title, description: f.description,
            valueChange: parseFloat(f.valueChange) || 0, newEndDate: f.newEndDate || undefined,
            effectiveDate: f.effectiveDate, attachmentName: f.attachmentName || undefined,
          });
        }} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[12px]">Tạo phụ lục</button>
      </div>
    </div>
  );
}

// ─── Contract Form Dialog ───
function ContractFormDialog({ contract, onSave, onClose }: {
  contract: Contract | null;
  onSave: (data: Partial<Contract>) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    clientId: contract?.clientId || '',
    contractType: contract?.contractType || 'FIXED_PRICE' as ContractType,
    title: contract?.title || '',
    description: contract?.description || '',
    totalValue: contract?.totalValue ? String(contract.totalValue) : '',
    startDate: contract?.startDate || '',
    endDate: contract?.endDate || '',
  });

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={contract ? 'Cập nhật hợp đồng' : 'Tạo hợp đồng mới'} onClose={onClose} />
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Khách hàng *</label>
          <select value={f.clientId} onChange={e => setF(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">-- Chọn khách hàng --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.shortName} ({c.clientCode})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Tên hợp đồng *</label>
          <input type="text" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="Phát triển hệ thống..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Loại HĐ</label>
            <select value={f.contractType} onChange={e => setF(p => ({ ...p, contractType: e.target.value as ContractType }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Giá trị (VNĐ) *</label>
            <input type="number" value={f.totalValue} onChange={e => setF(p => ({ ...p, totalValue: e.target.value }))} placeholder="1000000000" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Ngày bắt đầu *</label>
            <input type="date" value={f.startDate} onChange={e => setF(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Ngày kết thúc *</label>
            <input type="date" value={f.endDate} onChange={e => setF(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Mô tả</label>
          <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả chi tiết hợp đồng..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-20 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
        <button onClick={() => {
          if (!f.clientId || !f.title || !f.totalValue || !f.startDate || !f.endDate) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
          }
          onSave({
            clientId: f.clientId, contractType: f.contractType, title: f.title,
            description: f.description, totalValue: parseFloat(f.totalValue),
            startDate: f.startDate, endDate: f.endDate,
          });
        }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">{contract ? 'Cập nhật' : 'Tạo HĐ'}</button>
      </div>
    </Overlay>
  );
}

// ─── Shared ───
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
function IB({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-[13px] mt-0.5">{value}</div>
    </div>
  );
}
