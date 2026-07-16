"use client";

import { useState } from "react";
import { createCustomerAction } from "@/app/actions/identity";

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
          <input name="erpCode" defaultValue={existing?.erpCode ?? ""} />
        </label>
      </div>
      <div>
        <label>Ünvan<br />
          <input name="title" defaultValue={existing?.title ?? ""} required />
        </label>
      </div>
      <div>
        <label>Kısa Ünvan<br />
          <input name="shortTitle" defaultValue={existing?.shortTitle ?? ""} />
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
        <label>ERP Status<br />
          <select name="erpStatus" defaultValue={existing?.erpStatus ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
