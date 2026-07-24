import { LoadingState } from "@repo/ui";

export default function CustomerListLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoadingState text="Müşteriler yükleniyor..." size="lg" />
    </div>
  );
}
