import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { products, inventory, warehouses, categories, brands, shipmentItems, reservations, inventoryAdjustments } from '../db/schema.js';
import { eq, isNull, and, like, desc } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name:        z.string().min(1),
  sku:         z.string().min(1).optional(),  // auto-generated if omitted
  brandId:     z.number().int().optional().nullable(),
  categoryId:  z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl:    z.string().url().optional().nullable(),
  unit:        z.string().default('pcs'),
  minOrderQty: z.number().int().min(1).default(1),
  attributes:  z.record(z.unknown()).optional().nullable(),
  status:      z.enum(['active', 'draft', 'archived']).default('active'),
});

/** Builds a 3-letter prefix code from a name, e.g. "Toners" -> "TON", "HP" -> "HP". */
function codeFromName(name: string | undefined | null): string {
  if (!name) return 'GEN';
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (cleaned.slice(0, 3) || 'GEN').padEnd(3, 'X');
}

/**
 * Generates the next SKU in the pattern CAT-BRD-0001, scoped to that
 * category+brand prefix so numbering restarts per combination.
 */
async function generateSku(categoryId: number | null | undefined, brandId: number | null | undefined): Promise<string> {
  let catCode = 'GEN';
  let brdCode = 'GEN';

  if (categoryId) {
    const [cat] = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, categoryId));
    if (cat) catCode = codeFromName(cat.name);
  }
  if (brandId) {
    const [brand] = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, brandId));
    if (brand) brdCode = codeFromName(brand.name);
  }

  const prefix = `${catCode}-${brdCode}-`;
  const existing = await db
    .select({ sku: products.sku })
    .from(products)
    .where(like(products.sku, `${prefix}%`))
    .orderBy(desc(products.sku))
    .limit(1);

  let nextNum = 1;
  if (existing.length) {
    const match = existing[0].sku.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// GET /api/products — internal only (no client filtering here, see portal route)
router.get('/', requireRole(INTERNAL_ROLES), async (req: AuthRequest, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const all = await db
      .select()
      .from(products)
      .where(includeArchived ? undefined : isNull(products.deletedAt));
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/products/next-sku — preview the SKU that would be generated for a category/brand combo
// NOTE: must be registered before GET /:id, otherwise Express matches "next-sku" as an :id param.
router.get('/next-sku', requireRole(['super_admin', 'inventory_manager']), async (req: AuthRequest, res) => {
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
  const brandId     = req.query.brandId ? parseInt(req.query.brandId as string) : null;
  try {
    const sku = await generateSku(categoryId, brandId);
    res.json({ sku });
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
    const sku = parsed.data.sku || await generateSku(parsed.data.categoryId, parsed.data.brandId);

    const [product] = await db
      .insert(products)
      .values({ ...parsed.data, sku, createdBy: req.user!.id })
      .returning();

    // Auto-create an inventory record (starting at 0 stock) for every active warehouse
    const activeWarehouses = await db.select().from(warehouses).where(eq(warehouses.status, 'active'));
    if (activeWarehouses.length) {
      await db.insert(inventory).values(
        activeWarehouses.map(w => ({ productId: product.id, warehouseId: w.id }))
      ).onConflictDoNothing();
    }

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'CREATE', resource: 'product', resourceId: product.id,
      details: { sku: product.sku, name: product.name },
    });
    res.status(201).json(product);
  } catch (err: unknown) {
    if (err instanceof Error && /unique/i.test(err.message) && /sku/i.test(err.message)) {
      res.status(409).json({ error: 'That SKU is already in use. Try again or enter one manually.' });
      return;
    }
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

// POST /api/products/:id/restore — bring an archived product back to active
router.post('/:id/restore', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    const [updated] = await db.update(products)
      .set({ deletedAt: null, status: 'active', updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: 'Product not found' }); return; }
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'RESTORE', resource: 'product', resourceId: id });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// DELETE /api/products/:id — soft delete (archive)
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

// DELETE /api/products/:id/permanent — true hard delete, only allowed when the product
// has no real transaction history. This exists for genuine mistakes/duplicates created
// in error — anything that's actually been received, reserved, or adjusted should be
// archived instead (the endpoint above), never hard-deleted, since that would silently
// erase real audit/inventory history tied to past shipments or client requests.
router.delete('/:id/permanent', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const [shipmentRef]    = await db.select({ id: shipmentItems.id }).from(shipmentItems).where(eq(shipmentItems.productId, id)).limit(1);
    const [reservationRef] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.productId, id)).limit(1);

    const invRows = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.productId, id));
    let adjustmentRef: { id: number } | undefined;
    for (const inv of invRows) {
      const [adj] = await db.select({ id: inventoryAdjustments.id }).from(inventoryAdjustments).where(eq(inventoryAdjustments.inventoryId, inv.id)).limit(1);
      if (adj) { adjustmentRef = adj; break; }
    }

    if (shipmentRef || reservationRef || adjustmentRef) {
      res.status(409).json({
        error: 'This product has real transaction history (a shipment line, a client reservation, or a stock adjustment) and can\'t be permanently deleted. Use Archive instead to remove it from active lists while keeping that history intact.',
      });
      return;
    }

    // Safe to fully remove — delete inventory rows first (no cascade defined on that FK), then the product itself.
    await db.delete(inventory).where(eq(inventory.productId, id));
    await db.delete(products).where(eq(products.id, id));

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'PERMANENT_DELETE', resource: 'product', resourceId: id,
      details: { name: product.name, sku: product.sku },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
