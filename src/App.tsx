import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AIProvider } from './context/AIContext';

import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Design from './pages/Design';
import Procurement from './pages/Procurement';
import Planning from './pages/Planning';
import Production from './pages/Production';
import Accounting from './pages/Accounting';
import Logistics from './pages/Logistics';
import Approvals from './pages/Approvals';
import Stock from './pages/Stock';
import HumanResources from './pages/HumanResources';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotesApp from './components/apps/NotesApp';
import ShortcutManager from './components/apps/ShortcutManager';

import Meetings from './pages/Meetings';

// Protected Route Component
const ProtectedRoute = ({ children, permission }: { children: ReactElement, permission?: string }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const HomeGate = () => {
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AIProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <HomeGate />
                </ProtectedRoute>
              } />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/meetings" element={<Meetings />} />

                <Route path="/orders" element={<ProtectedRoute permission="orders"><Orders /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute permission="orders"><Customers /></ProtectedRoute>} />

                <Route path="/products" element={<ProtectedRoute permission="products"><Products /></ProtectedRoute>} />

                <Route path="/design" element={<ProtectedRoute permission="design"><Design /></ProtectedRoute>} />
                <Route path="/procurement" element={<ProtectedRoute permission="procurement"><Procurement /></ProtectedRoute>} />
                <Route path="/planning" element={<ProtectedRoute permission="planning"><Planning /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute permission="production"><Production /></ProtectedRoute>} />
                <Route path="/accounting" element={<ProtectedRoute permission="accounting"><Accounting /></ProtectedRoute>} />
                <Route path="/logistics" element={<ProtectedRoute permission="logistics"><Logistics /></ProtectedRoute>} />

                <Route path="/approvals" element={<ProtectedRoute permission="all_except_settings"><Approvals /></ProtectedRoute>} />
                <Route path="/stock" element={<ProtectedRoute permission="all_except_settings"><Stock /></ProtectedRoute>} />
                <Route path="/hr" element={<ProtectedRoute permission="all_except_settings"><HumanResources /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute permission="all_except_settings"><Reports /></ProtectedRoute>} />
                <Route path="/notes" element={<ProtectedRoute permission="all_except_settings"><NotesApp /></ProtectedRoute>} />
                <Route path="/shortcuts" element={<ProtectedRoute permission="all_except_settings"><ShortcutManager /></ProtectedRoute>} />

                <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AIProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
