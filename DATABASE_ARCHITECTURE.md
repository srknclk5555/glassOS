# GlassOS — Database Access Architecture

Tarih: 2026-07-14

Architecture Status
✅ Completed

Implementation Status
✅ Implemented (Sprint 2.2)

Validation Status
✅ Validated (Sprint 2.2)

> **→ Veritabanı tablo planlaması ve ilişki haritası için tek resmi kaynak: [`DATABASE_BLUEPRINT.md`](DATABASE_BLUEPRINT.md)**  
> **→ Veritabanı isimlendirme ve geliştirme standartları için resmi kılavuz: [`DATABASE_STANDARDS.md`](DATABASE_STANDARDS.md)**  
> Bu doküman DB erişim mimarisini (katmanlar, repository pattern, service layer, tenant context) tanımlar. Tablo şemaları ve standartlar ilgili dökümanlardadır.

Amaç: GlassOS için sürdürülebilir, güvenli, test edilebilir ve ölçeklenebilir bir DB erişim mimarisi tanımlamak. Bu doküman refactor öncesi mimari kararların tek kaynağı olacak; kod değişikliği içermez.

---

**Özet (kısa)**

- Öneri elde: katmanlı mimari (UI → Server Actions → Service Layer → Repository Layer → DB Session Context → Drizzle ORM → PostgreSQL with RLS).
- Kritik kural: Hiçbir UI/Component doğrudan `db` kullanamaz. Tüm DB operasyonları transaction bağlamında, `withTenantSession` veya eşdeğeri bir session-wrapper aracılığıyla çalışmalıdır.

---

## 1. Mevcut Mimari (analiz özet)

> **Historical Context:** Bu bölüm Sprint 2.2 öncesi analiz ve durum tespitini içerir. Artık referans amaçlı tutulmaktadır.

Repo taramasına göre (kod değiştirilmeksizin yapılan inceleme):

- `Server Actions` (ör. `apps/web/src/app/actions/identity.ts`): `withTenantSession(...)` ile sarılmış, transaction-level yazma/önemli operasyonlar burada.
- `Server Components / Pages` (ör. `apps/web/src/app/customers/*`, `CustomerDetail.tsx`, `factories/settings/page.tsx`): doğrudan `db.query` çağrıları içeriyor; `withTenantSession` kullanılmıyor.
- `Auth` (NextAuth authorize, `apps/web/src/lib/auth.ts`): oturum oluşturma sırasında `db.query.users.findFirst(...)` doğrudan kullanılıyor.
- `Authorization` yardımcıları (`apps/web/src/lib/authorization.ts`): roller/izin isimlerini almak için `db.query` kullanıyor.
- `Settings`, `Customers`, `Factory` veri okumaları bazı Server Components tarafından global `db` ile yapılıyor.
- `settings.factory_configuration` JSONB alanı, Factory Configuration için merkezi sürüm kontrollü ve gruplandırılmış tek kaynak olarak belirlenmiştir.

Kısaca: Kritik yazma işlemleri transaction-wrapper ile korunuyor; birçok okuma (page/server components/authorize) doğrudan `db` ile yapılıyor — bu durum tutarlılık ve RLS güvenliği riski doğuruyor.

---

## 2. Mevcut Yapının Uzun Vadeli Problemleri

> **Historical Context:** Bu bölüm Sprint 2.2 öncesi tespit edilen riskleri içerir. Artık referans amaçlı tutulmaktadır.

Aşağıda kısa değerlendirme, başlık bazlı:

- Multi Tenant / RLS
  - Risk: `current_setting('app.current_tenant_id', true)` temelli RLS, uygulama tarafından her DB bağlantısında/işleminde set edilmezse etkisiz kalır. Global `db` ile yapılan sorgular session değişkeni olmadan çalışabilir; cross-tenant sızıntısı riski.
  - Havuzlanmış bağlantılar (Neon/pg pool) varsa, `SET LOCAL` kullanımının transaction içinde yapılması zorunlu.

- Test edilebilirlik
  - Doğrudan `db` kullanan UI/Pages unit test yazmayı zorlaştırır; bağımlılıkları inject etmek zorlaşır.
  - Repository/Service ayrışması yoksa entegrasyon testleri hazırlamak karmaşıklaşır.

