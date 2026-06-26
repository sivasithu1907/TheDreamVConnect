import { useEffect, useState } from 'react';
import { Plus, Users as UsersIcon, Check, Pencil } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ROLE_LABELS, formatDateTime, themeStyles, statusBadgeStyle } from '../../lib/utils';
import { Modal } from '../../components/Modal';

interface User {
  id: number; email: string; name: string; role: string;
  clientId: number|null; status: string; lastLoginAt: string|null;
}

const SYSTEM_ROLES = ['super_admin','inventory_manager','sales_manager','operations_executive'] as const;
const createEmpty = { email:'', password:'', name:'', role:'inventory_manager' as string };
const editEmpty   = { name:'', role:'inventory_manager' as string, status:'active' as string, password:'' };

export default function SystemUsers() {
  const { get, post, put } = useApi();
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|'edit'|null>(null);
  const [editing, setEditing] = useState<User|null>(null);
  const [createForm, setCreateForm] = useState(createEmpty);
  const [editForm, setEditForm]     = useState(editEmpty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    get<User[]>('/api/users')
      .then(all => setUsers(all.filter(u => SYSTEM_ROLES.includes(u.role as typeof SYSTEM_ROLES[number]))))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setCreateForm(createEmpty); setError(null); setModal('create'); };
  const openEdit = (u: User) => { setEditForm({ name: u.name, role: u.role, status: u.status, password: '' }); setEditing(u); setError(null); setModal('edit'); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await post('/api/users', { ...createForm, clientId: null });
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    setSaving(true); setError(null);
    try {
      const { password, ...rest } = editForm;
      const payload: Record<string, unknown> = { ...rest };
      if (password) payload.password = password;
      await put(`/api/users/${editing.id}`, payload);
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>System Users</h1>
          <p className="text-[13px] mt-1" style={themeStyles.muted}>Internal TheDreamV staff accounts.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add System User</button>
      </div>
      {error && modal === null && <p className="text-sm" style={themeStyles.danger}>{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Name','Email','Role','Last Login','Status',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : users.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><UsersIcon className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No system users yet</p></td></tr>
              : users.map(u => (
                <tr key={u.id} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{u.name}</td>
                  <td className="px-5 py-3 text-xs" style={themeStyles.muted}>{u.email}</td>
                  <td className="px-5 py-3"><span className="text-xs" style={themeStyles.primary}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td className="px-5 py-3 text-xs" style={themeStyles.faint}>{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-5 py-3"><span className="status-badge" style={u.status === 'active' ? statusBadgeStyle('success') : statusBadgeStyle('muted')}>{u.status}</span></td>
                  <td className="px-5 py-3">
                    <button onClick={() => openEdit(u)} className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add System User">
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Full Name *</label><input required value={createForm.name} onChange={e => setCreateForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Email *</label><input required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Initial Password * (min 8 chars)</label><input required type="password" minLength={8} value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Role *</label>
            <select value={createForm.role} onChange={e => setCreateForm(f => ({...f, role: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
              {SYSTEM_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Create User</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'edit' && !!editing} onClose={() => setModal(null)} title="Edit User">
        {editing && (
          <>
            <p className="text-xs mb-4" style={themeStyles.faint}>{editing.email}</p>
            {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Full Name</label><input required value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
              <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({...f, role: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                  {SYSTEM_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Reset Password</label>
                <input type="password" minLength={8} value={editForm.password} onChange={e => setEditForm(f => ({...f, password: e.target.value}))} placeholder="Leave blank to keep current password" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
                <p className="text-xs mt-1" style={themeStyles.faint}>Min 8 characters. Only fill this in if you want to change it.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Save Changes</button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
