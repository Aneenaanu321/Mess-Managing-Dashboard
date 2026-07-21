# Business Process Mapping

## 1. Master Lifecycle (entity handoffs)

```
Campaign ──> Lead ──> Opportunity ──> Quotation ──> Sales Order ──> Project ──> Invoice ──> Support/AMC
                                          │              │             │
                                          ▼              ▼             ▼
                                   Customer PO   Inventory Alloc   Devices (installed)
```

Every downstream entity carries a foreign key back to its origin (Invoice → Sales Order → Quotation → Opportunity → Lead), giving full traceability for reporting and audit.

## 2. Lead State Machine

`New → Contacted → Qualified → Converted (→ Opportunity)`
`New → Contacted → Disqualified (terminal, reason required)`

Rules:
- A Lead can only convert to an Opportunity once (`convertedOpportunityId` set on conversion, idempotent).
- Reassignment is logged in `ActivityLog` with previous/next owner.

## 3. Opportunity / Pipeline Stage Machine

```
Requirement Gathering → Site Survey → Technical Discussion → Demo → POC →
Solution Design → Internal Review → Quotation Sent → Negotiation →
[Won | Lost]
```

Rules:
- Backward movement allowed (e.g. Negotiation → Quotation Sent for revision) but logged as a stage regression event.
- `Won` requires: at least one Quotation in status `Approved by Customer` AND a linked PO.
- `Lost` requires a loss reason (Price, Competitor, Timing, Budget, No Decision, Technical Fit, Other) and optional competitor field (feeds win/loss reporting).
- Stage-entry timestamps are recorded per opportunity for velocity/funnel analytics.

## 4. Quotation Approval Workflow

```
Draft → Pending Internal Approval → Approved Internally → Sent to Customer →
[Customer Approved | Customer Rejected | Revision Requested]
```

Approval routing rule (default, configurable in Settings):
- Discount ≤ 10%: no approval required, Sales Executive can send directly.
- Discount 10–20%: Sales Manager approval required.
- Discount > 20%, or deal value > configured threshold: Sales Director approval required.
- Any price override on a catalog item: always requires approval regardless of discount %.

Revision handling: each revision increments `version`; prior versions become read-only (`status = Superseded`); the opportunity always references the latest version but history is retained.

## 5. Purchase Order → Project Handoff

```
Customer PO received → PO logged (matched to Quotation) → Advance Payment recorded →
Inventory Allocation check → Project auto-created → Engineer Assignment
```

Rule: Project creation is blocked until Advance Payment (if required by payment terms on the quotation) is recorded as received — configurable per deal (some deals may have 0% advance).

## 6. Procurement / Inventory Loop

```
Sales Order → Stock check → [Sufficient: Allocate] or [Insufficient: Procurement Suggestion → Supplier PO → Goods Receipt → Stock Update → Allocate]
```

Rule: Allocation reserves stock (`reservedQty`) without decrementing `onHandQty` until physical goods issue against the project.

## 7. Project Delivery Milestones (state machine per project)

```
Created → Engineer Assigned → Installation In Progress → Installation Complete →
Configuration Complete → Testing Complete → Training Complete → Go-Live → Closed
```

Rules:
- Each milestone requires an owner (engineer) and can attach evidence (photos, checklists, signed forms).
- `Go-Live` is gated: Testing Complete AND Training Complete must both be true.
- `Closed` triggers Invoice generation (if not already milestone-invoiced earlier).

## 8. Invoicing & Collections

```
Invoice: Draft → Sent → [Unpaid → Partially Paid → Paid] or → Overdue → Paid
```

Rule: Invoice can be milestone-based (e.g., 40% advance / 40% on delivery / 20% on go-live) — `InvoiceSchedule` model supports multiple invoices per Sales Order.
Overdue = due date passed with `amountDue > 0`; triggers dashboard flag + notification to Accounts and the account's Sales Executive.

## 9. Support Ticket Lifecycle

```
New → Assigned → In Progress → [Resolved → Closed] or → Reopened → In Progress
Escalation path: In Progress + SLA at risk → Escalated (auto-notify Support Manager/Project Manager)
```

SLA targets are set per priority (Critical/High/Medium/Low) at the Company/Branch level, configurable in Settings.

## 10. AMC Lifecycle

```
Contract Created (post Go-Live) → Active → [Renewal Window Reached (90/60/30/7 days)] →
[Renewed → new Active period] or [Lapsed]
```

Rule: Renewal window auto-generates a draft renewal Quotation assigned to the account's Sales Executive.

## 11. Cross-Cutting Rules

- **Audit log**: every create/update/delete on financially or contractually significant entities (Quotation, PO, Invoice, Payment, Project milestone, Permission change) writes an immutable `AuditLog` row (actor, entity, action, before/after diff, timestamp, IP).
- **Notifications**: triggered on assignment, approval request/decision, SLA risk, AMC renewal window, overdue invoice, stage regression on high-value opportunities.
- **Multi-branch/company scoping**: every core entity carries `companyId` and `branchId`; RBAC queries always scope by these unless the role has cross-branch visibility (Managing Director, Super Admin).
