import { useState } from 'react';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';

export default function PortalAccount() {
  const { post } = useApi();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(false);
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }

    setSaving(true);
    try {
      await post('/api/auth/change-password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-white">My Account</h1>
        <p className="text-slate-400 text-sm mt-1">{user?.name} · {user?.email}</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</h2>

        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Check className="h-4 w-4 shrink-0" /> Password updated successfully.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Password</label>
            <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New Password</label>
            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
            <input required type="password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
