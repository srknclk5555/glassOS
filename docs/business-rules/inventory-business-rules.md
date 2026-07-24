# Inventory — İş Kuralları (Business Rules)

> **Versiyon:** 1.0  
> **Tarih:** 2026-07-18  
> **Durum:** ✅ Implemented — Inventory modülü canlıda  

---

## 1. Amaç

GlassOS Inventory modülünün iş kurallarını tanımlar. Stok yönetimi, lot takibi, barcode üretimi, transfer ve sayım süreçlerindeki kuralları belirler.

---

## 2. Malzeme Tipi → Envanter Tipi Eşlemesi

```
RAW_MATERIAL       → RAW_MATERIAL
SEMI_FINISHED      → SEMI_FINISHED
FINISHED_GOOD      → FINISHED_PRODUCT
CONSUMABLE         → CONSUMABLE
SPARE_PART         → SPARE_PART
PACKAGING          → PACKAGING
CHEMICAL           → RAW_MATERIAL
SERVICE            → RAW_MATERIAL
OTHER              → RAW_MATERIAL
```

**Kural:** `materials_master.materialType` alanına bağlı olarak `inventory_items.inventoryType` otomatik belirlenir. Servis ve kimyasal türleri hammadde olarak sınıflandırılır.

---

## 3. Lot Numaralandırma Kuralları

### 3.1. İç Lot Numarası (Otomatik)

```
Format: LOT-{YYYYMM}-{SEQ}
Örnek:  LOT-202607-001, LOT-202607-002, ...

{YYYYMM}: Mal kabul ayı
{SEQ}:     O ay o fabrika için 3 haneli sıra
```

### 3.2. Tedarikçi Lot Numarası

- `goods_receipt_items.lotNumber` — isteğe bağlıdır
- Girilirse, aynı tedarikçi lot numarası daha önce kullanılmış mı kontrol edilir
- Uyarı: "Bu lot numarası {date} tarihinde alınmıştı. Devam etmek istiyor musunuz?"

### 3.3. Otomatik Sıra Sıfırlama

- Lot sıra numarası her **ay** sıfırlanır
- `LOT-202607-999`'dan sonra `LOT-202608-001` ile devam eder

---

## 4. Barkod Numaralandırma Kuralları

### 4.1. Varsayılan (Plaka Bazlı Değil)

```
Format: BC-{LOT_NUMARASI}-{SEQ}
Örnek:  BC-LOT-202607-001-001, BC-LOT-202607-002-001

{SEQ}:   Her lot için 3 haneli sıra (genelde 001)
```

### 4.2. Plaka Bazlı

```
Format: BC-{LOT_NUMARASI}-{PLATE_SEQ}
Örnek:  BC-LOT-202607-001-001 (1. plaka)
        BC-LOT-202607-001-002 (2. plaka)
        ...

{PLATE_SEQ}: goods_receipt_plates.plateSerial'den türetilir
             GR-{RECEIPT_NO}-{LINE}-{SEQ} sonundaki {SEQ} kullanılır
```

---

## 5. İşlem Kuralları

### 5.1. Transactional Bütünlük

- **Goods Receipt → Inventory geçişi AYNI TRANSACTION'da olmalıdır**
- Yarım kalmış stok girişi kabul edilemez
- Transaction rollback durumunda hiçbir veri yazılmaz

### 5.2. FIFO Varsayılanı

- Sistem FIFO bazlı çalışır (konfigüre edilebilir)
- Lot bazında `unitCost` immutable'dır — satın alma anındaki maliyet
- Stok çıkışında en eski lot önceliklidir

### 5.3. Stok Çıkışı (Tüketim)

```
Tüketim anında:
1. inventory_lots.remaining_quantity -= quantity
2. remaining_quantity < 0 → HATA
3. remaining_quantity = 0 → inventory_lots.status = 'depleted'
4. inventory_items.quantity -= quantity
```

### 5.4. Negatif Stok

- Varsayılan: **negatif stoka izin verilmez**
- Factory Configuration'da `allowNegativeStock: boolean` ile override edilebilir
- Negatif stok açıldıysa inventory_items.quantity negatif olabilir

