import { useEffect, useState } from 'react';
import { ShoppingBag, Truck, Package2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { themeStyles } from '../../lib/utils';

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

  const info    = { background: '#EFF6FF', color: '#2563EB' };
  const success = { background: '#ECFDF5', color: '#059669' };

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-[13px] mt-1" style={themeStyles.muted}>Your authorized product catalog and stock levels.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Available Products', value: inStockCount, icon: Package2, accent: success },
          { label: 'Total Units Available', value: totalAvailable, icon: ShoppingBag, accent: info },
          { label: 'Catalog Size', value: stock.length, icon: Truck, accent: info },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold mb-2" style={themeStyles.muted}>{s.label}</p>
                <p className="text-3xl font-extrabold" style={themeStyles.primary}>{loading ? '…' : s.value.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl" style={s.accent}><s.icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-[15px] font-bold mb-3" style={themeStyles.primary}>Your Available Stock</h2>
        <div className="glass-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Product','SKU','Unit','Min Order','Available'].map((h,i) => <th key={h} className={`px-5 py-3 text-[11px] font-bold uppercase ${i > 2 ? 'text-right' : 'text-left'}`} style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading your catalog…</td></tr>
                : stock.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No products in your catalog yet</p></td></tr>
                : stock.map(item => (
                  <tr key={item.productId} className="table-row-hover">
                    <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{item.productName}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={themeStyles.muted}>{item.productSku}</td>
                    <td className="px-5 py-3" style={themeStyles.muted}>{item.unit}</td>
                    <td className="px-5 py-3 text-right font-mono" style={themeStyles.muted}>{item.minOrderQty}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono font-semibold" style={{ color: item.availableStock > 0 ? '#059669' : 'var(--danger)' }}>
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
