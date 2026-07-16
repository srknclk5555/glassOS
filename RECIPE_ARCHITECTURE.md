# RECIPE_ARCHITECTURE

## Durum

- Mimari Durumu: Uygulandı
- Uygulama Durumu: Uygulandı
- Doğrulama Durumu: Geçti
- Son Güncelleme: 2026-07-16

## 1. Recipe Felsefesi

Recipe domain’i üretimin nasıl yapıldığını tanımlayan bilgi katmanıdır. Bu sprintte amaç yalnızca “bir finished product için teorik olarak hangi malzemeler tüketilir?” sorusunu tanımlamaktır.

Bu sprintte Recipe şunları yapmaz:

- üretim rotasını tanımlamaz
- istasyon veya makine tanımı yapmaz
- üretim kuyruğu sırası oluşturmaz
- stok düşüşü yapmaz
- gerçek üretim hesaplaması yapmaz

Bu sorumluluklar sırasıyla şu modüllere aittir:

- Production Queue: üretimin ne zaman gerçekleşeceğini tanımlar
- Stations: üretimin nerede gerçekleşeceğini tanımlar
- Machines: hangi ekipmanın üretimi gerçekleştireceğini tanımlar
- Production Calculation Engine: gerçek tüketim ve fire/trim/remnant hesaplarını tanımlar
- Inventory Engine: stok hareketlerini tanımlar

## 2. Ürün Reçetesi

Her bitmiş ürün için bir recipe saklanır. Örnek ürünler:

- 4 mm Float +12+4 mm Float
- 4 mm Low-E +12+4 mm Float
- Tempered Glass
- Tempered IGU
- Laminated Glass

## 3. Malzeme Tanımları

Recipe içinde malzeme tanımları tutulur.

Örnek:

- 1 m² ürün
- 1 m² Float
- 1 m² Float

Bunlar yalnızca tanım bilgisi olarak saklanır; inventory consumption mantığı bu sprintte uygulanmaz.

## 4. Operasyon Sırası

Recipe içinde operasyonlar sıralı şekilde saklanır.

Örnek operasyonlar:

- Cutting
- Grinding
- Tempering
- Washing
- Insulating Glass
- Quality
- Dispatch

## 5. Operasyon Kuralları

Recipe’in üretim bilgisini zenginleştiren kurallar saklanır.

Örnek kurallar:

- Grinding Required
- Tempering Required
- Low-E Orientation
- Drilling Required
- CNC Required
- Lamination Required

## 6. Kapasite Kuralları

Kapasite kuralı yalnızca bilgi olarak saklanır.

Örnek:

- Tempering operasyonu için kapasite çarpanı = 2

## 7. Tüketim Kuralları

Üretim tüketim tanımları saklanır; ancak bu sprintte inventory mantığı uygulanmaz.

Örnek:

- 1 m² bitmiş ürün için 2 m² Float

## 8. Validation Yapısı

Recipe’in bütünlüğü için validation kayıtları saklanabilir.

Örnek doğrulama türleri:

- Missing material
- Missing operation
- Invalid operation order
- Duplicate operation

## 9. Gelecek Uyumluluk

Bu sprintte aşağıdaki alanlar için altyapı hazırlanmıştır:

- Future Inventory integration
- Future Cost integration
- Future Routing integration
- Future Capacity planning

## 10. Persistence Readiness Review (Sprint 2.3.20)

Recipe domaini, persistence katmanına hazırlanırken aşağıdaki temel yapı ile ele alınmalıdır:

- Expected database entity: recipes
- Primary identifier: recipeId
- Future foreign-key references: productId, recipeVersionId, materialId, operationId
- Aggregate ownership: Recipe aggregate belongs to Recipe domain
- Expected repository: recipeRepository
- Expected API resource: /recipes
- Expected service ownership: RecipeManagementEngine / recipe service
