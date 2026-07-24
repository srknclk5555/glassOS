"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@repo/ui";
import { getCustomerByIdAction } from "@/app/actions/customers";
import { CommunicationForm } from "@/components/customers/communication-form";

export default function CommunicationTab({ params }: { params: Promise<{ id: string }> }) {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    params.then(({ id }) => {
      setCustomerId(id);
      loadCustomer(id);
    });
  }, [params]);

  const loadCustomer = async (id: string) => {
    setLoading(true);
    try {
      const data = await getCustomerByIdAction(id);
      setCustomer(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <EmptyState title="Hata" description={error} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const contacts = customer?.contacts?.filter((c: any) => !c.deletedAt) ?? [];

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>İletişim Profili</CardTitle>
        </CardHeader>
        <CardContent>
          <CommunicationForm
            customerId={customerId}
            version={customer?.version ?? 1}
            initialProfile={customer?.communicationProfile ?? null}
            contacts={contacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
