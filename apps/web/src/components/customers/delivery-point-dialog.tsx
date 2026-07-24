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
  createDeliveryPointAction,
  updateDeliveryPointAction,
} from "@/app/actions/customers";

interface DeliveryPointFormData {
  name: string;
  address: string;
  city: string;
  district: string;
  country: string;
  postalCode: string;
  phone: string;
  contactPerson: string;
  workingHours: string;
  notes: string;
  isDefault: boolean;
  isActive: boolean;
}

const emptyForm: DeliveryPointFormData = {
  name: "",
  address: "",
  city: "",
  district: "",
  country: "",
  postalCode: "",
  phone: "",
  contactPerson: "",
  workingHours: "",
  notes: "",
  isDefault: false,
  isActive: true,
};

interface DeliveryPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  point?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    district: string | null;
    latitude: string | null;
    longitude: string | null;
    phone: string | null;
    note: string | null;
    isDefault: boolean;
    isActive: boolean;
  } | null;
}

export function DeliveryPointDialog({ open, onOpenChange, customerId, point }: DeliveryPointDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryPointFormData>(() => {
    if (point) {
      return {
        name: point.name,
        address: point.address ?? "",
        city: point.city ?? "",
        district: point.district ?? "",
        country: "",
        postalCode: "",
        phone: point.phone ?? "",
        contactPerson: "",
        workingHours: "",
        notes: point.note ?? "",
        isDefault: point.isDefault,
        isActive: point.isActive,
      };
    }
    return emptyForm;
  });

  const update = useCallback((key: keyof DeliveryPointFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setError("Teslimat noktası adı zorunludur");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (point) {
        await updateDeliveryPointAction({
          id: point.id,
          customerId,
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          district: form.district.trim() || undefined,
          latitude: undefined,
          longitude: undefined,
          phone: form.phone.trim() || undefined,
          note: form.notes.trim() || undefined,
          isDefault: form.isDefault,
          isActive: form.isActive,
        });
      } else {
        await createDeliveryPointAction({
          customerId,
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          district: form.district.trim() || undefined,
          latitude: undefined,
          longitude: undefined,
          phone: form.phone.trim() || undefined,
          note: form.notes.trim() || undefined,
          isDefault: form.isDefault,
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
  }, [form, point, customerId, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{point ? "Teslimat Noktasını Düzenle" : "Yeni Teslimat Noktası"}</DialogTitle>
          <DialogDescription>
            {point ? "Teslimat noktası bilgilerini güncelleyin." : "Müşteri için yeni bir teslimat noktası ekleyin."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              Teslimat Noktası Adı <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Fabrika Ana Depo"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Ülke</label>
              <Input
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                placeholder="Türkiye"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Şehir</label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="İstanbul"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">İlçe</label>
              <Input
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                placeholder="Kadıköy"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Posta Kodu</label>
              <Input
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                placeholder="34000"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Adres</label>
            <Textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Açık adres..."
              className="min-h-[60px]"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Telefon</label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+90 216 123 45 67"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Yetkili Kişi</label>
              <Input
                value={form.contactPerson}
                onChange={(e) => update("contactPerson", e.target.value)}
                placeholder="Ahmet Yılmaz"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Çalışma Saatleri</label>
            <Input
              value={form.workingHours}
              onChange={(e) => update("workingHours", e.target.value)}
              placeholder="08:00 - 18:00"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Notlar</label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Teslimat noktası ile ilgili notlar..."
              className="min-h-[60px]"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) => update("isDefault", checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium">Varsayılan</p>
                <p className="text-xs text-text-muted">Ana teslimat noktası olarak işaretle</p>
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
                <p className="text-xs text-text-muted">Teslimat noktası aktif</p>
              </div>
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
