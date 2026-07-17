# GlassOS UI Architecture

> Sprint 2.7.0 — UI Foundation & Design System
> Sprint 2.7.1 — Application Shell (AppShell)

---

## Design Principles

| Principle | Description |
|---|---|
| **Minimal** | Every pixel serves a purpose. No decorative clutter. |
| **Industrial** | Honest, functional, material-aware. Glass manufacturing aesthetic. |
| **Professional** | Enterprise-grade polish. High information density when needed. |
| **Readable** | Large type scale, generous whitespace, high contrast. |
| **Touch friendly** | Minimum 40px tap targets. Comfortable on tablet. |
| **Keyboard friendly** | Full keyboard navigation. Visible focus rings. |
| **Fast** | Zero unnecessary re-renders. Optimized with React compiler patterns. |

---

## Component Hierarchy

```
ThemeProvider                    ← Dark/light context
 └─ AppShell                    ← Application shell (monolithic layout)
     ├─ SidebarNav              ← Navigation with groups, keyboard nav, collapse
     ├─ TopBar                  ← Logo, breadcrumbs, search, factory, notifications
     │   ├─ Breadcrumb
     │   ├─ FactorySwitcher
     │   ├─ Notifications
     │   ├─ Profile
     │   └─ ThemeSwitcher
     ├─ CommandPalette          ← Ctrl+K global search
     └─ <Page Content>
         ├─ PageContainer       ← Title + content wrapper
         ├─ ContentContainer    ← Scrollable content area
         ├─ EmptyPage           ← Empty state for placeholder routes
         ├─ DataGrid            ← Enterprise table (sort, filter, paginate)
         ├─ Dialog / Drawer / Sheet  ← Modal patterns
         ├─ Tabs
         ├─ Cards
         ├─ Forms (Input, Select, Checkbox, Switch, Textarea)
         └─ Domain Badges
             ├─ GlassStatusBadge
             ├─ PriorityBadge
             ├─ ProductionStatusBadge
             └─ FactoryBadge
```

---

## Layout Hierarchy

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (collapsible)  │  TopBar                    │
│                         │  [Breadcrumb] [Search] [ ] │
│  ┌─────┐               ├────────────────────────────┤
│  │ Nav │               │                            │
│  │     │               │   Workspace (scrollable)   │
│  │     │               │                            │
│  │     │               │                            │
│  │     │               │                            │
│  └─────┘               │                            │
│  Footer                 │                            │
└─────────────────────────┴────────────────────────────┘
```

- **Desktop**: Sidebar is persistent, collapsible (56px / 224px).
- **Tablet**: Sidebar collapses by default. Can be toggled.
- **Mobile**: Sidebar becomes a Sheet (slide from left). TopBar shows hamburger.

---

## App Shell (Sprint 2.7.1)

The `AppShell` component (`packages/ui/src/components/layout/app-shell.tsx`) is a monolithic layout that replaces the previous separate `Shell`/`Sidebar`/`TopBar` pattern. It manages all top-level application state internally.

### Component Architecture

```
AppShell
├── Desktop Sidebar (<aside>)        — hidden on mobile (md:flex)
│   ├── Logo section                 — "G" badge + "GlassOS" text
│   ├── Collapse toggle button       — w-14 (collapsed) / w-56 (expanded)
│   └── SidebarNav                   — Tree navigation with keyboard support
└── Main Area
    ├── TopBar (<header>)            — h-14
    │   ├── Hamburger (mobile only)  — opens Sheet drawer
    │   ├── Breadcrumbs              — label array, last item bold
    │   ├── Search button            — opens CommandPalette
    │   ├── Factory dropdown         — factory name + switcher
    │   ├── Notifications bell       — unread badge (caps at "9+")
    │   ├── Theme toggle             — Sun/Moon icon
    │   └── Profile dropdown         — avatar + name/email + menu
    └── <main>                       — flex-1, overflow-y-auto, renders {children}
