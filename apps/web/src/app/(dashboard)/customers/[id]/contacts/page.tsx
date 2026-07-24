"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RotateCcw, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  EmptyState,
} from "@repo/ui";
import { getCustomerByIdAction, deleteCustomerContactAction, setPrimaryContactAction } from "@/app/actions/customers";
import { ContactDialog } from "@/components/customers/contact-dialog";

export default function ContactsTab({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
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

  const handleDelete = useCallback(async (contactId: string) => {
    if (!confirm("Bu kişiyi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteCustomerContactAction(contactId);
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }, [handleRefresh]);

  const handleSetPrimary = useCallback(async (contactId: string) => {
    try {
      await setPrimaryContactAction({ id: contactId, customerId });
      handleRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }, [customerId, handleRefresh]);

  const handleAdd = useCallback(() => {
    setEditContact(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((contact: any) => {
    setEditContact(contact);
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

  const contacts = customer?.contacts ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">İletişim Kişileri</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Kişi Ekle
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title="Kişi bulunamadı"
              description="Bu müşteri için henüz iletişim kişisi tanımlanmamış. İlk kişiyi eklemek için yukarıdaki butonu kullanın."
              action={{ label: "Kişi Ekle", onClick: handleAdd }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contacts.map((contact: any) => (
            <Card key={contact.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{contact.name}</CardTitle>
                    {contact.isPrimary && (
                      <Badge variant="success" className="cursor-pointer" onClick={() => handleSetPrimary(contact.id)}>
                        Birincil
                      </Badge>
                    )}
                    {!contact.isPrimary && (
                      <Badge variant="outline" className="cursor-pointer" onClick={() => handleSetPrimary(contact.id)}>
                        Birincil Yap
                      </Badge>
                    )}
                    {contact.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Pasif</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {contact.deletedAt ? (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)} disabled>
                        <Trash2 className="h-4 w-4 text-text-muted" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
                  {contact.title && (
                    <>
                      <span className="text-text-muted">Ünvan</span>
                      <span>{contact.title}</span>
                    </>
                  )}
                  {contact.role && (
                    <>
                      <span className="text-text-muted">Rol</span>
                      <span>{contact.role}</span>
                    </>
                  )}
                  {contact.phone && (
                    <>
                      <span className="text-text-muted">Telefon</span>
                      <span>{contact.phone}</span>
                    </>
                  )}
                  {contact.whatsapp && (
                    <>
                      <span className="text-text-muted">WhatsApp</span>
                      <span>{contact.whatsapp}</span>
                    </>
                  )}
                  {contact.email && (
                    <>
                      <span className="text-text-muted">E-posta</span>
                      <span>{contact.email}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditContact(null);
            handleRefresh();
          }
        }}
        customerId={customerId}
        contact={editContact}
      />
    </div>
  );
}
