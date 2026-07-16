# PRODUCTION_FLOW_ARCHITECTURE

## Status

- Architecture Status: Implemented
- Implementation Status: Documented
- Validation Status: N/A
- Last Updated: 2026-07-16

## 1. Purpose

`PRODUCTION_FLOW_ARCHITECTURE.md` is the single source of truth for GlassOS production routing. It defines how products map to recipes, how recipes map to operations, how operations map to stations, how stations map to queues and machines, how personnel interact with the flow, and how completion is determined.

This document is authoritative for:

- production routing
- operation sequence rules
- queue semantics
- personnel assignment in flow
- machine capacity and occupancy assumptions
- recipe consumption versus customer dimensions
- rework, broken glass, and factory loss behavior

## 2. End-to-end Production Flow

### 2.1. Product → Recipe → Operations → Stations → Queues → Machines → Personnel → Completion

1. **Product**
   - GlassOS ürün kartı, nihai cam ürününün tanımıdır.
   - Ürün, hangi reçeteyle üretileceğini belirtir.
   - Ürün kartı son kullanıcı, sipariş, etiket ve raporlarda görünür.

2. **Recipe**
   - Reçete, ürünün üretim malzemelerini ve operasyon dizisini tanımlar.
   - Reçete, hangi hammaddelerin kullanılacağını ve hangi opsiyonel işlemlerin gerekli olduğunu belirtir.
   - Reçete, üretim akışının temel kural kümesidir.

3. **Operations**
   - Operasyon, tek bir üretim adımını temsil eder.
   - Operasyonlar, `CUTTING`, `GRINDING`, `TEMPERING`, `LAMINATING`, `INSULATING_GLASS`, `QUALITY_CONTROL`, `PACKAGING`, `DISPATCH` gibi soyut adımlardır.
   - Her operasyonun bir veya birden fazla istasyon ile eşleşmesi mümkündür.

4. **Stations**
   - İstasyonlar, fiziki veya mantıksal üretim noktalarıdır.
   - Her istasyon, bir veya daha fazla makineye sahip olabilir.
   - İstasyonlar, aynı zamanda üretim operatörlerinin hangi ekran ve hangi kuyruklara erişebileceğini belirler.

5. **Queues**
   - Her operasyonun kendi bekleyen iş kuyruğu vardır.
   - Kuyruklar, sadece o operasyon için hazır olan parçaları gösterir.
   - Bir iş kuyruktan alındıktan sonra operatör tarafından işlendiğinde tamamlandığında bir sonraki operasyon kuyruğuna aktarılır.

6. **Machines**
   - Makine, istasyon bazında atanmış gerçek ekipmandır.
   - Bir makine kapasite, batch limit, mantıksal tür ve durum bilgisi taşır.
   - Makine uygunluğu, planlama ve bottleneck hesaplamasında kritik rol oynar.

7. **Personnel**
   - Personel, istasyon bazlı yetkilere ve makine atamalarına sahiptir.
   - Personel aynı zamanda belirli bir vardiyada çalışır.
   - Personelin üretim sorumluluğu, yetki, makine ataması ve vardiya kesişimi ile oluşur.

8. **Completion**
   - Sipariş kalemi ancak tüm reçeteye bağlı zorunlu operasyonlar tamamlandığında üretimi tamamlanmış sayılır.
   - Siparişler, içindeki tüm sipariş kalemlerinin sayaçları ve tüm gerekli operasyonlar tamamlandığında `Completed` olur.
   - Operatörler siparişi tamamlamaz; onlar operasyonu tamamlar.

## 3. Mandatory Operation Rules

### 3.1. Rule 1 — Grinding Before Tempering

- Her temperlenmiş cam parça `GRINDING` operasyonundan geçmek zorundadır.
- Zincir şudur:

```
Cutting
↓
Grinding
↓
Tempering
```

- `Cutting → Tempering` **ASLA** izin verilen bir rota değildir.
- Bu kural hem Tempered Glass hem de Tempered Insulating Glass için bağlayıcıdır.