```

### Key Types

| Type | Properties |
|---|---|
| `NavItem` | `id`, `label`, `icon?`, `href?`, `badge?`, `active?`, `disabled?`, `children[]?`, `group?` |
| `UserProfile` | `name`, `email`, `avatar?` |
| `AppNotification` | `id`, `title`, `description?`, `read`, `createdAt` |

### SidebarNav Features

- **Section grouping**: Items with a `group` string are grouped under a section header (uppercase, tracking-widest, muted). Items without `group` appear ungrouped at the top.
- **Collapse**: `w-14` (icons only) or `w-56` (full). Toggle button in logo bar.
- **Keyboard navigation**: `ArrowUp`/`ArrowDown` to move, `Enter`/`Space` to activate, `ArrowRight`/`ArrowLeft` to expand/collapse children. `role="tree"` / `role="treeitem"`.
- **Nested items**: `children[]` rendered recursively with indentation. `ChevronRight` rotates on expand.

### Command Palette

- **Trigger**: `Ctrl+K` / `⌘K` keyboard shortcut.
- **Search**: Flattens entire navigation tree via `useMemo` + `walk()` function. Filters by label/id.
- **No query**: Shows "Recent" section (disabled placeholder) and "Quick Actions" (theme toggle).
- **Empty**: Shows "No pages found." via `CommandEmpty`.
- **Navigation**: Picking a command calls `onNavigate` and closes the palette.

### Props

| Prop | Type | Description |
|---|---|---|
| `navigation` | `NavItem[]` | Full navigation tree |
| `breadcrumbs` | `{ label, href? }[]` | Breadcrumb trail |
| `user` | `UserProfile` | Current user |
| `factory` | `string` | Current factory name |
| `notifications` | `AppNotification[]` | Notification list |
| `onNavigate` | `(item: NavItem) => void` | Route change handler |
| `onProfile` | `() => void` | Profile action |
| `onSettings` | `() => void` | Settings action |
| `onLogout` | `() => void` | Logout action |
| `onMarkNotificationRead` | `(id: string) => void` | Mark notification read |
| `onViewAllNotifications` | `() => void` | View all link |
| `children` | `React.ReactNode` | Page content |

### Routing

The app uses a `(dashboard)` route group in `apps/web/src/app/(dashboard)/` with 14 page placeholders:

| Route | Page | Group |
|---|---|---|
| `/` | Dashboard | Overview |
| `/orders` | Orders | Production |
| `/production` | Production | Production |
| `/queue` | Queue | Production |
| `/recipes` | Recipes | Production |
| `/inventory` | Inventory | Materials |
| `/customers` | Customers | Relations |
| `/machines` | Machines | Facility |
| `/stations` | Stations | Facility |
| `/personnel` | Personnel | Facility |
| `/quality` | Quality | Quality |
| `/dispatch` | Dispatch | Logistics |
| `/reports` | Reports | Analytics |
| `/settings` | Settings | (none) |

Each page renders a `PagePlaceholder` with an icon, title, and description via `EmptyState`.

**Note**: The `/queue` route has been converted from placeholder to a live Production Queue page (Sprint 2.7.3).

---

## Authentication (Sprint 2.7.2)

The authentication system uses a **bridge pattern**: a generic, backend-agnostic context in `@repo/ui` is connected to NextAuth in `apps/web` via an adapter component.

### Architecture

```
RootLayout
└── ThemeProvider
    └── SessionBridge (apps/web)
        ├── SessionProvider (next-auth/react)
        │   └── AuthProvider (@repo/ui)
        │       └── AuthSync
        │           └── <Page Content>
