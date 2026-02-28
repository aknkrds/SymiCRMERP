import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AIProvider } from './context/AIContext';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Design from './pages/Design';
import Procurement from './pages/Procurement';
import Production from './pages/Production';
import Planning from './pages/Planning';
import Accounting from './pages/Accounting';
import Logistics from './pages/Logistics';
import Approvals from './pages/Approvals';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import HumanResources from './pages/HumanResources';
import Dashboard from './pages/Dashboard';

// Protected Route Component
const ProtectedRoute = ({ children, permission }: { children: JSX.Element, permission?: string }) => {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    // Redirect to dashboard if they have access, otherwise login
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AIProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<Layout />}>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
              <Route path="/customers" element={
                <ProtectedRoute permission="orders">
                  <Customers />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute permission="products">
                  <Products />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute permission="orders">
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/design" element={
                <ProtectedRoute permission="design">
                  <Design />
                </ProtectedRoute>
              } />
              <Route path="/procurement" element={
                <ProtectedRoute permission="procurement">
                  <Procurement />
                </ProtectedRoute>
              } />
              <Route path="/planning" element={
                <ProtectedRoute permission="planning">
                  <Planning />
                </ProtectedRoute>
              } />
              <Route path="/production" element={
                <ProtectedRoute permission="production">
                  <Production />
                </ProtectedRoute>
              } />
              <Route path="/accounting" element={
                <ProtectedRoute permission="accounting">
                  <Accounting />
                </ProtectedRoute>
              } />
              <Route path="/logistics" element={
                <ProtectedRoute permission="logistics">
                  <Logistics />
                </ProtectedRoute>
              } />
              <Route path="/approvals" element={
                <ProtectedRoute permission="all_except_settings">
                  <Approvals />
                </ProtectedRoute>
              } />
              <Route path="/stock" element={
                <ProtectedRoute permission="all_except_settings">
                  <Stock />
                </ProtectedRoute>
              } />
              <Route path="/human-resources" element={
                <ProtectedRoute permission="all_except_settings">
                  <HumanResources />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute permission="all_except_settings">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute permission="settings">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            </Routes>
          </AIProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
