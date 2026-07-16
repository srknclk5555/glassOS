# INVENTORY_ARCHITECTURE

## Durum

- Mimari Durumu: Uygulandı
- Uygulama Durumu: Uygulandı
- Doğrulama Durumu: Geçti
- Son Güncelleme: 2026-07-16

## 1. Inventory Felsefesi

Inventory domain, GlassOS içinde “mevcut olanı” tanımlayan temel stok yapısıdır. Bu sprintte amaç yalnızca inventory objelerini tanımlamaktır.

Bu sprintte Inventory şunları yapmaz:

- inventory consumption yapmaz
- inventory valuation yapmaz
- cost engine entegrasyonu yapmaz
- warehouse transfer yapmaz
- purchasing yapmaz
- production consumption yapmaz

Bu sorumluluklar sırasıyla farklı katmanlara aittir:

- Recipe: hangi malzemelerin teorik olarak tüketileceğini tanımlar
- Production Calculation: hangi malzemelerin fiilen tüketildiğini tanımlar
- Inventory Consumption: hangi lotların tüketildiğini tanımlar
- Inventory Valuation: stokların mali olarak nasıl değerlenmesi gerektiğini tanımlar
- Cost Engine: üretimin gerçek maliyetini tanımlar

## 2. Inventory Card

Her inventory kartı şu alanları taşır:

- Inventory Code
- Name
- Description
- Category
- Type
- Unit
- Active / Passive
- Notes

## 3. Inventory Types

Desteklenen türler:

- RAW_MATERIAL
- SEMI_FINISHED
- FINISHED_PRODUCT
- TRADED_GOODS
- CONSUMABLE
- SPARE_PART
- PACKAGING
- SERVICE
- SCRAP
- REMNANT
- BY_PRODUCT

Gelecekte yeni türler desteklenebilir.

## 4. Inventory Units

Birden çok birim desteklenir.

Örnek birimler:

- Piece
- Square Meter
- Kilogram
- Meter
- Liter
- Box
- Package
- Roll

Bu sprintte dönüşüm hesabı yoktur; yalnızca birim hazırlığı vardır.

## 5. Inventory Locations

Depo/konum yapısı desteklenir.

Örnek konumlar:

- Main Warehouse
- Glass Warehouse
- Consumables
- Spare Parts
- Packaging
- Scrap Warehouse
- Remnant Warehouse
- Finished Goods

Transfer akışı bu sprintte uygulanmaz.

## 6. Lot Preparation

Lot modeli hazırdır.

Desteklenen alanlar:

- Lot Number
- Supplier Lot
- Production Lot
- Expiration Date
- Received Date
- Status

FIFO, valuation, lot consumption bu sprintte yoktur.

## 7. Barcode Preparation

Barcode modeli hazırdır.

Desteklenen alanlar:

- Internal Barcode
- Supplier Barcode
- QR Code placeholder
- Future RFID compatibility

Barcode workflow bu sprintte uygulanmaz.

## 8. Reservation Preparation

Reservation modeli hazırdır.

Desteklenen türler:

- Production reservation
- Sales reservation
- Transfer reservation

Reservation engine bu sprintte uygulanmaz.

## 9. Relationship Preparation

Aşağıdaki modüllerle uyumluluk hazırdır:

- Recipe Domain
- Production Queue
- Machine Management
- Personnel
- Factory Configuration
- Cost Engine
- Rework

## 10. Validation

Validation modelleri desteklenir.

Örnek doğrulamalar:

- Duplicate inventory code
- Inactive inventory
- Missing unit
- Invalid category
- Invalid type
- Duplicate barcode

## 11. Inventory Consumption Engine (Sprint 2.3.17)

Bu sprintte inventory consumption katmanı eklenmiştir. Bu katman yalnızca tüketim olayının kayıt altına alınmasını, ilgili satırların tutulmasını, neden/ilişki bağlarının tanımlanmasını ve temel doğrulama kurallarını kapsar.

## 12. Fire Inventory Relationship (Sprint 2.3.18)

Rework ve breakage management katmanı, fire inventory ile ilişkilidir. Kırık parçalar artık müşteri sahipliğinden çıkarak fabrika fire inventory sahipliğine geçer. Bu ilişki stok düşümü veya maliyet hesaplaması yapmaz; yalnızca üretim kaydı ve yeniden işleme akışı sağlar.

## 13. Fire Depot Philosophy (Sprint 2.3.21)

Sprint 2.3.21 kapsamında Fire Depot mantığı dokümante edilmiştir.

- Fire Depot, yeniden kullanılabilir glass ve scrap glass'i birlikte barındırır.
- Yeniden kullanılabilir glass, daha sonra normal inventory'ye geri dönebilir.
- Fire Depot, rework ve üretim recovery akışının merkezi birikim noktasıdır; stok değerleme veya muhasebe görünümü bu sprintte dokümante edilmemiştir.

## 14. Persistence Readiness Review (Sprint 2.3.20)

Inventory domaini, persistence katmanına hazırlanırken aşağıdaki temel yapı ile ele alınmalıdır:

- Expected database entity: inventory_items / inventory_lots / inventory_locations
- Primary identifier: inventoryId / lotId / locationId
- Future foreign-key references: categoryId, typeId, unitId, lotId, reservationId, consumptionId
- Aggregate ownership: Inventory aggregate belongs to Inventory domain
- Expected repository: inventoryRepository
- Expected API resource: /inventory
- Expected service ownership: InventoryManagementEngine / inventory service

### Sorumluluk Sınırları

- Tüketim kaydı oluşturur.
- Tüketim satırları ekler.
- Tüketim nedeni ve ilişkili referansları saklar.
- Tüketim doğrulama kurallarını üretir.

### Sorumluluk Sınırları Dışında Olanlar

- Stok düşümü yapmaz.
- FIFO/LIFO/ortalama maliyet hesaplaması yapmaz.
- Valuation veya cost engine entegrasyonu yapmaz.
- Satın alma / transfer / satın alma lot yönetimi yapmaz.

### Temel Model Yapısı

- InventoryConsumption
- InventoryConsumptionLine
- ConsumptionSource
- ConsumptionRelationship
- ConsumptionValidation
- ConsumptionResult
