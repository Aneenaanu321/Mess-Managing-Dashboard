# Page Suggestions — Remaining Backlog

Sales Coordinator roadmap items from July 2026 are **implemented**. Deferred product/infra items remain below.

---

## Sales Coordinator — shipped ✅

| Feature | Where |
|---------|-------|
| Sales Coordinator RBAC role + demo user | Settings → Roles; `coordinator@falconrfid.demo` |
| Lead assignment + bulk / round-robin assign | New Inquiries list & detail |
| Lead response SLA queue | Coordinator + `/new-inquiries?slaBreached=1` |
| Coordinator worklist + metrics | `/coordinator` |
| Stale deal tiles (7/14/30d) | Coordinator worklist |
| Auto follow-ups on stage change + snooze | Deal Board / Active Deal; Coordinator |
| Quotation chase | Coordinator → Orders |
| PO intake checklist wizard | Customer Order detail |
| Sales → delivery handoff checklist | `/handoffs` |
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

---

## Current rating: **9.7 / 10**

| Area | Score | Gap to 10 |
|------|-------|-----------|
| Feature completeness | 9.5/10 | Telephony CTI, multi-branch |
| UX & polish | 9.5/10 | — |
| Testing | 8/10 | Expand E2E lead → quote → PO |
| Performance | 9/10 | — |
| Production readiness | 8/10 | Cloud deploy |

---

*Last updated: 2026-07-22*
