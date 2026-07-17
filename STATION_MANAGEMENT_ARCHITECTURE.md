# Station Management Architecture

## Overview

Station Management (Sprint 2.8.2) provides CRUD operations for production stations, machine-to-station assignments, and personnel-to-station assignments within a multi-tenant factory environment.

## Data Model

### Core Table: `stations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `char(26)` | ULID primary key |
| `tenantId` | `char(26)` | Tenant foreign key |
| `factoryId` | `char(26)` | Factory foreign key |
| `stationCode` | `varchar(50)` | Unique station code per tenant |
| `name` | `varchar(255)` | Station display name |
| `stationType` | `varchar(50)` | One of 12 production types |
| `description` | `text` | Optional description |
| `sortOrder` | `integer` | Display ordering |
| `maxConcurrentJobs` | `integer` | Max parallel jobs |
| `maxMachines` | `integer` | Max machines allowed |
| `maxOperators` | `integer` | Max operators allowed |
| `notes` | `text` | Free-form notes |
| `isActive` | `boolean` | Soft lifecycle flag |
| `createdAt` / `updatedAt` | `timestamptz` | Audit timestamps |
| `deletedAt` / `deletedBy` | `timestamptz` / `text` | Soft delete |

### Junction Tables

**`station_machine_assignments`**: Links stations to machines.
- `id` (char(26)), `stationId`, `machineId`, `isPrimary` (boolean), `assignedAt`, `releasedAt`
- RLS enforced per tenant

**`station_personnel_assignments`**: Links stations to personnel.
- `id` (char(26)), `stationId`, `personnelId`, `isHeadOperator` (boolean), `assignedAt`, `releasedAt`
- RLS enforced per tenant

### Station Types (12)

`cutting`, `grinding`, `tempering`, `insulating_glass`, `cnc`, `drilling`, `lamination`, `washing`, `painting`, `sandblasting`, `quality`, `dispatch`

## Architecture

### Directory Structure

```
apps/web/src/
├── app/
│   ├── actions/
│   │   └── stations.ts              # All station server actions
│   └── (dashboard)/
│       └── stations/
│           ├── page.tsx              # Station list page with DataGrid
│           └── _components/
│               ├── station-dialog.tsx        # Create/Edit dialog
│               └── station-detail-drawer.tsx # Detail drawer with tabs
├── i18n/
│   ├── en.ts                         # English translations
│   └── tr.ts                         # Turkish translations
└── lib/
    └── authorization.ts              # RBAC with stations:read/write
```

### Key Architectural Patterns

1. **Server Actions** (`stations.ts`): All DB operations via `"use server"` with `requireSession()`, `withTenantSession()`, and `ensurePermission()`.

2. **RBAC**: `stations:read` and `stations:write` permissions mapped to roles in `authorization.ts`.

3. **Bidirectional Relationships**:
   - Machines show assigned station via `getStationByMachineIdAction()` in `MachineDetailDrawer`
   - Personnel show assigned stations via `getStationsByPersonnelIdAction()` in `PersonnelDetailDrawer`
   - Stations show assigned machines/personnel in `StationDetailDrawer` tabs

4. **UI Components**: Reuses `@repo/ui` library — `DataGrid`, `Dialog`, `Sheet`, `Badge`, `Select`, `SearchBox`, `Button`, `Skeleton`, `LoadingState`.

### Server Actions

| Action | Permission | Description |
|--------|-----------|-------------|
| `getStationsAction` | `stations:read` | Paginated, filterable, sortable list |
| `getStationByIdAction` | `stations:read` | Single station detail |
| `getStationStatsAction` | `stations:read` | Total/Active/Inactive counts |
| `createStationAction` | `stations:write` | Create new station |
| `updateStationAction` | `stations:write` | Update existing station |
| `deactivateStationAction` | `stations:write` | Soft deactivate |
| `activateStationAction` | `stations:write` | Reactivate |
| `getStationMachinesAction` | `stations:read` | Machines assigned to station |
| `assignMachineToStationAction` | `stations:write` | Assign machine with isPrimary |
| `removeMachineFromStationAction` | `stations:write` | Remove machine assignment |
| `getAvailableMachinesForStationAction` | `stations:read` | Unassigned machines for selection |
| `getStationPersonnelAction` | `stations:read` | Personnel assigned to station |
| `assignPersonnelToStationAction` | `stations:write` | Assign personnel with isHeadOperator |
| `removePersonnelFromStationAction` | `stations:write` | Remove personnel assignment |
| `getAvailablePersonnelForStationAction` | `stations:read` | Unassigned personnel for selection |
| `getStationByMachineIdAction` | `stations:read` | Bidirectional: station for a machine |
| `getStationsByPersonnelIdAction` | `stations:read` | Bidirectional: stations for personnel |

### UI States

Every component handles:
- **Loading**: `LoadingState` component with spinner
- **Error**: Warning icon + error message + "Try Again" button
- **Empty**: DataGrid built-in empty state / contextual empty messages
- **Success**: Data display with all CRUD operations

### Permission Matrix

| Role | stations:read | stations:write |
|------|:---:|:----:|
| super_admin | ✅ | ✅ |
| tenant_admin | ✅ | ✅ |
| factory_manager | ✅ | ✅ |
| production_manager | ✅ | ✅ |
| maintenance_tech | ✅ | ❌ |
| quality_engineer | ✅ | ❌ |
| operator | ✅ | ❌ |
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
