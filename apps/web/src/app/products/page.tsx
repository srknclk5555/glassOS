import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db, products } from "@repo/db";
import { eq, and } from "drizzle-orm";

export default async function ProductsPage() {
  const session = await requireSession();

  const rows = await db.query.products.findMany({
    where: session.user.role === "super_admin"
      ? eq(products.active, true)
      : and(eq(products.tenantId, session.user.tenantId), eq(products.active, true)),
    columns: { id: true, productCode: true, name: true },
    orderBy: products.name,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Ürünler</h1>
        <Link href="/products/new">Yeni Ürün</Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Kod</th>
            <th style={{ textAlign: "left" }}>Ad</th>
            <th style={{ textAlign: "left" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.productCode}</td>
              <td>{r.name}</td>
              <td><Link href={`/products/${r.id}`}>Detay</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
