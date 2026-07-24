"use client";

import { useState } from "react";
import { updateCustomerAction } from "@/app/actions/customers";

export default function CustomerEditForm({ customer }: { customer: any }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
        // Convert form string values to proper types
        if (payload.isActive === "true") payload.isActive = true;
        if (payload.version) payload.version = Number(payload.version);
        try {
          await updateCustomerAction(payload);
        } catch (e) {
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input type="hidden" name="id" value={customer.id} />
      <input type="hidden" name="version" value={customer.version ?? 1} />
      <div>
        <label>ERP Kodu<br /><input name="customerCode" defaultValue={customer.customerCode ?? ""} /></label>
      </div>
      <div>
        <label>Ünvan<br /><input name="name" defaultValue={customer.name ?? ""} required /></label>
      </div>
      <div>
        <label>Kısa Ünvan<br /><input name="shortName" defaultValue={customer.shortName ?? ""} /></label>
      </div>
      <div>
        <label>Adres<br /><input name="address" defaultValue={customer.address ?? ""} /></label>
      </div>
      <div>
        <label>Notlar<br /><textarea name="notes" defaultValue={customer.notes ?? ""} /></label>
      </div>
      <div>
        <label>Aktif&nbsp;<input type="checkbox" name="isActive" defaultChecked={customer.isActive ?? true} value="true" /></label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Güncelleniyor..." : "Güncelle"}</button>
      </div>
    </form>
  );
}
