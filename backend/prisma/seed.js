//  Mật khẩu mặc định: TechVN@2025
// ============================================================

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb"); // <-- Thêm thư viện Adapter
const bcrypt = require("bcryptjs");
require("dotenv").config(); // <-- Thêm dòng này để đọc được file .env

// Khởi tạo Adapter với chuỗi kết nối từ file .env
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

// Truyền adapter vào PrismaClient (Bắt buộc ở Prisma 7)
const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});
const SALT = 10;
const DEFAULT_PW = "TechVN@2025";

// ─────────────────────────────────────────────────────────────
// Helper: tính lương (dùng để tạo PayrollRecord)
// ─────────────────────────────────────────────────────────────
function calcPayroll(
  baseSalary,
  allowances,
  workDays,
  stdDays,
  otMinutes,
  bonus,
) {
  const earnedBase = (baseSalary / stdDays) * workDays;
  const hourlyRate = baseSalary / stdDays / 8;
  const otPay = (otMinutes / 60) * 1.5 * hourlyRate;
  const gross = earnedBase + allowances + otPay + bonus;
  const insBase = Math.min(baseSalary, 36_000_000);
  const bhxh = insBase * 0.08;
  const bhyt = insBase * 0.015;
  const bhtn = insBase * 0.01;
  const taxable = Math.max(0, gross - bhxh - bhyt - bhtn - 11_000_000);
  let tax = 0;
  if (taxable > 0) {
    if (taxable <= 5_000_000) tax = taxable * 0.05;
    else if (taxable <= 10_000_000) tax = 250_000 + (taxable - 5_000_000) * 0.1;
    else if (taxable <= 18_000_000)
      tax = 750_000 + (taxable - 10_000_000) * 0.15;
    else if (taxable <= 32_000_000)
      tax = 1_950_000 + (taxable - 18_000_000) * 0.2;
    else if (taxable <= 52_000_000)
      tax = 4_750_000 + (taxable - 32_000_000) * 0.25;
    else if (taxable <= 80_000_000)
      tax = 9_750_000 + (taxable - 52_000_000) * 0.3;
    else tax = 18_150_000 + (taxable - 80_000_000) * 0.35;
    if (tax < 0) tax = 0;
  }
  return {
    earnedBase,
    grossSalary: gross,
    totalAllowances: allowances,
    totalBonus: bonus,
    totalOvertimePay: otPay,
    socialInsuranceEmployee: bhxh,
    healthInsuranceEmployee: bhyt,
    unemploymentInsuranceEmployee: bhtn,
    personalIncomeTax: tax,
    totalDeductions: bhxh + bhyt + bhtn + tax,
    netSalary: gross - bhxh - bhyt - bhtn - tax,
    taxableIncome: taxable,
    dailyRate: baseSalary / stdDays,
    hourlyRate,
  };
}

// ─────────────────────────────────────────────────────────────
// IDs cố định (để cross-reference)
// ─────────────────────────────────────────────────────────────
const R = {
  admin: "role-admin",
  hr: "role-hr",
  manager: "role-manager",
  employee: "role-employee",
  sales: "role-sales",
  accountant: "role-accountant",
};
const D = {
  tech: "dept-tech",
  hr: "dept-hr",
  sales: "dept-sales",
  acct: "dept-acct",
  product: "dept-product",
};
const JT = {
  admin: "jt-admin",
  hrMgr: "jt-hr-mgr",
  hrSpec: "jt-hr-spec",
  techLead: "jt-tech-lead",
  seniorDev: "jt-senior-dev",
  juniorDev: "jt-junior-dev",
  pm: "jt-pm",
  salesMgr: "jt-sales-mgr",
  salesExec: "jt-sales-exec",
  chiefAcct: "jt-chief-acct",
  acct: "jt-acct",
  designer: "jt-designer",
};
const U = {
  admin: "u-admin",
  hr: "u-hr",
  techLead: "u-tech-lead",
  salesMgr: "u-sales-mgr",
  chiefAcct: "u-chief-acct",
  pm: "u-pm",
  dev1: "u-dev1",
  dev2: "u-dev2",
  dev3: "u-dev3",
  dev4: "u-dev4",
  sales1: "u-sales1",
  sales2: "u-sales2",
  hr1: "u-hr1",
  acct1: "u-acct1",
  designer: "u-designer",
};
const SH = {
  morning: "shift-morning",
  flex: "shift-flex",
  night: "shift-night",
};
const LT = {
  annual: "lt-annual",
  sick: "lt-sick",
  maternity: "lt-maternity",
  unpaid: "lt-unpaid",
};
const SC = {
  transport: "sc-transport",
  phone: "sc-phone",
  meal: "sc-meal",
  resp: "sc-resp",
  perf: "sc-perf",
};
const PP = { m01: "pp-2025-01", m02: "pp-2025-02", m03: "pp-2025-03" };
const CL = { alpha: "cl-alpha", beta: "cl-beta", gamma: "cl-gamma" };
const CT = { c01: "ct-01", c02: "ct-02", c03: "ct-03" };
const PJ = { p01: "pj-01", p02: "pj-02", p03: "pj-03" };
const IV = { i01: "inv-001", i02: "inv-002", i03: "inv-003" };

