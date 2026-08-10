# RFIDCore

Enterprise Sales CRM & Business Operations Platform for an RFID solutions distributor/system integrator. See `docs/` for the PRD, personas, user stories, process mapping, and architecture this codebase implements.

## Status

Built module-by-module against the 25-module plan in `docs/01-PRD.md` §6. **What's functional right now:**

- Multi-tenant database schema covering all 25 modules (`apps/api/prisma/schema.prisma`), 15-role RBAC enforced server-side (`apps/api/src/config/permissions.ts`), JWT access + rotating refresh tokens
- Every sales/delivery/finance/support module has a schema, REST API (routes/controller/service/repository/validation), and a Next.js UI: Leads, Customers, Opportunities, Pipeline (Kanban), Quotations (with discount/price-override approval routing), Purchase Orders → Sales Orders (with inventory allocation) → Projects, Installations, Devices, Engineer Tasks, Finance, Support Tickets, AMC & Contracts, Procurement & Vendors, Warehouse & Inventory
- Cross-cutting: Activity Timeline, Calendar & Follow-ups, Campaign tracking, Approvals inbox, Pre-sales artifacts (site surveys/demos/POCs/solution designs), Customer merge tool, quotation branded PDF export, object storage (MinIO/S3) for attachments, in-app notifications (with a working bell/dropdown) mirrored to email, a public rate-limited lead-intake webhook, CSV import/export on the data-heavy list views
- Executive Dashboard with charts, Reports & Analytics (funnel, pipeline, collections, receivables aging), Settings (org, roles, users, number sequences, SLA policies, audit log viewer)
- `apps/worker`: BullMQ jobs for AMC renewal alerts, SLA breach/risk checks, invoice-overdue sweeps
- PWA offline support (manifest + service worker) for field engineers, `GET /health/ready` (DB+Redis reachability) for orchestrator readiness probes
- CI (`.github/workflows/ci.yml`: lint/typecheck/test/build), Dockerfiles for all three apps + `docker-compose.prod.yml`, `docs/10-deployment-hardening.md`
- Demo data seed: company, branch, one user per role, product catalog, warehouse/stock, SLA policies, sample leads/customers/quotations

**Not yet built** (see `TODO.md` for the live list): a scoped Customer Portal for the Customer Portal User persona, and full multi-branch *switching* (a user is tied to one branch server-side today; Topbar shows read-only company/branch/currency context). Both are blocked on a product decision, not just engineering — details in `TODO.md`.

## Getting started

Requires Docker (for Postgres/Redis/MinIO) and Node 20+.

```bash
cp .env.example .env          # edit secrets before any real deployment
npm install
docker compose up -d postgres redis minio
npx prisma generate -w apps/api
npm run db:migrate -w apps/api    # runs `prisma migrate dev`
npm run db:seed                   # seeds roles, demo company, demo users, sample data
npm run dev                       # runs web (:3000), api (:4000), worker via turborepo
```

Demo login: any seeded email (e.g. `admin@ibtechintl.com`, `ravi@ibtechintl.com`) / `Password123!`. Full list in `apps/api/prisma/seed.ts`.

See **`docs/11-user-guide.md`** for a page-by-page walkthrough of the entire app.

## Host on Vercel (free Hobby)

The UI deploys to **Vercel**; the API/worker/DB need free companions (Neon + Render + Upstash).  
Step-by-step: **`docs/12-hosting-vercel-free.md`**. Config files: root `vercel.json`, `render.yaml`.

## Technology stack

| Layer | Technologies |
|-------|-------------|
| **Monorepo** | npm workspaces, Turborepo |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3 |
| **UI & data** | Hand-rolled UI primitives, TanStack Query, TanStack Table, Recharts, Lucide icons, clsx, Zod, js-cookie |
| **Backend API** | Node.js 20+, Express 4, TypeScript, Zod validation |
| **Database** | PostgreSQL 16, Prisma ORM 5 |
| **Cache & jobs** | Redis 7, BullMQ (worker app) |
| **Auth** | JWT access tokens + httpOnly refresh cookies, bcrypt, 15-role RBAC |
| **Storage** | AWS S3 SDK (MinIO locally) for file attachments |
| **Email** | Nodemailer (optional SMTP) |
| **PDF** | PDFKit (quotation export) |
| **AI** | Anthropic API (lead scoring, sales assistant) |
| **PWA** | Web manifest + service worker |
| **Testing** | Vitest (API, worker, web), Testing Library (web), Supertest (API) |
| **Lint & format** | ESLint, Prettier, TypeScript strict |
| **CI/CD** | GitHub Actions (lint, typecheck, test, build) |
| **Containers** | Docker multi-stage builds, Docker Compose (Postgres, Redis, MinIO) |

Verify everything's wired up correctly:

```bash
npm run typecheck && npm run lint && npm test && npm run build   # same checks CI runs
```

## Monorepo layout

See `docs/09-folder-structure.md`.
