# GlassOS Security Policy

**Version:** 1.0
**Status:** Living Document
**Last Updated:** 2026-07-14

---

> **Bu doküman yaşayan bir güvenlik politikasıdır.**
>
> Güncellemeler yalnızca doğrulanmış güvenlik değişiklikleri sonrasında yapılmalıdır.
> Planlanan özellikler veya varsayımlar bu dokümana eklenmemelidir.

## 1. Amaç

GlassOS çok kiracılı (multi-tenant) bir üretim yönetim platformudur. Bu doküman;

- veri güvenliği
- tenant izolasyonu
- kullanıcı yetkilendirmesi
- saldırı yüzeyinin azaltılması
- güvenli geliştirme standartları

konularında tek referans kaynağıdır. Yaşayan bir dokümandır; her güvenlik kararı burada kayıt altına alınır.

---

## 2. Güvenlik Felsefesi

**✅ Zero Trust**
Hiçbir kullanıcıya varsayılan güven verilmez. Her istek yeniden doğrulanır.

**✅ Least Privilege**
Her kullanıcı yalnızca ihtiyacı kadar yetkiye sahip olur.

**✅ Defense in Depth**
Tek katman güvenlik yeterli kabul edilmez. Kimlik doğrulama, yetkilendirme, RLS, audit ve rate limit birlikte çalışır.

**✅ Fail Secure**
Bir doğrulama başarısız olursa "sistemi aç" değil, "erişimi engelle" mantığı uygulanır.

---

## 3. Threat Model (Tehdit Modeli)

Bu bölüm GlassOS'un çok kiracılı yapısına özgü tehditleri ve mevcut/planlanan mitigasyon durumunu listeler. Aşağıdaki tablo Bölüm 4-19'daki kontrollerin _hangi tehdide karşılık geldiğini_ gösterir; durum sütunu iddia değil, o an itibarıyla gerçekten doğrulanmış olan seviyeyi yansıtmalıdır.

| Tehdit                                                        | Risk      | Durum                                                               |
| ------------------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| Cross-Tenant Veri Sızıntısı                                   | 🔴 Kritik | ✅ Doğrulandı (Sprint 2.2 + Sprint 2.6.4 RLS)                       |
| IDOR (Başka tenant kaydı açma/değiştirme)                     | 🔴 Kritik | ✅ Doğrulandı (Sprint 2.2 + Sprint 2.6.4 RLS)                       |
| Privilege Escalation                                          | 🔴 Kritik | ✅ Doğrulandı (Sprint 2.2)                                          |
| Yanlış Konfigürasyon (ör. RLS session context set edilmemesi) | 🔴 Kritik | ✅ Doğrulandı (Sprint 2.6.4A — tenant context yoksa explicit error) |
| SQL Injection                                                 | 🟢 Düşük  | ORM ile korunuyor (raw SQL noktaları ayrıca review edilir)          |
| XSS                                                           | 🟡 Orta   | React + Sanitization                                                |
| CSRF                                                          | 🟢 Düşük  | Auth.js                                                             |
| Session Hijacking                                             | 🟡 Orta   | Cookie hardening (`HttpOnly`, `Secure`, `SameSite`)                 |
| Brute Force Login                                             | 🟡 Orta   | Rate Limiting (planlandı)                                           |
| DDoS                                                          | 🟡 Orta   | Cloudflare (planlandı)                                              |
| Dependency Vulnerability                                      | 🟡 Orta   | `npm audit`                                                         |

**Not:** "Risk" sütunu tehdidin GlassOS için olası etkisini/olasılığını yansıtır; "Durum" sütunu şu anki mitigasyon seviyesini yansıtır. Bir tehdidin durumu yalnızca kod veya test ile kanıtlandığında "✅ Doğrulandı" olarak güncellenmelidir — planlanan veya varsayılan bir korumaya dayanarak değil.

---

## 4. Güvenlik Katmanları

