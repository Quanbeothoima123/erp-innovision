import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { SetupAccountPage } from "./pages/SetupAccountPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { DepartmentsPage, JobTitlesPage } from "./pages/DepartmentsPage";
import {
  MyAttendancePage,
  ShiftsPage,
  HolidaysPage,
} from "./pages/AttendancePage";
import { AttendanceAdminPage } from "./pages/AttendanceAdminPage";
import { LeaveRequestsPage, LeaveBalancesPage } from "./pages/LeavePage";
import { OvertimePage } from "./pages/OvertimePage";
import {
  PayrollPage,
  PayrollAdjustmentsPage,
  PayrollConfigPage,
} from "./pages/PayrollPage";
import {
  ProjectsPage,
  ProjectExpensesPage,
  ProjectHealthPage,
} from "./pages/ProjectsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { InvoicesPage, PaymentsPage } from "./pages/InvoicesPage";
import {
  AccountsPage,
  AuditLogPage,
  SystemShiftsPage,
  SystemHolidaysPage,
  SystemConfigPage,
} from "./pages/SystemPage";
import {
  HRReportPage,
  AttendanceReportPage,
  FinanceReportPage,
  ProjectReportPage,
  LeaveReportPage,
} from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: "/login", Component: LoginPage },
      { path: "/setup-account", Component: SetupAccountPage },
      { path: "/forgot-password", Component: ForgotPasswordPage },
      { path: "/reset-password", Component: ResetPasswordPage },
      { path: "/change-password", Component: ChangePasswordPage },
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: DashboardPage },
          { path: "employees", Component: EmployeesPage },
          { path: "employees/:id", Component: EmployeeDetailPage },
          { path: "departments", Component: DepartmentsPage },
          { path: "job-titles", Component: JobTitlesPage },
          { path: "attendance/requests", Component: AttendanceAdminPage },
          { path: "attendance/records", Component: AttendanceAdminPage },
          { path: "attendance/adjust", Component: AttendanceAdminPage },
          { path: "attendance/my", Component: MyAttendancePage },
          { path: "overtime", Component: OvertimePage },
          { path: "shifts", Component: ShiftsPage },
          { path: "holidays", Component: HolidaysPage },
          { path: "leave/requests", Component: LeaveRequestsPage },
          { path: "leave/balances", Component: LeaveBalancesPage },
          { path: "payroll", Component: PayrollPage },
          { path: "payroll/adjustments", Component: PayrollAdjustmentsPage },
          { path: "payroll/config", Component: PayrollConfigPage },
          { path: "projects", Component: ProjectsPage },
          { path: "projects/expenses", Component: ProjectExpensesPage },
          { path: "projects/health", Component: ProjectHealthPage },
          { path: "clients", Component: ClientsPage },
          { path: "contracts", Component: ContractsPage },
          { path: "invoices", Component: InvoicesPage },
          { path: "payments", Component: PaymentsPage },
          { path: "reports/hr", Component: HRReportPage },
          { path: "reports/attendance", Component: AttendanceReportPage },
          { path: "reports/finance", Component: FinanceReportPage },
          { path: "reports/projects", Component: ProjectReportPage },
          { path: "reports/leave", Component: LeaveReportPage },
          { path: "system/config", Component: SystemConfigPage },
          { path: "system/accounts", Component: AccountsPage },
          { path: "system/departments", Component: DepartmentsPage },
          { path: "system/job-titles", Component: JobTitlesPage },
          { path: "system/shifts", Component: SystemShiftsPage },
          { path: "system/holidays", Component: SystemHolidaysPage },
          { path: "system/audit-log", Component: AuditLogPage },
          { path: "notifications", Component: NotificationsPage },
          { path: "profile", Component: ProfilePage },
        ],
      },
    ],
  },
]);
