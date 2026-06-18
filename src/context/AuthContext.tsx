import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  clientId: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isInternal: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INTERNAL_ROLES = ['super_admin', 'inventory_manager', 'sales_manager', 'operations_executive'];
const CLIENT_ROLES   = ['client_admin', 'client_purchasing_officer', 'client_viewer'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('tdv_token');
    const storedUser  = localStorage.getItem('tdv_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('tdv_token');
        localStorage.removeItem('tdv_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('tdv_token', data.token);
    localStorage.setItem('tdv_user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tdv_token');
    localStorage.removeItem('tdv_user');
    setToken(null);
    setUser(null);
  }, []);

  const isInternal = !!user && INTERNAL_ROLES.includes(user.role);
  const isClient   = !!user && CLIENT_ROLES.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isInternal, isClient }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
