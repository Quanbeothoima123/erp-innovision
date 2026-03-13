import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Briefcase, UserCheck, TrendingUp, Calculator, Lock } from 'lucide-react';

const quickLogins = [
  { email: 'admin@techvn.com', label: 'System Admin', role: 'ADMIN', icon: <Shield size={16} />, color: 'bg-red-500' },
  { email: 'nguyen.van.an@techvn.com', label: 'CEO (Nguyễn Văn An)', role: 'ADMIN+MANAGER', icon: <Briefcase size={16} />, color: 'bg-purple-500' },
  { email: 'le.van.cuong@techvn.com', label: 'HR Manager (Lê Văn Cường)', role: 'HR+MANAGER', icon: <Users size={16} />, color: 'bg-green-500' },
  { email: 'tran.thi.bich@techvn.com', label: 'CTO (Trần Thị Bích)', role: 'MANAGER', icon: <UserCheck size={16} />, color: 'bg-blue-500' },
  { email: 'vo.thi.huong@techvn.com', label: 'Developer (Võ Thị Hương)', role: 'EMPLOYEE', icon: <UserCheck size={16} />, color: 'bg-gray-500' },
  { email: 'pham.thi.dung@techvn.com', label: 'Sales Mgr (Phạm Thị Dung)', role: 'SALES+MANAGER', icon: <TrendingUp size={16} />, color: 'bg-orange-500' },
  { email: 'hoang.van.em@techvn.com', label: 'Finance Mgr (Hoàng Văn Em)', role: 'ACCOUNTANT+MANAGER', icon: <Calculator size={16} />, color: 'bg-teal-500' },
  { email: 'dinh.van.khoa@techvn.com', label: 'Kế toán (Đinh Văn Khoa)', role: 'ACCOUNTANT', icon: <Calculator size={16} />, color: 'bg-cyan-500' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email)) {
      navigate('/');
    } else {
      setError('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa kích hoạt.');
    }
  };

  const handleQuickLogin = (qEmail: string) => {
    if (login(qEmail)) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3">
            <span className="text-[24px]">T</span>
          </div>
          <h1 className="text-[24px]">TechVN</h1>
          <p className="text-muted-foreground text-[14px] mt-1">Hệ thống Quản trị Nội bộ</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[13px] text-muted-foreground block mb-1">Email *</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="name@techvn.com" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[13px] text-muted-foreground block mb-1">Mật khẩu *</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="TechVN@2025" className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-500 text-[12px]">{error}</p>}
            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-[14px]">
              <Lock size={16} /> Đăng nhập
            </button>
          </form>

          <div className="mt-6">
            <div className="text-center text-[12px] text-muted-foreground mb-3">— Đăng nhập nhanh —</div>
            <div className="grid grid-cols-1 gap-1.5">
              {quickLogins.map(q => (
                <button key={q.email} onClick={() => handleQuickLogin(q.email)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-left">
                  <span className={`${q.color} w-6 h-6 rounded flex items-center justify-center text-white`}>{q.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] truncate">{q.label}</div>
                    <div className="text-[10px] text-muted-foreground">{q.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-4">Mật khẩu chung: TechVN@2025</p>
      </div>
    </div>
  );
}
