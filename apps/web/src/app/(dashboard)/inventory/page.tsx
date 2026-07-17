"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { Package } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function InventoryPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={Package}
      title={t("pages.inventory")}
      description={t("pages.inventoryDesc")}
    />
  );
}
