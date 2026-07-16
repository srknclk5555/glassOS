# PRODUCT_ARCHITECTURE — GlassOS Product Architecture

Tarih: 2026-07-14 (Son Güncelleme: 2026-07-15)

Architecture Status
✅ Completed

Implementation Status
✅ Completed (Sprint 2.3.11)

Validation Status
✅ Passed (engine tests and build)

Bu doküman GlassOS'un ürün ve reçete mimarisini tanımlar. GlassOS üretim odaklı bir Production Intelligence Platform olarak ERP siparışlerinden ayrılır; bu dosya ürün kategorizasyonu, tüketim modelleri, üretim ölçüsü ve kayıp sınıflandırmasını açıklar.

> **ÖNEMLİ:** Üretim rotasıyla ilgili tekil kaynağa `PRODUCTION_FLOW_ARCHITECTURE.md` bakılmalıdır.
>
> **ÖNEMLİ:** Hesaplama motorunun tüm iş kuralları (Business Dimension / Production Dimension ayrımı, Trim Engine, Grinding Engine, Waste sınıflandırması, maliyet katmanları) `PRODUCTION_CALCULATION_ENGINE.md` dokümanında bulunur.

---

# Tamamlanmış Özellik Örneği

- Sprint 2.2 kapsamında tamamlanmış özellik: `Raw Material Model` ve `Product Model` ayrışması.
- Uygulamada artık hammadde kartı ile ürün kartı ayrı tutuluyor.
- Hammadde kartı şu alanları içerir: `Malzeme Kodu`, `Adı`, `Kalınlık`, `Renk`, `Üretici`, `Standart Plaka Ölçüsü`, `Stok Takibi`, `Temperlenebilir`, `Lamine Uygunluğu`, `Not`.
- Ürün kartı ise nihai ürün tanımını ve reçeteye bağlı üretim özelliklerini taşır.
- Bu, tamamlanmış teslimatın somut bir göstergesidir: hammaddeler artık ürün modeliyle karıştırılmıyor ve ürün reçetesi üretim rotasını belirliyor.

---

# 1. Product Philosophy

- GlassOS stok programı değildir.
- GlassOS üretim odaklıdır.
- ERP siparişi oluşturur.
- GlassOS üretimi oluşturur.
- Finished Product ≠ Raw Material.
- Float cam ürün değildir.
- Temper cam üründür.
- Isıcam üründür.
- Lamine üründür.

---

# 2. Product Categories

Ürün kategorileri:

- **Raw Material**
  - Float Cam
  - Çıta
  - Silikon
  - Butil
  - Nem Alıcı
  - Sarf Malzemeleri

- **Semi Finished**
  - (ileride kullanılabilecek)

- **Finished Product**
  - Temper
  - Isıcam
  - Lamine
  - vb.

---

# 3. Raw Material Model

Hammadde mantığı:

- Malzeme Kodu
- Adı
- Kalınlık
- Renk
- Üretici
- Standart Plaka Ölçüsü
- Stok Takibi
- Temperlenebilir
- Lamine Uygunluğu
- Not

Bu bölüm hammaddeyi ürün kartından ayrıştırır. Hammadde, üretimin temel girdisidir; ürün çıktısı değildir.

---

# 4. Product Model

Ürün kartı, nihai ürün tanımını taşır.

Örnek:

- 8 mm Füme Temper
- 4+12+4 Isıcam

Ürün kartı reçeteye bağlı çalışır; her ürünün üretim özellikleri ve geçeceği işlemler reçetede tanımlıdır.- Recipe bu dokümanda yalnızca “bir üretim birimi için hangi malzemeler teorik olarak tüketilir” sorusunu cevaplar; routing, istasyon, makine ve üretim hesaplaması bu sprintte dahil edilmez.

- Inventory bu dokümanda yalnızca “hangi fiziksel/soyut malzeme kartı sistemde mevcut” sorusunu cevaplar; inventory consumption, valuation, lot consumption, purchasing ve transfer mantığı bu sprintte dahil edilmez.

---

# 5. Recipe Engine

Recipe Engine GlassOS'un üretim motorunun temelidir.

