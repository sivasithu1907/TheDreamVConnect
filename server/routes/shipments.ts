import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { incomingShipments, shipmentItems, inventory, products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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

// POST /api/shipments/:id/receive — mark arrived, update inventory
router.post('/:id/receive', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const shipmentId = parseInt(req.params.id);
  const { receivedItems } = z.object({
    receivedItems: z.array(z.object({ itemId: z.number().int(), receivedQty: z.number().int().min(0) }))
  }).parse(req.body);

  try {
    for (const ri of receivedItems) {
      const [item] = await db.select().from(shipmentItems).where(eq(shipmentItems.id, ri.itemId));
      if (!item) continue;
      await db.update(shipmentItems).set({ receivedQty: ri.receivedQty }).where(eq(shipmentItems.id, ri.itemId));

      // Add to physical stock
      const invRows = await db.select().from(inventory).where(eq(inventory.productId, item.productId) && eq(inventory.warehouseId, item.warehouseId));
      if (invRows.length) {
        await db.update(inventory).set({ physicalStock: invRows[0].physicalStock + ri.receivedQty, updatedAt: new Date() }).where(eq(inventory.id, invRows[0].id));
      }
    }
    await db.update(incomingShipments).set({ status: 'arrived', arrivedDate: new Date(), updatedAt: new Date() }).where(eq(incomingShipments.id, shipmentId));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'RECEIVE', resource: 'shipment', resourceId: shipmentId });
    res.json({ success: true });
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
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
