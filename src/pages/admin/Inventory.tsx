import { useEffect, useState } from 'react';
import { Search, Warehouse, SlidersHorizontal, X, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

interface InventoryRow {
  id: number; productId: number; productName: string; productSku: string;
  warehouseName: string; physicalStock: number; reservedStock: number;
  allocatedStock: number; onHoldStock: number; availableStock: number; reorderLevel: number | null;
}

const ADJUST_TYPES = ['received','manual_add','manual_deduct','damage','return','correction'] as const;

export default function Inventory() {
  const { get, post } = useApi();
  const [items, setItems]       = useState<InventoryRow[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [adjusting, setAdjusting] = useState<InventoryRow|null>(null);
  const [form, setForm]         = useState({ type: 'manual_add', quantityDelta: 0, reason: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string|null>(null);

  const load = () => { setLoading(true); get<InventoryRow[]>('/api/inventory').then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault(); if (!adjusting) return;
    setSaving(true); setError(null);
    try {
      await post('/api/inventory/adjust', { inventoryId: adjusting.id, ...form, quantityDelta: parseInt(String(form.quantityDelta)) });
      setAdjusting(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const filtered = items.filter(i =>
    i.productName.toLowerCase().includes(search.toLowerCase()) ||
    i.productSku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time stock levels across all warehouses.</p>
      </div>
      <div className="glass-card">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product…" className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {['Product','Warehouse','Physical','Reserved','On Hold','Available','Reorder',''].map((h,i) => (
                <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center"><Warehouse className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No inventory records</p></td></tr>
              : filtered.map(inv => (
                <tr key={inv.id} className="table-row-hover">
                  <td className="px-4 py-3"><div className="font-medium text-white">{inv.productName}</div><div className="text-xs font-mono text-slate-500">{inv.productSku}</div></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{inv.warehouseName}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{inv.physicalStock}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-400">{inv.reservedStock}</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-400">{inv.onHoldStock}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold ${inv.availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inv.availableStock}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{inv.reorderLevel ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setAdjusting(inv); setForm({ type: 'manual_add', quantityDelta: 0, reason: '' }); setError(null); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAdjusting(null)} />
          <div className="relative z-10 glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Stock Adjustment</h2>
              <button onClick={() => setAdjusting(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4 p-3 bg-white/5 rounded-lg">
              <p className="text-sm font-medium text-white">{adjusting.productName}</p>
              <p className="text-xs font-mono text-slate-400">{adjusting.productSku}</p>
              <p className="text-xs text-slate-400 mt-1">Current physical stock: <span className="text-white font-mono">{adjusting.physicalStock}</span></p>
            </div>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Adjustment Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {ADJUST_TYPES.map(t => <option key={t} value={t} className="bg-slate-800 capitalize">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantity Change *</label>
                <input type="number" required value={form.quantityDelta} onChange={e => setForm(f => ({...f, quantityDelta: parseInt(e.target.value)}))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Use negative for deduction" />
                <p className="text-xs text-slate-500 mt-1">Positive = add stock · Negative = deduct stock</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason</label>
                <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional reason" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAdjusting(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
