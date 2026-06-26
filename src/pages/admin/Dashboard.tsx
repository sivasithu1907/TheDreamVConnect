import { useEffect, useState } from 'react';
import { Package, Building2, Warehouse, Truck, TrendingDown, TrendingUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { themeStyles } from '../../lib/utils';

interface Stats {
  totalProducts:     number;
  totalClients:      number;
  totalPhysical:     number;
  totalAvailable:    number;
  totalReserved:     number;
  incomingShipments: number;
}

function StatCard({ label, value, icon: Icon, iconStyle, sub }: {
  label: string; value: number; icon: React.ElementType; iconStyle: React.CSSProperties; sub?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold mb-2" style={themeStyles.muted}>{label}</p>
          <p className="text-3xl font-extrabold" style={themeStyles.primary}>{value.toLocaleString()}</p>
          {sub && <p className="text-xs mt-1" style={themeStyles.faint}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={iconStyle}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { get } = useApi();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    get<Stats>('/api/dashboard')
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center" style={themeStyles.muted}>Loading dashboard…</div>;
  if (error)   return <div className="py-12 text-center" style={themeStyles.danger}>{error}</div>;
  if (!stats)  return null;

  // Neutral/informational tints only, per brand-kit rule: orange is reserved
  // for primary actions, never used decoratively across multiple stat cards at once.
  const neutral = { background: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-text)' };
  const info    = { background: 'var(--badge-info-bg)',    color: 'var(--badge-info-text)' };
  const success = { background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' };
  const warning = { background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' };

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Dashboard</h1>
        <p className="text-[13px] mt-1" style={themeStyles.muted}>Real-time overview of distribution operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products"     value={stats.totalProducts}     icon={Package}      iconStyle={info}    sub="Active in catalog" />
        <StatCard label="Active Clients"     value={stats.totalClients}      icon={Building2}    iconStyle={info}    sub="Registered businesses" />
        <StatCard label="Available Stock"    value={stats.totalAvailable}    icon={Warehouse}    iconStyle={success} sub={`${stats.totalPhysical.toLocaleString()} physical`} />
        <StatCard label="Reserved Stock"     value={stats.totalReserved}     icon={TrendingDown} iconStyle={warning} sub="Pending fulfillment" />
        <StatCard label="Incoming Shipments" value={stats.incomingShipments} icon={Truck}         iconStyle={info}    sub="In transit" />
        <StatCard label="Physical Stock"     value={stats.totalPhysical}     icon={TrendingUp}    iconStyle={neutral} sub="All warehouses" />
      </div>
    </div>
  );
}
