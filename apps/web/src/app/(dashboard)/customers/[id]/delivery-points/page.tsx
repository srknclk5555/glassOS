"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  EmptyState,
} from "@repo/ui";
import { getCustomerByIdAction, deleteDeliveryPointAction, setDefaultDeliveryPointAction } from "@/app/actions/customers";
import { DeliveryPointDialog } from "@/components/customers/delivery-point-dialog";

export default function DeliveryPointsTab({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPoint, setEditPoint] = useState<any>(null);
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

  const handleRefresh = useCallback(() => {
    loadCustomer(customerId);
    router.refresh();
  }, [customerId, router]);

  const handleDelete = useCallback(async (pointId: string) => {
    if (!confirm("Bu teslimat noktasını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDeliveryPointAction(pointId);
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }, [handleRefresh]);

  const handleSetDefault = useCallback(async (pointId: string) => {
    try {
      await setDefaultDeliveryPointAction({ id: pointId, customerId });
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }, [customerId, handleRefresh]);

  const handleAdd = useCallback(() => {
    setEditPoint(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((point: any) => {
    setEditPoint(point);
    setDialogOpen(true);
  }, []);

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

  const points = customer?.deliveryPoints ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Teslimat Noktaları</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Teslimat Noktası Ekle
        </Button>
      </div>

      {points.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Teslimat noktası bulunamadı"
              description="Bu müşteri için henüz teslimat noktası tanımlanmamış."
              action={{ label: "Teslimat Noktası Ekle", onClick: handleAdd }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {points.map((point: any) => (
            <Card key={point.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{point.name}</CardTitle>
                    {point.isDefault ? (
                      <Badge variant="success">Varsayılan</Badge>
                    ) : (
                      <Badge variant="outline" className="cursor-pointer" onClick={() => handleSetDefault(point.id)}>
                        Varsayılan Yap
                      </Badge>
                    )}
                    {point.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Pasif</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(point)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(point.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
                  {point.address && (
                    <>
                      <span className="text-text-muted">Adres</span>
                      <span>{point.address}</span>
                    </>
                  )}
                  {(point.city || point.district) && (
                    <>
                      <span className="text-text-muted">Konum</span>
                      <span>{[point.district, point.city].filter(Boolean).join(" / ")}</span>
                    </>
                  )}
                  {point.phone && (
                    <>
                      <span className="text-text-muted">Telefon</span>
                      <span>{point.phone}</span>
                    </>
                  )}
                  {point.note && (
                    <>
                      <span className="text-text-muted">Not</span>
                      <span>{point.note}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeliveryPointDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditPoint(null);
            handleRefresh();
          }
        }}
        customerId={customerId}
        point={editPoint}
      />
    </div>
  );
}
