import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { products, inventory, warehouses } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name:        z.string().min(1),
  sku:         z.string().min(1),
  brandId:     z.number().int().optional().nullable(),
  categoryId:  z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl:    z.string().url().optional().nullable(),
  unit:        z.string().default('pcs'),
  minOrderQty: z.number().int().min(1).default(1),
  attributes:  z.record(z.unknown()).optional().nullable(),
  status:      z.enum(['active', 'draft', 'archived']).default('active'),
});

// GET /api/products — internal only (no client filtering here, see portal route)
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/products/:id
router.get('/:id', requireRole(INTERNAL_ROLES), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await db.select().from(products).where(and(eq(products.id, id), isNull(products.deletedAt)));
    if (!rows.length) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(rows[0]);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/products — also auto-creates inventory record on default warehouse
router.post('/', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    const [product] = await db
      .insert(products)
      .values({ ...parsed.data, createdBy: req.user!.id })
      .returning();

    // Auto-create inventory record on default warehouse
    const defaultWarehouse = await db.select().from(warehouses).where(eq(warehouses.isDefault, true));
    if (defaultWarehouse.length) {
      await db.insert(inventory).values({
        productId:   product.id,
        warehouseId: defaultWarehouse[0].id,
      }).onConflictDoNothing();
    }

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'CREATE', resource: 'product', resourceId: product.id,
      details: { sku: product.sku, name: product.name },
    });
    res.status(201).json(product);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/products/:id
router.put('/:id', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    const [updated] = await db
      .update(products)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning();
    if (!updated) { res.status(404).json({ error: 'Product not found' }); return; }
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', resource: 'product', resourceId: id, details: parsed.data });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.update(products).set({ deletedAt: new Date(), status: 'archived' }).where(eq(products.id, id));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', resource: 'product', resourceId: id });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
