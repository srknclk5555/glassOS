# 🏭 GlassOS — Production Intelligence Platform

> **Versiyon:** Sprint 2.10.x  
> **Durum:** ✅ Aktif Geliştirme — 12 modül canlıda  
> **Son Güncelleme:** 2026-07-19

GlassOS, cam temperleme ve ısıcam üretimi için geliştirilmiş bağımsız bir **Üretim Zekâsı Platformu (Production Intelligence Platform)** ve **MES (Manufacturing Execution System)**'dir. ERP'lerin üzerinde çalışır, üretimi yönetir ve gerçek verinin tek kaynağı olur.

---

## Current Project Status

- **Current Sprint:** Sprint 2.10.x — Customer Master Completion & Master Data Standardization ✅
- **Önceki Sprint:** Sprint 2.10.0 — Goods Receipt (Mal Kabul) ✅
- **Tamamlanan Modüller:** Authentication, Multi-Tenant, Authorization/Permissions, Dashboard, Machines, Stations, Personnel, Warehouses, Materials, Goods Receipt, Customers (7 tab), Orders
- **Mimari Referanslar:** `SERVICE_ARCHITECTURE.md` + `BACKGROUND_ARCHITECTURE.md` + `UI_ARCHITECTURE.md`
- **Test Durumu:** 119 test passing, TypeScript 0 hata

---

## Hızlı Başlangıç

```bash
npm install
npm run dev          # Tüm projeyi çalıştır (web:3000 + api:3001)
npm run dev --filter=web   # Sadece web uygulaması
```

## Proje Yapısı

```
glassos/
├── apps/
│   ├── web/              # Next.js 15 App Router — Ana web uygulaması (port 3000)
│   └── api/              # Hono REST API (port 3001)
├── packages/
│   ├── db/               # @repo/db — Drizzle ORM (72 tablo), Repository, Service
│   ├── types/            # @repo/types — Zod validasyon şemaları
│   ├── ui/               # @repo/ui — React bileşen kütüphanesi (Radix UI + Tailwind 4)
│   ├── engine/           # @repo/engine — Üretim hesaplama motoru
│   ├── eslint-config/    # Paylaşılan ESLint konfigürasyonu
│   └── typescript-config/# Paylaşılan tsconfig preset'leri
└── docs/                 # Mimari ve iş kuralları dokümanları
```

## Mimari Dokümanlar

| Doküman | Kapsam |
|---------|--------|
| [`PLAN.md`](PLAN.md) | Proje vizyonu, yol haritası |
| [`talimatlar.md`](talimatlar.md) | Kullanım talimatları (kod örnekleriyle) |
| [`CUSTOMER_ARCHITECTURE.md`](CUSTOMER_ARCHITECTURE.md) | Müşteri modülü mimarisi |
| [`DATABASE_ARCHITECTURE.md`](DATABASE_ARCHITECTURE.md) | Veritabanı erişim mimarisi |
| [`DATABASE_BLUEPRINT.md`](DATABASE_BLUEPRINT.md) | Tablo şemaları ve ilişkiler |
| [`DATABASE_STANDARDS.md`](DATABASE_STANDARDS.md) | Veritabanı geliştirme standartları |
| [`SERVICE_ARCHITECTURE.md`](SERVICE_ARCHITECTURE.md) | Servis katmanı mimarisi |
| [`UI_ARCHITECTURE.md`](UI_ARCHITECTURE.md) | UI tasarım sistemi |
| [`SECURITY.md`](SECURITY.md) | Güvenlik politikası |
| [`DECISIONS.md`](DECISIONS.md) | Mimari karar kayıtları (ADR) |
| [`CHANGELOG.md`](CHANGELOG.md) | Sürüm değişiklikleri |

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|----------|
| **Frontend** | Next.js 15.5, React 19, Tailwind CSS 4, Radix UI |
| **API** | Hono 4.7, Zod validation |
| **Database** | PostgreSQL + Drizzle ORM v0.39.x (72 tablo, RLS) |
| **Auth** | NextAuth.js 4.24, bcrypt |
| **Build** | Turborepo 2.10, TypeScript 5.9 |
| **Test** | Vitest 3.x (119 tests passing) |

## Build & Test

```bash
npm run build         # Tüm projeyi build et
npm run check-types   # TypeScript kontrolü
npm run lint          # ESLint
npm run format        # Prettier
npx turbo test        # Testleri çalıştır


## Dokümanlar

Tüm mimari dokümanlar glassos/ altındadır. Ayrıca docs/architecture/ altında Goods Receipt, Inventory, Production gibi modül mimarileri bulunur.
