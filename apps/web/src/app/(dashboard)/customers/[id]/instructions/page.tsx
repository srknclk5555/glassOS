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
import { getCustomerByIdAction, deleteCustomerInstructionAction } from "@/app/actions/customers";
import { InstructionDialog } from "@/components/customers/instruction-dialog";

const OPERATOR_LABELS: Record<string, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "İçerir",
  not_contains: "İçermez",
  starts_with: "İle başlar",
  ends_with: "İle biter",
  in: "İçinde",
  not_in: "Dışında",
};

export default function InstructionsTab({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState<any>(null);
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

  const handleDelete = useCallback(async (instrId: string) => {
    if (!confirm("Bu talimatı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteCustomerInstructionAction(instrId);
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }, [handleRefresh]);

  const handleAdd = useCallback(() => {
    setEditInstruction(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((instruction: any) => {
    setEditInstruction(instruction);
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

  const instructions = customer?.instructions ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Özel Talimatlar</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Talimat Ekle
        </Button>
      </div>

      {instructions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Talimat bulunamadı"
              description="Bu müşteri için henüz özel talimat tanımlanmamış."
              action={{ label: "Talimat Ekle", onClick: handleAdd }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {instructions.map((instruction: any) => (
            <Card key={instruction.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{instruction.title}</CardTitle>
                    {instruction.isStanding && <Badge variant="info">Sürekli</Badge>}
                    {instruction.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Pasif</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">Sıra: {instruction.sortOrder}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(instruction)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(instruction.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3">{instruction.instruction}</p>

                {instruction.conditions && instruction.conditions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-glass-border">
                    <p className="text-xs font-medium text-text-muted mb-2">Koşullar</p>
                    <div className="space-y-1">
                      {instruction.conditions.map((cond: any) => (
                        <div key={cond.id} className="text-xs text-text-muted flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Grup {cond.logicalGroup}
                          </Badge>
                          <span className="font-medium">{cond.field}</span>
                          <span className="font-mono">{OPERATOR_LABELS[cond.operator] ?? cond.operator}</span>
                          <span className="text-text-primary">{cond.value}</span>
                          <span className="text-[10px] text-text-muted">({cond.valueType})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InstructionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditInstruction(null);
            handleRefresh();
          }
        }}
        customerId={customerId}
        instruction={editInstruction}
      />
    </div>
  );
}
