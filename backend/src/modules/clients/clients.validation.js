"use strict";

const { z } = require("zod");

const pg = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ╔══════════════════════════════════════════════════════════╗
// ║  CLIENT                                                  ║
// ╚══════════════════════════════════════════════════════════╝

const listClientsSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["PROSPECT", "ACTIVE", "INACTIVE", "BLACKLISTED"]).optional(),
  clientType: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT", "NGO"]).optional(),
  managerId: z.string().optional(),
  ...pg,
  sortBy: z
    .enum([
      "companyName",
      "createdAt",
      "totalContractValue",
      "outstandingBalance",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createClientSchema = z.object({
  clientType: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT", "NGO"], {
    required_error: "Loại khách hàng là bắt buộc",
  }),
  status: z
    .enum(["PROSPECT", "ACTIVE", "INACTIVE", "BLACKLISTED"])
    .default("PROSPECT"),
  companyName: z
    .string({ required_error: "Tên công ty là bắt buộc" })
    .min(2)
    .max(255)
    .trim(),
  shortName: z.string().max(100).trim().optional().nullable(),
  taxCode: z.string().max(50).trim().optional().nullable(),
  industry: z.string().max(100).trim().optional().nullable(),
  website: z.string().url("URL không hợp lệ").max(2048).optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).default("Vietnam"),
  accountManagerUserId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateClientSchema = createClientSchema.partial();

const updateClientStatusSchema = z.object({
  status: z.enum(["PROSPECT", "ACTIVE", "INACTIVE", "BLACKLISTED"], {
    required_error: "Trạng thái là bắt buộc",
  }),
});

// ── ClientContact ─────────────────────────────────────────────

const createContactSchema = z.object({
  fullName: z
    .string({ required_error: "Họ tên là bắt buộc" })
    .min(2)
    .max(191)
    .trim(),
  jobTitle: z.string().max(100).optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

const updateContactSchema = createContactSchema.partial();

// ── ClientDocument ────────────────────────────────────────────

const uploadDocumentSchema = z.object({
  documentType: z
    .string({ required_error: "Loại tài liệu là bắt buộc" })
    .max(50),
  title: z
    .string({ required_error: "Tiêu đề là bắt buộc" })
    .min(2)
    .max(255)
    .trim(),
  description: z.string().max(2000).optional().nullable(),
  fileUrl: z.string({ required_error: "URL file là bắt buộc" }).url().max(2048),
  fileSize: z.coerce.number().int().positive().optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  isConfidential: z.boolean().default(false),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  CONTRACT                                                ║
// ╚══════════════════════════════════════════════════════════╝

const listContractsSchema = z.object({
  clientId: z.string().optional(),
  status: z
    .enum([
      "DRAFT",
      "PENDING_SIGN",
      "ACTIVE",
      "COMPLETED",
      "TERMINATED",
      "SUSPENDED",
      "EXPIRED",
    ])
    .optional(),
  contractType: z
    .enum([
      "FIXED_PRICE",
      "TIME_AND_MATERIAL",
      "RETAINER",
      "MILESTONE_BASED",
      "MIXED",
    ])
    .optional(),
  expiringDays: z.coerce.number().int().min(1).max(365).optional(),
  ...pg,
  sortBy: z
    .enum(["startDate", "endDate", "createdAt", "totalValue"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Tách base object để có thể dùng .partial() / .omit() sau này
const _contractBase = z.object({
  clientId: z.string({ required_error: "Khách hàng là bắt buộc" }),
  contractType: z.enum(
    [
      "FIXED_PRICE",
      "TIME_AND_MATERIAL",
      "RETAINER",
      "MILESTONE_BASED",
      "MIXED",
    ],
    { required_error: "Loại hợp đồng là bắt buộc" },
  ),
  title: z
    .string({ required_error: "Tiêu đề hợp đồng là bắt buộc" })
    .min(2)
    .max(255)
    .trim(),
  description: z.string().max(5000).optional().nullable(),
  totalValue: z.coerce
    .number({ required_error: "Giá trị hợp đồng là bắt buộc" })
    .min(0),
  currency: z.string().max(10).default("VND"),
  startDate: z.coerce.date({ required_error: "Ngày bắt đầu là bắt buộc" }),
  endDate: z.coerce.date({ required_error: "Ngày kết thúc là bắt buộc" }),
  signedDate: z.coerce.date().optional().nullable(),
  signedByUserId: z.string().optional().nullable(),
  fileUrl: z
    .string()
    .url("URL file không hợp lệ")
    .max(2048)
    .optional()
    .nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const createContractSchema = _contractBase.refine(
  (d) => d.endDate >= d.startDate,
  { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["endDate"] },
);

const updateContractSchema = _contractBase
  .partial()
  .omit({ clientId: true })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endDate"],
  });

const updateContractStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING_SIGN",
    "ACTIVE",
    "COMPLETED",
    "TERMINATED",
    "SUSPENDED",
    "EXPIRED",
  ]),
  terminationDate: z.coerce.date().optional().nullable(),
  terminationReason: z.string().max(2000).optional().nullable(),
});

// ── ContractAmendment ─────────────────────────────────────────

const createAmendmentSchema = z.object({
  amendmentCode: z
    .string({ required_error: "Mã phụ lục là bắt buộc" })
    .max(50)
    .trim(),
  title: z
    .string({ required_error: "Tiêu đề là bắt buộc" })
    .min(2)
    .max(255)
    .trim(),
  description: z.string().max(5000).optional().nullable(),
  valueChange: z.coerce.number().optional().nullable(),
  effectiveDate: z.coerce.date({ required_error: "Ngày hiệu lực là bắt buộc" }),
  status: z
    .enum(["DRAFT", "PENDING_SIGN", "SIGNED", "REJECTED"])
    .default("DRAFT"),
  fileUrl: z.string().url().max(2048).optional().nullable(),
});

const updateAmendmentSchema = createAmendmentSchema.partial();

// ╔══════════════════════════════════════════════════════════╗
// ║  INVOICE                                                 ║
// ╚══════════════════════════════════════════════════════════╝

const listInvoicesSchema = z.object({
  clientId: z.string().optional(),
  contractId: z.string().optional(),
  projectId: z.string().optional(),
  status: z
    .enum([
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "DISPUTED",
      "CANCELLED",
    ])
    .optional(),
  overdueOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  ...pg,
  sortBy: z
    .enum([
      "issuedDate",
      "dueDate",
      "createdAt",
      "totalAmount",
      "outstandingAmount",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const invoiceItemSchema = z.object({
  description: z
    .string({ required_error: "Mô tả dòng hóa đơn là bắt buộc" })
    .min(2)
    .max(500),
  quantity: z.coerce
    .number({ required_error: "Số lượng là bắt buộc" })
    .positive(),
  unit: z.string().max(50).optional().nullable(),
  unitPrice: z.coerce.number({ required_error: "Đơn giá là bắt buộc" }).min(0),
  taxRate: z.coerce.number().min(0).max(1).default(0.1),
  displayOrder: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

// Tách base object tương tự cho invoice
const _invoiceBase = z.object({
  clientId: z.string({ required_error: "Khách hàng là bắt buộc" }),
  contractId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  issuedDate: z.coerce.date({ required_error: "Ngày phát hành là bắt buộc" }),
  dueDate: z.coerce.date({ required_error: "Ngày đến hạn là bắt buộc" }),
  currency: z.string().max(10).default("VND"),
  notes: z.string().max(5000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "Hóa đơn phải có ít nhất 1 dòng"),
});

const createInvoiceSchema = _invoiceBase.refine(
  (d) => d.dueDate >= d.issuedDate,
  { message: "Ngày đến hạn phải sau ngày phát hành", path: ["dueDate"] },
);

const updateInvoiceSchema = z.object({
  issuedDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  contractId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1).optional(),
});

const sendInvoiceSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

const disputeInvoiceSchema = z.object({
  reason: z
    .string({ required_error: "Lý do tranh chấp là bắt buộc" })
    .min(10)
    .max(2000),
});

// ╔══════════════════════════════════════════════════════════╗
// ║  PAYMENT                                                 ║
// ╚══════════════════════════════════════════════════════════╝

const listPaymentsSchema = z.object({
  clientId: z.string().optional(),
  contractId: z.string().optional(),
  invoiceId: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  method: z
    .enum(["BANK_TRANSFER", "CASH", "CHECK", "CREDIT_CARD", "ONLINE", "CRYPTO"])
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  ...pg,
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const _paymentBase = z.object({
  clientId: z.string({ required_error: "Khách hàng là bắt buộc" }),
  contractId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  amount: z.coerce
    .number({ required_error: "Số tiền là bắt buộc" })
    .positive("Số tiền phải lớn hơn 0"),
  currency: z.string().max(10).default("VND"),
  exchangeRate: z.coerce.number().positive().default(1),
  paymentDate: z.coerce.date({ required_error: "Ngày thanh toán là bắt buộc" }),
  paymentMethod: z.enum(
    ["BANK_TRANSFER", "CASH", "CHECK", "CREDIT_CARD", "ONLINE", "CRYPTO"],
    { required_error: "Phương thức thanh toán là bắt buộc" },
  ),
  referenceNumber: z.string().max(100).optional().nullable(),
  receivedBankName: z.string().max(191).optional().nullable(),
  receivedAccountNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  receiptUrl: z.string().url().max(2048).optional().nullable(),
});

const recordPaymentSchema = _paymentBase;

const updatePaymentSchema = _paymentBase.partial().omit({ clientId: true });

module.exports = {
  listClientsSchema,
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
  createContactSchema,
  updateContactSchema,
  uploadDocumentSchema,
  listContractsSchema,
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  createAmendmentSchema,
  updateAmendmentSchema,
  listInvoicesSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  sendInvoiceSchema,
  disputeInvoiceSchema,
  listPaymentsSchema,
  recordPaymentSchema,
  updatePaymentSchema,
};
