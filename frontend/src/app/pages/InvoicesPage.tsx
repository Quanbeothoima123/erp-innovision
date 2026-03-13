import { useState, useMemo } from 'react';
import {
  invoices as initialInvoices, clientPayments as initialPayments,
  getClientById, getContractById, formatVND, formatFullVND,
  clients, contracts, projects, users,
} from '../data/mockData';
import type { Invoice, InvoiceStatus, ClientPayment } from '../data/mockData';
import {
  Search, Plus, X, Edit2, Eye, Send, CheckCircle2, Clock, AlertTriangle,
  DollarSign, FileText, ArrowRight, CreditCard, Calendar, Building,
  Receipt, Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ─── Constants ──────────────────────────────────────────────
const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISPUTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
};
const statusLabels: Record<string, string> = {
  DRAFT: 'Nháp', SENT: 'Đã gửi', VIEWED: 'Đã xem', PARTIALLY_PAID: 'Trả một phần',
  PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn', DISPUTED: 'Tranh chấp', CANCELLED: 'Huỷ',
};

// Status workflow
const invTransitions: Record<string, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['VIEWED', 'CANCELLED'],
  VIEWED: [],
  PARTIALLY_PAID: [],
  PAID: [],
  OVERDUE: [],
  DISPUTED: [],
  CANCELLED: [],
};

const paymentMethods = [
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
  { value: 'E_WALLET', label: 'Ví điện tử' },
];

