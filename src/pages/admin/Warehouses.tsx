import { useEffect, useState } from 'react';
import { Plus, Pencil, Warehouse as WarehouseIcon, Check, Star } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';
import { themeStyles, statusBadgeStyle } from '../../lib/utils';

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
          <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Warehouses</h1>
          <p className="text-[13px] mt-1" style={themeStyles.muted}>Manage storage locations. Every product automatically gets a stock record in each active warehouse.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add Warehouse</button>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Name','Location','Default','Status',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center"><WarehouseIcon className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No warehouses yet — add one to start tracking stock</p></td></tr>
              : items.map(w => (
                <tr key={w.id} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{w.name}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{w.location ?? '—'}</td>
                  <td className="px-5 py-3">{w.isDefault && <Star className="h-4 w-4" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />}</td>
                  <td className="px-5 py-3"><span className="status-badge" style={w.status === 'active' ? statusBadgeStyle('success') : statusBadgeStyle('muted')}>{w.status}</span></td>
                  <td className="px-5 py-3"><button onClick={() => openEdit(w)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-subtle)]" style={themeStyles.muted}><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Warehouse' : 'Edit Warehouse'}>
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Warehouse Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Location</label><input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Doha Industrial Area" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={themeStyles.primary}>
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({...f, isDefault: e.target.checked}))} style={{ accentColor: 'var(--accent)' }} className="rounded" />
            Set as default warehouse
          </label>
          {modal === 'edit' && (
            <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
