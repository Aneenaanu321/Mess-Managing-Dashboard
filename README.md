# RFIDCore

Enterprise Sales CRM & Business Operations Platform for an RFID solutions distributor/system integrator. See `docs/` for the PRD, personas, user stories, process mapping, and architecture this codebase implements.

## Status

This is being built incrementally, module by module (see the project task list for the full 25-module plan). **What's fully functional right now:**

- Multi-tenant database schema covering all 25 modules (`apps/api/prisma/schema.prisma`)
- Auth: JWT access + rotating refresh tokens, httpOnly refresh cookie, RBAC middleware
- RBAC: 15 roles, permission catalog, role→permission seed matrix (`apps/api/src/config/permissions.ts`)
- Lead Management module end-to-end: schema, validation, repository, service (duplicate detection, AI lead scoring, assignment notifications, audit logging, lead→Opportunity conversion), REST API, and a working Next.js UI (list, filters, create form, detail + convert action)
- Demo data seed: company, branch, one user per role, product catalog, warehouse/stock, SLA policies, sample leads

**Not yet built** (next passes): Customer, Opportunity/Pipeline, Quotation, PO/Sales Order/Inventory/Warehouse/Procurement, Project/Installation/Device/Engineer Tasks, Finance, Support/AMC, Dashboards/Reports, Notifications UI, AI Assistant, Settings UI, automated test suite beyond the lead-scoring unit tests, CI/CD, production deployment hardening. The sidebar nav already lists all modules; unbuilt routes will 404 until their turn.

## Getting started

Requires Docker (for Postgres/Redis/MinIO) and Node 20+.

```bash
cp .env.example .env          # edit secrets before any real deployment
npm install
docker compose up -d postgres redis minio
npm run db:migrate -w apps/api    # runs `prisma migrate dev`
npm run db:seed                   # seeds roles, demo company, demo users, sample data
npm run dev                       # runs web (:3000) + api (:4000) via turborepo
```

Demo login: any seeded email (e.g. `admin@falconrfid.demo`, `ravi@falconrfid.demo`) / `Password123!`. Full list in `apps/api/prisma/seed.ts`.

## A note on how this was built

This scaffold was built inside a sandboxed environment with two relevant restrictions that **do not apply on a normal developer machine**:

1. **Prisma engine downloads were blocked** (`binaries.prisma.sh` was outside the sandbox's network allowlist), so `prisma generate` / `prisma validate` / `prisma migrate` could not be run in-session. The schema was instead verified manually plus with a custom static relation-pairing check (every `Model.field Other[]` was confirmed to have a matching back-reference). Run `npx prisma generate` and `npx prisma migrate dev` as your first step — on your machine, with normal internet access, this will just work.
2. **The sandbox's `esbuild` native binary segfaults** (confirmed via `esbuild --version` → SIGSEGV), which blocks `vitest` and `tsx` from running in-session. This looks like an architecture/sandboxing quirk specific to this environment, not a code issue. The one test suite that doesn't depend on a database (`leadScoring.test.ts`) is written and ready to run with `npm test -w apps/api` on your machine.

Everything else — the Express app, all TypeScript across `apps/api`, and the entire Next.js frontend — was type-checked with `tsc --noEmit` in-session (clean, aside from the expected Prisma-client-not-yet-generated errors), and the frontend was additionally verified with a full `next build` (compiled, linted, type-checked, and statically generated all routes successfully).

## Monorepo layout

See `docs/09-folder-structure.md`.
