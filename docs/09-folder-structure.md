# Monorepo Folder Structure

```
rfidcore/
├── apps/
│   ├── web/                       # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── leads/
│   │   │   │   ├── customers/
│   │   │   │   ├── opportunities/
│   │   │   │   ├── pipeline/
│   │   │   │   ├── quotations/
│   │   │   │   ├── purchase-orders/
│   │   │   │   ├── sales-orders/
│   │   │   │   ├── inventory/
│   │   │   │   ├── warehouse/
│   │   │   │   ├── procurement/
│   │   │   │   ├── projects/
│   │   │   │   ├── installations/
│   │   │   │   ├── devices/
│   │   │   │   ├── tasks/
│   │   │   │   ├── finance/
│   │   │   │   ├── support/
│   │   │   │   ├── amc/
│   │   │   │   ├── reports/
│   │   │   │   ├── ai-assistant/
│   │   │   │   ├── settings/
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   ├── components/            # app-specific composite components
│   │   ├── lib/                   # api client, auth helpers, hooks
│   │   └── public/
│   ├── api/                        # Express backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── leads/
│   │       │   │   ├── lead.routes.ts
│   │       │   │   ├── lead.controller.ts
│   │       │   │   ├── lead.service.ts
│   │       │   │   ├── lead.repository.ts
│   │       │   │   ├── lead.validation.ts   # Zod schemas
│   │       │   │   └── lead.test.ts
│   │       │   ├── customers/
│   │       │   ├── opportunities/
│   │       │   ├── quotations/
│   │       │   ├── purchase-orders/
│   │       │   ├── sales-orders/
│   │       │   ├── inventory/
│   │       │   ├── warehouse/
│   │       │   ├── procurement/
│   │       │   ├── projects/
│   │       │   ├── installations/
│   │       │   ├── devices/
│   │       │   ├── tasks/
│   │       │   ├── finance/
│   │       │   ├── support/
│   │       │   ├── amc/
│   │       │   ├── notifications/
│   │       │   ├── reports/
│   │       │   ├── ai/
│   │       │   └── settings/
│   │       ├── middleware/         # authenticate, authorize, audit, tenant-scope, error handler
│   │       ├── prisma/             # schema.prisma, migrations, seed.ts
│   │       └── server.ts
│   └── worker/                     # BullMQ background jobs
│       └── src/jobs/
├── packages/
│   ├── ui/                         # shared ShadCN-based component library
│   ├── shared/                     # shared TS types + Zod schemas (frontend+backend)
│   └── config/                     # eslint, tsconfig, tailwind config presets
├── docs/                           # this documentation set
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json
├── package.json
└── .github/workflows/ci.yml
```

Rationale: `apps/api/src/modules/<module>` mirrors the 25 functional modules 1:1, each self-contained (routes/controller/service/repository/validation/tests) so a module can be reviewed, tested, or extracted independently — directly supporting the "validate each module before moving to the next" build approach.
