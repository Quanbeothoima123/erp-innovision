/**
 * seed.js — Innovision ERP
 * Chạy: node seed.js   (cần cài: npm i @prisma/client bcryptjs)
 * Hoặc: npx prisma db seed  (nếu đã cấu hình trong package.json)
 *
 * Password mặc định tất cả user: Innovision@2025
 */

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

// ─── Helper ──────────────────────────────────────────────────────────────────

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

const DEFAULT_PASSWORD = "Innovision@2025";

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Bắt đầu seed dữ liệu Innovision ERP...\n");

  // ── 0. Cleanup (đúng thứ tự FK) ──────────────────────────────────────────
  console.log("🧹 Xoá dữ liệu cũ...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.clientPayment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contractAmendment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.clientDocument.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.client.deleteMany();
  await prisma.payrollAdjustment.deleteMany();
  await prisma.payrollRecordItem.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.userSalaryComponent.deleteMany();
  await prisma.salaryComponent.deleteMany();
  await prisma.userCompensation.deleteMany();
  await prisma.taxBracket.deleteMany();
  await prisma.taxPolicy.deleteMany();
  await prisma.projectExpense.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.userProjectAssignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceRequest.deleteMany();
  await prisma.userWorkShift.deleteMany();
  await prisma.workShift.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.leaveRequestApproval.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.systemConfig.deleteMany();

  // Clear self-referencing fields before deleting users/departments
  await prisma.user.updateMany({
    data: { managerId: null, createdByUserId: null },
  });
  await prisma.department.updateMany({ data: { headUserId: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.jobTitle.deleteMany();
  await prisma.role.deleteMany();

  console.log("✅ Đã xoá dữ liệu cũ.\n");

  // ── 1. ROLES ─────────────────────────────────────────────────────────────
  console.log("🎭 Tạo Roles...");
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        code: "ADMIN",
        name: "Quản trị hệ thống",
        description: "Toàn quyền quản trị hệ thống ERP",
      },
    }),
    prisma.role.create({
      data: {
        code: "DIRECTOR",
        name: "Giám đốc",
        description: "Ban lãnh đạo cấp cao",
      },
    }),
    prisma.role.create({
      data: {
        code: "MANAGER",
        name: "Trưởng phòng",
        description: "Quản lý phòng ban, duyệt đơn từ",
      },
    }),
    prisma.role.create({
      data: {
        code: "HR",
        name: "Nhân sự",
        description: "Quản lý nhân sự, chấm công, lương",
      },
    }),
    prisma.role.create({
      data: {
        code: "ACCOUNTANT",
        name: "Kế toán",
        description: "Quản lý tài chính, hóa đơn, thanh toán",
      },
    }),
    prisma.role.create({
      data: {
        code: "SALES",
        name: "Kinh doanh",
        description: "Quản lý khách hàng, hợp đồng",
      },
    }),
    prisma.role.create({
      data: {
        code: "EMPLOYEE",
        name: "Nhân viên",
        description: "Nhân viên thông thường",
      },
    }),
  ]);

  const roleMap = Object.fromEntries(roles.map((r) => [r.code, r]));
  console.log(`   → Đã tạo ${roles.length} roles\n`);

  // ── 2. DEPARTMENTS (chưa có head) ────────────────────────────────────────
  console.log("🏢 Tạo Departments...");
  const deptBGD = await prisma.department.create({
    data: {
      name: "Ban Giám Đốc",
      description: "Hội đồng lãnh đạo và điều hành công ty",
    },
  });
  const deptTech = await prisma.department.create({
    data: {
      name: "Phòng Kỹ Thuật",
      description: "Phát triển phần mềm và hạ tầng kỹ thuật",
    },
  });
  const deptHR = await prisma.department.create({
    data: {
      name: "Phòng Nhân Sự",
      description: "Tuyển dụng, đào tạo, chính sách nhân sự",
    },
  });
  const deptAcc = await prisma.department.create({
    data: {
      name: "Phòng Kế Toán",
      description: "Tài chính, kế toán, thuế và báo cáo",
    },
  });
  const deptSales = await prisma.department.create({
    data: {
      name: "Phòng Kinh Doanh",
      description: "Phát triển thị trường và quản lý khách hàng",
    },
  });
  const deptMkt = await prisma.department.create({
    data: {
      name: "Phòng Marketing",
      description: "Truyền thông, thương hiệu và digital marketing",
    },
  });
  console.log("   → Đã tạo 6 phòng ban\n");

  // ── 3. JOB TITLES ────────────────────────────────────────────────────────
  console.log("💼 Tạo Job Titles...");
  const jtCEO = await prisma.jobTitle.create({
    data: {
      code: "CEO",
      name: "Giám Đốc Điều Hành",
      description: "Chief Executive Officer",
    },
  });
  const jtCTO = await prisma.jobTitle.create({
    data: {
      code: "CTO",
      name: "Giám Đốc Kỹ Thuật",
      description: "Chief Technology Officer",
    },
  });
  const jtCFO = await prisma.jobTitle.create({
    data: {
      code: "CFO",
      name: "Giám Đốc Tài Chính",
      description: "Chief Financial Officer",
    },
  });
  const jtHRMgr = await prisma.jobTitle.create({
    data: {
      code: "HR_MGR",
      name: "Trưởng Phòng Nhân Sự",
      description: "HR Manager",
    },
  });
  const jtSalMgr = await prisma.jobTitle.create({
    data: {
      code: "SAL_MGR",
      name: "Trưởng Phòng Kinh Doanh",
      description: "Sales Manager",
    },
  });
  const jtMktMgr = await prisma.jobTitle.create({
    data: {
      code: "MKT_MGR",
      name: "Trưởng Phòng Marketing",
      description: "Marketing Manager",
    },
  });
  const jtSrDev = await prisma.jobTitle.create({
    data: {
      code: "SR_DEV",
      name: "Lập Trình Viên Senior",
      description: "Senior Software Engineer",
    },
  });
  const jtDev = await prisma.jobTitle.create({
    data: {
      code: "DEV",
      name: "Lập Trình Viên",
      description: "Software Engineer",
    },
  });
  const jtDevOps = await prisma.jobTitle.create({
    data: {
      code: "DEVOPS",
      name: "Kỹ Sư DevOps",
      description: "DevOps Engineer",
    },
  });
  const jtHRStaff = await prisma.jobTitle.create({
    data: {
      code: "HR_STF",
      name: "Chuyên Viên Nhân Sự",
      description: "HR Specialist",
    },
  });
  const jtAccStaff = await prisma.jobTitle.create({
    data: { code: "ACC_STF", name: "Kế Toán Viên", description: "Accountant" },
  });
  const jtSalEx = await prisma.jobTitle.create({
    data: {
      code: "SAL_EX",
      name: "Chuyên Viên Kinh Doanh",
      description: "Sales Executive",
    },
  });
  const jtMktEx = await prisma.jobTitle.create({
    data: {
      code: "MKT_EX",
      name: "Chuyên Viên Marketing",
      description: "Marketing Specialist",
    },
  });
  const jtBA = await prisma.jobTitle.create({
    data: {
      code: "BA",
      name: "Phân Tích Nghiệp Vụ",
      description: "Business Analyst",
    },
  });
  console.log("   → Đã tạo 14 chức danh\n");

  // ── 4. USERS ─────────────────────────────────────────────────────────────
  console.log("👤 Tạo Users...");
  const pw = await hash(DEFAULT_PASSWORD);

  // --- CEO / Admin
  const uCEO = await prisma.user.create({
    data: {
      userCode: "EMP001",
      email: "nguyen.van.an@innovision.vn",
      passwordHash: pw,
      fullName: "Nguyễn Văn An",
      phoneNumber: "0901234567",
      departmentId: deptBGD.id,
      jobTitleId: jtCEO.id,
      hireDate: new Date("2018-01-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- CTO
  const uCTO = await prisma.user.create({
    data: {
      userCode: "EMP002",
      email: "le.van.cuong@innovision.vn",
      passwordHash: pw,
      fullName: "Lê Văn Cường",
      phoneNumber: "0912345678",
      departmentId: deptTech.id,
      jobTitleId: jtCTO.id,
      managerId: uCEO.id,
      hireDate: new Date("2018-03-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- HR Manager
  const uHRMgr = await prisma.user.create({
    data: {
      userCode: "EMP003",
      email: "tran.thi.binh@innovision.vn",
      passwordHash: pw,
      fullName: "Trần Thị Bình",
      phoneNumber: "0923456789",
      departmentId: deptHR.id,
      jobTitleId: jtHRMgr.id,
      managerId: uCEO.id,
      hireDate: new Date("2018-06-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- CFO / Kế Toán Trưởng
  const uCFO = await prisma.user.create({
    data: {
      userCode: "EMP004",
      email: "pham.thi.dung@innovision.vn",
      passwordHash: pw,
      fullName: "Phạm Thị Dung",
      phoneNumber: "0934567890",
      departmentId: deptAcc.id,
      jobTitleId: jtCFO.id,
      managerId: uCEO.id,
      hireDate: new Date("2019-01-10"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Sales Manager
  const uSalMgr = await prisma.user.create({
    data: {
      userCode: "EMP005",
      email: "hoang.van.em@innovision.vn",
      passwordHash: pw,
      fullName: "Hoàng Văn Em",
      phoneNumber: "0945678901",
      departmentId: deptSales.id,
      jobTitleId: jtSalMgr.id,
      managerId: uCEO.id,
      hireDate: new Date("2019-03-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Marketing Manager
  const uMktMgr = await prisma.user.create({
    data: {
      userCode: "EMP006",
      email: "to.thi.oanh@innovision.vn",
      passwordHash: pw,
      fullName: "Tô Thị Oanh",
      phoneNumber: "0956789012",
      departmentId: deptMkt.id,
      jobTitleId: jtMktMgr.id,
      managerId: uCEO.id,
      hireDate: new Date("2019-07-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Senior Developer
  const uSrDev1 = await prisma.user.create({
    data: {
      userCode: "EMP007",
      email: "ngo.thi.phuong@innovision.vn",
      passwordHash: pw,
      fullName: "Ngô Thị Phương",
      phoneNumber: "0967890123",
      departmentId: deptTech.id,
      jobTitleId: jtSrDev.id,
      managerId: uCTO.id,
      hireDate: new Date("2019-09-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Backend Developer
  const uDev1 = await prisma.user.create({
    data: {
      userCode: "EMP008",
      email: "dinh.van.giang@innovision.vn",
      passwordHash: pw,
      fullName: "Đinh Văn Giang",
      phoneNumber: "0978901234",
      departmentId: deptTech.id,
      jobTitleId: jtDev.id,
      managerId: uCTO.id,
      hireDate: new Date("2020-02-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Frontend Developer
  const uDev2 = await prisma.user.create({
    data: {
      userCode: "EMP009",
      email: "ly.van.long@innovision.vn",
      passwordHash: pw,
      fullName: "Lý Văn Long",
      phoneNumber: "0989012345",
      departmentId: deptTech.id,
      jobTitleId: jtDev.id,
      managerId: uSrDev1.id,
      hireDate: new Date("2020-06-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- DevOps
  const uDevOps = await prisma.user.create({
    data: {
      userCode: "EMP010",
      email: "phan.van.nam@innovision.vn",
      passwordHash: pw,
      fullName: "Phan Văn Nam",
      phoneNumber: "0990123456",
      departmentId: deptTech.id,
      jobTitleId: jtDevOps.id,
      managerId: uCTO.id,
      hireDate: new Date("2020-08-10"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- HR Staff
  const uHRStaff = await prisma.user.create({
    data: {
      userCode: "EMP011",
      email: "vu.thi.hoa@innovision.vn",
      passwordHash: pw,
      fullName: "Vũ Thị Hoa",
      phoneNumber: "0901122334",
      departmentId: deptHR.id,
      jobTitleId: jtHRStaff.id,
      managerId: uHRMgr.id,
      hireDate: new Date("2020-11-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Accountant
  const uAcc = await prisma.user.create({
    data: {
      userCode: "EMP012",
      email: "do.thi.kim@innovision.vn",
      passwordHash: pw,
      fullName: "Đỗ Thị Kim",
      phoneNumber: "0912233445",
      departmentId: deptAcc.id,
      jobTitleId: jtAccStaff.id,
      managerId: uCFO.id,
      hireDate: new Date("2021-01-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Sales Executive 1
  const uSales1 = await prisma.user.create({
    data: {
      userCode: "EMP013",
      email: "bui.van.inh@innovision.vn",
      passwordHash: pw,
      fullName: "Bùi Văn Ính",
      phoneNumber: "0923344556",
      departmentId: deptSales.id,
      jobTitleId: jtSalEx.id,
      managerId: uSalMgr.id,
      hireDate: new Date("2021-04-01"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Sales Executive 2
  const uSales2 = await prisma.user.create({
    data: {
      userCode: "EMP014",
      email: "mai.thi.minh@innovision.vn",
      passwordHash: pw,
      fullName: "Mai Thị Minh",
      phoneNumber: "0934455667",
      departmentId: deptSales.id,
      jobTitleId: jtSalEx.id,
      managerId: uSalMgr.id,
      hireDate: new Date("2021-07-15"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Marketing Staff
  const uMkt = await prisma.user.create({
    data: {
      userCode: "EMP015",
      email: "cao.van.phong@innovision.vn",
      passwordHash: pw,
      fullName: "Cao Văn Phong",
      phoneNumber: "0945566778",
      departmentId: deptMkt.id,
      jobTitleId: jtMktEx.id,
      managerId: uMktMgr.id,
      hireDate: new Date("2022-01-10"),
      employmentStatus: "ACTIVE",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- BA (đang thử việc)
  const uBA = await prisma.user.create({
    data: {
      userCode: "EMP016",
      email: "nguyen.thi.quynh@innovision.vn",
      passwordHash: pw,
      fullName: "Nguyễn Thị Quỳnh",
      phoneNumber: "0956677889",
      departmentId: deptTech.id,
      jobTitleId: jtBA.id,
      managerId: uCTO.id,
      hireDate: new Date("2025-10-15"),
      employmentStatus: "PROBATION",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });

  // --- Nhân viên mới (chưa kích hoạt)
  const uNew = await prisma.user.create({
    data: {
      userCode: "EMP017",
      email: "tran.van.son@innovision.vn",
      fullName: "Trần Văn Sơn",
      phoneNumber: "0967788990",
      departmentId: deptTech.id,
      jobTitleId: jtDev.id,
      managerId: uCTO.id,
      hireDate: new Date("2026-03-01"),
      employmentStatus: "PROBATION",
      accountStatus: "PENDING",
      mustChangePassword: true,
    },
  });

  const allUsers = [
    uCEO,
    uCTO,
    uHRMgr,
    uCFO,
    uSalMgr,
    uMktMgr,
    uSrDev1,
    uDev1,
    uDev2,
    uDevOps,
    uHRStaff,
    uAcc,
    uSales1,
    uSales2,
    uMkt,
    uBA,
    uNew,
  ];
  console.log(`   → Đã tạo ${allUsers.length} users\n`);

  // ── 5. Cập nhật Department heads ─────────────────────────────────────────
  console.log("🏢 Gán trưởng phòng...");
  await prisma.department.update({
    where: { id: deptBGD.id },
    data: { headUserId: uCEO.id },
  });
  await prisma.department.update({
    where: { id: deptTech.id },
    data: { headUserId: uCTO.id },
  });
  await prisma.department.update({
    where: { id: deptHR.id },
    data: { headUserId: uHRMgr.id },
  });
  await prisma.department.update({
    where: { id: deptAcc.id },
    data: { headUserId: uCFO.id },
  });
  await prisma.department.update({
    where: { id: deptSales.id },
    data: { headUserId: uSalMgr.id },
  });
  await prisma.department.update({
    where: { id: deptMkt.id },
    data: { headUserId: uMktMgr.id },
  });
  console.log("   → Đã gán trưởng phòng\n");

  // ── 6. USER ROLES ─────────────────────────────────────────────────────────
  console.log("🎭 Gán Roles cho Users...");
  const userRoleData = [
    // CEO: ADMIN + DIRECTOR + MANAGER
    { userId: uCEO.id, roleId: roleMap.ADMIN.id },
    { userId: uCEO.id, roleId: roleMap.DIRECTOR.id },
    { userId: uCEO.id, roleId: roleMap.MANAGER.id },
    // CTO: MANAGER + EMPLOYEE
    { userId: uCTO.id, roleId: roleMap.MANAGER.id },
    { userId: uCTO.id, roleId: roleMap.EMPLOYEE.id },
    // HR Manager: HR + MANAGER
    { userId: uHRMgr.id, roleId: roleMap.HR.id },
    { userId: uHRMgr.id, roleId: roleMap.MANAGER.id },
    // CFO: ACCOUNTANT + MANAGER + DIRECTOR
    { userId: uCFO.id, roleId: roleMap.ACCOUNTANT.id },
    { userId: uCFO.id, roleId: roleMap.MANAGER.id },
    { userId: uCFO.id, roleId: roleMap.DIRECTOR.id },
    // Sales Manager: SALES + MANAGER
    { userId: uSalMgr.id, roleId: roleMap.SALES.id },
    { userId: uSalMgr.id, roleId: roleMap.MANAGER.id },
    // Marketing Manager: MANAGER + EMPLOYEE
    { userId: uMktMgr.id, roleId: roleMap.MANAGER.id },
    { userId: uMktMgr.id, roleId: roleMap.EMPLOYEE.id },
    // Senior Dev
    { userId: uSrDev1.id, roleId: roleMap.MANAGER.id },
    { userId: uSrDev1.id, roleId: roleMap.EMPLOYEE.id },
    // Dev 1, Dev 2, DevOps
    { userId: uDev1.id, roleId: roleMap.EMPLOYEE.id },
    { userId: uDev2.id, roleId: roleMap.EMPLOYEE.id },
    { userId: uDevOps.id, roleId: roleMap.EMPLOYEE.id },
    // HR Staff: HR
    { userId: uHRStaff.id, roleId: roleMap.HR.id },
    { userId: uHRStaff.id, roleId: roleMap.EMPLOYEE.id },
    // Accountant: ACCOUNTANT
    { userId: uAcc.id, roleId: roleMap.ACCOUNTANT.id },
    { userId: uAcc.id, roleId: roleMap.EMPLOYEE.id },
    // Sales 1, 2: SALES
    { userId: uSales1.id, roleId: roleMap.SALES.id },
    { userId: uSales1.id, roleId: roleMap.EMPLOYEE.id },
    { userId: uSales2.id, roleId: roleMap.SALES.id },
    { userId: uSales2.id, roleId: roleMap.EMPLOYEE.id },
    // Marketing
    { userId: uMkt.id, roleId: roleMap.EMPLOYEE.id },
    // BA, New
    { userId: uBA.id, roleId: roleMap.EMPLOYEE.id },
    { userId: uNew.id, roleId: roleMap.EMPLOYEE.id },
  ];
  await prisma.userRole.createMany({ data: userRoleData });
  console.log(`   → Đã gán ${userRoleData.length} user-role pairs\n`);

  // ── 7. USER PROFILES ─────────────────────────────────────────────────────
  console.log("📋 Tạo UserProfiles...");
  const profilesData = [
    {
      userId: uCEO.id,
      dateOfBirth: new Date("1982-04-10"),
      gender: "MALE",
      placeOfBirth: "Hà Nội",
      permanentAddress: "15 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      currentAddress: "15 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "001082012345",
      nationalIdIssueDate: new Date("2015-06-01"),
      nationalIdIssuePlace: "CA TP Hà Nội",
      taxCode: "0100001001",
      socialInsuranceNumber: "0100001001",
      bankName: "Vietcombank",
      bankBranch: "Chi Nhánh Hà Nội",
      bankAccountNumber: "1014789632",
      bankAccountHolder: "NGUYEN VAN AN",
      emergencyContactName: "Nguyễn Thị Lan",
      emergencyContactPhone: "0901111222",
      emergencyContactRel: "Vợ",
      dependantCount: 2,
      educationLevel: "Thạc sĩ",
      educationMajor: "Quản trị Kinh doanh",
      university: "Đại học Kinh tế Quốc dân",
    },
    {
      userId: uCTO.id,
      dateOfBirth: new Date("1985-07-22"),
      gender: "MALE",
      placeOfBirth: "Hồ Chí Minh",
      permanentAddress: "88 Lê Lợi, Q1, TP.HCM",
      currentAddress: "12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "079085012345",
      taxCode: "0100002002",
      socialInsuranceNumber: "0100002002",
      bankName: "Techcombank",
      bankBranch: "Chi Nhánh Cầu Giấy",
      bankAccountNumber: "1903789456",
      bankAccountHolder: "LE VAN CUONG",
      emergencyContactName: "Lê Thị Nga",
      emergencyContactPhone: "0912222333",
      emergencyContactRel: "Vợ",
      dependantCount: 1,
      educationLevel: "Thạc sĩ",
      educationMajor: "Khoa học Máy tính",
      university: "Đại học Bách Khoa Hà Nội",
    },
    {
      userId: uHRMgr.id,
      dateOfBirth: new Date("1988-11-05"),
      gender: "FEMALE",
      placeOfBirth: "Hà Nội",
      permanentAddress: "56 Kim Mã, Ba Đình, Hà Nội",
      currentAddress: "56 Kim Mã, Ba Đình, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "001088045678",
      taxCode: "0100003003",
      socialInsuranceNumber: "0100003003",
      bankName: "BIDV",
      bankBranch: "Chi Nhánh Hà Nội",
      bankAccountNumber: "3101789123",
      bankAccountHolder: "TRAN THI BINH",
      emergencyContactName: "Trần Văn Bình",
      emergencyContactPhone: "0923333444",
      emergencyContactRel: "Anh trai",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Quản trị Nhân lực",
      university: "Đại học Lao Động Xã Hội",
    },
    {
      userId: uCFO.id,
      dateOfBirth: new Date("1983-03-18"),
      gender: "FEMALE",
      placeOfBirth: "Hải Phòng",
      permanentAddress: "23 Lạch Tray, Lê Chân, Hải Phòng",
      currentAddress: "99 Đội Cấn, Ba Đình, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "031083078901",
      taxCode: "0100004004",
      socialInsuranceNumber: "0100004004",
      bankName: "MB Bank",
      bankBranch: "Chi Nhánh Ba Đình",
      bankAccountNumber: "0978456789",
      bankAccountHolder: "PHAM THI DUNG",
      emergencyContactName: "Phạm Văn Dũng",
      emergencyContactPhone: "0934444555",
      emergencyContactRel: "Chồng",
      dependantCount: 2,
      educationLevel: "Thạc sĩ",
      educationMajor: "Kế toán Kiểm toán",
      university: "Học viện Tài chính",
    },
    {
      userId: uSalMgr.id,
      dateOfBirth: new Date("1986-09-30"),
      gender: "MALE",
      placeOfBirth: "Đà Nẵng",
      permanentAddress: "45 Trần Phú, Hải Châu, Đà Nẵng",
      currentAddress: "78 Nguyễn Chí Thanh, Đống Đa, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "048086091234",
      taxCode: "0100005005",
      socialInsuranceNumber: "0100005005",
      bankName: "Vietinbank",
      bankBranch: "Chi Nhánh Đống Đa",
      bankAccountNumber: "1126789012",
      bankAccountHolder: "HOANG VAN EM",
      emergencyContactName: "Hoàng Thị Hương",
      emergencyContactPhone: "0945555666",
      emergencyContactRel: "Vợ",
      dependantCount: 1,
      educationLevel: "Đại học",
      educationMajor: "Kinh doanh Quốc tế",
      university: "Đại học Ngoại Thương",
    },
    {
      userId: uSrDev1.id,
      dateOfBirth: new Date("1990-12-15"),
      gender: "FEMALE",
      placeOfBirth: "Hà Nội",
      permanentAddress: "11 Trung Hòa, Cầu Giấy, Hà Nội",
      currentAddress: "11 Trung Hòa, Cầu Giấy, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "001090112222",
      taxCode: "0100007007",
      socialInsuranceNumber: "0100007007",
      bankName: "ACB",
      bankBranch: "Chi Nhánh Cầu Giấy",
      bankAccountNumber: "789012345",
      bankAccountHolder: "NGO THI PHUONG",
      emergencyContactName: "Ngô Văn Phú",
      emergencyContactPhone: "0967777888",
      emergencyContactRel: "Bố",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Công nghệ Thông tin",
      university: "Đại học Công nghệ - ĐHQGHN",
    },
    {
      userId: uDev1.id,
      dateOfBirth: new Date("1993-05-20"),
      gender: "MALE",
      placeOfBirth: "Nghệ An",
      permanentAddress: "33 Quang Trung, TP Vinh, Nghệ An",
      currentAddress: "25 Lê Văn Lương, Thanh Xuân, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "038093056789",
      taxCode: "0100008008",
      socialInsuranceNumber: "0100008008",
      bankName: "Sacombank",
      bankBranch: "Chi Nhánh Hà Nội",
      bankAccountNumber: "060145678901",
      bankAccountHolder: "DINH VAN GIANG",
      emergencyContactName: "Đinh Thị Giang",
      emergencyContactPhone: "0978888999",
      emergencyContactRel: "Mẹ",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Kỹ thuật Phần mềm",
      university: "Đại học Bách Khoa Hà Nội",
    },
    {
      userId: uHRStaff.id,
      dateOfBirth: new Date("1995-08-25"),
      gender: "FEMALE",
      placeOfBirth: "Hà Nội",
      permanentAddress: "7 Láng Hạ, Đống Đa, Hà Nội",
      currentAddress: "7 Láng Hạ, Đống Đa, Hà Nội",
      city: "Hà Nội",
      province: "Hà Nội",
      nationalIdNumber: "001095089012",
      taxCode: "0100011011",
      socialInsuranceNumber: "0100011011",
      bankName: "VPBank",
      bankBranch: "Chi Nhánh Đống Đa",
      bankAccountNumber: "214789456",
      bankAccountHolder: "VU THI HOA",
      emergencyContactName: "Vũ Văn Hùng",
      emergencyContactPhone: "0901234567",
      emergencyContactRel: "Bố",
      dependantCount: 0,
      educationLevel: "Đại học",
      educationMajor: "Quản lý Nhân lực",
      university: "Đại học Thương Mại",
    },
  ];

  for (const pd of profilesData) {
    await prisma.userProfile.create({ data: pd });
  }
  console.log(`   → Đã tạo ${profilesData.length} user profiles\n`);

  // ── 8. SYSTEM CONFIG ──────────────────────────────────────────────────────
  console.log("⚙️  Tạo SystemConfig...");
  await prisma.systemConfig.createMany({
    data: [
      {
        key: "company_name",
        value: "CÔNG TY TNHH INNOVISION",
        description: "Tên đầy đủ của công ty",
      },
      {
        key: "company_short_name",
        value: "INNOVISION",
        description: "Tên viết tắt",
      },
      {
        key: "company_tax_code",
        value: "0109876543",
        description: "Mã số thuế doanh nghiệp",
      },
      {
        key: "company_address",
        value: "Tầng 8, Tòa nhà FPT, 17 Duy Tân, Cầu Giấy, Hà Nội",
        description: "Địa chỉ trụ sở",
      },
      {
        key: "company_phone",
        value: "024 3795 8888",
        description: "Số điện thoại công ty",
      },
      {
        key: "company_email",
        value: "info@innovision.vn",
        description: "Email liên hệ",
      },
      {
        key: "company_website",
        value: "https://www.innovision.vn",
        description: "Website công ty",
      },
      {
        key: "default_timezone",
        value: "Asia/Ho_Chi_Minh",
        description: "Múi giờ mặc định",
      },
      {
        key: "work_hours_per_day",
        value: "8",
        description: "Số giờ làm việc tiêu chuẩn/ngày",
      },
      {
        key: "work_days_per_week",
        value: "5",
        description: "Số ngày làm việc/tuần (T2-T6)",
      },
      {
        key: "default_annual_leave_days",
        value: "12",
        description: "Số ngày phép năm mặc định",
      },
      {
        key: "max_failed_login_attempts",
        value: "5",
        description: "Số lần đăng nhập sai tối đa trước khi khóa",
      },
      {
        key: "account_lock_duration_minutes",
        value: "30",
        description: "Thời gian khóa tài khoản (phút)",
      },
      {
        key: "probation_duration_months",
        value: "2",
        description: "Thời gian thử việc mặc định (tháng)",
      },
      {
        key: "probation_salary_percent",
        value: "85",
        description: "% lương nhận trong thời gian thử việc",
      },
      {
        key: "payroll_pay_day",
        value: "10",
        description: "Ngày trả lương hàng tháng",
      },
      {
        key: "social_insurance_rate_employee",
        value: "8",
        description: "Tỷ lệ đóng BHXH nhân viên (%)",
      },
      {
        key: "social_insurance_rate_employer",
        value: "17",
        description: "Tỷ lệ đóng BHXH công ty (%)",
      },
      {
        key: "health_insurance_rate_employee",
        value: "1.5",
        description: "Tỷ lệ đóng BHYT nhân viên (%)",
      },
      {
        key: "health_insurance_rate_employer",
        value: "3",
        description: "Tỷ lệ đóng BHYT công ty (%)",
      },
      {
        key: "unemployment_insurance_rate_employee",
        value: "1",
        description: "Tỷ lệ đóng BHTN nhân viên (%)",
      },
      {
        key: "unemployment_insurance_rate_employer",
        value: "1",
        description: "Tỷ lệ đóng BHTN công ty (%)",
      },
    ],
  });
  console.log("   → Đã tạo 22 system configs\n");

  // ── 9. WORK SHIFTS ────────────────────────────────────────────────────────
  console.log("🕐 Tạo WorkShifts...");
  const shiftHC = await prisma.workShift.create({
    data: {
      code: "HC",
      name: "Ca Hành Chính",
      shiftType: "MORNING",
      startTime: "08:00",
      endTime: "17:30",
      breakMinutes: 60,
      workMinutes: 480,
      overtimeAfterMinutes: 30,
    },
  });
  const shiftSang = await prisma.workShift.create({
    data: {
      code: "SANG",
      name: "Ca Sáng",
      shiftType: "MORNING",
      startTime: "06:00",
      endTime: "14:00",
      breakMinutes: 30,
      workMinutes: 450,
    },
  });
  const shiftChieu = await prisma.workShift.create({
    data: {
      code: "CHIEU",
      name: "Ca Chiều",
      shiftType: "AFTERNOON",
      startTime: "14:00",
      endTime: "22:00",
      breakMinutes: 30,
      workMinutes: 450,
    },
  });
  const shiftDem = await prisma.workShift.create({
    data: {
      code: "DEM",
      name: "Ca Đêm",
      shiftType: "NIGHT",
      startTime: "22:00",
      endTime: "06:00",
      breakMinutes: 60,
      workMinutes: 420,
      isNightShift: true,
    },
  });
  const shiftFlex = await prisma.workShift.create({
    data: {
      code: "FLEX",
      name: "Ca Linh Hoạt",
      shiftType: "FLEXIBLE",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      workMinutes: 480,
    },
  });
  console.log("   → Đã tạo 5 ca làm việc\n");

  // ── 10. USER WORK SHIFTS ──────────────────────────────────────────────────
  console.log("📅 Gán ca làm việc cho Users...");
  const activeUsers = [
    uCEO,
    uCTO,
    uHRMgr,
    uCFO,
    uSalMgr,
    uMktMgr,
    uSrDev1,
    uDev1,
    uDev2,
    uDevOps,
    uHRStaff,
    uAcc,
    uSales1,
    uSales2,
    uMkt,
    uBA,
  ];
  for (const u of activeUsers) {
    await prisma.userWorkShift.create({
      data: {
        userId: u.id,
        shiftId: shiftHC.id,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
        notes: "Ca hành chính mặc định",
      },
    });
  }
  console.log(`   → Đã gán ca HC cho ${activeUsers.length} users\n`);

  // ── 11. LEAVE TYPES ───────────────────────────────────────────────────────
  console.log("🏖️  Tạo LeaveTypes...");
  const ltAnnual = await prisma.leaveType.create({
    data: {
      code: "ANNUAL",
      name: "Nghỉ Phép Năm",
      description: "Nghỉ phép hưởng lương theo quy định BLLĐ",
      isPaid: true,
      maxDaysPerYear: 12,
    },
  });
  const ltSick = await prisma.leaveType.create({
    data: {
      code: "SICK",
      name: "Nghỉ Ốm",
      description: "Nghỉ do bệnh tật, có giấy bác sĩ",
      isPaid: true,
      maxDaysPerYear: 30,
      requiresDocument: true,
    },
  });
  const ltMaternity = await prisma.leaveType.create({
    data: {
      code: "MATERNITY",
      name: "Nghỉ Thai Sản",
      description: "Nghỉ sinh con theo chính sách BHXH",
      isPaid: true,
      maxDaysPerYear: 180,
      requiresDocument: true,
    },
  });
  const ltUnpaid = await prisma.leaveType.create({
    data: {
      code: "UNPAID",
      name: "Nghỉ Không Lương",
      description: "Nghỉ phép không được trả lương",
      isPaid: false,
      maxDaysPerYear: 30,
    },
  });
  const ltCompensation = await prisma.leaveType.create({
    data: {
      code: "COMP",
      name: "Nghỉ Bù",
      description: "Nghỉ bù ngày đã làm thêm",
      isPaid: true,
    },
  });
  const ltPersonal = await prisma.leaveType.create({
    data: {
      code: "PERSONAL",
      name: "Nghỉ Việc Riêng",
      description: "Nghỉ có hưởng lương vì việc cá nhân (cưới, tang)",
      isPaid: true,
      maxDaysPerYear: 5,
      requiresDocument: false,
    },
  });
  console.log("   → Đã tạo 6 loại nghỉ phép\n");

  // ── 12. LEAVE BALANCES (2025 + 2026) ─────────────────────────────────────
  console.log("💰 Tạo LeaveBalances...");
  const activeUsersForLeave = [
    uCEO,
    uCTO,
    uHRMgr,
    uCFO,
    uSalMgr,
    uMktMgr,
    uSrDev1,
    uDev1,
    uDev2,
    uDevOps,
    uHRStaff,
    uAcc,
    uSales1,
    uSales2,
    uMkt,
  ];
  // Tạo balances với usedDays=0, pendingDays=0 — sẽ tính lại sau khi tạo leaveRequests
  const leaveBalanceData = [];
  for (const u of activeUsersForLeave) {
    // 2025: entitledDays đúng, remainingDays sẽ được recalculate bên dưới
    leaveBalanceData.push({
      userId: u.id,
      leaveTypeId: ltAnnual.id,
      year: 2025,
      entitledDays: 12,
      carriedDays: 0,
      adjustedDays: 0,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 12,
    });
    leaveBalanceData.push({
      userId: u.id,
      leaveTypeId: ltSick.id,
      year: 2025,
      entitledDays: 30,
      carriedDays: 0,
      adjustedDays: 0,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 30,
    });
    // 2026: carriedDays=2 cho ltAnnual (chuyển từ 2025 còn dư)
    leaveBalanceData.push({
      userId: u.id,
      leaveTypeId: ltAnnual.id,
      year: 2026,
      entitledDays: 12,
      carriedDays: 2,
      adjustedDays: 0,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 14,
    });
    leaveBalanceData.push({
      userId: u.id,
      leaveTypeId: ltSick.id,
      year: 2026,
      entitledDays: 30,
      carriedDays: 0,
      adjustedDays: 0,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: 30,
    });
  }
  await prisma.leaveBalance.createMany({ data: leaveBalanceData });
  console.log(`   → Đã tạo ${leaveBalanceData.length} leave balances\n`);

  // ── 13. HOLIDAYS 2025-2026 ────────────────────────────────────────────────
  console.log("🎉 Tạo Holidays...");
  await prisma.holiday.createMany({
    data: [
      {
        name: "Tết Dương lịch 2025",
        date: new Date("2025-01-01"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (30 TN)",
        date: new Date("2025-01-28"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (Mùng 1)",
        date: new Date("2025-01-29"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (Mùng 2)",
        date: new Date("2025-01-30"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (Mùng 3)",
        date: new Date("2025-01-31"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (Mùng 4)",
        date: new Date("2025-02-01"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2025 (Mùng 5)",
        date: new Date("2025-02-02"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Giỗ Tổ Hùng Vương 2025",
        date: new Date("2025-04-07"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Giải phóng 30/4",
        date: new Date("2025-04-30"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc tế Lao động 1/5",
        date: new Date("2025-05-01"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc khánh 2/9",
        date: new Date("2025-09-02"),
        year: 2025,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Ngày Quốc khánh 2/9 (bù)",
        date: new Date("2025-09-03"),
        year: 2025,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      // 2026
      {
        name: "Tết Dương lịch 2026",
        date: new Date("2026-01-01"),
        year: 2026,
        isRecurring: true,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (29 TN)",
        date: new Date("2026-02-16"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (Mùng 1)",
        date: new Date("2026-02-17"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (Mùng 2)",
        date: new Date("2026-02-18"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (Mùng 3)",
        date: new Date("2026-02-19"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (Mùng 4)",
        date: new Date("2026-02-20"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
      {
        name: "Tết Nguyên Đán 2026 (Mùng 5)",
        date: new Date("2026-02-21"),
        year: 2026,
        isRecurring: false,
        overtimeMultiplier: 3.0,
      },
    ],
  });
  console.log("   → Đã tạo 19 ngày nghỉ lễ\n");

  // ── 14. TAX POLICY 2025-2026 ──────────────────────────────────────────────
  console.log("📊 Tạo TaxPolicy & TaxBrackets...");
  const tax2025 = await prisma.taxPolicy.create({
    data: {
      name: "Chính sách thuế TNCN 2025",
      year: 2025,
      isActive: false,
      personalDeduction: 11000000,
      dependantDeduction: 4400000,
      effectiveFrom: new Date("2025-01-01"),
      effectiveTo: new Date("2025-12-31"),
      description: "Biểu thuế TNCN lũy tiến từng phần áp dụng năm 2025",
    },
  });
  const tax2026 = await prisma.taxPolicy.create({
    data: {
      name: "Chính sách thuế TNCN 2026",
      year: 2026,
      isActive: true,
      personalDeduction: 11000000,
      dependantDeduction: 4400000,
      effectiveFrom: new Date("2026-01-01"),
      description: "Biểu thuế TNCN lũy tiến từng phần áp dụng năm 2026",
    },
  });

  const taxBracketsTemplate = [
    { bracketOrder: 1, minIncome: 0, maxIncome: 5000000, taxRate: 0.05 },
    { bracketOrder: 2, minIncome: 5000000, maxIncome: 10000000, taxRate: 0.1 },
    {
      bracketOrder: 3,
      minIncome: 10000000,
      maxIncome: 18000000,
      taxRate: 0.15,
    },
    { bracketOrder: 4, minIncome: 18000000, maxIncome: 32000000, taxRate: 0.2 },
    {
      bracketOrder: 5,
      minIncome: 32000000,
      maxIncome: 52000000,
      taxRate: 0.25,
    },
    { bracketOrder: 6, minIncome: 52000000, maxIncome: 80000000, taxRate: 0.3 },
    { bracketOrder: 7, minIncome: 80000000, maxIncome: null, taxRate: 0.35 },
  ];

  for (const tp of [tax2025, tax2026]) {
    await prisma.taxBracket.createMany({
      data: taxBracketsTemplate.map((b) => ({ ...b, taxPolicyId: tp.id })),
    });
  }
  console.log("   → Đã tạo 2 tax policies & 14 tax brackets\n");

  // ── 15. SALARY COMPONENTS ─────────────────────────────────────────────────
  console.log("💵 Tạo SalaryComponents...");
  const scBase = await prisma.salaryComponent.create({
    data: {
      code: "BASE",
      name: "Lương Cơ Bản",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: true,
      displayOrder: 1,
      description: "Lương cơ bản theo hợp đồng",
    },
  });
  const scAllowPos = await prisma.salaryComponent.create({
    data: {
      code: "ALLOW_POS",
      name: "Phụ Cấp Chức Vụ",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 2,
      description: "Phụ cấp theo chức danh quản lý",
    },
  });
  const scAllowPhone = await prisma.salaryComponent.create({
    data: {
      code: "ALLOW_PHONE",
      name: "Phụ Cấp Điện Thoại",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 3,
      description: "Hỗ trợ chi phí điện thoại",
    },
  });
  const scAllowLunch = await prisma.salaryComponent.create({
    data: {
      code: "ALLOW_LUNCH",
      name: "Phụ Cấp Ăn Trưa",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 4,
      description: "Hỗ trợ tiền ăn trưa",
    },
  });
  const scAllowTrans = await prisma.salaryComponent.create({
    data: {
      code: "ALLOW_TRANS",
      name: "Phụ Cấp Đi Lại",
      componentType: "EARNING",
      calculationType: "FIXED",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 5,
      description: "Hỗ trợ chi phí đi lại",
    },
  });
  const scKPI = await prisma.salaryComponent.create({
    data: {
      code: "BONUS_KPI",
      name: "Thưởng KPI",
      componentType: "EARNING",
      calculationType: "MANUAL",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 6,
      description: "Thưởng hiệu quả công việc hàng quý",
    },
  });
  const scBonusTeam = await prisma.salaryComponent.create({
    data: {
      code: "BONUS_TEAM",
      name: "Thưởng Dự Án",
      componentType: "EARNING",
      calculationType: "MANUAL",
      isTaxable: true,
      isInsurable: false,
      displayOrder: 7,
      description: "Thưởng khi hoàn thành dự án",
    },
  });
  const scSI = await prisma.salaryComponent.create({
    data: {
      code: "SI",
      name: "BHXH Nhân Viên (8%)",
      componentType: "DEDUCTION",
      calculationType: "FORMULA",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 10,
      description: "Bảo hiểm xã hội người lao động",
    },
  });
  const scHI = await prisma.salaryComponent.create({
    data: {
      code: "HI",
      name: "BHYT Nhân Viên (1.5%)",
      componentType: "DEDUCTION",
      calculationType: "FORMULA",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 11,
      description: "Bảo hiểm y tế người lao động",
    },
  });
  const scUI = await prisma.salaryComponent.create({
    data: {
      code: "UI",
      name: "BHTN Nhân Viên (1%)",
      componentType: "DEDUCTION",
      calculationType: "FORMULA",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 12,
      description: "Bảo hiểm thất nghiệp người lao động",
    },
  });
  const scPIT = await prisma.salaryComponent.create({
    data: {
      code: "PIT",
      name: "Thuế Thu Nhập Cá Nhân",
      componentType: "DEDUCTION",
      calculationType: "FORMULA",
      isTaxable: false,
      isInsurable: false,
      displayOrder: 13,
      description: "Thuế TNCN theo biểu lũy tiến",
    },
  });
  console.log("   → Đã tạo 11 salary components\n");

  // ── 16. USER COMPENSATIONS ────────────────────────────────────────────────
  console.log("💰 Tạo UserCompensations...");
  const compensations = [
    {
      userId: uCEO.id,
      baseSalary: 80000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uCTO.id,
      baseSalary: 65000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uHRMgr.id,
      baseSalary: 30000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uCFO.id,
      baseSalary: 55000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uSalMgr.id,
      baseSalary: 35000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uMktMgr.id,
      baseSalary: 28000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương theo năm 2024",
    },
    {
      userId: uSrDev1.id,
      baseSalary: 40000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương Senior Engineer",
    },
    {
      userId: uDev1.id,
      baseSalary: 25000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương định kỳ",
    },
    {
      userId: uDev2.id,
      baseSalary: 22000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương định kỳ",
    },
    {
      userId: uDevOps.id,
      baseSalary: 30000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Điều chỉnh lương DevOps",
    },
    {
      userId: uHRStaff.id,
      baseSalary: 15000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương định kỳ",
    },
    {
      userId: uAcc.id,
      baseSalary: 18000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương định kỳ",
    },
    {
      userId: uSales1.id,
      baseSalary: 18000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Lương cơ bản + hoa hồng",
    },
    {
      userId: uSales2.id,
      baseSalary: 18000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Lương cơ bản + hoa hồng",
    },
    {
      userId: uMkt.id,
      baseSalary: 16000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2024-01-01",
      changeReason: "Tăng lương định kỳ",
    },
    {
      userId: uBA.id,
      baseSalary: 18000000,
      probationSalary: 15000000,
      salaryType: "MONTHLY",
      effectiveFrom: "2025-10-15",
      probationEndDate: "2025-12-15",
      changeReason: "Lương thử việc",
    },
  ];

  for (const c of compensations) {
    await prisma.userCompensation.create({
      data: {
        userId: c.userId,
        salaryType: c.salaryType,
        baseSalary: c.baseSalary,
        probationSalary: c.probationSalary || null,
        standardWorkingDays: 22,
        standardWorkingHours: 8,
        effectiveFrom: new Date(c.effectiveFrom),
        probationEndDate: c.probationEndDate
          ? new Date(c.probationEndDate)
          : null,
        changeReason: c.changeReason,
        payFrequency: "MONTHLY",
        payDayOfMonth: 10,
        isActive: true,
      },
    });
  }
  console.log(`   → Đã tạo ${compensations.length} user compensations\n`);

  // ── 17. USER SALARY COMPONENTS (Phụ cấp từng người) ─────────────────────
  console.log("📦 Tạo UserSalaryComponents...");
  const usc = [
    // Phụ cấp chức vụ managers
    { userId: uCEO.id, scId: scAllowPos.id, amount: 10000000 },
    { userId: uCTO.id, scId: scAllowPos.id, amount: 8000000 },
    { userId: uCFO.id, scId: scAllowPos.id, amount: 7000000 },
    { userId: uHRMgr.id, scId: scAllowPos.id, amount: 4000000 },
    { userId: uSalMgr.id, scId: scAllowPos.id, amount: 5000000 },
    { userId: uMktMgr.id, scId: scAllowPos.id, amount: 4000000 },
    { userId: uSrDev1.id, scId: scAllowPos.id, amount: 3000000 },
    // Phụ cấp điện thoại
    { userId: uCEO.id, scId: scAllowPhone.id, amount: 500000 },
    { userId: uCTO.id, scId: scAllowPhone.id, amount: 500000 },
    { userId: uHRMgr.id, scId: scAllowPhone.id, amount: 300000 },
    { userId: uSalMgr.id, scId: scAllowPhone.id, amount: 500000 },
    { userId: uSales1.id, scId: scAllowPhone.id, amount: 300000 },
    { userId: uSales2.id, scId: scAllowPhone.id, amount: 300000 },
    // Phụ cấp ăn trưa (tất cả)
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scAllowLunch.id,
      amount: 730000,
    })),
    // Phụ cấp đi lại
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scAllowTrans.id,
      amount: 500000,
    })),
    // BHXH, BHYT, BHTN, Thuế TNCN — isPercentage=true (% lương cơ bản)
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scSI.id,
      amount: 8.0,
      isPercentage: true,
    })),
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scHI.id,
      amount: 1.5,
      isPercentage: true,
    })),
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scUI.id,
      amount: 1.0,
      isPercentage: true,
    })),
    // Thuế TNCN — đặt 10% mặc định, HR có thể điều chỉnh từng người
    ...activeUsersForLeave.map((u) => ({
      userId: u.id,
      scId: scPIT.id,
      amount: 10.0,
      isPercentage: true,
    })),
  ];

  for (const item of usc) {
    await prisma.userSalaryComponent.create({
      data: {
        userId: item.userId,
        salaryComponentId: item.scId,
        amount: item.amount,
        isPercentage: item.isPercentage ?? false,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
      },
    });
  }
  console.log(`   → Đã tạo ${usc.length} user salary components\n`);

  // ── 18. CLIENTS ───────────────────────────────────────────────────────────
  console.log("🏦 Tạo Clients...");
  const client1 = await prisma.client.create({
    data: {
      clientCode: "KH001",
      clientType: "COMPANY",
      status: "ACTIVE",
      companyName: "Công ty Cổ phần Công nghệ FTech Việt Nam",
      shortName: "FTech VN",
      taxCode: "0101234567",
      industry: "Công nghệ thông tin",
      website: "https://www.ftech.vn",
      email: "info@ftech.vn",
      phone: "024 3999 8888",
      address: "Tòa nhà FTech, 89 Láng Hạ, Đống Đa, Hà Nội",
      city: "Hà Nội",
      country: "Vietnam",
      accountManagerUserId: uSalMgr.id,
      totalContractValue: 2500000000,
      totalReceivedAmount: 1800000000,
      outstandingBalance: 700000000,
      notes: "Khách hàng lớn, đối tác chiến lược từ năm 2020",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      clientCode: "KH002",
      clientType: "COMPANY",
      status: "ACTIVE",
      companyName: "Tập đoàn Bán lẻ GreenMart",
      shortName: "GreenMart",
      taxCode: "0207654321",
      industry: "Bán lẻ",
      website: "https://www.greenmart.vn",
      email: "tech@greenmart.vn",
      phone: "028 3888 7777",
      address: "Lầu 12, Tòa nhà Pearl, 8 Hoàng Diệu 2, Thủ Đức, TP.HCM",
      city: "Hồ Chí Minh",
      country: "Vietnam",
      accountManagerUserId: uSales1.id,
      totalContractValue: 1200000000,
      totalReceivedAmount: 1200000000,
      outstandingBalance: 0,
      notes: "Dự án ERP bán lẻ đã hoàn thành, đang bàn contract mới",
    },
  });

  const client3 = await prisma.client.create({
    data: {
      clientCode: "KH003",
      clientType: "GOVERNMENT",
      status: "ACTIVE",
      companyName: "Sở Thông tin và Truyền thông Hà Nội",
      shortName: "Sở TTTT HN",
      taxCode: "0100888999",
      industry: "Cơ quan nhà nước",
      email: "cntt@hanoi.gov.vn",
      phone: "024 3825 9999",
      address: "9 Trần Phú, Ba Đình, Hà Nội",
      city: "Hà Nội",
      country: "Vietnam",
      accountManagerUserId: uSales2.id,
      totalContractValue: 800000000,
      totalReceivedAmount: 400000000,
      outstandingBalance: 400000000,
      notes: "Dự án cổng thông tin điện tử",
    },
  });

  const client4 = await prisma.client.create({
    data: {
      clientCode: "KH004",
      clientType: "COMPANY",
      status: "PROSPECT",
      companyName: "Công ty TNHH Logistics Vận Tải SmartMove",
      shortName: "SmartMove",
      taxCode: "0312345678",
      industry: "Logistics",
      website: "https://www.smartmove.vn",
      email: "business@smartmove.vn",
      phone: "0905 123 456",
      address: "KCN Sóng Thần 2, Dĩ An, Bình Dương",
      city: "Bình Dương",
      country: "Vietnam",
      accountManagerUserId: uSalMgr.id,
      notes: "Tiềm năng - đang trong giai đoạn đề xuất giải pháp",
    },
  });
  console.log("   → Đã tạo 4 clients\n");

  // ── 19. CLIENT CONTACTS ───────────────────────────────────────────────────
  console.log("👥 Tạo ClientContacts...");
  await prisma.clientContact.createMany({
    data: [
      {
        clientId: client1.id,
        fullName: "Nguyễn Minh Khôi",
        jobTitle: "Giám Đốc Công Nghệ",
        email: "khoi.nguyen@ftech.vn",
        phone: "0901000001",
        isPrimary: true,
      },
      {
        clientId: client1.id,
        fullName: "Trần Thị Lan Anh",
        jobTitle: "Trưởng Phòng Mua Hàng",
        email: "lananh.tran@ftech.vn",
        phone: "0901000002",
        isPrimary: false,
      },
      {
        clientId: client2.id,
        fullName: "Lê Quốc Hùng",
        jobTitle: "IT Director",
        email: "hung.le@greenmart.vn",
        phone: "0902000001",
        isPrimary: true,
      },
      {
        clientId: client2.id,
        fullName: "Phạm Thị Thu Hà",
        jobTitle: "Project Manager",
        email: "thuha.pham@greenmart.vn",
        phone: "0902000002",
        isPrimary: false,
      },
      {
        clientId: client3.id,
        fullName: "Hoàng Văn Tuyến",
        jobTitle: "Phó Giám Đốc Sở",
        email: "hvtuyen@hanoi.gov.vn",
        phone: "024 3825 9988",
        isPrimary: true,
      },
      {
        clientId: client4.id,
        fullName: "Bùi Ngọc Anh",
        jobTitle: "CEO",
        email: "ceo@smartmove.vn",
        phone: "0905123457",
        isPrimary: true,
      },
    ],
  });
  console.log("   → Đã tạo 6 client contacts\n");

  // ── 20. CONTRACTS ─────────────────────────────────────────────────────────
  console.log("📝 Tạo Contracts...");
  const contract1 = await prisma.contract.create({
    data: {
      contractCode: "HĐ-2023-001",
      clientId: client1.id,
      contractType: "TIME_AND_MATERIAL",
      status: "ACTIVE",
      title: "Hợp đồng Phát triển Hệ thống ERP FTech - Phase 2",
      description:
        "Phát triển và tích hợp module HR, Payroll, CRM cho hệ thống nội bộ FTech",
      totalValue: 2500000000,
      currency: "VND",
      receivedAmount: 1800000000,
      remainingAmount: 700000000,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2025-12-31"),
      signedDate: new Date("2023-05-20"),
      signedByUserId: uCEO.id,
      notes: "Thanh toán theo milestone hàng quý",
    },
  });

  const contract2 = await prisma.contract.create({
    data: {
      contractCode: "HĐ-2022-003",
      clientId: client2.id,
      contractType: "FIXED_PRICE",
      status: "COMPLETED",
      title: "Hợp đồng Xây dựng Hệ thống POS & Kho hàng GreenMart",
      description:
        "Xây dựng hệ thống quản lý điểm bán, kho hàng, báo cáo cho 50 cửa hàng",
      totalValue: 1200000000,
      currency: "VND",
      receivedAmount: 1200000000,
      remainingAmount: 0,
      startDate: new Date("2022-01-15"),
      endDate: new Date("2023-06-30"),
      signedDate: new Date("2022-01-10"),
      signedByUserId: uCEO.id,
    },
  });

  const contract3 = await prisma.contract.create({
    data: {
      contractCode: "HĐ-2024-007",
      clientId: client3.id,
      contractType: "MILESTONE_BASED",
      status: "ACTIVE",
      title: "Hợp đồng Xây dựng Cổng thông tin điện tử Sở TTTT Hà Nội",
      description:
        "Xây dựng, triển khai cổng thông tin điện tử và hệ thống dịch vụ công trực tuyến",
      totalValue: 800000000,
      currency: "VND",
      receivedAmount: 400000000,
      remainingAmount: 400000000,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2025-09-30"),
      signedDate: new Date("2024-02-28"),
      signedByUserId: uCEO.id,
    },
  });
  console.log("   → Đã tạo 3 contracts\n");

  // ── 21. PROJECTS ──────────────────────────────────────────────────────────
  console.log("🗂️  Tạo Projects...");
  const proj1 = await prisma.project.create({
    data: {
      projectCode: "PRJ-2023-001",
      projectName: "FTech ERP Phase 2",
      description:
        "Phát triển module HR, Payroll, CRM tích hợp cho FTech Vietnam",
      projectManagerUserId: uCTO.id,
      clientId: client1.id,
      contractId: contract1.id,
      status: "ACTIVE",
      priority: "HIGH",
      healthStatus: "ON_TRACK",
      progressPercent: 65,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2025-12-31"),
      budgetAmount: 2500000000,
      spentAmount: 1450000000,
      currency: "VND",
      contractValue: 2500000000,
      invoicedAmount: 1800000000,
      receivedAmount: 1800000000,
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      projectCode: "PRJ-2022-003",
      projectName: "GreenMart POS & Inventory",
      description: "Hệ thống quản lý điểm bán và kho hàng cho chuỗi GreenMart",
      projectManagerUserId: uSrDev1.id,
      clientId: client2.id,
      contractId: contract2.id,
      status: "COMPLETED",
      priority: "HIGH",
      healthStatus: "ON_TRACK",
      progressPercent: 100,
      startDate: new Date("2022-01-15"),
      endDate: new Date("2023-06-30"),
      actualEndDate: new Date("2023-06-25"),
      budgetAmount: 1200000000,
      spentAmount: 1150000000,
      currency: "VND",
      contractValue: 1200000000,
      invoicedAmount: 1200000000,
      receivedAmount: 1200000000,
    },
  });

  const proj3 = await prisma.project.create({
    data: {
      projectCode: "PRJ-2024-007",
      projectName: "Cổng TTĐT Sở TTTT Hà Nội",
      description: "Cổng thông tin điện tử và dịch vụ công trực tuyến",
      projectManagerUserId: uDev1.id,
      clientId: client3.id,
      contractId: contract3.id,
      status: "ACTIVE",
      priority: "MEDIUM",
      healthStatus: "AT_RISK",
      progressPercent: 45,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2025-09-30"),
      budgetAmount: 800000000,
      spentAmount: 320000000,
      currency: "VND",
      contractValue: 800000000,
      invoicedAmount: 400000000,
      receivedAmount: 400000000,
    },
  });

  const proj4 = await prisma.project.create({
    data: {
      projectCode: "PRJ-2025-INT",
      projectName: "Innovision ERP Internal",
      description:
        "Hệ thống ERP nội bộ của Innovision - quản lý HR, lương, dự án",
      projectManagerUserId: uCTO.id,
      status: "ACTIVE",
      priority: "URGENT",
      healthStatus: "ON_TRACK",
      progressPercent: 80,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-06-30"),
      budgetAmount: 500000000,
      spentAmount: 380000000,
      currency: "VND",
    },
  });
  console.log("   → Đã tạo 4 projects\n");

  // ── 22. PROJECT ASSIGNMENTS ───────────────────────────────────────────────
  console.log("👷 Tạo ProjectAssignments...");
  await prisma.userProjectAssignment.createMany({
    data: [
      // FTech ERP Phase 2
      {
        userId: uCTO.id,
        projectId: proj1.id,
        roleInProject: "Project Manager",
        allocationPercent: 30,
        joinedAt: new Date("2023-06-01"),
        status: "ACTIVE",
        isBillable: false,
      },
      {
        userId: uSrDev1.id,
        projectId: proj1.id,
        roleInProject: "Tech Lead",
        allocationPercent: 80,
        joinedAt: new Date("2023-06-01"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 350000,
      },
      {
        userId: uDev1.id,
        projectId: proj1.id,
        roleInProject: "Backend Developer",
        allocationPercent: 100,
        joinedAt: new Date("2023-06-15"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 250000,
      },
      {
        userId: uDev2.id,
        projectId: proj1.id,
        roleInProject: "Frontend Developer",
        allocationPercent: 80,
        joinedAt: new Date("2023-07-01"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 230000,
      },
      {
        userId: uBA.id,
        projectId: proj1.id,
        roleInProject: "Business Analyst",
        allocationPercent: 50,
        joinedAt: new Date("2025-10-15"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 200000,
      },
      // GreenMart (completed)
      {
        userId: uSrDev1.id,
        projectId: proj2.id,
        roleInProject: "Project Manager",
        allocationPercent: 100,
        joinedAt: new Date("2022-01-15"),
        leftAt: new Date("2023-06-25"),
        status: "ENDED",
        isBillable: true,
        hourlyRate: 300000,
      },
      {
        userId: uDev1.id,
        projectId: proj2.id,
        roleInProject: "Full-stack Dev",
        allocationPercent: 100,
        joinedAt: new Date("2022-01-15"),
        leftAt: new Date("2023-06-25"),
        status: "ENDED",
        isBillable: true,
        hourlyRate: 230000,
      },
      // Cổng TTĐT
      {
        userId: uDev1.id,
        projectId: proj3.id,
        roleInProject: "Project Manager",
        allocationPercent: 30,
        joinedAt: new Date("2024-03-01"),
        status: "ACTIVE",
        isBillable: false,
      },
      {
        userId: uDev2.id,
        projectId: proj3.id,
        roleInProject: "Developer",
        allocationPercent: 50,
        joinedAt: new Date("2024-03-15"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 220000,
      },
      {
        userId: uDevOps.id,
        projectId: proj3.id,
        roleInProject: "DevOps Engineer",
        allocationPercent: 30,
        joinedAt: new Date("2024-03-01"),
        status: "ACTIVE",
        isBillable: true,
        hourlyRate: 270000,
      },
      // Internal ERP
      {
        userId: uCTO.id,
        projectId: proj4.id,
        roleInProject: "Project Sponsor",
        allocationPercent: 20,
        joinedAt: new Date("2025-01-01"),
        status: "ACTIVE",
        isBillable: false,
      },
      {
        userId: uSrDev1.id,
        projectId: proj4.id,
        roleInProject: "Tech Lead",
        allocationPercent: 20,
        joinedAt: new Date("2025-01-01"),
        status: "ACTIVE",
        isBillable: false,
      },
      {
        userId: uDevOps.id,
        projectId: proj4.id,
        roleInProject: "DevOps",
        allocationPercent: 40,
        joinedAt: new Date("2025-01-01"),
        status: "ACTIVE",
        isBillable: false,
      },
    ],
  });
  console.log("   → Đã tạo 13 project assignments\n");

  // ── 23. PROJECT MILESTONES ────────────────────────────────────────────────
  console.log("🎯 Tạo ProjectMilestones...");
  await prisma.projectMilestone.createMany({
    data: [
      // FTech ERP
      {
        projectId: proj1.id,
        name: "Phase 2.1 - Phân tích yêu cầu",
        ownerUserId: uSrDev1.id,
        dueDate: new Date("2023-08-31"),
        status: "DONE",
        completedAt: new Date("2023-08-25"),
      },
      {
        projectId: proj1.id,
        name: "Phase 2.2 - Design & Architecture",
        ownerUserId: uCTO.id,
        dueDate: new Date("2023-11-30"),
        status: "DONE",
        completedAt: new Date("2023-11-28"),
      },
      {
        projectId: proj1.id,
        name: "Phase 2.3 - Phát triển Module HR",
        ownerUserId: uSrDev1.id,
        dueDate: new Date("2024-06-30"),
        status: "DONE",
        completedAt: new Date("2024-06-20"),
      },
      {
        projectId: proj1.id,
        name: "Phase 2.4 - Phát triển Payroll",
        ownerUserId: uDev1.id,
        dueDate: new Date("2024-12-31"),
        status: "DONE",
        completedAt: new Date("2024-12-28"),
      },
      {
        projectId: proj1.id,
        name: "Phase 2.5 - CRM & Reporting",
        ownerUserId: uSrDev1.id,
        dueDate: new Date("2025-09-30"),
        status: "IN_PROGRESS",
      },
      {
        projectId: proj1.id,
        name: "Phase 2.6 - UAT & Go-live",
        ownerUserId: uCTO.id,
        dueDate: new Date("2025-12-31"),
        status: "PENDING",
      },
      // Cổng TTĐT
      {
        projectId: proj3.id,
        name: "Kickoff & Phân tích nghiệp vụ",
        ownerUserId: uDev1.id,
        dueDate: new Date("2024-05-31"),
        status: "DONE",
        completedAt: new Date("2024-05-30"),
      },
      {
        projectId: proj3.id,
        name: "Thiết kế UI/UX",
        ownerUserId: uDev2.id,
        dueDate: new Date("2024-08-31"),
        status: "DONE",
        completedAt: new Date("2024-09-05"),
      },
      {
        projectId: proj3.id,
        name: "Phát triển Backend & APIs",
        ownerUserId: uDev1.id,
        dueDate: new Date("2025-03-31"),
        status: "IN_PROGRESS",
      },
      {
        projectId: proj3.id,
        name: "Deploy & Testing",
        ownerUserId: uDevOps.id,
        dueDate: new Date("2025-07-31"),
        status: "PENDING",
      },
      {
        projectId: proj3.id,
        name: "Nghiệm thu bàn giao",
        ownerUserId: uDev1.id,
        dueDate: new Date("2025-09-30"),
        status: "PENDING",
      },
    ],
  });
  console.log("   → Đã tạo 11 milestones\n");

  // ── 24. PAYROLL PERIOD ────────────────────────────────────────────────────
  console.log("📅 Tạo PayrollPeriods...");
  const pp012025 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2025-01",
      month: 1,
      year: 2025,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
      payDate: new Date("2025-02-10"),
      status: "PAID",
      workingDaysInPeriod: 23,
      standardWorkingMinutes: 11040,
      lockedAt: new Date("2025-02-01"),
      approvedAt: new Date("2025-02-05"),
      paidAt: new Date("2025-02-10"),
      approvedByUserId: uCEO.id,
    },
  });

  const pp022025 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2025-02",
      month: 2,
      year: 2025,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-02-28"),
      payDate: new Date("2025-03-10"),
      status: "PAID",
      workingDaysInPeriod: 18,
      standardWorkingMinutes: 8640,
      lockedAt: new Date("2025-03-01"),
      approvedAt: new Date("2025-03-05"),
      paidAt: new Date("2025-03-10"),
      approvedByUserId: uCEO.id,
    },
  });

  const pp012026 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2026-01",
      month: 1,
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
      payDate: new Date("2026-02-10"),
      status: "PAID",
      workingDaysInPeriod: 22,
      standardWorkingMinutes: 10560,
      lockedAt: new Date("2026-02-01"),
      approvedAt: new Date("2026-02-05"),
      paidAt: new Date("2026-02-10"),
      approvedByUserId: uCEO.id,
    },
  });

  const pp022026 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2026-02",
      month: 2,
      year: 2026,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-28"),
      payDate: new Date("2026-03-10"),
      status: "APPROVED",
      workingDaysInPeriod: 17,
      standardWorkingMinutes: 8160,
      lockedAt: new Date("2026-03-01"),
      approvedAt: new Date("2026-03-05"),
      approvedByUserId: uCFO.id,
    },
  });

  const pp032026 = await prisma.payrollPeriod.create({
    data: {
      periodCode: "2026-03",
      month: 3,
      year: 2026,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-31"),
      status: "DRAFT",
      workingDaysInPeriod: 21,
    },
  });
  console.log("   → Đã tạo 5 payroll periods\n");

  // ── 25. PAYROLL RECORDS (kỳ 2026-01) ─────────────────────────────────────
  console.log("🧾 Tạo PayrollRecords...");
  const payrollUsersData = [
    {
      user: uCTO,
      base: 65000000,
      allowPos: 8000000,
      allowPhone: 500000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uHRMgr,
      base: 30000000,
      allowPos: 4000000,
      allowPhone: 300000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uSrDev1,
      base: 40000000,
      allowPos: 3000000,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uDev1,
      base: 25000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uHRStaff,
      base: 15000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
  ];

  for (const pd of payrollUsersData) {
    const totalAllowances =
      pd.allowPos + pd.allowPhone + pd.allowLunch + pd.allowTrans;
    const grossSalary = pd.base + totalAllowances;
    const si = Math.round(pd.base * 0.08);
    const hi = Math.round(pd.base * 0.015);
    const ui = Math.round(pd.base * 0.01);
    const totalDeductions = si + hi + ui;
    const netSalary = grossSalary - totalDeductions;

    const pr = await prisma.payrollRecord.create({
      data: {
        payrollPeriodId: pp012026.id,
        userId: pd.user.id,
        baseSalary: pd.base,
        workingDays: 22,
        grossSalary,
        totalAllowances,
        totalBonus: 0,
        socialInsuranceEmployee: si,
        healthInsuranceEmployee: hi,
        unemploymentInsuranceEmployee: ui,
        personalIncomeTax: 0,
        taxableIncome: grossSalary,
        totalDeductions,
        netSalary,
        status: "PAID",
        dailyRate: Math.round(pd.base / 22),
        generatedAt: new Date("2026-02-01"),
        approvedAt: new Date("2026-02-05"),
        paidAt: new Date("2026-02-10"),
        paymentRef: `LƯƠNG-2026-01-${pd.user.userCode}`,
      },
    });

    // Payroll Items
    await prisma.payrollRecordItem.createMany({
      data: [
        {
          payrollRecordId: pr.id,
          salaryComponentId: scBase.id,
          itemName: "Lương Cơ Bản",
          itemType: "EARNING",
          amount: pd.base,
          sourceType: "BASE",
        },
        ...(pd.allowPos > 0
          ? [
              {
                payrollRecordId: pr.id,
                salaryComponentId: scAllowPos.id,
                itemName: "Phụ Cấp Chức Vụ",
                itemType: "EARNING",
                amount: pd.allowPos,
                sourceType: "ALLOWANCE",
              },
            ]
          : []),
        ...(pd.allowPhone > 0
          ? [
              {
                payrollRecordId: pr.id,
                salaryComponentId: scAllowPhone.id,
                itemName: "Phụ Cấp Điện Thoại",
                itemType: "EARNING",
                amount: pd.allowPhone,
                sourceType: "ALLOWANCE",
              },
            ]
          : []),
        {
          payrollRecordId: pr.id,
          salaryComponentId: scAllowLunch.id,
          itemName: "Phụ Cấp Ăn Trưa",
          itemType: "EARNING",
          amount: pd.allowLunch,
          sourceType: "ALLOWANCE",
        },
        {
          payrollRecordId: pr.id,
          salaryComponentId: scAllowTrans.id,
          itemName: "Phụ Cấp Đi Lại",
          itemType: "EARNING",
          amount: pd.allowTrans,
          sourceType: "ALLOWANCE",
        },
        {
          payrollRecordId: pr.id,
          salaryComponentId: scSI.id,
          itemName: "BHXH (8%)",
          itemType: "DEDUCTION",
          amount: si,
          sourceType: "INSURANCE",
        },
        {
          payrollRecordId: pr.id,
          salaryComponentId: scHI.id,
          itemName: "BHYT (1.5%)",
          itemType: "DEDUCTION",
          amount: hi,
          sourceType: "INSURANCE",
        },
        {
          payrollRecordId: pr.id,
          salaryComponentId: scUI.id,
          itemName: "BHTN (1%)",
          itemType: "DEDUCTION",
          amount: ui,
          sourceType: "INSURANCE",
        },
      ],
    });
  }
  console.log("   → Đã tạo payroll records & items cho 5 users kỳ 2026-01\n");

  // ── 26. PAYROLL ADJUSTMENTS ───────────────────────────────────────────────
  console.log("💸 Tạo PayrollAdjustments...");
  await prisma.payrollAdjustment.createMany({
    data: [
      {
        userId: uSrDev1.id,
        payrollPeriodId: pp012026.id,
        adjustmentType: "BONUS",
        amount: 10000000,
        reason: "Thưởng hoàn thành Phase 2.4 FTech ERP trước deadline",
        status: "APPLIED",
        createdByUserId: uCEO.id,
        approvedByUserId: uCEO.id,
      },
      {
        userId: uDev1.id,
        payrollPeriodId: pp012026.id,
        adjustmentType: "BONUS",
        amount: 5000000,
        reason: "Thưởng KPI Q4/2025 đạt xuất sắc",
        status: "APPLIED",
        createdByUserId: uHRMgr.id,
        approvedByUserId: uCEO.id,
      },
      {
        userId: uSales1.id,
        payrollPeriodId: pp022026.id,
        adjustmentType: "BONUS",
        amount: 8000000,
        reason: "Hoa hồng doanh số tháng 1/2026 - đạt 120% KPI",
        status: "APPROVED",
        createdByUserId: uSalMgr.id,
        approvedByUserId: uCFO.id,
      },
      {
        userId: uHRStaff.id,
        payrollPeriodId: pp022026.id,
        adjustmentType: "DEDUCTION",
        amount: 500000,
        reason: "Khấu trừ đi muộn 5 lần trong tháng 2/2026",
        status: "PENDING",
        createdByUserId: uHRMgr.id,
      },
    ],
  });
  console.log("   → Đã tạo 4 payroll adjustments\n");

  // ── 27. ATTENDANCE RECORDS (12 tháng: 2025-04 → 2026-03) ─────────────────
  console.log("📋 Tạo AttendanceRecords (12 tháng 2025-2026)...");

  const attendanceUsers = [
    uCTO,
    uSrDev1,
    uDev1,
    uDev2,
    uHRStaff,
    uAcc,
    uSales1,
    uSalMgr,
    uMkt,
    uBA,
  ];

  // Lịch ngày làm việc mỗi tháng (T2-T6, bỏ lễ lớn)
  const monthWorkDays = {
    "2025-04": [
      1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 22, 23, 24, 25, 28, 29,
      30,
    ],
    "2025-05": [
      2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28, 29,
      30,
    ],
    "2025-06": [
      2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27,
      30,
    ],
    "2025-07": [
      1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28,
      29, 30, 31,
    ],
    "2025-08": [
      1, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 25, 26, 27, 28,
      29,
    ],
    "2025-09": [
      1, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29,
      30,
    ],
    "2025-10": [
      1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28,
      29, 30, 31,
    ],
    "2025-11": [
      3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28,
    ],
    "2025-12": [
      1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26, 29,
      30, 31,
    ],
    "2026-01": [
      2, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28, 29,
      30,
    ],
    "2026-02": [
      2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27,
    ],
    "2026-03": [
      2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27,
    ],
  };

  // Biến thể hành vi theo nhân viên (muộn, về sớm, vắng)
  const userBehavior = {
    [uCTO.id]: { lateChance: 0.03, absentChance: 0.01, earlyChance: 0.02 },
    [uSrDev1.id]: { lateChance: 0.05, absentChance: 0.01, earlyChance: 0.02 },
    [uDev1.id]: { lateChance: 0.08, absentChance: 0.02, earlyChance: 0.03 },
    [uDev2.id]: { lateChance: 0.12, absentChance: 0.03, earlyChance: 0.04 },
    [uHRStaff.id]: { lateChance: 0.1, absentChance: 0.02, earlyChance: 0.03 },
    [uAcc.id]: { lateChance: 0.04, absentChance: 0.01, earlyChance: 0.02 },
    [uSales1.id]: { lateChance: 0.06, absentChance: 0.03, earlyChance: 0.05 },
    [uSalMgr.id]: { lateChance: 0.04, absentChance: 0.01, earlyChance: 0.02 },
    [uMkt.id]: { lateChance: 0.07, absentChance: 0.02, earlyChance: 0.04 },
    [uBA.id]: { lateChance: 0.05, absentChance: 0.01, earlyChance: 0.02 },
  };

  // Pseudo-random dựa trên seed cố định để kết quả ổn định
  function seededRand(userId, month, day) {
    const h = (userId.charCodeAt(3) * 7 + month * 31 + day * 17) % 100;
    return h / 100;
  }

  let totalAttendance = 0;
  for (const [monthKey, days] of Object.entries(monthWorkDays)) {
    const [yr, mo] = monthKey.split("-").map(Number);
    for (const u of attendanceUsers) {
      const beh = userBehavior[u.id] || {
        lateChance: 0.05,
        absentChance: 0.02,
        earlyChance: 0.03,
      };
      for (const day of days) {
        const r1 = seededRand(u.id, mo, day);
        const r2 = seededRand(u.id, mo + 1, day);
        const r3 = seededRand(u.id, mo + 2, day);
        const dayStr = String(day).padStart(2, "0");
        const workDate = new Date(
          `${yr}-${String(mo).padStart(2, "0")}-${dayStr}`,
        );

        let status = "PRESENT";
        let lateMinutes = 0,
          earlyLeaveMinutes = 0,
          totalWorkMinutes = 480;
        let checkInAt, checkOutAt;

        if (r1 < beh.absentChance) {
          status = "ABSENT";
          checkInAt = null;
          checkOutAt = null;
          totalWorkMinutes = 0;
        } else if (r1 < beh.absentChance + beh.lateChance) {
          // Đi muộn 10–45 phút
          lateMinutes = 10 + Math.floor(r2 * 35);
          const ci = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T08:${String(lateMinutes).padStart(2, "0")}:00`,
          );
          checkInAt = ci;
          checkOutAt = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T17:30:00`,
          );
          totalWorkMinutes = 480 - lateMinutes;
        } else if (r3 < beh.earlyChance) {
          // Về sớm 15–30 phút
          earlyLeaveMinutes = 15 + Math.floor(r2 * 15);
          checkInAt = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T08:00:00`,
          );
          const coHour = 17 - Math.floor(earlyLeaveMinutes / 60);
          const coMin = (30 - (earlyLeaveMinutes % 60) + 60) % 60;
          checkOutAt = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T${String(coHour).padStart(2, "0")}:${String(coMin).padStart(2, "0")}:00`,
          );
          totalWorkMinutes = 480 - earlyLeaveMinutes;
        } else {
          checkInAt = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T08:02:00`,
          );
          checkOutAt = new Date(
            `${yr}-${String(mo).padStart(2, "0")}-${dayStr}T17:32:00`,
          );
        }

        await prisma.attendanceRecord.create({
          data: {
            userId: u.id,
            shiftId: shiftHC.id,
            workDate,
            checkInAt,
            checkOutAt,
            totalWorkMinutes,
            lateMinutes,
            earlyLeaveMinutes,
            overtimeMinutes: 0,
            status,
          },
        });
        totalAttendance++;
      }
    }
  }
  console.log(`   → Đã tạo ${totalAttendance} attendance records (12 tháng)\n`);

  // ── 28. LEAVE REQUESTS (2025 + 2026 đa dạng) ─────────────────────────────
  console.log("🏖️  Tạo LeaveRequests...");

  const leaveRequestsData = [
    // 2025
    {
      userId: uDev1.id,
      ltId: ltAnnual.id,
      start: "2025-04-14",
      end: "2025-04-16",
      days: 3,
      reason: "Về quê nghỉ lễ 30/4",
      status: "APPROVED",
      submitted: "2025-04-07",
      approved: "2025-04-08",
    },
    {
      userId: uMkt.id,
      ltId: ltSick.id,
      start: "2025-05-06",
      end: "2025-05-07",
      days: 2,
      reason: "Sốt virut, có chỉ định bác sĩ",
      status: "APPROVED",
      submitted: "2025-05-06",
      approved: "2025-05-06",
    },
    {
      userId: uHRStaff.id,
      ltId: ltAnnual.id,
      start: "2025-06-02",
      end: "2025-06-04",
      days: 3,
      reason: "Du lịch nghỉ hè gia đình",
      status: "APPROVED",
      submitted: "2025-05-26",
      approved: "2025-05-28",
    },
    {
      userId: uSales1.id,
      ltId: ltPersonal.id,
      start: "2025-07-10",
      end: "2025-07-10",
      days: 1,
      reason: "Việc cá nhân khẩn",
      status: "APPROVED",
      submitted: "2025-07-09",
      approved: "2025-07-09",
    },
    {
      userId: uDev2.id,
      ltId: ltSick.id,
      start: "2025-07-21",
      end: "2025-07-22",
      days: 2,
      reason: "Đau dạ dày, nghỉ điều trị",
      status: "APPROVED",
      submitted: "2025-07-21",
      approved: "2025-07-21",
    },
    {
      userId: uAcc.id,
      ltId: ltAnnual.id,
      start: "2025-08-04",
      end: "2025-08-06",
      days: 3,
      reason: "Đám cưới người thân",
      status: "APPROVED",
      submitted: "2025-07-28",
      approved: "2025-07-30",
    },
    {
      userId: uBA.id,
      ltId: ltAnnual.id,
      start: "2025-08-25",
      end: "2025-08-27",
      days: 3,
      reason: "Nghỉ dưỡng sức sau dự án",
      status: "APPROVED",
      submitted: "2025-08-18",
      approved: "2025-08-19",
    },
    {
      userId: uSrDev1.id,
      ltId: ltAnnual.id,
      start: "2025-09-01",
      end: "2025-09-03",
      days: 3,
      reason: "Về quê nhân dịp Quốc Khánh",
      status: "APPROVED",
      submitted: "2025-08-25",
      approved: "2025-08-26",
    },
    {
      userId: uMkt.id,
      ltId: ltAnnual.id,
      start: "2025-10-06",
      end: "2025-10-08",
      days: 3,
      reason: "Nghỉ phép năm",
      status: "APPROVED",
      submitted: "2025-09-29",
      approved: "2025-10-01",
    },
    {
      userId: uDev1.id,
      ltId: ltPersonal.id,
      start: "2025-10-20",
      end: "2025-10-20",
      days: 1,
      reason: "Giải quyết thủ tục hành chính",
      status: "APPROVED",
      submitted: "2025-10-18",
      approved: "2025-10-19",
    },
    {
      userId: uHRStaff.id,
      ltId: ltSick.id,
      start: "2025-11-03",
      end: "2025-11-04",
      days: 2,
      reason: "Cảm cúm mùa đông",
      status: "APPROVED",
      submitted: "2025-11-03",
      approved: "2025-11-03",
    },
    {
      userId: uSales1.id,
      ltId: ltAnnual.id,
      start: "2025-11-17",
      end: "2025-11-19",
      days: 3,
      reason: "Nghỉ phép cuối năm",
      status: "APPROVED",
      submitted: "2025-11-10",
      approved: "2025-11-12",
    },
    {
      userId: uDev2.id,
      ltId: ltAnnual.id,
      start: "2025-12-22",
      end: "2025-12-24",
      days: 3,
      reason: "Nghỉ Giáng sinh về quê",
      status: "APPROVED",
      submitted: "2025-12-15",
      approved: "2025-12-16",
    },
    {
      userId: uAcc.id,
      ltId: ltAnnual.id,
      start: "2025-12-29",
      end: "2025-12-31",
      days: 3,
      reason: "Nghỉ cuối năm dương lịch",
      status: "APPROVED",
      submitted: "2025-12-22",
      approved: "2025-12-23",
    },
    // 2026
    {
      userId: uSrDev1.id,
      ltId: ltAnnual.id,
      start: "2026-01-27",
      end: "2026-01-31",
      days: 5,
      reason: "Nghỉ Tết Nguyên Đán",
      status: "APPROVED",
      submitted: "2026-01-10",
      approved: "2026-01-12",
    },
    {
      userId: uDev1.id,
      ltId: ltAnnual.id,
      start: "2026-01-27",
      end: "2026-01-30",
      days: 4,
      reason: "Nghỉ Tết về quê",
      status: "APPROVED",
      submitted: "2026-01-10",
      approved: "2026-01-12",
    },
    {
      userId: uMkt.id,
      ltId: ltSick.id,
      start: "2026-02-09",
      end: "2026-02-10",
      days: 2,
      reason: "Đau họng, có đơn thuốc",
      status: "APPROVED",
      submitted: "2026-02-09",
      approved: "2026-02-09",
    },
    {
      userId: uBA.id,
      ltId: ltPersonal.id,
      start: "2026-02-16",
      end: "2026-02-16",
      days: 1,
      reason: "Khám sức khoẻ định kỳ",
      status: "APPROVED",
      submitted: "2026-02-14",
      approved: "2026-02-15",
    },
    {
      userId: uDev1.id,
      ltId: ltAnnual.id,
      start: "2026-03-16",
      end: "2026-03-18",
      days: 3,
      reason: "Về quê thăm bố mẹ",
      status: "APPROVED",
      submitted: "2026-03-10",
      approved: "2026-03-11",
    },
    {
      userId: uMkt.id,
      ltId: ltSick.id,
      start: "2026-03-12",
      end: "2026-03-13",
      days: 2,
      reason: "Sốt cao, có đơn bác sĩ",
      status: "PENDING",
      submitted: "2026-03-12",
      approved: null,
    },
  ];

  let lrCount = 0;
  for (const lr of leaveRequestsData) {
    const req = await prisma.leaveRequest.create({
      data: {
        userId: lr.userId,
        leaveTypeId: lr.ltId,
        startDate: new Date(lr.start),
        endDate: new Date(lr.end),
        totalDays: lr.days,
        reason: lr.reason,
        status: lr.status,
        currentStep: lr.status === "PENDING" ? "MANAGER" : null,
        submittedAt: new Date(lr.submitted),
        finalApprovedAt: lr.approved ? new Date(lr.approved) : null,
      },
    });
    const approvals = [];
    if (lr.status === "APPROVED") {
      approvals.push({
        leaveRequestId: req.id,
        approverUserId: uHRMgr.id,
        stepType: "MANAGER",
        stepOrder: 1,
        status: "APPROVED",
        comment: "Đồng ý",
        actionAt: new Date(lr.approved),
      });
      approvals.push({
        leaveRequestId: req.id,
        approverUserId: uHRMgr.id,
        stepType: "HR",
        stepOrder: 2,
        status: "APPROVED",
        comment: "Duyệt",
        actionAt: new Date(lr.approved),
      });
    } else {
      approvals.push({
        leaveRequestId: req.id,
        approverUserId: uHRMgr.id,
        stepType: "MANAGER",
        stepOrder: 1,
        status: "PENDING",
      });
      approvals.push({
        leaveRequestId: req.id,
        approverUserId: uHRMgr.id,
        stepType: "HR",
        stepOrder: 2,
        status: "PENDING",
      });
    }
    await prisma.leaveRequestApproval.createMany({ data: approvals });
    lrCount++;
  }
  console.log(`   → Đã tạo ${lrCount} leave requests\n`);

  // ── RECALCULATE LEAVE BALANCES từ dữ liệu thực ─────────────────────────────
  // Sau khi tạo tất cả leaveRequests, tính lại usedDays + pendingDays + remainingDays
  // để balance luôn nhất quán với trạng thái đơn thực tế
  console.log("🔄 Recalculate LeaveBalances từ leaveRequests thực...");

  // Lấy tất cả leaveRequests vừa tạo
  const allRequests = await prisma.leaveRequest.findMany({
    where: { status: { in: ["APPROVED", "PENDING"] } },
    select: {
      userId: true,
      leaveTypeId: true,
      totalDays: true,
      status: true,
      startDate: true,
    },
  });

  // Group theo userId + leaveTypeId + year
  const balanceUpdates = new Map();
  for (const req of allRequests) {
    const year = new Date(req.startDate).getFullYear();
    const key = `${req.userId}__${req.leaveTypeId}__${year}`;
    if (!balanceUpdates.has(key)) {
      balanceUpdates.set(key, {
        userId: req.userId,
        leaveTypeId: req.leaveTypeId,
        year,
        usedDays: 0,
        pendingDays: 0,
      });
    }
    const entry = balanceUpdates.get(key);
    if (req.status === "APPROVED") entry.usedDays += Number(req.totalDays);
    if (req.status === "PENDING") entry.pendingDays += Number(req.totalDays);
  }

  // Update từng balance record
  let updatedCount = 0;
  for (const {
    userId,
    leaveTypeId,
    year,
    usedDays,
    pendingDays,
  } of balanceUpdates.values()) {
    const bal = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    if (!bal) continue; // skip nếu chưa có balance (loại phép khác)

    const entitled = Number(bal.entitledDays);
    const carried = Number(bal.carriedDays);
    const adjusted = Number(bal.adjustedDays);
    const remaining = entitled + carried + adjusted - usedDays - pendingDays;

    await prisma.leaveBalance.update({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      data: { usedDays, pendingDays, remainingDays: remaining },
    });
    updatedCount++;
  }
  console.log(
    `   → Đã cập nhật ${updatedCount} balance records (usedDays + pendingDays + remainingDays)\n`,
  );

  // ── 29. OVERTIME REQUESTS (12 tháng) ─────────────────────────────────────
  console.log("⏰ Tạo OvertimeRequests...");

  const otData = [
    // 2025
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-04-05",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Hoàn thiện module HR Phase 2.1",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2025-04-06",
      s: "18:00",
      e: "22:00",
      mins: 240,
      isWknd: true,
      isHol: false,
      reason: "Review code và deploy staging",
      status: "APPROVED",
    },
    {
      userId: uDev2.id,
      approver: uCTO.id,
      date: "2025-05-13",
      s: "18:30",
      e: "21:30",
      mins: 180,
      isWknd: false,
      isHol: false,
      reason: "Fix critical bug payment gateway",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-05-18",
      s: "18:00",
      e: "20:30",
      mins: 150,
      isWknd: false,
      isHol: false,
      reason: "Urgent hotfix production",
      status: "APPROVED",
    },
    {
      userId: uBA.id,
      approver: uCTO.id,
      date: "2025-06-07",
      s: "18:00",
      e: "20:00",
      mins: 120,
      isWknd: true,
      isHol: false,
      reason: "Chuẩn bị tài liệu demo khách hàng",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2025-06-21",
      s: "18:00",
      e: "22:30",
      mins: 270,
      isWknd: true,
      isHol: false,
      reason: "Sprint deadline FTech ERP Phase 2.3",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-07-05",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Deploy phiên bản mới cho FTech",
      status: "APPROVED",
    },
    {
      userId: uSales1.id,
      approver: uSalMgr.id,
      date: "2025-07-14",
      s: "18:00",
      e: "20:00",
      mins: 120,
      isWknd: false,
      isHol: false,
      reason: "Chuẩn bị hợp đồng gấp cho khách hàng mới",
      status: "APPROVED",
    },
    {
      userId: uDev2.id,
      approver: uCTO.id,
      date: "2025-08-02",
      s: "18:30",
      e: "22:00",
      mins: 210,
      isWknd: true,
      isHol: false,
      reason: "Migrate database server mới",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2025-08-16",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Security audit và patch lỗ hổng bảo mật",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-09-06",
      s: "18:00",
      e: "21:30",
      mins: 210,
      isWknd: true,
      isHol: false,
      reason: "Chuẩn bị release v2.5.0",
      status: "APPROVED",
    },
    {
      userId: uBA.id,
      approver: uCTO.id,
      date: "2025-09-22",
      s: "18:00",
      e: "20:00",
      mins: 120,
      isWknd: false,
      isHol: false,
      reason: "Tài liệu nghiệm thu dự án",
      status: "APPROVED",
    },
    {
      userId: uDev2.id,
      approver: uCTO.id,
      date: "2025-10-04",
      s: "18:00",
      e: "22:00",
      mins: 240,
      isWknd: true,
      isHol: false,
      reason: "Load testing hệ thống trước go-live",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2025-10-11",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Code review sprint Q4",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-11-03",
      s: "18:30",
      e: "21:30",
      mins: 180,
      isWknd: false,
      isHol: false,
      reason: "Fix bug báo cáo cuối năm",
      status: "APPROVED",
    },
    {
      userId: uAcc.id,
      approver: uCFO.id,
      date: "2025-11-10",
      s: "18:00",
      e: "20:00",
      mins: 120,
      isWknd: false,
      isHol: false,
      reason: "Chốt báo cáo tài chính Q3",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2025-12-06",
      s: "18:00",
      e: "22:00",
      mins: 240,
      isWknd: true,
      isHol: false,
      reason: "Sprint chạy nước rút cuối năm",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2025-12-13",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Release bản cập nhật cuối năm",
      status: "APPROVED",
    },
    {
      userId: uAcc.id,
      approver: uCFO.id,
      date: "2025-12-29",
      s: "18:00",
      e: "20:30",
      mins: 150,
      isWknd: false,
      isHol: false,
      reason: "Quyết toán thuế năm 2025",
      status: "APPROVED",
    },
    // 2026
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2026-01-10",
      s: "18:00",
      e: "22:00",
      mins: 240,
      isWknd: true,
      isHol: false,
      reason: "Hoàn thiện Phase 2.4 trước Tết",
      status: "APPROVED",
    },
    {
      userId: uDev2.id,
      approver: uCTO.id,
      date: "2026-01-17",
      s: "18:30",
      e: "22:00",
      mins: 210,
      isWknd: true,
      isHol: false,
      reason: "UAT với khách hàng FTech",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2026-02-09",
      s: "18:00",
      e: "21:30",
      mins: 210,
      isWknd: false,
      isHol: false,
      reason: "Go-live hệ thống sau Tết",
      status: "APPROVED",
    },
    {
      userId: uAcc.id,
      approver: uCFO.id,
      date: "2026-02-23",
      s: "18:00",
      e: "20:00",
      mins: 120,
      isWknd: false,
      isHol: false,
      reason: "Chốt quyết toán lương Tết",
      status: "APPROVED",
    },
    {
      userId: uDev1.id,
      approver: uCTO.id,
      date: "2026-03-07",
      s: "18:00",
      e: "21:00",
      mins: 180,
      isWknd: true,
      isHol: false,
      reason: "Fix bug urgent FTech ERP trước demo",
      status: "APPROVED",
    },
    {
      userId: uSrDev1.id,
      approver: uCTO.id,
      date: "2026-03-14",
      s: "18:00",
      e: "21:30",
      mins: 210,
      isWknd: true,
      isHol: false,
      reason: "Chuẩn bị release v3.0",
      status: "PENDING",
    },
  ];

  for (const ot of otData) {
    await prisma.overtimeRequest.create({
      data: {
        userId: ot.userId,
        approverUserId: ot.approver,
        workDate: new Date(ot.date),
        startTime: ot.s,
        endTime: ot.e,
        plannedMinutes: ot.mins,
        actualMinutes: ot.status === "APPROVED" ? ot.mins : null,
        isHoliday: ot.isHol,
        isWeekend: ot.isWknd,
        reason: ot.reason,
        status: ot.status,
        submittedAt: new Date(ot.date + "T17:00:00"),
        actionAt:
          ot.status === "APPROVED" ? new Date(ot.date + "T17:30:00") : null,
        comment: ot.status === "APPROVED" ? "Đồng ý làm thêm giờ" : null,
      },
    });
  }
  console.log(`   → Đã tạo ${otData.length} overtime requests\n`);

  // ── 24b. PAYROLL RECORDS MỞ RỘNG (2025-01 đến 2025-12 + 2026-02) ─────────
  console.log("🧾 Tạo thêm PayrollRecords cho các kỳ 2025...");

  // Tạo thêm 7 kỳ lương còn thiếu
  const extraPeriods = [
    {
      code: "2025-03",
      month: 3,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-04-10"),
      wdays: 21,
    },
    {
      code: "2025-04",
      month: 4,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-05-10"),
      wdays: 22,
    },
    {
      code: "2025-05",
      month: 5,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-06-10"),
      wdays: 21,
    },
    {
      code: "2025-06",
      month: 6,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-07-10"),
      wdays: 21,
    },
    {
      code: "2025-07",
      month: 7,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-08-10"),
      wdays: 23,
    },
    {
      code: "2025-08",
      month: 8,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-09-10"),
      wdays: 21,
    },
    {
      code: "2025-09",
      month: 9,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-10-10"),
      wdays: 22,
    },
    {
      code: "2025-10",
      month: 10,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-11-10"),
      wdays: 23,
    },
    {
      code: "2025-11",
      month: 11,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2025-12-10"),
      wdays: 20,
    },
    {
      code: "2025-12",
      month: 12,
      year: 2025,
      status: "PAID",
      paidAt: new Date("2026-01-10"),
      wdays: 22,
    },
  ];

  const extraPeriodObjs = {};
  for (const ep of extraPeriods) {
    const startDate = new Date(
      `${ep.year}-${String(ep.month).padStart(2, "0")}-01`,
    );
    const endDate = new Date(ep.year, ep.month, 0); // last day
    const payDate = ep.paidAt;
    const pp = await prisma.payrollPeriod.create({
      data: {
        periodCode: ep.code,
        month: ep.month,
        year: ep.year,
        startDate,
        endDate,
        payDate,
        status: ep.status,
        workingDaysInPeriod: ep.wdays,
        standardWorkingMinutes: ep.wdays * 480,
        lockedAt: new Date(payDate.getTime() - 9 * 86400000),
        approvedAt: new Date(payDate.getTime() - 5 * 86400000),
        paidAt: payDate,
        approvedByUserId: uCEO.id,
      },
    });
    extraPeriodObjs[ep.code] = pp;
  }

  // Dữ liệu nhân viên mở rộng cho payroll
  const fullPayrollUsers = [
    {
      user: uCEO,
      base: 80000000,
      allowPos: 10000000,
      allowPhone: 1000000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uCTO,
      base: 65000000,
      allowPos: 8000000,
      allowPhone: 500000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uCFO,
      base: 60000000,
      allowPos: 8000000,
      allowPhone: 500000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uHRMgr,
      base: 30000000,
      allowPos: 4000000,
      allowPhone: 300000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uSalMgr,
      base: 28000000,
      allowPos: 3000000,
      allowPhone: 300000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uMktMgr,
      base: 28000000,
      allowPos: 3000000,
      allowPhone: 300000,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uSrDev1,
      base: 40000000,
      allowPos: 3000000,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uDev1,
      base: 25000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uDev2,
      base: 18000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uHRStaff,
      base: 15000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uAcc,
      base: 20000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uSales1,
      base: 18000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uMkt,
      base: 16000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
    {
      user: uBA,
      base: 22000000,
      allowPos: 0,
      allowPhone: 0,
      allowLunch: 730000,
      allowTrans: 500000,
    },
  ];

  // Tạo records cho 2025-01 (kỳ đã có period nhưng chưa có records)
  const periodsToFill = {
    "2025-01": pp012025,
    "2025-02": pp022025,
    ...extraPeriodObjs,
  };

  let totalPRCreated = 0;
  for (const [periodCode, period] of Object.entries(periodsToFill)) {
    const yr = parseInt(periodCode.split("-")[0]);
    const mo = parseInt(periodCode.split("-")[1]);
    // Lương tháng 12 thưởng Tết 13 cho mọi người
    const isBonusMonth = mo === 12;
    // Tháng Tết (1) lương đầy đủ
    for (const pd of fullPayrollUsers) {
      const totalAllowances =
        pd.allowPos + pd.allowPhone + pd.allowLunch + pd.allowTrans;
      // Tăng lương nhẹ qua các năm
      const salaryMultiplier = yr === 2026 ? 1.1 : 1.0;
      const base = Math.round(pd.base * salaryMultiplier);
      const bonus = isBonusMonth ? Math.round(base * 0.5) : 0; // Thưởng tháng 13
      const grossSalary = base + totalAllowances + bonus;
      const si = Math.round(base * 0.08);
      const hi = Math.round(base * 0.015);
      const ui = Math.round(base * 0.01);
      const totalDeductions = si + hi + ui;
      const netSalary = grossSalary - totalDeductions;
      const paidAt =
        period.paidAt ||
        new Date(`${yr}-${String(mo + 1).padStart(2, "0")}-10`);

      await prisma.payrollRecord.create({
        data: {
          payrollPeriodId: period.id,
          userId: pd.user.id,
          baseSalary: base,
          workingDays: period.workingDaysInPeriod || 22,
          grossSalary,
          totalAllowances,
          totalBonus: bonus,
          socialInsuranceEmployee: si,
          healthInsuranceEmployee: hi,
          unemploymentInsuranceEmployee: ui,
          personalIncomeTax: 0,
          taxableIncome: grossSalary,
          totalDeductions,
          netSalary,
          status: "PAID",
          dailyRate: Math.round(base / 22),
          generatedAt: new Date(paidAt.getTime() - 9 * 86400000),
          approvedAt: new Date(paidAt.getTime() - 5 * 86400000),
          paidAt,
          paymentRef: `LƯƠNG-${periodCode}-${pd.user.userCode}`,
        },
      });
      totalPRCreated++;
    }
  }
  console.log(
    `   → Đã tạo thêm ${totalPRCreated} payroll records (10 kỳ × ${fullPayrollUsers.length} users)\n`,
  );

  // ── 29b. PROJECT EXPENSES (nhiều danh mục, nhiều dự án) ──────────────────
  console.log("💸 Tạo ProjectExpenses...");
  const projectExpensesData = [
    // proj1 - FTech ERP
    {
      projectId: proj1.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "License IntelliJ IDEA năm 2025",
      amount: 8000000,
      date: "2025-02-01",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "HARDWARE",
      title: "RAM nâng cấp workstation team dev",
      amount: 12000000,
      date: "2025-03-10",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uBA.id,
      approver: uCTO.id,
      cat: "TRAVEL",
      title: "Vé máy bay họp khách hàng tại HCM",
      amount: 5500000,
      date: "2025-04-15",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "TRAINING",
      title: "Khóa học AWS Cloud Practitioner",
      amount: 6000000,
      date: "2025-05-20",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "Figma Professional Plan (6 tháng)",
      amount: 4500000,
      date: "2025-06-01",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uBA.id,
      approver: uCTO.id,
      cat: "OTHER",
      title: "Văn phòng phẩm và in ấn tài liệu dự án",
      amount: 1200000,
      date: "2025-07-05",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uDev2.id,
      approver: uCTO.id,
      cat: "TRAVEL",
      title: "Chi phí đi lại on-site tại FTech HN",
      amount: 3000000,
      date: "2025-08-20",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "SUBCONTRACT",
      title: "Thuê QA Tester freelance sprint Q3",
      amount: 25000000,
      date: "2025-09-01",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "AWS EC2 + RDS phí hosting Q4 2025",
      amount: 18000000,
      date: "2025-10-01",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uBA.id,
      approver: uCTO.id,
      cat: "TRAINING",
      title: "Workshop Agile Scrum nội bộ",
      amount: 8000000,
      date: "2025-11-10",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uDev2.id,
      approver: uCTO.id,
      cat: "HARDWARE",
      title: "Mua thêm 2 màn hình cho team",
      amount: 9000000,
      date: "2025-12-05",
      status: "APPROVED",
    },
    // proj2 - Sở TTTT Portal
    {
      projectId: proj2.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "License Enterprise SSL Certificate",
      amount: 3500000,
      date: "2025-03-01",
      status: "APPROVED",
    },
    {
      projectId: proj2.id,
      userId: uBA.id,
      approver: uCTO.id,
      cat: "TRAVEL",
      title: "Di chuyển họp nghiệm thu tại Sở TTTT",
      amount: 2500000,
      date: "2025-05-10",
      status: "APPROVED",
    },
    {
      projectId: proj2.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "SUBCONTRACT",
      title: "Thuê chuyên gia bảo mật kiểm tra hệ thống",
      amount: 30000000,
      date: "2025-07-15",
      status: "APPROVED",
    },
    {
      projectId: proj2.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "OTHER",
      title: "Phí công chứng hồ sơ nghiệm thu",
      amount: 800000,
      date: "2025-09-20",
      status: "APPROVED",
    },
    // proj3 - HN SmartCity
    {
      projectId: proj3.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "Phần mềm thiết kế UI/UX chuyên nghiệp",
      amount: 15000000,
      date: "2025-04-01",
      status: "APPROVED",
    },
    {
      projectId: proj3.id,
      userId: uMkt.id,
      approver: uMktMgr.id,
      cat: "TRAINING",
      title: "Đào tạo UX Research cho team",
      amount: 5000000,
      date: "2025-06-15",
      status: "APPROVED",
    },
    {
      projectId: proj3.id,
      userId: uBA.id,
      approver: uCTO.id,
      cat: "TRAVEL",
      title: "Khảo sát thực địa các điểm lắp đặt",
      amount: 7000000,
      date: "2025-08-10",
      status: "APPROVED",
    },
    {
      projectId: proj3.id,
      userId: uDev2.id,
      approver: uCTO.id,
      cat: "HARDWARE",
      title: "Mua IoT sensor prototype",
      amount: 22000000,
      date: "2025-10-20",
      status: "APPROVED",
    },
    // proj4 - Nội bộ
    {
      projectId: proj4.id,
      userId: uHRStaff.id,
      approver: uHRMgr.id,
      cat: "TRAINING",
      title: "Phần mềm đào tạo LMS nội bộ",
      amount: 12000000,
      date: "2025-05-01",
      status: "APPROVED",
    },
    {
      projectId: proj4.id,
      userId: uAcc.id,
      approver: uCFO.id,
      cat: "SOFTWARE",
      title: "License phần mềm kế toán MISA",
      amount: 9000000,
      date: "2025-07-01",
      status: "APPROVED",
    },
    {
      projectId: proj4.id,
      userId: uHRMgr.id,
      approver: uCEO.id,
      cat: "OTHER",
      title: "Chi phí team building Q3/2025",
      amount: 15000000,
      date: "2025-08-30",
      status: "APPROVED",
    },
    // 2026
    {
      projectId: proj1.id,
      userId: uSrDev1.id,
      approver: uCTO.id,
      cat: "SOFTWARE",
      title: "AWS EC2 hosting Q1 2026",
      amount: 20000000,
      date: "2026-01-05",
      status: "APPROVED",
    },
    {
      projectId: proj1.id,
      userId: uDev1.id,
      approver: uCTO.id,
      cat: "SUBCONTRACT",
      title: "Thuê thêm dev outsource Sprint Jan",
      amount: 35000000,
      date: "2026-02-01",
      status: "APPROVED",
    },
    {
      projectId: proj3.id,
      userId: uDev2.id,
      approver: uCTO.id,
      cat: "HARDWARE",
      title: "Mua thêm server cho SmartCity phase 2",
      amount: 45000000,
      date: "2026-02-15",
      status: "PENDING",
    },
  ];

  await prisma.projectExpense.createMany({
    data: projectExpensesData.map((e) => ({
      projectId: e.projectId,
      submittedByUserId: e.userId,
      approvedByUserId: e.status === "APPROVED" ? e.approver : null,
      category: e.cat,
      title: e.title,
      amount: e.amount,
      currency: "VND",
      expenseDate: new Date(e.date),
      status: e.status,
      submittedAt: new Date(e.date),
      approvedAt: e.status === "APPROVED" ? new Date(e.date) : null,
    })),
  });
  console.log(`   → Đã tạo ${projectExpensesData.length} project expenses\n`);

  // ── 30. INVOICES (đầy đủ theo tháng) ────────────────────────────────────
  console.log("🧾 Tạo Invoices...");

  const invoicesData = [
    // FTech ERP (contract1, proj1, client1) — 8 hoá đơn theo tiến độ
    {
      code: "INV-2025-001",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PAID",
      issued: "2025-01-31",
      due: "2025-02-28",
      sub: 600000000,
      notes: "Thanh toán tiến độ Q1/2025 - Phase 2.3 HR Module",
    },
    {
      code: "INV-2025-002",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PAID",
      issued: "2025-03-31",
      due: "2025-04-30",
      sub: 700000000,
      notes: "Thanh toán tiến độ Q1/2025 - Phase 2.4 Payroll Module",
    },
    {
      code: "INV-2025-003",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PAID",
      issued: "2025-06-30",
      due: "2025-07-31",
      sub: 800000000,
      notes: "Thanh toán tiến độ Q2/2025 - Phase 2.5 Finance Module",
    },
    {
      code: "INV-2025-004",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PAID",
      issued: "2025-09-30",
      due: "2025-10-31",
      sub: 750000000,
      notes: "Thanh toán tiến độ Q3/2025 - Phase 2.6 Reports & UAT",
    },
    {
      code: "INV-2025-005",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PAID",
      issued: "2025-12-15",
      due: "2026-01-15",
      sub: 900000000,
      notes: "Thanh toán nghiệm thu Phase 2 - Go-live thành công",
    },
    {
      code: "INV-2026-001",
      clientId: client1.id,
      contractId: contract1.id,
      projectId: proj1.id,
      status: "PARTIALLY_PAID",
      issued: "2026-02-28",
      due: "2026-03-31",
      sub: 500000000,
      notes: "Thanh toán Phase 3 - Khởi động triển khai",
    },
    // HN SmartCity (contract3, proj3, client3) — 3 hoá đơn
    {
      code: "INV-2025-006",
      clientId: client3.id,
      contractId: contract3.id,
      projectId: proj3.id,
      status: "PAID",
      issued: "2025-04-30",
      due: "2025-05-31",
      sub: 350000000,
      notes: "Nghiên cứu khả thi và lên kế hoạch tổng thể",
    },
    {
      code: "INV-2025-007",
      clientId: client3.id,
      contractId: contract3.id,
      projectId: proj3.id,
      status: "PAID",
      issued: "2025-07-31",
      due: "2025-08-31",
      sub: 400000000,
      notes: "Hoàn thành thiết kế UI/UX và prototype",
    },
    {
      code: "INV-2025-008",
      clientId: client3.id,
      contractId: contract3.id,
      projectId: proj3.id,
      status: "OVERDUE",
      issued: "2025-10-31",
      due: "2025-11-30",
      sub: 500000000,
      notes: "Hoàn thành phát triển backend core API",
    },
    // client2 (contract2) — tự tạo contract2 reference
    {
      code: "INV-2025-009",
      clientId: client2.id,
      contractId: contract2.id,
      projectId: proj2.id,
      status: "PAID",
      issued: "2025-02-28",
      due: "2025-03-31",
      sub: 250000000,
      notes: "Khởi động dự án Sở TTTT - Setup môi trường",
    },
    {
      code: "INV-2025-010",
      clientId: client2.id,
      contractId: contract2.id,
      projectId: proj2.id,
      status: "PAID",
      issued: "2025-05-31",
      due: "2025-06-30",
      sub: 300000000,
      notes: "Hoàn thành module quản lý văn bản",
    },
    {
      code: "INV-2025-011",
      clientId: client2.id,
      contractId: contract2.id,
      projectId: proj2.id,
      status: "PAID",
      issued: "2025-08-31",
      due: "2025-09-30",
      sub: 280000000,
      notes: "Hoàn thành module tích hợp chữ ký số",
    },
    {
      code: "INV-2025-012",
      clientId: client2.id,
      contractId: contract2.id,
      projectId: proj2.id,
      status: "SENT",
      issued: "2025-11-30",
      due: "2025-12-31",
      sub: 320000000,
      notes: "Nghiệm thu toàn bộ dự án Sở TTTT",
    },
    // client4
    {
      code: "INV-2026-002",
      clientId: client4.id,
      contractId: null,
      projectId: null,
      status: "DRAFT",
      issued: "2026-03-01",
      due: "2026-03-31",
      sub: 150000000,
      notes: "Tư vấn chuyển đổi số giai đoạn 1",
    },
  ];

  const invObjs = [];
  for (let i = 0; i < invoicesData.length; i++) {
    const d = invoicesData[i];
    const taxAmount = Math.round(d.sub * 0.1);
    const totalAmount = d.sub + taxAmount;
    let paidAmount = 0,
      outstandingAmount = totalAmount;
    if (d.status === "PAID") {
      paidAmount = totalAmount;
      outstandingAmount = 0;
    } else if (d.status === "PARTIALLY_PAID") {
      paidAmount = Math.round(totalAmount * 0.5);
      outstandingAmount = totalAmount - paidAmount;
    }

    const inv = await prisma.invoice.create({
      data: {
        invoiceCode: d.code,
        clientId: d.clientId,
        contractId: d.contractId || undefined,
        projectId: d.projectId || undefined,
        status: d.status,
        issuedDate: new Date(d.issued),
        dueDate: new Date(d.due),
        subtotal: d.sub,
        taxAmount,
        totalAmount,
        paidAmount,
        outstandingAmount,
        currency: "VND",
        createdByUserId: uAcc.id,
        sentAt: ["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"].includes(d.status)
          ? new Date(d.issued)
          : null,
        notes: d.notes,
      },
    });
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv.id,
        description: d.notes,
        quantity: 1,
        unit: "gói",
        unitPrice: d.sub,
        amount: d.sub,
        taxRate: 0.1,
        taxAmount,
        totalAmount: d.sub + taxAmount,
        displayOrder: 1,
      },
    });
    invObjs.push({ inv, data: d });
  }
  console.log(`   → Đã tạo ${invObjs.length} invoices\n`);

  // ── 31. CLIENT PAYMENTS (theo từng invoice đã PAID) ───────────────────────
  console.log("💳 Tạo ClientPayments...");
  const paymentMethods = [
    "BANK_TRANSFER",
    "BANK_TRANSFER",
    "BANK_TRANSFER",
    "ONLINE",
    "CHECK",
  ];
  const bankNames = [
    "Vietcombank",
    "BIDV",
    "Techcombank",
    "MB Bank",
    "VietinBank",
  ];
  const paidInvoices = invObjs.filter((o) =>
    ["PAID", "PARTIALLY_PAID"].includes(o.data.status),
  );

  const paymentsToCreate = [];
  for (let i = 0; i < paidInvoices.length; i++) {
    const { inv, data } = paidInvoices[i];
    const taxAmount = Math.round(data.sub * 0.1);
    const totalAmount = data.sub + taxAmount;
    const paidAmt =
      data.status === "PARTIALLY_PAID"
        ? Math.round(totalAmount * 0.5)
        : totalAmount;
    const issueDate = new Date(data.issued);
    const payDate = new Date(issueDate.getTime() + 20 * 86400000);

    paymentsToCreate.push({
      clientId: data.clientId,
      contractId: data.contractId || undefined,
      invoiceId: inv.id,
      paymentCode: `PMT-${String(i + 1).padStart(3, "0")}-${data.code.replace("INV-", "")}`,
      amount: paidAmt,
      currency: "VND",
      amountInVnd: paidAmt,
      paymentDate: payDate,
      paymentMethod: paymentMethods[i % paymentMethods.length],
      referenceNumber: `REF${payDate.getFullYear()}${String(payDate.getMonth() + 1).padStart(2, "0")}${String(i + 1).padStart(4, "0")}`,
      status: "COMPLETED",
      receivedBankName: bankNames[i % bankNames.length],
      receivedAccountNumber: `101${String(9000000 + i * 123456)}`,
      confirmedByUserId: uAcc.id,
      confirmedAt: new Date(payDate.getTime() + 86400000),
      notes: `Thanh toán ${data.code}`,
    });
  }
  await prisma.clientPayment.createMany({ data: paymentsToCreate });
  console.log(`   → Đã tạo ${paymentsToCreate.length} client payments\n`);

  // ── 32. NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log("🔔 Tạo Notifications...");
  await prisma.notification.createMany({
    data: [
      // Thông báo lương
      {
        recipientUserId: uCTO.id,
        senderUserId: uHRMgr.id,
        type: "PAYSLIP_AVAILABLE",
        title: "Bảng lương tháng 1/2026 đã có",
        message:
          "Bảng lương tháng 1/2026 đã được phê duyệt và thanh toán. Vui lòng kiểm tra.",
        isRead: true,
        readAt: new Date("2026-02-11"),
      },
      {
        recipientUserId: uSrDev1.id,
        senderUserId: uHRMgr.id,
        type: "PAYSLIP_AVAILABLE",
        title: "Bảng lương tháng 1/2026 đã có",
        message:
          "Bảng lương tháng 1/2026 đã được phê duyệt và thanh toán. Vui lòng kiểm tra.",
        isRead: true,
        readAt: new Date("2026-02-11"),
      },
      {
        recipientUserId: uSrDev1.id,
        senderUserId: uCEO.id,
        type: "COMPENSATION_CHANGED",
        title: "Bạn nhận được thưởng dự án",
        message:
          "Chúc mừng! Bạn nhận thưởng 10,000,000 VNĐ cho việc hoàn thành Phase 2.4 FTech ERP trước deadline.",
        isRead: true,
        readAt: new Date("2026-02-06"),
      },
      // Thông báo nghỉ phép
      {
        recipientUserId: uDev1.id,
        senderUserId: uHRMgr.id,
        type: "LEAVE_REQUEST_APPROVED",
        title: "Đơn nghỉ phép đã được duyệt",
        message:
          "Đơn xin nghỉ phép từ 16/03/2026 đến 18/03/2026 của bạn đã được phê duyệt.",
        isRead: false,
      },
      {
        recipientUserId: uMktMgr.id,
        senderUserId: uMkt.id,
        type: "LEAVE_REQUEST_CREATED",
        title: "Nhân viên gửi đơn nghỉ phép",
        message:
          "Cao Văn Phong xin nghỉ ốm 2 ngày (12-13/03/2026). Vui lòng xem xét và phê duyệt.",
        isRead: false,
      },
      // Thông báo dự án
      {
        recipientUserId: uCTO.id,
        senderUserId: uSrDev1.id,
        type: "PROJECT_STATUS_CHANGED",
        title: "Cập nhật tiến độ FTech ERP",
        message:
          "Phase 2.5 - CRM & Reporting đang trong tiến trình phát triển. Tiến độ hiện tại: 35%.",
        isRead: false,
      },
      {
        recipientUserId: uCTO.id,
        senderUserId: uDev1.id,
        type: "MILESTONE_DUE_SOON",
        title: "Milestone sắp đến hạn",
        message:
          "Milestone 'Phát triển Backend & APIs' của dự án Cổng TTĐT sẽ đến hạn vào 31/03/2025.",
        isRead: false,
      },
      {
        recipientUserId: uDev1.id,
        senderUserId: uCTO.id,
        type: "PROJECT_ASSIGNED",
        title: "Bạn được giao vào dự án mới",
        message:
          "Bạn đã được gán vào dự án 'Innovision ERP Internal' với vai trò Developer.",
        isRead: true,
        readAt: new Date("2025-01-02"),
      },
      // Thông báo hợp đồng
      {
        recipientUserId: uCEO.id,
        senderUserId: uSalMgr.id,
        type: "CONTRACT_EXPIRING_SOON",
        title: "Hợp đồng sắp hết hạn",
        message:
          "Hợp đồng HĐ-2023-001 với FTech Vietnam sẽ hết hạn vào 31/12/2025. Cần gia hạn hoặc ký hợp đồng mới.",
        isRead: false,
      },
      {
        recipientUserId: uAcc.id,
        senderUserId: uSales1.id,
        type: "PAYMENT_RECEIVED",
        title: "Đã nhận thanh toán từ GreenMart",
        message:
          "Khách hàng GreenMart đã thanh toán 1,200,000,000 VNĐ - Hoàn thành hợp đồng HĐ-2022-003.",
        isRead: true,
        readAt: new Date("2023-07-05"),
      },
      {
        recipientUserId: uCEO.id,
        senderUserId: uAcc.id,
        type: "PAYMENT_RECEIVED",
        title: "Nhận thanh toán từ Sở TTTT HN",
        message:
          "Sở TTTT HN đã chuyển 440,000,000 VNĐ - Thanh toán hóa đơn INV-2025-008.",
        isRead: true,
        readAt: new Date("2025-07-27"),
      },
      // Thông báo chấm công
      {
        recipientUserId: uHRMgr.id,
        senderUserId: uMkt.id,
        type: "ATTENDANCE_CHECKIN_REQUEST",
        title: "Yêu cầu chấm công mới",
        message:
          "Cao Văn Phong gửi yêu cầu ghi nhận check-in ngày 13/03/2026 lúc 08:10.",
        isRead: false,
      },
      // Thông báo lương kỳ mới
      {
        recipientUserId: uCEO.id,
        senderUserId: uHRMgr.id,
        type: "PAYROLL_READY",
        title: "Kỳ lương 2/2026 sẵn sàng duyệt",
        message:
          "Bảng lương kỳ tháng 2/2026 đã được tính toán xong và đang chờ phê duyệt.",
        isRead: false,
      },
      // Thông báo chung
      {
        recipientUserId: uNew.id,
        senderUserId: uHRMgr.id,
        type: "GENERAL",
        title: "Chào mừng đến Innovision!",
        message:
          "Xin chào Trần Văn Sơn! Chúc mừng bạn đã gia nhập đội ngũ Innovision. Vui lòng hoàn thiện hồ sơ và kích hoạt tài khoản.",
        isRead: false,
      },
      {
        recipientUserId: uBA.id,
        senderUserId: uHRMgr.id,
        type: "GENERAL",
        title: "Nhắc nhở: Hoàn thiện hồ sơ cá nhân",
        message:
          "Bạn vui lòng cập nhật đầy đủ thông tin cá nhân và ngân hàng để đảm bảo nhận lương đúng hạn.",
        isRead: false,
      },
    ],
  });
  console.log("   → Đã tạo 15 notifications\n");

  // ── 33. AUDIT LOGS ────────────────────────────────────────────────────────
  console.log("📝 Tạo AuditLogs...");
  await prisma.auditLog.createMany({
    data: [
      {
        entityType: "USER",
        entityId: uCTO.id,
        actionType: "LOGIN",
        actorUserId: uCTO.id,
        description: "Đăng nhập thành công",
        ipAddress: "192.168.1.100",
      },
      {
        entityType: "USER",
        entityId: uSrDev1.id,
        actionType: "LOGIN",
        actorUserId: uSrDev1.id,
        description: "Đăng nhập thành công",
        ipAddress: "192.168.1.105",
      },
      {
        entityType: "LEAVE_REQUEST",
        entityId: uDev1.id,
        actionType: "APPROVE",
        actorUserId: uHRMgr.id,
        description: "HR duyệt đơn nghỉ phép của Đinh Văn Giang",
      },
      {
        entityType: "PAYROLL_PERIOD",
        entityId: pp012026.id,
        actionType: "APPROVE",
        actorUserId: uCEO.id,
        description: "Phê duyệt kỳ lương tháng 1/2026",
      },
      {
        entityType: "CONTRACT",
        entityId: contract1.id,
        actionType: "SIGN",
        actorUserId: uCEO.id,
        description: "Ký hợp đồng HĐ-2023-001 với FTech Vietnam",
      },
      {
        entityType: "USER",
        entityId: uNew.id,
        actionType: "CREATE",
        actorUserId: uHRMgr.id,
        description: "Tạo tài khoản nhân viên mới: Trần Văn Sơn",
      },
    ],
  });
  console.log("   → Đã tạo 6 audit logs\n");

  // ── DONE ──────────────────────────────────────────────────────────────────
  console.log("✅ ==============================");
  console.log("✅  SEED HOÀN THÀNH THÀNH CÔNG!");
  console.log("✅ ==============================");
  console.log("\n📊 Tóm tắt dữ liệu đã tạo:");
  console.log(`   • ${roles.length} Roles`);
  console.log(`   • 6 Departments`);
  console.log(`   • 14 Job Titles`);
  console.log(`   • ${allUsers.length} Users (password: ${DEFAULT_PASSWORD})`);
  console.log(`   • 5 Work Shifts`);
  console.log(`   • 6 Leave Types`);
  console.log(`   • 19 Holidays (2025-2026)`);
  console.log(`   • 2 Tax Policies + 14 Tax Brackets`);
  console.log(`   • 11 Salary Components`);
  console.log(`   • 4 Clients + 6 Contacts`);
  console.log(`   • 3 Contracts`);
  console.log(`   • 4 Projects + 11 Milestones`);
  console.log(`   • 15 Payroll Periods (2025-01 → 2026-03, 14 users/kỳ)`);
  console.log(`   • 15 Notifications`);
  console.log(`   • 22 System Configs\n`);
  console.log("🔑 Accounts (tất cả dùng password: Innovision@2025):");
  console.log(
    "   admin@innovision    → nguyen.van.an@innovision.vn  [ADMIN+DIRECTOR]",
  );
  console.log(
    "   cto                 → le.van.cuong@innovision.vn   [MANAGER]",
  );
  console.log(
    "   hr manager          → tran.thi.binh@innovision.vn  [HR+MANAGER]",
  );
  console.log(
    "   cfo                 → pham.thi.dung@innovision.vn  [ACCOUNTANT+MANAGER]",
  );
  console.log(
    "   sales manager       → hoang.van.em@innovision.vn   [SALES+MANAGER]",
  );
  console.log(
    "   senior dev          → ngo.thi.phuong@innovision.vn [MANAGER+EMPLOYEE]",
  );
}

main()
  .catch((e) => {
    console.error(" Lỗi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
