"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui";
import { useI18n } from "@repo/ui";

interface CustomerBreadcrumbsProps {
  /** The customer name to show in breadcrumbs (detail pages only) */
  customerName?: string;
}

/**
 * CustomerBreadcrumbs — Enhanced breadcrumbs for customer pages.
 *
 * Overrides the auto-generated dashboard breadcrumbs for the customers
 * section. Handles three states:
 * - List: GlassOS > Customers
 * - Detail: GlassOS > Customers > [Customer Name]
 * - Tab:    GlassOS > Customers > [Customer Name] > [Tab Name]
 *
 * Pass `customerName` when rendering inside [id]/ layout for detail pages.
 * The tab name is auto-detected from the URL pathname.
 */
export function CustomerBreadcrumbs({ customerName }: CustomerBreadcrumbsProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  const tabName = useMemo(() => {
    if (!customerName) return null;

    // Extract the segment after the customer ID
    const segments = pathname.split("/").filter(Boolean);
    // pathname: /customers/[id]/production → segments: ["customers", "[id]", "production"]
    // We want the segment after the id (index 2)
    const tabSegment = segments[2];
    if (!tabSegment) return null;

    // Map URL segments to i18n keys
    const tabMap: Record<string, string> = {
      production: "customers.tabs.production",
      communication: "customers.tabs.communication",
      contacts: "customers.tabs.contacts",
      "delivery-points": "customers.tabs.deliveryPoints",
      "glass-catalog": "customers.tabs.glassCatalog",
      instructions: "customers.tabs.instructions",
    };

    const key = tabMap[tabSegment];
    return key ? t(key) : null;
  }, [pathname, customerName, t]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">{t("topbar.breadcrumbHome")}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        <BreadcrumbItem>
          {customerName ? (
            <BreadcrumbLink href="/customers">
              {t("pages.customers")}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{t("pages.customers")}</BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {customerName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {tabName ? (
                <BreadcrumbLink href={`/customers/${pathname.split("/")[2]}`}>
                  {customerName}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{customerName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {tabName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tabName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
