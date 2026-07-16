# Walkthrough — Sprint 2.6.6: Background Job Architecture (Enterprise Foundation)

Tarih: 2026-07-16. Sprint 2.6.6 — Background job infrastructure (in-memory), hiçbir business job implemente edilmedi.

1. 2026-07-16 — Sprint 2.6.6: Background job foundation tamamlandı
   - **Modül**: `packages/db/src/background/` — 6 dosya: `job.ts`, `job-queue.ts`, `job-registry.ts`, `job-runner.ts`, `background-service.ts`, `index.ts`
   - **Job model**: `Job` interface + `BaseJob` class. Status: pending→running→completed/failed/cancelled/retrying.
   - **Priority kuyruk**: 4 seviye (critical/high/normal/low), FIFO within same priority. Delayed execution support.
   - **Retry politikası**: Exponential backoff (1s→30s capped), configurable maxRetries (default 3).
   - **Cancel**: pending job'lar execution öncesi iptal edilebilir.
   - **Dependency injection**: Tüm bileşenler interface üzerinden bağlanır. BullMQ/RabbitMQ/SQS/Temporal desteği için servis kodu değişmez.
   - **Event integration ready**: BackgroundService domain event handler'lardan job enqueue edecek şekilde tasarlandı. Hiçbir bağlantı yapılmadı.
   - **51 yeni test**: job lifecycle, priority, retry, cancel, runner, registry, DI, BackgroundService integration.
   - **Toplam 318 test** geçiyor (9 test file), tsc --noEmit 0 hata.
   - **Dokümantasyon**: BACKGROUND_ARCHITECTURE.md oluşturuldu. PLAN.md, CHANGELOG.md, README.md, SERVICE_ARCHITECTURE.md, walkthrough.md güncellendi.

---

# Walkthrough — Sprint 2.6.5A: Event Publisher Production Wiring Fix

Tarih: 2026-07-21. Sprint 2.6.5A — Production composition root wiring, CustomerService events, singleton güvencesi.

1. 2026-07-21 — Sprint 2.6.5A: Production wiring fix tamamlandı
   - **Composition root düzeltmesi**: `apps/api/src/services.ts` — `db as never` EventPublisher pozisyonundaydı. `LocalEventPublisher` singleton oluşturulup tüm 10 servise doğru sırada enjekte edildi.
   - **CustomerService event publishing**: 3 yeni event (CustomerCreated, CustomerUpdated, CustomerDeactivated). Constructor'a EventPublisher eklendi. 3 mutation metot event publishing pattern'ine dönüştürüldü.
   - **10/10 servis EventPublisher** — Tüm servisler artık constructor'da EventPublisher alıyor.
   - **Singleton doğrulama**: Composition root testleri aynı instance referansını Set ile doğruluyor.
   - **FakeDb**: `select().from().where().execute()` Drizzle mutable query builder pattern'ini taklit eden minimal test DB.
   - **7 yeni composition root testi**: singleton (2), event publishing (3), yaratma (2). Toplam 267 test (8 test file), tsc --noEmit 0 hata.
   - **Dokümantasyon**: SERVICE_ARCHITECTURE.md, CHANGELOG.md, PLAN.md, README.md, walkthrough.md güncellendi.

---

# Walkthrough — Sprint 2.6.5: Domain Event Publisher (Enterprise Foundation)

Tarih: 2026-07-21. Sprint 2.6.5 — Transaction-safe Event Publishing altyapısı.

1. 2026-07-21 — Sprint 2.6.5: Domain Event Publisher tamamlandı
   - **EventPublisher interface**: `publish(event)` + `publishMany(events)` — `src/services/events.ts`
   - **LocalEventPublisher**: Production implementasyonu. `onPublish(handler)` ile handler kaydı, async/await destekli sıralı yayın.
   - **InMemoryEventPublisher**: Test implementasyonu. `events[]`, `publishCount`, `eventCount`, `ofType<T>()`, `any()`, `reset()`, `last`, `first` accessor'lar.
   - **9/9 servis entegrasyonu**: Tüm event dönen metotlar `const _txResult = await withTenantSession()` → `publishMany(_txResult.events)` → `return _txResult` pattern'ini kullanır.
   - **Transaction-safe pattern**: Event'ler asla `withTenantSession()` callback'i içinde yayınlanmaz. Transaction rollback yaparsa event yayınlanmaz.
   - **Constructor injection**: `EventPublisher` tüm servislerde `db: any`'den önce enjekte edilir.
   - **27 yeni test**: InMemoryEventPublisher (13), LocalEventPublisher (10), Transaction Safety Pattern (3), Publisher Injection (2).
   - **Toplam 260 test** geçiyor (7 test file), tsc --noEmit 0 hata.
   - **Dokümantasyon**: SERVICE_ARCHITECTURE.md, CHANGELOG.md, PLAN.md, walkthrough.md güncellendi.

---

# Walkthrough — Sprint 2.6.4: PostgreSQL Row Level Security

Tarih: 2026-07-18. Sprint 2.6.4 — PostgreSQL Row-Level Security uygulaması.

