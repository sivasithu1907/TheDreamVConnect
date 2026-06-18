import { useEffect, useState } from 'react';
import { Truck, Calendar, Hash } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';

interface Shipment {
  id: number; referenceNumber: string; supplierName: string|null;
  expectedDate: string|null; arrivedDate: string|null; status: string;
}

const STATUS_COLORS: Record<string,string> = {
  pending:            'bg-amber-500/10 text-amber-400',
  in_transit:         'bg-blue-500/10 text-blue-400',
  arrived:            'bg-emerald-500/10 text-emerald-400',
  partially_received: 'bg-purple-500/10 text-purple-400',
  cancelled:          'bg-slate-500/10 text-slate-400',
};

export default function Shipments() {
  const { get } = useApi();
  const [items, setItems]     = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  useEffect(() => {
    get<Shipment[]>('/api/shipments').then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Incoming Shipments</h1><p className="text-slate-400 text-sm mt-1">Track supplier shipments and stock arrivals.</p></div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {['Reference','Supplier','Expected','Arrived','Status'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center"><Truck className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No shipments yet</p></td></tr>
              : items.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs text-white">{s.referenceNumber}</td>
                  <td className="px-5 py-3 text-slate-300">{s.supplierName ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(s.expectedDate)}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(s.arrivedDate)}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${STATUS_COLORS[s.status] ?? ''}`}>{s.status.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
