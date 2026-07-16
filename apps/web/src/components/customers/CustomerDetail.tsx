import { db, customerContacts, deliveryPoints } from "@repo/db";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import ContactForm from "./ContactForm";
import DeliveryPointForm from "./DeliveryPointForm";
import CustomerEditForm from "./CustomerEditForm";

export default async function CustomerDetail({ customer }: { customer: any }) {
  const session = await requireSession();

  const contacts = await db.query.customerContacts.findMany({ where: eq(customerContacts.customerId, customer.id) });
  const points = await db.query.deliveryPoints.findMany({ where: eq(deliveryPoints.customerId, customer.id) });

  return (
    <div>
      <section>
        <h2>Genel Bilgiler / Düzenle</h2>
        <CustomerEditForm customer={customer} />
      </section>

      <section>
        <h2>Yetkililer</h2>
        <ul>
          {contacts.map((c: any) => (
            <li key={c.id}>{c.name} — {c.role}</li>
          ))}
        </ul>
        <ContactForm customerId={customer.id} />
      </section>

      <section>
        <h2>Teslimat Noktaları</h2>
        <ul>
          {points.map((p: any) => (
            <li key={p.id}>{p.name} — {p.address}</li>
          ))}
        </ul>
        <DeliveryPointForm customerId={customer.id} />
      </section>
    </div>
  );
}
