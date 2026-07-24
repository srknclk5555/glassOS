# 🏭 GlassOS — Ana Proje Planı (PLAN.md)

> **Sürüm:** 1.0 — Sentezlenmiş Referans Dokümanı  
> **Tarih:** 14 Temmuz 2026 (son güncelleme: 19 Temmuz 2026)  
> **Durum:** ✅ Aktif Geliştirme — Sprint 2.10.x devam ediyor  
> **Aktif Modüller:** Auth, Multi-Tenant, Dashboard, Machines, Stations, Personnel, Warehouses, Materials, Goods Receipt, Customers (7 tab), Orders  
> Her teknik karar, yeni özellik veya faz geçişi bu dosyaya yansıtılmalıdır.

---

## 📌 BU DOSYA NEDEN VAR?

Bu projeyi tek seferde yapmıyoruz. Zamanla, adım adım büyüteceğiz. Aradan aylar geçebilir, yeni fikirler gelebilir, AI araçları değişebilir. Bu dosyanın amacı:

1. **Yeniden başlarken kaybolmamak** — Bir sonraki oturumda tam olarak nereden devam edeceğimizi bilmek.
2. **Projeye sadık kalmak** — Yeni fikirler geldiğinde temel prensipleri korumak.
3. **AI ile çalışırken bağlam vermek** — Bu dosyayı AI'a okutarak sıfırdan açıklamak zorunda kalmamak.
4. **Neyi neden yaptığımızı hatırlamak** — Her kararın arkasındaki mantığı unutmamak.

> ⚠️ **Kural:** Bu dosyayı düzenlemeden önce bir kopyasını `PLAN_archive_YYYYMMDD.md` olarak sakla.

---

## 1. VİZYON

### 1.1. Sektörel Problem

Cam temperleme ve ısıcam üretimi, her siparişin farklı geometride olduğu, istisnasız bir üretim modelidir. Klasik ERP sistemleri bu sektörün **iki temel körlüğünü** çözememektedir:

| Problem                    | Açıklama                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **🔥 Fire Kontrolsüzlüğü** | Trim, rodaj, kırık, yanlış üretim gibi kayıplar gerçek boyutuyla hiçbir zaman raporlanmaz. Maliyet gizli kalır.                                |
| **💸 Maliyet Körlüğü**     | "m² başına maliyet" yanlış bir modeldir. Çıta ve silikon çevre uzunluğuna; elektrik/doğalgaz ise hacme göre değişir. Sabit oranla dağıtılamaz. |

### 1.2. GlassOS Nedir?

**GlassOS**, ERP'lerin üzerinde çalışan bağımsız bir **Üretim Zekâsı Platformu (Production Intelligence Platform)** ve **MES (Manufacturing Execution System)**'dir.

```
ERP  ——►  Sipariş Üretir
GlassOS  ——►  Üretimi Yönetir, Gerçek Verinin Tek Kaynağı Olur
```

- ERP'ye API bağımlılığı **yoktur**.
- GlassOS, ERP'nin çıktısını (Excel/CSV) alır; sonrasını kendi içinde yönetir.
- Üretim takibi sipariş kalemi seviyesinde, sayaç bazlı yürütülür; fiziksel cam parçaları kalıcı veri varlığı olarak saklanmaz.

### 1.2.A. Production Calculation Engine — GlassOS'un Rekabet Üstünlüğü

GlassOS'u rakiplerinden ayıran en büyük mimarik özellik, **Production Calculation Engine**'dir.

Sıradan yazilimlar üretim hesaplamalarını tek bir "fire payı" veya "m² başına sabit maliyet" formulüyle geçiştirir. GlassOS bunu reddeder.

**GlassOS'un hesaplama motorunun temel farkları:**

| Özellik            | Rakip Sektör Yazılımı     | GlassOS                                                                                                      |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Fire Sınıflandırma | Tek tip "fire"            | 9 ayrı kayip sınıfı (Trim, Grinding, Optimization, Scrap, Production, Quality, Breakage, Inventory, Remnant) |
| Rodaj Hesabı       | Tek toplam değer          | 4 kenar bağımsız — Factory Configuration                                                                     |
| Trim Hesabı        | Sipariş/cam bazlı         | Yalnızca Full Sheet bazlı, 4 kenar bağımsız                                                                  |
| Remnant Kararı     | Operatör takdiri          | Factory Configuration eşikleriyle otomatik                                                                   |
| Müşteri Ölçüsü     | Tek yer değiştirilen ölçü | Business Dimension değişmez; Production Dimension hesaplamada kullanılır                                     |
| Maliyet Hesabı     | m² × sabit birim fiyat    | Hammadde + Trim payı + Grinding + Optimizasyon + Çevre bazı + Sabit gider + Ardiye - Scrap geliri            |
| Isıcam Maliyeti    | m² × fiyat                | m² (alan) + çevre × birim (spacer, silikon, butil)                                                           |

Bu engine'in tam iş kuralları: `PRODUCTION_CALCULATION_ENGINE.md`

> **Not:** GlassOS'un uzun vadeli hedeflerinden biri gerçek üretim maliyetini **Inventory Valuation Engine** ile hesaplamaktır.

### 1.3. Stratejik Hedef

Bu bir lokal yazılım değil, baştan sona **B2B SaaS** olarak kurgulanmış bir üründür.

- Pilot fabrika, yalnızca bir **test ve doğrulama aracıdır**.
- Sistem, en başından "birden fazla fabrika aynı platformda izole çalışabilir" mimarisiyle inşa edilecektir.
- Sektörde **doğrudan rakip yoktur** — sağlam temel + hızlı inovasyon = pazar liderliği.

---

## 2. DEĞİŞMEZ TASARIM PRENSİPLERİ (Ürün Manifestosu)

> Bu prensipler **esnetilemez.** Yeni özellik veya değişiklik talep edildiğinde bu listeye bakılır.

### 2.1. 🎯 Order-Line Based Production Tracking

Üretim takibi sipariş kalemi seviyesinde, sayaç bazlı yürütülür. Fiziksel cam parçaları kalıcı veri varlığı olarak saklanmaz.

```
Sipariş (Master)
  └── Sipariş Kalemi (Detail — Spesifikasyon/Reçete)
        └── Production Counters (Requested / Completed / Missing / Broken / Delivered)
```

### 2.2. 🚫 Sıfır Manuel Veri Girişi (Zero Manual Entry)

- Operatörler sahada **hiçbir hesaplanabilir değeri** (m², çevre, fire oranı) klavye ile girmez.
- En/boy bilgileri ofiste **bir kez** girilir; sistem reçeteleri otomatik türetir.
- Saha işlemleri yalnızca: **barkod okutma** + **büyük dokunmatik butonlar** (Başlat / Bitir / Kırıldı / Mola).

### 2.3. ⬅️ Çekme (Pull) Kuyruk Mimarisi

- İstasyonlar arası akış "itme" değil **"çekme"** mantığındadır.
- Önceki istasyon "Tamamlandı" demeden, sonraki istasyon o camı ekranında göremez.
- Her istasyonun önünde 3 liste vardır: **Bekleyen / İşlemde / Sorunlu**

### 2.4. 🔒 Sipariş Bütünlüğü Kuralı

- Bir sipariş, içindeki **tüm sipariş kalemleri** ve ilgili üretim sayaçları tamamlanmadan `Tamamlandı` durumuna geçemez.
- Fiziksel cam parçaları kalıcı bir veri varlığı değildir; rework ve breakage, ilgili sipariş kaleminin sayaçları ve üretim geçmişi üzerinden izlenir.

### 2.5. 🧠 Psikolojik Çerçeveleme ve Veri İzolasyonu (KVKK)

- Operatör ekranlarında başka personelin performansı, kırık sayısı veya fire oranı **kesinlikle gösterilmez**.
- Performans ve hata analizleri yalnızca **Yönetici/Patron** yetkisine açıktır.
- Hem çalışan morali hem de KVKK uyumluluğu için zorunludur.

### 2.6. 📶 Kesintisiz Saha (Offline-First)

- Fabrika zeminindeki internet kesintileri operasyonu **durduramaz**.
- Saha panelleri (PWA) ve şoför uygulaması: veriyi yerelde (`IndexedDB`) tutar, bağlantı geldiğinde sunucuyla **asenkron eşitler** (Sync-Queue).

### 2.7. ✅ Feature Gate (Özellik Filtresi)

Yeni bir özellik geliştirmeye başlamadan şu sorulardan en az birine "Evet" alınmalıdır:

- Operatörün işini kolaylaştırıyor mu?
- Fireyi azaltıyor mu?
- Gerçek maliyeti görünür yapıyor mu?
- Manuel işi otomatikleştiriyor mu?
- Patronun karar kalitesini artırıyor mu?

---

## 3. MİMARİ VE TEKNOLOJİ KARARLARI

### 3.1. Genel Yaklaşım

| Özellik        | Karar                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| Mimari         | Bulut tabanlı, API-first (RESTful)                                         |
| Multi-Tenant   | Tüm tablolarda zorunlu `fabrika_id`                                        |
| Veri Güvenliği | PostgreSQL **Row-Level Security (RLS)** — veritabanı seviyesinde izolasyon |
| Ölçekleme      | Stateless API katmanı, yatay ölçekleme                                     |

### 3.2. Teknoloji Stack

| Katman                       | Seçim                        | Gerekçe                                                    |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------- |
| **Veritabanı**               | Neon (PostgreSQL Serverless) | Kullanım bazlı faturalama, otomatik ölçekleme, RLS desteği |
| **Auth**                     | Auth.js                      | Rol tabanlı (Operatör, Ofis, Yönetici, Şoför, Müşteri)     |
| **Depolama**                 | Cloudflare R2                | Egress ücretsiz, PoD fotoğrafları için ideal               |
| **Frontend (Ofis/Yönetici)** | Modern SPA (React/Vue)       | Karmaşık tablolar, filtreleme, sürükle-bırak               |
| **Frontend (Saha)**          | PWA (Progressive Web App)    | Offline-first, büyük dokunmatik hedefler, eldiven uyumlu   |
| **Gerçek Zamanlı**           | Hibrit (aşağıya bak)         | Maliyet/performans optimizasyonu                           |
| **API**                      | RESTful (OpenAPI)            | Standart, kolay entegrasyon                                |
| **Barındırma**               | Bulut (AWS/GCP/Azure — açık) | Mobil ve dış erişim gerekli                                |

### 3.3. Hibrit Gerçek Zamanlılık Mimarisi

---

## Sprint 2.2 (COMPLETED ✅)

Tarih: 2026-07-14 / 2026-07-15

Kapsam: Sadece veritabanı (DB) katmanında üretim master verisinin sağlamlaştırılması ve Mimari Dokümantasyon süreçleri.

Yapılanlar (kısa):

- `packages/db/src/schema.ts` ve `packages/db/migrations/0002_production_master_data.sql` güncellendi.
- `material_unit_profiles` tablosundan `tenant_id` kaldırıldı; tenant bilgisi `materials` tablosundan türetilecek.
- Kategori → Malzeme ve Ürün Kategori → Ürün referansları için `ON DELETE RESTRICT` getirildi (kazara toplu silinme engellendi).
- Tenant-scoped benzersiz index'ler eklendi: `(tenant_id, material_code)`, `(tenant_id, product_code)`, `(tenant_id, recipe_code)`, `(tenant_id, routing_template_name)`.
- Sequence tekrarı engellendi: `(recipe_id, sequence)`, `(routing_template_id, sequence)` için unique index eklendi.
- Performans için seçilmiş index'ler eklendi (tenant ve FK lookup odaklı).
- Production Calculation Engine ve Inventory Valuation Engine (Architecture) oluşturuldu.
- `PRODUCT_ARCHITECTURE.md` dosyasına Sprint 2.2 kapsamında tamamlanmış ürün modeli örneği ve doküman senkronizasyonu açıklaması eklendi.

Not: Bu sprintte uygulama veya servis katmanında hiçbir değişiklik yapılmadı. Tüm değişiklikler yalnızca DB şeması, migration ve tip tanımlarına (packages/types) uygulanmıştır.

---

## Sprint 2.4 (COMPLETED ✅)

Kapsam: Veritabanı implementasyonu ve standartlar.

### Sprint 2.4.0 — Database Standards (COMPLETED ✅)

Tarih: 2026-07-16

Yapılanlar:

- `DATABASE_STANDARDS.md` dosyası oluşturuldu.

### Sprint 2.5.0 — Core Production Service Layer (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: Sipariş onayından Kesim Kuyruğu'na kadar olan üretim sürecinin servis katmanı implementasyonu. İlk çalıştırılabilir dikey kesit (Vertical Slice #1).

Yapılanlar:

- **5 servis sınıfı** oluşturuldu:
  - `CustomerService` — Müşteri yaşam döngüsü (create, update, deactivate, validateExists, findActive)
  - `OrderService` — Sipariş yaşam döngüsü (create, update, approveOrder, cancelOrder, loadOrderLines, validateOrder)
  - `ProductionService` — Üretim emri yaşam döngüsü (createProductionOrder, assignToStation, transferProduction, updateStatus, validateProduction)
  - `ProductionQueueService` — Kesim kuyruğu yönetimi (createWorkQueue, selectMaterial, addOrderLineToBasket, startQueue, completeQueue, getQueueStatistics)
  - `ReworkService` — Revork emri oluşturma (createReworkOrder, findOpenReworks, findByParentOrder)
- **6 domain event** tanımlandı: OrderApprovedEvent, QueueCreatedEvent, QueueStartedEvent, QueueCompletedEvent, ProductionTransferredEvent, ReworkCreatedEvent
- **Validation rules** implementasyonu:
  - Sipariş onayı: iptal edilmiş/onaylanmış sipariş reddi, aktif müşteri kontrolü, boş sipariş reddi, ürün referansı zorunluluğu
  - Sipariş iptali: üretimde/tamamlanmış sipariş reddi
  - Üretim durum geçişleri: pending→in_progress|cancelled, in_progress→completed|broken|rework, broken→rework|cancelled, rework→in_progress|completed
  - Kuyruk: boş kuyruk başlatma reddi, başlatılmamış kuyruk tamamlama reddi, mükerrer öğe engelleme
