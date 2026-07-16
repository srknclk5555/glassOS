"use client";

import { useState } from "react";
import { updateCustomerAction } from "@/app/actions/identity";

export default function CustomerEditForm({ customer }: { customer: any }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload = Object.fromEntries(formData.entries());
        try {
          await updateCustomerAction(payload);
        } catch (e) {
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <input type="hidden" name="id" value={customer.id} />
      <div>
        <label>ERP Kodu<br /><input name="erpCode" defaultValue={customer.erpCode ?? ""} /></label>
      </div>
      <div>
        <label>Ünvan<br /><input name="title" defaultValue={customer.title ?? ""} required /></label>
      </div>
      <div>
        <label>Kısa Ünvan<br /><input name="shortTitle" defaultValue={customer.shortTitle ?? ""} /></label>
      </div>
      <div>
        <label>Adres<br /><input name="address" defaultValue={customer.address ?? ""} /></label>
      </div>
      <div>
        <label>Notlar<br /><textarea name="notes" defaultValue={customer.notes ?? ""} /></label>
      </div>
      <div>
        <label>Aktif&nbsp;<input type="checkbox" name="active" defaultChecked={customer.active ?? true} value="true" /></label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Güncelleniyor..." : "Güncelle"}</button>
      </div>
    </form>
  );
}
