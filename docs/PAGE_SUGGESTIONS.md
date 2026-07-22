# Page Suggestions — Roadmap to 10/10

Items completed in the latest audit pass are marked ✅. Remaining items are prioritized for improving the app rating.

---

## Completed ✅

1. ✅ **Light/dark theme** — ThemeProvider, CSS variables, shell components (Sidebar, Topbar, UI primitives), toggle in top bar.
2. ✅ **Confirmation dialogs** — Reusable `ConfirmDialog` + `useConfirm()`; wired to customer merge and approval reject.
3. ✅ **End-to-end user guide** — `docs/11-user-guide.md` covers every page and workflow.
4. ✅ **Login security** — Removed hardcoded email default from login page.
5. ✅ **Frontend tests (foundation)** — Vitest + Testing Library for UI primitives and ConfirmDialog.
6. ✅ **Lazy loading (dashboard charts)** — Recharts loaded via `next/dynamic` in `DashboardCharts` component.
7. ✅ **Package import optimization** — `optimizePackageImports` for recharts and lucide-react.
8. ✅ **Sign in / sign up** — Already implemented at `/login`, `/signup`, `/forgot-password`, `/reset-password`.
9. ✅ **Responsive shell** — Collapsible sidebar, mobile overlay, responsive grid layouts on dashboard.

---

## Remaining — High priority (blocks 10/10)

### UX & dialogs
- [ ] **Extend confirmation dialogs** to all destructive/state-changing actions: quotation send, PO verify, stock adjustment (negative), lead disqualify, ticket close, AMC cancel, line-item remove on forms.
- [ ] **Success toasts** after create/update/delete (currently silent except navigation).
- [ ] **Empty-state illustrations** on list pages — consistent copy and primary CTA button.

### Dark theme completeness
- [ ] **Page-level dark pass** — ~40 dashboard/portal pages still use hardcoded `text-slate-900` / `bg-white` without `dark:` variants. Add semantic utility classes or batch-update.
- [ ] **Chart theming** — Recharts axis/grid/tooltip colors should read from CSS variables in dark mode.
- [ ] **Auth pages** — AuthShell is intentionally dark; verify form contrast in light-theme preview if dual-theme auth is desired.

### Testing
- [ ] **Web integration tests** — Playwright/Cypress smoke tests for login → create lead → convert → quotation flow.
- [ ] **API integration tests** — Supertest coverage for auth, leads, quotations, finance modules (currently only validation unit tests).
- [ ] **Component tests** — Sidebar, Topbar, NotificationBell, LeadImportModal, pipeline Kanban.

### Performance
- [ ] **Lazy-load Reports charts** — Same pattern as dashboard (`ReportsCharts` dynamic import).
- [ ] **Route-level code splitting audit** — Verify Next.js automatic splitting; add `loading.tsx` skeletons per route group.
- [ ] **React Query staleTime tuning** — Reduce redundant API calls on tab switches.
- [ ] **Image optimization** — Ensure all logos use `next/image` with correct sizes.

### Data & cloud
- [ ] **Production ibTech cloud deployment** — Deploy API + web + worker to cloud Postgres/Redis/S3; update `NEXT_PUBLIC_API_URL` for live environment.
- [ ] **Remove demo seed credentials from console output** in production builds.
- [ ] **Health check verification** — Confirm `/health/ready` is wired in cloud load balancer.

### Code quality
- [ ] **Comment cleanup pass** — Trim verbose explanatory comments in `api-client.ts`, module services; keep business-logic comments only.
- [ ] **Shared form components** — Reduce duplication across 20+ `/new` pages (FormField, PageHeader, ListPageLayout).

---

## Remaining — Medium priority

- [ ] **Multi-branch switching UI** — Topbar shows read-only context; Settings branch switcher blocked on product decision (see `TODO.md`).
- [ ] **Customer portal binding actions** — Digital quote approval and PO upload (deferred in PRD v1).
- [ ] **Accessibility audit** — ARIA labels on all icon-only buttons, focus traps in modals, keyboard nav on Kanban.
- [ ] **Internationalization (i18n)** — Currency/date formatting exists; full locale strings not implemented.
- [ ] **Offline PWA data sync** — Service worker caches shell; entity data not cached for offline edits.
- [ ] **Email/WhatsApp lead ingestion** — Only webhook channel in v1.

---

## Remaining — Polish for 10/10

- [ ] **Onboarding tour** — First-login walkthrough for new sales executives.
- [ ] **Keyboard shortcuts** — Quick nav (e.g. `g l` → leads).
- [ ] **Bulk actions** — Multi-select on leads/customers for assign/export/delete.
- [ ] **Advanced search** — Global search across customers, opportunities, quotations.
- [ ] **Custom dashboard widgets** — Role-specific dashboard layouts.
- [ ] **Audit log UI filters** — Date range, entity type, user filters in Settings.

---

## Current rating: **7.5 / 10**

| Area | Score | Notes |
|------|-------|-------|
| Feature completeness | 9/10 | All 25 PRD modules have API + UI |
| UX & polish | 7/10 | Theme + confirms added; toasts and empty states missing |
| Testing | 5/10 | API validation tests + new UI unit tests; no E2E |
| Performance | 7/10 | Dashboard lazy charts; reports and routes need same |
| Security | 8/10 | RBAC, JWT, rate limits; token storage tradeoff documented |
| Documentation | 8/10 | User guide + README; inline code comments still verbose |
| Responsiveness | 8/10 | Mobile sidebar works; some tables overflow on small screens |
| Production readiness | 6/10 | Local/docker dev ready; cloud deploy checklist incomplete |

**Target 10/10 requires:** full dark theme on all pages, E2E test suite, confirmation/toast on every mutation, cloud deployment with live data, and performance pass on reports + list pages.

---

*Last updated: 2026-07-22*
