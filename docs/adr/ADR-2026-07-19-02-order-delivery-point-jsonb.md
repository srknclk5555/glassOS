# ADR-2026-07-19-02: Order Delivery Point & JSONB Preference Columns

## Status
**Öneri — Karar Bekliyor**

## Context
CUSTOMER_ARCHITECTURE.md iddiaları ile gerçek `orders` şeması arasında fark var.

## Option (a): Dokümanı Koda Göre Düzelt

**Yapılacak:** CUSTOMER_ARCHITECTURE.md'deki §6 (Override Chain) ve §5 (FK diyagramı) bölümlerini güncelleyerek JSONB alanların ve `delivery_point_id`'nin henüz implemente edilmediğini belirt.

| Kalem | İşlem |
|-------|-------|
| §6 Override Chain tablosu | `delivery_point` satırını "🔜 Gelecek" olarak işaretle |
| §6.3 Copy-on-Write pattern | "Implementation planned — not yet in schema" notu ekle |
| §5 FK diagram | `production_order.order_id` → `order_line_id` olarak düzelt |
| §5.1 FK Matrix | orders.delivery_point_id satırını kaldır |

**Gerekçe:**
- ✅ Hiçbir kod/schema/migration değişikliği gerektirmez
- ✅ Architecture freeze korunur
- ✅ Sprint 2.10.x devam ederken ek iş yükü yok
- ❌ JSONB copy-on-write faydası henüz yok
- ❌ Teslimat noktası seçimi UI'da yapılamaz

## Option (b): orders Tablosuna Kolon Ekle + Migration

**Yapılacak:** Sırasıyla:
1. `orders` şemasına ekle: `deliveryPointId`, `productionPreferences` (JSONB), `labelSpec` (JSONB), `packagingProfile` (JSONB), `version` (integer)
2. `drizzle-kit generate` ile migration oluştur
3. Migration SQL'ini incele ve gerekirse manuel düzenle
4. `drizzle-kit migrate` ile uygula

| Kolon | Tip | Varsayılan | Açıklama |
|-------|-----|-----------|----------|
| `delivery_point_id` | `char(26)` | null, FK→delivery_points | Teslimat noktası |
| `production_preferences` | `jsonb` | null | Copy-on-write from customer |
| `label_spec` | `jsonb` | null | Copy-on-write from customer |
| `packaging_profile` | `jsonb` | null | Copy-on-write from customer |
| `version` | `integer` | 1 | Optimistic locking |

**Gerekçe:**
- ✅ CUSTOMER_ARCHITECTURE.md ile tutarlı
- ✅ Copy-on-write pattern kullanılabilir hale gelir
- ✅ Order UI'da teslimat noktası seçimi yapılabilir
- ❌ Migration gerektirir (mevcut DB'ye kolon ekleme)
- ❌ Mevcut seed data'ya varsayılan JSONB değerleri eklenmeli
- ❌ OrderService.create()'e copy-on-write mantığı eklenmeli

### Migration Tahmini

```sql
ALTER TABLE orders ADD COLUMN delivery_point_id char(26) REFERENCES delivery_points(id) ON DELETE RESTRICT;
ALTER TABLE orders ADD COLUMN production_preferences jsonb;
ALTER TABLE orders ADD COLUMN label_spec jsonb;
ALTER TABLE orders ADD COLUMN packaging_profile jsonb;
ALTER TABLE orders ADD COLUMN version integer NOT NULL DEFAULT 1;

CREATE INDEX idx_orders_delivery_point ON orders (delivery_point_id);
```

## Karşılaştırma

| Kriter | (a) Dokümanı Düzelt | (b) Kolon Ekle |
|--------|---------------------|----------------|
| **İş yükü** | ~15 dk (doküman edit) | ~2 saat (schema + migration + servis + test) |
| **Migration** | Gerekmez | Gerekir |
| **Architecture Freeze** | ✅ Korunur | ⚠️ Kırılır (schema değişir) |
| **UI'a etkisi** | UI teslimat noktası seçemez | UI teslimat noktası seçebilir |
| **Üretim verisi** | Sorun yok | Mevcut satırlara NULL gelir |
| **Doküman tutarlılığı** | ✅ Düzelir | ✅ Düzelir |
| **Hangi sprintte?** | Şimdi (Sprint 5.0.1) | Order UI Fazı ile birlikte |

## Karar
> **Size bırakıyorum:** (a) mı (b) mi?
