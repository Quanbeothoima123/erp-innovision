import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as attendanceService from "../../lib/services/attendance.service";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  CalendarDays,
  DollarSign,
  FolderKanban,
  Handshake,
  FileText,
  Receipt,
  CreditCard,
  Settings,
  ScrollText,
  Sun,
  Moon,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Timer,
  User,
  Lock,
  KeyRound,
  BarChart3,
  // ── THÊM MỚI ───────────────────────────────────────────────
  CheckSquare,
  Shield,
  MessageCircle,
  Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  children?: { label: string; path: string; badge?: number }[];
}

export function Layout() {
  const {
    currentUser,
    logout,
    isDark,
    toggleTheme,
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    can,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Nhân Sự",
    "Chấm Công",
    "Nghỉ Phép",
    "Bảng Lương",
    "Khách Hàng",
    "Dự Án",
    "Hệ Thống",
  ]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    attendanceService
      .listRequests({ status: "PENDING", limit: 1 })
      .then((res) =>
        setPendingAttendance(res.pagination?.total ?? res.items?.length ?? 0),
      )
      .catch(() => {});
  }, [currentUser]);

  if (!currentUser) return null;

  const deptName = currentUser.department?.name ?? currentUser.departmentId;
  const jobName = currentUser.jobTitle?.name ?? currentUser.jobTitleId;

  const pendingLeaves = 0;
  const pendingOT = 0;
  const pendingAttendanceBadge = pendingAttendance;

  const buildNav = (): NavItem[] => {
    const items: NavItem[] = [];
    items.push({
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/",
    });

    // ── THÊM MỚI: Công việc — visible cho tất cả roles ────────
    // ADMIN/MANAGER/direct manager: thấy tất cả + tạo được task
    // EMPLOYEE: chỉ thấy task của mình (TasksPage tự scope theo role)
    items.push({
      label: "Công Việc",
      icon: <CheckSquare size={18} />,
      children: [
        { label: "Tất cả công việc", path: "/tasks" },
        { label: "Công việc của tôi", path: "/tasks/my" },
      ],
    });
    // ──────────────────────────────────────────────────────────

    items.push({
      label: "AI Assistant",
      icon: <Sparkles size={18} />,
      path: "/ai-assistant",
    });

    if (can("ADMIN", "HR")) {
      items.push({
        label: "Nhân Sự",
        icon: <Users size={18} />,
        children: [
          { label: "Danh sách nhân viên", path: "/employees" },
          { label: "Phòng ban", path: "/departments" },
          { label: "Chức danh", path: "/job-titles" },
        ],
      });
      items.push({
        label: "Chấm Công",
        icon: <Clock size={18} />,
        children: [
          {
            label: "Duyệt yêu cầu",
            path: "/attendance/requests",
            badge: pendingAttendanceBadge,
          },
          { label: "Tổng hợp chấm công", path: "/attendance/records" },
          { label: "Điều chỉnh thủ công", path: "/attendance/adjust" },
          { label: "Yêu cầu OT", path: "/overtime", badge: pendingOT },
          { label: "Ca làm việc", path: "/shifts" },
          { label: "Ngày lễ", path: "/holidays" },
        ],
      });
      items.push({
        label: "Nghỉ Phép",
        icon: <CalendarDays size={18} />,
        children: [
          {
            label: "Quản lý đơn nghỉ",
            path: "/leave/requests",
            badge: pendingLeaves,
          },
          { label: "Số dư phép", path: "/leave/balances" },
        ],
      });
      items.push({
        label: "Bảng Lương",
        icon: <DollarSign size={18} />,
        children: [
          { label: "Kỳ lương", path: "/payroll" },
          { label: "Điều chỉnh lương", path: "/payroll/adjustments" },
          { label: "Cấu hình lương NV", path: "/payroll/salary-config" },
          { label: "Cấu hình bảng lương", path: "/payroll/config" },
        ],
      });
    } else if (can("MANAGER")) {
      items.push({
        label: "Nhân viên phòng",
        icon: <Users size={18} />,
        path: "/employees",
      });
      items.push({
        label: "Chấm công phòng",
        icon: <Clock size={18} />,
        path: "/attendance/records",
      });
      items.push({
        label: "Chấm công của tôi",
        icon: <Clock size={18} />,
        path: "/attendance/my",
      });
      items.push({
        label: "Nghỉ phép",
        icon: <CalendarDays size={18} />,
        path: "/leave/requests",
        badge: pendingLeaves,
      });
      items.push({
        label: "Phê duyệt OT",
        icon: <Timer size={18} />,
        path: "/overtime",
        badge: pendingOT,
      });
      items.push({
        label: "Phiếu lương",
        icon: <DollarSign size={18} />,
        path: "/payroll",
      });
    }

    if (can("EMPLOYEE") && !can("ADMIN", "HR")) {
      if (!can("MANAGER")) {
        items.push({
          label: "Chấm công của tôi",
          icon: <Clock size={18} />,
          path: "/attendance/my",
        });
        items.push({
          label: "OT của tôi",
          icon: <Timer size={18} />,
          path: "/overtime",
        });
        items.push({
          label: "Nghỉ phép của tôi",
          icon: <CalendarDays size={18} />,
          path: "/leave/requests",
        });
        items.push({
          label: "Bảng lương của tôi",
          icon: <DollarSign size={18} />,
          path: "/payroll",
        });
      }
    }

    items.push({
      label: "Dự Án",
      icon: <FolderKanban size={18} />,
      children: [
        { label: "Danh sách dự án", path: "/projects" },
        { label: "Chi phí dự án", path: "/projects/expenses" },
        { label: "Dashboard sức khoẻ", path: "/projects/health" },
      ],
    });

    if (can("ADMIN", "SALES", "MANAGER", "ACCOUNTANT")) {
      items.push({
        label: "Khách Hàng",
        icon: <Handshake size={18} />,
        children: [
          { label: "Danh sách khách hàng", path: "/clients" },
          { label: "Hợp đồng", path: "/contracts" },
          { label: "Hóa đơn", path: "/invoices" },
          { label: "Thanh toán", path: "/payments" },
        ],
      });
    }

    if (can("ACCOUNTANT") && !can("ADMIN", "HR")) {
      const hasPayroll = items.some(
        (i) =>
          i.path === "/payroll" ||
          i.children?.some((c) => c.path === "/payroll"),
      );
      if (!hasPayroll) {
        items.push({
          label: "Bảng lương",
          icon: <DollarSign size={18} />,
          path: "/payroll",
        });
      }
    }

    if (can("ADMIN", "HR", "MANAGER", "ACCOUNTANT")) {
      const reportChildren = [];
      if (can("ADMIN", "HR")) {
        reportChildren.push({ label: "Nhân sự", path: "/reports/hr" });
        reportChildren.push({
          label: "Chấm công & OT",
          path: "/reports/attendance",
        });
        reportChildren.push({ label: "Nghỉ phép", path: "/reports/leave" });
        reportChildren.push({ label: "Bảng lương", path: "/reports/payroll" });
        reportChildren.push({
          label: "Tăng ca (OT)",
          path: "/reports/overtime",
        });
      }
      if (can("ADMIN", "ACCOUNTANT", "MANAGER")) {
        reportChildren.push({ label: "Tài chính", path: "/reports/finance" });
      }
      reportChildren.push({ label: "Dự án", path: "/reports/projects" });
      items.push({
        label: "Báo Cáo",
        icon: <BarChart3 size={18} />,
        children: reportChildren,
      });
    }

    if (can("ADMIN")) {
      items.push({
        label: "Hệ Thống",
        icon: <Settings size={18} />,
        children: [
          { label: "Cấu hình hệ thống", path: "/system/config" },
          { label: "Tài khoản & Phân quyền", path: "/system/accounts" },
          { label: "Nhật ký hệ thống", path: "/system/audit-log" },
          { label: "Quản lý Telegram Bot", path: "/system/telegram" },
        ],
      });
    }

    // ── SETTINGS: Cài đặt cá nhân (cho tất cả user) ─────────────
    items.push({
      label: "Cài Đặt",
      icon: <Bell size={18} />,
      children: [{ label: "Thông báo Telegram", path: "/settings/telegram" }],
    });
    // ──────────────────────────────────────────────────────────

    return items;
  };

  const navItems = buildNav();

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  };

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path === "/employees" && location.pathname.startsWith("/employees/"))
      return true;
    // ── THÊM MỚI: active state cho tasks ───────────────────────
    if (path === "/tasks" && location.pathname.startsWith("/tasks"))
      return true;
    return false;
  };

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      if (item.children) {
        const isExpanded = expandedSections.includes(item.label);
        const hasActivePath = item.children.some((c) => isActive(c.path));
        return (
          <div key={item.label}>
            <button
              onClick={() => toggleSection(item.label)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-accent ${hasActivePath ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              {item.icon}
              {sidebarOpen && (
                <span className="flex-1 text-left text-[0.8125rem]">
                  {item.label}
                </span>
              )}
              {sidebarOpen && (
                <span className="flex items-center gap-1">
                  {item.children.some((c) => c.badge && c.badge > 0) && (
                    <span className="bg-red-500 text-white text-[0.625rem] px-1.5 py-0.5 rounded-full">
                      {item.children.reduce((s, c) => s + (c.badge || 0), 0)}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              )}
            </button>
            {isExpanded && sidebarOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {item.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setMobileSidebar(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.8125rem] transition-colors hover:bg-accent ${isActive(child.path) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1">{child.label}</span>
                    {child.badge ? (
                      <span className="bg-red-500 text-white text-[0.625rem] px-1.5 py-0.5 rounded-full">
                        {child.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }
      return (
        <Link
          key={item.path}
          to={item.path!}
          onClick={() => setMobileSidebar(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] transition-colors hover:bg-accent ${isActive(item.path!) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {item.icon}
          {sidebarOpen && <span className="flex-1">{item.label}</span>}
          {sidebarOpen && item.badge ? (
            <span className="bg-red-500 text-white text-[0.625rem] px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          ) : null}
        </Link>
      );
    });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[0.8125rem]">
          T
        </div>
        {sidebarOpen && <span className="text-[0.9375rem]">Innovision</span>}
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {renderNav(navItems)}
      </nav>
      <div className="p-3 border-t border-border">
        <Link
          to="/profile"
          onClick={() => setMobileSidebar(false)}
          className="flex items-center gap-2 hover:bg-accent rounded-lg p-1 -m-1 transition-colors cursor-pointer"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.6875rem] shrink-0">
              {currentUser.fullName.split(" ").slice(-1)[0][0]}
            </div>
          )}
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{currentUser.fullName}</div>
              <div className="text-[0.6875rem] text-muted-foreground truncate">
                {currentUser.roles.join(", ")}
              </div>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${sidebarOpen ? "w-60" : "w-14"}`}
      >
        {sidebarContent}
      </aside>
      {/* Mobile Sidebar */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => setMobileSidebar(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-sidebar border-r border-border">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.innerWidth < 768) setMobileSidebar(!mobileSidebar);
                else setSidebarOpen(!sidebarOpen);
              }}
              className="p-1.5 rounded-lg hover:bg-accent"
            >
              <Menu size={18} />
            </button>
            <div className="hidden sm:block text-muted-foreground text-[0.8125rem]">
              {deptName} / {jobName}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent"
              title={isDark ? "Chế độ sáng" : "Chế độ tối"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-accent relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[0.5625rem] w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-pointer"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-50 w-80 max-h-96 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-border">
                      <span className="text-[0.8125rem]">Thông báo</span>
                      <button
                        onClick={markAllRead}
                        className="text-[0.6875rem] text-blue-500 hover:underline"
                      >
                        Đọc tất cả
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-72">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-[0.8125rem]">
                          Không có thông báo
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotifOpen(false);
                            }}
                            className={`p-3 border-b border-border cursor-pointer hover:bg-accent transition-colors ${!n.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          >
                            <div
                              className={`text-xs ${!n.isRead ? "" : "text-muted-foreground"}`}
                            >
                              {n.title}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground mt-0.5">
                              {n.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <Link
                        to="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block p-2.5 text-center text-xs text-blue-600 hover:bg-accent border-t border-border cursor-pointer"
                      >
                        Xem tất cả thông báo →
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-accent"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-7 h-7 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[0.625rem] shrink-0">
                    {currentUser.fullName.split(" ").slice(-1)[0][0]}
                  </div>
                )}
                <ChevronDown
                  size={12}
                  className="text-muted-foreground hidden sm:block"
                />
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-pointer"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-50 w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="p-3 border-b border-border">
                      <div className="text-[0.8125rem]">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[0.6875rem] text-muted-foreground">
                        {currentUser.email}
                      </div>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] hover:bg-accent transition-colors cursor-pointer"
                      >
                        <User size={14} className="text-muted-foreground" /> Hồ
                        sơ cá nhân
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] hover:bg-accent transition-colors cursor-pointer"
                      >
                        <Bell size={14} className="text-muted-foreground" />{" "}
                        Thông báo
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[0.5625rem] px-1.5 py-0.5 rounded-full ml-auto">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/change-password"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] hover:bg-accent transition-colors cursor-pointer"
                      >
                        <Lock size={14} className="text-muted-foreground" /> Đổi
                        mật khẩu
                      </Link>
                      <Link
                        to="/security/two-factor"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] hover:bg-accent transition-colors cursor-pointer"
                      >
                        <Shield size={14} className="text-muted-foreground" />{" "}
                        Bảo mật 2 lớp
                      </Link>
                    </div>
                    <div className="p-1 border-t border-border">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          navigate("/login");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[0.8125rem] hover:bg-accent transition-colors text-red-500"
                      >
                        <LogOut size={14} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
