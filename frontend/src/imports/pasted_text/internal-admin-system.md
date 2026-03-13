# Hệ thống Quản trị Nội bộ — Innovision
# Dựa trên schema.prisma(enums.txt) + seed.js

# ============================================================
# Figma AI: đọc kỹ phần này trước khi thiết kế.
# Toàn bộ cấu trúc dữ liệu, mock data, quan hệ bảng
# đều lấy từ schema.prisma v3.0 và seed.js v3.0 đính kèm.
# Ngôn ngữ giao diện: Tiếng Việt. Theme: Dark / Light toggle.
# ============================================================

---

## 1. TRIẾT LÝ DỮ LIỆU CỐT LÕI

### User = Tài khoản = Nhân viên (KHÔNG có bảng Employee riêng)
- Mọi người dùng trong hệ thống đều là nhân viên công ty.
- Không có tự đăng ký. Admin/HR tạo tài khoản → nhân viên nhận email kích hoạt → đặt mật khẩu lần đầu.
- `accountStatus`: PENDING → ACTIVE → LOCKED / DISABLED
- `employmentStatus`: PROBATION | ACTIVE | ON_LEAVE | TERMINATED
- `mustChangePassword = true` → bắt đổi mật khẩu khi đăng nhập
- **Manager là một User** được gán qua `managerId` (self-reference trên bảng `users`).
- `UserProfile` gắn 1-1 với User: chứa CCCD, MST, BHXH, BHYT, ngân hàng, địa chỉ, người phụ thuộc (`dependantCount`) — chỉ HR/Admin và bản thân xem được.

### Chấm công qua yêu cầu (AttendanceRequest)
- Nhân viên KHÔNG tự ghi vào bảng chấm công.
- Nhân viên gửi `AttendanceRequest` (type: CHECK_IN hoặc CHECK_OUT, status: PENDING).
- Admin/HR duyệt → ghi vào `AttendanceRecord` chính thức.
- `AttendanceRecord.status`: PRESENT | ABSENT | LEAVE | HOLIDAY | MANUAL_ADJUSTED

---

## 2. TÀI KHOẢN DEMO (từ seed.js)

| Email | Họ tên | Role(s) | Phòng ban | Chức danh |
|-------|--------|---------|-----------|-----------|
| admin@techvn.com | System Admin | ADMIN | Ban Giám Đốc | CEO |
| nguyen.van.an@techvn.com | Nguyễn Văn An | ADMIN + MANAGER | Ban Giám Đốc | Giám đốc điều hành |
| tran.thi.bich@techvn.com | Trần Thị Bích | MANAGER | Phòng Kỹ Thuật | Giám đốc kỹ thuật |
| le.van.cuong@techvn.com | Lê Văn Cường | HR | Phòng Nhân Sự | Trưởng phòng nhân sự |
| mai.thi.linh@techvn.com | Mai Thị Linh | HR | Phòng Nhân Sự | Chuyên viên nhân sự |
| pham.thi.dung@techvn.com | Phạm Thị Dung | SALES + MANAGER | Phòng Kinh Doanh | Trưởng phòng kinh doanh |
| hoang.van.em@techvn.com | Hoàng Văn Em | ACCOUNTANT + MANAGER | Phòng Tài Chính | Giám đốc tài chính |
| nguyen.minh.giang@techvn.com | Nguyễn Minh Giang | EMPLOYEE | Phòng Kỹ Thuật | Senior Developer |
| vo.thi.huong@techvn.com | Võ Thị Hương | EMPLOYEE | Phòng Kỹ Thuật | Developer |
| tran.van.hung@techvn.com | Trần Văn Hùng | EMPLOYEE | Phòng BA | Business Analyst |
| le.thi.lan@techvn.com | Lê Thị Lan | SALES | Phòng Kinh Doanh | Sales Executive |
| dinh.van.khoa@techvn.com | Đinh Văn Khoa | ACCOUNTANT | Phòng Tài Chính | Kế toán viên |