```

| Layer | File | Responsibility |
|---|---|---|
| `SessionProvider` | `next-auth/react` | Manages NextAuth session lifecycle, fetches/refreshes tokens |
| `AuthProvider` | `@repo/ui` — `auth-context.tsx` | Generic auth context (`user`, `isLoading`, `login`, `logout`, `setUser`, `setLoading`) |
| `AuthSync` | `apps/web` — `session-bridge.tsx` | Reads NextAuth session via `useSession()`, calls `setUser()`/`setLoading()` on AuthContext; overrides `login`/`logout` with real `signIn`/`signOut` implementations |

### AuthContext (@repo/ui)

```typescript
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  factoryId?: string;
  selectedFactoryId?: string;
  image?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
}
```

### Session Bridge (apps/web)

The `SessionBridge` component wraps the app tree with `SessionProvider` (NextAuth) and `AuthProvider` (generic). An internal `AuthSync` component:

- Reads `session` + `status` from `useSession()`
- On `loading` → calls `setLoading(true)`
- On `unauthenticated` → calls `setUser(null)`, `setLoading(false)`
- On authenticated → maps `session.user` (`id`, `role`, `tenantId`, `factoryId`, `selectedFactoryId`) to `AuthUser`, calls `setUser()`
- Overrides `login` to call `signIn("credentials", { redirect: false })`
- Overrides `logout` to call `signOut({ redirect: false })`

### Route Protection

| Component | File | Purpose |
|---|---|---|
| `AuthGuard` | `@repo/ui` — `auth-guard.tsx` | Checks `isLoading`, `isAuthenticated`, optional `requiredRole` — shows spinner, login prompt, or 403 |
| `AuthGuard` usage | `apps/web` — `(dashboard)/layout.tsx` | Wraps entire dashboard route group to require authentication |

### Login Flow

```mermaid
sequenceDiagram
    User->>LoginPage: Enter email + password
    LoginPage->>useAuth().login: login(email, password)
    useAuth().login->>signIn("credentials"): POST /api/auth/callback/credentials
    signIn->>NextAuth: Validate credentials
    NextAuth->>Database: Query users + roles
    Database-->>NextAuth: User + role data
    NextAuth-->>signIn: JWT token (userId, role, tenantId, factoryId)
    signIn-->>useAuth().login: { ok: true }
    useAuth().login-->>LoginPage: { ok: true }
    LoginPage->>router.push: /dashboard
    AuthSync->>useSession(): Detects new session
    AuthSync->>useAuth().setUser: Maps session.user to AuthUser
    AuthGuard->>isAuthenticated: true → renders children
```

### Role-Based Navigation

The `useNavItems` hook (`@repo/ui` — `hooks/use-nav-items.ts`) filters the full navigation tree by the user's role:

| Role | Visible Nav Items |
|---|---|
| `super_admin` | All |
| `tenant_admin` | All |
| `factory_manager` | All |
| `office` | Dashboard, Orders, Production, Queue, Inventory, Customers, Recipes, Quality, Dispatch, Reports |
| `planning` | Dashboard, Orders, Production, Queue, Recipes, Reports |
| `quality` | Dashboard, Quality, Reports |
| `warehouse` | Dashboard, Inventory, Dispatch |
| `cutting`, `grinding`, `washing`, `temper` | Dashboard, Queue, Production |
| `driver` | Dashboard, Dispatch |
| `customer` | Dashboard, Reports |

Used in `(dashboard)/layout.tsx`:
```typescript
const isAdmin = user?.role === "super_admin" || user?.role === "tenant_admin" || user?.role === "factory_manager";
const filteredNav = useNavItems(ALL_NAV_ITEMS, isAdmin ? "*" : (user?.role ?? null));
```

### Error Pages

| Component | File | HTTP Code |
|---|---|---|
| `Error401` | `@repo/ui` — `error-pages.tsx` | 401 — Unauthenticated |
| `Error403` | `@repo/ui` — `error-pages.tsx` | 403 — Forbidden |
| `Error404` | `@repo/ui` — `error-pages.tsx` | 404 — Not Found |
| `not-found.tsx` | `apps/web` — `app/not-found.tsx` | Next.js 404 page using `Error404` component |
| `unauthorized/page.tsx` | `apps/web` — `(auth)/unauthorized/page.tsx` | Custom 403 page using `Error403` component |

---

## Theme System

### Design Tokens

All tokens are defined as CSS custom properties in `packages/ui/src/styles.css`.

| Category | Tokens | Example |
|---|---|---|
| **Surfaces** | `glass-background`, `glass-surface`, `glass-surface-hover`, `glass-elevated` | `#09090b` (dark) |
| **Borders** | `glass-border`, `glass-border-hover` | `#2a2a2e` (dark) |
| **Brand** | `primary`, `primary-hover`, `secondary` | `#6366f1` |
| **Text** | `text-primary`, `text-secondary`, `text-muted` | `#fafafa` (dark) |
| **Status** | `success`, `warning`, `danger`, `info` | `#22c55e` |
| **Queue** | `queue-waiting`, `queue-running`, `queue-completed`, `queue-paused`, `queue-cancelled` | — |
| **Station** | `station-idle`, `station-active`, `station-maintenance`, `station-offline` | — |
| **Priority** | `priority-critical`, `priority-high`, `priority-normal`, `priority-low` | — |
| **Shadows** | `shadow-xs` through `shadow-xl` | — |