### 3.2. Rule 2 — Tempered Insulating Glass is Two Glasses

- Tempered insulating glass, iki bağımsız temperlenmiş cam tabakasından oluşur.
- Furnace workload hesabı, müşteri alanının iki katıdır.

```
Temper furnace workload = 2 × customer glass area
```

- `Customer Area` ve `Temper Furnace Area` kesinlikle aynı değildir.
- Customer Area, müşteri için gösterilen Business Dimension alanıdır.
- Furnace Area, temper fırınındaki gerçek üretim yükünü hesaplamak için kullanılır.

### 3.3. Rule 3 — Business vs Production Dimension

- **Business Dimension** her zaman gösterilir.
- **Production Dimension** yalnızca iç hesaplama içindir.

Kural:

- İşletme, saha ve müşteri ekranları müşteri ölçüsünü gösterir.
- Operatör hiçbir zaman rodaj eklenmiş veya üretim ölçüsünü görmez.
- Kesim planı, stok tüketimi ve maliyet hesapları Production Dimension üzerinden yürür.

## 4. Optional Operations

Aşağıdaki işlemler reçeteye bağlı olarak opsiyoneldir:

- `DRILLING`
- `EDGING`
- `PRINTING`
- `WASHING`
- `LAMINATING`
- `COATING`
- `GLUE_APPLICATION`
- `PACKAGING`
- `SPECIAL_INSPECTION`

Opsiyonel operasyonlar, recipe tarafından tanımlanır ve hangi station/queue dizisi gerektiğini belirler.

Example:

- Bir ürün sadece `CUTTING → QUALITY_CONTROL → PACKAGING` rotası alabilir.
- Bir başka ürün `CUTTING → DRILLING → GRINDING → TEMPERING → QUALITY_CONTROL` rotası alabilir.

## 5. Dynamic Routing Philosophy

GlassOS üretim rotasını statik bir akış olarak değil, dinamik bir karar zinciri olarak ele alır.

- Route seçimi ürünün reçetesine bağlıdır.
- Aynı ürün farklı fabrikada farklı route alabilir; bu, Factory Configuration ve makine envanterine göre belirlenir.
- Route kararına aşağıdaki faktörler etki eder:
  - ürün tipi ve reçete özellikleri
  - işin temper gereksinimi
  - işin lamination / insulating glass gereksinimi
  - optional operations
  - mevcut üretim kapasitesi ve machine availability
  - station / machine durumları

Dynamic routing, tek bir üründen birden fazla üretim varyantına izin verir. Örnek:

- `8 mm Tempered` için rota her zaman `CUTTING → GRINDING → TEMPERING → QUALITY_CONTROL`
- `4+12+4 Insulating` için rota `CUTTING → WASHING → INSULATING_GLASS → QUALITY_CONTROL`
- `Low-E Insulating` için rota reçetede temper veya coating gereksinimine göre değişebilir.

## 6. Product Flow Matrix

| Product Family            | Typical Route                                                                    | Notes                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Float Glass               | `CUTTING → QUALITY_CONTROL → DISPATCH`                                           | Temiz, düz float camlar için en kısa rota.                                                                               |
| Tempered Glass            | `CUTTING → GRINDING → TEMPERING → QUALITY_CONTROL → DISPATCH`                    | Her temper camda Grinding zorunludur.                                                                                    |
| Laminated Glass           | `CUTTING → QUALITY_CONTROL → LAMINATING → QUALITY_CONTROL → DISPATCH`            | Temperlenmiş tabaka gerekmez; reçeteye göre rodaj ve temper opsiyoneldir.                                                |
| Insulating Glass          | `CUTTING → WASHING → INSULATING_GLASS → QUALITY_CONTROL → DISPATCH`              | Düşük-E, spacer ve sealing opsiyonları reçetede tanımlanır.                                                              |
| Tempered Insulating Glass | `CUTTING → GRINDING → TEMPERING → INSULATING_GLASS → QUALITY_CONTROL → DISPATCH` | İki bağımsız temper tabakası nedeniyle furnace workload = 2 × customer area.                                             |
| Low-E Insulating Glass    | `CUTTING → WASHING → INSULATING_GLASS → QUALITY_CONTROL → DISPATCH`              | Eğer spektral kaplama tembel değilse, rota aynı olabilir. Temper gereken varyantlar için `GRINDING → TEMPERING` eklenir. |
| Frosted Bathroom Glass    | `CUTTING → GRINDING → SURFACE_FINISH → QUALITY_CONTROL → DISPATCH`               | Mat yüzey işlem fazı opsiyoneldir; temper varyantına göre `TEMPERING` eklenir.                                           |
| Future Product Families   | `CUTTING → [optional ops] → [special stations] → QUALITY_CONTROL → DISPATCH`     | Yeni ürün aileleri, mevcut operation/station modeline yeni opsiyonel adımlar ekleyerek desteklenir.                      |