1. 2026-07-18 — Sprint 2.6.4: PostgreSQL Row Level Security tamamlandı
   - **RLS Migration** (`migrations/0003_enable_rls.sql`): 52 tabloda Row-Level Security aktifleştirildi.
   - **3 politika deseni**:
     - 23 tabloda doğrudan `tenant_id = current_setting('app.current_tenant_id', true)::char(26)` karşılaştırması
     - 26 tabloda EXISTS subquery ile parent tablo üzerinden tenant izolasyonu
     - 3 tabloda factories tablosu üzerinden EXISTS subquery ile factory-scoped izolasyon
   - **Politika standardı**: Tüm politikalar `FOR ALL` (SELECT, INSERT, UPDATE, DELETE), yalnızca `app.current_tenant_id` kullanır, `app.current_user_role` KULLANILMAZ.
   - **İsimlendirme**: `tenant_isolation_{table_name}`.
   - **16 yeni test**: Migration dosyası doğrulama (7), Schema kapsamı (3), Politika doğruluğu (4), Entegrasyon prosedürü (1), Uyumluluk (1).
   - **Toplam 227 test** geçiyor, 0 regresyon.
   - **Güvenlik kazanımı**: Cross-Tenant izolasyonu artık uygulama katmanına ek olarak veritabanı katmanında da zorlanıyor (defense in depth). `glassos_app` rolü (`NOBYPASSRLS`) doğrudan DB bağlantısında dahi yalnızca kendi tenant'ının verisini görür.
   - **Korunmayan tablolar (5)**: `tenants`, `roles`, `permissions`, `role_permissions`, `user_sessions` — global/shared oldukları için RLS dışı bırakıldı.
   - `SECURITY.md`, `PLAN.md`, `CHANGELOG.md`, `walkthrough.md` güncellendi.

---

# Walkthrough — Sprint 2.5.5: Dispatch & Delivery Engine

Tarih: 2026-07-16. Sprint 2.5.5 — Sevkiyat ve Teslimat Motoru.

1. 2026-07-16 — Sprint 2.5.5: Dispatch & Delivery Engine tamamlandı
   - **DispatchService** oluşturuldu: Sevkiyat ve teslimat lifecycle yönetimi.
   - **READY Pool**: Kalite kontrol onaylı ürünleri filtreleme (müşteri, ürün tipi, alan, sipariş).
   - **Dispatch Basket**: Sepete ekleme/çıkarma, mükerrer koruma, istatistikler.
   - **Delivery Lifecycle**: createDelivery → loadVehicle → unloadVehicle → startShipment → completeDelivery | completePartialDelivery.
   - **Durum geçişleri**: created → loading → ready_to_ship → in_transit → delivered | partially_delivered | cancelled.
   - **Araç/Sürücü/Dispatcher ataması**: Her biri ayrı metod, durum bazlı validasyon.
   - **Kısmi teslimat**: Sipariş kalemi bazında teslimat, sayaç güncelleme.
   - **İptal**: Teslim edilmiş sevkiyatlar iptal edilemez.
   - **Sayaçlar**: requested, ready, loaded, delivered, remaining.
   - **Immutable geçmiş**: Tüm kayıtlar kopya olarak döner.
   - **8 yeni domain event**: DispatchCreatedEvent, VehicleAssignedEvent, LoadingStartedEvent, LoadingCompletedEvent, ShipmentStartedEvent, DeliveryCompletedEvent, PartialDeliveryCompletedEvent, DispatchCancelledEvent.
   - **29 yeni test**: Tüm lifecycle senaryoları kapsandı.
   - **Toplam 211 test**, 10 servis, 42 domain event.
   - Architecture freeze korundu: şema/migration/repository değişikliği yok.
   - **31 yeni test** (5 lifecycle, 2 measurements, 2 temper, 2 IG, 4 READY, 3 conditional pass, 2 rework, 1 scrap, 2 notes, 2 history, 3 statistics, 3 edge cases), toplam 183 test geçiyor.
   - **Architecture Freeze korundu**: şema, migration veya repository değişikliği yok.
   - TypeScript sıfır hata (`npx tsc --noEmit`).
   - `SERVICE_ARCHITECTURE.md`, `PRODUCTION_ARCHITECTURE.md`, `CHANGELOG.md`, `PLAN.md`, `README.md` güncellendi.

---

# Walkthrough — Sprint 2.5.3: Station Operation Engine

Tarih: 2026-07-16. Sprint 2.5.3 — İstasyon Bazlı Üretim Kuralları (Grinding, Temper, Insulating Glass).

1. 2026-07-16 — Sprint 2.5.3: Station Operation Engine tamamlandı
   - **StationOperationService** oluşturuldu: Her istasyon kendi iş kurallarına sahip.
   - **Grinding Rules**: CUTTING/REWORK_CUTTING sonrası giriş (uyarı), Temper/READY/MANUAL_TRANSFER'e çıkış.
   - **Temper Rules**: Grinding tamamlanmış olmalı (sert hata), non-temperable Low-E engellenir. Fırın kapasitesi: normal = alan, temperli IG = 2× alan.
   - **Insulating Glass Rules**: Normal/Temperli/Low-E IG desteklenir (sadece validasyon).
   - **Low-E Validation**: temperable → izin ver, non_temperable → engelle + LowEValidationFailedEvent.
   - **Waiting Pools**: Her istasyon için in-memory bekleme havuzu (add/remove/get/statistics/load).
   - **8 yeni domain event**: GrindingStartedEvent, GrindingCompletedEvent, TemperStartedEvent, TemperCompletedEvent, InsulatingGlassStartedEvent, InsulatingGlassCompletedEvent, FurnaceCapacityCalculatedEvent, LowEValidationFailedEvent.
   - **33 yeni test** (4 grinding, 3 temper, 3 furnace, 3 IG, 3 Low-E, 5 entry validation, 4 waiting pools, 2 history, 4 stats, 2 edge cases), toplam 152 test geçiyor.
   - **Architecture Freeze korundu**: şema, migration veya repository değişikliği yok.
   - TypeScript sıfır hata (`npx tsc --noEmit`).
   - `SERVICE_ARCHITECTURE.md`, `PRODUCTION_ARCHITECTURE.md`, `STATION_MANAGEMENT_ARCHITECTURE.md`, `CHANGELOG.md`, `PLAN.md` güncellendi.

