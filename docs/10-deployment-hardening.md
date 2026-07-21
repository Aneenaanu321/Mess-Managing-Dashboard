# Production Deployment Hardening

Status of each item below reflects the codebase as of 2026-07-21. This is a checklist, not a how-to for any specific host — apply it against whatever platform (ECS, Fly, a VPS, k8s) actually runs this.

## Already in place

- **Secrets stay out of the image/repo**: `.gitignore` excludes all `.env*` files (except `.env.example`); `apps/api/Dockerfile`, `apps/worker/Dockerfile`, and `apps/web/Dockerfile` all read config from environment variables at runtime, nothing is baked in at build time except `NEXT_PUBLIC_API_URL` (which is public by design — it's a client-visible URL, not a secret).
- **Security headers**: `helmet()` on every API response.
- **CORS**: locked to `CORS_ORIGIN`, not `*`.
- **Rate limiting**: 300 req/min per IP on all API routes (`app.ts`), auth routes layer a tighter limiter on top.
- **Env validation at boot**: `apps/api/src/config/env.ts` and `apps/worker/src/config/env.ts` both fail fast with a readable error if required vars are missing, instead of surfacing as a confusing runtime bug later.
- **RBAC enforced server-side**, not just hidden in the UI (`authorize()` middleware on every route).
- **Audit trail**: every mutating action writes to `AuditLog` (who/what/when/before/after).
- **Multi-stage Docker builds** for all three apps — the runtime image doesn't carry dev dependencies or source maps.
- **CI gate**: `.github/workflows/ci.yml` runs lint/typecheck/test/build on every push and PR before anything merges.

## Still needed before a real production deploy

1. **Secrets management**: `.env` today is a flat file. Before deploying anywhere multi-person, move `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, and `ANTHROPIC_API_KEY` into your platform's secret store (AWS Secrets Manager / Fly secrets / k8s Secret) rather than an env file on disk. Rotate the JWT secrets before first production use — the values currently in `apps/api/.env` were generated for local dev.
2. **Health checks beyond `/health`**: the current `/health` endpoint only proves the process is up, not that it can reach Postgres/Redis. Add a `/health/ready` that pings both, and point your orchestrator's readiness probe at it (liveness can stay on `/health`).
3. **Structured logging / observability**: `morgan` logs to stdout in dev format; there's no request ID propagation, no error tracking (Sentry or equivalent), and no metrics endpoint. At minimum, switch to JSON logs in production (`morgan("combined")` is a start but not structured) and wire up an error tracker — silent 500s are currently only visible in whatever captures stdout.
4. **Backup strategy**: no automated Postgres backup/restore process exists yet. Whatever host runs Postgres in production needs point-in-time recovery or at minimum a scheduled `pg_dump` to off-host storage before real customer data goes in.
5. **TLS termination**: none of the three Dockerfiles or `docker-compose.yml` set up HTTPS — that's expected to be a reverse proxy (nginx/Caddy/the platform's load balancer) in front of `web`/`api`, not application-level. Make sure that piece exists before exposing this publicly; `CORS_ORIGIN` and cookie `secure`/`sameSite` flags need to match whatever origin actually gets used.
6. **Refresh token cookie hardening**: `apps/web/lib/api-client.ts` documents a deliberate v1 tradeoff — the access token sits in a short-lived (15 min) non-httpOnly cookie so client components can read it. This is reasonable for now but is a documented, not implicit, security tradeoff; a stricter in-memory-token + silent-refresh setup is the natural next hardening step if this becomes internet-facing at scale.
7. **`docker-compose.prod.yml`**: `docs/09-folder-structure.md` references one; it doesn't exist yet. `docker-compose.yml` as it stands is dev-oriented (bind-mounted volumes, no replica counts, no resource limits) — don't point it at production directly.
8. **Object storage wiring**: MinIO is already a service in `docker-compose.yml` and `S3_*` env vars are already validated in `env.ts`, but nothing in the app actually uploads to it yet (`FileAsset` model exists, no upload code). Needed before file/document features ship, tracked in `TODO.md`.
9. **Prisma migrations in prod**: use `prisma migrate deploy` (already wired into CI and `apps/api/package.json`'s `prisma:deploy` script) — never `migrate dev` — against a production database. Take a snapshot before running any migration against real data.
