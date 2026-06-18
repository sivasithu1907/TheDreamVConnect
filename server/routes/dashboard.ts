import { Router } from 'express';
import { db } from '../db/index.js';
import { products, clients, inventory, incomingShipments, auditLogs, users } from '../db/schema.js';
import { sql, eq, desc, isNull } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, INTERNAL_ROLES, ADMIN_ROLES } from '../middleware/auth.js';

export const dashboardRouter = Router();
export const auditRouter = Router();

dashboardRouter.use(requireAuth);
auditRouter.use(requireAuth);

// GET /api/dashboard
dashboardRouter.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const [totalProductsRes] = await db.select({ count: sql<number>`count(*)` }).from(products).where(isNull(products.deletedAt));
    const [totalClientsRes]  = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.status, 'active'));
    const [stockRes]         = await db.select({
      totalPhysical:  sql<number>`sum(${inventory.physicalStock})`,
      totalAvailable: sql<number>`sum(${inventory.physicalStock} - ${inventory.reservedStock} - ${inventory.allocatedStock} - ${inventory.onHoldStock})`,
      totalReserved:  sql<number>`sum(${inventory.reservedStock})`,
    }).from(inventory);
    const [incomingRes] = await db.select({ count: sql<number>`count(*)` }).from(incomingShipments).where(eq(incomingShipments.status, 'in_transit'));

    res.json({
      totalProducts:    Number(totalProductsRes.count) || 0,
      totalClients:     Number(totalClientsRes.count)  || 0,
      totalPhysical:    Number(stockRes.totalPhysical)  || 0,
      totalAvailable:   Number(stockRes.totalAvailable) || 0,
      totalReserved:    Number(stockRes.totalReserved)  || 0,
      incomingShipments: Number(incomingRes.count)      || 0,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/audit-logs
auditRouter.get('/', requireRole(ADMIN_ROLES), async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});
