import { useEffect, useState } from 'react';
import { Search, Package2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

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
      <div><h1 className="text-2xl font-bold text-white">Available Stock</h1><p className="text-slate-400 text-sm mt-1">Real-time stock levels for your authorized product catalog.</p></div>
      <div className="glass-card">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or SKU…" className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {['Product','SKU','Description','Unit','Min Qty','Available'].map((h,i) => <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i > 3 ? 'text-right' : 'text-left'}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No products found</p></td></tr>
              : filtered.map(item => (
                <tr key={item.productId} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.productSku}</td>
                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate text-xs">{item.description ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{item.unit}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-400">{item.minOrderQty}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-mono text-sm font-semibold ${item.availableStock > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
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
