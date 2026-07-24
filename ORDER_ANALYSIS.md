# 📋 GlassOS Order Module — Bilgi Konsolidasyon ve Analiz Raporu

> **Sprint:** 5.0.0  
> **Tarih:** 2026-07-19  
> **Amaç:** Bugüne kadar üretilmiş tüm Order/Sipariş modülü bilgisini tek raporda toplamak.  
> **Yöntem:** Repository'deki tüm .md dosyaları, schema, servis, repository, controller ve migration kodları tarandı.  
> **Kural:** Yeni tasarım üretilmedi, tahmin yapılmadı, sadece mevcut bilgiye dayanıldı.

---

## İçindekiler

1. [Executive Summary](#1-executive-summary)
2. [Domain Overview](#2-domain-overview)
3. [Order Lifecycle](#3-order-lifecycle)
4. [Aggregate Structure](#4-aggregate-structure)
5. [Entity List](#5-entity-list)
6. [Value Objects](#6-value-objects)
7. [Database Schema](#7-database-schema)
8. [Screen Tabs](#8-screen-tabs)
9. [Business Rules](#9-business-rules)
10. [Integration Points](#10-integration-points)
11. [Event Flow](#11-event-flow)
12. [State Machine](#12-state-machine)
13. [Validation Rules](#13-validation-rules)
14. [Permissions](#14-permissions)
15. [Open Questions](#15-open-questions)
16. [Conflicting Documentation](#16-conflicting-documentation)
17. [Missing Information](#17-missing-information)
18. [Recommended Final Architecture](#18-recommended-final-architecture)

---

## 1. Executive Summary

GlassOS Order modülü, Sprint 2.4.2'de veritabanı şeması oluşturulmuş, Sprint 2.4.6'da repository katmanı, Sprint 2.5.0'da servis katmanı ve Sprint 2.6.0'da REST API ile tamamlanmış bir modüldür.

**Mevcut Durum:** ✅ Tamamlandı ve çalışıyor.

**Kapsam:** Sipariş (Order), Sipariş Kalemi (Order Line), Sipariş Notları (Order Notes) olmak üzere 3 tablo. Sipariş onay akışı (draft → confirmed → in_production → completed | cancelled) implemente edilmiş durumda.

**Önemli Tespit:** Order modülü şu anda "temel CRUD + onay akışı" seviyesindedir. ERP sistemlerinde beklenen fiyatlandırma, iskonto, vergi, para birimi, teslimat adresi seçimi, kısmi sevkiyat planlaması gibi özellikler **henüz tanımlanmamıştır**. GlassOS'un "ERP değil, MES/Production Intelligence" felsefesi gereği bu alanların bir kısmı bilinçli olarak dışarıda bırakılmıştır.

---

## 2. Domain Overview

### 2.1. Amaç

Order modülü, müşteriden gelen cam üretim taleplerinin sisteme girilmesini, onaylanmasını ve üretim sürecine aktarılmasını sağlar.

### 2.2. Kapsam

| Süreç | Kapsamda mı? | Açıklama |
|-------|-------------|----------|
| Sipariş oluşturma | ✅ | Müşteri seçimi, sipariş numarası, tarih, not |
| Sipariş kalemi ekleme | ✅ | Ürün, reçete, en/boy/ adet |
| Sipariş onaylama | ✅ | draft → confirmed + production order oluşturma |
| Sipariş iptal | ✅ | Sadece draft/confirmed durumunda |
| Sipariş güncelleme | ✅ | dueDate, notes |
| Sipariş sorgulama | ✅ | ID, müşteri, tarih aralığı, durum bazlı |
| Fiyatlandırma | ❌ | Bilinçli dışarıda bırakıldı (MES prensibi) |
| İskonto/vergi | ❌ | ERP'ye bırakıldı |
| Para birimi | ❌ | Tanımlanmamış |
| Teslimat adresi seçimi | ❌ | Siparişte deliveryPointId alanı yok |
| Sözleşme/çerçeve sipariş | ❌ | Tanımlanmamış |
| Kısmi teslimat planlaması | ❌ | Dispatch modülünde kısmi teslimat var ama siparişle bağlantısı zayıf |

### 2.3. Sınırlar

| Sınır | Açıklama |
|-------|----------|
| **Sipariş → Üretim** | Sipariş onaylandığında her kalem için bir ProductionOrder oluşturulur. Üretim başladıktan sonra sipariş değişmez. |
| **Sipariş → Müşteri** | Sipariş müşteriye bağlıdır. Aktif olmayan müşteriye sipariş açılamaz. |
| **Sipariş → Stok** | Sipariş stokları doğrudan etkilemez. Stok etkileşimi üretim ve sevkiyat aşamasında gerçekleşir. |
| **Sipariş → Finans** | Siparişte fiyat bilgisi tutulmaz. Finansal etkileşim ERP üzerinden yönetilir. |

### 2.4. GlassOS Felsefesi Bağlamında Sipariş

GlassOS PLAN.md'de net olarak tanımlandığı gibi:

```
ERP  ——►  Sipariş Üretir
GlassOS  ——►  Üretimi Yönetir, Gerçek Verinin Tek Kaynağı Olur
```

Bu nedenle Order modülü, ERP'den gelen siparişleri alıp üretim sürecine aktaran bir **geçiş katmanı** olarak tasarlanmıştır. ERP'deki ticari/finansal alanlar (fiyat, iskonto, vade, para birimi) GlassOS'ta tutulmaz.

---

## 3. Order Lifecycle

### 3.1. Mevcut Durum Makinesi

```
                   ┌─────────────┐
                   │   DRAFT     │
                   └──────┬──────┘
                          │ approveOrder()
                          │
                   ┌──────▼──────┐
              ┌────│  CONFIRMED  │────┐
              │    └──────┬──────┘    │
              │           │           │
              │  Üretim   │           │ cancelOrder()
              │  başlar   │           │
              │           │           │
         ┌────▼────┐     │      ┌────▼─────┐
         │IN_PROD. │     │      │ CANCELLED │
         └────┬────┘     │      └──────────┘
              │           │
              │  Tüm      │
              │  kalemler │
              │  tamam    │
              │           │
         ┌────▼────┐     │
         │COMPLETED│◄────┘
         └─────────┘
```

**Durum Geçişleri (Kodda tanımlı):**

| From | To | Metod | Validasyon |
|------|-----|-------|-----------|
| draft | confirmed | `approveOrder()` | Müşteri aktif, sipariş boş değil, ürün referansı var |
| draft | cancelled | `cancelOrder()` | - |
| confirmed | cancelled | `cancelOrder()` | in_production/completed değilse |
| confirmed | in_production | Üretim başladığında | (Üretim servisi tarafından yönetilir) |
| in_production | completed | Tüm kalemler tamam | (Üretim servisi tarafından yönetilir) |

**Durumlar:**

| Durum | Açıklama |
|-------|----------|
| `draft` | Taslak — yeni oluşturulmuş, henüz onaylanmamış |
| `confirmed` | Onaylanmış — üretime hazır |
| `in_production` | Üretimde — en az bir kalem üretimde |
| `completed` | Tamamlanmış — tüm kalemler üretildi |
| `cancelled` | İptal edilmiş |

### 3.2. Sipariş → Üretim Akışı (Detaylı)

```
SİPARİŞ ONAYI (approveOrder)
│
├── Validasyonlar
│   ├── Müşteri bulundu mu?
│   ├── Müşteri aktif mi?
│   ├── Sipariş boş değil mi? (en az 1 kalem)
│   ├── Her kalemin productId'si var mı?
│   └── Sipariş zaten onaylanmış/iptal edilmiş mi?
│
├── Sipariş durumu: draft → confirmed
│
├── Her kalem için ProductionOrder oluştur:
│   ├── id = "PROD-{orderLineId}"
│   ├── status = "pending"
│   ├── currentOperation = "cutting"
│   ├── widthMm = orderLine.widthMm
│   ├── heightMm = orderLine.heightMm
│   └── glassBarcode = "G-{orderNumber}-{lineId[-4:]}"
│
└── Event: OrderApprovedEvent
```

---

## 4. Aggregate Structure

### 4.1. Sipariş Aggregate'i

```
Order (Aggregate Root)
├── id: char(26) PK
├── tenantId: char(26) FK → Tenants
├── factoryId: char(26) FK → Factories (optional)
├── customerId: char(26) FK → Customers (NOT NULL)
├── orderNumber: varchar(50) (unique per tenant)
├── orderDate: date (NOT NULL)
├── dueDate: date (optional)
├── status: varchar(30) → draft | confirmed | in_production | completed | cancelled
├── notes: text (optional)
├── Audit columns (createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy)
│
├── OrderLine[] (Owned Entity)
│   ├── id: char(26) PK
│   ├── orderId: char(26) FK → Orders (ON DELETE CASCADE)
│   ├── productId: char(26) FK → Products (ON DELETE RESTRICT)
│   ├── recipeId: char(26) FK → Recipes (ON DELETE RESTRICT, optional)
│   ├── widthMm: numeric(8,2) (NOT NULL) — Business Dimension
│   ├── heightMm: numeric(8,2) (NOT NULL) — Business Dimension
│   ├── quantity: integer (NOT NULL)
│   ├── completedQuantity: integer (default 0)
│   ├── brokenQuantity: integer (default 0)
│   ├── notes: text
│   └── Audit columns (createdAt, updatedAt)
│
├── OrderNote[] (Owned Entity)
│   ├── id: char(26) PK
│   ├── orderId: char(26) FK → Orders (ON DELETE CASCADE)
│   ├── noteText: text (NOT NULL)
│   ├── isInternal: boolean (default true)
│   ├── createdAt: timestamp
│   └── createdBy: char(26)
│
└── ProductionOrder[] (Referenced — NOT owned)
    ├── id: char(26) PK
    ├── orderLineId: char(26) FK → OrderLines (ON DELETE RESTRICT)
    ├── status: pending | in_progress | completed | broken | rework | cancelled
    └── ...
```

### 4.2. Aggregate Sınırları

| Entity | Aggregate Root | Tip | Yaşam Süresi |
|--------|---------------|-----|-------------|
| Order | Kendisi | Aggregate Root | Bağımsız |
| OrderLine | Order | Owned Entity | Order'a bağlı |
| OrderNote | Order | Owned Entity | Order'a bağlı |
| ProductionOrder | Kendisi (Production aggregate) | Referenced | OrderLine'a bağlı ama farklı aggregate |

### 4.3. Aggregate İlişkileri (Drizzle Relations'da Tanımlı)

```
orders → customers        (N:1 — many-to-one)
orders → orderLines       (1:N — one-to-many)
orders → orderNotes       (1:N — one-to-many)
orders → productionOrders (1:N — one-to-many, orderLines üzerinden dolaylı)

orderLines → orders       (N:1)
orderLines → products     (N:1)
orderLines → recipes      (N:1)
orderLines → productionOrders (1:N)
```

---

## 5. Entity List

### 5.1. Çekirdek Sipariş Entity'leri (Veritabanında Mevcut)

| Entity | Tablo | Tip | Kaynak |
|--------|-------|-----|--------|
| Order | `orders` | Aggregate Root | `schema/orders.ts` |
| OrderLine | `order_lines` | Owned Entity | `schema/orders.ts` |
| OrderNote | `order_notes` | Owned Entity | `schema/orders.ts` |

### 5.2. İlişkili Entity'ler (Diğer Aggregate'ler)

| Entity | Tablo | İlişki | Kaynak |
|--------|-------|--------|--------|
| Customer | `customers` | Sipariş sahibi | `schema/customers.ts` |
| Product | `products` | Sipariş kalemi ürünü | `schema/materials-products.ts` |
| Recipe | `recipes` | Sipariş kalemi reçetesi | `schema/recipes.ts` |
| ProductionOrder | `production_orders` | Siparişten üretime geçiş | `schema/production.ts` |
| ProductionEvent | `production_events` | Üretim olay geçmişi | `schema/production.ts` |
| DeliveryPoint | `delivery_points` | Teslimat adresi (henüz siparişe bağlı değil) | `schema/delivery-points.ts` |

### 5.3. Dokümanlarda Bahsedilen Ama Henüz Oluşturulmamış Entity'ler

| Entity | Bahsedilen Yer | Not |
|--------|---------------|-----|
| Order.productionPreferences (JSONB) | CUSTOMER_ARCHITECTURE.md §6.3 | "Copy-on-write" pattern ile müşteriden kopyalanacak. Henüz orders tablosunda bu kolon yok. |
| Order.labelSpec (JSONB) | CUSTOMER_ARCHITECTURE.md §6.3 | Aynı şekilde orders tablosunda tanımlı değil. |
| Order.packagingProfile (JSONB) | CUSTOMER_ARCHITECTURE.md §6.3 | Aynı şekilde orders tablosunda tanımlı değil. |
| Order.deliveryPointId | CUSTOMER_ARCHITECTURE.md | Siparişte teslimat noktası seçimi için FK alanı yok. |

---

## 6. Value Objects

### 6.1. Kodda Tanımlı Value Object'ler

| Value Object | Kullanım Yeri | Tip | Açıklama |
|-------------|---------------|-----|----------|
| Business Dimension | `order_lines.widthMm`, `order_lines.heightMm` | `numeric(8,2)` | Müşteri ölçüsü — hiç değişmez, tüm ekranlarda gösterilir |
| Production Dimension | `production_orders.productionWidthMm`, `production_orders.productionHeightMm` | `numeric(8,2)` | Rodaj payı eklenmiş ölçü — yalnızca iç hesaplama |
| ULID | Tüm tablolarda `id` | `char(26)` | Primary key formatı |

### 6.2. ADR'lerde Tanımlı Value Object Kavramları (Henüz Implemente Edilmemiş)

| Value Object | ADR Kaynağı | Açıklama |
|-------------|-------------|----------|
| Money | ADR-2026-07-15-08/09 | Fiyat/değer için — inventory lot'ta unitCost var ama order'da yok |
| Quantity | - | `integer` olarak mevcut, value object wrapper yok |
| Trim Profile | ADR-2026-07-15-02 | 4 kenar bağımsız trim — Factory Configuration'da |
| Grinding Profile | ADR-2026-07-15-03 | 4 kenar bağımsız rodaj — Factory Configuration'da |
| Remnant Threshold | ADR-2026-07-15-04 | 3 eşik (min width, height, area) — Factory Configuration'da |

---

## 7. Database Schema

### 7.1. `orders` Tablosu

| Kolon | Tip | Kısıt | Açıklama |
|-------|-----|-------|----------|
| `id` | `char(26)` | PK | ULID |
| `tenant_id` | `char(26)` | NOT NULL, FK → tenants | Tenant izolasyonu |
| `factory_id` | `char(26)` | FK → factories (nullable) | Fabrika |
| `customer_id` | `char(26)` | NOT NULL, FK → customers | Müşteri |
| `order_number` | `varchar(50)` | NOT NULL | Benzersiz (tenant bazlı index) |
| `order_date` | `date` | NOT NULL | Sipariş tarihi |
| `due_date` | `date` | nullable | Teslim tarihi |
| `status` | `varchar(30)` | NOT NULL, DEFAULT 'draft' | draft/confirmed/in_production/completed/cancelled |
| `notes` | `text` | nullable | Sipariş notu |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL | |
| `created_by` | `char(26)` | nullable | |
| `updated_by` | `char(26)` | nullable | |
| `deleted_at` | `timestamptz` | nullable | Soft delete |
| `deleted_by` | `char(26)` | nullable | |

**Eksik / Dokümanda Bahsedilmiş Ama Tabloda Olmayan Kolonlar:**

| Kolon | Tip | Kaynak | Not |
|-------|-----|--------|-----|
| `delivery_point_id` | FK → delivery_points | CUSTOMER_ARCHITECTURE.md §6.2 | Teslimat noktası seçimi |
| `production_preferences` | `jsonb` | CUSTOMER_ARCHITECTURE.md §6.3 | Müşteri tercihlerinin kopyası |
| `label_spec` | `jsonb` | CUSTOMER_ARCHITECTURE.md §6.3 | Etiket spesifikasyonu |
| `packaging_profile` | `jsonb` | CUSTOMER_ARCHITECTURE.md §6.3 | Paketleme profili |

### 7.2. `order_lines` Tablosu

| Kolon | Tip | Kısıt | Açıklama |
|-------|-----|-------|----------|
| `id` | `char(26)` | PK | ULID |
| `order_id` | `char(26)` | NOT NULL, FK → orders (CASCADE) | Üst sipariş |
| `product_id` | `char(26)` | NOT NULL, FK → products (RESTRICT) | Ürün |
| `recipe_id` | `char(26)` | FK → recipes (RESTRICT, nullable) | Reçete |
| `width_mm` | `numeric(8,2)` | NOT NULL | Business Dimension — en |
| `height_mm` | `numeric(8,2)` | NOT NULL | Business Dimension — boy |
| `quantity` | `integer` | NOT NULL | Sipariş adedi |
| `completed_quantity` | `integer` | NOT NULL, DEFAULT 0 | Tamamlanan adet |
| `broken_quantity` | `integer` | NOT NULL, DEFAULT 0 | Kırılan adet |
| `notes` | `text` | nullable | Kalem notu |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL | |

### 7.3. `order_notes` Tablosu

| Kolon | Tip | Kısıt | Açıklama |
|-------|-----|-------|----------|
| `id` | `char(26)` | PK | ULID |
| `order_id` | `char(26)` | NOT NULL, FK → orders (CASCADE) | Üst sipariş |
| `note_text` | `text` | NOT NULL | Not içeriği |
| `is_internal` | `boolean` | NOT NULL, DEFAULT true | İç not mu? |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `created_by` | `char(26)` | nullable | |

### 7.4. Index'ler

Mevcut index'ler (schema'dan tespit edilen):

| Tablo | Index | Kolon | Tip |
|-------|-------|-------|-----|
| `orders` | (tenant_id, order_number) | Unique | Tenant-scoped unique — schema'daki yoruma göre |
| `production_events` | `idx_events_production_order_id` | production_order_id | B-tree |
| `production_queue_items` | `idx_queue_items_queue_id` | queue_id | B-tree |
| `production_queue_items` | `idx_queue_items_production_order_id` | production_order_id | B-tree |

**Not:** Diğer FK index'leri schema dosyalarında açıkça tanımlanmamış olabilir. Drizzle ORM'in default davranışına göre FK'lar otomatik index oluşturmaz.

### 7.5. Foreign Key'ler

| Parent | Child | FK Kolon | ON DELETE | ON UPDATE |
|--------|-------|----------|-----------|-----------|
| `tenants` | `orders` | `tenant_id` | RESTRICT | - |
| `factories` | `orders` | `factory_id` | RESTRICT | - |
| `customers` | `orders` | `customer_id` | RESTRICT | - |
| `orders` | `order_lines` | `order_id` | CASCADE | - |
| `products` | `order_lines` | `product_id` | RESTRICT | - |
| `recipes` | `order_lines` | `recipe_id` | RESTRICT | - |
| `orders` | `order_notes` | `order_id` | CASCADE | - |
| `order_lines` | `production_orders` | `order_line_id` | RESTRICT | - |

### 7.6. Check Constraint'ler

Schema'da açık check constraint tanımı bulunmamaktadır. Status değerleri TypeScript union tipi ile kontrol edilir, veritabanı seviyesinde check constraint yoktur.

---

## 8. Screen Tabs

### 8.1. Mevcut UI

UI_ARCHITECTURE.md'ye göre:
- `/orders` route'u tanımlanmış, `PagePlaceholder` ile placeholder durumunda
- `/queue` route'u Sprint 2.7.3'te canlı Production Queue sayfasına dönüştürülmüş
- Detay drawer'ı (`detail-drawer.tsx`) tanımlanmış: order detail + timeline

### 8.2. Sipariş Detayı İçin Tasarlanan Bileşenler

UI_ARCHITECTURE.md'de sipariş detay drawer'ı için tanımlanan bölümler:
- Status + Priority header
- Order Info card
- Glass Dimensions grid
- Recipe (if present)
- Notes (if present)
- Rework badge (if rework)
- Timeline with event dots

### 8.3. Sipariş Ekranında Beklenen Sekmeler (Henüz Tasarımı Yok)

Order modülü için müşteri detayındaki gibi (Genel, Üretim, İletişim, Kişiler, Teslimat Noktaları, Cam Kataloğu, Talimatlar) bir sekme yapısı **henüz tasarlanmamış veya implemente edilmemiştir.**

---

## 9. Business Rules

### 9.1. Kodda Implemente Edilmiş Kurallar

| # | Kural | Kaynak | İhlal Durumu |
|---|-------|--------|-------------|
| R1 | Sipariş sadece **aktif müşteri** için oluşturulabilir | `OrderService.create()` | `Error: Cannot create order: customer is inactive` |
| R2 | İptal edilmiş sipariş onaylanamaz | `OrderService.approveOrder()` | `Error: Cannot approve cancelled order` |
| R3 | Zaten onaylanmış sipariş tekrar onaylanamaz | `OrderService.approveOrder()` | `Error: Order already approved` |
| R4 | Onay sırasında müşteri aktif değilse reddedilir | `OrderService.approveOrder()` | `Error: Cannot approve order: customer is inactive` |
| R5 | Boş sipariş (0 kalem) onaylanamaz | `OrderService.approveOrder()` | `Error: Cannot approve empty order` |
| R6 | Ürün referansı olmayan kalem içeren sipariş onaylanamaz | `OrderService.approveOrder()` | `Error: Order line is missing product reference` |
| R7 | Üretimdeki veya tamamlanmış sipariş iptal edilemez | `OrderService.cancelOrder()` | `Error: Cannot cancel order in production or completed` |
| R8 | Onay sonrası her kalem için ProductionOrder oluşturulur | `OrderService.approveOrder()` | Otomatik — `PROD-{lineId}` formatı |
| R9 | İyimser kilitleme: `version` kolonu ile çakışma kontrolü | BaseRepository (design) | Talimatlar.md'de belirtilmiş, repository'de uygulanıyor |

### 9.2. Dokümanlarda Bahsedilmiş Ama Kodda Net Olmayan Kurallar

| # | Kural | Kaynak | Durum |
|---|-------|--------|-------|
| R10 | Sipariş silinemez (soft delete) | CUSTOMER_ARCHITECTURE.md | `orders` tablosunda `deletedAt`/`deletedBy` var, OrderRepository `softDelete: true` ile başlatılıyor |
| R11 | Bloke müşteri yeni sipariş alamaz | CUSTOMER_ARCHITECTURE.md §6.2 | `operationalBlock` JSONB'de tanımlı, sipariş servisinde kontrolü henüz yok |
| R12 | Sipariş, müşteri tercihlerini kopyalar (copy-on-write) | CUSTOMER_ARCHITECTURE.md §6.3 | Order JSONB alanları henüz yok, implemente edilmemiş |
| R13 | Varsayılan teslimat noktası yeni siparişte ön seçili gelir | CUSTOMER_ARCHITECTURE.md | Siparişte deliveryPointId alanı yok |
| R14 | Silinmiş teslimat noktası yeni siparişte seçilemez | CUSTOMER_ARCHITECTURE.md §6.2 | Implemente edilmemiş |
| R15 | Sipariş kalemi ölçüleri (Business Dimension) değişmez | ADR-2026-07-15-01 | Schema'da yorum olarak belirtilmiş, kodda enforce edilmiyor |

---

## 10. Integration Points

### 10.1. Customer Entegrasyonu

| Bağlantı | Yön | Detay |
|----------|-----|-------|
| `orders.customerId` → `customers.id` | Sipariş → Müşteri | Her sipariş bir müşteriye bağlıdır (NOT NULL) |
| Aktif müşteri kontrolü | Sipariş → Müşteri | `customer.isActive === false` → sipariş oluşturma/onaylama reddedilir |
| Müşteri tercihlerinin kopyalanması | Müşteri → Sipariş | **Henüz implemente edilmemiş.** Plan: Order JSONB alanlarına copy-on-write |
| Teslimat noktası | Müşteri → Sipariş | **Henüz implemente edilmemiş.** Plan: deliveryPointId FK |
| Bloke müşteri kontrolü | Sipariş → Müşteri | **Henüz implemente edilmemiş.** Plan: operationalBlock kontrolü |

### 10.2. Production Entegrasyonu

| Bağlantı | Yön | Detay |
|----------|-----|-------|
| `production_orders.orderLineId` → `order_lines.id` | Sipariş → Üretim | Onay anında her kalem için 1 ProductionOrder |
| `production_orders.widthMm/heightMm` | Sipariş → Üretim | Business Dimension kopyalanır |
| Sipariş durumu güncelleme | Üretim → Sipariş | Tüm kalemler tamamlanınca sipariş `completed` olur (ProductionService tarafından yönetilir) |
| Sayaçlar | Üretim → Sipariş | `order_lines.completedQuantity` / `brokenQuantity` üretim tarafından güncellenir |
| Sipariş iptali | Sipariş → Üretim | İptal edilen siparişin üretim emirleri durdurulur |

**Üretime Aktarılan Bilgiler:**

| Bilgi | Kaynak | Hedef |
|-------|--------|-------|
| Sipariş kalemi ID | `order_lines.id` | `production_orders.orderLineId` |
| En (Business Dimension) | `order_lines.widthMm` | `production_orders.widthMm` |
| Boy (Business Dimension) | `order_lines.heightMm` | `production_orders.heightMm` |
| Ürün tipi | `order_lines.productId` → `products` | `production_orders.productType` (service'de set edilir) |
| Sipariş numarası | `orders.orderNumber` | `production_orders.glassBarcode` = `G-{orderNumber}-{lineId[-4:]}` |
| Müşteri | `orders.customerId` | ProductionOrder üzerinde yok (orderLine üzerinden erişilir) |

**Üretimden Siparişe Dönen Bilgiler:**

| Bilgi | Kaynak | Hedef |
|-------|--------|-------|
| Tamamlanan adet | Cutting/Production | `order_lines.completedQuantity` |
| Kırılan adet | Breakage events | `order_lines.brokenQuantity` |
| Sipariş durumu | Production service | `orders.status` → `in_production` / `completed` |

### 10.3. Inventory Entegrasyonu

| Bağlantı | Yön | Durum |
|----------|-----|-------|
| Sipariş → Stok rezervasyonu | Sipariş onayında stok düşümü | **Henüz yok.** Stok etkileşimi kesim aşamasında olur |
| Malzeme tüketimi | Sipariş kalemi → Reçete → Malzeme | Reçete üzerinden teorik tüketim hesaplanır (Production Calculation Engine) |
| Fiili tüketim | Kesim operatörü `sheetsUsed` girişi | `cutting_results.sheetsUsed` ile kaydedilir |
| Mamul stoğu | Üretim tamamlanınca | Dispatch/READY pool üzerinden yönetilir |

**Önemli Tespit:** Sipariş ile stok arasında doğrudan bir bağlantı yoktur. Stok hareketleri:
- **Giriş:** Mal kabul (Goods Receipt) ile
- **Çıkış:** Üretim tüketimi (Cutting) ile
- **Sevkiyat:** Dispatch ile

Sipariş bu zincirin sadece başlangıç noktasıdır.

### 10.4. Dispatch Entegrasyonu

| Bağlantı | Detay |
|----------|-------|
| READY Pool | `DispatchService.getReadyOrderLines()` — sipariş kalemi bazında READY ürünleri gruplar |
| Sayaçlar | `getOrderLineDeliveryCounters()` — requested, ready, loaded, delivered, remaining |
| Kısmi teslimat | `completePartialDelivery()` — bazı kalemler teslim edilir, bazıları bekler |

Dispatch, sipariş kalemi (`orderLineId`) seviyesinde çalışır. Sipariş aggregate'i ile dispatch arasında doğrudan FK bağlantısı yoktur; bağlantı `production_orders → order_lines → orders` zinciriyle kurulur.

### 10.5. Pricing Entegrasyonu

**Mevcut Durum:** Siparişte fiyat bilgisi tutulmamaktadır.

| Fiyat Türü | Nerede? | Açıklama |
|-----------|---------|----------|
| Malzeme birim maliyeti | `inventory_lots.unitCost` | Lot bazında, immutable |
| Üretim maliyeti | Production Calculation Engine | Teorik hesaplama, henüz implementasyon aşamasında |
| Satış fiyatı | **Tutulmuyor** | GlassOS felsefesi gereği ERP'ye bırakılmıştır |

---

## 11. Event Flow

### 11.1. Order Modülü Tarafından Fırlatılan Event'ler

| Event | Fırlatan Metod | Ne Zaman? | Payload |
|-------|---------------|-----------|---------|
| `OrderApprovedEvent` | `OrderService.approveOrder()` | Transaction sonrası | eventType, orderId, orderNumber, customerId, approvedAt, approvedBy, lineCount |

### 11.2. Order Modülünü İlgilendiren Diğer Event'ler

| Event | Fırlatan Servis | Order'a Etkisi |
|-------|----------------|----------------|
| `CuttingSessionCompletedEvent` | CuttingExecutionService | `order_lines.completedQuantity` güncellenir |
| `BreakageRegisteredEvent` | CuttingExecutionService | `order_lines.brokenQuantity` güncellenir |
| `DeliveryCompletedEvent` | DispatchService | Sevkiyat sayaçları güncellenir |
| `PartialDeliveryCompletedEvent` | DispatchService | Kısmi sevkiyat sayaçları |

### 11.3. Event Akış Şeması

```
OrderService.approveOrder()
    │
    ├── Transaction
    │   ├── order.status = "confirmed"
    │   ├── For each line: create ProductionOrder
    │   └── (commit)
    │
    └── After commit
        └── EventPublisher.publish(OrderApprovedEvent)
                │
                └── [Future] Background job: ERP sync, notification, etc.
```

**Önemli Tespit:** 37 domain event tanımlanmış olmasına rağmen, **hiçbiri gerçek bir EventPublisher'a publish edilmemektedir.** Event'ler sadece interface olarak tanımlanmış ve servislerden return edilmektedir. `SERVICE_ARCHITECTURE.md` §3.3'te bu durum açıkça belirtilmiştir.

---

## 12. State Machine

### 12.1. Sipariş Durum Makinesi (Detaylı)

```
                    ┌──────────────┐
                    │    DRAFT     │
                    │  (başlangıç) │
                    └──────┬───────┘
                           │
                  approveOrder()
                  (validasyonlar)
                           │
                    ┌──────▼───────┐
           ┌────────│  CONFIRMED   │────────┐
           │        └──────┬───────┘        │
           │               │                │
           │     Üretim başlıyor             │
           │       (ilk kalem)              │
           │               │                │
           │        ┌──────▼───────┐        │
           │        │IN_PRODUCTION │        │ cancelOrder()
           │        └──────┬───────┘        │
           │               │                │
           │     Tüm kalemler               │
           │     tamamlandı                  │
           │               │                │
           │        ┌──────▼───────┐  ┌─────▼────────┐
           │        │  COMPLETED   │  │  CANCELLED   │
           │        └──────────────┘  └──────────────┘
           │
           └── cancelOrder() ────────► CANCELLED (draft/confirmed only)
```

### 12.2. Geçiş Matrisi

| Durumdan | Duruma | Metod | Koşul |
|----------|--------|-------|-------|
| draft | confirmed | `approveOrder()` | Müşteri aktif, kalem var, ürün referansı tam |
| draft | cancelled | `cancelOrder()` | Her zaman |
| confirmed | cancelled | `cancelOrder()` | `status !== in_production && status !== completed` |
| confirmed | in_production | Üretim başlatma | İlk ProductionOrder `in_progress` olduğunda |
| in_production | completed | Tüm kalemler tamam | Tüm ProductionOrder'lar `completed` |
| in_production | cancelled | `cancelOrder()` | ❌ Reddedilir — hata fırlatır |

**Not:** `in_production → completed` geçişi OrderService'te değil, ProductionService'te yönetilir. Order servisi sadece onay ve iptal geçişlerini yönetir.

---

## 13. Validation Rules

### 13.1. Sipariş Oluşturma (`OrderService.create()`)

| # | Kural | Kod |
|---|-------|-----|
| V1 | Müşteri mevcut olmalı | `customerRepository.findById(input.customerId)` |
| V2 | Müşteri aktif olmalı | `customer.isActive === false` → hata |

### 13.2. Sipariş Onaylama (`OrderService.approveOrder()`)

| # | Kural | Kod |
|---|-------|-----|
| V3 | Sipariş mevcut olmalı | `orderRepository.findById(id)` |
| V4 | Sipariş iptal edilmemiş olmalı | `order.status !== "cancelled"` |
| V5 | Sipariş zaten onaylanmamış olmalı | `order.status !== "confirmed"` |
| V6 | Müşteri mevcut olmalı | `customerRepository.findById(order.customerId)` |
| V7 | Müşteri aktif olmalı | `customer.isActive === false` → hata |
| V8 | En az 1 sipariş kalemi olmalı | `lines.length === 0` → hata |
| V9 | Her kalemin productId'si olmalı | `!line.productId` → hata |

### 13.3. Sipariş İptal (`OrderService.cancelOrder()`)

| # | Kural | Kod |
|---|-------|-----|
| V10 | Sipariş mevcut olmalı | `orderRepository.findById(id)` |
| V11 | Üretimde veya tamamlanmış olmamalı | `status !== "in_production" && status !== "completed"` |

### 13.4. Validasyon (Toplu) (`OrderService.validateOrder()`)

| # | Kural |
|---|-------|
| V12 | Sipariş mevcut |
| V13 | Sipariş iptal edilmemiş |
| V14 | Müşteri mevcut |
| V15 | Müşteri aktif |
| V16 | En az 1 kalem var |

---

## 14. Permissions

### 14.1. API Seviyesinde (Order Controller)

| Endpoint | Metod | Rol |
|----------|-------|-----|
| `GET /orders` | List | Authenticated (herkes) |
| `GET /orders/:id` | Find by ID | Authenticated (herkes) |
| `POST /orders` | Create | Authenticated (herkes) |
| `PATCH /orders/:id` | Update | Authenticated (herkes) |
| `POST /orders/:id/approve` | Approve | `ProductionManager` veya üstü |
| `POST /orders/:id/cancel` | Cancel | `ProductionManager` veya üstü |
| `GET /orders/:id/lines` | List lines | Authenticated (herkes) |

### 14.2. Tenant İzolasyonu

Tüm sorgular `tenantId` ile filtrelenir:
- API seviyesinde: JWT'den alınan `tenantId` ile
- Repository seviyesinde: `buildWhereClause()` ile otomatik
- Veritabanı seviyesinde: RLS politikaları ile (henüz aktif değil — Sprint 2.6.1'de tespit edildi)

---

## 15. Open Questions

Bu bölümde, mevcut dokümanlardan cevaplanamayan sorular listelenmiştir:

| # | Soru | İlgili Bağlam |
|---|------|---------------|
| Q1 | Siparişin `in_production → completed` geçişi nasıl tetiklenir? Hangi servis hangi event ile bunu yapar? | OrderService'te bu geçiş yok, ProductionService'te olabilir |
| Q2 | Sipariş numarası (`orderNumber`) otomatik mi oluşturuluyor yoksa manuel mi giriliyor? | Schema'da `NOT NULL` ama default/generator tanımlı değil |
| Q3 | Kısmi sipariş teslimatında sipariş durumu ne olur? | Dispatch'te kısmi teslimat var ama sipariş durumuna etkisi dokümante edilmemiş |
| Q4 | Sipariş iptalinde ProductionOrder'lar ne olur? | `cancelOrder()` sadece sipariş durumunu güncelliyor, üretim emirlerine müdahale etmiyor |
| Q5 | Sipariş JSONB alanları (productionPreferences, labelSpec, packagingProfile) hangi sprintte eklenecek? | CUSTOMER_ARCHITECTURE.md'de tanımlanmış ama PLAN.md'de sprint atanmamış |
| Q6 | ERP'den sipariş import mekanizması nasıl çalışacak? | PLAN.md'de "CSV Import / API Poll / Manual Entry" olarak geçiyor ama detay yok |
| Q7 | Siparişte fiyatlandırma olmaması kararı kesin mi? | ADR'lerde açıkça belirtilmemiş, PLAN.md felsefesinden türetilmiş |

---

## 16. Conflicting Documentation

### 16.1. Çelişki: Sipariş JSONB Alanları

| Kaynak | İddia |
|--------|-------|
| CUSTOMER_ARCHITECTURE.md §6.3 | "The Order aggregate will store its own `production_preferences`, `label_spec`, `packaging_profile` as JSONB columns" |
| `schema/orders.ts` | Bu kolonlar **yok** |

**Sonuç:** Dokümanda tanımlanmış, kodda implemente edilmemiş. Henüz sprint planına atanmamış.

### 16.2. Çelişki: Teslimat Noktası Sipariş Bağlantısı

| Kaynak | İddia |
|--------|-------|
| CUSTOMER_ARCHITECTURE.md | Delivery point "selected per order" — siparişte teslimat noktası seçilebilir |
| `orders` tablosu | `deliveryPointId` FK alanı yok |

**Sonuç:** Dokümanda tanımlanmış, kodda implemente edilmemiş.

### 16.3. Çelişki: Sipariş Silme

| Kaynak | İddia |
|--------|-------|
| CUSTOMER_ARCHITECTURE.md §6.2 | "A soft-deleted delivery point must not appear in the delivery point selector for new orders" |
| OrderRepository | `softDelete: true` ile başlatılmış, `deletedAt/deletedBy` alanları mevcut |
| OrderService | Soft delete metodu implemente edilmemiş |

**Sonuç:** Repository soft delete'e hazır, servis katmanında soft delete metodu yok.

### 16.4. Çelişki: Sipariş Durumları

| Kaynak | İddia |
|--------|-------|
| SERVICE_ARCHITECTURE.md §4.1 | Sipariş akışında 5 durum: draft → confirmed → in_production → completed → cancelled |
| PLAN.md §2.1 | "Sipariş Bütünlüğü Kuralı" — tüm kalemler tamamlanmadan sipariş `completed` olamaz |
| Schema (orders.ts) | Status enum'da `in_production` var, geçiş kodu OrderService'te yok |

**Sonuç:** `in_production → completed` geçişi dokümanda var, kodda OrderService'te yok. Bu geçiş muhtemelen ProductionService'te olmalı.

### 16.5. Çelişki: Event Publishing

| Kaynak | İddia |
|--------|-------|
| SERVICE_ARCHITECTURE.md §3 | "The domain event system is architected to feed into the background job system" |
| SERVICE_ARCHITECTURE.md §4 | `OrderApprovedEvent` publish ediliyor |
| Sprint 2.6.1 audit | "37 domain event tanımlı ama hiçbiri publish edilmiyor" |

**Sonuç:** Event'ler servislerden return ediliyor ama `EventPublisher.publish()` çağrısı sadece `OrderService.approveOrder()` içinde yapılıyor. Diğer event'ler henüz publish edilmiyor.

---

## 17. Missing Information

### 17.1. Tanımlanmış Ama Uygulanmamış

| Konu | Kaynak | Plan Durumu |
|------|--------|-------------|
| Sipariş JSONB alanları (productionPreferences, labelSpec, packagingProfile) | CUSTOMER_ARCHITECTURE.md §6.3 | Sprint atanmamış |
| Siparişte teslimat noktası seçimi (deliveryPointId FK) | CUSTOMER_ARCHITECTURE.md | Sprint atanmamış |
| Bloke müşteri kontrolü (operationalBlock) | CUSTOMER_ARCHITECTURE.md | Sprint atanmamış |
| ERP'den sipariş import (CSV/API) | CUSTOMER_ARCHITECTURE.md §7 | Gelecek planı |
| Sipariş geçmişi/timeline UI | UI_ARCHITECTURE.md | Placeholder durumda |
| Sipariş liste ekranı (DataGrid + filtreleme + sayfalama) | UI_ARCHITECTURE.md | Placeholder durumda |

### 17.2. Hiç Tanımlanmamış

| Konu | Açıklama |
|------|----------|
| Sipariş ekranı sekme tasarımı | Müşteri detayındaki gibi sekme yapısı yok |
| Sipariş kalemi ekleme/çıkarma UI | Nasıl bir arayüz olacağı tanımlanmamış |
| Sipariş kopyalama | Sık kullanılan bir ERP özelliği, hiç bahsedilmemiş |
| Toplu sipariş işlemleri | CSV import dışında toplu onay/iptal gibi özellikler yok |
| Sipariş raporları | Hangi raporların olacağı tanımlanmamış |
| Sipariş iş akışı (onay akışı, rol bazlı onay) | Şu an tek adımda onay, çoklu onay akışı yok |
| Sipariş değişiklik geçmişi | Kim ne zaman değiştirdi bilgisi sadece audit log ile sınırlı |

---

## 18. Recommended Final Architecture

> **Bu bölüm, mevcut bilgilerin sentezidir. Yeni tasarım içermez.**

### 18.1. Mevcut Durumun Güçlü Yanları

| Özellik | Değerlendirme |
|---------|---------------|
| **Basit ve odaklı tasarım** | Sipariş sadece üretim için gerekli alanları içerir. ERP şişkinliği yok. |
| **Sıkı validasyon** | Onay akışında 7 farklı kural uygulanır. |
| **Order-Line Based tracking** | PLAN.md'nin değişmez prensibiyle uyumlu. |
| **Transaction güvenliği** | Tüm mutasyonlar `withTenantSession()` içinde. |
| **Repository katmanı** | Soft delete, tenant/factory scoping hazır. |
| **Event hazırlığı** | Event interface'leri ve yapısı hazır, publish mekanizması kurulmuş. |

### 18.2. Mevcut Durumun Zayıf Yanları

| Özellik | Değerlendirme |
|---------|---------------|
| **UI placeholder** | `/orders` sayfası henüz canlı değil. |
| **JSONB alanlar eksik** | Müşteri tercihlerinin siparişe kopyalanması implemente edilmemiş. |
| **Delivery point bağlantısı yok** | Siparişte teslimat noktası seçilemiyor. |
| **Fiyat bilgisi tamamen yok** | Müşteriye özel fiyat, birim fiyat, iskonto gibi alanlar yok. |
| **in_production → completed geçişi** | Bu geçişin nerede ve nasıl yapıldığı net değil. |
| **Event publish azlığı** | Sadece OrderApprovedEvent publish ediliyor. |
| **RLS henüz aktif değil** | 52 tabloda RLS politikası yok (Sprint 2.6.1 bulgusu). |

### 18.3. Mimari Karar: Sipariş Basit Kalmalı mı, ERP Özellikleri Eklenmeli mi?

Mevcut dokümanlardan çıkan net sonuç:

**GlassOS felsefesi:** Sipariş, ERP'den gelen talebin üretime aktarıldığı bir geçiş katmanıdır. Fiyat, iskonto, para birimi gibi ticari alanlar ERP'ye aittir.

**Buna rağmen, siparişin şu minimum alanları eksiktir:**
1. Teslimat noktası seçimi (`deliveryPointId`) — Sevkiyat için zorunlu
2. Müşteri tercihlerinin kopyası (`productionPreferences`, `labelSpec`, `packagingProfile` JSONB) — Üretim tutarlılığı için zorunlu
3. Bloke müşteri kontrolü — Operasyonel güvenlik için zorunlu

**Öneri:** Bu 3 eklenti, GlassOS felsefesini bozmaz. ERP'ye ait ticari alanlar (fiyat, iskonto, vade) eklenmemelidir.

### 18.4. Modülün Genel Durumu

| Boyut | Durum | Detay |
|-------|-------|-------|
| Veritabanı | ✅ %80 | 3 tablo mevcut, eksik JSONB alanları ve deliveryPointId |
| Servis | ✅ %85 | create, approve, cancel, update, validate — soft delete eksik |
| Repository | ✅ %90 | findPendingApproval, findApproved, findByCustomer vb. |
| API | ✅ %85 | 7 endpoint, ProductionManager rolü ile onay/iptal korumalı |
| UI | ❌ %10 | `/orders` placeholder, detay drawer'ı tasarlanmış ama canlı değil |
| Event | ⚠️ %30 | Sadece OrderApprovedEvent publish ediliyor |
| Test | ✅ %95 | Servis testleri mevcut (Sprint 2.5.0), repository testleri mevcut |
| Dokümantasyon | ⚠️ %70 | CUSTOMER_ARCHITECTURE.md kapsamlı, ORDER_ARCHITECTURE.md yok |

### 18.5. Bağımlılık Grafiği

```
┌──────────┐    ┌──────────┐
│ CUSTOMER │◄───│  ORDER   │
└──────────┘    └────┬─────┘
                     │
              ┌──────▼──────┐
              │  PRODUCTION │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
   ┌─────▼────┐ ┌───▼────┐ ┌───▼──────┐
   │ QUALITY  │ │DISPATCH│ │INVENTORY │
   └──────────┘ └────────┘ └──────────┘
```

---

> **Bu rapor, Sprint 5.0.0 kapsamında hazırlanmıştır.**  
> **Kaynak:** Repository'deki tüm .md dosyaları, TypeScript kaynak kodları, Drizzle ORM şemaları.  
> **Kural:** Yeni tasarım üretilmemiş, tahmin yapılmamış, sadece mevcut bilgi derlenmiştir.  
> **Sonraki Adım:** Bu rapor temel alınarak `ORDER_ARCHITECTURE.md` oluşturulması önerilir.
