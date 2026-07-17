import { ensurePermission } from "@/lib/authorization";
import { requireSession } from "@/lib/session";
import { db, factories, settings } from "@repo/db";
import { eq } from "drizzle-orm";
import FactorySettingsForm from "./FactorySettingsForm";

export default async function FactorySettingsPage() {
  await ensurePermission("factories:read");
  const session = await requireSession();
  const factoryId = session.user.selectedFactoryId ?? session.user.factoryId;

  if (!factoryId) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Factory Settings</h1>
        <p>No factory selected.</p>
      </main>
    );
  }

  const factory = await db.query.factories.findFirst({ where: eq(factories.id, factoryId) });

  if (!factory) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Factory Settings</h1>
        <p>Factory not found.</p>
      </main>
    );
  }

  const existingSettings = await db.query.settings.findFirst({ where: eq(settings.factoryId, factoryId) });

  const normalizeQrType = (value: string | null): "QR" | "CODE128" =>
    value === "CODE128" ? "CODE128" : "QR";

  const normalizedSettings:
    | {
        id: string;
        factoryId: string;
        tolerances: { enToleranceMm: number; boyToleranceMm: number };
        trimMm: string;
        qrType: "QR" | "CODE128";
        shiftSettings: { name: string; start: string; end: string }[];
        costSettings: { electricityUnitCost: number; gasUnitCost: number; laborHourCost: number };
        notificationSettings: { whatsappEnabled: boolean; smsEnabled: boolean; emailEnabled: boolean };
        logoUrl?: string | null;
      }
    | undefined =
    existingSettings === undefined
      ? undefined
      : {
          id: existingSettings.id,
          factoryId: existingSettings.factoryId,
          tolerances: existingSettings.tolerances as { enToleranceMm: number; boyToleranceMm: number },
          trimMm: existingSettings.trimMm ?? "",
          qrType: normalizeQrType(existingSettings.qrType),
          shiftSettings: (existingSettings.shiftSettings as { name: string; start: string; end: string }[]) ?? [
            { name: "Shift 1", start: "08:00", end: "16:00" },
            { name: "Shift 2", start: "16:00", end: "00:00" },
          ],
          costSettings: (existingSettings.costSettings as {
            electricityUnitCost: number;
            gasUnitCost: number;
            laborHourCost: number;
          }) ?? { electricityUnitCost: 0, gasUnitCost: 0, laborHourCost: 0 },
          notificationSettings: existingSettings.notificationSettings as {
            whatsappEnabled: boolean;
            smsEnabled: boolean;
            emailEnabled: boolean;
          },
          logoUrl: existingSettings.logoUrl ?? undefined,
        };

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div>
          <h1>Factory Settings</h1>
          <p style={{ margin: 0 }}>{factory.name}</p>
          <p style={{ marginTop: 4, color: "#666" }}>{factory.address ?? "No address specified"}</p>
        </div>
      </div>
      <FactorySettingsForm factoryId={factoryId} settings={normalizedSettings} />
    </main>
  );
}
