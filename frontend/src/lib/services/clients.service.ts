// ============================================================
// CLIENTS SERVICE — Module 9
// Base: /api/clients/*
// Covers: Clients, Contracts, Invoices, Payments
// ============================================================

import { api } from "../apiClient";

// ─── Enums ────────────────────────────────────────────────────

export type ClientStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | "BLACKLISTED";
export type ClientType = "INDIVIDUAL" | "COMPANY" | "GOVERNMENT" | "NGO";

export type ContractStatus =
  | "DRAFT"
  | "PENDING_SIGN"
  | "ACTIVE"
  | "COMPLETED"
  | "TERMINATED"
  | "SUSPENDED"
  | "EXPIRED";
export type ContractType =
  | "FIXED_PRICE"
  | "TIME_AND_MATERIAL"
  | "RETAINER"
  | "MILESTONE_BASED"
  | "MIXED";
export type AmendmentStatus = "DRAFT" | "PENDING_SIGN" | "SIGNED" | "REJECTED";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "DISPUTED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CASH"
  | "CHECK"
  | "CREDIT_CARD"
  | "ONLINE"
  | "CRYPTO";

// ─── Paginated wrapper ────────────────────────────────────────

export type Paginated<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// ─── DTOs ─────────────────────────────────────────────────────

