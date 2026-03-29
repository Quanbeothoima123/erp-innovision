// ============================================================
// MOCK DATA — Extracted from seed.js & schema.prisma
// ============================================================

// ─── Types ──────────────────────────────────────────────────
export type RoleCode =
  | "ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE"
  | "SALES"
  | "ACCOUNTANT";
export type AccountStatus = "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED";
export type EmploymentStatus =
  | "PROBATION"
  | "ACTIVE"
  | "ON_LEAVE"
  | "TERMINATED";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";
export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type ApprovalStepType = "MANAGER" | "HR";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LEAVE"
  | "HOLIDAY"
  | "MANUAL_ADJUSTED";
export type AttendanceRequestType = "CHECK_IN" | "CHECK_OUT";
export type AttendanceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ShiftType =
  | "MORNING"
  | "AFTERNOON"
  | "NIGHT"
  | "FLEXIBLE"
  | "SPLIT";
export type OvertimeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectHealthStatus = "ON_TRACK" | "AT_RISK" | "DELAYED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";
export type PayrollPeriodStatus =
  | "DRAFT"
  | "CALCULATING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";
export type ClientType = "INDIVIDUAL" | "COMPANY" | "GOVERNMENT" | "NGO";
export type ClientStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | "BLACKLISTED";
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
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "DISPUTED"
  | "CANCELLED";
export type NotificationType =
  | "ATTENDANCE_CHECKIN_REQUEST"
  | "ATTENDANCE_CHECKOUT_REQUEST"
  | "ATTENDANCE_REQUEST_APPROVED"
  | "ATTENDANCE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_CREATED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_BALANCE_LOW"
  | "OVERTIME_REQUEST_CREATED"
  | "OVERTIME_APPROVED"
  | "OVERTIME_REJECTED"
  | "PROJECT_ASSIGNED"
  | "MILESTONE_DUE_SOON"
  | "PAYSLIP_AVAILABLE"
  | "CONTRACT_EXPIRING_SOON"
  | "INVOICE_OVERDUE"
  | "GENERAL";
export type ProjectExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProjectExpenseCategory =
  | "LABOR"
  | "SOFTWARE"
  | "HARDWARE"
  | "TRAVEL"
  | "TRAINING"
  | "OUTSOURCE"
  | "OTHER";

export interface Department {
  id: string;
  name: string;
  description: string;
  headUserId: string | null;
  isActive: boolean;
}

