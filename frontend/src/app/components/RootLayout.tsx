import { Outlet, useNavigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { EmployeeProvider } from '../context/EmployeeContext';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

function AuthGuard() {
  // FIX: lấy thêm `initializing` để không redirect khi đang restore session
  const { currentUser, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Chờ AuthContext restore token xong mới kiểm tra
    if (initializing) return;

    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/setup-account'];
    const isPublic = publicRoutes.some(r => location.pathname.startsWith(r));

    if (!currentUser && !isPublic) {
      navigate('/login', { replace: true });
      return;
    }

    // Redirect to change-password if mustChangePassword is true
    if (
      currentUser &&
      currentUser.mustChangePassword &&
      location.pathname !== '/change-password' &&
      location.pathname !== '/login'
    ) {
      navigate('/change-password', { replace: true });
    }
  }, [currentUser, navigate, location.pathname, initializing]);

  // Hiển thị màn hình loading trong khi restore session
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function RootLayout() {
  return (
    <AuthProvider>
      <EmployeeProvider>
        <AuthGuard />
        <Toaster position="top-right" richColors closeButton />
      </EmployeeProvider>
    </AuthProvider>
  );
}
