# Contributing to GlassOS

> **Son Güncelleme:** 2026-07-19

---

## 📜 Altın Kural

> **Bir özellik tamamlanmış sayılmaz; ilgili dokümantasyonu da güncellenmişse tamamlanmış kabul edilir.**

Bu kuralın arkasındaki mantık basittir: GlassOS büyüdükçe dokümanların güvenilirliği, kodun güvenilirliği kadar önemli hale gelir. Eğer dokümanlar güncel değilse, yeni geliştiriciler yanlış yönlenir, mimari kararlar unutulur ve sistem zamanla "kör noktalarla" dolar.

**Pratikte bu şu anlama gelir:**

1. Her sprint/özellik tamamlandığında `PLAN.md`'de ilgili sprint bölümü güncellenir.
2. Yeni bir schema/migration eklenmişse ilgili mimari doküman güncellenir.
3. Var olan bir `*_ARCHITECTURE.md` dosyasındaki Document Status tablosundaki "⏳ Pending" değerleri "✅ Implemented" olarak değiştirilir.
4. Keşfedilen hatalar ve çözümleri `talimatlar.md`'ye eklenir.
5. Proje kökündeki `README.md` güncel modül listesini yansıtır.

---

## ✅ Definition of Done

Bir özellik aşağıdaki maddelerin **tamamı** sağlandığında "tamamlandı" kabul edilir:

- [ ] Kod tamamlandı ve derleniyor
- [ ] TypeScript hatası yok (`npm run check-types`)
- [ ] Testler başarılı (`npx turbo test`)
- [ ] Kod incelemesi (PR review) tamamlandı
- [ ] İlgili dokümanlar güncellendi (Altın Kural!)
- [ ] `CHANGELOG.md` güncellendi (gerekliyse)
- [ ] `PLAN.md` güncellendi (gerekliyse)
- [ ] Migration eklendi ve test edildi (gerekliyse)

> **Not:** Bu liste bir PR'ın merge edilebilmesi için asgari gereklilikleri tanımlar. Eksik maddeler varsa PR merge edilmemelidir.

---

## 🚀 Geliştirme Süreci

### 1. Dal (Branch) Stratejisi

- `main` — Kararlı sürüm. Doğrudan commit yapılmaz.
- `feature/<kisa-aciklama>` — Yeni özellikler.
- `fix/<kisa-aciklama>` — Hata düzeltmeleri.
- `docs/<kisa-aciklama>` — Dokümantasyon güncellemeleri.

### 2. Commit Mesajları

```
<tip>(<kapsam>): <kısa açıklama>

<opsiyonel: detaylı açıklama>
```

Tipler: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

Örnek:
```
feat(customers): Teslimat noktaları sekmesi eklendi
docs(customers): CUSTOMER_ARCHITECTURE.md güncellendi
```

### 3. Pull Request Süreci

1. Branch oluştur
2. Değişiklikleri yap
3. Dokümantasyonu güncelle (Altın Kural!)
4. Testleri çalıştır: `npx turbo test`
5. TypeScript kontrolü: `npm run check-types`
6. PR oluştur

### 4. Kod İnceleme Kontrol Listesi

PR göndermeden önce aşağıdaki kontrollerin yapıldığından emin olun:

- [ ] Testler geçiyor (`npx turbo test`)
- [ ] TypeScript hatası yok (`npm run check-types`)
- [ ] Dokümantasyon güncellendi (ilgili `*_ARCHITECTURE.md`, `PLAN.md`, vb.)
- [ ] Audit log mekanizması düşünüldü ve eklendi (gerekliyse)
- [ ] Permission/yetki kontrolü eklendi (gerekliyse)
- [ ] RLS politikası etkileniyorsa migration ile güncellendi
- [ ] Migration gerekiyorsa oluşturuldu ve test edildi
- [ ] Yeni bağımlılık eklendiyse `package.json` güncellendi
- [ ] İyimser kilitleme (optimistic locking / version) kontrol edildi
- [ ] ULID primary key kullanıldı

---

## 📋 Kod Standartları

Detaylı kod standartları için:
- `DATABASE_STANDARDS.md` — Veritabanı şema, migration ve isimlendirme kuralları
- `talimatlar.md` — Kullanım kalıpları ve kod örnekleri
- `packages/typescript-config/` — TypeScript konfigürasyonu

---

## 🧪 Test

```bash
# Tüm testleri çalıştır
npx turbo test

# Tek bir paket için
npx vitest run packages/db/test

# Watch modu
npx vitest
```

Tüm yeni özellikler test içermelidir. Mevcut testleri kırmamaya özen gösterin.

---

## 📚 Dokümantasyon Sorumlulukları

| Durum | Sorumluluk |
|-------|-----------|
| Yeni özellik eklerken | `PLAN.md`, ilgili `*_ARCHITECTURE.md`, `README.md` |
| Schema değişikliği | `DATABASE_BLUEPRINT.md`, migration dosyası |
| Yeni pattern/çözüm | `talimatlar.md` — "Önemli Uyarılar" bölümüne ekle |
| Mimari karar | `DECISIONS.md` — yeni ADR (Architecture Decision Record) kaydı. Yeni tablo, yeni aggregate, yeni pattern veya mevcut mimariyi değiştiren her karar için ADR zorunludur |
| Versiyon değişikliği | `CHANGELOG.md` |

### Modül Bazında Doküman Sahipliği

| Modül | Güncellenmesi Gereken Dokümanlar |
|-------|----------------------------------|
| Customer (Müşteri) | `CUSTOMER_ARCHITECTURE.md`, `README.md`, `talimatlar.md` |
| Orders (Sipariş) | `ORDER_ARCHITECTURE.md`, `PLAN.md`, `README.md` |
| Inventory (Envanter) | `INVENTORY_ARCHITECTURE.md`, `DATABASE_BLUEPRINT.md`, `PLAN.md` |
| Production (Üretim) | `PRODUCTION_ARCHITECTURE.md`, `PLAN.md`, `README.md` |
| Purchasing (Satın Alma) | `PURCHASING_ARCHITECTURE.md`, `PLAN.md` |
| Finance (Finans) | `FINANCE_ARCHITECTURE.md`, `PLAN.md`, `README.md` |
| HR (İK) | `HR_ARCHITECTURE.md`, `PLAN.md` |
| Quality (Kalite) | `QUALITY_ARCHITECTURE.md`, `PLAN.md` |
| Database (Ortak) | `DATABASE_BLUEPRINT.md`, `DATABASE_STANDARDS.md`, migration dosyaları |

Bu tablo, bir modülde değişiklik yapıldığında hangi dokümanların güncellenmesi gerektiğini gösterir. Değişiklik kapsamına göre ek dokümanlar da güncellenebilir.
