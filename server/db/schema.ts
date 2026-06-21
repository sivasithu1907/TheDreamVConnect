import { relations } from 'drizzle-orm';
import {
  pgTable, pgEnum, serial, text, timestamp,
  integer, boolean, jsonb, decimal, uniqueIndex
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'inventory_manager',
  'sales_manager',
  'operations_executive',
  'client_admin',
  'client_purchasing_officer',
  'client_viewer',
]);

export const statusEnum = pgEnum('status', ['active', 'inactive']);
export const productStatusEnum = pgEnum('product_status', ['active', 'draft', 'archived']);

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'pending', 'in_transit', 'arrived', 'partially_received', 'cancelled',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending', 'approved', 'rejected', 'expired', 'converted_to_po', 'cancelled',
]);

export const poStatusEnum = pgEnum('po_status', [
  'draft', 'submitted', 'under_review', 'approved', 'confirmed', 'partially_delivered', 'delivered', 'cancelled',
]);

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'received', 'manual_add', 'manual_deduct', 'damage', 'return', 'correction',
]);

// ─── Core Tables ──────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:            serial('id').primaryKey(),
  email:         text('email').notNull().unique(),
  passwordHash:  text('password_hash').notNull(),
  name:          text('name').notNull(),
  jobTitle:      text('job_title'),                // e.g. "Procurement Manager" — relevant for client users
  role:          userRoleEnum('role').default('client_viewer').notNull(),
  clientId:      integer('client_id').references(() => clients.id, { onDelete: 'set null' }),
  status:        statusEnum('status').default('active').notNull(),
  invitedBy:     integer('invited_by'),           // references users.id (self-ref, set manually)
  lastLoginAt:   timestamp('last_login_at'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id:             serial('id').primaryKey(),
  companyName:    text('company_name').notNull(),
  contactPerson:  text('contact_person').notNull(),
  email:          text('email').notNull(),
  phone:          text('phone').unique(),
  address:        text('address'),
  taxNumber:      text('tax_number'),
  creditLimit:    decimal('credit_limit', { precision: 12, scale: 2 }),
  paymentTerms:   text('payment_terms'),          // e.g. "Net 30", "COD"
  status:         statusEnum('status').default('active').notNull(),
  notes:          text('notes'),
  createdBy:      integer('created_by'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id:          serial('id').primaryKey(),
  name:        text('name').notNull().unique(),
  description: text('description'),
  sortOrder:   integer('sort_order').default(0),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

export const clientCategories = pgTable('client_categories', {
  id:         serial('id').primaryKey(),
  clientId:   integer('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  grantedBy:  integer('granted_by'),
  grantedAt:  timestamp('granted_at').defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('client_category_uniq').on(t.clientId, t.categoryId),
}));

export const brands = pgTable('brands', {
  id:          serial('id').primaryKey(),
  name:        text('name').notNull().unique(),
  description: text('description'),
  logoUrl:     text('logo_url'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id:           serial('id').primaryKey(),
  name:         text('name').notNull(),
  sku:          text('sku').notNull().unique(),
  brandId:      integer('brand_id').references(() => brands.id),
  categoryId:   integer('category_id').references(() => categories.id),
  description:  text('description'),
  imageUrl:     text('image_url'),
  unit:         text('unit').notNull().default('pcs'),
  minOrderQty:  integer('min_order_qty').default(1),
  attributes:   jsonb('attributes'),              // flexible specs: {color, weight, etc.}
  status:       productStatusEnum('status').default('active').notNull(),
  createdBy:    integer('created_by'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
  deletedAt:    timestamp('deleted_at'),          // soft delete
});

// ─── Warehouse (single now, multi later) ─────────────────────────────────────

export const warehouses = pgTable('warehouses', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  location:  text('location'),
  isDefault: boolean('is_default').default(false).notNull(),
  status:    statusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventory = pgTable('inventory', {
  id:             serial('id').primaryKey(),
  productId:      integer('product_id').references(() => products.id).notNull(),
  warehouseId:    integer('warehouse_id').references(() => warehouses.id).notNull(),
  physicalStock:  integer('physical_stock').default(0).notNull(),
  reservedStock:  integer('reserved_stock').default(0).notNull(),
  allocatedStock: integer('allocated_stock').default(0).notNull(),
  onHoldStock:    integer('on_hold_stock').default(0).notNull(),
  reorderLevel:   integer('reorder_level').default(0),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('inventory_product_warehouse_uniq').on(t.productId, t.warehouseId),
}));

export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id:           serial('id').primaryKey(),
  inventoryId:  integer('inventory_id').references(() => inventory.id).notNull(),
  type:         adjustmentTypeEnum('type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),  // positive = add, negative = deduct
  reason:       text('reason'),
  reference:    text('reference'),                     // e.g. shipment ID, PO number
  performedBy:  integer('performed_by').references(() => users.id).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

// ─── Incoming Shipments ───────────────────────────────────────────────────────

export const incomingShipments = pgTable('incoming_shipments', {
  id:              serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  supplierName:    text('supplier_name'),
  expectedDate:    timestamp('expected_date'),
  arrivedDate:     timestamp('arrived_date'),
  status:          shipmentStatusEnum('status').default('pending').notNull(),
  notes:           text('notes'),
  createdBy:       integer('created_by').references(() => users.id),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});

export const shipmentItems = pgTable('shipment_items', {
  id:          serial('id').primaryKey(),
  shipmentId:  integer('shipment_id').references(() => incomingShipments.id, { onDelete: 'cascade' }).notNull(),
  productId:   integer('product_id').references(() => products.id).notNull(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  quantity:    integer('quantity').notNull(),
  receivedQty: integer('received_qty').default(0).notNull(),
});

// ─── Reservations / Special Requests ──────────────────────────────────────────
// A single table covers two related client actions:
//  1. "Reserve stock" — clientId + productId + quantity against a known catalog item.
//  2. "Special request" — productId is null; client describes what they need in
//     freeText, optionally with photo attachments (see requestAttachments below).
// requestType distinguishes the two. syncStatus/externalRef/externalSystem exist
// so that a future integration (Odoo sale.order, etc.) has somewhere to record
// "this was pushed externally and here's its ID there" without a schema change.

export const requestTypeEnum = pgEnum('request_type', ['stock_reservation', 'special_request']);
export const syncStatusEnum  = pgEnum('sync_status', ['not_synced', 'synced', 'sync_failed']);

export const reservations = pgTable('reservations', {
  id:            serial('id').primaryKey(),
  clientId:      integer('client_id').references(() => clients.id).notNull(),
  requestType:   requestTypeEnum('request_type').default('stock_reservation').notNull(),
  productId:     integer('product_id').references(() => products.id),       // null for special_request
  warehouseId:   integer('warehouse_id').references(() => warehouses.id),    // null for special_request
  quantity:      integer('quantity'),                                       // null for special_request
  freeText:      text('free_text'),                                        // description for special_request
  status:        reservationStatusEnum('status').default('pending').notNull(),
  notes:         text('notes'),
  requestedBy:   integer('requested_by').references(() => users.id).notNull(),
  reviewedBy:    integer('reviewed_by').references(() => users.id),
  reviewNotes:   text('review_notes'),
  expiresAt:     timestamp('expires_at'),
  syncStatus:    syncStatusEnum('sync_status').default('not_synced').notNull(),
  externalSystem: text('external_system'),    // e.g. 'odoo', 'quickbooks' — set once an integration exists
  externalRef:    text('external_ref'),       // e.g. Odoo sale.order id/name
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});

// Photo attachments for special requests (e.g. "I need something that looks like this")
export const requestAttachments = pgTable('request_attachments', {
  id:            serial('id').primaryKey(),
  reservationId: integer('reservation_id').references(() => reservations.id, { onDelete: 'cascade' }).notNull(),
  fileName:      text('file_name').notNull(),
  fileUrl:       text('file_url').notNull(),     // served from our own storage (see server static route)
  mimeType:      text('mime_type'),
  fileSize:      integer('file_size'),
  uploadedAt:    timestamp('uploaded_at').defaultNow().notNull(),
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrders = pgTable('purchase_orders', {
  id:              serial('id').primaryKey(),
  poNumber:        text('po_number').notNull().unique(),
  clientId:        integer('client_id').references(() => clients.id).notNull(),
  status:          poStatusEnum('status').default('draft').notNull(),
  notes:           text('notes'),
  clientReference: text('client_reference'),       // client's own PO ref
  deliveryAddress: text('delivery_address'),
  requestedBy:     integer('requested_by').references(() => users.id).notNull(),
  reviewedBy:      integer('reviewed_by').references(() => users.id),
  reservationId:   integer('reservation_id').references(() => reservations.id),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id:          serial('id').primaryKey(),
  poId:        integer('po_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId:   integer('product_id').references(() => products.id).notNull(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id).notNull(),
  quantity:    integer('quantity').notNull(),
  unitPrice:   decimal('unit_price', { precision: 12, scale: 4 }),
});

// ─── Delivery Notes ───────────────────────────────────────────────────────────

export const deliveryNotes = pgTable('delivery_notes', {
  id:            serial('id').primaryKey(),
  dnNumber:      text('dn_number').notNull().unique(),
  poId:          integer('po_id').references(() => purchaseOrders.id).notNull(),
  clientId:      integer('client_id').references(() => clients.id).notNull(),
  status:        text('status').default('pending').notNull(), // pending, dispatched, delivered
  dispatchedAt:  timestamp('dispatched_at'),
  deliveredAt:   timestamp('delivered_at'),
  trackingRef:   text('tracking_ref'),
  notes:         text('notes'),
  createdBy:     integer('created_by').references(() => users.id),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id:         serial('id').primaryKey(),
  userId:     integer('user_id').references(() => users.id),
  userEmail:  text('user_email'),                  // snapshot in case user deleted
  action:     text('action').notNull(),            // e.g. 'CREATE', 'UPDATE', 'DELETE'
  resource:   text('resource').notNull(),          // e.g. 'product', 'reservation'
  resourceId: integer('resource_id'),
  details:    jsonb('details'),                    // before/after values
  ipAddress:  text('ip_address'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  client:              one(clients, { fields: [users.clientId], references: [clients.id] }),
  reservations:        many(reservations),
  purchaseOrders:      many(purchaseOrders),
  inventoryAdjustments: many(inventoryAdjustments),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  users:            many(users),
  allowedCategories: many(clientCategories),
  reservations:     many(reservations),
  purchaseOrders:   many(purchaseOrders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  clientCategories: many(clientCategories),
  products:         many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category:         one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand:            one(brands, { fields: [products.brandId], references: [brands.id] }),
  inventory:        many(inventory),
  shipmentItems:    many(shipmentItems),
  reservations:     many(reservations),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product:     one(products,   { fields: [inventory.productId],   references: [products.id] }),
  warehouse:   one(warehouses, { fields: [inventory.warehouseId], references: [warehouses.id] }),
  adjustments: many(inventoryAdjustments),
}));

export const incomingShipmentsRelations = relations(incomingShipments, ({ many }) => ({
  items: many(shipmentItems),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  client:      one(clients,    { fields: [reservations.clientId],   references: [clients.id] }),
  product:     one(products,   { fields: [reservations.productId],  references: [products.id] }),
  warehouse:   one(warehouses, { fields: [reservations.warehouseId],references: [warehouses.id] }),
  requester:   one(users,      { fields: [reservations.requestedBy],references: [users.id] }),
  attachments: many(requestAttachments),
}));

export const requestAttachmentsRelations = relations(requestAttachments, ({ one }) => ({
  reservation: one(reservations, { fields: [requestAttachments.reservationId], references: [reservations.id] }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  client:      one(clients, { fields: [purchaseOrders.clientId], references: [clients.id] }),
  requester:   one(users,   { fields: [purchaseOrders.requestedBy], references: [users.id] }),
  reservation: one(reservations, { fields: [purchaseOrders.reservationId], references: [reservations.id] }),
  items:       many(purchaseOrderItems),
  deliveryNotes: many(deliveryNotes),
}));
