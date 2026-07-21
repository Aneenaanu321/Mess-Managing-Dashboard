# System Architecture

## 1. Style

Modular monolith (not microservices) at v1 — a single Express API with clean internal module boundaries (Repository → Service → Controller per module), backed by one PostgreSQL database with Prisma ORM. This is the right call for a team this size: microservices would add operational overhead (service discovery, distributed tracing, network failure modes) without a corresponding scaling need. Each module's service layer is isolated enough that it could be extracted into its own service later without a rewrite, if/when scale demands it (horizontal scaling of the monolith behind a load balancer covers growth well past this company's likely volume).

## 2. High-level diagram

```
                    ┌─────────────────────────┐
                    │   Next.js 15 Web App     │  React 19, TS, Tailwind, ShadCN
                    │  (apps/web) - SSR + PWA  │  TanStack Table/Query, Recharts
                    └────────────┬─────────────┘
                                 │ HTTPS/REST (JSON)
                    ┌────────────▼─────────────┐
                    │   Express API             │  Node.js + TS
                    │  (apps/api)                │  JWT auth, RBAC middleware
                    │  Controller→Service→Repo   │  Zod validation
                    └──┬───────────┬────────────┘
                       │           │
             ┌─────────▼──┐   ┌────▼─────────┐
             │ PostgreSQL │   │ Object Storage│  S3-compatible (local/minio in dev)
             │ (Prisma)   │   │ (files/docs)  │
             └────────────┘   └───────────────┘
                       │
             ┌─────────▼──────────┐
             │ Background Jobs     │  BullMQ + Redis: notifications, AMC renewal
             │ (apps/worker)       │  scans, SLA breach checks, AI async tasks
             └─────────────────────┘
                       │
             ┌─────────▼──────────┐
             │ AI Service Layer    │  Wraps LLM calls: lead scoring, forecasting,
             │ (apps/api/ai)       │  summaries, drafting — see 12-ai-features.md
             └─────────────────────┘
```

## 3. Layered backend architecture (per module)

```
Route (Express Router)
  → Middleware: authenticate (JWT) → authorize (RBAC permission check) → validate (Zod schema)
  → Controller: parses request, calls service, shapes response
  → Service: business rules, orchestration, transaction boundaries
  → Repository: Prisma queries only, no business logic
  → Prisma → PostgreSQL
```

Cross-cutting concerns implemented as middleware/decorators, not duplicated per module: audit logging (wraps mutating service calls), tenant scoping (injects companyId/branchId filter), rate limiting, request logging.

## 4. Frontend architecture

- Next.js App Router, route groups per module: `app/(dashboard)/leads`, `app/(dashboard)/opportunities`, etc.
- Server Components for initial data fetch (fast first paint), Client Components + TanStack Query for interactive/mutating views (Kanban, tables with inline edit).
- Shared UI in `packages/ui` (ShadCN-based component library — buttons, forms, data table, kanban board, dialogs — reused across every module for consistency, per the "reusable component" requirement).
- Shared types/validation schemas in `packages/shared` (Zod schemas used on both frontend form validation and backend request validation — single source of truth, no drift).
- PWA: `next-pwa` for offline shell + service worker; offline-critical views (Engineer Task list, device config forms) use IndexedDB queue that syncs on reconnect.

## 5. Multi-tenancy model

Shared database, shared schema, discriminator columns: every core table carries `companyId` (required) and `branchId` (nullable for company-wide entities). Enforced via a Prisma middleware that injects the tenant filter based on the authenticated user's context, so module code cannot accidentally leak cross-tenant data.

## 6. Repository / monorepo layout

Turborepo-managed monorepo — see `09-folder-structure.md`.

## 7. Environments & config

`.env` per app, validated at boot with Zod (`env.ts`) so missing/malformed config fails fast instead of at first request. Environments: `development`, `test`, `staging`, `production`, each with its own `.env.<environment>` and docker-compose overlay.

## 8. Deployment topology (target)

```
Internet → Reverse proxy / Load balancer (Nginx/Traefik, TLS termination)
   → web (Next.js, N replicas)
   → api (Express, N replicas)
   → worker (BullMQ, N replicas)
PostgreSQL (managed or self-hosted primary + read replica)
Redis (job queue + cache)
S3-compatible object storage
```

All stateless app tiers scale horizontally behind the load balancer; PostgreSQL is the vertical/primary scaling constraint, mitigated with read replicas for reporting queries and connection pooling (PgBouncer) as load grows.

## 9. Security posture

- JWT access tokens (15 min expiry) + rotating refresh tokens (7 day, httpOnly cookie, stored hashed server-side, revocation list).
- RBAC enforced server-side on every route via a permission middleware — UI hiding is a convenience, never the security boundary.
- Input validation via Zod on every mutating endpoint.
- Parameterized queries only (Prisma default) — no raw SQL string interpolation.
- File uploads: type/size validated, virus-scan hook point, stored outside web root, served via signed URLs.
- Secrets never committed — `.env.example` only, real secrets via environment/secret manager in production.
- Full audit trail (see `04-process-mapping.md` §11).
