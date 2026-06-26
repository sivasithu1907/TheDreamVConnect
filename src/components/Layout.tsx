import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Folders, Tags, Warehouse,
  Truck, Users, LogOut, FileText, Building2, UserCog,
  ShoppingBag, Menu, X, ChevronRight, Inbox, MessageSquarePlus,
  Moon, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin','inventory_manager','sales_manager','operations_executive'] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { name: 'Products',   path: '/products',   icon: Package, roles: ['super_admin','inventory_manager','operations_executive'] },
      { name: 'Categories', path: '/categories',  icon: Folders, roles: ['super_admin'] },
      { name: 'Brands',     path: '/brands',      icon: Tags,    roles: ['super_admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Inventory',   path: '/inventory',   icon: Warehouse, roles: ['super_admin','inventory_manager','operations_executive'] },
      { name: 'Warehouses',  path: '/warehouses',  icon: Building2, roles: ['super_admin'] },
      { name: 'Shipments',   path: '/shipments',   icon: Truck,     roles: ['super_admin','inventory_manager','operations_executive'] },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Clients',       path: '/clients',       icon: Building2, roles: ['super_admin','sales_manager'] },
      { name: 'System Users',  path: '/users/system',  icon: UserCog,   roles: ['super_admin'] },
      { name: 'Client Users',  path: '/users/clients', icon: Users,     roles: ['super_admin'] },
      { name: 'Requests',      path: '/requests',      icon: Inbox,     roles: ['super_admin','sales_manager','inventory_manager'] },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Audit Logs', path: '/audit-logs', icon: FileText, roles: ['super_admin'] },
    ],
  },
  {
    label: 'Portal',
    items: [
      { name: 'Dashboard',        path: '/portal',           icon: LayoutDashboard,  roles: ['client_admin','client_purchasing_officer','client_viewer'] },
      { name: 'Available Stock',  path: '/portal/stock',     icon: ShoppingBag,      roles: ['client_admin','client_purchasing_officer','client_viewer'] },
      { name: 'Incoming Stock',   path: '/portal/shipments', icon: Truck,            roles: ['client_admin','client_purchasing_officer','client_viewer'] },
      { name: 'Requests',         path: '/portal/requests',  icon: MessageSquarePlus,roles: ['client_admin','client_purchasing_officer','client_viewer'] },
      { name: 'My Account',       path: '/portal/account',   icon: UserCog,          roles: ['client_admin','client_purchasing_officer','client_viewer'] },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => user && item.roles.includes(user.role)),
    }))
    .filter(group => group.items.length > 0);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path: string) =>
    path === '/dashboard' || path === '/portal'
      ? location.pathname === path
      : location.pathname.startsWith(path);

  const Sidebar = () => (
    <aside className="glass-nav flex flex-col h-full w-64">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--accent)' }}>T</div>
        <div>
          <div className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>TheDreamV</div>
          <div className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Connect</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', active ? 'nav-active' : 'hover:bg-[var(--bg-subtle)]')}
                    style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-faint)' }} />
                    {item.name}
                    {active && <ChevronRight className="ml-auto h-3 w-3" style={{ color: 'var(--accent)' }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--avatar-bg)', border: '1px solid var(--avatar-border)', color: 'var(--accent)' }}>
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
            <div className="text-xs capitalize truncate" style={{ color: 'var(--text-faint)' }}>{user?.role.replace(/_/g, ' ')}</div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: 'var(--text-faint)' }}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--badge-danger-bg)] hover:text-[var(--danger)]"
            style={{ color: 'var(--text-faint)' }}
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
          <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <button onClick={() => setMobileOpen(true)} className="p-2" style={{ color: 'var(--text-muted)' }}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ background: 'var(--accent)' }}>T</div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>TheDreamV Connect</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} className="p-2" style={{ color: 'var(--text-muted)' }} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button onClick={handleLogout} className="p-2" style={{ color: 'var(--text-muted)' }}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
