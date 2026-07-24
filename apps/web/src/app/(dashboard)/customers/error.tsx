"use client";

import { useEffect } from "react";
import { EmptyState } from "@repo/ui";
import { AlertTriangle } from "lucide-react";

interface CustomerListErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerListError({ error, reset }: CustomerListErrorProps) {
  useEffect(() => {
    console.error("Customer list error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
        title="Müşteriler yüklenemedi."
        description="Müşteriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin."
        action={{
          label: "Tekrar Dene",
          onClick: reset,
        }}
      />
    </div>
  );
}
