import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Brands from './pages/admin/Brands';
import Inventory from './pages/admin/Inventory';
import Shipments from './pages/admin/Shipments';
import Clients from './pages/admin/Clients';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';
import PortalDashboard from './pages/portal/PortalDashboard';
import AvailableStock from './pages/portal/AvailableStock';
import IncomingShipments from './pages/portal/IncomingShipments';
import { useAuth } from './context/AuthContext';

const INTERNAL = ['super_admin', 'inventory_manager', 'sales_manager', 'operations_executive'];
const CLIENT   = ['client_admin', 'client_purchasing_officer', 'client_viewer'];
const ADMIN    = ['super_admin'];

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (CLIENT.includes(user.role)) return <Navigate to="/portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomeRedirect />} />

        {/* Admin / Internal routes */}
        <Route path="dashboard"  element={<ProtectedRoute roles={INTERNAL}><Dashboard /></ProtectedRoute>} />
        <Route path="products"   element={<ProtectedRoute roles={INTERNAL}><Products /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute roles={ADMIN}><Categories /></ProtectedRoute>} />
        <Route path="brands"     element={<ProtectedRoute roles={ADMIN}><Brands /></ProtectedRoute>} />
        <Route path="inventory"  element={<ProtectedRoute roles={INTERNAL}><Inventory /></ProtectedRoute>} />
        <Route path="shipments"  element={<ProtectedRoute roles={INTERNAL}><Shipments /></ProtectedRoute>} />
        <Route path="clients"    element={<ProtectedRoute roles={[...ADMIN, 'sales_manager']}><Clients /></ProtectedRoute>} />
        <Route path="users"      element={<ProtectedRoute roles={ADMIN}><Users /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={ADMIN}><AuditLogs /></ProtectedRoute>} />

        {/* Client Portal routes */}
        <Route path="portal"            element={<ProtectedRoute roles={CLIENT}><PortalDashboard /></ProtectedRoute>} />
        <Route path="portal/stock"      element={<ProtectedRoute roles={CLIENT}><AvailableStock /></ProtectedRoute>} />
        <Route path="portal/shipments"  element={<ProtectedRoute roles={CLIENT}><IncomingShipments /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
