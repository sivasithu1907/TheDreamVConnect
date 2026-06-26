import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, Tags } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';
import { themeStyles } from '../../lib/utils';

interface Brand { id: number; name: string; description: string | null; }
const empty = { name: '', description: '' };

export default function Brands() {
  const { get, post, put, del } = useApi();
  const [items, setItems]     = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|'edit'|null>(null);
  const [editing, setEditing] = useState<Brand|null>(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => { setLoading(true); get<Brand[]>('/api/brands').then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(empty); setEditing(null); setError(null); setModal('create'); };
  const openEdit   = (b: Brand) => { setForm({ name: b.name, description: b.description ?? '' }); setEditing(b); setError(null); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (modal === 'create') await post('/api/brands', form);
      else if (editing) await put(`/api/brands/${editing.id}`, form);
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this brand?')) return;
    try { await del(`/api/brands/${id}`); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Brands</h1><p className="text-[13px] mt-1" style={themeStyles.muted}>Manage product brands.</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add Brand</button>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Name','Description',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={3} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center"><Tags className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No brands yet</p></td></tr>
              : items.map(b => (
                <tr key={b.id} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{b.name}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{b.description ?? '—'}</td>
                  <td className="px-5 py-3"><div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-subtle)]" style={themeStyles.muted}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-md transition-colors hover:bg-[#FEF2F2]" style={themeStyles.danger}><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Brand' : 'Edit Brand'}>
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Brand Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div><label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
