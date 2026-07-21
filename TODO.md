# TODO — RFIDCore

Status snapshot as of 2026-07-21. Source: `README.md`, `docs/01-PRD.md` (§6 scope, §10 release plan), `docs/04-process-mapping.md`, and current repo contents. This file may be edited by more than one session concurrently — re-verify against the filesystem before trusting a line here.

Completed items are removed from this list rather than checked off, so what remains below is the live remainder.

## Confirmed still missing

- [ ] **Customer Portal** — dedicated scoped UI for Customer Portal User persona (own Quotation/PO/Project/Invoice/Support, digital quote approval) — not a sidebar module today. Deferred: this is a whole persona-scoped section of the app (its own auth/routing scoping strategy), not a fit for an incremental pass.

## Infrastructure / cross-cutting

- [ ] Full multi-branch *switching* — Topbar shows company/branch/currency context (read-only), but a user is still tied to exactly one branch server-side. Deferred: needs a product decision first — should a user belong to multiple branches, or is this an elevated-role "view as" feature? Not just an engineering gap.
- [ ] Per-user email notification preferences — outbound email now sends alongside every in-app notification (see `apps/api/src/utils/email.ts` / `apps/worker/src/email.ts`), but there's no per-user opt-out/preference toggle yet.

## Open product questions (need business stakeholder input — not engineering tasks)

- [ ] Which accounting system (if any) should Finance integrate/export to (Tally / QuickBooks / Zoho Books)?
- [ ] Confirm approval thresholds for quotation discounts — implemented as ≤10% auto-send, 10–20% requires approval, >20% requires approval, any price override below catalog price always requires approval (`quotation.service.ts#evaluateApprovalRequirement`); confirm these are the real numbers the business wants.
- [ ] Which currencies and tax regimes (VAT/GST) must be supported at launch?
- [ ] Customer Portal launch scope — read-only + tickets only, or also digital quote approval / PO upload in v1?
- [ ] Inbound lead channels beyond the webhook now built (`POST /api/v1/public/leads`, token in Settings → Organization) — is email/WhatsApp parsing needed too?

## Everything else built this pass

Sales Order Management (PO verify → auto-created SalesOrder → inventory allocation), `apps/worker` (BullMQ: AMC renewal / SLA breach / invoice overdue jobs), CI pipeline, PWA manifest + offline service worker, Executive Dashboard charts, `apps/web/Dockerfile` + `docker-compose.prod.yml`, `docs/10-deployment-hardening.md`, Activity Timeline, Calendar & Follow-ups, Campaign tracking (fixed a missing `companyId` tenant-scoping bug on the way), quotation Approval routing + Approvals inbox, Pre-sales artifacts under Opportunity, object storage wiring (MinIO/S3, verified against a real local instance), Customer merge tool, quotation branded PDF export, lead webhook intake (fixed a pre-existing number-sequence drift bug that was silently blocking all lead creation), outbound email delivery, Settings → Number Sequences + Audit Log viewers, Reports → Receivables Aging.