Mật khẩu chung: **TechVN@2025**

---

## 3. ROLES & PHÂN QUYỀN

| Role | Code | Mô tả |
|------|------|--------|
| Quản trị hệ thống | ADMIN | Toàn quyền |
| Nhân sự | HR | Quản lý nhân sự, lương, nghỉ phép, duyệt chấm công |
| Quản lý | MANAGER | Quản lý phòng ban/dự án, duyệt nghỉ phép bước 1, duyệt OT |
| Nhân viên | EMPLOYEE | Tự phục vụ: chấm công, nghỉ phép, OT, xem lương |
| Kinh doanh | SALES | Khách hàng, hợp đồng, hóa đơn |
| Kế toán | ACCOUNTANT | Bảng lương, thanh toán, hóa đơn |

> Một User có thể có nhiều role cùng lúc (ví dụ: SALES + MANAGER). Giao diện hiển thị tính năng theo union của tất cả roles.

---

## 4. PHÂN QUYỀN THEO TÍNH NĂNG

### 4.1 Nhân sự

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE |
|-----------|-------|----|---------|----------|
| Xem danh sách nhân viên | Tất cả | Tất cả | Phòng mình | Chỉ tên + phòng ban |
| Tạo tài khoản nhân viên | ✅ | ✅ | ❌ | ❌ |
| Chỉnh sửa thông tin | ✅ | ✅ | ❌ | Chỉ của mình |
| Xem/sửa UserProfile (CCCD, BHXH, ngân hàng) | ✅ | ✅ | ❌ | Chỉ của mình |
| Gán Manager / phòng ban / chức danh | ✅ | ✅ | ❌ | ❌ |
| Vô hiệu hóa tài khoản | ✅ | ✅ | ❌ | ❌ |
| Quản lý Phòng ban & Chức danh (CRUD) | ✅ | ✅ | ❌ | ❌ |

**Flow tạo nhân viên mới:**
```
Admin/HR tạo → accountStatus=PENDING, mustChangePassword=true
→ Hệ thống tạo AuthToken (type: ACCOUNT_SETUP) → gửi email kích hoạt
→ Nhân viên click link → đặt mật khẩu → accountStatus=ACTIVE
→ HR cấu hình UserCompensation + UserSalaryComponent + LeaveBalance
```

---

### 4.2 Chấm công (AttendanceRequest + AttendanceRecord)

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE | SALES | ACCOUNTANT |
|-----------|-------|----|---------|----------|-------|------------|
| Gửi yêu cầu Check-in/Check-out | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duyệt / Từ chối yêu cầu | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem bảng chấm công cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem bảng chấm công toàn công ty | ✅ | ✅ | Phòng mình | ❌ | ❌ | ❌ |
| Điều chỉnh thủ công (MANUAL_ADJUSTED) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quản lý WorkShift & Holiday | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**WorkShift (từ schema):** MORNING | AFTERNOON | NIGHT | FLEXIBLE | SPLIT

**Màu AttendanceRecord.status:**
- PRESENT = xanh lá | ABSENT = xám | LEAVE = xanh dương nhạt | HOLIDAY = cam | MANUAL_ADJUSTED = vàng

**Flow chấm công:**
```
Nhân viên → AttendanceRequest (type=CHECK_IN, status=PENDING)
→ Notification → tất cả HR + Admin
→ Admin/HR duyệt → ghi checkInAt vào AttendanceRecord
→ Tương tự CHECK_OUT → ghi checkOutAt, tính totalWorkMinutes / lateMinutes / earlyLeaveMinutes
```

---

