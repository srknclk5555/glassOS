"use client";

import Link from "next/link";
import { EmptyState, Button } from "@repo/ui";
import { UserX } from "lucide-react";

export default function CustomerNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<UserX className="h-8 w-8" />}
        title="Müşteri bulunamadı"
        description="Aradığınız müşteri mevcut değil veya silinmiş olabilir."
        action={{
          label: "Müşterilere Dön",
          onClick: () => {},
        }}
      />
    </div>
  );
}
