import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import * as authService from '../../lib/services/auth.service';
import { ApiError } from '../../lib/apiClient';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = useCallback(() => {
    setCountdown(60);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const sendRequest = async (targetEmail: string) => {
    setLoading(true);
    setError('');
    try {
      // POST /api/auth/forgot-password → { email }
      // Backend luôn trả về 200 dù email có tồn tại hay không (bảo mật)
      await authService.forgotPassword({ email: targetEmail });
      setSent(true);
      startCountdown();
    } catch (err) {
      // Chỉ hiện lỗi nếu thực sự có lỗi server (network, 500...)
      if (err instanceof ApiError && err.status >= 500) {
        setError('Có lỗi xảy ra. Vui lòng thử lại sau.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Gửi email thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Vui lòng nhập email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không hợp lệ'); return; }
    await sendRequest(email);
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    await sendRequest(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl">{sent ? 'Kiểm tra email' : 'Quên mật khẩu'}</h1>
          {!sent && (
            <p className="text-muted-foreground text-sm mt-1">
              Nhập email tài khoản của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu.
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-base mb-2">Đã gửi email!</h2>
              <p className="text-muted-foreground text-[0.8125rem] mb-1">
                Kiểm tra hộp thư của bạn tại
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">{email}</p>
              <p className="text-muted-foreground text-xs mb-5">
                Nếu không thấy email, hãy kiểm tra mục Spam/Junk.
              </p>

              <button
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : countdown > 0 ? (
                  <><Send size={16} /> Gửi lại ({countdown}s)</>
                ) : (
                  <><Send size={16} /> Gửi lại</>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[0.8125rem] text-muted-foreground block mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@techvn.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-[0.8125rem] text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!email || loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Send size={16} /> Gửi link đặt lại</>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/login')}
            className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
