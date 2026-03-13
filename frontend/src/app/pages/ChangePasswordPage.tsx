import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePasswordPage() {
  const { currentUser, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return null;

  const isMandatory = currentUser.mustChangePassword;

  // Password strength checks
  const checks = [
    { label: 'Ít nhất 8 ký tự', ok: newPw.length >= 8 },
    { label: 'Chứa chữ hoa (A-Z)', ok: /[A-Z]/.test(newPw) },
    { label: 'Chứa chữ thường (a-z)', ok: /[a-z]/.test(newPw) },
    { label: 'Chứa chữ số (0-9)', ok: /[0-9]/.test(newPw) },
    { label: 'Chứa ký tự đặc biệt (!@#$...)', ok: /[^A-Za-z0-9]/.test(newPw) },
  ];
  const passedCount = checks.filter(c => c.ok).length;
  const strengthPercent = (passedCount / checks.length) * 100;
  const strengthColor = strengthPercent <= 40 ? 'bg-red-500' : strengthPercent <= 80 ? 'bg-yellow-500' : 'bg-green-500';
  const strengthLabel = strengthPercent <= 40 ? 'Yếu' : strengthPercent <= 80 ? 'Trung bình' : 'Mạnh';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!current) { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!newPw) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (newPw !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }

    const result = changePassword(current, newPw);
    if (result.success) {
      toast.success('Đổi mật khẩu thành công!');
      navigate('/');
    } else {
      setError(result.error || 'Đổi mật khẩu thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isMandatory ? 'bg-yellow-500' : 'bg-blue-600'} text-white`}>
            {isMandatory ? <AlertTriangle size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="text-[24px]">Đổi mật khẩu</h1>
          {isMandatory && (
            <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-[13px] text-yellow-700 dark:text-yellow-400">
              <AlertTriangle size={14} className="inline mr-1" />
              Bạn cần đổi mật khẩu mặc định trước khi sử dụng hệ thống.
            </div>
          )}
          {!isMandatory && (
            <p className="text-muted-foreground text-[14px] mt-1">Cập nhật mật khẩu bảo mật cho tài khoản của bạn</p>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-[14px]">
              {currentUser.fullName.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <div className="text-[14px]">{currentUser.fullName}</div>
              <div className="text-[12px] text-muted-foreground">{currentUser.email}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="text-[13px] text-muted-foreground block mb-1">Mật khẩu hiện tại *</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={e => { setCurrent(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-[14px] pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-[13px] text-muted-foreground block mb-1">Mật khẩu mới *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-[14px] pr-10"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength Meter */}
              {newPw && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strengthColor}`} style={{ width: `${strengthPercent}%` }} />
                    </div>
                    <span className={`text-[11px] ${strengthPercent <= 40 ? 'text-red-500' : strengthPercent <= 80 ? 'text-yellow-500' : 'text-green-500'}`}>{strengthLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {checks.map((c, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {c.ok ? <Check size={12} /> : <X size={12} />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[13px] text-muted-foreground block mb-1">Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="Nhập lại mật khẩu mới"
                className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-[14px] ${confirm && confirm !== newPw ? 'border-red-500' : 'border-border'}`}
              />
              {confirm && confirm !== newPw && (
                <p className="text-red-500 text-[11px] mt-1">Mật khẩu không khớp</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-[13px] text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!current || !newPw || !confirm || newPw !== confirm || passedCount < checks.length}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck size={16} /> Đổi mật khẩu
            </button>

            {!isMandatory && (
              <button type="button" onClick={() => navigate(-1)} className="w-full py-2 text-muted-foreground text-[13px] hover:text-foreground transition-colors">
                ← Quay lại
              </button>
            )}

            {isMandatory && (
              <button type="button" onClick={() => { logout(); navigate('/login'); }} className="w-full py-2 text-red-500 text-[13px] hover:text-red-600 transition-colors">
                Đăng xuất
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Mật khẩu demo hiện tại: TechVN@2025
        </p>
      </div>
    </div>
  );
}
