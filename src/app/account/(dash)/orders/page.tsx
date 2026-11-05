import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import OrderRow from "@/components/account/OrderRow";

export default async function Orders() {
  const u = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, include: { items: true } });
  const images = Object.fromEntries((await db.product.findMany({ where: { id: { in: orders.flatMap((o) => o.items.map((i) => i.productId!).filter(Boolean)) } }, select: { id: true, images: true } })).map((p) => [p.id, p.images[0]]));
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Order history</h2>
      {orders.length ? <ul className="space-y-3">{orders.map((o) => <OrderRow key={o.id} o={o} images={images} />)}</ul> : <p className="text-sm text-mist">You haven&apos;t placed any orders yet. <Link href="/shop" className="text-white underline">Start shopping</Link>.</p>}
    </section>
  );
}
