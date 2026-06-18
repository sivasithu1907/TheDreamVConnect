# TheDreamV Connect — B2B Distribution Portal

A production-ready B2B Distribution Portal for managing inventory, clients, and purchase workflows.

---

## Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** JWT + bcrypt (no Firebase)
- **Deployment:** Docker, Caddy (reverse proxy), Hetzner

---

## Local Development Setup

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16 (local) or Docker

### 2. Clone and install
```bash
git clone https://github.com/your-org/thedreamv-connect.git
cd thedreamv-connect
npm install
```

### 3. Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Database
```bash
# Create database
createdb b2bportal_dev

# Run migrations
npm run db:generate
npm run db:migrate
```

### 5. Create first admin user
After running migrations, insert the first user directly:
```sql
INSERT INTO users (email, password_hash, name, role, status)
VALUES (
  'admin@yourdomain.com',
  '$2b$12$...', -- generate with bcrypt
  'Admin User',
  'super_admin',
  'active'
);
```

Or run the seed script:
```bash
node scripts/seed-admin.js
```

### 6. Run dev server
```bash
npm run dev
# Opens on http://localhost:3001
```

---

## Production Deployment (Hetzner)

### First deployment
```bash
# On server
git clone https://github.com/your-org/thedreamv-connect.git
cd thedreamv-connect
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, ALLOWED_ORIGIN
nano .env

# Build and start
docker compose up -d --build
```

### Update deployment
```bash
git pull
docker compose up -d --build
```

### Caddy (reverse proxy)
Edit `Caddyfile` to set your domain, then:
```bash
docker compose -f docker-compose.caddy.yml up -d
```

---

## User Roles

| Role | Access |
|---|---|
| `super_admin` | Full system access |
| `inventory_manager` | Products, inventory, shipments |
| `sales_manager` | Clients, reports |
| `operations_executive` | Products, inventory, shipments (read) |
| `client_admin` | Client portal + manage client users |
| `client_purchasing_officer` | Client portal, can raise POs |
| `client_viewer` | Client portal, read-only |

---

## Phase Roadmap

- **Phase 1 (current):** Product Master, Categories, Brands, Inventory, Clients, Users, Client Portal (read-only)
- **Phase 2:** Stock reservations, Purchase orders, Notifications
- **Phase 3:** Approval workflows, Delivery notes, Reports
- **Phase 4:** Multi-warehouse, API integrations, White-label

---

## Security Notes
- No demo backdoors
- All write endpoints require role verification
- Client portal endpoints enforce category-based isolation
- All mutations are audit logged
- Passwords hashed with bcrypt (cost 12)
- JWT tokens expire in 8 hours