## 7. Production Queue Architecture

This document is the source of truth for routing and flow, while queue architecture remains the way that operation-level work is staged.

### 7.1. Queue Philosophy

- Operasyon bazlı production queue, sipariş bazlı değil parça bazlı ilerler.
- Her operasyonun kendi kuyruğu vardır.
- Bir sipariş kaleminin son operasyonu tamamlanmadan sipariş tamamlanmaz.

### 7.2. Operator Workflow

1. Operatör önce ham madde seçer.
   - Örnek: `8 mm Grey Float`
2. Sistem yalnızca seçilen malzemeye uygun bekleyen işleri listeler.
3. Operatör barkod taramasına başlar.
4. İşler kesim sepetine eklenir.
5. Operatör `Used Sheet Count` değerini girer.
6. Kesim başlar.
7. Kesim tamamlandığında tamamlanmış sipariş kalemleri/iş öğeleri bir sonraki operasyona geçer.

### 7.3. Queue Semantics

- `READY` durumundaki öğeler, ilgili operasyonda işlenmeye hazırdır.
- `IN_PROGRESS` durumundaki öğeler, sahada makine veya operatör tarafından işlenmektedir.
- `COMPLETED` durumundaki öğeler bir sonraki operasyon kuyruğuna aktarılır.
- Sipariş `Completed` olmadan önce bütün parçalar ilgili tüm operasyonlardan geçmiş olmalıdır.

## 8. Personnel Architecture

Personel akışta şu şekilde pozisyonlandırılır:

```
Personnel
↓
Station Permission
↓
Machine Assignment
↓
Shift
↓
Production Responsibility
```

- **Personnel:** çalışan kimliği ve yetkinlikleri.
- **Station Permission:** hangi istasyon ekranlarına erişebildiği.
- **Machine Assignment:** hangi makinelere atandığı.
- **Shift:** hangi zaman diliminde çalıştığı.
- **Production Responsibility:** o vardiyada ve atandığı makinelerde hangi işleri yürütebileceği.

Bu ilişki, sahadaki yönetişim ve iş akışı doğruluğunu sağlar. Bir operatör, sadece hem yetkili olduğu hem de atanmış olduğu makine/istasyon kombinasyonunda çalışabilir.

## 9. Machine Architecture

### 9.1. Capacity Modeling

Her makine aşağıdaki kapasite değerleriyle modellenir:

- saatlik alan kapasitesi (m²/h)
- batch/parti limitleri
- minimum çalışma süresi
- kurulum ve temizleme zamanı

Makine kapasitesi planlama ve route seçimi için temel veridir.

### 9.2. Bottleneck Philosophy

- Üretim hattının darboğazı, en yavaş veya en yüksek yüklenen istasyondur.
- Bottleneck, hem istasyon bazlı hem de makine bazlı hesaplanabilir.
- Planlama, bottleneck makinelerin kullanılabilirliğini ve bakım durumunu göz önünde bulundurarak yapılmalıdır.

### 9.3. Furnace Area Calculation

