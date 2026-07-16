# PRODUCTION_ARCHITECTURE — GlassOS Production Architecture

Tarih: 2026-07-14 (Son Güncelleme: 2026-07-16)

Architecture Status
✅ Completed

- Operation-based production queue architecture implemented for Sprint 2.3.11.

Implementation Status
✅ Completed (Sprint 2.3.11)

Validation Status
✅ Passed (engine tests and build)

Bu doküman GlassOS'un üretim (MES / Production Intelligence) tarafını tanımlar. Teknik mimari `DATABASE_ARCHITECTURE.md` içinde kalmaya devam eder; bu dosya üretim süreçleri, iş domainleri, istasyon mantığı ve üretim motoru hakkında rehberlik sağlar.

> **ÖNEMLİ:** Üretim rota tekil kaynağı için `PRODUCTION_FLOW_ARCHITECTURE.md` referans alınmalıdır. Bu doküman istasyon ve domain mimarisi ile operasyonel akışa odaklanır.
>
> **ÖNEMLİ:** Üretim hesaplama motorunun tüm iş kuralları (Business Dimension, Production Dimension, Trim, Grinding, Remnant, Waste sınıflandırması, maliyet katmanları) `PRODUCTION_CALCULATION_ENGINE.md` dokümanında bulunur.

---

# 1. Production Philosophy

- GlassOS siparişleri tutmaz; üretimi yönetir. Sipariş, müşteri talebinin temsilidir; Production Engine ise üretimin nasıl gerçekleşeceğine karar verir.
- Üretim takibi sipariş kalemi seviyesinde sayaç bazlı yürütülür: Requested, Completed, Missing, Broken, Delivered. Fiziksel cam parçaları kalıcı veri varlığı olarak saklanmaz.
- Production Engine hangi istasyonlardan geçileceğini belirler — bu sıra ürüne ve reçeteye bağlıdır.
- Fire (atık) müşteriye ait değildir; fabrikanın maliyetidir ve ayrı bir domain olarak yönetilir.
- Her önemli işlem (kesim, rodaj, temper, fire, remake, sevk vb.) bir event üretir.
- Üretim tamamen izlenebilir olmalıdır: eventler, audit log ve trace bilgileri saklanır.

---

# 2. Production Domain

## Production Stations

Üretim istasyonları sistem ayarlarından yönetilebilir olmalıdır.

Fabrika aşağıdaki gibi istasyonları artırıp azaltabilir:

- Kesim
- Rodaj
- Temper
- Isıcam
- Laminasyon
- CNC
- Delik
- Boya
- Kalite
- Sevkiyat

Her istasyonun aşağıdaki yönetilebilir bilgileri bulunmalıdır:

- adı
- aktif/pasif durumu
- önceliği
- bağlı makineleri

Bu değerler sistem ayarları veya fabrika konfigürasyonundan yönetilmelidir. Böylece saha operatörleri ve üretim planlaması dinamik olarak değişebilen istasyonlar ile uyumlu çalışabilir.

---

GlassOS'un üretimle ilgili ana domainleri ve sorumlulukları:

