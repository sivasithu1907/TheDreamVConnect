import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Building2, Check, Users as UsersIcon, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useApi } from '../../hooks/useApi';
import { PAYMENT_TERMS_OPTIONS } from '../../lib/utils';

interface Client {
  id: number; companyName: string; contactPerson: string; email: string;
  phone: string|null; status: string; paymentTerms: string|null;
}
interface Category { id: number; name: string; }

const empty = { companyName:'', contactPerson:'', email:'', phone:'', address:'', taxNumber:'', paymentTerms:'', notes:'' };

const inputStyle = { background: '#fff', border: '1px solid var(--border)', color: 'var(--text-primary)' };

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
  const [isCustomTerms, setIsCustomTerms] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([get<Client[]>('/api/clients'), get<Category[]>('/api/categories')])
      .then(([c, cat]) => { setItems(c); setCategories(cat); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(empty); setEditing(null); setSelectedCategoryIds([]); setError(null); setIsCustomTerms(false); setModal('create'); };

  const openEdit = async (c: Client) => {
    setForm({ companyName: c.companyName, contactPerson: c.contactPerson, email: c.email, phone: c.phone??'', address:'', taxNumber:'', paymentTerms: c.paymentTerms??'', notes:'' });
    setIsCustomTerms(!!c.paymentTerms && !PAYMENT_TERMS_OPTIONS.includes(c.paymentTerms));
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
        <div>
          <h1 className="text-[28px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Clients</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>Manage B2B client companies.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add Client</button>
      </div>

      {/* Just-created banner with shortcut to add a user */}
      {justCreated && (
        <div className="glass-card p-4 flex items-center justify-between" style={{ borderColor: '#A7F3D0', background: '#ECFDF5' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#059669' }}>{justCreated.companyName} created successfully.</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Want to set up a login for them now?</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/users/clients?clientId=${justCreated.id}`} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <UsersIcon className="h-3.5 w-3.5" /> Add Client User
            </Link>
            <button onClick={() => setJustCreated(null)} className="p-1.5" style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {error && !modal && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID','Company','Contact','Email','Phone','Status',''].map(h => (
                <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ color: 'var(--text-muted)', letterSpacing: '0.4px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody style={{ borderColor: 'var(--border)' }} className="divide-y" >
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--text-faint)' }}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <Building2 className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No clients yet</p>
                </td></tr>
              : items.map(c => (
                <tr key={c.id} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>#{c.id}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{c.companyName}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{c.contactPerson}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{c.email}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{c.phone ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="status-badge" style={c.status === 'active'
                      ? { background: '#ECFDF5', color: '#059669' }
                      : { background: '#F9FAFB', color: '#374151' }}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/users/clients?clientId=${c.id}`} title="Manage users for this client" className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text-muted)' }}><UsersIcon className="h-4 w-4" /></Link>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text-muted)' }}><Pencil className="h-4 w-4" /></button>
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
          {editing && <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>#{editing.id}</span>}
        </>
      }>
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: 'var(--danger)', background: '#FEF2F2' }}>{error}</p>}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Company Name *</label>
              <input required value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Contact Person *</label>
              <input required value={form.contactPerson} onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Mobile Number *</label>
              <input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Address</label>
            <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Tax Number</label>
              <input value={form.taxNumber} onChange={e => setForm(f => ({...f, taxNumber: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Payment Terms</label>
              {isCustomTerms ? (
                <div className="flex gap-1.5">
                  <input autoFocus value={form.paymentTerms} onChange={e => setForm(f => ({...f, paymentTerms: e.target.value}))} placeholder="Custom terms" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle} />
                  <button type="button" onClick={() => { setIsCustomTerms(false); setForm(f => ({...f, paymentTerms: ''})); }} className="btn-secondary px-2 text-xs shrink-0">List</button>
                </div>
              ) : (
                <select value={form.paymentTerms} onChange={e => { if (e.target.value === 'Custom') { setIsCustomTerms(true); setForm(f => ({...f, paymentTerms: ''})); } else { setForm(f => ({...f, paymentTerms: e.target.value})); } }} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="">— Select —</option>
                  {PAYMENT_TERMS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={inputStyle} />
          </div>

          {/* Category access checkboxes */}
          <div className="pt-2">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Allowed Product Categories</label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-faint)' }}>Select which categories this client can see in their portal. They'll only see stock for these categories.</p>
            {categories.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>No categories created yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-lg" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      style={{ accentColor: 'var(--accent)' }}
                      className="rounded"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
