## Yêu cầu: Cập nhật tính năng Lương & Chu kỳ lương

### Bối cảnh dự án
- Stack: React + TypeScript + Vite + Tailwind
- Dữ liệu hiện tại dùng mockData tại `src/app/data/mockData.ts`
- Schema Prisma vừa được cập nhật lên v3.2

---

### 1. Cập nhật `mockData.ts`

**Mở rộng interface `UserCompensation`** — thêm các field mới:
```ts
export type PayFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';

export interface UserCompensation {
  // --- giữ nguyên các field cũ ---
  id: string;
  userId: string;
  effectiveDate: string;       // ISO date string
  endDate?: string;
  baseSalary: number;
  probationSalary?: number;    // lương thử việc (nếu có)
  salaryType: 'MONTHLY' | 'DAILY' | 'HOURLY';
  standardWorkingDays?: number;
  currency: string;
  overtimeRateWeekday: number; // default 1.5
  overtimeRateWeekend: number; // default 2.0
  overtimeRateHoliday: number; // default 3.0
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;

  // --- field mới thêm ---
  payFrequency: PayFrequency;   // default 'MONTHLY'
  payDayOfMonth?: number;       // 1–31, ngày trả lương trong tháng. undefined = dùng lịch công ty
  probationEndDate?: string;    // ISO date, ngày hết thử việc
  changeReason?: string;        // lý do thay đổi lương, hiển thị cho nhân viên
}
```

Cập nhật toàn bộ data mock `userCompensations[]` hiện tại để thêm các field mới với giá trị hợp lý:
- Nhân viên chính thức (`employmentStatus === 'ACTIVE'`): `payFrequency: 'MONTHLY'`, `payDayOfMonth: 10`, `changeReason: 'Lương khởi điểm'`
- Nhân viên thử việc (`employmentStatus === 'PROBATION'`): thêm `probationSalary` = 85% `baseSalary`, `probationEndDate` = hireDate + 2 tháng, `changeReason: 'Lương thử việc'`

Thêm helper function vào mockData:
```ts
// Tính ngày trả lương tiếp theo dựa vào UserCompensation active
export function getNextPayDate(userId: string): string | null
// Trả về ISO date string hoặc null nếu không có dữ liệu
// Logic:
//   - Lấy compensation isActive=true của userId
//   - Nếu payDayOfMonth = undefined → trả null (dùng lịch công ty)
//   - Nếu payFrequency = 'MONTHLY':
//       today <= payDayOfMonth của tháng này → nextPay = tháng này/payDayOfMonth
//       else → nextPay = tháng sau/payDayOfMonth
//   - Nếu payFrequency = 'BIWEEKLY':
//       2 ngày trả: payDayOfMonth và ngày cuối tháng
//       trả ngày gần nhất chưa qua
//   - Nếu payFrequency = 'WEEKLY': ngày thứ Sáu tuần tới
```

---

### 2. Cập nhật `EmployeeDetailPage.tsx` — Tab "Lịch sử lương"

Tab hiện tại tại `activeTab === 'compensation'` cần được nâng cấp:

**2a. Card tóm tắt lương hiện tại** (thêm vào đầu tab, trước danh sách lịch sử):
Hiển thị compensation `isActive = true`:
- Lương cơ bản (baseSalary)
- Loại lương (salaryType: Tháng / Ngày / Giờ)
- Chu kỳ trả lương (payFrequency label: "Hàng tháng" / "2 lần/tháng" / "Hàng tuần")
- Ngày trả lương: "Ngày [payDayOfMonth] hàng tháng" hoặc "Ngày [payDayOfMonth] & cuối tháng" hoặc "Thứ Sáu hàng tuần"
- Ngày trả tiếp theo: dùng `getNextPayDate(userId)` — format "dd/MM/yyyy"
- Nếu đang thử việc: hiển thị thêm lương thử việc và ngày hết thử việc với badge màu vàng

**2b. Danh sách lịch sử** — mỗi item thêm:
- Hiển thị `changeReason` dưới mức lương (text muted, nhỏ)
- Hiển thị `payDayOfMonth` nếu khác null: "Trả ngày [X] hàng tháng"

