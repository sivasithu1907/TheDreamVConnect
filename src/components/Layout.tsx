import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Folders, Tags, Warehouse,
  Truck, Users, Settings, LogOut, FileText, Building2,
  ShoppingBag, BarChart3, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Internal
  { name: 'Dashboard',       path: '/dashboard',  icon: LayoutDashboard, roles: ['super_admin','inventory_manager','sales_manager','operations_executive'] },
  { name: 'Products',        path: '/products',   icon: Package,         roles: ['super_admin','inventory_manager','operations_executive'] },
  { name: 'Categories',      path: '/categories', icon: Folders,         roles: ['super_admin'] },
  { name: 'Brands',          path: '/brands',     icon: Tags,            roles: ['super_admin'] },
  { name: 'Inventory',       path: '/inventory',  icon: Warehouse,       roles: ['super_admin','inventory_manager','operations_executive'] },
  { name: 'Shipments',       path: '/shipments',  icon: Truck,           roles: ['super_admin','inventory_manager','operations_executive'] },
  { name: 'Clients',         path: '/clients',    icon: Building2,       roles: ['super_admin','sales_manager'] },
  { name: 'Users',           path: '/users',      icon: Users,           roles: ['super_admin'] },
  { name: 'Audit Logs',      path: '/audit-logs', icon: FileText,        roles: ['super_admin'] },
  // Client Portal
  { name: 'Dashboard',       path: '/portal',           icon: LayoutDashboard, roles: ['client_admin','client_purchasing_officer','client_viewer'] },
  { name: 'Available Stock', path: '/portal/stock',     icon: ShoppingBag,     roles: ['client_admin','client_purchasing_officer','client_viewer'] },
  { name: 'Incoming Stock',  path: '/portal/shipments', icon: Truck,           roles: ['client_admin','client_purchasing_officer','client_viewer'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path: string) =>
    path === '/dashboard' || path === '/portal'
      ? location.pathname === path
      : location.pathname.startsWith(path);

  const Sidebar = () => (
    <aside className="glass-nav flex flex-col h-full w-64">
      {/* Logo */}
      <div className="p-5 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">T</div>
        <div>
          <div className="text-sm font-bold text-white tracking-wide">TheDreamV</div>
          <div className="text-xs text-blue-400 font-medium">Connect</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'nav-active text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-blue-400' : 'text-slate-500')} />
              {item.name}
              {active && <ChevronRight className="ml-auto h-3 w-3 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 capitalize truncate">{user?.role.replace(/_/g, ' ')}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="bg-mesh" />
      <div className="flex h-screen w-full relative z-10">
        {/* Desktop sidebar */}
        <div className="hidden md:flex shrink-0 sticky top-0 h-screen">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="relative z-10 flex h-full">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 sticky top-0 z-10">
            <button onClick={() => setMobileOpen(true)} className="p-2 text-slate-400 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center font-bold text-white text-xs">T</div>
              <span className="text-sm font-semibold text-white">TheDreamV Connect</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