### 4.3 Nghỉ phép (LeaveRequest → LeaveRequestApproval → LeaveBalance)

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE | SALES | ACCOUNTANT |
|-----------|-------|----|---------|----------|-------|------------|
| Tạo đơn nghỉ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hủy đơn PENDING của mình | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem tất cả đơn nghỉ | ✅ | ✅ | Phòng mình | ❌ | ❌ | ❌ |
| Duyệt bước 1 (MANAGER) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Duyệt bước 2 final (HR) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem số dư phép của mình | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Điều chỉnh số dư phép NV khác | ✅ | ✅ | Phòng mình (xem) | ❌ | ❌ | ❌ |
| Quản lý LeaveType | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**LeaveBalance (từ schema):** `entitledDays`, `carriedDays`, `adjustedDays`, `usedDays`, `pendingDays`, `remainingDays`

**Loại phép (LeaveType từ schema):** Nghỉ phép năm (isPaid=true), Nghỉ ốm (isPaid=true, requiresDocument=true), Nghỉ thai sản, Nghỉ tang (isPaid=true), Nghỉ cưới (isPaid=true), Nghỉ không lương (isPaid=false), Nghỉ bù

**Flow duyệt 2 bước:**
```
Tạo đơn → LeaveRequest(status=PENDING, currentStep=MANAGER) + pendingDays tăng
→ Manager duyệt bước 1 → LeaveRequestApproval(stepType=MANAGER, APPROVED) → currentStep=HR
→ HR duyệt bước 2 → status=APPROVED + usedDays tăng, pendingDays giảm, remainingDays giảm
(Hoặc bất kỳ bước nào từ chối → status=REJECTED, pendingDays trả về)
```

---

### 4.4 Làm thêm giờ — OT (OvertimeRequest)

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE | SALES | ACCOUNTANT |
|-----------|-------|----|---------|----------|-------|------------|
| Gửi/hủy yêu cầu OT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duyệt / Từ chối OT | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem tất cả OT | ✅ | ✅ | Phòng mình | ❌ | ❌ | ❌ |

**Hệ số OT (từ schema `UserCompensation.otMultiplier`):**
- Ngày thường: 1.5× | Cuối tuần: 2.0× | Ngày lễ: 3.0×

**Khi tạo OT Request hiển thị ngay:** "= X.X giờ | Hệ số: 1.5× | Dự kiến thêm: X.XXX đ"

---

### 4.5 Bảng lương (Payroll)

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE | SALES | ACCOUNTANT |
|-----------|-------|----|---------|----------|-------|------------|
| Xem payslip của mình | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem bảng lương toàn bộ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Tạo kỳ lương / trigger tính lương | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Phê duyệt bảng lương (final) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Đánh dấu đã chi trả (PAID) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Tạo/duyệt điều chỉnh (bonus/advance/deduct) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Cấu hình UserCompensation + SalaryComponent | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quản lý InsurancePolicy + TaxPolicy/TaxBracket | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

**PayrollPeriod.status:** DRAFT → CALCULATING → APPROVED → PAID → CANCELLED

**PayrollRecordItem.sourceType (từ schema):** BASE | ALLOWANCE | BONUS | OVERTIME | ATTENDANCE | LEAVE | MANUAL | TAX | INSURANCE | ADVANCE

**Tính lương:**
```
Gross = BASE + ALLOWANCE + OVERTIME + BONUS - DEDUCTION
Khấu trừ = BHXH 8% + BHYT 1.5% + BHTN 1% (trần 36tr) + Thuế TNCN lũy tiến 7 bậc
Net = Gross - Khấu trừ
```

**Payslip layout:**
- Phần THU (xanh): Lương cơ bản | Từng phụ cấp | OT (X giờ × Y đ × hệ số) | Bonus → **Tổng Gross**
- Phần TRỪ (đỏ): BHXH | BHYT | BHTN | Thuế TNCN → **Tổng khấu trừ**
- **NET NHẬN VỀ** — số to, màu nổi bật nhất trang

---

### 4.6 Dự án (Project + Milestone + ProjectExpense)

