import { Outlet, useNavigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { EmployeeProvider } from '../context/EmployeeContext';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

function AuthGuard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser && location.pathname !== '/login') {
      navigate('/login');
    }
    // Redirect to change-password if mustChangePassword is true
    if (currentUser && currentUser.mustChangePassword && location.pathname !== '/change-password' && location.pathname !== '/login') {
      navigate('/change-password');
    }
  }, [currentUser, navigate, location.pathname]);

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
