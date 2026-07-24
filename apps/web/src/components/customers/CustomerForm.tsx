"use client";

import { useState } from "react";
import { createCustomerAction } from "@/app/actions/customers";

export default function CustomerForm({ existing }: { existing?: any }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload = Object.fromEntries(formData.entries());
        try {
          await createCustomerAction(payload);
        } catch (e) {
          // noop - server action will throw and surface
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div>
        <label>ERP Kodu<br />
          <input name="customerCode" defaultValue={existing?.customerCode ?? ""} />
        </label>
      </div>
      <div>
        <label>Ünvan<br />
          <input name="name" defaultValue={existing?.name ?? ""} required />
        </label>
      </div>
      <div>
        <label>Kısa Ünvan<br />
          <input name="shortName" defaultValue={existing?.shortName ?? ""} />
        </label>
      </div>
      <div>
        <label>Vergi No<br />
          <input name="taxNumber" defaultValue={existing?.taxNumber ?? ""} />
        </label>
      </div>
      <div>
        <label>Adres<br />
          <input name="address" defaultValue={existing?.address ?? ""} />
        </label>
      </div>
      <div>
        <label>Notlar<br />
          <textarea name="notes" defaultValue={existing?.notes ?? ""} />
        </label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </form>
  );
}
