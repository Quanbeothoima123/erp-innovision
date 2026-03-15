'use strict';

const repo   = require('./clients.repository');
const { AppError } = require('../../common/errors/AppError');
const { prisma }   = require('../../config/db');

// ╔══════════════════════════════════════════════════════════╗
// ║  CLIENT                                                  ║
// ╚══════════════════════════════════════════════════════════╝

async function listClients(filters) {
  const { clients, total } = await repo.findManyClients(filters);
  return { clients, pagination: _page(filters, total) };
}

async function getClientById(id) {
  const client = await repo.findClientById(id);
  if (!client) throw AppError.notFound('Không tìm thấy khách hàng.');
  return client;
}

async function createClient(dto, createdByUserId) {
  // Auto-generate clientCode nếu không truyền vào
  let clientCode = dto.clientCode ?? null;
  if (!clientCode) {
    const count = await prisma.client.count();
    clientCode  = `KH${String(count + 1).padStart(4, '0')}`;
  } else {
    const dup = await repo.findClientByCode(clientCode);
    if (dup) throw AppError.conflict(`Mã KH '${clientCode}' đã tồn tại.`);
  }

  return repo.createClient({
    clientCode,
    clientType:   dto.clientType,
    status:       dto.status ?? 'PROSPECT',
    companyName:  dto.companyName,
    shortName:    dto.shortName ?? null,
    taxCode:      dto.taxCode   ?? null,
    industry:     dto.industry  ?? null,
    website:      dto.website   ?? null,
    email:        dto.email     ?? null,
    phone:        dto.phone     ?? null,
    address:      dto.address   ?? null,
    city:         dto.city      ?? null,
    country:      dto.country   ?? 'Vietnam',
    accountManagerUserId: dto.accountManagerUserId ?? createdByUserId,
    notes:        dto.notes     ?? null,
    totalContractValue:  0,
    totalReceivedAmount: 0,
    outstandingBalance:  0,
  });
}

async function updateClient(id, dto) {
  await _assertClientExists(id);
  return repo.updateClient(id, _clean(dto));
}

async function updateClientStatus(id, status) {
  await _assertClientExists(id);
  return repo.updateClient(id, { status });
}

// ── Contacts ──────────────────────────────────────────────────

async function addContact(clientId, dto) {
  await _assertClientExists(clientId);

  // Nếu là contact đầu tiên → tự động là primary
  const existing = await prisma.clientContact.count({ where: { clientId } });
  const isPrimary = dto.isPrimary || existing === 0;

  if (isPrimary) {
    await prisma.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } });
  }

  return repo.createContact({ ...dto, clientId, isPrimary });
}

async function updateContact(clientId, contactId, dto) {
  const contact = await repo.findContactById(contactId);
  if (!contact || contact.clientId !== clientId) {
    throw AppError.notFound('Không tìm thấy người liên hệ.');
  }

  if (dto.isPrimary) {
    await prisma.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } });
  }

  return repo.updateContact(contactId, _clean(dto));
}

async function deleteContact(clientId, contactId) {
  const contact = await repo.findContactById(contactId);
  if (!contact || contact.clientId !== clientId) {
    throw AppError.notFound('Không tìm thấy người liên hệ.');
  }
  await repo.deleteContact(contactId);
}

async function setPrimaryContact(clientId, contactId) {
  const contact = await repo.findContactById(contactId);
  if (!contact || contact.clientId !== clientId) {
    throw AppError.notFound('Không tìm thấy người liên hệ.');
  }
  await repo.setPrimaryContact(clientId, contactId);
}

// ── Documents ─────────────────────────────────────────────────

async function uploadDocument(clientId, dto, uploadedByUserId) {
  await _assertClientExists(clientId);
  return repo.createDocument({ ...dto, clientId, uploadedByUserId });
}

