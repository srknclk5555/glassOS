# ADR-2026-07-19-01: Order `in_production → completed` Status Transition

## Status
**Öneri — Onay Bekliyor**

## Context
`OrderService`, siparişin `draft → confirmed` (approveOrder) ve `draft/confirmed → cancelled` (cancelOrder) geçişlerini yönetir. Ancak `in_production → completed` geçişi hiçbir yerde implemente edilmemiştir.

`ProductionService.updateStatus()`, `production_orders` tablosundaki üretim emirlerinin durum geçişlerini yönetir (`pending → in_progress → completed`). Bir siparişin tüm `order_lines`'ına ait production order'lar `completed` olduğunda, üst siparişin de `in_production → completed` olması gerekir.

## Decision
**Öneri:** Bu geçiş, `OrderService`'e ait olmalıdır.

### Gerekçe

| Yaklaşım | Açıklama | Sorun |
|----------|----------|-------|
| **ProductionService'te** | Her production order `completed` olduğunda, üst order'ı kontrol et | ProductionService'in Order aggregate'ine müdahale etmesi gerekir → aggregate boundary ihlali |
| **OrderService'te** | `checkAndCompleteOrder(orderId)` metodu, tüm production order'ların durumunu kontrol eder | ✅ Order aggregate kendi sınırını korur |
| **Event-driven** | ProductionOrder tamamlanınca event fırlat, OrderService dinlesin | Altyapı hazır değil (event bus yok, handler mekanizması yok) |

### Çözüm Tasarımı

```typescript
class OrderService {
  async checkAndCompleteOrder(orderId: string): Promise<{
    order: any;
    completed: boolean;
    events: OrderStatusChangedEvent[];
  }> {
    // 1. Siparişi bul
    // 2. Tüm order line'ları bul
    // 3. Her line için production order'ları kontrol et
    //    - Tümü "completed" mi?
    //    - completedQuantity >= quantity mi?
    // 4. Tüm koşullar sağlanıyorsa:
    //    - orders.status = "completed"
    //    - Event fırlat
    // 5. Koşullar sağlanmıyorsa:
    //    - Sessizce başarısız (throw değil, completed=false döndür)
  }
}
```

### Nereden Çağrılmalı?

Bu metot şu durumlarda çağrılabilir:

1. **CuttingExecutionService.completeSession()** sonunda — her kesim tamamlandığında
2. **ProductionService.updateStatus()** production order `completed` olduğunda
3. **Harici bir scheduler / webhook** ile periyodik kontrol

**Önerilen:** `ProductionService.updateStatus()` içinde, production order başarıyla `completed` olduğunda `OrderService.checkAndCompleteOrder()` çağrılır. Bu, `ProductionService`'in constructor'ına `OrderService` enjeksiyonu gerektirir (mevcutta orderLine/order repository'leri zaten enjekte ediliyor).

### Alternatif: Sadece OrderService'te kal, dışarıdan çağrılsın

Daha temiz bir yaklaşım: `OrderService.checkAndCompleteOrder()`'ı `public` yap, Cutting/Production servislerinin transaction'ı bittiğinde API controller'ı veya bir saga/coordinator tarafından çağrılsın. Bu, servisler arası dairesel bağımlılığı (circular dependency) önler.

### Etki Analizi

| Öğe | Etki |
|-----|------|
| Schema değişikliği | Yok (mevcut `status` alanı kullanılır) |
| Migration | Gerekmez |
| Yeni test | 3-4 senaryo: tümü tamam → completed, bazıları eksik → no-op, hatalı order ID |
| TSC 0 hata | Korunur |
| Mevcut testler | Kırılmaz |

## Onay
> **Bekleniyor.** Hangi yaklaşımı tercih ettiğinizi belirtin:
> - **A)** `OrderService.checkAndCompleteOrder()` + `ProductionService` içinden çağrı (servis enjeksiyonlu)
> - **B)** `OrderService.checkAndCompleteOrder()` public metod + API/Controller seviyesinde koordinasyon
