import { LoadingState } from "@repo/ui";

export default function CustomerDetailLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoadingState text="Müşteri detayları yükleniyor..." size="lg" />
    </div>
  );
}