---

## 6. Kalite Durumu → Stok Etkisi

| goods_receipt_items.qualityStatus | inventory_items.qualityStatus | Stok miktarı |
|-----------------------------------|-------------------------------|--------------|
| accepted | accepted | quantity |
| conditional | conditional | quantity (uyarı ile) |
| rejected | - | Stok oluşmaz |

**Kural:** `conditional` statüsündeki stok, üretime verilebilir ancak müşteriye sevk edilemez.

---

## 7. Birden Çok Lot Aynı Malzeme

```
Aynı malzeme, farklı lotlar:
→ inventory_items.quantity = toplam miktar (tüm lotlar)
→ Her lot ayrı inventory_lots kaydı
→ Tüketimde FIFO ile lot seçimi
```

**Örnek:**

| Lot | Miktar | Maliyet |
|-----|--------|---------|
| LOT-202607-001 | 100 | 50 TL/adet |
| LOT-202607-002 | 50 | 55 TL/adet |

Toplam stok: 150 adet, ortalama maliyet: 51.67 TL/adet

---

## 8. Transfer Kuralları (Gelecek)

### 8.1. Depolar Arası Transfer

```
Kaynak depo → Hedef depo:
1. Kaynak inventory_items.quantity -= transfer_quantity
2. Hedef inventory_items.quantity += transfer_quantity
3. Hedefte aynı malzeme yoksa yeni inventory_items kaydı oluştur
4. Lot aynen korunur (yeni lot oluşmaz)
5. Transfer logu tutulur
```

### 8.2. Transfer Kısıtlamaları

- Yalnızca aynı tenant içinde
- Yalnızca aynı fabrika içinde
- `faktory[0]` → `faktory[1]` çapraz fabrika transferi ileriki sürümlerde

---

## 9. Sayım Kuralları (Gelecek)

### 9.1. Fiziksel Sayım

```
Sayım başlatıldı:
1. inventory_items.status = 'locked' (sayım süresince kullanılamaz)
2. inventory_count_records tablosuna kaydedilir
3. Fark bulunursa adjustment kaydı oluşturulur
4. Maliyet etkisi: difference * unitCost
```

### 9.2. İade Kuralları

```
Müşteri iadesi durumunda:
1. Yeni goods_receipt kaydı oluşturulur (return type)
2. Lot aynen korunur (original lot)
3. inventory_lots.remaining_quantity += return_quantity
4. inventory_items.quantity += return_quantity
```

---

## 10. Error Handling

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `LOT_ALREADY_EXISTS` | Aynı lot numarası tekrar giriliyor | Uyarı göster, onay al |
| `MATERIAL_NOT_ACTIVE` | materials_master.isActive = false | Uyarı göster, devam edilebilir |
| `INSUFFICIENT_STOCK` | Tüketim için yeterli stok yok | İşlemi engelle (negatif stok kapalıysa) |
| `CONDITIONAL_SHIPMENT` | conditional stok sevk edilmeye çalışılıyor | İşlemi engelle |
| `TRANSACTION_FAILED` | DB hatası | Rollback, kullanıcıya hata göster |
| `DUPLICATE_BARCODE` | Aynı barcode tekrar oluşturuluyor | Sistem hatası — benzersizlik constraint'i |

---

## 11. İzlenebilirlik (Traceability)

Her stok hareketi aşağıdaki zincirle takip edilebilir olmalıdır:

```
Goods Receipt → Inventory → Lot → Barcode → Üretim/Sevkiyat
```

- Her `inventory_lots` kaydının hangi `goods_receipt_items`'den geldiği bilinmelidir
- Her `inventory_barcodes` kaydının hangi `goods_receipt_plates`'den geldiği bilinmelidir
- Tüketim/log kayıtlarında hangi lot'un kullanıldığı belirtilmelidir

---

## 12. Document History

| Tarih | Versiyon | Değişiklik |
|-------|----------|------------|
| 2026-07-18 | 1.0 | İlk sürüm |
