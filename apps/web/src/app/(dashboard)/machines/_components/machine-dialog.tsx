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

interface Machine {
  id: string;
  machineCode: string;
  name: string;
  machineType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  manufactureYear: number | null;
  purchasedAt: string | null;
  commissionedAt: string | null;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  status: string;
  hourlyCapacity: string | null;
  dailyCapacity: string | null;
  maxGlassWidthMm: string | null;
  maxGlassHeightMm: string | null;
  maxThicknessMm: string | null;
  minThicknessMm: string | null;
  notes: string | null;
}

interface MachineFormData {
  machineCode: string;
  name: string;
  machineType: string;
  brand: string;
  model: string;
  serialNumber: string;
  manufactureYear: number | null;
  purchasedAt: string;
  commissionedAt: string;
  warrantyStartsAt: string;
  warrantyEndsAt: string;
  status: string;
  hourlyCapacity: string;
  dailyCapacity: string;
  maxGlassWidthMm: string;
  maxGlassHeightMm: string;
  maxThicknessMm: string;
  minThicknessMm: string;
  notes: string;
}

interface MachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MachineFormData) => Promise<void>;
  machine?: Machine | null;
  mode: "create" | "edit";
}

/* ── Constants ─────────────────────────────────────────────────── */

const MACHINE_TYPES = [
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

const MACHINE_STATUSES = [
  { value: "active", labelKey: "statusActive" },
  { value: "maintenance", labelKey: "statusMaintenance" },
  { value: "idle", labelKey: "statusIdle" },
  { value: "decommissioned", labelKey: "statusDecommissioned" },
];

/* ── Component ─────────────────────────────────────────────────── */

export function MachineDialog({ open, onOpenChange, onSave, machine, mode }: MachineDialogProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<MachineFormData>({
    machineCode: "",
    name: "",
    machineType: "",
    brand: "",
    model: "",
    serialNumber: "",
    manufactureYear: null,
    purchasedAt: "",
    commissionedAt: "",
    warrantyStartsAt: "",
    warrantyEndsAt: "",
    status: "active",
    hourlyCapacity: "",
    dailyCapacity: "",
    maxGlassWidthMm: "",
    maxGlassHeightMm: "",
    maxThicknessMm: "",
    minThicknessMm: "",
    notes: "",
  });

  useEffect(() => {
    if (machine) {
      setForm({
        machineCode: machine.machineCode ?? "",
        name: machine.name ?? "",
        machineType: machine.machineType ?? "",
        brand: machine.brand ?? "",
        model: machine.model ?? "",
        serialNumber: machine.serialNumber ?? "",
        manufactureYear: machine.manufactureYear ?? null,
        purchasedAt: machine.purchasedAt ?? "",
        commissionedAt: machine.commissionedAt ?? "",
        warrantyStartsAt: machine.warrantyStartsAt ?? "",
        warrantyEndsAt: machine.warrantyEndsAt ?? "",
        status: machine.status ?? "active",
        hourlyCapacity: machine.hourlyCapacity ?? "",
        dailyCapacity: machine.dailyCapacity ?? "",
        maxGlassWidthMm: machine.maxGlassWidthMm ?? "",
        maxGlassHeightMm: machine.maxGlassHeightMm ?? "",
        maxThicknessMm: machine.maxThicknessMm ?? "",
        minThicknessMm: machine.minThicknessMm ?? "",
        notes: machine.notes ?? "",
      });
    } else {
      setForm({
        machineCode: "",
        name: "",
        machineType: "",
        brand: "",
        model: "",
        serialNumber: "",
        manufactureYear: null,
        purchasedAt: "",
        commissionedAt: "",
        warrantyStartsAt: "",
        warrantyEndsAt: "",
        status: "active",
        hourlyCapacity: "",
        dailyCapacity: "",
        maxGlassWidthMm: "",
        maxGlassHeightMm: "",
        maxThicknessMm: "",
        minThicknessMm: "",
        notes: "",
      });
    }
  }, [machine, open]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }, [form, onSave]);

  const update = (key: keyof MachineFormData, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("machines.editMachine") : t("machines.addMachine")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("machines.editMachine") : t("machines.addMachine")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.machineCode")} *</label>
              <Input
                value={form.machineCode}
                onChange={(e) => update("machineCode", e.target.value)}
                placeholder="KST-001"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.machineName")} *</label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={t("machines.machineName")}
                required
              />
            </div>
          </div>

          {/* Row 2: Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.machineType")} *</label>
              <Select
                value={form.machineType}
                onValueChange={(v) => update("machineType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("machines.machineType")} />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`machines.${type.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.status")}</label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("machines.status")} />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(`machines.${s.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Brand, Model, Serial */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.brand")}</label>
              <Input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder={t("machines.brand")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.model")}</label>
              <Input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder={t("machines.model")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.serialNumber")}</label>
              <Input
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
                placeholder={t("machines.serialNumber")}
              />
            </div>
          </div>

          {/* Row 4: Manufacture Year & Dates */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.manufactureYear")}</label>
              <Input
                type="number"
                value={form.manufactureYear ?? ""}
                onChange={(e) => update("manufactureYear", e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="2024"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.purchasedAt")}</label>
              <Input
                type="date"
                value={form.purchasedAt}
                onChange={(e) => update("purchasedAt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.commissionedAt")}</label>
              <Input
                type="date"
                value={form.commissionedAt}
                onChange={(e) => update("commissionedAt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.notes")}</label>
              <Input
                value=""
                disabled
                className="opacity-0"
              />
            </div>
          </div>

          {/* Row 5: Warranty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.warrantyStarts")}</label>
              <Input
                type="date"
                value={form.warrantyStartsAt}
                onChange={(e) => update("warrantyStartsAt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.warrantyEnds")}</label>
              <Input
                type="date"
                value={form.warrantyEndsAt}
                onChange={(e) => update("warrantyEndsAt", e.target.value)}
              />
            </div>
          </div>

          {/* Row 6: Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.hourlyCapacity")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.hourlyCapacity}
                onChange={(e) => update("hourlyCapacity", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.dailyCapacity")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.dailyCapacity}
                onChange={(e) => update("dailyCapacity", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 7: Glass Dimensions */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("machines.dimensions")}</p>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.maxGlassWidth")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.maxGlassWidthMm}
                onChange={(e) => update("maxGlassWidthMm", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.maxGlassHeight")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.maxGlassHeightMm}
                onChange={(e) => update("maxGlassHeightMm", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.maxThickness")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.maxThicknessMm}
                onChange={(e) => update("maxThicknessMm", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">{t("machines.minThickness")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.minThicknessMm}
                onChange={(e) => update("minThicknessMm", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 8: Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">{t("machines.notes")}</label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={t("machines.notes")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.machineCode || !form.name || !form.machineType}>
            {saving ? t("common.loading") : isEdit ? t("common.save") : t("machines.addMachine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
