"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { MATERIAL_UNITS } from "@repo/types";
import { Ruler } from "lucide-react";

interface UnitSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

/**
 * Human-friendly labels for material units (Türkçe).
 */
const UNIT_LABELS: Record<string, string> = {
  piece: "Adet",
  kg: "Kilogram (kg)",
  g: "Gram (g)",
  ton: "Ton",
  m: "Metre (m)",
  mm: "Milimetre (mm)",
  m2: "Metrekare (m²)",
  m3: "Metreküp (m³)",
  l: "Litre (l)",
  box: "Kutu",
  roll: "Rulo",
  package: "Paket",
};

const UNIT_OPTIONS: ComboboxOption[] = MATERIAL_UNITS.map((unit) => ({
  value: unit,
  label: UNIT_LABELS[unit] ?? unit,
}));

export function UnitSelector({
  value,
  onChange,
  disabled,
  error,
}: UnitSelectorProps) {
  return (
    <Combobox
      options={UNIT_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Select unit..."
      searchPlaceholder="Search unit..."
      emptyText="No unit found"
      disabled={disabled}
      error={error}
      icon={<Ruler className="h-3.5 w-3.5" />}
    />
  );
}
