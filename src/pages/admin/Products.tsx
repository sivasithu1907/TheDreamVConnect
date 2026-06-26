import { useEffect, useState } from 'react';
import { Plus, Search, Package2, Pencil, Trash2, Check, Archive } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';
import { COMMON_UNITS, themeStyles, statusBadgeStyle } from '../../lib/utils';

interface Product {
  id: number; name: string; sku: string; unit: string;
  categoryId: number | null; brandId: number | null;
  description: string | null; status: string; minOrderQty: number;
}
interface Category { id: number; name: string; }
interface Brand    { id: number; name: string; }

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  active:   statusBadgeStyle('success'),
  draft:    statusBadgeStyle('warning'),
  archived: statusBadgeStyle('muted'),
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
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [skuMode, setSkuMode] = useState<'auto'|'manual'>('auto');
  const [showArchived, setShowArchived] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      get<Product[]>(`/api/products${showArchived ? '?includeArchived=true' : ''}`),
      get<Category[]>('/api/categories'),
      get<Brand[]>('/api/brands'),
    ])
      .then(([p, c, b]) => { setProducts(p); setCategories(c); setBrands(b); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [showArchived]);

  useEffect(() => {
    if (modal !== 'create' || skuMode !== 'auto') return;
    const params = new URLSearchParams();
    if (form.categoryId) params.set('categoryId', form.categoryId);
    if (form.brandId) params.set('brandId', form.brandId);
    get<{ sku: string }>(`/api/products/next-sku?${params.toString()}`)
      .then(res => setForm(f => ({ ...f, sku: res.sku })))
      .catch(() => {});
  }, [form.categoryId, form.brandId, modal, skuMode]);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setError(null); setIsCustomUnit(false); setSkuMode('auto'); setModal('create'); };
  const openEdit   = (p: Product) => {
    setForm({ name: p.name, sku: p.sku, unit: p.unit, categoryId: p.categoryId?.toString() ?? '', brandId: p.brandId?.toString() ?? '', description: p.description ?? '', minOrderQty: p.minOrderQty, status: p.status });
    setIsCustomUnit(!COMMON_UNITS.includes(p.unit));
    setSkuMode('manual');
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
    if (!confirm('Archive this product? It will be hidden from active lists but its history is kept.')) return;
    try { await del(`/api/products/${id}`); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const handlePermanentDelete = async (p: Product) => {
    if (!confirm(`Permanently delete "${p.name}" (${p.sku})? This cannot be undone. It will only succeed if this product has no shipments, reservations, or stock adjustments recorded against it.`)) return;
    try {
      await del(`/api/products/${p.id}/permanent`);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Permanent delete failed');
    }
  };

  const handleRestore = async (p: Product) => {
    try {
      await post(`/api/products/${p.id}/restore`, {});
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Restore failed');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Products</h1>
          <p className="text-[13px] mt-1" style={themeStyles.muted}>Manage product catalog and SKUs.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="glass-card">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={themeStyles.faint} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={themeStyles.muted}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ accentColor: 'var(--accent)' }} className="rounded" />
            Show archived
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }} className="text-left">
                {['Product', 'SKU', 'Category', 'Unit', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Package2 className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} />
                  <p style={themeStyles.muted}>No products found</p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={themeStyles.muted}>{p.sku}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{categories.find(c => c.id === p.categoryId)?.name ?? '—'}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{p.unit}</td>
                  <td className="px-5 py-3">
                    <span className="status-badge" style={STATUS_STYLES[p.status] ?? statusBadgeStyle('neutral')}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-subtle)]" style={themeStyles.muted} title="Edit"><Pencil className="h-4 w-4" /></button>
                      {p.status === 'archived' ? (
                        <button onClick={() => handleRestore(p)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors" style={{ color: '#059669', border: '1px solid #A7F3D0' }}>Restore</button>
                      ) : (
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md transition-colors hover:bg-[#FFFBEB]" style={{ color: '#D97706' }} title="Archive (keeps history, hides from active lists)"><Archive className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => handlePermanentDelete(p)} className="p-1.5 rounded-md transition-colors hover:bg-[#FEF2F2]" style={themeStyles.danger} title="Permanently delete (only if no history exists)"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} maxWidth="lg" title={modal === 'create' ? 'Add Product' : 'Edit Product'}>
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Product Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium" style={themeStyles.muted}>SKU *</label>
                {modal === 'create' && (
                  <button type="button" onClick={() => setSkuMode(m => m === 'auto' ? 'manual' : 'auto')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    {skuMode === 'auto' ? 'Edit manually' : 'Auto-generate'}
                  </button>
                )}
              </div>
              <input required readOnly={skuMode === 'auto' && modal === 'create'} value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))}
                className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${skuMode === 'auto' && modal === 'create' ? 'cursor-not-allowed' : ''}`}
                style={{ ...themeStyles.input, opacity: skuMode === 'auto' && modal === 'create' ? 0.7 : 1 }} />
              {skuMode === 'auto' && modal === 'create' && <p className="text-xs mt-1" style={themeStyles.faint}>Auto-generated from category + brand</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Category</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Brand</label>
              <select value={form.brandId} onChange={e => setForm(f => ({...f, brandId: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                <option value="">— None —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Unit</label>
              {isCustomUnit ? (
                <div className="flex gap-1.5">
                  <input autoFocus value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="Custom unit" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
                  <button type="button" onClick={() => { setIsCustomUnit(false); setForm(f => ({...f, unit: 'pcs'})); }} className="btn-secondary px-2 text-xs shrink-0">List</button>
                </div>
              ) : (
                <select value={form.unit} onChange={e => { if (e.target.value === '__custom__') { setIsCustomUnit(true); setForm(f => ({...f, unit: ''})); } else { setForm(f => ({...f, unit: e.target.value})); } }} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                  {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Min Order Qty</label>
              <input type="number" min={1} value={form.minOrderQty} onChange={e => setForm(f => ({...f, minOrderQty: parseInt(e.target.value)}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />}
              {modal === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