- **Transaction yönetimi**: Tüm mutasyon işlemleri `withTransaction()` ile sarıldı
- **Event fırlatma**: approveOrder (OrderApprovedEvent), startQueue (QueueStartedEvent), completeQueue (QueueCompletedEvent), transferProduction (ProductionTransferredEvent), createReworkOrder (ReworkCreatedEvent)
- **34 servis testi** (23'ü yeni sprintte + 11 tanımlanmış hata düzeltildi)
- **Toplam 57 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok

### Sprint 2.5.1 — Cutting Execution, Breakage & Rework Workflow (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: Kesim oturum yönetimi, kırılma kaydı, otomatik revork oluşturma, Fire Depot sahipliği, sipariş satırı sayaçları ve Merge Preparation.

Yapılanlar:

- **6 yeni servis/metot**:
  - `CuttingExecutionService` — Kesim oturumu yaşam döngüsü (createSession, startSession, completeSession, pauseSession, resumeSession, cancelSession)
  - `CuttingExecutionService.addItemToBasket()` / `removeItemFromBasket()` — Work Basket yönetimi
  - `CuttingExecutionService.registerBreakage()` — Kırılma kaydı (tek transaction içinde: sayaç güncelleme, prod status güncelleme, revork oluşturma, Fire Depot atama)
  - `CuttingExecutionService.getOrderLineCounters()` — Sipariş satırı sayaç sorgulama
  - `ReworkService.createBreakageRework()` — Kırılma kaynaklı otomatik revork (Fire Depot ownership, parent referansları)
  - `ReworkService.getMergePreparation()` — Merge hazırlık metadata'sı
- **8 yeni domain event**: CuttingSessionCreatedEvent, CuttingStartedEvent, CuttingCompletedEvent, CuttingPausedEvent, CuttingResumedEvent, CuttingCancelledEvent, BreakageRegisteredEvent, FireDepotAssignedEvent
- **Validation rules**:
  - Kesim: boş oturum başlatma reddi, başladıktan sonra öğe ekleme reddi, malzeme uyuşmazlığı kontrolü
  - Kırılma: completedQuantity'den büyük kırılma reddi, mükerrer aktif revork reddi, tamamlanmış revork'ta kırılma reddi
- **Transaction yönetimi**: registerBreakage ve createBreakageRework withTransaction() içinde
- **27 yeni test** (10 session, 7 basket, 5 breakage, 2 counter, 2 merge, 1 end-to-end)
- **Toplam 84 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok

### Sprint 2.5.4 — Production Quality Control Engine (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: Kalite kontrol motoru — inspeksiyon lifecycle, ölçümler, görsel muayene, Temper/IG kontrolleri, READY validasyonu, revork entegrasyonu.

Yapılanlar:

- **1 yeni servis**: `QualityControlService` — Kalite kontrol motoru
  - `startInspection()` — İnspeksiyon başlatma
  - `completeInspection()` — İnspeksiyon tamamlama (pass/fail/conditional_pass/rework_required/scrap)
  - `rejectInspection()` — İnspeksiyon reddetme
  - `approveInspection()` — Koşullu geçer onaylama → READY hazırlığı
  - `recordMeasurements()` — Boyutsal ölçüm kaydı (manuel giriş)
  - `recordVisualInspection()` — Görsel muayene kaydı
  - `recordNotes()` — Not ekleme
  - `getHistory()` — Geçmiş sorgulama (immutable)
  - `getStatistics()` — İstatistikler
  - `canProceedToReady()` — READY uygunluk kontrolü
- **6 inspeksiyon tipi**: visual, dimension, edge, temper, insulating_glass, final
- **5 inspeksiyon sonucu**: pass, fail, conditional_pass, rework_required, scrap
- **READY kuralları**: PASS veya onaylı conditional_pass → READY izni; aksi halde blok
- **Revork entegrasyonu**: rework_required → revork oluşturma (mükerrer koruma)
- **Hurda yönetimi**: scrap → üretim durumu "scrapped"
- **6 yeni domain event**: InspectionStartedEvent, InspectionPassedEvent, InspectionFailedEvent, InspectionRejectedEvent, ReworkRequestedEvent, ReadyApprovedEvent
- **31 yeni test**: lifecycle (5), measurements (2), temper (2), IG (2), READY (4), conditional pass (3), rework (2), scrap (1), notes (2), history (2), statistics (3), edge cases (3)
- **Toplam 183 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok
- Toplam 34 domain event, 9 servis

### Sprint 2.5.5 — Dispatch & Delivery Engine (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: Sevkiyat ve teslimat motoru — READY ürünlerin sevkiyata hazırlanması, araç ataması, yükleme, sevkiyat, teslimat ve kısmi teslimat yönetimi.

Yapılanlar:

- **1 yeni servis**: `DispatchService` — Sevkiyat ve teslimat motoru
  - **READY Pool**: `getReadyProductions()` — Kalite kontrol onaylı ürünleri listeleme
  - **READY Pool**: `getReadyOrderLines()` — Sipariş kalemi bazında READY ürünleri gruplama
  - **READY filtreleme**: müşteri, ürün tipi, alan, sipariş, sipariş kalemi
  - **Dispatch Basket**: `addToBasket()`, `removeFromBasket()`, `getBasket()`, `getBasketStatistics()`
  - **Sepet kuralları**: Mükerrer ekleme koruması, READY durum validasyonu, iptal edilmiş üretim engelleme
  - **Delivery Lifecycle**: `createDelivery()` → `loadVehicle()` → `unloadVehicle()` → `startShipment()` → `completeDelivery()` | `completePartialDelivery()`
  - **Durum geçişleri**: created → loading → ready_to_ship → in_transit → delivered | partially_delivered | cancelled
  - **Araç Ataması**: `assignVehicle()`, `assignDriver()`, `assignDispatcher()` — durum bazlı validasyon
  - **İptal**: `cancelDispatch()` — teslim edilmiş veya kısmi teslim edilmiş sevkiyatlar iptal edilemez
  - **Sayaçlar**: `getOrderLineDeliveryCounters()` — requested, ready, loaded, delivered, remaining
  - **Geçmiş**: `getDeliveryHistory()` — immutable kayıtlar, üretim emrine göre filtreleme
  - **İstatistikler**: `getDeliveryStatistics()` — durum bazlı dağılım, toplam yükleme/teslimat/iptal
- **8 yeni domain event**: DispatchCreatedEvent, VehicleAssignedEvent, LoadingStartedEvent, LoadingCompletedEvent, ShipmentStartedEvent, DeliveryCompletedEvent, PartialDeliveryCompletedEvent, DispatchCancelledEvent
- **29 yeni test**: READY Pool (3), Dispatch Basket (5), Create Delivery (2), Vehicle Assignment (4), Loading Lifecycle (3), Shipment & Delivery (4), Cancellation (3), Delivery Counters (1), History (2), Statistics (2)
- **Toplam 211 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok
- Toplam 42 domain event, 10 servis

### Sprint 2.5.3 — Station Operation Engine (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: İstasyon bazlı üretim kuralları — Grinding, Temper, Insulating Glass, Low-E validasyonu, fırın kapasitesi, bekleme havuzları.

Yapılanlar:

- **1 yeni servis**: `StationOperationService` — İstasyon operasyon motoru
  - `startOperation()` — Operasyon başlatma (giriş validasyonu + event emission)
  - `completeOperation()` — Operasyon tamamlama
  - `cancelOperation()` — İptal
  - `rejectOperation()` — Red (sebep zorunlu)
  - `validateOperation()` — İstasyona giriş doğrulama
  - `validateLowE()` — Low-E tipi doğrulama
  - `calculateFurnaceCapacity()` — Fırın kapasitesi (normal=1×, temperli IG=2×)
  - Waiting pool: addToWaitingPool, removeFromWaitingPool, getWaitingPool, getWaitingPoolStatistics, loadWaitingProduction
  - Geçmiş: getOperationHistory, getStationOperationHistory
  - İstatistik: getStationStatistics, getAllStationStatistics
- **İstasyon kuralları**:
  - Grinding: CUTTING/REWORK_CUTTING'den gelmeli (uyarı, hata değil)
  - Temper: Grinding tamamlanmış OLMALI (sert hata); Low-E kontrolü
  - IG: Tamamlanmış üretimleri engelleme
  - Hole/Vent/CNC: Esnek — katı validasyon yok
- **8 yeni domain event**: GrindingStartedEvent, GrindingCompletedEvent, TemperStartedEvent, TemperCompletedEvent, InsulatingGlassStartedEvent, InsulatingGlassCompletedEvent, FurnaceCapacityCalculatedEvent, LowEValidationFailedEvent
- **33 yeni test**: grinding lifecycle (4), temper lifecycle (3), furnace capacity (3), IG lifecycle (3), Low-E validation (3), entry validation (5), waiting pools (4), operation history (2), station statistics (4), validation edge cases (2)
- **Toplam 152 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok
- Toplam 28 domain event, 8 servis, 3 vertical slice test

### Sprint 2.5.2 — Production Transfer & Merge Workflow (COMPLETED ✅)

Tarih: 2026-07-16

Kapsam: İstasyonlar arası üretim transferi, transfer lifecycle yönetimi, transfer geçmişi/istatistikleri, rework merge workflow.

Yapılanlar:

- **1 yeni servis**: `ProductionTransferService` — Tam transfer lifecycle yönetimi
  - `initiateTransfer()` — Transfer başlatma (6 tip: automatic/manual/rework_merge/correction/return_to_previous/emergency)
  - `completeTransfer()` — Transfer tamamlama
  - `cancelTransfer()` — Transfer iptal
  - `rejectTransfer()` — Transfer reddetme
  - `returnToPreviousStation()` — Önceki istasyona dönüş
  - `manualTransfer()` — Operatör kaynaklı manuel transfer
  - `assignReadyStation()` — Hazır istasyon atama
  - `getTransferHistory()` — Transfer geçmişi sorgulama (immutable)
  - `getTransferStats()` — Transfer istatistikleri (type/status bazlı)
  - `getAllTransfers()` — Tüm transferleri listeleme (filtreleme destekli)
  - `findTransferById()` — ID ile transfer sorgulama
- **1 servis geliştirmesi**: `ReworkService.mergeRework()` — Revork merge workflow
  - 8 validation rule (rework var mı, parent production var mı, order line var mı, missing > 0, duplicate merge, cancelled parent, completed order, unresolved rework)
  - Counter güncelleme: completedQuantity artar, brokenQuantity DEĞİŞMEZ (immutable)
  - Rework production order kapatma + reworkStatus → completed
- **6 yeni domain event**: TransferInitiatedEvent, TransferCompletedEvent, TransferCancelledEvent, TransferRejectedEvent, ReworkMergedEvent, ReadyStationAssignedEvent
- **35 yeni test**: initiation (4), lifecycle (3), validation (7), history/statistics (6), merge success (3), merge validation (7), counter invariants (2), stats after lifecycle (3)
- **Toplam 119 test** geçiyor (5 test dosyası, 0 hata)
- Tip kontrolü: `npx tsc --noEmit` — 0 hata
- **Architecture Freeze korundu**: Şema, migration veya repository katmanında değişiklik yok
- Transfer geçmişi in-memory (immutable history pattern) — architecture freeze nedeniyle repository değişikliği yapılamadı
- Station routing hard-coded değil — StationRoute interface ile yapılandırılabilir

### Sprint 2.4.6 — Core Production Repository Layer (COMPLETED ✅)

Tarih: 2026-07-16

Yapılanlar:

- 6 adet repository oluşturuldu: Customer, Order, OrderLine, Production, ProductionQueue, Rework.
- CustomerRepository: findByCode, findByName, findByPhone, findByEmail, findActiveCustomers yöntemleri.
- OrderRepository: findPendingApproval, findApproved, findWaitingProduction, findReadyForDispatch, findByCustomer, findByOrderNumber, findByDateRange yöntemleri.
- OrderLineRepository: findByOrder, findIncompleteLines, findBrokenLines, findWaitingRework yöntemleri.
- ProductionRepository: findActiveProduction, findWaitingStation, findCompletedProduction, findByStation, findByBarcode yöntemleri.
- ProductionQueueRepository: findActiveQueues, findQueueByStation, findQueueByOperation yöntemleri.
- ReworkRepository: findOpenReworks, findByParentOrder, findWaitingCutting, findCompletedReworks, findFireDepotItems, findScrapItems yöntemleri.
- `packages/db/test/production-repository.test.ts` ile 7 integration test senaryosu eklendi: customer filtering, order status queries, order line analysis, production tracking, queue management, ve rework handling.
- Tum repositories soft delete ve multi-tenant/factory filtering otomatik olarak destekler.
- No schema or migration changes introduced.

### Sprint 2.4.5 — Repository Layer (Identity & Organization) (COMPLETED ✅)

Tarih: 2026-07-16

Yapılanlar:

- `packages/db/src/repositories/base.repository.ts` ile temel repository sınıfı oluşturuldu.
- `packages/db/src/repositories/*.repository.ts` ile 6 adet repository uygulandı: Tenant, Factory, User, Role, Permission, Personnel.
- `packages/db/test/repository.test.ts` ile repository katmanı testleri eklendi.
- Repository katmanı, create/update/find/softDelete/restore/paginate/search işlemleri destekler.
- Multi-tenant ve factory filtering otomatik olarak desteklenir.
- Soft delete politikası repository seviyesinde uygulanır.
- Repository iş mantığı içermez; yalnızca persist ettiği için kullanılır.
- No schema or migration changes introduced.

### Sprint 2.4.4 — Database Infrastructure (COMPLETED ✅)

Tarih: 2026-07-16

Yapılanlar:

- `packages/db/src/db/client.ts` ile merkezi PostgreSQL client yapısı kuruldu.
- `packages/db/src/db/transactions.ts` ile transaction ve tenant-session yardımcıları hazırlandı.
- `packages/db/src/db/query.ts` ile pagination/sorting/filter/search/soft-delete/tenant-factory query altyapısı hazırlandı.
- `packages/db/src/db/context.ts` ile gelecekteki tenant/factory/user/request context desteği hazırlandı.
- `packages/db/src/db/errors.ts` ile unique, FK, check, transaction, connection, timeout ve validation hatası eşleme altyapısı eklendi.
- `packages/db/src/db/relations.ts` ile implemented aggregate'ler için drizzle relation tanımları eklendi.
- `packages/db/test/infrastructure.test.ts` ile altyapı testleri eklendi.
- Şema, migration ve iş mantığı değişmeden, yalnızca repository katmanı için kullanılacak paylaşımlı altyapı sağlandı.
- Tablo isimlendirme (plural, snake_case, prefix-free, junction tables) kuralları kilitlendi.
- Kolon isimlendirme standartları (id, tenant_id, factory_id, status, audit, dimensions, money vb.) tanımlandı.
- Primary Key olarak ULID (CHAR(26)) kararı ve üretim prensipleri belgelendi.
- Foreign Key (singular referenced + _id, ON DELETE RESTRICT) ve İndeks (idx_, uq_, idx_{table}_active partial) standartları kilitlendi.
- Constraints (pk_, fk_, uq_, chk_), Timestamp (TIMESTAMPTZ UTC), Hassasiyet standartları (NUMERIC precision) belgelendi.
- Enum (TypeScript union/const & lookup tables) ve JSONB kullanım politikaları netleştirildi.
- Soft Delete / Hard Delete, Audit Kolonları ve Migration isimlendirme standartları kilitlendi.

---

## Sprint 2.6.0 — REST API Foundation (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** Tüm 10 servisi REST API üzerinden erişilebilir kılmak.  
**Durum:** ✅ Tamamlandı — 216 test geçiyor (211 db + 5 api), `tsc --noEmit` 0 hata.

### Yapılanlar

**Yeni Paket:** `apps/api/`

- Hono 4.7.4 + `@hono/node-server` 1.13.8 ile REST API kurulumu
- Zod 3.24.1 + `@hono/zod-validator` 0.4.3 ile DTO validasyonu
- JWT auth middleware (admin/operatör stub)
- 6 hata sınıfı + merkezi hata yönetimi
- Response yardımcıları: `success()`, `created()`, `noContent()`, `sendError()`
- Swagger UI (`@hono/swagger-ui`) + OpenAPI 3.0 spesifikasyonu

**10 Gerçek Controller (107 endpoint):**

| Controller                                       | Endpoint Sayısı |
| ------------------------------------------------ | --------------- |
| Customer                                         | 6               |
| Order                                            | 7               |
| Production                                       | 8               |
| Queue                                            | 10              |
| Transfer                                         | 11              |
| Quality                                          | 10              |
| Dispatch                                         | 21              |
| Rework                                           | 7               |
| Cutting                                          | 12              |
| Station                                          | 16              |
| **Stub** (Personnel, Machine, Inventory, Recipe) | 4               |

**Mimari Kurallar:**

- Controller'lar yalnızca: HTTP isteği alır, DTO doğrular, Servis çağırır, Yanıt döner
- Sıfır iş mantığı, sıfır hesaplama, sıfır repository kullanımı
- Tüm iş kuralları `@repo/db` servislerinde kaldı
- Architecture Freeze korundu: şema/migration/repository değişikliği yok

**Testler:**

- `test/api.test.ts` — 5 smoke test (modül yapısı, router, DTO, lib, controller export)
- Tüm 211 db testi regresyonsuz geçiyor

**Dokümantasyon:**

- `API_ARCHITECTURE.md` — Kapsamlı API referansı
- `src/docs/openapi.ts` — OpenAPI 3.0 spesifikasyonu (107 endpoint)
- Swagger UI: `/api/v1/docs` adresinde

**Komutlar:**

```bash
cd apps/api
npm run dev          # Geliştirme (tsx watch)
npm run check-types  # Tip kontrolü (tsc --noEmit)
npm test             # Test (vitest run)
npm run build        # Derleme
npm start            # Prodüksiyon
```

---

## Sprint 2.6.1 — Multi-Tenant Security Hardening & API Audit (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** Kapsamlı güvenlik ve mimari denetim — 8 boyutta analiz.  
**Durum:** ✅ Tamamlandı — **7 kritik blokaj tespit edildi. GlassOS üretim için HAZIR DEĞİL.**

### Denetim Kapsamı

| Boyut                                      | İncelenen         | Bulgu Sayısı                                      |
| ------------------------------------------ | ----------------- | ------------------------------------------------- |
| Schema (RLS, tenant_id, factory_id)        | 52 tablo          | 5                                                 |
| Repository (14 repos, tüm metodlar)        | ~200 metod        | 4                                                 |
| Service (10 servis, tüm metodlar)          | ~150 metod        | 4                                                 |
| Controller (14 controller, auth kullanımı) | 107 endpoint      | 4                                                 |
| Domain Events (37 event, EventPublisher)   | 37 interface      | 1                                                 |
| Security (JWT, RBAC, SQL injection, ULID)  | Tüm katmanlar     | 5                                                 |
| OpenAPI Coverage (109 path vs 106 route)   | Tüm spec          | 7                                                 |
| **Toplam**                                 | **Tüm kodtabanı** | **27 bulgu (7 Kritik, 3 High, 10 Medium, 7 Low)** |

### 🔴 Kritik Bulgular (Çözülmeden Üretime Geçilemez)

| #   | Bulgu                                                                                                              | Katman                | Risk                                         |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------- |
| 1   | **Auth middleware stub** — Herhangi bir Bearer token kabul ediliyor, JWT doğrulaması yok, tenantId sabit kodlanmış | Security              | Tam kimlik doğrulama bypass'ı                |
| 2   | **Sıfır RLS politikası** — 52 tablonun hiçbirinde Row-Level Security aktif değil                                   | Database              | Veritabanı seviyesinde tenant izolasyonu yok |
| 3   | **`withTenantSession` no-op** — Opsiyonlar alınıyor ama hiçbir sorguya iletilmiyor                                 | Architecture          | Sessiz veri sızıntısı                        |
| 4   | **Cutting controller OpenAPI ile tamamen uyumsuz** — 0/11 route eşleşiyor (`/sessions` vs düz path)                | OpenAPI               | Dokümantasyon tamamen yanlış                 |
| 5   | **Station controller OpenAPI ile yapısal uyumsuz** — 4/16 route eşleşiyor (`/operations` vs `/{id}/action`)        | OpenAPI               | Dokümantasyon yanlış                         |
| 6   | **Rework controller 4 eksik + 5 fazla route** — 3/7 route eşleşiyor                                                | OpenAPI               | Dokümantasyon yanlış                         |
| 7   | **Tüm repository filtrelemesi in-memory** — SQL WHERE değil, JS `filter()` ile yapılıyor                           | Database/Architecture | Performans çöküşü + veri sızıntısı           |

### 🟠 Yüksek Riskli Bulgular

| #   | Bulgu                                                                                           | Katman     |
| --- | ----------------------------------------------------------------------------------------------- | ---------- |
| 8   | **Hiçbir yerde yetkilendirme (authorization) kontrolü yok** — RBAC middleware mevcut değil      | Security   |
| 9   | **`update()`, `softDelete()`, `restore()` tenant guard'sız** — ID ile doğrudan güncelleme/silme | Repository |

### 🟡 Orta Riskli Bulgular

| #   | Bulgu                                                                                                 | Katman       |
| --- | ----------------------------------------------------------------------------------------------------- | ------------ |
| 10  | **`getCurrentUser` 9/10 controller'da kullanılmıyor** — userId/tenantId servislere iletilmiyor        | API          |
| 11  | **`withTransaction` hiçbir yerde `options.db` almıyor** — Gerçek DB transaction yok                   | Architecture |
| 12  | **CuttingExecutionService tamamen in-memory** — Map'te tutuluyor, yeniden başlatmada kayboluyor       | Service      |
| 13  | **37 domain event tanımlı ama hiçbiri publish edilmiyor** — EventPublisher interface only             | Events       |
| 14  | **3 tabloda factory_id var ama tenant_id yok** (grinding_profiles, trim_profiles, remnant_thresholds) | Schema       |
| 15  | **Status code uyuşmazlığı** — Cutting controller 204 döner, OpenAPI 200 diyor                         | OpenAPI      |
| 16  | **Rework `by-production` vs `by-parent` isim uyuşmazlığı**                                            | OpenAPI      |

### 🟢 Düşük Riskli Bulgular

| #   | Bulgu                                                                 |
| --- | --------------------------------------------------------------------- |
| 17  | ULID validasyonu tutarsız — bazı DTO'lar `z.string()` kullanıyor      |
| 18  | Bazı DTO'lar inline `z.object({})` yerine isimli export kullanmıyor   |
| 19  | Sorgu parametre validasyonu sadece dispatch.controller.ts'de var      |
| 20  | `user_sessions` tablosunda tenant context yok                         |
| 21  | Customer deactivate endpoint'inin OpenAPI'de requestBody'si eksik     |
| 22  | 4 stub controller 501 dönüyor (personnel, machine, inventory, recipe) |

### ✅ Temiz Bulgular

| Denetim                                                                       | Sonuç                             |
| ----------------------------------------------------------------------------- | --------------------------------- |
| Controller'lar doğrudan repository kullanmıyor                                | ✅ 10/10 controller — sıfır ihlal |
| Controller'lar `try/catch` + `sendError` kullanıyor                           | ✅ Tüm controller'lar             |
| DTO validasyonu `zValidator` ile body'den önce yapılıyor                      | ✅ Tüm body-mutating route'lar    |
| Customer, Order, Production, Queue, Transfer, Quality, Dispatch OpenAPI uyumu | ✅ 76/76 route tam eşleşme        |
| Tüm testler geçiyor                                                           | ✅ 211 db + 5 api = 216 test      |
| Tip kontrolü                                                                  | ✅ `tsc --noEmit` 0 hata          |

---

## Sprint 2.6.2 — Production Readiness I: Authentication & Tenant Context (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** JWT Authentication, RBAC Authorization, Tenant Context, DTO/Cleanup, SQL WHERE filtering  
**Durum:** ✅ Tamamlandı — **Üretim hazırlığının temel güvenlik katmanı kuruldu.**

### Yapılanlar

#### 🔐 Authentication & Authorization

| Öğe                 | Detay                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JWT Doğrulama**   | `jose` kütüphanesi ile gerçek JWT doğrulama (RS256/HS256). `authMiddleware` Express benzeri middleware olarak uygulandı. Bearer token zorunlu.                |
| **JWT Claims**      | `sub`, `tenantId`, `factoryId`, `role`, `name`, `email` — tümü `AppJwtPayload` tipinde. `jwtVerify()` sonrası `c.set("user", payload)` ile context'e eklenir. |
| **RBAC Middleware** | `requireRole(minimumRole)` — Role hiyerarşisi: Viewer < Operator < ProductionManager < FactoryManager < Administrator. `hasMinimumRole()` ile karşılaştırma.  |
| **Global Auth**     | Tüm route'lar `app.use("*", authMiddleware)` ile korunuyor. Public endpoint yok.                                                                              |

#### 🏢 Tenant Context

| Öğe                      | Detay                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kimlik Kaynağı**       | `getCurrentUser(c)` — JWT'den `CurrentUser` nesnesi döndürür. İstemci ASLA tenantId/factoryId/companyId göndermez.                                                 |
| **Transaction Tenant**   | `withTenantSession()` — Gerçek PostgreSQL transaction içinde `SELECT set_config('app.current_tenant_id', ...)` çağırır. RLS için hazırlık.                         |
| **SQL WHERE Filtreleme** | `buildWhereClause()` — Tüm repository sorguları `eq(table.tenantId, tenantId)` WHERE koşulu ile çalışır. `applyPostFilters()` sadece client-side search/sort için. |

#### 📦 DTO & Controller Cleanup

| Öğe                                          | Detay                                                                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DTO'lardan tenantId/factoryId Kaldırıldı** | 6 DTO dosyası: customer, cutting, order, production, queue, rework. İstemci artık tenantId/factoryId gönderemez.                                                                              |
| **DTO'lardan userId Kaldırıldı**             | production, dispatch gibi action DTO'larından userId çıkarıldı. Kimlik JWT'den alınır.                                                                                                        |
| **Controller Tenant Enjeksiyonu**            | 10 controller'da create/mutation endpoint'leri `getCurrentUser(c)`'dan `{ tenantId, factoryId, userId }` alır.                                                                                |
| **RBAC Controller'lara Eklendi**             | Admin işlemleri (`deactivateCustomer`) → `requireRole(Roles.Administrator)`. Yönetim işlemleri → `requireRole(Roles.ProductionManager)`. Operasyon işlemleri → `requireRole(Roles.Operator)`. |

#### 🛡️ Repository Tenant Guards

| Öğe                           | Detay                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **update/softDelete/restore** | TenantId parametresi alır, `eq(table.tenantId, tenantId)` WHERE koşulu ekler. Çapraz-tenant güncelleme engellenir.                                        |
| **BaseRepository**            | `buildWhereClause()` ile tenantScope, factoryScope, status, softDelete, activeFlag, id, code, slug, email filtreleri Drizzle ORM `where()` ile uygulanır. |

### Test Durumu

| Paket                | Test Sayısı            | Durum                |
| -------------------- | ---------------------- | -------------------- |
| **DB (packages/db)** | 211                    | ✅ Hepsi geçiyor     |
| **API (apps/api)**   | 16 (5 smoke + 11 auth) | ✅ Hepsi geçiyor     |
| **TypeScript**       | `tsc --noEmit`         | ✅ 0 hata (api + db) |

### Kalan İşler (Gelecek Sprintler İçin)

1. **RLS politikaları ekle** — 52 tablo için PostgreSQL Row-Level Security (büyük iş, ayrı sprint)
2. **Cutting, Station, Rework OpenAPI spec'lerini controller'larla uyumlu hale getir**
3. **Event publishing** — 37 domain event'in EventPublisher ile publish edilmesi
4. **CuttingExecutionService persistence** — Şu an in-memory çalışıyor

---

## Sprint 2.6.2B — Production Readiness Stabilization (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** In-Memory Filtering Elimination, SQL WHERE Expansion, ALS Auto-Enrichment, Tenant Context Propagation  
**Durum:** ✅ Tamamlandı — **17 in-memory .filter() kaldırıldı, 15+ yeni SQL filtresi eklendi, tüm repository okumaları ALS'den otomatik tenant context alıyor.**

### Yapılanlar

#### 🔍 SQL WHERE Expansion (`buildWhereClause`)

| Yeni Filtre                                                               | Kullanan Repository                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `customerId`                                                              | OrderRepository                                                              |
| `orderNumber`                                                             | OrderRepository                                                              |
| `orderId`                                                                 | OrderLineRepository                                                          |
| `orderLineId`                                                             | ProductionRepository                                                         |
| `isRework`                                                                | ProductionRepository                                                         |
| `glassBarcode`                                                            | ProductionRepository                                                         |
| `stationId`                                                               | ProductionQueueRepository                                                    |
| `operationCode`                                                           | ProductionQueueRepository                                                    |
| `reworkStatus`                                                            | ReworkRepository                                                             |
| `parentProductionOrderId`                                                 | ReworkRepository                                                             |
| `breakageEventId`                                                         | ReworkRepository                                                             |
| `internalCustomer`                                                        | ReworkRepository                                                             |
| `name`                                                                    | CustomerRepository                                                           |
| `phone`                                                                   | CustomerRepository                                                           |
| `currentStatus`                                                           | ProductionRepository                                                         |
| `currentStationId`                                                        | ProductionRepository                                                         |
| `currentOperation`                                                        | ProductionRepository                                                         |
| **Date range** (`startDate`/`endDate`)                                    | OrderRepository                                                              |
| **Quantity comparisons** (`incompleteOnly`, `hasBroken`, `waitingRework`) | OrderLineRepository                                                          |
| **Operation IN list** (`operationIn`)                                     | ProductionRepository                                                         |
| **Generic auto-mapping**                                                  | Tüm repository'ler — `options.filters.*` anahtarları otomatik `eq()` yapılır |

#### 🗑️ In-Memory .filter() Elimination

| Repository                | Kaldırılan .filter() Sayısı                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CustomerRepository        | 4 (`findByCode`, `findByName`, `findByPhone`, `findByEmail`)                                                                                                |
| OrderRepository           | 1 (`findByDateRange`)                                                                                                                                       |
| OrderLineRepository       | 3 (`findIncompleteLines`, `findBrokenLines`, `findWaitingRework`)                                                                                           |
| ProductionRepository      | 7 (`findActiveProduction`, `findWaitingStation`, `findCompletedProduction`, `findBrokenProduction`, `findByStation`, `findByMachine`, `findPendingCutting`) |
| ProductionQueueRepository | 1 (`findStationOperationQueue`)                                                                                                                             |
| ProductionService         | 1 (`findPendingCutting`)                                                                                                                                    |
| **Toplam**                | **17** in-memory .filter() SQL WHERE'e taşındı                                                                                                              |

#### 🔄 AsyncLocalStorage Auto-Enrichment

| Öğe                             | Detay                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **`enrichOptions()`**           | `selectMany()` her çağrıda `getTenantContext()` ile ALS'den tenantId/factoryId okur, eksikse `options`'a ekler |
| **Etki**                        | Tüm GET/POST/PATCH endpoint'leri otomatik tenant scoping kazanır — controller değişikliği gerekmez             |
| **`applyPostFilters` fallback** | Fake DB (test) ortamında da aynı filtreleme mantığı çalışır                                                    |

#### 🛡️ applyPostFilters — Fallback Tenant Scoping

| Özellik              | Detay                                                    |
| -------------------- | -------------------------------------------------------- |
| Tenant/factory scope | ALS'den gelen tenantId/factoryId ile fallback filtreleme |
| Generic filters      | `options.filters.*` tüm anahtarlar için otomatik `eq()`  |
| Quantity comparisons | `incompleteOnly`, `hasBroken`, `waitingRework`           |
| Operation IN         | `operationIn` array filtresi                             |
| Date range           | `startDate`/`endDate`                                    |
| Code filter          | `code`, `customerCode`, `factoryCode` OR'lu eşleşme      |

### Test Durumu

| Paket                | Test Sayısı    | Durum                |
| -------------------- | -------------- | -------------------- |
| **DB (packages/db)** | 211            | ✅ Hepsi geçiyor     |
| **API (apps/api)**   | 16             | ✅ Hepsi geçiyor     |
| **TypeScript**       | `tsc --noEmit` | ✅ 0 hata (api + db) |

### Mimari Notlar

1. **ALS Pattern:** `tenantMiddleware` → `setTenantContext()` → `AsyncLocalStorage` → `enrichOptions()` → tüm `selectMany()` çağrıları otomatik tenant context alır. Controller'larda `getCurrentUser(c)` ile manuel tenantId geçmeye gerek kalmaz.

---

## Sprint 2.6.2C — Transaction Context Propagation (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** Repository sorgularının `withTenantSession()` içinde AYNI PostgreSQL transaction client'ı üzerinden yürütülmesi — Codex blocker çözümü  
**Durum:** ✅ Tamamlandı — **Artık her repository sorgusu `withTenantSession()` içinde açılan transaction'ın bağlantısını kullanıyor. RLS değişkenleri (`set_config()`) ile sorgular aynı bağlantıda çalışıyor.**

### Yapılanlar

#### 🧬 Transaction Propagation via AsyncLocalStorage

| Öğe                                | Detay                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **`activeTransactionStore`**       | Yeni `AsyncLocalStorage<any>` — aktif Drizzle transaction client'ını saklar                        |
| **`getActiveDb()`**                | Yeni export — repository'lerin aktif transaction'ı almasını sağlar                                 |
| **`drizzle(tx)` wrapper**          | `withTenantSession()` içinde raw postgres `tx`'den Drizzle client oluşturulur (`sql.begin` içinde) |
| **`activeTransactionStore.run()`** | Callback, Drizzle transaction client ALS içinde yürütülür — bittiğinde otomatik temizlenir         |

#### 🏗️ BaseRepository Transaction Awareness

| Değişiklik                                 | Detay                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **`getDb()` prioritizes**                  | (1) explicit `options.tx` → (2) ALS'den aktif transaction → (3) `this._db` (global client)                |
| **`create()` fixed**                       | `this._db.insert()` → `this.getDb().insert()` — artık transaction içinde create de transaction'ı kullanır |
| **`update/softDelete/restore/selectMany`** | Zaten `this.getDb()` kullanıyordu — ALS'den otomatik transaction alır                                     |

#### 🔄 Değişen Akış

```
ÖNCE (broken):
  withTenantSession()
    → sql.begin(tx)            ← bağlantı A
    → set_config() on tx       ← bağlantı A'da RLS set edildi
    → repository.create()      ← this._db (bağlantı B) — RLS GÖRÜNMEZ!

SONRA (fixed):
  withTenantSession()
    → sql.begin(tx)            ← bağlantı A
    → set_config() on tx       ← bağlantı A'da RLS set edildi
    → drizzle(tx) → ALS        ← Drizzle wrapper tx üzerinde, ALS'ye kaydedildi
    → repository.create()      ← getDb() → ALS → drizzle(tx) → bağlantı A — RLS GÖRÜNÜR!
```

### Test Durumu

| Paket                | Test Sayısı    | Durum                |
| -------------------- | -------------- | -------------------- |
| **DB (packages/db)** | 211            | ✅ Hepsi geçiyor     |
| **API (apps/api)**   | 16             | ✅ Hepsi geçiyor     |
| **TypeScript**       | `tsc --noEmit` | ✅ 0 hata (api + db) |

### Codex Blocker Resolved

| Blocker                                          | Durum                                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Repository queries execute outside transaction" | ✅ **FULLY RESOLVED** — Her repository sorgusu artık `withTenantSession()` içinde açılan transaction'ın Drizzle wrapper'ı üzerinden yürütülür. RLS `set_config()` aynı postgres bağlantısında çalışır. |

---

## Sprint 2.6.4 — PostgreSQL Row Level Security Implementation (COMPLETED ✅)

**Tarih:** 2026-07-18  
**Kapsam:** 52 tablo için PostgreSQL Row-Level Security (RLS) politikaları oluşturulması — üretim öncesi son güvenlik katmanı.  
**Durum:** ✅ Tamamlandı — **RLS aktif, 52 tablo koruma altında, 16 test geçiyor, mevcut 211 test regresyonsuz.**

### Yapılanlar

#### 🛡️ RLS Migration (`0003_enable_rls.sql`)

| Bölüm                                     | Tablo Sayısı | Politika Deseni                                                                                                   |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Direct tenant_id**                      | 23           | `USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))`                                    |
| **Owned objects (EXISTS subquery)**       | 26           | `USING (EXISTS SELECT 1 FROM parent WHERE parent.id = child.parent_id AND parent.tenant_id = ...)`                |
| **Factory-scoped (EXISTS via factories)** | 3            | `USING (EXISTS SELECT 1 FROM factories WHERE factories.id = fact_scope.factory_id AND factories.tenant_id = ...)` |
| **Toplam**                                | **52**       |                                                                                                                   |

#### 📋 Protected Tables

**Direct tenant_id (23):** `factories`, `users`, `personnel_titles`, `personnel`, `customers`, `machines`, `stations`, `materials`, `products`, `product_categories`, `recipes`, `inventory_locations`, `inventory_items`, `orders`, `production_orders`, `production_events`, `cutting_results`, `production_operations`, `production_queues`, `rework_orders`, `fire_inventory_items`, `factory_configurations`, `audit_logs`

**Owned objects via EXISTS (26):** `emergency_contacts`, `personnel_health_information`, `personnel_shifts`, `personnel_certificates`, `personnel_station_permissions`, `personnel_machine_assignments`, `customer_contacts`, `customer_delivery_points`, `machine_maintenance_logs`, `machine_spare_parts`, `machine_consumables`, `station_machine_assignments`, `station_personnel_assignments`, `material_unit_profiles`, `recipe_items`, `recipe_operations`, `recipe_rules`, `recipe_versions`, `order_lines`, `order_notes`, `inventory_lots`, `inventory_barcodes`, `production_breakage_events`, `cutting_result_items`, `production_queue_items`, `rework_history`

**Factory-scoped via EXISTS (3):** `grinding_profiles`, `trim_profiles`, `remnant_thresholds`

**Global tables (NO RLS — 5):** `tenants`, `roles`, `permissions`, `role_permissions`, `user_sessions`

#### 📐 Politika Standartları

- **Tüm politikalar**: `FOR ALL` (SELECT, INSERT, UPDATE, DELETE) tek politikada
- **Session değişkeni**: Yalnızca `current_setting('app.current_tenant_id', true)::char(26)` — `app.current_user_role` KULLANILMAZ
- **İsimlendirme**: `tenant_isolation_{table_name}`
- **Application rolü**: `glassos_app` (`NOBYPASSRLS`) — RLS'ye tabidir
- **Migration rolü**: `glassos_owner` — RLS'den muaftır

#### 🧪 Testler (`test/rls.test.ts`)

| Test Grubu         | Test Sayısı | Kapsam                                                                                                                                           |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migration File     | 7           | Dosya varlığı, `current_setting` kullanımı, `app.current_user_role` yok, tüm tablolar enable, global tablolar yok, politika sayısı, isimlendirme |
| Schema Coverage    | 3           | Her korunan tablo schema'da var, global tablolar RLS'de yok, toplam 57 tablo                                                                     |
| Policy Correctness | 4           | Direct tenant_id → exact match, owned → EXISTS subquery, factory-scoped → EXISTS, audit_logs var                                                 |
| Integration        | 1           | Real DB için test prosedürü dokümante edildi                                                                                                     |
| Compatibility      | 1           | `withTenantSession()` → `set_config()` → RLS uyumu doğrulandı                                                                                    |
| **Toplam**         | **16**      |                                                                                                                                                  |

### Test Durumu

| Paket                | Test Sayısı    | Durum            |
| -------------------- | -------------- | ---------------- |
| **DB (packages/db)** | 227 (211 + 16) | ✅ Hepsi geçiyor |
| **API (apps/api)**   | 16             | ✅ Hepsi geçiyor |
| **TypeScript**       | `tsc --noEmit` | ✅ 0 hata        |

### Güvenlik Kazanımı

| Tehdit                         | Önce                                                                      | Sonra                                                            |
| ------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Cross-Tenant SELECT            | Repository katmanında engelleniyor (WHERE tenant_id = ?)                  | ✅ **Veritabanı katmanında da engelleniyor**                     |
| Cross-Tenant INSERT            | İstemci tenantId gönderemez (DTO temizliği)                               | ✅ **RLS row-level tenant_id override'ını engeller**             |
| Cross-Tenant UPDATE/DELETE     | Repository'de tenant_id WHERE koşulu                                      | ✅ **RLS aynı WHERE koşulunu zorlar (defense in depth)**         |
| Direkt DB erişimi (bypass API) | ❌ **AÇIK** — API dışından DB'ye bağlanan herkes tüm tenantları görebilir | ✅ **KAPALI** — glassos_app rolü yalnızca kendi tenant'ını görür |

---

## Sprint 2.6.4A — RLS Hardening: Production-Grade Security (COMPLETED ✅)

**Tarih:** 2026-07-21  
**Kapsam:** Sprint 2.6.4 RLS implementasyonunun production-grade seviyesine yükseltilmesi — FORCE RLS, WITH CHECK, withTenantSession coverage audit, explicit tenant context validation.  
**Durum:** ✅ Tamamlandı — Tüm 227 test geçiyor, tsc --noEmit 0 hata.

### Yapılanlar

#### 🛡️ Task 1 — FORCE ROW LEVEL SECURITY

- 52 tabloya `ALTER TABLE ... FORCE ROW LEVEL SECURITY` eklendi.
- `glassos_owner` rolü artık RLS'yi atlayamaz — tablo sahibi dahil herkes politikaya tabidir.

#### 🛡️ Task 2 — Explicit WITH CHECK

- 52 politikanın tamamına explicit `WITH CHECK` ifadesi eklendi.
- INSERT/UPDATE işlemlerinde tenant izolasyonu atlanarak veri yazılamaz.
- 23 direct tenant_id politikasında: `WITH CHECK (tenant_id = current_setting(...))`
- 29 EXISTS politikasında: `WITH CHECK (EXISTS SELECT 1 ...)` — USING bloğunun birebir aynısı

#### 🛡️ Task 3 — withTenantSession Coverage Audit

- **11 unwrapped method tespit edildi ve düzeltildi:**

| Dosya                          | Düzeltilen Metotlar                                                         | Detay                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `rework.service.ts`            | `findById`, `findOpenReworks`, `findByParentOrder`, `getMergePreparation`   | 4 read-only metot `withTenantSession` ile sarıldı                                       |
| `station-operation.service.ts` | `validateOperation`, `addToWaitingPool`, `loadWaitingProduction`            | 3 metot sarıldı; `addToWaitingPool`'da yalnızca repository çağrısı transaction'a alındı |
| `dispatch.service.ts`          | `getReadyProductions`, `getReadyOrderLines`, `getOrderLineDeliveryCounters` | 3 metot sarıldı                                                                         |
| `cutting-execution.service.ts` | `addItemToBasket`, `loadWorkQueue`                                          | 2 metot sarıldı                                                                         |

#### 🛡️ Task 4 — Tenant Context Missing → Explicit Error

- `withTenantSession()` içinde, signature #2 (ALS'den okuma) kullanıldığında:
  - Tenant context (tenantId veya factoryId) yoksa VE database client varsa → **explicit `Error` fırlatılır**
  - Mesaj: "Tenant context is required for database operations..."
  - Test/setup modu (FakeDb) bu kontrolden etkilenmez (database client yok)

#### 🛡️ Task 5 — Verification

- ✅ **TSC**: `tsc --noEmit` → 0 hata
- ✅ **Tests**: 227 test → 227 passed (6 test file)
- ✅ **Dokümantasyon**: SECURITY.md, PLAN.md, CHANGELOG.md güncellendi

### Politika Standartları (Güncellenmiş)

| Standart                 | Açıklama                                                 |
| ------------------------ | -------------------------------------------------------- |
| FORCE ROW LEVEL SECURITY | 52 tabloda aktif — tablo sahibi dahil herkes RLS'ye tabi |
| WITH CHECK               | 52 politikada explicit — INSERT/UPDATE koruması          |
| Session değişkeni        | Yalnızca `app.current_tenant_id`                         |
| İsimlendirme             | `tenant_isolation_{table_name}`                          |
| Application rolü         | `glassos_app` (`NOBYPASSRLS`)                            |

### Güvenlik Kazanımı (Sprint 2.6.4 → 2.6.4A)

| Tehdit                                   | Sprint 2.6.4                   | Sprint 2.6.4A              |
| ---------------------------------------- | ------------------------------ | -------------------------- |
| glassos_owner RLS'yi atlar               | ❌ Açık                        | ✅ **KAPALI (FORCE RLS)**  |
| INSERT/UPDATE RLS'yi atlar               | ⚠️ Kısmen (yalnızca USING)     | ✅ **KAPALI (WITH CHECK)** |
| Servis çağrısı RLS context'isiz çalışır  | ⚠️ Bazı metotlar sarmalanmamış | ✅ **11 metot düzeltildi** |
| Tenant context yok → sessizce devam eder | ⚠️ Sessiz fallback             | ✅ **Explicit Error**      |

Kapsam: API ve Servis katmanı geliştirmeleri. Sprint 2.3, Sprint 2.3.22 ile tamamlanmıştır.

---

## Sprint 2.6.5 — Domain Event Publisher (Enterprise Foundation) (COMPLETED ✅)

**Tarih:** 2026-07-21  
**Kapsam:** Event publishing altyapısının tüm 9 servise entegrasyonu. Transaction-safe event publishing: Event'ler asla transaction commit'inden önce yayınlanmaz.  
**Durum:** ✅ Tamamlandı — 260 test geçiyor, tsc --noEmit 0 hata.

### Yapılanlar

#### 📦 Task 1 — Event Publisher Interface & Implementations

- **`EventPublisher` interface**: `publish(event)` + `publishMany(events)` metotları — `src/services/events.ts`
- **`LocalEventPublisher`**: Production implementasyonu — `onPublish(handler)` ile handler kaydı, async/await destekli sıralı yayın. `src/events/local-event-publisher.ts`
- **`InMemoryEventPublisher`**: Test implementasyonu — `events[]`, `publishCount`, `eventCount`, `ofType<T>()`, `any()`, `reset()`, `last`, `first`. `src/events/in-memory-event-publisher.ts`
- **Barrel export**: `src/events/index.ts` — her iki publisher'ı dışa aktarır

#### 🔧 Task 2 — Service Integration (9/9 Services)

Her servis constructor'ında `EventPublisher` parametresi (`db: any`'den önce) alır. Event dönen tüm metotlar şu pattern'i izler:

