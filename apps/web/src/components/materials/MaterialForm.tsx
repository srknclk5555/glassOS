"use client";

import { useState } from "react";
import { createMaterialAction, updateMaterialAction, softDeleteMaterialAction } from "@/app/actions/masterData";

export default function MaterialForm({ existing }: { existing?: any }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
    <form
      action={async (formData: FormData) => {
        setSubmitting(true);
        const payload = Object.fromEntries(formData.entries());
        try {
          if (payload.id) {
            await updateMaterialAction(payload);
          } else {
            await createMaterialAction(payload);
          }
        } catch (e) {
          // noop
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {existing?.id && <input type="hidden" name="id" defaultValue={existing.id} />}
      {existing?.categoryId && <input type="hidden" name="categoryId" defaultValue={existing.categoryId} />}
      <div>
        <label>Kod<br />
          <input name="materialCode" defaultValue={existing?.materialCode ?? ""} required />
        </label>
      </div>
      <div>
        <label>Ad<br />
          <input name="name" defaultValue={existing?.name ?? ""} required />
        </label>
      </div>
      <div>
        <label>Açıklama<br />
          <textarea name="description" defaultValue={existing?.description ?? ""} />
        </label>
      </div>
      <div>
        <button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </form>
      {existing?.id && (
        <form
          action={async (formData: FormData) => {
            setSubmitting(true);
            try {
              const id = formData.get("id");
              if (id) await softDeleteMaterialAction(id as string);
            } catch (e) {
              // noop
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <input type="hidden" name="id" defaultValue={existing.id} />
          <button type="submit" disabled={submitting} style={{ marginTop: 8 }}>Sil</button>
        </form>
      )}
    </>
  );
}
