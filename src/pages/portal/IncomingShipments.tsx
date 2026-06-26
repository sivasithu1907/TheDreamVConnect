import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDate, themeStyles, statusBadgeStyle } from '../../lib/utils';

interface ShipmentItem {
  shipmentId: number; referenceNumber: string; expectedDate: string|null;
  status: string; productName: string; productSku: string; quantity: number;
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:    statusBadgeStyle('warning'),
  in_transit: statusBadgeStyle('info'),
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
      <div><h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Incoming Shipments</h1><p className="text-[13px] mt-1" style={themeStyles.muted}>Upcoming stock arrivals for your product categories.</p></div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Reference','Product','SKU','Expected Date','Quantity','Status'].map((h,i) => <th key={h} className={`px-5 py-3 text-[11px] font-bold uppercase ${i > 3 ? 'text-right' : 'text-left'}`} style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Truck className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No incoming shipments for your catalog</p></td></tr>
              : items.map((item, i) => (
                <tr key={i} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs" style={themeStyles.muted}>{item.referenceNumber}</td>
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={themeStyles.muted}>{item.productSku}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{formatDate(item.expectedDate)}</td>
                  <td className="px-5 py-3 text-right font-mono" style={themeStyles.primary}>{item.quantity.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right"><span className="status-badge" style={STATUS_STYLES[item.status] ?? statusBadgeStyle('muted')}>{item.status.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
