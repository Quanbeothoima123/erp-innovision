//  Tài khoản mặc định: mật khẩu TechVN@2025 (bcrypt hash bên dưới)

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Hash của "TechVN@2025"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("TechVN@2025", 10);

// ─── Helpers ──────────────────────────────────────────────
const d = (str) => new Date(str); // shorthand ngày
const dec = (n) => n; // Decimal — Prisma nhận số JS bình thường

// ============================================================
//  MAIN
// ============================================================
async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu TechVN v3.0...");

  // ── 1. ROLES ─────────────────────────────────────────────
  console.log("  → Tạo roles...");
  const roles = await seedRoles();

  // ── 2. DEPARTMENTS & JOB TITLES ──────────────────────────
  console.log("  → Tạo phòng ban & chức danh...");
  const departments = await seedDepartments();
  const jobTitles = await seedJobTitles();

  // ── 3. USERS (tạo không có managerId trước) ──────────────
  console.log("  → Tạo users...");
  const users = await seedUsers(departments, jobTitles);

  // ── 4. Gán managerId sau khi có đủ users ─────────────────
  console.log("  → Gán manager cho users...");
  await assignManagers(users);

  // ── 5. Gán headUserId cho phòng ban ──────────────────────
  console.log("  → Gán trưởng phòng...");
  await assignDepartmentHeads(departments, users);

  // ── 6. UserRole ──────────────────────────────────────────
  console.log("  → Gán roles cho users...");
  await seedUserRoles(users, roles);

  // ── 7. UserProfile ───────────────────────────────────────
  console.log("  → Tạo hồ sơ cá nhân...");
  await seedUserProfiles(users);

  // ── 8. CẤU HÌNH LƯƠNG ────────────────────────────────────
  console.log("  → Cấu hình bảo hiểm & thuế...");
  const { insurancePolicies, taxPolicy } = await seedPayrollConfig();

  console.log("  → Cấu hình thành phần lương...");
  const salaryComponents = await seedSalaryComponents();

  console.log("  → Cấu hình lương nhân viên...");
  await seedUserCompensations(users, salaryComponents);

  // ── 9. NGHỈ PHÉP ─────────────────────────────────────────
  console.log("  → Tạo loại nghỉ phép & số dư phép...");
  const leaveTypes = await seedLeaveTypes();
  await seedLeaveBalances(users, leaveTypes);
  await seedLeaveRequests(users, leaveTypes);

  // ── 10. CHẤM CÔNG ────────────────────────────────────────
  console.log("  → Tạo ca làm việc & ngày lễ...");
  const workShifts = await seedWorkShifts();
  await seedHolidays();

  console.log("  → Tạo yêu cầu & bản ghi chấm công...");
  await seedAttendance(users, workShifts);

  // ── 11. OT ───────────────────────────────────────────────
  console.log("  → Tạo yêu cầu OT...");
  await seedOvertimeRequests(users);

  // ── 12. DỰ ÁN ────────────────────────────────────────────
  console.log("  → Tạo khách hàng & dự án...");
  const clients = await seedClients(users);
  const contracts = await seedContracts(clients, users);
  const projects = await seedProjects(clients, contracts, users);
  await seedProjectAssignments(projects, users);
  await seedMilestones(projects, users);
  await seedProjectExpenses(projects, users);

  // ── 13. HÓA ĐƠN & THANH TOÁN ─────────────────────────────
  console.log("  → Tạo hóa đơn & thanh toán...");
  const invoices = await seedInvoices(clients, contracts, projects, users);
  await seedClientPayments(clients, contracts, invoices, users);

  // ── 14. PAYROLL ───────────────────────────────────────────
  console.log("  → Tạo kỳ lương...");
  await seedPayroll(users, salaryComponents);

  // ── 15. NOTIFICATIONS ─────────────────────────────────────
  console.log("  → Tạo notifications mẫu...");
  await seedNotifications(users);

  console.log("✅ Seed hoàn tất!");
  console.log("");
  console.log("📋 Tài khoản demo (mật khẩu: TechVN@2025):");
  console.log("   admin@techvn.com          → ADMIN");
  console.log("   nguyen.van.an@techvn.com  → CEO (ADMIN + MANAGER)");
  console.log("   tran.thi.bich@techvn.com  → CTO (MANAGER)");
  console.log("   le.van.cuong@techvn.com   → HR Manager (HR)");
  console.log("   pham.thi.dung@techvn.com  → Sales Manager (SALES + MANAGER)");
  console.log(
    "   hoang.van.em@techvn.com   → Finance Manager (ACCOUNTANT + MANAGER)",
  );
  console.log("   nguyen.minh.giang@techvn.com → Senior Dev (EMPLOYEE)");
  console.log("   vo.thi.huong@techvn.com   → Developer (EMPLOYEE)");
  console.log("   tran.van.hung@techvn.com  → BA (EMPLOYEE)");
  console.log("   le.thi.lan@techvn.com     → Sales (SALES)");
  console.log("   dinh.van.khoa@techvn.com  → Accountant (ACCOUNTANT)");
  console.log("   mai.thi.linh@techvn.com   → HR Staff (HR)");
}

// ============================================================
//  1. ROLES
// ============================================================
async function seedRoles() {
  const data = [
    {
      code: "ADMIN",
      name: "Quản trị hệ thống",
      description: "Toàn quyền hệ thống, tạo tài khoản cho nhân viên",
    },
    {
      code: "HR",
      name: "Nhân sự",
      description: "Quản lý nhân sự, lương, nghỉ phép, duyệt chấm công",
    },
    {
      code: "MANAGER",
      name: "Quản lý",
      description: "Quản lý phòng ban / dự án, duyệt nghỉ phép & OT",
    },
    {
      code: "EMPLOYEE",
      name: "Nhân viên",
      description: "Tự phục vụ: chấm công, nghỉ phép, OT, xem lương",
    },
    {
      code: "SALES",
      name: "Kinh doanh",
      description: "Quản lý khách hàng, hợp đồng, hóa đơn",
    },
    {
      code: "ACCOUNTANT",
      name: "Kế toán",
      description: "Bảng lương, thanh toán, hóa đơn",
    },
  ];
  const result = {};
  for (const r of data) {
    result[r.code] = await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }
  return result;
}

