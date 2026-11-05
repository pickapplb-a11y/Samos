import Link from "next/link";
import { db } from "@/lib/db";
import { money, STATUS_FLOW } from "@/lib/format";
import { PageTitle, Stat, StatusBadge } from "@/components/admin/ui";

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Math.min(365, Math.max(7, Number((await searchParams).days) || 30));
  const since = new Date(Date.now() - days * 86400000);
  const [orders, byStatus, lowStock, recent, customers, subs] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: since }, status: { not: "CANCELLED" } }, select: { total: true, createdAt: true, items: { select: { name: true, quantity: true, unitPrice: true, design: true, productId: true } } } }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.variant.findMany({ where: { stock: { lte: 5 }, product: { active: true } }, include: { product: { select: { name: true, id: true } } }, orderBy: { stock: "asc" }, take: 8 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.newsletterSubscriber.count(),
  ]);
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const units = orders.flatMap((o) => o.items);
  const customUnits = units.filter((i) => i.design).reduce((s, i) => s + i.quantity, 0);
  const totalUnits = units.reduce((s, i) => s + i.quantity, 0);
  // revenue per day
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), v: 0 };
  });
  for (const o of orders) {
    const b = buckets.find((x) => x.key === o.createdAt.toISOString().slice(0, 10));
    if (b) b.v += o.total;
  }
  const max = Math.max(1, ...buckets.map((b) => b.v));
  const top = Object.values(
    units.reduce<Record<string, { name: string; qty: number; rev: number }>>((acc, i) => {
      const k = i.design ? "Custom designs" : i.name;
      acc[k] ??= { name: k, qty: 0, rev: 0 };
      acc[k].qty += i.quantity;
      acc[k].rev += i.quantity * i.unitPrice;
      return acc;
    }, {}),
  ).sort((a, b) => b.rev - a.rev).slice(0, 6);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

  return (
    <div>
      <PageTitle title="Sales analytics" sub={`Last ${days} days · cancelled orders excluded`}>
        <div className="flex gap-1">{[7, 30, 90].map((d) => <Link key={d} href={`/admin?days=${d}`} className={`chip ${d === days ? "chip-on" : ""}`}>{d}d</Link>)}</div>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={money(revenue)} hint={`${orders.length} orders`} />
        <Stat label="Avg. order value" value={money(orders.length ? Math.round(revenue / orders.length) : 0)} />
        <Stat label="Custom share" value={`${totalUnits ? Math.round((customUnits / totalUnits) * 100) : 0}%`} hint={`${customUnits} of ${totalUnits} units`} />
        <Stat label="Customers" value={String(customers)} hint={`${subs} newsletter subscribers`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="card p-6" aria-labelledby="rev-chart">
          <h2 id="rev-chart" className="text-sm font-semibold">Revenue by day</h2>
          <div className="mt-6 flex h-48 items-end gap-[2px]" role="img" aria-label={`Daily revenue for the last ${days} days, peak ${money(max)}`}>
            {buckets.map((b) => (
              <div key={b.key} className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t-sm bg-blaze/80 transition group-hover:bg-blaze" style={{ height: `${Math.max(b.v ? 3 : 0.5, (b.v / max) * 100)}%`, opacity: b.v ? 1 : 0.25 }} />
                <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-white px-2 py-1 text-[10px] text-ink group-hover:block">{b.label}: {money(b.v)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-mist"><span>{buckets[0].label}</span><span>{buckets[buckets.length - 1].label}</span></div>
        </section>
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Pipeline</h2>
          <ul className="mt-4 space-y-2.5">
            {[...STATUS_FLOW, "CANCELLED"].map((s) => (
              <li key={s} className="flex items-center justify-between"><Link href={`/admin/orders?status=${s}`}><StatusBadge s={s} /></Link><span className="tabular-nums text-sm">{count(s)}</span></li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Top sellers</h2>
          <ul className="mt-4 space-y-3 text-sm">{top.map((t) => <li key={t.name} className="flex justify-between gap-3"><span className="truncate text-white/80">{t.name}</span><span className="shrink-0 tabular-nums text-mist">{t.qty} · {money(t.rev)}</span></li>)}{!top.length && <li className="text-mist">No sales in this period.</li>}</ul>
        </section>
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <ul className="mt-4 space-y-3 text-sm">{recent.map((o) => <li key={o.id} className="flex items-center justify-between gap-2"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-blaze">{o.number}</Link><StatusBadge s={o.status} /><span className="tabular-nums text-mist">{money(o.total)}</span></li>)}</ul>
        </section>
        <section className="card p-6">
          <h2 className="text-sm font-semibold">Low stock</h2>
          <ul className="mt-4 space-y-3 text-sm">{lowStock.map((v) => <li key={v.id} className="flex justify-between gap-2"><Link href={`/admin/products/${v.product.id}`} className="truncate hover:text-blaze">{v.product.name} · {v.size}</Link><span className={`tabular-nums ${v.stock === 0 ? "text-red-400" : "text-yellow-300"}`}>{v.stock}</span></li>)}{!lowStock.length && <li className="text-mist">All variants well stocked.</li>}</ul>
        </section>
      </div>
    </div>
  );
}
