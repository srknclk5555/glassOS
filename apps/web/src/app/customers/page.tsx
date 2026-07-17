import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db, customers } from "@repo/db";
import { eq } from "drizzle-orm";

export default async function CustomersPage() {
  const session = await requireSession();

  const rows = await db.query.customers.findMany({
    where: session.user.role === "super_admin" ? undefined : eq(customers.tenantId, session.user.tenantId),
    columns: { id: true, customerCode: true, name: true, shortName: true, isActive: true },
    orderBy: customers.name,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Müşteriler</h1>
        <Link href="/customers/new">Yeni Cari Oluştur</Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>ERP Kodu</th>
            <th style={{ textAlign: "left" }}>Ünvan</th>
            <th style={{ textAlign: "left" }}>Kısa Ünvan</th>
            <th style={{ textAlign: "left" }}>Durum</th>
            <th style={{ textAlign: "left" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.customerCode}</td>
              <td>{c.name}</td>
              <td>{c.shortName}</td>
              <td>{c.isActive ? "Aktif" : "Pasif"}</td>
              <td>
                <Link href={`/customers/${c.id}`}>Detay</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
