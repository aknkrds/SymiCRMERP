import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Design from './pages/Design';
import Procurement from './pages/Procurement';
import Production from './pages/Production';
import Accounting from './pages/Accounting';
import Logistics from './pages/Logistics';
import Approvals from './pages/Approvals';

import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/design" element={<Design />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/production" element={<Production />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
