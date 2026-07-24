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
import { getCustomerByIdAction, deleteGlassCatalogAction } from "@/app/actions/customers";
import { GlassCatalogDialog } from "@/components/customers/glass-catalog-dialog";

export default function GlassCatalogTab({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
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

  const handleDelete = useCallback(async (itemId: string) => {
    if (!confirm("Bu katalog kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteGlassCatalogAction(itemId);
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }, [handleRefresh]);

  const handleAdd = useCallback(() => {
    setEditItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: any) => {
    setEditItem(item);
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

  const items = customer?.glassCatalog ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cam Kataloğu</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Katalog Kaydı Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Katalog kaydı bulunamadı"
              description="Bu müşteri için henüz cam kataloğu girişi tanımlanmamış."
              action={{ label: "Katalog Kaydı Ekle", onClick: handleAdd }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item: any) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{item.productCode}</CardTitle>
                    {item.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Pasif</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
                  <span className="text-text-muted">Cam Türü</span>
                  <span>{item.glassType}</span>
                  {item.thicknessMm && (
                    <>
                      <span className="text-text-muted">Kalınlık</span>
                      <span>{String(item.thicknessMm)} mm</span>
                    </>
                  )}
                  {item.defaultWidthMm && (
                    <>
                      <span className="text-text-muted">Genişlik</span>
                      <span>{String(item.defaultWidthMm)} mm</span>
                    </>
                  )}
                  {item.defaultHeightMm && (
                    <>
                      <span className="text-text-muted">Yükseklik</span>
                      <span>{String(item.defaultHeightMm)} mm</span>
                    </>
                  )}
                  {item.defaultPieces && (
                    <>
                      <span className="text-text-muted">Adet</span>
                      <span>{String(item.defaultPieces)}</span>
                    </>
                  )}
                  {item.notes && (
                    <>
                      <span className="text-text-muted">Notlar</span>
                      <span>{item.notes}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GlassCatalogDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditItem(null);
            handleRefresh();
          }
        }}
        customerId={customerId}
        item={editItem}
      />
    </div>
  );
}
