# GlassOS REST API Architecture

> **Sprint:** 2.6.0  
> **Status:** ✅ Complete  
> **Theme:** REST API Foundation

## Overview

The GlassOS REST API exposes all 10 backend services through a clean, versioned HTTP API. Every endpoint follows a strict layering: **Controller → Service → Repository → Database**.

### Architecture Principles

1. **Controllers are thin** — they only receive HTTP requests, validate DTOs, call services, and return responses.
2. **Zero business logic in controllers** — no calculations, no production rules, no direct repository usage.
3. **All business rules live in services** — services in `@repo/db` contain the full domain logic.
4. **Every endpoint is documented** — OpenAPI 3.0 spec available at `/api/v1/docs`.

## Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| **Runtime**    | Node.js ≥18, ESM                              |
| **Framework**  | Hono 4.7.4                                    |
| **Server**     | `@hono/node-server` 1.13.8                    |
| **Validation** | Zod 3.24.1 + `@hono/zod-validator` 0.4.3      |
| **Auth**       | JWT Bearer token (stub middleware)            |
| **Docs**       | OpenAPI 3.0 + Swagger UI (`@hono/swagger-ui`) |
| **Testing**    | Vitest 3.0.8                                  |
| **Build**      | TypeScript 5.9.2, Turborepo 2.10.5            |

## Project Structure

