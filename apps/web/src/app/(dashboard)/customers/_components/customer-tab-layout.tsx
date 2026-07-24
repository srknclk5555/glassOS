"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { useI18n } from "@repo/ui";

interface CustomerTabLayoutProps {
  /** The customer ID for tab navigation URLs */
  customerId: string;
  children: React.ReactNode;
}

type TabDefinition = {
  value: string;
  labelKey: string;
  href: string;
};

/**
 * CustomerTabLayout — Tab navigation for customer detail pages.
 *
 * Renders a horizontal tab bar with content area below.
 * Uses URL-based routing: each tab is a sub-route under /customers/[id]/.
 *
 * Tabs (matching CUSTOMER_ARCHITECTURE.md §3.3):
 * - General       → /customers/[id]
 * - Production    → /customers/[id]/production
 * - Communication → /customers/[id]/communication
 * - Contacts      → /customers/[id]/contacts
 * - Delivery Points → /customers/[id]/delivery-points
 * - Glass Catalog → /customers/[id]/glass-catalog
 * - Instructions  → /customers/[id]/instructions
 */
export function CustomerTabLayout({ customerId, children }: CustomerTabLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const tabs: TabDefinition[] = useMemo(
    () => [
      { value: "general", labelKey: "customers.tabs.general", href: `/customers/${customerId}` },
      { value: "production", labelKey: "customers.tabs.production", href: `/customers/${customerId}/production` },
      { value: "communication", labelKey: "customers.tabs.communication", href: `/customers/${customerId}/communication` },
      { value: "contacts", labelKey: "customers.tabs.contacts", href: `/customers/${customerId}/contacts` },
      { value: "delivery-points", labelKey: "customers.tabs.deliveryPoints", href: `/customers/${customerId}/delivery-points` },
      { value: "glass-catalog", labelKey: "customers.tabs.glassCatalog", href: `/customers/${customerId}/glass-catalog` },
      { value: "instructions", labelKey: "customers.tabs.instructions", href: `/customers/${customerId}/instructions` },
    ],
    [customerId],
  );

  // Determine which tab is active based on the current pathname
  const activeTab = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    // pathname: /customers/[id]/production → segments[2] = "production"
    // pathname: /customers/[id] → no segment after id → "general"
    const tabSegment = segments[2];
    if (!tabSegment) return "general";

    // Map all URL segments to tab values
    const segmentMap: Record<string, string> = {
      production: "production",
      communication: "communication",
      contacts: "contacts",
      "delivery-points": "delivery-points",
      "glass-catalog": "glass-catalog",
      instructions: "instructions",
    };

    return segmentMap[tabSegment] ?? "general";
  }, [pathname]);

  const handleTabChange = (value: string) => {
    const tab = tabs.find((t) => t.value === value);
    if (tab) {
      router.push(tab.href);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-6">
      <TabsList className="w-full justify-start border-b border-glass-border">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            {t(tab.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1">
        {children}
      </div>
    </Tabs>
  );
}
