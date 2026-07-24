import { ProductionOrderDetailClient } from "./production-order-detail-client";

export default async function ProductionOrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ProductionOrderDetailClient id={id} />;
}
