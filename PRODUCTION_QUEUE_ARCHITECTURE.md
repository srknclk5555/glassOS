# PRODUCTION_QUEUE_ARCHITECTURE

## Status

- Architecture Status: Implemented
- Implementation Status: Implemented
- Validation Status: Passed
- Last Updated: 2026-07-16

> **Not:** İstasyon transfer yönetimi (station-to-station movement) Sprint 2.5.2'de ProductionTransferService tarafından eklenmiştir. Detaylar için `SERVICE_ARCHITECTURE.md` bölüm 4.8'e bakınız.

## 0. Source of Truth

`PRODUCTION_FLOW_ARCHITECTURE.md` is the single source of truth for production routing and operation sequence. This document focuses on queue staging, operator workflow, and transition semantics.

## 1. Production Queue Philosophy

GlassOS, üretimi sipariş satırı ve sayaçlar üzerinden takip eder; operasyon bazında ilerleme, her satırın kendi operasyon akışını yürütmesini sağlar. Fiziksel cam parçaları kalıcı veri varlığı değildir; üretim ilerlemesi Requested / Completed / Missing / Broken / Delivered sayaçlarıyla izlenir.

## 2. Operation-Based Tracking

Her operasyonun kendi kuyruğu vardır:

- CUTTING
- GRINDING
- DRILLING
- CNC
- TEMPERING
- LAMINATING
- INSULATING_GLASS
- QUALITY_CONTROL
- PACKAGING
- DISPATCH

Yeni operasyonlar, açık bir operasyon listesi yapısı üzerinden eklenebilir.

## 3. Order → Line → Operation Relationship

Her sipariş satırı, bir dizi operasyon üzerinden ilerler. Bir operasyon tamamlandığında ilgili satır bir sonraki operasyon kuyruğuna taşınır. İşin tamamlanması ancak tüm operasyonlar tamamlandığında gerçekleşir.

## 4. Queue Model

- ProductionOperation: operasyon adı, kodu, sırası
- ProductionQueue: belirli bir operasyon için bekleyen iş listesi
- ProductionQueueItem: bir sipariş satırının belirli operasyon için kuyruğa alınmış kaydı
- ProductionProgress: sipariş satırı için ilerleme bilgisi

## 5. Transition Rules

- Bir operasyonun tamamlanması, aynı satırın sonraki operasyonun kuyruğuna taşınmasını tetikler.
- Hedef kuyrukta görev READY olarak görünür.
- Tamamlanan satırın tüm operasyonları biterse sipariş genel olarak completed kabul edilir.

## 6. Office Tracking Model

Ofis ekranında satır bazlı operasyon ilerlemesi şu yapıda görüntülenebilir:

- Kesim ✓
- Rodaj ✓
- Temper ⏳
- Kalite ○
- Sevkiyat ○

## 7. Cutting Pool Philosophy

Kesim operatörü sisteme girdiğinde ilk olarak kesilecek cam tipini seçer.

Örnek:

8 mm Füme Float

Sistem yalnızca bu malzemeye ait kesim bekleyen işleri listelemelidir. Operatör tüm siparişleri değil yalnızca seçtiği malzemeye ait işleri görmelidir.

Operatör barkod okuyucu ile istediği işleri sepete ekler. Makinedeki optimizasyon yazılımı kaç plaka kullanılacağını belirler. GlassOS optimizasyon yapmaz.

Operatör yalnızca Used Sheet Count bilgisini girer. Bu bilgi Production Engine tarafından fire hesaplamalarında kullanılır.

## 8. Production Queue Philosophy

Üretim sipariş bazında değil operasyon bazında ilerler. Her operasyon tamamlandığında ilgili satır otomatik olarak bir sonraki operasyon kuyruğuna aktarılır.

Sipariş hiçbir zaman operatör tarafından tamamlanmaz. Sipariş yalnızca tüm satırlar ve tüm operasyonlar tamamlandığında sistem tarafından Completed olur.

## 9. Office Tracking

Ofis çalışanları her sipariş satırının operasyon durumunu görebilir.

Örnek:

- Kesim
- Rodaj
- Temper
- Isıcam
- Kalite
- Sevkiyat

Her operasyon ayrı durum göstergesine sahip olmalıdır. Sipariş ilerleme yüzdesi otomatik hesaplanmalıdır.

## 10. Operator Screen Model

Kesim ekranında operatör önce malzeme seçer, ilgili kesim bekleyen işlerini görür, barkod okur, işleri sepete ekler, used sheet count girer ve kesimi başlatır. Kesim tamamlandığında ilgili parçalar otomatik olarak sonraki havuza aktarılır.

## 11. Architecture Decisions

- Operation-based tracking, sipariş bazlı tamamlanma mantığının yerine geçer.
- Queue engine, üretim akışının mantıksal modelini sağlar.
- Inventory, cost ve optimization gibi alanlar bu sprintte dahil edilmez.
- `PRODUCTION_FLOW_ARCHITECTURE.md` is the authoritative routing document.

## 12. Production Work Queue (Sprint 2.3.19)

Production Queue and Production Work Queue are separate concepts.

- Production Queue represents the factory workflow and operation-based routing.
- Production Work Queue represents the operator's active working basket at a station.

The implemented work queue supports:

- ProductionWorkQueue
- WorkQueueItem
- WorkQueueStatus
- WorkQueueStatistics
- WorkQueueMaterial
- WorkQueueMachine
- WorkQueueOperator
- WorkQueueSession

It supports station/machine/material selection, material-filtered job matching, rapid barcode-based item addition, duplicate prevention, status transitions, and statistics preparation. It does not execute production calculations, inventory movement, machine control, or optimization.

## 13. Transfer and Rework Queue Philosophy (Sprint 2.3.21)

Sprint 2.3.21 kapsamında üretim transfer ve rework kuyruğu mantığı dokümante edilmiştir.

- Cutting Rework Queue, normal cutting kuyruğundan bağımsız bir ayrı kuyruk olarak tanımlanır.
- Operatörler aynı çalışma kuyruğuna Normal Orders, Rework Orders veya her ikisini birlikte ekleyebilir.
- Transferler, üretim durumunu ve mevcut istasyonu günceller; kuyruk statüsünü de ilgili yeni istasyon/operasyonla uyumlu hale getirir.
- Rework, operatör ekranlarında ayrı bir görev olarak değil, bir Internal Production Order olarak değerlendirilir.

## 14. Persistence Readiness Review (Sprint 2.3.20)

The production queue and work queue domains were reviewed as separate aggregates for persistence planning.

- Expected database entity: production_queue / production_work_queue
- Primary identifier: queueId / sessionId / itemId
- Future foreign-key references: orderId, orderLineId, stationId, machineId, materialId, operatorId, reworkRequestId
- Aggregate ownership: Production Queue remains owned by the production-flow domain; Production Work Queue remains owned by the operator-workspace domain.
- Expected repository: productionQueueRepository / productionWorkQueueRepository
- Expected API resource: /production-queues and /production-work-queues
- Expected service ownership: ProductionQueueEngine and ProductionWorkQueueEngine

## 15. Validation

Engine tests and TypeScript build are passing.
