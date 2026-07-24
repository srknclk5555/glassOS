"use client";

import { useEffect } from "react";
import { EmptyState } from "@repo/ui";
import { AlertTriangle } from "lucide-react";

interface CustomerDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerDetailError({ error, reset }: CustomerDetailErrorProps) {
  useEffect(() => {
    console.error("Customer detail error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
        title="Müşteri detayları yüklenemedi."
        description="Müşteri detayları yüklenirken bir hata oluştu. Lütfen tekrar deneyin."
        action={{
          label: "Tekrar Dene",
          onClick: reset,
        }}
      />
    </div>
  );
}
