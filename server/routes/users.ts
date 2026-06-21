import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, ADMIN_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const createUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().min(1),
  jobTitle: z.string().optional().nullable(),
  role:     z.enum(['super_admin','inventory_manager','sales_manager','operations_executive','client_admin','client_purchasing_officer','client_viewer']),
  clientId: z.number().int().optional().nullable(),
});

const updateUserSchema = z.object({
  name:     z.string().min(1).optional(),
  jobTitle: z.string().optional().nullable(),
  role:     z.enum(['super_admin','inventory_manager','sales_manager','operations_executive','client_admin','client_purchasing_officer','client_viewer']).optional(),
  clientId: z.number().int().optional().nullable(),
  status:   z.enum(['active','inactive']).optional(),
  password: z.string().min(8).optional(),
});

// GET /api/users
router.get('/', requireRole(ADMIN_ROLES.concat(['sales_manager'])), async (req: AuthRequest, res) => {
  try {
    const all = await db.select({
      id: users.id, email: users.email, name: users.name, jobTitle: users.jobTitle,
      role: users.role, clientId: users.clientId, status: users.status,
      lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    }).from(users);
    res.json(all);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/users  — create (invite)
router.post('/', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }
  const { email, password, name, jobTitle, role, clientId } = parsed.data;

  try {
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existing.length) { res.status(409).json({ error: 'Email already in use' }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(), passwordHash, name, jobTitle, role,
      clientId: clientId ?? null, invitedBy: req.user!.id,
    }).returning({ id: users.id, email: users.email, name: users.name, jobTitle: users.jobTitle, role: users.role, clientId: users.clientId, status: users.status });

    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', resource: 'user', resourceId: user.id, details: { email, role } });
    res.status(201).json(user);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    const { password, ...rest } = parsed.data;
    const updateValues: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (password) {
      updateValues.passwordHash = await bcrypt.hash(password, 12);
    }

    const [updated] = await db.update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, name: users.name, jobTitle: users.jobTitle, role: users.role, status: users.status });
    if (!updated) { res.status(404).json({ error: 'User not found' }); return; }
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: password ? 'UPDATE_PASSWORD' : 'UPDATE', resource: 'user', resourceId: id, details: rest });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// DELETE /api/users/:id — deactivate (soft)
router.delete('/:id', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user!.id) { res.status(400).json({ error: 'Cannot deactivate yourself' }); return; }
  try {
    await db.update(users).set({ status: 'inactive', updatedAt: new Date() }).where(eq(users.id, id));
    await writeAuditLog({ userId: req.user!.id, userEmail: req.user!.email, action: 'DEACTIVATE', resource: 'user', resourceId: id });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