| Katman                  | Durum | Açıklama                         |
| ----------------------- | ----- | -------------------------------- |
| Authentication          | ✅    | Auth.js                          |
| Authorization           | ✅    | RBAC                             |
| Tenant Isolation        | ✅    | Verified (Sprint 2.2)            |
| PostgreSQL RLS          | ✅    | Verified (glassos_app)           |
| Audit Log               | ✅    | Aktif                            |
| Runtime Role Separation | ✅    | glassos_app (rolbypassrls=false) |
| Acceptance Test         | ✅    | Sprint 2.2 PASS                  |
| HTTPS                   | ✅    | Production                       |
| SQL Injection           | ✅    | ORM                              |
| XSS                     | ✅    | React                            |
| CSRF                    | ✅    | Auth.js                          |
| Rate Limit              | ⏳    | Planlandı                        |
| DDoS                    | ⏳    | Cloudflare                       |
| Security Headers        | ⏳    | Planlandı                        |
| CSP                     | ⏳    | Planlandı                        |
| Secrets Management      | ✅    | .env                             |
| Dependency Scan         | ⏳    | Planlandı                        |

---

## 5. Authentication

- Auth.js kullanılır.
- Şifreler hiçbir zaman düz metin tutulmaz.
- Session cookie: `HttpOnly`, `Secure`, `SameSite` olarak yapılandırılır.
- JWT yalnızca gerekli bilgileri içerir.

---

## 6. Authorization

Rol bazlı yetkilendirme uygulanır. Roller:

- Super Admin
- Tenant Admin
- Factory Manager
- Office
- Operator
- Driver
- Customer

İleride permission tabanlı yapıya (örn. `customers.read`, `customers.write`) geçilecektir.

---

## 7. Tenant Isolation

- Her kayıt `tenant_id` ve `factory_id` alanlarına sahip olur.
- Hiçbir sorgu tenant filtresi olmadan çalışmamalıdır.
- Tenant izolasyonu uygulama katmanına güvenmeden, veritabanı tarafından sağlanır.
- ✅ **Sprint 2.2 Durumu:** Cross-Tenant Isolation başarıyla doğrulanmıştır.
- ✅ **Sprint 2.6.4 Durumu:** RLS ile defense in depth — 52 tabloda veritabanı seviyesinde tenant izolasyonu aktif.

---

## 8. PostgreSQL Row Level Security

- RLS zorunludur. Hiçbir tablo production ortamında RLS olmadan çalıştırılamaz.
- Her policy tenant bazlı çalışmalıdır.
- ✅ **Sprint 2.2 Durumu:** Runtime Role Separation (`glassos_app` rolü ile `rolbypassrls=false`) başarılı bir şekilde uygulanmış ve doğrulanmıştır.
- ✅ **Sprint 2.6.4 Durumu:** 52 tabloda RLS aktifleştirilmiş, politikalar oluşturulmuş ve test edilmiştir.

### 8.1. Korunan Tablolar (52)

| Politika Deseni                      | Tablo Sayısı | Açıklama                                                               |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------- |
| **Direct tenant_id**                 | 23           | `tenant_id = current_setting('app.current_tenant_id', true)::char(26)` |
| **EXISTS subquery (owned)**          | 26           | Child tablo → parent → tenant_id zinciri                               |
| **EXISTS subquery (factory-scoped)** | 3            | Factory → tenant via factories tablosu                                 |

### 8.2. Politika Standartları

- **Session değişkeni:** Yalnızca `app.current_tenant_id` kullanılır. `app.current_user_role` KULLANILMAZ.
- **FOR ALL:** Tek politika ile SELECT, INSERT, UPDATE, DELETE korunur.
- **İsimlendirme:** `tenant_isolation_{table_name}`
- **FORCE ROW LEVEL SECURITY:** Tüm tenant-scoped tablolarda `ALTER TABLE ... FORCE ROW LEVEL SECURITY` uygulanır. Bu, tablo sahibinin (`glassos_owner`) bile RLS'yi atlamasını engeller.
- **WITH CHECK:** Tüm politikalarda explicit `WITH CHECK` ifadesi bulunur. INSERT/UPDATE işlemlerinde tenant izolasyonu politikayı atlayarak veri yazılamaz.
- **Application rolü:** `glassos_app` (`NOBYPASSRLS`) — RLS zorunludur.
- **Migration rolü:** `glassos_owner` — RLS'den muaftır (FORCE RLS bu muafiyeti kaldırır).

### 8.3. Global Tablolar (RLS Yok — 5)

`tenants`, `roles`, `permissions`, `role_permissions`, `user_sessions`

Bu tablolar tüm tenantlar tarafından paylaşılır. RLS uygulanması chicken-and-egg sorunu yaratır.

### 8.4. Session Context

