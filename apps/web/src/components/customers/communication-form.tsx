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
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui";
import { updateCustomerCommunicationProfileAction } from "@/app/actions/customers";

interface CommunicationFormProps {
  customerId: string;
  version: number;
  initialProfile: {
    channels?: Record<string, { type: string; contactId?: string; phone?: string }>;
  } | null;
  contacts: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
    email?: string | null;
    phone?: string | null;
  }>;
}

const EVENT_LABELS: Record<string, string> = {
  order_confirmed: "Sipariş Oluşturuldu",
  production_started: "Üretim Başladı",
  production_completed: "Üretim Tamamlandı",
  ready_for_dispatch: "Sevkiyata Hazır",
  dispatched: "Sevk Edildi",
  delivered: "Teslim Edildi",
};

const CHANNEL_TYPES = [
  { value: "email", label: "E-posta" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "phone", label: "Telefon" },
];

const EVENTS = [
  "order_confirmed",
  "production_started",
  "production_completed",
  "ready_for_dispatch",
  "dispatched",
  "delivered",
];

export function CommunicationForm({ customerId, version, initialProfile, contacts }: CommunicationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Channel preferences per event
  const [channelPrefs, setChannelPrefs] = useState<Record<string, string[]>>(() => {
    const prefs: Record<string, string[]> = {};
    for (const event of EVENTS) {
      const ch = initialProfile?.channels?.[event];
      prefs[event] = ch ? [ch.type] : [];
    }
    return prefs;
  });

  // Recipient contact ID per event
  const [recipients, setRecipients] = useState<Record<string, string>>(() => {
    const rec: Record<string, string> = {};
    for (const event of EVENTS) {
      const ch = initialProfile?.channels?.[event];
      if (ch?.contactId) rec[event] = ch.contactId;
    }
    return rec;
  });

  // Phone per event (for SMS/Phone channels)
  const [eventPhones, setEventPhones] = useState<Record<string, string>>(() => {
    const phones: Record<string, string> = {};
    for (const event of EVENTS) {
      const ch = initialProfile?.channels?.[event];
      if (ch?.phone) phones[event] = ch.phone;
    }
    return phones;
  });

  const toggleChannel = useCallback((event: string, channelType: string) => {
    setChannelPrefs((prev) => {
      const current = prev[event] ?? [];
      if (current.includes(channelType)) {
        return { ...prev, [event]: current.filter((c) => c !== channelType) };
      }
      return { ...prev, [event]: [...current, channelType] };
    });
    setSuccess(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    // Build communication profile
    const channels: Record<string, { type: string; contactId?: string; phone?: string }> = {};
    for (const event of EVENTS) {
      const eventChannels = channelPrefs[event] ?? [];
      // Use the first channel type per event (or we could support multiple)
      if (eventChannels.length > 0) {
        const primaryType = eventChannels[0] as string;
        const channel: { type: string; contactId?: string; phone?: string } = {
          type: primaryType,
        };
        if (recipients[event]) {
          channel.contactId = recipients[event];
        }
        if (eventPhones[event]) {
          channel.phone = eventPhones[event];
        }
        channels[event] = channel;
      }
    }

    try {
      await updateCustomerCommunicationProfileAction({
        customerId,
        version,
        communicationProfile: {
          version: 1,
          channels,
        },
      });
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, version, channelPrefs, recipients, eventPhones, router]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          İletişim profili başarıyla güncellendi.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bildirim Kanalları ve Olay Yönlendirme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="text-left py-2 px-2 font-medium text-text-muted w-[180px]">Olay</th>
                  {CHANNEL_TYPES.map((ct) => (
                    <th key={ct.value} className="text-center py-2 px-2 font-medium text-text-muted">
                      {ct.label}
                    </th>
                  ))}
                  <th className="text-left py-2 px-2 font-medium text-text-muted">Alıcı</th>
                  <th className="text-left py-2 px-2 font-medium text-text-muted w-[150px]">Telefon</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((event) => (
                  <tr key={event} className="border-b border-glass-border/50">
                    <td className="py-2 px-2 font-medium">{EVENT_LABELS[event]}</td>
                    {CHANNEL_TYPES.map((ct) => (
                      <td key={ct.value} className="text-center py-2 px-2">
                        <Checkbox
                          checked={(channelPrefs[event] ?? []).includes(ct.value)}
                          onCheckedChange={() => toggleChannel(event, ct.value)}
                          disabled={submitting}
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2">
                      <select
                        value={recipients[event] ?? ""}
                        onChange={(e) =>
                          setRecipients((prev) => ({ ...prev, [event]: e.target.value }))
                        }
                        className="w-full rounded-md border border-glass-border bg-glass-surface px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-glass-accent"
                        disabled={submitting || !(channelPrefs[event] ?? []).length}
                      >
                        <option value="">Seçiniz...</option>
                        {contacts
                          .filter((c) => c.isPrimary || true)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.isPrimary ? "(Birincil)" : ""}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={eventPhones[event] ?? ""}
                        onChange={(e) =>
                          setEventPhones((prev) => ({ ...prev, [event]: e.target.value }))
                        }
                        placeholder="Telefon"
                        className="text-xs h-8"
                        disabled={submitting || !(channelPrefs[event] ?? []).length}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İletişim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            Ana iletişim bilgileri Müşteri Genel sekmesinde düzenlenebilir.
            Bildirim tercihleri ve olay bazında yönlendirme ayarları için yukarıdaki tabloyu kullanın.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
