import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAddress } from "@/app/actions/account";
import AddressForm from "@/components/account/AddressForm";

export default async function Addresses() {
  const u = await requireUser("/account/addresses");
  const list = await db.address.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: "desc" }, { label: "asc" }] });
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Delivery addresses</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="card p-5 text-sm">
            <div className="flex items-center justify-between"><p className="font-semibold">{a.label} {a.isDefault && <span className="ml-1 rounded bg-blaze/15 px-1.5 py-0.5 text-[10px] uppercase text-blaze">Default</span>}</p></div>
            <p className="mt-2 text-white/70">{a.fullName}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}{a.region && `, ${a.region}`} {a.postalCode}<br />{a.country} · {a.phone}</p>
            <div className="mt-4 flex gap-2">
              <AddressForm address={{ ...a, line2: a.line2 ?? "", region: a.region ?? "", postalCode: a.postalCode ?? "" }} />
              <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="btn-ghost btn-sm">Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
      <AddressForm />
    </section>
  );
}