```
apps/api/src/
├── index.ts                  # App entry: CORS, auth, error handler, server
├── router.ts                 # Route registration (mounts 14 controllers)
├── services.ts               # Service factory (initializes 10 services)
├── lib/
│   ├── auth.ts               # JWT auth middleware + getCurrentUser helper
│   ├── errors.ts             # 6 error classes (AppError → ...)
│   └── response.ts           # Response helpers: success, created, noContent, sendError
├── dto/
│   ├── common.dto.ts         # Shared Zod schemas (ulid, isoDate)
│   ├── customer.dto.ts       # Customer validation schemas
│   ├── order.dto.ts          # Order validation schemas
│   ├── production.dto.ts     # Production validation schemas
│   ├── queue.dto.ts          # Queue validation schemas
│   ├── transfer.dto.ts       # Transfer validation schemas
│   ├── quality.dto.ts        # Quality validation schemas
│   ├── dispatch.dto.ts       # Dispatch validation schemas
│   ├── rework.dto.ts         # Rework validation schemas
│   ├── cutting.dto.ts        # Cutting validation schemas
│   └── station.dto.ts        # Station validation schemas
├── controllers/
│   ├── customer.controller.ts   # 6 endpoints
│   ├── order.controller.ts      # 7 endpoints
│   ├── production.controller.ts # 8 endpoints
│   ├── queue.controller.ts      # 10 endpoints
│   ├── transfer.controller.ts   # 11 endpoints
│   ├── quality.controller.ts    # 10 endpoints
│   ├── dispatch.controller.ts   # 21 endpoints
│   ├── rework.controller.ts     # 7 endpoints
│   ├── cutting.controller.ts    # 11 endpoints
│   ├── station.controller.ts    # 16 endpoints
│   ├── personnel.controller.ts  # Stub (1 endpoint)
│   ├── machine.controller.ts    # Stub (1 endpoint)
│   ├── inventory.controller.ts  # Stub (1 endpoint)
│   └── recipe.controller.ts     # Stub (1 endpoint)
├── docs/
│   ├── index.ts              # Docs router (serves OpenAPI JSON + Swagger UI)
│   └── openapi.ts            # OpenAPI 3.0 specification
└── test/
    └── api.test.ts           # 5 smoke tests
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Customers (`/api/v1/customers`)

| Method | Path              | Description           |
| ------ | ----------------- | --------------------- |
| GET    | `/`               | List active customers |
| GET    | `/:id`            | Find by ID            |
| GET    | `/by-code/:code`  | Find by code          |
| POST   | `/`               | Create customer       |
| PATCH  | `/:id`            | Update customer       |
| POST   | `/:id/deactivate` | Deactivate customer   |

### Orders (`/api/v1/orders`)

| Method | Path           | Description          |
| ------ | -------------- | -------------------- |
| GET    | `/`            | List approved orders |
| GET    | `/:id`         | Find by ID           |
| POST   | `/`            | Create order         |
| PATCH  | `/:id`         | Update order         |
| POST   | `/:id/approve` | Approve order        |
| POST   | `/:id/cancel`  | Cancel order         |
| GET    | `/:id/lines`   | Get order lines      |

### Production (`/api/v1/production`)

| Method | Path                          | Description             |
| ------ | ----------------------------- | ----------------------- |
| GET    | `/`                           | Find pending cutting    |
| GET    | `/:id`                        | Find by ID              |
| GET    | `/by-order-line/:orderLineId` | Find by order line      |
| POST   | `/`                           | Create production order |
| POST   | `/:id/assign-station`         | Assign to station       |
| POST   | `/:id/transfer`               | Transfer production     |
| PATCH  | `/:id/status`                 | Update status           |
| GET    | `/:id/validate`               | Validate production     |

### Queues (`/api/v1/queues`)

| Method | Path                        | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | `/`                         | List active queues        |
| GET    | `/approved-orders`          | Load approved orders      |
| GET    | `/approved-lines`           | Load approved order lines |
| POST   | `/`                         | Create work queue         |
| POST   | `/select-material`          | Select material           |
| POST   | `/:id/start`                | Start queue               |
| POST   | `/:id/complete`             | Complete queue            |
| POST   | `/:id/basket`               | Add to basket             |
| DELETE | `/:id/basket/:productionId` | Remove from basket        |
| GET    | `/:id/statistics`           | Get queue statistics      |

### Transfers (`/api/v1/transfers`)

| Method | Path                           | Description                |
| ------ | ------------------------------ | -------------------------- |
| GET    | `/`                            | List transfers             |
| GET    | `/stats`                       | Get transfer statistics    |
| GET    | `/:id`                         | Find by ID                 |
| GET    | `/by-production/:productionId` | Get transfer history       |
| POST   | `/`                            | Initiate transfer          |
| POST   | `/return`                      | Return to previous station |
| POST   | `/manual`                      | Manual transfer            |
| POST   | `/assign-ready`                | Assign ready station       |
| POST   | `/:id/complete`                | Complete transfer          |
| POST   | `/:id/cancel`                  | Cancel transfer            |
| POST   | `/:id/reject`                  | Reject transfer            |

### Quality (`/api/v1/quality`)

| Method | Path                            | Description                   |
| ------ | ------------------------------- | ----------------------------- |
| GET    | `/inspections`                  | Get inspection history        |
| GET    | `/statistics`                   | Get quality statistics        |
| GET    | `/can-proceed/:productionId`    | Check if can proceed to ready |
| POST   | `/inspections`                  | Start inspection              |
| POST   | `/inspections/:id/complete`     | Complete inspection           |
| POST   | `/inspections/:id/reject`       | Reject inspection             |
| POST   | `/inspections/:id/approve`      | Approve inspection            |
| POST   | `/inspections/:id/measurements` | Record measurements           |
| POST   | `/inspections/:id/visual`       | Record visual inspection      |
| POST   | `/inspections/:id/notes`        | Record notes                  |

### Dispatch (`/api/v1/dispatch`)

| Method | Path                                | Description             |
| ------ | ----------------------------------- | ----------------------- |
| GET    | `/ready-productions`                | List ready productions  |
| GET    | `/ready-order-lines`                | List ready order lines  |
| GET    | `/basket`                           | Get basket              |
| GET    | `/basket/statistics`                | Get basket statistics   |
| GET    | `/deliveries`                       | Get delivery history    |
| GET    | `/deliveries/stats`                 | Get delivery statistics |
| GET    | `/deliveries/counters/:orderLineId` | Get delivery counters   |
| POST   | `/`                                 | Create dispatch         |
| POST   | `/basket`                           | Add to basket           |
| POST   | `/deliveries`                       | Create delivery         |
| POST   | `/deliveries/:id/assign-vehicle`    | Assign vehicle          |
| POST   | `/deliveries/:id/assign-driver`     | Assign driver           |
| POST   | `/deliveries/:id/assign-dispatcher` | Assign dispatcher       |
| POST   | `/deliveries/:id/load`              | Load vehicle            |
| POST   | `/deliveries/:id/unload`            | Unload vehicle          |
| POST   | `/deliveries/:id/ship`              | Start shipment          |
| POST   | `/deliveries/:id/deliver`           | Complete delivery       |
| POST   | `/deliveries/:id/partial-deliver`   | Partial delivery        |
| POST   | `/deliveries/:id/cancel`            | Cancel dispatch         |
| DELETE | `/basket/:productionId`             | Remove from basket      |

### Rework (`/api/v1/rework`)

| Method | Path                                | Description              |
| ------ | ----------------------------------- | ------------------------ |
| GET    | `/`                                 | List rework orders       |
| GET    | `/:id`                              | Find by ID               |
| GET    | `/by-production/:productionOrderId` | Get rework by production |
| POST   | `/`                                 | Create rework order      |
| POST   | `/:id/start`                        | Start rework             |
| POST   | `/:id/complete`                     | Complete rework          |
| POST   | `/:id/cancel`                       | Cancel rework            |
| PATCH  | `/:id`                              | Update rework order      |

### Cutting (`/api/v1/cutting`)

| Method | Path                   | Description             |
| ------ | ---------------------- | ----------------------- |
| GET    | `/`                    | List cutting executions |
| GET    | `/active`              | Get active cutting      |
| GET    | `/statistics`          | Get cutting statistics  |
| GET    | `/:id`                 | Find by ID              |
| GET    | `/by-queue/:queueId`   | Get cutting by queue    |
| POST   | `/:id/start`           | Start cutting           |
| POST   | `/:id/complete`        | Complete cutting        |
| POST   | `/:id/pause`           | Pause cutting           |
| POST   | `/:id/resume`          | Resume cutting          |
| POST   | `/:id/cancel`          | Cancel cutting          |
| POST   | `/:id/waste`           | Record waste            |
| POST   | `/:id/assign-operator` | Assign operator         |

### Stations (`/api/v1/stations`)

| Method | Path                             | Description              |
| ------ | -------------------------------- | ------------------------ |
| GET    | `/`                              | List stations            |
| GET    | `/active`                        | Get active productions   |
| GET    | `/statistics`                    | Get station statistics   |
| GET    | `/operation-history`             | Get operation history    |
| GET    | `/waiting-pool`                  | Get waiting pool         |
| GET    | `/waiting-pool/statistics`       | Get waiting pool stats   |
| GET    | `/:id/operation-status`          | Get operation status     |
| GET    | `/:id/by-operation/:operationId` | Get operation by ID      |
| POST   | `/waiting-pool/:productionId`    | Add to waiting pool      |
| POST   | `/:id/start`                     | Start operation          |
| POST   | `/:id/complete`                  | Complete operation       |
| POST   | `/:id/pause`                     | Pause operation          |
| POST   | `/:id/resume`                    | Resume operation         |
| POST   | `/:id/cancel`                    | Cancel operation         |
| POST   | `/:id/reject`                    | Reject operation         |
| POST   | `/:id/validate-low-e`            | Validate Low-E glass     |
| DELETE | `/waiting-pool/:productionId`    | Remove from waiting pool |

## Authentication

All endpoints require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The auth middleware (`src/lib/auth.ts`) extracts the token and attaches a `JwtPayload` to the context:

- `admin-token` → admin role
- Any other token → operator role

Use `getCurrentUser(c)` in controllers to access the authenticated user.

## Error Handling

All errors return a consistent JSON shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "fields": { "fieldName": ["error1", "error2"] }
  }
}
```