// ============================================================
//  2. DEPARTMENTS & JOB TITLES
// ============================================================
async function seedDepartments() {
  const data = [
    { name: "Ban Giám Đốc", description: "Lãnh đạo cấp cao" },
    { name: "Phòng Nhân Sự", description: "Quản lý nhân sự và phúc lợi" },
    { name: "Phòng Kỹ Thuật", description: "Phát triển phần mềm và hạ tầng" },
    {
      name: "Phòng Kinh Doanh",
      description: "Bán hàng và phát triển thị trường",
    },
    { name: "Phòng Tài Chính", description: "Kế toán và quản lý tài chính" },
    { name: "Phòng Marketing", description: "Marketing và truyền thông" },
    { name: "Phòng BA", description: "Business Analysis và quản lý yêu cầu" },
  ];
  const result = {};
  for (const dept of data) {
    result[dept.name] = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  return result;
}

async function seedJobTitles() {
  const data = [
    {
      code: "CEO",
      name: "Giám đốc điều hành",
      description: "Chief Executive Officer",
    },
    {
      code: "CTO",
      name: "Giám đốc kỹ thuật",
      description: "Chief Technology Officer",
    },
    {
      code: "CFO",
      name: "Giám đốc tài chính",
      description: "Chief Financial Officer",
    },
    { code: "HR_MGR", name: "Trưởng phòng nhân sự", description: "HR Manager" },
    {
      code: "SALES_MGR",
      name: "Trưởng phòng kinh doanh",
      description: "Sales Manager",
    },
    {
      code: "FIN_MGR",
      name: "Trưởng phòng tài chính",
      description: "Finance Manager",
    },
    {
      code: "MKT_MGR",
      name: "Trưởng phòng marketing",
      description: "Marketing Manager",
    },
    { code: "BA_LEAD", name: "BA Lead", description: "Business Analysis Lead" },
    {
      code: "SENIOR_DEV",
      name: "Senior Developer",
      description: "Senior Software Developer",
    },
    { code: "DEV", name: "Developer", description: "Software Developer" },
    {
      code: "JUNIOR_DEV",
      name: "Junior Developer",
      description: "Junior Software Developer",
    },
    { code: "BA", name: "Business Analyst", description: "Business Analyst" },
    {
      code: "SALES_EXE",
      name: "Sales Executive",
      description: "Chuyên viên kinh doanh",
    },
    { code: "ACCOUNTANT", name: "Kế toán viên", description: "Accountant" },
    { code: "HR_STAFF", name: "Chuyên viên nhân sự", description: "HR Staff" },
    {
      code: "MKT_STAFF",
      name: "Chuyên viên marketing",
      description: "Marketing Staff",
    },
    {
      code: "TESTER",
      name: "QA/Tester",
      description: "Quality Assurance Engineer",
    },
    {
      code: "DEVOPS",
      name: "DevOps Engineer",
      description: "DevOps / Infrastructure Engineer",
    },
  ];
  const result = {};
  for (const jt of data) {
    result[jt.code] = await prisma.jobTitle.upsert({
      where: { code: jt.code },
      update: {},
      create: jt,
    });
  }
  return result;
}

// ============================================================
//  3. USERS
// ============================================================
async function seedUsers(depts, jobs) {
  const usersData = [
    // ── Hệ thống ─────────────────────────────────────────
    {
      key: "admin",
      userCode: "SYS001",
      email: "admin@techvn.com",
      fullName: "System Admin",
      phoneNumber: "0900000000",
      departmentId: depts["Ban Giám Đốc"].id,
      jobTitleId: jobs["CEO"].id,
      hireDate: d("2020-01-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Ban Giám Đốc ──────────────────────────────────────
    {
      key: "ceo",
      userCode: "EMP001",
      email: "nguyen.van.an@techvn.com",
      fullName: "Nguyễn Văn An",
      phoneNumber: "0901111111",
      departmentId: depts["Ban Giám Đốc"].id,
      jobTitleId: jobs["CEO"].id,
      hireDate: d("2020-01-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng Kỹ Thuật ────────────────────────────────────
    {
      key: "cto",
      userCode: "EMP002",
      email: "tran.thi.bich@techvn.com",
      fullName: "Trần Thị Bích",
      phoneNumber: "0902222222",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["CTO"].id,
      hireDate: d("2020-02-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "senior_dev",
      userCode: "EMP003",
      email: "nguyen.minh.giang@techvn.com",
      fullName: "Nguyễn Minh Giang",
      phoneNumber: "0903333333",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["SENIOR_DEV"].id,
      hireDate: d("2021-03-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "dev1",
      userCode: "EMP004",
      email: "vo.thi.huong@techvn.com",
      fullName: "Võ Thị Hương",
      phoneNumber: "0904444444",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["DEV"].id,
      hireDate: d("2022-06-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "dev2",
      userCode: "EMP005",
      email: "bui.van.ich@techvn.com",
      fullName: "Bùi Văn Ích",
      phoneNumber: "0905555555",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["DEV"].id,
      hireDate: d("2022-09-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "junior_dev",
      userCode: "EMP006",
      email: "pham.thi.jennifer@techvn.com",
      fullName: "Phạm Thị Jennifer",
      phoneNumber: "0906666666",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["JUNIOR_DEV"].id,
      hireDate: d("2024-01-15"),
      employmentStatus: "PROBATION",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "tester",
      userCode: "EMP007",
      email: "do.van.kien@techvn.com",
      fullName: "Đỗ Văn Kiên",
      phoneNumber: "0907777777",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["TESTER"].id,
      hireDate: d("2023-04-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "devops",
      userCode: "EMP008",
      email: "nguyen.van.long@techvn.com",
      fullName: "Nguyễn Văn Long",
      phoneNumber: "0908888888",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["DEVOPS"].id,
      hireDate: d("2021-11-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng Nhân Sự ─────────────────────────────────────
    {
      key: "hr_mgr",
      userCode: "EMP009",
      email: "le.van.cuong@techvn.com",
      fullName: "Lê Văn Cường",
      phoneNumber: "0909999999",
      departmentId: depts["Phòng Nhân Sự"].id,
      jobTitleId: jobs["HR_MGR"].id,
      hireDate: d("2020-03-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "hr_staff",
      userCode: "EMP010",
      email: "mai.thi.linh@techvn.com",
      fullName: "Mai Thị Linh",
      phoneNumber: "0910101010",
      departmentId: depts["Phòng Nhân Sự"].id,
      jobTitleId: jobs["HR_STAFF"].id,
      hireDate: d("2022-01-10"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng Kinh Doanh ──────────────────────────────────
    {
      key: "sales_mgr",
      userCode: "EMP011",
      email: "pham.thi.dung@techvn.com",
      fullName: "Phạm Thị Dung",
      phoneNumber: "0911111111",
      departmentId: depts["Phòng Kinh Doanh"].id,
      jobTitleId: jobs["SALES_MGR"].id,
      hireDate: d("2020-04-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "sales1",
      userCode: "EMP012",
      email: "le.thi.lan@techvn.com",
      fullName: "Lê Thị Lan",
      phoneNumber: "0912121212",
      departmentId: depts["Phòng Kinh Doanh"].id,
      jobTitleId: jobs["SALES_EXE"].id,
      hireDate: d("2023-02-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "sales2",
      userCode: "EMP013",
      email: "tran.van.minh@techvn.com",
      fullName: "Trần Văn Minh",
      phoneNumber: "0913131313",
      departmentId: depts["Phòng Kinh Doanh"].id,
      jobTitleId: jobs["SALES_EXE"].id,
      hireDate: d("2023-08-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng Tài Chính ───────────────────────────────────
    {
      key: "fin_mgr",
      userCode: "EMP014",
      email: "hoang.van.em@techvn.com",
      fullName: "Hoàng Văn Em",
      phoneNumber: "0914141414",
      departmentId: depts["Phòng Tài Chính"].id,
      jobTitleId: jobs["FIN_MGR"].id,
      hireDate: d("2020-05-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "accountant",
      userCode: "EMP015",
      email: "dinh.van.khoa@techvn.com",
      fullName: "Đinh Văn Khoa",
      phoneNumber: "0915151515",
      departmentId: depts["Phòng Tài Chính"].id,
      jobTitleId: jobs["ACCOUNTANT"].id,
      hireDate: d("2021-07-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng BA ──────────────────────────────────────────
    {
      key: "ba_lead",
      userCode: "EMP016",
      email: "tran.van.hung@techvn.com",
      fullName: "Trần Văn Hùng",
      phoneNumber: "0916161616",
      departmentId: depts["Phòng BA"].id,
      jobTitleId: jobs["BA_LEAD"].id,
      hireDate: d("2021-01-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    {
      key: "ba1",
      userCode: "EMP017",
      email: "nguyen.thi.oanh@techvn.com",
      fullName: "Nguyễn Thị Oanh",
      phoneNumber: "0917171717",
      departmentId: depts["Phòng BA"].id,
      jobTitleId: jobs["BA"].id,
      hireDate: d("2022-11-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Phòng Marketing ───────────────────────────────────
    {
      key: "mkt_mgr",
      userCode: "EMP018",
      email: "pham.van.phuong@techvn.com",
      fullName: "Phạm Văn Phương",
      phoneNumber: "0918181818",
      departmentId: depts["Phòng Marketing"].id,
      jobTitleId: jobs["MKT_MGR"].id,
      hireDate: d("2021-06-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    // ── Nhân viên thử việc & PENDING ─────────────────────
    {
      key: "probation1",
      userCode: "EMP019",
      email: "le.van.quynh@techvn.com",
      fullName: "Lê Văn Quỳnh",
      phoneNumber: "0919191919",
      departmentId: depts["Phòng Kỹ Thuật"].id,
      jobTitleId: jobs["JUNIOR_DEV"].id,
      hireDate: d("2025-02-01"),
      employmentStatus: "PROBATION",
      accountStatus: "ACTIVE",
      mustChangePassword: true,
    },
    {
      key: "pending1",
      userCode: "EMP020",
      email: "nguyen.thi.rose@techvn.com",
      fullName: "Nguyễn Thị Rose",
      phoneNumber: "0920202020",
      departmentId: depts["Phòng Kinh Doanh"].id,
      jobTitleId: jobs["SALES_EXE"].id,
      hireDate: d("2025-03-01"),
      employmentStatus: "PROBATION",
      accountStatus: "PENDING",
      mustChangePassword: true,
    },
  ];

  const result = {};
  for (const u of usersData) {
    const { key, ...data } = u;
    result[key] = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        passwordHash: DEFAULT_PASSWORD_HASH,
        createdByUserId: null, // sẽ update sau nếu cần
      },
    });
  }
  return result;
}

// ── Gán manager sau khi tất cả users đã tồn tại ──────────
async function assignManagers(u) {
  const assignments = [
    // CEO không có manager
    { userId: u.cto.id, managerId: u.ceo.id },
    { userId: u.hr_mgr.id, managerId: u.ceo.id },
    { userId: u.sales_mgr.id, managerId: u.ceo.id },
    { userId: u.fin_mgr.id, managerId: u.ceo.id },
    { userId: u.mkt_mgr.id, managerId: u.ceo.id },
    { userId: u.ba_lead.id, managerId: u.cto.id },
    { userId: u.senior_dev.id, managerId: u.cto.id },
    { userId: u.devops.id, managerId: u.cto.id },
    { userId: u.dev1.id, managerId: u.senior_dev.id },
    { userId: u.dev2.id, managerId: u.senior_dev.id },
    { userId: u.junior_dev.id, managerId: u.senior_dev.id },
    { userId: u.tester.id, managerId: u.senior_dev.id },
    { userId: u.ba1.id, managerId: u.ba_lead.id },
    { userId: u.hr_staff.id, managerId: u.hr_mgr.id },
    { userId: u.sales1.id, managerId: u.sales_mgr.id },
    { userId: u.sales2.id, managerId: u.sales_mgr.id },
    { userId: u.accountant.id, managerId: u.fin_mgr.id },
    { userId: u.probation1.id, managerId: u.senior_dev.id },
    { userId: u.pending1.id, managerId: u.sales_mgr.id },
  ];
  for (const a of assignments) {
    await prisma.user.update({
      where: { id: a.userId },
      data: { managerId: a.managerId },
    });
  }
}

async function assignDepartmentHeads(depts, users) {
  const map = [
    { deptName: "Ban Giám Đốc", headUser: users.ceo },
    { deptName: "Phòng Kỹ Thuật", headUser: users.cto },
    { deptName: "Phòng Nhân Sự", headUser: users.hr_mgr },
    { deptName: "Phòng Kinh Doanh", headUser: users.sales_mgr },
    { deptName: "Phòng Tài Chính", headUser: users.fin_mgr },
    { deptName: "Phòng Marketing", headUser: users.mkt_mgr },
    { deptName: "Phòng BA", headUser: users.ba_lead },
  ];
  for (const m of map) {
    await prisma.department.update({
      where: { name: m.deptName },
      data: { headUserId: m.headUser.id },
    });
  }
}

// ============================================================
//  6. USER ROLES
// ============================================================
async function seedUserRoles(u, r) {
  const assignments = [
    { user: u.admin, roles: ["ADMIN"] },
    { user: u.ceo, roles: ["ADMIN", "MANAGER"] },
    { user: u.cto, roles: ["MANAGER", "EMPLOYEE"] },
    { user: u.hr_mgr, roles: ["HR", "MANAGER"] },
    { user: u.hr_staff, roles: ["HR"] },
    { user: u.sales_mgr, roles: ["SALES", "MANAGER"] },
    { user: u.sales1, roles: ["SALES", "EMPLOYEE"] },
    { user: u.sales2, roles: ["SALES", "EMPLOYEE"] },
    { user: u.fin_mgr, roles: ["ACCOUNTANT", "MANAGER"] },
    { user: u.accountant, roles: ["ACCOUNTANT", "EMPLOYEE"] },
    { user: u.senior_dev, roles: ["MANAGER", "EMPLOYEE"] },
    { user: u.dev1, roles: ["EMPLOYEE"] },
    { user: u.dev2, roles: ["EMPLOYEE"] },
    { user: u.junior_dev, roles: ["EMPLOYEE"] },
    { user: u.tester, roles: ["EMPLOYEE"] },
    { user: u.devops, roles: ["EMPLOYEE"] },
    { user: u.ba_lead, roles: ["MANAGER", "EMPLOYEE"] },
    { user: u.ba1, roles: ["EMPLOYEE"] },
    { user: u.mkt_mgr, roles: ["MANAGER", "EMPLOYEE"] },
    { user: u.probation1, roles: ["EMPLOYEE"] },
    { user: u.pending1, roles: ["SALES", "EMPLOYEE"] },
  ];
  for (const a of assignments) {
    for (const roleCode of a.roles) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: a.user.id, roleId: r[roleCode].id } },
        update: {},
        create: { userId: a.user.id, roleId: r[roleCode].id },
      });
    }
  }
}

// ============================================================
//  7. USER PROFILES
// ============================================================
async function seedUserProfiles(u) {
  const profiles = [
    {
      userId: u.ceo.id,
      dateOfBirth: d("1985-03-15"),
      gender: "MALE",
      nationalIdNumber: "079085001234",
      nationalIdIssueDate: d("2015-06-01"),
      nationalIdIssuePlace: "Hà Nội",
      taxCode: "0123456789",
      socialInsuranceNumber: "VN0123456789",
      permanentAddress: "25 Nguyễn Huệ, Hoàn Kiếm, Hà Nội",
      bankName: "Vietcombank",
      bankAccountNumber: "0011001234567",
      bankAccountHolder: "NGUYEN VAN AN",
      emergencyContactName: "Nguyễn Thị Lan",
      emergencyContactPhone: "0901234567",
      emergencyContactRel: "Vợ",
      dependantCount: 2,
      educationLevel: "Thạc sĩ",
      educationMajor: "Quản trị kinh doanh",
      university: "ĐH Kinh tế Quốc dân",
    },
    {
      userId: u.cto.id,
      dateOfBirth: d("1987-07-22"),
      gender: "FEMALE",
      nationalIdNumber: "001087002345",
      nationalIdIssueDate: d("2017-08-15"),
      nationalIdIssuePlace: "Hà Nội",
      taxCode: "0234567890",
      socialInsuranceNumber: "VN0234567890",
      permanentAddress: "12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
      bankName: "Techcombank",
      bankAccountNumber: "1900123456789",
      bankAccountHolder: "TRAN THI BICH",
      emergencyContactName: "Trần Văn Nam",
      emergencyContactPhone: "0912345678",
      emergencyContactRel: "Chồng",
      dependantCount: 1,
      educationLevel: "Thạc sĩ",
      educationMajor: "Khoa học máy tính",
      university: "ĐH Bách Khoa Hà Nội",
    },
    {
      userId: u.hr_mgr.id,
      dateOfBirth: d("1988-11-05"),
      gender: "MALE",
      nationalIdNumber: "036088003456",
      nationalIdIssueDate: d("2018-05-20"),
      nationalIdIssuePlace: "TP.HCM",
      taxCode: "0345678901",
      socialInsuranceNumber: "VN0345678901",
      permanentAddress: "8 Lý Thường Kiệt, Quận 10, TP.HCM",
      bankName: "BIDV",
      bankAccountNumber: "0001234567890",
      bankAccountHolder: "LE VAN CUONG",
      emergencyContactName: "Lê Thị Mai",
      emergencyContactPhone: "0923456789",
      emergencyContactRel: "Vợ",
      dependantCount: 2,
      educationLevel: "Đại học",
      educationMajor: "Quản trị nhân lực",
      university: "ĐH Lao động Xã hội",
    },
    {
      userId: u.senior_dev.id,
      dateOfBirth: d("1992-05-18"),
      gender: "MALE",
      nationalIdNumber: "025092004567",
      nationalIdIssueDate: d("2020-03-10"),
      nationalIdIssuePlace: "Đà Nẵng",
      taxCode: "0456789012",
      socialInsuranceNumber: "VN0456789012",
      permanentAddress: "15 Trần Phú, Hải Châu, Đà Nẵng",
      bankName: "MB Bank",
      bankAccountNumber: "0987654321",
      bankAccountHolder: "NGUYEN MINH GIANG",
      emergencyContactName: "Nguyễn Thị Hoa",
      emergencyContactPhone: "0934567890",
      emergencyContactRel: "Mẹ",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Công nghệ thông tin",
      university: "ĐH Đà Nẵng",
    },
    {
      userId: u.sales_mgr.id,
      dateOfBirth: d("1989-09-30"),
      gender: "FEMALE",
      nationalIdNumber: "079089005678",
      nationalIdIssueDate: d("2019-11-05"),
      nationalIdIssuePlace: "Hà Nội",
      taxCode: "0567890123",
      socialInsuranceNumber: "VN0567890123",
      permanentAddress: "30 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
      bankName: "Vietinbank",
      bankAccountNumber: "1101234567890",
      bankAccountHolder: "PHAM THI DUNG",
      emergencyContactName: "Phạm Văn Bình",
      emergencyContactPhone: "0945678901",
      emergencyContactRel: "Chồng",
      dependantCount: 1,
      educationLevel: "Đại học",
      educationMajor: "Marketing",
      university: "ĐH Ngoại thương",
    },
    {
      userId: u.fin_mgr.id,
      dateOfBirth: d("1986-12-12"),
      gender: "MALE",
      nationalIdNumber: "079086006789",
      nationalIdIssueDate: d("2016-07-25"),
      nationalIdIssuePlace: "Hà Nội",
      taxCode: "0678901234",
      socialInsuranceNumber: "VN0678901234",
      permanentAddress: "45 Hàng Bài, Hoàn Kiếm, Hà Nội",
      bankName: "Agribank",
      bankAccountNumber: "1234567890123",
      bankAccountHolder: "HOANG VAN EM",
      emergencyContactName: "Hoàng Thị Lan",
      emergencyContactPhone: "0956789012",
      emergencyContactRel: "Vợ",
      dependantCount: 2,
      educationLevel: "Thạc sĩ",
      educationMajor: "Tài chính kế toán",
      university: "ĐH Kinh tế TP.HCM",
    },
    {
      userId: u.dev1.id,
      dateOfBirth: d("1996-04-08"),
      gender: "FEMALE",
      nationalIdNumber: "079096007890",
      nationalIdIssueDate: d("2022-01-15"),
      nationalIdIssuePlace: "Hà Nội",
      taxCode: "0789012345",
      socialInsuranceNumber: "VN0789012345",
      permanentAddress: "22 Bà Triệu, Hoàn Kiếm, Hà Nội",
      bankName: "TPBank",
      bankAccountNumber: "0987123456",
      bankAccountHolder: "VO THI HUONG",
      emergencyContactName: "Võ Văn Hùng",
      emergencyContactPhone: "0967890123",
      emergencyContactRel: "Anh",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Kỹ thuật phần mềm",
      university: "ĐH FPT",
    },
    {
      userId: u.ba_lead.id,
      dateOfBirth: d("1991-08-25"),
      gender: "MALE",
      nationalIdNumber: "025091008901",
      nationalIdIssueDate: d("2021-09-01"),
      nationalIdIssuePlace: "TP.HCM",
      taxCode: "0890123456",
      socialInsuranceNumber: "VN0890123456",
      permanentAddress: "7 Phạm Ngọc Thạch, Quận 3, TP.HCM",
      bankName: "Sacombank",
      bankAccountNumber: "0606060606",
      bankAccountHolder: "TRAN VAN HUNG",
      emergencyContactName: "Trần Thị Thu",
      emergencyContactPhone: "0978901234",
      emergencyContactRel: "Vợ",
      dependantCount: 1,
      educationLevel: "Đại học",
      educationMajor: "Hệ thống thông tin quản lý",
      university: "ĐH Khoa học Tự nhiên TP.HCM",
    },
  ];

  for (const p of profiles) {
    await prisma.userProfile.upsert({
      where: { userId: p.userId },
      update: {},
      create: p,
    });
  }
}

// ============================================================
//  8. PAYROLL CONFIG
// ============================================================
async function seedPayrollConfig() {
  // Bảo hiểm xã hội 2025
  const insurancePolicies = {};
  const insData = [
    {
      type: "SOCIAL",
      name: "Bảo hiểm xã hội (BHXH)",
      employeeRate: 0.08,
      employerRate: 0.175,
      salaryCapAmount: 36000000,
    },
    {
      type: "HEALTH",
      name: "Bảo hiểm y tế (BHYT)",
      employeeRate: 0.015,
      employerRate: 0.03,
      salaryCapAmount: 36000000,
    },
    {
      type: "UNEMPLOYMENT",
      name: "Bảo hiểm thất nghiệp (BHTN)",
      employeeRate: 0.01,
      employerRate: 0.01,
      salaryCapAmount: 36000000,
    },
    {
      type: "ACCIDENT",
      name: "Bảo hiểm tai nạn lao động",
      employeeRate: 0,
      employerRate: 0.005,
      salaryCapAmount: null,
    },
  ];
  for (const ins of insData) {
    insurancePolicies[ins.type] = await prisma.insurancePolicy.create({
      data: {
        policyType: ins.type,
        name: ins.name,
        employeeRate: ins.employeeRate,
        employerRate: ins.employerRate,
        salaryCapAmount: ins.salaryCapAmount,
        effectiveFrom: d("2025-01-01"),
        isActive: true,
      },
    });
  }

  // Thuế TNCN 2025 (7 bậc)
  const taxPolicy = await prisma.taxPolicy.create({
    data: {
      name: "Thuế TNCN 2025",
      year: 2025,
      personalDeduction: 11000000,
      dependantDeduction: 4400000,
      effectiveFrom: d("2025-01-01"),
      isActive: true,
      brackets: {
        create: [
          { bracketOrder: 1, minIncome: 0, maxIncome: 5000000, taxRate: 0.05 },
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

  return { insurancePolicies, taxPolicy };
}

// ── Thành phần lương ────────────────────────────────────
async function seedSalaryComponents() {
  const data = [
    // EARNINGS
    {
      code: "PC_DIEN_THOAI",
      name: "Phụ cấp điện thoại",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 1,
    },
    {
      code: "PC_AN_TRUA",
      name: "Phụ cấp ăn trưa",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 2,
    },
    {
      code: "PC_XANG_XE",
      name: "Phụ cấp xăng xe",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 3,
    },
    {
      code: "PC_THAM_NIEN",
      name: "Phụ cấp thâm niên",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 4,
    },
    {
      code: "PC_CHUC_VU",
      name: "Phụ cấp chức vụ",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 5,
    },
    {
      code: "PC_NANG_SUAT",
      name: "Phụ cấp năng suất",
      componentType: "EARNING",
      calculationType: "MANUAL",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 6,
    },
    // DEDUCTIONS
    {
      code: "KHAU_TRU_KHAC",
      name: "Khấu trừ khác",
      componentType: "DEDUCTION",
      calculationType: "MANUAL",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 10,
    },
  ];
  const result = {};
  for (const sc of data) {
    result[sc.code] = await prisma.salaryComponent.upsert({
      where: { code: sc.code },
      update: {},
      create: sc,
    });
  }
  return result;
}

// ── UserCompensation & UserSalaryComponent ──────────────
async function seedUserCompensations(u, sc) {
  // [userId, baseSalary, probationSalary, overtimeRateWeekday/Weekend/Holiday]
  const compensations = [
    {
      user: u.ceo,
      base: 60000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.cto,
      base: 50000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.hr_mgr,
      base: 25000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.hr_staff,
      base: 14000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.sales_mgr,
      base: 28000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.sales1,
      base: 15000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.sales2,
      base: 14000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.fin_mgr,
      base: 30000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.accountant,
      base: 16000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.senior_dev,
      base: 35000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.dev1,
      base: 22000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.dev2,
      base: 20000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.junior_dev,
      base: 15000000,
      prob: 12000000,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.tester,
      base: 18000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.devops,
      base: 28000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.ba_lead,
      base: 25000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.ba1,
      base: 16000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.mkt_mgr,
      base: 22000000,
      prob: null,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
    {
      user: u.probation1,
      base: 14000000,
      prob: 11000000,
      overtW: 1.5,
      overtWe: 2.0,
      overtH: 3.0,
    },
  ];

  for (const c of compensations) {
    await prisma.userCompensation.upsert({
      where: {
        userId_effectiveFrom: {
          userId: c.user.id,
          effectiveFrom: d("2025-01-01"),
        },
      },
      update: {},
      create: {
        userId: c.user.id,
        salaryType: "MONTHLY",
        baseSalary: c.base,
        probationSalary: c.prob,
        standardWorkingDays: 26,
        currency: "VND",
        overtimeRateWeekday: c.overtW,
        overtimeRateWeekend: c.overtWe,
        overtimeRateHoliday: c.overtH,
        effectiveFrom: d("2025-01-01"),
        isActive: true,
      },
    });
  }

  // Phụ cấp từng nhân viên
  const allowances = [
    // CEO
    { user: u.ceo, code: "PC_DIEN_THOAI", amount: 1000000 },
    { user: u.ceo, code: "PC_CHUC_VU", amount: 5000000 },
    // CTO
    { user: u.cto, code: "PC_DIEN_THOAI", amount: 800000 },
    { user: u.cto, code: "PC_CHUC_VU", amount: 4000000 },
    // HR Mgr
    { user: u.hr_mgr, code: "PC_DIEN_THOAI", amount: 500000 },
    { user: u.hr_mgr, code: "PC_AN_TRUA", amount: 730000 },
    { user: u.hr_mgr, code: "PC_CHUC_VU", amount: 2000000 },
    // Sales Mgr
    { user: u.sales_mgr, code: "PC_DIEN_THOAI", amount: 700000 },
    { user: u.sales_mgr, code: "PC_XANG_XE", amount: 1500000 },
    { user: u.sales_mgr, code: "PC_CHUC_VU", amount: 3000000 },
    // Fin Mgr
    { user: u.fin_mgr, code: "PC_DIEN_THOAI", amount: 500000 },
    { user: u.fin_mgr, code: "PC_AN_TRUA", amount: 730000 },
    { user: u.fin_mgr, code: "PC_CHUC_VU", amount: 2500000 },
    // Senior Dev
    { user: u.senior_dev, code: "PC_DIEN_THOAI", amount: 500000 },
    { user: u.senior_dev, code: "PC_AN_TRUA", amount: 730000 },
    { user: u.senior_dev, code: "PC_THAM_NIEN", amount: 1000000 },
    // Dev1
    { user: u.dev1, code: "PC_AN_TRUA", amount: 730000 },
    { user: u.dev1, code: "PC_XANG_XE", amount: 500000 },
    // Dev2
    { user: u.dev2, code: "PC_AN_TRUA", amount: 730000 },
    // BA Lead
    { user: u.ba_lead, code: "PC_DIEN_THOAI", amount: 500000 },
    { user: u.ba_lead, code: "PC_AN_TRUA", amount: 730000 },
    // Accountant
    { user: u.accountant, code: "PC_AN_TRUA", amount: 730000 },
    // HR Staff
    { user: u.hr_staff, code: "PC_AN_TRUA", amount: 730000 },
    // Sales1
    { user: u.sales1, code: "PC_XANG_XE", amount: 1000000 },
    { user: u.sales1, code: "PC_DIEN_THOAI", amount: 500000 },
    // Tester
    { user: u.tester, code: "PC_AN_TRUA", amount: 730000 },
    // DevOps
    { user: u.devops, code: "PC_DIEN_THOAI", amount: 500000 },
    { user: u.devops, code: "PC_AN_TRUA", amount: 730000 },
    { user: u.devops, code: "PC_THAM_NIEN", amount: 500000 },
  ];

  for (const a of allowances) {
    await prisma.userSalaryComponent.upsert({
      where: {
        userId_salaryComponentId_effectiveFrom: {
          userId: a.user.id,
          salaryComponentId: sc[a.code].id,
          effectiveFrom: d("2025-01-01"),
        },
      },
      update: {},
      create: {
        userId: a.user.id,
        salaryComponentId: sc[a.code].id,
        amount: a.amount,
        effectiveFrom: d("2025-01-01"),
        isActive: true,
      },
    });
  }
}

// ============================================================
//  9. LEAVE
// ============================================================
async function seedLeaveTypes() {
  const data = [
    {
      code: "PHEP_NAM",
      name: "Nghỉ phép năm",
      isPaid: true,
      maxDaysPerYear: 12,
      requiresDocument: false,
    },
    {
      code: "NGHI_OM",
      name: "Nghỉ ốm",
      isPaid: true,
      maxDaysPerYear: 30,
      requiresDocument: true,
    },
    {
      code: "THAI_SAN",
      name: "Nghỉ thai sản",
      isPaid: true,
      maxDaysPerYear: 180,
      requiresDocument: true,
    },
    {
      code: "NGHI_TANG",
      name: "Nghỉ tang",
      isPaid: true,
      maxDaysPerYear: 3,
      requiresDocument: false,
    },
    {
      code: "NGHI_CUOI",
      name: "Nghỉ cưới",
      isPaid: true,
      maxDaysPerYear: 3,
      requiresDocument: false,
    },
    {
      code: "KHONG_LUONG",
      name: "Nghỉ không lương",
      isPaid: false,
      maxDaysPerYear: null,
      requiresDocument: false,
    },
    {
      code: "NGHI_BU",
      name: "Nghỉ bù",
      isPaid: true,
      maxDaysPerYear: null,
      requiresDocument: false,
    },
  ];
  const result = {};
  for (const lt of data) {
    result[lt.code] = await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: {},
      create: lt,
    });
  }
  return result;
}

async function seedLeaveBalances(u, lt) {
  const year = 2025;
  // [userId, leaveTypeCode, entitled, carried, used, pending]
  const balances = [
    {
      user: u.ceo,
      code: "PHEP_NAM",
      entitled: 14,
      carried: 2,
      used: 3,
      pending: 0,
    },
    {
      user: u.cto,
      code: "PHEP_NAM",
      entitled: 14,
      carried: 1,
      used: 5,
      pending: 2,
    },
    {
      user: u.hr_mgr,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 4,
      pending: 0,
    },
    {
      user: u.hr_staff,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 2,
      pending: 1,
    },
    {
      user: u.sales_mgr,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 6,
      pending: 0,
    },
    {
      user: u.sales1,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 3,
      pending: 0,
    },
    {
      user: u.sales2,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 1,
      pending: 0,
    },
    {
      user: u.fin_mgr,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 2,
      used: 4,
      pending: 0,
    },
    {
      user: u.accountant,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 2,
      pending: 0,
    },
    {
      user: u.senior_dev,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 3,
      used: 7,
      pending: 1,
    },
    {
      user: u.dev1,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 4,
      pending: 0,
    },
    {
      user: u.dev2,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 2,
      pending: 2,
    },
    {
      user: u.junior_dev,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 1,
      pending: 0,
    },
    {
      user: u.tester,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 3,
      pending: 0,
    },
    {
      user: u.devops,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 1,
      used: 4,
      pending: 0,
    },
    {
      user: u.ba_lead,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 5,
      pending: 0,
    },
    {
      user: u.ba1,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 2,
      pending: 1,
    },
    {
      user: u.mkt_mgr,
      code: "PHEP_NAM",
      entitled: 12,
      carried: 0,
      used: 3,
      pending: 0,
    },
    {
      user: u.probation1,
      code: "PHEP_NAM",
      entitled: 6,
      carried: 0,
      used: 0,
      pending: 0,
    },
    // Nghỉ ốm một số người
    {
      user: u.dev1,
      code: "NGHI_OM",
      entitled: 30,
      carried: 0,
      used: 2,
      pending: 0,
    },
    {
      user: u.hr_staff,
      code: "NGHI_OM",
      entitled: 30,
      carried: 0,
      used: 3,
      pending: 0,
    },
  ];

  for (const b of balances) {
    const remaining = b.entitled + b.carried - b.used - b.pending;
    await prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: b.user.id,
          leaveTypeId: lt[b.code].id,
          year,
        },
      },
      update: {},
      create: {
        userId: b.user.id,
        leaveTypeId: lt[b.code].id,
        year,
        entitledDays: b.entitled,
        carriedDays: b.carried,
        usedDays: b.used,
        pendingDays: b.pending,
        remainingDays: remaining > 0 ? remaining : 0,
      },
    });
  }
}

async function seedLeaveRequests(u, lt) {
  // Đơn đã duyệt đầy đủ 2 bước
  const lr1 = await prisma.leaveRequest.create({
    data: {
      userId: u.dev1.id,
      leaveTypeId: lt["PHEP_NAM"].id,
      startDate: d("2025-02-10"),
      endDate: d("2025-02-12"),
      totalDays: 3,
      reason: "Về quê giỗ tổ tiên",
      status: "APPROVED",
      currentStep: null,
      submittedAt: d("2025-02-05"),
      finalApprovedAt: d("2025-02-07"),
    },
  });
  await prisma.leaveRequestApproval.createMany({
    data: [
      {
        leaveRequestId: lr1.id,
        approverUserId: u.senior_dev.id,
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        comment: "Đồng ý",
        actionAt: d("2025-02-06"),
      },
      {
        leaveRequestId: lr1.id,
        approverUserId: u.hr_mgr.id,
        stepType: "HR",
        stepOrder: 2,
        status: "APPROVED",
        comment: "Duyệt",
        actionAt: d("2025-02-07"),
      },
    ],
  });

  // Đơn đang PENDING chờ Manager duyệt
  const lr2 = await prisma.leaveRequest.create({
    data: {
      userId: u.dev2.id,
      leaveTypeId: lt["PHEP_NAM"].id,
      startDate: d("2025-04-07"),
      endDate: d("2025-04-09"),
      totalDays: 3,
      reason: "Nghỉ lễ 30/4 kết hợp du lịch",
      status: "PENDING",
      currentStep: "MANAGER",
      submittedAt: d("2025-03-28"),
    },
  });
  await prisma.leaveRequestApproval.create({
    data: {
      leaveRequestId: lr2.id,
      approverUserId: u.senior_dev.id,
      stepType: "MANAGER",
      stepOrder: 1,
      status: "PENDING",
    },
  });

  // Đơn đã qua Manager, đang chờ HR
  const lr3 = await prisma.leaveRequest.create({
    data: {
      userId: u.ba1.id,
      leaveTypeId: lt["PHEP_NAM"].id,
      startDate: d("2025-04-14"),
      endDate: d("2025-04-15"),
      totalDays: 2,
      reason: "Việc cá nhân",
      status: "PENDING",
      currentStep: "HR",
      submittedAt: d("2025-04-01"),
    },
  });
  await prisma.leaveRequestApproval.createMany({
    data: [
      {
        leaveRequestId: lr3.id,
        approverUserId: u.ba_lead.id,
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        actionAt: d("2025-04-02"),
      },
      {
        leaveRequestId: lr3.id,
        approverUserId: u.hr_mgr.id,
        stepType: "HR",
        stepOrder: 2,
        status: "PENDING",
      },
    ],
  });

  // Đơn bị từ chối
  const lr4 = await prisma.leaveRequest.create({
    data: {
      userId: u.tester.id,
      leaveTypeId: lt["PHEP_NAM"].id,
      startDate: d("2025-03-15"),
      endDate: d("2025-03-16"),
      totalDays: 2,
      reason: "Việc gia đình",
      status: "REJECTED",
      currentStep: null,
      submittedAt: d("2025-03-10"),
      rejectedAt: d("2025-03-11"),
      rejectionReason: "Đang cao điểm release, vui lòng dời sang tuần sau",
    },
  });
  await prisma.leaveRequestApproval.create({
    data: {
      leaveRequestId: lr4.id,
      approverUserId: u.senior_dev.id,
      stepType: "MANAGER",
      stepOrder: 1,
      status: "REJECTED",
      comment: "Đang cao điểm release",
      actionAt: d("2025-03-11"),
    },
  });

  // Đơn nghỉ ốm
  const lr5 = await prisma.leaveRequest.create({
    data: {
      userId: u.hr_staff.id,
      leaveTypeId: lt["NGHI_OM"].id,
      startDate: d("2025-01-20"),
      endDate: d("2025-01-22"),
      totalDays: 3,
      reason: "Sốt virus, có giấy bác sĩ",
      status: "APPROVED",
      currentStep: null,
      submittedAt: d("2025-01-20"),
      finalApprovedAt: d("2025-01-21"),
    },
  });
  await prisma.leaveRequestApproval.createMany({
    data: [
      {
        leaveRequestId: lr5.id,
        approverUserId: u.hr_mgr.id,
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        actionAt: d("2025-01-21"),
      },
      {
        leaveRequestId: lr5.id,
        approverUserId: u.hr_mgr.id,
        stepType: "HR",
        stepOrder: 2,
        status: "APPROVED",
        actionAt: d("2025-01-21"),
      },
    ],
  });

  // Nửa ngày nghỉ
  await prisma.leaveRequest.create({
    data: {
      userId: u.senior_dev.id,
      leaveTypeId: lt["PHEP_NAM"].id,
      startDate: d("2025-03-20"),
      endDate: d("2025-03-20"),
      totalDays: 0.5,
      isHalfDay: true,
      halfDayPeriod: "AFTERNOON",
      reason: "Đi khám sức khỏe định kỳ",
      status: "PENDING",
      currentStep: "MANAGER",
      submittedAt: d("2025-03-18"),
    },
  });
}

// ============================================================
//  10. ATTENDANCE
// ============================================================
async function seedWorkShifts() {
  const shifts = [
    {
      code: "CA_SANG",
      name: "Ca sáng",
      shiftType: "MORNING",
      startTime: "08:00",
      endTime: "17:30",
      breakMinutes: 60,
      workMinutes: 510,
      isNightShift: false,
      overtimeAfterMinutes: 30,
    },
    {
      code: "CA_CHIEU",
      name: "Ca chiều",
      shiftType: "AFTERNOON",
      startTime: "13:00",
      endTime: "22:00",
      breakMinutes: 60,
      workMinutes: 480,
      isNightShift: false,
      overtimeAfterMinutes: 30,
    },
    {
      code: "CA_DEM",
      name: "Ca đêm",
      shiftType: "NIGHT",
      startTime: "22:00",
      endTime: "06:00",
      breakMinutes: 60,
      workMinutes: 420,
      isNightShift: true,
      overtimeAfterMinutes: 30,
    },
    {
      code: "LINH_HOAT",
      name: "Giờ linh hoạt",
      shiftType: "FLEXIBLE",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      workMinutes: 480,
      isNightShift: false,
      overtimeAfterMinutes: 60,
    },
  ];
  const result = {};
  for (const s of shifts) {
    result[s.code] = await prisma.workShift.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  return result;
}

async function seedHolidays() {
  const holidays = [
    {
      name: "Tết Dương lịch",
      date: d("2025-01-01"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Tết Nguyên Đán (giao thừa)",
      date: d("2025-01-28"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (mùng 1)",
      date: d("2025-01-29"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (mùng 2)",
      date: d("2025-01-30"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (mùng 3)",
      date: d("2025-01-31"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (mùng 4)",
      date: d("2025-02-01"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Tết Nguyên Đán (mùng 5)",
      date: d("2025-02-02"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Giỗ Tổ Hùng Vương",
      date: d("2025-04-07"),
      year: 2025,
      isRecurring: false,
    },
    {
      name: "Ngày Giải phóng Miền Nam",
      date: d("2025-04-30"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc tế Lao động",
      date: d("2025-05-01"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc khánh",
      date: d("2025-09-02"),
      year: 2025,
      isRecurring: true,
    },
    {
      name: "Ngày Quốc khánh (nghỉ bù)",
      date: d("2025-09-03"),
      year: 2025,
      isRecurring: false,
    },
  ];
  for (const h of holidays) {
    try {
      await prisma.holiday.create({ data: h });
    } catch (_) {
      /* skip duplicate */
    }
  }
}

async function seedAttendance(u, shifts) {
  const shift = shifts["CA_SANG"];
  const linh = shifts["LINH_HOAT"];

  // Tạo bản ghi chấm công cho tháng 3/2025 cho một số nhân viên
  const devUsers = [
    u.senior_dev,
    u.dev1,
    u.dev2,
    u.tester,
    u.ba_lead,
    u.hr_staff,
    u.accountant,
  ];

  // Các ngày làm việc trong tháng 3 (bỏ qua thứ 7, CN)
  const workdays = [];
  for (let day = 3; day <= 28; day++) {
    const date = new Date(2025, 2, day); // tháng 3
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) workdays.push(new Date(2025, 2, day));
  }

  for (const user of devUsers) {
    for (const workDate of workdays) {
      const isLate = Math.random() < 0.1; // 10% đi muộn
      const hasOT = Math.random() < 0.2; // 20% OT
      const isWFH = Math.random() < 0.15; // 15% WFH
      const checkIn = new Date(workDate);
      const checkOut = new Date(workDate);
      checkIn.setHours(
        isLate ? 8 : 7,
        isLate ? Math.floor(Math.random() * 30) + 5 : 58,
        0,
      );
      checkOut.setHours(
        hasOT ? 19 : 17,
        hasOT ? Math.floor(Math.random() * 60) : 30,
        0,
      );
      const totalMin = Math.round((checkOut - checkIn) / 60000) - 60; // trừ nghỉ trưa
      const lateMin = isLate ? Math.floor(Math.random() * 30) + 5 : 0;
      const otMin = hasOT ? Math.floor(Math.random() * 120) + 30 : 0;

      try {
        await prisma.attendanceRecord.create({
          data: {
            userId: user.id,
            shiftId: shift.id,
            workDate,
            checkInAt: checkIn,
            checkOutAt: checkOut,
            totalWorkMinutes: totalMin,
            lateMinutes: lateMin,
            earlyLeaveMinutes: 0,
            overtimeMinutes: otMin,
            overtimeApprovedMinutes: otMin > 0 ? otMin : 0,
            isRemoteWork: isWFH,
            status: "PRESENT",
          },
        });
      } catch (_) {
        /* skip nếu đã tồn tại */
      }
    }
  }

  // Vài yêu cầu chấm công đang PENDING (hôm nay)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCheckin = new Date(today);
  todayCheckin.setHours(8, 12, 0, 0);

  for (const user of [u.dev1, u.dev2, u.ba1]) {
    try {
      await prisma.attendanceRequest.create({
        data: {
          userId: user.id,
          shiftId: shift.id,
          requestType: "CHECK_IN",
          requestedAt: todayCheckin,
          workDate: today,
          status: "PENDING",
          note: "Vào trễ do tắc đường",
        },
      });
    } catch (_) {}
  }

  // Một yêu cầu đã được duyệt
  try {
    await prisma.attendanceRequest.create({
      data: {
        userId: u.tester.id,
        shiftId: shift.id,
        requestType: "CHECK_IN",
        requestedAt: new Date(today.getTime()),
        workDate: today,
        status: "APPROVED",
        reviewerId: u.hr_mgr.id,
        reviewedAt: new Date(),
        note: "Check-in bình thường",
      },
    });
  } catch (_) {}

  // Vài yêu cầu checkout đang pending
  const todayCheckout = new Date(today);
  todayCheckout.setHours(17, 35, 0, 0);
  for (const user of [u.devops, u.sales1]) {
    try {
      await prisma.attendanceRequest.create({
        data: {
          userId: user.id,
          requestType: "CHECK_OUT",
          requestedAt: todayCheckout,
          workDate: today,
          status: "PENDING",
          note: "Xin checkout",
        },
      });
    } catch (_) {}
  }
}

// ============================================================
//  11. OT REQUESTS
// ============================================================
async function seedOvertimeRequests(u) {
  const ots = [
    // Đã duyệt
    {
      user: u.senior_dev,
      approver: u.cto,
      workDate: d("2025-03-14"),
      start: "18:00",
      end: "21:00",
      minutes: 180,
      isWeekend: false,
      reason: "Sprint deadline tính năng thanh toán",
      status: "APPROVED",
      actionAt: d("2025-03-13"),
      actualMinutes: 185,
    },
    {
      user: u.dev1,
      approver: u.senior_dev,
      workDate: d("2025-03-15"),
      start: "18:00",
      end: "20:00",
      minutes: 120,
      isWeekend: false,
      reason: "Fix bug production khẩn cấp",
      status: "APPROVED",
      actionAt: d("2025-03-14"),
      actualMinutes: 120,
    },
    {
      user: u.dev2,
      approver: u.senior_dev,
      workDate: d("2025-03-22"),
      start: "09:00",
      end: "12:00",
      minutes: 180,
      isWeekend: true,
      reason: "Hỗ trợ demo client cuối tuần",
      status: "APPROVED",
      actionAt: d("2025-03-21"),
    },
    // Đang PENDING
    {
      user: u.tester,
      approver: null,
      workDate: d("2025-04-05"),
      start: "18:00",
      end: "20:30",
      minutes: 150,
      isWeekend: false,
      reason: "Kiểm thử regression trước release",
      status: "PENDING",
    },
    {
      user: u.ba_lead,
      approver: null,
      workDate: d("2025-04-06"),
      start: "18:00",
      end: "20:00",
      minutes: 120,
      isWeekend: false,
      reason: "Chuẩn bị tài liệu khởi động dự án mới",
      status: "PENDING",
    },
    {
      user: u.devops,
      approver: null,
      workDate: d("2025-04-07"),
      start: "22:00",
      end: "02:00",
      minutes: 240,
      isWeekend: false,
      reason: "Nâng cấp server production",
      status: "PENDING",
    },
    // Bị từ chối
    {
      user: u.junior_dev,
      approver: u.senior_dev,
      workDate: d("2025-03-08"),
      start: "18:00",
      end: "22:00",
      minutes: 240,
      isWeekend: false,
      reason: "Tự nghiên cứu thêm",
      status: "REJECTED",
      actionAt: d("2025-03-07"),
      comment: "Không có việc cụ thể ngoài giờ, không duyệt OT",
    },
    // Ngày lễ
    {
      user: u.devops,
      approver: u.cto,
      workDate: d("2025-05-01"),
      start: "09:00",
      end: "17:00",
      minutes: 480,
      isWeekend: false,
      isHoliday: true,
      reason: "Maintenance hệ thống ngày lễ",
      status: "APPROVED",
      actionAt: d("2025-04-28"),
    },
  ];

  for (const o of ots) {
    await prisma.overtimeRequest.create({
      data: {
        userId: o.user.id,
        approverUserId: o.approver?.id ?? null,
        workDate: o.workDate,
        startTime: o.start,
        endTime: o.end,
        plannedMinutes: o.minutes,
        actualMinutes: o.actualMinutes ?? null,
        isHoliday: o.isHoliday ?? false,
        isWeekend: o.isWeekend ?? false,
        reason: o.reason,
        status: o.status,
        actionAt: o.actionAt ?? null,
        comment: o.comment ?? null,
      },
    });
  }
}

// ============================================================
//  12. CLIENTS, CONTRACTS, PROJECTS
// ============================================================
async function seedClients(u) {
  const clientsData = [
    {
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
      accountManagerUserId: u.sales_mgr.id,
      totalContractValue: 1500000000,
      totalReceivedAmount: 1200000000,
      outstandingBalance: 300000000,
    },
    {
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
      accountManagerUserId: u.sales1.id,
      totalContractValue: 2200000000,
      totalReceivedAmount: 1800000000,
      outstandingBalance: 400000000,
    },
    {
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
      accountManagerUserId: u.sales_mgr.id,
      totalContractValue: 3000000000,
      totalReceivedAmount: 2700000000,
      outstandingBalance: 300000000,
    },
    {
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
      accountManagerUserId: u.sales2.id,
      totalContractValue: 0,
      totalReceivedAmount: 0,
      outstandingBalance: 0,
    },
    {
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
      accountManagerUserId: u.sales1.id,
      totalContractValue: 500000000,
      totalReceivedAmount: 500000000,
      outstandingBalance: 0,
    },
  ];

  const result = {};
  for (const c of clientsData) {
    const client = await prisma.client.create({ data: c });
    result[c.clientCode] = client;

    // Thêm liên hệ chính cho mỗi khách hàng
    const contacts = {
      KH001: [
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
      KH002: [
        {
          fullName: "Lê Văn Đức",
          jobTitle: "Phó Tổng Giám đốc",
          email: "van.duc@xaydungmb.com.vn",
          phone: "0913000001",
          isPrimary: true,
        },
      ],
      KH003: [
        {
          fullName: "Phạm Quang Minh",
          jobTitle: "Chánh văn phòng",
          email: "quang.minh@soттhcm.gov.vn",
          phone: "0914000001",
          isPrimary: true,
        },
      ],
      KH004: [
        {
          fullName: "James Nguyen",
          jobTitle: "CEO & Co-Founder",
          email: "james@fintechabc.io",
          phone: "0915000001",
          isPrimary: true,
        },
      ],
      KH005: [
        {
          fullName: "Hoàng Thị Bảo",
          jobTitle: "IT Director",
          email: "bao@retailvn.com",
          phone: "0916000001",
          isPrimary: true,
        },
      ],
    };
    for (const contact of contacts[c.clientCode] || []) {
      await prisma.clientContact.create({
        data: { clientId: client.id, ...contact },
      });
    }
  }
  return result;
}

async function seedContracts(clients, u) {
  const contractsData = [
    {
      contractCode: "HĐ-2024-001",
      clientId: clients["KH001"].id,
      contractType: "FIXED_PRICE",
      status: "ACTIVE",
      title: "Phát triển Hệ thống Quản lý Kho Thông minh v2.0",
      description:
        "Xây dựng hệ thống quản lý kho hàng tích hợp IoT và AI cho FutureTech VN",
      totalValue: 1500000000,
      receivedAmount: 1200000000,
      remainingAmount: 300000000,
      startDate: d("2024-03-01"),
      endDate: d("2025-06-30"),
      signedDate: d("2024-02-20"),
      signedByUserId: u.ceo.id,
    },
    {
      contractCode: "HĐ-2024-002",
      clientId: clients["KH002"].id,
      contractType: "MILESTONE_BASED",
      status: "ACTIVE",
      title: "Xây dựng Cổng thông tin Quản lý Dự án Xây dựng",
      description:
        "Phát triển hệ thống ERP tích hợp cho quản lý dự án xây dựng",
      totalValue: 2200000000,
      receivedAmount: 1800000000,
      remainingAmount: 400000000,
      startDate: d("2024-05-01"),
      endDate: d("2025-10-31"),
      signedDate: d("2024-04-15"),
      signedByUserId: u.ceo.id,
    },
    {
      contractCode: "HĐ-2023-005",
      clientId: clients["KH003"].id,
      contractType: "RETAINER",
      status: "ACTIVE",
      title: "Dịch vụ Vận hành & Bảo trì Hệ thống CNTT",
      description:
        "Dịch vụ vận hành, bảo trì, hỗ trợ kỹ thuật 24/7 cho các hệ thống CNTT của Sở",
      totalValue: 3000000000,
      receivedAmount: 2700000000,
      remainingAmount: 300000000,
      startDate: d("2023-07-01"),
      endDate: d("2025-06-30"),
      signedDate: d("2023-06-20"),
      signedByUserId: u.ceo.id,
    },
    {
      contractCode: "HĐ-2022-003",
      clientId: clients["KH005"].id,
      contractType: "FIXED_PRICE",
      status: "COMPLETED",
      title: "Triển khai Hệ thống POS & Quản lý Chuỗi Bán lẻ",
      description:
        "Xây dựng và triển khai hệ thống POS tích hợp cho 50 cửa hàng",
      totalValue: 500000000,
      receivedAmount: 500000000,
      remainingAmount: 0,
      startDate: d("2022-04-01"),
      endDate: d("2023-03-31"),
      signedDate: d("2022-03-15"),
      signedByUserId: u.ceo.id,
    },
  ];

  const result = {};
  for (const c of contractsData) {
    result[c.contractCode] = await prisma.contract.create({ data: c });
  }

  // Phụ lục hợp đồng cho HĐ-2024-001
  await prisma.contractAmendment.create({
    data: {
      contractId: result["HĐ-2024-001"].id,
      amendmentCode: "PL-2024-001-01",
      title: "Mở rộng tính năng báo cáo thống kê",
      description:
        "Bổ sung module báo cáo nâng cao theo yêu cầu phát sinh của khách hàng",
      valueChange: 150000000,
      effectiveDate: d("2024-09-01"),
      status: "SIGNED",
    },
  });

  return result;
}

async function seedProjects(clients, contracts, u) {
  const projectsData = [
    {
      projectCode: "PRJ-2024-001",
      projectName: "Smart Warehouse v2.0 - FutureTech",
      description:
        "Phát triển hệ thống kho thông minh tích hợp IoT và AI, bao gồm module quản lý hàng tồn kho, theo dõi xe nâng, và báo cáo thời gian thực.",
      projectManagerUserId: u.senior_dev.id,
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      status: "ACTIVE",
      priority: "HIGH",
      healthStatus: "ON_TRACK",
      progressPercent: 65,
      startDate: d("2024-03-01"),
      endDate: d("2025-06-30"),
      budgetAmount: 1650000000,
      spentAmount: 820000000,
      contractValue: 1500000000,
      invoicedAmount: 1200000000,
      receivedAmount: 1200000000,
    },
    {
      projectCode: "PRJ-2024-002",
      projectName: "Construction ERP - Xây dựng MB",
      description:
        "Xây dựng hệ thống ERP quản lý toàn diện cho tập đoàn xây dựng, tích hợp quản lý dự án, nhân sự, vật tư và tài chính.",
      projectManagerUserId: u.ba_lead.id,
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      status: "ACTIVE",
      priority: "URGENT",
      healthStatus: "AT_RISK",
      progressPercent: 40,
      startDate: d("2024-05-01"),
      endDate: d("2025-10-31"),
      budgetAmount: 2500000000,
      spentAmount: 980000000,
      contractValue: 2200000000,
      invoicedAmount: 1800000000,
      receivedAmount: 1800000000,
    },
    {
      projectCode: "PRJ-2023-005",
      projectName: "IT O&M Services - Sở TT&TT",
      description:
        "Dịch vụ vận hành và bảo trì hệ thống CNTT cho Sở Thông tin và Truyền thông TP.HCM.",
      projectManagerUserId: u.devops.id,
      clientId: clients["KH003"].id,
      contractId: contracts["HĐ-2023-005"].id,
      status: "ACTIVE",
      priority: "HIGH",
      healthStatus: "ON_TRACK",
      progressPercent: 85,
      startDate: d("2023-07-01"),
      endDate: d("2025-06-30"),
      budgetAmount: 3200000000,
      spentAmount: 2600000000,
      contractValue: 3000000000,
      invoicedAmount: 2700000000,
      receivedAmount: 2700000000,
    },
    {
      projectCode: "PRJ-2022-003",
      projectName: "POS System - Retail VN",
      description:
        "Triển khai hệ thống POS tích hợp cho chuỗi 50 cửa hàng bán lẻ.",
      projectManagerUserId: u.cto.id,
      clientId: clients["KH005"].id,
      contractId: contracts["HĐ-2022-003"].id,
      status: "COMPLETED",
      priority: "MEDIUM",
      healthStatus: "ON_TRACK",
      progressPercent: 100,
      startDate: d("2022-04-01"),
      endDate: d("2023-03-31"),
      actualEndDate: d("2023-03-25"),
      budgetAmount: 550000000,
      spentAmount: 498000000,
      contractValue: 500000000,
      invoicedAmount: 500000000,
      receivedAmount: 500000000,
      closedAt: d("2023-04-01"),
      closureNote:
        "Dự án hoàn thành đúng hạn, khách hàng nghiệm thu thành công.",
    },
    {
      projectCode: "PRJ-2025-001",
      projectName: "Fintech ABC - MVP Development",
      description:
        "Phát triển MVP ứng dụng thanh toán di động cho startup Fintech ABC.",
      projectManagerUserId: u.senior_dev.id,
      clientId: clients["KH004"].id,
      contractId: null,
      status: "PLANNING",
      priority: "HIGH",
      healthStatus: null,
      progressPercent: 0,
      startDate: d("2025-05-01"),
      endDate: d("2025-12-31"),
      budgetAmount: 800000000,
      spentAmount: 0,
    },
  ];

  const result = {};
  for (const p of projectsData) {
    result[p.projectCode] = await prisma.project.create({ data: p });
  }
  return result;
}

async function seedProjectAssignments(projects, u) {
  const assignments = [
    // PRJ-2024-001: Smart Warehouse
    {
      userId: u.senior_dev.id,
      projectId: projects["PRJ-2024-001"].id,
      role: "Tech Lead",
      allocation: 80,
      billable: true,
      joined: d("2024-03-01"),
    },
    {
      userId: u.dev1.id,
      projectId: projects["PRJ-2024-001"].id,
      role: "Backend Dev",
      allocation: 100,
      billable: true,
      joined: d("2024-03-01"),
    },
    {
      userId: u.dev2.id,
      projectId: projects["PRJ-2024-001"].id,
      role: "Frontend Dev",
      allocation: 100,
      billable: true,
      joined: d("2024-04-01"),
    },
    {
      userId: u.tester.id,
      projectId: projects["PRJ-2024-001"].id,
      role: "QA Engineer",
      allocation: 50,
      billable: true,
      joined: d("2024-03-15"),
    },
    {
      userId: u.ba_lead.id,
      projectId: projects["PRJ-2024-001"].id,
      role: "BA",
      allocation: 30,
      billable: false,
      joined: d("2024-03-01"),
    },
    // PRJ-2024-002: Construction ERP
    {
      userId: u.ba_lead.id,
      projectId: projects["PRJ-2024-002"].id,
      role: "Project Manager",
      allocation: 70,
      billable: true,
      joined: d("2024-05-01"),
    },
    {
      userId: u.ba1.id,
      projectId: projects["PRJ-2024-002"].id,
      role: "BA",
      allocation: 100,
      billable: true,
      joined: d("2024-05-01"),
    },
    {
      userId: u.dev2.id,
      projectId: projects["PRJ-2024-002"].id,
      role: "Senior Dev",
      allocation: 0,
      billable: true,
      joined: d("2024-07-01"),
    },
    {
      userId: u.junior_dev.id,
      projectId: projects["PRJ-2024-002"].id,
      role: "Junior Dev",
      allocation: 100,
      billable: true,
      joined: d("2024-02-01"),
    },
    // PRJ-2023-005: IT O&M
    {
      userId: u.devops.id,
      projectId: projects["PRJ-2023-005"].id,
      role: "DevOps Lead",
      allocation: 80,
      billable: true,
      joined: d("2023-07-01"),
    },
    {
      userId: u.tester.id,
      projectId: projects["PRJ-2023-005"].id,
      role: "Support Eng",
      allocation: 50,
      billable: true,
      joined: d("2023-07-01"),
    },
    // PRJ-2025-001: Fintech MVP
    {
      userId: u.senior_dev.id,
      projectId: projects["PRJ-2025-001"].id,
      role: "Tech Lead",
      allocation: 20,
      billable: false,
      joined: d("2025-04-01"),
    },
    {
      userId: u.ba1.id,
      projectId: projects["PRJ-2025-001"].id,
      role: "BA",
      allocation: 0,
      billable: false,
      joined: d("2025-04-01"),
    },
  ];

  for (const a of assignments) {
    try {
      await prisma.userProjectAssignment.create({
        data: {
          userId: a.userId,
          projectId: a.projectId,
          roleInProject: a.role,
          allocationPercent: a.allocation,
          isBillable: a.billable,
          joinedAt: a.joined,
          status: "ACTIVE",
        },
      });
    } catch (_) {}
  }
}

async function seedMilestones(projects, u) {
  const milestones = [
    // PRJ-2024-001
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "Kickoff & Requirements",
      ownerUserId: u.ba_lead.id,
      dueDate: d("2024-03-31"),
      status: "DONE",
      completedAt: d("2024-03-28"),
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "System Design & Architecture",
      ownerUserId: u.senior_dev.id,
      dueDate: d("2024-04-30"),
      status: "DONE",
      completedAt: d("2024-04-25"),
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "MVP Backend APIs",
      ownerUserId: u.dev1.id,
      dueDate: d("2024-07-31"),
      status: "DONE",
      completedAt: d("2024-07-30"),
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "Frontend Integration",
      ownerUserId: u.dev2.id,
      dueDate: d("2024-10-31"),
      status: "DONE",
      completedAt: d("2024-10-28"),
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "IoT Integration & Testing",
      ownerUserId: u.tester.id,
      dueDate: d("2025-02-28"),
      status: "IN_PROGRESS",
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "UAT & Deployment",
      ownerUserId: u.senior_dev.id,
      dueDate: d("2025-05-31"),
      status: "PENDING",
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      name: "Go-Live & Handover",
      ownerUserId: u.ba_lead.id,
      dueDate: d("2025-06-30"),
      status: "PENDING",
    },
    // PRJ-2024-002
    {
      projectId: projects["PRJ-2024-002"].id,
      name: "Business Analysis",
      ownerUserId: u.ba_lead.id,
      dueDate: d("2024-06-30"),
      status: "DONE",
      completedAt: d("2024-06-25"),
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      name: "Module Nhân sự",
      ownerUserId: u.dev2.id,
      dueDate: d("2024-09-30"),
      status: "DONE",
      completedAt: d("2024-10-10"),
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      name: "Module Tài chính",
      ownerUserId: u.ba1.id,
      dueDate: d("2024-12-31"),
      status: "IN_PROGRESS",
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      name: "Module Vật tư & Kho",
      ownerUserId: u.junior_dev.id,
      dueDate: d("2025-03-31"),
      status: "OVERDUE",
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      name: "Integration & Testing",
      ownerUserId: u.ba_lead.id,
      dueDate: d("2025-07-31"),
      status: "PENDING",
    },
    // PRJ-2023-005
    {
      projectId: projects["PRJ-2023-005"].id,
      name: "Q1 2025 SLA Review",
      ownerUserId: u.devops.id,
      dueDate: d("2025-03-31"),
      status: "DONE",
      completedAt: d("2025-03-28"),
    },
    {
      projectId: projects["PRJ-2023-005"].id,
      name: "H1 2025 Infrastructure Upgrade",
      ownerUserId: u.devops.id,
      dueDate: d("2025-06-30"),
      status: "IN_PROGRESS",
    },
  ];

  for (const m of milestones) {
    await prisma.projectMilestone.create({ data: m });
  }
}

async function seedProjectExpenses(projects, u) {
  const expenses = [
    {
      projectId: projects["PRJ-2024-001"].id,
      submittedByUserId: u.senior_dev.id,
      approvedByUserId: u.cto.id,
      category: "SOFTWARE",
      title: "License AWS IoT Platform",
      amount: 15000000,
      expenseDate: d("2024-08-01"),
      status: "APPROVED",
      approvedAt: d("2024-08-03"),
    },
    {
      projectId: projects["PRJ-2024-001"].id,
      submittedByUserId: u.dev1.id,
      approvedByUserId: null,
      category: "TRAVEL",
      title: "Vé máy bay Hà Nội - TP.HCM khảo sát kho",
      amount: 4500000,
      expenseDate: d("2024-09-10"),
      status: "PENDING",
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      submittedByUserId: u.ba_lead.id,
      approvedByUserId: u.fin_mgr.id,
      category: "TRAINING",
      title: "Đào tạo nghiệp vụ xây dựng cho team BA",
      amount: 8000000,
      expenseDate: d("2024-06-15"),
      status: "REIMBURSED",
      approvedAt: d("2024-06-16"),
    },
    {
      projectId: projects["PRJ-2024-002"].id,
      submittedByUserId: u.junior_dev.id,
      approvedByUserId: null,
      category: "HARDWARE",
      title: "Máy tính bảng để test UI mobile",
      amount: 12000000,
      expenseDate: d("2024-11-01"),
      status: "PENDING",
    },
    {
      projectId: projects["PRJ-2023-005"].id,
      submittedByUserId: u.devops.id,
      approvedByUserId: u.fin_mgr.id,
      category: "HARDWARE",
      title: "Thay thế thiết bị mạng datacenter",
      amount: 35000000,
      expenseDate: d("2025-01-15"),
      status: "APPROVED",
      approvedAt: d("2025-01-17"),
    },
  ];

  for (const e of expenses) {
    await prisma.projectExpense.create({ data: e });
  }
}

// ============================================================
//  13. INVOICES & PAYMENTS
// ============================================================
async function seedInvoices(clients, contracts, projects, u) {
  const invoicesData = [
    {
      invoiceCode: "INV-2024-001",
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      projectId: projects["PRJ-2024-001"].id,
      status: "PAID",
      issuedDate: d("2024-06-01"),
      dueDate: d("2024-06-30"),
      subtotal: 600000000,
      taxAmount: 60000000,
      totalAmount: 660000000,
      paidAmount: 660000000,
      outstandingAmount: 0,
      createdByUserId: u.sales_mgr.id,
      sentAt: d("2024-06-01"),
      notes: "Thanh toán đợt 1 – hoàn thành giai đoạn thiết kế",
    },
    {
      invoiceCode: "INV-2024-002",
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      projectId: projects["PRJ-2024-001"].id,
      status: "PAID",
      issuedDate: d("2024-11-01"),
      dueDate: d("2024-11-30"),
      subtotal: 490909090,
      taxAmount: 49090910,
      totalAmount: 540000000,
      paidAmount: 540000000,
      outstandingAmount: 0,
      createdByUserId: u.sales_mgr.id,
      sentAt: d("2024-11-01"),
      notes: "Thanh toán đợt 2 – hoàn thành MVP và frontend",
    },
    {
      invoiceCode: "INV-2025-001",
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      projectId: projects["PRJ-2024-001"].id,
      status: "SENT",
      issuedDate: d("2025-03-01"),
      dueDate: d("2025-03-31"),
      subtotal: 272727272,
      taxAmount: 27272728,
      totalAmount: 300000000,
      paidAmount: 0,
      outstandingAmount: 300000000,
      createdByUserId: u.sales_mgr.id,
      sentAt: d("2025-03-01"),
      notes: "Thanh toán đợt 3 – hoàn thành IoT Integration",
    },
    {
      invoiceCode: "INV-2024-003",
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      projectId: projects["PRJ-2024-002"].id,
      status: "PAID",
      issuedDate: d("2024-08-01"),
      dueDate: d("2024-08-31"),
      subtotal: 818181818,
      taxAmount: 81818182,
      totalAmount: 900000000,
      paidAmount: 900000000,
      outstandingAmount: 0,
      createdByUserId: u.sales1.id,
      sentAt: d("2024-08-01"),
    },
    {
      invoiceCode: "INV-2024-004",
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      projectId: projects["PRJ-2024-002"].id,
      status: "PARTIALLY_PAID",
      issuedDate: d("2025-01-01"),
      dueDate: d("2025-01-31"),
      subtotal: 818181818,
      taxAmount: 81818182,
      totalAmount: 900000000,
      paidAmount: 500000000,
      outstandingAmount: 400000000,
      createdByUserId: u.sales1.id,
      sentAt: d("2025-01-01"),
    },
    {
      invoiceCode: "INV-2024-005",
      clientId: clients["KH003"].id,
      contractId: contracts["HĐ-2023-005"].id,
      projectId: projects["PRJ-2023-005"].id,
      status: "PAID",
      issuedDate: d("2025-01-15"),
      dueDate: d("2025-02-15"),
      subtotal: 136363636,
      taxAmount: 13636364,
      totalAmount: 150000000,
      paidAmount: 150000000,
      outstandingAmount: 0,
      createdByUserId: u.sales_mgr.id,
      sentAt: d("2025-01-15"),
      notes: "Phí duy trì tháng 1/2025",
    },
    {
      invoiceCode: "INV-2025-002",
      clientId: clients["KH003"].id,
      contractId: contracts["HĐ-2023-005"].id,
      projectId: projects["PRJ-2023-005"].id,
      status: "OVERDUE",
      issuedDate: d("2025-02-15"),
      dueDate: d("2025-03-15"),
      subtotal: 136363636,
      taxAmount: 13636364,
      totalAmount: 150000000,
      paidAmount: 0,
      outstandingAmount: 150000000,
      createdByUserId: u.sales_mgr.id,
      sentAt: d("2025-02-15"),
      notes: "Phí duy trì tháng 2/2025 — CHƯA THANH TOÁN",
    },
    {
      invoiceCode: "INV-2025-003",
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      projectId: projects["PRJ-2024-002"].id,
      status: "DRAFT",
      issuedDate: d("2025-03-15"),
      dueDate: d("2025-04-15"),
      subtotal: 363636364,
      taxAmount: 36363636,
      totalAmount: 400000000,
      paidAmount: 0,
      outstandingAmount: 400000000,
      createdByUserId: u.accountant.id,
      notes: "Đợt thanh toán milestone Module Tài chính – nháp chờ gửi",
    },
  ];

  const result = {};
  for (const inv of invoicesData) {
    const created = await prisma.invoice.create({ data: inv });
    result[inv.invoiceCode] = created;

    // Thêm InvoiceItems
    const items = {
      "INV-2024-001": [
        {
          description:
            "Phí phát triển giai đoạn 1 - Backend APIs & Database Design",
          quantity: 1,
          unit: "gói",
          unitPrice: 350000000,
          taxRate: 0.1,
        },
        {
          description: "Phí phát triển giai đoạn 1 - UI/UX Design & Frontend",
          quantity: 1,
          unit: "gói",
          unitPrice: 200000000,
          taxRate: 0.1,
        },
        {
          description: "Phí quản lý dự án (PM)",
          quantity: 3,
          unit: "tháng",
          unitPrice: 16666666,
          taxRate: 0.1,
        },
      ],
      "INV-2025-001": [
        {
          description: "Phí tích hợp IoT Platform (AWS IoT Core)",
          quantity: 1,
          unit: "gói",
          unitPrice: 180000000,
          taxRate: 0.1,
        },
        {
          description: "Phí kiểm thử và UAT preparation",
          quantity: 2,
          unit: "tháng",
          unitPrice: 40000000,
          taxRate: 0.1,
        },
        {
          description: "Phí tài liệu kỹ thuật và hướng dẫn sử dụng",
          quantity: 1,
          unit: "bộ",
          unitPrice: 12727272,
          taxRate: 0.1,
        },
      ],
      "INV-2025-002": [
        {
          description: "Phí vận hành hệ thống tháng 2/2025 (O&M Monthly Fee)",
          quantity: 1,
          unit: "tháng",
          unitPrice: 136363636,
          taxRate: 0.1,
        },
      ],
    };

    for (const [order, item] of (items[inv.invoiceCode] || []).entries()) {
      const amount = item.quantity * item.unitPrice;
      const taxAmount = amount * item.taxRate;
      await prisma.invoiceItem.create({
        data: {
          invoiceId: created.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount,
          taxRate: item.taxRate,
          taxAmount,
          totalAmount: amount + taxAmount,
          displayOrder: order,
        },
      });
    }
  }

  return result;
}

async function seedClientPayments(clients, contracts, invoices, u) {
  const payments = [
    {
      paymentCode: "TT-2024-001",
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      invoiceId: invoices["INV-2024-001"].id,
      amount: 660000000,
      paymentDate: d("2024-06-25"),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "VCB24062500001",
      status: "COMPLETED",
      confirmedByUserId: u.accountant.id,
      confirmedAt: d("2024-06-26"),
      receivedBankName: "Vietcombank",
      receivedAccountNumber: "0011009876543",
    },
    {
      paymentCode: "TT-2024-002",
      clientId: clients["KH001"].id,
      contractId: contracts["HĐ-2024-001"].id,
      invoiceId: invoices["INV-2024-002"].id,
      amount: 540000000,
      paymentDate: d("2024-11-28"),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "VCB24112800002",
      status: "COMPLETED",
      confirmedByUserId: u.accountant.id,
      confirmedAt: d("2024-11-29"),
      receivedBankName: "Vietcombank",
      receivedAccountNumber: "0011009876543",
    },
    {
      paymentCode: "TT-2024-003",
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      invoiceId: invoices["INV-2024-003"].id,
      amount: 900000000,
      paymentDate: d("2024-08-28"),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "TCB24082800003",
      status: "COMPLETED",
      confirmedByUserId: u.fin_mgr.id,
      confirmedAt: d("2024-08-29"),
      receivedBankName: "Techcombank",
      receivedAccountNumber: "1900987654321",
    },
    {
      paymentCode: "TT-2025-001",
      clientId: clients["KH002"].id,
      contractId: contracts["HĐ-2024-002"].id,
      invoiceId: invoices["INV-2024-004"].id,
      amount: 500000000,
      paymentDate: d("2025-01-25"),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "TCB25012500004",
      status: "COMPLETED",
      confirmedByUserId: u.accountant.id,
      confirmedAt: d("2025-01-26"),
      receivedBankName: "Techcombank",
      receivedAccountNumber: "1900987654321",
    },
    {
      paymentCode: "TT-2025-002",
      clientId: clients["KH003"].id,
      contractId: contracts["HĐ-2023-005"].id,
      invoiceId: invoices["INV-2024-005"].id,
      amount: 150000000,
      paymentDate: d("2025-02-10"),
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: "BIDV25021000005",
      status: "COMPLETED",
      confirmedByUserId: u.accountant.id,
      confirmedAt: d("2025-02-11"),
      receivedBankName: "BIDV",
      receivedAccountNumber: "0001987654321",
    },
  ];

  for (const p of payments) {
    await prisma.clientPayment.create({
      data: { ...p, currency: "VND", exchangeRate: 1, amountInVnd: p.amount },
    });
  }
}

// ============================================================
//  14. PAYROLL
// ============================================================
async function seedPayroll(u, sc) {
  // Kỳ lương tháng 1/2025 — PAID
  const period1 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2025-01",
      month: 1,
      year: 2025,
      startDate: d("2025-01-01"),
      endDate: d("2025-01-31"),
      payDate: d("2025-02-05"),
      status: "PAID",
      workingDaysInPeriod: 23,
      standardWorkingMinutes: 510,
      approvedByUserId: u.ceo.id,
      approvedAt: d("2025-02-03"),
      paidAt: d("2025-02-05"),
    },
  });

  // Kỳ lương tháng 2/2025 — APPROVED
  const period2 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2025-02",
      month: 2,
      year: 2025,
      startDate: d("2025-02-01"),
      endDate: d("2025-02-28"),
      payDate: d("2025-03-05"),
      status: "APPROVED",
      workingDaysInPeriod: 20,
      standardWorkingMinutes: 510,
      approvedByUserId: u.ceo.id,
      approvedAt: d("2025-03-03"),
    },
  });

  // Kỳ lương tháng 3/2025 — CALCULATING (đang tính)
  const period3 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2025-03",
      month: 3,
      year: 2025,
      startDate: d("2025-03-01"),
      endDate: d("2025-03-31"),
      payDate: d("2025-04-05"),
      status: "CALCULATING",
      workingDaysInPeriod: 26,
      standardWorkingMinutes: 510,
    },
  });

  // Hàm tính lương đơn giản cho seed
  const calcPayroll = (
    base,
    allowances,
    workDays,
    totalDays,
    otMinutes,
    bonusAmt,
  ) => {
    const dailyRate = base / totalDays;
    const earnedBase = dailyRate * workDays;
    const totalAllowances = allowances;
    const otHourly = base / totalDays / 8; // hourly rate
    const otPay = (otMinutes / 60) * otHourly * 1.5;
    const totalBonus = bonusAmt;
    const gross = earnedBase + totalAllowances + otPay + totalBonus;
    // Bảo hiểm (tính trên lương cơ bản, tối đa 36tr)
    const insBase = Math.min(base, 36000000);
    const bhxh = insBase * 0.08;
    const bhyt = insBase * 0.015;
    const bhtn = insBase * 0.01;
    // Thuế TNCN (đơn giản hóa)
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
      dailyRate,
      grossSalary: gross,
      totalAllowances,
      totalBonus: totalBonus,
      totalOvertimePay: otPay,
      socialInsuranceEmployee: bhxh,
      healthInsuranceEmployee: bhyt,
      unemploymentInsuranceEmployee: bhtn,
      personalIncomeTax: tax > 0 ? tax : 0,
      taxableIncome: taxableIncome > 0 ? taxableIncome : 0,
      totalDeductions,
      netSalary: net,
    };
  };

  // Tạo payroll records cho tháng 1 (PAID) cho các nhân viên chính
  const staffPayrolls = [
    {
      user: u.ceo,
      base: 60000000,
      allowances: 6000000,
      workDays: 23,
      otMin: 0,
      bonus: 10000000,
    },
    {
      user: u.cto,
      base: 50000000,
      allowances: 4800000,
      workDays: 23,
      otMin: 0,
      bonus: 5000000,
    },
    {
      user: u.hr_mgr,
      base: 25000000,
      allowances: 3230000,
      workDays: 22,
      otMin: 0,
      bonus: 0,
    },
    {
      user: u.senior_dev,
      base: 35000000,
      allowances: 2230000,
      workDays: 23,
      otMin: 180,
      bonus: 3000000,
    },
    {
      user: u.dev1,
      base: 22000000,
      allowances: 1230000,
      workDays: 21,
      otMin: 120,
      bonus: 0,
    },
    {
      user: u.dev2,
      base: 20000000,
      allowances: 730000,
      workDays: 23,
      otMin: 0,
      bonus: 0,
    },
    {
      user: u.sales_mgr,
      base: 28000000,
      allowances: 5200000,
      workDays: 23,
      otMin: 0,
      bonus: 8000000,
    },
    {
      user: u.fin_mgr,
      base: 30000000,
      allowances: 3730000,
      workDays: 22,
      otMin: 0,
      bonus: 0,
    },
    {
      user: u.accountant,
      base: 16000000,
      allowances: 730000,
      workDays: 23,
      otMin: 0,
      bonus: 0,
    },
    {
      user: u.ba_lead,
      base: 25000000,
      allowances: 2230000,
      workDays: 22,
      otMin: 60,
      bonus: 0,
    },
    {
      user: u.devops,
      base: 28000000,
      allowances: 2230000,
      workDays: 23,
      otMin: 240,
      bonus: 0,
    },
    {
      user: u.tester,
      base: 18000000,
      allowances: 730000,
      workDays: 23,
      otMin: 90,
      bonus: 0,
    },
  ];

  for (const s of staffPayrolls) {
    const calc = calcPayroll(
      s.base,
      s.allowances,
      s.workDays,
      23,
      s.otMin,
      s.bonus,
    );
    const rec = await prisma.payrollRecord.create({
      data: {
        payrollPeriodId: period1.id,
        userId: s.user.id,
        baseSalary: s.base,
        workingDays: s.workDays,
        overtimeWeekdayMinutes: s.otMin,
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
        status: "PAID",
        dailyRate: calc.dailyRate,
        hourlyRate: calc.dailyRate / 8,
        generatedAt: d("2025-02-01"),
        approvedAt: d("2025-02-03"),
        paidAt: d("2025-02-05"),
        paymentRef: `VCB-2025-01-${s.user.userCode}`,
      },
    });

    // Items chi tiết
    const items = [
      {
        name: "Lương cơ bản",
        type: "EARNING",
        source: "BASE",
        amount: (s.base / 23) * s.workDays,
      },
      {
        name: "Tổng phụ cấp",
        type: "EARNING",
        source: "ALLOWANCE",
        amount: s.allowances,
      },
    ];
    if (calc.totalOvertimePay > 0)
      items.push({
        name: "Lương làm thêm giờ",
        type: "EARNING",
        source: "OVERTIME",
        amount: calc.totalOvertimePay,
        quantity: s.otMin / 60,
        unitRate: calc.dailyRate / 8,
      });
    if (s.bonus > 0)
      items.push({
        name: "Thưởng tháng 1",
        type: "EARNING",
        source: "BONUS",
        amount: s.bonus,
      });
    items.push({
      name: "BHXH (8%)",
      type: "DEDUCTION",
      source: "INSURANCE",
      amount: calc.socialInsuranceEmployee,
    });
    items.push({
      name: "BHYT (1.5%)",
      type: "DEDUCTION",
      source: "INSURANCE",
      amount: calc.healthInsuranceEmployee,
    });
    items.push({
      name: "BHTN (1%)",
      type: "DEDUCTION",
      source: "INSURANCE",
      amount: calc.unemploymentInsuranceEmployee,
    });
    if (calc.personalIncomeTax > 0)
      items.push({
        name: "Thuế TNCN",
        type: "DEDUCTION",
        source: "TAX",
        amount: calc.personalIncomeTax,
      });

    for (const item of items) {
      await prisma.payrollRecordItem.create({
        data: {
          payrollRecordId: rec.id,
          itemName: item.name,
          itemType: item.type,
          amount: item.amount,
          sourceType: item.source,
          quantity: item.quantity ?? null,
          unitRate: item.unitRate ?? null,
        },
      });
    }
  }

  // Điều chỉnh lương mẫu
  await prisma.payrollAdjustment.createMany({
    data: [
      {
        userId: u.senior_dev.id,
        payrollPeriodId: period2.id,
        adjustmentType: "BONUS",
        amount: 5000000,
        reason: "Thưởng hoàn thành milestone IoT sớm hạn",
        status: "APPROVED",
        createdByUserId: u.hr_mgr.id,
        approvedByUserId: u.ceo.id,
      },
      {
        userId: u.dev1.id,
        payrollPeriodId: period3.id,
        adjustmentType: "ADVANCE",
        amount: 5000000,
        reason: "Tạm ứng lương tháng 3",
        status: "APPLIED",
        isAdvance: true,
        createdByUserId: u.accountant.id,
        approvedByUserId: u.fin_mgr.id,
      },
      {
        userId: u.sales_mgr.id,
        payrollPeriodId: period2.id,
        adjustmentType: "BONUS",
        amount: 15000000,
        reason: "Hoa hồng ký hợp đồng mới Q1/2025",
        status: "APPROVED",
        createdByUserId: u.hr_mgr.id,
        approvedByUserId: u.ceo.id,
      },
      {
        userId: u.junior_dev.id,
        payrollPeriodId: period3.id,
        adjustmentType: "DEDUCTION",
        amount: 500000,
        reason: "Khấu trừ đi muộn 3 ngày tháng 3",
        status: "PENDING",
        createdByUserId: u.hr_mgr.id,
      },
    ],
  });
}

// ============================================================
//  15. NOTIFICATIONS
// ============================================================
async function seedNotifications(u) {
  const notifications = [
    // Check-in pending → HR nhận
    {
      recipientUserId: u.hr_mgr.id,
      senderUserId: u.dev1.id,
      type: "ATTENDANCE_CHECKIN_REQUEST",
      title: "Yêu cầu check-in mới",
      message: "Võ Thị Hương gửi yêu cầu check-in lúc 08:12 ngày hôm nay.",
      relatedEntityType: "ATTENDANCE_REQUEST",
      isRead: false,
    },
    {
      recipientUserId: u.hr_staff.id,
      senderUserId: u.dev2.id,
      type: "ATTENDANCE_CHECKIN_REQUEST",
      title: "Yêu cầu check-in mới",
      message: "Bùi Văn Ích gửi yêu cầu check-in lúc 08:05 ngày hôm nay.",
      relatedEntityType: "ATTENDANCE_REQUEST",
      isRead: false,
    },
    {
      recipientUserId: u.hr_mgr.id,
      senderUserId: u.ba1.id,
      type: "ATTENDANCE_CHECKIN_REQUEST",
      title: "Yêu cầu check-in mới",
      message: "Nguyễn Thị Oanh gửi yêu cầu check-in lúc 09:01 ngày hôm nay.",
      relatedEntityType: "ATTENDANCE_REQUEST",
      isRead: false,
    },
    // Check-out pending → HR nhận
    {
      recipientUserId: u.hr_mgr.id,
      senderUserId: u.devops.id,
      type: "ATTENDANCE_CHECKOUT_REQUEST",
      title: "Yêu cầu check-out mới",
      message: "Nguyễn Văn Long gửi yêu cầu check-out lúc 17:35.",
      relatedEntityType: "ATTENDANCE_REQUEST",
      isRead: false,
    },
    // Leave pending → Manager nhận
    {
      recipientUserId: u.senior_dev.id,
      senderUserId: u.dev2.id,
      type: "LEAVE_REQUEST_CREATED",
      title: "Đơn nghỉ phép mới chờ duyệt",
      message:
        "Bùi Văn Ích xin nghỉ phép 3 ngày (07–09/04/2025) cần bạn duyệt bước 1.",
      relatedEntityType: "LEAVE_REQUEST",
      isRead: false,
    },
    {
      recipientUserId: u.hr_mgr.id,
      senderUserId: u.ba1.id,
      type: "LEAVE_REQUEST_CREATED",
      title: "Đơn nghỉ phép chờ HR duyệt",
      message:
        "Nguyễn Thị Oanh xin nghỉ phép 2 ngày (14–15/04/2025), Manager đã duyệt bước 1.",
      relatedEntityType: "LEAVE_REQUEST",
      isRead: false,
    },
    // Leave result → nhân viên nhận
    {
      recipientUserId: u.dev1.id,
      senderUserId: u.hr_mgr.id,
      type: "LEAVE_REQUEST_APPROVED",
      title: "Đơn nghỉ phép được duyệt",
      message: "Đơn nghỉ phép của bạn từ 10–12/02/2025 đã được phê duyệt.",
      isRead: true,
      readAt: d("2025-02-07"),
    },
    {
      recipientUserId: u.tester.id,
      senderUserId: u.senior_dev.id,
      type: "LEAVE_REQUEST_REJECTED",
      title: "Đơn nghỉ phép bị từ chối",
      message:
        "Đơn nghỉ phép của bạn (15–16/03/2025) bị từ chối. Lý do: Đang cao điểm release.",
      isRead: true,
      readAt: d("2025-03-12"),
    },
    // OT
    {
      recipientUserId: u.tester.id,
      senderUserId: u.hr_mgr.id,
      type: "OVERTIME_REQUEST_CREATED",
      title: "Yêu cầu OT chờ duyệt",
      message: "Đỗ Văn Kiên đăng ký làm thêm 2.5 giờ ngày 05/04/2025.",
      isRead: false,
    },
    {
      recipientUserId: u.senior_dev.id,
      senderUserId: u.cto.id,
      type: "OVERTIME_APPROVED",
      title: "Yêu cầu OT được duyệt",
      message: "OT ngày 14/03/2025 (18:00–21:00) của bạn đã được phê duyệt.",
      isRead: true,
      readAt: d("2025-03-13"),
    },
    // Payslip
    {
      recipientUserId: u.dev1.id,
      senderUserId: u.admin.id,
      type: "PAYSLIP_AVAILABLE",
      title: "Bảng lương tháng 1/2025 đã sẵn sàng",
      message:
        "Bảng lương tháng 01/2025 của bạn đã được xử lý. Lương NET: 16.842.000 ₫",
      isRead: true,
      readAt: d("2025-02-05"),
    },
    {
      recipientUserId: u.senior_dev.id,
      senderUserId: u.admin.id,
      type: "PAYSLIP_AVAILABLE",
      title: "Bảng lương tháng 1/2025 đã sẵn sàng",
      message:
        "Bảng lương tháng 01/2025 của bạn đã được xử lý. Tiền thưởng: 3.000.000 ₫",
      isRead: false,
    },
    // Contract/Invoice
    {
      recipientUserId: u.ceo.id,
      senderUserId: u.sales_mgr.id,
      type: "CONTRACT_EXPIRING_SOON",
      title: "Hợp đồng sắp hết hạn",
      message:
        "HĐ-2023-005 (Sở TT&TT HCM) sẽ hết hạn vào ngày 30/06/2025 — còn 90 ngày.",
      isRead: false,
    },
    {
      recipientUserId: u.fin_mgr.id,
      senderUserId: u.sales_mgr.id,
      type: "INVOICE_OVERDUE",
      title: "Hóa đơn quá hạn thanh toán",
      message:
        "INV-2025-002 (Sở TT&TT HCM – 150.000.000 ₫) đã quá hạn từ 15/03/2025.",
      isRead: false,
    },
    {
      recipientUserId: u.accountant.id,
      senderUserId: u.sales_mgr.id,
      type: "INVOICE_OVERDUE",
      title: "Hóa đơn quá hạn thanh toán",
      message:
        "INV-2025-002 (Sở TT&TT HCM – 150.000.000 ₫) đã quá hạn từ 15/03/2025.",
      isRead: false,
    },
    // Project
    {
      recipientUserId: u.junior_dev.id,
      senderUserId: u.ba_lead.id,
      type: "MILESTONE_DUE_SOON",
      title: "Milestone sắp đến hạn",
      message:
        'Milestone "Module Vật tư & Kho" của dự án Construction ERP đã quá hạn (31/03/2025).',
      isRead: false,
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }
}

// ============================================================
main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
