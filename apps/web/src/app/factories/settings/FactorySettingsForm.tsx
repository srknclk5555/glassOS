"use client";

import { useState, FormEvent } from "react";
import { updateFactorySettingsAction } from "@/app/actions/identity";
import type { UpdateFactorySettingsInput } from "@repo/types";

interface FactorySettingsFormProps {
  factoryId: string;
  settings?: {
    id: string;
    factoryId: string;
    tolerances: {
      enToleranceMm: number;
      boyToleranceMm: number;
    };
    trimMm: string;
    qrType: "QR" | "CODE128";
    shiftSettings: Array<{ name: string; start: string; end: string }>;
    costSettings: {
      electricityUnitCost: number;
      gasUnitCost: number;
      laborHourCost: number;
    };
    notificationSettings: {
      whatsappEnabled: boolean;
      smsEnabled: boolean;
      emailEnabled: boolean;
    };
    logoUrl?: string | null;
  };
}

const defaultShiftSettings = [
  { name: "Shift 1", start: "08:00", end: "16:00" },
  { name: "Shift 2", start: "16:00", end: "00:00" },
];

export default function FactorySettingsForm({ factoryId, settings }: FactorySettingsFormProps) {
  const [enToleranceMm, setEnToleranceMm] = useState(settings?.tolerances.enToleranceMm ?? 10);
  const [boyToleranceMm, setBoyToleranceMm] = useState(settings?.tolerances.boyToleranceMm ?? 10);
  const [trimMm, setTrimMm] = useState(Number(settings?.trimMm ?? 10));
  const [qrType, setQrType] = useState<"QR" | "CODE128">(settings?.qrType ?? "QR");
  const [shiftSettings, setShiftSettings] = useState(settings?.shiftSettings ?? defaultShiftSettings);
  const [electricityUnitCost, setElectricityUnitCost] = useState(settings?.costSettings.electricityUnitCost ?? 0);
  const [gasUnitCost, setGasUnitCost] = useState(settings?.costSettings.gasUnitCost ?? 0);
  const [laborHourCost, setLaborHourCost] = useState(settings?.costSettings.laborHourCost ?? 0);
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.notificationSettings.whatsappEnabled ?? false);
  const [smsEnabled, setSmsEnabled] = useState(settings?.notificationSettings.smsEnabled ?? false);
  const [emailEnabled, setEmailEnabled] = useState(settings?.notificationSettings.emailEnabled ?? false);
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload: UpdateFactorySettingsInput = {
      factoryId,
      tolerances: {
        enToleranceMm,
        boyToleranceMm,
      },
      trimMm,
      qrType,
      shiftSettings,
      costSettings: {
        electricityUnitCost,
        gasUnitCost,
        laborHourCost,
      },
      notificationSettings: {
        whatsappEnabled,
        smsEnabled,
        emailEnabled,
      },
      logoUrl: logoUrl.trim() || undefined,
    };

    try {
      await updateFactorySettingsAction(payload);
      setMessage("Factory settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save factory settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24, maxWidth: 720, display: "grid", gap: 24 }}>
      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>Tolerances</legend>
        <label style={{ display: "grid", gap: 8 }}>
          En Tolerance (mm)
          <input
            type="number"
            min={0}
            max={50}
            value={enToleranceMm}
            onChange={(event) => setEnToleranceMm(Number(event.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          Boy Tolerance (mm)
          <input
            type="number"
            min={0}
            max={50}
            value={boyToleranceMm}
            onChange={(event) => setBoyToleranceMm(Number(event.target.value))}
            required
          />
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>General</legend>
        <label style={{ display: "grid", gap: 8 }}>
          Trim (mm)
          <input
            type="number"
            min={0}
            max={200}
            value={trimMm}
            onChange={(event) => setTrimMm(Number(event.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          QR Type
          <select value={qrType} onChange={(event) => setQrType(event.target.value as "QR" | "CODE128")}>
            <option value="QR">QR</option>
            <option value="CODE128">CODE128</option>
          </select>
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>Shift Settings</legend>
        {shiftSettings.map((shift, index) => (
          <div key={index} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            <label style={{ display: "grid", gap: 4 }}>
              Shift name
              <input
                type="text"
                value={shift.name}
                onChange={(event) => {
                  const next = [...shiftSettings];
                  next[index] = { ...next[index], name: event.target.value, start: shift.start ?? "", end: shift.end ?? "" };
                  setShiftSettings(next);
                }}
                required
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 4 }}>
                Start
                <input
                  type="time"
                  value={shift.start ?? ""}
                  onChange={(event) => {
                    const next = [...shiftSettings];
                    next[index] = { ...next[index], start: event.target.value, name: shift.name, end: shift.end ?? "" };
                    setShiftSettings(next);
                  }}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                End
                <input
                  type="time"
                  value={shift.end ?? ""}
                  onChange={(event) => {
                    const next = [...shiftSettings];
                    next[index] = { ...next[index], end: event.target.value, name: shift.name, start: shift.start ?? "" };
                    setShiftSettings(next);
                  }}
                  required
                />
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>Cost Settings</legend>
        <label style={{ display: "grid", gap: 8 }}>
          Electricity unit cost
          <input
            type="number"
            min={0}
            step="0.01"
            value={electricityUnitCost}
            onChange={(event) => setElectricityUnitCost(Number(event.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          Gas unit cost
          <input
            type="number"
            min={0}
            step="0.01"
            value={gasUnitCost}
            onChange={(event) => setGasUnitCost(Number(event.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          Labor hour cost
          <input
            type="number"
            min={0}
            step="0.01"
            value={laborHourCost}
            onChange={(event) => setLaborHourCost(Number(event.target.value))}
            required
          />
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>Notifications</legend>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="checkbox" checked={whatsappEnabled} onChange={(event) => setWhatsappEnabled(event.target.checked)} />
          Whatsapp notifications
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="checkbox" checked={smsEnabled} onChange={(event) => setSmsEnabled(event.target.checked)} />
          SMS notifications
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="checkbox" checked={emailEnabled} onChange={(event) => setEmailEnabled(event.target.checked)} />
          Email notifications
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <legend style={{ fontWeight: 600 }}>Logo</legend>
        <p style={{ margin: "0 0 12px 0" }}>Logo is a placeholder for this sprint.</p>
        <label style={{ display: "grid", gap: 8 }}>
          Logo URL
          <input
            type="url"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </label>
      </fieldset>

      {message ? <div style={{ color: "green" }}>{message}</div> : null}
      {error ? <div style={{ color: "red" }}>{error}</div> : null}

      <button type="submit" disabled={saving} style={{ padding: "12px 18px", borderRadius: 8, border: "none", background: "#1f2937", color: "white", cursor: saving ? "not-allowed" : "pointer" }}>
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