Error classes:

| Class               | HTTP Status | Code               |
| ------------------- | ----------- | ------------------ |
| `AppError`          | varies      | varies             |
| `ValidationError`   | 400         | `VALIDATION_ERROR` |
| `NotFoundError`     | 404         | `NOT_FOUND`        |
| `ConflictError`     | 409         | `CONFLICT`         |
| `UnauthorizedError` | 401         | `UNAUTHORIZED`     |
| `ForbiddenError`    | 403         | `FORBIDDEN`        |

## Response Format

Successful responses use:

```json
{ "success": true, "data": <payload> }
```

HTTP status codes: 200 (success), 201 (created), 204 (no content).

## Documentation

Interactive Swagger UI is available at:

- **`/api/v1/docs`** — Swagger UI
- **`/api/v1/docs/openapi.json`** — Raw OpenAPI 3.0 spec

## Health Check

`GET /health` returns:

```json
{ "status": "ok", "timestamp": "2025-01-15T10:30:00.000Z" }
```

## Running the API

```bash
# Development (hot reload)
cd apps/api && npm run dev

# Build
cd apps/api && npm run build

# Production
cd apps/api && npm start

# Type check
cd apps/api && npm run check-types

# Test
cd apps/api && npm test
```

The server starts on port `3001` by default (configurable via `PORT` env var).
