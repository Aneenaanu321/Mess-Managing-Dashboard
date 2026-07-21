# User Personas & Role Permission Matrix

Each role maps to a permission set enforced at the API layer (see `06-database-schema.md` for the `Role`/`Permission` model). Permissions use `module:action` format (e.g. `lead:approve`, `quotation:override_price`).

| Role | Primary goal | Key modules used | Notable permissions |
|---|---|---|---|
| **Super Admin** | System configuration, full control | Settings & Admin, all modules | `*:*` — full access, manages roles/permissions/companies/branches |
| **Managing Director** | Company-wide visibility, strategic decisions | Executive Dashboard, Reports, Approvals | Read-all, approve high-value quotations/discounts, no data entry |
| **Sales Director** | Regional/team sales performance, forecasting | Sales Dashboard, Pipeline, Reports, AI Assistant | Approve discounts up to threshold, reassign leads/opportunities, view team performance |
| **Sales Manager** | Team quota management, pipeline health | Pipeline, Lead Mgmt, Quotation, Calendar | Assign leads to executives, approve quotations for their team, edit/close opportunities |
| **Sales Executive** | Convert leads to closed deals | Lead Mgmt, Customer Mgmt, Opportunity, Quotation, Activity Timeline, Calendar | Create/edit own leads & opportunities, draft quotations (requires approval to send), log activities |
| **Pre-Sales Engineer** | Technical qualification, demos, POC | Opportunity, Site Survey, Demo/POC records, Solution Design | Edit technical requirement docs, log survey/demo/POC outcomes, attach solution designs |
| **Technical Consultant** | Solution architecture, technical discussions | Opportunity, Solution Design, Quotation (technical line items) | Edit BOM/technical specs on quotations, contribute to solution design |
| **Project Manager** | On-time, in-budget project delivery | RFID Project Mgmt, Engineer Task Mgmt, Installation, Reports | Create/manage projects, assign engineers, track milestones, approve go-live |
| **Implementation Engineer** | Install, configure, test on-site | Installation, Device Mgmt, Engineer Tasks (own), Training | Update task status, log device configs, upload test/training evidence, offline PWA usage |
| **Support Engineer** | Resolve support tickets within SLA | Support Ticketing, Device Mgmt, Customer Mgmt (read) | Create/update/close tickets, escalate, view device/install history |
| **Finance** | Revenue recognition, invoicing accuracy | Finance (Invoices/Payments), Reports | Generate/edit invoices, view payment status, cannot edit inventory/projects |
| **Accounts** | Payment collection, receivables | Finance (Payments/Receipts), Reports | Record payments/receipts, send payment reminders, view outstanding aging |
| **Warehouse** | Stock accuracy, allocation | Inventory & Catalog, Warehouse Mgmt | Adjust stock levels, allocate/reserve inventory to projects, receive goods |
| **Procurement** | Vendor sourcing, PO issuance to suppliers | Procurement, Inventory & Catalog, PO Mgmt | Create supplier POs, manage vendors, receive against PO |
| **Customer Portal User** | Self-service visibility into own account | Customer Portal (scoped view of Quotation/PO/Project/Invoice/Support) | Read-only on own company's records, can raise support tickets, approve quotations digitally |

## Persona Narratives

**Sales Executive — "Ravi"**: Handles 40–60 active leads across retail and healthcare accounts. Needs fast lead capture from calls/emails, a clear pipeline view of what's stalling, and one-click quotation drafts he can send for internal approval before sending to the customer. Pain today: leads get lost in WhatsApp/email, no reminder system for follow-ups.

**Project Manager — "Fatima"**: Runs 8–12 concurrent RFID rollout projects (gate installs, tag programming rollouts). Needs a project board showing engineer assignments, installation/testing/training milestones, and blockers. Pain today: status lives in engineers' heads and WhatsApp groups; go-live dates slip without warning.

**Managing Director — "Anil"**: Wants a single dashboard each morning showing revenue vs target, pipeline health, outstanding collections, and project delivery risk — without asking three managers to compile spreadsheets.

**Support Engineer — "Deepa"**: Resolves 15–20 tickets/week tied to specific installed devices (readers, printers, gates) at customer sites. Needs ticket-to-device-to-install history linkage to diagnose faster, and SLA countdown visibility.

**Customer Portal User — "Client Ops Manager"**: Wants to track their own PO/project status and raise support tickets without calling their account manager.