| Tính năng | ADMIN | HR | MANAGER | EMPLOYEE | SALES | ACCOUNTANT |
|-----------|-------|----|---------|----------|-------|------------|
| Xem tất cả dự án | ✅ | ✅ | ✅ | Được giao | ✅ | ✅ |
| Tạo / Chỉnh sửa dự án | ✅ | ❌ | Là PM | ❌ | ❌ | ❌ |
| Gán thành viên (UserProjectAssignment) | ✅ | ❌ | Là PM | ❌ | ❌ | ❌ |
| Gán PM (`projectManagerUserId`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quản lý Milestone | ✅ | ❌ | Là PM | Được giao | ❌ | ❌ |
| Submit ProjectExpense | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Duyệt ProjectExpense | ✅ | ❌ | Là PM | ❌ | ❌ | ✅ |
| Cập nhật healthStatus | ✅ | ❌ | Là PM | ❌ | ❌ | ❌ |

**ProjectStatus:** PLANNING → ACTIVE → ON_HOLD ↔ ACTIVE → COMPLETED / CANCELLED → ARCHIVED
**ProjectHealthStatus:** ON_TRACK 🟢 | AT_RISK 🟡 | DELAYED 🔴
**MilestoneStatus:** PENDING | IN_PROGRESS | DONE | OVERDUE
**ProjectExpenseCategory:** LABOR | SOFTWARE | HARDWARE | TRAVEL | TRAINING | SUBCONTRACT | OTHER

**PM là một User** được gán qua `projectManagerUserId` — không phải role cố định, PM dự án này có thể là nhân viên thường ở dự án khác.

---

### 4.7 Khách hàng (Client + ClientContact + ClientDocument)

| Tính năng | ADMIN | MANAGER | SALES | ACCOUNTANT |
|-----------|-------|---------|-------|------------|
| Xem danh sách Client | ✅ | ✅ | ✅ | ✅ |
| Tạo / Chỉnh sửa Client | ✅ | ❌ | ✅ | ❌ |
| Quản lý ClientContact | ✅ | ❌ | ✅ | ❌ |
| Quản lý ClientDocument | ✅ | ❌ | ✅ | ✅ |
| Xem tài liệu mật (isConfidential=true) | ✅ | ❌ | ✅ | ✅ |
| Gán accountManagerUserId (là một User) | ✅ | ❌ | ✅ | ❌ |

**ClientStatus:** PROSPECT → ACTIVE → INACTIVE / BLACKLISTED
**ClientType:** INDIVIDUAL | COMPANY | GOVERNMENT | NGO

---

### 4.8 Hợp đồng (Contract + ContractAmendment)

| Tính năng | ADMIN | SALES | ACCOUNTANT |
|-----------|-------|-------|------------|
| Xem danh sách Contract | ✅ | ✅ | ✅ |
| Tạo / Chỉnh sửa (DRAFT/PENDING_SIGN) | ✅ | ✅ | ❌ |
| Gửi để ký (→ PENDING_SIGN) | ✅ | ✅ | ❌ |
| Ký hợp đồng (`signedByUserId`) | ✅ | ❌ | ❌ |
| Tạo ContractAmendment | ✅ | ✅ | ❌ |
| Kết thúc / Chấm dứt | ✅ | ❌ | ❌ |

**ContractStatus:** DRAFT → PENDING_SIGN → ACTIVE → COMPLETED / TERMINATED / SUSPENDED / EXPIRED
**ContractType:** FIXED_PRICE | TIME_AND_MATERIAL | RETAINER | MILESTONE_BASED | MIXED
**Người ký** là User trong hệ thống (`signedByUserId`) — thường là Admin/Director.

---

### 4.9 Hóa đơn & Thanh toán (Invoice + InvoiceItem + ClientPayment)

| Tính năng | ADMIN | SALES | ACCOUNTANT |
|-----------|-------|-------|------------|
| Xem / Tạo Invoice | ✅ | ✅ | ✅ |
| Gửi hóa đơn (→ SENT) | ✅ | ✅ | ✅ |
| Ghi nhận thanh toán | ✅ | ✅ | ✅ |
| Xác nhận thanh toán (`confirmedByUserId`) | ✅ | ❌ | ✅ |
| Hủy hóa đơn | ✅ | ❌ | ✅ |

**InvoiceStatus:** DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID / OVERDUE / DISPUTED / CANCELLED
**PaymentMethod:** BANK_TRANSFER | CASH | CHECK | CREDIT_CARD | ONLINE | CRYPTO

---

### 4.10 Hệ thống (ADMIN only)

- Tạo / Gán / Thu hồi Role cho User
- Khoá / Mở khoá / Reset mật khẩu tài khoản
- Xem AuditLog toàn hệ thống (entityType, actionType, actorUserId, oldValues ↔ newValues diff)
- Cấu hình SalaryComponent, InsurancePolicy, TaxPolicy + TaxBracket

---

## 5. CẤU TRÚC SIDEBAR THEO ROLE
```
ADMIN / HR:
├── 🏠 Dashboard
├── 👥 Nhân Sự
│   ├── Danh sách nhân viên
│   ├── Phòng ban
│   └── Chức danh
├── 🕐 Chấm Công
│   ├── Yêu cầu chấm công (duyệt check-in/out) ← badge số pending
│   ├── Bảng chấm công tổng hợp
│   ├── Yêu cầu OT
│   ├── Ca làm việc (WorkShift)
│   └── Ngày lễ (Holiday)
├── 📅 Nghỉ Phép
│   ├── Quản lý đơn nghỉ
│   └── Số dư phép
├── 💰 Bảng Lương
│   ├── Kỳ lương (PayrollPeriod)
│   ├── Điều chỉnh lương (PayrollAdjustment)
│   ├── Cấu hình lương NV (UserCompensation)
│   ├── Thành phần lương (SalaryComponent)
│   ├── Bảo hiểm (InsurancePolicy)
│   └── Thuế TNCN (TaxPolicy + TaxBracket)
├── 📁 Dự Án
│   ├── Danh sách dự án
│   └── Chi phí dự án (ProjectExpense)
├── 🤝 Khách Hàng
│   ├── Danh sách khách hàng
│   ├── Hợp đồng
│   ├── Hóa đơn
│   └── Thanh toán (ClientPayment)
└── ⚙️ Hệ Thống (ADMIN only)
    ├── Tài khoản & Phân quyền
    └── Nhật ký hệ thống (AuditLog)

MANAGER:
├── 🏠 Dashboard (nhân viên phòng mình, OT/phép chờ duyệt)
├── 👥 Nhân viên phòng mình
├── 🕐 Chấm công phòng mình (xem)
├── 📅 Phê duyệt nghỉ phép (bước 1)
├── ⏱️ Phê duyệt OT
└── 📁 Dự án (được giao làm PM)

EMPLOYEE / SALES / ACCOUNTANT:
├── 🏠 Dashboard cá nhân
├── 🕐 Chấm công của tôi
│   ├── Gửi yêu cầu Check-in / Check-out
│   └── Lịch sử chấm công (calendar tháng)
├── ⏱️ OT của tôi
├── 📅 Nghỉ phép của tôi
├── 💰 Payslip của tôi
├── 📁 Dự án (được giao)
└── [SALES] Khách hàng / Hợp đồng / Hóa đơn
    [ACCOUNTANT] Bảng lương / Hóa đơn / Thanh toán
```

---

## 6. MÔ TẢ CÁC TRANG CHÍNH

### 6.1 Trang đăng nhập
- Email + mật khẩu. Không có "Đăng ký".
- `accountStatus=PENDING` → trang đặt mật khẩu lần đầu (AuthToken type: ACCOUNT_SETUP)
- `mustChangePassword=true` → trang đổi mật khẩu bắt buộc
- `accountStatus=LOCKED` → hiện "Tài khoản bị khoá đến [lockedUntil]. Liên hệ HR."
- `accountStatus=DISABLED` → hiện "Tài khoản đã bị vô hiệu hóa. Liên hệ HR."
- Có các nút "Đăng nhập nhanh" cho từng role demo.

### 6.2 Dashboard
- **ADMIN/HR:** Tổng nhân viên | Thử việc (PROBATION) | Nghỉ phép hôm nay | Check-in chờ duyệt (badge đỏ) | OT chờ duyệt | Tổng lương tháng | Doanh thu tháng | HĐ sắp hết hạn | Invoice OVERDUE
- **MANAGER:** Nhân viên phòng + trạng thái hôm nay | Đơn nghỉ chờ duyệt bước 1 | OT chờ duyệt | Milestone sắp deadline
- **EMPLOYEE:** Nút Check-in to nổi bật | Số dư phép (`remainingDays` từng loại) | Payslip tháng gần nhất | Dự án đang tham gia

### 6.3 Danh sách nhân viên (Admin/HR/Manager)
- Bảng: Avatar | `userCode` | `fullName` | `department.name` | `jobTitle.name` | Manager (tên User) | `employmentStatus` (badge) | `accountStatus` (badge) | `hireDate`
- Filter: Phòng ban | `employmentStatus` | `accountStatus` | Tìm tên/email/mã
- Nút "+ Thêm nhân viên"

### 6.4 Chi tiết nhân viên (tabs)

**Tab Thông tin:** `fullName`, `email`, `phoneNumber`, `department`, `jobTitle`, Manager, `hireDate`, `employmentStatus`, roles (badges)

**Tab Hồ sơ** *(HR/Admin + bản thân)*: `UserProfile` — `nationalIdNumber`, `taxCode`, `socialInsuranceNumber`, `healthInsuranceNumber`, `bankName`, `bankAccountNumber`, `bankAccountHolder`, `permanentAddress`, `dependantCount`, `emergencyContactName`

**Tab Lương** *(HR/Admin)*: `UserCompensation` — `baseSalary`, `salaryType`, `otMultiplier`, `probationSalary` | `UserSalaryComponent` — từng phụ cấp đang áp dụng | lịch sử thay đổi

**Tab Chấm công:** Calendar tháng | Thống kê: tổng ngày PRESENT, tổng `lateMinutes`, tổng OT | AttendanceRequest đang PENDING

**Tab Nghỉ phép:** Progress bar từng `LeaveBalance` (usedDays / entitledDays) | Lịch sử `LeaveRequest`

### 6.5 Trang yêu cầu chấm công

**Admin/HR — "Danh sách chờ duyệt":**
- Tabs: **Check-in đang chờ** | **Check-out đang chờ** | **Đã xử lý hôm nay**
- Bảng: Avatar + Tên | `requestDate` | `requestedTime` | Ca làm việc | `isWfh` | `notes` | Ảnh (nếu có) | [Duyệt ✅] [Từ chối ❌]
- Nút "Duyệt tất cả" (bulk)
- Từ chối → dialog yêu cầu `rejectionReason` (bắt buộc)
- Badge số pending trên sidebar

**Nhân viên — "Chấm công của tôi":**
- Nút lớn: **"📍 Gửi yêu cầu Check-in"** (nếu hôm nay chưa có AttendanceRecord.checkInAt)
- Sau khi gửi: **"🚪 Gửi yêu cầu Check-out"**
- Trạng thái yêu cầu hôm nay: PENDING ⏳ / APPROVED ✅ / REJECTED ❌ + lý do
- Calendar tháng màu theo `AttendanceStatus`
- Click ngày → popup: `checkInAt`, `checkOutAt`, `totalWorkMinutes`, `lateMinutes`, `overtimeMinutes`

**Form Check-in:**
- `requestDate`* (mặc định hôm nay)
- `requestedTime`* (time picker)
- Ca làm việc (dropdown WorkShift: MORNING/AFTERNOON/NIGHT/FLEXIBLE/SPLIT)
- `isWfh` (toggle)
- `notes` (textarea)
- Upload ảnh (tùy chọn)

**Form Check-out:**
- `requestDate`*, `requestedTime`*, `notes`

### 6.6 Trang nghỉ phép

**Nhân viên:**
- Header: `LeaveBalance` từng loại — progress bar mini (usedDays / entitledDays), hiện `remainingDays`
- Nút "+ Tạo đơn nghỉ"
- Lịch sử `LeaveRequest`: PENDING=vàng | APPROVED=xanh | REJECTED=đỏ | CANCELLED=xám
- Chi tiết đơn: timeline approval 2 bước (Bước 1: MANAGER → Bước 2: HR), hiện comment từng bước

**Form tạo đơn:**
- `leaveType`* (dropdown) → nếu `requiresDocument=true` hiện chú thích "Cần đính kèm giấy tờ"
- `startDate`* | `endDate`* → tự tính `totalDays`
- `isHalfDay` toggle → dropdown `halfDayPeriod` (MORNING / AFTERNOON)
- `reason` (textarea)
- Upload file (nếu `requiresDocument=true`)
- Hiện: "Số dư sau khi nghỉ: Y ngày"

**Admin/HR/Manager:**
- Tabs: Chờ duyệt | Đã duyệt | Từ chối | Tất cả
- Filter: Phòng ban | LeaveType | Tháng
- Duyệt/Từ chối: dialog + textarea `comment`

### 6.7 Trang kỳ lương

**Danh sách PayrollPeriod (cards):**
- Card: Tháng/Năm | `status` (badge màu) | Số NV | Tổng Net
- Click → Dialog chi tiết kỳ lương

**Dialog chi tiết kỳ lương:**
- Summary: Tổng Gross | Tổng Net | Số NV | Tổng khấu trừ
- Bảng: Tên NV | Lương CB | Phụ cấp | OT | Bonus | Gross | BHXH | BHYT | BHTN | Thuế TNCN | **NET**
- Click tên NV → Popup Payslip chi tiết
- Buttons theo `PayrollPeriodStatus`:
  - DRAFT: **"Tính lương"** (HR/Accountant)
  - CALCULATING: loading spinner
  - CALCULATING xong: **"Phê duyệt"** (ADMIN only) → AlertDialog xác nhận
  - APPROVED: **"Đánh dấu đã chi trả"** (ADMIN/Accountant) → AlertDialog

### 6.8 Payslip
- Header: TechVN | Tên nhân viên | Kỳ lương | PAID badge
- Phần THU: từng `PayrollRecordItem` (sourceType: BASE, ALLOWANCE, OVERTIME, BONUS) → **Tổng Gross**
- Phần TRỪ: INSURANCE (BHXH/BHYT/BHTN), TAX → **Tổng khấu trừ**
- **NET NHẬN VỀ** (số to nhất trang)
- Nút "Tải PDF" (mock)

### 6.9 Trang dự án
- Card grid: Tên DA | `client.name` | PM (`projectManagerUserId` → User avatar + tên) | `healthStatus` badge | Tiến độ milestone (% DONE) | Budget vs `actualCost` | `endDate`
- Click → Dialog/trang chi tiết tabs:
  - **Tổng quan:** Mô tả, `status`, `priority`, ngày, budget
  - **Team:** `UserProjectAssignment` — User, `role`, `startDate`, `isBillable` | Nút "+ Thêm thành viên"
  - **Milestones:** `ProjectMilestone` — tên, `dueDate`, `assignedToUserId` (User), `status` | Nút đổi trạng thái
  - **Chi phí:** `ProjectExpense` — `category`, `amount`, người submit (User), `status` duyệt
  - **Hóa đơn:** Invoice liên kết (`projectId`)

### 6.10 Trang khách hàng
- Bảng: Logo | `clientCode` | `name` | `clientType` | `status` | Account Manager (User) | Số HĐ | Doanh thu | Còn nợ (`outstandingAmount`)
- Click → Dialog tabs: Thông tin | Liên hệ (`ClientContact`, isPrimary) | Hợp đồng | Hóa đơn | Thanh toán | Tài liệu (`ClientDocument`, isConfidential badge)

### 6.11 Trang hợp đồng
- Bảng: `contractCode` | `client.name` | `contractType` | `totalValue` | `receivedAmount` | `remainingAmount` | `status` | `signedDate` | `endDate`
- Click → Dialog tabs: Tổng quan | Hóa đơn | Thanh toán | Phụ lục (`ContractAmendment`) | File đính kèm
- Actions theo status: Gửi để ký → Ký hợp đồng → Kết thúc/Chấm dứt

### 6.12 Trang Tài khoản & Phân quyền (ADMIN only)
- Bảng: Avatar | `fullName` | `email` | Roles (badges) | `accountStatus` | `createdAt` | `lastLoginAt`
- Nút "+ Tạo tài khoản": form — `email`*, `fullName`*, role(s)*, `departmentId`, `jobTitleId`, `managerId`, `hireDate`
- Actions: Đổi role | Khoá/Mở khoá (`lockedUntil`) | Reset mật khẩu (tạo AuthToken ACCOUNT_SETUP) | Vô hiệu hóa

### 6.13 Trang AuditLog (ADMIN only)
- Bảng: `createdAt` | `actorUser` (tên) | `entityType` | `actionType` | `description` | `ipAddress`
- Filter: Khoảng thời gian | User | `entityType` | `actionType`
- Click row → Dialog diff: `oldValues` (đỏ) vs `newValues` (xanh)

---

## 7. HỆ THỐNG THÔNG BÁO (Notification)

**Bell icon header:** Badge đỏ số `isRead=false`. Click → dropdown panel.

**Mỗi Notification:**
- Icon theo `NotificationType` | `title` (bold nếu `isRead=false`) | `message` | `createdAt` ("vừa xong", "5 phút trước")
- Background highlight nhạt nếu chưa đọc
- Click → `readAt=now()` + navigate đến `actionUrl`
- Nút "Đánh dấu tất cả đã đọc"

**NotificationType → người nhận:**
| NotificationType | Người nhận |
|-----------------|-----------|
| ATTENDANCE_CHECKIN_REQUEST / CHECKOUT_REQUEST | Tất cả HR + Admin |
| ATTENDANCE_REQUEST_APPROVED / REJECTED | Nhân viên gửi yêu cầu |
| LEAVE_REQUEST_CREATED | `manager` của User (`managerId`) |
| LEAVE_REQUEST_APPROVED (bước 1) | Tất cả HR |
| LEAVE_REQUEST_APPROVED / REJECTED (final) | Nhân viên xin nghỉ |
| OVERTIME_REQUEST_CREATED | Manager trực tiếp + HR |
| OVERTIME_APPROVED / REJECTED | Nhân viên gửi OT |
| PAYSLIP_AVAILABLE | Tất cả nhân viên trong PayrollPeriod |
| CONTRACT_EXPIRING_SOON | ADMIN + SALES |
| INVOICE_OVERDUE | ADMIN + ACCOUNTANT |

---

## 8. GHI CHÚ THIẾT KẾ

- **Theme:** Dark / Light toggle ở header
- **Ngôn ngữ:** Tiếng Việt toàn bộ
- **Layout:** Desktop-first, responsive xuống tablet
- **Tên công ty:** TechVN
- **Tiền tệ:** VND — hiển thị "25.000.000 ₫" hoặc "25tr"
- **Badge màu nhất quán:** xanh lá = tốt/active | vàng = chờ/pending | đỏ = lỗi/overdue/khẩn | xám = đã hủy/inactive | cam = holiday | xanh dương nhạt = leave
- **Empty state:** Minh họa + text + nút CTA
- **Loading:** Skeleton loader cho bảng và card
- **Form validation:** Inline error, required field có dấu *
- **Confirmation dialog:** Mọi action không thể hoàn tác
- **Số liệu tài chính:** Format số có dấu chấm ngăn cách hàng nghìn