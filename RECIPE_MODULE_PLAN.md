# RECIPE MODULE PLAN — GlassOS Reçete Modülü Geliştirme Planı

> **Sürüm:** 1.0
> **Tarih:** 21 Temmuz 2026
> **Durum:** Active Development (Sprint 1)
> **Öncelik:** TEK ÖNCELİK — Diğer tüm modüller donduruldu.

---

## 🧠 Temel Felsefe

### Sektör Gerçeği (Kafaya Kazınacak)
> **"Aynı m², aynı üretim değildir."**

| Ölçü | Alan (m²) | Çevre (m) |
|------|-----------|-----------|
| 500×2000 | 1.0 | 5.0 |
| 1000×1000 | 1.0 | 4.0 |

İkisi de 1 m² ama çevre farkı → trim, silikon, çıta, rodaj, fire HEP farklı.

### GlassOS = CAM TEMPER ERP
- Un fabrikası değil, mobilya fabrikası değil, klasik ERP değil.
- **Cam temper fabrikasıyız.** Verilecek her karar cam sektörüne göre verilir.
- İnternetteki klasik ERP örnekleri GEÇERSİZDİR.
- Gerçek cam fabrikasında çalışan ustabaşı gibi düşün.

---

## 📖 Reçete Nedir? (Net Tanım)

### Reçete = TARİF DEFTERİ

Reçete **şunları söyler:**
- Hangi camdan kullan (8mm füme float)
- Hangi malzemeleri kullan (spacer, butil, argon, çıta, silikon...)
- Hangi işlemleri hangi sırayla uygula (kes → rodaj → yıka → temper → ...)
- Fire kuralları nelerdir (rodaj, trim, üretim firesi)
- Üretim kuralları nelerdir (temper zorunlu mu, Low-E önemli mi, min/max ölçü)

Reçete **şunları yapmaz:**
- ❌ Kesim planlamaz
- ❌ Nestinge girmez
- ❌ Maliyet hesaplamaz
- ❌ Stok tüketmez
- ❌ Fire miktarı hesaplamaz (sadece KURALI tanımlar)

### Fırın Benzetmesi (Birebir Aynı Mantık)
```
Müşteri sabah ekmek istedi → Fırında ekmek yok ama un, su, tuz, maya var
→ Tarif var → "200°C 30 dk pişir" → "Abi 7'de gel ekmeğini al"
                              ↓
8mm füme temper isteyen müşteri → 8mm füme temper stokta yok
→ 8mm füme float var → Reçete var → "Kes → Rodaj → Temperle"
→ "Al beyim camın hazır"
```

---

## 🔥 Fire Yönetimi (En Kritik Konu)

### 3 Tür Fire — HEPsi AYRI

| Fire Türü | Kaynağı | Hesaplama | Reçetede Ne Tanımlanır? |
|-----------|---------|-----------|------------------------|
| **Rodaj Firesi** | Kenar taşlama (cam toz olur, yok olur) | Çevre × rodaj mm | Kural: Fabrika ayarı veya özel mm/kenar |
| **Trim Firesi** | Kenar kesme (bıçak keser atar) | Trim mm × kenar sayısı | Kural: Fabrika ayarı veya özel mm + hangi kenarlar |
| **Üretim Firesi** | Kırılma, hata, fire | % oran | Sabit yüzde (elle girilir) |

> **ÖNEMLİ:** Rodaj ve trim FIREDİR. "Ölçü payı" veya "tolerans" değildir.
> O taşınan/kesilen cam geri gelmez, yok olur. Budur fire.

### Gerçek Hayat Örneği
```
1 plaka 6000×3210 = 19,26 m² hammadde

Net müşteri siparişleri toplamı: 17,42 m²
Rodaj paylı kesim toplamı:       17,51 m²
                                    ──────
Rodaj firesi:                      0,09 m² 🔥
                                   
Kalan plaka: 19,26 - 17,51 = 1,75 m²

Trim (2cm, 2 kenar):             0,18 m² 🔥
                                   
Kalan:                            1,57 m²
                                   
Bu kalanın tamamı fire DEĞİLDİR:
  → Min ölçü üstü = Remnant (tekrar kullanılır, stoklanır)
  → Min ölçü altı = Hurda (fire)
```