Recipe, şunları belirler:

- hangi hammaddelerin kullanılacağını
- hangi işlemlerden geçeceğini
- hangi tüketim hesaplarının uygulanacağını

Recipe Engine, üretim rotasını ve tüketim modelini reçeteye göre oluşturur.

---

# 6. Manufacturing Rules and Composition Model

Sprint 2.3.21 kapsamında cam üretimine ilişkin nihai mimari kurallar dokümante edilmiştir.

- Temper üretimi için Grinding zorunludur; Grinding, Temper işleminden önce gerçekleşmelidir.
- Tempered Insulating Glass için fırın kapasitesi, tek bir cam değil iki temperli camın yükü olarak değerlendirilir.
- Recipe, ürünün temel kompozisyonunu tanımlar; tüketim, recipe malzemeleri üzerinden hesaplanır.
- Üretim akışı, recipe tanımlı ürün bileşimini referans alır; station flow ise önerilen rota olarak değerlendirilir.

# 7. Consumption Model

GlassOS tüketim modelinin temel parçaları:

## Alan Bazlı Tüketim

- m² üzerinden hesaplanır.
- Örnek: Float Cam.

## Çevre Bazlı Tüketim

- Perimeter üzerinden hesaplanır.
- Örnekler:
  - Spacer
  - Primary Seal
  - Secondary Seal

## Adet Bazlı

- Örnekler:
  - Klips
  - Etiket
  - QR

## Sabit

- Sabit sarf malzemeleri.

## Süre Bazlı

- Makine çalışma süresi.

Consumption Model, sadece işin kendisini değil üretim maliyetlendirmesini de belirler.

---

# 8. Production Dimensions

> **Detaylı kurallar ve örnekler için bkz. `PRODUCTION_CALCULATION_ENGINE.md` — Bölüm 2, 3 ve 4**

GlassOS iki ayrı boyut kullanır:

**Business Dimension** — Müşterinin sipariş ettiği gerçek ölçü. Sistemin tüm görünür katmanlarında (ofis, saha, etiket, müşteri, rapor) değişmeden kullanılır. Rodaj eklenmiş ölçü hiçbir yerde gösterilmez.

**Production Dimension** — Business Dimension'a Grinding payları (her kenar bağımsız) eklenerek hesaplanan dahili ölçü. Yalnızca Cutting Engine ve Cost Engine içinde kullanılır.

Bu fark, üretim planlama ve malzeme tüketimini doğru yapmak için kritik bir mimarik karardır.

---

# 9. Trim Loss

> **Detaylı mantık ve örnekler için bkz. `PRODUCTION_CALCULATION_ENGINE.md` — Bölüm 6: Trim Engine**

Trim mimarisinin özeti:

- Trim sipariş bazında değildir; **Full Sheet** bazında uygulanır.
- Trim her cam için uygulanmaz.
- Trim, büyük float plakasının dış kenarlarından alınan zorunlu kayıptır.
- Trim, **Inventory Loss**'tur (stok/envanter seviyesinde etkilidir).
- Trim, sipariş ölçüsünü değiştirmez.
- Trim, üretim ölçüsünü değiştirmez.
- Trim, Optimization Engine'in çalıştığı Usable Area'yı küçülterek maliyeti ve fire oranını etkiler.
- Her kenar bağımsız tanımlanır (`trim_left_mm`, `trim_right_mm`, `trim_top_mm`, `trim_bottom_mm`).
- Factory Configuration'da saklanır; fabrikadan fabrikaya farklılık gösterebilir.

---

# 10. Grinding Allowance

> **Detaylı formulüller ve örnekler için bkz. `PRODUCTION_CALCULATION_ENGINE.md` — Bölüm 5: Grinding Engine**

Rodaj mimarisinin özeti:

- Rodaj payı **her kenar için bağımsız** tanımlanır: `grinding_left_mm`, `grinding_right_mm`, `grinding_top_mm`, `grinding_bottom_mm`.
- Rodaj, **Factory Configuration**'da tutulur; sabit bir sistem geneli değeri değildir.
- Rodaj payı **Production Dimension'u büyütür** (Business Dimension değil).
- Bu büyütülmüş ölçü yalnızca Cutting Engine ve Cost Engine içinde kullanılır.
- Operatör hiçbir zaman rodaj eklenmiş ölçüyü görmez.

