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
  createCustomerContactAction,
  updateCustomerContactAction,
} from "@/app/actions/customers";

interface ContactFormData {
  name: string;
  title: string;
  role: string;
  phone: string;
  whatsapp: string;
  email: string;
  notes: string;
  isPrimary: boolean;
  isActive: boolean;
}

const emptyForm: ContactFormData = {
  name: "",
  title: "",
  role: "",
  phone: "",
  whatsapp: "",
  email: "",
  notes: "",
  isPrimary: false,
  isActive: true,
};

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  /** If provided, we're editing an existing contact */
  contact?: {
    id: string;
    name: string;
    title: string | null;
    role: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    isPrimary: boolean;
    isActive: boolean;
  } | null;
}

export function ContactDialog({ open, onOpenChange, customerId, contact }: ContactDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(() => {
    if (contact) {
      return {
        name: contact.name,
        title: contact.title ?? "",
        role: contact.role ?? "",
        phone: contact.phone ?? "",
        whatsapp: contact.whatsapp ?? "",
        email: contact.email ?? "",
        notes: "",
        isPrimary: contact.isPrimary,
        isActive: contact.isActive,
      };
    }
    return emptyForm;
  });

  const update = useCallback((key: keyof ContactFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setError("Kişi adı zorunludur");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (contact) {
        await updateCustomerContactAction({
          id: contact.id,
          customerId,
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          role: form.role.trim() || undefined,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          email: form.email.trim() || undefined,
          isPrimary: form.isPrimary,
          isActive: form.isActive,
        });
      } else {
        await createCustomerContactAction({
          customerId,
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          role: form.role.trim() || undefined,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          email: form.email.trim() || undefined,
          isPrimary: form.isPrimary,
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
  }, [form, contact, customerId, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "Kişiyi Düzenle" : "Yeni İletişim Kişisi"}</DialogTitle>
          <DialogDescription>
            {contact ? "Müşteri iletişim kişisi bilgilerini güncelleyin." : "Müşteri için yeni bir iletişim kişisi ekleyin."}
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
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Ünvan</label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Satış Müdürü"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Rol</label>
              <Input
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                placeholder="Satış"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Telefon</label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+90 212 123 45 67"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">WhatsApp</label>
              <Input
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="+90 532 123 45 67"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">E-posta</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ahmet@firma.com"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Notlar</label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Kişi ile ilgili notlar..."
              className="min-h-[60px]"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPrimary}
                onCheckedChange={(checked) => update("isPrimary", checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium">Birincil Kişi</p>
                <p className="text-xs text-text-muted">Varsayılan iletişim kişisi olarak işaretle</p>
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
                <p className="text-xs text-text-muted">Kişi kaydı aktif</p>
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
