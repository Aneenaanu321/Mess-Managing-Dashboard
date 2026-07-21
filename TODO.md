# TODO — RFIDCore

Status snapshot as of 2026-07-21. Source: `README.md`, `docs/01-PRD.md` (§6 scope, §10 release plan), `docs/04-process-mapping.md`, and current repo contents. This file may be edited by more than one session concurrently — re-verify against the filesystem before trusting a line here.

Also done this pass (not otherwise tracked above): Sales Order Management (PO verify → auto-created SalesOrder → inventory allocation, full API+UI), `apps/worker` (BullMQ: AMC renewal / SLA breach / invoice overdue jobs), CI pipeline, PWA manifest + offline service worker, Executive Dashboard charts, `apps/web/Dockerfile` (was referenced by docker-compose but missing), `docs/10-deployment-hardening.md`.

Completed items are removed from this list rather than checked off, so what remains below is the live remainder.

## Confirmed still missing

- [ ] **Activity Timeline** — `Activity` model + `ActivityType` enum exist; no dedicated timeline component found (check whether opportunity/lead detail pages render it inline before rebuilding)
- [ ] **Calendar & Follow-ups** — `CalendarEvent` model exists; no calendar UI or API found at all
- [ ] **Campaign tracking** — `Campaign` model exists and Lead links to it, but no campaign list/management UI or API (PRD §4: tracking in scope, sending out of scope)
- [ ] **Customer Portal** — dedicated scoped UI for Customer Portal User persona (own Quotation/PO/Project/Invoice/Support, digital quote approval) — not a sidebar module today
- [ ] **Approvals inbox** — cross-module queue for pending quotation discount/price-override approvals; `Approval` model exists, no UI/API found
- [ ] **Pre-sales artifacts under Opportunity** — Site Survey, Demo, POC, Solution Design record UI (schema models exist)
- [ ] **Document/file attachments** — `FileAsset` model + MinIO in docker-compose, but no upload wiring found anywhere
- [ ] **Audit log viewer** — `AuditLog` is written on every mutating action; no searchable UI for it
- [ ] **Customer merge tool** — no merge endpoint/UI found
- [ ] **Quotation branded PDF export** — no PDF generation found
- [ ] **Lead web-form / inbound intake** — manual create exists; no public web-form/webhook intake
- [ ] **Receivables aging report** — not found under Finance or Reports
- [ ] **Number sequences / document numbering UI** — `nextNumber()` works programmatically; no admin UI to view/configure sequences

## Infrastructure / cross-cutting

- [ ] Object storage wiring (MinIO/S3) — bucket is running in docker-compose, nothing uses it yet
- [ ] Outbound email delivery (in-app notification hooks exist; no email transport/user prefs)
- [ ] `docker-compose.prod.yml` (referenced in `docs/09-folder-structure.md`, doesn't exist — `docker-compose.yml` is dev-only)
- [ ] Full multi-branch *switching* — Topbar now shows company/branch/currency context (read-only), but a user is still tied to exactly one branch server-side; real switching needs backend support for multi-branch users first

## Open product questions (need business stakeholder input — not engineering tasks)

- [ ] Which accounting system (if any) should Finance integrate/export to (Tally / QuickBooks / Zoho Books)?
- [ ] Confirm approval thresholds for quotation discounts (placeholder rules in `docs/04-process-mapping.md`)
- [ ] Which currencies and tax regimes (VAT/GST) must be supported at launch?
- [ ] Customer Portal launch scope — read-only + tickets only, or also digital quote approval / PO upload in v1?
- [ ] Inbound lead channels for v1 — web form webhook only, or also email/WhatsApp parsing?
