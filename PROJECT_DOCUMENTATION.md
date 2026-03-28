# ERP InnoVision — Tài Liệu Dự Án Toàn Diện

> **Dành cho AI Agent / Developer onboarding**
> Tài liệu này mô tả đầy đủ kiến trúc, cấu trúc thư mục, database schema, luồng xử lý và mapping module của toàn bộ hệ thống ERP InnoVision.

---

## 1. Tổng Quan Dự Án

**ERP InnoVision** là một hệ thống quản lý nguồn lực doanh nghiệp (Enterprise Resource Planning) dành cho các công ty vừa và nhỏ tại Việt Nam. Hệ thống bao gồm hai phần chính:

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Backend** | Node.js + Express 5 + Prisma + MySQL | REST API phục vụ toàn bộ nghiệp vụ |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS 4 | SPA (Single Page Application) cho người dùng |

### Các chức năng chính của hệ thống:
- **Quản lý nhân sự (HR):** nhân viên, phòng ban, chức danh
- **Chấm công & Ca làm việc:** check-in/out, điều chỉnh, ca tùy chỉnh, ngày lễ
- **Nghỉ phép:** đăng ký nghỉ, phê duyệt 2 cấp (Manager → HR), số dư ngày phép
- **Tăng ca (Overtime):** đăng ký, phê duyệt, theo dõi giờ OT
- **Bảng lương (Payroll):** cấu hình thành phần lương, tính lương theo kỳ, điều chỉnh, bảo hiểm, thuế TNCN
- **Quản lý dự án:** milestone, phân công nhân sự, chi phí dự án, health status
- **Quản lý khách hàng (CRM):** hợp đồng, hóa đơn, thanh toán, tài liệu
- **Báo cáo:** HR, chấm công, nghỉ phép, OT, bảng lương, tài chính, dự án
- **Hệ thống:** cấu hình, quản lý tài khoản, audit log
- **Thông báo:** in-app notification với nhiều loại sự kiện

---

## 2. Kiến Trúc Tổng Thể

```
erp-innovision-main/
├── backend/          ← Node.js REST API
└── frontend/         ← React SPA
```

### Sơ đồ luồng request:
```
Browser (React SPA)
    │ HTTPS / fetch
    ▼
Express App (Port 3000)
    │ Helmet, CORS, Rate Limit
    │ Morgan logging
    ▼
/api/[module]
    │ authenticate (JWT Bearer)
    │ authorize (RBAC)
    │ validate (Zod)
    │ auditAction (AuditLog ghi tự động)
    ▼
Controller → Service → Repository
                           │ Prisma ORM
                           ▼
                       MySQL Database
```

---

## 3. BACKEND — Cấu Trúc Chi Tiết

### 3.1 Thư mục gốc backend

```
backend/
├── src/
│   ├── app.js                  ← Khởi tạo Express app, middleware toàn cục
│   ├── server.js               ← Điểm khởi động (listen port)
│   ├── config/
│   │   ├── constants.js        ← Hằng số: ROLES, ACCOUNT_STATUS, PAGINATION...
│   │   ├── db.js               ← Khởi tạo Prisma Client singleton
│   │   └── env.js              ← Parse & validate biến môi trường (.env)
│   ├── common/
│   │   ├── errors/
│   │   │   ├── AppError.js     ← Custom Error class với HTTP status
│   │   │   └── errorCodes.js   ← Enum mã lỗi (AUTH_FORBIDDEN, NOT_FOUND...)
│   │   ├── services/
│   │   │   └── mail.service.js ← Gửi email qua Nodemailer (SMTP)
│   │   ├── types/
│   │   │   └── roles.js        ← Helper: hasRole(), HR_ROLES, APPROVER_ROLES
│   │   └── utils/
│   │       ├── hash.util.js    ← bcrypt hash/compare password
│   │       ├── response.util.js← Chuẩn hóa response JSON { success, data, message }
│   │       └── token.util.js   ← Tạo/verify JWT access & refresh token
│   ├── middlewares/
│   │   ├── auth.middleware.js  ← authenticate() + authorize() + adminOnly + hrOrAdmin
│   │   ├── audit.middleware.js ← auditAction() ghi AuditLog tự động
│   │   ├── error.middleware.js ← Global error handler (AppError → HTTP response)
│   │   ├── notFound.middleware.js ← 404 handler
│   │   ├── rateLimit.middleware.js ← express-rate-limit cho /api
│   │   ├── upload.middleware.js ← Multer xử lý file upload
│   │   └── validate.middleware.js ← Validate body/query/params với Zod schema
│   ├── routes/
│   │   └── index.js            ← Router gốc, mount tất cả module routes vào /api
│   └── modules/                ← Nghiệp vụ theo module (xem mục 3.2)
├── prisma/
│   ├── schema.prisma           ← Toàn bộ định nghĩa database model (MySQL)
│   ├── seed.js                 ← Dữ liệu mẫu khởi tạo DB
│   └── migrations/             ← SQL migration files
├── package.json
├── prisma.config.ts
└── .env.example
```

