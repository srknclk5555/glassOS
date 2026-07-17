# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased] — Sprint 2.8.1 — Personnel Management Module

### Added

- **Personnel Management CRUD** — `personnel` table (ULID PK, tenant-scoped, RLS FORCE), Drizzle schema, server actions (`createPersonnelAction`, `updatePersonnelAction`, `togglePersonnelActiveAction`, `getPersonnelAction`, `getPersonnelByIdAction`)
- **Machine-Personnel Assignments** — `machinePersonnelAssignments` junction table, `assignMachineAction`, `removeMachineAssignmentAction`, bidirectional view (personnel detail + machine detail)
- **UI Page** — `/personnel` DataGrid with summary cards (Total/Active/Inactive/On Shift), search, role filter, status filter, sort
- **Detail Drawer** — Personel Detayı with Genel Bilgiler tab (name, role, phone, email, hire date, notes, system access) and Atamalar tab (assigned machines, Makine Ata dialog, Atamayı Kaldır)
- **Activate/Deactivate** — confirmation dialog toggle with status badge updates
- **Zod Validation** — `createPersonnelSchema` / `updatePersonnelSchema` types, `preparePersonnelInput()` empty string → null conversion for optional fields
- **i18n** — All personnel labels translated (TR/EN)

### Changed

- **Authorization** — `personnel:read`, `personnel:write` added to permission map
- **Server Action Pattern** — `preparePersonnelInput()` utility established as pattern for Zod optional field handling

### Fixed

- **Empty string validation** — Zod `z.string().length(26)` rejected empty titleId; converted to null before parse

## [Unreleased] — Sprint 2.8.1A — Personnel Titles Management Fix

### Added

- **Title Management CRUD** — 5 new server actions (`getAllPersonnelTitlesAction`, `createPersonnelTitleAction`, `updatePersonnelTitleAction`, `deactivatePersonnelTitleAction`, `activatePersonnelTitleAction`) with `requireSession()` + `ensurePermission()` + `withTenantSession()`
- **Title Management Dialog** (`personnel-title-dialog.tsx`) — full CRUD UI: inline add, inline edit, active/inactive toggle with confirmation dialog, empty state handling
- **Personnel Create/Edit Dialog** — `onAddTitle` callback prop with "+ Yeni Ünvan Ekle" option in title dropdown; empty state with dashed border box when no titles exist
- **"Ünvanları Yönet" button** — personel sayfası header'da, variant="outline" with User icon
- **Title display in DataGrid** — `fullName` column shows title name below person name
- **Title display in Detail Drawer** — `titleName` field in General Information tab
- **i18n** — 11 new keys (titles, manageTitles, addTitle, editTitle, titleName, titleActive, titleInactive, noTitlesDefined, confirmDeactivateTitle, confirmActivateTitle) — TR/EN

### Changed

- **`getPersonnelByIdAction`** — now uses explicit `.select()` with LEFT JOIN on `personnelTitles` to include `titleName`

### Fixed

- **Empty title dropdown** — when creating/editing personnel, title dropdown was empty because no UI existed to manage `personnel_titles` table data

## [Unreleased] — Sprint 2.8.0 — Machine Management Module

### Added

- **Machine Management CRUD** — `machines` table (ULID PK, tenant-scoped, RLS FORCE), Drizzle schema, server actions (`createMachineAction`, `updateMachineAction`, `deleteMachineAction`, `getMachinesAction`, `getMachineByIdAction`)
- **UI Page** — `/machines` DataGrid with summary cards (Total/Active/Maintenance/Idle), search, type filter, status filter, sort, pagination
- **Detail Drawer** — Makine Detayı with Genel Bilgiler, Satın Alma Bilgileri, Atanmış Operatörler (with Operatörü Çıkar), Audit sections
- **Machine-Personnel Integration** — bidirectional assignment display in machine detail drawer
- **Zod Validation** — `createMachineSchema` / `updateMachineSchema` types
- **i18n** — All machine labels translated (TR/EN)

### Changed

- **Authorization** — `machine:read`, `machine:write` added to permission map

## [Unreleased] — Sprint 2.7.0

### Added

- **UI Foundation (`@repo/ui`)** — comprehensive design system and component library for GlassOS, built with React 19, Radix UI primitives, TailwindCSS v4, and class-variance-authority.

- **Theme System** (`src/styles.css`):
  - CSS-first design tokens via Tailwind v4 `@theme` directives
  - Dark mode (default) and light mode (`.light` class) with CSS variable overrides
  - Full color system: surfaces, brand, text (primary/secondary/muted), status (success/warning/danger/info), queue states, station states, priority levels
  - Shadow system (xs→xl), scrollbar styling, focus-visible rings, color-scheme support

- **`cn()` utility** (`src/lib/cn.ts`): clsx + tailwind-merge class merging helper

- **Primitive UI Components** (`src/components/ui/`):
  - `Button` — 5 variants (primary/secondary/ghost/destructive/outline), 4 sizes (sm/md/lg/icon)
  - `Input`, `Textarea` — form controls with icon slot, error display, aria support
  - `Select` — Radix-based dropdown with animated trigger/content/item
  - `Checkbox`, `Switch` — Radix-based toggle controls with animated indicators
  - `Badge` — 7 variants (default/secondary/success/warning/danger/info/outline)
  - `Card` — Card + Header/Title/Description/Content/Footer composition
  - `Skeleton` — pulse-animated loading placeholder
  - `EmptyState`, `LoadingState` — feedback components with icon/spinner
  - `Avatar`, `Progress`, `StatusIndicator` — visual data components
  - `Breadcrumb` — navigation path with separator, current page indicator
  - `SearchBox` — search input with icon and onChange/onSearch callbacks

