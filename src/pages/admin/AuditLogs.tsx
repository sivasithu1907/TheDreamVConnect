import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDateTime, themeStyles, statusBadgeStyle } from '../../lib/utils';

interface AuditLog {
  id: number; userEmail: string|null; action: string; resource: string;
  resourceId: number|null; details: unknown; ipAddress: string|null; createdAt: string;
}

const ACTION_STYLES: Record<string, React.CSSProperties> = {
  CREATE:     statusBadgeStyle('success'),
  UPDATE:     statusBadgeStyle('info'),
  DELETE:     statusBadgeStyle('danger'),
  LOGIN:      statusBadgeStyle('muted'),
  DEACTIVATE: statusBadgeStyle('warning'),
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
      <div><h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Audit Logs</h1><p className="text-[13px] mt-1" style={themeStyles.muted}>System activity history.</p></div>
      {error && <p className="text-sm" style={themeStyles.danger}>{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Time','User','Action','Resource','ID','IP'].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : logs.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><FileText className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No audit logs</p></td></tr>
              : logs.map(log => (
                <tr key={log.id} className="table-row-hover">
                  <td className="px-5 py-2.5 text-xs whitespace-nowrap" style={themeStyles.faint}>{formatDateTime(log.createdAt)}</td>
                  <td className="px-5 py-2.5 text-xs" style={themeStyles.muted}>{log.userEmail ?? '—'}</td>
                  <td className="px-5 py-2.5"><span className="status-badge" style={ACTION_STYLES[log.action] ?? statusBadgeStyle('muted')}>{log.action}</span></td>
                  <td className="px-5 py-2.5 text-xs" style={themeStyles.muted}>{log.resource}</td>
                  <td className="px-5 py-2.5 text-xs font-mono" style={themeStyles.faint}>{log.resourceId ?? '—'}</td>
                  <td className="px-5 py-2.5 text-xs font-mono" style={themeStyles.faint}>{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
