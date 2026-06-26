import { useEffect, useState } from 'react';
import { Inbox, Check, X, Image as ImageIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDateTime, themeStyles, statusBadgeStyle } from '../../lib/utils';
import { Modal } from '../../components/Modal';

interface Attachment { id: number; fileUrl: string; fileName: string; }
interface RequestRow {
  id: number; requestType: 'stock_reservation'|'special_request';
  clientId: number; clientName: string;
  productId: number|null; productName: string|null; productSku: string|null;
  quantity: number|null; freeText: string|null; status: string;
  notes: string|null; reviewNotes: string|null; createdAt: string;
  attachments: Attachment[];
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:           statusBadgeStyle('warning'),
  approved:          statusBadgeStyle('success'),
  rejected:          statusBadgeStyle('danger'),
  expired:           statusBadgeStyle('muted'),
  converted_to_po:   statusBadgeStyle('info'),
  cancelled:         statusBadgeStyle('muted'),
};

export default function Requests() {
  const { get, put } = useApi();
  const [rows, setRows]       = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<RequestRow|null>(null);
  const [decision, setDecision]   = useState<'approved'|'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string|null>(null);
  const [filter, setFilter]   = useState<'all'|'pending'>('pending');

  const load = () => { setLoading(true); get<RequestRow[]>('/api/reservations').then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openReview = (r: RequestRow, dec: 'approved'|'rejected') => {
    setReviewing(r); setDecision(dec); setReviewNotes(''); setError(null);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault(); if (!reviewing) return;
    setSaving(true); setError(null);
    try {
      await put(`/api/reservations/${reviewing.id}/review`, { status: decision, reviewNotes });
      setReviewing(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const visible = filter === 'pending' ? rows.filter(r => r.status === 'pending') : rows;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Client Requests</h1>
          <p className="text-[13px] mt-1" style={themeStyles.muted}>Stock reservations and special requests submitted through the portal.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
          <button onClick={() => setFilter('pending')} className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={filter === 'pending' ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : themeStyles.muted}>Pending</button>
          <button onClick={() => setFilter('all')} className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={filter === 'all' ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : themeStyles.muted}>All</button>
        </div>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Client','Type','Item / Request','Qty','Status','Submitted',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : visible.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center"><Inbox className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>{filter === 'pending' ? 'No pending requests' : 'No requests yet'}</p></td></tr>
              : visible.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-5 py-3 font-semibold" style={themeStyles.primary}>{r.clientName}</td>
                  <td className="px-5 py-3 text-xs" style={themeStyles.muted}>{r.requestType === 'stock_reservation' ? 'Reservation' : 'Special Request'}</td>
                  <td className="px-5 py-3 max-w-xs" style={themeStyles.primary}>
                    {r.requestType === 'stock_reservation' ? (
                      <>{r.productName} <span className="text-xs font-mono" style={themeStyles.faint}>{r.productSku}</span></>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{r.freeText}</span>
                        {r.attachments.length > 0 && <ImageIcon className="h-3.5 w-3.5 shrink-0" style={themeStyles.faint} />}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{r.quantity ?? '—'}</td>
                  <td className="px-5 py-3"><span className="status-badge" style={STATUS_STYLES[r.status] ?? statusBadgeStyle('neutral')}>{r.status.replace(/_/g,' ')}</span></td>
                  <td className="px-5 py-3 text-xs" style={themeStyles.faint}>{formatDateTime(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openReview(r, 'approved')} className="p-1.5 rounded-md transition-colors hover:bg-[var(--badge-success-bg)]" style={{ color: 'var(--badge-success-text)' }} title="Approve"><Check className="h-4 w-4" /></button>
                        <button onClick={() => openReview(r, 'rejected')} className="p-1.5 rounded-md transition-colors hover:bg-[var(--badge-danger-bg)]" style={themeStyles.danger} title="Reject"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={decision === 'approved' ? 'Approve Request' : 'Reject Request'}>
        {reviewing && (
          <>
            <div className="mb-4 p-3 rounded-lg space-y-1" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-sm font-semibold" style={themeStyles.primary}>{reviewing.clientName}</p>
              {reviewing.requestType === 'stock_reservation' ? (
                <p className="text-xs" style={themeStyles.muted}>{reviewing.productName} — Qty {reviewing.quantity}</p>
              ) : (
                <p className="text-xs" style={themeStyles.muted}>{reviewing.freeText}</p>
              )}
              {reviewing.attachments.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {reviewing.attachments.map(a => (
                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer">
                      <img src={a.fileUrl} alt={a.fileName} className="w-14 h-14 object-cover rounded-lg" style={{ border: '1px solid var(--border)' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Notes {decision === 'rejected' ? '(let them know why)' : '(optional)'}</label>
                <textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReviewing(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className={decision === 'approved' ? 'btn-primary' : 'btn-danger'}
                  style={decision === 'approved' ? { borderColor: 'var(--badge-success-text)', color: 'var(--badge-success-text)' } : undefined}
                >
                  <span className="flex items-center gap-2 px-4 py-2 text-sm">
                    {saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />}
                    {decision === 'approved' ? 'Approve' : 'Reject'}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
