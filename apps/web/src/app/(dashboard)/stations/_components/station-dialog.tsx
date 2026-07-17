"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

/* ── Types ─────────────────────────────────────────────────────── */

interface Station {
  id: string;
  stationCode: string;
  name: string;
  description: string | null;
  stationType: string;
  sortOrder: number;
  maxConcurrentJobs: number;
  maxMachines: number | null;
  maxOperators: number | null;
  isActive: boolean;
  notes: string | null;
}

interface StationFormData {
  stationCode: string;
  name: string;
  description: string;
  stationType: string;
  sortOrder: string;
  maxConcurrentJobs: string;
  maxMachines: string;
  maxOperators: string;
  isActive: boolean;
  notes: string;
}

interface StationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: StationFormData) => Promise<void>;
  station?: Station | null;
  mode: "create" | "edit";
}

/* ── Constants ─────────────────────────────────────────────────── */

const STATION_TYPES = [
  { value: "cutting", labelKey: "typeCutting" },
  { value: "grinding", labelKey: "typeGrinding" },
  { value: "tempering", labelKey: "typeTempering" },
  { value: "insulating_glass", labelKey: "typeInsulatingGlass" },
  { value: "cnc", labelKey: "typeCnc" },
  { value: "drilling", labelKey: "typeDrilling" },
  { value: "lamination", labelKey: "typeLamination" },
  { value: "washing", labelKey: "typeWashing" },
  { value: "painting", labelKey: "typePainting" },
  { value: "sandblasting", labelKey: "typeSandblasting" },
  { value: "quality", labelKey: "typeQuality" },
  { value: "dispatch", labelKey: "typeDispatch" },
];

/* ── Component ─────────────────────────────────────────────────── */

export function StationDialog({ open, onOpenChange, onSave, station, mode }: StationDialogProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<StationFormData>({
    stationCode: "",
    name: "",
    description: "",
    stationType: "",
    sortOrder: "0",
    maxConcurrentJobs: "1",
    maxMachines: "",
    maxOperators: "",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    if (station) {
      setForm({
        stationCode: station.stationCode ?? "",
        name: station.name ?? "",
        description: station.description ?? "",
        stationType: station.stationType ?? "",
        sortOrder: String(station.sortOrder ?? 0),
        maxConcurrentJobs: String(station.maxConcurrentJobs ?? 1),
        maxMachines: station.maxMachines != null ? String(station.maxMachines) : "",
        maxOperators: station.maxOperators != null ? String(station.maxOperators) : "",
        isActive: station.isActive ?? true,
        notes: station.notes ?? "",
      });
    } else {
      setForm({
        stationCode: "",
        name: "",
        description: "",
        stationType: "",
        sortOrder: "0",
        maxConcurrentJobs: "1",
        maxMachines: "",
        maxOperators: "",
        isActive: true,
        notes: "",
      });
    }
  }, [station, open]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }, [form, onSave]);

  const update = (key: keyof StationFormData, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("stations.editStation") : t("stations.addStation")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("stations.editStation") : t("stations.addStation")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Station Code */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.stationCode")}
            </label>
            <Input
              className="col-span-3"
              value={form.stationCode}
              onChange={(e) => update("stationCode", e.target.value)}
              placeholder={t("stations.stationCode")}
            />
          </div>

          {/* Station Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.stationName")}
            </label>
            <Input
              className="col-span-3"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("stations.stationName")}
            />
          </div>

          {/* Station Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.stationType")}
            </label>
            <Select
              value={form.stationType}
              onValueChange={(v) => update("stationType", v)}
            >
              <SelectTrigger className="col-span-3 w-full">
                <SelectValue placeholder={t("stations.stationType")} />
              </SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`stations.${type.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-xs font-medium text-text-muted text-right pt-2">
              {t("stations.descriptionLabel")}
            </label>
            <Textarea
              className="col-span-3 min-h-[60px]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder={t("stations.descriptionLabel")}
            />
          </div>

          {/* Sort Order */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.sortOrder")}
            </label>
            <Input
              className="col-span-3"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
            />
          </div>

          {/* Max Concurrent Jobs */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.maxConcurrentJobs")}
            </label>
            <Input
              className="col-span-3"
              type="number"
              min={1}
              value={form.maxConcurrentJobs}
              onChange={(e) => update("maxConcurrentJobs", e.target.value)}
            />
          </div>

          {/* Max Machines */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.maxMachines")}
            </label>
            <Input
              className="col-span-3"
              type="number"
              min={0}
              value={form.maxMachines}
              onChange={(e) => update("maxMachines", e.target.value)}
              placeholder="—"
            />
          </div>

          {/* Max Operators */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted text-right">
              {t("stations.maxOperators")}
            </label>
            <Input
              className="col-span-3"
              type="number"
              min={0}
              value={form.maxOperators}
              onChange={(e) => update("maxOperators", e.target.value)}
              placeholder="—"
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-xs font-medium text-text-muted text-right pt-2">
              {t("stations.notes")}
            </label>
            <Textarea
              className="col-span-3 min-h-[60px]"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={t("stations.notes")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t("common.saving") : isEdit ? t("common.save") : t("stations.addStation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
