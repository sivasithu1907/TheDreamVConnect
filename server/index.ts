import 'dotenv/config';
import express from 'express';
import path from 'path';

import authRouter            from './routes/auth.js';
import usersRouter           from './routes/users.js';
import clientsRouter         from './routes/clients.js';
import { categoriesRouter, brandsRouter } from './routes/catalogues.js';
import productsRouter        from './routes/products.js';
import inventoryRouter       from './routes/inventory.js';
import warehousesRouter      from './routes/warehouses.js';
import reservationsRouter    from './routes/reservations.js';
import shipmentsRouter       from './routes/shipments.js';
import portalRouter          from './routes/portal.js';
import { dashboardRouter, auditRouter } from './routes/dashboard.js';

// NOTE: esbuild compiles this file to CommonJS for the production bundle
// (see package.json "build" script), where __dirname is a native global.
// We avoid import.meta.url here since it is undefined under CJS output.
declare const __dirname: string;

const PORT = parseInt(process.env.PORT || '3001');
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // CORS — only allow configured origin in production
  app.use((req, res, next) => {
    const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
    res.setHeader('Access-Control-Allow-Origin', isDev ? '*' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  // ── API Routes ──────────────────────────────────────────────────────────────
  app.use('/api/auth',       authRouter);
  app.use('/api/users',      usersRouter);
  app.use('/api/clients',    clientsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/brands',     brandsRouter);
  app.use('/api/products',   productsRouter);
  app.use('/api/inventory',  inventoryRouter);
  app.use('/api/warehouses', warehousesRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/shipments',  shipmentsRouter);
  app.use('/api/portal',     portalRouter);
  app.use('/api/dashboard',  dashboardRouter);
  app.use('/api/audit-logs', auditRouter);

  // Uploaded request photos (requires auth implicitly via opaque random filenames;
  // not listing-protected, but URLs aren't guessable and aren't linked publicly)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ── Frontend ────────────────────────────────────────────────────────────────
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'client');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TheDreamV Connect] Server running on port ${PORT} (${isDev ? 'dev' : 'production'})`);
  });
}

startServer().catch(console.error);
