// Categories admin page
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, Folders } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';

interface Category { id: number; name: string; description: string | null; }
const empty = { name: '', description: '' };

export default function Categories() {
  const { get, post, put, del } = useApi();
  const [items, setItems]     = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create'|'edit'|null>(null);
  const [editing, setEditing] = useState<Category|null>(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);

  const load = () => { setLoading(true); get<Category[]>('/api/categories').then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm(empty); setEditing(null); setError(null); setModal('create'); };
  const openEdit   = (c: Category) => { setForm({ name: c.name, description: c.description ?? '' }); setEditing(c); setError(null); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (modal === 'create') await post('/api/categories', form);
      else if (editing) await put(`/api/categories/${editing.id}`, form);
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try { await del(`/api/categories/${id}`); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Categories</h1><p className="text-slate-400 text-sm mt-1">Product category management.</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> Add Category</button>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {['Name','Description',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center"><Folders className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No categories yet</p></td></tr>
              : items.map(c => (
                <tr key={c.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-5 py-3 text-slate-400">{c.description ?? '—'}</td>
                  <td className="px-5 py-3"><div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Category' : 'Edit Category'}>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-xs text-slate-400 mb-1">Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