export interface ApiContact {
  id: string;
  clientId: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocument {
  id: string;
  documentType: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  isConfidential: boolean;
  uploadedBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClient {
  id: string;
  clientCode: string | null;
  clientType: ClientType;
  status: ClientStatus;
  companyName: string;
  shortName: string | null;
  taxCode: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  accountManager: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  totalContractValue: number;
  totalReceivedAmount: number;
  outstandingBalance: number;
  contactCount: number;
  contractCount: number;
  invoiceCount: number;
  paymentCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Detail only
  contacts?: ApiContact[];
  documents?: ApiDocument[];
}

export interface ApiAmendment {
  id: string;
  contractId: string;
  amendmentCode: string;
  title: string;
  description: string | null;
  valueChange: number | null;
  effectiveDate: string;
  status: AmendmentStatus;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiContract {
  id: string;
  contractCode: string | null;
  client: { id: string; companyName: string; shortName?: string | null } | null;
  contractType: ContractType;
  status: ContractStatus;
  title: string;
  description: string | null;
  totalValue: number;
  currency: string;
  receivedAmount: number;
  remainingAmount: number;
  collectionPercent: number | null;
  startDate: string;
  endDate: string;
  daysLeft: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  signedDate: string | null;
  signedBy: { id: string; fullName: string } | null;
  terminationDate: string | null;
  terminationReason: string | null;
  fileUrl: string | null;
  notes: string | null;
  invoiceCount: number;
  amendmentCount: number;
  paymentCount: number;
  createdAt: string;
  updatedAt: string;
  // Detail only
  amendments?: ApiAmendment[];
  invoices?: ApiInvoice[];
}

export interface ApiInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  displayOrder: number;
  notes: string | null;
}

export interface ApiInvoice {
  id: string;
  invoiceCode: string | null;
  client: { id: string; companyName: string; shortName?: string | null } | null;
  contract: { id: string; contractCode: string | null; title: string } | null;
  project: { id: string; projectName: string } | null;
  createdBy: { id: string; fullName: string } | null;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  isOverdue: boolean;
  daysOverdue: number | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  notes: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Detail only
  items?: ApiInvoiceItem[];
}

export interface ApiPayment {
  id: string;
  paymentCode: string | null;
  client: { id: string; companyName: string; shortName?: string | null } | null;
  contract: { id: string; contractCode: string | null; title: string } | null;
  invoice: {
    id: string;
    invoiceCode: string | null;
    totalAmount: number;
  } | null;
  confirmedBy: { id: string; fullName: string } | null;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInVnd: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  status: PaymentStatus;
  receivedBankName: string | null;
  receivedAccountNumber: string | null;
  notes: string | null;
  receiptUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Params ───────────────────────────────────────────────────

export interface ListClientsParams {
  search?: string;
  status?: ClientStatus;
  clientType?: ClientType;
  managerId?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | "companyName"
    | "createdAt"
    | "totalContractValue"
    | "outstandingBalance";
  sortOrder?: "asc" | "desc";
}

export interface ListContractsParams {
  clientId?: string;
  status?: ContractStatus;
  contractType?: ContractType;
  expiringDays?: number;
  page?: number;
  limit?: number;
  sortBy?: "startDate" | "endDate" | "createdAt" | "totalValue";
  sortOrder?: "asc" | "desc";
}

export interface ListInvoicesParams {
  clientId?: string;
  contractId?: string;
  projectId?: string;
  status?: InvoiceStatus;
  overdueOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | "issuedDate"
    | "dueDate"
    | "createdAt"
    | "totalAmount"
    | "outstandingAmount";
  sortOrder?: "asc" | "desc";
}

export interface ListPaymentsParams {
  clientId?: string;
  contractId?: string;
  invoiceId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

// ═══════════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════════

export async function listClients(
  params?: ListClientsParams,
): Promise<Paginated<ApiClient>> {
  return api.get<Paginated<ApiClient>>("/clients", {
    params: params as Record<string, string>,
  });
}

export async function getClientById(id: string): Promise<ApiClient> {
  return api.get<ApiClient>(`/clients/${id}`);
}

export async function createClient(payload: {
  clientType: ClientType;
  companyName: string;
  status?: ClientStatus;
  shortName?: string | null;
  taxCode?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
  accountManagerUserId?: string | null;
  notes?: string | null;
}): Promise<ApiClient> {
  return api.post<ApiClient>("/clients", payload);
}

export async function updateClient(
  id: string,
  payload: Partial<Parameters<typeof createClient>[0]>,
): Promise<ApiClient> {
  return api.patch<ApiClient>(`/clients/${id}`, payload);
}

export async function updateClientStatus(
  id: string,
  status: ClientStatus,
): Promise<ApiClient> {
  return api.patch<ApiClient>(`/clients/${id}/status`, { status });
}

// ── Contacts ──────────────────────────────────────────────────

export async function addContact(
  clientId: string,
  payload: {
    fullName: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary?: boolean;
    notes?: string | null;
  },
): Promise<ApiContact> {
  return api.post<ApiContact>(`/clients/${clientId}/contacts`, payload);
}

export async function updateContact(
  clientId: string,
  contactId: string,
  payload: Partial<Parameters<typeof addContact>[1]>,
): Promise<ApiContact> {
  return api.patch<ApiContact>(
    `/clients/${clientId}/contacts/${contactId}`,
    payload,
  );
}

export async function deleteContact(
  clientId: string,
  contactId: string,
): Promise<void> {
  return api.delete(`/clients/${clientId}/contacts/${contactId}`);
}

export async function setPrimaryContact(
  clientId: string,
  contactId: string,
): Promise<ApiContact> {
  return api.post<ApiContact>(
    `/clients/${clientId}/contacts/${contactId}/set-primary`,
  );
}

// ── Analytics ─────────────────────────────────────────────────

export async function getOutstandingClients(): Promise<
  {
    id: string;
    clientCode: string | null;
    companyName: string;
    shortName: string | null;
    outstandingBalance: number;
    currency: string;
  }[]
> {
  return api.get("/clients/outstanding");
}

export async function getRevenueByMonth(
  year?: number,
): Promise<
  { month: number; year: number; totalRevenue: number; invoiceCount: number }[]
> {
  return api.get("/clients/revenue", {
    params: year ? { year: String(year) } : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════

export async function listContracts(
  params?: ListContractsParams,
): Promise<Paginated<ApiContract>> {
  return api.get<Paginated<ApiContract>>("/clients/contracts", {
    params: params as Record<string, string>,
  });
}

export async function createContract(payload: {
  clientId: string;
  contractType: ContractType;
  title: string;
  description?: string | null;
  totalValue: number;
  currency?: string;
  startDate: string;
  endDate: string;
  signedDate?: string | null;
  signedByUserId?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
}): Promise<ApiContract> {
  return api.post<ApiContract>("/clients/contracts", payload);
}

export async function getContractById(id: string): Promise<ApiContract> {
  return api.get<ApiContract>(`/clients/contracts/${id}`);
}

export async function updateContract(
  id: string,
  payload: Partial<Omit<Parameters<typeof createContract>[0], "clientId">>,
): Promise<ApiContract> {
  return api.patch<ApiContract>(`/clients/contracts/${id}`, payload);
}

export async function updateContractStatus(
  id: string,
  payload: {
    status: ContractStatus;
    terminationDate?: string | null;
    terminationReason?: string | null;
  },
): Promise<ApiContract> {
  return api.patch<ApiContract>(`/clients/contracts/${id}/status`, payload);
}

// ── Amendments ────────────────────────────────────────────────

export async function addAmendment(
  contractId: string,
  payload: {
    amendmentCode: string;
    title: string;
    description?: string | null;
    valueChange?: number | null;
    effectiveDate: string;
    status?: AmendmentStatus;
    fileUrl?: string | null;
  },
): Promise<ApiAmendment> {
  return api.post<ApiAmendment>(
    `/clients/contracts/${contractId}/amendments`,
    payload,
  );
}

export async function updateAmendment(
  contractId: string,
  amendmentId: string,
  payload: Partial<Parameters<typeof addAmendment>[1]>,
): Promise<ApiAmendment> {
  return api.patch<ApiAmendment>(
    `/clients/contracts/${contractId}/amendments/${amendmentId}`,
    payload,
  );
}

export async function deleteAmendment(
  contractId: string,
  amendmentId: string,
): Promise<void> {
  return api.delete(
    `/clients/contracts/${contractId}/amendments/${amendmentId}`,
  );
}

// ═══════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════

export async function listInvoices(
  params?: ListInvoicesParams,
): Promise<Paginated<ApiInvoice>> {
  return api.get<Paginated<ApiInvoice>>("/clients/invoices", {
    params: params as Record<string, string>,
  });
}

export async function createInvoice(payload: {
  clientId: string;
  contractId?: string | null;
  projectId?: string | null;
  issuedDate: string;
  dueDate: string;
  currency?: string;
  notes?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit?: string | null;
    unitPrice: number;
    taxRate?: number;
    displayOrder?: number;
    notes?: string | null;
  }>;
}): Promise<ApiInvoice> {
  return api.post<ApiInvoice>("/clients/invoices", payload);
}

export async function getInvoiceById(id: string): Promise<ApiInvoice> {
  return api.get<ApiInvoice>(`/clients/invoices/${id}`);
}

export async function updateInvoice(
  id: string,
  payload: Partial<Omit<Parameters<typeof createInvoice>[0], "clientId">>,
): Promise<ApiInvoice> {
  return api.patch<ApiInvoice>(`/clients/invoices/${id}`, payload);
}

export async function sendInvoice(
  id: string,
  notes?: string | null,
): Promise<ApiInvoice> {
  return api.post<ApiInvoice>(`/clients/invoices/${id}/send`, {
    notes: notes ?? null,
  });
}

export async function markInvoiceViewed(id: string): Promise<ApiInvoice> {
  return api.post<ApiInvoice>(`/clients/invoices/${id}/mark-viewed`);
}

export async function disputeInvoice(
  id: string,
  reason: string,
): Promise<ApiInvoice> {
  return api.post<ApiInvoice>(`/clients/invoices/${id}/dispute`, { reason });
}

export async function cancelInvoice(id: string): Promise<ApiInvoice> {
  return api.post<ApiInvoice>(`/clients/invoices/${id}/cancel`);
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════

export async function listPayments(
  params?: ListPaymentsParams,
): Promise<Paginated<ApiPayment>> {
  return api.get<Paginated<ApiPayment>>("/clients/payments", {
    params: params as Record<string, string>,
  });
}

export async function recordPayment(payload: {
  clientId: string;
  contractId?: string | null;
  invoiceId?: string | null;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedBankName?: string | null;
  receivedAccountNumber?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}): Promise<ApiPayment> {
  return api.post<ApiPayment>("/clients/payments", payload);
}

export async function getPaymentById(id: string): Promise<ApiPayment> {
  return api.get<ApiPayment>(`/clients/payments/${id}`);
}

export async function updatePayment(
  id: string,
  payload: Partial<Omit<Parameters<typeof recordPayment>[0], "clientId">>,
): Promise<ApiPayment> {
  return api.patch<ApiPayment>(`/clients/payments/${id}`, payload);
}

export async function refundPayment(id: string): Promise<ApiPayment> {
  return api.post<ApiPayment>(`/clients/payments/${id}/refund`);
}
