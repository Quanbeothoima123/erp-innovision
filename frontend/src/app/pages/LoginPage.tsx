import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Users,
  Briefcase,
  UserCheck,
  TrendingUp,
  Calculator,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";

const quickLogins = [
  {
    email: "admin@techvn.com",
    label: "System Admin",
    role: "ADMIN",
    icon: Shield,
    color: "from-red-500 to-rose-600",
  },
  {
    email: "nguyen.van.an@techvn.com",
    label: "CEO — Nguyễn Văn An",
    role: "ADMIN + MANAGER",
    icon: Briefcase,
    color: "from-violet-500 to-purple-600",
  },
  {
    email: "le.van.cuong@techvn.com",
    label: "HR Manager — Lê Văn Cường",
    role: "HR",
    icon: Users,
    color: "from-emerald-500 to-green-600",
  },
  {
    email: "tran.thi.bich@techvn.com",
    label: "CTO — Trần Thị Bích",
    role: "MANAGER",
    icon: UserCheck,
    color: "from-blue-500 to-indigo-600",
  },
  {
    email: "vo.thi.huong@techvn.com",
    label: "Developer — Võ Thị Hương",
    role: "EMPLOYEE",
    icon: UserCheck,
    color: "from-slate-500 to-gray-600",
  },
  {
    email: "pham.thi.dung@techvn.com",
    label: "Sales Mgr — Phạm Thị Dung",
    role: "SALES + MANAGER",
    icon: TrendingUp,
    color: "from-orange-500 to-amber-600",
  },
  {
    email: "hoang.van.em@techvn.com",
    label: "Finance Mgr — Hoàng Văn Em",
    role: "ACCOUNTANT + MANAGER",
    icon: Calculator,
    color: "from-teal-500 to-cyan-600",
  },
  {
    email: "dinh.van.khoa@techvn.com",
    label: "Kế toán — Đinh Văn Khoa",
    role: "ACCOUNTANT",
    icon: Calculator,
    color: "from-cyan-500 to-sky-600",
  },
];

const DEMO_PASSWORD = "TechVN@2025";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError("");
    const result = await login(loginEmail, loginPassword);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error ?? "Đăng nhập thất bại");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập email");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }
    handleSubmit(email, password);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <span className="text-white font-semibold text-xl">TechVN ERP</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Hệ thống quản trị
            <br />
            <span className="text-blue-400">nội bộ doanh nghiệp</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Quản lý nhân sự, chấm công, lương thưởng và dự án — tất cả trong một
            nền tảng thống nhất.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {[
            "Quản lý nhân viên & phòng ban",
            "Chấm công & nghỉ phép tự động",
            "Tính lương & báo cáo thời gian thực",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 text-slate-300 text-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {f}
            </div>
          ))}
          <p className="text-slate-600 text-xs mt-6">
            © 2025 TechVN Corp. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
              T
            </div>
            <span className="text-white font-semibold">TechVN ERP</span>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 shadow-2xl">
            <h2 className="text-white text-2xl font-semibold mb-1">
              Đăng nhập
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Chào mừng trở lại! Nhập thông tin để tiếp tục.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="name@techvn.com"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition"
                />
              </div>
              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