```typescript
const _txResult = await withTenantSession(async (tx, ctx) => {
  // İş mantığı + DB mutasyonları
  return { ..., events: [event] };
});
// Transaction başarılı → event'leri yayınla
await this.eventPublisher.publishMany(_txResult.events);
return _txResult;
```

| Servis                    | Event'li Metotlar                                                                                                                                   | Durum |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| OrderService              | approveOrder                                                                                                                                        | ✅    |
| ProductionService         | transferProduction                                                                                                                                  | ✅    |
| ProductionQueueService    | createWorkQueue, startQueue, completeQueue                                                                                                          | ✅    |
| ReworkService             | createReworkOrder, createBreakageRework, mergeRework                                                                                                | ✅    |
| CuttingExecutionService   | createSession, startSession, completeSession, pauseSession, resumeSession, cancelSession, registerBreakage                                          | ✅    |
| ProductionTransferService | initiateTransfer, completeTransfer, cancelTransfer, rejectTransfer, assignReadyStation                                                              | ✅    |
| StationOperationService   | startOperation, completeOperation, cancelOperation, rejectOperation                                                                                 | ✅    |
| QualityControlService     | startInspection, completeInspection, rejectInspection, approveInspection                                                                            | ✅    |
| DispatchService           | createDispatch, createDelivery, assignVehicle, loadVehicle, unloadVehicle, startShipment, completeDelivery, completePartialDelivery, cancelDispatch | ✅    |

