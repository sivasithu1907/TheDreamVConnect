import { useEffect, useState } from 'react';
import { Package, Building2, Warehouse, Truck, TrendingDown, TrendingUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

interface Stats {
  totalProducts:     number;
  totalClients:      number;
  totalPhysical:     number;
  totalAvailable:    number;
  totalReserved:     number;
  incomingShipments: number;
}

function StatCard({ label, value, icon: Icon, accent, sub }: {
  label: string; value: number; icon: React.ElementType; accent: string; sub?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${accent}`}>
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

  if (loading) return <div className="text-slate-400 py-12 text-center">Loading dashboard…</div>;
  if (error)   return <div className="text-red-400 py-12 text-center">{error}</div>;
  if (!stats)  return null;

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time overview of distribution operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products"     value={stats.totalProducts}     icon={Package}    accent="bg-blue-500/15 text-blue-400"    sub="Active in catalog" />
        <StatCard label="Active Clients"     value={stats.totalClients}      icon={Building2}  accent="bg-purple-500/15 text-purple-400" sub="Registered businesses" />
        <StatCard label="Available Stock"    value={stats.totalAvailable}    icon={Warehouse}  accent="bg-emerald-500/15 text-emerald-400" sub={`${stats.totalPhysical.toLocaleString()} physical`} />
        <StatCard label="Reserved Stock"     value={stats.totalReserved}     icon={TrendingDown} accent="bg-amber-500/15 text-amber-400" sub="Pending fulfillment" />
        <StatCard label="Incoming Shipments" value={stats.incomingShipments} icon={Truck}      accent="bg-sky-500/15 text-sky-400"       sub="In transit" />
        <StatCard label="Physical Stock"     value={stats.totalPhysical}     icon={TrendingUp} accent="bg-slate-500/15 text-slate-400"   sub="All warehouses" />
      </div>
    </div>
  );
}