- Kod tekrarları
  - Tenant-checks ve tenant filter'ları (eq(customers.tenantId, session.user.tenantId)) hem DB sorgularında hem de uygulama mantığında tekrar ediliyor; merkezi bir mekanizma yok.

- Güvenlik
  - Yetki/izin kontrollerinin DB ile uyumlu merkezi şekilde uygulanmaması hata yüzeyini genişletir.

- Bakım maliyeti
  - Her sayfa veya component DB çağrısı eklediğinde güvenlik/tenant kontekstini unutma riski vardır.

- Performans
  - Çok sayıda küçük sorgu doğrudan UI tarafından tetikleniyorsa N+1 veya gereksiz sorgular görülebilir; repository katmanında caching / batching uygulanmalıdır.

- Genişleyebilirlik
  - Yeni modüller eklendikçe, tekil `db` kullanımından merkezi repository pattern'a geçilmezse teknik borç büyür.

Sonuç: Mevcut yapı kısa vadede çalışsa da kurumsal ölçekte sürdürülebilir, güvenli ve test edilebilir değildir.

---

## 3. Önerilen Katmanlı Mimari (yüksek seviye)

**Status:** Implemented (Sprint 2.2)

Aşağıdaki katmanlı mimari GlassOS'un ihtiyaçlarına göre önerilmiştir:

UI (React Pages/Components)
↓
Server Actions (Next.js Server Actions) — thin adapters
↓
Service Layer (iş kuralları, akışlar, transaction boundary)
↓
Repository Layer (DB erişim soyutlaması — yalnızca burada `db` import edilir)
↓
Database Session Context (withTenantSession, session-middleware, connection wrapper)
↓
Drizzle ORM (db client)
↓
PostgreSQL + RLS

Açıklama:

- UI: Sadece sunucuya istek yapar; hiç `db` import etmez.
- Server Actions: HTTP/Route adapter; request/session doğrulaması yapar; gelen isteği Service çağrısına map eder. Burada kısa input validation ve yetki kontrolü yapılır, ama transaction yönetimi Service katmanında yapılır.
- Service Layer: İş kurallarının merkezi (ör. sipariş oluşturma, glassPiece üretme, fire hesaplama, audit log oluşturma); transaction boundary burada başlar (ör. `withTenantSession(session, async tx => { /* service işlemleri */ })`). Service, repository'leri tx üzerinden çağırır.
- Repository Layer: Tüm SQL/ORM çağrılarını içerir; yalnızca repository `db`'yi import eder. Repository fonksiyonları `tx` ile çağrılabilir (transaction-aware): `findById(tx, id)` veya `findMany(tx, filter)`.
- Database Session Context: `withTenantSession` burada implement edilir (DB client wrapper). Transaction başlatma, `set_config(..., true)` çağrıları ve tx sağlama burada yapılır.
- Drizzle ORM: ORM seviyesi; repository içinde kullanılan düşük seviye client.
- PostgreSQL RLS: DB tarafı güvenliğini sağlar; `app.current_tenant_id` ve `app.current_user_role` session değişkenleri transaction içinde set edilir.

Avantaj: transaction scope tek yerde (Service) tanımlanır → `set_config` garanti edilir; repository'ler tx ile çalışır; UI katmanı safe.

---

## 4. Repository Pattern — Öneri ve Örnek Klasör Yapısı

**Status:** Implemented (Sprint 2.2)

Evet — Repository pattern öneriyorum. Repository'ler DB erişim sorumluluğunu izole eder ve test/mock yapmayı kolaylaştırır.

Örnek klasör yapısı (`apps/web/src` veya paylaşılan bir lib):

- src/
  - lib/
    - dbSession.ts # withTenantSession, connection helpers
    - repositories/
      - customer.repository.ts
      - customerContact.repository.ts
      - deliveryPoint.repository.ts
      - user.repository.ts
      - tenant.repository.ts
      - factory.repository.ts
      - settings.repository.ts
      - audit.repository.ts
      - index.ts # repository factory / typed exports
    - services/
      - customer.service.ts
      - auth.service.ts
      - factory.service.ts
      - settings.service.ts
      - order.service.ts
    - types/
      - repositories.ts

Repository sorumluluk örnekleri:

