'use strict';

const service = require('./clients.service');
const mapper  = require('./clients.mapper');
const {
  successResponse,
  noContentResponse,
  paginatedResponse,
} = require('../../common/utils/response.util');

// ╔══════════════════════════════════════════════════════════╗
// ║  CLIENT                                                  ║
// ╚══════════════════════════════════════════════════════════╝

async function listClients(req, res, next) {
  try {
    const { clients, pagination } = await service.listClients(req.query);
    return paginatedResponse(
      res,
      clients.map(mapper.toClientSummaryDto),
      pagination,
      'Lấy danh sách khách hàng thành công',
    );
  } catch (err) { next(err); }
}

async function getClientById(req, res, next) {
  try {
    const client = await service.getClientById(req.params.id);
    return successResponse(res, mapper.toClientDetailDto(client), 'Lấy thông tin khách hàng thành công');
  } catch (err) { next(err); }
}

async function createClient(req, res, next) {
  try {
    const client = await service.createClient(req.body, req.user.id);
    return successResponse(res, mapper.toClientSummaryDto(client), 'Tạo khách hàng thành công', 201);
  } catch (err) { next(err); }
}

async function updateClient(req, res, next) {
  try {
    const client = await service.updateClient(req.params.id, req.body);
    return successResponse(res, mapper.toClientSummaryDto(client), 'Cập nhật khách hàng thành công');
  } catch (err) { next(err); }
}

async function updateClientStatus(req, res, next) {
  try {
    const client = await service.updateClientStatus(req.params.id, req.body.status);
    return successResponse(res, mapper.toClientSummaryDto(client), 'Cập nhật trạng thái thành công');
  } catch (err) { next(err); }
}

// ── Contacts ──────────────────────────────────────────────────

async function addContact(req, res, next) {
  try {
    const contact = await service.addContact(req.params.id, req.body);
    return successResponse(res, mapper.toContactDto(contact), 'Thêm người liên hệ thành công', 201);
  } catch (err) { next(err); }
}

async function updateContact(req, res, next) {
  try {
    const contact = await service.updateContact(
      req.params.id, req.params.contactId, req.body,
    );
    return successResponse(res, mapper.toContactDto(contact), 'Cập nhật người liên hệ thành công');
  } catch (err) { next(err); }
}

async function deleteContact(req, res, next) {
  try {
    await service.deleteContact(req.params.id, req.params.contactId);
    return noContentResponse(res, 'Xóa người liên hệ thành công');
  } catch (err) { next(err); }
}

async function setPrimaryContact(req, res, next) {
  try {
    await service.setPrimaryContact(req.params.id, req.params.contactId);
    return successResponse(res, null, 'Đặt liên hệ chính thành công');
  } catch (err) { next(err); }
}

// ── Documents ─────────────────────────────────────────────────

async function uploadDocument(req, res, next) {
  try {
    const doc = await service.uploadDocument(req.params.id, req.body, req.user.id);
    return successResponse(res, mapper.toDocumentDto(doc), 'Tải lên tài liệu thành công', 201);
  } catch (err) { next(err); }
}

async function deleteDocument(req, res, next) {
  try {
    await service.deleteDocument(req.params.id, req.params.documentId);
    return noContentResponse(res, 'Xóa tài liệu thành công');
  } catch (err) { next(err); }
}

// ── Analytics ─────────────────────────────────────────────────

/**
 * GET /api/clients/outstanding
 * Danh sách khách hàng còn nợ (outstandingBalance > 0)
 */
