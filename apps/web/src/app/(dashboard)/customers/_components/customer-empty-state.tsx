"use client";

import { useI18n, EmptyState } from "@repo/ui";
import { Users, SearchX, UserX, Phone, MapPin, BookOpen, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type EmptyStateKind =
  | "noCustomers"
  | "noSearchResults"
  | "customerNotFound"
  | "noContacts"
  | "noDeliveryPoints"
  | "noGlassCatalog"
  | "noInstructions";

interface CustomerEmptyStateProps {
  kind: EmptyStateKind;
  action?: { label: string; onClick: () => void };
}

const iconMap: Record<EmptyStateKind, LucideIcon> = {
  noCustomers: Users,
  noSearchResults: SearchX,
  customerNotFound: UserX,
  noContacts: Phone,
  noDeliveryPoints: MapPin,
  noGlassCatalog: BookOpen,
  noInstructions: FileText,
};

const keyMap: Record<EmptyStateKind, { title: string; desc: string }> = {
  noCustomers: { title: "customers.emptyState.noCustomers", desc: "customers.emptyState.noCustomersDesc" },
  noSearchResults: { title: "customers.emptyState.noSearchResults", desc: "customers.emptyState.noSearchResultsDesc" },
  customerNotFound: { title: "customers.emptyState.customerNotFound", desc: "customers.emptyState.customerNotFoundDesc" },
  noContacts: { title: "customers.emptyState.noContacts", desc: "customers.emptyState.noContactsDesc" },
  noDeliveryPoints: { title: "customers.emptyState.noDeliveryPoints", desc: "customers.emptyState.noDeliveryPointsDesc" },
  noGlassCatalog: { title: "customers.emptyState.noGlassCatalog", desc: "customers.emptyState.noGlassCatalogDesc" },
  noInstructions: { title: "customers.emptyState.noInstructions", desc: "customers.emptyState.noInstructionsDesc" },
};

/**
 * CustomerEmptyState — Pre-configured empty state for customer pages.
 *
 * Each `kind` maps to a specific icon, title, and description from
 * the i18n dictionary. Pass `action` to show a CTA button.
 */
export function CustomerEmptyState({ kind, action }: CustomerEmptyStateProps) {
  const { t } = useI18n();
  const Icon = iconMap[kind];
  const keys = keyMap[kind];

  return (
    <EmptyState
      icon={<Icon className="h-8 w-8" />}
      title={t(keys.title)}
      description={t(keys.desc)}
      action={action}
    />
  );
}
