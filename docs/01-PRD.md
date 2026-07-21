# Product Requirements Document (PRD)
## RFID Enterprise Sales CRM & Business Operations Platform

**Product name:** RFIDCore (working name)
**Owner:** Aneena Antony
**Version:** 1.0 — 2026-07-20

---

## 1. Purpose

Replace Excel-based tracking, manual follow-ups, email-driven approvals, and disconnected tools with a single system of record covering the full lifecycle of an RFID solutions distributor/system integrator: marketing → lead → sales → pre-sales → quotation → PO → procurement → inventory → project → installation → go-live → invoicing → collections → support → AMC renewal.

## 2. Problem Statement

The company currently tracks leads, quotations, projects, inventory, and support in separate spreadsheets and email threads. This causes: lost leads, duplicate customer records, quotation version confusion, no visibility into project/installation status, missed AMC renewals, no real-time revenue/pipeline visibility for leadership, and no audit trail for approvals or pricing changes.

## 3. Goals

- Single source of truth for customers, opportunities, quotations, orders, projects, and support.
- End-to-end traceability: every invoice traces back to a PO, every PO to a quotation, every quotation to an opportunity, every opportunity to a lead.
- Role-scoped visibility so each of the 15 roles sees only what they need.
- Real-time executive and sales dashboards replacing manual reporting.
- Automation of follow-up reminders, approval routing, and AMC renewal alerts.
- Foundation that scales to multi-branch and multi-company operation without rearchitecture.

## 4. Non-Goals (v1)

- Full accounting/GL ledger (Finance module tracks invoices/payments/receivables, not a complete double-entry ledger — integration hook left open for Tally/QuickBooks/Zoho Books).
- Native mobile apps (mobile-responsive PWA web app instead).
- Automated marketing campaign execution (campaign *tracking* is in scope; sending campaigns is not).

## 5. Target Users

15 roles, see `02-personas.md` for detail: Super Admin, Managing Director, Sales Director, Sales Manager, Sales Executive, Pre-Sales Engineer, Technical Consultant, Project Manager, Implementation Engineer, Support Engineer, Finance, Accounts, Warehouse, Procurement, Customer Portal User.

## 6. Scope — Modules (v1, all in scope per business requirement)

1. Executive Dashboard
2. Sales Dashboard
3. Lead Management
4. Customer & Contact Management
5. Opportunity Management
6. Sales Pipeline (Kanban)
7. Activity Timeline
8. Calendar & Follow-ups
9. Quotation Management
10. Purchase Order Management
11. Sales Order Management
12. Inventory & Product Catalog
13. Warehouse Management
14. Procurement
15. RFID Project Management
16. Installation Management
17. Device Management
18. Engineer Task Management
19. Finance (Invoices, Payments, Receipts)
20. Support Ticketing
21. AMC & Contract Management
22. Notifications
23. Reports & Analytics
24. AI Sales Assistant
25. Settings & Administration

## 7. Core Business Workflow

```
Campaign → Lead → Qualification → Assignment → Contact → Meeting →
Requirement Gathering → Site Survey → Technical Discussion → Demo → POC →
Solution Design → Internal Review → Quotation → Negotiation → Revision →
Customer Approval → Purchase Order → Advance Payment → Inventory Allocation →
Project Creation → Engineer Assignment → Installation → Configuration →
Testing → Training → Go-Live → Invoice → Payment Collection → Support →
AMC Renewal
```

Full state-machine mapping per entity is in `04-process-mapping.md`.

## 8. Success Metrics

- 100% of new leads captured in-system within 24h of campaign/inbound contact (vs. spreadsheet today).
- Quotation turnaround time reduced (time from "requirement gathering complete" to "quotation sent").
- Zero missed AMC renewals (system-driven alerts 90/60/30/7 days before expiry).
- Executive dashboard reflects revenue/pipeline/collections in real time, no manual report compilation.
- Full audit trail on quotations, approvals, and price overrides (compliance requirement).

## 9. Key Constraints

- Must support multi-currency (customers span GCC/India/international) and multi-branch/multi-company from day one at the data-model level, even if UI for switching is basic in v1.
- RBAC must be enforced at the API layer, not just hidden in UI.
- All monetary and inventory-affecting actions must be audit-logged (who, what, when, before/after).
- PWA offline support required for engineers doing on-site installation/testing where connectivity is poor.

## 10. Release Plan

Built incrementally, module by module, each validated (schema → API → UI → tests) before the next starts. See project task list. Order: foundation (auth/RBAC) → Lead → Customer → Opportunity/Pipeline → Quotation → PO/Sales Order/Inventory/Warehouse/Procurement → Project/Installation/Device/Engineer Tasks → Finance → Support/AMC → Dashboards/Reports → Notifications/AI/Settings → Testing → Deployment.

## 11. Open Questions (to revisit with business stakeholders)

- Which accounting system (if any) does Finance need to integrate/export to?
- Approval thresholds for quotation discounts (e.g., >15% requires Sales Director approval) — placeholder rules defined in `04-process-mapping.md`, to be confirmed.
- Which currencies and tax regimes (VAT/GST) must be supported at launch?
