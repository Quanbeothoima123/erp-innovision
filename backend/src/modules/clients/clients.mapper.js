'use strict';

// ── Client ────────────────────────────────────────────────────

function toClientSummaryDto(c) {
  if (!c) return null;
  return {
    id:           c.id,
    clientCode:   c.clientCode,
    clientType:   c.clientType,
    status:       c.status,
    companyName:  c.companyName,
    shortName:    c.shortName,
    taxCode:      c.taxCode,
    industry:     c.industry,
    website:      c.website,
    email:        c.email,
    phone:        c.phone,
    address:      c.address,
    city:         c.city,
    country:      c.country,
    accountManager: c.accountManager ?? null,
    // Tài chính
    totalContractValue:  _m(c.totalContractValue),
    totalReceivedAmount: _m(c.totalReceivedAmount),
    outstandingBalance:  _m(c.outstandingBalance),
    // Counts
    contactCount:  c._count?.contacts  ?? 0,
    contractCount: c._count?.contracts ?? 0,
    invoiceCount:  c._count?.invoices  ?? 0,
    paymentCount:  c._count?.payments  ?? 0,
    notes:     c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toClientDetailDto(c) {
  if (!c) return null;
  const summary = toClientSummaryDto(c);
  return {
    ...summary,
    contacts:  (c.contacts  ?? []).map(toContactDto),
    documents: (c.documents ?? []).map(toDocumentDto),
  };
}

function toContactDto(ct) {
  if (!ct) return null;
  return {
    id:        ct.id,
    clientId:  ct.clientId,
    fullName:  ct.fullName,
    jobTitle:  ct.jobTitle,
    email:     ct.email,
    phone:     ct.phone,
    isPrimary: ct.isPrimary,
    notes:     ct.notes,
    createdAt: ct.createdAt,
    updatedAt: ct.updatedAt,
  };
}

function toDocumentDto(d) {
  if (!d) return null;
  return {
    id:             d.id,
    documentType:   d.documentType,
    title:          d.title,
    description:    d.description,
    fileUrl:        d.fileUrl,
    fileSize:       d.fileSize,
    mimeType:       d.mimeType,
    isConfidential: d.isConfidential,
    uploadedBy:     d.uploadedByUser ?? null,
    createdAt:      d.createdAt,
    updatedAt:      d.updatedAt,
  };
}

// ── Contract ──────────────────────────────────────────────────

function toContractSummaryDto(c) {
  if (!c) return null;
  const now = new Date();
  const daysLeft = c.endDate
    ? Math.ceil((new Date(c.endDate) - now) / 86_400_000)
    : null;

  return {
    id:            c.id,
    contractCode:  c.contractCode,
    client:        c.client ?? null,
    contractType:  c.contractType,
    status:        c.status,
    title:         c.title,
    description:   c.description,
    totalValue:    _m(c.totalValue),
    currency:      c.currency,
    receivedAmount: _m(c.receivedAmount),
    remainingAmount: _m(c.remainingAmount),
    collectionPercent: _percent(c.receivedAmount, c.totalValue),
    startDate:     c.startDate,
    endDate:       c.endDate,
    daysLeft,
    isExpiringSoon: daysLeft !== null && daysLeft >= 0 && daysLeft <= 30,
    isExpired:     daysLeft !== null && daysLeft < 0 && c.status === 'ACTIVE',
    signedDate:    c.signedDate,
    signedBy:      c.signedBy ?? null,
    terminationDate:   c.terminationDate,
    terminationReason: c.terminationReason,
    fileUrl: c.fileUrl,
    notes:   c.notes,
    invoiceCount:   c._count?.invoices   ?? 0,
    amendmentCount: c._count?.amendments ?? 0,
    paymentCount:   c._count?.payments   ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toContractDetailDto(c) {
  if (!c) return null;
  const summary = toContractSummaryDto(c);
  return {
    ...summary,
    amendments: (c.amendments ?? []).map(toAmendmentDto),
    invoices:   c.invoices ?? [],
  };
}

function toAmendmentDto(a) {
  if (!a) return null;
  return {
    id:            a.id,
    contractId:    a.contractId,
    amendmentCode: a.amendmentCode,
    title:         a.title,
    description:   a.description,
    valueChange:   a.valueChange ? _m(a.valueChange) : null,
    effectiveDate: a.effectiveDate,
    status:        a.status,
    fileUrl:       a.fileUrl,
    createdAt:     a.createdAt,
    updatedAt:     a.updatedAt,
  };
}

// ── Invoice ───────────────────────────────────────────────────

function toInvoiceSummaryDto(inv) {
  if (!inv) return null;
  const now      = new Date();
  const isOverdue = inv.dueDate && new Date(inv.dueDate) < now
    && !['PAID','CANCELLED'].includes(inv.status);

  return {
    id:           inv.id,
    invoiceCode:  inv.invoiceCode,
    client:       inv.client   ?? null,
    contract:     inv.contract ?? null,
    project:      inv.project  ?? null,
    createdBy:    inv.createdBy ?? null,
    status:       inv.status,
    issuedDate:   inv.issuedDate,
    dueDate:      inv.dueDate,
    isOverdue,
    daysOverdue:  isOverdue
      ? Math.floor((now - new Date(inv.dueDate)) / 86_400_000)
      : null,
    subtotal:         _m(inv.subtotal),
    taxAmount:        _m(inv.taxAmount),
    totalAmount:      _m(inv.totalAmount),
    paidAmount:       _m(inv.paidAmount),
    outstandingAmount: _m(inv.outstandingAmount),
    currency:   inv.currency,
    notes:      inv.notes,
    sentAt:     inv.sentAt,
    createdAt:  inv.createdAt,
    updatedAt:  inv.updatedAt,
  };
}

function toInvoiceDetailDto(inv) {
  if (!inv) return null;
  const summary = toInvoiceSummaryDto(inv);
  return {
    ...summary,
    items: (inv.items ?? []).map(toInvoiceItemDto),
  };
}

function toInvoiceItemDto(item) {
  if (!item) return null;
  return {
    id:           item.id,
    description:  item.description,
    quantity:     _n(item.quantity),
    unit:         item.unit,
    unitPrice:    _m(item.unitPrice),
    amount:       _m(item.amount),
    taxRate:      _n(item.taxRate),
    taxAmount:    _m(item.taxAmount),
    totalAmount:  _m(item.totalAmount),
    displayOrder: item.displayOrder,
    notes:        item.notes,
  };
}

// ── Payment ───────────────────────────────────────────────────

function toPaymentDto(p) {
  if (!p) return null;
  return {
    id:           p.id,
    paymentCode:  p.paymentCode,
    client:       p.client   ?? null,
    contract:     p.contract ?? null,
    invoice:      p.invoice  ?? null,
    confirmedBy:  p.confirmedByUser ?? null,
    amount:       _m(p.amount),
    currency:     p.currency,
    exchangeRate: _n(p.exchangeRate),
    amountInVnd:  _m(p.amountInVnd),
    paymentDate:  p.paymentDate,
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    status:       p.status,
    receivedBankName:      p.receivedBankName,
    receivedAccountNumber: p.receivedAccountNumber,
    notes:        p.notes,
    receiptUrl:   p.receiptUrl,
    confirmedAt:  p.confirmedAt,
    createdAt:    p.createdAt,
    updatedAt:    p.updatedAt,
  };
}

// ── Dashboard summary ─────────────────────────────────────────

function toClientFinancialSummaryDto(c) {
  return {
    id:           c.id,
    clientCode:   c.clientCode,
    companyName:  c.companyName,
    shortName:    c.shortName,
    outstandingBalance: _m(c.outstandingBalance),
    currency:     c.currency ?? 'VND',
  };
}

// ── Helpers ───────────────────────────────────────────────────

function _m(val) {
  if (val == null) return 0;
  return Math.round(Number(val));
}

function _n(val) {
  if (val == null) return 0;
  return Math.round(Number(val) * 100) / 100;
}

function _percent(numerator, denominator) {
  const d = Number(denominator ?? 0);
  if (d === 0) return null;
  return Math.round((Number(numerator ?? 0) / d) * 10000) / 100;
}

module.exports = {
  toClientSummaryDto, toClientDetailDto,
  toContactDto, toDocumentDto,
  toContractSummaryDto, toContractDetailDto, toAmendmentDto,
  toInvoiceSummaryDto, toInvoiceDetailDto, toInvoiceItemDto,
  toPaymentDto,
  toClientFinancialSummaryDto,
};
