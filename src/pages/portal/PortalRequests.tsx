import { useEffect, useState } from 'react';
import { Package2, MessageSquarePlus, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, themeStyles, statusBadgeStyle } from '../../lib/utils';
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

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:           statusBadgeStyle('warning'),
  approved:          statusBadgeStyle('success'),
  rejected:          statusBadgeStyle('danger'),
  expired:           statusBadgeStyle('muted'),
  converted_to_po:   statusBadgeStyle('info'),
  cancelled:         statusBadgeStyle('muted'),
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

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [reserveNotes, setReserveNotes] = useState('');

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
          <h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Reservations &amp; Requests</h1>
          <p className="text-[13px] mt-1" style={themeStyles.muted}>Reserve stock ahead of time, or ask us about something special.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openReserve} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Package2 className="h-4 w-4" /> Reserve Stock</button>
          <button onClick={openSpecial} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"><MessageSquarePlus className="h-4 w-4" /> Special Request</button>
        </div>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Type','Item / Request','Qty','Status','Submitted',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : myRequests.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Package2 className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No requests yet</p></td></tr>
              : myRequests.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-5 py-3 text-xs" style={themeStyles.muted}>{r.requestType === 'stock_reservation' ? 'Reservation' : 'Special Request'}</td>
                  <td className="px-5 py-3" style={themeStyles.primary}>
                    {r.requestType === 'stock_reservation' ? (
                      <>{r.productName} <span className="text-xs font-mono" style={themeStyles.faint}>{r.productSku}</span></>
                    ) : (
                      <span style={themeStyles.primary}>{r.freeText}</span>
                    )}
                  </td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{r.quantity ?? '—'}</td>
                  <td className="px-5 py-3"><span className="status-badge" style={STATUS_STYLES[r.status] ?? statusBadgeStyle('neutral')}>{r.status.replace(/_/g,' ')}</span></td>
                  <td className="px-5 py-3 text-xs" style={themeStyles.faint}>{formatDateTime(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    {r.attachments.length > 0 && (
                      <div className="flex gap-1">
                        {r.attachments.slice(0,3).map(a => (
                          <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" style={themeStyles.faint} title={a.fileName}>
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
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={submitReserve} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Product *</label>
            <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
              <option value="">— Select product —</option>
              {stock.map(s => <option key={s.productId} value={s.productId}>{s.productName} ({s.availableStock} available)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Quantity *</label>
            <input
              required type="number" min={1}
              max={stock.find(s => s.productId === parseInt(productId))?.availableStock}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={themeStyles.input}
            />
            {productId && (
              <p className="text-xs mt-1" style={themeStyles.faint}>
                {stock.find(s => s.productId === parseInt(productId))?.availableStock ?? 0} units currently available
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Notes</label>
            <textarea rows={2} value={reserveNotes} onChange={e => setReserveNotes(e.target.value)} placeholder="Optional — anything we should know?" className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Submit Reservation</button>
          </div>
        </form>
      </Modal>

      {/* Special Request Modal */}
      <Modal open={modal === 'special'} onClose={() => setModal(null)} title="Special Request">
        <p className="text-xs mb-4" style={themeStyles.faint}>Looking for something not in your catalog? Describe it and attach photos if helpful — our team will get back to you.</p>
        {error && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{error}</p>}
        <form onSubmit={submitSpecial} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>What do you need? *</label>
            <textarea required rows={3} value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="e.g. Looking for a black toner cartridge compatible with HP LaserJet M404" className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Attach Photos (optional, up to 5)</label>
            <label className="flex items-center justify-center gap-2 px-3 py-4 rounded-lg cursor-pointer transition-colors" style={{ border: '1px dashed var(--border)' }}>
              <Upload className="h-4 w-4" style={themeStyles.faint} />
              <span className="text-sm" style={themeStyles.muted}>{photos.length ? `${photos.length} photo(s) selected` : 'Click to upload images'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => setPhotos(Array.from(e.target.files ?? []).slice(0, 5))} />
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Additional Notes</label>
            <textarea rows={2} value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
