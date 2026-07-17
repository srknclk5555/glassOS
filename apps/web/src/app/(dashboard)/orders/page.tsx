"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { ClipboardList } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function OrdersPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={ClipboardList}
      title={t("pages.orders")}
      description={t("pages.ordersDesc")}
    />
  );
}