- **Customer:** Müşteri ilişkileri ve ticari bilgiler. Sipariş sahipliği ve faturalama ile ilgilenir.
- **Order:** Müşteriden gelen sipariş; teslim tarihi, fiyat anlaşmaları ve bir dizi `Order Item` içerir.
- **Order Item:** Sipariş içindeki tekil ürün tanımı (örn. ölçü ve adet). Üretim akışının temel birimidir.
- **Production:** Bir `Order Item`'ın üretim sürecine girmesi ve istasyonlar boyunca ilerlemesi; üretim durumu, parti bilgileri ve lifecycle burada tutulur.
- **Station:** Fiziksel veya mantıksal üretim birimi (Kesim, Rodaj, Temper, Yıkama, Basım, Isıcam, Kalite, Sevkiyat). Her istasyon kendi kurallarını uygular.
- **Inventory:** Hazır ürün ve yarı mamul kayıtları; Order Item lifecycle ile ilişkilendirilir.
- **Fire:** Üretim sırasında ortaya çıkan atık/kayıp kayıtları; fabrika maliyeti olarak izlenir ve remake sürecine yönlendirilir. Sprint 2.3.18 ile bu alan breakage events, factory fire ownership, rework requests ve fire inventory lifecycle ile desteklenir.
- **Work Queue:** Operatörün aktif çalışma sepeti olarak çalışan Production Work Queue katmanı Sprint 2.3.19 ile desteklenir. Bu katman, istasyon/makine/malzeme seçimi, malzeme filtreleme, barkod ile öğe ekleme ve operatör sepeti durum takibini sağlar; üretim rotası, stok düşümü veya makine kontrolünü yerine getirmez.
- **Architecture Review:** Sprint 2.3.20 kapsamında tüm üretim domainleri; isim tutarlılığı, enum standartları, ilişki planı, aggregate ownership, repository/API hazırlığı ve dokümantasyon tutarlılığı açısından gözden geçirilmiştir. Bu sprintte yeni iş mantığı veya persistence implementation eklenmemiştir; amaç hazırlık ve normalizasyondur.
- **Delivery:** Sevkiyat planlaması, araç/yükleme yönetimi ve POD doğrulamaları. DispatchService tarafından yönetilir (Sprint 2.5.5). Teslimat lifecycle: created → loading → ready_to_ship → in_transit → delivered | partially_delivered | cancelled. Araç, sürücü ve dispatcher ataması desteklenir. Sipariş kalemi seviyesinde teslimat sayaçları (requested, ready, loaded, delivered, remaining) tutulur. Kısmi teslimat tam desteklenir.
- **Transfer:** İstasyonlar arası üretim transfer yönetimi — 6 transfer tipi (automatic, manual, rework_merge, correction, return_to_previous, emergency), transfer lifecycle (initiated→completed|cancelled|rejected), immutable transfer history, istatistikler. ProductionTransferService tarafından yönetilir (Sprint 2.5.2).
- **Station Operation:** İstasyon bazlı iş mantığı — Grinding, Temper, Insulating Glass, Low-E validasyonu, fırın kapasitesi hesaplama, bekleme havuzları, operasyon geçmişi ve istatistikler. StationOperationService tarafından yönetilir (Sprint 2.5.3).
- **Quality Control:** Kalite kontrol — inspeksiyon lifecycle, ölçüm kaydı, görsel muayene, Temper ve IG kontrolleri, READY validasyonu, revork/hurda entegrasyonu. QualityControlService tarafından yönetilir (Sprint 2.5.4).
- **Quality:** Kalite kayıtları, ölçüm sonuçları ve kalite ile ilgili exception'ların yönetimi.
- **Personnel:** Üretim personeli, istasyon yetkileri, makine atamaları, vardiya planlaması ve sahadaki üretim sorumluluğu.
- **Machine:** Üretim makineleri, makine türleri, kapasite bilgileri, operatör atamaları, bakım kayıtları, zaman tüneli, sarf/yedek parça ve doküman referansları.
- **Station:** Üretim istasyonları, istasyon tipleri, makine/personel/kuyruk referansları, kapasite metadata ve dashboard hazırlık modelleri.
- **Recipe:** Ürün reçeteleri, malzeme tanımları, recipe item tipleri, BOM benzeri malzeme satırları, formula placeholder’ları, yield tanımları, tüketim tanımları ve validation modelleri; yalnızca teorik malzeme tüketimi tanımlar.
- **Inventory:** Inventory kartları, kategori, tür, birim, depo konumu, lot, barcode, reservation ve metadata modelleri; yalnızca mevcut stok nesnelerini tanımlar.

Her domain kendi servisleri ve repository'leri aracılığıyla yönetilir; domain mantığı Service Layer'da bulunmalıdır.

---

# 3. Production Flow

Tipik üretim akışı (şablon):

Sipariş
↓
Onay
↓
Kesim (Cutting)
↓
Rodaj (Grinding) ← Grinding tamamlanmadan Temper'a geçilemez
↓
Delik / Havalandırma / CNC (opsiyonel ara operasyonlar)
↓
Temper (Fırın kapasitesi: normal = alan, temperli IG = 2× alan)
↓
Isıcam (IG: normal / temperli / Low-E)
↓
Hazır
↓
Sevkiyat
Sevkiyat
↓
Teslim

Not: Bu akış sabit değildir; Routing Engine ürün reçetesine göre rotayı dinamik olarak belirler.

---

## 4. Production Transfer & Recovery Philosophy

Sprint 2.3.21 kapsamında üretim transfer ve recovery mantığı için nihai mimari kararlar dokümante edilmiştir.

