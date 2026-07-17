"use client";

import { PagePlaceholder } from "./_components/page-placeholder";
import { LayoutDashboard } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function DashboardPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title={t("pages.dashboard")}
      description={t("pages.dashboardDesc")}
    />
  );
}
