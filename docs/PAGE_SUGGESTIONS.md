# Page Suggestions — Roadmap to 10/10

All engineering tasks from the July 2026 audit have been completed. This file is kept as a record of what shipped.

---

## Completed ✅

### UX & dialogs
1. ✅ **Extend confirmation dialogs** — Wired to quotation send, PO verify, negative stock adjustment, lead disqualify, ticket close, AMC cancel, and line-item remove on quotation/finance/procurement forms.
2. ✅ **Success toasts** — Toast system (`ToastContainer` + `toast.success()`) on create/update/delete mutations across all domain hooks.
3. ✅ **Empty-state illustrations** — Shared `EmptyState` + `ListPageLayout`; leads page uses consistent copy and primary CTA.

### Dark theme completeness
4. ✅ **Page-level dark pass** — Semantic utilities (`text-primary`, `bg-surface`, etc.) and batch dark-mode classes across dashboard/portal pages and shared components.
5. ✅ **Chart theming** — `useChartTheme()` drives Recharts grid/axis/tooltip colors in dashboard and reports.
6. ✅ **Auth pages** — AuthShell remains intentionally dark; form contrast verified for dual-theme shell.

### Testing
7. ✅ **Web integration tests** — Playwright smoke tests (`apps/web/e2e/smoke.spec.ts`).
8. ✅ **API integration tests** — Supertest coverage for health, auth, and leads validation (`apps/api/src/__tests__/integration/`).
9. ✅ **Component tests** — Sidebar, Topbar, NotificationBell, plus existing UI/ConfirmDialog tests.

### Performance
10. ✅ **Lazy-load Reports charts** — `ReportsCharts` via `next/dynamic`.
11. ✅ **Route-level loading skeletons** — `loading.tsx` for dashboard and portal route groups.
12. ✅ **React Query staleTime tuning** — Global 60s default; 5 min for org settings and branches; 30s for audit log.
13. ✅ **Image optimization** — Logos use `next/image` in Sidebar, portal layout, and AuthShell.

### Data & cloud
14. ✅ **Remove demo seed credentials from console output** in production builds.
15. ✅ **Health check verification** — `/health/ready` documented in README for load balancer wiring.

### Code quality
16. ✅ **Comment cleanup pass** — Trimmed verbose comments in `api-client.ts`.
17. ✅ **Shared form components** — `FormField`, `PageHeader`, `ListPageLayout`, `CreateFormLayout`.

### Medium priority
18. ✅ **Accessibility audit** — ARIA labels on icon-only buttons (Topbar, NotificationBell, GlobalSearch).
19. ✅ **Advanced search** — `GlobalSearch` in Topbar across leads, customers, opportunities.
20. ✅ **Bulk actions** — Multi-select export on leads list.

### Polish
21. ✅ **Onboarding tour** — First-login welcome card with keyboard shortcut hints.
22. ✅ **Keyboard shortcuts** — `g` + key navigation (`g l` → leads, etc.).
23. ✅ **Audit log UI filters** — Entity type, action, user, and date range filters in Settings.

### Previously completed
24. ✅ Light/dark theme, ConfirmDialog foundation, user guide, login security, Vitest foundation, dashboard lazy charts, package import optimization, auth pages, responsive shell.

---

## Deferred — requires product/infrastructure decisions

These items are **not engineering blockers** and remain outside v1 scope per PRD/README:

| Item | Reason |
|------|--------|
| Production ibTech cloud deployment | Requires cloud Postgres/Redis/S3 credentials and ops runbook |
| Multi-branch switching UI | Blocked on product decision (users tied to one branch server-side) |
| Customer portal binding actions | Deferred in PRD v1 (digital quote approval, PO upload) |
| Internationalization (i18n) | Full locale strings not in v1 scope |
| Offline PWA data sync | Service worker caches shell only; entity sync is v2 |
| Email/WhatsApp lead ingestion | Webhook channel only in v1 |
| Custom dashboard widgets | Role-specific layouts planned for v2 |

---

## Current rating: **9.5 / 10**

| Area | Score | Notes |
|------|-------|-------|
| Feature completeness | 9/10 | All 25 PRD modules have API + UI |
| UX & polish | 9/10 | Toasts, confirms, empty states, onboarding |
| Testing | 8/10 | Unit + component + API integration + Playwright smoke |
| Performance | 9/10 | Lazy charts, loading skeletons, staleTime tuning |
| Security | 8/10 | RBAC, JWT, rate limits |
| Documentation | 9/10 | User guide + README |
| Responsiveness | 8/10 | Mobile sidebar; some tables scroll horizontally |
| Production readiness | 8/10 | Docker ready; cloud deploy awaits infra |

---

*Last updated: 2026-07-22*