#### 🧪 Task 3 — Tests

- **27 yeni test** — `test/event-publisher.test.ts`
  - InMemoryEventPublisher: publish(), publishMany(), ofType(), any(), reset(), first/last
  - LocalEventPublisher: handler registration, async support, publish order, error propagation
  - Transaction Safety Pattern: events only published after successful transaction, NOT on rollback
- **Test fixture updated**: `InMemoryEventPublisher` tüm 9 servis constructor'ına inject edildi

#### ✅ Task 4 — Verification

- ✅ **TSC**: `tsc --noEmit` → 0 hata
- ✅ **Tests**: 260 test → 260 passed (7 test file)
- ✅ **Dokümantasyon**: SERVICE_ARCHITECTURE.md, CHANGELOG.md, PLAN.md güncellendi

### Mimari Kurallar (Event Publishing)

| Kural               | Açıklama                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Transaction safety  | Event'ler ASLA `withTenantSession()` callback'i içinde yayınlanmaz                        |
| Sıralama            | Pattern: `const _txResult = await` → `publishMany(_txResult.events)` → `return _txResult` |
| Rollback güvenliği  | Transaction throw ederse `publishMany()` çağrılmaz                                        |
| In-memory istisnası | DB transaction'ı olmayan metotlar (cutting session CRUD) doğrudan yayın yapar             |
| Constructor sırası  | `EventPublisher` her zaman `db: any`'den önce gelir                                       |
| Import              | Servisler `"./events.js"`'den import eder (barrel değil — circular dependency önlemi)     |

## Sprint 2.6.5A — Event Publisher Production Wiring Fix (COMPLETED ✅)

**Tarih:** 2026-07-21  
**Kapsam:** Production composition root'un EventPublisher ile doğru şekilde wiring'i. CustomerService'e event publishing entegrasyonu. Singleton EventPublisher güvencesi.  
**Durum:** ✅ Tamamlandı — 267 test geçiyor, tsc --noEmit 0 hata.

### Yapılanlar

#### 🏗️ Task 1 — Production Composition Root (apps/api/src/services.ts)

- `LocalEventPublisher` singleton olarak oluşturuldu (`const eventPublisher = new LocalEventPublisher()`)
- **Tüm 10 servis constructor'ı** doğru parametre sırasıyla düzeltildi (`EventPublisher` her zaman `db: any`'den önce)
- **7 servis** EventPublisher parametresini tamamen eksikti — eklendi:
  - CustomerService, OrderService, ProductionService, ProductionQueueService, ReworkService, CuttingExecutionService, ProductionTransferService, StationOperationService, QualityControlService, DispatchService

#### 🧩 Task 2 — CustomerService Integration

- **3 yeni event interface**: `CustomerCreatedEvent` ("customer.created"), `CustomerUpdatedEvent` ("customer.updated"), `CustomerDeactivatedEvent` ("customer.deactivated") — `src/services/events.ts`
- **CustomerService constructor**: `EventPublisher` parametresi eklendi
- **3 mutation metot** event publishing pattern'i ile güncellendi: `create()`, `update()`, `deactivate()`
- **Read-only metotlar** (`findById`, `findByCode`, `validateExists`, `findActive`) değişmedi
- **Export güncellemesi**: `src/services/index.ts` — CustomerEvent tipleri, InMemoryEventPublisher ve LocalEventPublisher dışa aktarıldı

#### ✅ Task 3 — Service Coverage

- **10/10 servis** EventPublisher constructor parametresine sahip
- **Tüm servisler** aynı EventPublisher instance'ını kullanıyor (singleton)
- **apps/api/src/services.ts** — single source of truth olarak doğrulandı

#### 🔒 Task 4 — Singleton EventPublisher

- Production'da **tek** `new LocalEventPublisher()` çağrısı
- Tüm 10 servise **aynı referans** geçiliyor
- Composition root testleri singleton davranışını doğruluyor

#### 🧪 Task 5 — Tests

- **7 yeni composition root testi** — `test/composition-root.test.ts`
  - InMemoryEventPublisher ile 10 servis yaratma
  - LocalEventPublisher ile 10 servis yaratma
  - **Aynı instance** doğrulama (referans eşitliği)
  - **Duplicate yok** doğrulama (Set ile)
  - CustomerService event publishing: created, deactivated
  - OrderService event publishing: approved
- **FakeDb**: Drizzle ORM query builder pattern'ini (mutable `.select().from().where().execute()`) taklit eden minimal test DB
- **service.test.ts güncellemesi**: CustomerService.create/update/deactivate çağrıları `{ customer }` destructuring ile güncellendi
- **Vertical Slice #1 ve #2** — `{ customer }` destructuring ile düzeltildi

### Mimari Kurallar (Güncelleme)

| Kural            | Açıklama                                                                            |
| ---------------- | ----------------------------------------------------------------------------------- |
| Composition root | `apps/api/src/services.ts` — Tüm servislerin EventPublisher wiring'i burada yapılır |
| Singleton        | Production'da **bir** EventPublisher instance'ı tüm servisler tarafından paylaşılır |
| Test isolation   | Her test **kendi** InMemoryEventPublisher'ını kullanır (state sızdırmaz)            |
| Customer events  | CustomerService.create/update/deactivate → `{ customer, events }` döndürür          |

## Sprint 2.6.6 — Background Job Architecture (Enterprise Foundation) (COMPLETED ✅)

**Tarih:** 2026-07-16  
**Kapsam:** Background job altyapısının kurulması — job modeli, kuyruk, registry, runner, orchestrator. Tümü in-memory. Hiçbir business job implemente edilmedi.  
**Durum:** ✅ Tamamlandı — 318 test geçiyor, tsc --noEmit 0 hata.

### Yapılanlar

#### 📦 Module: `packages/db/src/background/`

| Dosya                   | İçerik                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `job.ts`                | `Job` interface, `BaseJob` class, `JobStatus`/`JobPriority` tipleri, `PRIORITY_ORDER`, `generateJobId()`, `calculateBackoff()` |
| `job-queue.ts`          | `IJobQueue` interface + `InMemoryJobQueue` — priority-ordered, delayed execution destekli                                      |
| `job-registry.ts`       | `IJobRegistry` interface + `InMemoryJobRegistry` — handler registration ve resolution                                          |
| `job-runner.ts`         | `IJobRunner` interface + `LocalJobRunner` — in-process runner, retry + exponential backoff                                     |
| `background-service.ts` | `IBackgroundService` interface + `BackgroundService` — queue + registry + runner orchestrator                                  |
| `index.ts`              | Barrel export                                                                                                                  |

#### 🔧 Core Features

- **Job Lifecycle**: pending → running → completed / failed / cancelled / retrying
- **4 Priority Level**: critical > high > normal > low, FIFO within same priority
- **Exponential Backoff**: 1s → 2s → 4s → 8s → 16s → 30s (capped)
- **Configurable Retry**: per-job `maxRetries` (default: 3)
- **Cancel Before Execution**: `cancel(jobId)` on pending jobs
- **Delayed Scheduling**: `scheduledAt` support for future execution
- **Change Handler Registration**: `register<T>(name, handler)` with duplicate detection
- **Callback System**: `onComplete`, `onFailed`, `onRetrying` callbacks