- `customer.repository.ts`: CRUD işlemleri (`findById`, `findMany`, `create`, `update`, `delete`), tenant scoped sorgular, DB-level filtrelemeler; **hiçbir iş kuralı burada yok**.
- `user.repository.ts`: kullanıcı aramaları, rol join'leri; auth ile ilgili salt DB işlemleri.
- `audit.repository.ts`: audit kayıt yazma, arşivleme.
- `settings.repository.ts`: fabrika/tenant ayarlarını okuma/yazma.
- `order.repository.ts` (ileride): sipariş oluşturma için gerekli sorgular, line-item yazma.

Dikkat: Repository fonksiyonları transaction-aware olmalı: `async findById(tx, id)` veya `async findByIdOrDefault(client, id)` şeklinde tasarlanabilir.

---

## 5. Service Layer — Neden gerekli ve neler burada olmalı

**Status:** Implemented (Sprint 2.2)

Evet — Service katmanı gereklidir.

Service katmanında bulunması gerekenler:

- İş akışları (ör. `createOrder`): birden fazla repository çağrısı, validasyon, business rule uygulama, event üretme.
- Transaction yönetimi (transaction boundary burada olmalı). Yani `withTenantSession(session, async tx => { /* service logic calling repos with tx */ })` pattern'i önerilir.
- Audit log yazma (veya audit servisini çağırma).
- Notification dispatch (serbest bırakmadan önce event kuyruğuna mesaj atma).
- Retry, idempotency ve error handling stratejileri.
- Domain validation (Zod + cross-field checks) — input-validation kısmı Server Action içinde yapılabilir, ama domain validation Service içinde olmalı.

Örnek flow: `createOrder` service

1. Service başlat: `withTenantSession(session, async tx => {`
2. Validate business rules (credit limit, stock availability)
3. `orderRepo.create(tx, payload)` → returns orderId
4. `glassPieceRepo.createBatch(tx, pieces)`
5. `auditRepo.insert(tx, {action:'create_order', meta})`
6. Emit event / push notification
7. commit

---

## 6. Tenant Context Yönetimi — `withTenantSession()` nerede yaşamalı?

**Status:** Implemented (Sprint 2.2)

Özet öneri: `withTenantSession()` transaction wrapper'ı **Service Layer**'ın sorumluluğunda başlatılmalı; repository'ler tx'yi argüman olarak almalı.

Neden Service Layer?

- Transaction boundary tek yerde olmalı: bir iş akışı (service) içinde birden fazla repository çağrısı olabilir; hepsinin aynı transaction ve aynı session-değerleriyle (SET LOCAL) çalışması gerekir.
- `set_config(..., true)` çağrısı transaction içinde yapılmalıdır — böylece bağlantı havuzundaki diğer istekleri etkilemez.
- Eğer `withTenantSession()` repository seviyesinde çağrılırsa; farklı repository çağrıları farklı transaction'lara dağılabilir veya developer yanlışlıkla repository'yi transaction dışında çağırarak güvenlik açıkları oluşturabilir.
- Server Actions yalnızca adapter görevi görmeli: gelen request'ten session alınır, kısa yetki ön kontrolü yapılır ve service çağrılır.

Kullanım paterni (öneri):

- Server Action:
  - `const session = await requireSession()`
  - `return await customerService.getList(session, filter)`
- Service (`customerService.getList`):
  - `return await withTenantSession(session, async (tx) => { return await customerRepo.findMany(tx, filter) })`

Alternatif (daha merkezi):

- Central middleware / adapter: server action'ın çağrılmadan önce otomatik session-wrapper ile sarmalanması (framework-level hooking) — Next.js App Router bunu doğrudan desteklemeyebilir, ancak wrapper fabrikası/utility ile kolaylaştırılabilir.

Sonuç: Service-level transaction wrapper en güvenli ve açık yaklaşımdır.

---

## 7. Auth Entegrasyonu — Önerilen Akış

Önerilen akış:

1. Login (NextAuth) — `authorize()` veya OAuth callback
   - Kullanıcı doğrulanır; `db` sorgusu (user lookup) yapılır **sadece** tenant/user lookup için (bu sorgu tenant bağlamından muaf olabilir ancak ekstra dikkat gerek)
   - Öneri: `authorize()` sırasında tenant-agnostic minimal user lookup yapılabilir; sonrasında session oluşturulurken token içine tenantId, role, factoryId gömülür.
   - Kritik: `authorize()` sonrası oluşturulan oturum token'ı güvenilir olmalı; eğer mümkünse auth sırasında da `withTenantSession` kullanılarak tenant-scoped veriler okunmalı.

