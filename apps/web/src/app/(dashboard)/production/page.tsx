"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { Cog } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function ProductionPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={Cog}
      title={t("pages.production")}
      description={t("pages.productionDesc")}
    />
  );
}
