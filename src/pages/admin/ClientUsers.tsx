import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users as UsersIcon, X, Check, Pencil } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ROLE_LABELS, formatDateTime } from '../../lib/utils';

interface User {
  id: number; email: string; name: string; role: string;
  clientId: number|null; status: string; lastLoginAt: string|null;
}
interface Client { id: number; companyName: string; }

const CLIENT_ROLES = ['client_admin','client_purchasing_officer','client_viewer'] as const;
const createEmpty = { email:'', password:'', name:'', role:'client_viewer' as string, clientId:'' };
const editEmpty   = { name:'', role:'client_viewer' as string, clientId:'' as string, status:'active' as string, password:'' };

export default function ClientUsers() {
  const { get, post, put } = useApi();
  const [searchParams] = useSearchParams();
  const [users, setUsers]     = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|'edit'|null>(null);
  const [editing, setEditing] = useState<User|null>(null);
  const [createForm, setCreateForm] = useState(createEmpty);
  const [editForm, setEditForm]     = useState(editEmpty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<User[]>('/api/users'), get<Client[]>('/api/clients')])
      .then(([all, c]) => { setUsers(all.filter(u => CLIENT_ROLES.includes(u.role as typeof CLIENT_ROLES[number]))); setClients(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // If arriving from the Clients page with ?clientId=, open the create modal pre-filled
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && clients.length > 0) {
      setCreateForm(f => ({ ...f, clientId }));
      setModal('create');
    }
  }, [searchParams, clients]);

  const openCreate = () => { setCreateForm(createEmpty); setError(null); setModal('create'); };
  const openEdit = (u: User) => { setEditForm({ name: u.name, role: u.role, clientId: u.clientId?.toString() ?? '', status: u.status, password: '' }); setEditing(u); setError(null); setModal('edit'); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    if (!createForm.clientId) { setError('Please select a client company'); setSaving(false); return; }
    try {
      await post('/api/users', { ...createForm, clientId: parseInt(createForm.clientId) });
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    setSaving(true); setError(null);
    try {
      const { password, ...rest } = editForm;
      const payload: Record<string, unknown> = { ...rest, clientId: editForm.clientId ? parseInt(editForm.clientId) : null };
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
          <h1 className="text-2xl font-bold text-white">Client Users</h1>
          <p className="text-slate-400 text-sm mt-1">Accounts for client companies accessing the portal.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> Add Client User</button>
      </div>
      {error && modal === null && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Name','Email','Client','Role','Last Login','Status',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : users.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center"><UsersIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No client users yet</p></td></tr>
              : users.map(u => (
                <tr key={u.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{u.email}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{clients.find(c => c.id === u.clientId)?.companyName ?? '—'}</td>
                  <td className="px-5 py-3"><span className="text-xs text-slate-300">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{u.status}</span></td>
                  <td className="px-5 py-3">
                    <button onClick={() => openEdit(u)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative z-10 glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Add Client User</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Client Company *</label>
                <select value={createForm.clientId} onChange={e => setCreateForm(f => ({...f, clientId: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="" className="bg-slate-800">— Select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.companyName}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Full Name *</label><input required value={createForm.name} onChange={e => setCreateForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Email *</label><input required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Initial Password * (min 8 chars)</label><input required type="password" minLength={8} value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Role *</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({...f, role: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {CLIENT_ROLES.map(r => <option key={r} value={r} className="bg-slate-800">{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal === 'edit' && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative z-10 glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Edit Client User</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">{editing.email}</p>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Full Name</label><input required value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Client Company</label>
                <select value={editForm.clientId} onChange={e => setEditForm(f => ({...f, clientId: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="" className="bg-slate-800">— None —</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.companyName}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({...f, role: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {CLIENT_ROLES.map(r => <option key={r} value={r} className="bg-slate-800">{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="active" className="bg-slate-800">Active</option>
                  <option value="inactive" className="bg-slate-800">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reset Password</label>
                <input type="password" minLength={8} value={editForm.password} onChange={e => setEditForm(f => ({...f, password: e.target.value}))} placeholder="Leave blank to keep current password" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <p className="text-xs text-slate-500 mt-1">Min 8 characters. Only fill this in if you want to change it.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
