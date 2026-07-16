"use client";

import { useState } from "react";
import { createDeliveryPointAction } from "@/app/actions/identity";

export default function DeliveryPointForm({ customerId }: { customerId: string }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload = Object.fromEntries(formData.entries());
        try {
          await createDeliveryPointAction(payload);
        } catch (e) {
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <div>
        <label>Ad<br /><input name="name" required /></label>
      </div>
      <div>
        <label>Adres<br /><input name="address" /></label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </form>
  );
}
