"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui";
import {
  updateCustomerQualityProfileAction,
  updateCustomerProductionPreferencesAction,
  updateCustomerLabelSpecificationAction,
  updateCustomerPackagingProfileAction,
} from "@/app/actions/customers";

/* ─── Quality Profile Form ─── */

function QualityProfileForm({
  customerId,
  version,
  data,
}: {
  customerId: string;
  version: number;
  data: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    edgeQualityMm: String((data as any)?.edgeQualityMm ?? "0.5"),
    opticalQuality: (data as any)?.opticalQuality ?? "architectural",
    scratchTolerance: (data as any)?.scratchTolerance ?? "standard",
    bubbleTolerance: (data as any)?.bubbleTolerance ?? "standard",
    inspectionLevel: (data as any)?.inspectionLevel ?? "100%",
    acceptsBGrade: (data as any)?.acceptsBGrade ?? false,
    acceptsNearSize: (data as any)?.acceptsNearSize ?? false,
    requiresMillCert: (data as any)?.requiresMillCert ?? false,
    maxDefectsPerSqm: String((data as any)?.maxDefectsPerSqm ?? "2"),
  });

  const update = useCallback((key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await updateCustomerQualityProfileAction({
        customerId,
        version,
        qualityProfile: {
          version: 1,
          edgeQualityMm: parseFloat(form.edgeQualityMm) || 0.5,
          opticalQuality: form.opticalQuality as any,
          scratchTolerance: form.scratchTolerance as any,
          bubbleTolerance: form.bubbleTolerance as any,
          inspectionLevel: form.inspectionLevel as any,
          acceptsBGrade: form.acceptsBGrade,
          acceptsNearSize: form.acceptsNearSize,
          requiresMillCert: form.requiresMillCert,
          maxDefectsPerSqm: parseInt(form.maxDefectsPerSqm) || 2,
        },
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, version, form, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kalite Profili</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Kenar Kalitesi (mm)</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.edgeQualityMm}
              onChange={(e) => update("edgeQualityMm", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Optik Kalite</label>
            <select
              value={form.opticalQuality}
              onChange={(e) => update("opticalQuality", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="architectural">Mimari</option>
              <option value="automotive">Otomotiv</option>
              <option value="mirror">Ayna</option>
              <option value="solar">Solar</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Çizik Toleransı</label>
            <select
              value={form.scratchTolerance}
              onChange={(e) => update("scratchTolerance", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="standard">Standart</option>
              <option value="strict">Sıkı</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Kabarcık Toleransı</label>
            <select
              value={form.bubbleTolerance}
              onChange={(e) => update("bubbleTolerance", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="standard">Standart</option>
              <option value="strict">Sıkı</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Denetim Seviyesi</label>
            <select
              value={form.inspectionLevel}
              onChange={(e) => update("inspectionLevel", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="100%">%100</option>
              <option value="sampling">Örnekleme</option>
              <option value="skip">Atlama</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Maks. Hata/m²</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.maxDefectsPerSqm}
              onChange={(e) => update("maxDefectsPerSqm", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.acceptsBGrade} onCheckedChange={(c) => update("acceptsBGrade", c)} disabled={submitting} />
            <span className="text-sm">B Kalite Kabul</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.acceptsNearSize} onCheckedChange={(c) => update("acceptsNearSize", c)} disabled={submitting} />
            <span className="text-sm">Yakın Boy Kabul</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.requiresMillCert} onCheckedChange={(c) => update("requiresMillCert", c)} disabled={submitting} />
            <span className="text-sm">Değirmen Sertifikası</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Production Preferences Form ─── */

function ProductionPreferencesForm({
  customerId,
  version,
  data,
}: {
  customerId: string;
  version: number;
  data: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    defaultEdgework: (data as any)?.defaultEdgework ?? "flat_ground",
    defaultTempering: (data as any)?.defaultTempering ?? "full_temper",
    defaultSpacerType: (data as any)?.defaultSpacerType ?? "aluminum",
    defaultGasFill: (data as any)?.defaultGasFill ?? "argon",
    defaultFilmType: (data as any)?.defaultFilmType ?? "low_e",
    defaultToleranceClass: (data as any)?.defaultToleranceClass ?? "±1.0mm",
    laminationPreference: (data as any)?.laminationPreference ?? "pvb",
  });

  const update = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await updateCustomerProductionPreferencesAction({
        customerId,
        version,
        productionPreferences: {
          version: 1,
          ...form,
        },
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, version, form, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Üretim Tercihleri</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Kenar İşlemi</label>
            <select
              value={form.defaultEdgework}
              onChange={(e) => update("defaultEdgework", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="flat_ground">Düz Taşlama</option>
              <option value="arrissing">Köyü alma</option>
              <option value="seamed">Kenar temizleme</option>
              <option value="beveled">Pah</option>
              <option value="polished">Parlatma</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Temperleme</label>
            <select
              value={form.defaultTempering}
              onChange={(e) => update("defaultTempering", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="full_temper">Tam Temper</option>
              <option value="heat_strengthened">Isıl Güçlendirilmiş</option>
              <option value="annealed">Tavlanmış</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Ara Boşluk</label>
            <select
              value={form.defaultSpacerType}
              onChange={(e) => update("defaultSpacerType", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="aluminum">Alüminyum</option>
              <option value="warm_edge">Sıcak Kenar</option>
              <option value="tps">TPS</option>
              <option value="swiggle">Swiggle</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Gaz Dolumu</label>
            <select
              value={form.defaultGasFill}
              onChange={(e) => update("defaultGasFill", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="air">Hava</option>
              <option value="argon">Argon</option>
              <option value="krypton">Kripton</option>
              <option value="xenon">Xenon</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Varsayılan Film Tipi</label>
            <select
              value={form.defaultFilmType}
              onChange={(e) => update("defaultFilmType", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="low_e">Low-E</option>
              <option value="solar_control">Güneş Kontrol</option>
              <option value="self_cleaning">Kendi Kendini Temizleyen</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Tolerans Sınıfı</label>
            <select
              value={form.defaultToleranceClass}
              onChange={(e) => update("defaultToleranceClass", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="±0.5mm">±0.5 mm</option>
              <option value="±1.0mm">±1.0 mm</option>
              <option value="±2.0mm">±2.0 mm</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Laminasyon Tercihi</label>
            <select
              value={form.laminationPreference}
              onChange={(e) => update("laminationPreference", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="pvb">PVB</option>
              <option value="eva">EVA</option>
              <option value="sgp">SGP</option>
              <option value="acoustic">Akustik</option>
              <option value="none">Yok</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Label Specification Form ─── */

function LabelSpecificationForm({
  customerId,
  version,
  data,
}: {
  customerId: string;
  version: number;
  data: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    barcodeFormat: (data as any)?.barcodeFormat ?? "code128",
    labelPosition: (data as any)?.labelPosition ?? "top_left",
    labelsPerUnit: String((data as any)?.labelsPerUnit ?? "1"),
    language: (data as any)?.language ?? "tr",
    includeLogo: (data as any)?.includeLogo ?? true,
    protectiveFilmBeforeLabel: (data as any)?.protectiveFilmBeforeLabel ?? false,
  });

  const update = useCallback((key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await updateCustomerLabelSpecificationAction({
        customerId,
        version,
        labelSpec: {
          version: 1,
          barcodeFormat: form.barcodeFormat as any,
          labelPosition: form.labelPosition as any,
          labelsPerUnit: parseInt(form.labelsPerUnit) || 1,
          language: form.language,
          includeLogo: form.includeLogo,
          protectiveFilmBeforeLabel: form.protectiveFilmBeforeLabel,
          fields: ["order_ref", "dimensions", "customer_code", "thickness", "date"],
        },
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, version, form, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etiket Şartnamesi</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Barkod Formatı</label>
            <select
              value={form.barcodeFormat}
              onChange={(e) => update("barcodeFormat", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="code128">Code 128</option>
              <option value="qr">QR</option>
              <option value="datamatrix">DataMatrix</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Etiket Pozisyonu</label>
            <select
              value={form.labelPosition}
              onChange={(e) => update("labelPosition", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="top_left">Sol Üst</option>
              <option value="top_right">Sağ Üst</option>
              <option value="edge">Kenar</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Birim Başına Etiket</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.labelsPerUnit}
              onChange={(e) => update("labelsPerUnit", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Dil</label>
            <select
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
              <option value="de">Almanca</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.includeLogo} onCheckedChange={(c) => update("includeLogo", c)} disabled={submitting} />
            <span className="text-sm">Logo Göster</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.protectiveFilmBeforeLabel} onCheckedChange={(c) => update("protectiveFilmBeforeLabel", c)} disabled={submitting} />
            <span className="text-sm">Etiket Öncesi Koruyucu Film</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Packaging Profile Form ─── */

function PackagingProfileForm({
  customerId,
  version,
  data,
}: {
  customerId: string;
  version: number;
  data: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    packagingType: (data as any)?.packagingType ?? "stillage",
    separationMaterial: (data as any)?.separationMaterial ?? "cork_powder",
    interleaving: (data as any)?.interleaving ?? "every_sheet",
    strapping: (data as any)?.strapping ?? "metal_band",
    cornerProtection: (data as any)?.cornerProtection ?? "cardboard",
    protectiveFilm: (data as any)?.protectiveFilm ?? "one_side",
    maxWeightKg: String((data as any)?.maxWeightKg ?? "1500"),
    maxPieces: String((data as any)?.maxPieces ?? "50"),
  });

  const update = useCallback((key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await updateCustomerPackagingProfileAction({
        customerId,
        version,
        packagingProfile: {
          version: 1,
          packagingType: form.packagingType as any,
          separationMaterial: form.separationMaterial as any,
          interleaving: form.interleaving as any,
          strapping: form.strapping as any,
          cornerProtection: form.cornerProtection as any,
          protectiveFilm: form.protectiveFilm as any,
          maxWeightKg: parseFloat(form.maxWeightKg) || 1500,
          maxPieces: parseInt(form.maxPieces) || 50,
        },
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, version, form, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paketleme Profili</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Paketleme Türü</label>
            <select
              value={form.packagingType}
              onChange={(e) => update("packagingType", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="stillage">Stilaj</option>
              <option value="a_frame">A-Çerçeve</option>
              <option value="crate">Kasa</option>
              <option value="cardboard">Karton</option>
              <option value="loose">Dökme</option>
              <option value="export_crate">İhracat Kasası</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Ayırma Malzemesi</label>
            <select
              value={form.separationMaterial}
              onChange={(e) => update("separationMaterial", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="paper">Kağıt</option>
              <option value="cork_powder">Mantar Tozu</option>
              <option value="foam">Köpük</option>
              <option value="plastic_interleaf">Plastik Arası</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Ara Katman</label>
            <select
              value={form.interleaving}
              onChange={(e) => update("interleaving", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="every_sheet">Her Levha</option>
              <option value="every_5">Her 5'te</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Bağlama Türü</label>
            <select
              value={form.strapping}
              onChange={(e) => update("strapping", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="metal_band">Metal Bant</option>
              <option value="plastic_band">Plastik Bant</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Köşe Koruma</label>
            <select
              value={form.cornerProtection}
              onChange={(e) => update("cornerProtection", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="cardboard">Karton</option>
              <option value="plastic">Plastik</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Koruyucu Film</label>
            <select
              value={form.protectiveFilm}
              onChange={(e) => update("protectiveFilm", e.target.value)}
              className="flex h-9 w-full rounded-md border border-glass-border bg-glass-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
              disabled={submitting}
            >
              <option value="one_side">Tek Taraflı</option>
              <option value="both_sides">Çift Taraflı</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Maks. Ağırlık (kg)</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.maxWeightKg}
              onChange={(e) => update("maxWeightKg", e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Maks. Adet</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.maxPieces}
              onChange={(e) => update("maxPieces", e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Export ─── */

export function ProductionForm({
  customerId,
  version,
  qualityProfile,
  productionPreferences,
  labelSpec,
  packagingProfile,
}: {
  customerId: string;
  version: number;
  qualityProfile: Record<string, unknown> | null;
  productionPreferences: Record<string, unknown> | null;
  labelSpec: Record<string, unknown> | null;
  packagingProfile: Record<string, unknown> | null;
}) {
  return (
    <div className="space-y-6">
      <QualityProfileForm customerId={customerId} version={version} data={qualityProfile} />
      <ProductionPreferencesForm customerId={customerId} version={version} data={productionPreferences} />
      <LabelSpecificationForm customerId={customerId} version={version} data={labelSpec} />
      <PackagingProfileForm customerId={customerId} version={version} data={packagingProfile} />
    </div>
  );
}
