import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock } from 'lucide-react';
import { themeStyles } from '../lib/utils';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-mesh" />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <h1 className="text-2xl font-bold" style={themeStyles.primary}>TheDreamV Connect</h1>
          <p className="text-sm mt-1" style={themeStyles.muted}>B2B Distribution Portal</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6" style={{ boxShadow: '0 8px 24px -8px rgba(17,24,39,0.08)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)' }}>
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={themeStyles.muted}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                style={themeStyles.input}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={themeStyles.muted}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                  style={themeStyles.input}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={themeStyles.faint}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 text-sm flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              ) : (
                <><Lock className="h-4 w-4" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={themeStyles.faint}>
          Access restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
}
