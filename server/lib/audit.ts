import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export async function writeAuditLog(opts: {
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId:     opts.userId,
      userEmail:  opts.userEmail,
      action:     opts.action,
      resource:   opts.resource,
      resourceId: opts.resourceId,
      details:    opts.details,
      ipAddress:  opts.ipAddress,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write log:', err);
  }
}
