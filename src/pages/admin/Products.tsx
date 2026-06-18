import { useEffect, useState } from 'react';
import { Plus, Search, Package2, Pencil, Trash2, X, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

interface Product {
  id: number; name: string; sku: string; unit: string;
  categoryId: number | null; brandId: number | null;
  description: string | null; status: string; minOrderQty: number;
}
interface Category { id: number; name: string; }
interface Brand    { id: number; name: string; }

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-400',
  draft:    'bg-amber-500/10 text-amber-400',
  archived: 'bg-slate-500/10 text-slate-400',
};

const emptyForm = { name:'', sku:'', unit:'pcs', categoryId:'', brandId:'', description:'', minOrderQty:1, status:'active' };

export default function Products() {
  const { get, post, put, del } = useApi();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands,     setBrands]     = useState<Brand[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<'create'|'edit'|null>(null);
  const [editing,    setEditing]    = useState<Product | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<Product[]>('/api/products'), get<Category[]>('/api/categories'), get<Brand[]>('/api/brands')])
      .then(([p, c, b]) => { setProducts(p); setCategories(c); setBrands(b); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setError(null); setModal('create'); };
  const openEdit   = (p: Product) => {
    setForm({ name: p.name, sku: p.sku, unit: p.unit, categoryId: p.categoryId?.toString() ?? '', brandId: p.brandId?.toString() ?? '', description: p.description ?? '', minOrderQty: p.minOrderQty, status: p.status });
    setEditing(p); setError(null); setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const body = { ...form, categoryId: form.categoryId ? parseInt(form.categoryId) : null, brandId: form.brandId ? parseInt(form.brandId) : null };
    try {
      if (modal === 'create') await post('/api/products', body);
      else if (editing) await put(`/api/products/${editing.id}`, body);
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Archive this product?')) return;
    try { await del(`/api/products/${id}`); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 text-sm mt-1">Manage product catalog and SKUs.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU…"
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Product', 'SKU', 'Category', 'Unit', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Package2 className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400">No products found</p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{p.sku}</td>
                  <td className="px-5 py-3 text-slate-400">{categories.find(c => c.id === p.categoryId)?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{p.unit}</td>
                  <td className="px-5 py-3">
                    <span className={`status-badge ${STATUS_COLORS[p.status] ?? ''}`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative z-10 glass-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{modal === 'create' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Product Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SKU *</label>
                  <input required value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Brand</label>
                  <select value={form.brandId} onChange={e => setForm(f => ({...f, brandId: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {brands.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit</label>
                  <input value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min Order Qty</label>
                  <input type="number" min={1} value={form.minOrderQty} onChange={e => setForm(f => ({...f, minOrderQty: parseInt(e.target.value)}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="active" className="bg-slate-800">Active</option>
                    <option value="draft" className="bg-slate-800">Draft</option>
                    <option value="archived" className="bg-slate-800">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-white/10 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                  {modal === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
