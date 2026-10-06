import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import BoardPage from './features/board/BoardPage.jsx';
import LeadPanel from './features/board/LeadPanel.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import PortalPage from './features/portal/PortalPage.jsx';

const STAFF = ['brokerage_admin', 'advisor'];

// "/" sends each role to its own home
function HomeRedirect() {
  const { user } = useAuth();
  const target = user.role === 'client' ? '/portal' : user.role === 'platform_admin' ? '/admin' : '/board';
  return <Navigate to={target} replace />;
}

const NotBuilt = () => <p className="empty">The platform admin area is not built yet (brokerages are created with a seed script).</p>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomeRedirect />} />

                <Route element={<ProtectedRoute roles={STAFF} />}>
                  <Route path="board" element={<BoardPage />}>
                    <Route path="leads/:id" element={<LeadPanel />} />
                  </Route>
                  <Route path="dashboard" element={<DashboardPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['client']} />}>
                  <Route path="portal" element={<PortalPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['platform_admin']} />}>
                  <Route path="admin" element={<NotBuilt />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}