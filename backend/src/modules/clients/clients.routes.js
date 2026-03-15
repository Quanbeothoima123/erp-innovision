'use strict';

const { Router } = require('express');
const ctrl = require('./clients.controller');
const { validate }             = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES }               = require('../../config/constants');
const v                       = require('./clients.validation');

const router = Router();
router.use(authenticate);

// Roles có quyền quản lý clients/contracts/invoices/payments
const CAN_MANAGE = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTANT];

// ╔══════════════════════════════════════════════════════════╗
// ║  ANALYTICS (đặt trước các param routes)                 ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET /api/clients/outstanding   — Danh sách KH còn nợ
 * GET /api/clients/revenue       — Doanh thu theo tháng (?year=2025)
 */
router.get('/outstanding', authorize(...CAN_MANAGE), ctrl.getOutstandingClients);
router.get('/revenue',     authorize(...CAN_MANAGE), ctrl.getRevenueByMonth);

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYMENTS (cross-resource — đặt trước /:id)             ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/clients/payments           — Tất cả thanh toán (filter by clientId/invoiceId/contractId)
 * POST /api/clients/payments           — Ghi nhận thanh toán mới
 * GET  /api/clients/payments/:id       — Chi tiết thanh toán
 * PATCH /api/clients/payments/:id      — Cập nhật thanh toán
 * POST /api/clients/payments/:id/refund — Hoàn tiền
 */
router.get(
  '/payments',
  authorize(...CAN_MANAGE),
  validate(v.listPaymentsSchema, 'query'),
  ctrl.listPayments,
);
router.post(
  '/payments',
  authorize(...CAN_MANAGE),
  validate(v.recordPaymentSchema),
  ctrl.recordPayment,
);
router.get('/payments/:id',  authorize(...CAN_MANAGE), ctrl.getPaymentById);
router.patch(
  '/payments/:id',
  authorize(...CAN_MANAGE),
  validate(v.updatePaymentSchema),
  ctrl.updatePayment,
);
router.post('/payments/:id/refund', authorize(ROLES.ADMIN, ROLES.ACCOUNTANT), ctrl.refundPayment);

// ╔══════════════════════════════════════════════════════════╗
// ║  INVOICES (cross-resource)                               ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/clients/invoices                    — Tất cả hóa đơn
 * POST /api/clients/invoices                    — Tạo hóa đơn mới
 * GET  /api/clients/invoices/:id                — Chi tiết (kèm items)
 * PATCH /api/clients/invoices/:id               — Cập nhật (chỉ DRAFT)
 * POST /api/clients/invoices/:id/send           — Gửi hóa đơn → SENT
 * POST /api/clients/invoices/:id/mark-viewed    — Đánh dấu đã xem → VIEWED
 * POST /api/clients/invoices/:id/dispute        — Tranh chấp → DISPUTED
 * POST /api/clients/invoices/:id/cancel         — Hủy → CANCELLED
 */
router.get(
  '/invoices',
  authorize(...CAN_MANAGE),
  validate(v.listInvoicesSchema, 'query'),
  ctrl.listInvoices,
);
router.post(
  '/invoices',
  authorize(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER),
  validate(v.createInvoiceSchema),
  ctrl.createInvoice,
);
router.get('/invoices/:id', authorize(...CAN_MANAGE), ctrl.getInvoiceById);
router.patch(
  '/invoices/:id',
  authorize(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER),
  validate(v.updateInvoiceSchema),
  ctrl.updateInvoice,
);
router.post(
  '/invoices/:id/send',
  authorize(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER),
  validate(v.sendInvoiceSchema),
  ctrl.sendInvoice,
);
router.post('/invoices/:id/mark-viewed', authorize(...CAN_MANAGE), ctrl.markInvoiceViewed);
router.post(
  '/invoices/:id/dispute',
  authorize(...CAN_MANAGE),
  validate(v.disputeInvoiceSchema),
  ctrl.disputeInvoice,
);
router.post('/invoices/:id/cancel', authorize(ROLES.ADMIN, ROLES.ACCOUNTANT), ctrl.cancelInvoice);

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTRACTS (cross-resource — trước /:id)                ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/clients/contracts              — Danh sách hợp đồng (filter clientId, status, expiringDays)
 * POST /api/clients/contracts              — Tạo hợp đồng mới
 * GET  /api/clients/contracts/:id          — Chi tiết + amendments + invoices
 * PATCH /api/clients/contracts/:id         — Cập nhật
 * PATCH /api/clients/contracts/:id/status  — Chuyển trạng thái (state machine)
 *
 * POST  /api/clients/contracts/:id/amendments              — Thêm phụ lục
 * PATCH /api/clients/contracts/:id/amendments/:amendmentId — Cập nhật phụ lục
 * DELETE /api/clients/contracts/:id/amendments/:amendmentId — Xóa phụ lục (chỉ DRAFT)
 */