// ─────────────────────────────────────────────────────────────
// 0. XÓA DỮ LIỆU CŨ
// ─────────────────────────────────────────────────────────────
async function cleanDatabase() {
  // Xóa circular refs trước
  await prisma.department.updateMany({ data: { headUserId: null } });
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.project.updateMany({ data: { contractId: null } });
  await prisma.projectMilestone.updateMany({ data: { invoiceId: null } });

  // Xóa theo thứ tự reverse FK
  const tables = [
    "auditLog",
    "notification",
    "userSession",
    "authToken",
    "clientDocument",
    "clientPayment",
    "invoiceItem",
    "invoice",
    "projectMilestone",
    "projectExpense",
    "userProjectAssignment",
    "project",
    "contractAmendment",
    "contract",
    "clientContact",
    "client",
    "payrollRecordItem",
    "payrollAdjustment",
    "payrollRecord",
    "payrollPeriod",
    "userSalaryComponent",
    "userCompensation",
    "salaryComponent",
    "taxBracket",
    "taxPolicy",
    "insurancePolicy",
    "overtimeRequest",
    "attendanceRecord",
    "attendanceRequest",
    "leaveRequestApproval",
    "leaveRequest",
    "leaveBalance",
    "leaveType",
    "holiday",
    "workShift",
    "userRole",
    "userProfile",
    "user",
    "department",
    "jobTitle",
    "role",
  ];
  for (const t of tables) {
    await prisma[t].deleteMany();
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   TechVN HR System — Seed v3.2         ║");
  console.log("╚════════════════════════════════════════╝\n");

  const pw = await bcrypt.hash(DEFAULT_PW, SALT);
  console.log("🔐 Đã hash password\n");

  console.log("🗑  Xóa dữ liệu cũ...");
  await cleanDatabase();
  console.log("   ✓ Done\n");

  // ══════════════════════════════════════════════════
  // 1. ROLES
  // ══════════════════════════════════════════════════
  console.log("1️⃣  Roles...");
  await prisma.role.createMany({
    data: [
      {
        id: R.admin,
        code: "ADMIN",
        name: "Quản trị viên",
        description: "Toàn quyền hệ thống",
      },
      {
        id: R.hr,
        code: "HR",
        name: "Nhân sự",
        description: "Quản lý nhân sự, lương, nghỉ phép",
      },
      {
        id: R.manager,
        code: "MANAGER",
        name: "Quản lý",
        description: "Trưởng phòng/nhóm",
      },
      {
        id: R.employee,
        code: "EMPLOYEE",
        name: "Nhân viên",
        description: "Nhân viên thông thường",
      },
      {
        id: R.sales,
        code: "SALES",
        name: "Kinh doanh",
        description: "Sales, account manager",
      },
      {
        id: R.accountant,
        code: "ACCOUNTANT",
        name: "Kế toán",
        description: "Kế toán, tài chính",
      },
    ],
  });
  console.log("   ✓ 6 roles\n");

  // ══════════════════════════════════════════════════
  // 2. DEPARTMENTS (headUserId set sau khi có user)
  // ══════════════════════════════════════════════════
  console.log("2️⃣  Departments...");
  await prisma.department.createMany({
    data: [
      {
        id: D.tech,
        name: "Phòng Kỹ thuật",
        description: "Phát triển phần mềm, hạ tầng kỹ thuật",
        isActive: true,
      },
      {
        id: D.hr,
        name: "Phòng Nhân sự",
        description: "Tuyển dụng, đào tạo, phúc lợi",
        isActive: true,
      },
      {
        id: D.sales,
        name: "Phòng Kinh doanh",
        description: "Phát triển khách hàng, ký hợp đồng",
        isActive: true,
      },
      {
        id: D.acct,
        name: "Phòng Kế toán",
        description: "Tài chính, kế toán, thuế",
        isActive: true,
      },
      {
        id: D.product,
        name: "Phòng Sản phẩm",
        description: "Quản lý dự án, thiết kế sản phẩm",
        isActive: true,
      },
    ],
  });
  console.log("   ✓ 5 departments\n");

  // ══════════════════════════════════════════════════
  // 3. JOB TITLES
  // ══════════════════════════════════════════════════
  console.log("3️⃣  Job Titles...");
  await prisma.jobTitle.createMany({
    data: [
      { id: JT.admin, code: "CEO", name: "Tổng Giám đốc", isActive: true },
      {
        id: JT.hrMgr,
        code: "HRM",
        name: "Trưởng phòng Nhân sự",
        isActive: true,
      },
      {
        id: JT.hrSpec,
        code: "HRS",
        name: "Chuyên viên Nhân sự",
        isActive: true,
      },
      { id: JT.techLead, code: "TL", name: "Tech Lead", isActive: true },
      {
        id: JT.seniorDev,
        code: "SDE",
        name: "Senior Software Engineer",
        isActive: true,
      },
      {
        id: JT.juniorDev,
        code: "JDE",
        name: "Junior Software Engineer",
        isActive: true,
      },
      { id: JT.pm, code: "PM", name: "Project Manager", isActive: true },
      {
        id: JT.salesMgr,
        code: "SM",
        name: "Trưởng phòng Kinh doanh",
        isActive: true,
      },
      {
        id: JT.salesExec,
        code: "SE",
        name: "Nhân viên Kinh doanh",
        isActive: true,
      },
      { id: JT.chiefAcct, code: "CAC", name: "Kế toán trưởng", isActive: true },
      { id: JT.acct, code: "ACC", name: "Kế toán viên", isActive: true },
      { id: JT.designer, code: "DES", name: "UI/UX Designer", isActive: true },
    ],
  });
  console.log("   ✓ 12 job titles\n");

  // ══════════════════════════════════════════════════
  // 4. USERS
  // ══════════════════════════════════════════════════
  console.log("4️⃣  Users (15 người)...");
  await prisma.user.createMany({
    data: [
      // ── Admin ─────────────────────────────────────
      {
        id: U.admin,
        userCode: "EMP001",
        email: "admin@techvn.com",
        passwordHash: pw,
        fullName: "Nguyễn Thanh Tùng",
        phoneNumber: "0901000001",
        departmentId: D.hr,
        jobTitleId: JT.admin,
        managerId: null,
        hireDate: new Date("2020-01-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: null,
      },

      // ── HR Manager ────────────────────────────────
      {
        id: U.hr,
        userCode: "EMP002",
        email: "minh.anh@techvn.com",
        passwordHash: pw,
        fullName: "Trần Thị Minh Anh",
        phoneNumber: "0901000002",
        departmentId: D.hr,
        jobTitleId: JT.hrMgr,
        managerId: U.admin,
        hireDate: new Date("2020-03-15"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.admin,
      },

      // ── Tech Lead ─────────────────────────────────
      {
        id: U.techLead,
        userCode: "EMP003",
        email: "hoang.nam@techvn.com",
        passwordHash: pw,
        fullName: "Lê Hoàng Nam",
        phoneNumber: "0901000003",
        departmentId: D.tech,
        jobTitleId: JT.techLead,
        managerId: U.admin,
        hireDate: new Date("2020-06-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.admin,
      },

      // ── Sales Manager ─────────────────────────────
      {
        id: U.salesMgr,
        userCode: "EMP004",
        email: "thu.ha@techvn.com",
        passwordHash: pw,
        fullName: "Phạm Thị Thu Hà",
        phoneNumber: "0901000004",
        departmentId: D.sales,
        jobTitleId: JT.salesMgr,
        managerId: U.admin,
        hireDate: new Date("2020-08-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.admin,
      },

      // ── Kế toán trưởng ────────────────────────────
      {
        id: U.chiefAcct,
        userCode: "EMP005",
        email: "minh.duc@techvn.com",
        passwordHash: pw,
        fullName: "Hoàng Minh Đức",
        phoneNumber: "0901000005",
        departmentId: D.acct,
        jobTitleId: JT.chiefAcct,
        managerId: U.admin,
        hireDate: new Date("2020-09-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.admin,
      },

      // ── Project Manager ───────────────────────────
      {
        id: U.pm,
        userCode: "EMP006",
        email: "lan.anh@techvn.com",
        passwordHash: pw,
        fullName: "Cao Thị Lan Anh",
        phoneNumber: "0901000006",
        departmentId: D.product,
        jobTitleId: JT.pm,
        managerId: U.admin,
        hireDate: new Date("2021-01-10"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Senior Dev 1 ──────────────────────────────
      {
        id: U.dev1,
        userCode: "EMP007",
        email: "van.hung@techvn.com",
        passwordHash: pw,
        fullName: "Đỗ Văn Hùng",
        phoneNumber: "0901000007",
        departmentId: D.tech,
        jobTitleId: JT.seniorDev,
        managerId: U.techLead,
        hireDate: new Date("2021-03-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Senior Dev 2 ──────────────────────────────
      {
        id: U.dev2,
        userCode: "EMP008",
        email: "thi.ngoc@techvn.com",
        passwordHash: pw,
        fullName: "Bùi Thị Ngọc",
        phoneNumber: "0901000008",
        departmentId: D.tech,
        jobTitleId: JT.seniorDev,
        managerId: U.techLead,
        hireDate: new Date("2021-05-15"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Junior Dev (PROBATION) ────────────────────
      {
        id: U.dev3,
        userCode: "EMP009",
        email: "quang.minh@techvn.com",
        passwordHash: pw,
        fullName: "Ngô Quang Minh",
        phoneNumber: "0901000009",
        departmentId: D.tech,
        jobTitleId: JT.juniorDev,
        managerId: U.techLead,
        hireDate: new Date("2025-02-01"),
        employmentStatus: "PROBATION",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Junior Dev 2 ──────────────────────────────
      {
        id: U.dev4,
        userCode: "EMP010",
        email: "duc.thang@techvn.com",
        passwordHash: pw,
        fullName: "Vũ Đức Thắng",
        phoneNumber: "0901000010",
        departmentId: D.tech,
        jobTitleId: JT.juniorDev,
        managerId: U.techLead,
        hireDate: new Date("2022-07-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Sales (PROBATION) ─────────────────────────
      {
        id: U.sales1,
        userCode: "EMP011",
        email: "thi.huong@techvn.com",
        passwordHash: pw,
        fullName: "Đặng Thị Hương",
        phoneNumber: "0901000011",
        departmentId: D.sales,
        jobTitleId: JT.salesExec,
        managerId: U.salesMgr,
        hireDate: new Date("2025-03-01"),
        employmentStatus: "PROBATION",
        accountStatus: "ACTIVE",
        mustChangePassword: true,
        createdByUserId: U.hr,
      },

      // ── Sales 2 ───────────────────────────────────
      {
        id: U.sales2,
        userCode: "EMP012",
        email: "van.long@techvn.com",
        passwordHash: pw,
        fullName: "Nguyễn Văn Long",
        phoneNumber: "0901000012",
        departmentId: D.sales,
        jobTitleId: JT.salesExec,
        managerId: U.salesMgr,
        hireDate: new Date("2022-03-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── HR Specialist ─────────────────────────────
      {
        id: U.hr1,
        userCode: "EMP013",
        email: "van.tam@techvn.com",
        passwordHash: pw,
        fullName: "Đinh Văn Tâm",
        phoneNumber: "0901000013",
        departmentId: D.hr,
        jobTitleId: JT.hrSpec,
        managerId: U.hr,
        hireDate: new Date("2022-01-15"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Accountant ────────────────────────────────
      {
        id: U.acct1,
        userCode: "EMP014",
        email: "van.hai@techvn.com",
        passwordHash: pw,
        fullName: "Lý Văn Hải",
        phoneNumber: "0901000014",
        departmentId: D.acct,
        jobTitleId: JT.acct,
        managerId: U.chiefAcct,
        hireDate: new Date("2022-06-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },

      // ── Designer ──────────────────────────────────
      {
        id: U.designer,
        userCode: "EMP015",
        email: "thanh.long@techvn.com",
        passwordHash: pw,
        fullName: "Mai Thanh Long",
        phoneNumber: "0901000015",
        departmentId: D.product,
        jobTitleId: JT.designer,
        managerId: U.pm,
        hireDate: new Date("2023-02-01"),
        employmentStatus: "ACTIVE",
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        createdByUserId: U.hr,
      },
    ],
  });

  // Cập nhật trưởng phòng
  await prisma.department.update({
    where: { id: D.hr },
    data: { headUserId: U.hr },
  });
  await prisma.department.update({
    where: { id: D.tech },
    data: { headUserId: U.techLead },
  });
  await prisma.department.update({
    where: { id: D.sales },
    data: { headUserId: U.salesMgr },
  });
  await prisma.department.update({
    where: { id: D.acct },
    data: { headUserId: U.chiefAcct },
  });
  await prisma.department.update({
    where: { id: D.product },
    data: { headUserId: U.pm },
  });
  console.log("   ✓ 15 users + department heads\n");

  // ══════════════════════════════════════════════════
  // 5. USER PROFILES
  // ══════════════════════════════════════════════════
  console.log("5️⃣  User Profiles...");
  const profiles = [
    {
      userId: U.admin,
      dob: "1985-04-10",
      gender: "MALE",
      idNo: "001085004123",
      taxCode: "MST8500001",
      bank: "Vietcombank",
      bankAcc: "1000100001",
      bankHolder: "NGUYEN THANH TUNG",
      addr: "12 Nguyễn Huệ, Q.1, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.hr,
      dob: "1990-07-22",
      gender: "FEMALE",
      idNo: "001090007456",
      taxCode: "MST9000002",
      bank: "Techcombank",
      bankAcc: "1900100002",
      bankHolder: "TRAN THI MINH ANH",
      addr: "45 Lê Lợi, Q.1, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 1,
    },
    {
      userId: U.techLead,
      dob: "1988-11-15",
      gender: "MALE",
      idNo: "001088011789",
      taxCode: "MST8800003",
      bank: "MB Bank",
      bankAcc: "2900100003",
      bankHolder: "LE HOANG NAM",
      addr: "78 Hai Bà Trưng, Q.3, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 2,
    },
    {
      userId: U.salesMgr,
      dob: "1991-03-05",
      gender: "FEMALE",
      idNo: "001091003012",
      taxCode: "MST9100004",
      bank: "BIDV",
      bankAcc: "3100100004",
      bankHolder: "PHAM THI THU HA",
      addr: "23 Đinh Tiên Hoàng, Q.Bình Thạnh",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.chiefAcct,
      dob: "1987-09-18",
      gender: "MALE",
      idNo: "001087009345",
      taxCode: "MST8700005",
      bank: "Vietinbank",
      bankAcc: "1100100005",
      bankHolder: "HOANG MINH DUC",
      addr: "56 Lý Thường Kiệt, Q.10, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 1,
    },
    {
      userId: U.pm,
      dob: "1992-12-30",
      gender: "FEMALE",
      idNo: "001092012678",
      taxCode: "MST9200006",
      bank: "ACB",
      bankAcc: "4900100006",
      bankHolder: "CAO THI LAN ANH",
      addr: "90 Trường Chinh, Q.Tân Bình",
      city: "TP. Hồ Chí Minh",
      dep: 1,
    },
    {
      userId: U.dev1,
      dob: "1993-06-14",
      gender: "MALE",
      idNo: "001093006901",
      taxCode: "MST9300007",
      bank: "Vietcombank",
      bankAcc: "1000100007",
      bankHolder: "DO VAN HUNG",
      addr: "34 Cộng Hòa, Q.Tân Bình",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.dev2,
      dob: "1994-02-28",
      gender: "FEMALE",
      idNo: "001094002234",
      taxCode: "MST9400008",
      bank: "Techcombank",
      bankAcc: "1900100008",
      bankHolder: "BUI THI NGOC",
      addr: "67 Phạm Văn Đồng, Q.Bình Thạnh",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.dev3,
      dob: "1999-08-11",
      gender: "MALE",
      idNo: "001099008567",
      taxCode: "MST9900009",
      bank: "MB Bank",
      bankAcc: "2900100009",
      bankHolder: "NGO QUANG MINH",
      addr: "112 Nguyễn Oanh, Q.Gò Vấp",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.dev4,
      dob: "1996-05-20",
      gender: "MALE",
      idNo: "001096005890",
      taxCode: "MST9600010",
      bank: "Sacombank",
      bankAcc: "6800100010",
      bankHolder: "VU DUC THANG",
      addr: "88 Quang Trung, Q.Gò Vấp",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.sales1,
      dob: "1998-01-25",
      gender: "FEMALE",
      idNo: "001098001123",
      taxCode: "MST9800011",
      bank: "BIDV",
      bankAcc: "3100100011",
      bankHolder: "DANG THI HUONG",
      addr: "15 Võ Thị Sáu, Q.3, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.sales2,
      dob: "1994-10-07",
      gender: "MALE",
      idNo: "001094010456",
      taxCode: "MST9400012",
      bank: "Vietinbank",
      bankAcc: "1100100012",
      bankHolder: "NGUYEN VAN LONG",
      addr: "202 Điện Biên Phủ, Q.Bình Thạnh",
      city: "TP. Hồ Chí Minh",
      dep: 1,
    },
    {
      userId: U.hr1,
      dob: "1995-04-17",
      gender: "MALE",
      idNo: "001095004789",
      taxCode: "MST9500013",
      bank: "ACB",
      bankAcc: "4900100013",
      bankHolder: "DINH VAN TAM",
      addr: "44 Trần Hưng Đạo, Q.1, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.acct1,
      dob: "1993-11-03",
      gender: "MALE",
      idNo: "001093011012",
      taxCode: "MST9300014",
      bank: "Vietcombank",
      bankAcc: "1000100014",
      bankHolder: "LY VAN HAI",
      addr: "77 CMT8, Q.3, TP.HCM",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
    {
      userId: U.designer,
      dob: "1997-07-09",
      gender: "MALE",
      idNo: "001097007345",
      taxCode: "MST9700015",
      bank: "Techcombank",
      bankAcc: "1900100015",
      bankHolder: "MAI THANH LONG",
      addr: "33 Nơ Trang Long, Q.Bình Thạnh",
      city: "TP. Hồ Chí Minh",
      dep: 0,
    },
  ];
  for (const p of profiles) {
    await prisma.userProfile.create({
      data: {
        userId: p.userId,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        nationality: "Vietnamese",
        nationalIdNumber: p.idNo,
        nationalIdIssueDate: new Date("2018-01-01"),
        nationalIdIssuePlace: "Công an TP. Hồ Chí Minh",
        taxCode: p.taxCode,
        permanentAddress: p.addr,
        currentAddress: p.addr,
        city: p.city,
        bankName: p.bank,
        bankAccountNumber: p.bankAcc,
        bankAccountHolder: p.bankHolder,
        emergencyContactName: "Liên hệ khẩn",
        emergencyContactPhone: "0909000000",
        emergencyContactRel: "Gia đình",
        dependantCount: p.dep,
        educationLevel: "Đại học",
        educationMajor: p.userId.includes("acct")
          ? "Kế toán"
          : p.userId.includes("sales")
            ? "Quản trị kinh doanh"
            : "Công nghệ thông tin",
        university: "Đại học Bách khoa TP.HCM",
      },
    });
  }
  console.log("   ✓ 15 profiles\n");

  // ══════════════════════════════════════════════════
  // 6. USER ROLES
  // ══════════════════════════════════════════════════
  console.log("6️⃣  User Roles...");
  const userRoles = [
    { userId: U.admin, roleId: R.admin },
    { userId: U.hr, roleId: R.hr },
    { userId: U.techLead, roleId: R.manager },
    { userId: U.techLead, roleId: R.employee },
    { userId: U.salesMgr, roleId: R.manager },
    { userId: U.salesMgr, roleId: R.sales },
    { userId: U.chiefAcct, roleId: R.accountant },
    { userId: U.pm, roleId: R.manager },
    { userId: U.pm, roleId: R.employee },
    { userId: U.dev1, roleId: R.employee },
    { userId: U.dev2, roleId: R.employee },
    { userId: U.dev3, roleId: R.employee },
    { userId: U.dev4, roleId: R.employee },
    { userId: U.sales1, roleId: R.sales },
    { userId: U.sales2, roleId: R.sales },
    { userId: U.hr1, roleId: R.employee },
    { userId: U.acct1, roleId: R.accountant },
    { userId: U.designer, roleId: R.employee },
  ];
  for (const ur of userRoles) {
    await prisma.userRole.create({
      data: { userId: ur.userId, roleId: ur.roleId },
    });
  }
  console.log("   ✓", userRoles.length, "user-role mappings\n");

  // ══════════════════════════════════════════════════
  // 7. WORK SHIFTS
  // ══════════════════════════════════════════════════
  console.log("7️⃣  Work Shifts...");
  await prisma.workShift.createMany({
    data: [
      {
        id: SH.morning,
        code: "CA-SANG",
        name: "Ca Hành Chính",
        shiftType: "MORNING",
        startTime: "08:00",
        endTime: "17:30",
        breakMinutes: 60,
        workMinutes: 510,
        isNightShift: false,
        overtimeAfterMinutes: 30,
        isActive: true,
      },
      {
        id: SH.flex,
        code: "CA-LINH",
        name: "Ca Linh Hoạt",
        shiftType: "FLEXIBLE",
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
        workMinutes: 480,
        isNightShift: false,
        overtimeAfterMinutes: 60,
        isActive: true,
      },
      {
        id: SH.night,
        code: "CA-DEM",
        name: "Ca Đêm",
        shiftType: "NIGHT",
        startTime: "22:00",
        endTime: "06:00",
        breakMinutes: 60,
        workMinutes: 420,
        isNightShift: true,
        overtimeAfterMinutes: 0,
        isActive: false,
      },
    ],
  });
  console.log("   ✓ 3 shifts\n");

  // ══════════════════════════════════════════════════
  // 8. HOLIDAYS 2025
  // ══════════════════════════════════════════════════
  console.log("8️⃣  Holidays 2025...");
  await prisma.holiday.createMany({
    data: [
      {
        name: "Tết Dương lịch",
        date: new Date("2025-01-01"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (28 Tết)",
        date: new Date("2025-01-25"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (29 Tết)",
        date: new Date("2025-01-26"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (30 Tết)",
        date: new Date("2025-01-27"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (Mùng 1)",
        date: new Date("2025-01-28"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (Mùng 2)",
        date: new Date("2025-01-29"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (Mùng 3)",
        date: new Date("2025-01-30"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (Mùng 4)",
        date: new Date("2025-01-31"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán (Mùng 5)",
        date: new Date("2025-02-01"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Giỗ Tổ Hùng Vương",
        date: new Date("2025-04-07"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Giải phóng miền Nam",
        date: new Date("2025-04-30"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc tế Lao động",
        date: new Date("2025-05-01"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc khánh",
        date: new Date("2025-09-02"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc khánh (bù)",
        date: new Date("2025-09-03"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
    ],
  });
  console.log("   ✓ 14 holidays\n");

  // ══════════════════════════════════════════════════
  // 9. LEAVE TYPES
  // ══════════════════════════════════════════════════
  console.log("9️⃣  Leave Types...");
  await prisma.leaveType.createMany({
    data: [
      {
        id: LT.annual,
        code: "NP",
        name: "Nghỉ phép năm",
        isPaid: true,
        isActive: true,
        maxDaysPerYear: 12,
        requiresDocument: false,
      },
      {
        id: LT.sick,
        code: "NO",
        name: "Nghỉ ốm",
        isPaid: true,
        isActive: true,
        maxDaysPerYear: 30,
        requiresDocument: true,
      },
      {
        id: LT.maternity,
        code: "NTS",
        name: "Nghỉ thai sản",
        isPaid: true,
        isActive: true,
        maxDaysPerYear: 180,
        requiresDocument: true,
      },
      {
        id: LT.unpaid,
        code: "NKL",
        name: "Nghỉ không lương",
        isPaid: false,
        isActive: true,
        maxDaysPerYear: null,
        requiresDocument: false,
      },
    ],
  });
  console.log("   ✓ 4 leave types\n");

  // ══════════════════════════════════════════════════
  // 10. LEAVE BALANCES (năm 2025)
  // ══════════════════════════════════════════════════
  console.log("🔟  Leave Balances 2025...");
  const activeUsers = [
    U.admin,
    U.hr,
    U.techLead,
    U.salesMgr,
    U.chiefAcct,
    U.pm,
    U.dev1,
    U.dev2,
    U.dev3,
    U.dev4,
    U.sales1,
    U.sales2,
    U.hr1,
    U.acct1,
    U.designer,
  ];
  for (const uid of activeUsers) {
    const used = [2, 1, 0, 3, 1, 2, 4, 2, 0, 1, 0, 1, 2, 1, 1][
      activeUsers.indexOf(uid)
    ];
    const remaining = 12 - used;
    await prisma.leaveBalance.create({
      data: {
        userId: uid,
        leaveTypeId: LT.annual,
        year: 2025,
        entitledDays: 12,
        carriedDays: 0,
        adjustedDays: 0,
        usedDays: used,
        pendingDays: 0,
        remainingDays: remaining,
      },
    });
    await prisma.leaveBalance.create({
      data: {
        userId: uid,
        leaveTypeId: LT.sick,
        year: 2025,
        entitledDays: 30,
        carriedDays: 0,
        adjustedDays: 0,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 30,
      },
    });
  }
  console.log("   ✓", activeUsers.length * 2, "leave balances\n");

  // ══════════════════════════════════════════════════
  // 11. LEAVE REQUESTS
  // ══════════════════════════════════════════════════
  console.log("1️⃣1️⃣  Leave Requests...");
  const leaveReqs = [
    {
      id: "lr-001",
      userId: U.dev1,
      leaveTypeId: LT.annual,
      startDate: "2025-01-06",
      endDate: "2025-01-07",
      totalDays: 2,
      reason: "Giải quyết việc gia đình",
      status: "APPROVED",
      currentStep: null,
      submittedAt: "2025-01-02",
      finalApprovedAt: "2025-01-03",
    },
    {
      id: "lr-002",
      userId: U.dev2,
      leaveTypeId: LT.annual,
      startDate: "2025-02-10",
      endDate: "2025-02-10",
      totalDays: 1,
      reason: "Khám sức khỏe định kỳ",
      status: "APPROVED",
      currentStep: null,
      submittedAt: "2025-02-08",
      finalApprovedAt: "2025-02-09",
    },
    {
      id: "lr-003",
      userId: U.hr1,
      leaveTypeId: LT.annual,
      startDate: "2025-02-20",
      endDate: "2025-02-21",
      totalDays: 2,
      reason: "Về quê thăm gia đình",
      status: "APPROVED",
      currentStep: null,
      submittedAt: "2025-02-15",
      finalApprovedAt: "2025-02-17",
    },
    {
      id: "lr-004",
      userId: U.designer,
      leaveTypeId: LT.sick,
      startDate: "2025-03-05",
      endDate: "2025-03-05",
      totalDays: 1,
      reason: "Đau đầu, sốt nhẹ",
      status: "APPROVED",
      currentStep: null,
      submittedAt: "2025-03-05",
      finalApprovedAt: "2025-03-05",
    },
    {
      id: "lr-005",
      userId: U.dev4,
      leaveTypeId: LT.annual,
      startDate: "2025-03-15",
      endDate: "2025-03-16",
      totalDays: 2,
      reason: "Chuyện cá nhân",
      status: "PENDING",
      currentStep: "MANAGER",
      submittedAt: "2025-03-10",
      finalApprovedAt: null,
    },
    {
      id: "lr-006",
      userId: U.sales2,
      leaveTypeId: LT.annual,
      startDate: "2025-03-20",
      endDate: "2025-03-21",
      totalDays: 2,
      reason: "Đám cưới anh trai",
      status: "PENDING",
      currentStep: "MANAGER",
      submittedAt: "2025-03-12",
      finalApprovedAt: null,
    },
    {
      id: "lr-007",
      userId: U.dev1,
      leaveTypeId: LT.annual,
      startDate: "2025-03-25",
      endDate: "2025-03-25",
      totalDays: 1,
      reason: "Họp mặt gia đình",
      status: "REJECTED",
      currentStep: null,
      submittedAt: "2025-03-20",
      finalApprovedAt: null,
      rejectionReason: "Giai đoạn deadline dự án, vui lòng đổi ngày",
    },
  ];
  for (const lr of leaveReqs) {
    await prisma.leaveRequest.create({
      data: {
        id: lr.id,
        userId: lr.userId,
        leaveTypeId: lr.leaveTypeId,
        startDate: new Date(lr.startDate),
        endDate: new Date(lr.endDate),
        totalDays: lr.totalDays,
        isHalfDay: false,
        reason: lr.reason,
        status: lr.status,
        currentStep: lr.currentStep,
        submittedAt: new Date(lr.submittedAt),
        finalApprovedAt: lr.finalApprovedAt
          ? new Date(lr.finalApprovedAt)
          : null,
        rejectedAt: lr.status === "REJECTED" ? new Date("2025-03-22") : null,
        rejectionReason: lr.rejectionReason || null,
      },
    });

    // Tạo approval steps
    const approverId = [U.dev1, U.dev2, U.designer, U.dev4].includes(lr.userId)
      ? U.techLead
      : [U.hr1].includes(lr.userId)
        ? U.hr
        : [U.sales2].includes(lr.userId)
          ? U.salesMgr
          : U.admin;
    await prisma.leaveRequestApproval.create({
      data: {
        leaveRequestId: lr.id,
        approverUserId: approverId,
        stepType: "MANAGER",
        stepOrder: 1,
        status:
          lr.status === "APPROVED"
            ? "APPROVED"
            : lr.status === "REJECTED"
              ? "REJECTED"
              : "PENDING",
        comment:
          lr.status === "APPROVED"
            ? "Đồng ý"
            : lr.status === "REJECTED"
              ? lr.rejectionReason || "Từ chối"
              : null,
        actionAt: lr.finalApprovedAt
          ? new Date(lr.finalApprovedAt)
          : lr.status === "REJECTED"
            ? new Date("2025-03-22")
            : null,
      },
    });
    if (lr.status === "APPROVED") {
      await prisma.leaveRequestApproval.create({
        data: {
          leaveRequestId: lr.id,
          approverUserId: U.hr,
          stepType: "HR",
          stepOrder: 2,
          status: "APPROVED",
          comment: "Đã duyệt",
          actionAt: new Date(lr.finalApprovedAt),
        },
      });
    }
  }
  console.log("   ✓", leaveReqs.length, "leave requests\n");

  // ══════════════════════════════════════════════════
  // 12. OVERTIME REQUESTS
  // ══════════════════════════════════════════════════
  console.log("1️⃣2️⃣  Overtime Requests...");
  const otReqs = [
    {
      id: "ot-001",
      userId: U.dev1,
      workDate: "2025-01-08",
      startTime: "18:00",
      endTime: "21:00",
      planned: 180,
      actual: 180,
      isWeekend: false,
      reason: "Fix bug urgent cho dự án Alpha",
      status: "APPROVED",
      approver: U.techLead,
    },
    {
      id: "ot-002",
      userId: U.dev2,
      workDate: "2025-01-08",
      startTime: "18:00",
      endTime: "21:00",
      planned: 180,
      actual: 180,
      isWeekend: false,
      reason: "Fix bug urgent cho dự án Alpha",
      status: "APPROVED",
      approver: U.techLead,
    },
    {
      id: "ot-003",
      userId: U.dev1,
      workDate: "2025-01-18",
      startTime: "08:00",
      endTime: "12:00",
      planned: 240,
      actual: 240,
      isWeekend: true,
      reason: "Hoàn thiện tính năng thanh toán",
      status: "APPROVED",
      approver: U.techLead,
    },
    {
      id: "ot-004",
      userId: U.dev4,
      workDate: "2025-02-12",
      startTime: "18:00",
      endTime: "20:30",
      planned: 150,
      actual: 150,
      isWeekend: false,
      reason: "Deploy production cho dự án Beta",
      status: "APPROVED",
      approver: U.techLead,
    },
    {
      id: "ot-005",
      userId: U.dev3,
      workDate: "2025-02-20",
      startTime: "18:00",
      endTime: "20:00",
      planned: 120,
      actual: null,
      isWeekend: false,
      reason: "Review code PR tồn đọng",
      status: "PENDING",
      approver: null,
    },
    {
      id: "ot-006",
      userId: U.designer,
      workDate: "2025-03-05",
      startTime: "18:00",
      endTime: "21:00",
      planned: 180,
      actual: null,
      isWeekend: false,
      reason: "Hoàn thiện mockup dự án Gamma",
      status: "PENDING",
      approver: null,
    },
    {
      id: "ot-007",
      userId: U.dev1,
      workDate: "2025-03-08",
      startTime: "08:00",
      endTime: "12:00",
      planned: 240,
      actual: null,
      isWeekend: true,
      reason: "Sprint planning + coding",
      status: "APPROVED",
      approver: U.techLead,
    },
    {
      id: "ot-008",
      userId: U.pm,
      workDate: "2025-03-10",
      startTime: "18:00",
      endTime: "20:00",
      planned: 120,
      actual: null,
      isWeekend: false,
      reason: "Chuẩn bị báo cáo tiến độ Q1",
      status: "APPROVED",
      approver: U.admin,
    },
  ];
  for (const ot of otReqs) {
    await prisma.overtimeRequest.create({
      data: {
        id: ot.id,
        userId: ot.userId,
        approverUserId: ot.approver,
        workDate: new Date(ot.workDate),
        startTime: ot.startTime,
        endTime: ot.endTime,
        plannedMinutes: ot.planned,
        actualMinutes: ot.actual,
        isHoliday: false,
        isWeekend: ot.isWeekend,
        reason: ot.reason,
        status: ot.status,
        submittedAt: new Date(ot.workDate),
        actionAt: ot.status === "APPROVED" ? new Date(ot.workDate) : null,
      },
    });
  }
  console.log("   ✓", otReqs.length, "overtime requests\n");

  // ══════════════════════════════════════════════════
  // 13. ATTENDANCE REQUESTS + RECORDS (mẫu tháng 3/2025)
  // ══════════════════════════════════════════════════
  console.log("1️⃣3️⃣  Attendance Records (tháng 3/2025)...");
  // Tạo dữ liệu chấm công cho tuần đầu tháng 3 (3 ngày làm việc: 3,4,5/3)
  const attWorkDays = ["2025-03-03", "2025-03-04", "2025-03-05"];
  const attUsers = [U.dev1, U.dev2, U.dev3, U.dev4, U.hr1, U.acct1, U.designer];
  let attIdx = 0;
  for (const uid of attUsers) {
    for (const wd of attWorkDays) {
      const late = uid === U.dev3 && wd === "2025-03-04"; // dev3 đi muộn 1 ngày
      const checkIn = late ? `${wd}T08:22:00` : `${wd}T07:58:00`;
      const checkOut = `${wd}T17:35:00`;
      const arId = `ar-ci-${attIdx}`;
      const arOId = `ar-co-${attIdx}`;
      const recId = `att-${attIdx}`;

      await prisma.attendanceRequest.create({
        data: {
          id: arId,
          userId: uid,
          reviewerId: U.hr,
          requestType: "CHECK_IN",
          requestedAt: new Date(checkIn),
          workDate: new Date(wd),
          shiftId: SH.morning,
          isRemoteWork: false,
          note: null,
          status: "APPROVED",
          reviewedAt: new Date(wd),
        },
      });
      await prisma.attendanceRequest.create({
        data: {
          id: arOId,
          userId: uid,
          reviewerId: U.hr,
          requestType: "CHECK_OUT",
          requestedAt: new Date(checkOut),
          workDate: new Date(wd),
          shiftId: SH.morning,
          isRemoteWork: false,
          note: null,
          status: "APPROVED",
          reviewedAt: new Date(wd),
        },
      });
      await prisma.attendanceRecord.create({
        data: {
          id: recId,
          userId: uid,
          shiftId: SH.morning,
          workDate: new Date(wd),
          checkInAt: new Date(checkIn),
          checkOutAt: new Date(checkOut),
          totalWorkMinutes: 510,
          lateMinutes: late ? 22 : 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 5,
          overtimeApprovedMinutes: 0,
          isHolidayWork: false,
          isWeekendWork: false,
          isRemoteWork: false,
          status: "PRESENT",
          sourceCheckinRequestId: arId,
          sourceCheckoutRequestId: arOId,
        },
      });
      attIdx++;
    }
  }
  // Thêm 1 bản ghi vắng mặt (admin tạo thủ công)
  await prisma.attendanceRecord.create({
    data: {
      id: "att-absent-01",
      userId: U.designer,
      shiftId: SH.morning,
      workDate: new Date("2025-03-06"),
      totalWorkMinutes: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      overtimeApprovedMinutes: 0,
      isHolidayWork: false,
      isWeekendWork: false,
      isRemoteWork: false,
      status: "ABSENT",
      note: "Vắng không lý do",
      adjustedByUserId: U.hr,
    },
  });
  console.log(
    "   ✓",
    attIdx * 2,
    "attendance requests +",
    attIdx,
    "records + 1 absent\n",
  );

  // ══════════════════════════════════════════════════
  // 14. INSURANCE POLICIES
  // ══════════════════════════════════════════════════
  console.log("1️⃣4️⃣  Insurance Policies...");
  await prisma.insurancePolicy.createMany({
    data: [
      {
        id: "ins-social",
        policyType: "SOCIAL",
        name: "Bảo hiểm xã hội (BHXH)",
        employeeRate: 0.08,
        employerRate: 0.175,
        salaryCapAmount: 36_000_000,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
        notes: "NV 8%, DN 17.5%, trần 36tr",
      },
      {
        id: "ins-health",
        policyType: "HEALTH",
        name: "Bảo hiểm y tế (BHYT)",
        employeeRate: 0.015,
        employerRate: 0.03,
        salaryCapAmount: 36_000_000,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
        notes: "NV 1.5%, DN 3%, trần 36tr",
      },
      {
        id: "ins-unemp",
        policyType: "UNEMPLOYMENT",
        name: "Bảo hiểm thất nghiệp (BHTN)",
        employeeRate: 0.01,
        employerRate: 0.01,
        salaryCapAmount: 36_000_000,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
        notes: "NV 1%, DN 1%, trần 36tr",
      },
    ],
  });
  console.log("   ✓ 3 insurance policies\n");

  // ══════════════════════════════════════════════════
  // 15. TAX POLICY 2025 + TAX BRACKETS
  // ══════════════════════════════════════════════════
  console.log("1️⃣5️⃣  Tax Policy 2025...");
  await prisma.taxPolicy.create({
    data: {
      id: "tax-p2025",
      name: "Biểu thuế TNCN 2025",
      year: 2025,
      description:
        "Thuế thu nhập cá nhân theo biểu lũy tiến từng phần, áp dụng từ 01/01/2025",
      isActive: true,
      personalDeduction: 11_000_000,
      dependantDeduction: 4_400_000,
      effectiveFrom: new Date("2025-01-01"),
      brackets: {
        createMany: {
          data: [
            {
              bracketOrder: 1,
              minIncome: 0,
              maxIncome: 5_000_000,
              taxRate: 0.05,
            },
            {
              bracketOrder: 2,
              minIncome: 5_000_000,
              maxIncome: 10_000_000,
              taxRate: 0.1,
            },
            {
              bracketOrder: 3,
              minIncome: 10_000_000,
              maxIncome: 18_000_000,
              taxRate: 0.15,
            },
            {
              bracketOrder: 4,
              minIncome: 18_000_000,
              maxIncome: 32_000_000,
              taxRate: 0.2,
            },
            {
              bracketOrder: 5,
              minIncome: 32_000_000,
              maxIncome: 52_000_000,
              taxRate: 0.25,
            },
            {
              bracketOrder: 6,
              minIncome: 52_000_000,
              maxIncome: 80_000_000,
              taxRate: 0.3,
            },
            {
              bracketOrder: 7,
              minIncome: 80_000_000,
              maxIncome: null,
              taxRate: 0.35,
            },
          ],
        },
      },
    },
  });
  console.log("   ✓ Tax policy + 7 brackets\n");

  // ══════════════════════════════════════════════════
  // 16. SALARY COMPONENTS (danh mục toàn công ty)
  // ══════════════════════════════════════════════════
  console.log("1️⃣6️⃣  Salary Components...");
  await prisma.salaryComponent.createMany({
    data: [
      {
        id: SC.transport,
        code: "PC-XE",
        name: "Phụ cấp đi lại",
        componentType: "EARNING",
        calculationType: "FIXED",
        isTaxable: false,
        isInsurable: false,
        isActive: true,
        displayOrder: 1,
        description: "Phụ cấp xăng xe / giao thông",
      },
      {
        id: SC.phone,
        code: "PC-DT",
        name: "Phụ cấp điện thoại",
        componentType: "EARNING",
        calculationType: "FIXED",
        isTaxable: false,
        isInsurable: false,
        isActive: true,
        displayOrder: 2,
        description: "Phụ cấp chi phí điện thoại",
      },
      {
        id: SC.meal,
        code: "PC-AN",
        name: "Phụ cấp ăn trưa",
        componentType: "EARNING",
        calculationType: "FIXED",
        isTaxable: false,
        isInsurable: false,
        isActive: true,
        displayOrder: 3,
        description: "Phụ cấp bữa ăn trưa tại công ty",
      },
      {
        id: SC.resp,
        code: "PC-TN",
        name: "Phụ cấp trách nhiệm",
        componentType: "EARNING",
        calculationType: "FIXED",
        isTaxable: true,
        isInsurable: false,
        isActive: true,
        displayOrder: 4,
        description: "Phụ cấp cho vị trí quản lý / trưởng nhóm",
      },
      {
        id: SC.perf,
        code: "BONUS-KQ",
        name: "Thưởng hiệu suất",
        componentType: "EARNING",
        calculationType: "MANUAL",
        isTaxable: true,
        isInsurable: false,
        isActive: true,
        displayOrder: 5,
        description: "Thưởng KPI hàng quý / năm",
      },
    ],
  });
  console.log("   ✓ 5 salary components\n");

  // ══════════════════════════════════════════════════
  // 17. USER COMPENSATIONS (v3.2: payFrequency, payDayOfMonth, probationEndDate, changeReason)
  // ══════════════════════════════════════════════════
  console.log("1️⃣7️⃣  User Compensations...");
  const compensations = [
    // ── Cấp quản lý ──────────────────────────────
    {
      id: "uc-admin",
      userId: U.admin,
      base: 45_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2020-01-01",
      reason: "Lương khởi điểm – Tổng Giám đốc",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-hr",
      userId: U.hr,
      base: 35_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2020-03-15",
      reason: "Lương khởi điểm – Trưởng phòng Nhân sự",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-tech",
      userId: U.techLead,
      base: 40_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2020-06-01",
      reason: "Lương khởi điểm – Tech Lead",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-tech-r1",
      userId: U.techLead,
      base: 42_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2023-01-01",
      reason: "Tăng lương định kỳ Q1/2023",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-sales",
      userId: U.salesMgr,
      base: 38_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2020-08-01",
      reason: "Lương khởi điểm – Trưởng phòng Kinh doanh",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-acct",
      userId: U.chiefAcct,
      base: 35_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2020-09-01",
      reason: "Lương khởi điểm – Kế toán trưởng",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-pm",
      userId: U.pm,
      base: 32_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2021-01-10",
      reason: "Lương khởi điểm – Project Manager",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    // ── Senior Developers ─────────────────────────
    {
      id: "uc-dev1",
      userId: U.dev1,
      base: 28_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2021-03-01",
      reason: "Lên chính thức – Senior Developer",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-dev1-r1",
      userId: U.dev1,
      base: 30_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2024-01-01",
      reason: "Tăng lương định kỳ Q1/2024",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-dev2",
      userId: U.dev2,
      base: 26_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2021-05-15",
      reason: "Lên chính thức – Senior Developer",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-dev2-r1",
      userId: U.dev2,
      base: 28_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2024-07-01",
      reason: "Điều chỉnh theo thị trường",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    // ── Junior Developers ─────────────────────────
    {
      id: "uc-dev3",
      userId: U.dev3,
      base: 20_000_000,
      prob: 17_000_000,
      probEndDate: "2025-05-01",
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2025-02-01",
      reason: "Lương thử việc – Junior Developer",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-dev4",
      userId: U.dev4,
      base: 22_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2022-07-01",
      reason: "Lên chính thức – Junior Developer",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    // ── Sales ─────────────────────────────────────
    {
      id: "uc-sales1",
      userId: U.sales1,
      base: 18_000_000,
      prob: 15_300_000,
      probEndDate: "2025-06-01",
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2025-03-01",
      reason: "Lương thử việc – Sales Executive",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-sales2",
      userId: U.sales2,
      base: 22_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2022-03-01",
      reason: "Lên chính thức – Sales Executive",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    // ── HR, Accountant, Designer ──────────────────
    {
      id: "uc-hr1",
      userId: U.hr1,
      base: 22_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2022-01-15",
      reason: "Lên chính thức – HR Specialist",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-acct1",
      userId: U.acct1,
      base: 22_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2022-06-01",
      reason: "Lên chính thức – Kế toán viên",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-design",
      userId: U.designer,
      base: 20_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2023-02-01",
      reason: "Lên chính thức – UI/UX Designer",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
    {
      id: "uc-design-r1",
      userId: U.designer,
      base: 22_000_000,
      prob: null,
      probEndDate: null,
      payDay: 10,
      freq: "MONTHLY",
      effFrom: "2025-01-01",
      reason: "Tăng lương theo đánh giá cuối năm 2024",
      stdDays: 22,
      stdHours: 8.0,
      otWd: 1.5,
      otWe: 2.0,
      otH: 3.0,
    },
  ];

  // Xác định isActive: chỉ record có effectiveFrom mới nhất của user mới isActive=true
  const latestByUser = {};
  for (const c of compensations) {
    if (!latestByUser[c.userId] || c.effFrom > latestByUser[c.userId]) {
      latestByUser[c.userId] = c.effFrom;
    }
  }
  for (const c of compensations) {
    const isActive = latestByUser[c.userId] === c.effFrom;
    await prisma.userCompensation.create({
      data: {
        id: c.id,
        userId: c.userId,
        salaryType: "MONTHLY",
        baseSalary: c.base,
        probationSalary: c.prob,
        standardWorkingDays: c.stdDays,
        standardWorkingHours: c.stdHours,
        currency: "VND",
        payFrequency: c.freq,
        payDayOfMonth: c.payDay,
        probationEndDate: c.probEndDate ? new Date(c.probEndDate) : null,
        changeReason: c.reason,
        overtimeRateWeekday: c.otWd,
        overtimeRateWeekend: c.otWe,
        overtimeRateHoliday: c.otH,
        effectiveFrom: new Date(c.effFrom),
        effectiveTo: isActive ? null : new Date(latestByUser[c.userId]),
        isActive,
      },
    });
  }
  console.log("   ✓", compensations.length, "compensation records\n");

  // ══════════════════════════════════════════════════
  // 18. USER SALARY COMPONENTS (phụ cấp cá nhân)
  // ══════════════════════════════════════════════════
  console.log("1️⃣8️⃣  User Salary Components...");
  // [userId, componentId, amount, effFrom]
  const userSC = [
    // Admin
    [U.admin, SC.resp, 5_000_000, "2020-01-01"],
    [U.admin, SC.phone, 500_000, "2020-01-01"],
    [U.admin, SC.meal, 800_000, "2020-01-01"],
    [U.admin, SC.transport, 700_000, "2020-01-01"],
    // HR Manager
    [U.hr, SC.resp, 3_000_000, "2020-03-15"],
    [U.hr, SC.phone, 300_000, "2020-03-15"],
    [U.hr, SC.meal, 800_000, "2020-03-15"],
    // Tech Lead
    [U.techLead, SC.resp, 4_000_000, "2020-06-01"],
    [U.techLead, SC.phone, 500_000, "2020-06-01"],
    [U.techLead, SC.meal, 800_000, "2020-06-01"],
    [U.techLead, SC.transport, 500_000, "2020-06-01"],
    // Sales Manager
    [U.salesMgr, SC.resp, 3_000_000, "2020-08-01"],
    [U.salesMgr, SC.phone, 500_000, "2020-08-01"],
    [U.salesMgr, SC.transport, 1_500_000, "2020-08-01"],
    [U.salesMgr, SC.meal, 800_000, "2020-08-01"],
    // Chief Accountant
    [U.chiefAcct, SC.resp, 3_000_000, "2020-09-01"],
    [U.chiefAcct, SC.phone, 300_000, "2020-09-01"],
    [U.chiefAcct, SC.meal, 800_000, "2020-09-01"],
    // PM
    [U.pm, SC.resp, 2_000_000, "2021-01-10"],
    [U.pm, SC.phone, 300_000, "2021-01-10"],
    [U.pm, SC.meal, 800_000, "2021-01-10"],
    // Devs
    [U.dev1, SC.phone, 200_000, "2021-03-01"],
    [U.dev1, SC.meal, 800_000, "2021-03-01"],
    [U.dev2, SC.phone, 200_000, "2021-05-15"],
    [U.dev2, SC.meal, 800_000, "2021-05-15"],
    [U.dev3, SC.meal, 800_000, "2025-02-01"],
    [U.dev4, SC.phone, 200_000, "2022-07-01"],
    [U.dev4, SC.meal, 800_000, "2022-07-01"],
    // Sales
    [U.sales1, SC.transport, 500_000, "2025-03-01"],
    [U.sales1, SC.meal, 800_000, "2025-03-01"],
    [U.sales2, SC.transport, 700_000, "2022-03-01"],
    [U.sales2, SC.phone, 300_000, "2022-03-01"],
    [U.sales2, SC.meal, 800_000, "2022-03-01"],
    // HR1
    [U.hr1, SC.phone, 200_000, "2022-01-15"],
    [U.hr1, SC.meal, 800_000, "2022-01-15"],
    // Accountant
    [U.acct1, SC.phone, 200_000, "2022-06-01"],
    [U.acct1, SC.meal, 800_000, "2022-06-01"],
    // Designer
    [U.designer, SC.phone, 200_000, "2023-02-01"],
    [U.designer, SC.meal, 800_000, "2023-02-01"],
  ];
  let uscIdx = 0;
  for (const [uid, scId, amount, effFrom] of userSC) {
    await prisma.userSalaryComponent.create({
      data: {
        id: `usc-${uscIdx++}`,
        userId: uid,
        salaryComponentId: scId,
        amount,
        effectiveFrom: new Date(effFrom),
        isActive: true,
      },
    });
  }
  console.log("   ✓", userSC.length, "user salary components\n");

  // ══════════════════════════════════════════════════
  // 19. PAYROLL PERIODS + RECORDS
  // ══════════════════════════════════════════════════
  console.log("1️⃣9️⃣  Payroll Periods & Records...");

  // Lấy lương cơ bản active nhất của user (hoặc probationSalary nếu còn thử việc)
  const activeSalary = (userId) => {
    const map = {
      [U.admin]: 45_000_000,
      [U.hr]: 35_000_000,
      [U.techLead]: 42_000_000,
      [U.salesMgr]: 38_000_000,
      [U.chiefAcct]: 35_000_000,
      [U.pm]: 32_000_000,
      [U.dev1]: 30_000_000,
      [U.dev2]: 28_000_000,
      [U.dev3]: 17_000_000, // probation
      [U.dev4]: 22_000_000,
      [U.sales1]: 15_300_000, // probation
      [U.sales2]: 22_000_000,
      [U.hr1]: 22_000_000,
      [U.acct1]: 22_000_000,
      [U.designer]: 22_000_000,
    };
    return map[userId] || 15_000_000;
  };

  // Tổng phụ cấp của từng user
  const allowanceMap = {
    [U.admin]: 7_000_000, // 5tr + 500k + 800k + 700k
    [U.hr]: 4_100_000, // 3tr + 300k + 800k
    [U.techLead]: 5_800_000, // 4tr + 500k + 800k + 500k
    [U.salesMgr]: 5_800_000, // 3tr + 500k + 1.5tr + 800k
    [U.chiefAcct]: 4_100_000, // 3tr + 300k + 800k
    [U.pm]: 3_100_000, // 2tr + 300k + 800k
    [U.dev1]: 1_000_000, // 200k + 800k
    [U.dev2]: 1_000_000,
    [U.dev3]: 800_000,
    [U.dev4]: 1_000_000,
    [U.sales1]: 1_300_000, // 500k + 800k
    [U.sales2]: 1_800_000, // 700k + 300k + 800k
    [U.hr1]: 1_000_000,
    [U.acct1]: 1_000_000,
    [U.designer]: 1_000_000,
  };

  const periods = [
    {
      id: PP.m01,
      code: "2025-01",
      month: 1,
      year: 2025,
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      payDate: "2025-02-10",
      stdDays: 18,
      status: "PAID",
      approvedBy: U.admin,
    },
    {
      id: PP.m02,
      code: "2025-02",
      month: 2,
      year: 2025,
      startDate: "2025-02-01",
      endDate: "2025-02-28",
      payDate: "2025-03-10",
      stdDays: 20,
      status: "PAID",
      approvedBy: U.admin,
    },
    {
      id: PP.m03,
      code: "2025-03",
      month: 3,
      year: 2025,
      startDate: "2025-03-01",
      endDate: "2025-03-31",
      payDate: "2025-04-10",
      stdDays: 21,
      status: "APPROVED",
      approvedBy: U.admin,
    },
  ];

  // OT data per user per period
  const otMinutesData = {
    [PP.m01]: { [U.dev1]: 420, [U.dev2]: 180, [U.pm]: 120 },
    [PP.m02]: { [U.dev1]: 240, [U.dev4]: 150, [U.pm]: 60 },
    [PP.m03]: { [U.dev1]: 360, [U.designer]: 180, [U.pm]: 120 },
  };
  // Bonus data (từ adjustments)
  const bonusData = {
    [PP.m01]: {},
    [PP.m02]: { [U.dev1]: 2_000_000, [U.dev2]: 1_000_000 },
    [PP.m03]: {},
  };
  // Working days per user per period
  const workDaysData = {
    [PP.m01]: { default: 16, [U.admin]: 18, [U.hr]: 18, [U.techLead]: 18 },
    [PP.m02]: { default: 20, [U.dev3]: 19, [U.designer]: 19 },
    [PP.m03]: { default: 18, [U.dev3]: 17, [U.sales1]: 16 },
  };

  const payrollUsers = [
    U.admin,
    U.hr,
    U.techLead,
    U.salesMgr,
    U.chiefAcct,
    U.pm,
    U.dev1,
    U.dev2,
    U.dev3,
    U.dev4,
    U.sales1,
    U.sales2,
    U.hr1,
    U.acct1,
    U.designer,
  ];

  for (const period of periods) {
    await prisma.payrollPeriod.create({
      data: {
        id: period.id,
        periodCode: period.code,
        month: period.month,
        year: period.year,
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
        payDate: new Date(period.payDate),
        status: period.status,
        workingDaysInPeriod: period.stdDays,
        standardWorkingMinutes: period.stdDays * 8 * 60,
        approvedByUserId: period.approvedBy,
        approvedAt: new Date(period.payDate),
        paidAt: period.status === "PAID" ? new Date(period.payDate) : null,
        lockedAt: new Date(period.endDate),
      },
    });

    let recIdx = 0;
    for (const uid of payrollUsers) {
      const base = activeSalary(uid);
      const allowances = allowanceMap[uid] || 0;
      const otMin = (otMinutesData[period.id] || {})[uid] || 0;
      const bonus = (bonusData[period.id] || {})[uid] || 0;
      const wdMap = workDaysData[period.id] || {};
      const workDays =
        wdMap[uid] !== undefined ? wdMap[uid] : wdMap.default || period.stdDays;
      const calc = calcPayroll(
        base,
        allowances,
        workDays,
        period.stdDays,
        otMin,
        bonus,
      );

      const recId = `pr-${period.id}-${recIdx++}`;
      await prisma.payrollRecord.create({
        data: {
          id: recId,
          payrollPeriodId: period.id,
          userId: uid,
          baseSalary: base,
          workingDays: workDays,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          absentDays: 0,
          lateDays: 0,
          overtimeWeekdayMinutes: otMin,
          overtimeWeekendMinutes: 0,
          overtimeHolidayMinutes: 0,
          totalOvertimePay: calc.totalOvertimePay,
          grossSalary: calc.grossSalary,
          totalAllowances: calc.totalAllowances,
          totalBonus: calc.totalBonus,
          socialInsuranceEmployee: calc.socialInsuranceEmployee,
          healthInsuranceEmployee: calc.healthInsuranceEmployee,
          unemploymentInsuranceEmployee: calc.unemploymentInsuranceEmployee,
          personalIncomeTax: calc.personalIncomeTax,
          taxableIncome: calc.taxableIncome,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
          status: period.status === "PAID" ? "PAID" : "APPROVED",
          dailyRate: calc.dailyRate,
          hourlyRate: calc.hourlyRate,
          generatedAt: new Date(period.endDate),
          approvedAt: new Date(period.payDate),
          paidAt: period.status === "PAID" ? new Date(period.payDate) : null,
          paymentRef:
            period.status === "PAID"
              ? `TECHVN-${period.code}-${recIdx.toString().padStart(3, "0")}`
              : null,
          items: {
            createMany: {
              data: [
                {
                  itemName: "Lương cơ bản",
                  itemType: "EARNING",
                  sourceType: "BASE",
                  amount: calc.earnedBase,
                  salaryComponentId: null,
                },
                {
                  itemName: "Phụ cấp",
                  itemType: "EARNING",
                  sourceType: "ALLOWANCE",
                  amount: allowances,
                  salaryComponentId: null,
                },
                ...(otMin > 0
                  ? [
                      {
                        itemName: "Lương làm thêm giờ",
                        itemType: "EARNING",
                        sourceType: "OVERTIME",
                        amount: calc.totalOvertimePay,
                        salaryComponentId: null,
                      },
                    ]
                  : []),
                ...(bonus > 0
                  ? [
                      {
                        itemName: "Thưởng hiệu suất",
                        itemType: "EARNING",
                        sourceType: "BONUS",
                        amount: bonus,
                        salaryComponentId: null,
                      },
                    ]
                  : []),
                {
                  itemName: "BHXH (8%)",
                  itemType: "DEDUCTION",
                  sourceType: "INSURANCE",
                  amount: calc.socialInsuranceEmployee,
                  salaryComponentId: null,
                },
                {
                  itemName: "BHYT (1.5%)",
                  itemType: "DEDUCTION",
                  sourceType: "INSURANCE",
                  amount: calc.healthInsuranceEmployee,
                  salaryComponentId: null,
                },
                {
                  itemName: "BHTN (1%)",
                  itemType: "DEDUCTION",
                  sourceType: "INSURANCE",
                  amount: calc.unemploymentInsuranceEmployee,
                  salaryComponentId: null,
                },
                ...(calc.personalIncomeTax > 0
                  ? [
                      {
                        itemName: "Thuế TNCN",
                        itemType: "DEDUCTION",
                        sourceType: "TAX",
                        amount: calc.personalIncomeTax,
                        salaryComponentId: null,
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      });
    }
    console.log(`   ✓ Period ${period.code}: ${payrollUsers.length} records`);
  }
  console.log();

  // ══════════════════════════════════════════════════
  // 20. PAYROLL ADJUSTMENTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣0️⃣  Payroll Adjustments...");
  await prisma.payrollAdjustment.createMany({
    data: [
      {
        id: "pa-001",
        userId: U.dev1,
        payrollPeriodId: PP.m02,
        adjustmentType: "BONUS",
        amount: 2_000_000,
        reason: "Thưởng hoàn thành dự án Alpha đúng tiến độ",
        status: "APPLIED",
        createdByUserId: U.hr,
        approvedByUserId: U.admin,
      },
      {
        id: "pa-002",
        userId: U.dev2,
        payrollPeriodId: PP.m02,
        adjustmentType: "BONUS",
        amount: 1_000_000,
        reason: "Thưởng đóng góp dự án Alpha",
        status: "APPLIED",
        createdByUserId: U.hr,
        approvedByUserId: U.admin,
      },
      {
        id: "pa-003",
        userId: U.dev4,
        payrollPeriodId: PP.m03,
        adjustmentType: "ADVANCE",
        amount: 5_000_000,
        reason: "Tạm ứng lương tháng 3 – Chi phí cưới hỏi",
        status: "APPROVED",
        createdByUserId: U.hr,
        approvedByUserId: U.admin,
        isAdvance: true,
      },
      {
        id: "pa-004",
        userId: U.designer,
        payrollPeriodId: PP.m03,
        adjustmentType: "DEDUCTION",
        amount: 500_000,
        reason: "Phạt đi muộn vượt quá quy định (3 lần)",
        status: "APPROVED",
        createdByUserId: U.hr,
        approvedByUserId: U.admin,
      },
      {
        id: "pa-005",
        userId: U.techLead,
        payrollPeriodId: null,
        adjustmentType: "BONUS",
        amount: 5_000_000,
        reason: "Thưởng Tết Nguyên Đán 2025",
        status: "APPROVED",
        createdByUserId: U.hr,
        approvedByUserId: U.admin,
      },
      {
        id: "pa-006",
        userId: U.pm,
        payrollPeriodId: null,
        adjustmentType: "BONUS",
        amount: 3_000_000,
        reason: "Thưởng Tết Nguyên Đán 2025",
        status: "PENDING",
        createdByUserId: U.hr,
        approvedByUserId: null,
      },
    ],
  });
  console.log("   ✓ 6 payroll adjustments\n");

  // ══════════════════════════════════════════════════
  // 21. CLIENTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣1️⃣  Clients...");
  await prisma.client.createMany({
    data: [
      {
        id: CL.alpha,
        clientCode: "KH-001",
        clientType: "COMPANY",
        status: "ACTIVE",
        companyName: "Alpha Corporation Việt Nam",
        shortName: "Alpha Corp",
        taxCode: "MST1234567890",
        industry: "Thương mại điện tử",
        website: "https://alphacorp.vn",
        email: "contact@alphacorp.vn",
        phone: "028-1000-2001",
        address: "Tầng 12, Tòa nhà Bitexco, Q.1, TP.HCM",
        city: "TP. Hồ Chí Minh",
        country: "Vietnam",
        accountManagerUserId: U.salesMgr,
        totalContractValue: 850_000_000,
        totalReceivedAmount: 680_000_000,
        outstandingBalance: 170_000_000,
      },
      {
        id: CL.beta,
        clientCode: "KH-002",
        clientType: "COMPANY",
        status: "ACTIVE",
        companyName: "Beta Solutions Startup",
        shortName: "Beta",
        taxCode: "MST0987654321",
        industry: "Fintech",
        website: "https://betasolutions.io",
        email: "hello@betasolutions.io",
        phone: "028-2000-3002",
        address: "88 Nguyễn Huệ, Q.1, TP.HCM",
        city: "TP. Hồ Chí Minh",
        country: "Vietnam",
        accountManagerUserId: U.salesMgr,
        totalContractValue: 420_000_000,
        totalReceivedAmount: 420_000_000,
        outstandingBalance: 0,
      },
      {
        id: CL.gamma,
        clientCode: "KH-003",
        clientType: "COMPANY",
        status: "PROSPECT",
        companyName: "Gamma Industries Group",
        shortName: "Gamma",
        taxCode: "MST1122334455",
        industry: "Sản xuất công nghiệp",
        email: "it@gammaindustries.com",
        phone: "028-3000-4003",
        address: "KCN Sóng Thần, Bình Dương",
        city: "Bình Dương",
        country: "Vietnam",
        accountManagerUserId: U.sales2,
        totalContractValue: 0,
        totalReceivedAmount: 0,
        outstandingBalance: 0,
      },
    ],
  });
  // Client contacts
  await prisma.clientContact.createMany({
    data: [
      {
        clientId: CL.alpha,
        fullName: "Trần Anh Khoa",
        jobTitle: "CTO",
        email: "khoa.tran@alphacorp.vn",
        phone: "0912001001",
        isPrimary: true,
      },
      {
        clientId: CL.alpha,
        fullName: "Nguyễn Thị Lan",
        jobTitle: "IT Manager",
        email: "lan.nt@alphacorp.vn",
        phone: "0912001002",
        isPrimary: false,
      },
      {
        clientId: CL.beta,
        fullName: "Phạm Minh Tuấn",
        jobTitle: "CEO & Founder",
        email: "tuan@betasolutions.io",
        phone: "0912002001",
        isPrimary: true,
      },
      {
        clientId: CL.gamma,
        fullName: "Lê Văn Bình",
        jobTitle: "Giám đốc CNTT",
        email: "binh.le@gammaindustries.com",
        phone: "0912003001",
        isPrimary: true,
      },
    ],
  });
  console.log("   ✓ 3 clients + 4 contacts\n");

  // ══════════════════════════════════════════════════
  // 22. CONTRACTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣2️⃣  Contracts...");
  await prisma.contract.createMany({
    data: [
      {
        id: CT.c01,
        contractCode: "HD-2024-001",
        clientId: CL.alpha,
        contractType: "FIXED_PRICE",
        status: "ACTIVE",
        title: "Phát triển nền tảng Thương mại điện tử B2B",
        description:
          "Xây dựng website và app mobile thương mại điện tử cho Alpha Corp, bao gồm quản lý sản phẩm, đặt hàng, thanh toán và logistics.",
        totalValue: 850_000_000,
        currency: "VND",
        receivedAmount: 680_000_000,
        remainingAmount: 170_000_000,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-06-30"),
        signedDate: new Date("2024-08-20"),
        signedByUserId: U.admin,
      },
      {
        id: CT.c02,
        contractCode: "HD-2024-002",
        clientId: CL.beta,
        contractType: "TIME_AND_MATERIAL",
        status: "COMPLETED",
        title: "Phát triển ứng dụng Mobile Banking",
        description:
          "Xây dựng app mobile banking cho iOS và Android, tích hợp thanh toán QR, chuyển tiền, quản lý tài khoản.",
        totalValue: 420_000_000,
        currency: "VND",
        receivedAmount: 420_000_000,
        remainingAmount: 0,
        startDate: new Date("2024-04-01"),
        endDate: new Date("2024-12-31"),
        signedDate: new Date("2024-03-15"),
        signedByUserId: U.admin,
      },
      {
        id: CT.c03,
        contractCode: "HD-2025-003",
        clientId: CL.gamma,
        contractType: "MILESTONE_BASED",
        status: "DRAFT",
        title: "Triển khai hệ thống ERP Sản xuất",
        description:
          "Tư vấn, thiết kế và triển khai hệ thống ERP tích hợp quản lý sản xuất, kho hàng, tài chính cho Gamma Industries.",
        totalValue: 1_200_000_000,
        currency: "VND",
        receivedAmount: 0,
        remainingAmount: 1_200_000_000,
        startDate: new Date("2025-05-01"),
        endDate: new Date("2026-04-30"),
        signedDate: null,
        signedByUserId: null,
      },
    ],
  });
  // Amendment cho contract 1
  await prisma.contractAmendment.create({
    data: {
      contractId: CT.c01,
      amendmentCode: "HD-2024-001-PL01",
      title: "Phụ lục 01: Bổ sung tính năng báo cáo analytics",
      description:
        "Bổ sung module báo cáo và phân tích dữ liệu bán hàng, tích hợp Google Analytics 4.",
      valueChange: 80_000_000,
      effectiveDate: new Date("2025-01-15"),
      status: "SIGNED",
    },
  });
  console.log("   ✓ 3 contracts + 1 amendment\n");

  // ══════════════════════════════════════════════════
  // 23. PROJECTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣3️⃣  Projects...");
  await prisma.project.createMany({
    data: [
      {
        id: PJ.p01,
        projectCode: "PRJ-2024-001",
        projectName: "Alpha E-Commerce Platform",
        description:
          "Phát triển nền tảng TMĐT B2B cho Alpha Corp. Bao gồm web, mobile app, admin dashboard.",
        projectManagerUserId: U.techLead,
        clientId: CL.alpha,
        contractId: CT.c01,
        status: "ACTIVE",
        priority: "HIGH",
        healthStatus: "ON_TRACK",
        progressPercent: 65,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-06-30"),
        budgetAmount: 850_000_000,
        spentAmount: 320_000_000,
        currency: "VND",
        contractValue: 850_000_000,
        invoicedAmount: 510_000_000,
        receivedAmount: 340_000_000,
      },
      {
        id: PJ.p02,
        projectCode: "PRJ-2024-002",
        projectName: "Beta Mobile Banking App",
        description:
          "Ứng dụng mobile banking cho Beta Solutions. iOS + Android + Backend API.",
        projectManagerUserId: U.pm,
        clientId: CL.beta,
        contractId: CT.c02,
        status: "COMPLETED",
        priority: "HIGH",
        healthStatus: "ON_TRACK",
        progressPercent: 100,
        startDate: new Date("2024-04-01"),
        endDate: new Date("2024-12-31"),
        actualEndDate: new Date("2024-12-20"),
        budgetAmount: 420_000_000,
        spentAmount: 398_000_000,
        currency: "VND",
        contractValue: 420_000_000,
        invoicedAmount: 420_000_000,
        receivedAmount: 420_000_000,
      },
      {
        id: PJ.p03,
        projectCode: "PRJ-2025-003",
        projectName: "Gamma ERP System",
        description:
          "Hệ thống ERP tổng thể cho Gamma Industries. Giai đoạn khảo sát và thiết kế.",
        projectManagerUserId: U.pm,
        clientId: CL.gamma,
        contractId: null,
        status: "PLANNING",
        priority: "MEDIUM",
        healthStatus: "ON_TRACK",
        progressPercent: 10,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-04-30"),
        budgetAmount: 1_200_000_000,
        spentAmount: 15_000_000,
        currency: "VND",
        contractValue: null,
        invoicedAmount: 0,
        receivedAmount: 0,
      },
    ],
  });

  // Project assignments
  const assignments = [
    {
      userId: U.techLead,
      projectId: PJ.p01,
      role: "Tech Lead",
      alloc: 60,
      joinedAt: "2024-09-01",
      isBillable: true,
    },
    {
      userId: U.dev1,
      projectId: PJ.p01,
      role: "Backend Developer",
      alloc: 100,
      joinedAt: "2024-09-01",
      isBillable: true,
    },
    {
      userId: U.dev2,
      projectId: PJ.p01,
      role: "Frontend Developer",
      alloc: 100,
      joinedAt: "2024-09-01",
      isBillable: true,
    },
    {
      userId: U.dev3,
      projectId: PJ.p01,
      role: "Backend Developer",
      alloc: 80,
      joinedAt: "2025-02-01",
      isBillable: true,
    },
    {
      userId: U.designer,
      projectId: PJ.p01,
      role: "UI/UX Designer",
      alloc: 50,
      joinedAt: "2024-09-01",
      isBillable: true,
    },
    {
      userId: U.pm,
      projectId: PJ.p02,
      role: "Project Manager",
      alloc: 80,
      joinedAt: "2024-04-01",
      isBillable: true,
    },
    {
      userId: U.dev4,
      projectId: PJ.p02,
      role: "Mobile Developer",
      alloc: 100,
      joinedAt: "2024-04-01",
      isBillable: true,
    },
    {
      userId: U.techLead,
      projectId: PJ.p02,
      role: "Tech Advisor",
      alloc: 20,
      joinedAt: "2024-04-01",
      isBillable: false,
    },
    {
      userId: U.pm,
      projectId: PJ.p03,
      role: "Project Manager",
      alloc: 50,
      joinedAt: "2025-04-01",
      isBillable: false,
    },
    {
      userId: U.techLead,
      projectId: PJ.p03,
      role: "Solution Architect",
      alloc: 30,
      joinedAt: "2025-04-01",
      isBillable: false,
    },
    {
      userId: U.dev1,
      projectId: PJ.p03,
      role: "Tech Consultant",
      alloc: 20,
      joinedAt: "2025-04-01",
      isBillable: false,
    },
  ];
  let aIdx = 0;
  for (const a of assignments) {
    await prisma.userProjectAssignment.create({
      data: {
        id: `upa-${aIdx++}`,
        userId: a.userId,
        projectId: a.projectId,
        roleInProject: a.role,
        allocationPercent: a.alloc,
        joinedAt: new Date(a.joinedAt),
        status: a.projectId === PJ.p02 ? "ENDED" : "ACTIVE",
        leftAt: a.projectId === PJ.p02 ? new Date("2024-12-31") : null,
        isBillable: a.isBillable,
      },
    });
  }

  // Milestones
  const milestones = [
    {
      projectId: PJ.p01,
      name: "Kickoff & Phân tích nghiệp vụ",
      owner: U.pm,
      dueDate: "2024-09-30",
      completedAt: "2024-09-28",
      status: "DONE",
    },
    {
      projectId: PJ.p01,
      name: "Thiết kế UI/UX + Prototype",
      owner: U.designer,
      dueDate: "2024-11-15",
      completedAt: "2024-11-10",
      status: "DONE",
    },
    {
      projectId: PJ.p01,
      name: "MVP – Web App (v1.0)",
      owner: U.dev1,
      dueDate: "2025-02-28",
      completedAt: "2025-02-25",
      status: "DONE",
    },
    {
      projectId: PJ.p01,
      name: "Mobile App iOS & Android",
      owner: U.dev2,
      dueDate: "2025-04-30",
      completedAt: null,
      status: "IN_PROGRESS",
    },
    {
      projectId: PJ.p01,
      name: "Tích hợp cổng thanh toán & UAT",
      owner: U.techLead,
      dueDate: "2025-06-15",
      completedAt: null,
      status: "PENDING",
    },
    {
      projectId: PJ.p01,
      name: "Go-Live & Bàn giao",
      owner: U.pm,
      dueDate: "2025-06-30",
      completedAt: null,
      status: "PENDING",
    },
    {
      projectId: PJ.p02,
      name: "Thiết kế hệ thống",
      owner: U.pm,
      dueDate: "2024-05-31",
      completedAt: "2024-05-28",
      status: "DONE",
    },
    {
      projectId: PJ.p02,
      name: "Core Banking API Integration",
      owner: U.dev4,
      dueDate: "2024-08-31",
      completedAt: "2024-08-29",
      status: "DONE",
    },
    {
      projectId: PJ.p02,
      name: "Beta Testing & Bug Fix",
      owner: U.pm,
      dueDate: "2024-11-30",
      completedAt: "2024-11-28",
      status: "DONE",
    },
    {
      projectId: PJ.p02,
      name: "Go-Live App Store & Play Store",
      owner: U.pm,
      dueDate: "2024-12-20",
      completedAt: "2024-12-20",
      status: "DONE",
    },
    {
      projectId: PJ.p03,
      name: "Khảo sát hiện trạng & Lập báo cáo AS-IS",
      owner: U.pm,
      dueDate: "2025-05-31",
      completedAt: null,
      status: "PENDING",
    },
    {
      projectId: PJ.p03,
      name: "Thiết kế TO-BE & Chốt giải pháp",
      owner: U.techLead,
      dueDate: "2025-07-31",
      completedAt: null,
      status: "PENDING",
    },
  ];
  let mIdx = 0;
  for (const m of milestones) {
    await prisma.projectMilestone.create({
      data: {
        id: `ms-${mIdx++}`,
        projectId: m.projectId,
        name: m.name,
        ownerUserId: m.owner,
        dueDate: new Date(m.dueDate),
        completedAt: m.completedAt ? new Date(m.completedAt) : null,
        status: m.status,
      },
    });
  }

  // Project Expenses
  const expenses = [
    {
      projectId: PJ.p01,
      submitter: U.dev1,
      approver: U.techLead,
      cat: "SOFTWARE",
      title: "Figma Professional (6 tháng)",
      amount: 3_600_000,
      date: "2024-09-05",
      status: "APPROVED",
    },
    {
      projectId: PJ.p01,
      submitter: U.dev2,
      approver: U.techLead,
      cat: "SOFTWARE",
      title: "AWS EC2 + RDS (tháng 10)",
      amount: 8_500_000,
      date: "2024-10-31",
      status: "APPROVED",
    },
    {
      projectId: PJ.p01,
      submitter: U.pm,
      approver: U.admin,
      cat: "TRAVEL",
      title: "Đi lại gặp khách hàng Alpha Q4",
      amount: 2_200_000,
      date: "2024-11-20",
      status: "REIMBURSED",
    },
    {
      projectId: PJ.p01,
      submitter: U.dev1,
      approver: null,
      cat: "SOFTWARE",
      title: "Sentry Error Tracking (3 tháng)",
      amount: 4_200_000,
      date: "2025-03-01",
      status: "PENDING",
    },
    {
      projectId: PJ.p02,
      submitter: U.pm,
      approver: U.admin,
      cat: "TRAVEL",
      title: "Bay HN-HCM họp kickoff Beta",
      amount: 5_800_000,
      date: "2024-04-03",
      status: "REIMBURSED",
    },
    {
      projectId: PJ.p02,
      submitter: U.dev4,
      approver: U.pm,
      cat: "SOFTWARE",
      title: "Apple Developer Account (1 năm)",
      amount: 3_000_000,
      date: "2024-04-10",
      status: "APPROVED",
    },
    {
      projectId: PJ.p03,
      submitter: U.pm,
      approver: null,
      cat: "TRAVEL",
      title: "Đi lại khảo sát Gamma Bình Dương",
      amount: 1_500_000,
      date: "2025-04-05",
      status: "PENDING",
    },
  ];
  let eIdx = 0;
  for (const e of expenses) {
    await prisma.projectExpense.create({
      data: {
        id: `pe-${eIdx++}`,
        projectId: e.projectId,
        submittedByUserId: e.submitter,
        approvedByUserId: e.approver,
        category: e.cat,
        title: e.title,
        description: e.title,
        amount: e.amount,
        currency: "VND",
        expenseDate: new Date(e.date),
        status: e.status,
        submittedAt: new Date(e.date),
        approvedAt:
          e.approver && e.status !== "PENDING" ? new Date(e.date) : null,
      },
    });
  }
  console.log(
    "   ✓ 3 projects + 11 assignments + 12 milestones + 7 expenses\n",
  );

  // ══════════════════════════════════════════════════
  // 24. INVOICES + ITEMS
  // ══════════════════════════════════════════════════
  console.log("2️⃣4️⃣  Invoices...");
  await prisma.invoice.create({
    data: {
      id: IV.i01,
      invoiceCode: "INV-2024-001",
      clientId: CL.alpha,
      contractId: CT.c01,
      projectId: PJ.p01,
      status: "PAID",
      issuedDate: new Date("2024-10-01"),
      dueDate: new Date("2024-10-31"),
      subtotal: 255_000_000,
      taxAmount: 25_500_000,
      totalAmount: 280_500_000,
      paidAmount: 280_500_000,
      outstandingAmount: 0,
      currency: "VND",
      createdByUserId: U.chiefAcct,
      sentAt: new Date("2024-10-01"),
      items: {
        createMany: {
          data: [
            {
              description: "Phân tích nghiệp vụ & Tài liệu thiết kế",
              quantity: 1,
              unitPrice: 80_000_000,
              amount: 80_000_000,
              taxRate: 0.1,
              taxAmount: 8_000_000,
              totalAmount: 88_000_000,
              displayOrder: 1,
            },
            {
              description: "Thiết kế UI/UX (20 màn hình)",
              quantity: 1,
              unitPrice: 60_000_000,
              amount: 60_000_000,
              taxRate: 0.1,
              taxAmount: 6_000_000,
              totalAmount: 66_000_000,
              displayOrder: 2,
            },
            {
              description: "Phát triển Backend API v1.0",
              quantity: 1,
              unitPrice: 75_000_000,
              amount: 75_000_000,
              taxRate: 0.1,
              taxAmount: 7_500_000,
              totalAmount: 82_500_000,
              displayOrder: 3,
            },
            {
              description: "Phát triển Frontend Web v1.0",
              quantity: 1,
              unitPrice: 40_000_000,
              amount: 40_000_000,
              taxRate: 0.1,
              taxAmount: 4_000_000,
              totalAmount: 44_000_000,
              displayOrder: 4,
            },
          ],
        },
      },
    },
  });
  await prisma.invoice.create({
    data: {
      id: IV.i02,
      invoiceCode: "INV-2025-002",
      clientId: CL.alpha,
      contractId: CT.c01,
      projectId: PJ.p01,
      status: "SENT",
      issuedDate: new Date("2025-02-01"),
      dueDate: new Date("2025-03-01"),
      subtotal: 190_000_000,
      taxAmount: 19_000_000,
      totalAmount: 209_000_000,
      paidAmount: 0,
      outstandingAmount: 209_000_000,
      currency: "VND",
      createdByUserId: U.chiefAcct,
      sentAt: new Date("2025-02-01"),
      items: {
        createMany: {
          data: [
            {
              description: "Phát triển Mobile App iOS",
              quantity: 1,
              unitPrice: 90_000_000,
              amount: 90_000_000,
              taxRate: 0.1,
              taxAmount: 9_000_000,
              totalAmount: 99_000_000,
              displayOrder: 1,
            },
            {
              description: "Phát triển Mobile App Android",
              quantity: 1,
              unitPrice: 80_000_000,
              amount: 80_000_000,
              taxRate: 0.1,
              taxAmount: 8_000_000,
              totalAmount: 88_000_000,
              displayOrder: 2,
            },
            {
              description: "Tích hợp analytics module",
              quantity: 1,
              unitPrice: 20_000_000,
              amount: 20_000_000,
              taxRate: 0.1,
              taxAmount: 2_000_000,
              totalAmount: 22_000_000,
              displayOrder: 3,
            },
          ],
        },
      },
    },
  });
  await prisma.invoice.create({
    data: {
      id: IV.i03,
      invoiceCode: "INV-2024-003",
      clientId: CL.beta,
      contractId: CT.c02,
      projectId: PJ.p02,
      status: "PAID",
      issuedDate: new Date("2024-12-25"),
      dueDate: new Date("2025-01-25"),
      subtotal: 420_000_000,
      taxAmount: 42_000_000,
      totalAmount: 462_000_000,
      paidAmount: 420_000_000,
      outstandingAmount: 42_000_000,
      currency: "VND",
      notes: "Thanh toán toàn bộ giá trị hợp đồng, VAT thanh toán riêng",
      createdByUserId: U.chiefAcct,
      sentAt: new Date("2024-12-25"),
      items: {
        createMany: {
          data: [
            {
              description: "Phát triển Mobile Banking App (trọn gói)",
              quantity: 1,
              unitPrice: 420_000_000,
              amount: 420_000_000,
              taxRate: 0.1,
              taxAmount: 42_000_000,
              totalAmount: 462_000_000,
              displayOrder: 1,
            },
          ],
        },
      },
    },
  });
  console.log("   ✓ 3 invoices\n");

  // ══════════════════════════════════════════════════
  // 25. CLIENT PAYMENTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣5️⃣  Client Payments...");
  await prisma.clientPayment.createMany({
    data: [
      {
        id: "cpay-001",
        clientId: CL.alpha,
        contractId: CT.c01,
        invoiceId: IV.i01,
        paymentCode: "PT-2024-001",
        amount: 280_500_000,
        currency: "VND",
        exchangeRate: 1,
        amountInVnd: 280_500_000,
        paymentDate: new Date("2024-10-25"),
        paymentMethod: "BANK_TRANSFER",
        referenceNumber: "VCB-2024-102500001",
        status: "COMPLETED",
        receivedBankName: "Vietcombank",
        receivedAccountNumber: "1000100005",
        confirmedByUserId: U.acct1,
        confirmedAt: new Date("2024-10-25"),
      },
      {
        id: "cpay-002",
        clientId: CL.beta,
        contractId: CT.c02,
        invoiceId: IV.i03,
        paymentCode: "PT-2024-002",
        amount: 420_000_000,
        currency: "VND",
        exchangeRate: 1,
        amountInVnd: 420_000_000,
        paymentDate: new Date("2025-01-15"),
        paymentMethod: "BANK_TRANSFER",
        referenceNumber: "TCB-2025-011500001",
        status: "COMPLETED",
        receivedBankName: "Techcombank",
        receivedAccountNumber: "1900100015",
        confirmedByUserId: U.acct1,
        confirmedAt: new Date("2025-01-15"),
      },
    ],
  });
  console.log("   ✓ 2 client payments\n");

  // ══════════════════════════════════════════════════
  // 26. CLIENT DOCUMENTS
  // ══════════════════════════════════════════════════
  console.log("2️⃣6️⃣  Client Documents...");
  await prisma.clientDocument.createMany({
    data: [
      {
        clientId: CL.alpha,
        documentType: "CONTRACT",
        title: "Hợp đồng HD-2024-001 (bản scan)",
        fileUrl: "https://docs.techvn.internal/contracts/HD-2024-001.pdf",
        uploadedByUserId: U.admin,
        isConfidential: false,
      },
      {
        clientId: CL.alpha,
        documentType: "PROPOSAL",
        title: "Proposal TMĐT B2B cho Alpha Corp",
        fileUrl: "https://docs.techvn.internal/proposals/alpha-ecommerce.pdf",
        uploadedByUserId: U.salesMgr,
        isConfidential: false,
      },
      {
        clientId: CL.beta,
        documentType: "CONTRACT",
        title: "Hợp đồng HD-2024-002 (bản scan)",
        fileUrl: "https://docs.techvn.internal/contracts/HD-2024-002.pdf",
        uploadedByUserId: U.admin,
        isConfidential: false,
      },
      {
        clientId: CL.beta,
        documentType: "REPORT",
        title: "Báo cáo nghiệm thu dự án Beta Banking",
        fileUrl: "https://docs.techvn.internal/reports/beta-banking-final.pdf",
        uploadedByUserId: U.pm,
        isConfidential: false,
      },
      {
        clientId: CL.gamma,
        documentType: "PROPOSAL",
        title: "Proposal ERP cho Gamma Industries",
        fileUrl: "https://docs.techvn.internal/proposals/gamma-erp-v1.pdf",
        uploadedByUserId: U.sales2,
        isConfidential: false,
      },
    ],
  });
  console.log("   ✓ 5 client documents\n");

  // ══════════════════════════════════════════════════
  // 27. NOTIFICATIONS
  // ══════════════════════════════════════════════════
  console.log("2️⃣7️⃣  Notifications...");
  const notifs = [
    // Lương
    {
      recipient: U.dev1,
      sender: U.hr,
      type: "PAYSLIP_AVAILABLE",
      title: "Phiếu lương tháng 2/2025 đã có",
      message: "Phiếu lương tháng 2/2025 đã được xử lý. Nhấn để xem chi tiết.",
      isRead: true,
    },
    {
      recipient: U.dev2,
      sender: U.hr,
      type: "PAYSLIP_AVAILABLE",
      title: "Phiếu lương tháng 2/2025 đã có",
      message: "Phiếu lương tháng 2/2025 đã được xử lý. Nhấn để xem chi tiết.",
      isRead: false,
    },
    {
      recipient: U.dev3,
      sender: U.hr,
      type: "COMPENSATION_CHANGED",
      title: "Thông tin lương của bạn đã được cập nhật",
      message:
        "Lương thử việc của bạn đã được cài đặt: 17.000.000đ/tháng. Ngày hết thử việc: 01/05/2025.",
      isRead: false,
    },
    {
      recipient: U.sales1,
      sender: U.hr,
      type: "COMPENSATION_CHANGED",
      title: "Thông tin lương của bạn đã được cập nhật",
      message:
        "Lương thử việc của bạn đã được cài đặt: 15.300.000đ/tháng. Ngày hết thử việc: 01/06/2025.",
      isRead: false,
    },
    {
      recipient: U.admin,
      sender: U.hr,
      type: "PAYROLL_READY",
      title: "Kỳ lương T3/2025 sẵn sàng duyệt",
      message: "Kỳ lương tháng 3/2025 đã được tính toán và chờ phê duyệt cuối.",
      isRead: false,
    },
    // Nghỉ phép
    {
      recipient: U.techLead,
      sender: U.dev4,
      type: "LEAVE_REQUEST_CREATED",
      title: "Đơn xin nghỉ phép mới từ Vũ Đức Thắng",
      message: "Vũ Đức Thắng xin nghỉ 2 ngày (15-16/03/2025). Vui lòng duyệt.",
      isRead: false,
    },
    {
      recipient: U.dev4,
      sender: U.hr,
      type: "LEAVE_REQUEST_APPROVED",
      title: "Đơn nghỉ phép của bạn đã được duyệt",
      message: "Đơn xin nghỉ ngày 15-16/03/2025 đã được duyệt.",
      isRead: false,
    },
    {
      recipient: U.dev1,
      sender: U.hr,
      type: "LEAVE_REQUEST_REJECTED",
      title: "Đơn nghỉ phép bị từ chối",
      message: "Đơn nghỉ ngày 25/03/2025 bị từ chối: Giai đoạn deadline dự án.",
      isRead: true,
    },
    // OT
    {
      recipient: U.dev1,
      sender: U.techLead,
      type: "OVERTIME_APPROVED",
      title: "Yêu cầu làm thêm giờ đã được duyệt",
      message: "OT ngày 08/01/2025 (18:00-21:00) đã được phê duyệt.",
      isRead: true,
    },
    {
      recipient: U.dev3,
      sender: null,
      type: "OVERTIME_REQUEST_CREATED",
      title: "Yêu cầu OT của bạn đang chờ duyệt",
      message: "Yêu cầu làm thêm giờ ngày 20/02/2025 đang chờ phê duyệt.",
      isRead: true,
    },
    // Dự án
    {
      recipient: U.dev3,
      sender: U.techLead,
      type: "PROJECT_ASSIGNED",
      title: "Bạn được thêm vào dự án Alpha E-Commerce",
      message:
        "Bạn đã được gán vào dự án Alpha E-Commerce Platform với vai trò Backend Developer.",
      isRead: false,
    },
    {
      recipient: U.techLead,
      sender: null,
      type: "MILESTONE_DUE_SOON",
      title: "Milestone sắp đến hạn",
      message:
        'Milestone "Mobile App iOS & Android" sẽ đến hạn vào 30/04/2025.',
      isRead: false,
    },
    // Hợp đồng
    {
      recipient: U.admin,
      sender: U.salesMgr,
      type: "CONTRACT_SIGNED",
      title: "Hợp đồng HD-2024-001 đã được ký",
      message: "Hợp đồng TMĐT B2B với Alpha Corp đã được ký ngày 20/08/2024.",
      isRead: true,
    },
    {
      recipient: U.admin,
      sender: null,
      type: "PAYMENT_RECEIVED",
      title: "Nhận thanh toán từ Alpha Corp",
      message: "Đã nhận 280.500.000đ từ Alpha Corp (HĐ-2024-001, đợt 1).",
      isRead: true,
    },
    {
      recipient: U.chiefAcct,
      sender: null,
      type: "INVOICE_OVERDUE",
      title: "Hóa đơn INV-2025-002 quá hạn",
      message:
        "Hóa đơn INV-2025-002 (Alpha Corp, 209tr) đã quá hạn thanh toán.",
      isRead: false,
    },
  ];
  let nIdx = 0;
  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        id: `notif-${nIdx++}`,
        recipientUserId: n.recipient,
        senderUserId: n.sender,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: n.isRead ? new Date("2025-03-01") : null,
      },
    });
  }
  console.log("   ✓", notifs.length, "notifications\n");

  // ══════════════════════════════════════════════════
  // 28. AUDIT LOGS
  // ══════════════════════════════════════════════════
  console.log("2️⃣8️⃣  Audit Logs...");
  const auditEntries = [
    {
      entity: "USER",
      entityId: U.dev3,
      action: "CREATE",
      actor: U.hr,
      desc: `Tạo tài khoản nhân viên EMP009 – Ngô Quang Minh (Junior Developer)`,
    },
    {
      entity: "USER",
      entityId: U.sales1,
      action: "CREATE",
      actor: U.hr,
      desc: `Tạo tài khoản nhân viên EMP011 – Đặng Thị Hương (Sales Executive)`,
    },
    {
      entity: "USER_COMPENSATION",
      entityId: "uc-dev3",
      action: "CREATE",
      actor: U.hr,
      desc: `Cài đặt lương thử việc 17.000.000đ/tháng cho Ngô Quang Minh (ngày trả: 10 hàng tháng)`,
    },
    {
      entity: "USER_COMPENSATION",
      entityId: "uc-sales1",
      action: "CREATE",
      actor: U.hr,
      desc: `Cài đặt lương thử việc 15.300.000đ/tháng cho Đặng Thị Hương (ngày trả: 10 hàng tháng)`,
    },
    {
      entity: "USER_COMPENSATION",
      entityId: "uc-dev1-r1",
      action: "CREATE",
      actor: U.hr,
      desc: `Tăng lương định kỳ Q1/2024 cho Đỗ Văn Hùng: 28tr → 30tr/tháng`,
    },
    {
      entity: "USER_COMPENSATION",
      entityId: "uc-tech-r1",
      action: "CREATE",
      actor: U.admin,
      desc: `Tăng lương định kỳ Q1/2023 cho Lê Hoàng Nam: 40tr → 42tr/tháng`,
    },
    {
      entity: "LEAVE_REQUEST",
      entityId: "lr-001",
      action: "APPROVE",
      actor: U.techLead,
      desc: `Duyệt đơn nghỉ phép của Đỗ Văn Hùng (06-07/01/2025)`,
    },
    {
      entity: "LEAVE_REQUEST",
      entityId: "lr-007",
      action: "REJECT",
      actor: U.techLead,
      desc: `Từ chối đơn nghỉ phép của Đỗ Văn Hùng (25/03/2025) – Giai đoạn deadline`,
    },
    {
      entity: "OVERTIME_REQUEST",
      entityId: "ot-001",
      action: "APPROVE",
      actor: U.techLead,
      desc: `Duyệt OT 3h ngày 08/01/2025 cho Đỗ Văn Hùng`,
    },
    {
      entity: "PAYROLL_PERIOD",
      entityId: PP.m01,
      action: "APPROVE",
      actor: U.admin,
      desc: `Phê duyệt kỳ lương T1/2025 – 15 nhân viên, tổng NET ~350tr`,
    },
    {
      entity: "PAYROLL_PERIOD",
      entityId: PP.m02,
      action: "APPROVE",
      actor: U.admin,
      desc: `Phê duyệt kỳ lương T2/2025 – 15 nhân viên, tổng NET ~362tr`,
    },
    {
      entity: "PAYROLL_PERIOD",
      entityId: PP.m01,
      action: "STATUS_CHANGE",
      actor: U.admin,
      desc: `Đánh dấu đã chi trả kỳ lương T1/2025 (chuyển khoản ngày 10/02/2025)`,
    },
    {
      entity: "CONTRACT",
      entityId: CT.c01,
      action: "SIGN",
      actor: U.admin,
      desc: `Ký hợp đồng HD-2024-001 với Alpha Corporation – Giá trị 850tr VND`,
    },
    {
      entity: "PAYROLL_ADJUSTMENT",
      entityId: "pa-001",
      action: "APPROVE",
      actor: U.admin,
      desc: `Duyệt thưởng 2.000.000đ cho Đỗ Văn Hùng – Hoàn thành dự án Alpha`,
    },
    {
      entity: "USER",
      entityId: U.hr,
      action: "LOGIN",
      actor: U.hr,
      desc: `Đăng nhập thành công từ 192.168.1.10`,
    },
    {
      entity: "USER",
      entityId: U.dev1,
      action: "LOGIN",
      actor: U.dev1,
      desc: `Đăng nhập thành công từ 192.168.1.25`,
    },
  ];
  let aLogIdx = 0;
  for (const a of auditEntries) {
    await prisma.auditLog.create({
      data: {
        id: `alog-${aLogIdx++}`,
        entityType: a.entity,
        entityId: a.entityId,
        actionType: a.action,
        actorUserId: a.actor,
        description: a.desc,
        ipAddress: "192.168.1." + (10 + aLogIdx),
      },
    });
  }
  console.log("   ✓", auditEntries.length, "audit logs\n");

  // ══════════════════════════════════════════════════
  // DONE
  // ══════════════════════════════════════════════════
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  ✅  Seed hoàn tất!                                    ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log("║  Tài khoản mặc định (mật khẩu: TechVN@2025)           ║");
  console.log("║  ─────────────────────────────────────────────────     ║");
  console.log("║  admin@techvn.com       → ADMIN                        ║");
  console.log("║  minh.anh@techvn.com    → HR Manager                  ║");
  console.log("║  hoang.nam@techvn.com   → Tech Lead                   ║");
  console.log("║  thu.ha@techvn.com      → Sales Manager               ║");
  console.log("║  minh.duc@techvn.com    → Kế toán trưởng              ║");
  console.log("║  lan.anh@techvn.com     → Project Manager             ║");
  console.log("║  van.hung@techvn.com    → Senior Developer            ║");
  console.log("║  quang.minh@techvn.com  → Junior Dev (PROBATION)      ║");
  console.log("║  thi.huong@techvn.com   → Sales (PROBATION)           ║");
  console.log("║                                                         ║");
  console.log("║  Dữ liệu đã tạo:                                       ║");
  console.log("║  • 15 users + profiles đầy đủ                         ║");
  console.log("║  • 3 kỳ lương (01,02/2025 PAID • 03/2025 APPROVED)    ║");
  console.log("║  • 18 compensation records (có payDay/probation v3.2)  ║");
  console.log("║  • 3 dự án, 3 khách hàng, 3 hợp đồng, 3 hóa đơn      ║");
  console.log("║  • Attendance, Leave, OT, Notifications, AuditLogs    ║");
  console.log("╚════════════════════════════════════════════════════════╝");
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
