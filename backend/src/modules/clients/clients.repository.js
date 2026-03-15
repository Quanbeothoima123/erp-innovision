'use strict';

const { prisma } = require('../../config/db');

// ──────────────────────────────────────────────────────────────
// INCLUDES
// ──────────────────────────────────────────────────────────────

const CLIENT_SUMMARY_INCLUDE = {
  accountManager: { select: { id: true, fullName: true, avatarUrl: true } },
  _count: {
    select: { contacts: true, contracts: true, invoices: true, payments: true },
  },
};

const CLIENT_DETAIL_INCLUDE = {
  ...CLIENT_SUMMARY_INCLUDE,
  contacts:  { orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }] },
  documents: {
    include: { uploadedByUser: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  },
};

const CONTRACT_INCLUDE = {
  client:   { select: { id: true, clientCode: true, companyName: true, shortName: true } },
  signedBy: { select: { id: true, fullName: true } },
  _count:   { select: { invoices: true, amendments: true, payments: true } },
};

const CONTRACT_DETAIL_INCLUDE = {
  ...CONTRACT_INCLUDE,
  amendments: { orderBy: { effectiveDate: 'asc' } },
  invoices:   {
    select: { id: true, invoiceCode: true, status: true, totalAmount: true, outstandingAmount: true, dueDate: true },
    orderBy: { issuedDate: 'desc' },
  },
};

const INVOICE_INCLUDE = {
  client:    { select: { id: true, clientCode: true, companyName: true, shortName: true } },
  contract:  { select: { id: true, contractCode: true, title: true } },
  project:   { select: { id: true, projectCode: true, projectName: true } },
  createdBy: { select: { id: true, fullName: true } },
  items:     { orderBy: { displayOrder: 'asc' } },
};

const PAYMENT_INCLUDE = {
  client:          { select: { id: true, clientCode: true, companyName: true, shortName: true } },
  contract:        { select: { id: true, contractCode: true, title: true } },
  invoice:         { select: { id: true, invoiceCode: true, status: true, totalAmount: true } },
  confirmedByUser: { select: { id: true, fullName: true } },
};

// ╔══════════════════════════════════════════════════════════╗
// ║  CLIENT                                                  ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyClients({
  search, status, clientType, managerId,
  sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip  = (page - 1) * limit;
  const where = {
    ...(search && {
      OR: [
        { companyName: { contains: search } },
        { shortName:   { contains: search } },
        { clientCode:  { contains: search } },
        { email:       { contains: search } },
        { taxCode:     { contains: search } },
        { industry:    { contains: search } },
      ],
    }),
    ...(status     && { status }),
    ...(clientType && { clientType }),
    ...(managerId  && { accountManagerUserId: managerId }),
  };

  const [total, clients] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      include: CLIENT_SUMMARY_INCLUDE,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { clients, total };
}

async function findClientById(id) {
  return prisma.client.findUnique({ where: { id }, include: CLIENT_DETAIL_INCLUDE });
}

async function findClientByCode(clientCode) {
  return prisma.client.findUnique({ where: { clientCode } });
}

async function createClient(data) {
  return prisma.client.create({ data, include: CLIENT_SUMMARY_INCLUDE });
}

async function updateClient(id, data) {
  return prisma.client.update({ where: { id }, data, include: CLIENT_SUMMARY_INCLUDE });
}

/**
 * Tính lại tài chính client từ DB (không cộng/trừ thủ công).
 * Gọi sau mỗi payment thêm/xoá.
 */
async function recalcClientFinancials(clientId) {
  const [contractAgg, paymentAgg] = await Promise.all([
    prisma.contract.aggregate({
      where: { clientId, status: { notIn: ['TERMINATED','CANCELLED'] } },
      _sum: { totalValue: true },
    }),
    prisma.clientPayment.aggregate({
      where: { clientId, status: 'COMPLETED' },
      _sum: { amountInVnd: true },
    }),
  ]);

  const totalContractValue  = Number(contractAgg._sum.totalValue ?? 0);
  const totalReceivedAmount = Number(paymentAgg._sum.amountInVnd ?? 0);
  const outstandingBalance  = Math.max(0, totalContractValue - totalReceivedAmount);

  return prisma.client.update({
    where: { id: clientId },
    data:  { totalContractValue, totalReceivedAmount, outstandingBalance },
  });
}

// ── ClientContact ─────────────────────────────────────────────

async function findContactById(id) {
  return prisma.clientContact.findUnique({ where: { id } });
}

async function createContact(data) {
  return prisma.clientContact.create({ data });
}

