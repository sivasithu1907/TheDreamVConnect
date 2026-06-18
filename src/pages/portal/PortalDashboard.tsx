import { useEffect, useState } from 'react';
import { ShoppingBag, Truck, Package2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

interface StockItem {
  productId: number; productName: string; productSku: string; unit: string;
  minOrderQty: number; availableStock: number; physicalStock: number;
  description: string|null; warehouseName: string;
}

export function PortalDashboard() {
  const { user } = useAuth();
  const { get } = useApi();
  const [stock, setStock]         = useState<StockItem[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    get<StockItem[]>('/api/portal/stock').then(setStock).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalAvailable = stock.reduce((s, i) => s + Math.max(0, i.availableStock), 0);
  const inStockCount   = stock.filter(i => i.availableStock > 0).length;

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-400 text-sm mt-1">Your authorized product catalog and stock levels.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Available Products', value: inStockCount, icon: Package2, accent: 'bg-emerald-500/15 text-emerald-400' },
          { label: 'Total Units Available', value: totalAvailable, icon: ShoppingBag, accent: 'bg-blue-500/15 text-blue-400' },
          { label: 'Catalog Size', value: stock.length, icon: Truck, accent: 'bg-purple-500/15 text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">{s.label}</p>
                <p className="text-3xl font-bold text-white">{loading ? '…' : s.value.toLocaleString()}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.accent}`}><s.icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Your Available Stock</h2>
        <div className="glass-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{['Product','SKU','Unit','Min Order','Available'].map((h,i) => <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5">
                {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading your catalog…</td></tr>
                : stock.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No products in your catalog yet</p></td></tr>
                : stock.map(item => (
                  <tr key={item.productId} className="table-row-hover">
                    <td className="px-5 py-3 font-medium text-white">{item.productName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.productSku}</td>
                    <td className="px-5 py-3 text-slate-400">{item.unit}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-400">{item.minOrderQty}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-mono font-semibold ${item.availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    </div>
  );
}

export default PortalDashboard;
