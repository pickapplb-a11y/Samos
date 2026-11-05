import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";
import CollectionForm from "@/components/admin/CollectionForm";
import { deleteCollection } from "@/app/actions/admin";

export default async function Collections() {
  const [cols, products] = await Promise.all([db.collection.findMany({ orderBy: { position: "asc" }, include: { products: true } }), db.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return (
    <div className="space-y-6">
      <PageTitle title="Homepage collections" sub="Shown in “The edit” on the homepage, in position order." />
      {cols.map((c) => (
        <div key={c.id} className="space-y-2">
          <CollectionForm c={{ ...c, productIds: c.products.map((p) => p.productId) }} products={products} />
          <form action={deleteCollection}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-mist hover:text-red-300">Delete “{c.title}”</button></form>
        </div>
      ))}
      <h2 className="pt-4 text-lg font-semibold">New collection</h2>
      <CollectionForm products={products} />
    </div>
  );
}
