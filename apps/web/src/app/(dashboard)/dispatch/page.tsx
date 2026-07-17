"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { Truck } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function DispatchPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={Truck}
      title={t("pages.dispatch")}
      description={t("pages.dispatchDesc")}
    />
  );
}