### 3.2 Kiến trúc Module (Layered Architecture)

Mỗi module trong `src/modules/` đều tuân theo cùng một cấu trúc 5 lớp:

```
[module]/
├── [module].routes.js      ← Định nghĩa route + gắn middleware (auth, validate, audit)
├── [module].controller.js  ← Nhận request, gọi service, trả response
├── [module].service.js     ← Business logic, xử lý nghiệp vụ phức tạp
├── [module].repository.js  ← Tương tác với Prisma/DB (queries)
├── [module].mapper.js      ← Transform DB entity → DTO trả về client
└── [module].validation.js  ← Zod schema validate input
```

**Lý do phân tách:** Repository tách biệt DB query khỏi business logic, giúp dễ test và thay thế ORM. Mapper đảm bảo không bao giờ leak field nhạy cảm (passwordHash...) ra ngoài API.

### 3.3 Danh sách Module Backend

| Module | Route prefix | Chức năng chính |
|---|---|---|
| `auth` | `/api/auth` | Đăng nhập, refresh token, setup account, đổi/quên/reset mật khẩu |
| `users` | `/api/users` | CRUD nhân viên, profile, hình ảnh, phân quyền, lock/unlock tài khoản |
| `departments` | `/api/departments` | CRUD phòng ban, chỉ định trưởng phòng |
| `job-titles` | `/api/job-titles` | CRUD chức danh/vị trí công việc |
| `attendance` | `/api/attendance` | Ghi nhận chấm công, xem lịch sử, yêu cầu điều chỉnh, admin adjust |
| `leave` | `/api/leave` | Loại nghỉ, đăng ký nghỉ, phê duyệt, số dư ngày phép |
| `overtime` | `/api/overtime` | Đăng ký OT, phê duyệt, thống kê giờ tăng ca |
| `payroll` | `/api/payroll` | Kỳ lương, tính lương, chi tiết bảng lương, điều chỉnh lương |
| `projects` | `/api/projects` | CRUD dự án, milestone, phân công nhân sự, chi phí |
| `clients` | `/api/clients` | CRM: khách hàng, người liên hệ, hợp đồng, hóa đơn, thanh toán |
| `reports` | `/api/reports` | Báo cáo tổng hợp: HR, chấm công, nghỉ phép, lương, tài chính, dự án |
| `notifications` | `/api/notifications` | In-app notification, đánh dấu đã đọc, gửi thông báo |
| `system` | `/api/system` | Cấu hình hệ thống, quản lý tài khoản admin, audit log |

### 3.4 Authentication & Authorization

**Cơ chế xác thực:**
- JWT Access Token (15 phút) + Refresh Token (7 ngày)
- Access token gửi qua `Authorization: Bearer <token>` header
- Refresh token lưu trong DB (bảng `user_sessions`), hash bằng bcrypt
- Token một lần dùng cho setup account / reset password (bảng `auth_tokens`)

**Hệ thống phân quyền (RBAC):**

| Role | Mô tả | Quyền điển hình |
|---|---|---|
| `ADMIN` | Quản trị viên hệ thống | Toàn quyền |
| `HR` | Nhân sự | Quản lý nhân viên, duyệt nghỉ phép, tính lương |
| `MANAGER` | Quản lý / Trưởng nhóm | Duyệt nghỉ phép & OT của nhóm, xem báo cáo nhóm |
| `EMPLOYEE` | Nhân viên thường | Xem thông tin cá nhân, đăng ký nghỉ/OT, chấm công |
| `SALES` | Bán hàng | Quản lý khách hàng, hợp đồng, hóa đơn |
| `ACCOUNTANT` | Kế toán | Xem tài chính, xác nhận thanh toán |

**Middleware shortcut:**
```js
adminOnly          = authorize(ROLES.ADMIN)
hrOrAdmin          = authorize(ROLES.ADMIN, ROLES.HR)
HR_ROLES           = [ADMIN, HR]
APPROVER_ROLES     = [ADMIN, HR, MANAGER]
FINANCE_ROLES      = [ADMIN, ACCOUNTANT]
```

