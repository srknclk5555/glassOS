"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getCustomersAction } from "@/app/actions/customers";
import { Building2 } from "lucide-react";

interface CustomerSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

export function CustomerSelector({
  value,
  onChange,
  disabled,
  error,
  placeholder = "Select customer...",
}: CustomerSelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchCustomers = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getCustomersAction({
        search,
        pageSize: 50,
      });
      setOptions(
        result.items.map((c: any) => ({
          value: c.id,
          label: `${c.customerCode} - ${c.name}`,
          subtitle: c.shortName ?? undefined,
        }))
      );
    } catch {
      // Silently fail — empty options
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search customer..."
      emptyText="No customer found"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<Building2 className="h-3.5 w-3.5" />}
    />
  );
}
