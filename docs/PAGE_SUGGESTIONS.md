# Page Suggestions — Remaining Backlog

All Sales Coordinator, Field Ops SOP, and previously deferred product items from this doc are **implemented**. Only external/infra items that need your accounts or third-party carriers remain.

---

## Remaining (needs your accounts / external services)

| Item | Why it stays open |
|------|-------------------|
| Production cloud secrets & go-live | Guide: `docs/12-hosting-vercel-free.md`. Needs your Vercel / Neon / Render / Upstash credentials and secret rotation. |
| Carrier CTI (live dialer / call recording) | Click-to-call (`tel:`) + call duration logging ship in Activity Timeline. Full PBX/CTI needs a telephony vendor. |
| Full i18n translation packs | App is English-first. Adding locales needs content translation work, not just code. |
| Offline entity sync (full PWA) | Service worker shell cache exists; syncing leads/jobs offline needs a dedicated offline queue product pass. |

---

## Shipped this pass (removed from backlog)

- Stale deal tiles 7 / 14 / 30 days on `/coordinator`
- Packing line-item + pallet editors + printable DO / packing slip PDF
- Urgent warehouse stock → auto-notify coordinators
- Field cheque/cash verify → auto-create finance `Payment` when an open invoice exists
- Branch switcher (JWT + profile) in topbar / coordinator
- Customer portal **Account** view with coordinator contact
- Dashboard **Customize widgets** (show/hide KPIs)
- Public lead ingest: `POST /public/leads/email` and `/public/leads/whatsapp`
- Click-to-call phone field on CALL activities

---

*Last updated: 2026-08-10*
