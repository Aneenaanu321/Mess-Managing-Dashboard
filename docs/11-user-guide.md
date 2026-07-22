# User Guide — ibTech Sales Operations Dashboard

End-to-end walkthrough of every page in the app. All data is live from the API (`NEXT_PUBLIC_API_URL`) backed by PostgreSQL — there is no mock data layer in the frontend.

**Demo login:** seeded users in `apps/api/prisma/seed.ts` (e.g. `admin@falconrfid.demo` / `Password123!`).

---

## Authentication

| Page | Path | What it does |
|------|------|--------------|
| **Sign in** | `/login` | Email + password login. "Remember me" keeps the session for 7 days. Redirects to `/leads` (internal) or `/portal` (customer portal users). |
| **Sign up** | `/signup` | Self-registration for new internal users (role assigned by admin in Settings). |
| **Forgot password** | `/forgot-password` | Sends a reset link to the email if the account exists. |
| **Reset password** | `/reset-password?token=…` | Sets a new password from the email link. |

---

## Overview

| Page | Path | What it does |
|------|------|--------------|
| **Executive Dashboard** | `/dashboard` | Real-time KPI cards (leads, pipeline, revenue, projects, support, AMC), attention alerts, charts (pipeline by stage, lead funnel, collections trend), recent leads/opportunities/events, pending approvals, expiring AMCs. Branch filter scopes data. |

---

## Sales

| Page | Path | What it does |
|------|------|--------------|
| **Leads** | `/leads` | List, search, filter by status/industry. CSV export. Bulk CSV import (modal). Create at `/leads/new`. Detail at `/leads/[id]` — assign owner, change status, convert to opportunity, activity timeline. |
| **Customers** | `/customers` | Customer directory with search/industry filter, CSV export. Merge duplicates (confirmation dialog). Create at `/customers/new`. Detail at `/customers/[id]` — contacts, sites, linked records. |
| **Opportunities** | `/opportunities` | Pipeline opportunities list. Create at `/opportunities/new`. Detail at `/opportunities/[id]` — stage changes, pre-sales artifacts, quotations link. |
| **Pipeline** | `/pipeline` | Kanban board by stage. Drag cards to advance; closing as **Lost** opens a reason modal. |
| **Quotations** | `/quotations` | Quotation list with status. Create at `/quotations/new` with line items, discounts, tax. Detail at `/quotations/[id]` — send, approval routing (>10% discount), PDF export. |
| **Approvals** | `/approvals` | Pending discount/price-override decisions. Approve or reject (with confirmation on reject). |
| **Campaigns** | `/campaigns` | Marketing campaign tracking. Create at `/campaigns/new`. Detail at `/campaigns/[id]` — linked leads. |
| **Calendar** | `/calendar` | Follow-up events list. Create at `/calendar/new`. Mark events complete inline. |

---

## Fulfillment

| Page | Path | What it does |
|------|------|--------------|
| **Purchase Orders** | `/purchase-orders` | Customer PO list. Create at `/purchase-orders/new`. Detail — verify PO, record advance payment. |
| **Sales Orders** | `/sales-orders` | Sales order list. Detail at `/sales-orders/[id]` — allocate inventory from warehouse. |
| **Inventory & Catalog** | `/inventory` | Product catalog. Create at `/inventory/new`. Detail at `/inventory/[id]` — edit pricing/SKU. |
| **Warehouse** | `/warehouse` | Warehouse list. Detail at `/warehouse/[id]` — stock levels, adjust stock (+/−). |
| **Procurement** | `/procurement` | Supplier PO list. Create at `/procurement/new`. Detail at `/procurement/[id]`. |
| **Vendors** | `/vendors` | Vendor directory with inline create form. |

---

## Delivery

| Page | Path | What it does |
|------|------|--------------|
| **Projects** | `/projects` | RFID project list. Create at `/projects/new`. Detail — status, milestones, linked installation/devices. |
| **Installations** | `/installations` | Installation job list and status tracking. |
| **Devices** | `/devices` | Deployed device registry. Register at `/devices/new`. Detail — status updates. |
| **Engineer Tasks** | `/tasks` | Field engineer task list. Create at `/tasks/new`. Detail — status workflow. |

---

## Operations

| Page | Path | What it does |
|------|------|--------------|
| **Finance** | `/finance` | Invoice list. Create at `/finance/new`. Detail at `/finance/[id]` — record payments, track balance. |
| **Support Tickets** | `/support` | Ticket list. Create at `/support/new`. Detail — status, SLA, comments thread. |
| **AMC & Contracts** | `/amc` | AMC contract list. Create at `/amc/new`. Detail — renewal status, linked customer/site. |

---

## Insights & System

| Page | Path | What it does |
|------|------|--------------|
| **Reports & Analytics** | `/reports` | Funnel, pipeline, collections, receivables aging charts. CSV export. Branch filter. |
| **AI Assistant** | `/ai-assistant` | Chat with the sales AI (requires `ANTHROPIC_API_KEY` on API). Lead scoring suggestions. |
| **Settings** | `/settings` | Organization profile, users, roles, number sequences, SLA policies, audit log viewer. |

---

## Customer Portal

Portal users (linked to a customer record) see a separate layout at `/portal`:

| Page | Path | What it does |
|------|------|--------------|
| **Portal home** | `/portal` | Summary of open quotations, POs, projects, invoices, support. |
| **Quotations** | `/portal/quotations` | Read-only quotation list and detail. |
| **Purchase Orders** | `/portal/purchase-orders` | Read-only PO list and detail. |
| **Projects** | `/portal/projects` | Project status (read-only). |
| **Invoices** | `/portal/invoices` | Invoice list and detail. |
| **Support** | `/portal/support` | Create tickets, view status, add comments. |

---

## Cross-cutting features

- **Notifications bell** (top bar): in-app notifications; optional email mirror per user preference.
- **Activity timeline** (entity detail pages): log calls, meetings, notes.
- **File attachments** (where shown): upload to S3/MinIO when `S3_*` env vars are configured.
- **RBAC**: sidebar and API enforce 15-role permissions — users only see actions their role allows.
- **Theme toggle** (top bar): light/dark mode; preference saved in localStorage.
- **Confirmation dialogs**: destructive actions (customer merge, approval reject) use modal confirmations.
- **PWA**: installable on mobile; service worker caches shell for field engineers.

---

## Typical business workflow

```
Campaign → Lead → Qualify → Opportunity → Quotation → Approval (if needed) →
Customer PO → Sales Order → Inventory allocation → Project → Installation →
Go-live → Invoice → Payment → Support → AMC renewal
```

Each step links to the next; use detail-page timelines and cross-links to trace records end to end.

---

## Data source

All list and detail views fetch from the REST API (`apps/api`). In production, point `DATABASE_URL` and `NEXT_PUBLIC_API_URL` at your ibTech cloud deployment. Locally, run `docker compose up -d postgres redis minio` and `npm run dev`.
