import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Lock, Eye, EyeOff, ShieldCheck, Check, X, AlertTriangle, CheckCircle } from 'lucide-react';
import * as authService from '../../lib/services/auth.service';
import { ApiError } from '../../lib/apiClient';

export function SetupAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('Không tìm thấy token kích hoạt. Vui lòng kiểm tra lại link trong email.');
    }
  }, [token]);

  const checks = [
    { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
    { label: 'Chứa chữ hoa (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'Chứa chữ thường (a-z)', ok: /[a-z]/.test(password) },
    { label: 'Chứa chữ số (0-9)', ok: /[0-9]/.test(password) },
    { label: 'Chứa ký tự đặc biệt (!@#$...)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const allPassed = checks.every(c => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Vui lòng nhập mật khẩu'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (!allPassed) { setError('Mật khẩu chưa đạt đủ yêu cầu'); return; }
    if (!token) { setError('Token không hợp lệ'); return; }

    setLoading(true);
    try {
      // POST /api/auth/setup-account → { token, password, confirmPassword }
      await authService.setupAccount({ token, password, confirmPassword: confirm });
      setSuccess(true);
      // Đã đăng nhập luôn (setupAccount trả về tokens), chuyển về dashboard
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        // Token hết hạn hoặc đã dùng → hiện tokenError thay vì inline error
        if (err.status === 400) {
          setTokenError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('Kích hoạt thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center text-white mx-auto mb-3">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl">TechVN</h1>
          </div>
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg mb-2">Tài khoản đã được kích hoạt!</h2>
            <p className="text-muted-foreground text-sm">Đang chuyển hướng vào hệ thống...</p>
            <div className="mt-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl">Thiết lập mật khẩu</h1>
          {!tokenError && (
            <p className="text-muted-foreground text-sm mt-1">
              Chào mừng bạn đến với TechVN. Hãy tạo mật khẩu để kích hoạt tài khoản.
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {tokenError ? (
            <div className="text-center py-4">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-base mb-2 text-red-600 dark:text-red-400">Không thể kích hoạt</h2>
              <p className="text-muted-foreground text-[0.8125rem] mb-4">{tokenError}</p>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Quay lại đăng nhập
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div>
                <label className="text-[0.8125rem] text-muted-foreground block mb-1">Mật khẩu mới *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Checklist */}
                {password && (
                  <div className="mt-2.5 space-y-1">
                    {checks.map((c, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {c.ok ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[0.8125rem] text-muted-foreground block mb-1">Xác nhận mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Nhập lại mật khẩu"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-input-background text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${confirm && confirm !== password ? 'border-red-500' : 'border-border'}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-red-500 text-[0.6875rem] mt-1">Mật khẩu không khớp</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-[0.8125rem] text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!password || !confirm || password !== confirm || !allPassed || loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><ShieldCheck size={16} /> Kích hoạt tài khoản</>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[0.6875rem] text-muted-foreground mt-4">
          Đã có tài khoản?{' '}
          <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}
