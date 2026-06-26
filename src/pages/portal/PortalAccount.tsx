import { useState } from 'react';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { themeStyles } from '../../lib/utils';

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
        <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>My Account</h1>
        <p className="text-[13px] mt-1" style={themeStyles.muted}>{user?.name} · {user?.email}</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2" style={themeStyles.primary}><Lock className="h-4 w-4" /> Change Password</h2>

        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg text-sm" style={{ background: 'var(--badge-success-bg)', border: '1px solid var(--badge-success-border)', color: 'var(--badge-success-text)' }}>
            <Check className="h-4 w-4 shrink-0" /> Password updated successfully.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg text-sm" style={{ background: 'var(--error-box-bg)', border: '1px solid var(--badge-danger-border)', color: 'var(--danger)' }}>
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Current Password</label>
            <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>New Password</label>
            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            <p className="text-xs mt-1" style={themeStyles.faint}>Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Confirm New Password</label>
            <input required type="password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm">
            {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