#### 🔌 Dependency Injection

- Tüm bağımlılıklar interface üzerinden (`IJobQueue`, `IJobRegistry`, `IJobRunner`)
- `BackgroundServiceOptions` ile custom queue/registry/runner enjekte edilebilir
- Gelecekte BullMQ, RabbitMQ, AWS SQS, Temporal desteği — **servis kodu değişmez**

#### 🔄 Event Integration Readiness

- BackgroundService, domain event handler'lardan `enqueue()` çağrısı alacak şekilde tasarlandı
- **Hiçbir business event bağlantısı yapılmadı** — sadece mimari hazır

#### 🧪 Tests — 51 yeni test

- Job creation & defaults (5), execution (3)
- Priority ordering: critical/high/normal/low + FIFO (6), scheduled delay (2)
- Lifecycle transitions (2)
- Queue operations: empty, size, dequeue, pending (5)
- Cancellation: pending, not found, already dequeued (3)
- Retry: backoff calculation (3), retry logic (6)
- Runner: start/stop lifecycle (3)
- Registry: register, resolve, duplicate, list (4)
- BackgroundService: enqueue, cancel, start/stop, e2e processing (6)
- Full lifecycle: complete, fail, priority order, DI (4)
- PRIORITY_ORDER verification (1)

### Mimari Kurallar (Background Jobs)

| Kural             | Açıklama                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| Interface-first   | Servisler sadece interface'lere bağımlıdır, somut implementasyonlara değil |
| In-memory default | Tüm state process hafızasında tutulur. Persistence gelecekte eklenebilir   |
| Tek process       | LocalJobRunner tek process'te çalışır. Distributed workers gelecekte       |
| Kayıp job yok     | Failed job'lar `getFailedJobs()` ile her zaman erişilebilir                |
| Business job yok  | Bu sprint sadece altyapıyı kurar. İş job'ları sonraki sprint'lerde         |

## Sprint 2.7.0 — UI Foundation & Design System (COMPLETED ✅)

**Tarih:** 2026-07-18  
**Kapsam:** GlassOS UI Foundation — `@repo/ui` paketinde yeniden kullanılabilir tasarım sistemi. TailwindCSS v4 tema sistemi (dark-first), Radix UI primitives ile erişilebilir bileşenler, enterprise DataGrid, responsive Layout sistemi (Shell/Sidebar/TopBar). Backend bağımlılığı yok, sayfa uygulaması yok.  
**Durum:** ✅ Tamamlandı — `packages/ui` + `apps/web` TypeScript 0 hata, `apps/api` TypeScript 0 hata.

### Tasarım Felsefesi

- **Interface-first platform**: Her future GlassOS ekranı bu bileşenlerle inşa edilecek (Apple HIG / Material Design yaklaşımı)
- **Dark-first**: Tüm token'lar karanlık temayı baz alır, light mode `.light` class overrides ile sağlanır
- **Accessibility by default**: Tüm bileşenler Radix UI primitives üzerine kuruludur (WAI-ARIA uyumlu)
- **Zero backend coupling**: Bileşenler yalnızca prop tüketir — API çağrısı, state management bağlantısı yok

### Yapılanlar

#### 📦 Module: `packages/ui/src/`

| Dizin                  | Açıklama                                                    |
| ---------------------- | ----------------------------------------------------------- |
| `styles.css`           | Tailwind v4 `@theme` ile tüm design token'lar (dark + light)|
| `lib/cn.ts`            | `cn()` utility — clsx + tailwind-merge                      |
| `components/ui/`       | Primitive + overlay + domain badge bileşenleri (~24 adet)   |
| `components/data-grid/`| Enterprise DataGrid<T> — generic, sıralama, pagination      |
| `components/layout/`   | Shell, Sidebar, TopBar, Notifications, Profile vb. (7 adet) |
| `components/providers/`| ThemeProvider + useTheme()                                  |
| `index.ts`             | Barrel export — ~40+ export                                 |

#### 🎨 Theme Sistemi

| Konsept          | Detay                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Renk sistemi     | surfaces (bg/surface/elevated/borders), brand, text, status, queue, station, priority |
| Gölge sistemi    | xs → xl (dark/light ayrı değerler)                                    |
| Dark mode        | Varsayılan — tüm token'lar dark tema için                            |
| Light mode       | `.light` class override ile — tüm token'lar yeniden tanımlanır        |
| Geçiş            | `ThemeProvider` localStorage + `<html>` class toggling, flash önleme  |

#### 🧩 Primitive UI Components (`components/ui/`)

| Bileşen           | Teknoloji         | Varyant / Özellik                                                    |
| ----------------- | ----------------- | -------------------------------------------------------------------- |
| Button            | cva + Radix Slot  | primary/secondary/ghost/destructive/outline — sm/md/lg/icon          |
| Input             | Native + icon     | Icon slot, error display, aria-invalid/describedby                    |
| Textarea          | Native            | Error display                                                         |
| Select            | Radix             | Trigger, content, item, label — animasyonlu dropdown                  |
| Checkbox          | Radix             | Check indicator                                                       |
| Switch            | Radix             | Animated thumb                                                        |
| Badge             | cva               | 7 variants: default/secondary/success/warning/danger/info/outline     |
| Card              | Composition       | Card + Header/Title/Description/Content/Footer                        |
| Skeleton          | CSS animation     | Pulse animasyonu                                                      |
| Avatar            | Radix             | Avatar + AvatarImage + AvatarFallback                                 |
| Progress          | Native + cva      | Value/max, variant renkler, aria role                                 |
| StatusIndicator   | cva               | success/warning/danger/info/muted — size variant                      |
| Breadcrumb        | Native            | Nav, list, item, link, page (current), separator                      |
| SearchBox         | Native + icon     | onChange/onSearch callback'leri                                       |

#### 🪟 Overlay & Navigation Components (`components/ui/`)

| Bileşen          | Teknoloji         | Özellik                                                               |
| ---------------- | ----------------- | --------------------------------------------------------------------- |
| Dialog           | Radix             | Overlay, content, header/footer — animasyonlu                          |
| Drawer           | Radix Dialog      | Mobile bottom panel — drag handle, slide animation                     |
| Sheet            | Radix Dialog      | Slide-in panel — 4 yön (left/right/top/bottom)                         |
| Tabs             | Radix             | List, trigger, content — animasyonlu                                   |
| DropdownMenu     | Radix             | Full suite: items, separator, label, checkbox/radio                    |
| Tooltip          | Radix             | Provider, trigger, content — animasyonlu                               |
| Toast            | Radix             | 4 variants (default/success/warning/danger), close/action buttons       |
| CommandPalette   | Radix Dialog      | Trigger, input, list, group, item, empty state — klavye navigasyonu    |

#### 🏷️ Domain Badges (`components/ui/`)

| Bileşen               | Kullandığı Renk Sistemi | Durumlar                                                              |
| --------------------- | ----------------------- | --------------------------------------------------------------------- |
| GlassStatusBadge      | station + queue         | idle/running/paused/maintenance/offline/setup                          |
| PriorityBadge         | priority                | critical/high/normal/low                                               |
| ProductionStatusBadge | queue                   | pending/queued/running/paused/completed/cancelled/on-hold              |
| FactoryBadge          | brand                   | Factory name + optional location — yeşil dot                           |

#### 📊 DataGrid (`components/data-grid/`)

| Özellik             | Detay                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Generic `DataGrid<T>` | Tip güvenli kolon tanımları — `Column<T>` interface                       |
| Sıralama            | Kolon başlığına tıklama ile — asc/desc/none, ikon gösterimi               |
| Sticky header       | Scroll'da başlık sabit kalır                                              |
| Pagination          | Previous/Next + sayfa numaraları                                          |
| Loading state       | 5 skeleton satır gösterimi                                                |
| Empty state         | "No data" mesajı                                                          |
| Row click/actions   | `onRowClick` callback + `actions` kolonu                                  |

#### 🧱 Layout System (`components/layout/`)

| Bileşen            | Özellik                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| Sidebar            | Collapsible (60px/240px), nav items with icon/label/badge, collapse toggle |
| TopBar             | Breadcrumbs, search box, right-side children slot                          |
| Shell              | Desktop sidebar + mobile Sheet drawer + TopBar + scrollable content        |
| Notifications      | Bell icon, unread count badge, dropdown list, mark as read, view all       |
| Profile            | Avatar + name dropdown, profile/settings/logout                            |
| FactorySwitcher    | Factory list dropdown, active indicator, location                           |
| ThemeSwitcher      | Sun/moon toggle icon, full button variant                                  |

#### 🔌 Providers (`components/providers/`)

| Provider          | İşlev                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| ThemeProvider     | Dark/light state management, localStorage persistence, `<html>` class toggle |
| useTheme()        | Hook — `{ theme, setTheme, toggle }`                                       |

#### 🏗️ Architecture

- **Interface-first layout**: Shell responsive layout sağlar, mobile'da Sheet tabanlı drawer kullanır
- **CSS variable theming**: Runtime tema değişimi için Tailwind v4 `@theme` directives
- **TypeScript strict**: Tüm bileşenler tam generic desteğiyle tiplenmiştir
- **Barrel export**: `@repo/ui/index.ts` tüm component, type, utility ve provider'ları export eder

## Sprint 2.8.0 — Machine Management Module (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** Makine CRUD işlemleri, DataGrid listeleme, detay görünümü, form validasyonu, i18n (TR/EN), RBAC yetkilendirme, PostgreSQL RLS koruması  
**Durum:** ✅ Tamamlandı — 12 adımlı browser doğrulaması geçti

### Yapılanlar

- **Schema & DB**: `machines` tablosu (ULID char(26) PK, tenantId, code, name, type, brand, model, serialNumber, status, purchaseDates, warranty, notes) — Drizzle ORM + RLS FORCE
- **Server Actions**: `createMachineAction`, `updateMachineAction`, `deleteMachineAction`, `getMachinesAction`, `getMachineByIdAction` — tümü `requireSession()` + `withTenantSession()` + `ensurePermission()` ile korumalı
- **Permissions**: `machine:read`, `machine:write` yetkilendirme haritasına eklendi
- **UI Page**: `apps/web/src/app/(dashboard)/machines/page.tsx` — DataGrid, summary cards, search, filter (type/status), sort
- **Detail Drawer**: Makine Detayı dialog — Genel Bilgiler, Satın Alma Bilgileri, Atanmış Operatörler, Audit bölümleri
- **Create/Edit Dialogs**: Form validation (Zod), type/status combobox, date pickers, marka/model/seri alanları
- **i18n**: Tüm makine etiketleri TR/EN çevrildi
- **Machine-Personnel Assignment**: `machinePersonnelAssignments` tablosu üzerinden çift yönlü atama — Makine Detayında "Atanmış Operatörler" altında görüntüleme ve çıkarma

### Browser Doğrulaması (12 adım)

