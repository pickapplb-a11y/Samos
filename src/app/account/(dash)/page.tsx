import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm, PasswordForm } from "@/components/account/ProfileForms";
import OrderRow from "@/components/account/OrderRow";

export default async function Overview() {
  const u = await requireUser();
  const [orders, designs, addresses] = await Promise.all([
    db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 3, include: { items: true } }),
    db.design.count({ where: { userId: u.id } }),
    db.address.count({ where: { userId: u.id } }),
  ]);
  const images = Object.fromEntries((await db.product.findMany({ where: { id: { in: orders.flatMap((o) => o.items.map((i) => i.productId!).filter(Boolean)) } }, select: { id: true, images: true } })).map((p) => [p.id, p.images[0]]));
  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Orders", orders.length ? `${orders.length}+` : "0", "/account/orders"], ["Saved designs", designs, "/account/designs"], ["Addresses", addresses, "/account/addresses"]].map(([l, n, h]) => (
          <Link key={String(h)} href={String(h)} className="card p-6 transition hover:border-white/20"><p className="eyebrow">{l}</p><p className="mt-3 font-display text-5xl">{n}</p></Link>
        ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent orders</h2><Link href="/account/orders" className="text-sm text-mist hover:text-white">All orders →</Link></div>
        {orders.length ? <ul className="space-y-3">{orders.map((o) => <OrderRow key={o.id} o={o} images={images} />)}</ul> : <p className="text-sm text-mist">No orders yet. <Link href="/studio" className="text-white underline">Design your first hoodie</Link>.</p>}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <ProfileForm name={u.name} phone={u.phone ?? ""} email={u.email} />
        <PasswordForm />
      </div>
    </div>
  );
}
