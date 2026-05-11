import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import MovementsPage from './pages/MovementsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import DrivePage from './pages/DrivePage';
import CashPage from './pages/CashPage';
import DriveCallbackPage from './pages/DriveCallbackPage';
import DriveSettingsPage from './pages/DriveSettingsPage';
import InvoicesPage from './pages/InvoicesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RouteLoading() {
  return <div className="dc-route-loading">Cargando...</div>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <RouteLoading />;

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

          <Routes>
            <Route path="/drive/callback" element={<DriveCallbackPage />} />
            <Route path="/cash" element={<PrivateRoute><CashPage /></PrivateRoute>} />
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
            <Route path="/drive" element={<AdminRoute><DrivePage /></AdminRoute>} />
            <Route path="/drive/settings" element={<PrivateRoute><DriveSettingsPage /></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
            <Route path="/movements" element={<PrivateRoute><MovementsPage /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
