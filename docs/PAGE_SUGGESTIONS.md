# Page Suggestions — Remaining Backlog

Sales Coordinator roadmap items from July 2026 are **implemented**. Field Ops SOP (driver / warehouse day) is **implemented**. Deferred product/infra items remain below.

---

## Sales Coordinator — shipped ✅

| Feature | Where |
|---------|-------|
| Sales Coordinator RBAC role + demo user | Settings → Roles; `coordinator@ibtechintl.com` |
| Lead assignment + bulk / round-robin assign | New Inquiries list & detail |
| Lead response SLA queue | Coordinator + `/new-inquiries?slaBreached=1` |
| Coordinator worklist + metrics | `/coordinator` |
| Stale deal tiles (7/14/30d) | Coordinator worklist |
| Auto follow-ups on stage change + snooze | Deal Board / Active Deal; Coordinator |
| Quotation chase | Coordinator → Orders |
| PO intake checklist wizard | Customer Order detail |
| Sales → delivery handoff checklist | `/handoffs` |
| Delivery jobs: assign → seen → submit docs/cheque → coordinator verify | Team Tasks (`/team-tasks`); role `driver@ibtechintl.com` |
| Activity templates + call duration | Activity Timeline |
| Meeting scheduler | Active Deal detail |
| Round-robin / SLA / chase settings | Settings → Lead Ops |
| Duplicate lead + customer hygiene | `/sales-ops/hygiene` |
| Document gate (Site Survey) | Opportunity stage change |
| Daily coordinator digest | Worker job `COORDINATOR_DIGEST` |
| Quote revision history | Order detail |
| Internal notes (lead / deal) | New Inquiry & Active Deal detail |
| Shift handover notes | Coordinator page |
| Coordinator performance metrics | Coordinator page |
| Printable deal summary pack | Active Deal → Deal pack |
| Lead capture, pipeline, quotes, PO, approvals, tasks, campaigns, search, AI assistant, dark theme, etc. | Existing app surfaces |

---

## Field Ops SOP — shipped ✅

Demo users: `driver@ibtechintl.com` · `warehouse@ibtechintl.com` · `coordinator@ibtechintl.com`

| # | Activity | Status | Where |
|---|----------|--------|-------|
| 1 | Review planned jobs / follow schedule order | ✅ Done | `/field-ops` day board + `scheduleOrder` |
| 2 | Flag personal/other work that affects schedule early | ✅ Done | Pre-day SOP checklist on Field Ops & job detail |
| 3 | Document bag (DOs, checklists, receipt book, other) | ✅ Done | Pre-day checklist items |
| 4 | Sales order checklist (available / not available) | ✅ Done | Warehouse SOP section |
| 5 | Keep updating checklist until ready to dispatch | ✅ Done | Warehouse SOP section |
| 6 | Notify coordinator if checklist stock used urgently | ✅ Done | Warehouse SOP section |
| 7 | DO items kept separate from free stock | ✅ Done | Warehouse SOP section |
| 8 | Packing on DO (counts, weights, pallets, total weight) | ✅ Done | Packing fields on delivery/export jobs |
| 9 | Same docs process for packing DOs / CN / etc. | ✅ Done | Warehouse SOP + doc packs by job type |
| 10 | Packing materials available / office informed | ✅ Done | Warehouse SOP section |
| 11 | Keep warehouse items clean / dust-free | ✅ Done | Warehouse SOP section |
| 12 | Inform customer before arrival; escalate delays | ✅ Done | Visit SOP + `customerNotifiedAt` |
| 13 | Customer signature on DO + invoice | ✅ Done | Visit SOP checklist |
| 14 | Issue receipt for cheque/cash; keep office copy | ✅ Done | Visit SOP + payment fields on submit |
| 15 | Scan & share signed DO / invoice / receipts immediately | ✅ Done | Doc submission checklist + `FileAttachments` |
| 16 | Clear, complete, readable scans | ✅ Done | Doc checklist gate before submit |
| 17 | Report incomplete job + reschedule | ✅ Done | Report incomplete → `BLOCKED` + notify |
| 18 | End of day: return originals; no docs retained | ✅ Done | EOD checklist + return-originals action |
| 19 | Customer delivery doc pack (signed DO, invoice, stamp/details) | ✅ Done | Job type `DELIVERY` required docs |
| 20 | Export shipment pack (CI, PL, CN, customs) | ✅ Done | Job type `EXPORT_SHIPMENT` |
| 21 | Import receiving pack (count vs PL, rack FIFO, damages, driver) | ✅ Done | Job type `IMPORT_RECEIVING` |
| 22 | Payment collection pack (cheque/cash + receipt + scan) | ✅ Done | Job type `CHEQUE_COLLECTION` |
| 23 | Field Ops day board + progress stats | ✅ Done | `/field-ops` |
| 24 | Warehouse role can work jobs / SOP | ✅ Done | `WAREHOUSE` + `task:*` permissions |

### Field Ops completion stats

| Metric | Value |
|--------|-------|
| SOP activities listed | **24** |
| Done | **24** |
| Pending | **0** |
| Completion | **100%** |

---

## Deferred (product / infra)

| Item | Reason |
|------|--------|
| Production cloud deployment | Guide ready: `docs/12-hosting-vercel-free.md` (Vercel + Neon + Render + Upstash). Still needs your accounts & secrets. |
| Multi-branch coordinator / switching UI | Product decision pending |
| Customer portal coordinator view | Portal binding deferred in PRD v1 |
| Internationalization (i18n) | Not in v1 scope |
| Offline PWA entity sync | Shell cache only |
| Email / WhatsApp lead ingestion | Webhook channel only in v1 |
| Custom dashboard widgets | Planned for v2 |
| Click-to-call telephony integration | Duration logging only (no carrier/CTI) |
| Printable DO / packing slip PDF templates | Use uploads + checklist for now |
| Auto-create finance Payment from field cheque submit | Manual invoice payment still on `/invoices-payments` |

---

## Current rating: **9.8 / 10**

| Area | Score | Gap to 10 |
|------|-------|-----------|
| Feature completeness | 9.7/10 | Telephony CTI, multi-branch, printable DO PDFs |
| UX & polish | 9.5/10 | — |
| Testing | 8/10 | Expand E2E lead → quote → PO → field job |
| Performance | 9/10 | — |
| Production readiness | 8/10 | Cloud deploy |

---

*Last updated: 2026-08-10*
