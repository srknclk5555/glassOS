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
import { Plus } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface Personnel {
  id: string;
  personnelCode: string;
  firstName: string;
  lastName: string;
  titleId: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  hiredAt: string | null;
  notes: string | null;
}

interface PersonnelTitle {
  id: string;
  titleName: string;
}

interface PersonnelFormData {
  personnelCode: string;
  firstName: string;
  lastName: string;
  titleId: string;
  role: string;
  phone: string;
  email: string;
  hiredAt: string;
  notes: string;
}

interface PersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonnelFormData) => Promise<void>;
  personnel?: Personnel | null;
  titles: PersonnelTitle[];
  mode: "create" | "edit";
  onAddTitle?: () => void;
}

/* ── Constants ─────────────────────────────────────────────────── */

const PERSONNEL_ROLES = [
  { value: "operator", labelKey: "operator" },
  { value: "senior_operator", labelKey: "seniorOperator" },
  { value: "supervisor", labelKey: "supervisor" },
  { value: "manager", labelKey: "manager" },
];

const ROLE_LABELS: Record<string, string> = {
  operator: "Operatör",
  senior_operator: "Kıdemli Operatör",
  supervisor: "Süpervizör",
  manager: "Yönetici",
};

/* ── Component ─────────────────────────────────────────────────── */

export function PersonnelDialog({ open, onOpenChange, onSave, personnel, titles, mode, onAddTitle }: PersonnelDialogProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<PersonnelFormData>({
    personnelCode: "",
    firstName: "",
    lastName: "",
    titleId: "",
    role: "operator",
    phone: "",
    email: "",
    hiredAt: "",
    notes: "",
  });

  useEffect(() => {
    if (personnel && mode === "edit") {
      setForm({
        personnelCode: personnel.personnelCode ?? "",
        firstName: personnel.firstName ?? "",
        lastName: personnel.lastName ?? "",
        titleId: personnel.titleId ?? "",
        role: personnel.role ?? "operator",
        phone: personnel.phone ?? "",
        email: personnel.email ?? "",
        hiredAt: personnel.hiredAt ?? "",
        notes: personnel.notes ?? "",
      });
    } else {
      setForm({
        personnelCode: "",
        firstName: "",
        lastName: "",
        titleId: "",
        role: "operator",
        phone: "",
        email: "",
        hiredAt: "",
        notes: "",
      });
    }
  }, [personnel, open, mode]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }, [form, onSave]);

  const update = (key: keyof PersonnelFormData, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("personnel.editPersonnel") : t("personnel.addPersonnel")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("personnel.editPersonnel") : t("personnel.addPersonnel")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Personnel Code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.personnelCode")}</label>
            <Input
              value={form.personnelCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("personnelCode", e.target.value)}
              placeholder="e.g., PRS-001"
              className="glass-input"
            />
          </div>

          {/* First Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.firstName")}</label>
            <Input
              value={form.firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("firstName", e.target.value)}
              className="glass-input"
            />
          </div>

          {/* Last Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.lastName")}</label>
            <Input
              value={form.lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("lastName", e.target.value)}
              className="glass-input"
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.personnelTitle")}</label>
            {titles.length === 0 ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-dashed border-glass-border p-3 text-center">
                  <p className="text-xs text-text-muted">{t("personnel.noTitlesDefined")}</p>
                </div>
                {onAddTitle && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={onAddTitle}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t("personnel.addTitle")}
                  </Button>
                )}
              </div>
            ) : (
              <Select
                value={form.titleId}
                onValueChange={(v: string) => update("titleId", v)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder={t("personnel.personnelTitle")} />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title.id} value={title.id}>
                      {title.titleName}
                    </SelectItem>
                  ))}
                  {onAddTitle && (
                    <>
                      <div className="border-t border-glass-border my-1" />
                      <button
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-glass-surface-hover rounded-sm transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); onAddTitle(); }}
                      >
                        <Plus className="h-3 w-3" />
                        {t("personnel.addTitle")}
                      </button>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.role")}</label>
            <Select
              value={form.role}
              onValueChange={(v: string) => update("role", v)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue placeholder={t("personnel.role")} />
              </SelectTrigger>
              <SelectContent>
                {PERSONNEL_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {ROLE_LABELS[role.value] ?? role.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.phone")}</label>
            <Input
              value={form.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("phone", e.target.value)}
              className="glass-input"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.email")}</label>
            <Input
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("email", e.target.value)}
              type="email"
              className="glass-input"
            />
          </div>

          {/* Hire Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.hireDate")}</label>
            <Input
              value={form.hiredAt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("hiredAt", e.target.value)}
              type="date"
              className="glass-input"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("personnel.notes")}</label>
            <Textarea
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update("notes", e.target.value)}
              className="glass-input min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button className="glass-button" onClick={handleSubmit} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
