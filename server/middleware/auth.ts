import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    clientId: number | null;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const rows = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!rows.length || rows[0].status !== 'active') {
      res.status(401).json({ error: 'Unauthorized: User not found or inactive' });
      return;
    }
    const u = rows[0];
    req.user = { id: u.id, email: u.email, name: u.name, role: u.role, clientId: u.clientId ?? null };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
}

export const INTERNAL_ROLES = ['super_admin', 'inventory_manager', 'sales_manager', 'operations_executive'];
export const CLIENT_ROLES    = ['client_admin', 'client_purchasing_officer', 'client_viewer'];
export const ADMIN_ROLES     = ['super_admin'];
