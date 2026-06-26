import { useEffect, useState } from 'react';
import { Truck, Plus, Check, PackageCheck, Trash2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDate, themeStyles, statusBadgeStyle } from '../../lib/utils';
import { Modal } from '../../components/Modal';

interface Shipment {
  id: number; referenceNumber: string; supplierName: string|null;
  expectedDate: string|null; arrivedDate: string|null; status: string;
}
interface ShipmentItem {
  id: number; productId: number; productName: string; productSku: string;
  warehouseId: number; quantity: number; receivedQty: number;
}
interface ShipmentDetail extends Shipment {
  items: ShipmentItem[];
}
interface Product { id: number; name: string; sku: string; }
interface Warehouse { id: number; name: string; status: string; }

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:            statusBadgeStyle('warning'),
  in_transit:         statusBadgeStyle('info'),
  arrived:            statusBadgeStyle('success'),
  partially_received: statusBadgeStyle('info'),
  cancelled:          statusBadgeStyle('muted'),
};

interface DraftLine { productId: string; quantity: number; }

export default function Shipments() {
  const { get, post, put } = useApi();
  const [items, setItems]         = useState<Shipment[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string|null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [supplierName, setSupplierName]       = useState('');
  const [expectedDate, setExpectedDate]       = useState('');
  const [warehouseId, setWarehouseId]         = useState('');
  const [notes, setNotes]                     = useState('');
  const [lines, setLines]   = useState<DraftLine[]>([{ productId: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string|null>(null);

  const [detail, setDetail]       = useState<ShipmentDetail|null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string|null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<Shipment[]>('/api/shipments'), get<Product[]>('/api/products'), get<Warehouse[]>('/api/warehouses')])
      .then(([s, p, w]) => {
        setItems(s); setProducts(p);
        setWarehouses(w.filter(x => x.status === 'active'));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setReferenceNumber(''); setSupplierName(''); setExpectedDate('');
    setWarehouseId(warehouses[0]?.id.toString() ?? '');
    setNotes(''); setLines([{ productId: '', quantity: 1 }]);
    setCreateError(null); setCreateOpen(true);
  };

  const addLine    = () => setLines(l => [...l, { productId: '', quantity: 1 }]);
  const removeLine = (idx: number) => setLines(l => l.filter((_, i) => i !== idx));
  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines(l => l.map((line, i) => i === idx ? { ...line, ...patch } : line));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setCreateError(null);
    if (!warehouseId) { setCreateError('Select a warehouse'); setSaving(false); return; }
    const validLines = lines.filter(l => l.productId && l.quantity > 0);
    if (!validLines.length) { setCreateError('Add at least one product line'); setSaving(false); return; }
    try {
      await post('/api/shipments', {
        referenceNumber, supplierName: supplierName || null,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        notes: notes || null,
        items: validLines.map(l => ({ productId: parseInt(l.productId), warehouseId: parseInt(warehouseId), quantity: l.quantity })),
      });
      setCreateOpen(false); load();
    } catch (err: unknown) { setCreateError(err instanceof Error ? err.message : 'Failed to create shipment'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (shipmentId: number, newStatus: string) => {
    setStatusUpdating(shipmentId);
    try { await put(`/api/shipments/${shipmentId}/status`, { status: newStatus }); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed to update status'); }
    finally { setStatusUpdating(null); }
  };

  const openDetail = async (s: Shipment) => {
    setDetailOpen(true); setReceiveError(null);
    try {
      const full = await get<ShipmentDetail>(`/api/shipments/${s.id}`);
      setDetail(full);
      const initial: Record<number, number> = {};
      full.items.forEach(i => { initial[i.id] = i.receivedQty; });
      setReceiveQtys(initial);
    } catch (err: unknown) { setReceiveError(err instanceof Error ? err.message : 'Failed to load shipment'); }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault(); if (!detail) return;
    setReceiving(true); setReceiveError(null);
    try {
      await post(`/api/shipments/${detail.id}/receive`, {
        receivedItems: detail.items.map(i => ({ itemId: i.id, receivedQty: receiveQtys[i.id] ?? i.receivedQty })),
      });
      setDetailOpen(false); load();
    } catch (err: unknown) { setReceiveError(err instanceof Error ? err.message : 'Failed to record receipt'); }
    finally { setReceiving(false); }
  };

  const isFullyReceived = detail?.items.every(i => (receiveQtys[i.id] ?? 0) >= i.quantity) ?? false;
  const isPastFinal = detail?.status === 'arrived' || detail?.status === 'cancelled';

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[28px] font-extrabold" style={themeStyles.primary}>Incoming Shipments</h1><p className="text-[13px] mt-1" style={themeStyles.muted}>Track supplier purchase orders and receive stock into inventory.</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus className="h-4 w-4" /> New Shipment</button>
      </div>
      {error && <p className="text-sm" style={themeStyles.danger}>{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Reference','Supplier','Expected','Arrived','Status',''].map(h => <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center" style={themeStyles.faint}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Truck className="h-10 w-10 mx-auto mb-2" style={themeStyles.faint} /><p style={themeStyles.muted}>No shipments yet</p></td></tr>
              : items.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs" style={themeStyles.primary}>{s.referenceNumber}</td>
                  <td className="px-5 py-3" style={themeStyles.primary}>{s.supplierName ?? '—'}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{formatDate(s.expectedDate)}</td>
                  <td className="px-5 py-3" style={themeStyles.muted}>{formatDate(s.arrivedDate)}</td>
                  <td className="px-5 py-3">
                    {(s.status === 'pending' || s.status === 'in_transit') ? (
                      <select
                        value={s.status}
                        disabled={statusUpdating === s.id}
                        onChange={e => handleStatusChange(s.id, e.target.value)}
                        className="status-badge border-0 cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50"
                        style={STATUS_STYLES[s.status]}
                      >
                        <option value="pending">pending</option>
                        <option value="in_transit">in transit</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    ) : (
                      <span className="status-badge" style={STATUS_STYLES[s.status] ?? statusBadgeStyle('neutral')}>{s.status.replace('_',' ')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => openDetail(s)} className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                      <PackageCheck className="h-3.5 w-3.5" /> {s.status === 'arrived' ? 'View' : 'Receive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shipment modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" title="New Incoming Shipment">
        {createError && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{createError}</p>}
        {warehouses.length === 0 && (
          <p className="text-sm mb-4 p-3 rounded-lg" style={statusBadgeStyle('warning')}>No active warehouses found — add one under Warehouses first.</p>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>PO / Reference Number *</label>
              <input required value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. PO-2026-014" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Supplier Name</label>
              <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Expected Date</label>
              <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Receiving Warehouse *</label>
              <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                <option value="">— Select —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium" style={themeStyles.muted}>Expected Items *</label>
              <button type="button" onClick={addLine} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>+ Add line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                  <select value={line.productId} onChange={e => updateLine(idx, { productId: e.target.value })} className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <input type="number" min={1} value={line.quantity} onChange={e => updateLine(idx, { quantity: parseInt(e.target.value) || 1 })} className="w-24 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2" style={themeStyles.input} />
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="p-2" style={themeStyles.faint}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={themeStyles.muted}>Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2" style={themeStyles.input} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">{saving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <Check className="h-4 w-4" />} Create Shipment</button>
          </div>
        </form>
      </Modal>

      {/* Detail / Receive modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" title={detail ? `Receive — ${detail.referenceNumber}` : 'Loading…'}>
        {detail && (
          <>
            <div className="flex items-center gap-3 mb-4 text-sm" style={themeStyles.muted}>
              <span>{detail.supplierName ?? 'No supplier listed'}</span>
              <span>·</span>
              <span>Expected {formatDate(detail.expectedDate)}</span>
              <span className="status-badge" style={STATUS_STYLES[detail.status] ?? statusBadgeStyle('neutral')}>{detail.status.replace('_',' ')}</span>
            </div>
            {receiveError && <p className="text-sm mb-4 p-3 rounded-lg" style={themeStyles.errorBox}>{receiveError}</p>}
            <form onSubmit={handleReceive} className="space-y-4">
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <thead><tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Product','Ordered','Already Received','Receiving Now'].map(h => <th key={h} className="px-3 py-2 text-[11px] font-bold uppercase text-left" style={{ ...themeStyles.muted, letterSpacing: '0.4px' }}>{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2"><div style={themeStyles.primary}>{item.productName}</div><div className="text-xs font-mono" style={themeStyles.faint}>{item.productSku}</div></td>
                        <td className="px-3 py-2" style={themeStyles.muted}>{item.quantity}</td>
                        <td className="px-3 py-2" style={themeStyles.muted}>{item.receivedQty}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={item.quantity}
                            disabled={isPastFinal}
                            value={receiveQtys[item.id] ?? item.receivedQty}
                            onChange={e => setReceiveQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)) }))}
                            className="w-24 px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                            style={themeStyles.input}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs" style={themeStyles.faint}>
                {isFullyReceived
                  ? 'All items fully received — this shipment will be marked Arrived.'
                  : 'Partial quantities will mark this shipment as Partially Received. You can come back later to record the rest.'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDetailOpen(false)} className="btn-secondary px-4 py-2 text-sm">{isPastFinal ? 'Close' : 'Cancel'}</button>
                {!isPastFinal && (
                  <button type="submit" disabled={receiving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    {receiving ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /> : <PackageCheck className="h-4 w-4" />}
                    Save Receipt
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
