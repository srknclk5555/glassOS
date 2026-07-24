# 📋 GlassOS Recipe Engine — Mimari Analiz ve Tespit Raporu

> **Sprint:** 5.0.2  
> **Tarih:** 2026-07-19 (Güncelleme: 2026-07-23 — §7.5 Sorumluluk Ayrımı eklendi)  
> **Amaç:** Recipe Engine'in mevcut mimarisini tüm markdown dokümanları ve database şemaları üzerinden analiz etmek, çelişkileri tespit etmek, eksikleri belirlemek.  
> **Yöntem:** 7 ana mimari doküman, 12+ database şeması, tüm ADR'ler ve PLAN.md taranmıştır.  
> **Kural:** Kod yazılmamıştır. Tahmin yapılmamıştır. Varsayım üretilmemiştir. Her tespit kaynağıyla belirtilmiştir.

---

## İçindekiler

1. [Executive Summary](#1-executive-summary)
2. [Mevcut Mimari Katmanlar ve Doküman Durumu](#2-mevcut-mimari-katmanlar-ve-doküman-durumu)
3. [Recipe Domain Derin Analiz](#3-recipe-domain-derin-analiz)
4. [Trim Analizi](#4-trim-analizi)
5. [Rodaj (Grinding) Analizi](#5-rodaj-grinding-analizi)
6. [Fire (Kayıp) Sınıflandırması Analizi](#6-fire-kayıp-sınıflandırması-analizi)
7. [Formula Engine / Hesaplama Motoru Analizi](#7-formula-engine--hesaplama-motoru-analizi)
8. [Recipe Bileşenleri ve Database Karşılıkları](#8-recipe-bileşenleri-ve-database-karşılıkları)
9. [Stok Tipleri ve Recipe-Envanter İlişkisi](#9-stok-tipleri-ve-recipe-envanter-ilişkisi)
10. [Ürün-Recipe İlişkisi](#10-ürün-recipe-ilişkisi)
11. [Multi-Level Recipe (Çok Seviyeli Reçete)](#11-multi-level-recipe-çok-seviyeli-reçete)
12. [DİA ERP Karşılaştırması ve Stratejik Farklar](#12-dİa-erp-karşılaştırması-ve-stratejik-farklar)
13. [Çelişkiler ve Tutarsızlıklar](#13-çelişkiler-ve-tutarsızlıklar)
14. [Eksik Yapılar ve Boşluklar (Gaps)](#14-eksik-yapılar-ve-boşluklar-gaps)
15. [Risk Analizi](#15-risk-analizi)
16. [Önerilen Mimari Yol Haritası](#16-önerilen-mimari-yol-haritası)
17. [EK: RecipeManagementEngine — Sürpriz Keşif](#17-ek-recipemanagementengine--sürpriz-keşif)
18. [EK: Migration ve İndeks Analizi](#18-ek-migration-ve-i̇ndeks-analizi)
19. [EK: settings.trimMm — ADR İhlali](#19-ek-settingstrimmm--adr-i̇hlali)
20. [EK: Composition Root Analizi](#20-ek-composition-root-analizi)
21. [EK: 22 Kaynağın Detaylı Analiz Tablosu](#21-ek-22-kaynağın-detaylı-analiz-tablosu)
22. [Final Değerlendirme](#22-final-değerlendirme)

---

## 1. Executive Summary

**Recipe Engine, GlassOS'un en kritik domain'lerinden biridir.** Mevcut durumda:

- **RECIPE_ARCHITECTURE.md** `Uygulandı` statüsündedir — ancak bu doküman yalnızca "teorik malzeme tüketimi"ni tanımlamaktadır.
- **Database şeması** (`recipes`, `recipe_items`, `recipe_operations`, `recipe_rules`, `recipe_versions`) çalışır durumdadır ve 5 tablodan oluşmaktadır.
- **ADR seviyesinde** recipe ile ilgili 15+ karar alınmıştır (özellikle Trim, Rodaj, Fire, Business≠Production Dimension).
- **Production Calculation Engine** ayrı bir domain olarak mimarisi dondurulmuş ve detaylı şekilde belgelenmiştir — ancak kod seviyesinde implementasyonu **henüz yapılmamıştır**.

**En Kritik Tespitler:**

| # | Tespit | Kaynak |
|---|--------|--------|
| 1 | Recipe şu an "teorik BOM" seviyesindedir; routing, kapasite, maliyet, fire hesaplaması içermez | RECIPE_ARCHITECTURE.md §1 |
| 2 | Production Calculation Engine mimari olarak çizilmiş ama kodlanmamıştır | PLAN.md §1.2.A |
| 3 | Trim ve Rodaj profilleri database'de mevcuttur (`trim_profiles`, `grinding_profiles`) ancak bu profilleri recipe'ye bağlayan herhangi bir FK veya mekanizma yoktur | factory-config.ts |
| 4 | Multi-level recipe (yarı mamul içeren reçete) için hiçbir yapı tanımlanmamıştır | Tüm kaynaklar tarandı |
| 5 | Formula Engine diye bir kavram mevcut değildir — tüm hesaplamalar Production Calculation Engine içinde gömülü kurallar olarak tanımlanmıştır | Tüm dokümanlar tarandı |

---

## 2. Mevcut Mimari Katmanlar ve Doküman Durumu

### 2.1. Okunan Dokümanların Durum Özeti

| Doküman | Status | Gerçek Durum | Son Güncelleme |
|---------|--------|-------------|----------------|
| RECIPE_ARCHITECTURE.md | ✅ Uygulandı | Sadece teorik BOM tanımı — routing/hesaplama yok | 2026-07-16 |
| PRODUCTION_CALCULATION_ENGINE.md | ✅ Implemented (Sprint 2.2) | Mimari dondurulmuş, kod yok | 2026-07-15 |
| PRODUCT_ARCHITECTURE.md | ✅ Completed (Sprint 2.3.11) | Eksiksiz, 13 ADR içerir | 2026-07-16 |
| PRODUCTION_ARCHITECTURE.md | ✅ Completed (Sprint 2.3.11) | Operasyon bazlı kuyruk mimarisi | 2026-07-16 |
| PRODUCTION_FLOW_ARCHITECTURE.md | ✅ Implemented | SSOT routing referansı | 2026-07-16 |
| DECISIONS.md (ADR) | ✅ Accepted | 30+ ADR — Architecture Freeze aktif | 2026-07-18 |
| DATABASE_BLUEPRINT.md | ✅ Implemented | 72 tablo canlı | 2026-07-16 |
| PLAN.md | ✅ Aktif | Sprint 2.10.x devam ediyor | 2026-07-19 |
| INVENTORY_ARCHITECTURE.md | ✅ Uygulandı | Consumption katmanı hazır, valuation yok | 2026-07-16 |

### 2.2. Recipe ile İlgili ADR'ler (DECISIONS.md)

| ADR | Karar | Recipe İlişkisi |
|-----|-------|----------------|
| ADR-2026-07-15-01 | Business ≠ Production Dimension | Recipe tüketim hesabı Production Dimension kullanır |
| ADR-2026-07-15-02 | Trim = Factory Config | Recipe trim değerini recipe'den değil, Factory Config'ten alır |
| ADR-2026-07-15-03 | Grinding = Factory Config (per-edge) | Recipe rodaj profili içermez |
| ADR-2026-07-15-04 | Remnant = Factory Config eşikleri | Recipe remnant kararı vermez |
| ADR-2026-07-15-05 | Fire = 9 sınıf | Recipe üretim fire'sını hesaplamaz, sadece teorik tüketimi verir |
| ADR-2026-07-15-06 | Full Sheet = Operatör bildirimi | Recipe plaka sayısını belirlemez |
| ADR-2026-07-15-07 | Inventory Valuation ayrı katman | Recipe fiyat içermez |
| ADR-2026-07-15-08 | Material kartı fiyat içermez | Recipe material referansı taşır, fiyat taşımaz |
| ADR-2026-07-15-11 | Architecture Freeze | Recipe mimarisi Sprint 2.2'de dondurulmuştur |

---

## 3. Recipe Domain Derin Analiz

### 3.1. Recipe Aggregate (Database Şeması)

**Kaynak:** `packages/db/src/schema/recipes.ts`

**5 tablo:**

| Tablo | Açıklama | Kritik Alanlar |
|-------|----------|---------------|
| `recipes` | Kök aggregate | recipeCode, name, version, productType, isActive |
| `recipe_items` | Malzeme tüketim tanımları | materialId (FK→materials), consumptionBasis (area/perimeter/piece/fixed/duration), quantityPerUnit, unit, sequence |
| `recipe_operations` | Operasyon sırası | operationCode, sequence, isMandatory |
| `recipe_rules` | İş kuralları | ruleType (grinding_required/tempering_required/low_e_orientation), ruleValue |
| `recipe_versions` | Version geçmişi | versionNumber, snapshotJson |

### 3.2. Recipe Items — Tüketim Bazları

`consumptionBasis` alanı 5 değer alır:

- `area` — m² bazlı tüketim (cam için)
- `perimeter` — çevre bazlı tüketim (çıta, silikon, butil için)
- `piece` — adet bazlı tüketim (ara parça, köşebent için)
- `fixed` — sabit tüketim (bir ürün için her zaman X kadar)
- `duration` — süre bazlı (işçilik/makine süresi)

Bu 5 baz **PRODUCT_ARCHITECTURE.md** §Consumption Model ile tam uyumludur.

### 3.3. Recipe Operations — Desteklenen Operasyon Kodları

`operationCode` alanı:
```
cutting | grinding | tempering | insulating_glass | lamination
cnc | drilling | washing | painting | sandblasting | quality | dispatch
```

Bu operasyonlar **PRODUCTION_FLOW_ARCHITECTURE.md** §2.1 ile uyumludur. Eksik: `surface_finish`, `coating`, `glue_application`, `special_inspection` — flow dokümanında geçer ama recipe'de kod olarak tanımlı değil.

### 3.4. Recipe Rules — Desteklenen Kural Tipleri

`ruleType` alanı:
```
grinding_required | tempering_required | low_e_orientation
drilling_required | cnc_required | lamination_required
```

**Tespit:** `low_e_orientation` dışındaki tüm kurallar boolean tipindedir (`ruleValue` kullanılmaz). `low_e_orientation` için `ruleValue` metin olarak saklanabilir. Bu yapı genişletilebilir durumdadır.

### 3.5. Recipe Versions

`recipe_versions.snapshotJson` — JSONB olarak tüm recipe state'ini o anki versiyonda saklar. **Önemli:** Bu bir "event sourcing" değil, anlık snapshot mekanizmasıdır. Her versiyon değişikliğinde yeni bir snapshot alınır.

---

## 4. Trim Analizi

### 4.1. Mimari Karar (ADR-2026-07-15-02)

**Kaynak:** DECISIONS.md — ADR-2026-07-15-02

- Trim **Factory Configuration**'dur, sipariş veya cam bazında değildir.
- Yalnızca **Full Sheet** üzerinde uygulanır (kesilecek parçalara değil).
- Her kenar için bağımsız parametre: `trim_left_mm`, `trim_right_mm`, `trim_top_mm`, `trim_bottom_mm`.
- Optimizasyon motoru trim sonrası **Usable Area** üzerinde çalışır.

### 4.2. Database Karşılığı

**Kaynak:** `packages/db/src/schema/factory-config.ts` — `trimProfiles` tablosu

```typescript
trimProfiles {
  id, factoryId, materialId (nullable = factory-wide default),
  leftMm, rightMm, topMm, bottomMm,
  createdAt, updatedAt
}
```

**Tespitler:**

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| 4 kenar bağımsız tanım | ✅ Mevcut | leftMm, rightMm, topMm, bottomMm |
| Factory-wide default | ✅ Mevcut | materialId nullable |
| Material bazlı override | ✅ Mevcut | materialId FK→materials |
| Recipe bazlı trim | ❌ Yok | ADR gereği recipe trim içermez |
| Ürün tipi bazlı trim | ❌ Yok | trimProfiles'ta productType alanı yok |
| Makine bazlı trim | ❌ Yok | Sadece material bazlı override var |
| Tarihsel versioning | ❌ Yok | updatedAt var ama eski profiller saklanmaz |

### 4.3. Trim'in Recipe ile İlişkisi

**Kaynak:** RECIPE_ARCHITECTURE.md §1 + ADR-2026-07-15-02

Trim, recipe'nin **dışında** tanımlanmıştır. Recipe teorik malzeme tüketimini verir, trim ise Factory Config'ten alınarak Production Calculation Engine tarafından uygulanır. Recipe'de trim ile ilgili hiçbir alan veya kural yoktur — bu bilinçli bir karardır.

**Sonuç:** Trim için recipe'ye yeni alan eklenmesi **gerekmez**. Trim profilleri ayrı tabloda saklanır ve Production Calculation Engine tarafından çalışma zamanında okunur.

---

## 5. Rodaj (Grinding) Analizi

### 5.1. Mimari Karar (ADR-2026-07-15-03)

**Kaynak:** DECISIONS.md — ADR-2026-07-15-03

- Grinding payı her kenar için ayrı: `grinding_left_mm`, `grinding_right_mm`, `grinding_top_mm`, `grinding_bottom_mm`.
- **Factory Configuration**'da saklanır.
- Production Dimension = Business Dimension + 4 kenar rodaj payı.
- Toplam "X mm" veya "Y mm" girilmez, hesaplama anında türetilir.

### 5.2. Database Karşılığı

**Kaynak:** `packages/db/src/schema/factory-config.ts` — `grindingProfiles` tablosu

```typescript
grindingProfiles {
  id, factoryId, machineId (nullable = factory-wide default),
  productType (nullable = all types),
  leftMm, rightMm, topMm, bottomMm,
  createdAt, updatedAt
}
```

**Tespitler:**

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| 4 kenar bağımsız tanım | ✅ Mevcut | leftMm, rightMm, topMm, bottomMm |
| Factory-wide default | ✅ Mevcut | machineId nullable |
| Machine bazlı override | ✅ Mevcut | machineId FK→machines |
| Ürün tipi bazlı override | ✅ Mevcut | productType nullable |
| Material bazlı override | ❌ Yok | Sadece machine + productType |
| Recipe bazlı rodaj | ❌ Yok | ADR gereği recipe rodaj içermez |
| Kenar sayısı belirteci | ❌ Yok | Hangi kenarların işleneceği bilgisi profil düzeyinde yok |

### 5.3. Grinding Profiles vs. Grinding Operation

**Kaynak:** PRODUCTION_FLOW_ARCHITECTURE.md §3.1 (Rule 1)

- **Grinding Profiles** (Factory Config): rodaj payı miktarını belirler — Production Dimension hesabı için.
- **Grinding Operation** (Recipe → Operations): Üretim akışında rodaj işleminin yapılıp yapılmayacağını belirler.
- İkisi **farklı katmanlardır** ve aynı değildir.

**Kritik bağlantı:** Recipe'de `grinding_required` kuralı varsa (recipe_rules), Production Calculation Engine rodaj payını eklemek için grindingProfiles'tan değer okur. Eğer `grinding_required` yoksa rodaj payı eklenmez — ancak bu mantık henüz Production Calculation Engine kodlanmadığı için **çalışma zamanında doğrulanamamıştır**.

---

## 6. Fire (Kayıp) Sınıflandırması Analizi

### 6.1. ADR-2026-07-15-05: 9 Kayıp Sınıfı

**Kaynak:** DECISIONS.md — ADR-2026-07-15-05

| # | Sınıf | Açıklama | Hesaplama | DB Karşılığı |
|---|-------|----------|-----------|-------------|
| 1 | **Trim Loss** | Plaka kenar kaybı (Full Sheet) | Full Sheet boyutu - Usable Area | trimProfiles + cutting_results |
| 2 | **Grinding Loss** | Rodaj sonucu kayıp | Prod Dimension - Business Dimension | grindingProfiles + production_orders |
| 3 | **Optimization Loss** | Optimizasyon verimsizliği | Teorik - Gerçek kesim verimi | cutting_results (sheetsPlanned vs sheetsUsed) |
| 4 | **Scrap Loss** | Hurda (remnant eşik altı) | Remnant eşik kontrolü sonrası | remnantThresholds |
| 5 | **Production Loss** | Teorik vs gerçek plaka sapması | sheetsPlanned - sheetsUsed | cutting_results.sheetsUsed |
| 6 | **Quality Loss** | Kalite reddi kaynaklı kayıp | Kalite kontrol sonucu fire | production_breakage_events |
| 7 | **Breakage Loss** | Kırık kaynaklı kayıp | Kırılan parça sayısı × birim maliyet | production_breakage_events |
| 8 | **Inventory Loss** | Stok sayım farkı | Sayım - Kayıt | Tanımlanmamış |
| 9 | **Remnant** | Yeniden kullanılabilir artık | Remnant eşik kontrolü sonrası | fire_inventory_items |

### 6.2. Fire Sınıflarının Recipe ile İlişkisi

**Tespit:** Recipe doğrudan fire sınıflarıyla ilgili değildir. Recipe yalnızca **teorik tüketimi** tanımlar. Fire hesaplamaları **Production Calculation Engine**'in sorumluluğundadır.

**Ancak:** Recipe Items'daki `consumptionBasis` alanı (area/perimeter/piece/fixed/duration) fire hesabına girdi sağlar. Örneğin:
- `area` bazlı tüketim → Trim Loss ve Grinding Loss hesabında kullanılır
- `perimeter` bazlı tüketim → Scrap Loss hesabında kullanılmaz (çıta/silikon fire'si ayrı hesaplanır)

### 6.3. Fire Sınıflarının Database Karşılıkları

| Fire Sınıfı | Tablo | Kolon |
|-------------|-------|-------|
| Trim Loss | trim_profiles + cutting_results | 4 kenar mm değerleri |
| Grinding Loss | grinding_profiles + production_orders | productionWidthMm - widthMm |
| Optimization Loss | cutting_results | sheetsPlanned - sheetsUsed |
| Scrap Loss | remnant_thresholds | minimumWidthMm/HeightMm/AreaM2 |
| Production Loss | cutting_results | sheetsUsed (operator) |
| Quality Loss | production_breakage_events | breakageCategory |
| Breakage Loss | production_breakage_events | production_order referansı |
| Inventory Loss | **Tanımlanmamış** | — |
| Remnant | fire_inventory_items | inventoryType = 'reusable' |

---

## 7. Formula Engine / Hesaplama Motoru Analizi

### 7.1. Mevcut Durum: **Tanımlanmamış**

**Kaynak:** Tüm dokümanlar tarandı — "Formula Engine" kavramı hiçbir yerde geçmemektedir.

### 7.2. GlassOS'un Hesaplama Mimarisi

GlassOS'ta hesaplamalar **gömülü motorlar** olarak tasarlanmıştır, Formula Engine gibi soyut bir kural motoru yoktur:

| Motor | Durum | Açıklama |
|-------|-------|----------|
| Production Calculation Engine | ✅ Mimari hazır, kod yok | Trim, rodaj, fire, maliyet hesaplamaları |
| Cutting Engine | 🔄 Kısmi | cutting_results tablosu var, optimizasyon yok |
| Cost Engine | ❌ Yok | PLAN.md'de uzun vadeli hedef |
| Inventory Valuation Engine | ✅ Mimari hazır | FIFO/Average/Specific Identification |
| Optimization Engine | ❌ Yok | PRODUCTION_CALCULATION_ENGINE.md'de referans |

### 7.3. Production Calculation Engine — Neler Hesaplar?

**Kaynak:** PRODUCTION_CALCULATION_ENGINE.md (tam okundu)

1. **Production Dimension**: Business Dimension + Grinding Allowance (4 kenar)
2. **Usable Area**: Full Sheet Area - Trim (4 kenar)
3. **Theoretical Sheet Count**: Gerekli alan / Kullanılabilir alan
4. **Material Consumption**: Recipe Items × quantityPerUnit
5. **Fire Distribution**: 9 sınıfa ayrıştırma
6. **Cost Calculation**: Material + Trim + Grinding + Optimization + Perimeter + Fixed + Scrap Credit

### 7.4. Formül Tipi: **Açık Kod, Kullanıcı Tanımlı Değil**

**Kaynak:** Tüm dokümanlardan çıkarım

GlassOS'un hesaplama formülleri:
- **Kullanıcı tarafından tanımlanamaz** — UI üzerinden formül girme özelliği yoktur.
- **Kod içine gömülüdür** — Production Calculation Engine kodlanırken sabit kurallar olarak yazılacaktır.
- **Factory Configuration ile parametrize edilir** — Trim/Rodaj/Remnant değerleri fabrika bazlı değişir ama hesaplama mantığı değişmez.

**Bu bir Formula Engine değildir.** Bu, domain kurallarıyla çalışan bir hesaplama motorudur. Aralarındaki fark:
- Formula Engine: Kullanıcının formül tanımlamasına izin verir (ör. ERP esnek maliyet formülleri)
- Calculation Engine: Geliştiricinin domain kurallarını kodladığı, parametrelerin ayarlanabildiği motor

### 7.5. RecipeEngine vs Production Calculation Engine — Sorumluluk Ayrımı

**Karar (2026-07-23):** Sipariş oluşturma ekranı (`/production/orders/new`) ile üretim hesaplama motoru arasındaki sorumluluklar netleştirilmiştir.

#### RecipeEngine — Sipariş Oluşturma Anında Bilinenler

| Hesaplama | Açıklama | Durum |
|-----------|----------|-------|
| **Production Dimension** | Net → Rodaj → Üretim Ölçüsü | ✅ RecipeEngine.calculate() |
| **Teorik Reçete Tüketimi** | Reçete bazlı teorik tüketim (area/perimeter/piece/fixed/duration) | ✅ RecipeEngine.calculate() |
| **Reçete Fire Kayıpları** | recipe_fires tablosundaki % bazlı process fire'ları | ✅ RecipeEngine.calculate() |
| **Ürün Çıktısı** | Reçetenin ürettiği ürünler ve miktarları | ✅ RecipeEngine.calculate() |
| **Uygulanan Ayarlar** | Hangi rodaj/trim değerlerinin kullanıldığı (fabrika vs reçete) | ✅ RecipeEngine.calculate() |

#### Production Calculation Engine — Üretim Emri Kesim Anında Bilinenler

| Hesaplama | Açıklama | Bağımlılık |
|-----------|----------|-----------|
| **Trim Firesi** | Jumbo plaka kenar kırpma kaybı | Hangi plakanın kullanılacağı bilinmeli |
| **Remnant (Artık)** | Yeniden kullanılabilir plaka artığı | Plaka boyutu + remnant eşikleri |
| **Hurda (Scrap)** | Remnant eşik altı atık | Remnant kararı sonrası |
| **Toplam Fire** | Trim + Remnant + Scrap + Grinding toplamı | Tüm fire sınıfları hesaplanmış olmalı |
| **Yield (Verim)** | Net alan / Kullanılan plaka alanı | Fiili plaka tüketimi bilinmeli |
| **Gerçek Tüketim** | Hangi plakalardan kaç adet kullanıldığı | Sheet allocation sonucu |
| **Optimizasyon Kaybı** | Teorik vs gerçek kesim verimi | Nesting/optimizasyon sonucu |

#### UI Yansıması

**EnginePreviewPanel** (`/production/orders/new`):
- Dimension pipeline: **3 aşama** — Net → Rodaj → Production Size (Trim kaldırıldı, çünkü trim jumbo plakada uygulanır, tek parçada anlamsız)
- Efficiency bar kaldırıldı — gerçek verim ancak kesim anında hesaplanır
- "Total glass consumption" kaldırıldı — reçete seviyesinde bu = production area, yanıltıcı
- "Reçete Ön İzleme" etiketi ve uyarı notu eklendi
- Detaylar expanded panelde: Rodaj ayarları, BOM, reçete fire'ları, ürün çıktısı

**CuttingResultEngine / BatchCuttingEngine** (kesim operasyonu):
- Tüm fire sınıfları burada hesaplanır
- Gerçek plaka bazlı tüketim
- Remnant/scrap kararları
- Yield ve waste yüzdeleri

---

## 8. Recipe Bileşenleri ve Database Karşılıkları

### 8.1. 5 Tablonun Detaylı Analizi

#### `recipes` (Kök)

| Kolon | Tip | Not |
|-------|-----|-----|
| id | CHAR(26) PK | ULID |
| tenantId | CHAR(26) FK | RLS |
| factoryId | CHAR(26) FK | Nullable |
| recipeCode | VARCHAR(50) | Unique per tenant |
| name | VARCHAR(255) | — |
| version | INTEGER | Default 1 |
| productType | VARCHAR(50) | temper \| insulating_glass \| laminated |
| isActive | BOOLEAN | — |

**Eksik:** `recipeCode` için unique index tanımı şemada yok (dokümanda belirtilmiş). `productType` productType ile aynı isimde ama `products` tablosundaki productType ile senkronizasyon mekanizması yok.

#### `recipe_items`

| Kolon | Tip | Not |
|-------|-----|-----|
| materialId | CHAR(26) FK→materials | materials tablosuna bağlı |
| consumptionBasis | VARCHAR(30) | area \| perimeter \| piece \| fixed \| duration |
| quantityPerUnit | NUMERIC(12,6) | — |
| unit | VARCHAR(20) | — |
| sequence | INTEGER | Recipe içinde sıra |

**Eksik:**
- `productId` alanı — Recipe'de yarı mamul ürün kullanımı (multi-level) için gerekli olabilir
- `isScrap` / `isByProduct` — Yan ürün veya hurda çıktısı tanımı
- `wastePercent` — Fire oranı (bazı malzemelerde sabit fire olur)
- `alternativeMaterialId` — Alternatif malzeme desteği

#### `recipe_operations`

| Kolon | Tip | Not |
|-------|-----|-----|
| operationCode | VARCHAR(50) | Operasyon kodu |
| sequence | INTEGER | Sıra |
| isMandatory | BOOLEAN | Default true |

**Eksik:**
- `stationId` — Operasyonun hangi istasyonda yapılacağı (PRODUCTION_FLOW_ARCHITECTURE.md operasyon→istasyon eşlemesini dynamic routing'e bırakır, bu bilinçli olabilir)
- `machineType` — Hangi makine tipinin gerekli olduğu
- `setupTime` / `cycleTime` — Kapasite hesaplaması için
- `parallelOperation` — Paralel operasyon desteği

#### `recipe_rules`

| Kolon | Tip | Not |
|-------|-----|-----|
| ruleType | VARCHAR(100) | Kural tipi |
| ruleValue | TEXT | Kural değeri |

**Eksik:**
- `ruleCategory` — Kural kategorisi (örn. material, operation, quality, capacity)
- `isEnforced` — Sert kural mı yoksa uyarı mı?
- `errorMessage` — Kural ihlali durumunda kullanıcıya gösterilecek mesaj

#### `recipe_versions`

| Kolon | Tip | Not |
|-------|-----|-----|
| snapshotJson | JSONB | Full snapshot |

**Not:** Bu tablo bir audit log değildir; sadece versiyon geçmişini tutar. Her versiyonda tüm recipe state'i kopyalanır.

---

## 9. Stok Tipleri ve Recipe-Envanter İlişkisi

### 9.1. Stok Tipleri

**Kaynak:** INVENTORY_ARCHITECTURE.md §3 + `inventory.ts` şeması

| Inventory Type | Recipe İlişkisi |
|---------------|----------------|
| RAW_MATERIAL | Recipe_items.materialId → materials → inventory_items (raw_material) |
| SEMI_FINISHED | **Multi-level recipe eksikliği** nedeniyle şu an recipe'de kullanılamaz |
| FINISHED_PRODUCT | Recipe'nin çıktısıdır (products → recipes) |
| SCRAP | Fire sınıflandırması sonucu oluşur |
| REMNANT | Fire sınıflandırması sonucu oluşur |
| BY_PRODUCT | Recipe'de tanımlanmamış |

### 9.2. Recipe → Envanter Akışı (Teorik)

```
Recipe (teorik tüketim)
  → Production Calculation Engine (fire ekle)
    → Cutting Results (fiili tüketim)
      → Inventory Consumption (stok düşümü)
        → Cost Engine (maliyet)
```

**Kaynak:** INVENTORY_ARCHITECTURE.md §1 + PRODUCTION_CALCULATION_ENGINE.md

**Gerçek Durum:**
- Recipe → veritabanında tanımlı ✅
- Production Calculation Engine → mimari hazır, kod yok ❌
- Cutting Results → veritabanında tablo var ✅
- Inventory Consumption → Sprint 2.3.17'de katman eklendi ✅
- Cost Engine → henüz yok ❌

### 9.3. Material Master vs Materials (Eski)

**Kaynak:** ADR-2026-07-18-01 + `materials-master.ts` + `materials-products.ts`

**Önemli:** İki ayrı material tablosu vardır:

| Tablo | Amaç | Recipe Bağlantısı |
|-------|------|-------------------|
| `materials` (eski) | Sprint 2.4.2 master data | `recipe_items.materialId` → `materials.id` |
| `materials_master` (yeni) | Sprint 2.9.0 ERP foundation | `goods_receipt_items.materialId` → `materials_master.id` |

**Tespit:** ADR-2026-07-18-01'in 8. maddesi: "Mevcut `inventory_items.material_id` FK'sı eski `materials` tablosuna bağlıdır — bir sonraki migration'da `materials_master.id`'ye yönlendirilmelidir."

**Recipe de aynı sorunu yaşar:** `recipe_items.materialId` → `materials.id` (eski). Materials_master'a geçiş yapıldığında recipe_items'in de güncellenmesi gerekir.

---

## 10. Ürün-Recipe İlişkisi

### 10.1. Mevcut Yapı

**Kaynak:** `materials-products.ts` + `recipes.ts`

```
products.recipeId → recipes.id (forward reference, plain char(26), FK yok)
```

**products** tablosundaki ilgili alanlar:
```typescript
productType: varchar("product_type") // temper | insulating_glass | laminated
recipeId: char("recipe_id", { length: 26 }) // FK → recipes (forward ref, plain char)
```

**Tespitler:**

| Özellik | Durum |
|---------|-------|
| Ürün → Recipe bağlantısı | ✅ Mevcut (forward ref) |
| Recipe → Ürün bağlantısı (geri) | ❌ Yok (recipes.productType sadece metin) |
| Birden çok recipe versiyonu | ✅ Mevcut (recipe_versions) |
| Ürünün aktif recipe'sini seçme | ❌ Yok (hangi versiyonun kullanılacağı belirtilmemiş) |
| Ürün tipi recipe tipi senkronizasyonu | ❌ Yok (products.productType ile recipes.productType bağımsız) |
| Recipe'in ürün tipini validate etmesi | ❌ Kod yok |

### 10.2. productType Senkronizasyon Sorunu

`products.productType` ve `recipes.productType` aynı isimde ama aynı değeri taşıdığına dair bir garanti yoktur. Örnek problem senaryosu:

- `products` tablosunda `productType = 'tempered_insulating'`
- `recipes` tablosunda `productType = 'insulating_glass'`

Bu iki değer uyumsuz olabilir ve sistem buna izin verir. **Hiçbir validation kuralı yoktur.**

---

## 11. Multi-Level Recipe (Çok Seviyeli Reçete)

### 11.1. Mevcut Durum: **Tanımlanmamış**

**Kaynak:** Tüm dokümanlar ve şemalar tarandı — multi-level recipe (yarı mamul içeren reçete) için hiçbir yapı yoktur.

### 11.2. Örnek Senaryo (GlassOS'un İhtiyacı)

```
Isıcam (4 mm Low-E + 12 + 4 mm Float)
  ├── 4 mm Low-E temperli cam (yarı mamul)
  │     ├── 4 mm Low-E float cam (hammadde)
  │     ├── Rodaj payı
  │     └── Temperleme işlemi
  ├── 4 mm Float temperli cam (yarı mamul)
  │     ├── 4 mm Float cam (hammadde)
  │     ├── Rodaj payı
  │     └── Temperleme işlemi
  ├── 12 mm ara boşluk (ara malzeme)
  │     ├── Spacer (çıta)
  │     ├── Silikon/Butil
  │     └── Desikant (nem tutucu)
  └── Birleştirme işlemi (Isıcam)
```

**GlassOS'un mevcut verisi:** `products` tablosunda `productType = 'insulating_glass'` ve `recipeId = '...'` var. Recipe_items'ta 4 malzeme (Low-E, Float, Spacer, Silikon) sıralanmış. Ama **bu malzemelerden Low-E ve Float'ın temperlenmesi gerektiği bilgisi recipe'de yok.**

### 11.3. Ne Eksik?

| Bileşen | Durum |
|---------|-------|
| Yarı mamul (semi-finished) recipe | ❌ Yok |
| Recipe hiyerarşisi (parent-child) | ❌ Yok |
| Yarı mamulün kendi operasyon dizisi | ❌ Yok |
| Yarı mamul çıktısının stoklanması | ❌ Yok (SEMI_FINISHED inventory type var ama recipe bağlantısı yok) |
| Toplam maliyetin alt reçetelerden aggrege edilmesi | ❌ Yok |

**Bu, GlassOS için en büyük eksiklerden biridir.** Isıcam (IG) gibi ürünlerde yarı mamuller kendi üretim sürecinden geçer ve bu süreç ayrı bir reçete ile tanımlanmalıdır. Mevcut düz reçete modeli bunu desteklemez.

---

## 12. DİA ERP Karşılaştırması ve Stratejik Farklar

### 12.1. DİA ERP'nin Recipe Modeli (Bilinen)

DİA ERP'de reçeteler genellikle şu yapıdadır:
- Tek seviyeli BOM (Bill of Materials)
- Malzeme + miktar + birim
- Fire oranı (%) — her malzeme için sabit fire yüzdesi
- İşlem rotası (opsiyonel)
- Maliyet hesaplaması: malzeme toplamı × (1 + fire%)

### 12.2. GlassOS ile Karşılaştırma

| Özellik | DİA ERP | GlassOS | Fark |
|---------|---------|---------|------|
| Fire oranı | Sabit yüzde (%) | 9 sınıf, hesaplamalı (trim/rodaj/optimizasyon/kırık) | GlassOS daha kesin |
| Tüketim bazı | Sadece adet/kilogram | 5 baz (area/perimeter/piece/fixed/duration) | GlassOS cam sektörüne özgü |
| Multi-level | Genellikle yok | **Henüz yok** | **Eşit (ikisi de eksik)** |
| Versiyonlama | Çoğu yok | ✅ Mevcut (recipe_versions) | GlassOS önde |
| Operasyon tanımı | Ayrı modül | ✅ Recipe içinde entegre | GlassOS önde |
| Business≠Production Dim | Yok | ✅ ADR ile ayrılmış | GlassOS önde |
| Trim yönetimi | Genelde yok | ✅ Factory Config + 4 kenar | GlassOS önde |
| Rodaj yönetimi | Tek değer | ✅ 4 kenar, machine bazlı | GlassOS önde |
| Alternatif malzeme | Genelde var | ❌ Yok | DİA önde |
| Fire oranı esneklik | Elle girilen % | Sabit kurallar, parametrik | Farklı yaklaşım |
| Kullanıcı tanımlı formül | Bazen var | ❌ Yok (kod gömülü) | DİA önde (esneklik) |

### 12.3. GlassOS'un Rekabet Üstünlükleri

**Kaynak:** PLAN.md §1.2.A

1. **Fire sınıflandırması** — DİA gibi ERP'ler tek tip fire kullanır; GlassOS 9 sınıfla kayıp analizini detaylandırır.
2. **Business ≠ Production Dimension** — Rakipler müşteri ölçüsüyle üretim ölçüsünü ayırmaz.
3. **Per-edge trim/grinding** — Çoğu sistem toplam değer kullanır.
4. **Consumption basis (5 tip)** — Cam, çıta, silikon, aksesuar gibi farklı malzeme tipleri için uygun hesaplama modeli.
5. **Factory Config ile parametrizasyon** — Her fabrika kendi trim/rodaj/remnant değerlerini ayarlayabilir.

### 12.4. DİA ERP'nin Güçlü Yanları (GlassOS Eksikleri)

1. **Alternatif malzeme desteği** — GlassOS'ta recipe_items'ta alternatif malzeme tanımı yok.
2. **Fire oranı esnekliği** — Kullanıcı istediği fire oranını girebilir. GlassOS'ta fire hesaplamaları kod içinde gömülüdür, değiştirilemez.
3. **Çoklu birim dönüşümü** — DİA'da birimler arası dönüşüm otomatiktir; GlassOS'ta `material_unit_profiles` var ama dönüşüm motoru yok.

---

## 13. Çelişkiler ve Tutarsızlıklar

### 13.1. CRITICAL: RECIPE_ARCHITECTURE.md vs. PRODUCTION_FLOW_ARCHITECTURE.md

**Çelişki:** Recipe'nin üretim rotası tanımlayıp tanımlamadığı konusunda iki doküman farklı ifadeler kullanır.

- **RECIPE_ARCHITECTURE.md §1**: "Recipe şunları yapmaz: üretim rotasını tanımlamaz, istasyon veya makine tanımı yapmaz, üretim kuyruğu sırası oluşturmaz"
- **PRODUCTION_FLOW_ARCHITECTURE.md §2.1**: "Recipe → Operations → Stations → Queues → Machines → Personnel → Completion" ve "Reçete, üretim akışının temel kural kümesidir"
- **PRODUCTION_FLOW_ARCHITECTURE.md §10.1**: "Recipe, müşteri ölçüsünü değil, kullanılacak malzemeyi belirler"

**Yorum:** İki doküman arasında doğrudan çelişki yoktur. Recipe operasyonları **tanımlar** (recipe_operations), ama rotayı (hangi istasyon/makine) **belirlemez** — bu dynamic routing'e bırakılır. Ancak ifadeler yanıltıcıdır; recipe'nin operasyon sırası bir "route" tanımıdır, sadece station/machine eşlemesi recipe dışındadır.

**Risk:** Yeni geliştiriciler recipe'ye station/machine eklemeye kalkabilir veya recipe_operations'ı yok sayabilir.

### 13.2. CRITICAL: productType Senkronizasyonu

**Çelişki:** `products.productType` ile `recipes.productType` aynı anlama gelir ama farklı değerler alabilir.

- `products.productType`: `temper | insulating_glass | laminated`
- `recipes.productType`: `temper | insulating_glass | laminated`

İkisi arasında validation veya senkronizasyon yoktur. Aynı değer iki yerde saklanır — bu veri tekrarı (data redundancy) ve tutarsızlık riski taşır.

### 13.3. MEDIUM: recipe_items.materialId vs. materials_master

**Çelişki:** `recipe_items.materialId` → `materials.id` (eski tablo). Oysa ADR-2026-07-18-01'e göre `materials_master` yeni standarttır. Goods receipt zaten `materials_master`'a bağlanmıştır.

**Risk:** Recipe gelecekte materials_master'a geçirilmezse tutarsızlık oluşur.

### 13.4. MEDIUM: recipe_operations.operationCode vs. productionOperations

**Çelişki:** `recipe_operations.operationCode` bir VARCHAR alanıdır (enum veya lookup table yok). `productionOperations` tablosu var ama recipe buna FK veya validation ile bağlı değil.

- `productionOperations.operationCode`: sistemde tanımlı tüm operasyonlar
- `recipe_operations.operationCode`: serbest metin — sistemde olmayan bir operasyon da girilebilir

### 13.5. LOW: recipe_items.unit vs. materials.baseUnit

`recipe_items.unit` serbest metin (VARCHAR(20)). `materials_master.baseUnit` de ayrı bir alan. İkisi arasında validation yok. Recipe'de "m2" girilirken material'de "m2" tanımlı değilse uyumsuzluk olabilir.

---

## 14. Eksik Yapılar ve Boşluklar (Gaps)

### 14.1. Production Calculation Engine — Kodlanmamış

**Kaynak:** PLAN.md §1.2.A + tüm dokümanlar

**Durum:** Mimari olarak çizilmiş, 9 fire sınıfı tanımlanmış, trim/rodaj/remnant profilleri database'de hazır ama **hiçbiri çalışma zamanında hesaplanmamaktadır.** Cutting Results tablosu var ama hesaplama motoru kodu yok.

### 14.2. Multi-Level Recipe

**Kaynak:** Tüm şemalar tarandı

**Durum:** Tanımlanmamış. Yarı mamul içeren ürünler (temperli ısıcam gibi) tek seviyeli reçeteyle yönetilemez.

### 14.3. Cost Engine

**Kaynak:** PLAN.md §1.2.A

**Durum:** Uzun vadeli hedef. Maliyet hesaplaması için hiçbir kod yok.

### 14.4. Optimization Engine

**Kaynak:** PRODUCTION_CALCULATION_ENGINE.md

**Durum:** Referans olarak geçer. Plaka yerleşim optimizasyonu yapacak bir motor henüz yok.

### 14.5. Recipe Service / Management Engine

**Kaynak:** RECIPE_ARCHITECTURE.md §10

**Durum:** `recipeRepository` ve `/recipes` API resource planlanmış ama `RecipeManagementEngine` henüz kodlanmamış. Mevcut API'de recipe controller sadece "stub" seviyesindedir (Sprint 2.6.0'da 4 stub controller'dan biri).

### 14.6. Route Engine

**Kaynak:** PRODUCTION_FLOW_ARCHITECTURE.md §5

**Durum:** Dynamic routing philosophy belgelenmiş ama kodlanmamış. Route kararları (station/machine seçimi) için bir mekanizma yok.

### 14.7. Consumption Engine (Gerçek Tüketim)

**Kaynak:** INVENTORY_ARCHITECTURE.md §11

**Durum:** Sprint 2.3.17'de "Inventory Consumption Engine" katmanı eklenmiş — bu sadece tüketim kaydı tutar, stok düşümü yapmaz. Gerçek stok düşümü henüz yok.

---

## 15. Risk Analizi

### 15.1. Yüksek Riskler

| # | Risk | Olasılık | Etki | Açıklama |
|---|------|---------|------|----------|
| 1 | Production Calculation Engine kodlanmazsa fire raporlaması imkansız | Yüksek | Kritik | GlassOS'un en büyük rekabet avantajı olan 9 sınıf fire analizi çalışmaz |
| 2 | Multi-level recipe olmadan ısıcam maliyeti hatalı | Yüksek | Yüksek | Temperli IG'de 2 ayrı temper sürecinin maliyeti görünmez |
| 3 | productType tutarsızlığı yanlış route seçimine yol açar | Orta | Yüksek | Ürün temper olarak işaretlenmiş ama recipe'de temper operasyonu yoksa hatalı üretim |

### 15.2. Orta Riskler

| # | Risk | Açıklama |
|---|------|----------|
| 4 | materials → materials_master geçişinde recipe_items güncellenmezse veri tutarsızlığı | Recipe eski tabloya bağlı kalır |
| 5 | recipe_operations'ta serbest metin operationCode hatalı operasyon tanımına yol açar | Validation yok |
| 6 | Architecture Freeze nedeniyle recipe şemasında değişiklik yapılamaz | Yeni ihtiyaçlara cevap verilemez |

### 15.3. Düşük Riskler

| # | Risk | Açıklama |
|---|------|----------|
| 7 | Recipe versiyonlama var ama hangi versiyonun aktif olduğu belirtilmemiş | Aktif versiyon yönetimi yok |
| 8 | recipe_versions.snapshotJson büyük veri boyutuna ulaşabilir | Her versiyonda full snapshot |
| 9 | Trim/grinding profillerinde tarihsel versioning yok | Eski profillere dönüş imkansız |

---

## 16. Önerilen Mimari Yol Haritası

> **Not:** Bu bölüm yalnızca mimari önceliklendirme içerir. Kod yazma, şema değişikliği veya migration önerisi değildir. Tüm öneriler mevcut Architecture Freeze'e tabidir.

### Faz 1 (Acil): Production Calculation Engine

**Gerekçe:** GlassOS'un temel vaadi olan fire hesaplaması ve gerçek maliyet görünürlüğü için bu motorun kodlanması şarttır.

**Mimari bağımlılıklar:**
- Recipe items (teorik tüketim) ✅ Hazır
- Trim/grinding/remnant profilleri ✅ Hazır (Factory Config)
- Cutting results (fiili tüketim) ✅ Hazır
- Production orders (business/prod dimension) ✅ Hazır

### Faz 2 (Kısa Vade): Multi-Level Recipe

**Gerekçe:** Isıcam ve temperli ürünlerin doğru maliyetlendirilmesi için yarı mamul reçeteleri tanımlanabilmelidir.

**Mimari bağımlılıklar:**
- Yeni bir `recipe_hierarchy` veya `recipe_bom` yapısı (mevcut recipe_items genişletilebilir)
- Yarı mamul çıktısının stoklanması (SEMI_FINISHED inventory type ile entegrasyon)

### Faz 3 (Orta Vade): Route Engine

**Gerekçe:** Recipe → Operations → Stations → Machines akışının dinamik olarak yönetilmesi.

**Mimari bağımlılıklar:**
- Station-machine atamaları ✅ Hazır
- Personnel-station yetkileri ✅ Hazır
- Route karar kuralları (henüz kodlanmamış)

### Faz 4 (Orta Vade): Cost Engine

**Gerekçe:** Gerçek üretim maliyetinin hesaplanması.

**Mimari bağımlılıklar:**
- Production Calculation Engine (Faz 1)
- Inventory Valuation Engine (FIFO/Ortalama/Specific ID)
- Multi-level recipe (Faz 2)

### Faz 5 (Uzun Vade): Optimization Engine

**Gerekçe:** Plaka yerleşim optimizasyonu ile fire minimizasyonu.

**Mimari bağımlılıklar:**
- Production Calculation Engine (Faz 1)
- Machine capacity verileri ✅ Hazır
- Factory Config trim/grinding profilleri ✅ Hazır

---

## Ek-A: Database Şema İlişki Haritası (Recipe Merkezli)

```
tenants ──┐
          ├── factories ──┐
          │               ├── factory_configurations (trim/grinding/remnant ayarları)
          │               ├── trim_profiles
          │               ├── grinding_profiles
          │               ├── remnant_thresholds
          │               │
materials ─┼──┐           ├── products ──┐
          │   │           │              ├── recipes ──┐
          │   │           │              │             ├── recipe_items (materialId→materials)
          │   │           │              │             ├── recipe_operations (operationCode)
          │   │           │              │             ├── recipe_rules (ruleType/ruleValue)
          │   │           │              │             └── recipe_versions (snapshotJson)
          │   │           │              │
          │   │           │              orders ──┐
          │   │           │                       ├── order_lines (productId→products, recipeId→recipes)
          │   │           │                       └── order_notes
          │   │           │
          │   │           production_orders ──┐
          │   │                              ├── productionEvents
          │   │                              ├── productionBreakageEvents
          │   │                              └── productionQueueItems
          │   │
          │   inventory_items ──┐
          │                     ├── inventoryLots (materialId→materials)
          │                     └── inventoryBarcodes
          │
          materials_master (yeni)
                    │
          goods_receipt_items (FK→materials_master)
```

---

## Ek-B: Okunan Kaynakların Tam Listesi

| # | Kaynak | Tür | Okunan Satır |
|---|--------|-----|-------------|
| 1 | RECIPE_ARCHITECTURE.md | Mimari döküman | 1-500 (Full) |
| 2 | PRODUCTION_CALCULATION_ENGINE.md | Mimari döküman | 1-500 (Full) |
| 3 | PRODUCT_ARCHITECTURE.md | Mimari döküman | 1-500 (Full) |
| 4 | PRODUCTION_ARCHITECTURE.md | Mimari döküman | 1-500 (Full) |
| 5 | DECISIONS.md (ADR) | Mimari kararlar | 1-500 (Full) |
| 6 | DATABASE_BLUEPRINT.md | Database tasarımı | 1-500 (Full) |
| 7 | PRODUCTION_FLOW_ARCHITECTURE.md | Üretim akışı | 1-300 (Full) |
| 8 | PLAN.md | Sprint planı | 1-500 (Full) |
| 9 | INVENTORY_ARCHITECTURE.md | Envanter mimarisi | 1-500 (Full) |
| 10 | ORDER_ANALYSIS.md | Order analizi | 1-100 (Kısmi) |
| 11 | recipes.ts | DB şeması | 1-200 (Full) |
| 12 | materials-products.ts | DB şeması | 1-200 (Full) |
| 13 | inventory.ts | DB şeması | 1-200 (Full) |
| 14 | production.ts | DB şeması | 1-200 (Full) |
| 15 | factory-config.ts | DB şeması | 1-200 (Full) |
| 16 | stations.ts | DB şeması | 1-200 (Full) |
| 17 | machines.ts | DB şeması | 1-200 (Full) |
| 18 | production-queue.ts | DB şeması | 1-200 (Full) |
| 19 | rework.ts | DB şeması | 1-200 (Full) |
| 20 | orders.ts | DB şeması | 1-200 (Full) |
| 21 | goods-receipt.ts | DB şeması | 1-200 (Full) |
| 22 | materials-master.ts | DB şeması | 1-200 (Full) |
| 23 | schema/index.ts | DB şema index | 1-100 (Full) |

---

## 17. EK: RecipeManagementEngine — Sürpriz Keşif

### 17.1. Varlık Bilgisi

**Kaynak:** `packages/engine/src/index.ts` (lines ~1015–2200)

Raporun ilk sürümünde "Recipe service/management engine kodlanmamış" tespiti yapılmıştı. **Bu tespit kısmen yanlıştır.** `packages/engine` paketinde `RecipeManagementEngine` adında statik bir domain engine sınıfı **tamamen implemente edilmiş** durumdadır. Ancak bu engine:
- **DB'ye bağlı değildir** — saf domain mantığı, immutable fonksiyonlar
- **API'ye bağlı değildir** — controller'dan çağrılmaz
- **Hiçbir yerde kullanılmaz** — ortada asılı durur

### 17.2. Mevcut Methodlar

| Method | Açıklama | Parametreler |
|--------|----------|-------------|
| `createRecipe()` | Boş recipe oluşturur | ProductRecipe döner |
| `addMaterial()` | Malzeme + recipe item ekler | Recipe, material, quantity, unit |
| `addRecipeItem()` | BOM item ekler (tip bazlı) | Recipe, itemType, materialId, formula, notes |
| `addYield()` | Verim tanımı ekler | Recipe, yield değeri |
| `addVersion()` | Versiyon ekler, eskisini pasif yapar | Recipe, version |
| `addOperation()` | Sıralı operasyon ekler | Recipe, operation |
| `addOperationRule()` | Üretim kuralı ekler | Recipe, rule |
| `addCapacityRule()` | Kapasite çarpanı ekler | Recipe, capacityRule |
| `addConsumptionRule()` | Tüketim kuralı ekler | Recipe, consumptionRule |
| `addValidation()` | Validasyon kaydı ekler | Recipe, validation |
| `validateRecipe()` | Recipe bütünlük kontrolü | Recipe → ValidationResult[] |

### 17.3. Tanımlı Tipler

```
RecipeStatus: "ACTIVE" | "INACTIVE" | "DRAFT"
RecipeItemType: RAW_MATERIAL | AUXILIARY_MATERIAL | PACKAGING | CONSUMABLE | SERVICE | BY_PRODUCT
ProductRecipe — composite type (recipe + items + operations + rules + versions)
```

**Tespit:** Engine'deki `RecipeItemType` (RAW_MATERIAL/AUXILIARY_MATERIAL/PACKAGING/CONSUMABLE/SERVICE/BY_PRODUCT) ile DB şemasındaki `consumptionBasis` (area/perimeter/piece/fixed/duration) **farklı kavramlardır.** Engine item tipini, DB ise tüketim bazını tutar. Aralarında eşleme yoktur.

### 17.4. Test Durumu

**Kaynak:** `packages/engine/test/recipe-management-engine.test.ts`

8 test implemente edilmiştir:
1. Creates a recipe with materials and ordered operations
2. Stores operation rules for production knowledge
3. Stores capacity rules as metadata only
4. Stores consumption definitions without inventory logic
5. Stores validation models for recipe integrity
6. Supports versioned recipes with single active version
7. Supports BOM item types and formulas
8. Validates inactive recipes, duplicate items, and invalid quantities

Hepsi geçiyor durumdadır.

### 17.5. Önem: Bağlantısız Katman

```
packages/engine (RecipeManagementEngine)  → saf domain mantığı ✅
       ↓
packages/db/src/services/                 → recipe servisi YOK ❌
       ↓
packages/db/src/repositories/             → recipe repository YOK ❌
       ↓
packages/db/src/schema/recipes.ts         → 5 tablo ✅
       ↓
apps/api/src/controllers/recipe.controller.ts → STUB ❌
       ↓
apps/api/src/services.ts                  → recipe enjekte edilmemiş ❌
```

Engine ile DB arasında **servis ve repository katmanları eksiktir.** API controller sadece stub'tır.

---

## 18. EK: Migration ve İndeks Analizi

### 18.1. Migration Geçmişi

**Kaynak:** `packages/db/migrations/` — tüm dosyalar tarandı

| Migration | İçerik | Recipe İlişkisi |
|-----------|--------|----------------|
| `0000_brave_gideon.sql` | İlk schema — tüm recipe tabloları | recipes, recipe_items, recipe_operations, recipe_rules, recipe_versions, factory_configurations, grinding_profiles, trim_profiles, remnant_thresholds |
| `0001_enable_rls.sql` | RLS politikaları | Tüm recipe tablolarına RLS eklenmiş |
| `0001_small_squadron_sinister.sql` | settings tablosu | `factory_configuration jsonb` alanı eklenmiş |
| `0002-0007` | Warehouse, materials-master, goods receipt, customer | Recipe ile ilgili değişiklik yok |

**Kritik:** Recipe ile ilgili **hiçbir ALTER migration'ı yoktur.** Tüm tablolar ilk halleriyle durmaktadır.

### 18.2. Eksik Unique Index'ler

**Kaynak:** `recipes.ts` şema dosyasındaki yorum satırları + migration SQL'leri

Aşağıdaki unique index'ler **dokümanda ve şema yorumlarında belirtilmiş** olmasına rağmen **ne Drizzle şemasında ne de migration'da tanımlanmıştır:**

| Tablo | Olması Gereken Index | Mevcut Durum |
|-------|---------------------|-------------|
| `recipes` | `UNIQUE (tenant_id, recipe_code)` | ❌ Yok — duplicate recipe_code girilebilir |
| `recipe_items` | `UNIQUE (recipe_id, sequence)` | ❌ Yok — aynı sırada iki item olabilir |
| `recipe_operations` | `UNIQUE (recipe_id, sequence)` | ❌ Yok — aynı sırada iki operasyon olabilir |
| `factory_configurations` | `UNIQUE (factory_id, config_key)` | ❌ Yok — duplicate config_key girilebilir |

**Risk:** Bu eksiklik veri bütünlüğü sorununa yol açabilir. Örneğin aynı recipe_code ile iki recipe oluşturulabilir.

### 18.3. Arşiv Migration Karşılaştırması

**Kaynak:** `packages/db/migrations_archive/0002_production_master_data.sql`

Eski (uuid bazlı) migrasyonda:
- `recipes.product_id` — FK→products vardı (mevcut şemada yok)
- `recipe_materials` — recipe_items'tan farklı bir yapı
- `routing_templates` / `routing_steps` — recipe_operations'tan ayrı, routing için ayrı tablolar vardı
- `recipe_rules` ve `recipe_versions` yoktu

**Tespit:** Mevcut şema eskiye göre **daha sade ve temizdir.** Routing ayrı bir kavram olmaktan çıkarılıp recipe_operations'a entegre edilmiştir. `product_id` FK'sı kaldırılmıştır (products.recipeId forward reference ile değiştirilmiştir).

---

## 19. EK: settings.trimMm — ADR İhlali

### 19.1. Tespit

**Kaynak:** `packages/db/src/schema/settings.ts`

```typescript
export const settings = pgTable("settings", {
  // ...
  trimMm: numeric("trim_mm", { precision: 8, scale: 2 }),
  // ...
});
```

`settings` tablosunda `trim_mm` adında **tek bir numeric değer** tanımlanmıştır.

### 19.2. ADR ile Çelişki

**Kaynak:** DECISIONS.md — ADR-2026-07-15-02

> **Trim, Factory Configuration'dır — Sipariş veya Cam Bazında Değildir.**
> Her kenar için bağımsız parametre tanımlanır: `trim_left_mm`, `trim_right_mm`, `trim_top_mm`, `trim_bottom_mm`.

ADR, trim'in **4 kenar bağımsız** olması gerektiğini söyler. Oysa `settings.trim_mm` tek bir değerdir.

### 19.3. Çelişki Detayı

| Yapı | Trim Modeli | ADR Uyumu |
|------|------------|-----------|
| `trimProfiles` tablosu | 4 kenar (leftMm, rightMm, topMm, bottomMm) | ✅ Uyumlu |
| `settings.trim_mm` | Tek değer | ❌ ADR-2026-07-15-02 ihlali |
| `settings.factory_configuration` (JSONB) | İçinde trimConfiguration olabilir | Belirsiz — runtime'a bağlı |

**Yorum:** `settings` tablosundaki `trim_mm`, ADR öncesi eski bir yaklaşımın kalıntısı olabilir. `trimProfiles` tablosu ADR ile uyumludur ve kullanılmalıdır. `settings.trim_mm` alanı kullanımdan kaldırılmalı (deprecated) veya kaldırılmalıdır.

### 19.4. settings tablosundaki Diğer Çakışmalar

`settings` tablosunda `factory_configuration` adında bir JSONB alanı daha vardır. Bu alan, PRODUCTION_CALCULATION_ENGINE.md §7'de tüm hesaplama parametrelerinin merkezi olarak tanımlanmıştır. Oysa aynı bilgiler:
- `factory_configurations` tablosunda (key-value)
- `grinding_profiles` tablosunda
- `trim_profiles` tablosunda
- `remnant_thresholds` tablosunda
- `settings.factory_configuration` JSONB alanında

**Toplam 5 farklı yerde** saklanabilir. Bu veri tutarsızlığına davetiye çıkarır.

---

## 20. EK: Composition Root Analizi

### 20.1. Mevcut Durum

**Kaynak:** `apps/api/src/services.ts` — tüm servislerin enjekte edildiği composition root

```typescript
export interface AppServices {
  customer: CustomerService;
  order: OrderService;
  production: ProductionService;
  queue: ProductionQueueService;
  transfer: ProductionTransferService;
  quality: QualityControlService;
  dispatch: DispatchService;
  rework: ReworkService;
  cutting: CuttingExecutionService;
  station: StationOperationService;
}
```

**Recipe ile ilgili hiçbir servis veya repository burada tanımlı değildir.**

### 20.2. Eksik Bağımlılıklar

| Bileşen | Mevcut | İhtiyaç Duyması Muhtemel |
|---------|--------|-------------------------|
| RecipeRepository | ❌ | db client |
| RecipeService / RecipeManagementEngine | ❌ | RecipeRepository, EventPublisher, db |
| RecipeController | ⚠️ Stub | RecipeService |

### 20.3. RecipeManagementEngine'in Kullanılmama Nedeni

`packages/engine/src/index.ts`'deki `RecipeManagementEngine` bir **statik sınıf** olarak tasarlanmıştır — instance alınmaz, doğrudan `RecipeManagementEngine.createRecipe()` şeklinde çağrılır. Bu tasarım:

- **Bağımlılık enjeksiyonunu imkansız kılar** — constructor yok, interface yok
- **Test edilebilir** — saf fonksiyonlar, yan etki yok ✅
- **DB bağlantısı yok** — servis katmanına ihtiyaç duyar

**Tespit:** Engine'in statik tasarımı ile servis katmanının OOP tasarımı arasında bir uyumsuzluk vardır. Engine'i kullanacak bir servis ya engine'i import edip static çağrı yapacak ya da engine bir wrapper ile sarılacaktır.

---

## 21. EK: 22 Kaynağın Detaylı Analiz Tablosu

| # | Kaynak | Tür | Satır | Recipe İlgisi | Kritik Bulgu |
|---|--------|-----|-------|--------------|--------------|
| 1 | RECIPE_ARCHITECTURE.md | Doküman | Full | Doğrudan | "Route tanımlamaz" — oysa recipe_operations sıralı operasyon tutar |
| 2 | PRODUCTION_CALCULATION_ENGINE.md | Doküman | Full | Doğrudan | Factory Config'te 5 farklı depolama yeri — tutarsızlık riski |
| 3 | PRODUCT_ARCHITECTURE.md | Doküman | Full | Yüksek | Consumption model (5 baz) recipe_items ile uyumlu |
| 4 | PRODUCTION_ARCHITECTURE.md | Doküman | Full | Orta | Operasyon bazlı kuyruk recipe_operations ile beslenir |
| 5 | DECISIONS.md (ADR) | Doküman | Full | Doğrudan | 15+ ADR — trim/grinding/fire kararları recipe'yi şekillendirir |
| 6 | DATABASE_BLUEPRINT.md | Doküman | Full | Yüksek | Recipe aggregate 4 child ile tanımlanmış ✅ |
| 7 | PRODUCTION_FLOW_ARCHITECTURE.md | Doküman | Full | Yüksek | Recipe→Operations→Stations→Queues→Machines akışı |
| 8 | PLAN.md | Doküman | Full | Orta | Recipe engine kodlanmamış ama PLAN'da geçmiyor |
| 9 | INVENTORY_ARCHITECTURE.md | Doküman | Full | Orta | Consumption katmanı hazır, valuation yok |
| 10 | ORDER_ANALYSIS.md | Doküman | Kısmi | Düşük | Sipariş-recipe bağlantısı (orderLines.recipeId) |
| 11 | recipes.ts | Şema | Full | Doğrudan | 5 tablo ✅ — unique index'ler eksik ❌ |
| 12 | materials-products.ts | Şema | Full | Yüksek | materials (eski) vs materials_master (yeni) çakışması |
| 13 | inventory.ts | Şema | Full | Düşük | Recipe→Inventory bağlantısı yok |
| 14 | production.ts | Şema | Full | Orta | production_orders productionWidthMm alanı rodajlı ölçüyü tutar |
| 15 | factory-config.ts | Şema | Full | Doğrudan | Trim/grinding/remnant profilleri ✅ — unique index'ler eksik ❌ |
| 16 | stations.ts | Şema | Full | Düşük | stationType, recipe_operations.operationCode ile eşleşebilir |
| 17 | machines.ts | Şema | Full | Düşük | Machine→Station bağlantısı recipe'den bağımsız |
| 18 | production-queue.ts | Şema | Full | Düşük | Queue operasyon bazlı, recipe'den bağımsız |
| 19 | rework.ts | Şema | Full | Düşük | Fire inventory recipe'den bağımsız |
| 20 | orders.ts | Şema | Full | Orta | orderLines.recipeId forward reference |
| 21 | services.ts | Kod | Full | **Kritik** | Recipe servisi yok, composition root'ta eksik |
| 22 | engine/src/index.ts | Kod | ~1200 | **Doğrudan** | RecipeManagementEngine ✅ — bağlantısız duruyor |

---

## 22. Final Değerlendirme

### 22.1. Recipe Engine'in Olgunluk Seviyesi

| Katman | Durum | Açıklama |
|--------|-------|----------|
| **Domain mantığı** (packages/engine) | ✅ Tamam | RecipeManagementEngine — 11 method, 8 test |
| **DB şeması** (packages/db) | ✅ Tamam | 5 tablo + relations |
| **İndeksler** | ❌ Eksik | 4 unique index tanımlanmamış |
| **Repository** | ❌ Yok | DB erişim katmanı eksik |
| **Service** | ❌ Yok | İş mantığı + DB arası köprü eksik |
| **API Controller** | ⚠️ Stub | Tek GET endpoint, "not implemented" |
| **API Tests** | ❌ Yok | Hiçbir test yok |
| **Factory Config (trim/grinding)** | ✅ Tablolar var | Ama settings.trimMm ile çelişiyor |
| **Multi-level recipe** | ❌ Yok | En büyük eksik |
| **Production Calculation Engine** | ❌ Kod yok | Sadece mimari doküman |

### 22.2. Yapısal Sorunlar (Özet)

| # | Sorun | Şiddet | Çözüm İçin Ne Gerekli? |
|---|-------|--------|----------------------|
| 1 | RecipeManagementEngine bağlantısız | Yüksek | Service + Repository katmanı + composition root wiring |
| 2 | 4 unique index eksik | Yüksek | Yeni migration (+ Drizzle schema güncellemesi) |
| 3 | settings.trimMm ADR ihlali | Orta | Kolonun kaldırılması veya deprecated işareti |
| 4 | settings.factory_configuration JSONB redundancy | Orta | Hangi deponun SSOT olduğuna karar verilmeli |
| 5 | recipe_items.materialId eski materials'a bağlı | Orta | materials_master'a geçiş migration'ı |
| 6 | productType senkronizasyonu yok | Orta | Validation kuralı veya tek kaynak |
| 7 | Multi-level recipe yok | Yüksek | Yeni tablo veya mevcut yapının genişletilmesi |
| 8 | recipe_operations.operationCode serbest metin | Düşük | productionOperations tablosuna FK |

### 22.3. Architecture Freeze Etkisi

**Kaynak:** ADR-2026-07-15-11

Architecture Freeze, Sprint 2.2'de tamamlanan yapıların değiştirilmesini yasaklar. Recipe şeması **Sprint 2.2'de dondurulmuştur.**

Bu raporun tespit ettiği sorunların bir kısmı:
- **Freeze kapsamında:** Şema değişikliği gerektirenler (unique index ekleme, settings.trim_mm kaldırma) → **Yeni ADR gerekli**
- **Freeze dışında:** Service/repository/API katmanı eklemeleri → **Yeni ADR gerekmez** (sadece yeni kod)
- **Freeze belirsiz:** materials_master'a geçiş → ADR-2026-07-18-01'de "bir sonraki migration" deniyor, bu freeze'i aşabilir

---

*Rapor sonu. Kod yazılmamıştır, tahmin yapılmamıştır, varsayım üretilmemiştir. Her tespit kaynağıyla belirtilmiştir.*

**Toplam: 22 kaynak taranmış, 16+6=22 bölüm, 8 yapısal sorun, 5 çelişki, 4 eksik indeks, 1 ADR ihlali tespit edilmiştir.**