### Dark / Light Mode

- Dark mode is **default** and **primary**.
- Light mode is toggled via `.light` class on `<html>`.
- `ThemeProvider` manages state, persists to `localStorage('glassos-theme')`.
- All tokens switch seamlessly via CSS variable overrides.

---

## Folder Structure

```
packages/ui/src/
├── index.ts                          # Barrel exports
├── lib/
│   └── cn.ts                         # cn() utility (clsx + tailwind-merge)
├── styles.css                        # Theme tokens + Tailwind v4 config
├── hooks/
│   └── use-nav-items.ts              # Role-based navigation filtering hook
└── components/
    ├── auth/                         # Authentication (Sprint 2.7.2)
    │   ├── index.ts                  # Auth barrel exports
    │   ├── auth-context.tsx          # AuthProvider + useAuth() + AuthContext
    │   ├── login-page.tsx            # GlassOS login form
    │   ├── auth-guard.tsx            # Route protection with role check
    │   └── error-pages.tsx           # 401, 403, 404 error pages
    ├── queue/                        # Production Queue (Sprint 2.7.3)
    │   ├── index.ts                  # Queue barrel exports
    │   ├── types.ts                  # Queue types + status/priority configs
    │   ├── summary-cards.tsx         # 4 summary stat cards
    │   ├── queue-filters.tsx         # Filter bar (station, operation, search, etc.)
    │   ├── queue-card.tsx            # Job card with status, priority, actions
    │   ├── active-work-panel.tsx     # Right panel: active job, timer, progress
    │   ├── barcode-scanner.tsx       # Modal: camera + manual barcode input
    │   ├── detail-drawer.tsx         # Slide-in order detail + timeline
    │   └── production-queue-page.tsx # Main page composing all components
    ├── providers/
    │   └── theme-provider.tsx         # Theme context
    ├── ui/                           # Primitive & composite components
    │   ├── button.tsx
    │   ├── input.tsx
    │   ├── textarea.tsx
    │   ├── select.tsx
    │   ├── checkbox.tsx
    │   ├── switch.tsx
    │   ├── badge.tsx
    │   ├── card.tsx
    │   ├── dialog.tsx
    │   ├── drawer.tsx
    │   ├── sheet.tsx
    │   ├── tabs.tsx
    │   ├── dropdown.tsx
    │   ├── tooltip.tsx
    │   ├── toast.tsx
    │   ├── skeleton.tsx
    │   ├── empty-state.tsx
    │   ├── loading-state.tsx
    │   ├── avatar.tsx
    │   ├── breadcrumb.tsx
    │   ├── search-box.tsx
    │   ├── command-palette.tsx
    │   ├── status-indicator.tsx
    │   ├── progress.tsx
    │   ├── glass-status-badge.tsx
    │   ├── priority-badge.tsx
    │   ├── production-status-badge.tsx
    │   └── factory-badge.tsx
    ├── data-grid/
    │   └── data-grid.tsx             # Enterprise DataGrid
    └── layout/
        ├── app-shell.tsx             # Monolithic AppShell (Sprint 2.7.1)
        ├── shell.tsx                 # Legacy application shell
        ├── sidebar.tsx               # Legacy navigation sidebar
        ├── topbar.tsx                # Legacy top bar
        ├── notifications.tsx         # Notification dropdown
        ├── profile.tsx               # User profile dropdown
        ├── factory-switcher.tsx      # Factory selector
        └── theme-switcher.tsx        # Dark/light toggle
```

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| **Components** | PascalCase, kebab-case files | `button.tsx`, `data-grid.tsx` |
| **Exports** | Named exports (no defaults) | `export { Button }` |
| **Types** | Exported alongside component | `export interface ButtonProps` |
| **Props** | Extend HTML attributes | `extends React.ButtonHTMLAttributes<...>` |
| **Forwarding** | `React.forwardRef` for all interactive components | — |
| **Client** | `"use client"` directive on all interactive components | — |

