# TODO — RFIDCore

Status snapshot as of 2026-07-22. Source: `README.md`, `docs/01-PRD.md` (§6 scope, §10 release plan), `docs/04-process-mapping.md`, and current repo contents. This file may be edited by more than one session concurrently — re-verify against the filesystem before trusting a line here.

Completed items are removed from this list rather than checked off, so what remains below is the live remainder.

## Open product questions (need business stakeholder input — not engineering tasks)

- [ ] Which accounting system (if any) should Finance integrate/export to (Tally / QuickBooks / Zoho Books)?
- [ ] Confirm approval thresholds for quotation discounts — implemented as ≤10% auto-send, 10–20% requires approval, >20% requires approval, any price override below catalog price always requires approval (`quotation.service.ts#evaluateApprovalRequirement`); confirm these are the real numbers the business wants.
- [ ] Which currencies and tax regimes (VAT/GST) must be supported at launch?
- [ ] Digital quote approval / PO upload from the Customer Portal — the portal now built (read-only Quotations/POs/Projects/Invoices + support ticket raising) deliberately excludes this; it's a binding customer action that deserves a real product decision, not a default.
- [ ] Inbound lead channels beyond the webhook now built (`POST /api/v1/public/leads`, token in Settings → Organization) — is email/WhatsApp parsing needed too?

## Everything else built this pass

Sales Order Management (PO verify → auto-created SalesOrder → inventory allocation), `apps/worker` (BullMQ: AMC renewal / SLA breach / invoice overdue jobs), CI pipeline, PWA manifest + offline service worker, Executive Dashboard charts, `apps/web/Dockerfile` + `docker-compose.prod.yml`, `docs/10-deployment-hardening.md`, Activity Timeline, Calendar & Follow-ups, Campaign tracking (fixed a missing `companyId` tenant-scoping bug on the way), quotation Approval routing + Approvals inbox, Pre-sales artifacts under Opportunity, object storage wiring (MinIO/S3, verified against a real local instance), Customer merge tool, quotation branded PDF export, lead webhook intake (fixed a pre-existing number-sequence drift bug that was silently blocking all lead creation), outbound email delivery, Settings → Number Sequences + Audit Log viewers, Reports → Receivables Aging.

Second pass: working notification bell (list/unread-count/mark-read/mark-all-read — the bell icon existed but did nothing before this), SLA policy management UI (Settings), CSV export (leads/customers/receivables aging), bulk lead import via CSV (caught and fixed a real bug where one bad row rejected the whole batch), `GET /health/ready` (DB+Redis reachability, wired into `docker-compose.prod.yml`'s healthcheck), Vendor management as its own page (API already existed, was only reachable embedded in Procurement).

Third pass: per-user email notification preferences (toggle in the account dropdown), multi-branch filter on Dashboard + Reports (`BranchFilter` dropdown, real WHERE-clause scoping verified live), and the Customer Portal — its own `/portal/*` section (read-only Quotations/POs/Projects/Invoices scoped strictly to the logged-in customer, plus support ticket raising/commenting), gated by a dedicated `customerId` on the JWT and a repository layer that ANDs `companyId` + `customerId` on every query. Found and fixed a real RBAC leak on the way: `CUSTOMER_PORTAL_USER` had been granted internal view permissions (`QUOTATION_VIEW` etc.) that would have let a portal user hit the *internal*, company-wide endpoints and see every customer's data — fixed in `permissions.ts`, and `seed.ts`'s role-permission sync changed from additive-only to one that also revokes stale grants.