---

## 🎯 UI Planı — Recipe List Page

### `/recipes` — Liste Sayfası

```
┌──────────────────────────────────────────────────────────┐
│  Reçeteler              [🔍 Ara...] [Tür▾]  [+ Yeni Reçete] │
├──────────────────────────────────────────────────────────┤
│  Kod          Adı                    Versiyon  Tür    Durum │
│  RC-001       Temperli Düz Cam       1         Temper  Aktif  │
│  RC-002       Isıcam 6+12+6          2         Isıcam  Aktif  │
│  RC-003       Lamine 44.2            1         Lamine  Pasif  │
│  RC-004       8mm Füme Temper        1         Temper  Aktif  │
│  ...                                                        │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 UI Planı — Recipe Detail Page

### `/recipes/[id]` — Detay Sayfası (6 Kart)

---

### 🔷 Kart 1 — Genel Bilgiler

```
┌──────────────────────────────────────────────────────────────┐
│  📋 GENEL BİLGİLER                                            │
│                                                               │
│  Reçete Kodu    [RC-001          ]     Versiyon  1            │
│  Adı            [Temperli Düz Cam        ]                    │
│  Ürün Tipi      [▼ temper                 ]                    │
│  Aktif          ☑                                             │
│  Notlar         [_________________________]                    │
└──────────────────────────────────────────────────────────────┘
```

---

### 🔷 Kart 2 — Harcananlar (Girdiler)

```
┌──────────────────────────────────────────────────────────────┐
│  📦 HARCANANLAR                                          [+ Ekle] │
│                                                               │
│  Malzeme       | Tüketim Tipi  | Miktar | Birim | Fire% | Sıra │
│  ──────────────|───────────────|────────|───────|───────|───── │
│  8mm Füme Float| Alan (m²)     | 1.000  | m²    |   3   |  1  │
│  Spacer 12mm   | Çevre (m)     | 1.050  | m     |   2   |  2  │
│  Butil         | Çevre (m)     | 1.050  | m     |   5   |  3  │
│  Argon         | Hacim (m³)    | 0.012  | m³    |   0   |  4  │
│  Etiket        | Adet          | 1.000  | adet  |   0   |  5  │
│  Köşe Koruyucu | Adet          | 4.000  | adet  |   0   |  6  │
└──────────────────────────────────────────────────────────────┘
```

**Tüketim Tipleri:**
| Tip | Açıklama | Örnek |
|-----|----------|-------|
| `area` | Alan (m²) | Float cam, temperli cam |
| `perimeter` | Çevre (m) | Spacer, butil, silikon, çıta |
| `piece` | Adet | Etiket, köşe koruyucu |
| `fixed` | Sabit miktar | Özel malzemeler |
| `volume` | Hacim (m³) | Argon gazı |

---

### 🔷 Kart 3 — Çıktılar (Outputs)

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 ÇIKTILAR                                             [+ Ekle] │
│                                                               │
│  Ürün               | Miktar | Birim | Sıra                    │
│  ───────────────────|────────|───────|─────                    │
│  Isıcam 6+12+6      | 1.000  | m²    |  1                     │
└──────────────────────────────────────────────────────────────┘
```

---

