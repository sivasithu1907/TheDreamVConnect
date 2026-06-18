import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clients, clientCategories, categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  companyName:   z.string().min(1),
  contactPerson: z.string().min(1),
  email:         z.string().email(),
  phone:         z.string().optional().nullable(),
  address:       z.string().optional().nullable(),
  taxNumber:     z.string().optional().nullable(),
  creditLimit:   z.string().optional().nullable(),
  paymentTerms:  z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
});

// GET /api/clients
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db.select().from(clients).orderBy(clients.companyName);
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// GET /api/clients/:id
router.get('/:id', requireRole(INTERNAL_ROLES), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await db.select().from(clients).where(eq(clients.id, id));
    if (!rows.length) { res.status(404).json({ error: 'Client not found' }); return; }
    // Also fetch allowed categories
    const cats = await db
      .select({ categoryId: clientCategories.categoryId, categoryName: categories.name })
      .from(clientCategories)
      .innerJoin(categories, eq(clientCategories.categoryId, categories.id))
      .where(eq(clientCategories.clientId, id));
    res.json({ ...rows[0], allowedCategories: cats });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/clients
router.post('/', requireRole(ADMIN_ROLES.concat(['sales_manager'])), async (req: AuthRequest, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [client] = await db.insert(clients).values({ ...parsed.data, createdBy: req.user!.id }).returning();
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', resource: 'client', resourceId: client.id, details: { companyName: client.companyName } });
    res.status(201).json(client);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/clients/:id
router.put('/:id', requireRole(ADMIN_ROLES.concat(['sales_manager'])), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [updated] = await db.update(clients).set({ ...parsed.data, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    if (!updated) { res.status(404).json({ error: 'Client not found' }); return; }
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', resource: 'client', resourceId: id, details: parsed.data });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/clients/:id/categories — assign category access
router.post('/:id/categories', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const clientId = parseInt(req.params.id);
  const { categoryId } = z.object({ categoryId: z.number().int() }).parse(req.body);
  try {
    const [row] = await db.insert(clientCategories)
      .values({ clientId, categoryId, grantedBy: req.user!.id })
      .onConflictDoNothing()
      .returning();
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'GRANT_CATEGORY', resource: 'client', resourceId: clientId, details: { categoryId } });
    res.status(201).json(row ?? { message: 'Already assigned' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// DELETE /api/clients/:id/categories/:categoryId
router.delete('/:id/categories/:categoryId', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const clientId  = parseInt(req.params.id);
  const categoryId = parseInt(req.params.categoryId);
  try {
    await db.delete(clientCategories)
      .where(eq(clientCategories.clientId, clientId) && eq(clientCategories.categoryId, categoryId));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'REVOKE_CATEGORY', resource: 'client', resourceId: clientId, details: { categoryId } });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// DELETE /api/clients/:id — soft delete (deactivate)
router.delete('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.update(clients).set({ status: 'inactive', updatedAt: new Date() }).where(eq(clients.id, id));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'DEACTIVATE', resource: 'client', resourceId: id });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
