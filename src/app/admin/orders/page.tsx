import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { money, STATUS_LABEL } from "@/lib/format";
import { PageTitle, StatusBadge } from "@/components/admin/ui";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.status && sp.status in STATUS_LABEL) where.status = sp.status as OrderStatus;
  if (sp.q) where.OR = [{ number: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25, include: { items: { select: { quantity: true, design: true } } } }),
    db.order.count({ where }),
  ]);
  const qs = (p: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div>
      <PageTitle title="Orders" sub={`${total} order${total === 1 ? "" : "s"}`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search number, email, phone" className="input h-10 max-w-xs" aria-label="Search orders" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 max-w-[200px]" aria-label="Status">
          <option value="" className="bg-coal">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-coal">{v}</option>)}
        </select>
        <button className="btn-ghost btn-sm h-10">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-mist">
            <tr><th className="p-4">Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="pr-4 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {orders.map((o) => {
              const custom = o.items.filter((i) => i.design).length;
              return (
                <tr key={o.id} className="transition hover:bg-white/[0.02]">
                  <td className="p-4"><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-blaze">{o.number}</Link></td>
                  <td className="text-mist">{o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="max-w-[200px] truncate">{o.email}</td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}{custom > 0 && <span className="ml-2 rounded bg-blaze/15 px-1.5 py-0.5 text-[10px] font-semibold text-blaze">{custom} custom</span>}</td>
                  <td className="text-xs">{o.paymentMethod} · <span className={o.paymentStatus === "PAID" ? "text-emerald-300" : "text-mist"}>{o.paymentStatus}</span></td>
                  <td><StatusBadge s={o.status} /></td>
                  <td className="pr-4 text-right tabular-nums">{money(o.total)}</td>
                </tr>
              );
            })}
            {!orders.length && <tr><td colSpan={7} className="p-10 text-center text-mist">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link className="btn-ghost btn-sm" href={qs({ page: String(page - 1) })}>← Prev</Link>}
        {page * 25 < total && <Link className="btn-ghost btn-sm" href={qs({ page: String(page + 1) })}>Next →</Link>}
      </div>
    </div>
  );
}
