"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { BarChart3 } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function ReportsPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={BarChart3}
      title={t("pages.reports")}
      description={t("pages.reportsDesc")}
    />
  );
}