**Account Status:**
- `PENDING` → tài khoản mới tạo, chưa setup password
- `ACTIVE` → hoạt động bình thường
- `LOCKED` → bị khóa (sai mật khẩu quá `MAX_FAILED_LOGIN=5` lần, lock 30 phút)
- `DISABLED` → vô hiệu hóa bởi admin

### 3.5 Biến Môi Trường (.env)

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database (MySQL/MariaDB)
DATABASE_URL=mysql://user:pass@localhost:3306/erp_innovision

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Mail (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=noreply@company.com

# Security
MAX_FAILED_LOGIN=5
LOCK_DURATION_MINUTES=30
AUTH_TOKEN_EXPIRES_HOURS=24

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

---

## 4. DATABASE SCHEMA

### 4.1 Database Engine
- **DBMS:** MySQL (tương thích MariaDB)
- **ORM:** Prisma 7.x với adapter MariaDB
- **ID:** CUID (Collision-resistant Unique ID, varchar 30)

### 4.2 Nhóm bảng theo Domain

#### 👤 Nhân Sự & Tổ Chức
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `departments` | `Department` | Phòng ban, có `head_user_id` trỏ đến trưởng phòng |
| `job_titles` | `JobTitle` | Chức danh/vị trí, có code định danh |
| `users` | `User` | Nhân viên — thông tin tài khoản, trạng thái, quản lý |
| `user_profiles` | `UserProfile` | Hồ sơ chi tiết: CCCD, hộ khẩu, ngân hàng, bảo hiểm, thuế |
| `roles` | `Role` | Danh sách vai trò (ADMIN, HR, MANAGER...) |
| `user_roles` | `UserRole` | Bảng nối User ↔ Role (many-to-many) |

**Quan hệ nổi bật trong `users`:**
- `managerId` → tự tham chiếu (cây phân cấp quản lý)
- `departmentId` → phòng ban
- `jobTitleId` → chức danh
- `createdByUserId` → người tạo tài khoản

#### 🔐 Xác Thực & Phiên Làm Việc
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `auth_tokens` | `AuthToken` | Token một lần: `ACCOUNT_SETUP`, `PASSWORD_RESET` — lưu hash |
| `user_sessions` | `UserSession` | Refresh token sessions (hash), IP, user-agent, expiry |
| `audit_logs` | `AuditLog` | Lịch sử mọi hành động mutation trong hệ thống |

#### 🕐 Chấm Công & Ca Làm Việc
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `work_shifts` | `WorkShift` | Ca làm việc: MORNING, AFTERNOON, NIGHT, FLEXIBLE, SPLIT |
| `user_work_shifts` | `UserWorkShift` | Phân ca làm việc theo từng nhân viên |
| `attendance_records` | `AttendanceRecord` | Bản ghi chấm công hằng ngày (check-in, check-out, status) |
| `attendance_requests` | `AttendanceRequest` | Yêu cầu điều chỉnh check-in/check-out |
| `holidays` | `Holiday` | Danh sách ngày lễ/nghỉ |

**`AttendanceStatus` enum:** `PRESENT`, `ABSENT`, `LEAVE`, `HOLIDAY`, `MANUAL_ADJUSTED`

#### 🏖️ Nghỉ Phép
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `leave_types` | `LeaveType` | Loại nghỉ: có lương/không lương, số ngày tối đa/năm |
| `leave_balances` | `LeaveBalance` | Số dư ngày phép theo user × loại × năm |
| `leave_requests` | `LeaveRequest` | Đơn xin nghỉ, trạng thái, lý do, file đính kèm |
| `leave_request_approvals` | `LeaveRequestApproval` | Chi tiết từng bước phê duyệt (MANAGER → HR) |

**Quy trình phê duyệt 2 bước:** `ApprovalStepType` = `MANAGER` | `HR`

#### ⏰ Tăng Ca
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `overtime_requests` | `OvertimeRequest` | Đăng ký OT: ngày, giờ bắt đầu/kết thúc, lý do |

**`OvertimeRequestStatus`:** `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

#### 💰 Bảng Lương & Chính Sách
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `salary_components` | `SalaryComponent` | Thành phần lương: lương cơ bản, phụ cấp, KPI... |
| `user_salary_components` | `UserSalaryComponent` | Giá trị từng thành phần lương theo nhân viên |
| `user_compensations` | `UserCompensation` | Lịch sử thay đổi mức lương của nhân viên |
| `insurance_policies` | `InsurancePolicy` | Chính sách bảo hiểm (BHXH, BHYT, BHTN) |
| `tax_policies` | `TaxPolicy` | Chính sách thuế TNCN |
| `tax_brackets` | `TaxBracket` | Bậc thuế lũy tiến |
| `payroll_periods` | `PayrollPeriod` | Kỳ lương (tháng/năm), trạng thái, người duyệt |
| `payroll_records` | `PayrollRecord` | Bảng lương tổng của từng nhân viên trong kỳ |
| `payroll_record_items` | `PayrollRecordItem` | Chi tiết từng dòng trong bảng lương |
| `payroll_adjustments` | `PayrollAdjustment` | Điều chỉnh thưởng/phạt ngoài chu kỳ |

#### 📁 Dự Án
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `projects` | `Project` | Dự án: budget, tiến độ, health, giá trị hợp đồng, hóa đơn |
| `user_project_assignments` | `UserProjectAssignment` | Phân công nhân sự vào dự án (role trong dự án) |
| `project_milestones` | `ProjectMilestone` | Mốc tiến độ dự án, owner |
| `project_expenses` | `ProjectExpense` | Chi phí thực tế dự án, phê duyệt |

**`ProjectStatus`:** `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`
**`ProjectHealthStatus`:** `ON_TRACK`, `AT_RISK`, `DELAYED`

#### 🤝 Khách Hàng & Tài Chính
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `clients` | `Client` | Khách hàng: B2B/B2C, mã số thuế, số dư công nợ |
| `client_contacts` | `ClientContact` | Người liên hệ của khách hàng |
| `contracts` | `Contract` | Hợp đồng với khách hàng |
| `contract_amendments` | `ContractAmendment` | Phụ lục hợp đồng |
| `invoices` | `Invoice` | Hóa đơn xuất cho khách, liên kết dự án |
| `invoice_items` | `InvoiceItem` | Chi tiết từng dòng hóa đơn |
| `client_payments` | `ClientPayment` | Ghi nhận thanh toán từ khách hàng |
| `client_documents` | `ClientDocument` | Tài liệu đính kèm khách hàng |

#### 🔔 Thông Báo & Hệ Thống
| Bảng | Model Prisma | Mô tả |
|---|---|---|
| `notifications` | `Notification` | Thông báo in-app: loại, recipient, đã đọc chưa |
| `system_configs` | `SystemConfig` | Cấu hình hệ thống dạng key-value |

---

## 5. FRONTEND — Cấu Trúc Chi Tiết

### 5.1 Thư mục gốc frontend

```
frontend/
├── index.html
├── vite.config.ts           ← Vite build config
├── postcss.config.mjs       ← PostCSS (Tailwind)
├── public/                  ← Static assets (favicon, PWA manifest)
└── src/
    ├── main.tsx             ← Entry point, mount React app
    ├── app/
    │   ├── App.tsx          ← Root component, RouterProvider
    │   ├── routes.ts        ← Định nghĩa toàn bộ client-side routing
    │   ├── components/      ← Shared UI components
    │   │   ├── Layout.tsx   ← Main layout: sidebar, header, breadcrumb
    │   │   ├── RootLayout.tsx ← Root wrapper (AuthProvider, ThemeProvider)
    │   │   ├── figma/       ← Component hỗ trợ import từ Figma
    │   │   └── ui/          ← shadcn/ui component library (30+ components)
    │   ├── context/         ← React Context providers
    │   │   ├── AuthContext.tsx     ← Auth state, login/logout, roles
    │   │   ├── AuthContext.mock.tsx ← Mock auth cho chế độ demo
    │   │   └── EmployeeContext.tsx  ← Context dữ liệu nhân viên
    │   ├── data/
    │   │   └── mockData.ts  ← Dữ liệu mock cho demo (104KB)
    │   └── pages/           ← Các trang theo route (xem mục 5.2)
    ├── hooks/
    │   └── useApi.ts        ← Custom hook cho data fetching với loading/error state
    ├── imports/
    │   └── pasted_text/     ← Tài liệu spec nội bộ (enums, schema, task notes)
    ├── lib/
    │   ├── apiClient.ts     ← Centralized fetch wrapper, JWT auto-refresh
    │   └── services/        ← Service layer gọi API backend (xem mục 5.3)
    └── styles/
        ├── index.css        ← Base styles
        ├── tailwind.css     ← Tailwind directives
        ├── theme.css        ← CSS variables cho dark/light theme
        └── fonts.css        ← Font imports
```

### 5.2 Mapping Route → Page → Chức năng

| Route | Page Component | Chức năng |
|---|---|---|
| `/login` | `LoginPage` | Đăng nhập, link quên mật khẩu |
| `/setup-account` | `SetupAccountPage` | Thiết lập mật khẩu lần đầu (từ email link) |
| `/forgot-password` | `ForgotPasswordPage` | Yêu cầu reset mật khẩu qua email |
| `/reset-password` | `ResetPasswordPage` | Đặt lại mật khẩu từ token email |
| `/change-password` | `ChangePasswordPage` | Đổi mật khẩu (khi `mustChangePassword=true`) |
| `/` | `DashboardPage` | Dashboard tổng quan: KPI cards, charts, hoạt động gần đây |
| `/employees` | `EmployeesPage` | Danh sách nhân viên, filter, tìm kiếm, tạo mới |
| `/employees/:id` | `EmployeeDetailPage` | Chi tiết nhân viên: profile, lịch sử, hợp đồng |
| `/departments` | `DepartmentsPage` | Quản lý phòng ban |
| `/job-titles` | `JobTitlesPage` | Quản lý chức danh |
| `/attendance/my` | `MyAttendancePage` | Chấm công cá nhân, lịch sử của mình |
| `/attendance/records` | `AttendanceAdminPage` | Admin xem toàn bộ bản ghi chấm công |
| `/attendance/requests` | `AttendanceAdminPage` | Admin xem/duyệt yêu cầu điều chỉnh |
| `/attendance/adjust` | `AttendanceAdminPage` | Admin điều chỉnh thủ công |
| `/shifts` | `ShiftsPage` | Quản lý ca làm việc |
| `/holidays` | `HolidaysPage` | Quản lý ngày lễ |
| `/overtime` | `OvertimePage` | Đăng ký và duyệt tăng ca |
| `/leave/requests` | `LeaveRequestsPage` | Đăng ký và duyệt nghỉ phép |
| `/leave/balances` | `LeaveBalancesPage` | Xem số dư ngày phép |
| `/payroll` | `PayrollPage` | Kỳ lương, bảng lương nhân viên |
| `/payroll/adjustments` | `PayrollAdjustmentsPage` | Điều chỉnh thưởng/phạt |
| `/payroll/config` | `PayrollConfigPage` | Cấu hình bảo hiểm, thuế |
| `/payroll/salary-config` | `SalaryConfigPage` | Cấu hình thành phần lương |
| `/projects` | `ProjectsPage` | Danh sách dự án |
| `/projects/:id` | `ProjectDetailPage` | Chi tiết dự án: milestone, nhân sự, chi phí |
| `/projects/expenses` | `ProjectExpensesPage` | Quản lý chi phí dự án |
| `/projects/health` | `ProjectHealthPage` | Tình trạng sức khỏe dự án |
| `/clients` | `ClientsPage` | Danh sách khách hàng |
| `/contracts` | `ContractsPage` | Hợp đồng khách hàng |
| `/invoices` | `InvoicesPage` | Hóa đơn |
| `/payments` | `PaymentsPage` | Thanh toán |
| `/reports/hr` | `HRReportPage` | Báo cáo nhân sự |
| `/reports/attendance` | `AttendanceReportPage` | Báo cáo chấm công |
| `/reports/leave` | `LeaveReportPage` | Báo cáo nghỉ phép |
| `/reports/overtime` | `OvertimeReportPage` | Báo cáo tăng ca |
| `/reports/payroll` | `PayrollReportPage` | Báo cáo bảng lương |
| `/reports/finance` | `FinanceReportPage` | Báo cáo tài chính |
| `/reports/projects` | `ProjectReportPage` | Báo cáo dự án |
| `/system/config` | `SystemConfigPage` | Cấu hình hệ thống |
| `/system/accounts` | `AccountsPage` | Quản lý tài khoản người dùng |
| `/system/audit-log` | `AuditLogPage` | Xem audit log hành động |
| `/notifications` | `NotificationsPage` | Thông báo của người dùng |
| `/profile` | `ProfilePage` | Hồ sơ cá nhân, chỉnh sửa thông tin |

### 5.3 Service Layer Frontend

Mỗi file trong `src/lib/services/` tương ứng với một module backend:

| File | Backend module | Các API gọi chính |
|---|---|---|
| `auth.service.ts` | `/api/auth` | `login()`, `logout()`, `refreshToken()`, `setupAccount()`, `resetPassword()` |
| `users.service.ts` | `/api/users` | CRUD user, upload avatar, assign role, lock/unlock |
| `departments.service.ts` | `/api/departments` | CRUD department |
| `jobTitles.service.ts` | `/api/job-titles` | CRUD job title |
| `attendance.service.ts` | `/api/attendance` | Check-in/out, lịch sử, yêu cầu điều chỉnh |
| `leave.service.ts` | `/api/leave` | Đăng ký nghỉ, phê duyệt, số dư |
| `overtime.service.ts` | `/api/overtime` | Đăng ký OT, phê duyệt |
| `payroll.service.ts` | `/api/payroll` | Kỳ lương, bảng lương, điều chỉnh, cấu hình |
| `projects.service.ts` | `/api/projects` | CRUD dự án, milestone, phân công |
| `clients.service.ts` | `/api/clients` | CRM: client, contact, contract, invoice, payment |
| `reports.service.ts` | `/api/reports` | Tất cả loại báo cáo |
| `notifications.service.ts` | `/api/notifications` | Lấy, đánh dấu đọc, xóa thông báo |
| `system.service.ts` | `/api/system` | Cấu hình, audit log |

### 5.4 apiClient — Cơ chế gọi API

```
src/lib/apiClient.ts
```

- **Base URL:** từ `VITE_API_URL` env (default: `http://localhost:3000/api`)
- **Token storage:** `localStorage` (`accessToken`, `refreshToken`)
- **Auto-refresh:** khi nhận 401, tự gọi `/auth/refresh` 1 lần, retry request
- **Concurrent lock:** chỉ 1 refresh request chạy tại một thời điểm
- **Logout event:** dispatch `auth:logout` custom event khi refresh thất bại

### 5.5 Chế Độ Mock vs Real API

Frontend hỗ trợ 2 chế độ:

| Chế độ | Kích hoạt | Dữ liệu |
|---|---|---|
| **Mock** | `VITE_API_URL` không được set | `mockData.ts` — hardcoded data (104KB) |
| **Real** | `VITE_API_URL=http://localhost:3000/api` | Gọi backend thật |

`AuthContext.tsx` tự động chọn chế độ dựa trên biến môi trường.

### 5.6 UI Component Stack

| Thư viện | Mục đích |
|---|---|
| **shadcn/ui** (Radix UI) | Base components: Dialog, Select, Table, Form, Calendar... |
| **Tailwind CSS 4** | Utility-first styling |
| **Recharts** | Charts và graphs trong dashboard/reports |
| **React Hook Form** | Form state management |
| **React Router 7** | Client-side routing |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |
| **date-fns** | Xử lý ngày tháng |
| **React DnD** | Drag-and-drop (kanban trong project) |
| **MUI** | Một số component bổ sung |

---

## 6. Mapping Module → Thư Mục Hỗ Trợ

### Module: Xác Thực & Người Dùng

```
Chức năng: Đăng nhập, JWT, setup account, đổi mật khẩu, phân quyền

Backend:
  src/modules/auth/              ← Logic xác thực
  src/modules/users/             ← CRUD nhân viên, avatar, roles
  src/middlewares/auth.middleware.js  ← Protect routes
  src/common/utils/token.util.js     ← JWT helpers
  src/common/utils/hash.util.js      ← bcrypt
  src/common/services/mail.service.js ← Gửi email setup/reset

Frontend:
  src/app/pages/LoginPage.tsx
  src/app/pages/SetupAccountPage.tsx
  src/app/pages/ForgotPasswordPage.tsx
  src/app/pages/ResetPasswordPage.tsx
  src/app/pages/ChangePasswordPage.tsx
  src/app/pages/ProfilePage.tsx
  src/app/context/AuthContext.tsx
  src/lib/services/auth.service.ts
  src/lib/services/users.service.ts

Database:
  users, user_profiles, user_roles, roles
  auth_tokens, user_sessions
```

### Module: Phòng Ban & Chức Danh

```
Chức năng: Quản lý cơ cấu tổ chức

Backend:
  src/modules/departments/
  src/modules/job-titles/

Frontend:
  src/app/pages/DepartmentsPage.tsx  ← Export: DepartmentsPage, JobTitlesPage
  src/lib/services/departments.service.ts
  src/lib/services/jobTitles.service.ts

Database:
  departments, job_titles
```

### Module: Chấm Công

```
Chức năng: Check-in/out, ca làm việc, ngày lễ, điều chỉnh

Backend:
  src/modules/attendance/

Frontend:
  src/app/pages/AttendancePage.tsx   ← Export: MyAttendancePage, ShiftsPage, HolidaysPage
  src/app/pages/AttendanceAdminPage.tsx
  src/lib/services/attendance.service.ts

Database:
  attendance_records, attendance_requests
  work_shifts, user_work_shifts, holidays
```

### Module: Nghỉ Phép

```
Chức năng: Đăng ký, phê duyệt đa cấp, theo dõi số dư

Backend:
  src/modules/leave/

Frontend:
  src/app/pages/LeavePage.tsx  ← Export: LeaveRequestsPage, LeaveBalancesPage
  src/lib/services/leave.service.ts

Database:
  leave_types, leave_requests, leave_request_approvals, leave_balances
```

### Module: Tăng Ca

```
Chức năng: Đăng ký, phê duyệt, theo dõi giờ OT

Backend:
  src/modules/overtime/

Frontend:
  src/app/pages/OvertimePage.tsx
  src/lib/services/overtime.service.ts

Database:
  overtime_requests
```

### Module: Bảng Lương

```
Chức năng: Cấu hình thành phần lương, tính lương định kỳ,
           điều chỉnh, bảo hiểm, thuế TNCN

Backend:
  src/modules/payroll/

Frontend:
  src/app/pages/PayrollPage.tsx     ← Export: PayrollPage, PayrollAdjustmentsPage, PayrollConfigPage
  src/app/pages/SalaryConfigPage.tsx
  src/lib/services/payroll.service.ts

Database:
  payroll_periods, payroll_records, payroll_record_items
  payroll_adjustments, salary_components, user_salary_components
  user_compensations, insurance_policies, tax_policies, tax_brackets
```

### Module: Dự Án

```
Chức năng: Quản lý dự án, milestone, phân công, chi phí, health tracking

Backend:
  src/modules/projects/

Frontend:
  src/app/pages/ProjectsPage.tsx      ← Export: ProjectsPage, ProjectExpensesPage, ProjectHealthPage
  src/app/pages/ProjectDetailPage.tsx
  src/lib/services/projects.service.ts

Database:
  projects, user_project_assignments
  project_milestones, project_expenses
```

### Module: Khách Hàng & Tài Chính

```
Chức năng: CRM, hợp đồng, hóa đơn, thanh toán, tài liệu

Backend:
  src/modules/clients/    ← Xử lý tất cả: client, contact, contract, invoice, payment, document

Frontend:
  src/app/pages/ClientsPage.tsx
  src/app/pages/ContractsPage.tsx
  src/app/pages/InvoicesPage.tsx  ← Export: InvoicesPage, PaymentsPage
  src/lib/services/clients.service.ts

Database:
  clients, client_contacts, contracts, contract_amendments
  invoices, invoice_items, client_payments, client_documents
```

### Module: Báo Cáo

```
Chức năng: Tổng hợp dữ liệu, export báo cáo

Backend:
  src/modules/reports/    ← Repository có nhiều aggregate query phức tạp

Frontend:
  src/app/pages/ReportsPage.tsx  ← Export: HRReportPage, AttendanceReportPage,
                                           FinanceReportPage, ProjectReportPage,
                                           LeaveReportPage, PayrollReportPage,
                                           OvertimeReportPage
  src/lib/services/reports.service.ts
```

### Module: Thông Báo

```
Chức năng: In-app notification, đọc, xóa

Backend:
  src/modules/notifications/

Frontend:
  src/app/pages/NotificationsPage.tsx
  src/lib/services/notifications.service.ts

Database:
  notifications
```

### Module: Hệ Thống

```
Chức năng: Cấu hình key-value, quản lý tài khoản admin, audit log

Backend:
  src/modules/system/

Frontend:
  src/app/pages/SystemPage.tsx  ← Export: AccountsPage, AuditLogPage, SystemConfigPage
  src/lib/services/system.service.ts

Database:
  system_configs, audit_logs
```

---

## 7. Luồng Nghiệp Vụ Quan Trọng

### 7.1 Luồng Onboarding Nhân Viên Mới
```
Admin tạo user (POST /api/users)
  → accountStatus = PENDING, mustChangePassword = true
  → Hệ thống tạo AuthToken (ACCOUNT_SETUP) lưu hash vào DB
  → Gửi email chứa setup link (token raw) đến nhân viên
  → Nhân viên click link → /setup-account?token=...
  → Frontend gọi POST /api/auth/setup-account { token, password }
  → Backend verify token hash, update passwordHash, set accountStatus = ACTIVE
  → Nhân viên đăng nhập bình thường
```

### 7.2 Luồng Phê Duyệt Nghỉ Phép
```
Employee gửi đơn (POST /api/leave/requests)
  → status = PENDING, currentStep = MANAGER
  → Thông báo gửi đến Manager
Manager phê duyệt (PATCH /api/leave/requests/:id/approve)
  → LeaveRequestApproval step MANAGER = APPROVED
  → currentStep = HR
  → Thông báo gửi đến HR
HR phê duyệt (PATCH /api/leave/requests/:id/approve)
  → LeaveRequestApproval step HR = APPROVED
  → status = APPROVED, finalApprovedAt = now()
  → LeaveBalance.usedDays += totalDays
  → Thông báo gửi lại Employee
```

### 7.3 Luồng Tính Lương
```
HR tạo PayrollPeriod (POST /api/payroll/periods)
  → Lấy danh sách nhân viên active
HR khởi động tính lương (POST /api/payroll/periods/:id/calculate)
  → Với mỗi nhân viên:
    · Lấy UserCompensation (lương cơ bản)
    · Lấy UserSalaryComponents (phụ cấp, KPI...)
    · Tính khấu trừ bảo hiểm (InsurancePolicy)
    · Tính thuế TNCN (TaxPolicy + TaxBrackets)
    · Tính OT bonus từ overtime_requests APPROVED
    · Cộng/trừ PayrollAdjustments
    → Tạo PayrollRecord + PayrollRecordItems
HR review và approve (PATCH /api/payroll/periods/:id/approve)
  → status = APPROVED
```

---

## 8. Quy Ước Code & Patterns

### Backend Patterns
- **Response format:** luôn `{ success: true, data: ..., message: "..." }`
- **Error format:** `{ success: false, code: "ERROR_CODE", message: "..." }`
- **Pagination:** query params `page`, `limit` (max 100, default 20)
- **Soft delete:** dùng `isActive = false` thay vì xóa vật lý
- **Audit log:** mọi mutation quan trọng được ghi tự động qua `auditAction()` middleware
- **Mapper pattern:** mọi entity đều qua mapper trước khi trả về client

### Frontend Patterns
- **Dual mode:** Mock / Real API switch qua `VITE_API_URL`
- **Auth guard:** `Layout.tsx` kiểm tra token trước khi render protected routes
- **Role check:** `can(...roles)` từ `useAuth()` hook
- **Error handling:** `ApiError` class với `status`, `code`, `message`
- **Toast:** dùng `sonner` library cho success/error notifications

---

## 9. Khởi Chạy Dự Án

### Backend
```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env (DATABASE_URL, JWT secrets, mail config)

npm install
npm run db:generate    # Generate Prisma Client
npm run db:migrate:deploy  # Chạy migrations
npm run db:seed        # Seed dữ liệu mẫu
npm run dev            # Development (nodemon)
npm start              # Production
```

### Frontend
```bash
cd frontend
# Tạo .env.local:
# VITE_API_URL=http://localhost:3000/api

npm install
npm run dev    # http://localhost:5173
npm run build  # Build production
```

### Chạy ở chế độ Demo (không cần backend)
```bash
cd frontend
# KHÔNG set VITE_API_URL
npm run dev    # Sẽ dùng mockData.ts
```

---

## 10. File Quan Trọng Cần Đọc Khi Làm Tính Năng Mới

| Muốn làm gì | Đọc file nào |
|---|---|
| Thêm API endpoint mới | `src/modules/[module]/[module].routes.js` → `.controller.js` → `.service.js` → `.repository.js` |
| Thêm field vào DB | `backend/prisma/schema.prisma` → chạy `prisma migrate dev` |
| Thêm validation | `src/modules/[module]/[module].validation.js` (Zod schema) |
| Thêm trang mới frontend | `src/app/pages/` → thêm route vào `src/app/routes.ts` |
| Gọi API mới từ frontend | `src/lib/services/[module].service.ts` |
| Thêm role/permission | `src/config/constants.js` → `src/middlewares/auth.middleware.js` |
| Thay đổi email template | `src/common/services/mail.service.js` |
| Xem cấu trúc response | `src/modules/[module]/[module].mapper.js` |

---

*Tài liệu được tạo tự động từ phân tích codebase ERP InnoVision. Cập nhật lần cuối: 2026-03-28.*
