import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { inventory, products, warehouses, inventoryAdjustments } from '../db/schema.js';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const adjustSchema = z.object({
  inventoryId:   z.number().int(),
  type:          z.enum(['received','manual_add','manual_deduct','damage','return','correction']),
  quantityDelta: z.number().int(),
  reason:        z.string().optional(),
  reference:     z.string().optional(),
});

// GET /api/inventory
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const rows = await db
      .select({
        id:             inventory.id,
        productId:      inventory.productId,
        productName:    products.name,
        productSku:     products.sku,
        warehouseId:    inventory.warehouseId,
        warehouseName:  warehouses.name,
        physicalStock:  inventory.physicalStock,
        reservedStock:  inventory.reservedStock,
        allocatedStock: inventory.allocatedStock,
        onHoldStock:    inventory.onHoldStock,
        reorderLevel:   inventory.reorderLevel,
        availableStock: sql<number>`(${inventory.physicalStock} - ${inventory.reservedStock} - ${inventory.allocatedStock} - ${inventory.onHoldStock})`,
        updatedAt:      inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      // Archived/soft-deleted products were previously still showing up here forever —
      // this view should only reflect products that are still part of the active catalog.
      .where(isNull(products.deletedAt));
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/inventory/:id/adjustments
router.get('/:id/adjustments', requireRole(INTERNAL_ROLES), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.inventoryId, id)).orderBy(inventoryAdjustments.createdAt);
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/inventory/adjust — stock adjustment
router.post('/adjust', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { inventoryId, type, quantityDelta, reason, reference } = parsed.data;

  try {
    // Fetch current inventory
    const rows = await db.select().from(inventory).where(eq(inventory.id, inventoryId));
    if (!rows.length) { res.status(404).json({ error: 'Inventory record not found' }); return; }
    const inv = rows[0];

    const newPhysical = inv.physicalStock + quantityDelta;
    if (newPhysical < 0) {
      res.status(400).json({ error: 'Adjustment would result in negative stock' });
      return;
    }

    // Apply and log
    await db.update(inventory).set({ physicalStock: newPhysical, updatedAt: new Date() }).where(eq(inventory.id, inventoryId));
    const [log] = await db.insert(inventoryAdjustments).values({
      inventoryId, type, quantityDelta, reason, reference, performedBy: req.user!.id,
    }).returning();

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'ADJUST', resource: 'inventory', resourceId: inventoryId,
      details: { type, quantityDelta, reason, before: inv.physicalStock, after: newPhysical },
    });
    res.json({ inventory: { ...inv, physicalStock: newPhysical }, adjustment: log });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/inventory/:id/reorder-level
router.put('/:id/reorder-level', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { reorderLevel } = z.object({ reorderLevel: z.number().int().min(0) }).parse(req.body);
  try {
    const [updated] = await db.update(inventory).set({ reorderLevel, updatedAt: new Date() }).where(eq(inventory.id, id)).returning();
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