---

# Walkthrough — Sprint 2.5.2: Production Transfer & Merge Workflow

Tarih: 2026-07-16. Sprint 2.5.2 — İstasyonlar Arası Transfer ve Revork Merge.

1. 2026-07-16 — Sprint 2.5.2: Production Transfer & Merge Workflow tamamlandı
   - **ProductionTransferService** oluşturuldu: Transfer lifecycle (initiated→completed|cancelled|rejected), 6 transfer tipi (automatic/manual/rework_merge/correction/return_to_previous/emergency), immutable transfer history, istatistikler.
   - **11 method**: initiateTransfer, completeTransfer, cancelTransfer, rejectTransfer, returnToPreviousStation, manualTransfer, assignReadyStation, getTransferHistory, getAllTransfers, getTransferStats, findTransferById.
   - **ReworkService.mergeRework()** geliştirildi: 8 validation rule ile rework merge workflow.
   - **Merge counter semantics**: completedQuantity artar, brokenQuantity DEĞİŞMEZ (immutable), missing dolaylı olarak azalır.
   - **6 yeni domain event**: TransferInitiatedEvent, TransferCompletedEvent, TransferCancelledEvent, TransferRejectedEvent, ReworkMergedEvent, ReadyStationAssignedEvent.
   - **35 yeni test** (4 initiation, 3 lifecycle, 7 validation, 6 history/statistics, 3 merge success, 7 merge validation, 2 counter invariants, 3 stats after lifecycle), toplam 119 test geçiyor.
   - **Vertical Slice #3** testi: Transfer → Tamamlama → Geçmiş → İstatistik tam uçtan uca çalışıyor.
   - Architecture Freeze korundu: şema, migration veya repository değişikliği yok.
   - TypeScript sıfır hata (`npx tsc --noEmit`).
   - `SERVICE_ARCHITECTURE.md`, `REWORK_ARCHITECTURE.md`, `PRODUCTION_ARCHITECTURE.md`, `CHANGELOG.md`, `PLAN.md` güncellendi.

---

# Walkthrough — Sprint 2.5.1: Cutting Execution, Breakage & Rework Workflow

Tarih: 2026-07-16. Sprint 2.5.1 — Kesim Oturumu, Kırılma Kaydı ve Otomatik Revork.

1. 2026-07-16 — Sprint 2.5.1: Cutting Execution, Breakage & Rework Workflow tamamlandı
   - **CuttingExecutionService** oluşturuldu: Kesim oturumu yaşam döngüsü (CREATED→READY→CUTTING→PAUSED→COMPLETED→CANCELLED), Work Basket yönetimi, kırılma kaydı, sipariş satırı sayaçları.
   - **ReworkService** geliştirildi: `createBreakageRework()` metodu ile Fire Depot sahipliğinde otomatik revork oluşturma, `getMergePreparation()` metodu ile merge hazırlık metadata'sı.
   - **8 yeni domain event**: CuttingSessionCreatedEvent, CuttingStartedEvent, CuttingCompletedEvent, CuttingPausedEvent, CuttingResumedEvent, CuttingCancelledEvent, BreakageRegisteredEvent, FireDepotAssignedEvent.
   - **9 validation rule** implementasyonu: boş oturum başlatma reddi, başladıktan sonra öğe ekleme reddi, malzeme uyuşmazlığı, completedQuantity'den büyük kırılma reddi, mükerrer aktif revork reddi, tamamlanmış revork'ta kırılma reddi.
   - **27 yeni test** (10 session, 7 basket, 5 breakage, 2 counter, 2 merge, 1 e2e), toplam 84 test geçiyor.
   - **Vertical Slice #2** testi: Kırılma → Revork → Fire Depot tam uçtan uca çalışıyor.
   - Architecture Freeze korundu: şema, migration veya repository değişikliği yok.
   - TypeScript sıfır hata (`npx tsc --noEmit`).
   - `SERVICE_ARCHITECTURE.md`, `REWORK_ARCHITECTURE.md`, `CHANGELOG.md`, `PLAN.md` güncellendi.

---

# Walkthrough — Sprint 2.5: Core Production Service Layer

