import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Check, X, Loader2, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

const checks = [
  { label: 'Ít nhất 8 ký tự', test: (pw: string) => pw.length >= 8 },
  { label: 'Chứa chữ hoa (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Chứa chữ thường (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Chứa chữ số (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'Chứa ký tự đặc biệt (!@#$...)', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

export function ChangePasswordPage() {
  const { currentUser, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const isMandatory = currentUser.mustChangePassword;
  const passedChecks = checks.map(c => c.test(newPw));
  const passedCount = passedChecks.filter(Boolean).length;
  const strength = passedCount === 0 ? 0 : (passedCount / checks.length) * 100;
  const strengthLabel = strength <= 40 ? 'Yếu' : strength <= 80 ? 'Trung bình' : 'Mạnh';
  const strengthColor = strength <= 40 ? 'bg-red-500' : strength <= 80 ? 'bg-yellow-500' : 'bg-emerald-500';
  const strengthTextColor = strength <= 40 ? 'text-red-400' : strength <= 80 ? 'text-yellow-400' : 'text-emerald-400';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!current) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!newPw) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (newPw !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (passedCount < checks.length) { setError('Mật khẩu chưa đáp ứng đủ yêu cầu bảo mật'); return; }

    setLoading(true);
    const result = await changePassword(current, newPw);
    setLoading(false);

    if (result.success) {
      toast.success('Đổi mật khẩu thành công!');
      navigate('/');
    } else {
      setError(result.error || 'Đổi mật khẩu thất bại');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isMandatory ? 'bg-amber-500' : 'bg-blue-600'} shadow-lg`}>
            {isMandatory ? <AlertTriangle size={30} className="text-white" /> : <Lock size={30} className="text-white" />}
          </div>
          <h1 className="text-white text-2xl font-semibold">Đổi mật khẩu</h1>
          {isMandatory ? (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-400 text-sm">
              <AlertTriangle size={14} className="inline mr-1.5" />
              Bạn phải đổi mật khẩu mặc định trước khi sử dụng hệ thống.
            </div>
          ) : (
            <p className="text-slate-400 text-sm mt-1.5">Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* User info */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {currentUser.fullName.split(' ').at(-1)?.[0] ?? '?'}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{currentUser.fullName}</div>
              <div className="text-slate-400 text-xs">{currentUser.email}</div>
            </div>
            {!isMandatory && (
              <button onClick={handleLogout} className="ml-auto text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 transition">
                <LogOut size={13} /> Đăng xuất
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1.5">Mật khẩu hiện tại *</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={e => { setCurrent(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu hiện tại"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
                />
                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1.5">Mật khẩu mới *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu mới"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
                />
                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {newPw && (
                <div className="mt-2.5 space-y-2">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strengthColor}`} style={{ width: `${strength}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${strengthTextColor}`}>{strengthLabel}</span>
                  </div>
                  {/* Check list */}
                  <div className="grid grid-cols-1 gap-0.5">
                    {checks.map((c, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[11px] ${passedChecks[i] ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passedChecks[i] ? <Check size={11} /> : <X size={11} />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1.5">Xác nhận mật khẩu *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={loading}
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/10 border text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition ${confirm && confirm !== newPw ? 'border-red-500/50' : 'border-white/20'}`}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirm && newPw && confirm !== newPw && (
                <p className="text-red-400 text-[10px] mt-1">Mật khẩu không khớp</p>
              )}
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
