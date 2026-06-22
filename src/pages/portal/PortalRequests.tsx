import { useEffect, useState } from 'react';
import { Package2, MessageSquarePlus, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Modal } from '../../components/Modal';

interface StockItem { productId: number; productName: string; productSku: string; availableStock: number; warehouseId: number; }
interface Attachment { id: number; fileUrl: string; fileName: string; }
interface RequestRow {
  id: number; requestType: 'stock_reservation'|'special_request';
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

export default function PortalRequests() {
  const { get } = useApi();
  const { token } = useAuth();
  const [stock, setStock]       = useState<StockItem[]>([]);
  const [myRequests, setMyRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'reserve'|'special'|null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string|null>(null);

  // Reserve form state
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [reserveNotes, setReserveNotes] = useState('');

  // Special request form state
  const [freeText, setFreeText]   = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [photos, setPhotos]       = useState<File[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([get<StockItem[]>('/api/portal/stock'), get<RequestRow[]>('/api/reservations/mine')])
      .then(([s, r]) => { setStock(s); setMyRequests(r); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openReserve = () => { setProductId(''); setQuantity(1); setReserveNotes(''); setError(null); setModal('reserve'); };
  const openSpecial = () => { setFreeText(''); setSpecialNotes(''); setPhotos([]); setError(null); setModal('special'); };

  const submitReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { setError('Select a product'); return; }
    const selected = stock.find(s => s.productId === parseInt(productId));
    if (!selected) { setError('Selected product not found'); return; }
    setSaving(true); setError(null);
    try {
      const form = new FormData();
      form.append('requestType', 'stock_reservation');
      form.append('productId', productId);
      form.append('warehouseId', String(selected.warehouseId));
      form.append('quantity', String(quantity));
      if (reserveNotes) form.append('notes', reserveNotes);
      const res = await fetch('/api/reservations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed'); }
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const submitSpecial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) { setError('Please describe what you need'); return; }
    setSaving(true); setError(null);
    try {
      const form = new FormData();
      form.append('requestType', 'special_request');
      form.append('freeText', freeText);
      if (specialNotes) form.append('notes', specialNotes);
      photos.forEach(p => form.append('photos', p));
      const res = await fetch('/api/reservations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed'); }
      setModal(null); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reservations &amp; Requests</h1>
          <p className="text-slate-400 text-sm mt-1">Reserve stock ahead of time, or ask us about something special.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openReserve} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Package2 className="h-4 w-4" /> Reserve Stock</button>
          <button onClick={openSpecial} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg transition-colors"><MessageSquarePlus className="h-4 w-4" /> Special Request</button>
        </div>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{['Type','Item / Request','Qty','Status','Submitted',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : myRequests.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No requests yet</p></td></tr>
              : myRequests.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-5 py-3 text-xs text-slate-400">{r.requestType === 'stock_reservation' ? 'Reservation' : 'Special Request'}</td>
                  <td className="px-5 py-3 text-white">
                    {r.requestType === 'stock_reservation' ? (
                      <>{r.productName} <span className="text-xs font-mono text-slate-500">{r.productSku}</span></>
                    ) : (
                      <span className="text-slate-300">{r.freeText}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{r.quantity ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`status-badge ${STATUS_COLORS[r.status] ?? ''}`}>{r.status.replace(/_/g,' ')}</span></td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    {r.attachments.length > 0 && (
                      <div className="flex gap-1">
                        {r.attachments.slice(0,3).map(a => (
                          <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white" title={a.fileName}>
                            <ImageIcon className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reserve Stock Modal */}
      <Modal open={modal === 'reserve'} onClose={() => setModal(null)} title="Reserve Stock">
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
        <form onSubmit={submitReserve} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Product *</label>
            <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">— Select product —</option>
              {stock.map(s => <option key={s.productId} value={s.productId} className="bg-slate-800">{s.productName} ({s.availableStock} available)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity *</label>
            <input
              required type="number" min={1}
              max={stock.find(s => s.productId === parseInt(productId))?.availableStock}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {productId && (
              <p className="text-xs text-slate-500 mt-1">
                {stock.find(s => s.productId === parseInt(productId))?.availableStock ?? 0} units currently available
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea rows={2} value={reserveNotes} onChange={e => setReserveNotes(e.target.value)} placeholder="Optional — anything we should know?" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Submit Reservation</button>
          </div>
        </form>
      </Modal>

      {/* Special Request Modal */}
      <Modal open={modal === 'special'} onClose={() => setModal(null)} title="Special Request">
        <p className="text-xs text-slate-500 mb-4">Looking for something not in your catalog? Describe it and attach photos if helpful — our team will get back to you.</p>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{error}</p>}
        <form onSubmit={submitSpecial} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">What do you need? *</label>
            <textarea required rows={3} value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="e.g. Looking for a black toner cartridge compatible with HP LaserJet M404" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Attach Photos (optional, up to 5)</label>
            <label className="flex items-center justify-center gap-2 px-3 py-4 border border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
              <Upload className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">{photos.length ? `${photos.length} photo(s) selected` : 'Click to upload images'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => setPhotos(Array.from(e.target.files ?? []).slice(0, 5))} />
            </label>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Additional Notes</label>
            <textarea rows={2} value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
