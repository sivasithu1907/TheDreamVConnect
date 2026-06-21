import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { warehouses, inventory, products } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const warehouseSchema = z.object({
  name:      z.string().min(1),
  location:  z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  status:    z.enum(['active', 'inactive']).optional(),
});

// GET /api/warehouses
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db.select().from(warehouses).orderBy(warehouses.name);
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/warehouses
router.post('/', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const parsed = warehouseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    // If this is marked default, unset any other default first
    if (parsed.data.isDefault) {
      await db.update(warehouses).set({ isDefault: false }).where(eq(warehouses.isDefault, true));
    }

    const [warehouse] = await db.insert(warehouses).values(parsed.data).returning();

    // Backfill: create inventory rows for any product missing one in this warehouse
    const allProducts = await db.select({ id: products.id }).from(products).where(isNull(products.deletedAt));
    if (allProducts.length) {
      await db.insert(inventory).values(
        allProducts.map(p => ({ productId: p.id, warehouseId: warehouse.id }))
      ).onConflictDoNothing();
    }

    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', resource: 'warehouse', resourceId: warehouse.id, details: { name: warehouse.name } });
    res.status(201).json(warehouse);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/warehouses/:id
router.put('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = warehouseSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    if (parsed.data.isDefault) {
      await db.update(warehouses).set({ isDefault: false }).where(eq(warehouses.isDefault, true));
    }
    const [updated] = await db.update(warehouses).set(parsed.data).where(eq(warehouses.id, id)).returning();
    if (!updated) { res.status(404).json({ error: 'Warehouse not found' }); return; }
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', resource: 'warehouse', resourceId: id, details: parsed.data });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/warehouses/:id/backfill — create missing inventory rows for this warehouse
router.post('/:id/backfill', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const warehouseId = parseInt(req.params.id);
  try {
    const allProducts = await db.select({ id: products.id }).from(products).where(isNull(products.deletedAt));
    let created = 0;
    if (allProducts.length) {
      const result = await db.insert(inventory).values(
        allProducts.map(p => ({ productId: p.id, warehouseId }))
      ).onConflictDoNothing().returning();
      created = result.length;
    }
    res.json({ success: true, created });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
