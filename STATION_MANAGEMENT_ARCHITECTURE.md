# STATION_MANAGEMENT_ARCHITECTURE

## Durum

- Mimari Durumu: Uygulandı
- Uygulama Durumu: Uygulandı
- Doğrulama Durumu: Geçti
- Son Güncelleme: 2026-07-16

## 1. İstasyon Felsefesi

İstasyonlar üretim akışının merkezi kaynaklarıdır. Bu sprintte istasyonlar;

- personel ile,
- makine ile,
- üretim kuyruğu ile

bağlantı kuran bir yapı olarak modellenmiştir.

Bu sprintte kapasite hesaplaması veya rota algoritması uygulanmaz; yalnızca geleceğe hazır referans yapısı oluşturulur.

## 2. İstasyon Kartı

İstasyon kartı şu alanları destekler:

- İstasyon kodu
- İsim
- Açıklama
- Tip
- Aktif / pasif durumu
- Görünürlük sırası
- Notlar

## 3. İstasyon Tipleri

Yapılandırılabilir üretim istasyonu tipleri desteklenir. Gelecekte yeni tipler eklenebilir.

Örnek tipler:

- CUTTING
- GRINDING
- TEMPERING
- INSULATING_GLASS
- LAMINATION
- CNC
- DRILLING
- WASHING
- PAINTING
- SANDBLASTING
- QUALITY
- DISPATCH

## 4. Makine İlişkisi

Bir istasyon birden fazla makineye referans edebilir. Makine modelleri Machine Management alanında tutulur; burada sadece bağlantı referansı saklanır.

## 5. Personel İlişkisi

Bir istasyon birden fazla personele referans edebilir. Personel modelleri Personnel Management alanında tutulur; burada sadece atama referansı saklanır.

## 6. Kuyruk İlişkisi

İstasyon üretim kuyruğunu referans eder. Queue mantığı Production Queue modülünde kalır; istasyon yalnızca referans tutar.

## 7. Kapasite Modeli

Kapasite bilgisi yalnızca metadata olarak saklanır.

- Maksimum aktif iş sayısı
- Maksimum eşzamanlı makine sayısı
- Maksimum eşzamanlı operatör sayısı

## 8. Dashboard Hazırlığı

Gelecekteki dashboard için hazırlık modeli oluşturulur.

- Bekleyen işler
- Çalışan işler
- Tamamlanan işler
- Makine sayısı
- Personel sayısı
- Arıza sayısı

## 9. Gelecek Uyumluluk

Bu sprintte algoritma uygulanmaz; ileride şunlar için altyapı hazırlanır:

- Capacity Planning
- Bottleneck Analysis
- Load Balancing
- Automatic Routing
- Dynamic Scheduling

## 10. Sprint 2.5.3 — Station Operation Engine (SERVICE LAYER)

Sprint 2.5.3 kapsamında istasyon bazlı iş mantığı servis katmanında implemente edilmiştir.

### 10.1 StationOperationService

Her üretim istasyonu kendi iş kurallarına sahiptir. StationOperationService aşağıdaki genel metodları sağlar:

- `startOperation()` — İstasyonda operasyon başlatma (giriş validasyonu dahil)
- `completeOperation()` — Operasyon tamamlama
- `cancelOperation()` — Operasyon iptal
- `rejectOperation()` — Operasyon reddetme (sebep zorunlu)
- `validateOperation()` — İstasyona giriş doğrulama
- `calculateFurnaceCapacity()` — Temper fırın kapasitesi hesaplama
- `validateLowE()` — Low-E doğrulama
- Waiting pool yönetimi: addToWaitingPool, removeFromWaitingPool, getWaitingPool, getWaitingPoolStatistics, loadWaitingProduction
- Operasyon geçmişi: getOperationHistory, getStationOperationHistory
- İstatistikler: getStationStatistics, getAllStationStatistics

### 10.2 Grinding Rules

- Grinding, CUTTING veya REWORK_CUTTING'den üretim alabilir
- Grinding, üretimi TEMPER, READY veya MANUAL_TRANSFER'e gönderebilir
- Grinding kırılması mevcut Rework workflow'unu takip eder

### 10.3 Temper Rules

- Üretim Temper'a girmeden ÖNCE Grinding tamamlanmış olmalıdır
- Non-temperable Low-E cam Temper'a gönderilemez
- Fırın kapasitesi: Normal cam = gerçek alan, Temperli IG = 2 × gerçek alan
- Kapasite hesaplaması saf bir hesaplamadır — optimizasyon algoritması yoktur

### 10.4 Insulating Glass Rules

- Normal IG, Temperli IG, Low-E IG desteklenir
- Yalnızca validasyon — envanter tüketimi yok

### 10.5 Low-E Validation

- Temperable Low-E: Temper'a girebilir
- Non-temperable Low-E: Temper'a giremez (sistem tarafından engellenir)
- LowEValidationFailedEvent fırlatılır

### 10.6 Hole / Vent / CNC

- Esnek ara operasyonlar — herhangi iki istasyon arasında gerçekleşebilir
- Katı giriş validasyonu yok — routing yapılandırılabilir

### 10.7 Waiting Pools

- Her istasyon için in-memory bekleme havuzu
- İşlemler: ekleme, çıkarma, listeleme, istatistik
- loadWaitingProduction() ile bekleme havuzundaki üretim emirleri getirilebilir

### 10.8 Domain Events (Sprint 2.5.3)

| Event                          | Fırlatan                     | Açıklama                       |
| ------------------------------ | ---------------------------- | ------------------------------ |
| GrindingStartedEvent           | startOperation (Grinding)    | Rodaj başladı                  |
| GrindingCompletedEvent         | completeOperation (Grinding) | Rodaj tamamlandı               |
| TemperStartedEvent             | startOperation (Temper)      | Temper başladı                 |
| TemperCompletedEvent           | completeOperation (Temper)   | Temper tamamlandı              |
| InsulatingGlassStartedEvent    | startOperation (IG)          | Isıcam başladı (glassType ile) |
| InsulatingGlassCompletedEvent  | completeOperation (IG)       | Isıcam tamamlandı              |
| FurnaceCapacityCalculatedEvent | startOperation (Temper)      | Fırın kapasitesi hesaplandı    |
| LowEValidationFailedEvent      | validateLowE()               | Low-E validasyonu başarısız    |

---

## 11. Persistence Readiness Review (Sprint 2.3.20)

İstasyon domaini, persistence katmanına hazırlanırken aşağıdaki temel yapı ile ele alınmalıdır:

- Expected database entity: stations
- Primary identifier: stationId
- Future foreign-key references: machineId, personnelId, queueId, productionQueueItemId
- Aggregate ownership: Station aggregate belongs to Station Management domain
- Expected repository: stationRepository
- Expected API resource: /stations
- Expected service ownership: StationManagementEngine / station service
