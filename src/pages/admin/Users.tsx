import { useEffect, useState } from 'react';
import { Plus, Users as UsersIcon, X, Check, UserCog } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { ROLE_LABELS, formatDateTime } from '../../lib/utils';

interface User {
  id: number; email: string; name: string; role: string;
  clientId: number|null; status: string; lastLoginAt: string|null;
}
interface Client { id: number; companyName: string; }

const ROLES = ['super_admin','inventory_manager','sales_manager','operations_executive','client_admin','client_purchasing_officer','client_viewer'] as const;
const empty = { email:'', password:'', name:'', role:'client_viewer', clientId:'' };

export default function Users() {
  const { get, post, put } = useApi();
  const [users, setUsers]     = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|null>(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<User[]>('/api/users'), get<Client[]>('/api/clients')])
      .then(([u, c]) => { setUsers(u); setClients(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await post('/api/users', { ...form, clientId: form.clientId ? parseInt(form.clientId) : null });
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (u: User) => {
    try { await put(`/api/users/${u.id}`, { status: u.status === 'active' ? 'inactive' : 'active' }); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Users</h1><p className="text-slate-400 text-sm mt-1">Manage internal and client user accounts.</p></div>
        <button onClick={() => { setForm(empty); setError(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> Invite User</button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Name','Email','Role','Client','Last Login','Status',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : users.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center"><UsersIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No users yet</p></td></tr>
              : users.map(u => (
                <tr key={u.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{u.email}</td>
                  <td className="px-5 py-3"><span className="text-xs text-slate-300">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{clients.find(c => c.id === u.clientId)?.companyName ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{u.status}</span></td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleStatus(u)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Toggle status"><UserCog className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative z-10 glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Invite User</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Full Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Initial Password * (min 8 chars)</label><input required type="password" minLength={8} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r} className="bg-slate-800">{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              {['client_admin','client_purchasing_officer','client_viewer'].includes(form.role) && (
                <div><label className="block text-xs text-slate-400 mb-1">Linked Client</label>
                  <select value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="" className="bg-slate-800">— Select client —</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.companyName}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
