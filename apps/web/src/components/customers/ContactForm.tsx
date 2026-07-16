"use client";

import { useState } from "react";
import { createCustomerContactAction } from "@/app/actions/identity";

export default function ContactForm({ customerId }: { customerId: string }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload = Object.fromEntries(formData.entries());
        try {
          await createCustomerContactAction(payload);
        } catch (e) {
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <div>
        <label>Ad Soyad<br /><input name="name" required /></label>
      </div>
      <div>
        <label>Görev<br /><input name="role" /></label>
      </div>
      <div>
        <label>Telefon<br /><input name="phone" /></label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </form>
  );
}