| # | Test | Sonuç |
|---|------|-------|
| 1 | /machines sayfası yükleniyor | ✅ |
| 2 | Makine oluşturma (WASH-MC-01) | ✅ |
| 3 | DataGrid'de listeleme | ✅ |
| 4 | Detay görüntüleme | ✅ |
| 5 | Düzenleme (ad güncelleme) | ✅ |
| 6 | Filtreleme (tür/durum) | ✅ |
| 7 | Sıralama | ✅ |
| 8 | Silme | ✅ |
| 9 | EN dile geçiş | ✅ |
|10 | Sayfa yenileme-persistence | ✅ |
|11| Operatör atama (Personel'den) | ✅ |
|12| Operatör çıkarma (Makine'den) | ✅ |

## Sprint 2.8.1 — Personnel Management Module (COMPLETED ✅)

**Tarih:** 2026-07-17  
**Kapsam:** Personel CRUD işlemleri, DataGrid listeleme, detay görünümü, aktif/pasif durumu, makine ataması, i18n (TR/EN), RBAC, Zod doğrulama, RLS  
**Durum:** ✅ Tamamlandı — 12 adımlı browser doğrulaması geçti, tüm veriler PostgreSQL'de persist edildi

### Yapılanlar

- **Schema & DB**: `personnel` tablosu (ULID char(26) PK, tenantId, code, firstName, lastName, roleId, titleId, phone, email, hiredAt, isActive, notes) + `machinePersonnelAssignments` junction table — Drizzle ORM + RLS FORCE
- **Server Actions**: `createPersonnelAction`, `updatePersonnelAction`, `togglePersonnelActiveAction`, `getPersonnelAction`, `getPersonnelByIdAction`, `assignMachineAction`, `removeMachineAssignmentAction` — `requireSession()` + `withTenantSession()` + `ensurePermission("personnel:write")`
- **Permissions**: `personnel:read`, `personnel:write` yetkilendirme haritasına eklendi
- **UI Page**: Personel DataGrid — summary cards (Toplam/Aktif/Pasif/Vardiyada), search, role filter, status filter, sort
- **Detail Drawer**: Personel Detayı — Genel Bilgiler (ad/soyad/rol/telefon/e-posta/işe giriş/notlar/sistem erişimi) + Atamalar (makine listesi, ata/çıkar)
- **Create/Edit Dialogs**: Zod validasyon, title/role combobox, tarih seçici, notlar textarea — `preparePersonnelInput()` ile boş string→null dönüşümü
- **Activate/Deactivate**: Onay dialog'lu toggle — "Bu personeli devre dışı bırakmak istediğinize emin misiniz?" / "Bu personeli tekrar aktif etmek istediğinize emin misiniz?"
- **Machine Assignment**: "Makine Ata" dialog — makine seçici (WASH-MC-01, GRN-MC-01), atama türü (Birincil/İkincil/Yedek), "Atamayı Kaldır" butonu
- **i18n**: Tüm personel etiketleri TR/EN çevrildi
- **Cross-domain**: Personel atamaları Makine Detayında "Atanmış Operatörler" bölümünde görünür — çift yönlü senkronizasyon

### Browser Doğrulaması (12 adım)

| # | Test | Sonuç |
|---|------|-------|
| 1 | /personnel sayfası yükleniyor | ✅ |
| 2 | Personel oluşturma (PRS-001, Ahmet Yılmaz) | ✅ |
| 3 | Detay görüntüleme (Genel + Atamalar) | ✅ |
| 4 | Düzenleme (telefon güncelleme) | ✅ |
| 5 | Devre dışı bırakma (Pasif) | ✅ |
| 6 | Tekrar aktif etme (Aktif) | ✅ |
| 7 | Makine atama (WASH-MC-01, Birincil) | ✅ |
| 8 | Makine Detayında operatörü görme | ✅ |
| 9 | Operatörü Makine'den çıkarma (çift yön) | ✅ |
|10 | EN dil desteği | ✅ |
|11 | Sayfa yenileme-persistence | ✅ |
|12 | EN persistence (dil değişikliği kalıcı) | ✅ |

## Sprint 2.8.1A — Personnel Titles Management Fix (COMPLETED ✅)

**Tarih:** 2026-07-18  
**Kapsam:** Personel ünvan yönetimi eksikliğinin giderilmesi — boş title dropdown sorunu, title CRUD UI, title lifecycle (aktif/pasif), title name'in DataGrid ve Detay drawer'da gösterilmesi, i18n (TR/EN), RBAC  
**Durum:** ✅ Tamamlandı — 14 adımlı browser doğrulaması geçti, tüm veriler PostgreSQL'de persist edildi

### Yapılanlar

- **Server Actions (5 adet)**: `getAllPersonnelTitlesAction()`, `createPersonnelTitleAction(titleName)`, `updatePersonnelTitleAction(id, data)`, `deactivatePersonnelTitleAction(id)`, `activatePersonnelTitleAction(id)` — tümü `requireSession()` + `ensurePermission('personnel:read'/'personnel:write')` + `withTenantSession()`
- **`getPersonnelByIdAction()` güncellendi**: `personnelTitles` tablosuna LEFT JOIN eklenerek `titleName` alanı döndürülüyor
- **Title Management Dialog (`personnel-title-dialog.tsx`)**: Yeni full CRUD dialog — inline ekleme/düzenleme, aktif/pasif toggle (onay dialog'lu), boş state mesajı ("Henüz ünvan tanımlanmamış.")
- **Personel Create/Edit Dialog güncellendi**: `onAddTitle` callback prop ile "+ Yeni Ünvan Ekle" seçeneği (Select dropdown altında); boş title listesinde dashed border uyarı + buton
- **Personel Page güncellendi**: "Ünvanları Yönet" butonu (variant="outline", User icon), `PersonnelTitleDialog` entegrasyonu, DataGrid fullName kolonunda title name gösterimi
- **Detail Drawer güncellendi**: `titleName: string | null` alanı eklendi, Genel Bilgiler sekmesinde "Ünvan" satırı gösteriliyor
- **i18n**: 11 yeni key (titles, manageTitles, addTitle, editTitle, titleName, titleActive, titleInactive, noTitlesDefined, confirmDeactivateTitle, confirmActivateTitle) — TR/EN çevrildi
- **RBAC**: Tüm title actions `personnel:read` (okuma) / `personnel:write` (mutasyon) ile korunuyor
- **RLS**: `personnel_titles` tablosu `tenant_isolation_personnel_titles` politikası ile FORCE RLS korumalı (`app.current_tenant_id` session değişkeni)

### Browser Doğrulaması (17 adım)

| # | Test | Sonuç |
|---|------|-------|
| 1 | /personnel sayfası yükleniyor (3 personel, 3 aktif, 3 vardiyada) | ✅ |
| 2 | "Ünvanları Yönet" butonu görünüyor | ✅ |
| 3 | Title dialog açılıyor — boş state ("Henüz ünvan tanımlanmamış.") | ✅ |
| 4 | "Yeni Ünvan Ekle" inline form çalışıyor | ✅ |
| 5 | "Fabrika Müdürü" oluşturuluyor — Aktif badge | ✅ |
| 6 | "Vardiya Amiri" oluşturuluyor — 2 title listede | ✅ |
| 7 | Personel Ekle dialog'unda title dropdown'da 2 title + "Yeni Ünvan Ekle" | ✅ |
| 8 | "Test Kullanıcı" oluşturuluyor — "Fabrika Müdürü" title'ı seçili | ✅ |
| 9 | DataGrid'de "Test Kullanıcı" altında "Fabrika Müdürü" görünüyor | ✅ |
| 10 | Detail drawer'da "Ünvan: Fabrika Müdürü" satırı görünüyor | ✅ |
| 11 | Edit dialog'unda "Fabrika Müdürü" ön seçili geliyor | ✅ |
| 12 | Inline edit formu çalışıyor (input'a değer yazılıyor) | ✅ |
| 13 | **Deaktivasyon onay dialog'u** — "Bu ünvanı pasifleştir? 'Fabrika Müdürü'" — İptal/Pasif butonları | ✅ |
| 14 | **Pasif durumu** — "Fabrika Müdürü" Pasif badge gösteriyor | ✅ |
| 15 | **Reaktivasyon** — "Fabrika Müdürü" Aktif badge'e dönüyor | ✅ |
| 16 | **Sayfa yenileme-persistence** — 3 personel, title'lar korunuyor | ✅ |
| 17 | **EN dil desteği** — "Manage Titles", "Add New Title", "Active", "Edit Title", "Deactivate this title?" | ✅ |

### Regresyon Testi

| # | Test | Sonuç |
|---|------|-------|
| 1 | Personel CRUD (3 personel listeleniyor) | ✅ |
| 2 | Personel Detail Drawer (Ünvan satırı görünüyor) | ✅ |
| 3 | /stations sayfası (3 istasyon, aktif) | ✅ |
| 4 | /machines sayfası (3 makine, aktif) | ✅ |
| 5 | /queue sayfası (boş kuyruk — beklenen) | ✅ |
| 6 | TR → EN dil geçişi | ✅ |
| 7 | EN → TR dil geçişi | ✅ |

## Sprint 2.8.2 — Station Management Module (COMPLETED ✅)

**Tarih:** 2026-07-18  
**Kapsam:** İstasyon CRUD işlemleri, DataGrid listeleme, detay görünümü (Genel/Makineler/Personel sekmeleri), aktif/pasif durumu, makine ataması, personel ataması, çift yönlü ilişki görüntüleme (Makine/Personel detayında istasyon bilgisi), i18n (TR/EN, 58 key), RBAC, Zod doğrulama, RLS  
**Durum:** ✅ Tamamlandı — 18 faz, kod derlemesi geçti

### Yapılanlar

- **Schema & DB**: `stations` tablosu (ULID char(26) PK, tenantId, factoryId, stationCode, name, stationType, description, sortOrder, maxConcurrentJobs, maxMachines, maxOperators, isActive, notes) + `station_machine_assignments` + `station_personnel_assignments` junction tables — Drizzle ORM + RLS FORCE
- **Types Package**: `STATION_TYPES` (12 tür), `createStationSchema`, `updateStationSchema`, `assignMachineToStationSchema`, `assignPersonnelToStationSchema` — Zod validasyon
- **Server Actions (18 adet)**: `getStationsAction`, `getStationByIdAction`, `getStationStatsAction`, `createStationAction`, `updateStationAction`, `deactivateStationAction`, `activateStationAction`, `getStationMachinesAction`, `assignMachineToStationAction`, `removeMachineFromStationAction`, `getAvailableMachinesForStationAction`, `getStationPersonnelAction`, `assignPersonnelToStationAction`, `removePersonnelFromStationAction`, `getAvailablePersonnelForStationAction`, `getStationByMachineIdAction`, `getStationsByPersonnelIdAction` — `requireSession()` + `withTenantSession()` + `ensurePermission("stations:read"/"stations:write")`
- **Permissions**: `stations:read`, `stations:write` yetkilendirme haritasına eklendi (7 rolde)
- **UI Page**: İstasyon DataGrid — summary cards (Toplam/Aktif/Pasif), search, 12 tür filter, status filter, sort, sayfalama
- **Detail Drawer (Sheet)**: İstasyon Detayı — Genel Bilgiler + Makineler (ata/çıkar, isPrimary) + Personel (ata/çıkar, isHeadOperator) sekmeleri
- **Create/Edit Dialogs**: Zod validasyon, 12 tür Select, description, sortOrder, maxConcurrentJobs, maxMachines, maxOperators, notes
- **Activate/Deactivate**: Onay dialog'lu toggle — Power/PowerOff butonları
- **Bidirectional**: Makine Detayında istasyon bilgisi (General Info'da Station satırı) + Personel Detayında istasyon atamaları (Assignments sekmesinde Stations bölümü)
- **i18n**: 58 key TR/EN çevrildi (tür etiketleri, durum, atama, onay mesajları dahil)
- **Cross-domain**: Üç yönlü senkronizasyon — Station ↔ Machine, Station ↔ Personnel, Machine → Station (detaydan)

### 19 Faz

| # | Faz | Durum |
|---|-----|-------|
| 1 | Station Domain Audit | ✅ |
| 2 | Types, RBAC, i18n Foundation | ✅ |
| 3 | Server Actions (CRUD + Stats) | ✅ |
| 4 | Station List Page with DataGrid | ✅ |
| 5 | Create/Edit Dialogs | ✅ |
| 6 | Active/Inactive Lifecycle | ✅ |
| 7-8 | Machine Assignment | ✅ |
| 9-10 | Personnel Assignment | ✅ |
| 11 | Bidirectional Relationships | ✅ |
| 12 | Production Queue regression | ✅ |
| 13 | RBAC/RLS updates | ✅ |
| 14-15 | i18n final, UX states | ✅ |
| 16 | Build verification | ✅ |
| 17 | Browser verification | 🔲 |
| 18 | Regression testing | 🔲 |
| 19 | Documentation | ✅ |

### Browser Doğrulaması

⚠️ **Browser doğrulaması henüz yapılmadı.** Sprint 2.8.2 tamamen tamamlanmış sayılmaz. Kullanıcının belirttiği test adımları:

1. /stations sayfasını açma
2. İstasyon oluşturma
3. İstasyon düzenleme
4. Detay görüntüleme
5. Aktif/pasif değiştirme
6. Gerçek makine atama
7. Makine Detayında istasyonu görme
8. Gerçek personel atama
9. Personel Detayında istasyonu görme
10. İlişkileri kaldırma
11. Sayfa yenileme-persistence
12. /machines hâlâ çalışıyor
13. /personnel hâlâ çalışıyor
14. /queue hâlâ çalışıyor

Tarih: 2026-07-16

Yapılanlar:

- `DATABASE_BLUEPRINT.md` oluşturuldu. Tüm implement edilmiş domainlerin ilişkisel veritabanı planı tamamlandı.
- 17 Aggregate, 68 planlanan tablo, 42 ilişki, 17 Repository sınırı ve 8 Transaction boundary dokümante edildi.
- ULID Primary Key stratejisi seçildi ve gerekçesi açıklandı.
- Common Table Standards, Soft Delete Policy, Audit Policy, Index Strategy, Naming Conventions tanımlandı.
- 9 Persistence Readiness riski tespit edilip çözüme bağlandı.
- **GlassOS, Sprint 2.4 (Database Implementation) için hazırdır.**

### Sprint 2.3.4 — Cutting Session Domain Foundation

- `packages/engine/src/index.ts` içinde `CuttingSession`, `OrderReference`, `SheetUsage` ve session state tipi eklendi.
- Yeni modeller gerçek üretim akışının veri yapısını temsil eder; optimization, nesting, inventory, valuation ve cost mantığı bu sprintte dahil edilmedi.
- `packages/engine/test/cutting-session-models.test.ts` ile temel unit testler eklendi.

### Sprint 2.3.5 — Remnant Decision Engine

- `packages/engine/src/index.ts` içinde `RemnantDecisionService` eklendi.
- Servis, Factory Configuration içindeki `remnantConfiguration` eşiklerini (`enabled`, `minimumWidthMm`, `minimumHeightMm`, `minimumAreaMm2`) kullanarak parçayı `remnant` ya da `scrap` olarak sınıflandırır.
- Karar çıktısı `decision`, `reason`, `isReusable` ve `matchedRules` alanlarını içerir.
- `packages/engine/test/remnant-decision-service.test.ts` ile kapalı sistem, düşük genişlik, düşük yükseklik, düşük alan, tam eşik ve tam uyum senaryoları test edildi.

### Sprint 2.3.6 — Scrap Decision Engine

- `packages/engine/src/index.ts` içinde `ScrapDecisionService` eklendi.
- Servis, parça boyutlarını, alanını ve remnant karar sonucunu değerlendirerek scrap/keep kararını verir.
- Sonuç `decision`, `reason`, `reasonCode`, `failedRules`, `passedRules`, `explanation` ve `configurationVersion` alanlarını içerir.
- `packages/engine/test/scrap-decision-service.test.ts` ile remnant kapalı, alan küçük, width küçük, height küçük, çoklu başarısız kural ve geçerli remnant senaryoları test edildi.

### Sprint 2.3.7 — Cutting Result Engine

- `packages/engine/src/index.ts` içinde `CuttingResultEngine` eklendi.
- Motor, `ProductionCalculationService`, `RemnantDecisionService` ve `ScrapDecisionService` servislerini bir araya getirerek `GlassSheet`, sipariş ölçüleri ve Factory Configuration üzerinden bir `CuttingResult` üretir.
- Çıktıdaki alanlar `productionResult`, `glassConsumptionArea`, `remnantArea`, `scrapArea`, `statistics` ve `metadata` olarak doldurulur.
- `packages/engine/test/cutting-result-engine.test.ts` ile normal üretim, remnant oluşumu, remnant sistemi kapalı ve farklı factory configuration senaryoları test edildi.

### Sprint 2.3.8 — Batch Cutting Engine

- `packages/engine/src/index.ts` içinde `BatchCuttingEngine` eklendi.
- Motor, birden fazla siparişi alır; her sipariş için `CuttingResultEngine` çalıştırır ve sonuçları tek bir `CuttingSession` altında toplar.
- Toplamlar `totalOrderedArea`, `totalProductionArea`, `totalGlassConsumptionArea`, `totalTrimArea`, `totalGrindingArea`, `totalRemnantArea`, `totalScrapArea`, `yieldPercentage` ve `wastePercentage` alanları üzerinden hesaplanır.
- `packages/engine/test/batch-cutting-engine.test.ts` ile tek sipariş, 5 sipariş, 20 sipariş, farklı factory configuration, remnant açık/kapalı ve karışık sonuç senaryoları test edildi.

### Sprint 2.3.10 — Cutting Execution Engine

- `packages/engine/src/index.ts` içinde `CuttingExecutionEngine` eklendi.
- Yeni domain modelleri `ExecutionBatch`, `ExecutionOrder`, `ExecutionStatistics` ve `ExecutionStatus` ile günlük kesim operatörü akışı temsil edilir.
- Motor; batch oluşturma, sipariş ekleme/çıkarma, toplam sipariş sayısı hesaplama, used sheet count kaydı, kesim başlatma/bitirme, mevcut `BatchCuttingEngine` ve `ProductionCalculationService` çağrısı ve tek bir execution result üretimi sağlar.
- `packages/engine/test/cutting-execution-engine.test.ts` ile boş batch, sipariş ekleme/çıkarma, status geçişleri, used-sheet count ve batch sonuç hesaplama senaryoları test edilir.

### Sprint 2.3.11 — Production Queue Engine & Operation Tracking

- `packages/engine/src/index.ts` içinde `ProductionQueueEngine` ve yeni domain modelleri `ProductionOperation`, `ProductionOperationStatus`, `ProductionQueue`, `ProductionQueueItem` ve `ProductionProgress` eklendi.
- Motor operasyon bazlı üretim akışını temsil eder: uygun operasyon kuyruğuna alma, tamamlanan işin sonraki kuyruğa taşınması, bekleyen iş listesinin üretimi, satır ilerleme yüzdesi ve sipariş tamamlanma algoritması.
- `packages/engine/test/production-queue-engine.test.ts` ile operasyon kuyruğu, sonraki kuyruk geçişi, parçalı ilerleme, sipariş ilerleme yüzdesi ve çok operasyonlu sipariş senaryoları test edilir.

### Documentation Sync

- Documentation Sync: Completed
- New routing source of truth document created: `PRODUCTION_FLOW_ARCHITECTURE.md`
- All production-related architecture documents updated and cross-referenced.
- Sprint 2.3.12 implemented: production personnel domain, station permissions, machine assignment, shift planning, health information and emergency contacts.
- Sprint 2.3.13 implemented: production machine domain, machine card fields, status/type/capacity models, operator assignment, maintenance records, timeline events, spare parts, consumables, suppliers, service companies and document references.
- Sprint 2.3.14 implemented: production station domain, station card fields, configurable station types, machine/personnel/queue references, station capacity metadata and dashboard preparation models.
- Sprint 2.3.15 implemented: production recipe domain for bill-of-materials definition, recipe versioning, recipe item types (raw/auxiliary/packaging/consumable/service/by-product), formula placeholders, yield definitions, and validation models for theoretical material consumption only without routing, station, machine, or inventory calculations.
- Sprint 2.3.16 implemented: inventory domain foundation for inventory object definition, inventory cards, categories, inventory types, units, locations, lots, barcodes, reservations, metadata, and validation models without inventory consumption, valuation, warehouse transfer, or purchasing logic.
- Sprint 2.3.17 implemented: inventory consumption domain for recording consumption events with lines, sources, relationships, and validation models without stock deduction or valuation.
- Sprint 2.3.18 implemented: rework and breakage domain for recording breakage events, transferring ownership to factory fire inventory, preparing rework requests that restart from Cutting, and tracing operator/station/machine/shift responsibility without valuation, financial reporting, or warehouse movement logic.
- Sprint 2.3.19 implemented: production work queue domain for the operator's active working basket, including material filtering, rapid barcode-based item addition, duplicate prevention, status transitions, statistics, and validation models without executing production calculations or inventory logic.
- Sprint 2.3.20 implemented as an architecture review sprint: all implemented engine domains were reviewed for naming consistency, relationship clarity, persistence-readiness boundaries, repository/API readiness, and documentation alignment; no new business features or persistence layer artifacts were introduced.

### Sprint 2.3.21 — Production Transfer & Recovery Architecture

- Documentation-only sprint focused on freezing the production transfer and recovery philosophy before Database Phase 2.4.
- Finalized architectural decisions documented for station transfer flexibility, order-line-based production counters, rework treated as an internal production order, cutting rework queue semantics, production merge behavior, fire depot handling, unified production history, and core glass manufacturing rules.
- No runtime code, engine behavior, persistence layer, schema, repository, or API changes were introduced.

| Ekran Türü              | Teknoloji                        | Gerekçe                                          |
| ----------------------- | -------------------------------- | ------------------------------------------------ |
| Operatör saha panelleri | **REST Polling**                 | Operatör sürekli bakmaz; polling yeterli ve ucuz |
| Andon Panosu            | **WebSocket**                    | Duvar ekranı, anlık durum kritik                 |
| Patron Dashboard        | **WebSocket**                    | Anlık karar desteği, ısı haritaları              |
| Ofis sipariş izleme     | **Polling** (veya manuel yenile) | İhtiyaç duyduğunda yeniler                       |

---

## 4. VERİ MODELİ

### 4.1. 3 Katmanlı Master-Detail-Production Counter Mimarisi

```
┌──────────────────────────────────────────────────────┐
│  MASTER: siparisler                                   │
│  Müşteri, termin tarihi, teslimat adresi (GPS), durum │
└────────────────────┬─────────────────────────────────┘
                     │ 1:N
┌────────────────────▼─────────────────────────────────┐
│  DETAIL: siparis_kalemleri                           │
│  Teknik reçete: en, boy, kalınlık, renk, rota tipi  │
│  "20 adet 8mm Füme Temper 1000x2000" gibi            │
└────────────────────┬─────────────────────────────────┘
                     │ 1:N
┌────────────────────▼─────────────────────────────────┐
│  PRODUCTION COUNTERS: requested / completed / missing / broken / delivered │
│  Üretim takibi bu sayaçlar üzerinden yürütülür.      │
└──────────────────────────────────────────────────────┘
```

### 4.2. Kırık Cam / Rework Stratejisi

Cam kırıldığında yeni bir kalıcı cam kimliği oluşturulmaz. Bunun yerine:

```
Breakage → Rework Order → Parent Order Line Merge
```

**Avantaj:** Üretim takibi sayaçlar ve üretim geçmişi üzerinden izlenir; rework tamamlandığında ana sipariş kalemiyle tekrar birleştirilir.

### 4.3. Ana Tablolar

```sql
-- Kiracılar (her fabrika ayrı bir tenant)
fabrikalar       : fabrika_id (PK), unvan, adres, abonelik_plan

-- Tüm kullanıcılar (tek tablo, rol ile ayrım)
kullanicilar     : id, fabrika_id (RLS), rol, ad_soyad, email, aktif
                   roller: opertor | ofis | yonetici | sofor | musteri

-- Cari / Müşteri
musteriler       : id, fabrika_id, unvan, adres, gps_koordinat, fiyat_anlasmasi (JSONB)

-- 3 Katman
siparisler       : id, fabrika_id, musteri_id, siparis_tarihi, termin_tarihi,
                   durum (Taslak|Onayli|Uretimde|Tamamlandi|Iptal),
                   tahmini_maliyet, gercek_maliyet
                   INDEX: (fabrika_id, durum)

siparis_kalemleri: id, siparis_id, en, boy, kalinlik, renk, kenar_islem_tipi,
                   adet, rota_tipi (Temper|Isicam|Lamine), requested_quantity,
                   completed_quantity, missing_quantity, broken_quantity, delivered_quantity

-- Akış / Log
istasyon_akis    : id, order_line_id, istasyon, personel_id, baslangic, bitis,
                   fire_miktari, not

-- Hata / Dead Stock Havuzu
fire_hata_havuzu : id, fabrika_id, order_line_id, en, boy, kalinlik, renk,
                   hata_nedeni, depo_konumu, durum (Mevcut|Eslesti|Hurda)

-- İstasyon Tanımları (esnek rota)
istasyon_tanimlari: id, fabrika_id, ad, kapasite (m²/gün),
                    sonraki_istasyonlar (JSONB: {"Temper":"Temper", "Isicam":"Yikama"})

-- Vardiya Takibi
vardiya_log      : id, personel_id, giris, cikis, vardiya_turu

-- Teslimat
teslimat_kayitlari: id, siparis_id, sofor_id, rota_sirasi, pod_fotograf_url,
                    pod_durum, gps, zaman_damgasi
```

> 🔐 **RLS Kritik:** Tüm tablolarda `WHERE fabrika_id = current_setting('app.fabrika_id')` otomatik filtresi uygulanır. Uygulama katmanındaki bug bile tenant izolasyonunu kıramaz.

---

## 5. MODÜLLER VE İŞ AKIŞLARI

### 5.1. 📥 Agnostik Gateway — ERP'den Sipariş Alma

```
ERP (Logo, Dia, vb.)
     │
     ▼ Excel / CSV / PDF export
GlassOS Import Wizard
     │  "Bu sütun = Sipariş No"
     │  "Bu sütun = En"  (görsel eşleştirme, kaydedilir)
     ▼
siparisler + siparis_kalemleri tablolarına yazılır
     │
     ▼ Kullanıcı "Üretime Gönder" butonuna basar
sipariş kalemleri üretim sayaçları ve üretim geçmişiyle ilk istasyona (Kesim) kuyruğa alınır
```

**Kural:** Hiçbir ERP'ye API bağımlılığı kurulmaz. Agnostik kalınır.

### 5.2. 💰 Dinamik Maliyetlendirme Motoru

Standart m² maliyeti **hatalıdır.** GlassOS geometrik hesap yapar:

| Bileşen                                  | Hesaplama                                                     |
| ---------------------------------------- | ------------------------------------------------------------- |
| **Hammadde (Brüt)**                      | `(en + 2×trim_mm) × (boy + 2×trim_mm) × kalınlık × yoğunluk`  |
| **Çevre Bazlı** (çıta, silikon, thiakol) | `2 × (en + boy) × birim_maliyet × derinlik_katsayısı`         |
| **İşlem Bazlı**                          | Rodaj, delik, CNC için sabit birim maliyetler                 |
| **Sabit Giderler**                       | Elektrik + doğalgaz + işçilik → aylık toplam m²'ye bölünür    |
| **Fire Maliyeti**                        | Kırık + trim + tekrar üretim maliyeti ilgili siparişe eklenir |
| **Ardiye**                               | İstasyondaki bekleme süresi × günlük ardiye maliyeti          |

**Çıktı:** Her sipariş için → Tahmini maliyet (giriş anında) + Gerçekleşen maliyet (üretim sonunda) + Kar marjı

### 5.3. ⚙️ MES İstasyon Akışı

**Üretim Rotası (esnek, ürün tipine göre değişir):**

```
Kesim → Rodaj → Yıkama → Temper → Kalite Kontrol → [Isıcam] → Depo → Sevkiyat
```

**Kesim İstasyonu (parti/batch bazlı):**

1. Operatör iş emri barkodunu okur
2. Sistem o partiye ait sipariş kalemlerini listeler
3. Kesim tamamlandığında ilgili sipariş kalemi operasyonel barkod/etiket ile izlenir
4. Sipariş kalemleri otomatik olarak sonraki istasyonun kuyruğuna düşer

**Sonraki İstasyonlar (sipariş kalemi bazlı):**

1. Operatör sıradaki sipariş kalemini okur → "Başlat" butonuna basar
2. İşlem biter → "Bitir" ile süre kaydedilir, sonraki istasyon kuyruğuna geçer
3. Kırılma yaşanırsa → "Kırıldı" butonu ile rework/eksik akışına geçilir

**Saha Operatör Ekranı Kuralı:**

- Büyük, dokunmatik hedefler (eldiven ile kullanılabilir)
- Sadece kendi işi görünür, başkasının performansı yok
- Renk kodlu durum: 🟢 Normal / 🟡 Uyarı / 🟠 Yoğun / 🔴 Darboğaz

### 5.4. 🔴 Kırık Bildirimi ve İstisna Kuyruğu

```
Operatör "Kırıldı" basar
         │
         ▼
Breakage kaydı oluşturulur ve ilgili sipariş kaleminin broken/missing sayaçları güncellenir
         │
         ├── Sistem: Rework / internal production order hazırlığı başlatılır
         │
         ├── Kesim istasyonuna "Öncelikli / Acil" kuyruğuna eklenir
         │
         ├── Ofis ekranında sipariş kırmızıya döner
         │   "⚠️ 1 sipariş kalemi yeniden üretimde"
         │
         └── Rework tamamlandığında ana sipariş kalemiyle tekrar birleştirilir
```

### 5.5. 🗄️ Hata Havuzu ve Akıllı Tolerans Eşleştirme

**Havuza giren camlar:**

- İptal edilen sipariş camları
- Fazla kesilen (müşteri adedinden fazla) camlar
- Tolerans dışı camlar (ama sağlam olanlar)

**Eşleştirme Algoritması:**

```
Yeni sipariş kalemi girildiğinde:
     │
     ▼
Havuzda arama: en ± X mm  AND  boy ± Y mm
(X ve Y fabrika bazında ayarlanabilir, varsayılan: 10mm)
     │
     ▼ Eşleşme varsa →
Ofis çalışanına popup:
"Depoda 455×1872 ölçüsünde 4 adet füme temper var.
 Müşteri onaylarsa fire SIFIR maliyetle kurtarılır."
     │
     ▼ Onaylanırsa →
Havuzdaki cam siparişe bağlanır, havuzdan çıkar
```

### 5.6. 📦 Lojistik ve Ters Sıralı Yükleme

**Yükleme Sırası Algoritması:**

```
Teslimat rotası: A → B → C

Depoya verilen yükleme emri (TERS): C → B → A
(İlk inecek olan C, araca en son = kapıya en yakın yüklenir)
```

**Şoför PWA Uygulaması (Offline-First):**

1. QR kodu okutur (irsaliye)
2. Durum seçer: Teslim Edildi / Hasarlı / Eksik / İptal
3. Fotoğraf çeker (sıkıştırılır, IndexedDB'ye kaydedilir)
4. GPS + zaman damgası eklenir
5. 4G çekince arka planda Cloudflare R2'ye yüklenir

**Not:** Canlı araç (GPS) takibi kapsam dışı bırakılmıştır. Değer önerisi optimizasyondur, izleme değil.

### 5.7. 👤 Müşteri Deneyimi

- Müşteri, kendi sipariş durumunu kargo takip mantığıyla izler:
  `"Camınız Fırında"` / `"Kalite Kontrolde"` / `"Sevkiyatta"`
- Sipariş "Araca Yüklendi" olduğunda → **Meta WhatsApp Business API** ile otomatik şablon mesaj
- SMS yedekleme (Twilio veya yerel operatör API)

### 5.8. 📊 Andon Panosu ve Makine Takibi

- **WebSocket** ile gerçek zamanlı güncellenen büyük duvar ekranı
- Tüm istasyonların canlı durumu, renk kodlu
- İstasyon kapasitesi (`m²/gün`) tanımlanır; kuyruk yoğunluğu izlenir
- **Proaktif Uyarı:** Bir istasyon dolmak üzereyken ofis ve operatör uyarılır

### 5.9. 🏆 Yönetici Dashboard (C-Level)

- **Darboğaz Isı Haritası:** İstasyon bazlı m² birikimi, renk kodlu
- **Fire Röntgeni:** Günlük/aylık, vardiya ve personel bazlı detay
- **OEE (Overall Equipment Effectiveness):** Kapasite kullanımı, kalite oranı
- **Canlı Kâr-Zarar:** Açık siparişlerin tahmini kârlılığı, tamamlananların gerçekleşen kârı
- **Teslimat Takvimi:** Termin tarihlerine göre gecikme riski olan siparişler

---

## 6. YETKİLENDİRME MATRİSİ

| Rol                 | Sipariş Girişi | Üretim Akışı          | Personel Verileri | Maliyet Raporları  | Müşteri Portali | Ayarlar |
| ------------------- | -------------- | --------------------- | ----------------- | ------------------ | --------------- | ------- |
| **Operatör**        | ❌             | ✅ (sadece kendi işi) | ❌                | ❌                 | ❌              | ❌      |
| **Ofis**            | ✅             | ✅ (görüntüleme)      | ❌                | ✅ (sipariş bazlı) | ❌              | ❌      |
| **Yönetici/Patron** | ✅             | ✅ (tam)              | ✅                | ✅ (tüm)           | ✅              | ✅      |
| **Şoför**           | ❌             | ✅ (sadece teslimat)  | ❌                | ❌                 | ❌              | ❌      |
| **Müşteri**         | ❌             | ✅ (kendi siparişi)   | ❌                | ❌                 | ✅              | ❌      |

---

## 7. ENTEGRASYONLar

| Sistem                 | Amaç                 | Teknoloji                               |
| ---------------------- | -------------------- | --------------------------------------- |
| ERP'ler (Logo, Dia)    | Sipariş verisi alma  | Excel/CSV/PDF import (API'den bağımsız) |
| Opti Kesim Yazılımları | Kesim planı okuma    | XML/DXF dosya okuma (İleri faz)         |
| Harita Servisi         | Rota optimizasyonu   | Google Maps API veya OSRM               |
| WhatsApp Business      | Müşteri bildirimleri | Meta Cloud API                          |
| SMS                    | Bildirim yedekleme   | Twilio veya yerel operatör API          |
| Depolama               | Fotoğraf, dosya      | Cloudflare R2 (S3 uyumlu)               |
| Auth                   | Kimlik doğrulama     | Auth.js (OAuth2, JWT)                   |

---

## 8. FAZ PLANI (YOL HARİTASI)

> Fazlar **süreye değil, mantıksal bağımlılığa** göre sıralanmıştır.
> Her faz, bir sonrakine geçmeden önce sahada **doğrulanmalıdır.**

---

## DOKÜMAN YÖNETİMİ

Ana proje dokümanları aşağıdaki gibidir:

- [PLAN.md](PLAN.md)
- [PRODUCTION_CALCULATION_ENGINE.md](PRODUCTION_CALCULATION_ENGINE.md) **— Hesaplama Motoru Tek Referansı (Yeni)**
- [INVENTORY_VALUATION_ENGINE.md](INVENTORY_VALUATION_ENGINE.md) **— Stok Değerleme Motoru Tek Referansı (Yeni)**
- [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md)
- [PRODUCT_ARCHITECTURE.md](PRODUCT_ARCHITECTURE.md)
- [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)
- [walkthrough.md](walkthrough.md)
- [CHANGELOG.md](CHANGELOG.md)
- [DECISIONS.md](DECISIONS.md)
- [SECURITY.md](SECURITY.md)

Bu dosyalar projenin tekil referans kaynaklarıdır; kritik kararlar ve politika değişiklikleri burada kaydedilmelidir.

### 🔵 FAZ 0 — Mimari Temel (Ön Hazırlık)

**Bağımlılık:** Yok — Buradan başlıyoruz.

**Hedef:** Sistemin iskeletini kurmak. Hiçbir iş mantığı yok, sadece altyapı.

- [x] Neon PostgreSQL kurulumu (COMPLETED)
- [x] Tüm tablolarda RLS politikalarının tanımlanması (0001_add_rls.sql ile Neon'a uygulandı) (COMPLETED)
- [x] Auth.js ile kimlik doğrulama ve rol bazlı yetkilendirme (COMPLETED)
- [ ] Temel CRUD API'leri: Fabrika, Kullanıcı, Müşteri, İstasyon Tanımları
- [ ] Cloudflare R2 bağlantısı
- [ ] CI/CD pipeline kurulumu (GitHub Actions)
- [x] Multi-tenant izolasyon testleri (COMPLETED)

**Doğrulama Kriteri:** Farklı `fabrika_id`'ye sahip iki test tenant, birbirinin verisini hiçbir şekilde göremez.

---

### 🟢 FAZ 1 — Çekirdek MES (MVP — Pilot Fabrikaya İnecek İlk Sürüm)

**Bağımlılık:** Faz 0 tamamlanmış olmalı.

**Hedef:** Sahada gerçekten çalışan, cam takibini sağlayan minimum sistem.

- [ ] Sipariş Excel/CSV import + Sütun Eşleştirme Sihirbazı (Agnostik Gateway — basit hali)
- [ ] Sipariş → Sipariş Kalemi → üretim sayaçları ve üretim geçmişi oluşturma
- [ ] "Üretime Gönder" butonu ile sipariş kalemlerinin kesim kuyruğuna alınması
- [ ] Operatör PWA ekranı: Barkod okuma, Başlat / Bitir / Kırıldı / Mola butonları
- [ ] Pull kuyruk mekanizması: Kesim → Rodaj → Temper → Kalite → Depo → Sevkiyat
- [ ] Kırık / rework döngüsü (ana sipariş kalemi üzerinden rework ve acil kesim kuyruğu)
- [ ] Sipariş bütünlüğü kilidi (tüm camlar tamamlanmadan "Tamamlandı" diyemez)
- [ ] Ofis sipariş izleme ekranı (durum, kırmızı uyarılar, kuyruk bilgisi)
- [ ] Termal yazıcıdan operasyonel barkod / etiket üretimi
- [ ] İstasyon bazlı esnek rota tanımı (JSONB ile, ürün tipine göre)

**Doğrulama Kriteri:** Pilot fabrikada 1 ay boyunca canlı çalıştırma. Hata raporları toplanır, kullanıcı geri bildirimleri alınır.

---

### 🟡 FAZ 2 — Maliyet ve Fire Zekası

**Bağımlılık:** Faz 1 doğrulanmış olmalı.

**Hedef:** Sistemin asıl değer önerisini (fire ve maliyet görünürlüğü) hayata geçirmek.

- [ ] Dinamik maliyetlendirme motoru
  - [ ] Çevre bazlı maliyet (çıta, silikon, thiakol: `2×(en+boy)`)
  - [ ] Trim ve rodaj fire paylarının brüt hammadde hesabına otomatik eklenmesi
  - [ ] İşlem bazlı ekler (delik, CNC vb.)
  - [ ] Sabit gider dağılımı (aylık toplam m²'ye göre)
  - [ ] Ardiye bekleme maliyeti (bekleme süresi × günlük birim)
- [ ] Fire tanımı ve gerçek zamanlı hesaplama
  - [ ] Kırık, trim, yeniden üretim maliyetleri
- [ ] Hata Havuzu (Dead Stock) modülü
  - [ ] Havuza cam ekleme (iptal, fazla kesim, tolerans dışı)
- [ ] Toleranslı Stok Eşleştirme Algoritması
  - [ ] `en ± 10mm`, `boy ± 10mm` arama
  - [ ] Ofis uyarı popup'ı
- [ ] Sipariş bazlı tahmini vs. gerçekleşen maliyet karşılaştırma ekranı

**Doğrulama Kriteri:** Geçmiş verilerle geriye dönük maliyet hesaplama testi. Gerçek fire oranı ilk kez görünür hale gelecek.

---

### 🟠 FAZ 3 — İnsan ve Makine Verimliliği

**Bağımlılık:** Faz 2 tamamlanmış olmalı.

- [ ] Vardiya tanımları (Sabah/Akşam/Gece) ve personel giriş/çıkış log'u
- [ ] Personel performans metrikleri (yalnızca Yönetici rolü)
  - İşlem süresi, fire oranı, üretim adedi, fazla mesai maliyeti
- [ ] Makine kapasitesi tanımı ve kuyruk yoğunluğu takibi (m²/gün bazında)
- [ ] Proaktif uyarı mekanizması (kapasite aşımı riski önceden bildirim)
- [ ] **Andon Panosu** (WebSocket)
  - Gerçek zamanlı tüm istasyon durumu
  - Renk kodlu: 🟢 Normal / 🟡 Uyarı / 🟠 Yoğun / 🔴 Darboğaz
  - Sahada TV/kiosk ekranına uygun büyük görünüm
- [ ] WebSocket altyapısı kararı (SignalR / raw WebSocket / Pusher)

---

### 🔶 FAZ 4 — Depo, Lojistik ve Sevkiyat

**Bağımlılık:** Faz 3 tamamlanmış olmalı.

- [ ] Ardiye bekleme maliyetinin maliyet motoruna entegrasyonu
- [ ] Rota optimizasyonu (GPS tabanlı, Google Maps veya OSRM)
- [ ] **Ters Sıralı Yükleme** algoritması ve depo yükleme listesi
- [ ] **Şoför PWA Uygulaması** (Offline-First)
  - QR barkod okuma (irsaliye)
  - Durum seçimi (Teslim / Hasar / Eksik)
  - PoD fotoğraf çekme (sıkıştırılmış, R2'ye yüklenir)
  - GPS + zaman damgası
  - IndexedDB + Sync Queue ile çevrimdışı çalışma
- [ ] Depo konum yönetimi (raf/bölge kodu ile cam lokasyonu)

---

### 🟣 FAZ 5 — Müşteri Deneyimi

**Bağımlılık:** Faz 4 tamamlanmış olmalı.

- [ ] Müşteri self-servis portalı (kargo takip mantığıyla sipariş izleme)

---

## Sprint 2 — Cari Yönetimi (Tamamlandı 2026-07-14)

Bu sprint kapsamında yalnızca "Cari Yönetimi" modülü geliştirildi ve aşağıdaki işler uygulanmıştır. Aşağıda listelenenler sahada veya kod tabanında gerçek olarak gerçekleşen değişiklikleri yansıtır; geleceğe yönelik tahmin veya yapılacaklar içermez.

- Eklendi: `customers`, `customer_contacts`, `delivery_points` Drizzle ORM tabloları (`packages/db/src/schema.ts`).
- Eklendi: İlgili RLS politika ve tablo etkinleştirmeleri (`packages/db/migrations/0001_add_rls.sql`).
- Değiştirildi: `audit_logs` tablosuna `customerId` alanı eklendi ve audit log ilişkilendirmeleri güncellendi (`packages/db/src/schema.ts`).
- Eklendi: Zod giriş/çıktı şemaları (`packages/types/src/index.ts`) - `createCustomerSchema`, `updateCustomerSchema`, `createCustomerContactSchema`, `updateCustomerContactSchema`, `createDeliveryPointSchema`, `updateDeliveryPointSchema`.
- Eklendi: Server Actions (CRUD) sağlayan fonksiyonlar (`apps/web/src/app/actions/identity.ts`): müşteri oluşturma/güncelleme/pasifleştirme, yetkili (contact) oluşturma/güncelleme, teslimat noktası oluşturma/güncelleme.
- Doğrulandı: `npm run build --workspace apps/web` çalıştırıldı ve mevcut değişiklikler derlendi; kritik derleme hatası yok.

### Sprint 2B — Kullanıcı Arayüzü (UI)

- Tamamlandı: Basit Cari Yönetimi UI eklendi (`apps/web/src/app/customers` ve `apps/web/src/components/customers`).
  - `customers` listesi, `new` formu, `detail` sayfası (Genel, Yetkililer, Teslimat Noktaları) uygulandı.
  - Yetkili ve teslimat noktası ekleme formları sayfa içi formlar olarak eklendi (modal yerine).
  - UI, yalnızca mevcut server action'lara bağlandı; harita, ERP, sipariş veya dosya yükleme eklenmedi.

Not: Bu sprintte teslimat noktası ve yetkililer yalnızca cari (customer) bağlamında yönetilmeye hazır hale getirildi; sipariş (order) ile entegrasyon bu sprint kapsamında yapılmadı.

- [ ] WhatsApp Business API entegrasyonu (şablon mesajlar)
- [ ] SMS yedekleme entegrasyonu
- [ ] Müşteri portal rol modeli kararı (ayrı tablo mu, `kullanicilar.rol='musteri'` mi?)
- [ ] (İleri) Müşteri PoD fotoğrafını portal üzerinden görebilir

---

### 🔴 FAZ 6 — Patron Paneli (C-Level Dashboard)

**Bağımlılık:** Faz 5 tamamlanmış olmalı.

- [ ] Canlı darboğaz ısı haritası (istasyon bazlı m² birikimi)
- [ ] Fire röntgeni (günlük/aylık/vardiya/personel bazlı)
- [ ] Gerçekleşen maliyet vs. tahmini maliyet karşılaştırması
- [ ] Anlık kâr-zarar ekranı
- [ ] OEE (Overall Equipment Effectiveness) raporlaması
- [ ] Teslimat takvimi (gecikme riski izleme)
- [ ] Mobil uyumlu tasarım (patron sahaya gitmeden telefonda bakabilir)

---

### ⚫ FAZ 7 — SaaS Olgunlaşma

**Bağımlılık:** Faz 6 tamamlanmış, pilot doğrulanmış olmalı.

- [ ] Yeni fabrika self-onboarding (kayıt, konfigürasyon, ilk veri kurulumu)
- [ ] Abonelik planları ve faturalama (Stripe veya benzeri)
- [ ] SaaS fiyatlandırma modeli kararı (kullanım bazlı m² mi, kullanıcı sayısı mı?)
- [ ] İçe aktarma motorunun genişletilmesi (Opti/DXF entegrasyonu)
- [ ] Lot/parti izlenebilirliği (float cam tedarikçi parti barkodu)
- [ ] Tenant yönetim paneli (admin)

---

## 9. AÇIK KONULAR VE KARAR MATRİSİ

> Bu maddeler netleşmeden geliştirme yapılmaz. Her kararın yanına tarih ve karar yazılır.

| #   | Konu                            | Açıklama                                   | Önerilen Karar                                  | Durum             |
| --- | ------------------------------- | ------------------------------------------ | ----------------------------------------------- | ----------------- |
| 1   | **MVP Ürün Tipi**               | Sadece Düz Temper mi, Isıcam da dahil mi?  | MVP'de yalnızca Düz Temper, Isıcam Faz 2'de     | ❓ Açık           |
| 2   | **Müşteri Portalı Rol Modeli**  | Ayrı tablo mu, `rol='musteri'` mi?         | Tek tablo, `rol` ile ayrım (daha basit)         | ❓ Açık           |
| 3   | **Andon Panosu Donanımı**       | Hangi ekran/kiosk?                         | Raspberry Pi + TV önerisi                       | ⏳ Faz 3'te karar |
| 4   | **Barkod Standardı**            | QR Code mu, Code128 mi?                    | QR Code (daha fazla veri, hızlı okuma)          | ❓ Açık           |
| 5   | **WebSocket Altyapısı**         | SignalR / raw WebSocket / Pusher?          | Faz 3'te ihtiyaç netleşecek                     | ⏳ Beklemede      |
| 6   | **Offline Conflict Resolution** | Çakışma stratejisi?                        | İlk etapta Last-Write-Wins, sonra manuel review | ❓ Açık           |
| 7   | **Lot/Parti İzlenebilirliği**   | Float cam tedarikçi barkodu okutulacak mı? | Faz 7'de değerlendirilecek                      | ⏳ Beklemede      |
| 8   | **Opti Entegrasyonu**           | Desteklenecek formatlar (DXF, XML)?        | Faz 7'de detaylandırılacak                      | ⏳ Beklemede      |
| 9   | **KVKK Veri Saklama**           | Performans verileri ne kadar saklanacak?   | Yasal danışmanla belirlenecek                   | ⚠️ Kritik         |
| 10  | **SaaS Fiyatlandırma**          | Kullanım bazlı m² mi, sabit abonelik mi?   | Sabit abonelik + aşım ücreti önerisi            | ❓ Açık           |
| 11  | **Frontend Framework**          | React mi, Vue mi?                          | Henüz karar verilmedi                           | ❓ Açık           |
| 12  | **Trim Fire Payı Değeri**       | Kaç mm? Her istasyon için ayrı mı?         | Pilot fabrikadan gerçek veri toplanacak         | ❓ Açık           |

---

## 10. RİSK MATRİSİ

| Risk                                  | Olasılık | Etki      | Mitigasyon                                                                              |
| ------------------------------------- | -------- | --------- | --------------------------------------------------------------------------------------- |
| Saha adaptasyonu düşük                | Orta     | 🔴 Yüksek | Faz 1'de operatörlerle yoğun test; kullanıcı dostu arayüz; büyük butonlar; eğitim planı |
| Veri izolasyonu açığı (RLS atlanması) | Düşük    | 🔴 Kritik | Veritabanı RLS zorunlu; API'de fabrika_id filtresi; audit log                           |
| Offline senkronizasyon çakışması      | Orta     | 🟡 Orta   | Last-Write-Wins + çakışma uyarısı + manuel düzeltme paneli                              |
| ERP entegrasyon zorluğu               | Orta     | 🟡 Orta   | Agnostik Gateway; standart dosya formatları; API bağımlılığı yok                        |
| Performans darboğazı                  | Düşük    | 🟠 Yüksek | Neon otomatik ölçekleme; index planlaması; sorgu optimizasyonu                          |
| KVKK yasal uyum                       | Orta     | 🔴 Kritik | Faz 0'da KVKK danışmanı; veri minimizasyonu; yetkilendirme matrisi                      |
| Kapsam kayması (Scope Creep)          | Yüksek   | 🟡 Orta   | Feature Gate prensibi; her özellik 5 sorudan geçmeli; fazları aşmamak                   |

---

## 11. AR-GE BACKLOG (İleride Değerlendirilecek)

Bunlar hayata geçirilmek istenen ama henüz zamanlanmamış fikirlerdir:

1. **AI ile Darboğaz Tahmini:** Geçmiş istasyon verilerini analiz ederek "3 saat sonra Rodaj istasyonunda darboğaz oluşacak" şeklinde proaktif uyarılar.

2. **Opti Kesim Makinesi Entegrasyonu:** Sistem optimizasyon yazılımlarıyla (DXF, XML) doğrudan haberleşir; operatörün hiçbir şey yapmasına gerek kalmaz.

3. **Lot/Parti Genealogy:** Tedarikçiden gelen jumbo float camın parti etiketini sisteme tanıtarak, fırın patlamalarında kronik hatanın kaynağına (hangi tedarikçi, hangi parti) inebilmek.

4. **ML ile Kırık Tahmini:** Hangi operatör, hangi cam türünde, hangi istasyonda daha fazla kırık üretiyor? Önleyici aksiyonlar.

5. **PostGIS ile Gerçek GPS Rota Optimizasyonu:** İlk fazda basit sıralama yeterli, ileri fazda gerçek rota optimizasyonu.

6. **Müşteri Mobil Uygulaması:** Web portal yerine native uygulama.

7. **Ses Bildirimi / Ekran Uyarısı (Saha):** Darboğaz oluştuğunda sesli alarm ve Andon panosunda uyarı.

---

## 12. DOKÜMAN YÖNETİMİ

### Bu Dosyayı Nasıl Güncelleriz?

```
Değişiklik Öncesi: PLAN_archive_YYYYMMDD.md olarak kopyala
Güncelleme Sonrası: "Son Güncelleme" satırını güncelle
Kapsam: Tamamlanan maddeler [x] ile işaretle, yeni kararları Bölüm 9'a ekle
```

### Yeni Geliştirme Oturumuna Başlarken

1. Bu `PLAN.md` dosyasını AI'a okut
2. Bölüm 8'deki faz listesine bak — hangi fazı yapıyoruz?
3. O fazın görev listesinden başla
4. Bitince ilgili maddeyi `[x]` ile işaretle

### Dosya Lokasyonları

- **Bu dosya:** `c:\Users\srknc\Desktop\FABRİKA\glassos\PLAN.md`
- **Referans dokümanlar:** `deepseek.md`, `gemini.md`, `grok.md` (aynı klasörde)
- **Kod deposu:** `glassos` (Git reposu ilklendirildi)
- **Doküman versiyonlama:** GitHub `docs/` klasörü altında; eski sürümler `archive/` altında

---

## 13. ÖZET: NEREDEYIZ?

```
✅ Vizyon ve strateji netleşti
✅ Mimari ve teknoloji kararları verildi (Turborepo)
✅ Veri modeli tasarlandı (Drizzle ORM şemaları veritabanına uygulandı)
✅ Modüller ve iş akışları tanımlandı
✅ Faz planı oluşturuldu
✅ Bu PLAN.md dosyası oluşturuldu

[/] Faz 0: Geliştirme aşamasında (Monorepo ve DB tamamlandı)
✅ Modüller: Machines, Stations, Personnel, Warehouses, Materials, Goods Receipt tamamlandı
🔲 Faz 1 → 7: Sırasıyla gelecek
```

**Bir sonraki adım:** Goods Receipt (Mal Kabul) modülü tamamlandı. Sıradaki modül: Inventory Management veya Order Management.

> Sprint 2.10.0 kapsamında Goods Receipt modülü eklendi: 4 tablo (goods_receipts, goods_receipt_items, goods_receipt_attachments, goods_receipt_plates), Zod doğrulama, 8 server action (CRUD + status transitions), DataGrid list page with stats/filters, create dialog with vehicle/document/items/plates sections, detail Sheet drawer, full i18n (EN/TR), permissions (5 roles), navigation, DB migration generated. Pre-existing TS errors in masterData.ts and materials pages fixed.

---

_Son Güncelleme: 2026-07-18 — Sprint 2.10.0 (Goods Receipt Module Implementation) tamamlandı. Goods Receipt full CRUD, Drizzle schema (4 tables), Zod validation, 8 server actions, DataGrid UI, create dialog, detail drawer, i18n (EN/TR), authorization, navigation, DB migration eklendi. Pre-existing TypeScript hataları (masterData.ts schema mismatch, materials/machines config[status] non-null assertion) giderildi. Mevcut Architecture Baseline korunuyor._

---

## Sprint 2.9.0 — Warehouse Master Module (COMPLETED ✅)

**Tarih:** 2026-07-18  
**Kapsam:** Depo master verisi — CRUD, DataGrid, detay, i18n, RBAC  
**Durum:** ✅ Tamamlandı — Browser doğrulaması geçti

### Yapılanlar

- **Schema & DB**: `warehouses` tablosu — Drizzle ORM + RLS FORCE
- **Server Actions**: CRUD işlemleri — `requireSession()` + `withTenantSession()` + `ensurePermission`
- **UI Page**: DataGrid, summary cards, search, filter, sort
- **i18n**: TR/EN tam çeviri

---

## Sprint 2.10.0 — Goods Receipt Module (COMPLETED ✅)

**Tarih:** 2026-07-19  
**Kapsam:** Mal Kabul (Goods Receipt) modülü — 4 tablo, Zod validasyon, 8 server action, DataGrid, i18n TR/EN, RBAC  
**Durum:** ✅ Tamamlandı — Tüm testler geçiyor

### Yapılanlar

- **4 tablolu schema**: `goods_receipts`, `goods_receipt_items`, `goods_receipt_attachments`, `goods_receipt_plates`
- **Zod validasyon**: Tüm CRUD için Zod şemaları
- **8 server action**: CRUD + status transitions
- **UI**: DataGrid list page, stats cards, filters, create dialog (vehicle/document/items/plates), detail drawer
- **i18n**: TR/EN tam çeviri
- **Permissions**: 5 rol için yetkilendirme
- **Navigation**: Sidebar'a eklendi

---

## Sprint 2.10.x — Customer Master Completion (IN PROGRESS 🔄)

**Tarih:** 2026-07-19 — devam ediyor  
**Kapsam:** Müşteri modülünün master data standardizasyonu ve tamamlanması  
**Durum:** 🔄 Aktif Geliştirme

### Mevcut Durum

- **6 tablo**: `customers`, `customer_contacts`, `customer_delivery_points`, `customer_glass_catalog`, `customer_instructions`, `customer_instruction_conditions`
- **7 sekme**: Genel, Üretim, İletişim, Kişiler, Teslimat Noktaları, Cam Kataloğu, Talimatlar
- **Tüm sekmeler HTTP 200**: Browser doğrulaması tamamlandı
- **Drizzle Relations Fix**: `CUSTOMER_ARCHITECTURE.md`'de belgelenen pattern ile çözüldü
- **next-auth entegrasyonu**: Auth flow tamamlandı

### Kalan İşler

- Customer modülü form validasyonları ve edge case'ler
- Master data import/export

---

## Architecture Baseline

Sprint 2.2 sonunda aşağıdaki alanlar dondurulmuştur (Architecture Freeze):

- Security
- Tenant Architecture
- RLS
- Deployment
- Master Data
- Production Architecture
- Inventory Valuation Architecture

> Sprint 2.3.1 kapsamında sadece Factory Configuration modeli güçlendirilecek; mevcut Architecture Freeze ve Sprint 2.2 baseline geri uyumlu kalacaktır.

- Database Architecture

Bu alanlar Sprint 2.3 boyunca referans mimari (baseline) olarak kullanılacaktır ve üzerinde geriye dönük değişiklik yapılmayacaktır. Değişiklik gerekmesi durumunda yeni bir ADR kararı alınması zorunludur.
