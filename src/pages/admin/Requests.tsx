import { useEffect, useState } from 'react';
import { Inbox, Check, X, Image as ImageIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../lib/utils';
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

const STATUS_COLORS: Record<string,string> = {
  pending:           'bg-amber-500/10 text-amber-400',
  approved:          'bg-emerald-500/10 text-emerald-400',
  rejected:          'bg-red-500/10 text-red-400',
  expired:           'bg-slate-500/10 text-slate-400',
  converted_to_po:   'bg-blue-500/10 text-blue-400',
  cancelled:         'bg-slate-500/10 text-slate-400',
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
          <h1 className="text-2xl font-bold text-white">Client Requests</h1>
          <p className="text-slate-400 text-sm mt-1">Stock reservations and special requests submitted through the portal.</p>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'pending' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Pending</button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>All</button>
        </div>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Client','Type','Item / Request','Qty','Status','Submitted',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : visible.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center"><Inbox className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">{filter === 'pending' ? 'No pending requests' : 'No requests yet'}</p></td></tr>
              : visible.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-5 py-3 font-medium text-white">{r.clientName}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{r.requestType === 'stock_reservation' ? 'Reservation' : 'Special Request'}</td>
                  <td className="px-5 py-3 text-slate-300 max-w-xs">
                    {r.requestType === 'stock_reservation' ? (
                      <>{r.productName} <span className="text-xs font-mono text-slate-500">{r.productSku}</span></>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{r.freeText}</span>
                        {r.attachments.length > 0 && <ImageIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{r.quantity ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${STATUS_COLORS[r.status] ?? ''}`}>{r.status.replace(/_/g,' ')}</span></td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openReview(r, 'approved')} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" title="Approve"><Check className="h-4 w-4" /></button>
                        <button onClick={() => openReview(r, 'rejected')} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Reject"><X className="h-4 w-4" /></button>
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
            <div className="mb-4 p-3 bg-white/5 rounded-lg space-y-1">
              <p className="text-sm font-medium text-white">{reviewing.clientName}</p>
              {reviewing.requestType === 'stock_reservation' ? (
                <p className="text-xs text-slate-400">{reviewing.productName} — Qty {reviewing.quantity}</p>
              ) : (
                <p className="text-xs text-slate-400">{reviewing.freeText}</p>
              )}
              {reviewing.attachments.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {reviewing.attachments.map(a => (
                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer">
                      <img src={a.fileUrl} alt={a.fileName} className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes {decision === 'rejected' ? '(let them know why)' : '(optional)'}</label>
                <textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReviewing(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${decision === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                  {decision === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
