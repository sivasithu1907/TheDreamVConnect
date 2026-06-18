import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../lib/utils';

interface AuditLog {
  id: number; userEmail: string|null; action: string; resource: string;
  resourceId: number|null; details: unknown; ipAddress: string|null; createdAt: string;
}

const ACTION_COLORS: Record<string,string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-400',
  UPDATE: 'bg-blue-500/10 text-blue-400',
  DELETE: 'bg-red-500/10 text-red-400',
  LOGIN:  'bg-slate-500/10 text-slate-400',
  DEACTIVATE: 'bg-amber-500/10 text-amber-400',
};

export default function AuditLogs() {
  const { get } = useApi();
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  useEffect(() => {
    get<AuditLog[]>('/api/audit-logs?limit=100')
      .then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div><h1 className="text-2xl font-bold text-white">Audit Logs</h1><p className="text-slate-400 text-sm mt-1">System activity history.</p></div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Time','User','Action','Resource','ID','IP'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : logs.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><FileText className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No audit logs</p></td></tr>
              : logs.map(log => (
                <tr key={log.id} className="table-row-hover">
                  <td className="px-5 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">{log.userEmail ?? '—'}</td>
                  <td className="px-5 py-2.5"><span className={`status-badge ${ACTION_COLORS[log.action] ?? 'bg-slate-500/10 text-slate-400'}`}>{log.action}</span></td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">{log.resource}</td>
                  <td className="px-5 py-2.5 text-xs font-mono text-slate-500">{log.resourceId ?? '—'}</td>
                  <td className="px-5 py-2.5 text-xs font-mono text-slate-600">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
