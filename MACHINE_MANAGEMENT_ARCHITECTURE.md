# MACHINE_MANAGEMENT_ARCHITECTURE

## Status

- Architecture Status: Implemented
- Implementation Status: Implemented
- Validation Status: Passed
- Last Updated: 2026-07-16

## 1. Makine Varlık Yönetimi

Makine varlıkları üretim hattının temel bileşenleridir. Sprint 2.3.13 kapsamında şu üretim odaklı bilgiler uygulanmıştır:

- Makine kodu
- Makine adı
- Marka, model, seri numarası
- Üretim yılı, satın alma ve komisyon tarihleri
- Garanti başlangıç/bitiş tarihleri
- Durum bilgisi
- Notlar

## 2. Makine Türleri ve Kapasite

Makine türleri yapılandırılabilir kategoriler üzerinden saklanır. Uygulanan örnek kategoriler şunlardır:

- Cutting
- Grinding
- Tempering
- Insulating Glass
- CNC
- Drilling
- Lamination
- Washing
- Painting
- Sandblasting
- Quality
- Dispatch

Kapasite alanları yalnızca bilgi olarak saklanır; hesaplama bu sprintte dahil edilmemiştir.

- Saatlik kapasite
- Günlük kapasite
- Maksimum cam boyutu
- Minimum cam boyutu
- Maksimum kalınlık
- Minimum kalınlık

## 3. Operatör Atamaları

Makineye operatör atamaları mevcut personel domain referansları üzerinden saklanır.

- Primary Operator
- Assistant Operators
- Temporary Assignment
- Assignment History (atama geçmişi, ileride raporlama için hazır yapı)

## 4. Bakım ve Zaman Tüneli

Bakım kayıtları ve olay zaman çizgisi desteklenir.

- Periyodik bakım
- Arıza onarım
- Sarf malzemesi değişimi
- Yedek parça değişimi
- Yazılım güncellemesi
- Garanti uzatması

## 5. Sarf ve Yedek Parça

Makineye bağlı sarf ve yedek parça kayıtları saklanır.

- Yedek parça adı ve parça numarası
- Tedarikçi referansı
- Değiştirme tarihi
- Maliyet
- Notlar

Sarf malzemeleri için ise:

- Kurulum tarihi
- Değiştirme tarihi
- Beklenen ömür
- Gerçek ömür
- Değiştirme nedeni
- Maliyet
- Tedarikçi
- Notlar

## 6. Tedarikçi ve Servis Firması

Makineyle ilişkili tedarikçi ve servis firmaları referans olarak saklanır.

- Firma adı
- İletişim kişisi
- Telefon
- E-posta
- Adres
- Website

## 7. Doküman Referansları

Makine belgeleri referans olarak saklanır.

- Manual
- Maintenance Guide
- Electrical Diagram
- Hydraulic Diagram
- Warranty Files

## 8. Gelecek Uyumluluk

Bu sprintte hesaplama uygulanmaz; ileride aşağıdaki alanlar için altyapı hazırlanmıştır:

- OEE
- Machine Cost Engine
- Maintenance Cost Engine
- Predictive Maintenance
- IoT
- Machine Analytics

## 9. Persistence Readiness Review (Sprint 2.3.20)

Makine domaini, persistence katmanına hazırlanırken aşağıdaki temel yapı ile ele alınmalıdır:

- Expected database entity: machines
- Primary identifier: machineId
- Future foreign-key references: stationId, personnelId, maintenanceRecordId, supplierId, serviceCompanyId
- Aggregate ownership: Machine aggregate belongs to Machine Management domain
- Expected repository: machineRepository
- Expected API resource: /machines
- Expected service ownership: MachineManagementEngine / machine service