### 🔷 Kart 4 — Üretim Kuralları

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ ÜRETİM KURALLARI                                          │
│                                                               │
│  ☑ Temper zorunlu mu?                                         │
│  ☐ Low-E yönü önemli mi?                                      │
│  ☑ Rodaj gerekli mi?                                          │
│  ☐ Delik açılabilir mi?                                       │
│  ☐ Kanal açılabilir mi?                                       │
│  ☐ CNC işleme gerekli mi?                                     │
│                                                               │
│  Minimum ölçü: [____] mm                                      │
│  Maksimum ölçü: [____] mm                                     │
└──────────────────────────────────────────────────────────────┘
```

---

### 🔷 Kart 5 — Fire Ayarları (🔥 En Kritik Kart)

```
┌──────────────────────────────────────────────────────────────┐
│  🔥 FİRE AYARLARI                                             │
│                                                               │
│  ┌─ RODAJ FİRESİ ──────────────────────────────────────────┐  │
│  │  ☑ Fabrika ayarını kullan (Şu an: 1mm/kenar, 4 kenar)  │  │
│  │  ☐ Bu reçete için özel rodaj değeri kullan              │  │
│  │  Sağ: [_] mm    Sol: [_] mm    Üst: [_] mm    Alt: [_] mm │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ TRİM FİRESİ ───────────────────────────────────────────┐  │
│  │  ☑ Fabrika ayarını kullan (Şu an: 2cm)                 │  │
│  │  ☐ Bu reçete için özel trim değeri kullan              │  │
│  │  Trim payı: [__] cm                                     │  │
│  │  Trim uygulanacak kenarlar:                              │  │
│  │  ☑ Sağ    ☑ Sol    ☐ Üst    ☐ Alt                      │  │
│  │  (2 kenar vs 4 kenar firesi büyük fark eder)            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ ÜRETİM FİRESİ ─────────────────────────────────────────┐  │
│  │  Üretim Fire Oranı: [3.00] % (kırılma, hata, fire payı) │  │
│  │  Bu oran her üretimde sabit uygulanır, elle girilir.    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  NOT: Bu kartta fire MİKTARI değil, fire KURALI tanımlanır.  │
│  Gerçek fire hesaplaması üretim anında yapılır.              │
└──────────────────────────────────────────────────────────────┘
```

---

### 🔷 Kart 6 — Operasyon Sırası

```
┌──────────────────────────────────────────────────────────────┐
│  🔄 OPERASYON SIRASI                                     [+ Ekle] │
│                                                               │
│  Sıra | Operasyon       | Zorunlu? | Notlar                   │
│  ─────|─────────────────|──────────|───────────────────────── │
│   1   | Kesim           | ✅ Zorunlu | Standart kesim         │
│   2   | Rodaj           | ✅ Zorunlu | 4 kenar rodaj          │
│   3   | Yıkama          | ✅ Zorunlu |                         │
│   4   | Temperleme      | ✅ Zorunlu |                         │
│   5   | Kalite Kontrol  | ✅ Zorunlu |                         │
│   6   | Sevkiyat        | ❌ İsteğe  |                         │
└──────────────────────────────────────────────────────────────┘
```

**Operasyon Kodları (Mevcut):**
| Kod | Açıklama |
|-----|----------|
| `cutting` | Kesim |
| `grinding` | Rodaj / Taşlama |
| `tempering` | Temperleme Fırını |
| `insulating_glass` | Isıcam Montajı |
| `lamination` | Laminasyon |
| `cnc` | CNC İşleme |
| `drilling` | Delik Açma |
| `washing` | Yıkama |
| `painting` | Boyama |
| `sandblasting` | Kumlama |
| `quality` | Kalite Kontrol |
| `dispatch` | Sevkiyat |

---

## 🏗️ Mimari Kararlar

### ADR-2026-07-21-01: Rodaj/Trim Sahipliği
- **Varsayılan:** Fabrika ayarları (`factory_config`) kullanılır
- **İstisna:** Reçetede override edilebilir (checkbox pattern)
- **Override:** Sağ/Sol/Üst/Alt ayrı ayrı mm girilir (bazı ürünlerde sadece 2 kenar rodaj yapılır)

### ADR-2026-07-21-02: Fire Kuralı vs Fire Miktarı
- Reçete sadece fire **kuralını** tanımlar (rodaj açık/kapalı, trim kaç cm, fire %'si)
- Fire **miktarı** üretim anında, gerçek ölçülere göre hesaplanır (Calculation Engine)
- Çünkü aynı reçete, farklı ölçülerde farklı fire üretir

### ADR-2026-07-21-03: UI First, DB Last
- Önce kullanıcı ekranı tasarlanır ve çalışır hale getirilir (statik form)
- Sonra server actions yazılır
- En son DB schema varsa uyarlanır
- DB mevcut diye kullanıcı DB'ye uydurulmaz; DB kullanıcıyı destekler

### ADR-2026-07-21-04: Recipe ≠ BOM
- Klasik ERP'deki Bill of Materials mantığı GEÇERSİZDİR
- Recipe sadece tarif + kural tanımlar
- Çok seviyeli BOM, routing, iş istasyonu, makine ataması gibi kavramlar bu modülde YOKTUR

---

## 📋 Geliştirme Sırası

```
Aşama 1: UI (Önce bu — hiç DB'ye dokunmadan)
├── 1.1 Recipe List Page (/recipes) — statik JSX
├── 1.2 Recipe Detail Page (/recipes/[id]) — 6 kartlı form
└── 1.3 Navigation'a ekle

Aşama 2: Server Actions
├── 2.1 createRecipe
├── 2.2 updateRecipe
├── 2.3 getRecipe (detay + tüm alt tablolar)
├── 2.4 listRecipes
├── 2.5 deleteRecipe (soft delete)
└── 2.6 createRecipeVersion (versiyon snapshot)

Aşama 3: DB Schema Uyarlama
├── 3.1 Mevcut schema analizi
├── 3.2 Gerekirse migration
└── 3.3 Migration çalıştırma

Aşama 4: Gerçek Veri ile Test
├── 4.1 Örnek reçeteler girme
├── 4.2 Versiyon yönetimi testi
└── 4.3 Production ile entegrasyon testi
```

---

## 🚫 YASAKLAR (Bu modülde asla yapılmayacaklar)

- ❌ Yeni tablo ekleme (mevcut schema uyarlanır, sıfırdan tablo açılmaz)
- ❌ Yeni API endpoint'i ekleme
- ❌ Calculation Engine'e dokunma
- ❌ Production modülüne dokunma
- ❌ Stok modülüne dokunma
- ❌ Klasik ERP BOM mantığı
- ❌ Routing, iş istasyonu, makine ataması
- ❌ Maliyet hesaplama
- ❌ Nesting / optimizasyon

---

## 📂 Dosya Yapısı (Planlanan)

```
apps/web/src/app/(dashboard)/
├── recipes/
│   ├── page.tsx                    ← Liste sayfası
│   ├── recipe-list-client.tsx      ← Liste bileşeni (client)
│   └── [id]/
│       └── page.tsx               ← Detay sayfası

apps/web/src/app/actions/
├── recipes.ts                     ← Reçete server actions

packages/db/src/schema/
├── recipes.ts                     ← Mevcut schema (güncellenecek)
```

---

## 📐 Tüketim Tipleri (Consumption Basis) — Detay

| Kod | Adı | Açıklama | Örnek Malzemeler |
|-----|-----|----------|-----------------|
| `area` | Alan | m² başına tüketim | Float cam, temperli cam, lamine cam |
| `perimeter` | Çevre | m başına tüketim | Spacer, butil, silikon, çıta, bant |
| `piece` | Adet | Parça başına tüketim | Etiket, köşe koruyucu, tapas |
| `fixed` | Sabit | Reçete başına sabit | Setup malzemesi, kalıp |
| `volume` | Hacim | m³ başına tüketim | Argon, kripton gazı |

---

## 🔗 Bağımlı Dokümanlar

- `RECIPE_ARCHITECTURE.md` — Mevcut reçete mimarisi
- `RECIPE_ANALYSIS.md` — Gap analizi
- `PRODUCTION_CALCULATION_ENGINE.md` — Hesaplama motoru (fire hesabı burada yapılır)
- `DECISIONS.md` — ADR'ler
- `database/recipes.ts` — Mevcut DB schema
- `UI_ARCHITECTURE.md` — UI tasarım sistemi

---

> **Bu doküman RECIPE modülü geliştirme süresince TEK REFERANSTIR.**
> Her kod yazmadan önce buraya bak. Verdiğin her kararı cam sektörüne göre ver.
