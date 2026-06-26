import { useEffect, useState } from 'react';
import { Search, Package2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { themeStyles } from '../../lib/utils';

interface StockItem {
  productId: number; productName: string; productSku: string;
  unit: string; minOrderQty: number; availableStock: number;
  description: string|null; warehouseName: string;
}

export default function AvailableStock() {
  const { get } = useApi();
  const [items, setItems]   = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<StockItem[]>('/api/portal/stock').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(i =>
    i.productName.toLowerCase().includes(search.toLowerCase()) ||
    i.productSku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div><h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Available Stock</h1><p className="text-[13px] mt-1" style={themeStyles.muted}>Real-time stock levels for your authorized product catalog.</p></div>
      <div className="glass-card">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={themeStyles.faint} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or SKU…" className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product','SKU','Description','Unit','Min Qty','Available'].map((h,i) => <th key={h} className={`px-5 py-3 text-[11px] font-bold uppercase ${i > 3 ? 'text-right' : 'text-left'}`} style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No products found</p></td></tr>
              : filtered.map(item => (
                <tr key={item.productId} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={themeStyles.muted}>{item.productSku}</td>
                  <td className="px-5 py-3 max-w-xs truncate text-xs" style={themeStyles.faint}>{item.description ?? '—'}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{item.unit}</td>
                  <td className="px-5 py-3 text-right font-mono" style={themeStyles.muted}>{item.minOrderQty}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-sm font-semibold"
                      style={item.availableStock > 0 ? { color: 'var(--badge-success-text)', background: 'var(--badge-success-bg)' } : { color: 'var(--danger)', background: 'var(--error-box-bg)' }}>
                      {item.availableStock > 0 ? item.availableStock.toLocaleString() : 'Out of stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
