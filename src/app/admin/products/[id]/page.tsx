import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/admin/ui";
import { saveInventory, deleteProduct } from "@/app/actions/admin";
import { SIZES } from "@/lib/design/zones";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, categories] = await Promise.all([db.product.findUnique({ where: { id }, include: { colors: { orderBy: { position: "asc" } }, variants: true } }), db.category.findMany({ orderBy: { name: "asc" } })]);
  if (!p) notFound();
  return (
    <div className="space-y-10">
      <Link href="/admin/products" className="text-xs text-mist hover:text-white">← Products</Link>
      <PageTitle title={p.name}><Link href={`/shop/${p.slug}`} className="btn-ghost btn-sm" target="_blank">View in shop ↗</Link></PageTitle>
      <ProductForm p={{ ...p, colors: p.colors }} categories={categories} />
      <section>
        <h2 className="mb-4 text-lg font-semibold">Inventory</h2>
        <form action={saveInventory} className="card overflow-x-auto p-4">
          <input type="hidden" name="productId" value={p.id} />
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className="p-2 text-left text-[11px] uppercase text-mist">Colour</th>{SIZES.map((s) => <th key={s} className="p-2 text-[11px] text-mist">{s}</th>)}</tr></thead>
            <tbody>
              {p.colors.map((c) => (
                <tr key={c.id}>
                  <td className="p-2"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: c.hex }} />{c.name}</td>
                  {SIZES.map((s) => {
                    const v = p.variants.find((x) => x.colorHex === c.hex && x.size === s);
                    return <td key={s} className="p-1">{v ? <input aria-label={`${c.name} ${s} stock`} name={`stock:${v.id}`} type="number" min={0} defaultValue={v.stock} className={`input h-9 w-20 text-center ${v.stock === 0 ? "border-red-500/40" : v.stock <= 5 ? "border-yellow-500/40" : ""}`} /> : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-primary btn-sm mt-4">Save inventory</button>
        </form>
      </section>
      <form action={deleteProduct} className="border-t border-white/[0.07] pt-6">
        <input type="hidden" name="id" value={p.id} />
        <button className="btn-ghost btn-sm border-red-500/40 text-red-300 hover:bg-red-500/10">Delete product</button>
        <p className="mt-2 text-xs text-mist">Products that appear in past orders are archived (hidden) instead of deleted, so order history stays intact.</p>
      </form>
    </div>
  );
}
