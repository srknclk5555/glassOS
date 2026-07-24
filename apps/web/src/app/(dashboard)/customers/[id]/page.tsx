import { notFound } from "next/navigation";
import { getFullCustomerById } from "@/lib/customer-queries";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined | React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 py-2 border-b border-glass-border last:border-b-0">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text-primary">{value ?? "—"}</span>
    </div>
  );
}

export default async function GeneralTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getFullCustomerById(id);
  if (!customer) notFound();

  const isBlocked = !!(customer as any).operationalBlock?.isBlocked;

  return (
    <div className="p-6 space-y-6">
      {/* ── Identity & Status ── */}
      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={customer.isActive ? "success" : "secondary"}>
              {customer.isActive ? "Aktif" : "Pasif"}
            </Badge>
            {isBlocked && <Badge variant="danger">Operasyonel Blok</Badge>}
          </div>
          <InfoRow label="Müşteri Kodu" value={customer.customerCode} />
          <InfoRow label="Ünvan" value={customer.name} />
          <InfoRow label="Kısa Ad" value={customer.shortName} />
          <InfoRow label="Vergi No" value={customer.taxNumber} />
          <InfoRow label="Vergi Dairesi" value={customer.taxOffice} />
          <InfoRow label="Telefon" value={customer.phone} />
          <InfoRow label="E-posta" value={customer.email} />
        </CardContent>
      </Card>

      {/* ── Address ── */}
      <Card>
        <CardHeader>
          <CardTitle>Adres Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Ülke" value={customer.country} />
          <InfoRow label="Şehir" value={customer.city} />
          <InfoRow label="İlçe" value={customer.district} />
          <InfoRow label="Adres" value={customer.address} />
          <InfoRow label="Notlar" value={customer.notes} />
        </CardContent>
      </Card>

      {/* ── Audit Info ── */}
      <Card>
        <CardHeader>
          <CardTitle>Denetim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Versiyon" value={String(customer.version ?? "—")} />
          <InfoRow label="Oluşturulma" value={formatDate(customer.createdAt)} />
          <InfoRow label="Oluşturan" value={customer.createdBy ?? "—"} />
          <InfoRow label="Güncellenme" value={formatDate(customer.updatedAt)} />
          <InfoRow label="Güncelleyen" value={customer.updatedBy ?? "—"} />
          {customer.deletedAt && (
            <>
              <InfoRow label="Silinme" value={formatDate(customer.deletedAt)} />
              <InfoRow label="Silen" value={customer.deletedBy ?? "—"} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
