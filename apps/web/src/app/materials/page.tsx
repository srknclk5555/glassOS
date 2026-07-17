import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db, materials } from "@repo/db";
import { eq, and } from "drizzle-orm";
import MaterialList from "@/components/materials/MaterialList";

export default async function MaterialsPage() {
  const session = await requireSession();

  const rows = await db.query.materials.findMany({
    where: session.user.role === "super_admin"
      ? eq(materials.isActive, true)
      : and(eq(materials.tenantId, session.user.tenantId), eq(materials.isActive, true)),
    columns: { id: true, materialCode: true, name: true },
    orderBy: materials.name,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Malzemeler</h1>
        <Link href="/materials/new">Yeni Malzeme</Link>
      </div>

      <MaterialList rows={rows} />
    </div>
  );
}