---

## Production Queue (Sprint 2.7.3)

The Production Queue is the primary daily-use interface for factory operators. It displays waiting jobs, allows job assignment, tracks active work, and provides barcode scanning.

### Component Tree

```
apps/web/(dashboard)/queue/
├── page.tsx                                ← Server component, renders ProductionQueueClient
└── production-queue-client.tsx             ← Client component: fetches data, wires actions to UI

packages/ui/src/components/queue/
├── index.ts                                ← Barrel exports
├── types.ts                                ← QueueJobItem, QueueFiltersState, JOB_STATUS_CONFIG, etc.
├── summary-cards.tsx                       ← 4 summary stat cards (waiting, running, completed, avg time)
├── queue-filters.tsx                       ← Filter bar: search, station, operation, priority, status
├── queue-card.tsx                          ← Job card: status badge, priority, glass info, actions
├── active-work-panel.tsx                   ← Right panel: current job, timer, progress, pause/complete
├── barcode-scanner.tsx                     ← Modal: camera placeholder + manual barcode input
├── detail-drawer.tsx                       ← Slide-in drawer: full order details + timeline
└── production-queue-page.tsx               ← Main page composing all components
```

### Data Flow

```
getQueueData()                     ← Server action (direct DB via Drizzle)
     │
     ▼
ProductionQueueClient              ← Client wrapper: calls server actions, manages state
     │
     ├── loading=true ────► Loading spinner
     ├── error=!null ─────► Error state with retry
     └── data loaded ─────► ProductionQueuePage (pure UI)
                              │
                              ├── SummaryCards (4 metrics)
                              ├── QueueFilters ←→ filters state
                              │     └── filteredJobs (useMemo)
                              ├── QueueCard[] ←─── onTakeJob → takeJobAction()
                              │                        onViewDetails → getJobDetailAction()
                              ├── ActiveWorkPanel ─── onPause → pauseJobAction()
                              │                        onComplete → completeJobAction()
                              │                        onOpenBarcode → BarcodeScanner
                              ├── BarcodeScanner ──── onScan → sets search filter
                              └── DetailDrawer ────── detail data from getJobDetailAction
```

### Page Layout (Three-Panel)

```
┌──────────────────────────────────────────────────────────┐
│  SummaryCards                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐               │
│  │Waiting│ │Running│ │Cmpltd│ │Avg Time  │               │
│  └──────┘ └──────┘ └──────┘ └──────────┘               │
├──────────┬───────────────────────────┬──────────────────┤
│  Filters │  Job Cards                │  Active Work     │
│  (left)  │  (center, scrollable)     │  (right panel)   │
│          │                           │                  │
│  Station │  ┌─────┐ ┌─────┐         │  Current Job     │
│  Machine │  │Card │ │Card │         │  Timer           │
│  Operatn │  └─────┘ └─────┘         │  Progress        │
│  Priority│  ┌─────┐ ┌─────┐         │  Station Info    │
│  Status  │  │Card │ │Card │         │  Actions         │
│  Search  │  └─────┘ └─────┘         │  [Pause][Cmplte] │
│          │                           │  [Barcode]       │
│ [Clear]  │  Grid: sm:2, xl:3 cols   │                  │
├──────────┴───────────────────────────┴──────────────────┤
│  BarcodeScanner (modal overlay)                         │
│  DetailDrawer (slide-in from right)                     │
└──────────────────────────────────────────────────────────┘
```

