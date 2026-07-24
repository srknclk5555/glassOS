# GlassOS Web — Next.js Frontend

> **Framework:** Next.js 15.5 (App Router)  
> **Port:** 3000  
> **Durum:** ✅ Aktif Geliştirme — 12 modül çalışıyor

GlassOS ana web uygulaması. Cam fabrikası MES/ERP arayüzü.

## Hızlı Başlangıç

```bash
npm run dev          # Turbopack ile geliştirme (port 3000)
npm run build        # Production build
npm run dev:api      # Hono API sunucusuyla birlikte çalıştır
```

## Mimari

- **Routing:** Next.js App Router — `/src/app/[[...locale]]/`
- **State:** React Server Components + Actions
- **Auth:** NextAuth.js 4.24 (CredentialsProvider + JWT session)
- **DB:** `@repo/db` package — Drizzle ORM with RLS
- **UI:** `@repo/ui` — Radix UI + Tailwind CSS 4 bileşenleri
- **i18n:** Çift dil desteği (TR/EN)
- **Validation:** `@repo/types` — Zod şemaları

## Temel Bağımlılıklar

- Next.js 15.5, React 19
- Tailwind CSS 4, Radix UI, Lucide React
- NextAuth.js 4.24, bcrypt
- @repo/db, @repo/types, @repo/ui (workspace packages)

