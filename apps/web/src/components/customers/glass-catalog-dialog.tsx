"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
} from "@repo/ui";
import {
  createGlassCatalogAction,
  updateGlassCatalogAction,
} from "@/app/actions/customers";

interface GlassCatalogFormData {
  productCode: string;
  glassType: string;
  thicknessMm: string;
  widthMm: string;
  heightMm: string;
  defaultPieces: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: GlassCatalogFormData = {
  productCode: "",
  glassType: "",
  thicknessMm: "",
  widthMm: "",
  heightMm: "",
  defaultPieces: "",
  notes: "",
  isActive: true,
};

interface GlassCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  item?: {
    id: string;
    productCode: string;
    glassType: string;
    thicknessMm: string | null;
    defaultWidthMm: string | null;
    defaultHeightMm: string | null;
    defaultPieces: string | null;
    notes: string | null;
    isActive: boolean;
  } | null;
}

export function GlassCatalogDialog({ open, onOpenChange, customerId, item }: GlassCatalogDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GlassCatalogFormData>(() => {
    if (item) {
      return {
        productCode: item.productCode,
        glassType: item.glassType,
        thicknessMm: item.thicknessMm ?? "",
        widthMm: item.defaultWidthMm ?? "",
        heightMm: item.defaultHeightMm ?? "",
        defaultPieces: item.defaultPieces ?? "",
        notes: item.notes ?? "",
        isActive: item.isActive,
      };
    }
    return emptyForm;
  });

  const update = useCallback((key: keyof GlassCatalogFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.productCode.trim()) {
      setError("Ürün kodu zorunludur");
      return;
    }
    if (!form.glassType.trim()) {
      setError("Cam türü zorunludur");
      return;
    }

    setSubmitting(true);
    setError(null);

    const toNum = (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };

    try {
      if (item) {
        await updateGlassCatalogAction({
          id: item.id,
          customerId,
          productCode: form.productCode.trim(),
          glassType: form.glassType.trim(),
          thicknessMm: toNum(form.thicknessMm),
          defaultWidthMm: toNum(form.widthMm),
          defaultHeightMm: toNum(form.heightMm),
          defaultPieces: form.defaultPieces ? parseInt(form.defaultPieces, 10) : undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        });
      } else {
        await createGlassCatalogAction({
          customerId,
          productCode: form.productCode.trim(),
          glassType: form.glassType.trim(),
          thicknessMm: toNum(form.thicknessMm),
          defaultWidthMm: toNum(form.widthMm),
          defaultHeightMm: toNum(form.heightMm),
          defaultPieces: form.defaultPieces ? parseInt(form.defaultPieces, 10) : undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        });
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [form, item, customerId, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Katalog Kaydını Düzenle" : "Yeni Katalog Kaydı"}</DialogTitle>
          <DialogDescription>
            {item ? "Cam kataloğu kaydını güncelleyin." : "Müşteri için yeni bir cam kataloğu kaydı ekleyin."}
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
                Ürün Kodu <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.productCode}
                onChange={(e) => update("productCode", e.target.value)}
                placeholder="CAM-001"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Cam Türü <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.glassType}
                onChange={(e) => update("glassType", e.target.value)}
                placeholder="Düz Cam"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Kalınlık (mm)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.thicknessMm}
                onChange={(e) => update("thicknessMm", e.target.value)}
                placeholder="10"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Genişlik (mm)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.widthMm}
                onChange={(e) => update("widthMm", e.target.value)}
                placeholder="1200"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Yükseklik (mm)</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.heightMm}
                onChange={(e) => update("heightMm", e.target.value)}
                placeholder="2000"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Adet</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.defaultPieces}
              onChange={(e) => update("defaultPieces", e.target.value)}
              placeholder="100"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Notlar</label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Katalog kaydı ile ilgili notlar..."
              className="min-h-[60px]"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => update("isActive", checked)}
              disabled={submitting}
            />
            <div>
              <p className="text-sm font-medium">Aktif</p>
              <p className="text-xs text-text-muted">Katalog kaydı aktif</p>
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
