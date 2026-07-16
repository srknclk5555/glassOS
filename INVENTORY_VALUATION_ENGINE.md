# INVENTORY_VALUATION_ENGINE — GlassOS Inventory Valuation Engine

> **Sürüm:** 1.0
> **Tarih:** 15 Temmuz 2026
> **Durum:** Implemented (Sprint 2.2) — Mimarisi Dondurulmuş Referans Dokümandır.
> **Yazar:** Architecture Refactoring — Sprint 2.2 Sonrası
> **Bağımlı Dokümanlar:** `PRODUCTION_CALCULATION_ENGINE.md`, `PRODUCT_ARCHITECTURE.md`, `DECISIONS.md`

Bu doküman GlassOS'un stok değerleme motorunun resmi referansıdır.

---

## İçindekiler

1. [Inventory Valuation Philosophy](#1-inventory-valuation-philosophy)
2. [Material Cost Model](#2-material-cost-model)
3. [Purchase Lots](#3-purchase-lots)
4. [Inventory Valuation Methods](#4-inventory-valuation-methods)
5. [Factory Configuration](#5-factory-configuration)
6. [Specific Identification](#6-specific-identification)
7. [Mixed Cost Scenario](#7-mixed-cost-scenario)
8. [Production Cost vs Accounting Cost](#8-production-cost-vs-accounting-cost)
9. [Future Integration](#9-future-integration)

---

## 1. Inventory Valuation Philosophy

Stok değerleme, üretim maliyetinden mantıksal olarak ayrı bir süreçtir. Üretim süreçleri fiziksel tüketimi (m², plaka, kg vb.) tanımlarken, stok değerleme bu tüketimin finansal karşılığını belirler.

GlassOS'ta üç farklı maliyet kavramı bulunur ve bunların birbirinden ayrılması kritik önem taşır:

- **Production Cost:** Fabrika sahasında gerçekleşen, kullanılan malzemelerin stoktaki gerçek veya varsayılan fiyatları üzerinden hesaplanan maliyetidir.
- **Accounting Cost:** Muhasebenin yasal zorunluluklar veya şirket politikası gereği seçtiği yöntem (FIFO, Ortalama vb.) ile hesaplanan maliyettir.
- **Financial Cost:** Üretim maliyetinin yanı sıra finansman giderleri, kur farkları ve amortisman gibi dolaylı giderleri de içeren toplam maliyettir.

GlassOS, üretim kararlarının doğru alınabilmesi için bu maliyet türlerini birbirine karıştırmadan, ayrı katmanlarda hesaplar.

---

## 2. Material Cost Model

Geleneksel ERP sistemlerinin en büyük hatalarından biri, malzeme kartında (Material) sabit bir fiyat tutmalarıdır.

**GlassOS mimarisinde Material kartı fiyat içermez.** Material yalnızca teknik ve fiziksel özelliklerin (kalınlık, tür, yoğunluk vb.) tanımlandığı bir teknik karttır.

Fiyat bilgisi tamamen ayrı bir katmanda yaşar ve zaman içinde değişir. İlişki şu şekildedir:

```
Material (Teknik Kart - Fiyatsız)
   ↓
Inventory Lots (Depodaki Fiziksel Stok Partileri)
   ↓
Purchase Receipts (Satın Alma İrsaliyeleri / Faturaları)
   ↓
Price History (Zaman İçindeki Fiyat Değişimleri)
```

Bu yapı sayesinde aynı malzemenin depoda birden fazla farklı maliyetle bulunabilmesi sağlanır.

---

## 3. Purchase Lots

Her satın alma işlemi, stokta farklı bir maliyet katmanı (Lot) oluşturur. Aynı malzeme (örneğin 6mm Düz Temperlenebilir Cam) farklı zamanlarda farklı fiyatlarla depoya girebilir.

**Örnek Lot Yapısı:**

- **LOT001:** 20 Sheet — 900 TL (Giriş: 01.03.2026)
- **LOT002:** 35 Sheet — 930 TL (Giriş: 15.03.2026)
- **LOT003:** 40 Sheet — 960 TL (Giriş: 01.07.2026)

Stok fiziksel olarak aynı malzemeden oluşsa da, finansal olarak bu üç farklı maliyet katmanından oluşur. Tüketim yapıldığında hangi lot'un kullanıldığı veya hangi yöntemin seçildiği maliyeti doğrudan etkiler.

---

## 4. Inventory Valuation Methods

GlassOS, farklı fabrika ihtiyaçlarını karşılamak üzere aşağıdaki stok değerleme yöntemlerini destekleyecek şekilde tasarlanmıştır:

### FIFO (First-In, First-Out)

- **Avantajı:** Eski fiyatlı stokların önce tüketildiğini varsayarak gerçeğe yakın bir akış sunar. Kalan stok güncel değerine yakındır.
- **Dezavantajı:** Enflasyonist ortamlarda üretim maliyetini düşük, kârı yüksek gösterir.
- **Kullanım Amacı:** Düzenli stok devri olan ve raf ömrü kısıtlı malzemelerde idealdir.
- **Tercih Eden Sektörler:** Gıda, perakende, standart üretim.

### LIFO (Last-In, First-Out)

- **Avantajı:** Güncel (genellikle daha yüksek) fiyatlı stokların önce tüketildiğini varsayarak üretim maliyetini güncel tutar, vergi avantajı sağlayabilir.
- **Dezavantajı:** Kalan stok değeri eski ve gerçekçi olmayan fiyatlarla bilançoda kalır. Çoğu ülkede UFRS'ye göre yasaklanmıştır.
- **Kullanım Amacı:** Enflasyonun yüksek olduğu ve güncel maliyetin üretimde görülmek istendiği durumlar.
- **Tercih Eden Sektörler:** Ağır sanayi, hammadde yoğun sektörler (yerel mevzuat izin verirse).

### Moving Average (Hareketli Ortalama)

- **Avantajı:** Her yeni satın almada ortalama maliyeti güncelleyerek dalgalanmaları yumuşatır.
- **Dezavantajı:** Sürekli hesaplama gerektirir ve tekil parti maliyetlerinin izlenebilirliğini zorlaştırır.
- **Kullanım Amacı:** Fiyatların sürekli değiştiği, lot takibinin zor olduğu sürekli üretim hatları.
- **Tercih Eden Sektörler:** Kimya, petrol, dökme malzeme üretenler.

### Weighted Average (Ağırlıklı Ortalama)

- **Avantajı:** Belirli bir dönem sonundaki toplam maliyetin toplam miktara bölünmesiyle hesaplanır. Uygulaması basittir.
- **Dezavantajı:** Dönem içi anlık maliyet analizini engeller, geriye dönük düzeltmeler gerektirir.
- **Kullanım Amacı:** Dönemsel maliyet raporlaması yapan işletmeler.
- **Tercih Eden Sektörler:** Tekstil, seri üretim, geleneksel imalat.

### Specific Identification (Gerçek Parti Maliyeti)

- **Avantajı:** Hangi plakanın kullanıldığı tam olarak bilindiği için maliyet %100 kesindir. Hata payı yoktur.
- **Dezavantajı:** Her plakanın veya partinin barkod/RFID ile fiziksel olarak tek tek takip edilmesini gerektirir. Sıkı saha disiplini ister.
- **Kullanım Amacı:** Yüksek değerli, tekil takibi yapılabilen hammadde kullanılan üretimler.
- **Tercih Eden Sektörler:** Cam sektörü (jumbo plakalar), otomotiv, havacılık.

### Last Purchase Cost (Son Satın Alma Maliyeti)

- **Avantajı:** Tüketilen malzemenin maliyetini her zaman en son alınan fiyata göre hesaplar. Güncel piyasa durumunu anında yansıtır.
- **Dezavantajı:** Depodaki ucuz/eski stokların varlığını yoksayar. Finansal muhasebe ile uyuşmaz.
- **Kullanım Amacı:** Satış fiyatı belirlerken yerine koyma maliyetine yakın bir referans arandığında.
- **Tercih Eden Sektörler:** Hızlı fiyat değiştiren ticaret şirketleri.

### Standard Cost (Standart Maliyet)

- **Avantajı:** Yönetim tarafından belirlenen sabit bir maliyet kullanılır. Bütçe ve fiili maliyet sapmalarını (variance) ölçmek kolaydır.
- **Dezavantajı:** Gerçek piyasa koşullarından kopuktur. Sık sık güncellenmesi gerekir.
- **Kullanım Amacı:** Planlama ve bütçeleme süreçlerinin sıkı olduğu yapılar.
- **Tercih Eden Sektörler:** Beyaz eşya, seri otomotiv parçaları.

### Replacement Cost (Yerine Koyma Maliyeti)

- **Avantajı:** Stoğun mevcut defter değerini değil, bugün alınsa kaça alınacağını gösterir. Gelecek odaklı fiyatlama için mükemmeldir.
- **Dezavantajı:** Piyasadan sürekli güncel fiyat beslemesi gerektirir, yasal muhasebede kullanılamaz.
- **Kullanım Amacı:** Enflasyonist kriz ortamlarında veya emtia borsasına bağlı ürünlerde fiyatlama.
- **Tercih Eden Sektörler:** Kuyumculuk, kablo (bakır), inşaat demiri.

### Manual Cost (Manuel Maliyet)

- **Avantajı:** Sistemin yetersiz kaldığı ekstrem durumlarda maliyetin yetkili tarafından elle girilmesine olanak tanır.
- **Dezavantajı:** İzlenebilirlik kaybolur, insan hatasına ve suistimale açıktır.
- **Kullanım Amacı:** Geçiş dönemleri, veri aktarım hatalarının düzeltilmesi veya numune/bedelsiz ürünler.
- **Tercih Eden Sektörler:** Yazılım geçişi (onboarding) yapan tüm firmalar.

---

## 5. Factory Configuration

Her fabrikanın finansal yapısı ve raporlama ihtiyaçları farklıdır. Bu nedenle stok değerleme yöntemi, Factory Configuration üzerinden fabrika (tenant) bazında seçilebilir olmalıdır.

Bu değer veri katmanında `settings.factory_configuration.inventoryValuationMethod` alanı üzerinden saklanır. Factory Configuration modeli versioned ve gruplandırılmış bir JSON yapısı olarak tutulur; stok değerleme ayarları `inventoryConfiguration` altında kapsüllenmiştir.

**Örnek Konfigürasyon Ekranı Çıktısı:**

```
Inventory Valuation Method (Fabrika Ayarları)
○ FIFO
○ LIFO
○ Moving Average
○ Weighted Average
◉ Specific Identification (Varsayılan Öneri)
○ Last Purchase
○ Standard Cost
○ Replacement Cost
○ Manual
```

Bu seçim, Cost Engine'in tüketilen hammaddenin parasal değerini nasıl hesaplayacağını doğrudan belirler.

---

## 6. Specific Identification

**Specific Identification yöntemi, GlassOS'un önerilen varsayılan değerleme yöntemidir.**

Cam üretiminde (özellikle jumbo float camlarda) plakalar oldukça değerlidir ve sayıca azdır (binlerce küçük cıvata gibi değildir). GlassOS'un uzun vadeli mimarisi, barkodlu plaka sistemini (lot ve plaka seviyesinde izlenebilirlik) varsayar.

**Örnek İzlenebilirlik:**

- **PLK000001** — Maliyet: 900 TL (LOT001'den)
- **PLK000002** — Maliyet: 900 TL (LOT001'den)
- **PLK000003** — Maliyet: 960 TL (LOT003'ten)

Eğer operatör sahada kesim için PLK000003 barkodunu okutursa, sistemin FIFO veya Ortalama maliyet hesaplamasına gerek kalmaz. Gerçek maliyet o plakanın alındığı andaki kesin değer olan 960 TL üzerinden hesaplanır. Bu, ERP'lerin varsayımsal maliyetlerine karşı MES sisteminin kesin gerçekliğini yansıtır.

---

## 7. Mixed Cost Scenario

Üretim sırasında birden fazla lot'tan malzeme kullanıldığında maliyet hesaplaması seçilen yönteme göre dramatik farklılıklar gösterir.

**Senaryo:**
Bir sipariş için 20 plaka kullanılacaktır. Barkod okutma (Specific Identification) sonuçlarına göre:

- 12 plaka **LOT001**'den (Birim: 900 TL)
- 8 plaka **LOT003**'ten (Birim: 960 TL)

**Specific Identification (Gerçek Kesin Maliyet):**

```
(12 × 900 TL) + (8 × 960 TL) = 10,800 + 7,680 = 18,480 TL
```

**Yöntem Farklılıklarının Etkisi (Karşılaştırma):**

Eğer fabrika **FIFO** kullanıyor olsaydı ve LOT001 ile LOT002'de sırasıyla 20 ve 35 plaka bulunsaydı:
Sistem ilk girenleri tüketeceği için 20 plakanın tamamını LOT001'den (900 TL) düşecekti.
Maliyet: 20 × 900 = **18,000 TL** (Gerçekten 480 TL düşük)

Eğer fabrika **Last Purchase Cost** (Son Alış) kullanıyor olsaydı (Son fiyat 960 TL):
Maliyet: 20 × 960 = **19,200 TL** (Gerçekten 720 TL yüksek)

Bu senaryo, değerleme yönteminin aynı miktar hammadde tüketiminde bile maliyeti ve kârlılığı nasıl değiştirebildiğini açıkça göstermektedir.

---

## 8. Production Cost vs Accounting Cost

Bu iki değerin birbirinden farklı olabileceği GlassOS mimarisinin temel kabulüdür.

**Production Cost:**
Gerçek sahada kullanılan plakalara (Specific Identification ile) veya güncel yerine koyma maliyetlerine göre hesaplanan, işletme yönetiminin fiyatlama ve kârlılık kararları için kullandığı operasyonel maliyettir.

**Accounting Cost:**
Muhasebe departmanının vergi dairesine bildirdiği ve yasal olarak seçtiği (örneğin hareketli ortalama) yöntemle hesaplanan resmî maliyettir.

**Örnek Fark:**

- **Production Cost:** 18,480 TL (Gerçekten kullanılan plakaların toplam bedeli)
- **Accounting Cost:** 18,900 TL (Hareketli ortalamaya göre hesaplanan yasal stok düşümü)
- **Difference:** 420 TL

Yönetim raporlarında Production Cost baz alınırken, resmî entegrasyonlarda (ERP aktarımı) Accounting Cost kullanılabilir. GlassOS, bu "Difference" değerini şeffaf biçimde raporlar.

---

## 9. Future Integration

Inventory Valuation Engine, ilerleyen fazlarda GlassOS'un diğer motorlarıyla derinlemesine entegre çalışacaktır:

- **Production Calculation Engine:** Fiziksel tüketim (m², adet) miktarını belirleyip Inventory Engine'e bildirecek.
- **Inventory Engine:** Tüketilen miktarı, seçili Factory Configuration değerleme yöntemiyle (veya Specific Identification barkodlarıyla) eşleştirip finansal değeri bulacak.
- **Cost Engine:** Bulunan bu hammadde finansal değerini, işçilik, enerji, ardiye, fire (Trim/Grinding) ve diğer genel giderlerle toplayarak nihai üretim maliyetini oluşturacak.
- **Financial Reports & Profitability Engine:** Satış fiyatından bu nihai üretim maliyetini çıkararak gerçek zamanlı sipariş/müşteri/ürün kârlılık analizlerini (Profitability) yönetecek.

Bu motorların uyumlu çalışması, GlassOS'u sıradan bir MES olmaktan çıkarıp gerçek bir Production Intelligence Platform'a dönüştürecektir.