async function updateContact(id, data) {
  return prisma.clientContact.update({ where: { id }, data });
}

async function deleteContact(id) {
  return prisma.clientContact.delete({ where: { id } });
}

/** Bỏ tất cả isPrimary=true trước khi set primary mới */
async function setPrimaryContact(clientId, contactId) {
  return prisma.$transaction([
    prisma.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } }),
    prisma.clientContact.update({ where: { id: contactId }, data: { isPrimary: true } }),
  ]);
}

// ── ClientDocument ────────────────────────────────────────────

async function createDocument(data) {
  return prisma.clientDocument.create({
    data,
    include: { uploadedByUser: { select: { id: true, fullName: true } } },
  });
}

async function deleteDocument(id) {
  return prisma.clientDocument.delete({ where: { id } });
}

async function findDocumentById(id) {
  return prisma.clientDocument.findUnique({ where: { id } });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTRACT                                                ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyContracts({
  clientId, status, contractType, expiringDays,
  sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip  = (page - 1) * limit;
  const where = {
    ...(clientId     && { clientId }),
    ...(status       && { status }),
    ...(contractType && { contractType }),
    ...(expiringDays && {
      endDate: {
        gte: new Date(),
        lte: (() => { const d = new Date(); d.setDate(d.getDate() + expiringDays); return d; })(),
      },
      status: 'ACTIVE',
    }),
  };

  const [total, contracts] = await prisma.$transaction([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: CONTRACT_INCLUDE,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { contracts, total };
}

async function findContractById(id) {
  return prisma.contract.findUnique({ where: { id }, include: CONTRACT_DETAIL_INCLUDE });
}

async function findContractByCode(contractCode) {
  return prisma.contract.findUnique({ where: { contractCode } });
}

async function createContract(data) {
  return prisma.contract.create({ data, include: CONTRACT_INCLUDE });
}

async function updateContract(id, data) {
  return prisma.contract.update({ where: { id }, data, include: CONTRACT_INCLUDE });
}

/** Tính lại receivedAmount + remainingAmount của contract */
async function recalcContractFinancials(contractId) {
  const agg = await prisma.clientPayment.aggregate({
    where: { contractId, status: 'COMPLETED' },
    _sum: { amountInVnd: true },
  });
  const received  = Number(agg._sum.amountInVnd ?? 0);
  const contract  = await prisma.contract.findUnique({ where: { id: contractId }, select: { totalValue: true } });
  const remaining = Math.max(0, Number(contract.totalValue) - received);

  return prisma.contract.update({
    where: { id: contractId },
    data:  { receivedAmount: received, remainingAmount: remaining },
  });
}

// ── ContractAmendment ─────────────────────────────────────────

async function findAmendmentById(id) {
  return prisma.contractAmendment.findUnique({ where: { id } });
}

async function createAmendment(data) {
  return prisma.contractAmendment.create({ data });
}

async function updateAmendment(id, data) {
  return prisma.contractAmendment.update({ where: { id }, data });
}

async function deleteAmendment(id) {
  return prisma.contractAmendment.delete({ where: { id } });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  INVOICE                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyInvoices({
  clientId, contractId, projectId, status, overdueOnly,
  fromDate, toDate,
  sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip  = (page - 1) * limit;
  const now   = new Date();
  const where = {
    ...(clientId   && { clientId }),
    ...(contractId && { contractId }),
    ...(projectId  && { projectId }),
    ...(status     && { status }),
    ...(overdueOnly && {
      dueDate: { lt: now },
      status:  { notIn: ['PAID','CANCELLED'] },
    }),
    ...(fromDate && toDate
      ? { issuedDate: { gte: fromDate, lte: toDate } }
      : fromDate ? { issuedDate: { gte: fromDate } }
      : toDate   ? { issuedDate: { lte: toDate } }
      : {}),
  };

  const [total, invoices] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { ...INVOICE_INCLUDE, items: false },  // summary không cần items
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { invoices, total };
}

async function findInvoiceById(id) {
  return prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
}

async function findInvoiceByCode(invoiceCode) {
  return prisma.invoice.findUnique({ where: { invoiceCode } });
}

async function upsertInvoiceWithItems(invoiceData, items, existingId) {
  return prisma.$transaction(async (tx) => {
    let invoice;
    if (existingId) {
      invoice = await tx.invoice.update({ where: { id: existingId }, data: invoiceData });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existingId } });
    } else {
      invoice = await tx.invoice.create({ data: invoiceData });
    }
    if (items.length > 0) {
      await tx.invoiceItem.createMany({
        data: items.map(it => ({ ...it, invoiceId: invoice.id })),
      });
    }
    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INVOICE_INCLUDE });
  });
}

async function updateInvoice(id, data) {
  return prisma.invoice.update({ where: { id }, data, include: INVOICE_INCLUDE });
}

/**
 * Tính lại paidAmount + outstandingAmount + status của invoice
 * dựa trên tổng payments COMPLETED gắn với invoice đó.
 */
async function recalcInvoiceAmounts(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { totalAmount: true, status: true },
  });
  if (!invoice) return;

  const agg = await prisma.clientPayment.aggregate({
    where: { invoiceId, status: 'COMPLETED' },
    _sum:  { amountInVnd: true },
  });

  const paid        = Number(agg._sum.amountInVnd ?? 0);
  const total       = Number(invoice.totalAmount);
  const outstanding = Math.max(0, total - paid);

  let status = invoice.status;
  if (outstanding <= 0) {
    status = 'PAID';
  } else if (paid > 0 && outstanding > 0) {
    status = 'PARTIALLY_PAID';
  } else if (new Date() > new Date() && ['SENT','VIEWED'].includes(status)) {
    // overdue check handled separately
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data:  { paidAmount: paid, outstandingAmount: outstanding, status },
  });
}