```sql
-- withTenantSession() tarafından her transaction başlangıcında çağrılır:
SELECT set_config('app.current_tenant_id', ${tenantId}, true);
-- 3. parametre (true) = LOCAL scope — sadece bu transaction'da geçerli

-- RLS politikaları tarafından kullanılır:
current_setting('app.current_tenant_id', true)::char(26)
-- 2. parametre (true) = gerekli değil — NULL dönebilir
```

### 8.5. Defense in Depth

| Katman                           | Koruma               | Atlatılırsa                |
| -------------------------------- | -------------------- | -------------------------- |
| **JWT Authentication**           | Token doğrulama      | Yetkisiz erişim engellenir |
| **RBAC Authorization**           | Rol bazlı yetki      | Minimum rol kontrolü       |
| **Repository WHERE tenant_id=?** | Uygulama katmanı     | ❌ Açık                    |
| **RLS (Sprint 2.6.4)**           | Veritabanı katmanı   | ✅ Hala korur              |
| **Audit Log**                    | Tüm işlemler kayıtlı | Tespit + forensic          |

---

## 9. SQL Injection

- Tüm sorgular Drizzle ORM üzerinden çalışır.
- Raw SQL yalnızca zorunlu durumlarda kullanılır.
- Raw SQL kullanılan her nokta code review'dan geçmek zorundadır.

---

## 10. XSS

- React'in otomatik escaping'i kullanılır.
- `dangerouslySetInnerHTML` yasaktır.
- HTML gerekiyorsa sanitize edilir.

---

## 11. CSRF

- Auth.js korumaları kullanılır.
- State değiştiren tüm işlemler kimlik doğrulaması gerektirir.

---

## 12. Rate Limiting

Planlanan. Login, API ve dosya yükleme gibi kritik endpoint'lerde uygulanacaktır.

---

## 13. Audit Log

Aşağıdaki işlemler kayıt altına alınır:

- Login / Logout
- Customer
- Order
- GlassPiece
- Production
- Settings
- User
- Permission

Audit kayıtları silinmez.

---

## 14. File Security

Henüz aktif değil. Planlanan kontroller:

- MIME doğrulama
- Magic byte kontrolü
- Maksimum boyut
- Virüs taraması
- Dosya adı temizleme

---

## 15. API Security

- Tüm API'ler authentication ve authorization kontrolünden geçmelidir.
- Hiçbir endpoint anonim yazma izni vermemelidir.

---

## 16. Secrets Management

- `.env` dosyaları Git'e eklenmez.
- Production secret'ları repository içinde tutulamaz.

---

## 17. Logging

Şunlar loglanmaz:

- ❌ Şifre
- ❌ JWT
- ❌ Cookie
- ❌ Secret Key
- ❌ Connection String

---

## 18. Backup

- Production veritabanı otomatik yedeklenir.
- Backup geri dönüş testi periyodik olarak yapılır.

---

## 19. Dependency Security

- Her release öncesi `npm audit` çalıştırılır.
- Kritik açıklar kapatılmadan release yapılmaz.

---

## 20. Penetration Testing

- Production öncesi OWASP Top 10 kontrolleri uygulanır.
- Kritik bulgular kapatılmadan yayın yapılmaz.

---

## 21. Güvenlik Backlog

### Sprint 2.1

- [ ] RLS Session Context doğrulaması
- [ ] Cross-tenant testi
- [ ] DB rol kontrolü
- [ ] `BYPASSRLS` doğrulaması

### Faz 1

- [ ] Rate limiting
- [ ] Security headers
- [ ] CSP
- [ ] Dependency scan
- [ ] Session hardening

### Faz 2

- [ ] Pentest
- [ ] Load test
- [ ] Secret rotation
- [ ] Backup restore test
- [ ] OWASP ASVS kontrolü

---

## 22. Security Checklist (Her Sprint Sonunda)

- [ ] Build başarılı
- [ ] Type check başarılı
- [ ] Migration başarılı
- [ ] RLS doğrulandı
- [ ] Audit log çalışıyor
- [ ] Yeni endpoint yetki kontrolünden geçiyor
- [ ] Doküman güncellendi

---

## 23. Security Decision Record

Her kritik güvenlik kararı `DECISIONS.md` dosyasında ADR olarak kayıt altına alınır. Bu dosya (`SECURITY.md`) yalnızca uygulanan güvenlik politikalarını içerir.

---

_GlassOS Security Policy yaşayan bir dokümandır. Hiçbir güvenlik kararı sözlü bırakılmaz. Her değişiklik bu dokümana yansıtılır._