router.get(
  '/contracts',
  authorize(...CAN_MANAGE),
  validate(v.listContractsSchema, 'query'),
  ctrl.listContracts,
);
router.post(
  '/contracts',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
  validate(v.createContractSchema),
  ctrl.createContract,
);
router.get('/contracts/:id',   authorize(...CAN_MANAGE), ctrl.getContractById);
router.patch(
  '/contracts/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
  validate(v.updateContractSchema),
  ctrl.updateContract,
);
router.patch(
  '/contracts/:id/status',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(v.updateContractStatusSchema),
  ctrl.updateContractStatus,
);

// Amendments (nested under contracts)
router.post(
  '/contracts/:id/amendments',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(v.createAmendmentSchema),
  ctrl.addAmendment,
);
router.patch(
  '/contracts/:id/amendments/:amendmentId',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(v.updateAmendmentSchema),
  ctrl.updateAmendment,
);
router.delete(
  '/contracts/:id/amendments/:amendmentId',
  authorize(ROLES.ADMIN),
  ctrl.deleteAmendment,
);

// ╔══════════════════════════════════════════════════════════╗
// ║  CLIENT CRUD + nested resources                         ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * GET  /api/clients               — Danh sách KH (search, filter status/type)
 * POST /api/clients               — Tạo KH mới
 * GET  /api/clients/:id           — Chi tiết KH (kèm contacts, documents)
 * PATCH /api/clients/:id          — Cập nhật thông tin
 * PATCH /api/clients/:id/status   — Chuyển trạng thái
 *
 * -- Contacts --
 * POST   /api/clients/:id/contacts                       — Thêm liên hệ
 * PATCH  /api/clients/:id/contacts/:contactId             — Cập nhật liên hệ
 * DELETE /api/clients/:id/contacts/:contactId             — Xóa liên hệ
 * POST   /api/clients/:id/contacts/:contactId/set-primary — Đặt làm liên hệ chính
 *
 * -- Documents --
 * POST   /api/clients/:id/documents                      — Tải lên tài liệu
 * DELETE /api/clients/:id/documents/:documentId           — Xóa tài liệu
 */
router.get(
  '/',
  authorize(...CAN_MANAGE),
  validate(v.listClientsSchema, 'query'),
  ctrl.listClients,
);
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
  validate(v.createClientSchema),
  ctrl.createClient,
);
router.get('/:id',   authorize(...CAN_MANAGE), ctrl.getClientById);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
  validate(v.updateClientSchema),
  ctrl.updateClient,
);
router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
  validate(v.updateClientStatusSchema),
  ctrl.updateClientStatus,
);

// Contacts
router.post(
  '/:id/contacts',
  authorize(...CAN_MANAGE),
  validate(v.createContactSchema),
  ctrl.addContact,
);
router.patch(
  '/:id/contacts/:contactId',
  authorize(...CAN_MANAGE),
  validate(v.updateContactSchema),
  ctrl.updateContact,
);
router.delete('/:id/contacts/:contactId', authorize(...CAN_MANAGE), ctrl.deleteContact);
router.post('/:id/contacts/:contactId/set-primary', authorize(...CAN_MANAGE), ctrl.setPrimaryContact);

// Documents
router.post(
  '/:id/documents',
  authorize(...CAN_MANAGE),
  validate(v.uploadDocumentSchema),
  ctrl.uploadDocument,
);
router.delete('/:id/documents/:documentId', authorize(ROLES.ADMIN, ROLES.MANAGER), ctrl.deleteDocument);

module.exports = router;