/** Cập nhật OVERDUE cho invoice quá hạn chưa thanh toán */
async function markOverdueInvoices() {
  return prisma.invoice.updateMany({
    where: {
      dueDate: { lt: new Date() },
      status:  { in: ['SENT','VIEWED','PARTIALLY_PAID'] },
    },
    data: { status: 'OVERDUE' },
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYMENT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function findManyPayments({
  clientId, contractId, invoiceId, status, method,
  fromDate, toDate, sortOrder = 'desc', page = 1, limit = 20,
}) {
  const skip  = (page - 1) * limit;
  const where = {
    ...(clientId   && { clientId }),
    ...(contractId && { contractId }),
    ...(invoiceId  && { invoiceId }),
    ...(status     && { status }),
    ...(method     && { paymentMethod: method }),
    ...(fromDate && toDate
      ? { paymentDate: { gte: fromDate, lte: toDate } }
      : fromDate ? { paymentDate: { gte: fromDate } }
      : toDate   ? { paymentDate: { lte: toDate } }
      : {}),
  };

  const [total, payments] = await prisma.$transaction([
    prisma.clientPayment.count({ where }),
    prisma.clientPayment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { paymentDate: sortOrder },
      skip,
      take: limit,
    }),
  ]);
  return { payments, total };
}

async function findPaymentById(id) {
  return prisma.clientPayment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
}

async function findPaymentByCode(paymentCode) {
  return prisma.clientPayment.findUnique({ where: { paymentCode } });
}

async function createPayment(data) {
  return prisma.clientPayment.create({ data, include: PAYMENT_INCLUDE });
}

async function updatePayment(id, data) {
  return prisma.clientPayment.update({ where: { id }, data, include: PAYMENT_INCLUDE });
}

// ── Revenue summary (dùng cho Reports sau) ───────────────────

async function getRevenueByMonth(year) {
  return prisma.clientPayment.groupBy({
    by: ['paymentDate'],
    where: {
      status: 'COMPLETED',
      paymentDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
    },
    _sum: { amountInVnd: true },
    _count: { id: true },
  });
}

async function getOutstandingByClient() {
  return prisma.client.findMany({
    where: { outstandingBalance: { gt: 0 } },
    select: {
      id: true, clientCode: true, companyName: true, shortName: true,
      outstandingBalance: true, currency: true,
    },
    orderBy: { outstandingBalance: 'desc' },
  });
}

module.exports = {
  // Client
  findManyClients, findClientById, findClientByCode,
  createClient, updateClient, recalcClientFinancials,
  // Contact
  findContactById, createContact, updateContact, deleteContact, setPrimaryContact,
  // Document
  createDocument, deleteDocument, findDocumentById,
  // Contract
  findManyContracts, findContractById, findContractByCode,
  createContract, updateContract, recalcContractFinancials,
  // Amendment
  findAmendmentById, createAmendment, updateAmendment, deleteAmendment,
  // Invoice
  findManyInvoices, findInvoiceById, findInvoiceByCode,
  upsertInvoiceWithItems, updateInvoice,
  recalcInvoiceAmounts, markOverdueInvoices,
  // Payment
  findManyPayments, findPaymentById, findPaymentByCode,
  createPayment, updatePayment,
  // Analytics
  getRevenueByMonth, getOutstandingByClient,
};
