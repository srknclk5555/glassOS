import { requireSession } from "@/lib/session";
import { db, products } from "@repo/db";
import { eq, and } from "drizzle-orm";
import ProductForm from "@/components/products/ProductForm";

export default async function ProductDetailPage(props: any) {
  const { params } = props;
  const session = await requireSession();
  const row = await db.query.products.findFirst({
    where: session.user.role === "super_admin"
      ? eq(products.id, params.id)
      : and(eq(products.id, params.id), eq(products.tenantId, session.user.tenantId), eq(products.active, true)),
  });

  if (!row) return <div>Not found or access denied</div>;

  return (
    <div>
      <h1>Ürün Detayı</h1>
      <ProductForm existing={row} />
    </div>
  );
}
