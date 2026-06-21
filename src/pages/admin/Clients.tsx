import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Building2, Check, Users as UsersIcon, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useApi } from '../../hooks/useApi';

interface Client {
  id: number; companyName: string; contactPerson: string; email: string;
  phone: string|null; status: string; paymentTerms: string|null;
}
interface Category { id: number; name: string; }

const empty = { companyName:'', contactPerson:'', email:'', phone:'', address:'', taxNumber:'', paymentTerms:'', notes:'' };

export default function Clients() {
  const { get, post, put } = useApi();
  const [items, setItems]         = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<'create'|'edit'|null>(null);
  const [editing, setEditing]     = useState<Client|null>(null);
  const [form, setForm]           = useState(empty);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string|null>(null);
  const [justCreated, setJustCreated] = useState<Client|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<Client[]>('/api/clients'), get<Category[]>('/api/categories')])
      .then(([c, cat]) => { setItems(c); setCategories(cat); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(empty); setEditing(null); setSelectedCategoryIds([]); setError(null); setModal('create'); };

  const openEdit = async (c: Client) => {
    setForm({ companyName: c.companyName, contactPerson: c.contactPerson, email: c.email, phone: c.phone??'', address:'', taxNumber:'', paymentTerms: c.paymentTerms??'', notes:'' });
    setEditing(c); setError(null); setModal('edit');
    try {
      const full = await get<{ allowedCategories: { categoryId: number }[] }>(`/api/clients/${c.id}`);
      setSelectedCategoryIds(full.allowedCategories.map(ac => ac.categoryId));
    } catch { setSelectedCategoryIds([]); }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      let clientId: number;
      if (modal === 'create') {
        const created = await post<Client>('/api/clients', form);
        clientId = created.id;
      } else if (editing) {
        await put(`/api/clients/${editing.id}`, form);
        clientId = editing.id;
      } else {
        return;
      }
      await put(`/api/clients/${clientId}/categories`, { categoryIds: selectedCategoryIds });

      if (modal === 'create') {
        setJustCreated({ ...form, id: clientId, status: 'active' } as Client);
      }
      setModal(null);
      load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Clients</h1><p className="text-slate-400 text-sm mt-1">Manage B2B client companies.</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> Add Client</button>
      </div>

      {/* Just-created banner with shortcut to add a user */}
      {justCreated && (
        <div className="glass-card p-4 flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5">
          <div>
            <p className="text-sm text-emerald-400 font-medium">{justCreated.companyName} created successfully.</p>
            <p className="text-xs text-slate-400 mt-0.5">Want to set up a login for them now?</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/users/clients?clientId=${justCreated.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              <UsersIcon className="h-3.5 w-3.5" /> Add Client User
            </Link>
            <button onClick={() => setJustCreated(null)} className="p-1.5 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {error && !modal && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['ID','Company','Contact','Email','Phone','Status',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center"><Building2 className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No clients yet</p></td></tr>
              : items.map(c => (
                <tr key={c.id} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">#{c.id}</td>
                  <td className="px-5 py-3 font-medium text-white">{c.companyName}</td>
                  <td className="px-5 py-3 text-slate-400">{c.contactPerson}</td>
                  <td className="px-5 py-3 text-slate-400">{c.email}</td>
                  <td className="px-5 py-3 text-slate-400">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>{c.status}</span></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/users/clients?clientId=${c.id}`} title="Manage users for this client" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><UsersIcon className="h-4 w-4" /></Link>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} maxWidth="lg" title={
        <>
          {modal === 'create' ? 'Add Client' : 'Edit Client'}
          {editing && <span className="ml-2 text-xs font-mono text-slate-500">#{editing.id}</span>}
        </>
      }>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Name *</label>
              <input required value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contact Person *</label>
              <input required value={form.contactPerson} onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mobile Number *</label>
              <input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="Must be unique" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div><label className="block text-xs text-slate-400 mb-1">Address</label><input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Tax Number</label><input value={form.taxNumber} onChange={e => setForm(f => ({...f, taxNumber: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Payment Terms</label><input value={form.paymentTerms} onChange={e => setForm(f => ({...f, paymentTerms: e.target.value}))} placeholder="e.g. Net 30" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-xs text-slate-400 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" /></div>

          {/* Category access checkboxes */}
          <div className="pt-2">
            <label className="block text-xs text-slate-400 mb-2">Allowed Product Categories</label>
            <p className="text-xs text-slate-500 mb-2">Select which categories this client can see in their portal. They'll only see stock for these categories.</p>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No categories created yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-white/5 border border-white/10 rounded-lg">
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
