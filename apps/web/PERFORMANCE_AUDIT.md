# GlassOS — Production Performance Baseline

**Date**: 2026-07-17  
**Sprint**: 2.8.3A — Production Build Recovery & Performance Baseline  
**Node**: v24.16.0  
**Next.js**: 15.5.20  
**React**: 19.2.7  
**Build Command**: `npx next build` (cold cache)

---

## 1. Build Metrics

| Metric | Value |
|--------|-------|
| Compilation Time | **4.5–5.9s** |
| ESLint Warnings | ~40 (all `no-unused-vars`, `no-explicit-any`, `turbo/no-undeclared-env-vars`) |
| Type Errors | **0** ✅ |
| Build Failures | **0** ✅ |
| Static Pages Generated | **32/32** ✅ |

## 2. JavaScript Bundle Size (First Load)

| Asset | Size |
|------|------|
| **Total Shared First Load JS** | **103 kB** |
| `chunks/18-7475744f812bdff0.js` | 46.7 kB |
| `chunks/87c73c54-09e1ba5c70e60a51.js` | 54.2 kB |
| Other shared chunks (total) | 2.03 kB |

## 3. Route-Level Size Breakdown

### 🟢 Static (Prerendered) — 26 routes

| Route | Page Size | First Load JS |
|-------|-----------|---------------|
| `/` | 567 B | 190 kB |
| `/_not-found` | 147 B | 103 kB |
| `/customers/new` | 940 B | 104 kB |
| `/dispatch` | 633 B | 190 kB |
| `/inventory` | 625 B | 190 kB |
| `/login` | 368 B | 190 kB |
| `/machines` | 6.63 kB | **196 kB** |
| `/materials/new` | 1.01 kB | 104 kB |
| `/orders` | 627 B | 190 kB |
| `/personnel` | **7.91 kB** | **197 kB** |
| `/production` | 706 B | 190 kB |
| `/products/new` | 1.01 kB | 104 kB |
| `/quality` | 624 B | 190 kB |
| `/queue` | **1.14 kB** | 190 kB |
| `/recipes` | 573 B | 190 kB |
| `/reports` | 559 B | 190 kB |
| `/settings` | 439 B | 190 kB |
| `/stations` | **7.12 kB** | **196 kB** |
| `/unauthorized` | 350 B | 190 kB |

### 🔵 Dynamic (Server-rendered) — 6 routes

| Route | Page Size | First Load JS |
|-------|-----------|---------------|
| `/api/auth/[...nextauth]` | 147 B | 103 kB |
| `/api/debug-auth` | 147 B | 103 kB |
| `/api/debug-compare` | 147 B | 103 kB |
| `/api/debug-user` | 147 B | 103 kB |
| `/customers` | 171 B | 107 kB |
| `/customers/[id]` | 1.14 kB | 107 kB |
| `/factories` | 171 B | 107 kB |
| `/factories/settings` | 2.03 kB | 105 kB |
| `/materials` | 163 B | 107 kB |
| `/materials/[id]` | 1.01 kB | 104 kB |
| `/products` | 171 B | 107 kB |
| `/products/[id]` | 1.01 kB | 104 kB |
| `/tenants` | 147 B | 103 kB |
| `/users` | 147 B | 103 kB |

### 🏋️ Heaviest Pages (First Load JS)

| Route | First Load JS | Page Size |
|-------|--------------|-----------|
| `/personnel` | **197 kB** | 7.91 kB |
| `/machines` | **196 kB** | 6.63 kB |
| `/stations` | **196 kB** | 7.12 kB |
| `/` (Dashboard) | 190 kB | 567 B |
| `/queue` | 190 kB | 1.14 kB |

## 4. Production Server Metrics

| Metric | Value |
|--------|-------|
| Server Start Time | **484 ms** |
| Queue Page Load (DOMContentLoaded) | **25 ms** |
| Queue Page Load (Full) | **115 ms** |
| 500 Errors | 0 (during baseline capture) |

## 5. Regression Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| **Build** | ✅ | Compiled in 4.5s, 0 errors |
| **Login (TR)** | ✅ | Form renders: email, password, remember me, forgot password |
| **Dashboard Shell** | ✅ | Full sidebar in TR, breadcrumb, user menu, language switch |
| **Machines** | ✅ | 4 machines listed, search/filter, summary cards, CRUD buttons |
| **Personnel** | ✅ | Page loads with correct breadcrumb "Personel" |
| **Stations** | ✅ | Full sidebar & layout render, breadcrumb "İstasyonlar" |
| **Queue** | ✅ | Summary cards, 6 filter dropdowns (station, machine, operation, priority, status), data panel |
| **Language (TR/EN)** | ✅ | TR default, EN toggle present in header |
| **Auth Guard** | ✅ | Session-based, unauthorized redirects to login |
| **Static Generation** | ✅ | 32/32 pages generated |

## 6. Bundle Composition (Shared Chunks)

```
Total: 103 kB
├── chunks/18-7475744f812bdff0.js        46.7 kB  (core framework)
├── chunks/87c73c54-09e1ba5c70e60a51.js  54.2 kB  (app logic, components)
└── other shared chunks (total)           2.03 kB (runtime, webpack)
```

## 7. Build Error Post-Mortem

### Root Causes Found & Fixed (5 categories)

| # | Root Cause | Files Fixed | Resolution |
|---|-----------|-------------|------------|
| 1 | Missing schema files (settings, delivery-points, material-categories, material-packagings) | 5 files created, 1 edited | Created schema files + added exports |
| 2 | `@radix-ui/react-use-effect-event` dynamic `React[" useEffectEvent "]` access in ESM | 2 node_modules patched | Skip dynamic property access at module level |
| 3 | Column name mismatches: `active`→`isActive`, `erpCode`→`customerCode`, `title`→`name`, `shortTitle`→`shortName`, `actorId`→`changedBy`, etc. | 10+ files (actions, pages, components) | Systematic rename across all files |
| 4 | Drizzle `relations.ts` missing — `with: { role: true }` usage | 1 file (`authorization.ts`) | Manual two-step query instead of eager loading |
| 5 | Translation type duplicates: `title` in personnel section, `description` in stations | 3 files (types.ts, en.ts, tr.ts) | Renamed field keys (`personnelTitle`, `descriptionLabel`) |

**Total: 15+ type errors fixed across ~15 files, 0 remaining.**

---

*Baseline captured after `npx next build` with cold cache. No Layer 1 optimizations applied.*