Örnek: sipariş ölçüsü 450x1800 ise, Left=4, Right=4, Top=5, Bottom=5 rodaj yapılandırmasıyla Production Dimension 458x1810 olur. Operatör ekranlarında 450x1800 görünmeye devam eder.

---

# 11. Loss Classification

> **Detaylı tanımlar ve hesaplama kuralları için bkz. `PRODUCTION_CALCULATION_ENGINE.md` — Bölüm 10: Waste Classification**

GlassOS kayıpları birbirinden ayırır:

| Sınıf             | Kaynak                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Trim Loss         | Full Sheet kenar payından kaynaklanan plaka kaybı                      |
| Grinding Loss     | Rodaj payı nedeniyle tüketilen ek cam alanı                            |
| Optimization Loss | Kesim optimizasyonundaki nesting verimsizliği                          |
| Scrap Loss        | Remnant eşiğini karşılamayan küçük artık parçalar                      |
| Production Loss   | Fiili vs. teorik plaka farkı (operatör bildirimi)                      |
| Breakage Loss     | Kırık ve hasar nedeniyle fabrika maliyetine yazılan kayıp              |
| Quality Loss      | Kalite kontrolden geçemeyen veya yeniden işlenen ürün                  |
| Inventory Loss    | Periyodik sayımda ortaya çıkan stok farkı                              |
| Remnant           | Kesim sonrası yeniden kullanılabilir parça (Dead Stock havuzuna gider) |

Her biri farklı işlem ve maliyet modeline sahiptir. Detaylı hesaplama örnekleri `PRODUCTION_CALCULATION_ENGINE.md` Bölüm 17'dedir.

---

# 12. Special Case: Isıcam

1 m² kare ısıcam ile 1 m² dikdörtgen ısıcam aynı maliyete sahip değildir.

Çünkü:

- Spacer
- Silikon
- Butil

çevre üzerinden tüketilir.

Alan aynı olsa bile çevre farklıdır. Bu nedenle reçete hem alan hem çevre hesabı yapmalıdır. Bu GlassOS'un temel mimari kararlarından biridir.

---

# 13. Unit & Packaging Architecture

GlassOS'ta ölçü birimi ile ambalaj birimi aynı kavram değildir.

Bir malzemenin;

- Satın alma şekli
- Depolanma şekli
- Üretimde tüketilme şekli
- Hurda değerlendirme şekli
- Sevkiyat planlama şekli

birbirinden farklı olabilir.

Bu nedenle GlassOS tek bir "Unit" alanı kullanmayacaktır.

Her ürün kendi Unit Profile'ına sahip olacaktır.

## Measurement Units

Desteklenen temel ölçü birimleri:

- m²
- kg
- metre
- adet
- litre (gerektiğinde)

Bu birimler üretim ve maliyet hesaplarında kullanılır.

## Packaging Units

Desteklenen ambalaj tipleri:

- Plaka
- Boy
- Torba
- Fıçı
- Varil
- Kutu
- Paket

Ambalaj bilgisi stok yönetimi ve satın alma için kullanılır.

Ambalaj hiçbir zaman tüketim birimi değildir.

## Unit Profile

Her malzeme aşağıdaki profili tanımlayabilir.

- Measurement Unit
- Secondary Measurement Unit
- Packaging Unit
- Conversion Rules

## Material Unit Profiles

| Malzeme        | Ana Ölçü Birimi | İkincil Ölçü Birimi | Ambalaj |
| -------------- | --------------- | ------------------- | ------- |
| Float Cam      | m²              | kg                  | Plaka   |
| Temper Cam     | m²              | kg                  | Adet    |
| Isıcam         | m²              | kg                  | Adet    |
| Alüminyum Çıta | metre           | kg                  | Boy     |
| Silikon        | kg              | litre               | Fıçı    |
| Butil          | kg              | litre               | Varil   |
| Nem Alıcı      | kg              | adet                | Torba   |
| Klips          | adet            | -                   | Kutu    |