2. Request yaşam döngüsü
   - Server Action alır, `requireSession()` ile server-side session/role/tenant bilgilerini alır.
   - Server Action → Service: `service.someOperation(session, payload)` çağrılır.
   - Service: `withTenantSession(session, async tx => { repo.*(tx) ... })` — burada `set_config` çağrısı yapılır ve tüm DB ops tx üzerinden yapılır.

3. Tenant bilgi yaşam döngüsü
   - TenantId & Role: NextAuth JWT token'ı içinde saklanır; istekte session alınır.
   - Bu bilgiler Service'e iletilir.
   - `withTenantSession` transaction başlamadan önce token içindeki tenantId/role doğrulanır (ör. kullanıcı gerçekten o tenant'ta mı?) — basit kontrol Service başında yapılır.

Not: `authorize()` sırasında yapılan `db.query.users.findFirst` çağrısı, saldırı yüzeyi oluşturabilir. Tavsiye:

- `authorize()` için ayrı, minimal-safe sorgu kullanın.
- Mümkünse kullanıcı/tenant ilişkisinin doğruluğu için `withTenantSession` kullanabilecek şekilde yeniden tasarımla (örneğin auth.service kullanarak) gözden geçirin.

---

## 8. Kod Standartları (önerilen kurallar)

**Status:** Implemented (Sprint 2.2)

Aşağıdaki kural setini kesinlikle öneriyorum; bunlar bir rehber ve CI lint kuralları ile uygulanmalı:

1. Hiçbir UI (`components`, `pages`, `app/*` server components hariç) doğrudan `db` kullanamaz.
2. Hiçbir React Component `db` import edemez.
3. Hiçbir Page/Server Component doğrudan `db` import edemez; sadece Server Action veya Service çağırabilir.
4. Repository dışında `db` import edilemez. (ESLint kuralı önerilir.)
5. `withTenantSession` yalnızca Service Layer veya auth.service tarafından başlatılabilir; repository'ler sadece verilen `tx` ile çalışır.
6. Service dışında iş kuralları yazılmaz; küçük domain-validasyonlar service içinde olmalı.
7. Tüm DB yazma işlemleri audit log ile eşzamanlı çalışmalı (audit repo çağrısı veya domain event).
8. Tüm DB operasyonları transaction-aware olmalı; CRUD işlemlerinde mümkünse `returning` ve minimal kolon seçimi kullanın.

Katılıyor muyum? Evet — ama kuralların uygulanması için otomatik kontroller (ESLint/TSLint custom rule veya codemod) ve PR inceleme kontrolü şart.

Eksik/Fazla:

- Fazla: "Repository dışında withTenantSession kullanılamaz" kuralı mantıklı ama implementasyonu zor olabilir; daha uygulanabilir kural: "Service başlatmadan önce herhangi bir tx başlatılamaz; repositorylerin tx-argümanları zorunlu olmalı." Bu compile-time/lintrule ile desteklenebilir.

---

## 9. Gelecekteki Modüller — Uyumluluk ve Genişleme

Bu mimari aşağıdaki modülleri rahatça destekler:

- Customer, Order, GlassPiece, Production, Station, Inventory, Waste, Delivery, Dashboard, AI, Reporting.

Neden uygun:

- Her modül kendi repository + service çiftini alır; service transaction'ı başlatır ve domain workflow'u yönetir.
- RLS DB seviyesinde multi-tenant izolasyonunu sağladığı için uygulama kodu doğru session context ile çalıştığında veri izolasyonu garanti edilir.
- AI/Reporting: heavy-read sorguları için ReadReplica veya ayrı reporting DB önerilir; read-only reporting katmanı RLS filtresiyle veya ETL ile güvenli hale getirilmeli.
- Genişleme senaryoları:
  - Event-driven iş akışları (Pub/Sub) eklendiğinde service katmanı event publish eder; worker'lar repository kullanarak tx-sız sorgular yapabilir (worker içinde ayrı withTenantSession uygulanmalı).
  - OLAP/Analytics: ETL pipeline ile RLS güvenli snapshot'lar alınmalı.

---

## 10. Mimari Kararlar (kısa liste)

**Status:** Fully Implemented (Sprint 2.4.6) — Identity + Core Production Repository Layers Complete

- Database infrastructure is centralized in `packages/db/src/db` and re-exported from `packages/db/src/index.ts`.
- Repository-ready transaction helpers, query-state utilities, database context helpers, and error mapping are now available without introducing business logic or persistence changes.
- Relation definitions for implemented aggregates are available for repository composition and future eager-loading scenarios.
- The infrastructure layer is intentionally non-branching: it does not implement repositories, services, APIs, or UI layers.

**Status:** Implemented (Sprint 2.2)

- Transaction boundary: Service Layer. `withTenantSession(session, cb)` Service tarafından başlatılacak.
- Repository pattern: Zorunlu; sadece repository `db` import edecek.
- UI/Component kısıtlaması: UI katmanı `db` import edemez.
- Auth: NextAuth token içi tenantId/role saklanır; authorize flow gözden geçirilmeli ve mümkünse auth.service ile güvenli hale getirilmeli.
- Testler: CI'de RLS izolasyon testleri zorunlu olmalı (tenant A ≠ tenant B doğrulamaları). Test DB (DATABASE_URL_TEST) sağlanmalı.
- Lint/CI: `no-direct-db-usage` benzeri kural veya kodmod pipeline eklenmeli.

---

## Örnek API ve Dosya Konvansiyonları (hızlı referans)

- `customer.service.ts`
  - içerir: `getList(session, filter)`, `getById(session,id)`, `create(session, payload)`
  - tüm metodlar Service içinde `withTenantSession` ile transaction başlatır.
- `customer.repository.ts`
  - içerir: `findMany(tx, filter)`, `findFirst(tx, id)`, `insert(tx, payload)`, `update(tx, id, data)`
  - repository sadece `tx.query...` veya `tx.insert...` kullanır.

---

## Test ve CI Önerisi (kısa)

- Unit: Service ve Repository için mocking (Vitest + mocked tx). Repository testleri gerçek DB'ye karşı ayrı integration testlerinde çalıştırılmalı.
- Integration (CI): RLS izolasyon testi su yürütülmeli:
  - Create tenant A/B, create resources A1/B1, assert A read != B.
  - Workflow testleri: createOrder → pieces created → audit inserted.
- CI: GitHub Actions job `rls-check` tetiklenmeli; secret `DATABASE_URL_TEST` gerektirir.

---

## Sonuç ve Önerilen İlk Adımlar (refactor planından önce)

1. Mimari onayı alın.
2. CI için test DB planı oluşturun (krediler, ephemeral DB/Neon test project veya Docker Postgres for CI).
3. Lint kuralları ve PR şablonu ekleyin (doğrudan `db` kullanımını engellemek üzere).
4. Sprint 2.2: küçük sprint ile Server Components'te tespit edilen `db.query` kullanımını Service+Repository çağrılarına refactor edin (öncelikli: auth.authorize ve customer pages).
5. Aynı sprintte otomatik RLS testini CI'ye ekleyin.

---

Bu doküman, yaklaşımı ve kararları referans göstererek sonraki sprintlerde yapılacak refactorların rehberi olacaktır.

---

## Business Domain Architecture

Bu bölüm GlassOS'un üretim odaklı iş domainlerini ve bunların nasıl modellenip yönetileceğini açıklar. Amaç: veri modelinden bağımsız, domain odaklı bir mimari rehberi sunmak; üretim süreçlerini doğru takip, maliyetlendirme ve izlenebilirlik ile sağlamaktır.

### 1. Production Domain Model

GlassOS'un temel domainleri ve görevleri:

- **Customer (Cari):** Müşteri bilgileri, fatura/adres/vergi bilgileri ve müşteri sözleşmeleri. Fire maliyetlerinin müşteriye değil fabrikaya ait olduğunu unutmayın; müşteri sadece sipariş sahibidir.
- **Order (Sipariş):** Müşteriden gelen sipariş; teslim tarihi, toplam adet, fiyat anlaşmaları ve siparişe bağlı kalemleri içerir.
- **Order Item (Sipariş Kalemi):** Sipariş içindeki tekil ürün tanımı (ör. 450x1800, 4 adet). Üretim adımlarına bağlanan temel birimdir.
- **Production (Üretim):** Bir Order Item'ın üretim sürecine girmesi; kesim, işleme, kalite, temper gibi istasyonlardan geçmesi. Production, sipariş kalemiyle ilişkilidir ve yaşam döngüsünü yönetir.
- **Stations (İstasyonlar):** Kesim, Rodaj, Yıkama, Temper, Isıcam, Basım, Sevkiyat gibi fiziksel istasyon tanımları, kapasite, batch davranışı ve operasyon kuralları burada tutulur.
- **Fire (Fire / Atık):** Üretim sırasında ortaya çıkan fire (kırık, tolerans dışı, hasarlı) kayıtları; fabrikanın maliyeti olarak izlenir ve Fire Havuzu'na gelir.
- **Inventory (Stok):** Hazır ürün ve atölye içi yarı mamul stokları; barkod/operasyonel referanslar yerine Order Line lifecycle ve sayaçlar ile ilişkilendirilir.
- **Delivery (Sevkiyat):** Sevkiyat planları, POD (Proof of Delivery), şoför yönetimi ve teslimat durumları.

Her domainin sorumluluğu ayrı servisler ve repository'lerle tutulmalı; veri izolasyonu RLS ile sağlanırken, domain mantığı Service Layer'da yer almalıdır.

### 2. Production Engine

Production Engine, GlassOS'un çekirdeğidir: bir Order'ın üretime alınmasından sevkiyata kadar olan tüm iş akışını yöneten kurallı motor.

Görevleri:

- Sipariş kalemlerini üretim kuyruğuna almak ve önceliklendirmek.
- İstasyonlar arası flow'u yönetmek: hangi parça hangi istasyona, ne zaman ve hangi sırayla gönderilecek.
- Kaynak/kapasite kontrolü: istasyon kapasitelerini ve vardiya tanımlarını dikkate alarak planlama yapmak.
- Fire ve exception durumlarında yeniden planlama (remake) ve eksik adetlerin takibini sağlamak.

Örnek akış (şablon olarak):

Sipariş → Kesim → Rodaj → Temper → Kalite → Hazır → Sevkiyat

Not: Bu sıra sabit değildir. Ürüne göre (ör. Isıcam gerektiren parça, laminasyon, özel kenar işlemleri) Production Engine karar verir; rota dinamik olarak belirlenir.

### 3. Station Engine

Her istasyonun kendine ait operasyon kuralları ve durumu vardır. Station Engine, istasyon bazlı kuralları yöneten alt-motordur.

Örnek istasyonlar ve özellikleri:

- **Kesim:** Partilerin batch olarak alındığı, kesim parametrelerinin uygulandığı, parça başına etiket basımı ve kalite kontrolden önce ölçü kontrolü yapılan istasyon.
- **Rodaj (Grinding):** Kenar işleme kuralları, tolerans kontrolleri ve yüzey kalite değerlendirmesi.
- **Yıkama:** Yüzey temizliği, kurutma ve hasar tespiti; bazı hatalarda parça otomatik olarak exception kuyruğuna düşer.
- **Temper:** Temper fırınına giriş/çıkış zamanları, parti güvenliği ve termal süreç izleme.
- **Basım / Etiketleme:** Müşteri etiketleri veya iç üretim etiketleri, POD ilişkileri.
- **Isıcam:** Isıcam üretimine özgü kurallar, gaz basıncı/süre parametreleri.
- **Sevkiyat:** Yükleme sırası, araç kapasitesi ve POD doğrulaması.

Her istasyon sadece "başladı / bitti" değil; istasyon içi alt durumlar, retry kuralları, malzeme toleransları ve otomatik exception tetikleyicileri olabilir. Station Engine, bu kuralları ve retry/exceptions mantığını uygular.

### 4. Exception Management

Üretim ile problemli üretim (exception) kesin çizgiyle ayrılmalıdır. Exception Management, üretimdeki sapmaları, kırıkları ve eksikleri izleyen, kayıt altına alan ve yeniden üretim akışına bağlayan sistemdir.

Örnek senaryo:

Öztok Yapı — 450x1800 — 4 adet

Kesimde parçalardan 1 adet kırıldı.

İşlem:

- Operatör "Kırık / Eksik Tanımla" butonunu kullanır.
- Operatör ilgili sipariş satırını seçer ve eksik adeti girer.
- Sistem siparişi "eksik" durumuna geçirir; eksik adetin yeniden üretimi için bir remake kaydı oluşturulur.
- Remake kaydı Fire Havuzu ve Remake kuyruğuna eklenir; Production Engine yeniden planlama yapar.

Exception Management gereksinimleri:

- Operatör kolay arayüz ile hata/gözlem bildirebilmeli.
- Eksikler bir havuzda toplanmalı ve önceliklendirilerek yeniden üretim planına eklenmeli.
- Audit log tüm exception olaylarını saklamalı; geri dönüşümlü silme yasaklanmalı.

### 5. Fire Management

Fire (atık) müşteri değil, fabrikanın maliyetidir. Bu yüzden Fire ayrı bir domain olarak modellenmelidir.

Temel kavramlar:

- **Fire Havuzu:** Fabrika bazlı kayıtların tutulduğu merkezi havuz; müşteriye ait olmayan, fabrika maliyet hesabına giren kayıtlar burada saklanır.
- **Remake (Tekrar Üretim):** Fire sonucu açılan yeniden üretim kaydı; tamamlandığında ilgili sipariş kalemine bağlanır ve fire maliyeti siparişe yansıtılmaz (fabrika maliyeti olarak tutulur).
- **Fire Maliyeti:** Fire ile ilişkili maliyetler (malzeme, işçilik, enerji). Fire kayıtları maliyet analizi için ayrıntılı tutulur.
- **Fire Analizi:** Trend analizi, en çok fire çıkaran istasyonlar, ürün tipleri, vardiya bazlı heatmap.
- **Eksik Sipariş Havuzu:** Eksik adet/sayısal sapmaların tutulduğu yapı; remake işlemleri bu havuzdan tüketilir.
- **Dağıt / Birleştir Mantığı:** Aynı ölçüdeki fire'lar stoktan eşleştirilip tamamlanan siparişlere yönlendirilebilir (ofis onayı ile).

Kurallar:

- Fire kayıtları müşteriye değil fabrikanın Fire Havuzu'na ait olmalıdır.
- Remake tamamlandığında ilgili sipariş kalemine tekrar bağlanmalı.
- Fire geçmişi hiçbir zaman silinmemelidir; yalnızca arşivlenebilir.

### 6. Order Item Lifecycle

GlassOS, her cama fiziksel bir kalıcı ID atamak yerine, Order Item yaşam döngüsünü takip etmeyi önerir. Böylece milyonlarca gereksiz fiziksel kayıt yerine anlamlı üretim olayları izlenir.

Örnek yaşam döngüsü:

450x1800 — 4 adet (Order Item)

- Kesildi: 4 üretim kaydı başlatıldı (üretim eventleri)
- Üretim sırasında 1 kırıldı → Fire Havuzu'na eklendi
- Remake yapılacak → Remake kaydı üretim kuyruğuna alındı
- Tamamlandı: 4 parça tamamlandı, sipariş durumu güncellendi

Avantajları:

- Veri hacmi azaltılır; yalnızca anlamlı olaylar tutulur.
- Fire ve remake ilişkileri kolayca takip edilir.
- Analytics ve maliyetlendirme daha doğru sonuç verir.

### 7. Production Event Model

GlassOS'ın çekirdek veri akışı olay (event) bazlıdır. Her önemli durum değişikliği bir event üretir; event zinciri domainleri birbirine bağlar.

Örnek olay zinciri:

- Kırıldı (istasyon) → Fire oluştu → Ofis bilgilendirildi → Eksik sipariş oluşturuldu → Dashboard güncellendi → Fire maliyeti güncellendi → Tekrar üretim kuyruğuna alındı

Event model gereksinimleri:

- Her event immutable olmalı ve audit log'a yazılmalı.
- Event-driven workerlar (background jobs) olayları tüketip gereken işlemleri tetikleyecek (remake oluşturma, bildirim, raportlama).
- Eventler RLS ve tenant context ile ilişkilendirilmeli — yani event tüketirken doğru tenant session'ı kullanılmalı.

---

## Kapanış — Doküman Güncellemesi

Eklendi:

- Production Domain Model
- Production Engine
- Station Engine
- Exception Management
- Fire Management
- Order Item Lifecycle
- Production Event Model

Güncellenen başlıklar:

- Business Domain Architecture eklendi ve mevcut teknik mimari bölümleriyle uyumlu hale getirildi.

Not: Bu görev kapsamında hiçbir kod, migration veya refactor yapılmadı; sadece `DATABASE_ARCHITECTURE.md` içeriği genişletildi.

---

## 17. PostgreSQL Row Level Security (RLS)

**Sprint:** 2.6.4
**Migration:** `0003_enable_rls.sql`
**Durum:** ✅ Aktif — 52 tabloda RLS koruması

### 17.1. Mimari Kararlar

| Karar                   | Seçim                         | Gerekçe                                                                             |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Session variable        | `app.current_tenant_id`       | `app.current_user_role` kullanılmaz — tenant izolasyonu tenant ID üzerinden yapılır |
| Politika kapsamı        | `FOR ALL`                     | Tek politika ile SELECT/INSERT/UPDATE/DELETE — bakım kolaylığı                      |
| Subquery vs denormalize | EXISTS subquery               | Veri bütünlüğü — tenant_id tek bir yerde (parent tablo)                             |
| Application rolü        | `glassos_app` (`NOBYPASSRLS`) | RLS zorunlu — bypass mümkün değil                                                   |
| Migration rolü          | `glassos_owner`               | RLS'den muaf — migrationlar engellenmeden çalışır                                   |

### 17.2. Politika Desenleri

#### Desen 1: Direct tenant_id (23 tablo)

```sql
CREATE POLICY tenant_isolation_{table} ON {table}
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::char(26)
  );
```

Kullanılan tablolar: `factories`, `users`, `personnel_titles`, `personnel`, `customers`, `machines`, `stations`, `materials`, `products`, `product_categories`, `recipes`, `inventory_locations`, `inventory_items`, `orders`, `production_orders`, `production_events`, `cutting_results`, `production_operations`, `production_queues`, `rework_orders`, `fire_inventory_items`, `factory_configurations`, `audit_logs`

#### Desen 2: EXISTS Subquery — Owned Objects (26 tablo)

```sql
CREATE POLICY tenant_isolation_{child} ON {child}
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM {parent}
      WHERE {parent}.id = {child}.{parent_id}
      AND {parent}.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );
```

Bu desen, child tabloda tenant_id olmadığında parent-child ilişkisi üzerinden tenant izolasyonu sağlar. Örnek: `emergency_contacts` → `personnel` → `tenant_id`.

#### Desen 3: EXISTS Subquery — Factory-Scoped (3 tablo)

```sql
CREATE POLICY tenant_isolation_{table} ON {table}
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = {table}.factory_id
      AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );
```

Kullanılan tablolar: `grinding_profiles`, `trim_profiles`, `remnant_thresholds`

### 17.3. Session Context Propagation

```
withTenantSession(tenantId)
  → sql.begin(tx)                          -- transaction başlat
  → set_config('app.current_tenant_id', tenantId, true)  -- LOCAL scope
  → drizzle(tx) → ALS                      -- Drizzle wrapper
  → repository.getDb() → ALS → tx          -- tüm sorgular aynı transaction'da
  → tx.commit                              -- tenant context otomatik temizlenir
```

RLS politikaları `current_setting('app.current_tenant_id', true)` ile bu değeri okur. Transaction sonunda `SET LOCAL` otomatik temizlenir.

### 17.4. Kapsam

| Tablo Grubu                      | Adet   | RLS              |
| -------------------------------- | ------ | ---------------- |
| Tenant-scoped (direct tenant_id) | 23     | ✅               |
| Tenant-scoped (owned via parent) | 26     | ✅               |
| Tenant-scoped (factory-scoped)   | 3      | ✅               |
| Global (shared)                  | 5      | ❌               |
| **Toplam**                       | **57** | **52 protected** |

### 17.5. Test Kapsamı

- **16 test** `test/rls.test.ts` içinde:
  - Migration dosyası validasyonu (7 test)
  - Schema kapsamı doğrulama (3 test)
  - Politika doğruluğu (4 test)
  - Entegrasyon prosedürü (1 test)
  - withTenantSession uyumu (1 test)
- **Manuel doğrulama** için real DB test prosedürü dokümante edildi.