- **Overlay & Navigation Components** (`src/components/ui/`):
  - `Dialog` — Radix-based modal with animated overlay/content/header/footer
  - `Drawer` — mobile bottom panel via Radix Dialog with drag handle
  - `Sheet` — slide-in panel (4 sides: left/right/top/bottom)
  - `Tabs` — Radix-based tabbed navigation with animated content
  - `DropdownMenu` — Radix-based full suite (items, separator, label, checkbox/radio)
  - `Tooltip` — Radix-based with animated appearance
  - `Toast` — Radix-based notification system with 4 variants, close/action buttons
  - `CommandPalette` — Radix Dialog-based command search with groups/items

- **Domain Badges** (`src/components/ui/`):
  - `GlassStatusBadge` — idle/running/paused/maintenance/offline/setup
  - `PriorityBadge` — critical/high/normal/low
  - `ProductionStatusBadge` — pending/queued/running/paused/completed/cancelled/on-hold
  - `FactoryBadge` — factory name + location indicator

- **DataGrid** (`src/components/data-grid/`):
  - `DataGrid<T>` — generic enterprise table with sorting, sticky header, pagination, loading/empty states, row click/actions, responsive scroll

- **Layout System** (`src/components/layout/`):
  - `Sidebar` — collapsible (60px/240px) with navigation items, active state, footer, collapse toggle
  - `TopBar` — breadcrumbs, search, right-side children slot
  - `Shell` — full app shell: desktop sidebar, mobile drawer (Sheet), topbar, scrollable content
  - `Notifications` — bell icon with unread count badge, dropdown list, mark-as-read
  - `Profile` — avatar + name dropdown with profile/settings/logout
  - `FactorySwitcher` — dropdown with factory list, active indicator, location
  - `ThemeSwitcher` — sun/moon toggle for dark/light mode

- **Providers** (`src/components/providers/`):
  - `ThemeProvider` + `useTheme()` — manages dark/light state, persists to localStorage, prevents flash

- **Barrel export** — `src/index.ts` exports all ~40+ components, types, and utilities

- **Documentation** — `UI_ARCHITECTURE.md` covering design principles, component hierarchy, layout hierarchy, theme tokens, folder structure, naming conventions, tech stack, accessibility, DataGrid architecture, future page strategy

### Dependencies

