# GlassOS — Kullanım Talimatları

> **Versiyon:** Sprint 2.10.0  
> **Tarih:** 2026-07-19  
> **Amaç:** GlassOS monorepo projesinde sık kullanılan kalıpların örneklerle açıklanması.

---

## 📋 İçindekiler

1. [Proje Mimarisi](#1-proje-mimarisi)
2. [Kurulum ve Çalıştırma](#2-kurulum-ve-çalıştırma)
3. [Veritabanı İşlemleri](#3-veritabanı-işlemleri)
4. [Transaction Pattern (withTenantSession)](#4-transaction-pattern-withtenantsession)
5. [Repository Pattern](#5-repository-pattern)
6. [Service Layer Pattern](#6-service-layer-pattern)
7. [Server Actions Pattern](#7-server-actions-pattern)
8. [UI Bileşenleri](#8-ui-bileşenleri)
9. [Çoklu Dil Desteği (i18n)](#9-çoklu-dil-desteği-i18n)
10. [Yetkilendirme ve RLS](#10-yetkilendirme-ve-rls)
11. [Hata Yönetimi](#11-hata-yönetimi)
12. [Önemli Uyarılar](#12-önemli-uyarılar)

---

## 1. Proje Mimarisi

GlassOS, **Turborepo** ile yönetilen bir monorepo'dur.

```
glassos/
├── apps/                          # Uygulamalar
│   ├── web/                       # Next.js 15 (App Router) — Ana web uygulaması
│   └── api/                       # Hono REST API (port 3001)
├── packages/                      # Paylaşılan paketler
│   ├── db/                        # @repo/db — Drizzle ORM, şema, repository, servis
│   ├── types/                     # @repo/types — Zod şemaları ve TypeScript tipleri
│   ├── ui/                        # @repo/ui — React bileşen kütüphanesi
│   ├── engine/                    # @repo/engine — Domain hesaplama motoru
│   ├── eslint-config/             # ESLint konfigürasyonları
│   └── typescript-config/         # tsconfig preset'leri
├── turbo.json                     # Turbo pipeline
└── package.json                   # Root package.json
```

---

## 2. Kurulum ve Çalıştırma

### 2.1. Bağımlılıkları Yükleme

```bash
npm install
```

### 2.2. Geliştirme Ortamı

Tüm projeyi aynı anda çalıştırma:

```bash
npm run dev
```

Sadece web uygulamasını çalıştırma:

```bash
npm run dev --filter=web
```

### 2.3. Build Alma

```bash
npm run build
```

### 2.4. TypeScript Kontrolü

```bash
npm run check-types

# Tek bir paket için:
npx tsc --noEmit --project apps/web/tsconfig.json
```

### 2.5. Çevre Değişkenleri

`apps/web/.env.local`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/glassos
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

---

## 3. Veritabanı İşlemleri

### 3.1. Migration Oluşturma

```bash
cd packages/db
npx drizzle-kit generate
```

### 3.2. Migration Uygulama

```bash
npx drizzle-kit migrate
```

### 3.3. Seed Data Çalıştırma

```bash
npx tsx packages/db/src/seed/run.ts
```

### 3.4. Temel Sorgular

**SELECT — Tüm müşterileri listeleme:**

```typescript
import { db, customers } from "@repo/db";
import { eq } from "drizzle-orm";

const result = await db
  .select()
  .from(customers)
  .where(eq(customers.tenantId, "01ABCD..."));
```

**INSERT — Yeni kayıt ekleme:**

```typescript
const inserted = await db.insert(customers).values({
  id: generateULID(),
  tenantId: "01ABCD...",
  customerCode: "MUS-001",
  name: "Müşteri A.Ş.",
  isActive: true,
  version: 1,
  updatedAt: new Date(),
}).returning({ id: customers.id });
```

**UPDATE — Güncelleme:**

```typescript
await db.update(customers)
  .set({ name: "Yeni İsim", updatedAt: new Date(), version: sql`version + 1` })
  .where(eq(customers.id, "01ABCD..."));
```

**DELETE — Soft delete:**

```typescript
await db.update(customers)
  .set({ deletedAt: new Date(), deletedBy: "user-id" })
  .where(eq(customers.id, "01ABCD..."));
```

### 3.5. İlişkili Sorgular (Drizzle Relations)

> **⚠️ ÖNEMLİ:** Relations kullanabilmek için drizzle instance'ına `schema` parametresinde **hem tablolar hem relations** birlikte verilmelidir. Aksi halde `TypeError: Cannot read properties of undefined (reading 'referencedTable')` hatası alınırsınız.

**Doğru kullanım (`packages/db/src/index.ts`):**

```typescript
import * as schemaTables from "./schema/index";
import { relationsMap } from "./db/relations";

const schema = {
  ...schemaTables,
  ...Object.fromEntries(
    Object.entries(relationsMap).map(([k, v]) => [`${k}Relations`, v])
  ),
};

export const db = drizzle(client, { schema });
```

**Relation ile veri çekme:**

```typescript
const customer = await db.query.customers.findFirst({
  where: eq(customers.id, "01ABCD..."),
  with: {
    contacts: true,           // Birincil ilişkiler
    deliveryPoints: true,
    glassCatalog: true,
    instructions: {           // İç içe (nested) ilişkiler
      with: { conditions: true },
    },
  },
});
```

**Tüm müşterileri contacts ve siparişleriyle listeleme:**

```typescript
const customersWithData = await db.query.customers.findMany({
  where: and(
    eq(customers.tenantId, session.tenantId),
    isNull(customers.deletedAt)
  ),
  with: {
    contacts: {
      where: eq(customerContacts.isPrimary, true),
      limit: 1,
    },
    orders: {
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 5,
    },
  },
});
```

---

## 4. Transaction Pattern (withTenantSession)

Tüm veritabanı mutasyonları **transaction** içinde yapılmalıdır. GlassOS, RLS (Row-Level Security) ile çalışan özel bir transaction wrapper kullanır.

### 4.1. Server Action İçinde Kullanım

```typescript
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";

export async function updateCustomerAction(input: unknown) {
  const session = await requireSession();

  return await withTenantSession(session, async (tx: any) => {
    // tx — transaction'a bağlı drizzle instance
    // Tüm sorgular transaction içinde çalışır
    // RLS otomatik olarak uygulanır

    const result = await tx.update(customers)
      .set({ name: "Yeni İsim", updatedAt: new Date() })
      .where(eq(customers.id, "01ABCD..."))
      .returning();

    return result;
  });
}
```

### 4.2. Service Katmanında Kullanım

```typescript
class CustomerService {
  async findById(id: string): Promise<Customer | null> {
    return withTenantSession(async (tx, ctx) => {
      // ctx.tenantId, ctx.userId vb. otomatik gelir
      return this.repository.findById(id, tx);
    }, { db: { client } });
  }
}
```

### 4.3. Birden Çok İşlem (Atomik)

```typescript
return await withTenantSession(session, async (tx: any) => {
  // 1. Müşteri oluştur
  const [customer] = await tx.insert(customers).values({ ... }).returning();

  // 2. Varsayılan iletişim noktası oluştur
  await tx.insert(deliveryPoints).values({
    customerId: customer.id,
    name: "Merkez",
    isDefault: true,
    ...
  });

  // 3. Audit log yaz
  await auditLog(tx, {
    tenantId: session.user.tenantId,
    changedBy: session.user.id,
    tableName: "customers",
    recordId: customer.id,
    operation: "create",
    afterValue: { customerCode: "MUS-001" },
  });

  // Tüm işlemler başarılı → commit
  // Herhangi biri hata verirse → otomatik rollback
  return customer;
});
```

### 4.4. Performans Loglama

```typescript
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

export async function getCustomersAction() {
  const tStart = perfStart("[getCustomersAction]");
  perfLog("[getCustomersAction]", "Başladı", Date.now());

  const res = await withTenantSession(session, async (tx: any) => {
    // ... sorgular
  });

  perfEnd("[getCustomersAction]", tStart);
  return res;
}
```

---

## 5. Repository Pattern

### 5.1. BaseRepository Kullanımı

```typescript
import { BaseRepository } from "@repo/db";

class CustomerRepository extends BaseRepository<typeof customers.$inferSelect> {
  constructor() {
    super(customers); // Hangi tablo olduğunu belirt
  }

  // Domain-specific metodlar
  async findByCode(code: string, tx?: any) {
    const db = this.getDb(tx);
    return db.select().from(customers)
      .where(eq(customers.customerCode, code))
      .then(rows => rows[0] ?? null);
  }

  async findActiveCustomers(tx?: any) {
    const db = this.getDb(tx);
    return db.select().from(customers)
      .where(and(
        eq(customers.isActive, true),
        isNull(customers.deletedAt)
      ));
  }
}
```

### 5.2. Transaction İçinde Repository Kullanımı

```typescript
await withTenantSession(session, async (tx: any) => {
  // tx'i repository'ye geçirerek transaction'a dahil et
  const customer = await customerRepository.findById(id, tx);
  const contacts = await customerContactRepository.findByCustomerId(id, tx);
});
```

---

## 6. Service Layer Pattern

### 6.1. Service Tanımlama

```typescript
class CustomerService {
  constructor(
    private repository: CustomerRepository,
    private eventPublisher: EventPublisher,
    private db: DatabaseClient
  ) {}

  async create(data: CreateCustomerInput): Promise<Customer> {
    const events: DomainEvent[] = [];

    const result = await withTenantSession(async (tx, ctx) => {
      // İş mantığı
      const existing = await this.repository.findByCode(data.code, tx);
      if (existing) throw new Error("Bu kod zaten kullanılıyor");

      const customer = await this.repository.create(data, tx);

      events.push(new CustomerCreatedEvent({
        tenantId: ctx.tenantId,
        customerId: customer.id,
      }));

      return customer;
    }, { db: { client: this.db } });

    // Event'ler transaction dışında publish edilir
    await this.eventPublisher.publishMany(events);

    return result;
  }
}
```

### 6.2. Service'leri Birleştirme (createServices)

```typescript
import { createServices } from "@repo/db";

const svc = createServices(db, eventPublisher);

// Servislere doğrudan erişim:
const customer = await svc.customerService.findById(id);
const order = await svc.orderService.approve(orderId);
```

---

## 7. Server Actions Pattern

### 7.1. Temel Server Action Yapısı

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { customers } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { createCustomerSchemaV2 } from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";

export async function createCustomerAction(input: unknown) {
  // 1. Session kontrolü
  const session = await requireSession();

  // 2. Yetki kontrolü
  await ensurePermission("customers:write");

  // 3. Zod ile validasyon
  const parsed = createCustomerSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Geçersiz veri");

  // 4. Transaction içinde işlem
  const result = await withTenantSession(session, async (tx: any) => {
    // ... veritabanı işlemleri
  });

  // 5. Cache'i temizle
  revalidatePath("/customers");

  return result;
}
```

### 7.2. Liste + Filtreleme + Sayfalama

```typescript
export async function getCustomersAction(filters?: {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const session = await requireSession();

  return await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(customers.tenantId, session.user.tenantId),
      sql`${customers.deletedAt} IS NULL`,
    ];

    // Arama
    if (filters?.search) {
      conditions.push(
        or(
          like(customers.name, `%${filters.search}%`),
          like(customers.customerCode, `%${filters.search}%`),
        )
      );
    }

    const where = and(...conditions);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;

    // Sayfalı sorgu
    const items = await tx.select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Toplam sayı
    const [totalRow] = await tx.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(where);

    return {
      items,
      total: Number(totalRow?.count ?? 0),
      page,
      pageSize,
      totalPages: Math.ceil(Number(totalRow?.count ?? 0) / pageSize),
    };
  });
}
```

### 7.3. Sub-Entity CRUD (Örn: İletişim Kişileri)

```typescript
export async function createCustomerContactAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createCustomerContactSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Geçersiz iletişim bilgisi");

  return await withTenantSession(session, async (tx: any) => {
    // Müşterinin bu tenant'a ait olduğunu doğrula
    const customer = await tx.query.customers.findFirst({
      where: and(
        eq(customers.id, parsed.data.customerId),
        eq(customers.tenantId, session.user.tenantId),
      ),
    });
    if (!customer) throw new Error("Müşteri bulunamadı");

    const [contact] = await tx.insert(customerContacts)
      .values({
        id: generateULID(),
        customerId: parsed.data.customerId,
        ...parsed.data,
      })
      .returning();

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return contact;
  });
}
```

---

## 8. UI Bileşenleri

### 8.1. Buton

```tsx
import { Button } from "@repo/ui";

// Varyantlar: primary | secondary | ghost | destructive | outline
<Button variant="primary" onClick={handleSave}>Kaydet</Button>
<Button variant="secondary">İptal</Button>
<Button variant="destructive">Sil</Button>
<Button variant="ghost">Düzenle</Button>
<Button variant="outline">Önizle</Button>

// Boyut
<Button size="sm">Küçük</Button>
<Button size="lg">Büyük</Button>

// Loading state
<Button loading>Yükleniyor...</Button>

// İkonlu
<Button><Plus className="w-4 h-4" /> Yeni Müşteri</Button>
```

### 8.2. Badge

```tsx
import { Badge } from "@repo/ui";

// Varyantlar: default | secondary | outline | success | warning | danger | info
<Badge variant="success">Aktif</Badge>
<Badge variant="danger">Pasif</Badge>
<Badge variant="warning">Bloke</Badge>
<Badge variant="info">Beklemede</Badge>
<Badge variant="default">Taslak</Badge>
```

### 8.3. DataGrid

```tsx
import { DataGrid } from "@repo/ui";
import type { Column } from "@repo/ui";

// Sütun tanımları
const columns: Column<Customer>[] = [
  { key: "customerCode", header: "Müşteri Kodu", sortable: true },
  { key: "name", header: "Ünvan", sortable: true },
  {
    key: "status",
    header: "Durum",
    render: (row) => (
      <Badge variant={row.isActive ? "success" : "danger"}>
        {row.isActive ? "Aktif" : "Pasif"}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "İşlemler",
    render: (row) => (
      <Button variant="ghost" onClick={() => onEdit(row)}>Düzenle</Button>
    ),
  },
];

// Kullanım
<DataGrid
  columns={columns}
  data={customers}
  keyExtractor={(row) => row.id}
  emptyTitle="Müşteri bulunamadı"
  emptyDescription="Henüz hiç müşteri eklenmemiş."
  sortable
  onSortChange={(key, dir) => console.log(key, dir)}
/>
```

### 8.4. Dialog (Modal)

```tsx
import { Dialog } from "@repo/ui";

<Dialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Müşteri Düzenle"
  description="Müşteri bilgilerini güncelleyin"
>
  <form onSubmit={handleSubmit}>
    {/* Form içeriği */}
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>İptal</Button>
      <Button type="submit">Kaydet</Button>
    </div>
  </form>
</Dialog>
```

### 8.5. Input / Select / Switch

```tsx
import { Input, Select, Switch, Checkbox } from "@repo/ui";

// Input
<Input label="Müşteri Adı" error={errors.name} {...register("name")} />

// Select (Radix based)
<Select
  label="Durum"
  value={status}
  onChange={setStatus}
  options={[
    { value: "active", label: "Aktif" },
    { value: "passive", label: "Pasif" },
  ]}
/>

// Switch
<Switch checked={isActive} onCheckedChange={setIsActive} label="Aktif" />

// Combobox (arama + seçim)
<Combobox
  label="Müşteri Seçin"
  value={customerId}
  onChange={setCustomerId}
  options={customers.map(c => ({ value: c.id, label: c.name }))}
/>
```

---

## 9. Çoklu Dil Desteği (i18n)

### 9.1. Temel Kullanım

```tsx
"use client";

import { useI18n } from "@repo/ui";

function MyComponent() {
  const t = useI18n();

  return (
    <div>
      <h1>{t("customers.title")}</h1>
      <p>{t("customers.description")}</p>
      <Button>{t("common.save")}</Button>
    </div>
  );
}
```

### 9.2. Dil Değiştirme

```tsx
import { useI18n } from "@repo/ui";

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="tr">Türkçe</option>
      <option value="en">English</option>
    </select>
  );
}
```

### 9.3. Çeviri Dictionary Yapısı

```typescript
// translationDict.ts
{
  customers: {
    title: {
      tr: "Müşteriler",
      en: "Customers",
    },
    create: {
      tr: "Yeni Müşteri",
      en: "New Customer",
    },
  },
  common: {
    save: {
      tr: "Kaydet",
      en: "Save",
    },
    cancel: {
      tr: "İptal",
      en: "Cancel",
    },
  },
}
```

---

## 10. Yetkilendirme ve RLS

### 10.1. Row-Level Security (RLS)

Tüm tablolar RLS ile korunur. Transaction başında `SET LOCAL` ile tenant context atanır:

```sql
-- PostgreSQL tarafında otomatik çalışır:
SET LOCAL app.current_tenant_id = '01ABCD...';
SET LOCAL app.current_user_id = 'user-id';
SET LOCAL app.current_user_role = 'admin';
```

### 10.2. Yetki Kontrolü

```typescript
import { ensurePermission } from "@/lib/authorization";

// Server action içinde
export async function deleteCustomerAction(id: string) {
  const session = await requireSession();
  await ensurePermission("customers:delete");
  // ...
}
```

### 10.3. Server Component'te Yetki Kontrolü

```typescript
import { requireSession } from "@/lib/session";

export default async function CustomerPage() {
  const session = await requireSession();

  // Role bazlı conditional rendering
  if (session.user.role === "admin") {
    return <AdminPanel />;
  }

  return <CustomerList />;
}
```

---

## 11. Hata Yönetimi

### 11.1. Zod Validasyonu

```typescript
const parsed = createCustomerSchemaV2.safeParse(input);
if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  // { name: ["Required"], email: ["Invalid email"] }
  throw new Error("Validasyon hatası: " + JSON.stringify(errors));
}
```

### 11.2. Benzersizlik Kontrolü

```typescript
const existing = await tx.query.customers.findFirst({
  where: and(
    eq(customers.tenantId, session.user.tenantId),
    eq(customers.customerCode, code),
  ),
});

if (existing) {
  throw new Error(`"${code}" kodu zaten ${existing.name} tarafından kullanılıyor`);
}
```

### 11.3. İyimser Kilitleme (Optimistic Locking)

```typescript
const updated = await tx.update(customers)
  .set({
    name: "Yeni İsim",
    version: sql`version + 1`,
    updatedAt: new Date(),
  })
  .where(and(
    eq(customers.id, id),
    eq(customers.version, expectedVersion), // <-- versiyon eşleşmezse hata
  ))
  .returning();

if (updated.length === 0) {
  throw new Error("Kayıt başkası tarafından güncellenmiş. Sayfayı yenileyin.");
}
```

### 11.4. Audit Log

```typescript
await auditLog(tx, {
  tenantId: session.user.tenantId,
  changedBy: session.user.id,
  tableName: "customers",
  recordId: customer.id,
  operation: "update",
  beforeValue: { name: "Eski İsim" },
  afterValue: { name: "Yeni İsim" },
});
```

---

## 12. Önemli Uyarılar

### 12.1. Drizzle Relations Kaydı (⚠️ KRİTİK)

Drizzle ORM'de **relations** nesneleri `drizzle()` çağrısına ayrıca bildirilmelidir. Sadece tablo şemalarını vermek yetmez.

**❌ YANLIŞ — relations kayıtlı değil:**

```typescript
// Bu şekilde db.query.customers.findFirst({ with: { contacts: true } })
// TypeError: Cannot read properties of undefined (reading 'referencedTable') hatası verir!
export const db = drizzle(client, { schema: schemaTables });
```

**✅ DOĞRU — relations dahil edilmiş:**

```typescript
import * as schemaTables from "./schema/index";
import { relationsMap } from "./db/relations";

const schema = {
  ...schemaTables,
  ...Object.fromEntries(
    Object.entries(relationsMap).map(([k, v]) => [`${k}Relations`, v])
  ),
};

export const db = drizzle(client, { schema });
```

Bu kalıp **her iki drizzle instance'ında** (index.ts + transactions.ts) uygulanmalıdır.

### 12.2. Transaction Drizzle Instance'ı

`withTenantSession` içinde yeni bir `drizzle(tx)` oluşturuluyorsa, **schema parametresi mutlaka verilmelidir**:

```typescript
// transactions.ts içinde:
const drizzleTx = drizzle(tx as any, { schema: combinedSchema });
```

### 12.3. ULID Formatı

Tüm primary key'ler `char(26)` formatında ULID'dir. Rastgele ID üreteci:

```typescript
function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}
```

### 12.4. Audit Alanları

Her tabloda bulunması gereken standart alanlar:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `char(26)` | ULID primary key |
| `tenantId` | `char(26)` | Tenant ID (RLS için) |
| `createdAt` | `timestamp` | Oluşturulma zamanı |
| `updatedAt` | `timestamp` | Son güncellenme zamanı |
| `createdBy` | `char(26)` | Oluşturan kullanıcı |
| `updatedBy` | `char(26)` | Son güncelleyen kullanıcı |
| `deletedAt` | `timestamp?` | Soft delete zamanı |
| `deletedBy` | `char(26)?` | Silen kullanıcı |
| `version` | `integer` | İyimser kilitleme versiyonu |

### 12.5. İç İçe Relation Sorgulama

İlişkilerin alt ilişkilerini de getirmek için iç içe `with` kullanılır:

```typescript
const result = await tx.query.customers.findFirst({
  where: eq(customers.id, id),
  with: {
    instructions: {
      with: {
        conditions: true,     // instructions → conditions
      },
    },
    orders: {
      with: {
        orderLines: true,     // orders → orderLines
      },
      orderBy: { createdAt: "desc" },
      limit: 10,
    },
  },
});
```

### 12.6. Yeni Migration Öncesi

1. Schema dosyasını güncelle (ör: `packages/db/src/schema/customers.ts`)
2. Migration oluştur: `npx drizzle-kit generate`
3. Migration'ı incele ve test et
4. Uygula: `npx drizzle-kit migrate`
5. Testleri çalıştır

---

> Bu doküman Sprint 2.10.0 itibarıyla günceldir. Yeni mimari kararlar aldıkça güncellenmelidir.
