import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { reservations, requestAttachments, products, clients, warehouses, users, inventory } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest, CLIENT_ROLES, INTERNAL_ROLES } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

// ── File upload setup ───────────────────────────────────────────────────────
// Stored on local disk under /uploads/requests, served statically (see server/index.ts).
// NOTE: on a multi-instance deployment this should move to S3/object storage —
// fine for a single-server setup like the current Hetzner box.
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'requests');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// ── Schemas ──────────────────────────────────────────────────────────────────

const createReservationSchema = z.object({
  requestType:  z.enum(['stock_reservation', 'special_request']),
  productId:    z.number().int().optional().nullable(),
  warehouseId:  z.number().int().optional().nullable(),
  quantity:     z.number().int().min(1).optional().nullable(),
  freeText:     z.string().optional().nullable(),
  notes:        z.string().optional().nullable(),
});

const reviewSchema = z.object({
  status:      z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional().nullable(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getClientIdForUser(userId: number): Promise<number | null> {
  const [u] = await db.select({ clientId: users.clientId }).from(users).where(eq(users.id, userId));
  return u?.clientId ?? null;
}

// ── Client-side routes (clients create/view their own requests) ──────────────

// GET /api/reservations/mine — client's own requests
router.get('/mine', requireRole(CLIENT_ROLES), async (req: AuthRequest, res) => {
  const clientId = await getClientIdForUser(req.user!.id);
  if (!clientId) { res.status(403).json({ error: 'No client account linked' }); return; }

  try {
    const rows = await db
      .select({
        id: reservations.id, requestType: reservations.requestType,
        productId: reservations.productId, productName: products.name, productSku: products.sku,
        quantity: reservations.quantity, freeText: reservations.freeText,
        status: reservations.status, notes: reservations.notes, reviewNotes: reservations.reviewNotes,
        createdAt: reservations.createdAt, updatedAt: reservations.updatedAt,
      })
      .from(reservations)
      .leftJoin(products, eq(reservations.productId, products.id))
      .where(eq(reservations.clientId, clientId))
      .orderBy(desc(reservations.createdAt));

    const ids = rows.map(r => r.id);
    const allAttachments = ids.length ? await db.select().from(requestAttachments) : [];
    const byReservation = new Map<number, typeof allAttachments>();
    for (const a of allAttachments) {
      if (!ids.includes(a.reservationId)) continue;
      const list = byReservation.get(a.reservationId) ?? [];
      list.push(a);
      byReservation.set(a.reservationId, list);
    }

    res.json(rows.map(r => ({ ...r, attachments: byReservation.get(r.id) ?? [] })));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// POST /api/reservations — create a stock reservation or special request, with optional photos
router.post('/', requireRole(CLIENT_ROLES), upload.array('photos', 5), async (req: AuthRequest, res) => {
  const clientId = await getClientIdForUser(req.user!.id);
  if (!clientId) { res.status(403).json({ error: 'No client account linked' }); return; }

  // multipart/form-data fields arrive as strings — coerce before validating
  const body = {
    requestType: req.body.requestType,
    productId:   req.body.productId ? parseInt(req.body.productId) : null,
    warehouseId: req.body.warehouseId ? parseInt(req.body.warehouseId) : null,
    quantity:    req.body.quantity ? parseInt(req.body.quantity) : null,
    freeText:    req.body.freeText || null,
    notes:       req.body.notes || null,
  };
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  if (parsed.data.requestType === 'stock_reservation' && (!parsed.data.productId || !parsed.data.quantity)) {
    res.status(400).json({ error: 'productId and quantity are required for a stock reservation' });
    return;
  }
  if (parsed.data.requestType === 'stock_reservation' && !parsed.data.warehouseId) {
    res.status(400).json({ error: 'warehouseId is required for a stock reservation' });
    return;
  }
  if (parsed.data.requestType === 'special_request' && !parsed.data.freeText) {
    res.status(400).json({ error: 'Please describe what you need' });
    return;
  }

  try {
    // For stock reservations, place the quantity on hold immediately at submission time —
    // not after staff review. This is the key fix for a real race condition: without an
    // immediate hold, two clients could both see the same "available" number and both submit
    // requests for it before staff ever looks at either one. Holding on submission means the
    // second client's available-stock view reflects the first client's pending request right away.
    if (parsed.data.requestType === 'stock_reservation' && parsed.data.productId && parsed.data.warehouseId && parsed.data.quantity) {
      const [inv] = await db.select().from(inventory)
        .where(and(eq(inventory.productId, parsed.data.productId), eq(inventory.warehouseId, parsed.data.warehouseId)));
      if (!inv) {
        res.status(404).json({ error: 'No inventory record found for this product/warehouse' });
        return;
      }
      const available = inv.physicalStock - inv.reservedStock - inv.allocatedStock - inv.onHoldStock;
      if (parsed.data.quantity > available) {
        res.status(409).json({ error: `Only ${available} units are currently available — someone else may have just reserved some of this stock.` });
        return;
      }
      await db.update(inventory)
        .set({ onHoldStock: inv.onHoldStock + parsed.data.quantity, updatedAt: new Date() })
        .where(eq(inventory.id, inv.id));
    }

    const [reservation] = await db.insert(reservations).values({
      clientId,
      requestedBy: req.user!.id,
      ...parsed.data,
    }).returning();

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length) {
      await db.insert(requestAttachments).values(
        files.map(f => ({
          reservationId: reservation.id,
          fileName: f.originalname,
          fileUrl: `/uploads/requests/${f.filename}`,
          mimeType: f.mimetype,
          fileSize: f.size,
        }))
      );
    }

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: 'CREATE', resource: 'reservation', resourceId: reservation.id,
      details: { requestType: reservation.requestType },
    });
    res.status(201).json(reservation);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// ── Internal staff routes (review/approve/reject) ─────────────────────────────

// GET /api/reservations — all requests, internal view
router.get('/', requireRole(INTERNAL_ROLES), async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: reservations.id, requestType: reservations.requestType,
        clientId: reservations.clientId, clientName: clients.companyName,
        productId: reservations.productId, productName: products.name, productSku: products.sku,
        warehouseId: reservations.warehouseId, warehouseName: warehouses.name,
        quantity: reservations.quantity, freeText: reservations.freeText,
        status: reservations.status, notes: reservations.notes, reviewNotes: reservations.reviewNotes,
        requestedBy: reservations.requestedBy,
        createdAt: reservations.createdAt, updatedAt: reservations.updatedAt,
      })
      .from(reservations)
      .innerJoin(clients, eq(reservations.clientId, clients.id))
      .leftJoin(products, eq(reservations.productId, products.id))
      .leftJoin(warehouses, eq(reservations.warehouseId, warehouses.id))
      .orderBy(desc(reservations.createdAt));

    const allAttachments = await db.select().from(requestAttachments);
    const byReservation = new Map<number, typeof allAttachments>();
    for (const a of allAttachments) {
      const list = byReservation.get(a.reservationId) ?? [];
      list.push(a);
      byReservation.set(a.reservationId, list);
    }

    res.json(rows.map(r => ({ ...r, attachments: byReservation.get(r.id) ?? [] })));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// PUT /api/reservations/:id/review — approve or reject
router.put('/:id/review', requireRole(['super_admin', 'sales_manager', 'inventory_manager']), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return; }

  try {
    const [existing] = await db.select().from(reservations).where(eq(reservations.id, id));
    if (!existing) { res.status(404).json({ error: 'Reservation not found' }); return; }
    if (existing.status !== 'pending') {
      res.status(409).json({ error: `This request was already ${existing.status} and can't be reviewed again.` });
      return;
    }

    // Stock for a reservation is placed on hold at submission time (see POST /).
    // Reviewing it here either converts that hold into a firm reservation (approved),
    // or releases it back to available stock (rejected) — either way the on-hold
    // amount must be cleared since the request is no longer pending.
    if (existing.requestType === 'stock_reservation' && existing.productId && existing.warehouseId && existing.quantity) {
      const [inv] = await db.select().from(inventory)
        .where(and(eq(inventory.productId, existing.productId), eq(inventory.warehouseId, existing.warehouseId)));
      if (inv) {
        if (parsed.data.status === 'approved') {
          await db.update(inventory).set({
            onHoldStock:   Math.max(0, inv.onHoldStock - existing.quantity),
            reservedStock: inv.reservedStock + existing.quantity,
            updatedAt: new Date(),
          }).where(eq(inventory.id, inv.id));
        } else {
          // rejected — release the hold, nothing moves into reservedStock
          await db.update(inventory).set({
            onHoldStock: Math.max(0, inv.onHoldStock - existing.quantity),
            updatedAt: new Date(),
          }).where(eq(inventory.id, inv.id));
        }
      }
    }

    const [updated] = await db.update(reservations).set({
      status: parsed.data.status,
      reviewNotes: parsed.data.reviewNotes,
      reviewedBy: req.user!.id,
      updatedAt: new Date(),
    }).where(eq(reservations.id, id)).returning();

    await writeAuditLog({
      userId: req.user!.id, userEmail: req.user!.email,
      action: parsed.data.status === 'approved' ? 'APPROVE' : 'REJECT',
      resource: 'reservation', resourceId: id, details: { reviewNotes: parsed.data.reviewNotes },
    });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

export default router;
