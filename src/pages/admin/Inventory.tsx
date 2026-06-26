import { useEffect, useState } from 'react';
import { Search, Warehouse, SlidersHorizontal, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Modal } from '../../components/Modal';
import { themeStyles } from '../../lib/utils';

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
        <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Inventory</h1>
        <p className="text-[13px] mt-1" style={themeStyles.muted}>Real-time stock levels across all warehouses.</p>
      </div>
      <div className="glass-card">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={themeStyles.faint} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product…" className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product','Warehouse','Physical','Reserved','On Hold','Available','Reorder',''].map((h,i) => (
                <th key={i} className={`px-4 py-3 text-[11px] font-bold uppercase ${i > 1 ? 'text-right' : 'text-left'}`} style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? <tr><td colSpan={8} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center"><Warehouse className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No inventory records</p></td></tr>
              : filtered.map(inv => (
                <tr key={inv.id} className="table-row-hover">
                  <td className="px-4 py-3"><div className="font-semibold" style={themeStyles.primary}>{inv.productName}</div><div className="text-xs font-mono" style={themeStyles.faint}>{inv.productSku}</div></td>
                  <td className="px-4 py-3 text-xs" style={themeStyles.muted}>{inv.warehouseName}</td>
                  <td className="px-4 py-3 text-right font-mono" style={themeStyles.primary}>{inv.physicalStock}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: '#D97706' }}>{inv.reservedStock}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--danger)' }}>{inv.onHoldStock}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold" style={{ color: inv.availableStock > 0 ? '#059669' : 'var(--danger)' }}>{inv.availableStock}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={themeStyles.faint}>{inv.reorderLevel ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setAdjusting(inv); setForm({ type: 'manual_add', quantityDelta: 0, reason: '' }); setError(null); }} className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Stock Adjustment">
        {adjusting && (
          <>
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-sm font-semibold" style={themeStyles.primary}>{adjusting.productName}</p>
              <p className="text-xs font-mono" style={themeStyles.muted}>{adjusting.productSku}</p>
              <p className="text-xs mt-1" style={themeStyles.muted}>Current physical stock: <span className="font-mono" style={themeStyles.primary}>{adjusting.physicalStock}</span></p>
            </div>
            {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Adjustment Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                  {ADJUST_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Quantity Change *</label>
                <input type="number" required value={form.quantityDelta} onChange={e => setForm(f => ({...f, quantityDelta: parseInt(e.target.value)}))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}
                  placeholder="Use negative for deduction" />
                <p className="text-xs mt-1" style={themeStyles.faint}>Positive = add stock · Negative = deduct stock</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Reason</label>
                <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} placeholder="Optional reason" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAdjusting(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                  {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Apply
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