## Conversion Rules

GlassOS gerektiğinde birimler arasında dönüşüm yapabilir.

Örnekler:

Float Cam

m²

↓

kg

(cam yoğunluğu kullanılarak hesaplanır)

---

Alüminyum Çıta

Boy

↓

Metre

---

Silikon

Fıçı

↓

kg

---

Nem Alıcı

Torba

↓

kg

---

Bu dönüşümler kullanıcı tarafından değiştirilebilen sistem parametreleri olacaktır.

Üreticiye göre farklı ambalajlar tanımlanabileceği özellikle belirtilecek.

## Shipment Calculations

Sevkiyat planlamasında yalnızca adet kullanılmaz.

Araç kapasitesi ağırlık üzerinden hesaplanır.

Örneğin:

Kamyon

7 ton

↓

Hazır Siparişler

↓

Toplam Ağırlık

6.8 ton

↓

Yüklenebilir

veya

8.1 ton

↓

Kapasite Aşıldı

uyarısı verilir.

Bu nedenle tüm mamuller hesaplanabilir ağırlık bilgisine sahip olmalıdır.

## Scrap Management

Hurda satışları m² üzerinden değil kg üzerinden yapılır.

Bu nedenle;

- Float
- Temper
- Isıcam

ürünlerinin ağırlıkları hesaplanabilir olmalıdır.

Hurda yönetimi bu ağırlık bilgisi üzerinden çalışacaktır.

## Architectural Decision

Bu sprintte aşağıdaki mimari karar alınmıştır.

GlassOS hiçbir ürünü tek ölçü birimi ile tanımlamaz.

Her ürün;

- Ölçü Birimi
- İkincil Ölçü Birimi
- Ambalaj Tipi
- Dönüşüm Kuralları

ile birlikte tanımlanacaktır.

Bu yapı;

- Satın Alma
- Stok
- Üretim
- Maliyet
- Hurda
- Sevkiyat

modüllerinin tamamı tarafından ortak kullanılacaktır.

---

# 13. Architectural Decisions

Bu sprint ve devamında alınan mimari kararlar:

- Raw Material ≠ Finished Product
- Recipe üretimin merkezidir.
- **Business Dimension ≠ Production Dimension** (ADR-2026-07-15-01)
- **Trim Factory Configuration'dır; Full Sheet'e uygulanır, sipariş veya cama değil** (ADR-2026-07-15-02)
- **Grinding Factory Configuration'dır; her kenar bağımsız tanımlanır** (ADR-2026-07-15-03)
- **Remnant kararı Factory Configuration eşikleriyle verilir** (ADR-2026-07-15-04)
- **Fire tek tip değildir; 9 ayrı sınıf** (ADR-2026-07-15-05)
- **Full Sheet tüketimi operatör bildirimiyle doğrulanır** (ADR-2026-07-15-06)
- Isıcam maliyetleri yalnızca m² ile hesaplanamaz; çevre bazı zorunludur.
- Consumption Engine alan, çevre, adet ve süre bazında çalışmalıdır.

Tüm kararların ADR ayrıntıları için bkz. `DECISIONS.md`.

## Architecture Decision

Her üretilebilir ürün en az bir aktif üretim reçetesine sahip olmak zorundadır. Reçetesiz ürün üretime gönderilemez.

Isıcam gibi ürünler üretim sırasında reçete üzerinden gerçek cam bileşenlerine ayrılır. Recipe Engine ileriki sprintte geliştirilecektir.

---

# Son

Bu doküman GlassOS'un Product ve Recipe mimarisinin referans kaynağıdır.

**İlgili Dokümanlar:**

- `PRODUCTION_CALCULATION_ENGINE.md` — Hesaplama motorunun tek referansı
- `PRODUCTION_ARCHITECTURE.md` — Üretim akışı ve istasyon mantığı
- `DECISIONS.md` — Tüm ADR kararları
- `DATABASE_ARCHITECTURE.md` — Teknik şema ve veri yapısı
