import { useEffect, useState } from 'react';
import { Plus, Pencil, Warehouse as WarehouseIcon, Check, Star } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';

interface Warehouse { id: number; name: string; location: string|null; isDefault: boolean; status: string; }
const empty = { name: '', location: '', isDefault: false, status: 'active' };

export default function Warehouses() {
  const { get, post, put } = useApi();
  const [items, setItems]     = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|'edit'|null>(null);
  const [editing, setEditing] = useState<Warehouse|null>(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => { setLoading(true); get<Warehouse[]>('/api/warehouses').then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(empty); setEditing(null); setError(null); setModal('create'); };
  const openEdit   = (w: Warehouse) => { setForm({ name: w.name, location: w.location ?? '', isDefault: w.isDefault, status: w.status }); setEditing(w); setError(null); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (modal === 'create') await post('/api/warehouses', form);
      else if (editing) await put(`/api/warehouses/${editing.id}`, form);
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Warehouses</h1>
          <p className="text-slate-400 text-sm mt-1">Manage storage locations. Every product automatically gets a stock record in each active warehouse.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> Add Warehouse</button>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Name','Location','Default','Status',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center"><WarehouseIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No warehouses yet — add one to start tracking stock</p></td></tr>
              : items.map(w => (
                <tr key={w.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{w.name}</td>
                  <td className="px-5 py-3 text-slate-400">{w.location ?? '—'}</td>
                  <td className="px-5 py-3">{w.isDefault && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${w.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{w.status}</span></td>
                  <td className="px-5 py-3"><button onClick={() => openEdit(w)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Warehouse' : 'Edit Warehouse'}>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-xs text-slate-400 mb-1">Warehouse Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Location</label><input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Doha Industrial Area" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({...f, isDefault: e.target.checked}))} className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500" />
            Set as default warehouse
          </label>
          {modal === 'edit' && (
            <div><label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="active" className="bg-slate-800">Active</option>
                <option value="inactive" className="bg-slate-800">Inactive</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