- `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-popover`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot` (12 Radix packages)
- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- `tailwindcss` v4 with `@tailwindcss/postcss`

### Architecture

- **Interface-first layout**: Shell provides responsive layout (sidebar + topbar + content), mobile uses Sheet-based drawer
- **Dark-first**: All tokens default to dark theme, light mode via `.light` class override
- **CSS variable theming**: Tailwind v4 `@theme` directives for runtime theme switching
- **Accessibility by default**: All components built on Radix UI primitives (WAI-ARIA compliant)
- **Zero backend coupling**: Components consume props only — no API calls, no state management tied to backend
- **TypeScript strict**: All components typed with full generics support (DataGrid, Column definitions)

## [Unreleased] — Sprint 2.6.6

### Added

- **Background Job Infrastructure** — production-ready foundation for asynchronous job processing. In-memory only, no business jobs yet.
- **`Job` interface** + **`BaseJob` class**: `id`, `name`, `payload`, `createdAt`, `priority`, `retryCount`, `maxRetries`, `status`, `scheduledAt`, `execute()` — in `src/background/job.ts`.
- **4 Priority Levels**: `critical` > `high` > `normal` (default) > `low` — FIFO within same priority.
- **`IJobQueue` interface** + **`InMemoryJobQueue`**: priority-ordered queue with scheduled/delayed execution support — in `src/background/job-queue.ts`.
- **`IJobRegistry` interface** + **`InMemoryJobRegistry`**: type-safe handler registration by job name — in `src/background/job-registry.ts`.
- **`IJobRunner` interface** + **`LocalJobRunner`**: single-process polling runner with retry + exponential backoff (1s→30s capped) — in `src/background/job-runner.ts`.
- **`IBackgroundService` interface** + **`BackgroundService`**: orchestrator combining queue + registry + runner. Supports dependency injection via `BackgroundServiceOptions` — in `src/background/background-service.ts`.
- **Barrel export** — `src/background/index.ts` exports all public types and implementations.
- **`BACKGROUND_ARCHITECTURE.md`** — comprehensive architecture documentation: job lifecycle, execution flow, priority system, retry policy, DI, scheduling, event integration readiness, future distributed processing.
- **51 yeni test** — `test/background.test.ts` — job lifecycle, priority ordering, retry/backoff, cancel, runner, registry, DI, BackgroundService integration.

### Architecture

- **Interface-first design**: Services depend only on `IJobQueue`, `IJobRegistry`, `IJobRunner` — not concrete implementations.
- **Future compatibility**: BullMQ, RabbitMQ, AWS SQS, Azure Queue, Temporal can be swapped in without changing service code.
- **Event integration ready**: BackgroundService is architected to receive domain events — no business events wired yet.
- **No schema changes**: Zero database tables, zero migrations.

## [Unreleased] — Sprint 2.6.5A

### Added

- **Production Composition Root Wiring** — `apps/api/src/services.ts` artık `LocalEventPublisher` singleton oluşturup tüm 10 servise doğru sırada enjekte ediyor.
- **3 Customer Event** — `CustomerCreatedEvent`, `CustomerUpdatedEvent`, `CustomerDeactivatedEvent` — `src/services/events.ts`.
- **CustomerService Event Publishing** — `create()`, `update()`, `deactivate()` metotları artık `{ ..., events }` döndürüp EventPublisher üzerinden yayınlıyor.
- **7 composition root tests** — `test/composition-root.test.ts` — singleton doğrulama, event publishing doğrulama, FakeDb ile Drizzle query builder pattern testi.
- **InMemoryEventPublisher ve LocalEventPublisher** artık `@repo/db` package'ından dışa aktarılıyor (`src/services/index.ts`).

### Changed

- **CustomerService** — constructor'a `EventPublisher` parametresi eklendi, 3 mutation metot event publishing pattern'ine dönüştürüldü.
- **apps/api/src/services.ts** — 7 servis constructor'ına EventPublisher parametresi eklendi (CustomerService, OrderService, ProductionService, ProductionQueueService, ReworkService, CuttingExecutionService, ProductionTransferService, StationOperationService, QualityControlService, DispatchService).
- **test/service.test.ts** — tüm CustomerService.create/update/deactivate çağrıları `{ customer }` destructuring ile güncellendi.
- **Toplam 267 test** geçiyor (8 test dosyası, 0 TSC hatası).

### Fixed

- **Production wiring hatası**: Composition root `db as never`'i EventPublisher pozisyonunda geçiyordu — düzeltildi. Tüm 10 servis artık doğru EventPublisher instance'ını alıyor.
- **Singleton ihlali**: Her servis farklı bir `db as never` alıyordu (gerçek bir publisher değil) — düzeltildi. Artık tüm servisler aynı EventPublisher instance'ını kullanıyor.

## [Unreleased] — Sprint 2.6.5

### Added

- **Event Publisher Infrastructure** — production-grade event publishing across all 9 services.
- **`EventPublisher` interface**: `publish(event)` + `publishMany(events)` — defined in `src/services/events.ts`.
- **`LocalEventPublisher`**: production implementation with `onPublish(handler)` registration — in `src/events/local-event-publisher.ts`.
- **`InMemoryEventPublisher`**: test implementation with `events[]`, `publishCount`, `eventCount`, `ofType<T>()`, `any()`, `reset()`, `last`, `first` — in `src/events/in-memory-event-publisher.ts`.
- **27 new tests** in `test/event-publisher.test.ts` covering single publish, batch publish, handler registration, error propagation, type filtering, reset, and transaction safety patterns.
- **Transaction-safe event publishing**: all 9 services now publish events ONLY after successful `withTenantSession()` commit.
- **Constructor injection**: all 9 services accept `EventPublisher` before `db: any` parameter.

### Changed

- **All 9 services** (Order, Production, ProductionQueue, Rework, CuttingExecution, ProductionTransfer, StationOperation, QualityControl, Dispatch) — event publisher injected in constructors, all event-returning methods follow `const _txResult = await withTenantSession()` → `publishMany(_txResult.events)` → `return _txResult` pattern.
- **`test/service.test.ts`**: `InMemoryEventPublisher` injected into all 9 service constructors.
- **`SERVICE_ARCHITECTURE.md`**: Event publishing architecture section added with two-phase pattern, publisher table, and injection guide.
- **Total 260 tests** passing (7 test files, 0 TSC errors).

### Security

- **Transaction-safe event publishing**: core invariant enforced — events NEVER publish before transaction commit. If a transaction rolls back, no event is published.

## [Unreleased] — Sprint 2.6.4A

### Added

- **FORCE ROW LEVEL SECURITY** on all 52 tenant-scoped tables — table owner bypass risk eliminated.
- **Explicit WITH CHECK** on all 52 RLS policies — INSERT/UPDATE tenant isolation enforced.
- **Tenant context validation**: `withTenantSession()` throws explicit error when tenant context is missing but a DB client is available.

### Fixed

- **11 unwrapped service methods** now properly wrapped in `withTenantSession()`:
  - `rework.service.ts`: `findById`, `findOpenReworks`, `findByParentOrder`, `getMergePreparation`
  - `station-operation.service.ts`: `validateOperation`, `addToWaitingPool`, `loadWaitingProduction`
  - `dispatch.service.ts`: `getReadyProductions`, `getReadyOrderLines`, `getOrderLineDeliveryCounters`
  - `cutting-execution.service.ts`: `addItemToBasket`, `loadWorkQueue`

### Changed

- **`0003_enable_rls.sql`**: Regenerated — 52 FORCE RLS + 52 WITH CHECK statements added.
- **`SECURITY.md`**: Section 8.2 updated with FORCE RLS and WITH CHECK standards; threat model updated for Sprint 2.6.4A.
- **`PLAN.md`**: Sprint 2.6.4A section added with full detail.
- **`transactions.ts`**: Added tenant context validation in `withTenantSession()`.

### Security

- **Production-grade RLS hardening**: table owner bypass (FORCE RLS), INSERT/UPDATE enforcement (WITH CHECK), full service coverage audit, explicit tenant context validation.
- **Fail-fast on missing tenant context**: prevents silent fallback to unqualified queries.

## [Unreleased] — Sprint 2.5.5

### Added

- **DispatchService** — dispatch and delivery engine for READY productions.
- **READY Pool**: getReadyProductions, getReadyOrderLines with filtering by customer, product type, area, order, order line.
- **Dispatch Basket**: addToBasket, removeFromBasket, getBasket, getBasketStatistics — duplicate prevention, READY state validation.
- **Delivery Lifecycle**: createDelivery → loadVehicle → unloadVehicle → startShipment → completeDelivery | completePartialDelivery, with proper status transitions (created → loading → ready_to_ship → in_transit → delivered | partially_delivered | cancelled).
- **Vehicle Assignment**: assignVehicle, assignDriver, assignDispatcher — assignment validation against delivery status.
- **Cancellation**: cancelDispatch — rejects delivery on already-delivered or already-cancelled deliveries.
- **Delivery Counters**: getOrderLineDeliveryCounters — requested, ready, loaded, delivered, remaining per order line.
- **Delivery History**: getDeliveryHistory — immutable records, optionally filterable by production order.
- **Delivery Statistics**: getDeliveryStatistics — total deliveries, by-status breakdown, loaded/delivered/partial/cancelled counts.
- **Immutable history pattern**: all records returned as copied objects via `.map(t => ({...t}))`.
- **8 new domain events**: DispatchCreatedEvent, VehicleAssignedEvent, LoadingStartedEvent, LoadingCompletedEvent, ShipmentStartedEvent, DeliveryCompletedEvent, PartialDeliveryCompletedEvent, DispatchCancelledEvent.
- **Single transaction**: Delivery → Basket → Counters → History → Events (all mutating operations wrapped in `withTransaction()`).
- **Architecture freeze maintained**: zero schema, migration, or repository changes.
- **Total 211 tests** passing (5 test files, 0 errors).

### Changed

- **events.ts**: expanded from 34 to 42 domain event interfaces.
- **services/index.ts**: exports `DispatchService`, 8 new event types, and dispatch-related type exports.
- **test/service.test.ts**: `createServices()` returns `dispatchService`; helper `createBaseReadyProduction()` added.
- **SERVICE_ARCHITECTURE.md**: updated with DispatchService, 8 new events, delivery rules (section 4.11), architecture inventory (10 services, 42 events).
- **PRODUCTION_ARCHITECTURE.md**: Dispatch & Delivery domain context enriched.
- **PLAN.md**: Sprint 2.5.5 section added.
- **CHANGELOG.md**: this entry.
- **README.md**: sprint status updated.
- **walkthrough.md**: Sprint 2.5.5 entry added.

## [Unreleased] — Sprint 2.5.4

### Added

- **QualityControlService** — production quality control engine with full inspection lifecycle.
- **Inspection lifecycle**: startInspection, completeInspection (pass/fail/conditional_pass/rework_required/scrap), rejectInspection, approveInspection.
- **6 inspection types**: visual, dimension, edge, temper, insulating_glass, final (future compatible: customer_inspection).
- **5 inspection results**: pass, fail, conditional_pass, rework_required, scrap.
- **Dimensional measurements**: width, height, diagonal, thickness, area, tolerance — manual entry only, no machine integration.
- **Visual inspection**: appearance, scratches, chips, cleanliness, coating, inspectionNotes.
- **Temper inspection support**: visualBreakage, edgeQuality, surfaceQuality, rollerMarks, stressObservation, notes.
- **Insulating Glass inspection support**: spacer, sealQuality, lowEOrientation, gasInformation, visualContamination, alignment.
- **READY validation**: production proceeds to READY only if PASS or approved conditional pass.
- **Rework integration**: rework_required result creates rework order via rework repository (no duplicates).
- **Scrap handling**: scrap result marks production as scrapped via repository update.
- **6 new domain events**: InspectionStartedEvent, InspectionPassedEvent, InspectionFailedEvent, InspectionRejectedEvent, ReworkRequestedEvent, ReadyApprovedEvent.
- **Single transaction**: Inspection → Validation → History → Counters → Rework → Events.
- **31 new tests** for Sprint 2.5.4 covering inspection lifecycle (5), measurements (2), temper inspection (2), IG inspection (2), READY validation (4), conditional pass approval (3), rework creation (2), scrap handling (1), notes (2), history (2), statistics (3), edge cases (3).
- **Total 183 tests** passing (5 test files, 0 errors).
- Architecture freeze maintained: zero schema, migration, or repository changes.

### Changed

- **events.ts**: expanded from 28 to 34 domain event interfaces.
- **services/index.ts**: exports `QualityControlService`, 6 new event types, and quality-related type exports.
- **test/service.test.ts**: `createServices()` returns `qualityControlService`; helper `createBaseProduction()` added.
- **SERVICE_ARCHITECTURE.md**: updated with QualityControlService, 6 new events, quality control rules (section 4.10), architecture inventory.
- **PRODUCTION_ARCHITECTURE.md**: Quality Control domain added.
- **PLAN.md**: Sprint 2.5.4 section added.
- **CHANGELOG.md**: this entry.
- **README.md**: sprint status updated.
- **walkthrough.md**: Sprint 2.5.4 entry added.

## [Unreleased] — Sprint 2.5.3

### Added

- **StationOperationService** — station-specific production rules engine for Grinding, Temper, Insulating Glass, and Low-E validation.
- **Station validation**: Grinding (warns if not from CUTTING/REWORK_CUTTING — flexible routing), Temper (REQUIRES grinding completed — hard error; blocks non-temperable Low-E), Insulating Glass (blocks completed orders), Hole/Vent/CNC (flexible — no strict blocking).
- **Furnace capacity calculation**: normal glass = actual area, tempered IG = 2 × actual area (pure function).
- **20 public methods**: startOperation, completeOperation, cancelOperation, rejectOperation, validateOperation, validateLowE, calculateFurnaceCapacity, addToWaitingPool, removeFromWaitingPool, getWaitingPool, getWaitingPoolStatistics, loadWaitingProduction, getOperationHistory, getStationOperationHistory, getStationStatistics, getAllStationStatistics.
- **In-memory waiting pools**: add/remove/get/statistics per station with loadWaitingProduction().
- **In-memory operation history**: immutable records returned as copies.
- **Station statistics**: total/active/completed/cancelled/rejected counts plus waiting count per station.
- **8 new domain events**: GrindingStartedEvent, GrindingCompletedEvent, TemperStartedEvent, TemperCompletedEvent, InsulatingGlassStartedEvent, InsulatingGlassCompletedEvent, FurnaceCapacityCalculatedEvent, LowEValidationFailedEvent.
- **Validation rules**:
  - Cannot start an operation on non-existent/completed/cancelled production
  - Temper requires grinding completed in history (hard error)
  - Non-temperable Low-E blocked from Temper (emits LowEValidationFailedEvent)
  - Rejection requires non-empty reason
- **33 new tests** for Sprint 2.5.3 covering all station lifecycles, validation, furnace capacity, Low-E, waiting pools, operation history, and station statistics.
- **Total 152 tests** passing (5 test files, 0 errors).
- Architecture freeze maintained: zero schema, migration, or repository changes.

### Changed

- **events.ts**: expanded from 20 to 28 domain event interfaces.
- **services/index.ts**: exports `StationOperationService`, 8 new event types, and station-related type exports.
- **test/service.test.ts**: `createServices()` returns `stationOperationService`; station-aware helper `createProductionAtCutting()` added.
- **SERVICE_ARCHITECTURE.md**: updated with StationOperationService, 8 new events, station operation rules (section 4.9), architecture inventory.
- **PRODUCTION_ARCHITECTURE.md**: Station Operation domain added; production flow updated with Grinding→Temper→IG detail.
- **STATION_MANAGEMENT_ARCHITECTURE.md**: Sprint 2.5.3 section added with full station rules documentation.
- **PLAN.md**: Sprint 2.5.3 section added.
- **CHANGELOG.md**: this entry.
- **README.md**: sprint status updated.
- **walkthrough.md**: Sprint 2.5.3 entry added.

## [Unreleased] — Sprint 2.5.2

### Added

- **ProductionTransferService** — station-to-station production transfer engine with complete lifecycle management.
- **6 transfer types**: automatic, manual, rework_merge, correction, return_to_previous, emergency.
- **Transfer lifecycle**: initiated → completed | cancelled | rejected with full state validation.
- **11 service methods**: initiateTransfer, completeTransfer, cancelTransfer, rejectTransfer, returnToPreviousStation, manualTransfer, assignReadyStation, getTransferHistory, getAllTransfers, getTransferStats, findTransferById.
- **Immutable transfer history**: TransferRecord[] stored in-memory (architecture freeze), all query methods return copies.
- **Station routing**: configurable via StationRoute interface (not hard-coded).
- **Transfer statistics**: counts by type and status via getTransferStats().
- **ReworkService.mergeRework()** — complete rework merge workflow with 8 validation rules.
- **Merge counter semantics**: completedQuantity increases, brokenQuantity immutable, missing implicitly decreases.
- **6 new domain event types**: TransferInitiatedEvent, TransferCompletedEvent, TransferCancelledEvent, TransferRejectedEvent, ReworkMergedEvent, ReadyStationAssignedEvent.
- **Validation rules**:
  - Cannot initiate transfer for non-existent/completed/cancelled production
  - Cannot complete/cancel/reject non-existent transfer
  - Cannot complete already completed/cancelled/rejected transfer
  - Cannot cancel already completed transfer
  - Cannot reject already completed/cancelled transfer
  - Cannot merge non-existent rework
  - Cannot merge when parent production/order line not found
  - Cannot merge fully completed line (missing = 0)
  - Cannot duplicate merge (rework already completed)
  - Cannot merge cancelled parent production
  - Cannot merge when unresolved active rework exists
- **35 new tests** for Sprint 2.5.2 covering initiation (4), lifecycle (3), validation (7), history/statistics (6), merge success (3), merge validation (7), counter invariants (2), and statistics after lifecycle (3).
- **Total 119 tests** passing (5 test files, 0 errors).
- Architecture freeze maintained: zero schema, migration, or repository changes.

### Changed

- **ReworkService** enhanced: `mergeRework()` method added with full validation, counter updates, rework production order closure, and ReworkMergedEvent emission.
- **events.ts**: expanded from 14 to 20 domain event interfaces.
- **services/index.ts**: exports `ProductionTransferService`, all 6 new event types, and `TransferType`/`TransferStatus`/`TransferRecord`/`TransferStats` type exports.
- **test/service.test.ts**: `createServices()` returns `productionTransferService` and `reworkRepository` instances; all type casting simplified from `(svc as any).productionTransferService` to `svc.productionTransferService`.
- **SERVICE_ARCHITECTURE.md**: updated with ProductionTransferService, 6 new events, transfer lifecycle rules, and merge workflow rules.
- **REWORK_ARCHITECTURE.md**: updated with Merge Workflow section (section 11).
- **PRODUCTION_ARCHITECTURE.md**: Transfer domain added to domain list.
- **PLAN.md**: Sprint 2.5.2 section added.
- **CHANGELOG.md**: this entry.
- **README.md**: sprint status updated.
- **walkthrough.md**: Sprint 2.5.2 entry added.

## [Unreleased] — Sprint 2.5.1

### Added

- **CuttingExecutionService** — complete cutting session lifecycle management.
- **5 cutting session states**: CREATED → READY → CUTTING → PAUSED → COMPLETED → CANCELLED with full state transition validation.
- **Work Basket**: add/remove production orders to session basket with material validation and duplicate prevention.
- **Breakage Registration**: complete breakage workflow within a single transaction — breakage event creation, order line counter updates, production status update, automatic rework creation with Fire Depot ownership.
- **Order Line Counters**: requested, completed, brokenHistory, missing, delivered, and progress tracking.
- **Merge Preparation**: metadata service for future rework merge operations (parent order/line/customer references, target station, production order).
- **8 new domain event types**: CuttingSessionCreatedEvent, CuttingStartedEvent, CuttingCompletedEvent, CuttingPausedEvent, CuttingResumedEvent, CuttingCancelledEvent, BreakageRegisteredEvent, FireDepotAssignedEvent.
- **Validation rules**:
  - Cannot start cutting session without items in basket
  - Cannot add items after cutting starts
  - Material mismatch detection (wrong material, different material in basket)
  - Cannot register breakage greater than completed quantity
  - Cannot create duplicate active rework for same production order
  - Cannot break completed rework order
  - Cannot complete session with broken production orders
- **27 new tests** for Sprint 2.5.1 covering session lifecycle (10), work basket (7), breakage registration (5), counters (2), merge preparation (2), and end-to-end vertical slice (1).
- **Total 84 tests** passing (5 test files, 0 errors).
- Architecture freeze maintained: zero schema, migration, or repository changes.

### Changed

- **ReworkService** enhanced: `createBreakageRework()` method with full parent references (parentOrder, parentOrderLine, originalCustomer, breakageEvent), Fire Depot ownership, rework production order creation, and `getMergePreparation()` method.
- **ReworkService** constructor updated: now accepts `OrderLineRepository`, `OrderRepository` in addition to existing dependencies.
- **events.ts**: expanded from 6 to 14 domain event interfaces.
- **services/index.ts**: exports `CuttingExecutionService` and all new event types.
- **test/service.test.ts**: `createServices()` updated with new constructor signatures and `cuttingExecutionService` instance.

## [Unreleased] — Sprint 2.5.0

### Added

- Core Production Service Layer implemented under `packages/db/src/services/` — the first executable business workflow of GlassOS.
- **5 service classes**: CustomerService, OrderService, ProductionService, ProductionQueueService, ReworkService.
- **6 domain event types**: OrderApprovedEvent, QueueCreatedEvent, QueueStartedEvent, QueueCompletedEvent, ProductionTransferredEvent, ReworkCreatedEvent.
- **OrderService.approveOrder()**: complete order approval lifecycle — validates customer, checks lines, creates ProductionOrders, emits OrderApprovedEvent.
- **ProductionService**: full status transition validation (pending→in_progress→completed|broken|rework), station assignment, transfer with ProductionTransferredEvent.
- **ProductionQueueService**: material-specific cutting work queue — basket management, duplicate prevention, status transitions (start/complete), statistics.
- **ReworkService**: foundation rework order creation with parent validation.
- **Vertical Slice #1** (Customer → Order → Approval → Cutting Queue) fully tested end-to-end.
- **34 service tests** in `packages/db/test/service.test.ts` covering all 5 services + vertical slice integration.
- Architecture freeze strictly maintained: zero schema, migration, or repository changes.

## [Unreleased] — Sprint 2.4.6

### Added

- Core Production repository layer created for CustomerRepository, OrderRepository, OrderLineRepository, ProductionRepository, ProductionQueueRepository, and ReworkRepository under `packages/db/src/repositories`.
- CustomerRepository with findByCode, findByName, findByPhone, findByEmail, findActiveCustomers, count, exists methods.
- OrderRepository with findPendingApproval, findApproved, findWaitingProduction, findReadyForDispatch, findByCustomer, findByOrderNumber, findByDateRange, count, exists methods.
- OrderLineRepository with findByOrder, findIncompleteLines, findBrokenLines, findWaitingRework, countByOrder, count, exists methods.
- ProductionRepository with findActiveProduction, findWaitingStation, findCompletedProduction, findBrokenProduction, findByStation, findByMachine, findByOrderLine, findReworkItems, findByBarcode, count, exists methods.
- ProductionQueueRepository with findActiveQueues, findQueueByStation, findQueueByOperation, findStationOperationQueue, count, exists methods.
- ReworkRepository with findOpenReworks, findByParentOrder, findWaitingCutting, findCompletedReworks, findByBreakageEvent, findFireDepotItems, findScrapItems, count, exists methods.
- Comprehensive production repository tests in `packages/db/test/production-repository.test.ts` covering CRUD, domain-specific queries, pagination, soft delete, tenant/factory isolation, and filtering.
- All repositories exported through `packages/db/src/repositories/index.ts` organized by domain (Identity & Organization, Core Production).

### Changed

- `packages/db/src/repositories/index.ts` now exports both Identity and Core Production repositories.

## [Unreleased] — Sprint 2.4.5

### Added

- Repository layer for Identity & Organization aggregates created under `packages/db/src/repositories`.
- Base repository class (`base.repository.ts`) providing standardized CRUD, multi-tenant filtering, soft delete, pagination, sorting, and search abstractions.
- Repositories implemented for: `TenantRepository`, `FactoryRepository`, `UserRepository`, `RoleRepository`, `PermissionRepository`, `PersonnelRepository`.
- Repository exports added through `packages/db/src/repositories/index.ts` and re-exported from `packages/db/src/index.ts`.
- Comprehensive repository layer tests in `packages/db/test/repository.test.ts` covering create, update, find, soft delete, restore, pagination, filtering, and tenant/factory isolation.

### Changed

- `packages/db/src/index.ts` now exposes the repository surface alongside schema, seed, and infrastructure exports.

## [Unreleased] — Sprint 2.4.4

### Added

- Shared database infrastructure introduced under `packages/db/src/db` for client creation, transaction helpers, query-state helpers, database context, relation definitions, and database error mapping.
- Infrastructure exports were added through `packages/db/src/db/index.ts` and re-exported from `packages/db/src/index.ts` for future repository consumption.
- Automated infrastructure tests added in `packages/db/test/infrastructure.test.ts` covering client creation, relation exposure, transaction helper behavior, context creation, query state behavior, and error mapping.

### Changed

- `packages/db/src/index.ts` now exposes the shared infrastructure surface alongside the schema and seed exports.

## [Unreleased] — Sprint 2.4.0

### Added

- `DATABASE_STANDARDS.md` created — the official database development standards for GlassOS.
- Table Naming Rules: snake_case, plural, prefix-free, junction table standards defined.
- Column Naming Rules: fixed conventions for standard fields (id, tenant_id, factory_id, status, audit, dimensions, money).
- Primary Key Standard: ULID (CHAR(26)) selection fully documented with generation policies.
- Foreign Key Standards: singular referenced table + _id naming, strict constraint naming, and ON DELETE/UPDATE rules (CASCADE forbidden, RESTRICT enforced).
- Index Standards: structured prefix naming for standard (idx_), unique (uq_), and partial (idx_{table}_active) indexes.
- Constraint Naming Standards: pk_, fk_, uq_, chk_ prefixes.
- Timestamp Policy: TIMESTAMPTZ UTC-only storage, timezone-aware client-side representation.
- Decimal & Numeric Precision: specific rules for Length/Width/Thickness (NUMERIC(10,2) or (6,2)), Area/Volume (NUMERIC(14,6)), Money (NUMERIC(15,4)), and Ratios (NUMERIC(7,4)).
- Enum Policy: native PostgreSQL ENUMs forbidden; TEXT columns with application-layer TypeScript unions/constants or lookup tables enforced.
- JSONB Policy: metadata, configuration settings, and immutable snapshots only; forbidden for relational/queryable data.
- Soft Delete & Hard Delete policies, Audit columns, and Migration numbering/naming rules ({NNNN}_{snake_case_description}.sql) standardized.

## [2026-07-16] — Sprint 2.3.22

### Added

- `DATABASE_BLUEPRINT.md` created — the official relational database planning document for GlassOS.
- 17 aggregates fully mapped with child entities, owned objects, and reference objects.
- 68 planned tables across all domains (Tenant, Factory, Identity, Customer, Personnel, Machine, Station, Material, Product, Recipe, Inventory, Order, Production, Production Queue, Rework, Factory Configuration, Audit Log).
- ULID selected as the official primary key strategy with full rationale documented.
- Soft delete and hard delete table policies defined.
- Audit policy with mandatory audit tables specified.
- Index strategy planned for all domains (no SQL).
- 17 repository ownership boundaries defined.
- 8 transaction boundaries documented at use-case level.
- 9 persistence readiness risks identified and resolved.
- Common Table Standards (mandatory and conditional columns) formally defined.
- Naming conventions for tables, columns, indexes, FK, repositories, services, and APIs standardized.

## [Unreleased] - 2026-07-15

### Added

- Production Architecture (Architecture Freeze - Baseline)
- Production Calculation Engine (Architecture Baseline)
- Inventory Valuation Engine (Architecture Baseline)
- Deployment Architecture (Architecture Baseline)
- PostgreSQL Runtime Role Separation (Architecture Baseline)
- Factory Configuration JSON model versioned and restructured for long-term engine extensibility.
- ProductionCalculationService added for Production Dimension, area, grinding allowance, and consumption area calculations based on Factory Configuration.
- Sheet domain foundation for cutting workflow: `GlassSheet`, `CuttingResult`, `RemnantCandidate`, `ScrapCandidate`, `CuttingStatistics`, and `EngineMetadata` added to the engine package.
- Cutting session domain foundation added for real production flow modeling: `CuttingSession`, `OrderReference`, `SheetUsage`, and supporting session status types.
- Remnant decision engine added via `RemnantDecisionService`, using Factory Configuration remnant thresholds to classify pieces as reusable remnant or scrap.
- Scrap decision engine added via `ScrapDecisionService`, using remnant evaluation output and Factory Configuration rules to explain whether a piece should be scrapped or kept as a valid remnant.
- Cutting result engine added via `CuttingResultEngine`, wiring the production, remnant, and scrap services together to produce a `CuttingResult` from a sheet, order dimensions, and factory configuration.
- Batch cutting engine added via `BatchCuttingEngine`, composing multiple single-order cutting results into a single batch session summary with aggregated totals.
- Basic unit tests for the new cutting-domain models, remnant decision rules, scrap decision rules, cutting-result engine scenarios, and batch cutting engine scenarios added.
- Sprint 2.3.10 Cutting Execution Engine implemented with `ExecutionBatch`, `ExecutionOrder`, `ExecutionStatistics`, `ExecutionStatus`, and `CuttingExecutionEngine` for batch lifecycle, order handling, used-sheet tracking, and execution summary generation.
- Sprint 2.3.11 Production Queue Engine implemented with `ProductionOperation`, `ProductionOperationStatus`, `ProductionQueue`, `ProductionQueueItem`, `ProductionProgress`, and `ProductionQueueEngine` for operation-based workflow routing, queue waiting lists, progression calculation, and automatic order-line completion state.
- Sprint 2.3.11A Production Flow Architecture consolidation: `PRODUCTION_FLOW_ARCHITECTURE.md` created, production routing rules synchronized, and related architecture docs cross-referenced.
- Sprint 2.3.12 Personnel Management implemented with production-focused personnel domain models, station permissions, machine assignment, shift model, health data, emergency contacts, and future-compatibility relationships.
- Sprint 2.3.13 Machine Management implemented with production machine card, machine type/status/capacity models, operator assignment, maintenance records, timeline events, spare parts, consumables, suppliers, service companies, and machine documents.
- Sprint 2.3.14 Station Management implemented with production station card, configurable station types, machine/personnel/queue references, station capacity metadata, and dashboard preparation models.
- Sprint 2.3.15 Recipe Domain (Bill of Materials) implemented with recipe versioning, recipe item types, BOM-like recipe items, formula placeholders, yield definitions, and recipe validation models for theoretical material consumption only.
- Sprint 2.3.16 Inventory Domain implemented with inventory cards, categories, inventory types, units, locations, lots, barcode preparation, reservation preparation, metadata, and validation models for inventory object definition only.
- Sprint 2.3.17 Inventory Consumption Engine implemented with consumption records, lines, sources, relationships, and validation models for recording production consumption events without valuation or stock deduction.
- Sprint 2.3.18 Rework & Breakage Management implemented with breakage event recording, ownership transfer to factory fire inventory, fire inventory items, rework request generation, operator/station/machine/shift traceability, and validation models for production breakage handling only.
- Sprint 2.3.19 Production Work Queue Engine implemented with operator work-basket models, material filtering, barcode-driven item addition, duplicate prevention, status transitions, statistics, and validation models for operator workspace management only.
- Sprint 2.3.20 Domain Review & Persistence Readiness completed. Engine domains were reviewed for naming consistency, status enum alignment, relationship clarity, aggregate ownership, future repository/API readiness, and documentation consistency without introducing new business features or persistence implementation.
- Sprint 2.3.21 Production Transfer & Recovery Architecture documented as a documentation-only architecture freeze. Transfer philosophy, order-line counters, rework-as-internal-order rules, cutting rework queue, production merge, fire depot handling, unified production history, and glass manufacturing rules were recorded as finalized decisions without runtime or persistence implementation.
- Architecture Freeze ADR kararı eklendi.
- Document sync: `PRODUCTION_FLOW_ARCHITECTURE.md`, `PRODUCTION_ARCHITECTURE.md`, `PRODUCTION_QUEUE_ARCHITECTURE.md`, `PRODUCT_ARCHITECTURE.md`, `PERSONNEL_ARCHITECTURE.md`, `MACHINE_MANAGEMENT_ARCHITECTURE.md`, `REWORK_ARCHITECTURE.md`, `PRODUCTION_CALCULATION_ENGINE.md`, `PLAN.md`, `README.md`, `walkthrough.md`, and `CHANGELOG.md` updated.

### Changed

- RLS Hardening (Runtime Role Separation `glassos_app` uygulamaya alındı).
- Migration Recovery süreçleri doğrulandı.

## [2026-07-14]

### Added

- `customers`, `customer_contacts`, `delivery_points` tables (Drizzle ORM) — `packages/db/src/schema.ts`.
- Zod validation schemas for customer management — `packages/types/src/index.ts`.
- Server Actions for customer management (create/update/disable contacts/delivery points) — `apps/web/src/app/actions/identity.ts`.

### Changed

- `audit_logs` schema extended to include `customerId` and audit entries now associate customer operations to `customerId` — `packages/db/src/schema.ts` and `apps/web/src/app/actions/identity.ts`.
- RLS migration extended to enable policies for `customers`, `customer_contacts`, `delivery_points` — `packages/db/migrations/0001_add_rls.sql`.

### Fixed

- N/A for this sprint.
