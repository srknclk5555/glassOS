"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getInventoryLocationsAction } from "@/app/actions/inventory-locations";
import { MapPin } from "lucide-react";

interface LocationSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  /** When provided, filters locations by factory. */
  factoryId?: string;
  disabled?: boolean;
  error?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  factoryId,
  disabled,
  error,
}: LocationSelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchLocations = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getInventoryLocationsAction({
        search,
        factoryId,
        pageSize: 50,
      });
      setOptions(
        result.items.map((l: any) => ({
          value: l.id,
          label: `${l.locationCode} - ${l.name}`,
          subtitle: l.locationType ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [factoryId]);

  // Reload when factoryId changes
  React.useEffect(() => {
    if (!disabled) {
      fetchLocations();
    }
  }, [fetchLocations, disabled]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select location..."
      searchPlaceholder="Search location..."
      emptyText="No location found"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<MapPin className="h-3.5 w-3.5" />}
    />
  );
}
