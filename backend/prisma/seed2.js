/**
 * prisma/seed.js
 * ─────────────────────────────────────────────────────────────
 * Seed dữ liệu demo cho hệ thống ERP Innovision.
 * Chạy: npx prisma db seed
 *       hoặc: node prisma/seed.js
 * ─────────────────────────────────────────────────────────────
 */

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

const DEFAULT_PASSWORD = "TechVN@2025";
const BCRYPT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function hash(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function date(str) {
  return new Date(str);
}

function cuid(prefix, n) {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── 1. System Config ───────────────────────────────────────
  console.log("⚙️  Seeding SystemConfig...");
  const configs = [
    {
      key: "company_name",
      value: "Innovision Technology",
      description: "Tên công ty",
    },
    {
      key: "company_address",
      value: "123 Nguyễn Huệ, Q.1, TP.HCM",
      description: "Địa chỉ",
    },
    {
      key: "company_email",
      value: "hr@innovision.vn",
      description: "Email liên hệ",
    },
    { key: "company_phone", value: "028 3822 5678", description: "Điện thoại" },
    {
      key: "company_website",
      value: "https://innovision.vn",
      description: "Website",
    },
    {
      key: "default_timezone",
      value: "Asia/Ho_Chi_Minh",
      description: "Múi giờ mặc định",
    },
    {
      key: "work_hours_per_day",
      value: "8",
      description: "Giờ làm việc / ngày",
    },
    {
      key: "work_days_per_week",
      value: "5",
      description: "Ngày làm việc / tuần",
    },
    {
      key: "standard_working_days_per_month",
      value: "26",
      description: "Ngày công chuẩn / tháng",
    },
    {
      key: "default_annual_leave_days",
      value: "12",
      description: "Ngày phép năm mặc định",
    },
    {
      key: "max_overtime_hours_per_month",
      value: "40",
      description: "Giờ OT tối đa / tháng",
    },
    {
      key: "late_tolerance_minutes",
      value: "15",
      description: "Phút trễ chấp nhận",
    },
    {
      key: "payslip_visible_days_before_payday",
      value: "3",
      description: "Xem phiếu lương trước N ngày",
    },
    {
      key: "max_failed_login_attempts",
      value: "5",
      description: "Lần đăng nhập sai tối đa",
    },
    {
      key: "session_timeout_minutes",
      value: "480",
      description: "Hết hạn session (phút)",
    },
    {
      key: "default_password",
      value: DEFAULT_PASSWORD,
      description: "Mật khẩu mặc định khi reset",
    },
    {
      key: "probation_days",
      value: "60",
      description: "Số ngày thử việc mặc định",
    },
    {
      key: "payroll_currency",
      value: "VND",
      description: "Đơn vị tiền tệ lương",
    },
  ];

  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: { value: c.value, description: c.description },
      create: c,
    });
  }

  // ── 2. Departments ─────────────────────────────────────────
  console.log("🏢 Seeding Departments...");
  const depts = await Promise.all([
    prisma.department.upsert({
      where: { code: "BLD" },
      update: {},
      create: {
        id: "dept-001",
        code: "BLD",
        name: "Ban lãnh đạo",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "KD" },
      update: {},
      create: {
        id: "dept-002",
        code: "KD",
        name: "Phòng Kinh doanh",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "KT" },
      update: {},
      create: {
        id: "dept-003",
        code: "KT",
        name: "Phòng Kế toán",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "NS" },
      update: {},
      create: {
        id: "dept-004",
        code: "NS",
        name: "Phòng Nhân sự",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "IT" },
      update: {},
      create: {
        id: "dept-005",
        code: "IT",
        name: "Phòng Công nghệ",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "DA" },
      update: {},
      create: {
        id: "dept-006",
        code: "DA",
        name: "Phòng Data & AI",
        isActive: true,
      },
    }),
    prisma.department.upsert({
      where: { code: "PM" },
      update: {},
      create: {
        id: "dept-007",
        code: "PM",
        name: "Phòng Quản lý DA",
        isActive: true,
      },
    }),
  ]);

  // ── 3. Job Titles ──────────────────────────────────────────
  console.log("💼 Seeding JobTitles...");
  const jtData = [
    {
      id: "jt-001",
      code: "CEO",
      name: "Giám đốc điều hành",
      level: 10,
      isActive: true,
    },
    {
      id: "jt-002",
      code: "CFO",
      name: "Giám đốc tài chính",
      level: 9,
      isActive: true,
    },
    {
      id: "jt-003",
      code: "CTO",
      name: "Giám đốc công nghệ",
      level: 9,
      isActive: true,
    },
    {
      id: "jt-004",
      code: "PM",
      name: "Quản lý dự án",
      level: 7,
      isActive: true,
    },
    {
      id: "jt-005",
      code: "SE",
      name: "Software Engineer",
      level: 5,
      isActive: true,
    },
    {
      id: "jt-006",
      code: "SSE",
      name: "Senior Software Engineer",
      level: 6,
      isActive: true,
    },
    {
      id: "jt-007",
      code: "DS",
      name: "Data Scientist",
      level: 6,
      isActive: true,
    },
    {
      id: "jt-008",
      code: "HR_MGR",
      name: "Trưởng phòng Nhân sự",
      level: 7,
      isActive: true,
    },
    {
      id: "jt-009",
      code: "HR_SP",
      name: "Chuyên viên Nhân sự",
      level: 4,
      isActive: true,
    },
    {
      id: "jt-010",
      code: "ACC",
      name: "Kế toán viên",
      level: 4,
      isActive: true,
    },
    {
      id: "jt-011",
      code: "SALES",
      name: "Kinh doanh viên",
      level: 4,
      isActive: true,
    },
    {
      id: "jt-012",
      code: "INTERN",
      name: "Thực tập sinh",
      level: 1,
      isActive: true,
    },
  ];

  for (const jt of jtData) {
    await prisma.jobTitle.upsert({
      where: { code: jt.code },
      update: {},
      create: jt,
    });
  }

  // ── 4. Work Shifts ─────────────────────────────────────────
  console.log("🕐 Seeding WorkShifts...");
  const shifts = [
    {
      id: "ws-001",
      code: "CA_SANG",
      name: "Ca sáng",
      shiftType: "MORNING",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
      workMinutes: 480,
      overtimeAfterMinutes: 30,
    },
    {
      id: "ws-002",
      code: "CA_CHIEU",
      name: "Ca chiều",
      shiftType: "AFTERNOON",
      startTime: "13:00",
      endTime: "22:00",
      breakMinutes: 60,
      workMinutes: 480,
      overtimeAfterMinutes: 30,
    },
    {
      id: "ws-003",
      code: "CA_DEM",
      name: "Ca đêm",
      shiftType: "NIGHT",
      startTime: "22:00",
      endTime: "06:00",
      breakMinutes: 60,
      workMinutes: 480,
      overtimeAfterMinutes: 30,
    },
    {
      id: "ws-004",
      code: "LH",
      name: "Linh hoạt",
      shiftType: "FLEXIBLE",
      startTime: "08:00",
      endTime: "18:00",
      breakMinutes: 60,
      workMinutes: 480,
      overtimeAfterMinutes: 60,
    },
  ];

  for (const s of shifts) {
    await prisma.workShift.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  // ── 5. Holidays 2025 ───────────────────────────────────────
  console.log("🎉 Seeding Holidays 2025...");
  const holidays2025 = [
    {
      name: "Tết Dương lịch",
      date: date("2025-01-01"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Tết Nguyên Đán (28 TN)",
      date: date("2025-01-28"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (29 TN)",
      date: date("2025-01-29"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (30 TN)",
      date: date("2025-01-30"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (Mùng 1)",
      date: date("2025-01-31"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (Mùng 2)",
      date: date("2025-02-01"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (Mùng 3)",
      date: date("2025-02-02"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Giỗ Tổ Hùng Vương",
      date: date("2025-04-07"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Ngày Giải phóng miền Nam",
      date: date("2025-04-30"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc tế Lao động",
      date: date("2025-05-01"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc khánh",
      date: date("2025-09-02"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc khánh (bù)",
      date: date("2025-09-03"),
      year: 2025,
      isRecurring: false,
    },
  ];

  for (const h of holidays2025) {
    const existing = await prisma.holiday.findFirst({
      where: { date: h.date },
    });
    if (!existing) await prisma.holiday.create({ data: h });
  }

  // ── 6. Leave Types ─────────────────────────────────────────
  console.log("🌴 Seeding LeaveTypes...");
  const leaveTypes = [
    {
      id: "lt-001",
      code: "ANNUAL",
      name: "Nghỉ phép năm",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 12,
      isActive: true,
      color: "#3b82f6",
    },
    {
      id: "lt-002",
      code: "SICK",
      name: "Nghỉ ốm",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 30,
      isActive: true,
      color: "#ef4444",
    },
    {
      id: "lt-003",
      code: "MATERNITY",
      name: "Nghỉ thai sản",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 180,
      isActive: true,
      color: "#ec4899",
    },
    {
      id: "lt-004",
      code: "PATERNITY",
      name: "Nghỉ thai sản (bố)",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 5,
      isActive: true,
      color: "#8b5cf6",
    },
    {
      id: "lt-005",
      code: "UNPAID",
      name: "Nghỉ không lương",
      isPaid: false,
      requiresApproval: true,
      maxDaysPerYear: 30,
      isActive: true,
      color: "#6b7280",
    },
    {
      id: "lt-006",
      code: "MARRIAGE",
      name: "Nghỉ kết hôn",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 3,
      isActive: true,
      color: "#f59e0b",
    },
    {
      id: "lt-007",
      code: "BEREAVEMENT",
      name: "Nghỉ tang",
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 3,
      isActive: true,
      color: "#374151",
    },
    {
      id: "lt-008",
      code: "COMPENSATORY",
      name: "Nghỉ bù",
      isPaid: true,
      requiresApproval: false,
      maxDaysPerYear: 365,
      isActive: true,
      color: "#10b981",
    },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: {},
      create: lt,
    });
  }

  // ── 7. Insurance Policies ──────────────────────────────────
  console.log("🏥 Seeding InsurancePolicies...");
  const insurances = [
    {
      policyType: "SOCIAL",
      name: "BHXH",
      employeeRate: 0.08,
      employerRate: 0.175,
      salaryCapAmount: 36000000,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      policyType: "HEALTH",
      name: "BHYT",
      employeeRate: 0.015,
      employerRate: 0.03,
      salaryCapAmount: 36000000,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      policyType: "UNEMPLOYMENT",
      name: "BHTN",
      employeeRate: 0.01,
      employerRate: 0.01,
      salaryCapAmount: 36000000,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
  ];

  for (const ins of insurances) {
    const existing = await prisma.insurancePolicy.findFirst({
      where: { policyType: ins.policyType, isActive: true },
    });
    if (!existing) await prisma.insurancePolicy.create({ data: ins });
  }

  // ── 8. Tax Policy 2025 ─────────────────────────────────────
  console.log("💰 Seeding TaxPolicy 2025...");
  const existingTaxPolicy = await prisma.taxPolicy.findFirst({
    where: { year: 2025, isActive: true },
  });
  let taxPolicy;
  if (!existingTaxPolicy) {
    taxPolicy = await prisma.taxPolicy.create({
      data: {
        name: "Thuế TNCN 2025",
        year: 2025,
        isActive: true,
        personalDeduction: 11000000, // 11 triệu/tháng
        dependantDeduction: 4400000, // 4.4 triệu/người phụ thuộc
        effectiveFrom: date("2025-01-01"),
        brackets: {
          create: [
            {
              bracketOrder: 1,
              minIncome: 0,
              maxIncome: 5000000,
              taxRate: 0.05,
            },
            {
              bracketOrder: 2,
              minIncome: 5000000,
              maxIncome: 10000000,
              taxRate: 0.1,
            },
            {
              bracketOrder: 3,
              minIncome: 10000000,
              maxIncome: 18000000,
              taxRate: 0.15,
            },
            {
              bracketOrder: 4,
              minIncome: 18000000,
              maxIncome: 32000000,
              taxRate: 0.2,
            },
            {
              bracketOrder: 5,
              minIncome: 32000000,
              maxIncome: 52000000,
              taxRate: 0.25,
            },
            {
              bracketOrder: 6,
              minIncome: 52000000,
              maxIncome: 80000000,
              taxRate: 0.3,
            },
            {
              bracketOrder: 7,
              minIncome: 80000000,
              maxIncome: null,
              taxRate: 0.35,
            },
          ],
        },
      },
    });
    console.log("   ✓ TaxPolicy 2025 created");
  } else {
    taxPolicy = existingTaxPolicy;
    console.log("   ✓ TaxPolicy 2025 already exists");
  }

  // ── 9. Salary Components ───────────────────────────────────
  console.log("💵 Seeding SalaryComponents...");
  const salaryComponents = [
    {
      code: "BASE_SALARY",
      name: "Lương cơ bản",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: true,
      isActive: true,
      displayOrder: 1,
    },
    {
      code: "PHONE",
      name: "Phụ cấp điện thoại",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 2,
    },
    {
      code: "TRANSPORT",
      name: "Phụ cấp đi lại",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 3,
    },
    {
      code: "MEAL",
      name: "Phụ cấp ăn trưa",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 4,
    },
    {
      code: "HOUSING",
      name: "Phụ cấp nhà ở",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 5,
    },
    {
      code: "RESPONSIBILITY",
      name: "Phụ cấp trách nhiệm",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: false,
      isActive: true,
      displayOrder: 6,
    },
    {
      code: "KPI_BONUS",
      name: "Thưởng KPI",
      componentType: "EARNING",
      calculationType: "MANUAL",
      isTaxable: true,
      isInsurable: false,
      isActive: true,
      displayOrder: 7,
    },
    {
      code: "ADVANCE_DEDUCT",
      name: "Khấu trừ tạm ứng",
      componentType: "DEDUCTION",
      calculationType: "MANUAL",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 8,
    },
    {
      code: "LATE_DEDUCT",
      name: "Phạt đi trễ",
      componentType: "DEDUCTION",
      calculationType: "FORMULA",
      isTaxable: false,
      isInsurable: false,
      isActive: true,
      displayOrder: 9,
    },
  ];

  for (const sc of salaryComponents) {
    await prisma.salaryComponent.upsert({
      where: { code: sc.code },
      update: {},
      create: sc,
    });
  }

  // ── 10. Users (Demo Accounts) ──────────────────────────────
  console.log("👥 Seeding Users...");
  const pwHash = await hash(DEFAULT_PASSWORD);

  const usersData = [
    // ── Admin ──
    {
      id: "usr-0001",
      userCode: "EMP001",
      fullName: "Nguyễn Văn An",
      email: "admin@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2020-01-15"),
      departmentId: "dept-001",
      jobTitleId: "jt-001",
      roles: ["ADMIN", "MANAGER"],
    },
    // ── HR ──
    {
      id: "usr-0002",
      userCode: "EMP002",
      fullName: "Trần Thị Bích",
      email: "hr@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2020-03-01"),
      departmentId: "dept-004",
      jobTitleId: "jt-008",
      roles: ["HR", "MANAGER"],
    },
    // ── Accountant ──
    {
      id: "usr-0003",
      userCode: "EMP003",
      fullName: "Hoàng Văn Em",
      email: "accountant@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2020-06-01"),
      departmentId: "dept-003",
      jobTitleId: "jt-010",
      roles: ["ACCOUNTANT", "MANAGER"],
    },
    // ── Manager IT ──
    {
      id: "usr-0004",
      userCode: "EMP004",
      fullName: "Lê Văn Cường",
      email: "manager.it@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2021-01-10"),
      departmentId: "dept-005",
      jobTitleId: "jt-003",
      roles: ["MANAGER"],
    },
    // ── Developers ──
    {
      id: "usr-0005",
      userCode: "EMP005",
      fullName: "Phạm Thị Dung",
      email: "dung.pham@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2021-06-15"),
      departmentId: "dept-005",
      jobTitleId: "jt-006",
      managerId: "usr-0004",
      roles: ["EMPLOYEE"],
    },
    {
      id: "usr-0006",
      userCode: "EMP006",
      fullName: "Võ Minh Tuấn",
      email: "tuan.vo@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2022-03-01"),
      departmentId: "dept-005",
      jobTitleId: "jt-005",
      managerId: "usr-0004",
      roles: ["EMPLOYEE"],
    },
    {
      id: "usr-0007",
      userCode: "EMP007",
      fullName: "Đặng Thị Hoa",
      email: "hoa.dang@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2022-09-01"),
      departmentId: "dept-006",
      jobTitleId: "jt-007",
      managerId: "usr-0004",
      roles: ["EMPLOYEE"],
    },
    // ── Sales ──
    {
      id: "usr-0008",
      userCode: "EMP008",
      fullName: "Bùi Quang Hùng",
      email: "sales@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2021-09-15"),
      departmentId: "dept-002",
      jobTitleId: "jt-011",
      roles: ["SALES", "MANAGER"],
    },
    {
      id: "usr-0009",
      userCode: "EMP009",
      fullName: "Ngô Thị Lan",
      email: "lan.ngo@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      hireDate: date("2023-01-10"),
      departmentId: "dept-002",
      jobTitleId: "jt-011",
      managerId: "usr-0008",
      roles: ["SALES", "EMPLOYEE"],
    },
    // ── Probation ──
    {
      id: "usr-0010",
      userCode: "EMP010",
      fullName: "Trịnh Văn Khánh",
      email: "khanh.trinh@innovision.vn",
      passwordHash: pwHash,
      accountStatus: "ACTIVE",
      employmentStatus: "PROBATION",
      hireDate: date("2025-02-01"),
      departmentId: "dept-005",
      jobTitleId: "jt-012",
      managerId: "usr-0004",
      roles: ["EMPLOYEE"],
    },
  ];

  for (const u of usersData) {
    const { roles, managerId, ...userData } = u;

    // Upsert user
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...userData,
        managerId: managerId ?? null,
        mustChangePassword: false,
      },
    });

    // Upsert roles
    for (const role of roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: u.id, role } },
        update: {},
        create: { userId: u.id, role },
      });
    }
  }

  // Cập nhật managerId sau khi tất cả users đã tạo
  await prisma.department.update({
    where: { id: "dept-004" },
    data: { managerId: "usr-0002" },
  });
  await prisma.department.update({
    where: { id: "dept-005" },
    data: { managerId: "usr-0004" },
  });
  await prisma.department.update({
    where: { id: "dept-002" },
    data: { managerId: "usr-0008" },
  });

  // ── 11. User Compensations ─────────────────────────────────
  console.log("💳 Seeding UserCompensations...");
  const compensations = [
    {
      userId: "usr-0001",
      salaryType: "MONTHLY",
      baseSalary: 50000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0002",
      salaryType: "MONTHLY",
      baseSalary: 25000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0003",
      salaryType: "MONTHLY",
      baseSalary: 22000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0004",
      salaryType: "MONTHLY",
      baseSalary: 40000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0005",
      salaryType: "MONTHLY",
      baseSalary: 28000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0006",
      salaryType: "MONTHLY",
      baseSalary: 20000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0007",
      salaryType: "MONTHLY",
      baseSalary: 24000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0008",
      salaryType: "MONTHLY",
      baseSalary: 30000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0009",
      salaryType: "MONTHLY",
      baseSalary: 18000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2024-01-01"),
      isActive: true,
    },
    {
      userId: "usr-0010",
      salaryType: "MONTHLY",
      baseSalary: 12000000,
      probationSalary: 10000000,
      standardWorkingDays: 26,
      standardWorkingHours: 8,
      overtimeRateWeekday: 1.5,
      overtimeRateWeekend: 2.0,
      overtimeRateHoliday: 3.0,
      effectiveFrom: date("2025-02-01"),
      isActive: true,
      probationEndDate: date("2025-04-01"),
      changeReason: "Nhân viên thử việc",
    },
  ];

  for (const c of compensations) {
    const existing = await prisma.userCompensation.findFirst({
      where: { userId: c.userId, isActive: true },
    });
    if (!existing) {
      await prisma.userCompensation.create({ data: c });
    }
  }

  // ── 12. User Profiles ──────────────────────────────────────
  console.log("📋 Seeding UserProfiles...");
  const profiles = [
    {
      userId: "usr-0001",
      gender: "MALE",
      dateOfBirth: date("1985-05-20"),
      phoneNumber: "0901234001",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 2,
    },
    {
      userId: "usr-0002",
      gender: "FEMALE",
      dateOfBirth: date("1990-08-15"),
      phoneNumber: "0901234002",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 1,
    },
    {
      userId: "usr-0003",
      gender: "MALE",
      dateOfBirth: date("1988-12-10"),
      phoneNumber: "0901234003",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 0,
    },
    {
      userId: "usr-0004",
      gender: "MALE",
      dateOfBirth: date("1987-03-25"),
      phoneNumber: "0901234004",
      permanentAddress: "HN",
      currentAddress: "HCM",
      dependantCount: 1,
    },
    {
      userId: "usr-0005",
      gender: "FEMALE",
      dateOfBirth: date("1995-07-08"),
      phoneNumber: "0901234005",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 0,
    },
    {
      userId: "usr-0006",
      gender: "MALE",
      dateOfBirth: date("1996-11-30"),
      phoneNumber: "0901234006",
      permanentAddress: "DN",
      currentAddress: "HCM",
      dependantCount: 0,
    },
    {
      userId: "usr-0007",
      gender: "FEMALE",
      dateOfBirth: date("1994-04-18"),
      phoneNumber: "0901234007",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 0,
    },
    {
      userId: "usr-0008",
      gender: "MALE",
      dateOfBirth: date("1989-09-05"),
      phoneNumber: "0901234008",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 2,
    },
    {
      userId: "usr-0009",
      gender: "FEMALE",
      dateOfBirth: date("1998-02-14"),
      phoneNumber: "0901234009",
      permanentAddress: "CT",
      currentAddress: "HCM",
      dependantCount: 0,
    },
    {
      userId: "usr-0010",
      gender: "MALE",
      dateOfBirth: date("2001-06-22"),
      phoneNumber: "0901234010",
      permanentAddress: "HCM",
      currentAddress: "HCM",
      dependantCount: 0,
    },
  ];

  for (const p of profiles) {
    await prisma.userProfile.upsert({
      where: { userId: p.userId },
      update: {},
      create: p,
    });
  }

  // ── 13. Leave Balances 2025 ────────────────────────────────
  console.log("📅 Seeding LeaveBalances 2025...");
  const activeUserIds = usersData
    .filter((u) => u.id !== "usr-0010")
    .map((u) => u.id);

  for (const userId of activeUserIds) {
    const existing = await prisma.leaveBalance.findFirst({
      where: { userId, leaveTypeId: "lt-001", year: 2025 },
    });
    if (!existing) {
      await prisma.leaveBalance.create({
        data: {
          userId,
          leaveTypeId: "lt-001",
          year: 2025,
          entitledDays: 12,
          carriedDays: 2,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 14,
        },
      });
    }
  }

  // ── 14. Demo Client ────────────────────────────────────────
  console.log("🤝 Seeding Demo Clients...");
  const clientsData = [
    {
      id: "cl-0001",
      clientCode: "KH0001",
      clientType: "COMPANY",
      status: "ACTIVE",
      companyName: "Công ty TNHH TechStart Việt Nam",
      shortName: "TechStart",
      taxCode: "0123456789",
      industry: "Công nghệ thông tin",
      email: "contact@techstart.vn",
      phone: "028 3812 3456",
      address: "45 Đinh Tiên Hoàng, Q.Bình Thạnh",
      city: "TP.HCM",
      accountManagerUserId: "usr-0008",
      totalContractValue: 500000000,
      totalReceivedAmount: 300000000,
      outstandingBalance: 200000000,
    },
    {
      id: "cl-0002",
      clientCode: "KH0002",
      clientType: "COMPANY",
      status: "ACTIVE",
      companyName: "Tập đoàn Vina Digital",
      shortName: "VinaDigital",
      taxCode: "9876543210",
      industry: "Thương mại điện tử",
      email: "bd@vinadigital.com",
      phone: "024 3555 7890",
      address: "88 Láng Hạ, Q.Đống Đa",
      city: "Hà Nội",
      accountManagerUserId: "usr-0009",
      totalContractValue: 1200000000,
      totalReceivedAmount: 1200000000,
      outstandingBalance: 0,
    },
    {
      id: "cl-0003",
      clientCode: "KH0003",
      clientType: "GOVERNMENT",
      status: "PROSPECT",
      companyName: "Sở Thông tin và Truyền thông TP.HCM",
      shortName: "Sở TT&TT",
      taxCode: "0300000023",
      industry: "Chính phủ / Công nghệ",
      email: "stttt@hcm.gov.vn",
      phone: "028 3825 9000",
      address: "59 Lý Tự Trọng, Q.1",
      city: "TP.HCM",
      accountManagerUserId: "usr-0008",
      totalContractValue: 0,
      totalReceivedAmount: 0,
      outstandingBalance: 0,
    },
  ];

  for (const cl of clientsData) {
    await prisma.client.upsert({
      where: { clientCode: cl.clientCode },
      update: {},
      create: cl,
    });
  }

  // ── 15. WorkShift Assignments ──────────────────────────────
  console.log("📆 Seeding WorkShift assignments...");
  const allActiveUsers = usersData.map((u) => u.id);
  for (const userId of allActiveUsers) {
    const existing = await prisma.userWorkShift.findFirst({
      where: { userId },
    });
    if (!existing) {
      await prisma.userWorkShift.create({
        data: {
          userId,
          workShiftId: "ws-001", // Ca sáng mặc định
          dayOfWeek: null, // null = tất cả các ngày
          effectiveFrom: date("2025-01-01"),
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  console.log("\n✅ Seed completed successfully!\n");
  console.log("═══════════════════════════════════════════════════");
  console.log("  Demo accounts (password: TechVN@2025)");
  console.log("═══════════════════════════════════════════════════");
  console.log("  ADMIN     : admin@innovision.vn");
  console.log("  HR        : hr@innovision.vn");
  console.log("  ACCOUNTANT: accountant@innovision.vn");
  console.log("  MANAGER   : manager.it@innovision.vn");
  console.log("  EMPLOYEE  : dung.pham@innovision.vn");
  console.log("  SALES     : sales@innovision.vn");
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
