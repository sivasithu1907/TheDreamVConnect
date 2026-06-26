import { useEffect, useState } from 'react';
import { Truck, Plus, Check, PackageCheck, Trash2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';
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

const STATUS_COLORS: Record<string,string> = {
  pending:            'bg-amber-500/10 text-amber-400',
  in_transit:         'bg-blue-500/10 text-blue-400',
  arrived:            'bg-emerald-500/10 text-emerald-400',
  partially_received: 'bg-purple-500/10 text-purple-400',
  cancelled:          'bg-slate-500/10 text-slate-400',
};

interface DraftLine { productId: string; quantity: number; }

export default function Shipments() {
  const { get, post, put } = useApi();
  const [items, setItems]         = useState<Shipment[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string|null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [supplierName, setSupplierName]       = useState('');
  const [expectedDate, setExpectedDate]       = useState('');
  const [warehouseId, setWarehouseId]         = useState('');
  const [notes, setNotes]                     = useState('');
  const [lines, setLines]   = useState<DraftLine[]>([{ productId: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string|null>(null);

  // Detail/receive modal state
  const [detail, setDetail]       = useState<ShipmentDetail|null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([get<Shipment[]>('/api/shipments'), get<Product[]>('/api/products'), get<Warehouse[]>('/api/warehouses')])
      .then(([s, p, w]) => {
        setItems(s); setProducts(p);
        const active = w.filter(x => x.status === 'active');
        setWarehouses(active);
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

  const [statusUpdating, setStatusUpdating] = useState<number|null>(null);
  const handleStatusChange = async (shipmentId: number, newStatus: string) => {
    setStatusUpdating(shipmentId);
    try {
      await put(`/api/shipments/${shipmentId}/status`, { status: newStatus });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
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
        <div><h1 className="text-2xl font-bold text-white">Incoming Shipments</h1><p className="text-slate-400 text-sm mt-1">Track supplier purchase orders and receive stock into inventory.</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"><Plus className="h-4 w-4" /> New Shipment</button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {['Reference','Supplier','Expected','Arrived','Status',''].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Truck className="h-10 w-10 text-slate-600 mx-auto mb-2" /><p className="text-slate-400">No shipments yet</p></td></tr>
              : items.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-5 py-3 font-mono text-xs text-white">{s.referenceNumber}</td>
                  <td className="px-5 py-3 text-slate-300">{s.supplierName ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(s.expectedDate)}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(s.arrivedDate)}</td>
                  <td className="px-5 py-3">
                    {(s.status === 'pending' || s.status === 'in_transit') ? (
                      <select
                        value={s.status}
                        disabled={statusUpdating === s.id}
                        onChange={e => handleStatusChange(s.id, e.target.value)}
                        className={`status-badge border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${STATUS_COLORS[s.status] ?? ''}`}
                      >
                        <option value="pending" className="bg-slate-800 text-white">pending</option>
                        <option value="in_transit" className="bg-slate-800 text-white">in transit</option>
                        <option value="cancelled" className="bg-slate-800 text-white">cancelled</option>
                      </select>
                    ) : (
                      <span className={`status-badge ${STATUS_COLORS[s.status] ?? ''}`}>{s.status.replace('_',' ')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => openDetail(s)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
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
        {createError && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{createError}</p>}
        {warehouses.length === 0 && (
          <p className="text-amber-400 text-sm mb-4 p-3 bg-amber-500/10 rounded-lg">No active warehouses found — add one under Warehouses first.</p>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">PO / Reference Number *</label>
              <input required value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. PO-2026-014" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supplier Name</label>
              <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expected Date</label>
              <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Receiving Warehouse *</label>
              <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">— Select —</option>
                {warehouses.map(w => <option key={w.id} value={w.id} className="bg-slate-800">{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-slate-400">Expected Items *</label>
              <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ Add line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                  <select value={line.productId} onChange={e => updateLine(idx, { productId: e.target.value })} className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name} ({p.sku})</option>)}
                  </select>
                  <input type="number" min={1} value={line.quantity} onChange={e => updateLine(idx, { quantity: parseInt(e.target.value) || 1 })} className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />} Create Shipment</button>
          </div>
        </form>
      </Modal>

      {/* Detail / Receive modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" title={detail ? `Receive — ${detail.referenceNumber}` : 'Loading…'}>
        {detail && (
          <>
            <div className="flex items-center gap-3 mb-4 text-sm text-slate-400">
              <span>{detail.supplierName ?? 'No supplier listed'}</span>
              <span>·</span>
              <span>Expected {formatDate(detail.expectedDate)}</span>
              <span className={`status-badge ${STATUS_COLORS[detail.status] ?? ''}`}>{detail.status.replace('_',' ')}</span>
            </div>
            {receiveError && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg">{receiveError}</p>}
            <form onSubmit={handleReceive} className="space-y-4">
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/5">
                    {['Product','Ordered','Already Received','Receiving Now'].map(h => <th key={h} className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2"><div className="text-white">{item.productName}</div><div className="text-xs font-mono text-slate-500">{item.productSku}</div></td>
                        <td className="px-3 py-2 text-slate-400">{item.quantity}</td>
                        <td className="px-3 py-2 text-slate-400">{item.receivedQty}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={item.quantity}
                            disabled={isPastFinal}
                            value={receiveQtys[item.id] ?? item.receivedQty}
                            onChange={e => setReceiveQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)) }))}
                            className="w-24 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                {isFullyReceived
                  ? 'All items fully received — this shipment will be marked Arrived.'
                  : 'Partial quantities will mark this shipment as Partially Received. You can come back later to record the rest.'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDetailOpen(false)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-lg">{isPastFinal ? 'Close' : 'Cancel'}</button>
                {!isPastFinal && (
                  <button type="submit" disabled={receiving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                    {receiving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PackageCheck className="h-4 w-4" />}
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