### State Management

| State | Mechanism | Description |
|---|---|---|
| **Server state** | Server actions | `getQueueData()`, `takeJobAction()`, `pauseJobAction()`, `completeJobAction()`, `getJobDetailAction()` |
| **Polling** | `setInterval` (30s) | Auto-refresh in `ProductionQueueClient` via `useEffect` |
| **Client filters** | `useState` | `QueueFiltersState` — search, station, operation, priority, status |
| **Filtered jobs** | `useMemo` | Derived from `data.jobs` + filter state |
| **Detail drawer** | `useState` | `detailJobId`, `detailData`, `detailLoading` |
| **Barcode scanner** | `useState` | `barcodeOpen` boolean |
| **Taking IDs** | `useState<Set<string>>` | Track which jobs are being taken (loading state per card) |

### UI States

| State | Visual | Component |
|---|---|---|
| **Loading** | Full-page centered spinner | `ProductionQueuePage` |
| **Error (backend down)** | Error icon + message + retry button | `ProductionQueuePage` |
| **Empty queue** | Empty state with contextual message ("No jobs" vs "Adjust filters") | Center panel |
| **No active work** | PlayCircle icon + "No active work — take a job" | `ActiveWorkPanel` |
| **Empty detail** | "Job not found" | `DetailDrawer` |
| **Filter active** | Count badge: "X of Y" | Header of center panel |

### Status Visual Identity

Each status has a distinct visual pairing defined in `JOB_STATUS_CONFIG`:

| Status | Dot | Label Color | Background |
|---|---|---|---|
| `waiting` | amber | amber-600/400 | amber-50/amber-950/30 |
| `assigned` | blue | blue-600/400 | blue-50/blue-950/30 |
| `in_progress` | emerald | emerald-600/400 | emerald-50/emerald-950/30 |
| `paused` | amber | amber-600/400 | amber-50/amber-950/30 |
| `completed` | emerald | emerald-600/400 | emerald-50/emerald-950/30 |
| `blocked` | red | red-600/400 | red-50/red-950/30 |
| `rework` | purple | purple-600/400 | purple-50/purple-950/30 |

### Priority Visual Identity

| Priority | Label | Color |
|---|---|---|
| 1 | Critical | red-600/400 |
| 50 | High | orange-600/400 |
| 100 | Normal | text-primary (default) |
| 200 | Low | text-muted |

### Server Actions (`apps/web/src/app/actions/queue.ts`)

| Action | HTTP Equivalent | Side Effects |
|---|---|---|
| `getQueueData()` | GET /queue | Fetches jobs, stations, machines, operations, active work, summary — all in one tenant-scoped transaction |
| `takeJobAction(id)` | POST /queue/:id/start | Updates production order → `in_progress`, inserts `started` event, revalidates `/queue` |
| `pauseJobAction(id)` | POST /queue/:id/pause | Updates → `paused`, inserts `paused` event, revalidates |
| `completeJobAction(id)` | POST /queue/:id/complete | Updates → `completed`, sets `completedAt`, marks queue items `done`, inserts `completed` event, revalidates |
| `getJobDetailAction(id)` | GET /production/:id | Returns full order detail + timeline events |

All actions follow the pattern: `requireSession()` → `withTenantSession(session, async (tx) => { ... })`.

### Backend Schema (PostgreSQL via Drizzle)

Key tables used by the queue:

| Table | Key Columns |
|---|---|
| `production_orders` | `id`, `glassBarcode`, `currentStatus`, `currentOperation`, `currentStationId`, `orderLineId`, `widthMm`, `heightMm`, `isRework`, `notes`, `tenantId` |
| `production_queue_items` | `id`, `queueId`, `productionOrderId`, `status`, `priority`, `enteredAt` |
| `production_queues` | `id`, `operationCode`, `stationId`, `tenantId` |
| `production_events` | `id`, `productionOrderId`, `eventType`, `fromOperation`, `toOperation`, `stationId`, `createdAt` |
| `stations` | `id`, `name`, `stationType`, `isActive`, `sortOrder`, `tenantId` |
| `orders` | `id`, `orderNumber`, `customerId` |
| `order_lines` | `id`, `orderId`, `quantity`, `completedQuantity` |
| `customers` | `id`, `name` |

### Barcode Scanner

- Modal dialog with two modes: **Camera** (placeholder — requires HTTPS) and **Manual** (text input fallback)
- On scan: sets the search filter to the scanned barcode value, filtering the job list
- Accessible: `role="dialog"`, `aria-modal="true"`, `aria-label`

### Detail Drawer

- Slide-in panel from right (max-w-md, overlay with backdrop blur)
- Sections: Status + Priority header, Order Info card, Glass Dimensions grid, Recipe (if present), Notes (if present), Rework badge (if rework), Timeline with event dots
- Timeline: visual vertical timeline with dot + line for each event (`started`, `paused`, `completed`, `transferred`, `rework_created`, `broken`)
- Fetches detail via `getJobDetailAction` on demand

| Technology | Usage |
|---|---|
| **React 19** | Component library |
| **Next.js 15 App Router** | Application framework |
| **TailwindCSS v4** | Utility-first styling, CSS-first config |
| **Radix UI** | Accessible headless primitives (Dialog, Dropdown, Tabs, etc.) |
| **class-variance-authority** | Variant-based component APIs |
| **clsx + tailwind-merge** | Class name merging (`cn()`) |
| **Lucide React** | Icons (only icon library) |

---

## Accessibility

- All interactive components use Radix UI primitives (WAI-ARIA compliant).
- Focus rings visible on all focusable elements (`focus-visible:ring-2`).
- Keyboard navigation: Tab, Enter, Escape, Arrow keys.
- Color contrast ratios meet WCAG 2.1 AA (verified in token design).
- `aria-label`, `aria-describedby`, `role` attributes applied where needed.
- `sr-only` utility for screen-reader-only text.

---

## DataGrid Architecture

```
<DataGrid
  columns={columns}         // Column definitions (key, header, render, sortable)
  data={data}               // Row data array
  keyExtractor={(row) => row.id}
  sortColumn="name"         // Controlled sorting
  sortDirection="asc"
  onSort={(col) => ...}     // Sort handler
  loading={false}
  emptyTitle="No results"
  page={1}
  pageSize={20}
  total={100}
  onPageChange={(p) => ...}
  onRowClick={(row) => ...}
  rowActions={(row) => ...} // Action buttons per row
/>
```

Features:
- Sticky header
- Sort indicators (asc/desc/none)
- Loading state (skeleton rows)
- Empty state
- Pagination (with page numbers)
- Row click handler
- Row actions column
- Responsive (horizontal scroll on overflow)

---

## Future Page Strategy

Each business domain will follow this pattern:

```
apps/web/src/app/
├── (dashboard)/             ← Future: Main dashboard
├── production/              ← Future: Production management
├── inventory/               ← Future: Inventory management
├── orders/                  ← Future: Order management
├── customers/               ← Future: Customer management
├── settings/                ← Future: Settings pages
└── layout.tsx               ← Uses <Shell> from @repo/ui
```

Every page:
1. Imports layout components from `@repo/ui` (Shell, Sidebar, TopBar)
2. Imports UI components from `@repo/ui` (Button, DataGrid, Dialog, etc.)
3. No business logic in UI package — only in page components or service layer
4. Uses semantic CSS tokens, never hardcoded colors

---

## Migration Guide (from old template)

1. Replace `@repo/ui/button` imports → `@repo/ui`
2. Replace `@repo/ui/card` imports → `@repo/ui`
3. Remove `page.module.css` — use Tailwind utility classes
4. Import `@repo/ui/styles.css` in root layout (already done)
5. Wrap app in `<ThemeProvider>` (already done)