// ═══════════════════════════════════════════════════════════════
// INVOICES PAGE
// ═══════════════════════════════════════════════════════════════
export function InvoicesPage() {
  const { can, currentUser } = useAuth();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const canManage = can('ADMIN', 'ACCOUNTANT', 'SALES', 'MANAGER');

  let filtered = allInvoices;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(inv => {
      const client = getClientById(inv.clientId);
      return inv.invoiceCode.toLowerCase().includes(s) || client?.shortName.toLowerCase().includes(s) || (inv.notes?.toLowerCase().includes(s));
    });
  }
  if (statusFilter) filtered = filtered.filter(inv => inv.status === statusFilter);
  if (clientFilter) filtered = filtered.filter(inv => inv.clientId === clientFilter);

  const hasFilters = search || statusFilter || clientFilter;

  // Summary
  const totalAmount = filtered.reduce((s, inv) => s + inv.totalAmount, 0);
  const totalPaid = filtered.reduce((s, inv) => s + inv.paidAmount, 0);
  const totalOutstanding = filtered.reduce((s, inv) => s + inv.outstandingAmount, 0);
  const overdueCount = filtered.filter(inv => inv.status === 'OVERDUE').length;

  const handleSave = (data: Partial<Invoice>) => {
    if (editInvoice) {
      setAllInvoices(prev => prev.map(inv => inv.id === editInvoice.id ? { ...inv, ...data } : inv));
      if (selectedInvoice?.id === editInvoice.id) setSelectedInvoice(prev => prev ? { ...prev, ...data } : null);
      toast.success('Đã cập nhật hóa đơn');
    } else {
      const code = `INV-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(3, '0')}`;
      const sub = data.subtotal || 0;
      const tax = data.taxAmount || 0;
      const total = sub + tax;
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`, invoiceCode: code,
        clientId: data.clientId || '', contractId: data.contractId || '',
        projectId: data.projectId || '',
        status: 'DRAFT', issuedDate: new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate || '',
        subtotal: sub, taxAmount: tax, totalAmount: total,
        paidAmount: 0, outstandingAmount: total,
        notes: data.notes,
      };
      setAllInvoices(prev => [newInvoice, ...prev]);
      toast.success(`Đã tạo hóa đơn ${code}`);
    }
    setShowForm(false);
    setEditInvoice(null);
  };

  const handleStatusChange = (invId: string, newStatus: InvoiceStatus) => {
    setAllInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, status: newStatus } : inv));
    if (selectedInvoice?.id === invId) setSelectedInvoice(prev => prev ? { ...prev, status: newStatus } : null);
    toast.success(`Đã chuyển trạng thái → ${statusLabels[newStatus]}`);
  };

  const openEdit = (inv: Invoice) => { setEditInvoice(inv); setShowForm(true); };
  const openCreate = () => { setEditInvoice(null); setShowForm(true); };
  const openDetail = (inv: Invoice) => setSelectedInvoice(inv);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Hóa đơn</h1>
        {canManage && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700"><Plus size={16} /> Tạo HĐ</button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><DollarSign size={12} /> Tổng giá trị</div>
          <div className="text-[20px] mt-1">{formatVND(totalAmount)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><CheckCircle2 size={12} /> Đã thu</div>
          <div className="text-[20px] mt-1 text-green-600">{formatVND(totalPaid)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock size={12} /> Chưa thu</div>
          <div className={`text-[20px] mt-1 ${totalOutstanding > 0 ? 'text-red-500' : ''}`}>{formatVND(totalOutstanding)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle size={12} /> Quá hạn</div>
          <div className={`text-[20px] mt-1 ${overdueCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{overdueCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm mã HĐ, khách hàng, ghi chú..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả TT</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả KH</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setClientFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Mã HĐ</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Khách hàng</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Phát hành</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Hạn TT</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Tổng tiền</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Đã trả</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Còn nợ</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
                <th className="text-center px-4 py-3 text-[12px] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const client = getClientById(inv.clientId);
                const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className={`border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${isOverdue && inv.status !== 'OVERDUE' ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}>
                    <td className="px-4 py-3 text-[13px]">{inv.invoiceCode}</td>
                    <td className="px-4 py-3 text-[13px]">{client?.shortName}</td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{inv.issuedDate}</td>
                    <td className={`px-4 py-3 text-[13px] hidden md:table-cell ${isOverdue ? 'text-red-500' : ''}`}>{inv.dueDate}</td>
                    <td className="px-4 py-3 text-[13px] text-right">{formatVND(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-[13px] text-right text-green-600 hidden sm:table-cell">{formatVND(inv.paidAmount)}</td>
                    <td className="px-4 py-3 text-[13px] text-right hidden lg:table-cell">{inv.outstandingAmount > 0 ? <span className="text-red-500">{formatVND(inv.outstandingAmount)}</span> : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>{statusLabels[inv.status]}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openDetail(inv)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Eye size={14} /></button>
                        {canManage && inv.status === 'DRAFT' && (
                          <button onClick={() => openEdit(inv)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
                        )}
                        {canManage && inv.status === 'DRAFT' && (
                          <button onClick={() => handleStatusChange(inv.id, 'SENT')} className="p-1 rounded hover:bg-accent text-blue-600" title="Gửi"><Send size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy hóa đơn</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} hóa đơn</div>
      </div>

      {/* Detail Dialog */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          canManage={canManage}
          onClose={() => setSelectedInvoice(null)}
          onStatusChange={(st) => handleStatusChange(selectedInvoice.id, st)}
          onEdit={() => openEdit(selectedInvoice)}
        />
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <InvoiceFormDialog
          invoice={editInvoice}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
        />
      )}
    </div>
  );
}

// ─── Invoice Detail Dialog ───
function InvoiceDetailDialog({ invoice, canManage, onClose, onStatusChange, onEdit }: {
  invoice: Invoice; canManage: boolean; onClose: () => void;
  onStatusChange: (st: InvoiceStatus) => void; onEdit: () => void;
}) {
  const client = getClientById(invoice.clientId);
  const contract = getContractById(invoice.contractId);
  const prj = projects.find(p => p.id === invoice.projectId);
  const payments = initialPayments.filter(p => p.invoiceId === invoice.id);
  const available = invTransitions[invoice.status] || [];
  const paidPct = invoice.totalAmount > 0 ? Math.round((invoice.paidAmount / invoice.totalAmount) * 100) : 0;

  return (
    <Overlay onClose={onClose} wide>
      <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px]">{invoice.invoiceCode}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[invoice.status]}`}>{statusLabels[invoice.status]}</span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{client?.companyName} • {contract?.contractCode || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && invoice.status === 'DRAFT' && <button onClick={onEdit} className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"><Edit2 size={12} /> Sửa</button>}
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={18} /></button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <IB icon={<Calendar size={12} />} label="Ngày phát hành" value={invoice.issuedDate} />
          <IB icon={<Calendar size={12} />} label="Hạn thanh toán" value={invoice.dueDate} />
          <IB label="Khách hàng" value={client?.shortName || '—'} />
          {contract && <IB label="Hợp đồng" value={contract.contractCode} />}
          {prj && <IB label="Dự án" value={prj.projectName} />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">Trước thuế</div>
            <div className="text-[16px] mt-1">{formatFullVND(invoice.subtotal)}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">Thuế VAT</div>
            <div className="text-[16px] mt-1">{formatFullVND(invoice.taxAmount)}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">Tổng cộng</div>
            <div className="text-[16px] mt-1">{formatFullVND(invoice.totalAmount)}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <div className="text-[11px] text-muted-foreground">Đã trả</div>
            <div className="text-[16px] mt-1 text-green-600">{formatFullVND(invoice.paidAmount)}</div>
          </div>
        </div>

        {/* Payment progress */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="text-[13px] mb-2">Tiến độ thanh toán</div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${paidPct >= 100 ? 'bg-green-500' : paidPct > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(paidPct, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[12px] text-muted-foreground mt-1">
            <span>{paidPct}% đã thanh toán</span>
            {invoice.outstandingAmount > 0 && <span className="text-red-500">Còn nợ: {formatFullVND(invoice.outstandingAmount)}</span>}
          </div>
        </div>

        {/* Payments history */}
        {payments.length > 0 && (
          <div>
            <div className="text-[14px] mb-2 flex items-center gap-1"><CreditCard size={16} /> Lịch sử thanh toán</div>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <div className="text-[13px]">{p.paymentCode}</div>
                    <div className="text-[11px] text-muted-foreground">{p.paymentDate} • {paymentMethods.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] text-green-600">{formatFullVND(p.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{p.referenceNumber}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Ghi chú</div>
            <div className="text-[13px]">{invoice.notes}</div>
          </div>
        )}

        {/* Status workflow */}
        {canManage && available.length > 0 && (
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="text-[13px] mb-2">Chuyển trạng thái</div>
            <div className="flex flex-wrap gap-2">
              {available.map(st => (
                <button key={st} onClick={() => onStatusChange(st)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] border border-border hover:bg-accent transition-colors">
                  {st === 'SENT' ? <Send size={12} /> : st === 'CANCELLED' ? <X size={12} /> : <ArrowRight size={12} />}
                  {statusLabels[st]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ─── Invoice Form Dialog ───
function InvoiceFormDialog({ invoice, onSave, onClose }: {
  invoice: Invoice | null;
  onSave: (data: Partial<Invoice>) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    clientId: invoice?.clientId || '',
    contractId: invoice?.contractId || '',
    projectId: invoice?.projectId || '',
    subtotal: invoice?.subtotal ? String(invoice.subtotal) : '',
    taxPercent: invoice ? String(Math.round((invoice.taxAmount / invoice.subtotal) * 100)) : '10',
    dueDate: invoice?.dueDate || '',
    notes: invoice?.notes || '',
  });

  const clientContracts = f.clientId ? contracts.filter(c => c.clientId === f.clientId) : [];
  const clientProjects = f.clientId ? projects.filter(p => p.clientId === f.clientId) : [];
  const sub = parseFloat(f.subtotal) || 0;
  const taxPct = parseFloat(f.taxPercent) || 0;
  const taxAmt = sub * (taxPct / 100);
  const total = sub + taxAmt;

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title={invoice ? 'Cập nhật hóa đơn' : 'Tạo hóa đơn mới'} onClose={onClose} />
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Khách hàng *</label>
          <select value={f.clientId} onChange={e => setF(p => ({ ...p, clientId: e.target.value, contractId: '', projectId: '' }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">-- Chọn khách hàng --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
          </select>
        </div>
        {clientContracts.length > 0 && (
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Hợp đồng</label>
            <select value={f.contractId} onChange={e => setF(p => ({ ...p, contractId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">-- Chọn hợp đồng --</option>
              {clientContracts.map(c => <option key={c.id} value={c.id}>{c.contractCode} — {c.title}</option>)}
            </select>
          </div>
        )}
        {clientProjects.length > 0 && (
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Dự án</label>
            <select value={f.projectId} onChange={e => setF(p => ({ ...p, projectId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">-- Chọn dự án --</option>
              {clientProjects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Số tiền trước thuế (VNĐ) *</label>
            <input type="number" value={f.subtotal} onChange={e => setF(p => ({ ...p, subtotal: e.target.value }))} placeholder="500000000" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Thuế VAT (%)</label>
            <input type="number" value={f.taxPercent} onChange={e => setF(p => ({ ...p, taxPercent: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        {sub > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
            <div><div className="text-[10px] text-muted-foreground">Trước thuế</div><div className="text-[13px]">{formatVND(sub)}</div></div>
            <div><div className="text-[10px] text-muted-foreground">VAT ({taxPct}%)</div><div className="text-[13px]">{formatVND(taxAmt)}</div></div>
            <div><div className="text-[10px] text-muted-foreground">Tổng cộng</div><div className="text-[13px] text-green-600">{formatVND(total)}</div></div>
          </div>
        )}
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Hạn thanh toán *</label>
          <input type="date" value={f.dueDate} onChange={e => setF(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Ghi chú</label>
          <textarea value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú hóa đơn..." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px] h-16 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
        <button onClick={() => {
          if (!f.clientId || !sub || !f.dueDate) { toast.error('Vui lòng điền đầy đủ thông tin bắt buộc'); return; }
          onSave({
            clientId: f.clientId, contractId: f.contractId, projectId: f.projectId,
            subtotal: sub, taxAmount: taxAmt, totalAmount: total, dueDate: f.dueDate,
            notes: f.notes || undefined,
          });
        }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700">{invoice ? 'Cập nhật' : 'Tạo HĐ'}</button>
      </div>
    </Overlay>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS PAGE
// ═══════════════════════════════════════════════════════════════
export function PaymentsPage() {
  const { can, currentUser } = useAuth();
  const [payments, setPayments] = useState<ClientPayment[]>(initialPayments);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const canManage = can('ADMIN', 'ACCOUNTANT', 'SALES', 'MANAGER');

  let filtered = payments;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(p => {
      const client = getClientById(p.clientId);
      return p.paymentCode.toLowerCase().includes(s) || client?.shortName.toLowerCase().includes(s) || p.referenceNumber.toLowerCase().includes(s);
    });
  }
  if (clientFilter) filtered = filtered.filter(p => p.clientId === clientFilter);

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  // Outstanding balances per client
  const balances = useMemo(() => {
    return clients.map(c => {
      const clientInvoices = initialInvoices.filter(inv => inv.clientId === c.id);
      const totalInv = clientInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
      const totalPaid = clientInvoices.reduce((s, inv) => s + inv.paidAmount, 0);
      const outstanding = totalInv - totalPaid;
      const overdueInv = clientInvoices.filter(inv => inv.status === 'OVERDUE');
      return { client: c, totalInv, totalPaid, outstanding, overdueCount: overdueInv.length };
    }).filter(b => b.totalInv > 0);
  }, []);

  const handleAdd = (data: { clientId: string; contractId: string; invoiceId: string; amount: number; paymentDate: string; paymentMethod: string; referenceNumber: string }) => {
    const code = `TT-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`;
    const newPayment: ClientPayment = {
      id: `cp-${Date.now()}`, paymentCode: code,
      ...data, status: 'COMPLETED',
    };
    setPayments(prev => [newPayment, ...prev]);
    setShowAdd(false);
    toast.success(`Đã ghi nhận thanh toán ${code}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[20px]">Thanh toán</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBalance(!showBalance)} className={`px-4 py-2 rounded-lg text-[13px] flex items-center gap-1 border ${showBalance ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>
            <Receipt size={16} /> Công nợ
          </button>
          {canManage && (
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] flex items-center gap-1 hover:bg-blue-700">
              <Banknote size={16} /> Ghi nhận TT
            </button>
          )}
        </div>
      </div>

      {/* Total card */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center"><DollarSign size={24} className="text-green-600" /></div>
        <div>
          <div className="text-[11px] text-muted-foreground">Tổng đã thu</div>
          <div className="text-[24px] text-green-600">{formatFullVND(totalReceived)}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] text-muted-foreground">Số giao dịch</div>
          <div className="text-[20px]">{payments.length}</div>
        </div>
      </div>

      {/* Outstanding Balances */}
      {showBalance && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50 text-[14px] flex items-center gap-1"><Receipt size={16} /> Bảng công nợ khách hàng</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-[12px] text-muted-foreground">Khách hàng</th>
                  <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">Tổng HĐ</th>
                  <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">Đã TT</th>
                  <th className="text-right px-4 py-2 text-[12px] text-muted-foreground">Còn nợ</th>
                  <th className="text-center px-4 py-2 text-[12px] text-muted-foreground">Quá hạn</th>
                  <th className="text-center px-4 py-2 text-[12px] text-muted-foreground">% Thu</th>
                </tr>
              </thead>
              <tbody>
                {balances.map(b => {
                  const paidPct = b.totalInv > 0 ? Math.round((b.totalPaid / b.totalInv) * 100) : 0;
                  return (
                    <tr key={b.client.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="text-[13px]">{b.client.shortName}</div>
                        <div className="text-[11px] text-muted-foreground">{b.client.clientCode}</div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-right">{formatVND(b.totalInv)}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-green-600">{formatVND(b.totalPaid)}</td>
                      <td className="px-4 py-3 text-[13px] text-right">{b.outstanding > 0 ? <span className="text-red-500">{formatVND(b.outstanding)}</span> : '—'}</td>
                      <td className="px-4 py-3 text-center">{b.overdueCount > 0 ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{b.overdueCount}</span> : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${paidPct >= 100 ? 'bg-green-500' : paidPct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(paidPct, 100)}%` }} />
                          </div>
                          <span className="text-[11px]">{paidPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Tìm mã TT, KH, mã tham chiếu..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
        </div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
          <option value="">Tất cả KH</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
        </select>
        {(search || clientFilter) && (
          <button onClick={() => { setSearch(''); setClientFilter(''); }} className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-accent">Xoá lọc</button>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Mã TT</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Khách hàng</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Hóa đơn</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">Ngày</th>
                <th className="text-right px-4 py-3 text-[12px] text-muted-foreground">Số tiền</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">Phương thức</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">Mã tham chiếu</th>
                <th className="text-left px-4 py-3 text-[12px] text-muted-foreground">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const client = getClientById(p.clientId);
                const inv = initialInvoices.find(i => i.id === p.invoiceId);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-[13px]">{p.paymentCode}</td>
                    <td className="px-4 py-3 text-[13px]">{client?.shortName}</td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{inv?.invoiceCode || '—'}</td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">{p.paymentDate}</td>
                    <td className="px-4 py-3 text-[13px] text-right text-green-600">{formatFullVND(p.amount)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="text-[11px] px-2 py-0.5 rounded bg-muted">{paymentMethods.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}</span></td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{p.referenceNumber}</td>
                    <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{p.status === 'COMPLETED' ? 'Hoàn tất' : p.status}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-[13px]">Không tìm thấy thanh toán</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-[12px] text-muted-foreground border-t border-border">{filtered.length} thanh toán</div>
      </div>

      {/* Add Payment Dialog */}
      {showAdd && (
        <AddPaymentDialog onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// ─── Add Payment Dialog ───
function AddPaymentDialog({ onSave, onClose }: {
  onSave: (data: { clientId: string; contractId: string; invoiceId: string; amount: number; paymentDate: string; paymentMethod: string; referenceNumber: string }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    clientId: '', invoiceId: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER', referenceNumber: '',
  });

  const clientInvoices = f.clientId
    ? initialInvoices.filter(inv => inv.clientId === f.clientId && inv.outstandingAmount > 0 && inv.status !== 'CANCELLED')
    : [];
  const selectedInv = initialInvoices.find(inv => inv.id === f.invoiceId);
  const selectedContract = selectedInv ? selectedInv.contractId : '';

  return (
    <Overlay onClose={onClose}>
      <DlgHeader title="Ghi nhận thanh toán" onClose={onClose} />
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Khách hàng *</label>
          <select value={f.clientId} onChange={e => setF(p => ({ ...p, clientId: e.target.value, invoiceId: '' }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
            <option value="">-- Chọn khách hàng --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
          </select>
        </div>
        {clientInvoices.length > 0 && (
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Hóa đơn *</label>
            <select value={f.invoiceId} onChange={e => setF(p => ({ ...p, invoiceId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              <option value="">-- Chọn hóa đơn --</option>
              {clientInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceCode} — Tổng: {formatVND(inv.totalAmount)} — Nợ: {formatVND(inv.outstandingAmount)}
                </option>
              ))}
            </select>
            {selectedInv && (
              <div className="bg-muted/50 rounded-lg p-2 mt-1 text-[12px]">
                Tổng: {formatFullVND(selectedInv.totalAmount)} • Đã TT: {formatFullVND(selectedInv.paidAmount)} • <span className="text-red-500">Còn nợ: {formatFullVND(selectedInv.outstandingAmount)}</span>
              </div>
            )}
          </div>
        )}
        {f.clientId && clientInvoices.length === 0 && (
          <div className="text-center py-3 text-muted-foreground text-[12px] bg-muted/50 rounded-lg">Không có hóa đơn cần thanh toán cho KH này</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Số tiền (VNĐ) *</label>
            <input type="number" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} placeholder={selectedInv ? String(selectedInv.outstandingAmount) : '0'} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Ngày thanh toán *</label>
            <input type="date" value={f.paymentDate} onChange={e => setF(p => ({ ...p, paymentDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Phương thức</label>
            <select value={f.paymentMethod} onChange={e => setF(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]">
              {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Mã tham chiếu</label>
            <input type="text" value={f.referenceNumber} onChange={e => setF(p => ({ ...p, referenceNumber: e.target.value }))} placeholder="VD: VCB25030100001" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[13px]" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-[13px] hover:bg-accent">Huỷ</button>
        <button onClick={() => {
          const amt = parseFloat(f.amount);
          if (!f.clientId || !f.invoiceId || !amt || !f.paymentDate) { toast.error('Vui lòng điền đầy đủ'); return; }
          onSave({
            clientId: f.clientId, contractId: selectedContract,
            invoiceId: f.invoiceId, amount: amt,
            paymentDate: f.paymentDate, paymentMethod: f.paymentMethod,
            referenceNumber: f.referenceNumber || `REF-${Date.now()}`,
          });
        }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] hover:bg-green-700">Ghi nhận</button>
      </div>
    </Overlay>
  );
}

// ─── Shared ───
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
      <div className="text-[13px] mt-0.5">{value}</div>
    </div>
  );
}