- İstasyon akışı zorunlu değildir. Normal üretim önerilen akışı takip eder; ancak yetkili operatörler üretimi istasyonlar arasında manuel olarak taşıyabilir.
- Desteklenen transfer örnekleri: CUTTING → GRINDING, CUTTING → READY, GRINDING → CUTTING, TEMPERING → WASHING, INSULATING_GLASS → QUALITY.
- Transfer metadata olarak şu alanlar dokümante edilir: Current Station, Next Station, Transfer Reason, Transfer Operator, Transfer Date, Transfer Notes.
- Transfer, üretim durumunu ve mevcut istasyonu günceller.
- Üretim takibi sipariş satırı bazındadır; fiziksel her cam parçası için ayrı kayıt oluşturulmaz.
- Her Order Line için şu sayaçlar tutulur: Requested Quantity, Completed Quantity, Missing Quantity, Delivered Quantity.
- Kırık geçmişi Rework / Quality geçmişine ait olup operasyonel ekranlarda operatörleri karıştırmamalıdır.
- Production History, Transfers, Breakages, Rework, Manual Movements ve Station Changes gibi olayları tek bir akışta tutar.
- Cam üretim kuralları şunlardır: Temper için Grinding zorunludur, Grinding Temper öncesi zorunlu olmalıdır, Tempered Insulating Glass çift fırın kapasitesi tüketir, Recipe ürün kompozisyonunu tanımlar ve tüketim recipe malzemeleri üzerinden hesaplanır.

# 5. Routing Engine

Routing Engine, her ürünün üretim rota ve istasyon dizisini belirleyen kurallı motordur.

- Her ürün aynı istasyonlardan geçmez; örneğin:
  - 4 mm düz cam: Kesim → Hazır
  - 8 mm temper: Kesim → Rodaj → Temper
  - Isıcam üretimi: Kesim → Yıkama → Basım → Isıcam → Hazır

- Routing Engine, ürün reçetesindeki özellikler (kalınlık, delik, baskı, kenar işlemi vb.), fabrika konfigürasyonu ve mevcut kapasiteyi değerlendirir.

---

# 5. Product Recipe (Cam Reçetesi)

Her ürünün bir üretim reçetesi vardır. Reçete örnek alanları:

- Cam tipi
- Kalınlık
- Renk
- Kenar işlemi
- Delik/kaplama
- Temper gereksinimi
- Baskı gereksinimi
- Isıcam/lamine gereksinimi

Üretim rotası reçeteden türetilir; Routing Engine reçeteyi okuyarak istasyon dizisini oluşturur.

---

# 6. Batch Management

Üretim genellikle batch mantığıyla yapılır. Örnekler:

- Temper fırını aynı batch içinde 35 cam çalıştırabilir.
- Kesim optimizasyonu birden fazla siparişi birleştirerek tek bir kesim planı oluşturabilir.

Batch yönetimi, kapasite optimizasyonu ve enerji verimliliği için kritiktir.

---

# 7. Optimization Engine

Optimization Engine, benzer sipariş kalemlerini gruplayıp kesim planları üretir.

Akış örneği:

Benzer cam türleri
↓
Optimizasyon (nesting/kerf/trim)
↓
Kesim planı
↓
Kesim

Not: Bu bölümde Opti (üçüncü parti optimizasyon motoru) entegrasyonu için hazırlık yapılmıştır.

---

# 8. Station Engine

Her istasyon kendi kurallarını uygular. Ortak tanımlanabilir özellikler:

- Giriş koşulu (ör. parça kontrolü, gerekli malzeme)
- Çıkış koşulu (örn. kalite kabulü, ölçü uygunluğu)
- Bekleme ve timeout davranışı
- Kapasite ve batch özellikleri
- Retry / remediation kuralları

Örnek istasyonlar: Kesim, Rodaj, Temper, Yıkama, Basım, Isıcam, Kalite, Hazır, Sevkiyat.

---

# 9. Quality Management

Quality, exception'dan ayrıdır; kalite kusurları (çizik, bombe, temper izi, leke, ölçü dışı, yüzey hatası vb.) ayrı kayıt ve workflow ile yönetilir.

Quality süreçleri:

- Kontrol kriterleri ve ölçüm sonuçlarının saklanması
- Kusur sınıflandırması ve izin/ret kuralları
- Kalite trend analizi ve dashboard

---

# 10. Fire Management

