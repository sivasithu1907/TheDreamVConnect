import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';

interface ShipmentItem {
  shipmentId: number; referenceNumber: string; expectedDate: string|null;
  status: string; productName: string; productSku: string; quantity: number;
}

const STATUS_COLORS: Record<string,string> = {
  pending:    'bg-amber-500/10 text-amber-400',
  in_transit: 'bg-blue-500/10 text-blue-400',
};

export default function IncomingShipments() {
  const { get } = useApi();
  const [items, setItems]     = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<ShipmentItem[]>('/api/portal/shipments').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div><h1 className="text-2xl font-bold text-white">Incoming Shipments</h1><p className="text-slate-400 text-sm mt-1">Upcoming stock arrivals for your product categories.</p></div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Reference','Product','SKU','Expected Date','Quantity','Status'].map((h,i) => <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i > 3 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Truck className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No incoming shipments for your catalog</p></td></tr>
              : items.map((item, i) => (
                <tr key={i} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.referenceNumber}</td>
                  <td className="px-5 py-3 font-medium text-white">{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.productSku}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(item.expectedDate)}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{item.quantity.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right"><span className={`status-badge ${STATUS_COLORS[item.status] ?? 'bg-slate-500/10 text-slate-400'}`}>{item.status.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