Temper fırını yükü `customer glass area` ile değil, gerçek olarak üretilen cam alanı ile hesaplanır.

- Tam temperlenmiş tek cam için fırın alanı = customer area.
- `Tempered Insulating Glass` için fırın alanı = `2 × customer area`.

Bu hesaplamada `Business Dimension` değil, gerçek üretim alanı dikkate alınır.

### 9.4. Machine Occupancy

- Bir makine, aynı anda sadece belirlenmiş bir batch veya parça setini taşır.
- Occupancy, planlama ve gerçek zamanlı iş akışı takibi için izlenmelidir.
- Makine kullanım oranı, `scheduled` vs. `actual` çalışma süresi üzerinden hesaplanır.

### 9.5. Multiple Machines per Station

- Her istasyona bir veya daha fazla makine atanabilir.
- Bu yapı, üretim esnekliğini artırır ve yedeklilik sağlar.
- Route engine, aynı istasyonun birden fazla makinesi arasında seçim yapabilir.

## 10. Recipe Architecture

### 10.1. Recipe Defines Material Consumption

Recipe, müşteri ölçüsünü değil, kullanılacak malzemeyi belirler.

- `4 mm Float + 12 + 4 mm Float` tüketir:
  - 2 m² Float cam
- `4 mm Low-E + 12 + 4 mm Float` tüketir:
  - 1 m² Low-E
  - 1 m² Float cam

Bu örnekler, recipe'nin üretim malzemesi hesabını nasıl belirlediğini açıklar. Business Dimension sadece sipariş ölçüsüdür; recipe tüketim modelini tanımlar.

### 10.2. Real Production Examples

- **4 mm Float + 12 + 4 mm Float**
  - Ürün: normal ısıcam
  - Tüketim: 2 m² Float
  - Tipik rota: `CUTTING → QUALITY_CONTROL → LAMINATING → QUALITY_CONTROL → DISPATCH`

- **4 mm Low-E + 12 + 4 mm Float**
  - Ürün: Low-E ısıcam
  - Tüketim: 1 m² Low-E + 1 m² Float
  - Tipik rota: `CUTTING → WASHING → INSULATING_GLASS → QUALITY_CONTROL → DISPATCH`

Recipe, malzeme tüketimini ve hangi operasyonların zorunlu/opsiyonel olduğunu belirler.

## 11. Rework Architecture

- Kırık cam artık müşteriye ait değildir.
- Kırık cam factory loss olarak sınıflandırılır.
- Kırık cam factory scrap inventory'ye aktarılır.
- Bu kayıt, maliyet analizinde kullanılır.

Broken glass is a factory cost center, not an order asset. Rework may use reusable fragments later, but the broken piece itself remains a loss event.

## 12. Future Extensibility

Production routing is built for extension:

- Yeni ürün aileleri, yeni `recipe` tanımlarıyla eklenir.
- Yeni operasyonlar `operation` listesine eklenebilir.
- Yeni istasyonlar ve makineler `station`/`machine` modeline eklenebilir.
- Route kararları, iş kuralı motoru ve factory configuration ile zenginleştirilebilir.
- Future product variants such as `bent glass`, `printed glass`, `solar control glass`, `double-curved laminated`, and `smart glass` are supported by recipe-driven route templates.

---

## 13. Related Documents

- `PRODUCTION_ARCHITECTURE.md` — Production domain and station architecture.
- `PRODUCTION_QUEUE_ARCHITECTURE.md` — Queue-focused execution architecture.
- `PRODUCT_ARCHITECTURE.md` — Product and recipe modeling.
- `PRODUCTION_CALCULATION_ENGINE.md` — Production dimension, consumption and loss calculation rules.
- `REWORK_ARCHITECTURE.md` — Rework and scrap handling.
- `PERSONNEL_ARCHITECTURE.md` — Personnel/permission assignment.
- `MACHINE_MANAGEMENT_ARCHITECTURE.md` — Machine asset and capacity architecture.