**2c. Dialog "Thêm kỳ lương mới" (`AddCompensationDialog`)** — bổ sung các field:
```
- Mức lương mới (đã có)
- Ngày hiệu lực (đã có)  
- Lý do thay đổi * (changeReason) — input text, required
- Loại lương (salaryType) — select: Tháng / Ngày / Giờ
- Chu kỳ trả lương (payFrequency) — radio: Hàng tháng / 2 lần/tháng / Hàng tuần
- Ngày trả lương trong tháng (payDayOfMonth) — number input 1–31, 
  chỉ hiện khi payFrequency = MONTHLY hoặc BIWEEKLY
- Đây là lương thử việc? (checkbox)
  Nếu check → hiện thêm:
    + Lương thử việc (probationSalary) — number input
    + Ngày hết thử việc (probationEndDate) — date input
```

---

### 3. Cập nhật form tạo nhân viên mới trong `EmployeesPage.tsx`

Form tạo nhân viên hiện tại cần thêm **Step cuối: "Cài đặt lương khởi điểm"** (optional, có thể bỏ qua).

Nội dung step này:
```
- Lương cơ bản *
  → number input, placeholder "VD: 15.000.000"
  → hiển thị formatted VND realtime bên dưới

- Loại lương
  → select: Tháng / Ngày / Giờ (default: Tháng)

- Đây là lương thử việc?
  → checkbox, default checked nếu employmentStatus = PROBATION
  Nếu checked → hiện thêm:
    + Lương thử việc = [X]% lương chính thức
      (auto-fill = 85% baseSalary, user có thể override)
    + Ngày hết thử việc (date input, default = hireDate + 2 tháng)

- Ngày trả lương hàng tháng
  → number input 1–31, default: 10
  → helper text: "Nhân viên sẽ nhận lương vào ngày này hàng tháng"

- Lý do / Ghi chú
  → textarea, placeholder "VD: Lương khởi điểm theo offer letter"
```

Khi submit tạo nhân viên: nếu có điền lương thì tự động tạo luôn 1 record `UserCompensation` với `isActive: true`, `effectiveDate = hireDate`, `changeReason = lý do đã nhập`.

Nếu bỏ qua step lương: vẫn tạo được nhân viên bình thường, lương sẽ chưa có (hiển thị badge "Chưa có lương" trong danh sách nhân viên).

---

### 4. Cập nhật `PayrollPage.tsx` — Employee view

Trong `EmployeePayslipView`, phần "My salary summary" (4 card đầu trang), cập nhật:

**Card 1 — Lương cơ bản**: giữ nguyên
**Card 2 — Phụ cấp**: giữ nguyên  
**Card 3 — Ngày trả lương tiếp theo** (thay card "NET TB/tháng"):
- Tiêu đề: "Ngày nhận lương"
- Giá trị: dùng `getNextPayDate(userId)` format "dd/MM/yyyy"
- Sub-text: "Ngày [payDayOfMonth] hàng tháng" hoặc chu kỳ tương ứng
- Nếu null: hiển thị "Theo lịch công ty"

**Card 4 — Kỳ lương tiếp theo** (thay card "Số kỳ lương"):
- Tiêu đề: "Kỳ lương tiếp theo"
- Giá trị: tên kỳ lương DRAFT/CALCULATING gần nhất (VD: "T3/2026")
- Status badge màu tương ứng
- Nếu không có: "Chưa mở kỳ"

Thêm section mới **"Thông tin lương hiện tại"** dạng card ngang phía trên danh sách payslips:
```
[ Lương CB: 25.000.000đ ] [ Chu kỳ: Hàng tháng • Ngày 10 ] [ Hiệu lực từ: 01/01/2025 ]
[ Lý do: Lương khởi điểm theo offer letter ]
```
Nếu đang thử việc: thêm dòng với icon đồng hồ màu vàng:
```
Thử việc đến [probationEndDate] • Lương thử việc: [probationSalary]đ
```

---

### 5. Yêu cầu chung
- Giữ nguyên toàn bộ style/design system hiện tại (Tailwind classes, màu sắc, font-size pattern đang dùng)
- Không thay đổi các tính năng cũ, chỉ thêm mới
- Toast success/error cho các action mới
- Tất cả số tiền dùng `formatFullVND()` / `formatVND()` đã có sẵn trong mockData