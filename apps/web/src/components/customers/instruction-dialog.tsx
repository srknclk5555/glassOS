"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  Switch,
  Badge,
} from "@repo/ui";
import {
  createCustomerInstructionAction,
  updateCustomerInstructionAction,
  createInstructionConditionAction,
  updateInstructionConditionAction,
  deleteInstructionConditionAction,
} from "@/app/actions/customers";

interface ConditionFormData {
  id?: string;
  field: string;
  operator: string;
  value: string;
  valueType: string;
  logicalGroup: number;
  sortOrder: number;
}

interface InstructionFormData {
  title: string;
  instruction: string;
  isStanding: boolean;
  sortOrder: number;
  isActive: boolean;
}

const emptyInstruction: InstructionFormData = {
  title: "",
  instruction: "",
  isStanding: false,
  sortOrder: 0,
  isActive: true,
};

interface InstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  instruction?: {
    id: string;
    title: string;
    instruction: string;
    isStanding: boolean;
    sortOrder: number;
    isActive: boolean;
    conditions?: Array<{
      id: string;
      field: string;
      operator: string;
      value: string;
      valueType: string;
      logicalGroup: number;
      sortOrder: number;
    }>;
  } | null;
}

export function InstructionDialog({ open, onOpenChange, customerId, instruction }: InstructionDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InstructionFormData>(() => {
    if (instruction) {
      return {
        title: instruction.title,
        instruction: instruction.instruction,
        isStanding: instruction.isStanding,
        sortOrder: instruction.sortOrder,
        isActive: instruction.isActive,
      };
    }
    return emptyInstruction;
  });
  const [conditions, setConditions] = useState<ConditionFormData[]>(() => {
    if (instruction?.conditions) {
      return instruction.conditions.map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        valueType: c.valueType,
        logicalGroup: c.logicalGroup,
        sortOrder: c.sortOrder,
      }));
    }
    return [];
  });

  const update = useCallback((key: keyof InstructionFormData, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const updateCondition = useCallback((index: number, key: keyof ConditionFormData, value: string | number) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value } as ConditionFormData;
      return next;
    });
  }, []);

  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      {
        field: "",
        operator: "eq",
        value: "",
        valueType: "string",
        logicalGroup: 0,
        sortOrder: prev.length,
      },
    ]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      setError("Talimat başlığı zorunludur");
      return;
    }
    if (!form.instruction.trim()) {
      setError("Talimat metni zorunludur");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let instructionId: string;

      if (instruction) {
        await updateCustomerInstructionAction({
          id: instruction.id,
          customerId,
          title: form.title.trim(),
          instruction: form.instruction.trim(),
          isStanding: form.isStanding,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        instructionId = instruction.id;
      } else {
        const result = await createCustomerInstructionAction({
          customerId,
          title: form.title.trim(),
          instruction: form.instruction.trim(),
          isStanding: form.isStanding,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        instructionId = result.id;
      }

      // Handle conditions
      if (instruction) {
        const existingIds = new Set((instruction.conditions ?? []).map((c) => c.id));
        const newIds = new Set(conditions.filter((c) => c.id).map((c) => c.id!));

        // Delete removed conditions
        for (const existingId of existingIds) {
          if (!newIds.has(existingId)) {
            await deleteInstructionConditionAction(existingId).catch(() => {});
          }
        }
      }

      // Create or update conditions
      for (let i = 0; i < conditions.length; i++) {
        const cond = conditions[i]!;
        const payload = {
          instructionId,
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
          valueType: cond.valueType as "number" | "string" | "boolean" | "enum",
          logicalGroup: cond.logicalGroup,
          sortOrder: i,
        };

        if (cond.id) {
          await updateInstructionConditionAction({ id: cond.id, ...payload }).catch(() => {});
        } else {
          await createInstructionConditionAction(payload).catch(() => {});
        }
      }

      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [form, conditions, instruction, customerId, onOpenChange, router]);

  const operatorOptions = [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "contains", label: "İçerir" },
    { value: "not_contains", label: "İçermez" },
    { value: "starts_with", label: "İle başlar" },
    { value: "ends_with", label: "İle biter" },
    { value: "in", label: "İçinde" },
    { value: "not_in", label: "Dışında" },
  ];

  const valueTypeOptions = [
    { value: "string", label: "Metin" },
    { value: "number", label: "Sayı" },
    { value: "boolean", label: "Evet/Hayır" },
    { value: "enum", label: "Seçenek" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{instruction ? "Talimatı Düzenle" : "Yeni Talimat"}</DialogTitle>
          <DialogDescription>
            {instruction ? "Özel talimat bilgilerini güncelleyin." : "Müşteri için yeni bir özel talimat ekleyin."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Başlık <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Kenar İşleme Talimatı"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Sıra No</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={String(form.sortOrder)}
                onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              Talimat Metni <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={form.instruction}
              onChange={(e) => update("instruction", e.target.value)}
              placeholder="Talimat detaylarını yazın..."
              className="min-h-[100px]"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isStanding}
                onCheckedChange={(checked) => update("isStanding", checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium">Sürekli Uygula</p>
                <p className="text-xs text-text-muted">Tüm siparişlerde otomatik uygulanır</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium">Aktif</p>
                <p className="text-xs text-text-muted">Talimat aktif</p>
              </div>
            </div>
          </div>

          {/* Conditions Section */}
          <div className="border-t border-glass-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Koşullar</h3>
              <Button variant="outline" size="sm" onClick={addCondition} disabled={submitting}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Koşul Ekle
              </Button>
            </div>

            {conditions.length === 0 && (
              <p className="text-xs text-text-muted py-2">
                Bu talimat için henüz koşul tanımlanmamış. Koşullar, talimatın hangi durumlarda uygulanacağını belirler.
              </p>
            )}

            <div className="space-y-3">
              {conditions.map((cond, index) => (
                <div key={index} className="rounded-lg border border-glass-border bg-glass-surface/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px]">
                      Koşul #{index + 1}
                    </Badge>
                    <button
                      onClick={() => removeCondition(index)}
                      className="text-text-muted hover:text-red-500 transition-colors"
                      disabled={submitting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-muted">Alan</label>
                      <Input
                        value={cond.field}
                        onChange={(e) => updateCondition(index, "field", e.target.value)}
                        placeholder="örn: thickness"
                        className="text-xs h-8"
                        disabled={submitting}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-muted">Operatör</label>
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(index, "operator", e.target.value)}
                        className="flex h-8 w-full rounded-md border border-glass-border bg-glass-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
                        disabled={submitting}
                      >
                        {operatorOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-muted">Değer</label>
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(index, "value", e.target.value)}
                        placeholder="değer"
                        className="text-xs h-8"
                        disabled={submitting}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-muted">Değer Tipi</label>
                      <select
                        value={cond.valueType}
                        onChange={(e) => updateCondition(index, "valueType", e.target.value)}
                        className="flex h-8 w-full rounded-md border border-glass-border bg-glass-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
                        disabled={submitting}
                      >
                        {valueTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-muted">Grup</label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={String(cond.logicalGroup)}
                        onChange={(e) => updateCondition(index, "logicalGroup", parseInt(e.target.value) || 0)}
                        className="text-xs h-8"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[100px]">
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Kaydet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
