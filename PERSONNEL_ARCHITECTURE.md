# PERSONNEL_ARCHITECTURE

## Status

- Architecture Status: Implemented
- Implementation Status: Documented
- Validation Status: N/A
- Last Updated: 2026-07-16

## 1. Personnel Card

Personel kartı, sahadaki çalışanların üretim süreçlerindeki yetki ve yeterlilik bilgilerini içerir. Temel alanlar şunlardır:

- Ünvan
- Rol
- Operatör atamaları
- İstasyon yetkileri
- Baş operatör
- Yardımcı operatör
- Vardiyalar
- Sağlık bilgileri
- Kan grubu
- Engel durumu
- Sertifikalar
- İş güvenliği belgeleri
- Forklift yeterliliği
- Vinç yeterliliği
- Mesleki yeterlilik
- Acil durum iletişim bilgileri

## 2. Title vs. System Authority

Karar: Ünvan ile sistem yetkisi birbirinden bağımsızdır.

- Ünvan bir personelin sahadaki iş tanımını ve organizasyon içindeki yerini gösterir.
- Sistem yetkisi, hangi iş ekranlarını ve işlemleri kullanabileceğini belirler.
- Bir operatör yalnızca yetkili olduğu istasyonları görebilir ve ilgili işlemleri gerçekleştirebilir.

## 3. Station Permissions

Her personel için istasyon bazlı erişim tanımlanır.

Örnek:

- Kesim operatörü: yalnızca Kesim ekranı ve ilgili bekleyen işler
- Rodaj operatörü: yalnızca Rodaj ekranı ve ilgili bekleyen işler
- Kalite operatörü: yalnızca Kalite kontrol ekranı

Bu sayede personel sadece kendi yetkili oldukları operasyonları görür ve çalışır.

## 4. Operator Assignments

Personel kartı bir veya birden fazla operatör görevine atanabilir.

- Baş operatör: operasyonun genel sorumlusu
- Yardımcı operatör: işin sahadaki yürütülmesinden sorumlu ikinci kişi

Bu atamalar, hem saha iş akışını hem de sorumluluk raporlamasını destekler.

## 5. Shifts

Vardiya bilgileri, personelin hangi zaman dilimlerinde hangi istasyonlarda görevli olduğunu belirtir.

- Vardiya adı
- Başlangıç saati
- Bitiş saati
- Atanan istasyonlar

Vardiya modeli ileride kapasite planlama ve iş emri zamanlaması için kullanılabilir.

## 6. Health & Safety

Personel kartında yer alabilecek sağlık ve güvenlik bilgiler:

- Kan grubu
- Engel durumu
- İş güvenliği belgeleri
- Forklift sertifikası
- Vinç sertifikası
- Mesleki yeterlilik belgeleri
- Acil durum iletişim bilgileri

Bu bilgiler, acil durum yönetimi ve eğitim/sertifikasyon uyumluluğu için önemlidir.

## 7. Consequences

- Ünvan ile sistem yetkisi ayrıştırılarak güvenlik ve esneklik artırılır.
- Personel sadece yetkili oldukları istasyonları görebilir.
- Yetki dışı işlemler otomatik olarak engellenir.
- Bu mimari, ileride operatör bazlı performans ve kapasite raporlaması için altyapı sağlar.

## 8. Implemented Personnel Domain

Sprint 2.3.12 kapsamında aşağıdaki üretim personeli domain modelleri uygulanmıştır:

- `Personnel`
- `PersonnelTitle`
- `PersonnelStatus`
- `PersonnelRole`
- `PersonnelShift`
- `PersonnelCertificate`
- `PersonnelHealthInformation`
- `EmergencyContact`

Personel kartı artık şu alanları destekler:

- Employee Number
- First Name
- Last Name
- Active / Passive
- Hire Date
- Notes

## 9. Health Information

Sağlık verileri yalnızca referans bilgisi olarak saklanır. Bu sprintte tıbbi workflow bulunmaz.

- Blood Group
- Disability Information
- Medical Notes
- Emergency Contact
- Emergency Phone

## 10. Station and Machine Assignment

Personel birden fazla istasyona atanabilir. Sadece atanmış istasyonlar operatör ekranlarında görünür.

- `CUTTING`
- `GRINDING`
- `TEMPERING`
- `INSULATING_GLASS`
- `QUALITY`
- `DISPATCH`

Makine atamaları şu türleri destekler:

- Primary Operator
- Assistant Operators
- Temporary Assignment

## 11. Shift Planning

Şift modeli aşağıdaki alanları destekler:

- Unlimited shifts
- Shift start
- Shift end
- Assigned stations
- Assigned machines

## 12. Flow Relationship

Personel akışı, üretim rotası içinde `PRODUCTION_FLOW_ARCHITECTURE.md` ile uyumlu olarak şöyle modellenir:

- Personel kimliği
- İstasyon izinleri
- Makine atamaları
- Vardiya
- Üretim sorumluluğu

Bu ilişki şeması, operatörün hangi istasyon ve makine kombinasyonunda hangi kuyruğu görebileceğini belirler.

## 13. Persistence Readiness Review (Sprint 2.3.20)

Personel domaini, ileride persistence katmanına hazırlanırken aşağıdaki temel sınırlarla ele alınmalıdır:

- Expected database entity: personnel
- Primary identifier: personnelId
- Future foreign-key references: stationId, machineId, shiftId, reworkRequestId (optional)
- Aggregate ownership: Personnel aggregate belongs to Personnel Management domain
- Expected repository: personnelRepository
- Expected API resource: /personnel
- Expected service ownership: PersonnelManagementEngine / personnel service