> **Detaylı sınıflandırma ve hesaplama kuralları için bkz. `PRODUCTION_CALCULATION_ENGINE.md` — Bölüm 10: Waste Classification**

GlassOS, "fire" kavramını sektörün aksine **tek bir kalem olarak değil, ayrı sınıflar olarak** yönetir. Bu ayrım hem raporlama kalitesini hem de köken analizini mümkün kılar.

## Fire Sınıfları

| Sınıf                 | Kaynak                       | Açıklama                                          |
| --------------------- | ---------------------------- | ------------------------------------------------- |
| **Trim Loss**         | Full Sheet kenar payları     | Plaka dış kenarından alınan zorunlu kayıp         |
| **Grinding Loss**     | Rodaj payı tüketimi          | Production Dimension ile Business Dimension farkı |
| **Optimization Loss** | Nesting verimsizliği         | Kesim planındaki boşluklar                        |
| **Scrap Loss**        | Küçük artık parçalar         | Remnant eşiğini karşılamayan parçalar             |
| **Production Loss**   | Fiili vs. teorik plaka farkı | Operatör bildirimi ile teorik hesap farkı         |
| **Quality Loss**      | Kalite reddi                 | Kalite kontrolden geçemeyen ürün                  |
| **Breakage Loss**     | Kırık cam                    | Remake döngüsünü başlatan kayıp                   |
| **Inventory Loss**    | Stok sayım farkı             | Periyodik sayımda bulunan fark                    |
| **Remnant**           | Yeniden kullanılabilir artık | Dead Stock havuzuna giren parça                   |

## Temel Kurallar

- Fire müşteriye ait değildir; fabrikaya ait Fire Havuzu'na yazılır.
- Breakage Loss nedeniyle başlayan Remake işlemleri Fire Havuzu üzerinden yönetilir; tamamlandığında ilgili sipariş kalemine tekrar bağlanır.
- Her fire sınıfının maliyet etkisi farklıdır; yönetici bunları ayrı ayrı raporlarda görebilir.
- Fire geçmişi silinmez; yalnızca arşivlenir.

---

# 11. Exception Management

Operatör adımları ve sistem tepkisi:

- Operatör "Kırık / Eksik Tanımla" butonunu seçer.
- İlgili sipariş satırı seçilir ve eksik adet girilir.
- Sistem;
  - Fire kaydı oluşturur,
  - Remake kaydı oluşturur,
  - Siparişi eksik durumuna geçirir.
- Remake tamamlandığında sipariş tekrar tamamlanır.

---

## 12. Order Line Lifecycle and Rework Merge

Kalıcı fiziksel Glass ID yerine Order Line lifecycle ve sayaç bazlı takip kullanılır. Örnek:

450x1800 — 4 adet

- Requested = 4
- Completed = 3
- Missing = 1
- Broken = 1
- Delivered = 3

Breakage, rework ve recovery süreçleri ilgili sipariş kaleminin sayaçları ve üretim geçmişi üzerinden izlenir; rework tamamlandığında ana sipariş kalemiyle tekrar birleştirilir.

---

# 13. Production Event Model

Her önemli işlem bir event üretir. Örnekler:

- Kesildi
- Rodajlandı
- Temperlendi
- Fire oluştu
- Remake oluştu
- Hazır oldu
- Sevk edildi
- Teslim edildi

Bu event zinciri Dashboard, AI, Bildirim ve Analitik için temel veri kaynağıdır.

---

# 14. Future Modules

İleride eklenebilecek modüller:

- Machine Management
- Machine Maintenance
- OEE (Overall Equipment Effectiveness)
- Energy Monitoring
- IoT (sensör entegrasyonları)
- Barcode / Traceability
- AI Production Planning
- Capacity Prediction
- Predictive Maintenance

---

# Son

Bu doküman GlassOS'un üretim akışı ve istasyon mimarisinin ana referansıdır.

**İlgili Dokümanlar:**

- `PRODUCTION_CALCULATION_ENGINE.md` — Hesaplama motorunun tek referansı (Business/Production Dimension, Trim, Grinding, Waste, Maliyet)
- `DATABASE_ARCHITECTURE.md` — Teknik mimari ve veritabanı şeması
- `PRODUCT_ARCHITECTURE.md` — Ürün/reçete mimarisi ve tüketim modeli
- `DECISIONS.md` — Tüm ADR kararları