Tarih: 2026-07-16. Sprint 2.5.0 — İlk çalıştırılabilir dikey kesit (Vertical Slice #1).

1. 2026-07-16 — Sprint 2.5.0: Core Production Service Layer tamamlandı
   - **5 servis sınıfı** oluşturuldu: CustomerService, OrderService, ProductionService, ProductionQueueService, ReworkService.
   - **6 domain event** tanımlandı: OrderApprovedEvent, QueueCreatedEvent, QueueStartedEvent, QueueCompletedEvent, ProductionTransferredEvent, ReworkCreatedEvent.
   - **OrderService.approveOrder()**: sipariş onaylama iş mantığı — müşteri kontrolü, satır doğrulama, ProductionOrder oluşturma, event fırlatma.
   - **ProductionQueueService**: kesim kuyruğu yönetimi — sepete ekleme, mükerrer engelleme, başlatma/tamamlama, istatistik.
   - **ProductionService**: durum geçiş doğrulama, istasyon atama, transfer.
   - **ReworkService**: temel revork oluşturma.
   - **34 servis testi**, 5 test dosyasında toplam 57 test geçiyor.
   - **Vertical Slice #1** testi: Müşteri → Sipariş → Onay → Kesim Kuyruğu tam uçtan uca çalışıyor.
   - Architecture Freeze korundu: şema, migration veya repository değişikliği yok.
   - TypeScript sıfır hata (`npx tsc --noEmit`).
   - `SERVICE_ARCHITECTURE.md` oluşturuldu.

---

# Walkthrough — Sprint 2: Cari Yönetimi

Tarih sırasıyla Sprint 2 sırasında yapılan teknik değişikliklerin özeti (sadece gerçekleşen işler). Tüm tarihler: 2026-07-14.

1. 2026-07-15 — Sprint 2.3.3: Cutting domain foundation eklendi
   - `packages/engine/src/index.ts` içine `GlassSheet`, `CuttingResult`, `RemnantCandidate`, `ScrapCandidate`, `CuttingStatistics` ve `EngineMetadata` domain modelleri eklendi.
   - Bu modeller Cutting Engine'in gelecekteki hesaplamalarda kullanacağı ortak veri yapısını temsil eder; gerçek hesap algoritması, optimization, nesting, inventory consumption, valuation ve cost mantığı bu sprintte dahil edilmedi.
   - `packages/engine/test/domain-models.test.ts` ile temel model testleri eklendi.

2. 2026-07-15 — Sprint 2.3.4: Cutting session domain eklendi
   - `packages/engine/src/index.ts` içine `CuttingSession`, `OrderReference`, `SheetUsage` ve session status tipi eklendi.
   - Bu modeller üretim akışındaki bir kesim operasyonunun ana veri yapısını temsil eder: session, sheets, orders, remnants, scraps ve cutting result ilişkileri placeholder olarak tanımlandı.
   - `packages/engine/test/cutting-session-models.test.ts` ile temel unit testleri eklendi.

3. 2026-07-15 — Sprint 2.3.5: Remnant decision engine eklendi
   - `packages/engine/src/index.ts` içine `RemnantDecisionService` eklendi.
   - Servis, Factory Configuration içindeki remnant eşiklerini kullanarak her parça için reusable remnant veya scrap kararını verir.
   - `packages/engine/test/remnant-decision-service.test.ts` ile karar senaryoları test edildi.

4. 2026-07-15 — Sprint 2.3.6: Scrap decision engine eklendi
   - `packages/engine/src/index.ts` içine `ScrapDecisionService` eklendi.
   - Servis, parça boyutları ve remnant değerlendirmesi üzerinden scrap/keep kararını verir; sonuç açıklanabilir bir açıklama ve neden kodu içerir.
   - `packages/engine/test/scrap-decision-service.test.ts` ile temel scrap senaryoları test edildi.

5. 2026-07-15 — Sprint 2.3.7: Cutting result engine eklendi
   - `packages/engine/src/index.ts` içine `CuttingResultEngine` eklendi.
   - Motor, üretim hesaplaması, remnant kararı ve scrap kararı üzerinden mevcut `CuttingResult` modelini doldurur.
   - `packages/engine/test/cutting-result-engine.test.ts` ile temel senaryolar test edildi.

6. 2026-07-15 — Sprint 2.3.8: Batch cutting engine eklendi
   - `packages/engine/src/index.ts` içine `BatchCuttingEngine` eklendi.
   - Motor, birden fazla siparişi işler ve aynı anda `CuttingResult` listesini bir `CuttingSession` altında toplar.
   - `packages/engine/test/batch-cutting-engine.test.ts` ile çoklu sipariş senaryoları test edildi.
   - `packages/engine/src/index.ts` içine `RemnantDecisionService` eklendi.

7. 2026-07-15 — Sprint 2.3.10: Cutting execution engine eklendi
   - `packages/engine/src/index.ts` içine `CuttingExecutionEngine`, `ExecutionBatch`, `ExecutionOrder`, `ExecutionStatistics` ve `ExecutionStatus` eklendi.
   - Bu katman, operatörün günlük üretim akışını temsil eder: batch oluşturma, sipariş ekleme/çıkarma, kesim başlatma/bitirme, used sheet count kaydı ve mevcut cutting motorlarından execution summary üretimi.
   - `packages/engine/test/cutting-execution-engine.test.ts` ile boş batch, sipariş ekleme/çıkarma, status geçişleri ve execution summary hesaplama senaryoları test edildi.

8. 2026-07-15 — Sprint 2.3.11: Production queue engine eklendi
   - `packages/engine/src/index.ts` içine `ProductionQueueEngine`, `ProductionOperation`, `ProductionOperationStatus`, `ProductionQueue`, `ProductionQueueItem` ve `ProductionProgress` eklendi.
   - Bu katman, üretim akışının operasyon bazlı sıralamasını temsil eder; uygun kuyruğa alma, sonraki kuyruk geçişi, bekleyen iş listesi ve ilerleme yüzdesi hesaplaması sağlar.
   - `packages/engine/test/production-queue-engine.test.ts` ile operasyon kuyruğu, geçişler, parçalı ilerleme ve çok operasyonlu aksiyon senaryoları test edildi.
   - Servis, Factory Configuration içindeki remnant eşiklerini kullanarak her parça için reusable remnant veya scrap kararını verir.
   - `packages/engine/test/remnant-decision-service.test.ts` ile karar senaryoları test edildi.

9. 2026-07-14 — Veritabanı şeması genişletildi
   - `packages/engine/src/index.ts` içine `CuttingSession`, `OrderReference`, `SheetUsage` ve session status tipi eklendi.
   - Bu modeller üretim akışındaki bir kesim operasyonunun ana veri yapısını temsil eder: session, sheets, orders, remnants, scraps ve cutting result ilişkileri placeholder olarak tanımlandı.
   - `packages/engine/test/cutting-session-models.test.ts` ile temel unit testleri eklendi.

10. 2026-07-14 — Veritabanı şeması genişletildi
    - `packages/engine/src/index.ts` içine `GlassSheet`, `CuttingResult`, `RemnantCandidate`, `ScrapCandidate`, `CuttingStatistics` ve `EngineMetadata` domain modelleri eklendi.
    - Bu modeller Cutting Engine'in gelecekteki hesaplamalarda kullanacağı ortak veri yapısını temsil eder; gerçek hesap algoritması, optimization, nesting, inventory consumption, valuation ve cost mantığı bu sprintte dahil edilmedi.
    - `packages/engine/test/domain-models.test.ts` ile temel model testleri eklendi.

11. 2026-07-14 — Veritabanı şeması genişletildi
    - `packages/db/src/schema.ts` içine yeni tablolar eklendi: `customers`, `customer_contacts`, `delivery_points`.
    - `audit_logs` tablosuna `customerId` alanı eklendi.

12. 2026-07-14 — RLS (Row Level Security) politikaları genişletildi
    - `packages/db/migrations/0001_add_rls.sql` içine yeni tablolar için RLS etkinleştirme satırları eklendi.
    - `customers`, `customer_contacts`, `delivery_points` için tenant izolasyonu sağlayan POLICIES eklendi (`customers_isolation`, `customer_contacts_isolation`, `delivery_points_isolation`).

13. 2026-07-14 — Tip/şema güncellemeleri eklendi
    - `packages/types/src/index.ts` dosyasına Zod şemaları eklendi: `createCustomerSchema`, `updateCustomerSchema`, `createCustomerContactSchema`, `updateCustomerContactSchema`, `createDeliveryPointSchema`, `updateDeliveryPointSchema`.

14. 2026-07-14 — Sunucu eylemleri (Server Actions) uygulandı
    - `apps/web/src/app/actions/identity.ts` içine müşteri yönetimi için CRUD ve yardımcı fonksiyonlar eklendi:
      - `createCustomerAction`, `updateCustomerAction`, `disableCustomerAction`
      - `createCustomerContactAction`, `updateCustomerContactAction`
      - `createDeliveryPointAction`, `updateDeliveryPointAction`
    - Tüm eylemler mevcut RBAC kurallarına göre `requireSession()` ile korundu ve audit log kayıtları oluşturuldu.

15. 2026-07-14 — Derleme ve doğrulama
    - `npm run build --workspace apps/web` çalıştırıldı; uygulama derlendi ve kritik hatasız bir build doğrulandı.

16. 2026-07-15 — Fabrika Konfigürasyonu altyapısı tasarımı
    - `packages/db/src/schema.ts` içinde `settings.factory_configuration` alanı eklendi; central grinding/trim/remnant/tolerance/inventory valuation parametrelerini barındıracak.
    - `packages/types/src/index.ts` içinde fabrika konfigürasyonu Zod şeması eklendi.
    - `apps/web/src/app/actions/identity.ts` içindeki `updateFactorySettingsAction` bu konfigürasyonu opsiyonel olarak kabul edecek şekilde genişletildi.
    - `packages/engine/src/index.ts` içinde `ProductionCalculationService` oluşturuldu; net/prodüksiyon ölçüleri, alanlar, grinding allowance ve consumption area hesapları Factory Configuration'a dayalıdır.
    - 2026-07-15 — Factory Configuration JSON modeli versioned, strategy tabanlı trim/grinding, remnant enabled/threshold ve inventory placeholder alanları ile geleceğe hazırlandı.

17. 2026-07-14 — Kullanıcı Arayüzü (Sprint 2B)
    - `apps/web` içinde Cari Yönetimi kullanıcı arayüzü eklendi:
      - `apps/web/src/app/customers/page.tsx` — Cari listesi
      - `apps/web/src/app/customers/new/page.tsx` — Yeni cari formu
      - `apps/web/src/app/customers/[id]/page.tsx` — Cari detay sayfası (Genel, Yetkililer, Teslimat Noktaları)
      - `apps/web/src/components/customers/*` — `CustomerForm`, `CustomerDetail`, `ContactForm`, `DeliveryPointForm`
    - Yetkililer ve Teslimat Noktaları için basit ekleme formları eklendi; modal yerine sayfa içi formlar kullanıldı.
    - Bu UI sadece müşteri yönetimi ile sınırlıdır; harita, ERP entegrasyonu, dosya yükleme veya sipariş ekranları eklenmedi.

Notlar:

- Bu walkthrough yalnızca Sprint 2 (Cari Yönetimi) kapsamında gerçekleştirilmiş teknik değişiklikleri içerir. Sipariş, sevkiyat veya diğer modüllere entegrasyon bu sprintte yapılmadı.

7. 2026-07-14 — Security documentation added
   - GlassOS Security Policy (`SECURITY.md`) oluşturuldu ve proje dokümantasyonuna dahil edildi.

8. 2026-07-14 — Production architecture document added
   - `PRODUCTION_ARCHITECTURE.md` oluşturuldu ve proje dokümantasyonuna dahil edildi.

9. 2026-07-14 — Product architecture document added
   - `PRODUCT_ARCHITECTURE.md` oluşturuldu ve proje dokümantasyonuna dahil edildi.

10. 2026-07-14 — Sprint 2.2B: Production Master Data sertleştirme

- `packages/db/src/schema.ts` ve `packages/db/migrations/0002_production_master_data.sql` üzerinde yalnızca veritabanı katmanına yönelik güvenlik ve bütünlük iyileştirmeleri yapıldı.
- Yapılanlar (özet):
  - `material_unit_profiles` tablosundan tekrarlayan `tenant_id` alanı kaldırıldı (tenant bilgisi artık `materials` tablosundan türetilecek).
  - Kategori → Malzeme ilişkisi (`material_categories` → `materials`) için `ON DELETE RESTRICT` uygulandı; yanlışlıkla kategori silinmesiyle çok sayıda malzeme silinmesi engellendi.
  - Ürün kategori ilişkisi (`product_categories` → `products`) için `ON DELETE RESTRICT` uygulandı.
  - Tenant-scoped benzersiz index'ler eklendi: `(tenant_id, material_code)`, `(tenant_id, product_code)`, `(tenant_id, recipe_code)`, `(tenant_id, routing_template_name)`.
  - Operasyon/routing sıra güvenliği için unique index eklendi: `(recipe_id, sequence)`, `(routing_template_id, sequence)`.
  - Performans için dikkatli seçilmiş tenant-scoped ve FK index'leri eklendi (örn. `materials(tenant_id)`, `materials(material_code)`, `recipes(recipe_code)`, vb.).
- Not: Serbest metin kullanılan alanların (ör. `consumption_basis`, `package_type`, `operation_code`, `default_unit`) lookup table mı yoksa ENUM mı olacağına dair karar verilmedi; esneklik gereksinimi nedeniyle şu an lookup table öneriliyor. Kısa teknik gerekçe PLAN.md ve ilgili kısımda eklendi.

11. 2026-07-15 - Sprint 2.2B: Deployment and PostgreSQL role architecture plan

- `DEPLOYMENT_ARCHITECTURE.md` eklendi.
- Dokuman; SaaS, Hybrid ve On-Premise deployment modellerini, `glassos_owner` / `glassos_app` PostgreSQL rol ayrimini, migration/runtime connection stratejisini, RLS revizyon planini ve production checklist'i tanimlar.
- Not: Bu adimda SQL uygulanmadi, rol olusturulmadi, migration calistirilmadi ve uygulama kodu degistirilmedi.

12. 2026-07-15 - Sprint 2.2B: Dokümantasyon senkronizasyonu tamamlandı

- `PRODUCT_ARCHITECTURE.md` içinde tamamlanmış ürün modeli örneği eklendi.
- `PRODUCTION_ARCHITECTURE.md`, `DATABASE_ARCHITECTURE.md`, `DEPLOYMENT_ARCHITECTURE.md` başlıkları standardize edildi.
- `PLAN.md` ve `CHANGELOG.md` güncellenerek doküman senkronizasyonu kayda geçirildi.

15. 2026-07-16 - Sprint 2.4.6: Core Production repository layer for Customer, Order, Production, Rework

- 6 production repositories created: CustomerRepository, OrderRepository, OrderLineRepository, ProductionRepository, ProductionQueueRepository, ReworkRepository.
- Domain-specific query methods implemented (32 custom methods across all repositories).
- Each repository follows Sprint 2.4.5 conventions: BaseRepository inheritance, soft delete support, multi-tenant filtering, pagination, sorting, search.
- All repositories contain ONLY persistence logic—no business logic, no calculations, no workflow decisions.
- `packages/db/test/production-repository.test.ts` added with 7 comprehensive test scenarios covering CRUD, domain queries, filtering, pagination, and isolation.
- All tests passing: 23/23 (production: 7, identity: 5, infrastructure: 7, schema: 4).
- `npx tsc -p packages/db/tsconfig.json --noEmit` completed without errors.
- Production workflow now has complete persistence foundation: Identity aggregates (Sprint 2.4.5) + Core Production aggregates (Sprint 2.4.6).

14. 2026-07-16 - Sprint 2.4.5: Repository layer for Identity & Organization aggregates

- `packages/db/src/repositories/base.repository.ts` created as the foundation for all repositories.
- Repositories for Tenant, Factory, User, Role, Permission, and Personnel implemented.
- Multi-tenant filtering, soft delete, pagination, sorting, and search support standardized in BaseRepository.
- Repository layer contains NO business logic—purely persistence abstraction.
- `packages/db/test/repository.test.ts` added with 5 test scenarios covering CRUD, isolation, and filtering.
- `npm --workspace packages/db exec vitest run --reporter=basic` passed 16 tests (3 files: repository, infrastructure, schema).
- `npx tsc -p packages/db/tsconfig.json --noEmit` completed without errors.

13. 2026-07-16 - Sprint 2.4.4: Shared database infrastructure completed

- `packages/db/src/db/client.ts` added a centralized PostgreSQL client factory for future repository usage.
- `packages/db/src/db/transactions.ts`, `query.ts`, `context.ts`, `errors.ts`, and `relations.ts` added the shared infrastructure layer without changing schema, migrations, or business logic.
- `packages/db/test/infrastructure.test.ts` added automated tests for client creation, relation exposure, transaction helpers, context creation, query state behavior, and error mapping.
- `npm --workspace packages/db exec vitest run --reporter=basic` and `npx tsc -p packages/db/tsconfig.json --noEmit` completed successfully.

14. 2026-07-16 - Sprint 2.3.11A: Production Flow Architecture Consolidation

- `PRODUCTION_FLOW_ARCHITECTURE.md` created as the single source of truth for production routing.
- Production routing, mandatory operation rules, queue philosophy, personnel responsibility, machine capacity, recipe consumption, and rework handling were synchronized across architecture docs.
- New ADRs added for Grinding Before Tempering, Temper Furnace Capacity, Material-Based Cutting Pool, and Production Flow Architecture.

14. 2026-07-16 - Sprint 2.3.12: Personnel Management

- Production-focused personnel domain models implemented in the engine package.
- Personnel cards now support employee number, names, status, hire date, notes, station assignment, machine assignment, shifts, health information, and emergency contacts.
- System role and job title remain independent, and future compatibility relationships were prepared for production reporting use cases.

15. 2026-07-16 - Sprint 2.3.13: Machine Management

- Production machine domain models implemented in the engine package.
- Machine cards now support machine code, name, brand, model, serial number, production year, purchase date, commission date, warranty dates, status and notes.
- Machine type, capacity, operator assignment, maintenance records, timeline events, spare parts, consumables, suppliers, service companies and document references were added as production-only foundation models.

16. 2026-07-16 - Sprint 2.3.14: Station Management

- Production station domain models implemented in the engine package.
- Stations now support station code, name, description, configurable station type, status, display order and notes.
- Machine, personnel and queue references were added as lightweight relationships; capacity and dashboard models were added as informational metadata for future planning.

17. 2026-07-16 - Sprint 2.3.15: Recipe Domain (Bill of Materials)

- Production recipe domain models implemented in the engine package.
- Recipes now support versioning, product identity, recipe item types, bill-of-materials rows, formula placeholders, yield definitions and validation models for theoretical material consumption only.
- Routing, stations, machines, queue scheduling, inventory deduction and production calculations remain intentionally out of scope for this sprint.

18. 2026-07-16 - Sprint 2.3.16: Inventory Domain

- Inventory domain models implemented in the engine package.
- Inventory cards now support inventory code, name, description, category, type, unit, status, notes, location, lot, barcode, reservation, and metadata preparation.
- Inventory consumption, valuation, warehouse transfer, purchasing and production consumption remain intentionally out of scope for this sprint.

19. 2026-07-16 - Sprint 2.3.17: Inventory Consumption Engine

- Inventory consumption domain models implemented in the engine package.
- Consumption records now support lines, sources, relationships, validation and reason-based tracking without stock deduction or valuation.

20. 2026-07-16 - Sprint 2.3.18: Rework & Breakage Management

- Rework and breakage domain models implemented in the engine package.
- Breakage events now capture station, machine, operator, shift, batch, order, order-line, reason, notes and ownership transfer to factory fire inventory; production tracking remains order-line counter based and rework merges back into the parent order line.
- Fire inventory supports reusable and non-reusable categories and rework requests always restart from Cutting.

21. 2026-07-16 - Sprint 2.3.19: Production Work Queue Engine

- Production work queue domain models implemented in the engine package.
- The operator's work basket now supports selecting station/machine/material, material-filtered job listing, barcode-driven item addition, duplicate prevention, status transitions and statistics preparation.
- This layer remains separate from production queue routing, inventory, machine control and business calculation logic.

22. 2026-07-16 - Sprint 2.3.20: Domain Review & Persistence Readiness

- The implemented engine domains were reviewed for naming consistency, status enum alignment, relationship clarity, aggregate ownership, future repository/API readiness, and documentation consistency.
- No new business features were introduced; the sprint focused on architecture normalization and persistence-preparation guidance only.

23. 2026-07-16 - Sprint 2.3.21: Production Transfer & Recovery Architecture

- The production transfer and recovery philosophy was documented as a documentation-only architecture freeze.
- Finalized decisions were recorded for manual station transfers, order-line counters, rework as internal production orders, cutting rework queue semantics, production merge behavior, fire depot handling, unified production history, and glass manufacturing rules.
- No runtime behavior, engine logic, or persistence layer design was introduced in this sprint.

---

## Sprint 2.2 Completion Report

Bu bölümde kısa özet halinde aşağıdaki çalışmaların tamamlandığı kayıt altına alınmıştır:

- Authentication
- Authorization
- RBAC
- RLS
- Tenant Isolation
- Deployment Architecture
- Master Data
- Materials
- Products
- Recipes
- Routing
- Production Architecture
- Production Calculation Engine
- Inventory Valuation Engine (Architecture)
- Migration Recovery
- Database Hardening
- Security Hardening
- Production Deployment Model

_Not: Sprint 2.2 dahilindeki mimari değişiklikler ve master data yapısı dondurulmuş olup, referans mimari olarak kullanılacaktır._

---

## Sprint 2.3.22 — Database Blueprint & Architecture Lock

**Tarih:** 2026-07-16

**Kapsam:** Tüm Sprint 2.3 domain mimarilerinin ilişkisel veritabanı planına dönüştürülmesi. Bu, Sprint 2.4 (Database Implementation) için gerekli olan tek yetkili veri kaynağını oluşturur.

**Tamamlanan Çalışmalar:**

- `DATABASE_BLUEPRINT.md` oluşturuldu — GlassOS'un resmi veritabanı planlama dokümanı.
- 17 Aggregate tam olarak haritalandı: Tenant, Factory, Identity, Customer, Personnel, Machine, Station, Material, Product, Recipe, Inventory, Order, Production, Production Queue, Rework, Factory Configuration, Audit Log.
- 68 planlanan tablo tanımlandı — Common Table Standards dahil.
- ULID Primary Key stratejisi seçildi ve gerekçesi belgelendi.
- Soft Delete ve Hard Delete tabloları politikaya göre ayrıştırıldı.
- Audit Policy: zorunlu denetim gerektiren tablolar belirlendi.
- Index Strategy: her domain için indeks planı yapıldı (SQL üretilmedi).
- 17 Repository'nin sahiplik sınırları çizildi.
- 8 Transaction Boundary use-case bazında belgelendi.
- 9 Persistence Readiness riski tespit edildi ve çözüme bağlandı.
- Naming Convention: tablo, kolon, indeks, FK, repository, servis ve API isimlendirme standartları tanımlandı.
- `DATABASE_ARCHITECTURE.md`, `CHANGELOG.md`, `PLAN.md`, `README.md` güncellendi.

**GlassOS, Sprint 2.4 (Database Implementation) için hazırdır.**

---

## Sprint 2.4.0 — Database Standards

**Tarih:** 2026-07-16

**Kapsam:** GlassOS veritabanı geliştirme standartlarının belirlenmesi.

**Tamamlanan Çalışmalar:**

- `DATABASE_STANDARDS.md` dosyası oluşturuldu.
- Tablo ve kolon isimlendirme kuralları netleştirildi.
- ULID Primary Key stratejisi ve TypeScript/Drizzle entegrasyonu belgelendi.
- Foreign Key, İndeks ve Constraint isimlendirme kuralları kilitlendi.
- UTC timestamp saklama ve uygulama seviyesinde timezone dönüşümü politikası tanımlandı.
- Üretim boyutları ve finansal değerler için hassas decimal standartları belirlendi.
- Enum (TypeScript union/const) ve JSONB kullanım politikaları donduruldu.
- Soft Delete, Audit kolonları ve Migration isimlendirme kuralları standartlaştırıldı.
- `CHANGELOG.md`, `PLAN.md`, `DATABASE_ARCHITECTURE.md`, `README.md` güncellendi.

---

## Sprint 2.4.1 — Core Database Schema (Identity & Organization)

**Tarih:** 2026-07-16

**Kapsam:** GlassOS'un Organizasyonel ve Kimlik (Identity) altyapısının ilişkisel veritabanı şemalarının Drizzle ORM kullanılarak tanımlanması ve ilk migration dosyasının oluşturulması.

**Tamamlanan Çalışmalar:**

- **Pre-Implementation Review:** Identity & Organization domainleri ilişkisel yapı ve aggregate sınırları açısından son kez gözden geçirilerek dairesel bağımlılıklar giderildi.
- **Identity & Organization Şemaları:** `tenants`, `factories`, `users`, `roles`, `permissions`, `role_permissions`, `user_sessions` tabloları Drizzle schema formatında `packages/db/src/schema/` altında modüler olarak kodlandı. Standartlara uygun olarak tüm ID alanları ve ilişkileri ULID (`CHAR(26)`) formatına çekildi.
- **Personnel Şeması:** `personnel`, `personnel_titles`, `personnel_shifts`, `personnel_station_permissions`, `personnel_machine_assignments`, `personnel_certificates`, `personnel_health_information`, `emergency_contacts` tabloları ilişkisel kurallarla implement edildi.
- **Personnel ↔ User İlişkisi:** Bir personelin sisteme login olmak zorunda olmadığı (User olmaksızın Personnel bulunabilir) ve bir API/Sistem kullanıcısının personel kartı olmaksızın yaşayabildiği (Personnel olmaksızın User bulunabilir) 0..1 ilişkisi `personnel.user_id` nullable FK sütunuyla modellendi ve belgelendi.
- **Numbering Strategy:** [`NUMBERING_ARCHITECTURE.md`](NUMBERING_ARCHITECTURE.md) isminde yeni bir doküman oluşturularak; Sipariş, Üretim Cam Barkodu, Rework, Stok Kalemi, Lot ve Plaka Barkodlarının formatları, yıl/ay/fabrika ön ekleri ve yıllık/aylık sıfırlanma politikaları detaylandırıldı.
- **Migration:** Eski tüm veritabanı migration dosyaları temizlendi ve `0001_initial_identity_organization.sql` isimli temiz, standartlara uygun ilk PostgreSQL şema migration dosyası Drizzle Kit ile başarıyla generate edildi.
- **Doğrulama:** TypeScript type-check (`tsc --noEmit`) testi başarıyla çalıştırıldı ve şemanın hatasız derlendiği doğrulandı.
