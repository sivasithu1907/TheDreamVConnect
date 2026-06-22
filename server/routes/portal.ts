import { Router } from 'express';
import { db } from '../db/index.js';
import { products, inventory, warehouses, clientCategories, incomingShipments, shipmentItems } from '../db/schema.js';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, CLIENT_ROLES } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(CLIENT_ROLES));

// Helper: get category IDs allowed for the current client
async function getClientCategoryIds(clientId: number): Promise<number[]> {
  const rows = await db
    .select({ categoryId: clientCategories.categoryId })
    .from(clientCategories)
    .where(eq(clientCategories.clientId, clientId));
  return rows.map(r => r.categoryId);
}

// GET /api/portal/stock — available stock filtered by client's categories
router.get('/stock', async (req: AuthRequest, res) => {
  if (!req.user!.clientId) {
    res.status(403).json({ error: 'No client account linked to this user' });
    return;
  }

  try {
    const categoryIds = await getClientCategoryIds(req.user!.clientId);
    if (!categoryIds.length) {
      res.json([]);
      return;
    }

    const rows = await db
      .select({
        productId:      products.id,
        productName:    products.name,
        productSku:     products.sku,
        unit:           products.unit,
        minOrderQty:    products.minOrderQty,
        categoryId:     products.categoryId,
        brandId:        products.brandId,
        description:    products.description,
        imageUrl:       products.imageUrl,
        physicalStock:  inventory.physicalStock,
        reservedStock:  inventory.reservedStock,
        allocatedStock: inventory.allocatedStock,
        onHoldStock:    inventory.onHoldStock,
        availableStock: sql<number>`(${inventory.physicalStock} - ${inventory.reservedStock} - ${inventory.allocatedStock} - ${inventory.onHoldStock})`,
        warehouseId:    inventory.warehouseId,
        warehouseName:  warehouses.name,
      })
      .from(products)
      .innerJoin(inventory,   eq(inventory.productId, products.id))
      .innerJoin(warehouses,  eq(inventory.warehouseId, warehouses.id))
      .where(
        and(
          inArray(products.categoryId!, categoryIds),
          isNull(products.deletedAt),
          eq(products.status, 'active'),
        )
      );

    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/portal/shipments — incoming shipments for products in client's categories
router.get('/shipments', async (req: AuthRequest, res) => {
  if (!req.user!.clientId) { res.status(403).json({ error: 'No client account linked' }); return; }

  try {
    const categoryIds = await getClientCategoryIds(req.user!.clientId);
    if (!categoryIds.length) { res.json([]); return; }

    // Get product IDs in allowed categories
    const allowedProducts = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(and(inArray(products.categoryId!, categoryIds), isNull(products.deletedAt)));
    const allowedProductIds = allowedProducts.map(p => p.id);
    if (!allowedProductIds.length) { res.json([]); return; }

    const items = await db
      .select({
        shipmentId:      incomingShipments.id,
        referenceNumber: incomingShipments.referenceNumber,
        expectedDate:    incomingShipments.expectedDate,
        status:          incomingShipments.status,
        productId:       shipmentItems.productId,
        productName:     products.name,
        productSku:      products.sku,
        quantity:        shipmentItems.quantity,
      })
      .from(shipmentItems)
      .innerJoin(incomingShipments, eq(shipmentItems.shipmentId, incomingShipments.id))
      .innerJoin(products, eq(shipmentItems.productId, products.id))
      .where(
        and(
          inArray(shipmentItems.productId, allowedProductIds),
          inArray(incomingShipments.status, ['pending', 'in_transit'])
        )
      );

    res.json(items);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
