import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { STYLE_LABELS } from "@/lib/design/zones";
import { PageTitle } from "@/components/admin/ui";

export default async function AdminProducts() {
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" }, include: { category: true, variants: { select: { stock: true } }, colors: true } });
  return (
    <div>
      <PageTitle title="Products" sub={`${products.length} products`}><Link href="/admin/products/new" className="btn-accent btn-sm">+ New product</Link></PageTitle>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-mist"><tr><th className="p-4">Product</th><th>Fit</th><th>Colours</th><th>Stock</th><th>Price</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-white/[0.05]">
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-blaze"><span className="relative h-12 w-10 overflow-hidden rounded-lg bg-ink">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}</span><span><b>{p.name}</b><br /><span className="text-xs text-mist">{p.category?.name}</span></span></Link></td>
                  <td>{STYLE_LABELS[p.style]}</td>
                  <td><div className="flex -space-x-1">{p.colors.slice(0, 6).map((c) => <span key={c.id} className="h-4 w-4 rounded-full border border-coal" style={{ background: c.hex }} title={c.name} />)}</div></td>
                  <td className={stock < 20 ? "text-yellow-300" : ""}>{stock}</td>
                  <td>{money(p.basePrice)}</td>
                  <td className="text-xs">{p.active ? <span className="text-emerald-300">Active</span> : <span className="text-mist">Hidden</span>}{p.featured && " · Featured"}{p.customizable && " · Custom"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
