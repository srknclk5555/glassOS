"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import { CustomerPageShell } from "../_components/customer-page-shell";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Switch,
  Combobox,
} from "@repo/ui";
import { ArrowLeft, Save, Loader2, MapPin } from "lucide-react";
import { createCustomerAction } from "@/app/actions/customers";
import {
  CITY_OPTIONS,
  getDistrictsByCity,
} from "@/lib/turkey-cities";

/* ── Initial form state ────────────────────────────────────────── */

interface CustomerFormData {
  customerCode: string;
  name: string;
  shortName: string;
  taxNumber: string;
  taxOffice: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  country: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: CustomerFormData = {
  customerCode: "",
  name: "",
  shortName: "",
  taxNumber: "",
  taxOffice: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  district: "",
  country: "",
  notes: "",
  isActive: true,
};

/* ── Component ─────────────────────────────────────────────────── */

export default function NewCustomerPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);

  // Derived: district options based on selected city
  const districtOptions = useMemo(
    () => getDistrictsByCity(form.city),
    [form.city]
  );

  const update = useCallback(
    (key: keyof CustomerFormData, value: string | boolean) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Reset district when city changes
        if (key === "city" && value !== prev.city) {
          next.district = "";
        }
        return next;
      });
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Basic validation
    if (!form.customerCode.trim()) {
      setError(t("customers.validation.customerCodeRequired") ?? "Müşteri kodu zorunludur");
      return;
    }
    if (!form.name.trim()) {
      setError(t("customers.validation.nameRequired") ?? "Müşteri adı zorunludur");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createCustomerAction({
        customerCode: form.customerCode.trim(),
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        taxNumber: form.taxNumber.trim() || undefined,
        taxOffice: form.taxOffice.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        country: form.country.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      });

      router.push(`/customers/${result.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, router, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <CustomerPageShell
      title={t("customers.addCustomer")}
      description={t("customers.newCustomerDesc") ?? "Yeni bir müşteri hesabı oluşturun."}
      actions={
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.cancel")}
        </Button>
      }
    >
      <Card>
        <CardContent className="p-6">
          {/* ── Error banner ── */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-6" onKeyDown={handleKeyDown}>
            {/* ── Row 1: Code + Name ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.customerCode")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  value={form.customerCode}
                  onChange={(e) => update("customerCode", e.target.value)}
                  placeholder="MUSTERI-001"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.name")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="ABC Cam San. Tic. A.Ş."
                  className="glass-input"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Row 2: Short Name + Tax Number ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.shortName")}
                </label>
                <Input
                  value={form.shortName}
                  onChange={(e) => update("shortName", e.target.value)}
                  placeholder="ABC Cam"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.taxNumber")}
                </label>
                <Input
                  value={form.taxNumber}
                  onChange={(e) => update("taxNumber", e.target.value)}
                  placeholder="1234567890"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Row 3: Tax Office + Phone ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Vergi Dairesi
                </label>
                <Input
                  value={form.taxOffice}
                  onChange={(e) => update("taxOffice", e.target.value)}
                  placeholder="Büyükdere"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.phone")}
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+90 212 123 45 67"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Row 4: Email ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  E-posta
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="info@abccam.com"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  Ülke
                </label>
                <Input
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="Türkiye"
                  className="glass-input"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Row 5: City + District (Comboboxes) ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.city") ?? "Şehir"}
                </label>
                <Combobox
                  options={CITY_OPTIONS}
                  value={form.city}
                  onChange={(value) => update("city", value)}
                  placeholder={t("customers.cityPlaceholder") ?? "Şehir seçin..."}
                  searchPlaceholder={t("customers.citySearchPlaceholder") ?? "Şehir ara..."}
                  emptyText="Şehir bulunamadı"
                  disabled={submitting}
                  icon={<MapPin className="h-4 w-4" />}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("customers.district") ?? "İlçe"}
                </label>
                {form.city ? (
                  <Combobox
                    options={districtOptions}
                    value={form.district}
                    onChange={(value) => update("district", value)}
                    placeholder={t("customers.districtPlaceholder") ?? "İlçe seçin..."}
                    searchPlaceholder={t("customers.districtSearchPlaceholder") ?? "İlçe ara..."}
                    emptyText="Bu şehirde ilçe bulunamadı"
                    disabled={submitting}
                  />
                ) : (
                  <div className="flex h-9 w-full items-center rounded-md border border-dashed border-glass-border bg-glass-surface/50 px-3 text-sm text-text-muted">
                    {t("customers.districtPlaceholder") ?? "Önce şehir seçin..."}
                  </div>
                )}
              </div>
            </div>

            {/* ── Address ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Adres
              </label>
              <Textarea
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Açık adres..."
                className="glass-input min-h-[80px]"
                disabled={submitting}
              />
            </div>

            {/* ── Notes ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Notlar
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Dahili notlar..."
                className="glass-input min-h-[80px]"
                disabled={submitting}
              />
            </div>

            {/* ── Active toggle ── */}
            <div className="flex items-center gap-3 rounded-lg border border-glass-border bg-glass-surface p-4">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
                disabled={submitting}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t("customers.status.active")}
                </p>
                <p className="text-xs text-text-muted">
                  Müşteri kaydı oluşturulduğunda aktif olarak işaretlenir.
                </p>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-3 border-t border-glass-border pt-6">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="glass-button min-w-[120px]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    {t("common.save")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </CustomerPageShell>
  );
}
