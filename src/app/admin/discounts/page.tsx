import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageTitle } from "@/components/admin/ui";
import DiscountForm from "@/components/admin/DiscountForm";
import { toggleDiscount, deleteDiscount } from "@/app/actions/admin";

export default async function Discounts() {
  const list = await db.discount.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <PageTitle title="Discount codes" />
      <DiscountForm />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-mist"><tr><th className="p-4">Code</th><th>Discount</th><th>Min.</th><th>Uses</th><th>Expires</th><th>Status</th><th /></tr></thead>
          <tbody className="divide-y divide-white/[0.05]">
            {list.map((d) => (
              <tr key={d.id}>
                <td className="p-4 font-mono font-semibold">{d.code}</td>
                <td>{d.type === "PERCENT" ? `${d.value}%` : money(d.value)}</td>
                <td>{d.minSubtotal ? money(d.minSubtotal) : "—"}</td>
                <td>{d.uses}{d.maxUses ? ` / ${d.maxUses}` : ""}</td>
                <td>{d.expiresAt ? d.expiresAt.toLocaleDateString() : "—"}</td>
                <td>{d.active ? <span className="text-emerald-300">Active</span> : <span className="text-mist">Paused</span>}</td>
                <td className="flex gap-2 py-3 pr-4 justify-end">
                  <form action={toggleDiscount}><input type="hidden" name="id" value={d.id} /><button className="btn-ghost btn-sm">{d.active ? "Pause" : "Activate"}</button></form>
                  <form action={deleteDiscount}><input type="hidden" name="id" value={d.id} /><button className="btn-ghost btn-sm">Delete</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
