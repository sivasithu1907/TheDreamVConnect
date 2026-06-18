import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(8),
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!rows.length) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const user = rows[0];
    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account is inactive. Contact your administrator.' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '8h',
    });

    await writeAuditLog({
      userId: user.id, userEmail: user.email,
      action: 'LOGIN', resource: 'auth',
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, clientId: user.clientId },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.user);
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    const rows = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    const user = rows[0];

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, user.id));

    await writeAuditLog({ userId: user.id, userEmail: user.email, action: 'CHANGE_PASSWORD', resource: 'auth' });
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
