# User Stories & Acceptance Criteria

Format: `As a <role>, I want <capability>, so that <benefit>.` Each story lists acceptance criteria (AC) used directly as the basis for module test plans.

## Lead Management

**US-1.1** As a Sales Executive, I want to create a lead manually or have it auto-created from a campaign/web form, so that no inbound interest is lost.
- AC: Lead requires name, company, phone/email, source, and industry at minimum.
- AC: Duplicate detection warns if phone/email matches an existing lead or customer.
- AC: Lead gets a system-generated score (AI Lead Scoring) on creation and on each update.

**US-1.2** As a Sales Manager, I want leads auto/manually assigned to executives by territory or round-robin, so that leads are worked promptly.
- AC: Assignment triggers a notification to the assignee within 1 minute.
- AC: Unassigned leads older than 24h are flagged on the Sales Dashboard.

**US-1.3** As a Sales Executive, I want to qualify or disqualify a lead with a reason code, so that the pipeline only contains real opportunities.
- AC: Disqualified leads require a reason (Budget, Timing, No Authority, Not Interested, Competitor, Other).
- AC: Qualified lead conversion creates a linked Opportunity automatically, preserving lead source/history.

## Customer & Contact Management

**US-2.1** As a Sales Executive, I want a single customer record with multiple contacts, sites, and industry classification, so that I don't recreate customer data per deal.
- AC: Customer has at least one primary contact; multiple ship-to/site addresses supported.
- AC: Customer merge tool for de-duplication (Super Admin/Sales Manager only), fully audit-logged.

## Opportunity Management & Pipeline

**US-3.1** As a Sales Executive, I want to move opportunities through stages on a Kanban board, so that I can see what needs attention.
- AC: Stages: Requirement Gathering → Site Survey → Technical Discussion → Demo → POC → Solution Design → Internal Review → Quotation → Negotiation → Won/Lost.
- AC: Moving to "Lost" requires a loss reason; moving past "Quotation" requires an attached quotation record.
- AC: Stage duration is tracked for funnel/velocity reporting.

**US-3.2** As a Sales Director, I want expected close date and probability per stage, so that forecasting is accurate.
- AC: Probability defaults per stage (configurable), editable per opportunity with audit log.

## Quotation Management

**US-4.1** As a Sales Executive, I want to generate a quotation from an opportunity's BOM, so that pricing is consistent and traceable.
- AC: Quotation line items pull from Product Catalog with current price list; manual override requires reason + is audit-logged.
- AC: Discounts above role-configured threshold (default 15%) route to Sales Manager/Director approval before the quote can be sent.
- AC: Quotation versioning: each revision keeps prior versions read-only and linked.
- AC: Quotation exportable as branded PDF.

**US-4.2** As a Sales Manager, I want to approve or reject quotations pending approval, so that discounting stays controlled.
- AC: Approval/rejection notifies the requester; rejection requires a comment.

## Purchase Order / Sales Order / Inventory / Warehouse / Procurement

**US-5.1** As a Customer Portal User or Sales Executive, I want to record the customer's PO against an approved quotation, so that fulfillment can begin.
- AC: PO amount must reconcile with the approved quotation total (tolerance configurable); mismatches are flagged, not blocked.
- AC: PO upload (scanned/digital copy) is mandatory and versioned.

**US-5.2** As Warehouse, I want to allocate/reserve stock against a sales order, so that installation isn't blocked by stock-outs.
- AC: Allocation reduces "available" stock, not physical stock, until goods issue.
- AC: Insufficient stock triggers a Procurement suggestion/PO draft.

**US-5.3** As Procurement, I want to raise supplier POs and receive against them, so that stock replenishment is tracked end to end.
- AC: Goods receipt updates inventory and is matched against the supplier PO with variance flagging.

## RFID Project Management / Installation / Device / Engineer Tasks

**US-6.1** As a Project Manager, I want a project auto-created when advance payment is confirmed, so that delivery starts without manual handoff.
- AC: Project inherits scope/BOM from the won opportunity/sales order.
- AC: Project has milestones: Engineer Assignment → Installation → Configuration → Testing → Training → Go-Live, each with owner and due date.

**US-6.2** As an Implementation Engineer, I want to update task status and log device configuration from the field (including offline), so that project status is always current.
- AC: PWA caches assigned tasks and syncs updates when connectivity resumes.
- AC: Each installed device gets a record (serial, location, config, firmware) linked to the project and customer site — this becomes the Support module's diagnostic reference.

**US-6.3** As a Project Manager, I want Go-Live to require signed-off testing and training, so that projects aren't closed prematurely.
- AC: Go-Live status is blocked until Testing and Training milestones are marked complete with evidence (checklist/photo/signature upload).

## Finance

**US-7.1** As Finance, I want an invoice generated from a Go-Live or delivery milestone, so that billing is timely and accurate.
- AC: Invoice line items trace back to the sales order/quotation; partial/milestone invoicing supported.
- AC: Multi-currency invoice with configured tax rules (VAT/GST) per branch/company.

**US-7.2** As Accounts, I want to record payments/receipts against invoices and see an aging report, so that collections are proactive.
- AC: Partial payments supported; invoice status auto-updates (Unpaid/Partially Paid/Paid/Overdue).
- AC: Overdue invoices trigger dashboard alerts and (configurable) automated reminder notifications.

## Support Ticketing & AMC

**US-8.1** As a Support Engineer, I want tickets linked to specific installed devices and SLA timers, so that I can prioritize and diagnose faster.
- AC: SLA breach risk is visually flagged (amber at 80% of SLA window, red on breach).
- AC: Ticket resolution requires a resolution note; reopens are tracked.

**US-8.2** As Accounts/Sales, I want AMC contracts tracked with renewal alerts at 90/60/30/7 days, so that renewals are never missed.
- AC: AMC covers specific devices/sites; renewal generates a draft quotation automatically.

## Dashboards, Reports, Notifications, AI, Settings

**US-9.1** As Managing Director, I want an executive dashboard with the specified KPIs and charts refreshed in real time, so that I don't need manual reports.
- AC: All KPIs listed in the PRD render with live data; charts support date-range filtering.

**US-9.2** As any user, I want in-app and (configurable) email notifications for assignments, approvals, SLA risk, and AMC renewals, so that nothing is missed.
- AC: Notification preferences configurable per user; unread count visible in nav.

**US-9.3** As a Sales Executive, I want AI-suggested follow-up actions and a drafted follow-up email, so that I save time on routine writing.
- AC: AI suggestions are advisory only — no automated customer-facing action is sent without explicit user confirmation.

**US-9.4** As Super Admin, I want to configure roles, permissions, branches, companies, and price lists, so that the system adapts to org changes without a code deployment.
- AC: Permission changes take effect immediately and are audit-logged.
