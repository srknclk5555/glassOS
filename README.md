# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Current Project Status

- **Current Sprint:** Sprint 2.6.6 — Background Job Architecture (Enterprise Foundation)
- **Current Milestone:** Sprint 2.6.6 completed (318 tests, 10 services, 45 domain events, background job infrastructure with in-memory queue, priority ordering, retry with exponential backoff)
- **Service Completion:** CustomerService, OrderService, ProductionService, ProductionQueueService, ReworkService, CuttingExecutionService, ProductionTransferService, StationOperationService, QualityControlService, DispatchService — 10 services, 45 domain events, all services wired through singleton EventPublisher in composition root
- **Previous Sprint:** Sprint 2.6.5A ✅ — Event Publisher Production Wiring Fix (267 tests, composition root wiring)
- **Architecture Lock:** `SERVICE_ARCHITECTURE.md` + `BACKGROUND_ARCHITECTURE.md` are the design references. All 318 tests passing, TypeScript zero errors.
- **Architecture Freeze:** No schema, migration, or repository changes allowed.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
npm dlx turbo build
npm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
npm exec turbo build --filter=docs
npm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
npm exec turbo dev
npm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
npm exec turbo dev --filter=web
npm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
npm exec turbo login
npm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
npm exec turbo link
npm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)

## Project Documentation

- [PLAN.md](PLAN.md) â€” Project plan, roadmap and design decisions.
- [walkthrough.md](walkthrough.md) â€” Sprint walkthroughs and change summaries.
- [CHANGELOG.md](CHANGELOG.md) â€” Release notes and changelog.
- [DECISIONS.md](DECISIONS.md) â€” Architectural decision records (ADRs).
- [SECURITY.md](SECURITY.md) â€” GlassOS security policies, standards, threat model, and security roadmap.
- [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) - Deployment models, PostgreSQL role architecture, migration/runtime connection strategy, and production checklist.
- [PRODUCTION_FLOW_ARCHITECTURE.md](PRODUCTION_FLOW_ARCHITECTURE.md) â€” Single source of truth for production routing.
- [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md) â€” Production & MES architecture.
- [PRODUCT_ARCHITECTURE.md](PRODUCT_ARCHITECTURE.md) â€” Product and recipe architecture.
- [PRODUCTION_QUEUE_ARCHITECTURE.md](PRODUCTION_QUEUE_ARCHITECTURE.md) â€” Production queue and operation tracking architecture.
- [PERSONNEL_ARCHITECTURE.md](PERSONNEL_ARCHITECTURE.md) â€” Implemented production personnel, station permissions, machine assignment and shift planning architecture.
- [MACHINE_MANAGEMENT_ARCHITECTURE.md](MACHINE_MANAGEMENT_ARCHITECTURE.md) â€” Implemented production machine card, maintenance, operator assignment and machine documentation architecture.
- [STATION_MANAGEMENT_ARCHITECTURE.md](STATION_MANAGEMENT_ARCHITECTURE.md) — Implemented production station card, station type, machine/personnel/queue references and dashboard preparation architecture.
- [RECIPE_ARCHITECTURE.md](RECIPE_ARCHITECTURE.md) — Implemented production recipe bill-of-materials architecture with versioning, item types, formulas, yields, validation and theoretical consumption modeling.
- [INVENTORY_ARCHITECTURE.md](INVENTORY_ARCHITECTURE.md) — Implemented inventory object architecture with cards, categories, types, units, locations, lots, barcodes, reservation and validation models.
- [REWORK_ARCHITECTURE.md](REWORK_ARCHITECTURE.md) â€” Implemented rework and breakage architecture for production breakage, fire inventory ownership, and rework restart from Cutting.
- [PRODUCTION_QUEUE_ARCHITECTURE.md](PRODUCTION_QUEUE_ARCHITECTURE.md) — Implemented production queue and production work queue architecture, including the operator work basket.
- Sprint 2.3.20 review notes: architecture consistency, persistence-readiness guidance, and domain normalization were completed for the implemented engine domains.
- Sprint 2.3.21 transfer and recovery architecture notes: finalized decisions for transfers, counters, rework order behavior, cutting rework queue, production merge, fire depot, production history, and glass manufacturing rules were documented without runtime changes.