async function getOutstandingClients(req, res, next) {
  try {
    const clients = await service.getOutstandingClients();
    return successResponse(
      res,
      clients.map(mapper.toClientFinancialSummaryDto),
      'Lấy danh sách KH còn nợ thành công',
    );
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTRACT                                                ║
// ╚══════════════════════════════════════════════════════════╝

async function listContracts(req, res, next) {
  try {
    const { contracts, pagination } = await service.listContracts(req.query);
    return paginatedResponse(
      res,
      contracts.map(mapper.toContractSummaryDto),
      pagination,
      'Lấy danh sách hợp đồng thành công',
    );
  } catch (err) { next(err); }
}

async function getContractById(req, res, next) {
  try {
    const contract = await service.getContractById(req.params.id);
    return successResponse(res, mapper.toContractDetailDto(contract), 'Lấy thông tin hợp đồng thành công');
  } catch (err) { next(err); }
}

async function createContract(req, res, next) {
  try {
    const contract = await service.createContract(req.body);
    return successResponse(res, mapper.toContractSummaryDto(contract), 'Tạo hợp đồng thành công', 201);
  } catch (err) { next(err); }
}

async function updateContract(req, res, next) {
  try {
    const contract = await service.updateContract(req.params.id, req.body);
    return successResponse(res, mapper.toContractSummaryDto(contract), 'Cập nhật hợp đồng thành công');
  } catch (err) { next(err); }
}

async function updateContractStatus(req, res, next) {
  try {
    const contract = await service.updateContractStatus(req.params.id, req.body);
    return successResponse(res, mapper.toContractSummaryDto(contract), 'Cập nhật trạng thái hợp đồng thành công');
  } catch (err) { next(err); }
}

// ── Amendments ────────────────────────────────────────────────

async function addAmendment(req, res, next) {
  try {
    const amendment = await service.addAmendment(req.params.id, req.body);
    return successResponse(res, mapper.toAmendmentDto(amendment), 'Thêm phụ lục thành công', 201);
  } catch (err) { next(err); }
}

async function updateAmendment(req, res, next) {
  try {
    const amendment = await service.updateAmendment(
      req.params.id, req.params.amendmentId, req.body,
    );
    return successResponse(res, mapper.toAmendmentDto(amendment), 'Cập nhật phụ lục thành công');
  } catch (err) { next(err); }
}

async function deleteAmendment(req, res, next) {
  try {
    await service.deleteAmendment(req.params.id, req.params.amendmentId);
    return noContentResponse(res, 'Xóa phụ lục thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  INVOICE                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listInvoices(req, res, next) {
  try {
    const { invoices, pagination } = await service.listInvoices(req.query);
    return paginatedResponse(
      res,
      invoices.map(mapper.toInvoiceSummaryDto),
      pagination,
      'Lấy danh sách hóa đơn thành công',
    );
  } catch (err) { next(err); }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await service.getInvoiceById(req.params.id);
    return successResponse(res, mapper.toInvoiceDetailDto(invoice), 'Lấy thông tin hóa đơn thành công');
  } catch (err) { next(err); }
}

async function createInvoice(req, res, next) {
  try {
    const invoice = await service.createInvoice(req.body, req.user.id);
    return successResponse(res, mapper.toInvoiceDetailDto(invoice), 'Tạo hóa đơn thành công', 201);
  } catch (err) { next(err); }
}

async function updateInvoice(req, res, next) {
  try {
    const invoice = await service.updateInvoice(req.params.id, req.body);
    return successResponse(res, mapper.toInvoiceDetailDto(invoice), 'Cập nhật hóa đơn thành công');
  } catch (err) { next(err); }
}

async function sendInvoice(req, res, next) {
  try {
    const invoice = await service.sendInvoice(req.params.id);
    return successResponse(res, mapper.toInvoiceSummaryDto(invoice), 'Gửi hóa đơn thành công');
  } catch (err) { next(err); }
}

async function markInvoiceViewed(req, res, next) {
  try {
    const invoice = await service.markInvoiceViewed(req.params.id);
    return successResponse(res, mapper.toInvoiceSummaryDto(invoice), 'Đánh dấu đã xem thành công');
  } catch (err) { next(err); }
}

async function disputeInvoice(req, res, next) {
  try {
    const invoice = await service.disputeInvoice(req.params.id, req.body.reason);
    return successResponse(res, mapper.toInvoiceSummaryDto(invoice), 'Đánh dấu tranh chấp thành công');
  } catch (err) { next(err); }
}

async function cancelInvoice(req, res, next) {
  try {
    const invoice = await service.cancelInvoice(req.params.id);
    return successResponse(res, mapper.toInvoiceSummaryDto(invoice), 'Hủy hóa đơn thành công');
  } catch (err) { next(err); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYMENT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

async function listPayments(req, res, next) {
  try {
    const { payments, pagination } = await service.listPayments(req.query);
    return paginatedResponse(
      res,
      payments.map(mapper.toPaymentDto),
      pagination,
      'Lấy danh sách thanh toán thành công',
    );
  } catch (err) { next(err); }
}

async function getPaymentById(req, res, next) {
  try {
    const payment = await service.getPaymentById(req.params.id);
    return successResponse(res, mapper.toPaymentDto(payment), 'Lấy thông tin thanh toán thành công');
  } catch (err) { next(err); }
}

/**
 * POST /api/clients/payments
 * Ghi nhận thanh toán mới (cascade cập nhật invoice + contract + client)
 */
async function recordPayment(req, res, next) {
  try {
    const payment = await service.recordPayment(req.body, req.user.id);
    return successResponse(
      res,
      mapper.toPaymentDto(payment),
      'Ghi nhận thanh toán thành công',
      201,
    );
  } catch (err) { next(err); }
}

async function updatePayment(req, res, next) {
  try {
    const payment = await service.updatePayment(req.params.id, req.body, req.user.id);
    return successResponse(res, mapper.toPaymentDto(payment), 'Cập nhật thanh toán thành công');
  } catch (err) { next(err); }
}

async function refundPayment(req, res, next) {
  try {
    const payment = await service.refundPayment(req.params.id);
    return successResponse(res, mapper.toPaymentDto(payment), 'Hoàn tiền thành công');
  } catch (err) { next(err); }
}

/**
 * GET /api/clients/revenue?year=2025
 * Doanh thu theo tháng trong năm
 */
async function getRevenueByMonth(req, res, next) {
  try {
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10);
    const data = await service.getRevenueByMonth(year);
    return successResponse(res, data, 'Lấy doanh thu theo tháng thành công');
  } catch (err) { next(err); }
}

module.exports = {
  // Client
  listClients, getClientById, createClient, updateClient, updateClientStatus,
  getOutstandingClients,
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
  getRevenueByMonth,
};
