import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { categories, brands } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

export const categoriesRouter = Router();
export const brandsRouter = Router();

categoriesRouter.use(requireAuth);
brandsRouter.use(requireAuth);

// ── Categories ────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional().nullable(),
});

categoriesRouter.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db.select().from(categories).orderBy(categories.name);
    res.json(all);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

categoriesRouter.post('/', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [cat] = await db.insert(categories).values(parsed.data).returning();
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', resource: 'category', resourceId: cat.id, details: { name: cat.name } });
    res.status(201).json(cat);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

categoriesRouter.put('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [updated] = await db.update(categories).set(parsed.data).where(eq(categories.id, id)).returning();
    if (!updated) { res.status(404).json({ error: 'Category not found' }); return; }
    res.json(updated);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

categoriesRouter.delete('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(categories).where(eq(categories.id, id));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', resource: 'category', resourceId: id });
    res.json({ success: true });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

// ── Brands ────────────────────────────────────────────────────────────────────

const brandSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional().nullable(),
  logoUrl:     z.string().url().optional().nullable(),
});

brandsRouter.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const all = await db.select().from(brands).orderBy(brands.name);
    res.json(all);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

brandsRouter.post('/', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const parsed = brandSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [brand] = await db.insert(brands).values(parsed.data).returning();
    res.status(201).json(brand);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

brandsRouter.put('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = brandSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  try {
    const [updated] = await db.update(brands).set(parsed.data).where(eq(brands.id, id)).returning();
    if (!updated) { res.status(404).json({ error: 'Brand not found' }); return; }
    res.json(updated);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});

brandsRouter.delete('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(brands).where(eq(brands.id, id));
    res.json({ success: true });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : 'Error' }); }
});
