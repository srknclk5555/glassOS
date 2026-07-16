# DECISIONS (ADR)

## ADR-2026-07-14-01: Customer model and tenant scope

- Status: Accepted
- Date: 2026-07-14
- Context: Sprint 2 requires managing customers (cari) for production and delivery operations without turning GlassOS into an ERP. Customers must be tenant-scoped and accessible only by users of the same tenant unless super_admin.
- Decision: Introduce `customers`, `customer_contacts`, and `delivery_points` tables. Each table includes `tenantId` (or references customer's tenant via `customerId`) and adheres to existing RLS policies.
- Consequences:
  - Customer, contact and delivery point data are fully tenant-isolated at DB level via RLS.
  - No accounting fields (balances, invoices, prices) are stored — consistent with product principles.
  - Audit logs will include `customerId` to trace customer-related operations.

## ADR-2026-07-14-02: Extend RLS for customer resources

- Status: Accepted
- Date: 2026-07-14
- Context: RLS already protects tenants, factories and settings. New customer-related tables must not break tenant isolation.
- Decision: Add RLS policies for `customers`, `customer_contacts`, and `delivery_points` mirroring tenant isolation logic (super_admin bypass + tenant_id match or linked factory tenant check where applicable).
- Consequences:
  - DB enforces tenant isolation for all customer resources.
  - Application-level checks remain in place (server actions verify session and tenant where needed) as defense-in-depth.

## ADR-2026-07-14-03: Ensure RLS session variables are set per-request in server actions

- Status: Accepted
- Date: 2026-07-14
- Context: RLS policies rely on PostgreSQL session settings (`app.current_tenant_id`, `app.current_user_role`) to apply tenant isolation. To ensure DB-level enforcement, application must set these session variables on the same DB connection/transaction used for queries.
- Decision: Add a small transactional helper `withTenantSession(session, cb)` that performs `set_config('app.current_tenant_id', ..., true)` and `set_config('app.current_user_role', ..., true)` inside the transaction, then runs `cb(tx)` using the transactional client. All server actions that perform DB writes/reads will execute inside this helper.
- Consequences:
  - RLS policies now observe tenant+role context reliably because `SET LOCAL` is performed in the transaction that runs the queries.
  - Minimal, centralized code change (helper + wrapping server actions) reduces duplication and risk.
  - Migration RLS variable names are used verbatim: `app.current_tenant_id`, `app.current_user_role`.

---

## ADR-2026-07-15-01: Business Dimension ≠ Production Dimension

- Status: Accepted
- Date: 2026-07-15
- Context: Müşteri ölçüsü (Business Dimension) ile üretimde kesilmesi gereken ölçü (Production Dimension) farklıdır. Rodaj payı eklenmiş ölçüyü sistemin geneline yaymak, operatör ekranlarında, etiketlerde ve müşteri portalında yanlış ölçü gösterimine yol açar.
- Decision: GlassOS iki ayrı boyut kullanır. Business Dimension yalnızca bir kez girilir ve sistemin tüm görünür katmanlarında (saha, etiket, müşteri, rapor) değişmeden kullanılır. Production Dimension yalnızca Cutting Engine ve Cost Engine içinde hesaplanır; hiçbir zaman kullanıcıya gösterilmez.
- Consequences:
  - Tüm sipariş, saha, etiket ve müşteri ekranları müşteri ölçüsünü gösterir.
  - Rodaj eklenmiş ölçü yalnızca cutting plan ve maliyet hesabının iç verisidir.
  - Bu ayrım schema tasarımında `order_lines` tablosunun Business Dimension'ı, `cutting_engine` çıktısının Production Dimension'ı tutmasıyla somutlaşır.

## ADR-2026-07-15-02: Trim, Factory Configuration'dır — Sipariş veya Cam Bazında Değildir

- Status: Accepted
- Date: 2026-07-15
- Context: Trim (plaka kenar kaybı) bazı sistemlerde sipariş bazına veya her cama uygulanır. Bu yanlış bir modeldir. Trim, float cam plakasının dış kenarlarından alınan zorunlu kayıptır ve yalnızca Full Sheet'e uygulanır.
- Decision: Trim yalnızca Full Sheet üzerinde uygulanır. Her kenar için bağımsız parametre tanımlanır (`trim_left_mm`, `trim_right_mm`, `trim_top_mm`, `trim_bottom_mm`). Bu değerler Factory Configuration'da tutulur. Optimizasyon motoru, trim sonrası küçülen Usable Area üzerinde çalışır. Sipariş ölçüsü ve Production Dimension trim'den etkilenmez.
- Consequences:
  - Kullanılabilir plaka alanı gerçekçi hesaplanır; optimizasyon daha doğru sonuç verir.
  - Fabrikalar 2, 3 veya 4 kenar trim uygulayabilir; sistem her kombinasyonu destekler.
  - Trim Loss maliyeti plaka bazında hesaplanır ve siparişlere orantısal olarak dağıtılır.

## ADR-2026-07-15-03: Grinding, Factory Configuration'dır — Her Kenar Bağımsız Tanımlanır

- Status: Accepted
- Date: 2026-07-15
- Context: Rodaj payı bazı sistemlerde toplam değer (ör. "her yönden 2 mm") olarak girilir. Bu yaklaşım, makineye ve cam tipine göre farklılık gösteren kenar bazlı payları yönetmek için yetersizdir.
- Decision: Grinding payı her kenar için ayrı ayrı tanımlanır: `grinding_left_mm`, `grinding_right_mm`, `grinding_top_mm`, `grinding_bottom_mm`. Bu değerler Factory Configuration'da saklanır. Production Dimension, bu dört değer Business Dimension'a eklenerek hesaplanır. Toplam "X payı" veya "Y payı" gibi bileşik değerler hiçbir zaman girilmez; hesaplama aşamasında türetilir.
- Consequences:
  - Farklı kenar işlemleri (tek kenar, çift kenar, tüm kenarlar) doğru modellenebilir.
  - İleride makine bazlı Grinding profilleri tanımlanabilir (Bkz. Future Extensions).
  - Operatör yalnızca Business Dimension görür; Grinding hesabı motorun iç işidir.

## ADR-2026-07-15-04: Remnant Kararı Factory Configuration ile Verilir

- Status: Accepted
- Date: 2026-07-15
- Context: Kesim sonundaki artık parçaların hangisinin Dead Stock'a alınacağı, hangisinin hurda sayılacağı keyfi bir operatör kararına bırakılamaz. Fabrikalar farklı minimum ebat politikalarına sahiptir.
- Decision: Remnant / Scrap kararı üç eşikle Factory Configuration'da tanımlanır: `remnant_min_width_mm`, `remnant_min_height_mm`, `remnant_min_area_mm2`. Kesim sonrası her artık parça bu üç koşula bakılarak otomatik sınıflandırılır. Üç koşulu da sağlayan parça Remnant (Dead Stock havuzuna), sağlamayan Scrap (hurda) olarak işlenir.
- Consequences:
  - Sınıflandırma tutarlı ve fabrika politikasına uygun olur.
  - Remnant, Dead Stock havuzu üzerinden gelecek siparişlerle toleranslı eşleştirilir; fire kurtarımı sistematik hale gelir.
  - Scrap ağırlık hesabıyla hurda geliri maliyet raporuna dahil edilir.
  - Factory Configuration JSON modeli versioned ve gruplandırılmış olarak tutulacak; gelecekte yapısı değişirse migration/compatibility kolaylaşacak.

## ADR-2026-07-15-05: Fire Tek Tip Değildir — Kayıp Sınıflandırması Zorunludur

- Status: Accepted
- Date: 2026-07-15
- Context: Sektörde "fire" kavramı tüm atıkları tek bir kategoride toplamaktadır. Bu durum raporlama ve köken analizini imkânsız kılmaktadır.
- Decision: GlassOS sekiz farklı kayıp sınıfı tanımlar: Trim Loss, Grinding Loss, Optimization Loss, Scrap Loss, Production Loss, Quality Loss, Breakage Loss, Inventory Loss ve Remnant. Her sınıf farklı hesaplama mantığına, farklı maliyet etkisine ve farklı raporlama görünümüne sahiptir. Bu sınıflandırma PRODUCTION_CALCULATION_ENGINE.md'de tek referans olarak belgelenmiştir.
- Consequences:
  - Yönetici hangi kayıp türünün ne kadar maliyete yol açtığını ayrı ayrı görebilir.
  - Breakage Loss kırık kaynaklıdır ve Remake döngüsüyle bağlantılıdır.
  - Trim Loss plaka kaybıdır ve optimizasyon kalitesiyle ilişkilidir.
  - Her sınıf için ayrı aksiyon ve iyileştirme mekanizması kurulabilir.

## ADR-2026-07-15-06: Full Sheet Tüketimi Operatör Bildirimiyle Doğrulanır

- Status: Accepted
- Date: 2026-07-15
- Context: Teorik plaka tüketimi optimizasyon çıktısından hesaplanabilir. Ancak sahada kırıklar, makine fiziksel kısıtları ve optimizasyon sapmalarından dolayı fiili tüketim farklı olabilir. Gerçek maliyet ve fire hesabının temel girdisi fiili tüketimdir.
- Decision: Kesim operatörü her parti için kullandığı gerçek plaka sayısını sisteme bildirir. Bu değer Cutting Engine'in maliyet, waste ve inventory hesaplamalarının ana girdisi olur. Teorik plaka sayısı referans olarak saklanır; sapmalar Production Loss olarak raporlanır.
- Consequences:
  - Gerçek maliyet, gerçek tüketimden türetilir; tahmin üzerinden değil.
  - Teorik vs. gerçek sapma Production Loss metriğini oluşturur; OEE hesabına dahil edilir.
  - Operatör arayüzü bu bildirimi yapmak için kesim tamamlama adımına basit bir plaka sayısı girişi eklenmelidir (ileride implement edilecek).

---

## ADR-2026-07-15-07: Inventory Valuation Engine ayrı bir mimari katmandır

- Status: Accepted
- Date: 2026-07-15
- Context: Fiziksel üretim tüketimi ile bunun finansal değerlemesi aynı süreçte yürütüldüğünde raporlar karışmakta ve hatalı sonuçlar çıkmaktadır.
- Decision: Stok değerleme işlemleri (Inventory Valuation Engine), üretim hesaplama motorundan (Production Calculation Engine) tamamen ayrılmıştır. Tüketilen malzeme miktarını üretim motoru bulurken, bunun kaç paraya denk geldiğini değerleme motoru hesaplar.
- Consequences:
  - Üretim verimliliği raporları ile finansal stok değerleme raporları birbirinden bağımsız, kendi kurallarıyla çalışır.

## ADR-2026-07-15-08: Material kartı fiyat içermez

- Status: Accepted
- Date: 2026-07-15
- Context: Klasik ERP'lerde bir malzemenin (Material) sabit bir fiyatı bulunur. Ancak depoda farklı zamanlarda alınmış, farklı maliyetli aynı malzemeler bulunabilir.
- Decision: Material kartı sadece fiziksel özellikleri tutar. Fiyat (Cost) bilgisi, satın almalarla oluşan Inventory Lot katmanında tutulur.
- Consequences:
  - Fiyatlar zaman içinde değiştiğinde, Material kartı güncellenmez. Her yeni parti (Lot) kendi fiyatıyla yaşar.
  - Stok değerlemesi, kullanılan partiye veya seçilen muhasebe yöntemine göre değişkenlik gösterir.

## ADR-2026-07-15-09: Production Cost ile Accounting Cost birbirinden ayrıdır

- Status: Accepted
- Date: 2026-07-15
- Context: Fabrika sahasındaki gerçek malzeme tüketim maliyeti ile şirketin yasal zorunluluklar gereği (ör. FIFO, Ağırlıklı Ortalama) raporladığı stok düşüm maliyeti genellikle farklıdır.
- Decision: GlassOS, Production Cost ve Accounting Cost kavramlarını birbirinden ayırır. Production Cost sahadaki gerçek (veya güncel) fiyatlamayı baz alırken, Accounting Cost seçilen değerleme yöntemiyle hesaplanır. İki maliyet arasındaki fark raporlanabilir durumdadır.
- Consequences:
  - Kârlılık ve fiyatlandırma kararları Production Cost ile alınabilirken, yasal muhasebe (ERP) entegrasyonunda Accounting Cost kullanılır.

## ADR-2026-07-15-10: Specific Identification, GlassOS'un önerilen varsayılan değerleme yöntemidir

- Status: Accepted
- Date: 2026-07-15
- Context: GlassOS uzun vadede jumbo plakaları (ve diğer kritik malzemeleri) barkodlarla, lot bazında takip etmeyi planlamaktadır. Bu sayede üretimde hangi plakanın kullanıldığı kesin olarak bilinmektedir.
- Decision: Specific Identification (Gerçek Parti Maliyeti) yöntemi sistemin varsayılan stok değerleme yaklaşımıdır. Operatör hangi barkodlu plakayı okutursa, maliyet direkt olarak o plakanın depoya girdiği andaki (Lot) gerçek fiyatı üzerinden hesaplanır. FIFO veya Ortalama gibi varsayımsal hesaplamalara gerek kalmaz.
  - Üretim maliyetleri %100 kesinleşir.
  - Fabrikalar istedikleri takdirde Factory Configuration üzerinden FIFO veya farklı bir yöntem seçebilir.

---

## ADR-2026-07-15-11: Architecture Freeze

- Status: Accepted
- Date: 2026-07-15
- Context: Sprint 2.2 boyunca oluşturulan kimlik doğrulama, izolasyon, master data, üretim ve stok mimarisinin sürekli değiştirilmesi sistemin geliştirilmesini zorlaştırmaktadır.
- Decision: Sprint 2.2 kapsamında tamamlanan mimari kararlar artık "Architecture Baseline" olarak kabul edilir. Sprint 2.3 süresince; Authentication, Authorization, RBAC, RLS, Deployment Architecture, Production Architecture, Inventory Valuation Architecture ve Master Data Architecture üzerinde geriye dönük değişiklik yapılmayacaktır. Değişiklik gerekiyorsa yeni ADR oluşturulacaktır. Hiçbir AI mevcut mimariyi yeniden tasarlamaya çalışmamalıdır.
- Consequences:
  - Mimari dalgalanmalar önlenerek API ve servis katmanı geliştirmelerine odaklanılacaktır.

---

## ADR-2026-07-16-05: Mandatory Grinding Before Tempering

- Status: Accepted
- Date: 2026-07-16
- Context: Tempered glass production must enforce a fixed operation sequence to avoid quality issues and inconsistent furnace loading.
- Decision: All tempered glass routes must include `GRINDING` before `TEMPERING`. Direct transition `CUTTING → TEMPERING` is prohibited.
- Consequences:
  - Tempered glass production is standardized across factories.
  - Route validation rejects incorrect paths before production begins.
  - Quality and furnace load calculations remain consistent.

## ADR-2026-07-16-06: Temper Furnace Capacity Calculation

- Status: Accepted
- Date: 2026-07-16
- Context: Tempered insulating glass consists of two independent tempered glasses, so furnace workload is not equal to customer-facing area.
- Decision: Calculate temper furnace workload as `2 × customer glass area` for tempered insulating glass. Customer Area and Furnace Area are explicitly separate quantities.
- Consequences:
  - Furnace planning uses accurate load estimates.
  - Cost and scheduling calculations reflect real tempering effort.
  - Reporting distinguishes between customer-visible area and furnace area.

## ADR-2026-07-16-07: Material-Based Cutting Pool

- Status: Accepted
- Date: 2026-07-16
- Context: Cutting operators must only see compatible waiting jobs for the selected raw material to prevent material mix-ups and improve flow.
- Decision: Material-based cutting pool is mandatory. Operators select raw material first (e.g. `8 mm Grey Float`), and the system then lists only compatible cutting jobs.
- Consequences:
  - Cutting screens display only jobs that match the selected material.
  - Operator error is reduced by limiting visible work to compatible batches.
  - Used Sheet Count entry becomes the main operator input for cutting execution.

## ADR-2026-07-16-08: Production Flow Architecture

- Status: Accepted
- Date: 2026-07-16
- Context: Production routing documentation was previously fragmented across multiple architecture files.
- Decision: Introduce `PRODUCTION_FLOW_ARCHITECTURE.md` as the single source of truth for production routing, and update related documents to reference it.
- Consequences:
  - `PRODUCTION_FLOW_ARCHITECTURE.md` becomes the authoritative routing reference.
  - Other architecture docs focus on their respective domains and cross-reference the flow architecture.
  - Production-related business rules are consolidated and synchronized.

---

## ADR-2026-07-16-01: Operation-based Production Queue

- Status: Accepted
- Date: 2026-07-16
- Context: Production flow should be managed at the operation level, not by order completion. Each order line progresses through a sequence of operations and the system must route completed work to the next queue automatically.
- Decision: Introduce an operation queue model for production. Completed operations advance items into the next operation's waiting list. Orders are marked `Completed` only after all order lines and all assigned operations are finished.
- Consequences:
  - Office tracking can display operation-specific status for each order line.
  - Operators do not manually complete orders; they only complete operations.
  - Progress calculation becomes a function of completed operations versus total operations.

## ADR-2026-07-16-02: Personnel Permissions by Station

- Status: Accepted
- Date: 2026-07-16
- Context: Personel yetkileri ünvan bazlı değildir; sahadaki işleri sadece yetkili oldukları istasyon ve operasyonlarla sınırlanmalıdır.
- Decision: Personel için istasyon tabanlı permission modeli kullanılır. Her personel kartı hangi istasyonlarda çalışabileceğini belirten erişim yetkisi tanımlar. Ünvan, yetki tanımından ayrı kalır.
- Consequences:
  - Saha operatörü sadece kendi yetkili olduğu ekranları ve bekleyen operasyonları görür.
  - Yetkisiz operasyonlar sistem tarafından engellenir.
  - Bu model, ileride operatör bazlı kapasite, performans ve eğitim raporlaması için altyapı sağlar.

## ADR-2026-07-16-03: Machine Asset and Maintenance Mapping

- Status: Accepted
- Date: 2026-07-16
- Context: Üretim makineleri istasyonlardan bağımsız olarak yönetildiğinde, bakım ve uygunluk planlaması eksik kalır.
- Decision: Makine kartları işletim durumunu, bakım planlarını ve bağlı oldukları istasyonları içermelidir. Her istasyon bir veya daha fazla makineye eşlenebilir. Planlı bakım durumundaki makineler üretim kuyruğundan çıkarılmalıdır.
- Consequences:
  - Üretim planlaması yalnızca aktif ve bakıma ihtiyaç duymayan makineler üzerinden yapılır.
  - Makine yönetimi ve üretim istasyonu konfigürasyonu birbirinden ayrılır, böylece fabrika esnekliğe sahip olur.

## ADR-2026-07-16-04: Rework and Breakage Separation

- Status: Accepted
- Date: 2026-07-16
- Context: Rework ve kırılma işlemleri ana üretim akışından ayrıştırılmalı. Kırılan parçalar, tekrar işleme alınabilir öğeler olarak ayrı bir sürece girmelidir.
- Decision: Rework, kalite kontrol sonucunda ortaya çıkan özel bir iş akışıdır. Rework öğeleri ayrı bir iş emrine veya operasyon kuyruğuna alınır. Breakage, ayrı bir fire/kayıp kategorisi olarak izlenir.
- Consequences:
  - Rework süreçleri ana üretim hattından çıkarılır, böylece operasyon bazlı ilerleme doğru hesaplanır.
  - Kırılma kaydı ve fire sınıflandırması raporlanabilir hale gelir.
  - Rework maliyeti ve üretim kaybı analizleri ayrı tutulur.

## ADR-2026-07-16-09: Production Transfer

- Status: Accepted
- Date: 2026-07-16
- Context: Station flow is recommended for normal production, but manufacturing sometimes needs manual movement between stations for operational reasons.
- Decision: Production may be transferred between stations when the operator has permission. Transfers store current station, next station, reason, operator, date, and notes, and update both production status and current station.
- Consequences:
  - Station flow remains a recommended path, not a mandatory path.
  - Operational flexibility is preserved without losing traceability.
  - Transfer events can be audited as part of production history.

## ADR-2026-07-16-10: Production Counters per Order Line

- Status: Accepted
- Date: 2026-07-16
- Context: Production reporting should reflect order-line progress without overloading the operational view with per-piece detail.
- Decision: Production counters are maintained per Order Line, not per physical glass piece. Required counters are Requested Quantity, Completed Quantity, Missing Quantity, and Delivered Quantity.
- Consequences:
  - Operational screens stay focused on production progress rather than physical piece-level noise.
  - Breakage data remains in rework and quality history instead of confusing operators.
  - Order-line-level reporting is consistent for planning and recovery workflows.

## ADR-2026-07-16-11: Rework Order as Internal Production Order

- Status: Accepted
- Date: 2026-07-16
- Context: Rework is not a simple task; it is a recovery production path that must preserve lineage to the parent order and the breakage event.
- Decision: Rework is modeled as an Internal Production Order linked to a configurable internal customer such as Fire Depot, Scrap Depot, or Factory Loss.
- Consequences:
  - Rework remains traceable to parent production and breakage context.
  - Recovery flow can be treated as a separate but connected production order.
  - Internal customer configuration remains a flexible architectural boundary.

## ADR-2026-07-16-12: Cutting Rework Queue

- Status: Accepted
- Date: 2026-07-16
- Context: Rework and normal work both return to cutting and must be handled without mixing their routing semantics.
- Decision: A dedicated Cutting Rework Queue exists independently from the normal cutting queue. Operators may add normal orders, rework orders, or both into the same work queue.
- Consequences:
  - Rework and normal production can be handled in one operator workspace without losing queue separation.
  - Recovery work remains visible and independently trackable.
  - Queue semantics remain clear for production supervisors.

## ADR-2026-07-16-13: Production Merge on Rework Completion

- Status: Accepted
- Date: 2026-07-16
- Context: When rework completes, the result must return to the original production path instead of creating a parallel lifecycle.
- Decision: A completed rework order updates its parent order line by decreasing Missing Quantity and increasing Completed Quantity, then continues from the parent order's current waiting station and is archived as completed.
- Consequences:
  - Parent order progress remains accurate after recovery.
  - Rework does not create a competing production path.
  - Recovery is visible as a merge event into the original production lifecycle.

## ADR-2026-07-16-14: Fire Depot and Unified Production History

- Status: Accepted
- Date: 2026-07-16
- Context: Recovery workflows need a single place for broken, reusable, and scrap glass, and a unified history for production events.
- Decision: Fire Depot stores both reusable and scrap glass, reusable glass may later return to normal inventory, and production history captures transfers, breakages, rework, manual movements, and station changes in one unified timeline.
- Consequences:
  - Recovery and inventory handling remain aligned without overloading the operational queue view.
  - Fire Depot becomes a shared architectural concept for reuse and loss tracking.
  - Operators and supervisors can reconstruct production flow from one history record set.

## ADR-2026-07-16-15: Order-Line Counter Tracking Instead of Permanent GlassID

- Status: Accepted
- Date: 2026-07-16
- Context: The original GlassID concept implied a permanent physical-glass entity for every piece produced, which would increase database volume, complicate operator workflows, and make rework handling more cumbersome.
- Decision: Production tracking is now modeled at the Order Line level using counter-based state: Requested, Completed, Missing, Broken, and Delivered. Physical glass pieces are not treated as permanent database entities; rework is handled as a temporary internal production order that merges back into the parent order line.
- Consequences:
  - Database growth remains controlled because production history is recorded as counter and event data rather than per-piece entities.
  - Operator screens remain focused on production progress and recovery flow instead of noisy piece-level records.
  - Rework, breakage, and fire handling remain traceable while preserving the original order-line lifecycle.