export interface JobTitle {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface User {
  id: string;
  userCode: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  departmentId: string;
  jobTitleId: string;
  managerId: string | null;
  hireDate: string;
  employmentStatus: EmploymentStatus;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  roles: RoleCode[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationalIdNumber?: string;
  taxCode?: string;
  socialInsuranceNumber?: string;
  healthInsuranceNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRel?: string;
  dependantCount: number;
  educationLevel?: string;
  educationMajor?: string;
  university?: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  maxDaysPerYear: number | null;
  requiresDocument: boolean;
}

export interface LeaveBalance {
  userId: string;
  leaveTypeId: string;
  year: number;
  entitledDays: number;
  carriedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  reason?: string;
  status: LeaveRequestStatus;
  currentStep: ApprovalStepType | null;
  submittedAt: string;
  approvals: LeaveRequestApproval[];
}

export interface LeaveRequestApproval {
  approverUserId: string;
  stepType: ApprovalStepType;
  stepOrder: number;
  status: ApprovalStatus;
  comment?: string;
  actionAt?: string;
}

export interface WorkShift {
  id: string;
  code: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workMinutes: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  year: number;
  isRecurring: boolean;
}

export interface AttendanceRequest {
  id: string;
  userId: string;
  reviewerId: string | null;
  requestType: AttendanceRequestType;
  requestedAt: string;
  workDate: string;
  shiftId?: string;
  isRemoteWork: boolean;
  note?: string;
  status: AttendanceRequestStatus;
  reviewedAt?: string;
  rejectReason?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  shiftId: string;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  totalWorkMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  isRemoteWork: boolean;
  status: AttendanceStatus;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  approverUserId: string | null;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  actualMinutes?: number;
  isWeekend: boolean;
  isHoliday: boolean;
  reason: string;
  status: OvertimeRequestStatus;
  comment?: string;
}

export interface Client {
  id: string;
  clientCode: string;
  clientType: ClientType;
  status: ClientStatus;
  companyName: string;
  shortName: string;
  taxCode?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  accountManagerUserId: string;
  totalContractValue: number;
  totalReceivedAmount: number;
  outstandingBalance: number;
  contacts: ClientContact[];
}

export interface ClientContact {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Contract {
  id: string;
  contractCode: string;
  clientId: string;
  contractType: ContractType;
  status: ContractStatus;
  title: string;
  description: string;
  totalValue: number;
  receivedAmount: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  signedDate?: string;
  signedByUserId?: string;
}

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  description: string;
  projectManagerUserId: string;
  clientId: string;
  contractId: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  healthStatus: ProjectHealthStatus | null;
  progressPercent: number;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  spentAmount: number;
  milestones: ProjectMilestone[];
  assignments: ProjectAssignment[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  ownerUserId: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt?: string;
}

export interface ProjectAssignment {
  userId: string;
  projectId: string;
  roleInProject: string;
  allocationPercent: number;
  isBillable: boolean;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: ProjectExpenseCategory;
  submittedByUserId: string;
  submittedDate: string;
  status: ProjectExpenseStatus;
  approvedByUserId?: string;
  approvedDate?: string;
  rejectReason?: string;
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceCode: string;
  clientId: string;
  contractId: string;
  projectId: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes?: string;
}

export interface ClientPayment {
  id: string;
  paymentCode: string;
  clientId: string;
  contractId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  status: string;
}

export interface ContractAmendment {
  id: string;
  contractId: string;
  amendmentCode: string;
  title: string;
  description: string;
  valueChange: number;
  newEndDate?: string;
  effectiveDate: string;
  createdByUserId: string;
  createdAt: string;
  attachmentName?: string;
}

export interface PayrollPeriod {
  id: string;
  periodCode: string;
  month: number;
  year: number;
  status: PayrollPeriodStatus;
  workingDaysInPeriod: number;
  records: PayrollRecord[];
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  userId: string;
  baseSalary: number;
  workingDays: number;
  grossSalary: number;
  totalAllowances: number;
  totalBonus: number;
  totalOvertimePay: number;
  socialInsuranceEmployee: number;
  healthInsuranceEmployee: number;
  unemploymentInsuranceEmployee: number;
  personalIncomeTax: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  items: PayrollRecordItem[];
}

export interface PayrollRecordItem {
  itemName: string;
  itemType: "EARNING" | "DEDUCTION";
  sourceType: string;
  amount: number;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  senderUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  entityType: string;
  actionType: string;
  description: string;
  ipAddress: string;
  createdAt: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export type PayFrequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY";

export interface UserCompensation {
  id: string;
  userId: string;
  effectiveDate: string;
  endDate?: string;
  baseSalary: number;
  probationSalary?: number;
  salaryType: "MONTHLY" | "DAILY" | "HOURLY";
  standardWorkingDays?: number;
  currency: string;
  overtimeRateWeekday: number;
  overtimeRateWeekend: number;
  overtimeRateHoliday: number;
  isActive: boolean;
  reason: string;
  createdByUserId: string;
  createdAt: string;
  payFrequency: PayFrequency;
  payDayOfMonth?: number;
  probationEndDate?: string;
  changeReason?: string;
}

export interface UserSalaryComponent {
  id: string;
  userId: string;
  componentName: string;
  componentCode: string;
  amount: number;
  isActive: boolean;
  effectiveDate: string;
  endDate?: string;
  note?: string;
}

export type PayrollAdjustmentType = "BONUS" | "DEDUCTION" | "ADVANCE";
export type PayrollAdjustmentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";
export interface PayrollAdjustment {
  id: string;
  userId: string;
  type: PayrollAdjustmentType;
  amount: number;
  reason: string;
  note?: string;
  periodId?: string;
  status: PayrollAdjustmentStatus;
  createdByUserId: string;
  approvedByUserId?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  code: string;
  employeeRate: number;
  employerRate: number;
  salaryCap: number;
  isActive: boolean;
  effectiveDate: string;
  note?: string;
}

export interface TaxBracket {
  level: number;
  fromAmount: number;
  toAmount: number | null;
  rate: number;
  quickDeduction: number;
}

export interface TaxPolicy {
  id: string;
  name: string;
  personalDeduction: number;
  dependentDeduction: number;
  brackets: TaxBracket[];
  isActive: boolean;
  effectiveDate: string;
}

export type AuthTokenType = "ACCOUNT_SETUP" | "PASSWORD_RESET";
export interface AuthToken {
  id: string;
  userId: string;
  tokenType: AuthTokenType;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  createdByUserId: string;
}

export interface UserWorkShift {
  id: string;
  userId: string;
  shiftId: string;
  dayOfWeek: number | null; // null = tất cả ngày | 1=T2 ... 7=CN
  effectiveFrom: string; // ISO date
  effectiveTo: string | null;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
}

// ─── Data ───────────────────────────────────────────────────

export const departments: Department[] = [
  {
    id: "dept-1",
    name: "Ban Giám Đốc",
    description: "Lãnh đạo cấp cao",
    headUserId: "user-ceo",
    isActive: true,
  },
  {
    id: "dept-2",
    name: "Phòng Nhân Sự",
    description: "Quản lý nhân sự và phúc lợi",
    headUserId: "user-hr-mgr",
    isActive: true,
  },
  {
    id: "dept-3",
    name: "Phòng Kỹ Thuật",
    description: "Phát triển phần mềm và hạ tầng",
    headUserId: "user-cto",
    isActive: true,
  },
  {
    id: "dept-4",
    name: "Phòng Kinh Doanh",
    description: "Bán hàng và phát triển thị trường",
    headUserId: "user-sales-mgr",
    isActive: true,
  },
  {
    id: "dept-5",
    name: "Phòng Tài Chính",
    description: "Kế toán và quản lý tài chính",
    headUserId: "user-fin-mgr",
    isActive: true,
  },
  {
    id: "dept-6",
    name: "Phòng Marketing",
    description: "Marketing và truyền thông",
    headUserId: "user-mkt-mgr",
    isActive: true,
  },
  {
    id: "dept-7",
    name: "Phòng BA",
    description: "Business Analysis và quản lý yêu cầu",
    headUserId: "user-ba-lead",
    isActive: true,
  },
];

export const jobTitles: JobTitle[] = [
  {
    id: "jt-ceo",
    code: "CEO",
    name: "Giám đốc điều hành",
    description: "Chief Executive Officer",
    isActive: true,
  },
  {
    id: "jt-cto",
    code: "CTO",
    name: "Giám đốc kỹ thuật",
    description: "Chief Technology Officer",
    isActive: true,
  },
  {
    id: "jt-cfo",
    code: "CFO",
    name: "Giám đốc tài chính",
    description: "Chief Financial Officer",
    isActive: true,
  },
  {
    id: "jt-hr-mgr",
    code: "HR_MGR",
    name: "Trưởng phòng nhân sự",
    description: "HR Manager",
    isActive: true,
  },
  {
    id: "jt-sales-mgr",
    code: "SALES_MGR",
    name: "Trưởng phòng kinh doanh",
    description: "Sales Manager",
    isActive: true,
  },
  {
    id: "jt-fin-mgr",
    code: "FIN_MGR",
    name: "Trưởng phòng tài chính",
    description: "Finance Manager",
    isActive: true,
  },
  {
    id: "jt-mkt-mgr",
    code: "MKT_MGR",
    name: "Trưởng phòng marketing",
    description: "Marketing Manager",
    isActive: true,
  },
  {
    id: "jt-ba-lead",
    code: "BA_LEAD",
    name: "BA Lead",
    description: "Business Analysis Lead",
    isActive: true,
  },
  {
    id: "jt-senior-dev",
    code: "SENIOR_DEV",
    name: "Senior Developer",
    description: "Senior Software Developer",
    isActive: true,
  },
  {
    id: "jt-dev",
    code: "DEV",
    name: "Developer",
    description: "Software Developer",
    isActive: true,
  },
  {
    id: "jt-junior-dev",
    code: "JUNIOR_DEV",
    name: "Junior Developer",
    description: "Junior Software Developer",
    isActive: true,
  },
  {
    id: "jt-ba",
    code: "BA",
    name: "Business Analyst",
    description: "Business Analyst",
    isActive: true,
  },
  {
    id: "jt-sales-exe",
    code: "SALES_EXE",
    name: "Sales Executive",
    description: "Chuyên viên kinh doanh",
    isActive: true,
  },
  {
    id: "jt-accountant",
    code: "ACCOUNTANT",
    name: "Kế toán viên",
    description: "Accountant",
    isActive: true,
  },
  {
    id: "jt-hr-staff",
    code: "HR_STAFF",
    name: "Chuyên viên nhân sự",
    description: "HR Staff",
    isActive: true,
  },
  {
    id: "jt-tester",
    code: "TESTER",
    name: "QA/Tester",
    description: "Quality Assurance Engineer",
    isActive: true,
  },
  {
    id: "jt-devops",
    code: "DEVOPS",
    name: "DevOps Engineer",
    description: "DevOps / Infrastructure Engineer",
    isActive: true,
  },
];

export const users: User[] = [
  {
    id: "user-admin",
    userCode: "SYS001",
    email: "admin@techvn.com",
    fullName: "System Admin",
    phoneNumber: "0900000000",
    departmentId: "dept-1",
    jobTitleId: "jt-ceo",
    managerId: null,
    hireDate: "2020-01-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["ADMIN"],
    lastLoginAt: "2025-03-12T08:00:00",
    createdAt: "2020-01-01",
  },
  {
    id: "user-ceo",
    userCode: "EMP001",
    email: "nguyen.van.an@techvn.com",
    fullName: "Nguyễn Văn An",
    phoneNumber: "0901111111",
    departmentId: "dept-1",
    jobTitleId: "jt-ceo",
    managerId: null,
    hireDate: "2020-01-15",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["ADMIN", "MANAGER"],
    lastLoginAt: "2025-03-12T07:30:00",
    createdAt: "2020-01-15",
  },
  {
    id: "user-cto",
    userCode: "EMP002",
    email: "tran.thi.bich@techvn.com",
    fullName: "Trần Thị Bích",
    phoneNumber: "0902222222",
    departmentId: "dept-3",
    jobTitleId: "jt-cto",
    managerId: "user-ceo",
    hireDate: "2020-02-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["MANAGER", "EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:15:00",
    createdAt: "2020-02-01",
  },
  {
    id: "user-senior-dev",
    userCode: "EMP003",
    email: "nguyen.minh.giang@techvn.com",
    fullName: "Nguyễn Minh Giang",
    phoneNumber: "0903333333",
    departmentId: "dept-3",
    jobTitleId: "jt-senior-dev",
    managerId: "user-cto",
    hireDate: "2021-03-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["MANAGER", "EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:05:00",
    createdAt: "2021-03-01",
  },
  {
    id: "user-dev1",
    userCode: "EMP004",
    email: "vo.thi.huong@techvn.com",
    fullName: "Võ Thị Hương",
    phoneNumber: "0904444444",
    departmentId: "dept-3",
    jobTitleId: "jt-dev",
    managerId: "user-senior-dev",
    hireDate: "2022-06-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:12:00",
    createdAt: "2022-06-01",
  },
  {
    id: "user-dev2",
    userCode: "EMP005",
    email: "bui.van.ich@techvn.com",
    fullName: "Bùi Văn Ích",
    phoneNumber: "0905555555",
    departmentId: "dept-3",
    jobTitleId: "jt-dev",
    managerId: "user-senior-dev",
    hireDate: "2022-09-15",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-11T17:30:00",
    createdAt: "2022-09-15",
  },
  {
    id: "user-junior-dev",
    userCode: "EMP006",
    email: "pham.thi.jennifer@techvn.com",
    fullName: "Phạm Thị Jennifer",
    phoneNumber: "0906666666",
    departmentId: "dept-3",
    jobTitleId: "jt-junior-dev",
    managerId: "user-senior-dev",
    hireDate: "2024-01-15",
    employmentStatus: "PROBATION",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:20:00",
    createdAt: "2024-01-15",
  },
  {
    id: "user-tester",
    userCode: "EMP007",
    email: "do.van.kien@techvn.com",
    fullName: "Đỗ Văn Kiên",
    phoneNumber: "0907777777",
    departmentId: "dept-3",
    jobTitleId: "jt-tester",
    managerId: "user-senior-dev",
    hireDate: "2023-04-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-12T07:55:00",
    createdAt: "2023-04-01",
  },
  {
    id: "user-devops",
    userCode: "EMP008",
    email: "nguyen.van.long@techvn.com",
    fullName: "Nguyễn Văn Long",
    phoneNumber: "0908888888",
    departmentId: "dept-3",
    jobTitleId: "jt-devops",
    managerId: "user-cto",
    hireDate: "2021-11-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:00:00",
    createdAt: "2021-11-01",
  },
  {
    id: "user-hr-mgr",
    userCode: "EMP009",
    email: "le.van.cuong@techvn.com",
    fullName: "Lê Văn Cường",
    phoneNumber: "0909999999",
    departmentId: "dept-2",
    jobTitleId: "jt-hr-mgr",
    managerId: "user-ceo",
    hireDate: "2020-03-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["HR", "MANAGER"],
    lastLoginAt: "2025-03-12T08:10:00",
    createdAt: "2020-03-01",
  },
  {
    id: "user-hr-staff",
    userCode: "EMP010",
    email: "mai.thi.linh@techvn.com",
    fullName: "Mai Thị Linh",
    phoneNumber: "0910101010",
    departmentId: "dept-2",
    jobTitleId: "jt-hr-staff",
    managerId: "user-hr-mgr",
    hireDate: "2022-01-10",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["HR"],
    lastLoginAt: "2025-03-12T08:25:00",
    createdAt: "2022-01-10",
  },
  {
    id: "user-sales-mgr",
    userCode: "EMP011",
    email: "pham.thi.dung@techvn.com",
    fullName: "Phạm Thị Dung",
    phoneNumber: "0911111111",
    departmentId: "dept-4",
    jobTitleId: "jt-sales-mgr",
    managerId: "user-ceo",
    hireDate: "2020-04-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["SALES", "MANAGER"],
    lastLoginAt: "2025-03-12T09:00:00",
    createdAt: "2020-04-01",
  },
  {
    id: "user-sales1",
    userCode: "EMP012",
    email: "le.thi.lan@techvn.com",
    fullName: "Lê Thị Lan",
    phoneNumber: "0912121212",
    departmentId: "dept-4",
    jobTitleId: "jt-sales-exe",
    managerId: "user-sales-mgr",
    hireDate: "2023-02-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["SALES", "EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:45:00",
    createdAt: "2023-02-01",
  },
  {
    id: "user-sales2",
    userCode: "EMP013",
    email: "tran.van.minh@techvn.com",
    fullName: "Trần Văn Minh",
    phoneNumber: "0913131313",
    departmentId: "dept-4",
    jobTitleId: "jt-sales-exe",
    managerId: "user-sales-mgr",
    hireDate: "2023-08-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["SALES", "EMPLOYEE"],
    lastLoginAt: "2025-03-11T17:00:00",
    createdAt: "2023-08-01",
  },
  {
    id: "user-fin-mgr",
    userCode: "EMP014",
    email: "hoang.van.em@techvn.com",
    fullName: "Hoàng Văn Em",
    phoneNumber: "0914141414",
    departmentId: "dept-5",
    jobTitleId: "jt-fin-mgr",
    managerId: "user-ceo",
    hireDate: "2020-05-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["ACCOUNTANT", "MANAGER"],
    lastLoginAt: "2025-03-12T08:30:00",
    createdAt: "2020-05-01",
  },
  {
    id: "user-accountant",
    userCode: "EMP015",
    email: "dinh.van.khoa@techvn.com",
    fullName: "Đinh Văn Khoa",
    phoneNumber: "0915151515",
    departmentId: "dept-5",
    jobTitleId: "jt-accountant",
    managerId: "user-fin-mgr",
    hireDate: "2021-07-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["ACCOUNTANT", "EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:35:00",
    createdAt: "2021-07-01",
  },
  {
    id: "user-ba-lead",
    userCode: "EMP016",
    email: "tran.van.hung@techvn.com",
    fullName: "Trần Văn Hùng",
    phoneNumber: "0916161616",
    departmentId: "dept-7",
    jobTitleId: "jt-ba-lead",
    managerId: "user-cto",
    hireDate: "2021-01-15",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["MANAGER", "EMPLOYEE"],
    lastLoginAt: "2025-03-12T08:20:00",
    createdAt: "2021-01-15",
  },
  {
    id: "user-ba1",
    userCode: "EMP017",
    email: "nguyen.thi.oanh@techvn.com",
    fullName: "Nguyễn Thị Oanh",
    phoneNumber: "0917171717",
    departmentId: "dept-7",
    jobTitleId: "jt-ba",
    managerId: "user-ba-lead",
    hireDate: "2022-11-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["EMPLOYEE"],
    lastLoginAt: "2025-03-12T09:01:00",
    createdAt: "2022-11-01",
  },
  {
    id: "user-mkt-mgr",
    userCode: "EMP018",
    email: "pham.van.phuong@techvn.com",
    fullName: "Phạm Văn Phương",
    phoneNumber: "0918181818",
    departmentId: "dept-6",
    jobTitleId: "jt-mkt-mgr",
    managerId: "user-ceo",
    hireDate: "2021-06-01",
    employmentStatus: "ACTIVE",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    roles: ["MANAGER", "EMPLOYEE"],
    lastLoginAt: "2025-03-11T16:00:00",
    createdAt: "2021-06-01",
  },
  {
    id: "user-probation1",
    userCode: "EMP019",
    email: "le.van.quynh@techvn.com",
    fullName: "Lê Văn Quỳnh",
    phoneNumber: "0919191919",
    departmentId: "dept-3",
    jobTitleId: "jt-junior-dev",
    managerId: "user-senior-dev",
    hireDate: "2025-02-01",
    employmentStatus: "PROBATION",
    accountStatus: "ACTIVE",
    mustChangePassword: true,
    roles: ["EMPLOYEE"],
    createdAt: "2025-02-01",
  },
  {
    id: "user-pending1",
    userCode: "EMP020",
    email: "nguyen.thi.rose@techvn.com",
    fullName: "Nguyễn Thị Rose",
    phoneNumber: "0920202020",
    departmentId: "dept-4",
    jobTitleId: "jt-sales-exe",
    managerId: "user-sales-mgr",
    hireDate: "2025-03-01",
    employmentStatus: "PROBATION",
    accountStatus: "PENDING",
    mustChangePassword: true,
    roles: ["SALES", "EMPLOYEE"],
    createdAt: "2025-03-01",
  },
];

export const userProfiles: UserProfile[] = [
  {
    userId: "user-ceo",
    dateOfBirth: "1985-03-15",
    gender: "MALE",
    nationalIdNumber: "079085001234",
    taxCode: "0123456789",
    socialInsuranceNumber: "VN0123456789",
    bankName: "Vietcombank",
    bankAccountNumber: "0011001234567",
    bankAccountHolder: "NGUYEN VAN AN",
    permanentAddress: "25 Nguyễn Huệ, Hoàn Kiếm, Hà Nội",
    emergencyContactName: "Nguyễn Thị Lan",
    emergencyContactPhone: "0901234567",
    emergencyContactRel: "Vợ",
    dependantCount: 2,
    educationLevel: "Thạc sĩ",
    educationMajor: "Quản trị kinh doanh",
    university: "ĐH Kinh tế Quốc dân",
  },
  {
    userId: "user-cto",
    dateOfBirth: "1987-07-22",
    gender: "FEMALE",
    nationalIdNumber: "001087002345",
    taxCode: "0234567890",
    socialInsuranceNumber: "VN0234567890",
    bankName: "Techcombank",
    bankAccountNumber: "1900123456789",
    bankAccountHolder: "TRAN THI BICH",
    permanentAddress: "12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    emergencyContactName: "Trần Văn Nam",
    emergencyContactPhone: "0912345678",
    emergencyContactRel: "Chồng",
    dependantCount: 1,
    educationLevel: "Thạc sĩ",
    educationMajor: "Khoa học máy tính",
    university: "ĐH Bách Khoa Hà Nội",
  },
  {
    userId: "user-hr-mgr",
    dateOfBirth: "1988-11-05",
    gender: "MALE",
    nationalIdNumber: "036088003456",
    taxCode: "0345678901",
    socialInsuranceNumber: "VN0345678901",
    bankName: "BIDV",
    bankAccountNumber: "0001234567890",
    bankAccountHolder: "LE VAN CUONG",
    permanentAddress: "8 Lý Thường Kiệt, Quận 10, TP.HCM",
    emergencyContactName: "Lê Thị Mai",
    emergencyContactPhone: "0923456789",
    emergencyContactRel: "Vợ",
    dependantCount: 2,
    educationLevel: "Đại học",
    educationMajor: "Quản trị nhân lực",
    university: "ĐH Lao động Xã hội",
  },
  {
    userId: "user-senior-dev",
    dateOfBirth: "1992-05-18",
    gender: "MALE",
    nationalIdNumber: "025092004567",
    taxCode: "0456789012",
    socialInsuranceNumber: "VN0456789012",
    bankName: "MB Bank",
    bankAccountNumber: "0987654321",
    bankAccountHolder: "NGUYEN MINH GIANG",
    permanentAddress: "15 Trần Phú, Hải Châu, Đà Nẵng",
    emergencyContactName: "Nguyễn Thị Hoa",
    emergencyContactPhone: "0934567890",
    emergencyContactRel: "Mẹ",
    dependantCount: 0,
    educationLevel: "Đại học",
    educationMajor: "Công nghệ thông tin",
    university: "ĐH Đà Nẵng",
  },
  {
    userId: "user-sales-mgr",
    dateOfBirth: "1989-09-30",
    gender: "FEMALE",
    nationalIdNumber: "079089005678",
    taxCode: "0567890123",
    socialInsuranceNumber: "VN0567890123",
    bankName: "Vietinbank",
    bankAccountNumber: "1101234567890",
    bankAccountHolder: "PHAM THI DUNG",
    permanentAddress: "30 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
    emergencyContactName: "Phạm Văn Bình",
    emergencyContactPhone: "0945678901",
    emergencyContactRel: "Chồng",
    dependantCount: 1,
    educationLevel: "Đại học",
    educationMajor: "Marketing",
    university: "ĐH Ngoại thương",
  },
  {
    userId: "user-fin-mgr",
    dateOfBirth: "1986-12-12",
    gender: "MALE",
    nationalIdNumber: "079086006789",
    taxCode: "0678901234",
    socialInsuranceNumber: "VN0678901234",
    bankName: "Agribank",
    bankAccountNumber: "1234567890123",
    bankAccountHolder: "HOANG VAN EM",
    permanentAddress: "45 Hàng Bài, Hoàn Kiếm, Hà Nội",
    emergencyContactName: "Hoàng Thị Lan",
    emergencyContactPhone: "0956789012",
    emergencyContactRel: "Vợ",
    dependantCount: 2,
    educationLevel: "Thạc sĩ",
    educationMajor: "Tài chính kế toán",
    university: "ĐH Kinh tế TP.HCM",
  },
];

export const leaveTypes: LeaveType[] = [
  {
    id: "lt-1",
    code: "PHEP_NAM",
    name: "Nghỉ phép năm",
    isPaid: true,
    maxDaysPerYear: 12,
    requiresDocument: false,
  },
  {
    id: "lt-2",
    code: "NGHI_OM",
    name: "Nghỉ ốm",
    isPaid: true,
    maxDaysPerYear: 30,
    requiresDocument: true,
  },
  {
    id: "lt-3",
    code: "THAI_SAN",
    name: "Nghỉ thai sản",
    isPaid: true,
    maxDaysPerYear: 180,
    requiresDocument: true,
  },
  {
    id: "lt-4",
    code: "NGHI_TANG",
    name: "Nghỉ tang",
    isPaid: true,
    maxDaysPerYear: 3,
    requiresDocument: false,
  },
  {
    id: "lt-5",
    code: "NGHI_CUOI",
    name: "Nghỉ cưới",
    isPaid: true,
    maxDaysPerYear: 3,
    requiresDocument: false,
  },
  {
    id: "lt-6",
    code: "KHONG_LUONG",
    name: "Nghỉ không lương",
    isPaid: false,
    maxDaysPerYear: null,
    requiresDocument: false,
  },
  {
    id: "lt-7",
    code: "NGHI_BU",
    name: "Nghỉ bù",
    isPaid: true,
    maxDaysPerYear: null,
    requiresDocument: false,
  },
];

export const leaveBalances: LeaveBalance[] = [
  {
    userId: "user-ceo",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 14,
    carriedDays: 2,
    usedDays: 3,
    pendingDays: 0,
    remainingDays: 13,
  },
  {
    userId: "user-cto",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 14,
    carriedDays: 1,
    usedDays: 5,
    pendingDays: 2,
    remainingDays: 8,
  },
  {
    userId: "user-hr-mgr",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 4,
    pendingDays: 0,
    remainingDays: 8,
  },
  {
    userId: "user-hr-staff",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 2,
    pendingDays: 1,
    remainingDays: 9,
  },
  {
    userId: "user-sales-mgr",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 6,
    pendingDays: 0,
    remainingDays: 6,
  },
  {
    userId: "user-sales1",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 3,
    pendingDays: 0,
    remainingDays: 9,
  },
  {
    userId: "user-fin-mgr",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 2,
    usedDays: 4,
    pendingDays: 0,
    remainingDays: 10,
  },
  {
    userId: "user-accountant",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 2,
    pendingDays: 0,
    remainingDays: 10,
  },
  {
    userId: "user-senior-dev",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 3,
    usedDays: 7,
    pendingDays: 1,
    remainingDays: 7,
  },
  {
    userId: "user-dev1",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 4,
    pendingDays: 0,
    remainingDays: 8,
  },
  {
    userId: "user-dev2",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 2,
    pendingDays: 2,
    remainingDays: 8,
  },
  {
    userId: "user-junior-dev",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 1,
    pendingDays: 0,
    remainingDays: 11,
  },
  {
    userId: "user-tester",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 3,
    pendingDays: 0,
    remainingDays: 9,
  },
  {
    userId: "user-devops",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 1,
    usedDays: 4,
    pendingDays: 0,
    remainingDays: 9,
  },
  {
    userId: "user-ba-lead",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 5,
    pendingDays: 0,
    remainingDays: 7,
  },
  {
    userId: "user-ba1",
    leaveTypeId: "lt-1",
    year: 2025,
    entitledDays: 12,
    carriedDays: 0,
    usedDays: 2,
    pendingDays: 1,
    remainingDays: 9,
  },
  {
    userId: "user-dev1",
    leaveTypeId: "lt-2",
    year: 2025,
    entitledDays: 30,
    carriedDays: 0,
    usedDays: 2,
    pendingDays: 0,
    remainingDays: 28,
  },
  {
    userId: "user-hr-staff",
    leaveTypeId: "lt-2",
    year: 2025,
    entitledDays: 30,
    carriedDays: 0,
    usedDays: 3,
    pendingDays: 0,
    remainingDays: 27,
  },
];

export const leaveRequests: LeaveRequest[] = [
  {
    id: "lr-1",
    userId: "user-dev1",
    leaveTypeId: "lt-1",
    startDate: "2025-02-10",
    endDate: "2025-02-12",
    totalDays: 3,
    isHalfDay: false,
    reason: "Về quê giỗ tổ tiên",
    status: "APPROVED",
    currentStep: null,
    submittedAt: "2025-02-05",
    approvals: [
      {
        approverUserId: "user-senior-dev",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        comment: "Đồng ý",
        actionAt: "2025-02-06",
      },
      {
        approverUserId: "user-hr-mgr",
        stepType: "HR",
        stepOrder: 2,
        status: "APPROVED",
        comment: "Duyệt",
        actionAt: "2025-02-07",
      },
    ],
  },
  {
    id: "lr-2",
    userId: "user-dev2",
    leaveTypeId: "lt-1",
    startDate: "2025-04-07",
    endDate: "2025-04-09",
    totalDays: 3,
    isHalfDay: false,
    reason: "Nghỉ lễ 30/4 kết hợp du lịch",
    status: "PENDING",
    currentStep: "MANAGER",
    submittedAt: "2025-03-28",
    approvals: [
      {
        approverUserId: "user-senior-dev",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-3",
    userId: "user-ba1",
    leaveTypeId: "lt-1",
    startDate: "2025-04-14",
    endDate: "2025-04-15",
    totalDays: 2,
    isHalfDay: false,
    reason: "Việc cá nhân",
    status: "PENDING",
    currentStep: "HR",
    submittedAt: "2025-04-01",
    approvals: [
      {
        approverUserId: "user-ba-lead",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        actionAt: "2025-04-02",
      },
      {
        approverUserId: "user-hr-mgr",
        stepType: "HR",
        stepOrder: 2,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-4",
    userId: "user-tester",
    leaveTypeId: "lt-1",
    startDate: "2025-03-15",
    endDate: "2025-03-16",
    totalDays: 2,
    isHalfDay: false,
    reason: "Việc gia đình",
    status: "REJECTED",
    currentStep: null,
    submittedAt: "2025-03-10",
    approvals: [
      {
        approverUserId: "user-senior-dev",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "REJECTED",
        comment: "Đang cao điểm release",
        actionAt: "2025-03-11",
      },
    ],
  },
  {
    id: "lr-5",
    userId: "user-hr-staff",
    leaveTypeId: "lt-2",
    startDate: "2025-01-20",
    endDate: "2025-01-22",
    totalDays: 3,
    isHalfDay: false,
    reason: "Sốt virus, có giấy bác sĩ",
    status: "APPROVED",
    currentStep: null,
    submittedAt: "2025-01-20",
    approvals: [
      {
        approverUserId: "user-hr-mgr",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        actionAt: "2025-01-21",
      },
      {
        approverUserId: "user-hr-mgr",
        stepType: "HR",
        stepOrder: 2,
        status: "APPROVED",
        actionAt: "2025-01-21",
      },
    ],
  },
  {
    id: "lr-6",
    userId: "user-senior-dev",
    leaveTypeId: "lt-1",
    startDate: "2025-03-20",
    endDate: "2025-03-20",
    totalDays: 0.5,
    isHalfDay: true,
    halfDayPeriod: "AFTERNOON",
    reason: "Đi khám sức khỏe định kỳ",
    status: "PENDING",
    currentStep: "MANAGER",
    submittedAt: "2025-03-18",
    approvals: [],
  },
  {
    id: "lr-7",
    userId: "user-devops",
    leaveTypeId: "lt-1",
    startDate: "2025-03-24",
    endDate: "2025-03-25",
    totalDays: 2,
    isHalfDay: false,
    reason: "Cưới bạn thân ở Đà Lạt",
    status: "PENDING",
    currentStep: "MANAGER",
    submittedAt: "2025-03-10",
    approvals: [
      {
        approverUserId: "user-cto",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-8",
    userId: "user-sales1",
    leaveTypeId: "lt-1",
    startDate: "2025-04-21",
    endDate: "2025-04-22",
    totalDays: 2,
    isHalfDay: false,
    reason: "Du lịch gia đình",
    status: "PENDING",
    currentStep: "HR",
    submittedAt: "2025-03-20",
    approvals: [
      {
        approverUserId: "user-sales-mgr",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        comment: "OK, đã sắp xếp người thay",
        actionAt: "2025-03-21",
      },
      {
        approverUserId: "user-hr-mgr",
        stepType: "HR",
        stepOrder: 2,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-9",
    userId: "user-junior-dev",
    leaveTypeId: "lt-2",
    startDate: "2025-03-13",
    endDate: "2025-03-14",
    totalDays: 2,
    isHalfDay: false,
    reason: "Bị cảm, xin nghỉ ốm",
    status: "PENDING",
    currentStep: "MANAGER",
    submittedAt: "2025-03-12",
    approvals: [
      {
        approverUserId: "user-senior-dev",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-10",
    userId: "user-accountant",
    leaveTypeId: "lt-1",
    startDate: "2025-03-17",
    endDate: "2025-03-17",
    totalDays: 0.5,
    isHalfDay: true,
    halfDayPeriod: "MORNING",
    reason: "Họp phụ huynh",
    status: "PENDING",
    currentStep: "HR",
    submittedAt: "2025-03-11",
    approvals: [
      {
        approverUserId: "user-fin-mgr",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        comment: "Đồng ý",
        actionAt: "2025-03-11",
      },
      {
        approverUserId: "user-hr-mgr",
        stepType: "HR",
        stepOrder: 2,
        status: "PENDING",
      },
    ],
  },
  {
    id: "lr-11",
    userId: "user-dev1",
    leaveTypeId: "lt-1",
    startDate: "2025-01-06",
    endDate: "2025-01-07",
    totalDays: 2,
    isHalfDay: false,
    reason: "Việc cá nhân",
    status: "CANCELLED",
    currentStep: null,
    submittedAt: "2025-01-02",
    approvals: [],
  },
  {
    id: "lr-12",
    userId: "user-sales2",
    leaveTypeId: "lt-1",
    startDate: "2025-03-19",
    endDate: "2025-03-19",
    totalDays: 1,
    isHalfDay: false,
    reason: "Đi làm giấy tờ hành chính",
    status: "PENDING",
    currentStep: "MANAGER",
    submittedAt: "2025-03-12",
    approvals: [
      {
        approverUserId: "user-sales-mgr",
        stepType: "MANAGER",
        stepOrder: 1,
        status: "PENDING",
      },
    ],
  },
];

export const workShifts: WorkShift[] = [
  {
    id: "ws-1",
    code: "CA_SANG",
    name: "Ca sáng",
    shiftType: "MORNING",
    startTime: "08:00",
    endTime: "17:30",
    breakMinutes: 60,
    workMinutes: 510,
  },
  {
    id: "ws-2",
    code: "CA_CHIEU",
    name: "Ca chiều",
    shiftType: "AFTERNOON",
    startTime: "13:00",
    endTime: "22:00",
    breakMinutes: 60,
    workMinutes: 480,
  },
  {
    id: "ws-3",
    code: "CA_DEM",
    name: "Ca đêm",
    shiftType: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    breakMinutes: 60,
    workMinutes: 420,
  },
  {
    id: "ws-4",
    code: "LINH_HOAT",
    name: "Giờ linh hoạt",
    shiftType: "FLEXIBLE",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    workMinutes: 480,
  },
];

export const holidays: Holiday[] = [
  {
    id: "h-1",
    name: "Tết Dương lịch",
    date: "2025-01-01",
    year: 2025,
    isRecurring: true,
  },
  {
    id: "h-2",
    name: "Tết Nguyên Đán (giao thừa)",
    date: "2025-01-28",
    year: 2025,
    isRecurring: false,
  },
  {
    id: "h-3",
    name: "Tết Nguyên Đán (mùng 1)",
    date: "2025-01-29",
    year: 2025,
    isRecurring: false,
  },
  {
    id: "h-4",
    name: "Tết Nguyên Đán (mùng 2)",
    date: "2025-01-30",
    year: 2025,
    isRecurring: false,
  },
  {
    id: "h-5",
    name: "Tết Nguyên Đán (mùng 3)",
    date: "2025-01-31",
    year: 2025,
    isRecurring: false,
  },
  {
    id: "h-6",
    name: "Giỗ Tổ Hùng Vương",
    date: "2025-04-07",
    year: 2025,
    isRecurring: false,
  },
  {
    id: "h-7",
    name: "Ngày Giải phóng Miền Nam",
    date: "2025-04-30",
    year: 2025,
    isRecurring: true,
  },
  {
    id: "h-8",
    name: "Ngày Quốc tế Lao động",
    date: "2025-05-01",
    year: 2025,
    isRecurring: true,
  },
  {
    id: "h-9",
    name: "Ngày Quốc khánh",
    date: "2025-09-02",
    year: 2025,
    isRecurring: true,
  },
];

// Helper to build attendance records for a user for March 2025
const buildMonthRecords = (
  userId: string,
  shiftId: string,
  absentDates: string[],
  leaveDates: string[],
  adjustedDates: string[],
  remoteWorkDates: string[] = [],
): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  for (let d = 1; d <= 12; d++) {
    const dateStr = `2025-03-${String(d).padStart(2, "0")}`;
    const date = new Date(2025, 2, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    if (absentDates.includes(dateStr)) {
      records.push({
        id: `attrec-${userId}-${dateStr}`,
        userId,
        shiftId,
        workDate: dateStr,
        totalWorkMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        isRemoteWork: false,
        status: "ABSENT",
      });
    } else if (leaveDates.includes(dateStr)) {
      records.push({
        id: `attrec-${userId}-${dateStr}`,
        userId,
        shiftId,
        workDate: dateStr,
        totalWorkMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        isRemoteWork: false,
        status: "LEAVE",
      });
    } else if (adjustedDates.includes(dateStr)) {
      records.push({
        id: `attrec-${userId}-${dateStr}`,
        userId,
        shiftId,
        workDate: dateStr,
        checkInAt: `${dateStr}T08:30:00`,
        checkOutAt: `${dateStr}T17:30:00`,
        totalWorkMinutes: 480,
        lateMinutes: 30,
        overtimeMinutes: 0,
        isRemoteWork: false,
        status: "MANUAL_ADJUSTED",
      });
    } else {
      const isRemote = remoteWorkDates.includes(dateStr);
      const late =
        [3, 6, 10].includes(d) && userId.includes("dev")
          ? Math.floor(d * 1.5)
          : 0;
      const ot = d === 7 && userId === "user-senior-dev" ? 90 : 0;
      records.push({
        id: `attrec-${userId}-${dateStr}`,
        userId,
        shiftId,
        workDate: dateStr,
        checkInAt: `${dateStr}T${late > 0 ? "08:" + String(late).padStart(2, "0") : "08:00"}:00`,
        checkOutAt: `${dateStr}T${ot > 0 ? "18:30" : "17:30"}:00`,
        totalWorkMinutes: 510 - late + ot,
        lateMinutes: late,
        overtimeMinutes: ot,
        isRemoteWork: isRemote,
        status: "PRESENT",
      });
    }
  }
  return records;
};

export const attendanceRecords: AttendanceRecord[] = [
  ...buildMonthRecords(
    "user-dev1",
    "ws-1",
    [],
    ["2025-03-10", "2025-03-11", "2025-03-12"],
    [],
    ["2025-03-05"],
  ),
  ...buildMonthRecords(
    "user-dev2",
    "ws-1",
    ["2025-03-07"],
    [],
    [],
    ["2025-03-03", "2025-03-04"],
  ),
  ...buildMonthRecords(
    "user-senior-dev",
    "ws-1",
    [],
    [],
    ["2025-03-06"],
    ["2025-03-10"],
  ),
  ...buildMonthRecords("user-tester", "ws-1", [], [], [], []),
  ...buildMonthRecords(
    "user-devops",
    "ws-4",
    [],
    [],
    ["2025-03-03"],
    ["2025-03-07", "2025-03-11"],
  ),
  ...buildMonthRecords("user-junior-dev", "ws-1", ["2025-03-05"], [], [], []),
  ...buildMonthRecords("user-hr-mgr", "ws-1", [], [], [], []),
  ...buildMonthRecords(
    "user-hr-staff",
    "ws-1",
    [],
    ["2025-03-03", "2025-03-04", "2025-03-05"],
    [],
    [],
  ),
  ...buildMonthRecords("user-ba-lead", "ws-1", [], [], [], ["2025-03-06"]),
  ...buildMonthRecords("user-ba1", "ws-1", [], [], [], []),
  ...buildMonthRecords("user-sales-mgr", "ws-1", [], [], [], []),
  ...buildMonthRecords("user-sales1", "ws-1", ["2025-03-10"], [], [], []),
  ...buildMonthRecords("user-accountant", "ws-1", [], [], [], []),
  ...buildMonthRecords("user-fin-mgr", "ws-1", [], [], [], []),
];

export const attendanceRequests: AttendanceRequest[] = [
  {
    id: "ar-1",
    userId: "user-dev1",
    reviewerId: null,
    requestType: "CHECK_IN",
    requestedAt: "2025-03-12T08:12:00",
    workDate: "2025-03-12",
    shiftId: "ws-1",
    isRemoteWork: false,
    note: "Vào trễ do tắc đường",
    status: "PENDING",
  },
  {
    id: "ar-2",
    userId: "user-dev2",
    reviewerId: null,
    requestType: "CHECK_IN",
    requestedAt: "2025-03-12T08:05:00",
    workDate: "2025-03-12",
    shiftId: "ws-1",
    isRemoteWork: false,
    note: "Vào trễ do tắc đường",
    status: "PENDING",
  },
  {
    id: "ar-3",
    userId: "user-ba1",
    reviewerId: null,
    requestType: "CHECK_IN",
    requestedAt: "2025-03-12T09:01:00",
    workDate: "2025-03-12",
    shiftId: "ws-1",
    isRemoteWork: false,
    note: "Vào trễ do tắc đường",
    status: "PENDING",
  },
  {
    id: "ar-4",
    userId: "user-tester",
    reviewerId: "user-hr-mgr",
    requestType: "CHECK_IN",
    requestedAt: "2025-03-12T07:58:00",
    workDate: "2025-03-12",
    shiftId: "ws-1",
    isRemoteWork: false,
    note: "Check-in bình thường",
    status: "APPROVED",
    reviewedAt: "2025-03-12T08:30:00",
  },
  {
    id: "ar-5",
    userId: "user-devops",
    reviewerId: null,
    requestType: "CHECK_OUT",
    requestedAt: "2025-03-12T17:35:00",
    workDate: "2025-03-12",
    isRemoteWork: false,
    note: "Xin checkout",
    status: "PENDING",
  },
  {
    id: "ar-6",
    userId: "user-sales1",
    reviewerId: null,
    requestType: "CHECK_OUT",
    requestedAt: "2025-03-12T17:35:00",
    workDate: "2025-03-12",
    isRemoteWork: false,
    note: "Xin checkout",
    status: "PENDING",
  },
];

export const overtimeRequests: OvertimeRequest[] = [
  {
    id: "ot-1",
    userId: "user-senior-dev",
    approverUserId: "user-cto",
    workDate: "2025-03-14",
    startTime: "18:00",
    endTime: "21:00",
    plannedMinutes: 180,
    actualMinutes: 185,
    isWeekend: false,
    isHoliday: false,
    reason: "Sprint deadline tính năng thanh toán",
    status: "APPROVED",
  },
  {
    id: "ot-2",
    userId: "user-dev1",
    approverUserId: "user-senior-dev",
    workDate: "2025-03-15",
    startTime: "18:00",
    endTime: "20:00",
    plannedMinutes: 120,
    actualMinutes: 120,
    isWeekend: false,
    isHoliday: false,
    reason: "Fix bug production khẩn cấp",
    status: "APPROVED",
  },
  {
    id: "ot-3",
    userId: "user-dev2",
    approverUserId: "user-senior-dev",
    workDate: "2025-03-22",
    startTime: "09:00",
    endTime: "12:00",
    plannedMinutes: 180,
    isWeekend: true,
    isHoliday: false,
    reason: "Hỗ trợ demo client cuối tuần",
    status: "APPROVED",
  },
  {
    id: "ot-4",
    userId: "user-tester",
    approverUserId: null,
    workDate: "2025-04-05",
    startTime: "18:00",
    endTime: "20:30",
    plannedMinutes: 150,
    isWeekend: false,
    isHoliday: false,
    reason: "Kiểm thử regression trước release",
    status: "PENDING",
  },
  {
    id: "ot-5",
    userId: "user-ba-lead",
    approverUserId: null,
    workDate: "2025-04-06",
    startTime: "18:00",
    endTime: "20:00",
    plannedMinutes: 120,
    isWeekend: false,
    isHoliday: false,
    reason: "Chuẩn bị tài liệu khởi động dự án mới",
    status: "PENDING",
  },
  {
    id: "ot-6",
    userId: "user-devops",
    approverUserId: null,
    workDate: "2025-04-07",
    startTime: "22:00",
    endTime: "02:00",
    plannedMinutes: 240,
    isWeekend: false,
    isHoliday: false,
    reason: "Nâng cấp server production",
    status: "PENDING",
  },
  {
    id: "ot-7",
    userId: "user-junior-dev",
    approverUserId: "user-senior-dev",
    workDate: "2025-03-08",
    startTime: "18:00",
    endTime: "22:00",
    plannedMinutes: 240,
    isWeekend: false,
    isHoliday: false,
    reason: "Tự nghiên cứu thêm",
    status: "REJECTED",
    comment: "Không có việc cụ thể ngoài giờ, không duyệt OT",
  },
  {
    id: "ot-8",
    userId: "user-devops",
    approverUserId: "user-cto",
    workDate: "2025-05-01",
    startTime: "09:00",
    endTime: "17:00",
    plannedMinutes: 480,
    isWeekend: false,
    isHoliday: true,
    reason: "Maintenance hệ thống ngày lễ",
    status: "APPROVED",
  },
  {
    id: "ot-9",
    userId: "user-dev1",
    approverUserId: null,
    workDate: "2025-04-08",
    startTime: "18:00",
    endTime: "21:00",
    plannedMinutes: 180,
    isWeekend: false,
    isHoliday: false,
    reason: "Hoàn thiện API module báo cáo",
    status: "PENDING",
  },
  {
    id: "ot-10",
    userId: "user-hr-staff",
    approverUserId: null,
    workDate: "2025-04-12",
    startTime: "09:00",
    endTime: "13:00",
    plannedMinutes: 240,
    isWeekend: true,
    isHoliday: false,
    reason: "Xử lý hồ sơ nhân sự tồn đọng",
    status: "PENDING",
  },
  {
    id: "ot-11",
    userId: "user-senior-dev",
    approverUserId: "user-cto",
    workDate: "2025-03-07",
    startTime: "18:30",
    endTime: "20:30",
    plannedMinutes: 120,
    actualMinutes: 135,
    isWeekend: false,
    isHoliday: false,
    reason: "Code review sprint 12",
    status: "APPROVED",
  },
  {
    id: "ot-12",
    userId: "user-dev2",
    approverUserId: null,
    workDate: "2025-04-10",
    startTime: "18:00",
    endTime: "22:00",
    plannedMinutes: 240,
    isWeekend: false,
    isHoliday: false,
    reason: "Migration database production",
    status: "PENDING",
  },
];

export const clients: Client[] = [
  {
    id: "cl-1",
    clientCode: "KH001",
    clientType: "COMPANY",
    status: "ACTIVE",
    companyName: "Công ty TNHH FutureTech Việt Nam",
    shortName: "FutureTech VN",
    taxCode: "0100109106",
    industry: "Công nghệ thông tin",
    website: "https://futuretech.vn",
    email: "contact@futuretech.vn",
    phone: "024-3826-5678",
    address: "18 Lý Thái Tổ, Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    accountManagerUserId: "user-sales-mgr",
    totalContractValue: 1500000000,
    totalReceivedAmount: 1200000000,
    outstandingBalance: 300000000,
    contacts: [
      {
        fullName: "Nguyễn Tuấn Anh",
        jobTitle: "Giám đốc CNTT",
        email: "tuan.anh@futuretech.vn",
        phone: "0912000001",
        isPrimary: true,
      },
      {
        fullName: "Trần Thị Ngọc",
        jobTitle: "Trưởng phòng Kỹ thuật",
        email: "thi.ngoc@futuretech.vn",
        phone: "0912000002",
        isPrimary: false,
      },
    ],
  },
  {
    id: "cl-2",
    clientCode: "KH002",
    clientType: "COMPANY",
    status: "ACTIVE",
    companyName: "Tập đoàn Xây dựng Miền Bắc JSC",
    shortName: "Xây dựng MB",
    taxCode: "0200456789",
    industry: "Xây dựng & Bất động sản",
    website: "https://xaydungmb.com.vn",
    email: "info@xaydungmb.com.vn",
    phone: "028-3930-1234",
    address: "55 Đinh Tiên Hoàng, Quận 1, TP.HCM",
    city: "TP.HCM",
    accountManagerUserId: "user-sales1",
    totalContractValue: 2200000000,
    totalReceivedAmount: 1800000000,
    outstandingBalance: 400000000,
    contacts: [
      {
        fullName: "Lê Văn Đức",
        jobTitle: "Phó Tổng Giám đốc",
        email: "van.duc@xaydungmb.com.vn",
        phone: "0913000001",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cl-3",
    clientCode: "KH003",
    clientType: "GOVERNMENT",
    status: "ACTIVE",
    companyName: "Sở Thông tin và Truyền thông TP.HCM",
    shortName: "Sở TT&TT HCM",
    taxCode: "0301234567",
    industry: "Cơ quan nhà nước",
    phone: "028-3825-9999",
    address: "59 Lý Tự Trọng, Quận 1, TP.HCM",
    city: "TP.HCM",
    accountManagerUserId: "user-sales-mgr",
    totalContractValue: 3000000000,
    totalReceivedAmount: 2700000000,
    outstandingBalance: 300000000,
    contacts: [
      {
        fullName: "Phạm Quang Minh",
        jobTitle: "Chánh văn phòng",
        email: "quang.minh@sotthcm.gov.vn",
        phone: "0914000001",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cl-4",
    clientCode: "KH004",
    clientType: "COMPANY",
    status: "PROSPECT",
    companyName: "StartUp Fintech ABC",
    shortName: "Fintech ABC",
    taxCode: "0400111222",
    industry: "Tài chính - Fintech",
    website: "https://fintechabc.io",
    email: "hello@fintechabc.io",
    phone: "0901234567",
    address: "200 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
    city: "TP.HCM",
    accountManagerUserId: "user-sales2",
    totalContractValue: 0,
    totalReceivedAmount: 0,
    outstandingBalance: 0,
    contacts: [
      {
        fullName: "James Nguyen",
        jobTitle: "CEO & Co-Founder",
        email: "james@fintechabc.io",
        phone: "0915000001",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cl-5",
    clientCode: "KH005",
    clientType: "COMPANY",
    status: "INACTIVE",
    companyName: "Retail Chain Việt Nam Co. Ltd",
    shortName: "Retail VN",
    taxCode: "0500987654",
    industry: "Bán lẻ",
    website: "https://retailvn.com",
    email: "tech@retailvn.com",
    phone: "024-7300-5678",
    address: "90 Giải Phóng, Đống Đa, Hà Nội",
    city: "Hà Nội",
    accountManagerUserId: "user-sales1",
    totalContractValue: 500000000,
    totalReceivedAmount: 500000000,
    outstandingBalance: 0,
    contacts: [
      {
        fullName: "Hoàng Thị Bảo",
        jobTitle: "IT Director",
        email: "bao@retailvn.com",
        phone: "0916000001",
        isPrimary: true,
      },
    ],
  },
];

export const contracts: Contract[] = [
  {
    id: "ct-1",
    contractCode: "HĐ-2024-001",
    clientId: "cl-1",
    contractType: "FIXED_PRICE",
    status: "ACTIVE",
    title: "Phát triển Hệ thống Quản lý Kho Thông minh v2.0",
    description: "Xây dựng hệ thống quản lý kho hàng tích hợp IoT và AI",
    totalValue: 1500000000,
    receivedAmount: 1200000000,
    remainingAmount: 300000000,
    startDate: "2024-03-01",
    endDate: "2025-06-30",
    signedDate: "2024-02-20",
    signedByUserId: "user-ceo",
  },
  {
    id: "ct-2",
    contractCode: "HĐ-2024-002",
    clientId: "cl-2",
    contractType: "MILESTONE_BASED",
    status: "ACTIVE",
    title: "Xây dựng Cổng thông tin Quản lý Dự án Xây dựng",
    description: "Phát triển hệ thống ERP tích hợp cho quản lý dự án xây dựng",
    totalValue: 2200000000,
    receivedAmount: 1800000000,
    remainingAmount: 400000000,
    startDate: "2024-05-01",
    endDate: "2025-10-31",
    signedDate: "2024-04-15",
    signedByUserId: "user-ceo",
  },
  {
    id: "ct-3",
    contractCode: "HĐ-2023-005",
    clientId: "cl-3",
    contractType: "RETAINER",
    status: "ACTIVE",
    title: "Dịch vụ Vận hành & Bảo trì Hệ thống CNTT",
    description: "Dịch vụ vận hành, bảo trì, hỗ trợ kỹ thuật 24/7",
    totalValue: 3000000000,
    receivedAmount: 2700000000,
    remainingAmount: 300000000,
    startDate: "2023-07-01",
    endDate: "2025-06-30",
    signedDate: "2023-06-20",
    signedByUserId: "user-ceo",
  },
  {
    id: "ct-4",
    contractCode: "HĐ-2022-003",
    clientId: "cl-5",
    contractType: "FIXED_PRICE",
    status: "COMPLETED",
    title: "Triển khai Hệ thống POS & Quản lý Chuỗi Bán lẻ",
    description: "Xây dựng và triển khai hệ thống POS tích hợp cho 50 cửa hàng",
    totalValue: 500000000,
    receivedAmount: 500000000,
    remainingAmount: 0,
    startDate: "2022-04-01",
    endDate: "2023-03-31",
    signedDate: "2022-03-15",
    signedByUserId: "user-ceo",
  },
];

export const projects: Project[] = [
  {
    id: "prj-1",
    projectCode: "PRJ-2024-001",
    projectName: "Smart Warehouse v2.0 - FutureTech",
    description: "Phát triển hệ thống kho thông minh tích hợp IoT và AI",
    projectManagerUserId: "user-senior-dev",
    clientId: "cl-1",
    contractId: "ct-1",
    status: "ACTIVE",
    priority: "HIGH",
    healthStatus: "ON_TRACK",
    progressPercent: 65,
    startDate: "2024-03-01",
    endDate: "2025-06-30",
    budgetAmount: 1650000000,
    spentAmount: 820000000,
    milestones: [
      {
        id: "ms-1",
        projectId: "prj-1",
        name: "Kickoff & Requirements",
        ownerUserId: "user-ba-lead",
        dueDate: "2024-03-31",
        status: "DONE",
        completedAt: "2024-03-28",
      },
      {
        id: "ms-2",
        projectId: "prj-1",
        name: "System Design & Architecture",
        ownerUserId: "user-senior-dev",
        dueDate: "2024-04-30",
        status: "DONE",
        completedAt: "2024-04-25",
      },
      {
        id: "ms-3",
        projectId: "prj-1",
        name: "MVP Backend APIs",
        ownerUserId: "user-dev1",
        dueDate: "2024-07-31",
        status: "DONE",
        completedAt: "2024-07-30",
      },
      {
        id: "ms-4",
        projectId: "prj-1",
        name: "Frontend Integration",
        ownerUserId: "user-dev2",
        dueDate: "2024-10-31",
        status: "DONE",
        completedAt: "2024-10-28",
      },
      {
        id: "ms-5",
        projectId: "prj-1",
        name: "IoT Integration & Testing",
        ownerUserId: "user-tester",
        dueDate: "2025-02-28",
        status: "IN_PROGRESS",
      },
      {
        id: "ms-6",
        projectId: "prj-1",
        name: "UAT & Deployment",
        ownerUserId: "user-senior-dev",
        dueDate: "2025-05-31",
        status: "PENDING",
      },
      {
        id: "ms-7",
        projectId: "prj-1",
        name: "Go-Live & Handover",
        ownerUserId: "user-ba-lead",
        dueDate: "2025-06-30",
        status: "PENDING",
      },
    ],
    assignments: [
      {
        userId: "user-senior-dev",
        projectId: "prj-1",
        roleInProject: "Tech Lead",
        allocationPercent: 80,
        isBillable: true,
      },
      {
        userId: "user-dev1",
        projectId: "prj-1",
        roleInProject: "Backend Dev",
        allocationPercent: 100,
        isBillable: true,
      },
      {
        userId: "user-dev2",
        projectId: "prj-1",
        roleInProject: "Frontend Dev",
        allocationPercent: 100,
        isBillable: true,
      },
      {
        userId: "user-tester",
        projectId: "prj-1",
        roleInProject: "QA Engineer",
        allocationPercent: 50,
        isBillable: true,
      },
      {
        userId: "user-ba-lead",
        projectId: "prj-1",
        roleInProject: "BA",
        allocationPercent: 30,
        isBillable: false,
      },
    ],
  },
  {
    id: "prj-2",
    projectCode: "PRJ-2024-002",
    projectName: "Construction ERP - Xây dựng MB",
    description: "Xây dựng hệ thống ERP quản lý toàn diện",
    projectManagerUserId: "user-ba-lead",
    clientId: "cl-2",
    contractId: "ct-2",
    status: "ACTIVE",
    priority: "URGENT",
    healthStatus: "AT_RISK",
    progressPercent: 40,
    startDate: "2024-05-01",
    endDate: "2025-10-31",
    budgetAmount: 2500000000,
    spentAmount: 980000000,
    milestones: [
      {
        id: "ms-8",
        projectId: "prj-2",
        name: "Business Analysis",
        ownerUserId: "user-ba-lead",
        dueDate: "2024-06-30",
        status: "DONE",
        completedAt: "2024-06-25",
      },
      {
        id: "ms-9",
        projectId: "prj-2",
        name: "Module Nhân sự",
        ownerUserId: "user-dev2",
        dueDate: "2024-09-30",
        status: "DONE",
        completedAt: "2024-10-10",
      },
      {
        id: "ms-10",
        projectId: "prj-2",
        name: "Module Tài chính",
        ownerUserId: "user-ba1",
        dueDate: "2024-12-31",
        status: "IN_PROGRESS",
      },
      {
        id: "ms-11",
        projectId: "prj-2",
        name: "Module Vật tư & Kho",
        ownerUserId: "user-junior-dev",
        dueDate: "2025-03-31",
        status: "OVERDUE",
      },
      {
        id: "ms-12",
        projectId: "prj-2",
        name: "Integration & Testing",
        ownerUserId: "user-ba-lead",
        dueDate: "2025-07-31",
        status: "PENDING",
      },
    ],
    assignments: [
      {
        userId: "user-ba-lead",
        projectId: "prj-2",
        roleInProject: "Project Manager",
        allocationPercent: 70,
        isBillable: true,
      },
      {
        userId: "user-ba1",
        projectId: "prj-2",
        roleInProject: "BA",
        allocationPercent: 100,
        isBillable: true,
      },
      {
        userId: "user-dev2",
        projectId: "prj-2",
        roleInProject: "Senior Dev",
        allocationPercent: 0,
        isBillable: true,
      },
      {
        userId: "user-junior-dev",
        projectId: "prj-2",
        roleInProject: "Junior Dev",
        allocationPercent: 100,
        isBillable: true,
      },
    ],
  },
  {
    id: "prj-3",
    projectCode: "PRJ-2023-005",
    projectName: "IT O&M Services - Sở TT&TT",
    description: "Dịch vụ vận hành và bảo trì hệ thống CNTT",
    projectManagerUserId: "user-devops",
    clientId: "cl-3",
    contractId: "ct-3",
    status: "ACTIVE",
    priority: "HIGH",
    healthStatus: "ON_TRACK",
    progressPercent: 85,
    startDate: "2023-07-01",
    endDate: "2025-06-30",
    budgetAmount: 3200000000,
    spentAmount: 2600000000,
    milestones: [
      {
        id: "ms-13",
        projectId: "prj-3",
        name: "Q1 2025 SLA Review",
        ownerUserId: "user-devops",
        dueDate: "2025-03-31",
        status: "DONE",
        completedAt: "2025-03-28",
      },
      {
        id: "ms-14",
        projectId: "prj-3",
        name: "H1 2025 Infrastructure Upgrade",
        ownerUserId: "user-devops",
        dueDate: "2025-06-30",
        status: "IN_PROGRESS",
      },
    ],
    assignments: [
      {
        userId: "user-devops",
        projectId: "prj-3",
        roleInProject: "DevOps Lead",
        allocationPercent: 80,
        isBillable: true,
      },
      {
        userId: "user-tester",
        projectId: "prj-3",
        roleInProject: "Support Eng",
        allocationPercent: 50,
        isBillable: true,
      },
    ],
  },
  {
    id: "prj-4",
    projectCode: "PRJ-2022-003",
    projectName: "POS System - Retail VN",
    description: "Triển khai hệ thống POS cho chuỗi cửa hàng",
    projectManagerUserId: "user-cto",
    clientId: "cl-5",
    contractId: "ct-4",
    status: "COMPLETED",
    priority: "MEDIUM",
    healthStatus: "ON_TRACK",
    progressPercent: 100,
    startDate: "2022-04-01",
    endDate: "2023-03-31",
    budgetAmount: 550000000,
    spentAmount: 498000000,
    milestones: [],
    assignments: [],
  },
  {
    id: "prj-5",
    projectCode: "PRJ-2025-001",
    projectName: "Fintech ABC - MVP Development",
    description: "Phát triển MVP ứng dụng thanh toán di động",
    projectManagerUserId: "user-senior-dev",
    clientId: "cl-4",
    contractId: null,
    status: "PLANNING",
    priority: "HIGH",
    healthStatus: null,
    progressPercent: 0,
    startDate: "2025-05-01",
    endDate: "2025-12-31",
    budgetAmount: 800000000,
    spentAmount: 0,
    milestones: [],
    assignments: [
      {
        userId: "user-senior-dev",
        projectId: "prj-5",
        roleInProject: "Tech Lead",
        allocationPercent: 20,
        isBillable: false,
      },
      {
        userId: "user-ba1",
        projectId: "prj-5",
        roleInProject: "BA",
        allocationPercent: 0,
        isBillable: false,
      },
    ],
  },
];

export const projectExpenses: ProjectExpense[] = [
  {
    id: "pex-1",
    projectId: "prj-1",
    description: "Mua license AWS IoT Core (12 tháng)",
    amount: 85000000,
    category: "SOFTWARE",
    submittedByUserId: "user-senior-dev",
    submittedDate: "2024-04-15",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-04-16",
  },
  {
    id: "pex-2",
    projectId: "prj-1",
    description: "Thiết bị IoT sensor kit test",
    amount: 45000000,
    category: "HARDWARE",
    submittedByUserId: "user-dev1",
    submittedDate: "2024-06-20",
    status: "APPROVED",
    approvedByUserId: "user-senior-dev",
    approvedDate: "2024-06-21",
  },
  {
    id: "pex-3",
    projectId: "prj-1",
    description: "Đào tạo AWS IoT cho team (3 người)",
    amount: 30000000,
    category: "TRAINING",
    submittedByUserId: "user-senior-dev",
    submittedDate: "2024-05-10",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-05-11",
  },
  {
    id: "pex-4",
    projectId: "prj-1",
    description: "Công tác phí đi Hà Nội demo client",
    amount: 12000000,
    category: "TRAVEL",
    submittedByUserId: "user-ba-lead",
    submittedDate: "2024-08-05",
    status: "APPROVED",
    approvedByUserId: "user-senior-dev",
    approvedDate: "2024-08-06",
  },
  {
    id: "pex-5",
    projectId: "prj-1",
    description: "Thuê freelance UI/UX thiết kế dashboard",
    amount: 25000000,
    category: "OUTSOURCE",
    submittedByUserId: "user-senior-dev",
    submittedDate: "2024-09-15",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-09-16",
  },
  {
    id: "pex-6",
    projectId: "prj-1",
    description: "Mua thêm sensor module cho phase 2",
    amount: 38000000,
    category: "HARDWARE",
    submittedByUserId: "user-dev1",
    submittedDate: "2025-02-20",
    status: "PENDING",
  },
  {
    id: "pex-7",
    projectId: "prj-2",
    description: "License Oracle DB Enterprise",
    amount: 120000000,
    category: "SOFTWARE",
    submittedByUserId: "user-ba-lead",
    submittedDate: "2024-06-01",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-06-02",
  },
  {
    id: "pex-8",
    projectId: "prj-2",
    description: "Server Dell PowerEdge R760 (2 units)",
    amount: 180000000,
    category: "HARDWARE",
    submittedByUserId: "user-ba-lead",
    submittedDate: "2024-07-10",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-07-11",
  },
  {
    id: "pex-9",
    projectId: "prj-2",
    description: "Đi khảo sát công trình Quảng Ninh",
    amount: 15000000,
    category: "TRAVEL",
    submittedByUserId: "user-ba1",
    submittedDate: "2024-11-20",
    status: "APPROVED",
    approvedByUserId: "user-ba-lead",
    approvedDate: "2024-11-21",
  },
  {
    id: "pex-10",
    projectId: "prj-2",
    description: "Thuê đội QA external kiểm thử module HR",
    amount: 35000000,
    category: "OUTSOURCE",
    submittedByUserId: "user-ba-lead",
    submittedDate: "2025-01-15",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2025-01-16",
  },
  {
    id: "pex-11",
    projectId: "prj-2",
    description: "Mua license Jira + Confluence (20 users)",
    amount: 22000000,
    category: "SOFTWARE",
    submittedByUserId: "user-junior-dev",
    submittedDate: "2025-03-01",
    status: "PENDING",
  },
  {
    id: "pex-12",
    projectId: "prj-2",
    description: "Công tác phí demo tại văn phòng KH",
    amount: 8000000,
    category: "TRAVEL",
    submittedByUserId: "user-ba1",
    submittedDate: "2025-03-05",
    status: "REJECTED",
    approvedByUserId: "user-ba-lead",
    approvedDate: "2025-03-06",
    rejectReason: "Demo online thay vì đến trực tiếp để tiết kiệm chi phí",
  },
  {
    id: "pex-13",
    projectId: "prj-3",
    description: "Gia hạn license VMware vSphere",
    amount: 95000000,
    category: "SOFTWARE",
    submittedByUserId: "user-devops",
    submittedDate: "2024-12-15",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2024-12-16",
  },
  {
    id: "pex-14",
    projectId: "prj-3",
    description: "Thay thế UPS cho server room",
    amount: 45000000,
    category: "HARDWARE",
    submittedByUserId: "user-devops",
    submittedDate: "2025-01-20",
    status: "APPROVED",
    approvedByUserId: "user-cto",
    approvedDate: "2025-01-21",
  },
  {
    id: "pex-15",
    projectId: "prj-3",
    description: "Đào tạo chứng chỉ AWS Solutions Architect",
    amount: 18000000,
    category: "TRAINING",
    submittedByUserId: "user-devops",
    submittedDate: "2025-02-10",
    status: "PENDING",
  },
  {
    id: "pex-16",
    projectId: "prj-3",
    description: "Thuê bandwidth bổ sung Q2/2025",
    amount: 28000000,
    category: "OTHER",
    submittedByUserId: "user-devops",
    submittedDate: "2025-03-01",
    status: "PENDING",
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceCode: "INV-2024-001",
    clientId: "cl-1",
    contractId: "ct-1",
    projectId: "prj-1",
    status: "PAID",
    issuedDate: "2024-06-01",
    dueDate: "2024-06-30",
    subtotal: 600000000,
    taxAmount: 60000000,
    totalAmount: 660000000,
    paidAmount: 660000000,
    outstandingAmount: 0,
    notes: "Thanh toán đợt 1 – hoàn thành giai đoạn thiết kế",
  },
  {
    id: "inv-2",
    invoiceCode: "INV-2024-002",
    clientId: "cl-1",
    contractId: "ct-1",
    projectId: "prj-1",
    status: "PAID",
    issuedDate: "2024-11-01",
    dueDate: "2024-11-30",
    subtotal: 490909090,
    taxAmount: 49090910,
    totalAmount: 540000000,
    paidAmount: 540000000,
    outstandingAmount: 0,
    notes: "Thanh toán đợt 2 – hoàn thành MVP và frontend",
  },
  {
    id: "inv-3",
    invoiceCode: "INV-2025-001",
    clientId: "cl-1",
    contractId: "ct-1",
    projectId: "prj-1",
    status: "SENT",
    issuedDate: "2025-03-01",
    dueDate: "2025-03-31",
    subtotal: 272727272,
    taxAmount: 27272728,
    totalAmount: 300000000,
    paidAmount: 0,
    outstandingAmount: 300000000,
    notes: "Thanh toán đợt 3 – hoàn thành IoT Integration",
  },
  {
    id: "inv-4",
    invoiceCode: "INV-2024-003",
    clientId: "cl-2",
    contractId: "ct-2",
    projectId: "prj-2",
    status: "PAID",
    issuedDate: "2024-08-01",
    dueDate: "2024-08-31",
    subtotal: 818181818,
    taxAmount: 81818182,
    totalAmount: 900000000,
    paidAmount: 900000000,
    outstandingAmount: 0,
  },
  {
    id: "inv-5",
    invoiceCode: "INV-2024-004",
    clientId: "cl-2",
    contractId: "ct-2",
    projectId: "prj-2",
    status: "PARTIALLY_PAID",
    issuedDate: "2025-01-01",
    dueDate: "2025-01-31",
    subtotal: 818181818,
    taxAmount: 81818182,
    totalAmount: 900000000,
    paidAmount: 500000000,
    outstandingAmount: 400000000,
  },
  {
    id: "inv-6",
    invoiceCode: "INV-2024-005",
    clientId: "cl-3",
    contractId: "ct-3",
    projectId: "prj-3",
    status: "PAID",
    issuedDate: "2025-01-15",
    dueDate: "2025-02-15",
    subtotal: 136363636,
    taxAmount: 13636364,
    totalAmount: 150000000,
    paidAmount: 150000000,
    outstandingAmount: 0,
    notes: "Phí duy trì tháng 1/2025",
  },
  {
    id: "inv-7",
    invoiceCode: "INV-2025-002",
    clientId: "cl-3",
    contractId: "ct-3",
    projectId: "prj-3",
    status: "OVERDUE",
    issuedDate: "2025-02-15",
    dueDate: "2025-03-15",
    subtotal: 136363636,
    taxAmount: 13636364,
    totalAmount: 150000000,
    paidAmount: 0,
    outstandingAmount: 150000000,
    notes: "Phí duy trì tháng 2/2025 — CHƯA THANH TOÁN",
  },
  {
    id: "inv-8",
    invoiceCode: "INV-2025-003",
    clientId: "cl-2",
    contractId: "ct-2",
    projectId: "prj-2",
    status: "DRAFT",
    issuedDate: "2025-03-15",
    dueDate: "2025-04-15",
    subtotal: 363636364,
    taxAmount: 36363636,
    totalAmount: 400000000,
    paidAmount: 0,
    outstandingAmount: 400000000,
    notes: "Đợt thanh toán milestone Module Tài chính – nháp chờ gửi",
  },
];

export const clientPayments: ClientPayment[] = [
  {
    id: "cp-1",
    paymentCode: "TT-2024-001",
    clientId: "cl-1",
    contractId: "ct-1",
    invoiceId: "inv-1",
    amount: 660000000,
    paymentDate: "2024-06-25",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "VCB24062500001",
    status: "COMPLETED",
  },
  {
    id: "cp-2",
    paymentCode: "TT-2024-002",
    clientId: "cl-1",
    contractId: "ct-1",
    invoiceId: "inv-2",
    amount: 540000000,
    paymentDate: "2024-11-28",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "VCB24112800002",
    status: "COMPLETED",
  },
  {
    id: "cp-3",
    paymentCode: "TT-2024-003",
    clientId: "cl-2",
    contractId: "ct-2",
    invoiceId: "inv-4",
    amount: 900000000,
    paymentDate: "2024-08-28",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "TCB24082800003",
    status: "COMPLETED",
  },
  {
    id: "cp-4",
    paymentCode: "TT-2025-001",
    clientId: "cl-2",
    contractId: "ct-2",
    invoiceId: "inv-5",
    amount: 500000000,
    paymentDate: "2025-01-25",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "TCB25012500004",
    status: "COMPLETED",
  },
  {
    id: "cp-5",
    paymentCode: "TT-2025-002",
    clientId: "cl-3",
    contractId: "ct-3",
    invoiceId: "inv-6",
    amount: 150000000,
    paymentDate: "2025-02-10",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "BIDV25021000005",
    status: "COMPLETED",
  },
];

export const contractAmendments: ContractAmendment[] = [
  {
    id: "ca-1",
    contractId: "ct-1",
    amendmentCode: "PL-HĐ-2024-001-01",
    title: "Bổ sung module báo cáo BI",
    description: "Thêm module Business Intelligence với dashboard realtime",
    valueChange: 150000000,
    effectiveDate: "2024-08-01",
    createdByUserId: "user-sales-mgr",
    createdAt: "2024-07-20",
    attachmentName: "PL01_BI_Module_signed.pdf",
  },
  {
    id: "ca-2",
    contractId: "ct-1",
    amendmentCode: "PL-HĐ-2024-001-02",
    title: "Gia hạn thời gian hoàn thành",
    description:
      "Gia hạn deadline từ 31/03/2025 sang 30/06/2025 do thay đổi yêu cầu IoT",
    valueChange: 0,
    newEndDate: "2025-06-30",
    effectiveDate: "2025-01-15",
    createdByUserId: "user-ceo",
    createdAt: "2025-01-10",
    attachmentName: "PL02_Extension_signed.pdf",
  },
  {
    id: "ca-3",
    contractId: "ct-2",
    amendmentCode: "PL-HĐ-2024-002-01",
    title: "Bổ sung module quản lý vật tư",
    description: "Thêm quản lý nhập xuất vật tư cho công trình xây dựng",
    valueChange: 300000000,
    effectiveDate: "2024-10-01",
    createdByUserId: "user-sales1",
    createdAt: "2024-09-15",
    attachmentName: "PL01_VatTu_signed.pdf",
  },
  {
    id: "ca-4",
    contractId: "ct-3",
    amendmentCode: "PL-HĐ-2023-005-01",
    title: "Nâng cấp SLA lên Premium",
    description: "Nâng cấp từ Standard SLA sang Premium SLA với hỗ trợ 24/7",
    valueChange: 200000000,
    effectiveDate: "2024-07-01",
    createdByUserId: "user-sales-mgr",
    createdAt: "2024-06-20",
    attachmentName: "PL01_SLA_Premium.pdf",
  },
];

const calcPayroll = (
  base: number,
  allowances: number,
  workDays: number,
  totalDays: number,
  otMinutes: number,
  bonusAmt: number,
) => {
  const dailyRate = base / totalDays;
  const earnedBase = dailyRate * workDays;
  const otHourly = base / totalDays / 8;
  const otPay = (otMinutes / 60) * otHourly * 1.5;
  const gross = earnedBase + allowances + otPay + bonusAmt;
  const insBase = Math.min(base, 36000000);
  const bhxh = insBase * 0.08;
  const bhyt = insBase * 0.015;
  const bhtn = insBase * 0.01;
  const taxableIncome = gross - bhxh - bhyt - bhtn - 11000000;
  let tax = 0;
  if (taxableIncome > 0) {
    if (taxableIncome <= 5000000) tax = taxableIncome * 0.05;
    else if (taxableIncome <= 10000000)
      tax = 250000 + (taxableIncome - 5000000) * 0.1;
    else if (taxableIncome <= 18000000)
      tax = 750000 + (taxableIncome - 10000000) * 0.15;
    else if (taxableIncome <= 32000000)
      tax = 1950000 + (taxableIncome - 18000000) * 0.2;
    else if (taxableIncome <= 52000000)
      tax = 4750000 + (taxableIncome - 32000000) * 0.25;
    else if (taxableIncome <= 80000000)
      tax = 9750000 + (taxableIncome - 52000000) * 0.3;
    else tax = 18150000 + (taxableIncome - 80000000) * 0.35;
  }
  const totalDeductions = bhxh + bhyt + bhtn + (tax > 0 ? tax : 0);
  const net = gross - totalDeductions;
  return {
    grossSalary: gross,
    totalAllowances: allowances,
    totalBonus: bonusAmt,
    totalOvertimePay: otPay,
    socialInsuranceEmployee: bhxh,
    healthInsuranceEmployee: bhyt,
    unemploymentInsuranceEmployee: bhtn,
    personalIncomeTax: tax > 0 ? tax : 0,
    totalDeductions,
    netSalary: net,
  };
};

const staffPayrolls = [
  {
    userId: "user-ceo",
    base: 60000000,
    allowances: 6000000,
    workDays: 23,
    otMin: 0,
    bonus: 10000000,
  },
  {
    userId: "user-cto",
    base: 50000000,
    allowances: 4800000,
    workDays: 23,
    otMin: 0,
    bonus: 5000000,
  },
  {
    userId: "user-hr-mgr",
    base: 25000000,
    allowances: 3230000,
    workDays: 22,
    otMin: 0,
    bonus: 0,
  },
  {
    userId: "user-senior-dev",
    base: 35000000,
    allowances: 2230000,
    workDays: 23,
    otMin: 180,
    bonus: 3000000,
  },
  {
    userId: "user-dev1",
    base: 22000000,
    allowances: 1230000,
    workDays: 21,
    otMin: 120,
    bonus: 0,
  },
  {
    userId: "user-dev2",
    base: 20000000,
    allowances: 730000,
    workDays: 23,
    otMin: 0,
    bonus: 0,
  },
  {
    userId: "user-sales-mgr",
    base: 28000000,
    allowances: 5200000,
    workDays: 23,
    otMin: 0,
    bonus: 8000000,
  },
  {
    userId: "user-fin-mgr",
    base: 30000000,
    allowances: 3730000,
    workDays: 22,
    otMin: 0,
    bonus: 0,
  },
  {
    userId: "user-accountant",
    base: 16000000,
    allowances: 730000,
    workDays: 23,
    otMin: 0,
    bonus: 0,
  },
  {
    userId: "user-ba-lead",
    base: 25000000,
    allowances: 2230000,
    workDays: 22,
    otMin: 60,
    bonus: 0,
  },
  {
    userId: "user-devops",
    base: 28000000,
    allowances: 2230000,
    workDays: 23,
    otMin: 240,
    bonus: 0,
  },
  {
    userId: "user-tester",
    base: 18000000,
    allowances: 730000,
    workDays: 23,
    otMin: 90,
    bonus: 0,
  },
];

const buildRecords = (): PayrollRecord[] => {
  return staffPayrolls.map((s, i) => {
    const calc = calcPayroll(
      s.base,
      s.allowances,
      s.workDays,
      23,
      s.otMin,
      s.bonus,
    );
    const items: PayrollRecordItem[] = [
      {
        itemName: "Lương cơ bản",
        itemType: "EARNING",
        sourceType: "BASE",
        amount: (s.base / 23) * s.workDays,
      },
      {
        itemName: "Tổng phụ cấp",
        itemType: "EARNING",
        sourceType: "ALLOWANCE",
        amount: s.allowances,
      },
    ];
    if (calc.totalOvertimePay > 0)
      items.push({
        itemName: "Lương làm thêm giờ",
        itemType: "EARNING",
        sourceType: "OVERTIME",
        amount: calc.totalOvertimePay,
      });
    if (s.bonus > 0)
      items.push({
        itemName: "Thưởng tháng 1",
        itemType: "EARNING",
        sourceType: "BONUS",
        amount: s.bonus,
      });
    items.push({
      itemName: "BHXH (8%)",
      itemType: "DEDUCTION",
      sourceType: "INSURANCE",
      amount: calc.socialInsuranceEmployee,
    });
    items.push({
      itemName: "BHYT (1.5%)",
      itemType: "DEDUCTION",
      sourceType: "INSURANCE",
      amount: calc.healthInsuranceEmployee,
    });
    items.push({
      itemName: "BHTN (1%)",
      itemType: "DEDUCTION",
      sourceType: "INSURANCE",
      amount: calc.unemploymentInsuranceEmployee,
    });
    if (calc.personalIncomeTax > 0)
      items.push({
        itemName: "Thuế TNCN",
        itemType: "DEDUCTION",
        sourceType: "TAX",
        amount: calc.personalIncomeTax,
      });
    return {
      id: `pr-${i}`,
      payrollPeriodId: "pp-1",
      userId: s.userId,
      baseSalary: s.base,
      workingDays: s.workDays,
      ...calc,
      status: "PAID",
      items,
    };
  });
};

export const payrollPeriods: PayrollPeriod[] = [
  {
    id: "pp-1",
    periodCode: "2025-01",
    month: 1,
    year: 2025,
    status: "PAID",
    workingDaysInPeriod: 23,
    records: buildRecords(),
  },
  {
    id: "pp-2",
    periodCode: "2025-02",
    month: 2,
    year: 2025,
    status: "APPROVED",
    workingDaysInPeriod: 20,
    records: [],
  },
  {
    id: "pp-3",
    periodCode: "2025-03",
    month: 3,
    year: 2025,
    status: "CALCULATING",
    workingDaysInPeriod: 26,
    records: [],
  },
];

export const notifications: Notification[] = [
  {
    id: "n-1",
    recipientUserId: "user-hr-mgr",
    senderUserId: "user-dev1",
    type: "ATTENDANCE_CHECKIN_REQUEST",
    title: "Yêu cầu check-in mới",
    message: "Võ Thị Hương gửi yêu cầu check-in lúc 08:12 ngày hôm nay.",
    isRead: false,
    createdAt: "2025-03-12T08:12:00",
  },
  {
    id: "n-2",
    recipientUserId: "user-hr-staff",
    senderUserId: "user-dev2",
    type: "ATTENDANCE_CHECKIN_REQUEST",
    title: "Yêu cầu check-in mới",
    message: "Bùi Văn Ích gửi yêu cầu check-in lúc 08:05 ngày hôm nay.",
    isRead: false,
    createdAt: "2025-03-12T08:05:00",
  },
  {
    id: "n-3",
    recipientUserId: "user-hr-mgr",
    senderUserId: "user-ba1",
    type: "ATTENDANCE_CHECKIN_REQUEST",
    title: "Yêu cầu check-in mới",
    message: "Nguyễn Thị Oanh gửi yêu cầu check-in lúc 09:01 ngày hôm nay.",
    isRead: false,
    createdAt: "2025-03-12T09:01:00",
  },
  {
    id: "n-4",
    recipientUserId: "user-hr-mgr",
    senderUserId: "user-devops",
    type: "ATTENDANCE_CHECKOUT_REQUEST",
    title: "Yêu cầu check-out mới",
    message: "Nguyễn Văn Long gửi yêu cầu check-out lúc 17:35.",
    isRead: false,
    createdAt: "2025-03-12T17:35:00",
  },
  {
    id: "n-5",
    recipientUserId: "user-senior-dev",
    senderUserId: "user-dev2",
    type: "LEAVE_REQUEST_CREATED",
    title: "Đơn nghỉ phép mới chờ duyệt",
    message:
      "Bùi Văn Ích xin nghỉ phép 3 ngày (07–09/04/2025) cần bạn duyệt bước 1.",
    isRead: false,
    createdAt: "2025-03-28T10:00:00",
  },
  {
    id: "n-6",
    recipientUserId: "user-hr-mgr",
    senderUserId: "user-ba1",
    type: "LEAVE_REQUEST_CREATED",
    title: "Đơn nghỉ phép chờ HR duyệt",
    message:
      "Nguyễn Thị Oanh xin nghỉ phép 2 ngày (14–15/04/2025), Manager đã duyệt bước 1.",
    isRead: false,
    createdAt: "2025-04-02T10:00:00",
  },
  {
    id: "n-7",
    recipientUserId: "user-dev1",
    senderUserId: "user-hr-mgr",
    type: "LEAVE_REQUEST_APPROVED",
    title: "Đơn nghỉ phép được duyệt",
    message: "Đơn nghỉ phép của bạn từ 10–12/02/2025 đã được phê duyệt.",
    isRead: true,
    readAt: "2025-02-07T12:00:00",
    createdAt: "2025-02-07T10:00:00",
  },
  {
    id: "n-8",
    recipientUserId: "user-tester",
    senderUserId: "user-senior-dev",
    type: "LEAVE_REQUEST_REJECTED",
    title: "Đơn nghỉ phép bị từ chối",
    message:
      "Đơn nghỉ phép của bạn (15–16/03/2025) bị từ chối. Lý do: Đang cao điểm release.",
    isRead: true,
    readAt: "2025-03-12T08:00:00",
    createdAt: "2025-03-11T14:00:00",
  },
  {
    id: "n-9",
    recipientUserId: "user-senior-dev",
    senderUserId: "user-cto",
    type: "OVERTIME_APPROVED",
    title: "Yêu cầu OT được duyệt",
    message: "OT ngày 14/03/2025 (18:00–21:00) của bạn đã được phê duyệt.",
    isRead: true,
    readAt: "2025-03-13T08:00:00",
    createdAt: "2025-03-13T07:00:00",
  },
  {
    id: "n-10",
    recipientUserId: "user-ceo",
    senderUserId: "user-sales-mgr",
    type: "CONTRACT_EXPIRING_SOON",
    title: "Hợp đồng sắp hết hạn",
    message:
      "HĐ-2023-005 (Sở TT&TT HCM) sẽ hết hạn vào ngày 30/06/2025 — còn 90 ngày.",
    isRead: false,
    createdAt: "2025-03-10T08:00:00",
  },
  {
    id: "n-11",
    recipientUserId: "user-fin-mgr",
    senderUserId: "user-sales-mgr",
    type: "INVOICE_OVERDUE",
    title: "Hóa đơn quá hạn thanh toán",
    message:
      "INV-2025-002 (Sở TT&TT HCM – 150.000.000 ₫) đã quá hạn từ 15/03/2025.",
    isRead: false,
    createdAt: "2025-03-16T08:00:00",
  },
  {
    id: "n-12",
    recipientUserId: "user-accountant",
    senderUserId: "user-sales-mgr",
    type: "INVOICE_OVERDUE",
    title: "Hóa đơn quá hạn thanh toán",
    message:
      "INV-2025-002 (Sở TT&TT HCM – 150.000.000 ₫) đã quá hạn từ 15/03/2025.",
    isRead: false,
    createdAt: "2025-03-16T08:00:00",
  },
  {
    id: "n-13",
    recipientUserId: "user-senior-dev",
    senderUserId: "user-admin",
    type: "PAYSLIP_AVAILABLE",
    title: "Bảng lương tháng 1/2025 đã sẵn sàng",
    message:
      "Bảng lương tháng 01/2025 của bạn đã được xử lý. Tiền thưởng: 3.000.000 ₫",
    isRead: false,
    createdAt: "2025-02-05T09:00:00",
  },
  {
    id: "n-14",
    recipientUserId: "user-junior-dev",
    senderUserId: "user-ba-lead",
    type: "MILESTONE_DUE_SOON",
    title: "Milestone sắp đến hạn",
    message:
      'Milestone "Module Vật tư & Kho" của dự án Construction ERP đã quá hạn (31/03/2025).',
    isRead: false,
    createdAt: "2025-03-28T09:00:00",
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "al-1",
    actorUserId: "user-admin",
    entityType: "USER",
    actionType: "CREATE",
    description: "Tạo tài khoản Nguyễn Thị Rose (EMP020)",
    ipAddress: "192.168.1.100",
    createdAt: "2025-03-01T10:00:00",
    newValues: {
      email: "nguyen.thi.rose@techvn.com",
      fullName: "Nguyễn Thị Rose",
      accountStatus: "PENDING",
    },
  },
  {
    id: "al-2",
    actorUserId: "user-hr-mgr",
    entityType: "LEAVE_REQUEST",
    actionType: "APPROVE",
    description: "Duyệt đơn nghỉ phép của Võ Thị Hương (10–12/02/2025)",
    ipAddress: "192.168.1.101",
    createdAt: "2025-02-07T09:00:00",
  },
  {
    id: "al-3",
    actorUserId: "user-ceo",
    entityType: "PAYROLL_PERIOD",
    actionType: "APPROVE",
    description: "Phê duyệt kỳ lương tháng 01/2025",
    ipAddress: "192.168.1.102",
    createdAt: "2025-02-03T14:00:00",
  },
  {
    id: "al-4",
    actorUserId: "user-hr-mgr",
    entityType: "ATTENDANCE_REQUEST",
    actionType: "APPROVE",
    description: "Duyệt yêu cầu check-in của Đỗ Văn Kiên",
    ipAddress: "192.168.1.101",
    createdAt: "2025-03-12T08:30:00",
  },
  {
    id: "al-5",
    actorUserId: "user-senior-dev",
    entityType: "LEAVE_REQUEST",
    actionType: "REJECT",
    description:
      "Từ chối đơn nghỉ phép của Đỗ Văn Kiên — Đang cao điểm release",
    ipAddress: "192.168.1.103",
    createdAt: "2025-03-11T10:00:00",
    oldValues: { status: "PENDING" },
    newValues: { status: "REJECTED", rejectionReason: "Đang cao điểm release" },
  },
  {
    id: "al-6",
    actorUserId: "user-cto",
    entityType: "OVERTIME_REQUEST",
    actionType: "APPROVE",
    description: "Duyệt OT 3 giờ cho Nguyễn Minh Giang ngày 14/03/2025",
    ipAddress: "192.168.1.104",
    createdAt: "2025-03-13T07:00:00",
  },
  {
    id: "al-7",
    actorUserId: "user-admin",
    entityType: "USER",
    actionType: "STATUS_CHANGE",
    description: "Khoá tài khoản test do đăng nhập sai nhiều lần",
    ipAddress: "192.168.1.100",
    createdAt: "2025-03-10T16:00:00",
    oldValues: { accountStatus: "ACTIVE" },
    newValues: { accountStatus: "LOCKED" },
  },
  {
    id: "al-8",
    actorUserId: "user-sales-mgr",
    entityType: "CONTRACT",
    actionType: "SEND",
    description: "Gửi hóa đơn INV-2025-001 cho FutureTech VN",
    ipAddress: "192.168.1.105",
    createdAt: "2025-03-01T10:30:00",
  },
];

const compBase = {
  salaryType: "MONTHLY" as const,
  currency: "VND",
  overtimeRateWeekday: 1.5,
  overtimeRateWeekend: 2.0,
  overtimeRateHoliday: 3.0,
  payFrequency: "MONTHLY" as const,
  payDayOfMonth: 10,
};
export const userCompensations: UserCompensation[] = [
  {
    id: "uc-1",
    userId: "user-ceo",
    effectiveDate: "2020-01-15",
    baseSalary: 40000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2020-01-15",
  },
  {
    id: "uc-2",
    userId: "user-ceo",
    effectiveDate: "2022-01-01",
    baseSalary: 50000000,
    ...compBase,
    isActive: false,
    reason: "Điều chỉnh lương năm 2022",
    changeReason: "Điều chỉnh lương năm 2022",
    createdByUserId: "user-admin",
    createdAt: "2021-12-20",
  },
  {
    id: "uc-3",
    userId: "user-ceo",
    effectiveDate: "2024-01-01",
    baseSalary: 60000000,
    ...compBase,
    isActive: true,
    reason: "Điều chỉnh lương năm 2024",
    changeReason: "Điều chỉnh lương năm 2024",
    createdByUserId: "user-admin",
    createdAt: "2023-12-15",
  },
  {
    id: "uc-4",
    userId: "user-cto",
    effectiveDate: "2020-02-01",
    baseSalary: 35000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2020-02-01",
  },
  {
    id: "uc-5",
    userId: "user-cto",
    effectiveDate: "2022-07-01",
    baseSalary: 42000000,
    ...compBase,
    isActive: false,
    reason: "Tăng lương định kỳ",
    changeReason: "Tăng lương định kỳ",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-06-20",
  },
  {
    id: "uc-6",
    userId: "user-cto",
    effectiveDate: "2024-01-01",
    baseSalary: 50000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương năm 2024",
    changeReason: "Tăng lương năm 2024",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-12-15",
  },
  {
    id: "uc-7",
    userId: "user-senior-dev",
    effectiveDate: "2021-03-01",
    baseSalary: 22000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2021-03-01",
  },
  {
    id: "uc-8",
    userId: "user-senior-dev",
    effectiveDate: "2022-07-01",
    baseSalary: 28000000,
    ...compBase,
    isActive: false,
    reason: "Tăng lương sau 1 năm",
    changeReason: "Tăng lương sau 1 năm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-06-25",
  },
  {
    id: "uc-9",
    userId: "user-senior-dev",
    effectiveDate: "2024-01-01",
    baseSalary: 35000000,
    ...compBase,
    isActive: true,
    reason: "Thăng chức Senior Dev",
    changeReason: "Thăng chức Senior Dev",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-12-20",
  },
  {
    id: "uc-10",
    userId: "user-hr-mgr",
    effectiveDate: "2020-03-01",
    baseSalary: 18000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2020-03-01",
  },
  {
    id: "uc-11",
    userId: "user-hr-mgr",
    effectiveDate: "2023-01-01",
    baseSalary: 25000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương định kỳ",
    changeReason: "Tăng lương định kỳ",
    createdByUserId: "user-admin",
    createdAt: "2022-12-20",
  },
  {
    id: "uc-12",
    userId: "user-dev1",
    effectiveDate: "2022-06-01",
    baseSalary: 16000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-06-01",
  },
  {
    id: "uc-13",
    userId: "user-dev1",
    effectiveDate: "2024-01-01",
    baseSalary: 22000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương sau review",
    changeReason: "Tăng lương sau review",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-12-15",
  },
  {
    id: "uc-14",
    userId: "user-dev2",
    effectiveDate: "2022-09-15",
    baseSalary: 15000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-09-15",
  },
  {
    id: "uc-15",
    userId: "user-dev2",
    effectiveDate: "2024-01-01",
    baseSalary: 20000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương định kỳ",
    changeReason: "Tăng lương định kỳ",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-12-15",
  },
  {
    id: "uc-16",
    userId: "user-sales-mgr",
    effectiveDate: "2020-04-01",
    baseSalary: 20000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2020-04-01",
  },
  {
    id: "uc-17",
    userId: "user-sales-mgr",
    effectiveDate: "2023-01-01",
    baseSalary: 28000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương & thăng chức",
    changeReason: "Tăng lương & thăng chức",
    createdByUserId: "user-admin",
    createdAt: "2022-12-20",
  },
  {
    id: "uc-18",
    userId: "user-fin-mgr",
    effectiveDate: "2020-05-01",
    baseSalary: 22000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2020-05-01",
  },
  {
    id: "uc-19",
    userId: "user-fin-mgr",
    effectiveDate: "2023-01-01",
    baseSalary: 30000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương định kỳ",
    changeReason: "Tăng lương định kỳ",
    createdByUserId: "user-admin",
    createdAt: "2022-12-20",
  },
  // Additional employees
  {
    id: "uc-20",
    userId: "user-tester",
    effectiveDate: "2023-04-01",
    baseSalary: 15000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-04-01",
  },
  {
    id: "uc-21",
    userId: "user-devops",
    effectiveDate: "2021-11-01",
    baseSalary: 20000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2021-11-01",
  },
  {
    id: "uc-22",
    userId: "user-devops",
    effectiveDate: "2024-01-01",
    baseSalary: 28000000,
    ...compBase,
    isActive: true,
    reason: "Tăng lương định kỳ",
    changeReason: "Tăng lương định kỳ",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-12-15",
  },
  {
    id: "uc-23",
    userId: "user-hr-staff",
    effectiveDate: "2022-01-10",
    baseSalary: 14000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-01-10",
  },
  {
    id: "uc-24",
    userId: "user-sales1",
    effectiveDate: "2023-02-01",
    baseSalary: 16000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-02-01",
  },
  {
    id: "uc-25",
    userId: "user-sales2",
    effectiveDate: "2023-08-01",
    baseSalary: 15000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-08-01",
  },
  {
    id: "uc-26",
    userId: "user-accountant",
    effectiveDate: "2021-07-01",
    baseSalary: 16000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2021-07-01",
  },
  {
    id: "uc-27",
    userId: "user-ba-lead",
    effectiveDate: "2021-01-15",
    baseSalary: 22000000,
    ...compBase,
    isActive: false,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2021-01-15",
  },
  {
    id: "uc-28",
    userId: "user-ba-lead",
    effectiveDate: "2023-07-01",
    baseSalary: 30000000,
    ...compBase,
    isActive: true,
    reason: "Thăng chức BA Lead",
    changeReason: "Thăng chức BA Lead",
    createdByUserId: "user-hr-mgr",
    createdAt: "2023-06-20",
  },
  {
    id: "uc-29",
    userId: "user-ba1",
    effectiveDate: "2022-11-01",
    baseSalary: 16000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-hr-mgr",
    createdAt: "2022-11-01",
  },
  {
    id: "uc-30",
    userId: "user-mkt-mgr",
    effectiveDate: "2021-06-01",
    baseSalary: 25000000,
    ...compBase,
    isActive: true,
    reason: "Lương khởi điểm",
    changeReason: "Lương khởi điểm",
    createdByUserId: "user-admin",
    createdAt: "2021-06-01",
  },
  // Probation employees
  {
    id: "uc-31",
    userId: "user-junior-dev",
    effectiveDate: "2024-01-15",
    baseSalary: 12000000,
    ...compBase,
    probationSalary: 10200000,
    probationEndDate: "2024-03-15",
    isActive: true,
    reason: "Lương thử việc",
    changeReason: "Lương thử việc",
    createdByUserId: "user-hr-mgr",
    createdAt: "2024-01-15",
  },
  {
    id: "uc-32",
    userId: "user-probation1",
    effectiveDate: "2025-02-01",
    baseSalary: 13000000,
    ...compBase,
    probationSalary: 11050000,
    probationEndDate: "2025-04-01",
    isActive: true,
    reason: "Lương thử việc",
    changeReason: "Lương thử việc",
    createdByUserId: "user-hr-mgr",
    createdAt: "2025-02-01",
  },
  {
    id: "uc-33",
    userId: "user-pending1",
    effectiveDate: "2025-03-01",
    baseSalary: 14000000,
    ...compBase,
    probationSalary: 11900000,
    probationEndDate: "2025-05-01",
    isActive: true,
    reason: "Lương thử việc",
    changeReason: "Lương thử việc",
    createdByUserId: "user-hr-mgr",
    createdAt: "2025-03-01",
  },
];

export const userSalaryComponents: UserSalaryComponent[] = [
  {
    id: "usc-1",
    userId: "user-ceo",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 2000000,
    isActive: true,
    effectiveDate: "2024-01-01",
    note: "Phụ cấp liên lạc CEO",
  },
  {
    id: "usc-2",
    userId: "user-ceo",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 3000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-3",
    userId: "user-ceo",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-4",
    userId: "user-cto",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 1500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-5",
    userId: "user-cto",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 2300000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-6",
    userId: "user-cto",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-7",
    userId: "user-senior-dev",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-8",
    userId: "user-senior-dev",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-9",
    userId: "user-senior-dev",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-10",
    userId: "user-hr-mgr",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-11",
    userId: "user-hr-mgr",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 1500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-12",
    userId: "user-hr-mgr",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-13",
    userId: "user-dev1",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-14",
    userId: "user-dev1",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-15",
    userId: "user-dev2",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-16",
    userId: "user-sales-mgr",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 1500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-17",
    userId: "user-sales-mgr",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 2500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-18",
    userId: "user-sales-mgr",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 1200000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-19",
    userId: "user-fin-mgr",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-20",
    userId: "user-fin-mgr",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 2000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-21",
    userId: "user-fin-mgr",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-22",
    userId: "user-devops",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-23",
    userId: "user-devops",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-24",
    userId: "user-devops",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-25",
    userId: "user-tester",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-26",
    userId: "user-ba-lead",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-27",
    userId: "user-ba-lead",
    componentName: "Phụ cấp xăng xe",
    componentCode: "PC_XANG_XE",
    amount: 1000000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-28",
    userId: "user-ba-lead",
    componentName: "Phụ cấp điện thoại",
    componentCode: "PC_DIEN_THOAI",
    amount: 500000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
  {
    id: "usc-29",
    userId: "user-accountant",
    componentName: "Phụ cấp ăn trưa",
    componentCode: "PC_AN_TRUA",
    amount: 730000,
    isActive: true,
    effectiveDate: "2024-01-01",
  },
];

export const payrollAdjustments: PayrollAdjustment[] = [
  {
    id: "pa-1",
    userId: "user-senior-dev",
    type: "BONUS",
    amount: 3000000,
    reason: "Thưởng hoàn thành dự án VPBank",
    periodId: "pp-1",
    status: "APPLIED",
    createdByUserId: "user-cto",
    approvedByUserId: "user-hr-mgr",
    createdAt: "2025-01-20",
    approvedAt: "2025-01-22",
  },
  {
    id: "pa-2",
    userId: "user-ceo",
    type: "BONUS",
    amount: 10000000,
    reason: "Thưởng Q4/2024",
    periodId: "pp-1",
    status: "APPLIED",
    createdByUserId: "user-admin",
    approvedByUserId: "user-admin",
    createdAt: "2025-01-15",
    approvedAt: "2025-01-15",
  },
  {
    id: "pa-3",
    userId: "user-sales-mgr",
    type: "BONUS",
    amount: 8000000,
    reason: "Thưởng doanh số Q4/2024",
    periodId: "pp-1",
    status: "APPLIED",
    createdByUserId: "user-ceo",
    approvedByUserId: "user-hr-mgr",
    createdAt: "2025-01-18",
    approvedAt: "2025-01-20",
  },
  {
    id: "pa-4",
    userId: "user-dev1",
    type: "ADVANCE",
    amount: 5000000,
    reason: "Tạm ứng lương tháng 2",
    periodId: "pp-2",
    status: "APPROVED",
    createdByUserId: "user-dev1",
    approvedByUserId: "user-hr-mgr",
    createdAt: "2025-02-10",
    approvedAt: "2025-02-12",
  },
  {
    id: "pa-5",
    userId: "user-devops",
    type: "BONUS",
    amount: 2000000,
    reason: "Thưởng OT dự án migration",
    status: "PENDING",
    createdByUserId: "user-cto",
    createdAt: "2025-03-05",
  },
  {
    id: "pa-6",
    userId: "user-tester",
    type: "DEDUCTION",
    amount: 500000,
    reason: "Khấu trừ đi trễ 5 lần trong tháng 2",
    periodId: "pp-2",
    status: "APPROVED",
    createdByUserId: "user-hr-mgr",
    approvedByUserId: "user-hr-mgr",
    createdAt: "2025-02-28",
    approvedAt: "2025-03-01",
  },
  {
    id: "pa-7",
    userId: "user-ba-lead",
    type: "BONUS",
    amount: 1500000,
    reason: "Thưởng sáng kiến quy trình BA",
    status: "PENDING",
    createdByUserId: "user-cto",
    createdAt: "2025-03-10",
  },
  {
    id: "pa-8",
    userId: "user-dev2",
    type: "ADVANCE",
    amount: 3000000,
    reason: "Tạm ứng lương tháng 3",
    status: "REJECTED",
    createdByUserId: "user-dev2",
    approvedByUserId: "user-hr-mgr",
    createdAt: "2025-03-08",
    approvedAt: "2025-03-09",
    note: "Đã tạm ứng 2 lần trong quý, vượt hạn mức",
  },
];

export const insurancePolicies: InsurancePolicy[] = [
  {
    id: "ins-1",
    name: "Bảo hiểm xã hội (BHXH)",
    code: "BHXH",
    employeeRate: 0.08,
    employerRate: 0.175,
    salaryCap: 36000000,
    isActive: true,
    effectiveDate: "2024-07-01",
    note: "Theo Luật BHXH 2024",
  },
  {
    id: "ins-2",
    name: "Bảo hiểm y tế (BHYT)",
    code: "BHYT",
    employeeRate: 0.015,
    employerRate: 0.03,
    salaryCap: 36000000,
    isActive: true,
    effectiveDate: "2024-07-01",
    note: "Mức trần 36 triệu",
  },
  {
    id: "ins-3",
    name: "Bảo hiểm thất nghiệp (BHTN)",
    code: "BHTN",
    employeeRate: 0.01,
    employerRate: 0.01,
    salaryCap: 36000000,
    isActive: true,
    effectiveDate: "2024-07-01",
    note: "Mức trần 20 lần lương tối thiểu vùng",
  },
];

export const taxPolicies: TaxPolicy[] = [
  {
    id: "tax-1",
    name: "Biểu thuế TNCN lũy tiến từng phần",
    personalDeduction: 11000000,
    dependentDeduction: 4400000,
    isActive: true,
    effectiveDate: "2020-07-01",
    brackets: [
      {
        level: 1,
        fromAmount: 0,
        toAmount: 5000000,
        rate: 0.05,
        quickDeduction: 0,
      },
      {
        level: 2,
        fromAmount: 5000000,
        toAmount: 10000000,
        rate: 0.1,
        quickDeduction: 250000,
      },
      {
        level: 3,
        fromAmount: 10000000,
        toAmount: 18000000,
        rate: 0.15,
        quickDeduction: 750000,
      },
      {
        level: 4,
        fromAmount: 18000000,
        toAmount: 32000000,
        rate: 0.2,
        quickDeduction: 1950000,
      },
      {
        level: 5,
        fromAmount: 32000000,
        toAmount: 52000000,
        rate: 0.25,
        quickDeduction: 4750000,
      },
      {
        level: 6,
        fromAmount: 52000000,
        toAmount: 80000000,
        rate: 0.3,
        quickDeduction: 9750000,
      },
      {
        level: 7,
        fromAmount: 80000000,
        toAmount: null,
        rate: 0.35,
        quickDeduction: 18150000,
      },
    ],
  },
];

export const authTokens: AuthToken[] = [
  {
    id: "at-1",
    userId: "user-pending1",
    tokenType: "ACCOUNT_SETUP",
    token: "setup-token-abc123",
    isUsed: false,
    expiresAt: "2025-03-15T00:00:00",
    createdAt: "2025-03-01T10:00:00",
    createdByUserId: "user-admin",
  },
  {
    id: "at-2",
    userId: "user-probation1",
    tokenType: "ACCOUNT_SETUP",
    token: "setup-token-def456",
    isUsed: true,
    expiresAt: "2025-02-15T00:00:00",
    createdAt: "2025-02-01T10:00:00",
    createdByUserId: "user-admin",
  },
];

export const userWorkShifts: UserWorkShift[] = [
  // Ca sáng - active
  {
    id: "uws-1",
    userId: "user-dev1",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2023-01-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2023-01-01T00:00:00",
  },
  {
    id: "uws-2",
    userId: "user-dev2",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2023-01-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2023-01-01T00:00:00",
  },
  {
    id: "uws-3",
    userId: "user-senior-dev",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2021-06-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2021-06-01T00:00:00",
  },
  {
    id: "uws-4",
    userId: "user-tester",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2023-04-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2023-04-01T00:00:00",
  },
  {
    id: "uws-5",
    userId: "user-hr-mgr",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2020-03-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2020-03-01T00:00:00",
  },
  {
    id: "uws-6",
    userId: "user-ba-lead",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2021-01-15",
    effectiveTo: null,
    isActive: true,
    createdAt: "2021-01-15T00:00:00",
  },
  // Ca chiều - active
  {
    id: "uws-7",
    userId: "user-devops",
    shiftId: "ws-2",
    dayOfWeek: null,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    isActive: true,
    notes: "Chuyển sang ca chiều theo yêu cầu",
    createdAt: "2024-01-01T00:00:00",
  },
  {
    id: "uws-8",
    userId: "user-junior-dev",
    shiftId: "ws-2",
    dayOfWeek: null,
    effectiveFrom: "2024-06-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2024-06-01T00:00:00",
  },
  {
    id: "uws-9",
    userId: "user-accountant",
    shiftId: "ws-2",
    dayOfWeek: null,
    effectiveFrom: "2024-03-01",
    effectiveTo: null,
    isActive: true,
    createdAt: "2024-03-01T00:00:00",
  },
  // Lịch sử cũ (inactive)
  {
    id: "uws-10",
    userId: "user-devops",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2022-01-01",
    effectiveTo: "2023-12-31",
    isActive: false,
    notes: "Ca sáng cũ trước khi chuyển",
    createdAt: "2022-01-01T00:00:00",
  },
  {
    id: "uws-11",
    userId: "user-junior-dev",
    shiftId: "ws-1",
    dayOfWeek: null,
    effectiveFrom: "2024-01-15",
    effectiveTo: "2024-05-31",
    isActive: false,
    notes: "Ca sáng ban đầu",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: "uws-12",
    userId: "user-dev1",
    shiftId: "ws-4",
    dayOfWeek: null,
    effectiveFrom: "2022-06-01",
    effectiveTo: "2022-12-31",
    isActive: false,
    notes: "Giờ linh hoạt thử nghiệm",
    createdAt: "2022-06-01T00:00:00",
  },
];

export const systemConfigs: SystemConfig[] = [
  {
    id: "sc-1",
    key: "company_name",
    value: "TechVN",
    description: "Tên công ty hiển thị trên hệ thống",
  },
  {
    id: "sc-2",
    key: "company_address",
    value: "123 Nguyễn Huệ, Q.1, TP.HCM",
    description: "Địa chỉ công ty",
  },
  {
    id: "sc-3",
    key: "default_timezone",
    value: "Asia/Ho_Chi_Minh",
    description: "Múi giờ mặc định",
  },
  {
    id: "sc-4",
    key: "work_hours_per_day",
    value: "8",
    description: "Số giờ làm việc tiêu chuẩn mỗi ngày",
  },
  {
    id: "sc-5",
    key: "work_days_per_week",
    value: "5",
    description: "Số ngày làm việc mỗi tuần",
  },
  {
    id: "sc-6",
    key: "default_annual_leave_days",
    value: "12",
    description: "Số ngày phép năm mặc định khi tạo nhân viên mới",
  },
  {
    id: "sc-7",
    key: "max_failed_login_attempts",
    value: "5",
    description: "Số lần đăng nhập sai tối đa trước khi khoá tài khoản",
  },
  {
    id: "sc-8",
    key: "session_timeout_minutes",
    value: "480",
    description: "Thời gian session hết hạn (phút)",
  },
  {
    id: "sc-9",
    key: "late_tolerance_minutes",
    value: "10",
    description: "Số phút trễ được bỏ qua khi tính chấm công",
  },
  {
    id: "sc-10",
    key: "payslip_visible_days_before_payday",
    value: "3",
    description:
      "Nhân viên được xem payslip trước ngày trả lương bao nhiêu ngày",
  },
];

// ─── Helpers ────────────────────────────────────────────────

export const getUserById = (id: string) => users.find((u) => u.id === id);
export const getDepartmentById = (id: string) =>
  departments.find((d) => d.id === id);
export const getJobTitleById = (id: string) =>
  jobTitles.find((j) => j.id === id);
export const getLeaveTypeById = (id: string) =>
  leaveTypes.find((l) => l.id === id);
export const getClientById = (id: string) => clients.find((c) => c.id === id);
export const getContractById = (id: string) =>
  contracts.find((c) => c.id === id);
export const getProjectById = (id: string) => projects.find((p) => p.id === id);
export const getShiftById = (id: string) => workShifts.find((s) => s.id === id);

export const formatVND = (amount: number): string => {
  if (Math.abs(amount) >= 1000000000)
    return `${(amount / 1000000000).toFixed(1)}tỷ`;
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(0)}tr`;
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " ₫";
};

export const formatFullVND = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " ₫";
};

export const hasRole = (user: User, ...roleCodes: RoleCode[]): boolean => {
  return roleCodes.some((r) => user.roles.includes(r));
};

export const isAdminOrHR = (user: User) => hasRole(user, "ADMIN", "HR");

// Tính ngày trả lương tiếp theo dựa vào UserCompensation active
export function getNextPayDate(userId: string): string | null {
  const comp = userCompensations.find((c) => c.userId === userId && c.isActive);
  if (!comp || comp.payDayOfMonth === undefined) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (comp.payFrequency === "MONTHLY") {
    const thisMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      Math.min(
        comp.payDayOfMonth,
        new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
      ),
    );
    if (thisMonth >= today) return thisMonth.toISOString().slice(0, 10);
    const nextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      Math.min(
        comp.payDayOfMonth,
        new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate(),
      ),
    );
    return nextMonth.toISOString().slice(0, 10);
  }

  if (comp.payFrequency === "BIWEEKLY") {
    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();
    const d1 = new Date(
      today.getFullYear(),
      today.getMonth(),
      Math.min(comp.payDayOfMonth, lastDay),
    );
    const d2 = new Date(today.getFullYear(), today.getMonth(), lastDay);
    if (d1 >= today) return d1.toISOString().slice(0, 10);
    if (d2 >= today) return d2.toISOString().slice(0, 10);
    const nextLastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 2,
      0,
    ).getDate();
    return new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      Math.min(comp.payDayOfMonth, nextLastDay),
    )
      .toISOString()
      .slice(0, 10);
  }

  // WEEKLY: next Friday
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  return nextFriday.toISOString().slice(0, 10);
}

export const getActiveCompensation = (
  userId: string,
): UserCompensation | undefined => {
  return userCompensations.find((c) => c.userId === userId && c.isActive);
};

export const payFrequencyLabels: Record<PayFrequency, string> = {
  MONTHLY: "Hàng tháng",
  BIWEEKLY: "2 lần/tháng",
  WEEKLY: "Hàng tuần",
};

export const salaryTypeLabels: Record<string, string> = {
  MONTHLY: "Tháng",
  DAILY: "Ngày",
  HOURLY: "Giờ",
};

export const getPayDayLabel = (comp: UserCompensation): string => {
  if (comp.payDayOfMonth === undefined) return "Theo lịch công ty";
  if (comp.payFrequency === "MONTHLY")
    return `Ngày ${comp.payDayOfMonth} hàng tháng`;
  if (comp.payFrequency === "BIWEEKLY")
    return `Ngày ${comp.payDayOfMonth} & cuối tháng`;
  return "Thứ Sáu hàng tuần";
};

// Lấy ca làm việc mặc định đang active của một nhân viên (null nếu chưa gán)
export const getActiveWorkShift = (userId: string): UserWorkShift | null => {
  return userWorkShifts.find((s) => s.userId === userId && s.isActive) ?? null;
};

// Lấy giá trị SystemConfig theo key
export const getConfig = (key: string, fallback = ""): string => {
  return systemConfigs.find((c) => c.key === key)?.value ?? fallback;
};

// ─── Task Management ────────────────────────────────────────

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date
  priority: TaskPriority;
  status: TaskStatus;
  sourceMessage?: string;
  projectId: string | null;
  assignedToUserId: string | null;
  createdByUserId: string;
  estimatedHours: number;
  actualHours: number | null;
  completedAt: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export const tasks: Task[] = [
  // TODO tasks
  {
    id: "task-1",
    title: "Thiết kế database schema cho module Task Management",
    description:
      "Phân tích yêu cầu và thiết kế ERD cho module quản lý công việc, bao gồm các bảng tasks, task_comments, task_assignments",
    deadline: "2026-04-02",
    priority: "HIGH",
    status: "TODO",
    sourceMessage: "Từ cuộc họp sprint planning ngày 28/03",
    projectId: "prj-1",
    assignedToUserId: "user-dev1",
    createdByUserId: "user-senior-dev",
    estimatedHours: 8,
    actualHours: null,
    completedAt: null,
    commentCount: 2,
    createdAt: "2026-03-26T09:00:00",
    updatedAt: "2026-03-27T14:30:00",
  },
  {
    id: "task-2",
    title: "Viết API endpoint GET /api/tasks với filters",
    description:
      "Implement REST API để lấy danh sách tasks với các bộ lọc: status, priority, project, assignee, deadline range. Hỗ trợ pagination và sorting.",
    deadline: "2026-04-05",
    priority: "URGENT",
    status: "TODO",
    sourceMessage: null,
    projectId: "prj-1",
    assignedToUserId: "user-dev2",
    createdByUserId: "user-senior-dev",
    estimatedHours: 12,
    actualHours: null,
    completedAt: null,
    commentCount: 0,
    createdAt: "2026-03-26T10:15:00",
    updatedAt: "2026-03-26T10:15:00",
  },
  {
    id: "task-3",
    title: "Chuẩn bị demo cho khách hàng FutureTech",
    description:
      "Chuẩn bị slide và demo môi trường staging về tính năng báo cáo kho",
    deadline: "2026-03-30",
    priority: "HIGH",
    status: "TODO",
    sourceMessage: "Email từ khách hàng ngày 25/03",
    projectId: "prj-1",
    assignedToUserId: "user-ba-lead",
    createdByUserId: "user-senior-dev",
    estimatedHours: 6,
    actualHours: null,
    completedAt: null,
    commentCount: 3,
    createdAt: "2026-03-25T16:20:00",
    updatedAt: "2026-03-27T11:00:00",
  },
  {
    id: "task-4",
    title: "Refactor module authentication cũ",
    description:
      "Chuyển từ JWT library cũ sang jose, cập nhật middleware và unit tests",
    deadline: "2026-04-10",
    priority: "MEDIUM",
    status: "TODO",
    sourceMessage: null,
    projectId: "prj-2",
    assignedToUserId: "user-dev3",
    createdByUserId: "user-cto",
    estimatedHours: 16,
    actualHours: null,
    completedAt: null,
    commentCount: 1,
    createdAt: "2026-03-24T08:00:00",
    updatedAt: "2026-03-26T09:45:00",
  },
  {
    id: "task-5",
    title: "Nghiên cứu giải pháp real-time notification",
    description:
      "So sánh WebSocket vs Server-Sent Events vs Polling cho hệ thống thông báo real-time. Đánh giá ưu nhược điểm và đề xuất giải pháp phù hợp.",
    deadline: "2026-04-08",
    priority: "MEDIUM",
    status: "TODO",
    sourceMessage: "Từ backlog refinement",
    projectId: null,
    assignedToUserId: "user-senior-dev",
    createdByUserId: "user-cto",
    estimatedHours: 10,
    actualHours: null,
    completedAt: null,
    commentCount: 0,
    createdAt: "2026-03-23T13:30:00",
    updatedAt: "2026-03-23T13:30:00",
  },

  // IN_PROGRESS tasks
  {
    id: "task-6",
    title: "Implement UI cho Kanban Board (Task Management)",
    description:
      "Xây dựng giao diện Kanban board với drag & drop, sử dụng react-dnd. Cần hỗ trợ responsive và dark mode.",
    deadline: "2026-04-03",
    priority: "HIGH",
    status: "IN_PROGRESS",
    sourceMessage: null,
    projectId: "prj-1",
    assignedToUserId: "user-dev2",
    createdByUserId: "user-senior-dev",
    estimatedHours: 20,
    actualHours: null,
    completedAt: null,
    commentCount: 5,
    createdAt: "2026-03-22T09:00:00",
    updatedAt: "2026-03-28T10:30:00",
  },
  {
    id: "task-7",
    title: "Fix bug pagination ở trang Employees",
    description:
      "Khi filter theo department và chuyển sang page 2, bộ lọc bị reset. Cần persist filter state trong URL query params.",
    deadline: "2026-03-29",
    priority: "URGENT",
    status: "IN_PROGRESS",
    sourceMessage: "Bug report từ HR team",
    projectId: null,
    assignedToUserId: "user-dev1",
    createdByUserId: "user-hr-mgr",
    estimatedHours: 4,
    actualHours: null,
    completedAt: null,
    commentCount: 2,
    createdAt: "2026-03-27T14:00:00",
    updatedAt: "2026-03-28T09:15:00",
  },
  {
    id: "task-8",
    title: "Viết unit tests cho PayrollService",
    description:
      "Cover các function: calculateGrossSalary, calculateTax, calculateInsurance, calculateNetSalary. Target coverage >= 85%.",
    deadline: "2026-04-01",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    sourceMessage: null,
    projectId: "prj-3",
    assignedToUserId: "user-dev3",
    createdByUserId: "user-cto",
    estimatedHours: 12,
    actualHours: null,
    completedAt: null,
    commentCount: 1,
    createdAt: "2026-03-26T11:00:00",
    updatedAt: "2026-03-27T16:20:00",
  },
  {
    id: "task-9",
    title: "Tạo báo cáo doanh thu theo tháng cho Sales",
    description:
      "Thêm màn hình báo cáo doanh thu phân theo sales, theo khách hàng, theo dự án. Export Excel và PDF.",
    deadline: "2026-04-07",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    sourceMessage: "Yêu cầu từ Trưởng phòng Kinh doanh",
    projectId: null,
    assignedToUserId: "user-dev1",
    createdByUserId: "user-sales-mgr",
    estimatedHours: 16,
    actualHours: null,
    completedAt: null,
    commentCount: 4,
    createdAt: "2026-03-20T10:30:00",
    updatedAt: "2026-03-27T15:00:00",
  },

  // IN_REVIEW tasks
  {
    id: "task-10",
    title: "Code review: Module Attendance Admin",
    description:
      "Review PR #245 - Thêm tính năng bulk approve/reject attendance requests. Kiểm tra logic, security, performance.",
    deadline: "2026-03-29",
    priority: "HIGH",
    status: "IN_REVIEW",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: "user-senior-dev",
    createdByUserId: "user-dev2",
    estimatedHours: 3,
    actualHours: 2.5,
    completedAt: null,
    commentCount: 7,
    createdAt: "2026-03-26T15:00:00",
    updatedAt: "2026-03-28T11:00:00",
  },
  {
    id: "task-11",
    title: "Optimze query slow ở dashboard ADMIN",
    description:
      "Dashboard ADMIN load > 5s khi có nhiều dữ liệu. Đã thêm index và optimize query, cần review và test performance.",
    deadline: "2026-03-30",
    priority: "URGENT",
    status: "IN_REVIEW",
    sourceMessage: "Performance issue từ production",
    projectId: null,
    assignedToUserId: "user-cto",
    createdByUserId: "user-dev1",
    estimatedHours: 6,
    actualHours: 7,
    completedAt: null,
    commentCount: 3,
    createdAt: "2026-03-25T09:00:00",
    updatedAt: "2026-03-28T08:30:00",
  },
  {
    id: "task-12",
    title: "Setup CI/CD pipeline cho môi trường staging",
    description:
      "Config GitHub Actions để auto deploy lên staging server khi merge vào branch develop. Include lint, test, build.",
    deadline: "2026-04-02",
    priority: "MEDIUM",
    status: "IN_REVIEW",
    sourceMessage: null,
    projectId: "prj-2",
    assignedToUserId: "user-devops",
    createdByUserId: "user-cto",
    estimatedHours: 10,
    actualHours: 9,
    completedAt: null,
    commentCount: 2,
    createdAt: "2026-03-24T14:00:00",
    updatedAt: "2026-03-27T17:00:00",
  },

  // DONE tasks
  {
    id: "task-13",
    title: "Thiết kế UI/UX cho module Payroll",
    description:
      "Thiết kế wireframe và mockup cho các màn hình: danh sách kỳ lương, chi tiết phiếu lương, cấu hình lương. Đã hoàn thành và được approve.",
    deadline: "2026-03-25",
    priority: "HIGH",
    status: "DONE",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: "user-ba-lead",
    createdByUserId: "user-hr-mgr",
    estimatedHours: 12,
    actualHours: 14,
    completedAt: "2026-03-25T17:30:00",
    commentCount: 8,
    createdAt: "2026-03-18T09:00:00",
    updatedAt: "2026-03-25T17:30:00",
  },
  {
    id: "task-14",
    title: "Migrate database từ MySQL sang PostgreSQL",
    description:
      "Export data, convert schema, import vào PostgreSQL. Test toàn bộ tính năng sau khi migrate.",
    deadline: "2026-03-20",
    priority: "URGENT",
    status: "DONE",
    sourceMessage: "Quyết định từ Architecture Review",
    projectId: "prj-2",
    assignedToUserId: "user-devops",
    createdByUserId: "user-cto",
    estimatedHours: 24,
    actualHours: 28,
    completedAt: "2026-03-20T22:00:00",
    commentCount: 15,
    createdAt: "2026-03-10T08:00:00",
    updatedAt: "2026-03-20T22:00:00",
  },
  {
    id: "task-15",
    title: "Viết tài liệu API cho module Projects",
    description:
      "Tạo OpenAPI spec cho tất cả endpoints của module Projects. Include examples và error codes.",
    deadline: "2026-03-22",
    priority: "MEDIUM",
    status: "DONE",
    sourceMessage: null,
    projectId: "prj-1",
    assignedToUserId: "user-ba1",
    createdByUserId: "user-senior-dev",
    estimatedHours: 8,
    actualHours: 10,
    completedAt: "2026-03-22T16:00:00",
    commentCount: 4,
    createdAt: "2026-03-15T10:00:00",
    updatedAt: "2026-03-22T16:00:00",
  },
  {
    id: "task-16",
    title: "Implement forgot password flow",
    description:
      "Xây dựng flow quên mật khẩu: gửi email reset link, validate token, update password. Include rate limiting.",
    deadline: "2026-03-18",
    priority: "HIGH",
    status: "DONE",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: "user-dev2",
    createdByUserId: "user-senior-dev",
    estimatedHours: 10,
    actualHours: 11,
    completedAt: "2026-03-18T18:30:00",
    commentCount: 6,
    createdAt: "2026-03-12T09:00:00",
    updatedAt: "2026-03-18T18:30:00",
  },
  {
    id: "task-17",
    title: "Setup monitoring với Prometheus + Grafana",
    description:
      "Cài đặt và cấu hình Prometheus để thu thập metrics, setup Grafana dashboard cho CPU, Memory, Request rate, Error rate.",
    deadline: "2026-03-15",
    priority: "MEDIUM",
    status: "DONE",
    sourceMessage: "Yêu cầu từ DevOps roadmap",
    projectId: "prj-2",
    assignedToUserId: "user-devops",
    createdByUserId: "user-cto",
    estimatedHours: 16,
    actualHours: 18,
    completedAt: "2026-03-15T19:00:00",
    commentCount: 9,
    createdAt: "2026-03-05T08:00:00",
    updatedAt: "2026-03-15T19:00:00",
  },

  // CANCELLED tasks
  {
    id: "task-18",
    title: "Tích hợp payment gateway MoMo",
    description:
      "Integrate MoMo API cho thanh toán online. Cancelled vì khách hàng đổi ý chọn VNPay.",
    deadline: "2026-03-28",
    priority: "MEDIUM",
    status: "CANCELLED",
    sourceMessage: "Yêu cầu từ khách hàng",
    projectId: "prj-3",
    assignedToUserId: "user-dev3",
    createdByUserId: "user-sales-mgr",
    estimatedHours: 20,
    actualHours: null,
    completedAt: null,
    commentCount: 3,
    createdAt: "2026-03-19T10:00:00",
    updatedAt: "2026-03-27T09:00:00",
  },
  {
    id: "task-19",
    title: "Làm mobile app React Native",
    description:
      "POC mobile app cho module chấm công. Cancelled vì quyết định làm PWA thay vì native app.",
    deadline: "2026-04-15",
    priority: "LOW",
    status: "CANCELLED",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: null,
    createdByUserId: "user-cto",
    estimatedHours: 40,
    actualHours: null,
    completedAt: null,
    commentCount: 5,
    createdAt: "2026-03-10T11:00:00",
    updatedAt: "2026-03-25T14:00:00",
  },

  // Overdue tasks (deadline trong quá khứ, status không phải DONE/CANCELLED)
  {
    id: "task-20",
    title: "Fix security vulnerability CVE-2024-XXXX",
    description:
      "Update thư viện axios lên version mới nhất để patch lỗ hổng bảo mật. URGENT - Quá hạn!",
    deadline: "2026-03-26",
    priority: "URGENT",
    status: "TODO",
    sourceMessage: "Security alert từ GitHub Dependabot",
    projectId: null,
    assignedToUserId: "user-senior-dev",
    createdByUserId: "user-cto",
    estimatedHours: 2,
    actualHours: null,
    completedAt: null,
    commentCount: 1,
    createdAt: "2026-03-24T08:00:00",
    updatedAt: "2026-03-24T08:00:00",
  },
  {
    id: "task-21",
    title: "Update handbook nhân viên mới",
    description:
      "Cập nhật tài liệu hướng dẫn cho nhân viên mới về quy trình onboarding, sử dụng hệ thống nội bộ.",
    deadline: "2026-03-27",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: "user-hr1",
    createdByUserId: "user-hr-mgr",
    estimatedHours: 8,
    actualHours: null,
    completedAt: null,
    commentCount: 2,
    createdAt: "2026-03-20T09:00:00",
    updatedAt: "2026-03-26T15:00:00",
  },

  // Unassigned tasks
  {
    id: "task-22",
    title: "Nghiên cứu AI/ML cho dự báo doanh thu",
    description:
      "Tìm hiểu các thuật toán ML phù hợp để dự báo doanh thu dựa trên historical data. Unassigned - cần người có kinh nghiệm ML.",
    deadline: "2026-04-20",
    priority: "LOW",
    status: "TODO",
    sourceMessage: null,
    projectId: null,
    assignedToUserId: null,
    createdByUserId: "user-ceo",
    estimatedHours: 30,
    actualHours: null,
    completedAt: null,
    commentCount: 0,
    createdAt: "2026-03-28T10:00:00",
    updatedAt: "2026-03-28T10:00:00",
  },
];

export const taskComments: TaskComment[] = [
  // Comments for task-1
  {
    id: "tc-1",
    taskId: "task-1",
    userId: "user-senior-dev",
    content:
      "Đã draft ERD sơ bộ, anh check giúp em nhé. Có thắc mắc về việc có nên tách bảng task_attachments ra riêng không?",
    isEdited: false,
    createdAt: "2026-03-27T10:00:00",
    updatedAt: "2026-03-27T10:00:00",
  },
  {
    id: "tc-2",
    taskId: "task-1",
    userId: "user-dev1",
    content:
      "Em nghĩ nên tách ra, vì 1 task có thể có nhiều attachments. Plus dễ query hơn.",
    isEdited: false,
    createdAt: "2026-03-27T14:30:00",
    updatedAt: "2026-03-27T14:30:00",
  },

  // Comments for task-3
  {
    id: "tc-3",
    taskId: "task-3",
    userId: "user-ba-lead",
    content:
      "Đã chuẩn bị xong slide, đang setup môi trường staging. Dự kiến hoàn thành chiều mai.",
    isEdited: false,
    createdAt: "2026-03-27T11:00:00",
    updatedAt: "2026-03-27T11:00:00",
  },
  {
    id: "tc-4",
    taskId: "task-3",
    userId: "user-senior-dev",
    content: "Ok, nếu cần support gì cứ ping anh nhé.",
    isEdited: false,
    createdAt: "2026-03-27T11:15:00",
    updatedAt: "2026-03-27T11:15:00",
  },
  {
    id: "tc-5",
    taskId: "task-3",
    userId: "user-ba-lead",
    content: "Đã test xong trên staging, mọi thứ work ổn. Ready cho demo!",
    isEdited: false,
    createdAt: "2026-03-28T16:00:00",
    updatedAt: "2026-03-28T16:00:00",
  },

  // Comments for task-4
  {
    id: "tc-6",
    taskId: "task-4",
    userId: "user-dev3",
    content:
      "Em đang tìm hiểu jose library, có vẻ API hơi khác so với jsonwebtoken cũ.",
    isEdited: false,
    createdAt: "2026-03-26T09:45:00",
    updatedAt: "2026-03-26T09:45:00",
  },

  // Comments for task-6
  {
    id: "tc-7",
    taskId: "task-6",
    userId: "user-dev2",
    content:
      "Đã implement xong drag & drop basic, đang làm phần restrictions theo role (employee không được drag vào DONE/CANCELLED).",
    isEdited: false,
    createdAt: "2026-03-25T15:00:00",
    updatedAt: "2026-03-25T15:00:00",
  },
  {
    id: "tc-8",
    taskId: "task-6",
    userId: "user-senior-dev",
    content:
      "Nice! Nhớ thêm confirmation dialog khi drag vào DONE nhé, cần input actual hours.",
    isEdited: false,
    createdAt: "2026-03-25T15:30:00",
    updatedAt: "2026-03-25T15:30:00",
  },
  {
    id: "tc-9",
    taskId: "task-6",
    userId: "user-dev2",
    content: "Roger that! Đang implement dialog đó.",
    isEdited: false,
    createdAt: "2026-03-25T16:00:00",
    updatedAt: "2026-03-25T16:00:00",
  },
  {
    id: "tc-10",
    taskId: "task-6",
    userId: "user-dev2",
    content:
      "Update: Đã xong confirmation dialog và role restrictions. Giờ đang làm responsive cho mobile/tablet.",
    isEdited: true,
    createdAt: "2026-03-28T10:30:00",
    updatedAt: "2026-03-28T11:00:00",
  },
  {
    id: "tc-11",
    taskId: "task-6",
    userId: "user-cto",
    content: "Good progress! Dark mode support chưa em?",
    isEdited: false,
    createdAt: "2026-03-28T14:00:00",
    updatedAt: "2026-03-28T14:00:00",
  },

  // Comments for task-7
  {
    id: "tc-12",
    taskId: "task-7",
    userId: "user-dev1",
    content:
      "Đã reproduce bug, đang fix bằng cách sync filter state vào URL params.",
    isEdited: false,
    createdAt: "2026-03-27T16:00:00",
    updatedAt: "2026-03-27T16:00:00",
  },
  {
    id: "tc-13",
    taskId: "task-7",
    userId: "user-dev1",
    content: "Fixed và đang test. Sẽ tạo PR chiều nay.",
    isEdited: false,
    createdAt: "2026-03-28T09:15:00",
    updatedAt: "2026-03-28T09:15:00",
  },

  // Comments for task-8
  {
    id: "tc-14",
    taskId: "task-8",
    userId: "user-dev3",
    content:
      "Coverage hiện tại đạt 72%, đang viết thêm test cases cho edge cases.",
    isEdited: false,
    createdAt: "2026-03-27T16:20:00",
    updatedAt: "2026-03-27T16:20:00",
  },

  // Comments for task-9
  {
    id: "tc-15",
    taskId: "task-9",
    userId: "user-dev1",
    content: "Đã implement xong charts bằng recharts, đang làm export Excel.",
    isEdited: false,
    createdAt: "2026-03-27T15:00:00",
    updatedAt: "2026-03-27T15:00:00",
  },
  {
    id: "tc-16",
    taskId: "task-9",
    userId: "user-sales-mgr",
    content:
      "Em có thể thêm filter theo quarter không? VD: Q1 2026, Q2 2026...",
    isEdited: false,
    createdAt: "2026-03-27T15:30:00",
    updatedAt: "2026-03-27T15:30:00",
  },
  {
    id: "tc-17",
    taskId: "task-9",
    userId: "user-dev1",
    content: "Dạ được ạ, em sẽ thêm vào.",
    isEdited: false,
    createdAt: "2026-03-27T15:45:00",
    updatedAt: "2026-03-27T15:45:00",
  },
  {
    id: "tc-18",
    taskId: "task-9",
    userId: "user-dev1",
    content: "Đã thêm quarter filter và year-over-year comparison chart.",
    isEdited: false,
    createdAt: "2026-03-28T11:00:00",
    updatedAt: "2026-03-28T11:00:00",
  },

  // Comments for task-10
  {
    id: "tc-19",
    taskId: "task-10",
    userId: "user-senior-dev",
    content:
      "PR code nhìn clean, logic đúng. Nhưng em cần thêm error handling cho trường hợp bulk operation fails ở giữa chừng.",
    isEdited: false,
    createdAt: "2026-03-27T09:00:00",
    updatedAt: "2026-03-27T09:00:00",
  },
  {
    id: "tc-20",
    taskId: "task-10",
    userId: "user-dev2",
    content: "Dạ em sẽ thêm transaction rollback và error logging chi tiết.",
    isEdited: false,
    createdAt: "2026-03-27T10:00:00",
    updatedAt: "2026-03-27T10:00:00",
  },
  {
    id: "tc-21",
    taskId: "task-10",
    userId: "user-dev2",
    content:
      "Đã update PR với error handling và tests. Anh review lại giúp em.",
    isEdited: false,
    createdAt: "2026-03-27T16:00:00",
    updatedAt: "2026-03-27T16:00:00",
  },
  {
    id: "tc-22",
    taskId: "task-10",
    userId: "user-senior-dev",
    content: "LGTM! Approved. Good work 👍",
    isEdited: false,
    createdAt: "2026-03-28T11:00:00",
    updatedAt: "2026-03-28T11:00:00",
  },
  {
    id: "tc-23",
    taskId: "task-10",
    userId: "user-dev2",
    content: "Thanks anh! Em merge nhé.",
    isEdited: false,
    createdAt: "2026-03-28T11:15:00",
    updatedAt: "2026-03-28T11:15:00",
  },
  {
    id: "tc-24",
    taskId: "task-10",
    userId: "user-cto",
    content: "Nice collaboration team 🚀",
    isEdited: false,
    createdAt: "2026-03-28T14:30:00",
    updatedAt: "2026-03-28T14:30:00",
  },
  {
    id: "tc-25",
    taskId: "task-10",
    userId: "user-dev2",
    content: "Merged to develop. Will deploy to staging tomorrow.",
    isEdited: true,
    createdAt: "2026-03-28T15:00:00",
    updatedAt: "2026-03-28T15:30:00",
  },

  // Comments for task-11
  {
    id: "tc-26",
    taskId: "task-11",
    userId: "user-dev1",
    content:
      "Load time giảm từ 5.2s xuống 1.8s sau khi thêm composite index và optimize N+1 queries.",
    isEdited: false,
    createdAt: "2026-03-28T08:30:00",
    updatedAt: "2026-03-28T08:30:00",
  },
  {
    id: "tc-27",
    taskId: "task-11",
    userId: "user-cto",
    content: "Impressive! Anh sẽ test trên staging rồi approve.",
    isEdited: false,
    createdAt: "2026-03-28T09:00:00",
    updatedAt: "2026-03-28T09:00:00",
  },
  {
    id: "tc-28",
    taskId: "task-11",
    userId: "user-dev1",
    content: "Em đã push thêm explain analyze results vào PR description.",
    isEdited: false,
    createdAt: "2026-03-28T10:00:00",
    updatedAt: "2026-03-28T10:00:00",
  },

  // Comments for task-12
  {
    id: "tc-29",
    taskId: "task-12",
    userId: "user-devops",
    content: "CI/CD pipeline works! Auto deployment to staging successful.",
    isEdited: false,
    createdAt: "2026-03-27T17:00:00",
    updatedAt: "2026-03-27T17:00:00",
  },
  {
    id: "tc-30",
    taskId: "task-12",
    userId: "user-cto",
    content: "Great! Cần thêm notification khi deployment fail không?",
    isEdited: false,
    createdAt: "2026-03-27T17:30:00",
    updatedAt: "2026-03-27T17:30:00",
  },

  // Comments for task-13 (DONE)
  {
    id: "tc-31",
    taskId: "task-13",
    userId: "user-ba-lead",
    content: "Đã hoàn thành wireframe cho 5 màn hình chính.",
    isEdited: false,
    createdAt: "2026-03-22T10:00:00",
    updatedAt: "2026-03-22T10:00:00",
  },
  {
    id: "tc-32",
    taskId: "task-13",
    userId: "user-hr-mgr",
    content: "Mockup đẹp quá! Approve nhé.",
    isEdited: false,
    createdAt: "2026-03-25T14:00:00",
    updatedAt: "2026-03-25T14:00:00",
  },
  {
    id: "tc-33",
    taskId: "task-13",
    userId: "user-ba-lead",
    content: "Cảm ơn chị! Em đã export tất cả assets và handoff cho dev team.",
    isEdited: false,
    createdAt: "2026-03-25T17:30:00",
    updatedAt: "2026-03-25T17:30:00",
  },

  // More comments for other completed/cancelled tasks...
  {
    id: "tc-34",
    taskId: "task-20",
    userId: "user-cto",
    content: "URGENT - Fix ngay hôm nay!",
    isEdited: false,
    createdAt: "2026-03-24T08:15:00",
    updatedAt: "2026-03-24T08:15:00",
  },
  {
    id: "tc-35",
    taskId: "task-21",
    userId: "user-hr1",
    content: "Đã update được 60%, còn phần benefits và payroll process.",
    isEdited: false,
    createdAt: "2026-03-26T15:00:00",
    updatedAt: "2026-03-26T15:00:00",
  },
  {
    id: "tc-36",
    taskId: "task-21",
    userId: "user-hr-mgr",
    content: "Em cố gắng hoàn thành trước cuối tuần nhé.",
    isEdited: false,
    createdAt: "2026-03-27T09:00:00",
    updatedAt: "2026-03-27T09:00:00",
  },
];

export const getTaskById = (id: string) => tasks.find((t) => t.id === id);
export const getTaskComments = (taskId: string) =>
  taskComments.filter((c) => c.taskId === taskId);

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "Chưa làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Đang review",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};
