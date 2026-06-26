import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { incomingShipments, shipmentItems, inventory, products } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const shipmentSchema = z.object({
  referenceNumber: z.string().min(1),
  supplierName:    z.string().optional().nullable(),
  expectedDate:    z.string().datetime().optional().nullable(),
  notes:           z.string().optional().nullable(),
  items: z.array(z.object({
    productId:   z.number().int(),
    warehouseId: z.number().int(),
    quantity:    z.number().int().min(1),
  })).min(1),
});

// GET /api/shipments
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db.select().from(incomingShipments).orderBy(incomingShipments.createdAt);
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/shipments/:id  (with line items)
router.get('/:id', requireRole(INTERNAL_ROLES), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await db.select().from(incomingShipments).where(eq(incomingShipments.id, id));
    if (!rows.length) { res.status(404).json({ error: 'Shipment not found' }); return; }
    const items = await db
      .select({ id: shipmentItems.id, productId: shipmentItems.productId, productName: products.name, productSku: products.sku, warehouseId: shipmentItems.warehouseId, quantity: shipmentItems.quantity, receivedQty: shipmentItems.receivedQty })
      .from(shipmentItems)
      .innerJoin(products, eq(shipmentItems.productId, products.id))
      .where(eq(shipmentItems.shipmentId, id));
    res.json({ ...rows[0], items });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/shipments
router.post('/', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const parsed = shipmentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { items, ...shipmentData } = parsed.data;

  try {
    const [shipment] = await db.insert(incomingShipments).values({
      ...shipmentData,
      expectedDate: shipmentData.expectedDate ? new Date(shipmentData.expectedDate) : null,
      createdBy: req.user!.id,
    }).returning();

    await db.insert(shipmentItems).values(items.map(i => ({ ...i, shipmentId: shipment.id })));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', resource: 'shipment', resourceId: shipment.id, details: { ref: shipment.referenceNumber } });
    res.status(201).json(shipment);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/shipments/:id/receive — mark arrived (or partially received), update inventory
router.post('/:id/receive', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const shipmentId = parseInt(req.params.id);
  const { receivedItems } = z.object({
    receivedItems: z.array(z.object({ itemId: z.number().int(), receivedQty: z.number().int().min(0) }))
  }).parse(req.body);

  try {
    const allItems = await db.select().from(shipmentItems).where(eq(shipmentItems.shipmentId, shipmentId));
    if (!allItems.length) { res.status(404).json({ error: 'Shipment not found or has no items' }); return; }

    const receivedMap = new Map(receivedItems.map(ri => [ri.itemId, ri.receivedQty]));

    for (const item of allItems) {
      if (!receivedMap.has(item.id)) continue;
      const newReceivedQty = receivedMap.get(item.id)!;
      const previouslyReceived = item.receivedQty;
      const delta = newReceivedQty - previouslyReceived;

      if (delta === 0) continue;
      if (newReceivedQty > item.quantity) {
        res.status(400).json({ error: `Received quantity for an item exceeds ordered quantity (ordered ${item.quantity}, attempted ${newReceivedQty})` });
        return;
      }

      await db.update(shipmentItems).set({ receivedQty: newReceivedQty }).where(eq(shipmentItems.id, item.id));

      // Only the newly-arrived delta gets added to physical stock — this correctly supports
      // receiving the same shipment across multiple sessions (e.g. half today, rest next week)
      // without double-counting stock that was already added on a previous receive.
      const [inv] = await db.select().from(inventory)
        .where(and(eq(inventory.productId, item.productId), eq(inventory.warehouseId, item.warehouseId)));
      if (inv) {
        await db.update(inventory)
          .set({ physicalStock: inv.physicalStock + delta, updatedAt: new Date() })
          .where(eq(inventory.id, inv.id));
      }
    }

    // Determine whether everything ordered has now been fully received, across all line items
    // (using the just-submitted quantities merged with whatever was already recorded before this call).
    const updatedItems = await db.select().from(shipmentItems).where(eq(shipmentItems.shipmentId, shipmentId));
    const fullyReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
    const newStatus = fullyReceived ? 'arrived' : 'partially_received';

    await db.update(incomingShipments)
      .set({ status: newStatus, arrivedDate: fullyReceived ? new Date() : null, updatedAt: new Date() })
      .where(eq(incomingShipments.id, shipmentId));

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'RECEIVE', resource: 'shipment', resourceId: shipmentId,
      details: { status: newStatus, receivedItems },
    });
    res.json({ success: true, status: newStatus });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/shipments/:id/status
router.put('/:id/status', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { status } = z.object({ status: z.enum(['pending','in_transit','arrived','partially_received','cancelled']) }).parse(req.body);
  try {
    const [updated] = await db.update(incomingShipments).set({ status, updatedAt: new Date() }).where(eq(incomingShipments.id, id)).returning();
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE_STATUS', resource: 'shipment', resourceId: id, details: { status } });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