async function deleteDocument(clientId, documentId) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc || doc.clientId !== clientId) {
    throw AppError.notFound('Không tìm thấy tài liệu.');
  }
  await repo.deleteDocument(documentId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTRACT                                                ║
// ╚══════════════════════════════════════════════════════════╝

async function listContracts(filters) {
  const { contracts, total } = await repo.findManyContracts(filters);
  return { contracts, pagination: _page(filters, total) };
}

async function getContractById(id) {
  const c = await repo.findContractById(id);
  if (!c) throw AppError.notFound('Không tìm thấy hợp đồng.');
  return c;
}

async function createContract(dto) {
  await _assertClientExists(dto.clientId);

  // Auto-generate contractCode
  const count = await prisma.contract.count();
  const contractCode = `HD${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const contract = await repo.createContract({
    contractCode,
    clientId:      dto.clientId,
    contractType:  dto.contractType,
    status:        'DRAFT',
    title:         dto.title,
    description:   dto.description   ?? null,
    totalValue:    dto.totalValue,
    currency:      dto.currency      ?? 'VND',
    receivedAmount:  0,
    remainingAmount: dto.totalValue,
    startDate:     _date(dto.startDate),
    endDate:       _date(dto.endDate),
    signedDate:    dto.signedDate    ? _date(dto.signedDate) : null,
    signedByUserId: dto.signedByUserId ?? null,
    fileUrl:       dto.fileUrl       ?? null,
    notes:         dto.notes         ?? null,
  });

  // Tính lại tài chính client
  await repo.recalcClientFinancials(dto.clientId);
  return contract;
}

async function updateContract(id, dto) {
  const contract = await _assertContractExists(id);

  if (['COMPLETED','TERMINATED'].includes(contract.status) && !dto.notes && !dto.fileUrl) {
    throw AppError.badRequest('Hợp đồng đã kết thúc. Chỉ có thể cập nhật ghi chú và file.');
  }

  const data = _clean({
    contractType:   dto.contractType,
    title:          dto.title,
    description:    dto.description,
    totalValue:     dto.totalValue,
    currency:       dto.currency,
    startDate:      dto.startDate ? _date(dto.startDate) : undefined,
    endDate:        dto.endDate   ? _date(dto.endDate)   : undefined,
    signedDate:     dto.signedDate ? _date(dto.signedDate) : undefined,
    signedByUserId: dto.signedByUserId,
    fileUrl:        dto.fileUrl,
    notes:          dto.notes,
  });

  const updated = await repo.updateContract(id, data);

  // Nếu totalValue thay đổi → recalc
  if (dto.totalValue !== undefined) {
    await repo.recalcContractFinancials(id);
    await repo.recalcClientFinancials(contract.clientId);
  }

  return updated;
}

async function updateContractStatus(id, dto) {
  const contract = await _assertContractExists(id);

  const VALID_TRANSITIONS = {
    DRAFT:        ['PENDING_SIGN','ACTIVE','CANCELLED'],
    PENDING_SIGN: ['ACTIVE','REJECTED','DRAFT'],
    ACTIVE:       ['COMPLETED','TERMINATED','SUSPENDED','EXPIRED'],
    SUSPENDED:    ['ACTIVE','TERMINATED'],
    COMPLETED:    [],
    TERMINATED:   [],
    EXPIRED:      ['ACTIVE'],
  };

  const allowed = VALID_TRANSITIONS[contract.status] ?? [];
  if (!allowed.includes(dto.status)) {
    throw AppError.badRequest(
      `Không thể chuyển từ '${contract.status}' sang '${dto.status}'.`,
    );
  }

  const updated = await repo.updateContract(id, _clean({
    status:            dto.status,
    terminationDate:   dto.terminationDate ? _date(dto.terminationDate) : undefined,
    terminationReason: dto.terminationReason,
  }));

  await repo.recalcClientFinancials(contract.clientId);
  return updated;
}

// ── Amendments ────────────────────────────────────────────────

async function addAmendment(contractId, dto) {
  const contract = await _assertContractExists(contractId);

  if (['COMPLETED','TERMINATED'].includes(contract.status)) {
    throw AppError.badRequest('Không thể thêm phụ lục cho hợp đồng đã kết thúc.');
  }

  const amendment = await repo.createAmendment({
    contractId,
    amendmentCode: dto.amendmentCode,
    title:         dto.title,
    description:   dto.description   ?? null,
    valueChange:   dto.valueChange   ?? null,
    effectiveDate: _date(dto.effectiveDate),
    status:        dto.status ?? 'DRAFT',
    fileUrl:       dto.fileUrl ?? null,
  });

  // Nếu SIGNED và có valueChange → cập nhật totalValue hợp đồng
  if (dto.status === 'SIGNED' && dto.valueChange) {
    const newValue = Number(contract.totalValue) + Number(dto.valueChange);
    await repo.updateContract(contractId, { totalValue: newValue });
    await repo.recalcContractFinancials(contractId);
    await repo.recalcClientFinancials(contract.clientId);
  }

  return amendment;
}

async function updateAmendment(contractId, amendmentId, dto) {
  const amendment = await repo.findAmendmentById(amendmentId);
  if (!amendment || amendment.contractId !== contractId) {
    throw AppError.notFound('Không tìm thấy phụ lục hợp đồng.');
  }

  const prevStatus = amendment.status;
  const updated    = await repo.updateAmendment(amendmentId, _clean({
    title:         dto.title,
    description:   dto.description,
    valueChange:   dto.valueChange,
    effectiveDate: dto.effectiveDate ? _date(dto.effectiveDate) : undefined,
    status:        dto.status,
    fileUrl:       dto.fileUrl,
  }));

  // Nếu vừa SIGNED (trước đó chưa signed) và có valueChange
  if (dto.status === 'SIGNED' && prevStatus !== 'SIGNED' && dto.valueChange) {
    const contract = await repo.findContractById(contractId);
    const newValue = Number(contract.totalValue) + Number(dto.valueChange);
    await repo.updateContract(contractId, { totalValue: newValue });
    await repo.recalcContractFinancials(contractId);
    await repo.recalcClientFinancials(contract.clientId);
  }

  return updated;
}

async function deleteAmendment(contractId, amendmentId) {
  const amendment = await repo.findAmendmentById(amendmentId);
  if (!amendment || amendment.contractId !== contractId) {
    throw AppError.notFound('Không tìm thấy phụ lục hợp đồng.');
  }
  if (amendment.status === 'SIGNED') {
    throw AppError.badRequest('Không thể xóa phụ lục đã ký.');
  }
  return repo.deleteAmendment(amendmentId);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  INVOICE                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listInvoices(filters) {
  await repo.markOverdueInvoices();
  const { invoices, total } = await repo.findManyInvoices(filters);
  return { invoices, pagination: _page(filters, total) };
}

async function getInvoiceById(id) {
  await repo.markOverdueInvoices();
  const inv = await repo.findInvoiceById(id);
  if (!inv) throw AppError.notFound('Không tìm thấy hóa đơn.');
  return inv;
}

async function createInvoice(dto, createdByUserId) {
  await _assertClientExists(dto.clientId);

  // Auto-generate invoiceCode
  const count       = await prisma.invoice.count();
  const invoiceCode = `INV${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  // Tính subtotal, taxAmount, totalAmount từ items
  const { subtotal, taxAmount, totalAmount, itemsData } = _calcInvoiceTotals(dto.items);

  return repo.upsertInvoiceWithItems(
    {
      invoiceCode,
      clientId:    dto.clientId,
      contractId:  dto.contractId  ?? null,
      projectId:   dto.projectId   ?? null,
      status:      'DRAFT',
      issuedDate:  _date(dto.issuedDate),
      dueDate:     _date(dto.dueDate),
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount:       0,
      outstandingAmount: totalAmount,
      currency:    dto.currency ?? 'VND',
      notes:       dto.notes    ?? null,
      createdByUserId,
    },
    itemsData,
    null,
  );
}

async function updateInvoice(id, dto) {
  const inv = await _assertInvoiceExists(id);

  if (!['DRAFT'].includes(inv.status)) {
    throw AppError.badRequest('Chỉ có thể chỉnh sửa hóa đơn ở trạng thái DRAFT.');
  }

  let updateData = _clean({
    issuedDate: dto.issuedDate ? _date(dto.issuedDate) : undefined,
    dueDate:    dto.dueDate    ? _date(dto.dueDate)    : undefined,
    contractId: dto.contractId,
    projectId:  dto.projectId,
    notes:      dto.notes,
  });

  if (dto.items) {
    const { subtotal, taxAmount, totalAmount, itemsData } = _calcInvoiceTotals(dto.items);
    Object.assign(updateData, { subtotal, taxAmount, totalAmount, outstandingAmount: totalAmount });
    return repo.upsertInvoiceWithItems(updateData, itemsData, id);
  }

  return repo.updateInvoice(id, updateData);
}

/**
 * Gửi hóa đơn cho khách hàng → status SENT
 */
async function sendInvoice(id) {
  const inv = await _assertInvoiceExists(id);
  if (!['DRAFT'].includes(inv.status)) {
    throw AppError.badRequest(`Không thể gửi hóa đơn ở trạng thái '${inv.status}'.`);
  }
  return repo.updateInvoice(id, { status: 'SENT', sentAt: new Date() });
}

/**
 * Đánh dấu đã xem → VIEWED
 */
async function markInvoiceViewed(id) {
  const inv = await _assertInvoiceExists(id);
  if (inv.status !== 'SENT') {
    throw AppError.badRequest('Chỉ hóa đơn SENT mới có thể đánh dấu VIEWED.');
  }
  return repo.updateInvoice(id, { status: 'VIEWED' });
}

/**
 * Đánh dấu tranh chấp → DISPUTED
 */
async function disputeInvoice(id, reason) {
  const inv = await _assertInvoiceExists(id);
  if (['PAID','CANCELLED'].includes(inv.status)) {
    throw AppError.badRequest(`Không thể tranh chấp hóa đơn ở trạng thái '${inv.status}'.`);
  }
  return repo.updateInvoice(id, { status: 'DISPUTED', notes: reason });
}

/**
 * Huỷ hóa đơn → CANCELLED
 */
async function cancelInvoice(id) {
  const inv = await _assertInvoiceExists(id);
  if (['PAID','CANCELLED'].includes(inv.status)) {
    throw AppError.badRequest('Hóa đơn đã thanh toán hoặc đã hủy rồi.');
  }
  const updated = await repo.updateInvoice(id, { status: 'CANCELLED' });
  await repo.recalcClientFinancials(inv.clientId);
  return updated;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYMENT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listPayments(filters) {
  const { payments, total } = await repo.findManyPayments(filters);
  return { payments, pagination: _page(filters, total) };
}

async function getPaymentById(id) {
  const p = await repo.findPaymentById(id);
  if (!p) throw AppError.notFound('Không tìm thấy thanh toán.');
  return p;
}

/**
 * Ghi nhận thanh toán và cascade cập nhật:
 *  1. Tạo ClientPayment
 *  2. Cập nhật Invoice.paidAmount + status (nếu có invoiceId)
 *  3. Cập nhật Contract.receivedAmount + remainingAmount (nếu có contractId)
 *  4. Cập nhật Client.totalReceivedAmount + outstandingBalance
 */
async function recordPayment(dto, confirmedByUserId) {
  await _assertClientExists(dto.clientId);

  if (dto.invoiceId) {
    const inv = await repo.findInvoiceById(dto.invoiceId);
    if (!inv || inv.clientId !== dto.clientId) {
      throw AppError.badRequest('Hóa đơn không thuộc khách hàng này.');
    }
    if (['PAID','CANCELLED'].includes(inv.status)) {
      throw AppError.badRequest(`Hóa đơn đã ở trạng thái '${inv.status}'.`);
    }
  }

  // Auto-generate paymentCode
  const count       = await prisma.clientPayment.count();
  const paymentCode = `PMT${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const amountInVnd = Math.round(dto.amount * (dto.exchangeRate ?? 1));

  const payment = await repo.createPayment({
    paymentCode,
    clientId:     dto.clientId,
    contractId:   dto.contractId  ?? null,
    invoiceId:    dto.invoiceId   ?? null,
    amount:       dto.amount,
    currency:     dto.currency    ?? 'VND',
    exchangeRate: dto.exchangeRate ?? 1,
    amountInVnd,
    paymentDate:  _date(dto.paymentDate),
    paymentMethod: dto.paymentMethod,
    referenceNumber:       dto.referenceNumber      ?? null,
    status:                'COMPLETED',
    receivedBankName:      dto.receivedBankName     ?? null,
    receivedAccountNumber: dto.receivedAccountNumber ?? null,
    notes:                 dto.notes     ?? null,
    receiptUrl:            dto.receiptUrl ?? null,
    confirmedByUserId,
    confirmedAt: new Date(),
  });

  // Cascade cập nhật
  if (dto.invoiceId)  await repo.recalcInvoiceAmounts(dto.invoiceId);
  if (dto.contractId) await repo.recalcContractFinancials(dto.contractId);
  await repo.recalcClientFinancials(dto.clientId);

  return payment;
}

async function updatePayment(id, dto, updatedByUserId) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw AppError.notFound('Không tìm thấy thanh toán.');

  if (payment.status === 'REFUNDED') {
    throw AppError.badRequest('Không thể chỉnh sửa thanh toán đã hoàn tiền.');
  }

  const amountInVnd = dto.amount && dto.exchangeRate
    ? Math.round(dto.amount * dto.exchangeRate)
    : undefined;

  await repo.updatePayment(id, _clean({
    amount:          dto.amount,
    currency:        dto.currency,
    exchangeRate:    dto.exchangeRate,
    amountInVnd,
    paymentDate:     dto.paymentDate ? _date(dto.paymentDate) : undefined,
    paymentMethod:   dto.paymentMethod,
    referenceNumber: dto.referenceNumber,
    notes:           dto.notes,
    receiptUrl:      dto.receiptUrl,
  }));

  // Cascade recalc
  if (payment.invoiceId)  await repo.recalcInvoiceAmounts(payment.invoiceId);
  if (payment.contractId) await repo.recalcContractFinancials(payment.contractId);
  await repo.recalcClientFinancials(payment.clientId);

  return repo.findPaymentById(id);
}

/**
 * Hoàn tiền → status REFUNDED, trừ lại khỏi invoice + contract + client
 */
async function refundPayment(id) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw AppError.notFound('Không tìm thấy thanh toán.');
  if (payment.status === 'REFUNDED') {
    throw AppError.badRequest('Thanh toán đã được hoàn tiền rồi.');
  }

  await repo.updatePayment(id, { status: 'REFUNDED' });

  if (payment.invoiceId)  await repo.recalcInvoiceAmounts(payment.invoiceId);
  if (payment.contractId) await repo.recalcContractFinancials(payment.contractId);
  await repo.recalcClientFinancials(payment.clientId);

  return repo.findPaymentById(id);
}

// ── Analytics ─────────────────────────────────────────────────

async function getOutstandingClients() {
  return repo.getOutstandingByClient();
}

async function getRevenueByMonth(year) {
  return repo.getRevenueByMonth(year);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PRIVATE HELPERS                                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Tính subtotal, taxAmount, totalAmount và itemsData từ mảng items DTO.
 * amount     = quantity × unitPrice
 * taxAmount  = amount × taxRate
 * totalAmount = amount + taxAmount
 */
function _calcInvoiceTotals(itemDtos) {
  let subtotal  = 0;
  let taxAmount = 0;

  const itemsData = itemDtos.map((it, idx) => {
    const amount     = Math.round(it.quantity * it.unitPrice);
    const itemTax    = Math.round(amount * (it.taxRate ?? 0.1));
    const itemTotal  = amount + itemTax;

    subtotal  += amount;
    taxAmount += itemTax;

    return {
      description:  it.description,
      quantity:     it.quantity,
      unit:         it.unit    ?? null,
      unitPrice:    it.unitPrice,
      amount,
      taxRate:      it.taxRate ?? 0.1,
      taxAmount:    itemTax,
      totalAmount:  itemTotal,
      displayOrder: it.displayOrder ?? idx,
      notes:        it.notes ?? null,
    };
  });

  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount, itemsData };
}

async function _assertClientExists(id) {
  const c = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw AppError.notFound('Không tìm thấy khách hàng.');
  return c;
}

async function _assertContractExists(id) {
  const c = await repo.findContractById(id);
  if (!c) throw AppError.notFound('Không tìm thấy hợp đồng.');
  return c;
}

async function _assertInvoiceExists(id) {
  const inv = await repo.findInvoiceById(id);
  if (!inv) throw AppError.notFound('Không tìm thấy hóa đơn.');
  return inv;
}

function _date(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function _page(filters, total) {
  return { page: filters.page ?? 1, limit: filters.limit ?? 20, total };
}

function _clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

module.exports = {
  // Client
  listClients, getClientById, createClient, updateClient, updateClientStatus,
  // Contact
  addContact, updateContact, deleteContact, setPrimaryContact,
  // Document
  uploadDocument, deleteDocument,
  // Contract
  listContracts, getContractById, createContract, updateContract, updateContractStatus,
  // Amendment
  addAmendment, updateAmendment, deleteAmendment,
  // Invoice
  listInvoices, getInvoiceById, createInvoice, updateInvoice,
  sendInvoice, markInvoiceViewed, disputeInvoice, cancelInvoice,
  // Payment
  listPayments, getPaymentById, recordPayment, updatePayment, refundPayment,
  // Analytics
  getOutstandingClients, getRevenueByMonth,
};
