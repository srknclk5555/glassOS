import { requireSession } from "@/lib/session";
import { db, materials } from "@repo/db";
import { eq, and } from "drizzle-orm";
import MaterialForm from "@/components/materials/MaterialForm";

export default async function MaterialDetailPage(props: any) {
  const { params } = props;
  const session = await requireSession();
  const row = await db.query.materials.findFirst({
    where: session.user.role === "super_admin"
      ? eq(materials.id, params.id)
      : and(eq(materials.id, params.id), eq(materials.tenantId, session.user.tenantId), eq(materials.active, true)),
  });

  if (!row) return <div>Not found or access denied</div>;

  return (
    <div>
      <h1>Malzeme Detayı</h1>
      <MaterialForm existing={row} />
    </div>
  );
}
